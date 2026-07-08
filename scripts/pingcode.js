#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const DEFAULT_BASE_URL = 'https://open.pingcode.com';
const DEFAULT_TOKEN_CACHE = '~/.cache/pingcode-skill/token.json';
const DEFAULT_WORKSPACE_CACHE = '.pingcode-skill/cache.json';
const MAX_TOKEN_TTL_SECONDS = 29 * 24 * 60 * 60;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const USER_LOOKUP_RE = /@user:([^,]+)/g;
const MAX_SELECTION_OPTIONS = 20;
const SAFE_SHELL_RE = /^[A-Za-z0-9_/:=.,+-]+$/;

function shellQuote(value) {
  if (SAFE_SHELL_RE.test(value)) {
    return value;
  }
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

const CLI_COMMAND = `node ${shellQuote(path.resolve(__filename))}`;
const CTX_COMMAND = `node ${shellQuote(path.resolve(__dirname, 'pingcode-ctx.js'))}`;
const CTX_COMMAND_ALIAS = 'pingcode-ctx';

const AUTH_ENV_GUIDANCE = (
  'Configure PingCode OAuth client credentials first:\n' +
  '  export PINGCODE_CLIENT_ID="..."\n' +
  '  export PINGCODE_CLIENT_SECRET="..."\n' +
  'Optional for private deployments:\n' +
  '  export PINGCODE_BASE_URL="https://open.pingcode.com"'
);

const USER_ENV_GUIDANCE = (
  'This request needs a human PingCode identity, but client_credentials is an enterprise token.\n' +
  'Ask the user for their PingCode user ID/name, pass --user-id/--user-name, cache a workspace user, ' +
  'or configure one of:\n' +
  '  export PINGCODE_USER_ID="..."\n' +
  '  export PINGCODE_USER_NAME="..."\n' +
  'Use @me for current-user-id fields; use @me_name when a name lookup is needed.\n' +
  'To discover IDs, run:\n' +
  `  ${CLI_COMMAND} --cache-users\n` +
  'Then save your current user with:\n' +
  `  ${CLI_COMMAND} --set-current-user USER_ID\n` +
  'For guided workspace setup, run:\n' +
  `  ${CTX_COMMAND_ALIAS}\n` +
  'Or use the bundled script directly:\n' +
  `  ${CTX_COMMAND}`
);

const WORKSPACE_DEFAULT_GUIDANCE = (
  'PingCode workspace context is incomplete. Run the interactive setup command first:\n' +
  `  ${CTX_COMMAND_ALIAS}\n` +
  'Or use the bundled script directly:\n' +
  `  ${CTX_COMMAND}\n` +
  'It caches the current user, project, and sprint/iteration in .pingcode-skill/cache.json.\n' +
  'Use --all-projects or --all-sprints when the user explicitly asks for all projects or all iterations.'
);

class PingCodeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PingCodeError';
  }
}

function emptyWorkspaceCache() {
  return {
    version: 1,
    preferences: {},
    users: null,
    projects: null,
    sprints: {},
    work_item_types: {},
    work_item_states: {},
    work_item_priorities: {},
    work_item_properties: {},
    idea_states: {},
    idea_priorities: {},
  };
}

function parseJsonObject(raw, label) {
  if (!raw) {
    return null;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (exc) {
    throw new PingCodeError(`${label} must be valid JSON: ${exc.message}`);
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new PingCodeError(`${label} must be a JSON object`);
  }
  return data;
}

function parseKeyValues(items) {
  const result = {};
  for (const item of items || []) {
    const index = item.indexOf('=');
    if (index === -1) {
      throw new PingCodeError(`Expected key=value, got: ${item}`);
    }
    const key = item.slice(0, index).trim();
    if (!key) {
      throw new PingCodeError(`Empty key in parameter: ${item}`);
    }
    result[key] = item.slice(index + 1);
  }
  return result;
}

function expandUserPath(value) {
  if (!value) return value;
  if (value.startsWith('~/')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function loadWorkspaceCache(cachePath) {
  if (cachePath === null) {
    return emptyWorkspaceCache();
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (exc) {
    return emptyWorkspaceCache();
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return emptyWorkspaceCache();
  }
  const cache = emptyWorkspaceCache();
  Object.assign(cache, payload);
  if (!cache.preferences || typeof cache.preferences !== 'object') {
    cache.preferences = {};
  }
  if (!cache.sprints || typeof cache.sprints !== 'object') {
    cache.sprints = {};
  }
  if (!cache.work_item_types || typeof cache.work_item_types !== 'object') {
    cache.work_item_types = {};
  }
  if (!cache.work_item_states || typeof cache.work_item_states !== 'object') {
    cache.work_item_states = {};
  }
  if (!cache.work_item_priorities || typeof cache.work_item_priorities !== 'object') {
    cache.work_item_priorities = {};
  }
  if (!cache.work_item_properties || typeof cache.work_item_properties !== 'object') {
    cache.work_item_properties = {};
  }
  if (!cache.idea_states || typeof cache.idea_states !== 'object') {
    cache.idea_states = {};
  }
  if (!cache.idea_priorities || typeof cache.idea_priorities !== 'object') {
    cache.idea_priorities = {};
  }
  return cache;
}

function mergeWorkspaceCache(existing, incoming) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    const existingValue = merged[key];
    if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue) &&
        value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeWorkspaceCache(existingValue, value);
    } else if (value === null && existingValue !== null && existingValue !== undefined) {
      continue;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function compactWorkspaceCacheValue(value) {
  const dropKeys = new Set([
    'avatar', 'color', 'created_at', 'created_by', 'description', 'email',
    'is_archived', 'is_deleted', 'members', 'scope_id', 'scope_type',
    'updated_at', 'updated_by', 'url', 'visibility',
  ]);
  if (Array.isArray(value)) {
    return value.map(compactWorkspaceCacheValue);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (dropKeys.has(key)) continue;
      result[key] = compactWorkspaceCacheValue(item);
    }
    return result;
  }
  return value;
}

function saveWorkspaceCache(cachePath, cache) {
  if (cachePath === null) {
    throw new PingCodeError('Workspace cache is disabled');
  }
  let latest = loadWorkspaceCache(cachePath);
  if (latest) {
    cache = mergeWorkspaceCache(latest, cache);
  }
  cache = compactWorkspaceCacheValue(cache);
  cache.updated_at = Math.floor(Date.now() / 1000);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const tmpName = `.${path.basename(cachePath)}.${process.pid}.${crypto.randomUUID().replace(/-/g, '')}.tmp`;
  const tmpPath = path.join(path.dirname(cachePath), tmpName);
  fs.writeFileSync(tmpPath, JSON.stringify(cache, null, 2) + '\n');
  fs.renameSync(tmpPath, cachePath);
  try {
    fs.chmodSync(cachePath, 0o600);
  } catch (exc) {
    // ignore
  }
}

function currentUserId(userId, workspaceCache) {
  const preferences = (workspaceCache || {}).preferences || {};
  userId = userId || process.env.PINGCODE_USER_ID || preferences.current_user_id;
  if (!userId) {
    throw new PingCodeError(USER_ENV_GUIDANCE);
  }
  return userId;
}

function currentUserName(userName, workspaceCache) {
  const preferences = (workspaceCache || {}).preferences || {};
  userName = userName || process.env.PINGCODE_USER_NAME || preferences.current_user_name;
  if (!userName) {
    throw new PingCodeError(USER_ENV_GUIDANCE);
  }
  return userName;
}

function pageValues(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }
  const values = payload.values;
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter(item => item && typeof item === 'object' && !Array.isArray(item));
}

function nestedText(value, key) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const nested = value[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested.display_name || nested.name || nested.identifier || nested.id;
    }
    return nested;
  }
  return null;
}

function compactBusinessItem(item) {
  const fields = [
    'id', 'identifier', 'short_id', 'type', 'title', 'name', 'display_name',
    'state', 'priority', 'project', 'sprint', 'parent', 'assignee', 'html_url',
  ];
  const compact = {};
  for (const key of fields) {
    if (!(key in item)) continue;
    const value = item[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const text = nestedText(item, key);
      if (text !== null && text !== undefined) {
        compact[key] = text;
      }
    } else if (value !== null && value !== undefined && value !== '' &&
               !(Array.isArray(value) && value.length === 0) &&
               !(typeof value === 'object' && Object.keys(value).length === 0)) {
      compact[key] = value;
    }
  }
  const state = item.state;
  if (state && typeof state === 'object' && !Array.isArray(state) && state.type) {
    compact.state_type = state.type;
  }
  const parent = item.parent;
  if (parent && typeof parent === 'object' && !Array.isArray(parent)) {
    if (parent.identifier) compact.parent_identifier = parent.identifier;
    if (parent.title) compact.parent_title = parent.title;
  }
  const parentId = item.parent_id;
  if (parentId && !compact.parent_identifier) {
    compact.parent_id = parentId;
  }
  return compact;
}

function compactResponse(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const values = pageValues(payload);
  if (values.length > 0) {
    const result = {
      page_size: payload.page_size,
      page_index: payload.page_index,
      total: payload.total,
      count: values.length,
      values: values.map(compactBusinessItem),
    };
    return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== null && v !== undefined));
  }
  return compactBusinessItem(payload);
}

function normalizedEntity(item) {
  const nestedUser = item.user;
  if (!nestedUser || typeof nestedUser !== 'object' || Array.isArray(nestedUser)) {
    return item;
  }
  const merged = { ...nestedUser };
  for (const [key, value] of Object.entries(item)) {
    if (key !== 'user' && key !== 'project' && key !== 'role' && !(key in merged)) {
      merged[key] = value;
    }
  }
  return merged;
}

function itemNames(item) {
  const entity = normalizedEntity(item);
  const names = [];
  for (const key of ['id', 'display_name', 'name', 'identifier']) {
    const value = entity[key];
    if (typeof value === 'string' && value) {
      names.push(value);
    }
  }
  return names;
}

function selectionItem(item) {
  const entity = normalizedEntity(item);
  const result = {};
  for (const key of ['id', 'display_name', 'name', 'identifier']) {
    const value = entity[key];
    if (typeof value === 'string' && value) {
      result[key] = value;
    }
  }
  const project = item.project;
  if (project && typeof project === 'object' && !Array.isArray(project)) {
    const projectName = project.name;
    const projectId = project.id;
    if (typeof projectName === 'string' && projectName) {
      result.project_name = projectName;
    }
    if (typeof projectId === 'string' && projectId) {
      result.project_id = projectId;
    }
  }
  return result;
}

function selectionOptions(payload) {
  const values = pageValues(payload);
  const options = values.slice(0, MAX_SELECTION_OPTIONS).map(selectionItem).filter(o => Object.keys(o).length > 0);
  return [options, values.length];
}

function selectionGuidance(label, payload, command, cacheMessage) {
  const [options, total] = selectionOptions(payload);
  const suffix = total <= options.length ? '' : ` Showing first ${options.length} of ${total}.`;
  return (
    `Current PingCode ${label} is not cached. ${cacheMessage}\n` +
    'Ask the user to choose one option, then run:\n' +
    `  ${command}\n` +
    `Available ${label} options (${total} total).${suffix}\n` +
    JSON.stringify(options, null, 2)
  );
}

function findCachedItem(items, query, label) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    throw new PingCodeError(`Empty ${label} lookup`);
  }
  const exact = items.filter(item => itemNames(item).some(name => name.toLowerCase() === normalized));
  if (exact.length === 1) {
    return exact[0];
  }
  if (exact.length > 1) {
    throw new PingCodeError(`Ambiguous ${label} lookup: ${query}`);
  }
  const partial = items.filter(item => itemNames(item).some(name => name.toLowerCase().includes(normalized)));
  if (partial.length === 1) {
    return partial[0];
  }
  if (partial.length > 1) {
    const names = partial.slice(0, 8).map(item => itemNames(item)[0]).filter(Boolean).join(', ');
    throw new PingCodeError(`Ambiguous ${label} lookup: ${query}. Matches: ${names}`);
  }
  throw new PingCodeError(`No cached ${label} matched ${query}. Refresh the workspace cache first.`);
}

function cachedUserId(query, workspaceCache) {
  const users = pageValues((workspaceCache || {}).users);
  const item = findCachedItem(users, query, 'user');
  const itemId = item.id;
  if (typeof itemId !== 'string' || !itemId) {
    throw new PingCodeError(`Cached user ${query} has no id`);
  }
  return itemId;
}

function expandIdentityPlaceholder(value, userId, userName, workspaceCache) {
  if (typeof value === 'string') {
    if (value === '@me') {
      return currentUserId(userId, workspaceCache);
    }
    if (value === '@me_name' || value === '@me-name') {
      return currentUserName(userName, workspaceCache);
    }
    if (value.startsWith('@user:')) {
      return cachedUserId(value.slice(6), workspaceCache);
    }
    if (value.includes('@me')) {
      return value.replaceAll('@me', currentUserId(userId, workspaceCache));
    }
    if (value.includes('@user:')) {
      return value.replace(USER_LOOKUP_RE, (match, name) => cachedUserId(name, workspaceCache));
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => expandIdentityPlaceholder(item, userId, userName, workspaceCache));
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = expandIdentityPlaceholder(item, userId, userName, workspaceCache);
    }
    return result;
  }
  return value;
}

function expandIdentityPlaceholders(data, userId, userName, workspaceCache) {
  if (data === null || data === undefined) {
    return null;
  }
  return expandIdentityPlaceholder(data, userId, userName, workspaceCache);
}

function loadCachedToken(cachePath) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (exc) {
    return null;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const token = payload.access_token;
  const expiresAt = payload.expires_at;
  if (typeof token !== 'string' || !token || typeof expiresAt !== 'number') {
    return null;
  }
  if (expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return token;
}

function saveCachedToken(cachePath, token, expiresIn) {
  let ttl;
  if (typeof expiresIn === 'number' && !Number.isNaN(expiresIn)) {
    ttl = Math.floor(expiresIn);
  } else if (typeof expiresIn === 'string' && /^\d+$/.test(expiresIn)) {
    ttl = parseInt(expiresIn, 10);
  } else {
    ttl = MAX_TOKEN_TTL_SECONDS;
  }
  ttl = Math.max(60, Math.min(ttl, MAX_TOKEN_TTL_SECONDS));
  const payload = {
    access_token: token,
    expires_at: Math.floor(Date.now() / 1000) + ttl,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2) + '\n');
  try {
    fs.chmodSync(cachePath, 0o600);
  } catch (exc) {
    // ignore
  }
}

function buildUrl(baseUrl, rawPath, params) {
  let base;
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    base = rawPath;
  } else {
    base = `${baseUrl.replace(/\/$/, '')}/${rawPath.replace(/^\//, '')}`;
  }
  const url = new URL(base);
  for (const [key, value] of Object.entries(params || {})) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.map(String).join(','));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function normalizePath(rawPath, baseUrl = DEFAULT_BASE_URL) {
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    return new URL(rawPath).pathname;
  }
  return new URL(buildUrl(baseUrl, rawPath)).pathname;
}

function stateCacheKey(projectId, workItemTypeId) {
  return `${projectId}::${workItemTypeId}`;
}

function sprintProjectId(rawPath, baseUrl = DEFAULT_BASE_URL) {
  const normalized = normalizePath(rawPath, baseUrl);
  const match = normalized.match(/^\/v1\/project\/projects\/([^/]+)\/sprints$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function memberProjectId(rawPath, baseUrl = DEFAULT_BASE_URL) {
  const normalized = normalizePath(rawPath, baseUrl);
  const match = normalized.match(/^\/v1\/project\/projects\/([^/]+)\/members$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function cachedResponse(method, rawPath, params, workspaceCache, baseUrl) {
  if (method.toUpperCase() !== 'GET') {
    return null;
  }
  const normalized = normalizePath(rawPath, baseUrl);
  let projectId = memberProjectId(rawPath, baseUrl);
  if (projectId && workspaceCache.users && typeof workspaceCache.users === 'object' && !Array.isArray(workspaceCache.users)) {
    const users = workspaceCache.users;
    if (users.project_id === null || users.project_id === undefined || users.project_id === projectId) {
      return users;
    }
  }
  if (normalized === '/v1/directory/users' && workspaceCache.users && typeof workspaceCache.users === 'object') {
    return workspaceCache.users;
  }
  if (normalized === '/v1/project/projects' && workspaceCache.projects && typeof workspaceCache.projects === 'object') {
    return workspaceCache.projects;
  }
  projectId = sprintProjectId(rawPath, baseUrl);
  if (projectId) {
    const sprints = workspaceCache.sprints || {};
    const cached = sprints[projectId];
    if (cached && typeof cached === 'object') return cached;
  }
  if (normalized === '/v1/project/work_item/types') {
    const projectIdValue = params.project_id;
    if (typeof projectIdValue === 'string') {
      const workItemTypes = workspaceCache.work_item_types || {};
      const cached = workItemTypes[projectIdValue];
      if (cached && typeof cached === 'object') return cached;
    }
  }
  if (normalized === '/v1/project/work_item/priorities') {
    const projectIdValue = params.project_id;
    if (typeof projectIdValue === 'string') {
      const priorities = workspaceCache.work_item_priorities || {};
      const cached = priorities[projectIdValue];
      if (cached && typeof cached === 'object') return cached;
    }
  }
  if (normalized === '/v1/project/work_item/states') {
    const projectIdValue = params.project_id;
    const typeIdValue = params.work_item_type_id;
    if (typeof projectIdValue === 'string' && typeof typeIdValue === 'string') {
      const states = workspaceCache.work_item_states || {};
      const cached = states[stateCacheKey(projectIdValue, typeIdValue)];
      if (cached && typeof cached === 'object') return cached;
    }
  }
  if (normalized === '/v1/project/work_item/properties') {
    const projectIdValue = params.project_id;
    const typeIdValue = params.work_item_type_id;
    if (typeof projectIdValue === 'string' && typeof typeIdValue === 'string') {
      const properties = workspaceCache.work_item_properties || {};
      const cached = properties[stateCacheKey(projectIdValue, typeIdValue)];
      if (cached && typeof cached === 'object') return cached;
    }
  }
  if (normalized === '/v1/ship/idea/states') {
    const productIdValue = params.product_id;
    if (typeof productIdValue === 'string') {
      const ideaStates = workspaceCache.idea_states || {};
      const cached = ideaStates[productIdValue];
      if (cached && typeof cached === 'object') return cached;
    }
  }
  if (normalized === '/v1/ship/idea/priorities') {
    const productIdValue = params.product_id;
    if (typeof productIdValue === 'string') {
      const ideaPriorities = workspaceCache.idea_priorities || {};
      const cached = ideaPriorities[productIdValue];
      if (cached && typeof cached === 'object') return cached;
    }
  }
  return null;
}

function updateWorkspaceCacheForResponse(method, rawPath, params, response, workspaceCache, baseUrl) {
  if (method.toUpperCase() !== 'GET' || !response || typeof response !== 'object' || Array.isArray(response)) {
    return false;
  }
  const normalized = normalizePath(rawPath, baseUrl);
  let projectId = memberProjectId(rawPath, baseUrl);
  if (projectId) {
    const cached = { ...response, project_id: projectId };
    workspaceCache.users = cached;
    return true;
  }
  if (normalized === '/v1/directory/users') {
    workspaceCache.users = response;
    return true;
  }
  if (normalized === '/v1/project/projects') {
    workspaceCache.projects = response;
    return true;
  }
  projectId = sprintProjectId(rawPath, baseUrl);
  if (projectId) {
    if (!workspaceCache.sprints) workspaceCache.sprints = {};
    workspaceCache.sprints[projectId] = response;
    return true;
  }
  if (normalized === '/v1/project/work_item/types') {
    const projectIdValue = params.project_id;
    if (typeof projectIdValue === 'string') {
      if (!workspaceCache.work_item_types) workspaceCache.work_item_types = {};
      workspaceCache.work_item_types[projectIdValue] = response;
      return true;
    }
  }
  if (normalized === '/v1/project/work_item/priorities') {
    const projectIdValue = params.project_id;
    if (typeof projectIdValue === 'string') {
      if (!workspaceCache.work_item_priorities) workspaceCache.work_item_priorities = {};
      workspaceCache.work_item_priorities[projectIdValue] = response;
      return true;
    }
  }
  if (normalized === '/v1/project/work_item/states') {
    const projectIdValue = params.project_id;
    const typeIdValue = params.work_item_type_id;
    if (typeof projectIdValue === 'string' && typeof typeIdValue === 'string') {
      if (!workspaceCache.work_item_states) workspaceCache.work_item_states = {};
      workspaceCache.work_item_states[stateCacheKey(projectIdValue, typeIdValue)] = response;
      return true;
    }
  }
  if (normalized === '/v1/project/work_item/properties') {
    const projectIdValue = params.project_id;
    const typeIdValue = params.work_item_type_id;
    if (typeof projectIdValue === 'string' && typeof typeIdValue === 'string') {
      if (!workspaceCache.work_item_properties) workspaceCache.work_item_properties = {};
      workspaceCache.work_item_properties[stateCacheKey(projectIdValue, typeIdValue)] = response;
      return true;
    }
  }
  if (normalized === '/v1/ship/idea/states') {
    const productIdValue = params.product_id;
    if (typeof productIdValue === 'string') {
      if (!workspaceCache.idea_states) workspaceCache.idea_states = {};
      workspaceCache.idea_states[productIdValue] = response;
      return true;
    }
  }
  if (normalized === '/v1/ship/idea/priorities') {
    const productIdValue = params.product_id;
    if (typeof productIdValue === 'string') {
      if (!workspaceCache.idea_priorities) workspaceCache.idea_priorities = {};
      workspaceCache.idea_priorities[productIdValue] = response;
      return true;
    }
  }
  return false;
}

class PingCodeClient {
  constructor({
    base_url,
    client_id = null,
    client_secret = null,
    token = null,
    token_cache = DEFAULT_TOKEN_CACHE,
    workspace_cache = DEFAULT_WORKSPACE_CACHE,
  } = {}) {
    this.baseUrl = (base_url || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.clientId = client_id;
    this.clientSecret = client_secret;
    this.token = token;
    this.tokenCache = token_cache ? expandUserPath(token_cache) : null;
    this.workspaceCachePath = workspace_cache ? expandUserPath(workspace_cache) : null;
    this.workspaceCache = loadWorkspaceCache(this.workspaceCachePath);
  }

  async accessToken() {
    if (this.token) {
      return this.token;
    }
    if (this.tokenCache) {
      const cached = loadCachedToken(this.tokenCache);
      if (cached) {
        this.token = cached;
        return cached;
      }
    }
    if (!this.clientId || !this.clientSecret) {
      throw new PingCodeError(
        'Missing credentials. Set PINGCODE_CLIENT_ID and PINGCODE_CLIENT_SECRET, ' +
        'or pass --token.\n' + AUTH_ENV_GUIDANCE
      );
    }
    const response = await this.rawRequest(
      'GET',
      '/v1/auth/token',
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
      null,
      false,
    );
    const token = response.access_token;
    if (typeof token !== 'string' || !token) {
      throw new PingCodeError('Token response did not include access_token');
    }
    this.token = token;
    if (this.tokenCache) {
      saveCachedToken(this.tokenCache, token, response.expires_in);
    }
    return token;
  }

  async rawRequest(method, rawPath, params = null, body = null, auth = true) {
    const url = buildUrl(this.baseUrl, rawPath, params);
    const headers = { Accept: 'application/json' };
    let fetchBody = undefined;
    if (body !== null && body !== undefined) {
      fetchBody = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
    if (auth) {
      headers.Authorization = `Bearer ${await this.accessToken()}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: fetchBody,
        signal: controller.signal,
      });
      const content = await response.text();
      if (!response.ok) {
        const retryAfter = response.headers.get('x-pc-retry-after');
        const suffix = retryAfter ? ` retry_after=${retryAfter}` : '';
        throw new PingCodeError(`HTTP ${response.status} ${response.statusText}.${suffix} ${content}`);
      }
      if (!content) return {};
      try {
        const parsed = JSON.parse(content);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { value: parsed };
        }
        return parsed;
      } catch (exc) {
        throw new PingCodeError(`Response was not JSON: ${content.slice(0, 300)}`);
      }
    } catch (exc) {
      if (exc instanceof PingCodeError) throw exc;
      throw new PingCodeError(`Request failed: ${exc.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async request(method, rawPath, params = null, body = null, { dry_run = false, use_workspace_cache = true } = {}) {
    method = method.toUpperCase();
    if (!HTTP_METHODS.includes(method)) {
      throw new PingCodeError(`Unsupported method: ${method}`);
    }
    if (dry_run) {
      return {
        dry_run: true,
        method,
        url: buildUrl(this.baseUrl, rawPath, params),
        path: rawPath,
        params: params || {},
        json: body,
      };
    }
    const requestParams = params || {};
    if (use_workspace_cache) {
      const cached = cachedResponse(method, rawPath, requestParams, this.workspaceCache, this.baseUrl);
      if (cached !== null) {
        return cached;
      }
    }
    const response = await this.rawRequest(method, rawPath, params, body);
    if (this.workspaceCachePath !== null && updateWorkspaceCacheForResponse(
      method,
      rawPath,
      requestParams,
      response,
      this.workspaceCache,
      this.baseUrl,
    )) {
      saveWorkspaceCache(this.workspaceCachePath, this.workspaceCache);
    }
    return response;
  }

  saveWorkspaceCache() {
    saveWorkspaceCache(this.workspaceCachePath, this.workspaceCache);
  }

  async fetchProjectUsers(projectId) {
    const encoded = encodeURIComponent(projectId);
    const rawPath = `/v1/project/projects/${encoded}/members`;
    const response = await this.request('GET', rawPath, { page_size: 100 }, null, { use_workspace_cache: false });
    updateWorkspaceCacheForResponse(
      'GET',
      rawPath,
      { page_size: 100 },
      response,
      this.workspaceCache,
      this.baseUrl,
    );
    this.saveWorkspaceCache();
    return response;
  }
}

async function listCommand(client, rawPath, params = null) {
  return await client.request('GET', rawPath, params || {});
}

async function refreshCommand(client, rawPath, params = null) {
  return await client.request('GET', rawPath, params || {}, null, { use_workspace_cache: false });
}

async function cacheProjects(client) {
  return await refreshCommand(client, '/v1/project/projects', { page_size: 100 });
}

async function cacheSprints(client, projectId) {
  const encoded = encodeURIComponent(projectId);
  return await refreshCommand(client, `/v1/project/projects/${encoded}/sprints`, { page_size: 100 });
}

async function cacheWorkItemTypes(client, projectId) {
  return await refreshCommand(client, '/v1/project/work_item/types', { project_id: projectId, page_size: 100 });
}

async function cacheWorkItemPriorities(client, projectId) {
  return await refreshCommand(client, '/v1/project/work_item/priorities', { project_id: projectId, page_size: 100 });
}

async function cacheWorkItemStates(client, projectId, workItemTypeId) {
  return await refreshCommand(client, '/v1/project/work_item/states', { project_id: projectId, work_item_type_id: workItemTypeId });
}

async function cacheAllWorkItemStates(client, projectId) {
  const typesPayload = await cacheWorkItemTypes(client, projectId);
  const states = {};
  for (const item of pageValues(typesPayload)) {
    const typeId = item.id;
    if (typeof typeId !== 'string' || !typeId) continue;
    states[typeId] = await cacheWorkItemStates(client, projectId, typeId);
  }
  return {
    project_id: projectId,
    work_item_types: typesPayload,
    work_item_states: states,
  };
}

async function cacheWorkItemProperties(client, projectId, workItemTypeId) {
  return await refreshCommand(client, '/v1/project/work_item/properties', { project_id: projectId, work_item_type_id: workItemTypeId, page_size: 100 });
}

async function cacheAllWorkItemProperties(client, projectId) {
  const typesPayload = await cacheWorkItemTypes(client, projectId);
  const properties = {};
  for (const item of pageValues(typesPayload)) {
    const typeId = item.id;
    if (typeof typeId !== 'string' || !typeId) continue;
    properties[typeId] = await cacheWorkItemProperties(client, projectId, typeId);
  }
  return {
    project_id: projectId,
    work_item_types: typesPayload,
    work_item_properties: properties,
  };
}

async function cacheIdeaStates(client, productId) {
  return await refreshCommand(client, '/v1/ship/idea/states', { product_id: productId, page_size: 100 });
}

async function cacheIdeaPriorities(client, productId) {
  return await refreshCommand(client, '/v1/ship/idea/priorities', { product_id: productId, page_size: 100 });
}

async function cacheUsers(client, projectId = null) {
  const selectedProjectId = projectId || (client.workspaceCache.preferences || {}).current_project_id;
  if (typeof selectedProjectId === 'string' && selectedProjectId) {
    return await client.fetchProjectUsers(selectedProjectId);
  }
  try {
    return await refreshCommand(client, '/v1/directory/users', { page_size: 100 });
  } catch (exc) {
    throw new PingCodeError(
      `${exc.message}\n` +
      'If this tenant does not expose a global user-list endpoint, set a current project first or pass ' +
      '--project-id so the CLI can cache project members.'
    );
  }
}

async function contextOptions(client, kind, projectId = null) {
  let payload;
  if (kind === 'project') {
    payload = await cacheProjects(client);
  } else if (kind === 'sprint') {
    const selectedProjectId = projectId || (client.workspaceCache.preferences || {}).current_project_id;
    if (typeof selectedProjectId !== 'string' || !selectedProjectId) {
      throw new PingCodeError('Provide --project-id or set a cached current project before listing sprint options');
    }
    payload = await cacheSprints(client, selectedProjectId);
  } else if (kind === 'user') {
    payload = await cacheUsers(client, projectId);
  } else {
    throw new PingCodeError(`Unsupported context option kind: ${kind}`);
  }
  const [options, total] = selectionOptions(payload);
  return { kind, total, options };
}

async function setCurrentUser(client, userId) {
  const usersPayload = client.workspaceCache.users;
  const users = pageValues(usersPayload);
  let found = null;
  if (users.length > 0) {
    try {
      found = findCachedItem(users, userId, 'user');
    } catch (exc) {
      found = users.find(item => item.id === userId) || null;
    }
  }
  if (!client.workspaceCache.preferences) client.workspaceCache.preferences = {};
  const preferences = client.workspaceCache.preferences;
  const entity = found ? normalizedEntity(found) : null;
  preferences.current_user_id = (entity && entity.id) ? entity.id : userId;
  if (found) {
    for (const key of ['display_name', 'name']) {
      const value = entity ? entity[key] : null;
      if (typeof value === 'string' && value) {
        preferences.current_user_name = value;
        break;
      }
    }
  }
  client.saveWorkspaceCache();
  return { preferences, message: 'current user cached' };
}

async function setCurrentProject(client, projectId) {
  const projects = pageValues(client.workspaceCache.projects);
  let found = null;
  if (projects.length > 0) {
    try {
      found = findCachedItem(projects, projectId, 'project');
    } catch (exc) {
      found = projects.find(item => item.id === projectId) || null;
    }
  }
  if (!client.workspaceCache.preferences) client.workspaceCache.preferences = {};
  const preferences = client.workspaceCache.preferences;
  preferences.current_project_id = (found && found.id) ? found.id : projectId;
  if (found && typeof found.name === 'string') {
    preferences.current_project_name = found.name;
  }
  client.saveWorkspaceCache();
  return { preferences, message: 'current project cached' };
}

async function setCurrentSprint(client, sprintId) {
  if (!client.workspaceCache.preferences) client.workspaceCache.preferences = {};
  const preferences = client.workspaceCache.preferences;
  const allSprints = [];
  for (const payload of Object.values(client.workspaceCache.sprints || {})) {
    allSprints.push(...pageValues(payload));
  }
  let found = null;
  if (allSprints.length > 0) {
    try {
      found = findCachedItem(allSprints, sprintId, 'sprint');
    } catch (exc) {
      found = allSprints.find(item => item.id === sprintId) || null;
    }
  }
  preferences.current_sprint_id = (found && found.id) ? found.id : sprintId;
  if (found && typeof found.name === 'string') {
    preferences.current_sprint_name = found.name;
  }
  client.saveWorkspaceCache();
  return { preferences, message: 'current sprint cached' };
}

function applyDefaultWorkItemFilters(
  rawPath,
  params,
  client,
  userId,
  userName,
  currentUser = true,
  allProjects = false,
  allSprints = false,
) {
  if (
    normalizePath(rawPath, client.baseUrl) !== '/v1/project/work_items' ||
    !pathIsListWorkItems(rawPath, client.baseUrl)
  ) {
    return params;
  }
  const result = { ...params };
  const preferences = client.workspaceCache.preferences || {};
  if (currentUser && !('assignee_ids' in result)) {
    result.assignee_ids = currentUserId(userId, client.workspaceCache);
  }
  if (!allProjects && !('project_ids' in result)) {
    const projectId = preferences.current_project_id;
    if (typeof projectId !== 'string' || !projectId) {
      throw new PingCodeError(WORKSPACE_DEFAULT_GUIDANCE);
    }
    result.project_ids = projectId;
  }
  if (!allSprints && !('sprint_ids' in result)) {
    const sprintId = preferences.current_sprint_id;
    if (typeof sprintId !== 'string' || !sprintId) {
      throw new PingCodeError(WORKSPACE_DEFAULT_GUIDANCE);
    }
    result.sprint_ids = sprintId;
  }
  return expandIdentityPlaceholders(
    result,
    userId,
    userName,
    client.workspaceCache,
  ) || {};
}

function ensureWorkItemWorkspaceContext(
  rawPath,
  client,
  method = 'GET',
  currentUser = true,
  allProjects = false,
  allSprints = false,
) {
  if (normalizePath(rawPath, client.baseUrl) !== '/v1/project/work_items') {
    return;
  }
  if (method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'POST') {
    return;
  }
  const preferences = client.workspaceCache.preferences || {};
  const required = [];
  if (currentUser) required.push('current_user_id');
  if (!allProjects) required.push('current_project_id');
  if (!allSprints) required.push('current_sprint_id');
  const missing = required.filter(key => typeof preferences[key] !== 'string' || !preferences[key]);
  if (missing.length > 0) {
    throw new PingCodeError(`${WORKSPACE_DEFAULT_GUIDANCE}\nMissing preferences: ${missing.join(', ')}`);
  }
}

function applyDefaultWorkItemCreateBody(method, rawPath, body, client, userId, currentUser = true) {
  if (
    method.toUpperCase() !== 'POST' ||
    normalizePath(rawPath, client.baseUrl) !== '/v1/project/work_items' ||
    body === null || body === undefined
  ) {
    return body;
  }
  const result = { ...body };
  if (currentUser && !('assignee_id' in result)) {
    result.assignee_id = currentUserId(userId, client.workspaceCache);
  }
  return result;
}

function pathIsListWorkItems(rawPath, baseUrl = DEFAULT_BASE_URL) {
  return normalizePath(rawPath, baseUrl) === '/v1/project/work_items';
}

function printJson(data) {
  const sorted = sortKeys(data);
  console.log(JSON.stringify(sorted, null, 2));
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      sorted[key] = sortKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

function buildParser() {
  return {
    parseArgs(argv) {
      const args = {
        base_url: process.env.PINGCODE_BASE_URL || DEFAULT_BASE_URL,
        client_id: process.env.PINGCODE_CLIENT_ID || null,
        client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
        token: process.env.PINGCODE_ACCESS_TOKEN || null,
        user_id: process.env.PINGCODE_USER_ID || null,
        user_name: process.env.PINGCODE_USER_NAME || null,
        no_token_cache: false,
        workspace_cache: process.env.PINGCODE_WORKSPACE_CACHE || DEFAULT_WORKSPACE_CACHE,
        no_workspace_cache: false,
        no_cache_read: false,
        cache_users: false,
        cache_projects: false,
        cache_sprints: false,
        cache_work_item_types: false,
        cache_work_item_priorities: false,
        cache_work_item_properties: false,
        cache_states: false,
        cache_idea_states: false,
        cache_idea_priorities: false,
        context_options: null,
        set_current_user: null,
        set_current_project: null,
        set_current_sprint: null,
        project_id: null,
        product_id: null,
        work_item_type_id: null,
        all_users: false,
        all_projects: false,
        all_sprints: false,
        method: 'GET',
        path: null,
        param: [],
        data: null,
        dry_run: false,
        compact: false,
      };

      const booleanFlags = new Set([
        '--no-token-cache', '--no-workspace-cache', '--no-cache-read',
        '--cache-users', '--cache-projects', '--cache-sprints',
        '--cache-work-item-types', '--cache-work-item-priorities', '--cache-work-item-properties',
        '--cache-states', '--cache-idea-states', '--cache-idea-priorities',
        '--all-users', '--all-projects', '--all-sprints', '--dry-run', '--compact',
      ]);
      const stringFlags = {
        '--base-url': 'base_url',
        '--client-id': 'client_id',
        '--client-secret': 'client_secret',
        '--token': 'token',
        '--user-id': 'user_id',
        '--user-name': 'user_name',
        '--workspace-cache': 'workspace_cache',
        '--context-options': 'context_options',
        '--set-current-user': 'set_current_user',
        '--set-current-project': 'set_current_project',
        '--set-current-sprint': 'set_current_sprint',
        '--project-id': 'project_id',
        '--product-id': 'product_id',
        '--work-item-type-id': 'work_item_type_id',
        '--method': 'method',
        '--path': 'path',
        '--param': 'param',
        '--data': 'data',
      };
      const choiceFlags = {
        '--context-options': ['project', 'sprint', 'user'],
      };
      const repeatableFlags = new Set(['--param']);

      const tokens = argv || process.argv.slice(2);
      for (let i = 0; i < tokens.length; i++) {
        const arg = tokens[i];
        if (arg === '--help' || arg === '-h') {
          console.log(usageText());
          process.exit(0);
        }
        if (booleanFlags.has(arg)) {
          const key = arg.replace(/^--/, '').replace(/-/g, '_');
          args[key] = true;
          continue;
        }
        if (arg.startsWith('--no-') && arg.includes('=')) {
          // not handled
        }
        const eqIndex = arg.indexOf('=');
        let flag, value, consumedNext = false;
        if (eqIndex !== -1) {
          flag = arg.slice(0, eqIndex);
          value = arg.slice(eqIndex + 1);
        } else {
          flag = arg;
          if (i + 1 < tokens.length) {
            value = tokens[i + 1];
            consumedNext = true;
          } else {
            throw new PingCodeError(`Flag ${flag} requires a value`);
          }
        }
        if (!(flag in stringFlags)) {
          throw new PingCodeError(`Unknown option: ${flag}`);
        }
        if (choiceFlags[flag] && !choiceFlags[flag].includes(value)) {
          throw new PingCodeError(`${flag} must be one of: ${choiceFlags[flag].join(', ')}`);
        }
        if (flag === '--method') {
          value = value.toUpperCase();
          if (!HTTP_METHODS.includes(value)) {
            throw new PingCodeError(`Unsupported method: ${value}`);
          }
        }
        if (repeatableFlags.has(flag)) {
          args[stringFlags[flag]].push(value);
        } else {
          args[stringFlags[flag]] = value;
        }
        if (consumedNext) i += 1;
      }
      return args;
    },
  };
}

function usageText() {
  return [
    'Single-command PingCode REST API caller',
    '',
    'Usage: node scripts/pingcode.js [options]',
    '',
    'Options:',
    '  --base-url URL',
    '  --client-id ID',
    '  --client-secret SECRET',
    '  --token TOKEN',
    '  --user-id ID',
    '  --user-name NAME',
    '  --no-token-cache',
    '  --workspace-cache PATH',
    '  --no-workspace-cache',
    '  --no-cache-read',
    '  --cache-users',
    '  --cache-projects',
    '  --cache-sprints',
    '  --cache-work-item-types',
    '  --cache-work-item-priorities',
    '  --cache-work-item-properties',
    '  --cache-states',
    '  --cache-idea-states',
    '  --cache-idea-priorities',
    '  --context-options {project|sprint|user}',
    '  --set-current-user ID',
    '  --set-current-project ID',
    '  --set-current-sprint ID',
    '  --project-id ID',
    '  --product-id ID',
    '  --work-item-type-id ID',
    '  --all-users',
    '  --all-projects',
    '  --all-sprints',
    '  --method {GET|POST|PUT|PATCH|DELETE|OPTIONS}',
    '  --path PATH',
    '  --param KEY=VALUE  (repeatable)',
    '  --data JSON',
    '  --dry-run',
    '  --compact',
    '  -h, --help',
    '',
    'Examples:',
    `  ${CLI_COMMAND} --method GET --path /v1/project/projects --param page_size=20`,
    `  ${CLI_COMMAND} --method POST --path /v1/project/work_items --data '{"project_id":"...","type_id":"story","title":"..."}'`,
  ].join('\n');
}

function clientFromArgs(args) {
  const tokenCache = args.no_token_cache ? null : (process.env.PINGCODE_TOKEN_CACHE || DEFAULT_TOKEN_CACHE);
  const workspaceCache = args.no_workspace_cache ? null : args.workspace_cache;
  return new PingCodeClient({
    base_url: args.base_url,
    client_id: args.client_id,
    client_secret: args.client_secret,
    token: args.token,
    token_cache: tokenCache,
    workspace_cache: workspaceCache,
  });
}

async function run(args) {
  const client = clientFromArgs(args);
  if (args.context_options) {
    return await contextOptions(client, args.context_options, args.project_id);
  }
  if (args.cache_users) {
    return await cacheUsers(client, args.project_id);
  }
  if (args.cache_projects) {
    return await cacheProjects(client);
  }
  if (args.cache_sprints) {
    const projectId = args.project_id || (client.workspaceCache.preferences || {}).current_project_id;
    if (typeof projectId !== 'string' || !projectId) {
      throw new PingCodeError('Provide --project-id or set a cached current project before --cache-sprints');
    }
    return await cacheSprints(client, projectId);
  }
  if (args.cache_work_item_types) {
    const projectId = args.project_id || (client.workspaceCache.preferences || {}).current_project_id;
    if (typeof projectId !== 'string' || !projectId) {
      throw new PingCodeError('Provide --project-id or set a cached current project before --cache-work-item-types');
    }
    return await cacheWorkItemTypes(client, projectId);
  }
  if (args.cache_work_item_priorities) {
    const projectId = args.project_id || (client.workspaceCache.preferences || {}).current_project_id;
    if (typeof projectId !== 'string' || !projectId) {
      throw new PingCodeError('Provide --project-id or set a cached current project before --cache-work-item-priorities');
    }
    return await cacheWorkItemPriorities(client, projectId);
  }
  if (args.cache_work_item_properties) {
    const projectId = args.project_id || (client.workspaceCache.preferences || {}).current_project_id;
    if (typeof projectId !== 'string' || !projectId) {
      throw new PingCodeError('Provide --project-id or set a cached current project before --cache-work-item-properties');
    }
    if (!args.work_item_type_id) {
      return await cacheAllWorkItemProperties(client, projectId);
    }
    return await cacheWorkItemProperties(client, projectId, args.work_item_type_id);
  }
  if (args.cache_states) {
    const projectId = args.project_id || (client.workspaceCache.preferences || {}).current_project_id;
    if (typeof projectId !== 'string' || !projectId) {
      throw new PingCodeError('Provide --project-id or set a cached current project before --cache-states');
    }
    if (!args.work_item_type_id) {
      return await cacheAllWorkItemStates(client, projectId);
    }
    return await cacheWorkItemStates(client, projectId, args.work_item_type_id);
  }
  if (args.cache_idea_states) {
    if (!args.product_id) {
      throw new PingCodeError('Provide --product-id before --cache-idea-states');
    }
    return await cacheIdeaStates(client, args.product_id);
  }
  if (args.cache_idea_priorities) {
    if (!args.product_id) {
      throw new PingCodeError('Provide --product-id before --cache-idea-priorities');
    }
    return await cacheIdeaPriorities(client, args.product_id);
  }
  if (args.set_current_user) {
    return await setCurrentUser(client, args.set_current_user);
  }
  if (args.set_current_project) {
    return await setCurrentProject(client, args.set_current_project);
  }
  if (args.set_current_sprint) {
    return await setCurrentSprint(client, args.set_current_sprint);
  }
  if (!args.path) {
    throw new PingCodeError('--path is required unless using a cache helper command');
  }
  const workspaceCache = client.workspaceCache;
  let params = expandIdentityPlaceholders(
    parseKeyValues(args.param),
    args.user_id,
    args.user_name,
    workspaceCache,
  ) || {};
  ensureWorkItemWorkspaceContext(
    args.path,
    client,
    args.method,
    !args.all_users,
    args.all_projects,
    args.all_sprints,
  );
  if (args.method === 'GET') {
    params = applyDefaultWorkItemFilters(
      args.path,
      params,
      client,
      args.user_id,
      args.user_name,
      !args.all_users,
      args.all_projects,
      args.all_sprints,
    );
  }
  let body = expandIdentityPlaceholders(
    parseJsonObject(args.data, '--data'),
    args.user_id,
    args.user_name,
    workspaceCache,
  );
  body = applyDefaultWorkItemCreateBody(
    args.method,
    args.path,
    body,
    client,
    args.user_id,
    !args.all_users,
  );
  const result = await client.request(
    args.method,
    args.path,
    params,
    body,
    {
      dry_run: args.dry_run,
      use_workspace_cache: !args.no_cache_read,
    },
  );
  if (args.compact && !args.dry_run) {
    return compactResponse(result);
  }
  return result;
}

async function main(argv) {
  const parser = buildParser();
  let args;
  try {
    args = parser.parseArgs(argv);
  } catch (exc) {
    console.error(`error: ${exc.message}`);
    process.exitCode = 1;
    return;
  }
  try {
    printJson(await run(args));
  } catch (exc) {
    if (exc instanceof PingCodeError) {
      console.error(`error: ${exc.message}`);
    } else {
      console.error(`error: ${exc.message}`);
    }
    process.exitCode = 1;
  }
}

module.exports = {
  PingCodeError,
  PingCodeClient,
  DEFAULT_BASE_URL,
  DEFAULT_TOKEN_CACHE,
  DEFAULT_WORKSPACE_CACHE,
  HTTP_METHODS,
  MAX_SELECTION_OPTIONS,
  CLI_COMMAND,
  CTX_COMMAND,
  AUTH_ENV_GUIDANCE,
  USER_ENV_GUIDANCE,
  WORKSPACE_DEFAULT_GUIDANCE,
  emptyWorkspaceCache,
  parseJsonObject,
  parseKeyValues,
  loadWorkspaceCache,
  mergeWorkspaceCache,
  compactWorkspaceCacheValue,
  saveWorkspaceCache,
  currentUserId,
  currentUserName,
  pageValues,
  nestedText,
  compactBusinessItem,
  compactResponse,
  normalizedEntity,
  itemNames,
  selectionItem,
  selectionOptions,
  selectionGuidance,
  findCachedItem,
  cachedUserId,
  expandIdentityPlaceholder,
  expandIdentityPlaceholders,
  loadCachedToken,
  saveCachedToken,
  buildUrl,
  normalizePath,
  stateCacheKey,
  sprintProjectId,
  memberProjectId,
  cachedResponse,
  updateWorkspaceCacheForResponse,
  pathIsListWorkItems,
  listCommand,
  refreshCommand,
  cacheProjects,
  cacheSprints,
  cacheWorkItemTypes,
  cacheWorkItemPriorities,
  cacheWorkItemStates,
  cacheAllWorkItemStates,
  cacheWorkItemProperties,
  cacheAllWorkItemProperties,
  cacheIdeaStates,
  cacheIdeaPriorities,
  cacheUsers,
  contextOptions,
  setCurrentUser,
  setCurrentProject,
  setCurrentSprint,
  applyDefaultWorkItemFilters,
  ensureWorkItemWorkspaceContext,
  applyDefaultWorkItemCreateBody,
  buildParser,
  clientFromArgs,
  run,
  printJson,
  main,
};

if (require.main === module) {
  main().catch(exc => {
    console.error(`error: ${exc.message}`);
    process.exitCode = 1;
  });
}
