'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const DEFAULT_BASE_URL = 'https://open.pingcode.com';
const DEFAULT_TOKEN_CACHE = '~/.cache/pingcode/token.json';
const DEFAULT_WORKSPACE_CACHE = '.pingcode/cache.json';
const MAX_TOKEN_TTL_SECONDS = 29 * 24 * 60 * 60;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const USER_LOOKUP_RE = /@user:([^,]+)/g;
const MAX_SELECTION_OPTIONS = 20;

const CLI_COMMAND = 'node scripts/pingcode.js';
const CTX_COMMAND = 'node scripts/pingcode.js context init';
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
  `  ${CLI_COMMAND} context list\n` +
  'Then save your current user with:\n' +
  `  ${CLI_COMMAND} context set-current-user USER_ID\n` +
  'For guided workspace setup, run:\n' +
  `  ${CTX_COMMAND}`
);

const WORKSPACE_DEFAULT_GUIDANCE = (
  'PingCode workspace context is incomplete. Run the interactive setup command first:\n' +
  `  Run: ${CTX_COMMAND}\n` +
  'It caches the current user, project, and sprint/iteration in .pingcode/cache.json.\n' +
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

function displayName(item) {
  const entity = normalizedEntity(item);
  for (const key of ['display_name', 'name', 'identifier', 'email', 'id']) {
    const value = entity[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return '<unnamed>';
}

function itemId(item, label) {
  const value = normalizedEntity(item).id;
  if (typeof value !== 'string' || !value) {
    throw new PingCodeError(`Selected ${label} has no id`);
  }
  return value;
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

function readRawTokenCache(cachePath) {
  try {
    const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload;
    }
  } catch (exc) {
    // ignore
  }
  return null;
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
  return {
    grant_type: payload.grant_type || 'client_credentials',
    access_token: token,
    refresh_token: typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
    expires_at: expiresAt,
  };
}

function saveCachedToken(cachePath, token, expiresIn, grantType = 'client_credentials', refreshToken = null) {
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
    grant_type: grantType,
    access_token: token,
    expires_at: Math.floor(Date.now() / 1000) + ttl,
  };
  if (refreshToken) {
    payload.refresh_token = refreshToken;
  }
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
    grant_type = 'client_credentials',
  } = {}) {
    this.baseUrl = (base_url || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.clientId = client_id;
    this.clientSecret = client_secret;
    this.token = token;
    this.tokenCache = token_cache ? expandUserPath(token_cache) : null;
    this.workspaceCachePath = workspace_cache ? expandUserPath(workspace_cache) : null;
    this.workspaceCache = loadWorkspaceCache(this.workspaceCachePath);
    this.grantType = grant_type;
  }

  resolveGrantType() {
    if (this.grantType !== 'auto') {
      return this.grantType;
    }
    if (this.tokenCache) {
      const raw = readRawTokenCache(this.tokenCache);
      if (raw && typeof raw.grant_type === 'string') {
        return raw.grant_type;
      }
    }
    return 'client_credentials';
  }

  async accessToken() {
    const grantType = this.resolveGrantType();
    if (this.token) {
      return this.token;
    }
    if (this.tokenCache) {
      const cached = loadCachedToken(this.tokenCache);
      if (cached) {
        if (cached.grant_type !== grantType) {
          throw new PingCodeError(
            `Cached token grant_type '${cached.grant_type}' does not match ` +
            `configured '${grantType}'. Remove the token cache and re-authenticate.`
          );
        }
        this.token = cached.access_token;
        return cached.access_token;
      }
      if (grantType === 'authorization_code') {
        const raw = readRawTokenCache(this.tokenCache);
        if (raw && typeof raw.refresh_token === 'string' && raw.refresh_token) {
          return this.refreshAccessToken(raw.refresh_token);
        }
      }
    }
    if (grantType === 'client_credentials') {
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
        saveCachedToken(this.tokenCache, token, response.expires_in, 'client_credentials');
      }
      return token;
    }
    if (grantType === 'authorization_code') {
      throw new PingCodeError(
        'No valid user token available. Run `login` to authenticate with your PingCode account.'
      );
    }
    throw new PingCodeError(`Unsupported grant_type: ${grantType}`);
  }

  async exchangeAuthorizationCode(code, redirectUri) {
    const params = {
      grant_type: 'authorization_code',
      code: code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    };
    if (redirectUri) {
      params.redirect_uri = redirectUri;
    }
    const response = await this.rawRequest('GET', '/v1/auth/token', params, null, false);
    const accessToken = response.access_token;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new PingCodeError('Token response did not include access_token');
    }
    this.token = accessToken;
    const refreshToken = typeof response.refresh_token === 'string' ? response.refresh_token : null;
    if (this.tokenCache) {
      saveCachedToken(this.tokenCache, accessToken, response.expires_in, 'authorization_code', refreshToken);
    }
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    const response = await this.rawRequest(
      'GET',
      '/v1/auth/token',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
      null,
      false,
    );
    const accessToken = response.access_token;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new PingCodeError('Token refresh response did not include access_token');
    }
    this.token = accessToken;
    const newRefreshToken = typeof response.refresh_token === 'string' ? response.refresh_token : refreshToken;
    if (this.tokenCache) {
      saveCachedToken(this.tokenCache, accessToken, response.expires_in, 'authorization_code', newRefreshToken);
    }
    return accessToken;
  }

  buildAuthorizationUrl(redirectUri, state) {
    return buildUrl(this.baseUrl, '/oauth2/authorize', {
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state: state,
    });
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
    const response = await fetchAllPages(this, rawPath, {});
    if (this.workspaceCachePath !== null && updateWorkspaceCacheForResponse(
      'GET',
      rawPath,
      {},
      response,
      this.workspaceCache,
      this.baseUrl,
    )) {
      saveWorkspaceCache(this.workspaceCachePath, this.workspaceCache);
    }
    return response;
  }
}

const DEFAULT_PAGE_SIZE = 100;

async function fetchAllPages(client, rawPath, params = {}) {
  const allValues = [];
  let pageIndex = 0;
  let lastResponse = null;
  while (true) {
    const pageParams = { ...params, page_size: DEFAULT_PAGE_SIZE, page_index: pageIndex };
    const response = await client.rawRequest('GET', rawPath, pageParams);
    if (!response || typeof response !== 'object' || Array.isArray(response)) break;
    const values = pageValues(response);
    if (values.length === 0) break;
    allValues.push(...values);
    lastResponse = response;
    const total = response.total;
    if (typeof total === 'number') {
      if (total <= allValues.length) break;
    } else if (values.length < DEFAULT_PAGE_SIZE) {
      break;
    }
    pageIndex += 1;
  }
  if (lastResponse) {
    return {
      ...lastResponse,
      page_size: DEFAULT_PAGE_SIZE,
      page_index: pageIndex,
      total: lastResponse.total || allValues.length,
      count: allValues.length,
      values: allValues,
    };
  }
  return { values: allValues };
}

async function refreshCommand(client, rawPath, params = null) {
  const response = await fetchAllPages(client, rawPath, params || {});
  if (client.workspaceCachePath !== null && updateWorkspaceCacheForResponse(
    'GET',
    rawPath,
    params || {},
    response,
    client.workspaceCache,
    client.baseUrl,
  )) {
    saveWorkspaceCache(client.workspaceCachePath, client.workspaceCache);
  }
  return response;
}

async function cacheProjects(client) {
  return await refreshCommand(client, '/v1/project/projects', {});
}

async function cacheSprints(client, projectId) {
  const encoded = encodeURIComponent(projectId);
  return await refreshCommand(client, `/v1/project/projects/${encoded}/sprints`, {});
}

async function cacheWorkItemTypes(client, projectId) {
  return await refreshCommand(client, '/v1/project/work_item/types', { project_id: projectId });
}

async function cacheWorkItemPriorities(client, projectId) {
  return await refreshCommand(client, '/v1/project/work_item/priorities', { project_id: projectId });
}

async function cacheWorkItemStates(client, projectId, workItemTypeId) {
  return await refreshCommand(client, '/v1/project/work_item/states', { project_id: projectId, work_item_type_id: workItemTypeId });
}

async function cacheWorkItemProperties(client, projectId, workItemTypeId) {
  return await refreshCommand(client, '/v1/project/work_item/properties', { project_id: projectId, work_item_type_id: workItemTypeId });
}

async function cacheUsers(client, projectId = null) {
  const selectedProjectId = projectId || (client.workspaceCache.preferences || {}).current_project_id;
  if (typeof selectedProjectId === 'string' && selectedProjectId) {
    return await client.fetchProjectUsers(selectedProjectId);
  }
  try {
    return await refreshCommand(client, '/v1/directory/users', {});
  } catch (exc) {
    throw new PingCodeError(
      `${exc.message}\n` +
      'If this tenant does not expose a global user-list endpoint, set a current project first or pass ' +
      '--project-id so the CLI can cache project members.'
    );
  }
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

function startAuthCallbackServer({port, path: callbackPath, state, timeoutMs = 120000}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let pendingResult = null;

    function finish(action, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pendingResult = { action, value };
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(() => {
        if (action === 'resolve') resolve(value);
        else reject(value);
      });
    }

    const server = http.createServer((req, res) => {
      res.setHeader('Connection', 'close');
      const callbackUrl = new URL(req.url, 'http://127.0.0.1');

      if (callbackUrl.pathname !== callbackPath) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = callbackUrl.searchParams.get('code');
      const oauthError = callbackUrl.searchParams.get('error');

      if (oauthError) {
        const errorDescription = callbackUrl.searchParams.get('error_description') || '';
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<html><body><h1>Authentication Error</h1>' +
          `<p>${escapeHtml(oauthError)}${errorDescription ? ': ' + escapeHtml(errorDescription) : ''}</p>` +
          '<p>You can close this window.</p></body></html>',
        );
        finish('reject', new PingCodeError(
          `OAuth error: ${oauthError}${errorDescription ? ' - ' + errorDescription : ''}`,
        ));
        return;
      }

      const returnedState = callbackUrl.searchParams.get('state');
      if (returnedState && returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<html><body><h1>State Mismatch</h1>' +
          '<p>The state parameter does not match.</p>' +
          '<p>You can close this window.</p></body></html>',
        );
        finish('reject', new PingCodeError(
          `State mismatch: expected '${state}', got '${returnedState}'`,
        ));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<html><body><h1>Authentication Successful</h1>' +
          '<p>You can close this window.</p></body></html>',
        );
        finish('resolve', { code, state: returnedState || state });
        return;
      }

      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<html><body><h1>Bad Request</h1>' +
        '<p>Missing authorization code.</p>' +
        '<p>You can close this window.</p></body></html>',
      );
      finish('reject', new PingCodeError('No authorization code in callback'));
    });

    const timer = setTimeout(() => {
      finish('reject', new PingCodeError(`OAuth callback timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    server.on('error', (err) => {
      finish('reject', new PingCodeError(`Callback server error: ${err.message}`));
    });

    server.listen(port, '127.0.0.1');
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  displayName,
  itemId,
  selectionItem,
  selectionOptions,
  selectionGuidance,
  findCachedItem,
  cachedUserId,
  expandIdentityPlaceholder,
  expandIdentityPlaceholders,
  loadCachedToken,
  saveCachedToken,
  readRawTokenCache,
  buildUrl,
  normalizePath,
  stateCacheKey,
  sprintProjectId,
  memberProjectId,
  cachedResponse,
  updateWorkspaceCacheForResponse,
  pathIsListWorkItems,
  startAuthCallbackServer,
  refreshCommand,
  cacheProjects,
  cacheSprints,
  cacheWorkItemTypes,
  cacheWorkItemPriorities,
  cacheWorkItemStates,
  cacheWorkItemProperties,
  cacheUsers,
  setCurrentUser,
  setCurrentProject,
  setCurrentSprint,
  applyDefaultWorkItemFilters,
  ensureWorkItemWorkspaceContext,
  applyDefaultWorkItemCreateBody,
  printJson,
};
