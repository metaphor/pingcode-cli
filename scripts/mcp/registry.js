'use strict';

// Registry executor: turns endpoint-registry entries (scripts/mcp/endpoints.js)
// into concrete PingCodeClient requests. Shared by the MCP server and any
// generated CLI surface.

const core = require('../core');
const { ENDPOINTS } = require('./endpoints');

const BY_TOOL = new Map(ENDPOINTS.map((e) => [e.tool, e]));
const DOMAINS = [...new Set(ENDPOINTS.map((e) => e.domain))];

const DEFAULT_PAGE_SIZE = 100;

function getEntry(tool) {
  return BY_TOOL.get(tool) || null;
}

function filterEndpoints(domainsSpec) {
  if (!domainsSpec) return ENDPOINTS;
  const wanted = new Set(String(domainsSpec).split(',').map((d) => d.trim()).filter(Boolean));
  return ENDPOINTS.filter((e) => wanted.has(e.domain));
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function setDotted(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] === undefined || node[parts[i]] === null || typeof node[parts[i]] !== 'object') {
      node[parts[i]] = {};
    }
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

// Dotted doc fields under an Object[] parent (e.g. `members.id` beside
// `members: Object[]`) describe array items; the array itself is the argument.
function isDocOnlyDotted(key, bodyDefs) {
  const parts = key.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const ancestor = bodyDefs[parts.slice(0, i).join('.')];
    if (ancestor && ancestor.type === 'array') return true;
  }
  return false;
}

// Mirrors the pagination loop used by core.js (not exported there), so the
// registry can auto-page any list endpoint without a curated command.
async function fetchAllPages(client, rawPath, params = {}) {
  const allValues = [];
  let pageIndex = 0;
  let lastResponse = null;
  while (true) {
    const pageParams = { ...params, page_size: DEFAULT_PAGE_SIZE, page_index: pageIndex };
    const response = await client.rawRequest('GET', rawPath, pageParams);
    if (!response || typeof response !== 'object' || Array.isArray(response)) break;
    const values = core.pageValues(response);
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

function buildRequest(entry, args = {}) {
  // pathAliases maps doc name -> URL placeholder; resolve accepts either.
  const byCanonical = {};
  for (const [alias, canonical] of Object.entries(entry.pathAliases || {})) {
    byCanonical[canonical] = alias;
  }
  const resolve = (k) => (!isBlank(args[k]) ? args[k] : args[byCanonical[k]]);
  const missing = [];
  for (const p of entry.pathParams || []) {
    if (isBlank(resolve(p))) missing.push(p);
  }
  for (const [k, def] of Object.entries(entry.query || {})) {
    if (def.required && isBlank(args[k])) missing.push(k);
  }
  // Dotted keys describe fields of nested objects/array items (e.g. members.id
  // inside members: Object[]); the parent argument satisfies them.
  for (const [k, def] of Object.entries(entry.body || {})) {
    if (def.required && !k.includes('.') && isBlank(args[k])) missing.push(k);
  }
  if (entry.upload === 'file' && isBlank(args.file)) missing.push('file');
  if (missing.length) {
    throw new core.PingCodeError(`Missing required argument(s): ${missing.join(', ')}`);
  }

  const path = entry.path.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(String(resolve(k))));
  const params = {};
  for (const [k] of Object.entries(entry.query || {})) {
    if (isBlank(args[k])) continue;
    params[k] = Array.isArray(args[k]) ? args[k].join(',') : args[k];
  }

  if (entry.upload === 'file') {
    return { method: entry.method, path, params, body: null, upload: 'file', title: args.title };
  }

  const body = {};
  for (const [k, def] of Object.entries(entry.body || {})) {
    if (isBlank(args[k])) continue;
    if (k.includes('.')) {
      if (!isDocOnlyDotted(k, entry.body || {})) setDotted(body, k, args[k]);
    } else {
      body[k] = args[k];
    }
  }
  return { method: entry.method, path, params, body: Object.keys(body).length ? body : null, upload: null, title: null };
}

function jsonSchema(entry) {
  const properties = {};
  const required = [];
  for (const p of entry.pathParams || []) {
    properties[p] = { type: 'string', description: `Path parameter. ${entry.path}` };
    required.push(p);
  }
  for (const [alias, canonical] of Object.entries(entry.pathAliases || {})) {
    properties[alias] = { type: 'string', description: `Alias for --${canonical} (name used by the API docs).` };
  }
  for (const [k, def] of Object.entries(entry.query || {})) {
    properties[k] = { ...def };
    if (def.required) required.push(k);
  }
  for (const [k, def] of Object.entries(entry.body || {})) {
    properties[k] = { ...def };
    if (def.required) required.push(k);
  }
  if (entry.upload === 'file') {
    properties.file = { type: 'string', description: 'Local path of the file to upload.' };
    required.push('file');
  }
  properties.dry_run = { type: 'boolean', description: 'Preview the request (method, URL, params, body) without sending it.' };
  properties.compact = { type: 'boolean', description: 'Compact the response to essential fields.' };
  if (entry.method === 'GET' && !/\{[^}]+\}$/.test(entry.path)) {
    properties.fetch_all = { type: 'boolean', description: 'Fetch every page (page_index/page_size handled automatically).' };
  }
  return { type: 'object', properties, required };
}

function toolDescription(entry) {
  const parts = [entry.name, `${entry.method} ${entry.path}`];
  if (entry.permission) parts.push(`权限: ${entry.permission}`);
  if (entry.scopes && entry.scopes.length) parts.push(`scopes: ${entry.scopes.join(', ')}`);
  return parts.join(' | ');
}

// Token values arrive typed from MCP; CLI parsing coerces strings beforehand.
async function execute(client, entry, args = {}, { dry_run = false, compact = false, fetch_all = false } = {}) {
  const { method, path, params, body, upload, title } = buildRequest(entry, args);

  if (dry_run) {
    return {
      dry_run: true,
      method,
      url: core.buildUrl(client.baseUrl, path, params),
      path,
      params,
      json: body,
      ...(upload === 'file' ? { file: args.file, title: title ?? null } : {}),
    };
  }

  if (upload === 'file') {
    const form = core.buildFileUploadForm(args.file, title ?? '');
    const response = await client.rawRequest(method, path, params, form);
    return compact ? core.compactResponse(response) : response;
  }

  if (fetch_all && method === 'GET' && !/\{[^}]+\}$/.test(entry.path)) {
    const response = await fetchAllPages(client, path, params);
    return compact ? core.compactResponse(response) : response;
  }

  const response = await client.request(method, path, params, body);
  return compact ? core.compactResponse(response) : response;
}

// CLI arg parsing: --key=value, --key value, bare --flag for booleans.
// Object/array values are JSON.parse'd; arrays also accept comma lists.
function parseCliArgs(entry, tokens) {
  const schema = jsonSchema(entry).properties;
  const args = {};
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.startsWith('--')) {
      throw new core.PingCodeError(`Unexpected argument: ${token}. Use --name=value flags.`);
    }
    let key = token.slice(2).replace(/-/g, '_');
    let value;
    const eq = key.indexOf('=');
    if (eq !== -1) {
      value = key.slice(eq + 1);
      key = key.slice(0, eq);
    } else if (schema[key] && schema[key].type === 'boolean') {
      value = 'true';
    } else {
      if (i + 1 >= tokens.length) throw new core.PingCodeError(`Flag --${key} requires a value`);
      value = tokens[++i];
    }
    if (!(key in schema)) {
      throw new core.PingCodeError(`Unknown flag --${key}. Allowed: ${Object.keys(schema).join(', ')}`);
    }
    args[key] = coerceValue(value, schema[key]);
  }
  return args;
}

function coerceValue(raw, def) {
  if (def.type === 'boolean') {
    if (raw === '' || raw === undefined) return true;
    return !['false', '0', 'no'].includes(String(raw).toLowerCase());
  }
  if (def.type === 'number') {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new core.PingCodeError(`Expected a number, got: ${raw}`);
    return n;
  }
  if (def.type === 'array') {
    const trimmed = String(raw).trim();
    if (trimmed.startsWith('[')) return JSON.parse(trimmed);
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (def.type === 'object') {
    const trimmed = String(raw).trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    return raw;
  }

  if (def.enum && !def.enum.map(String).includes(String(raw))) {
    throw new core.PingCodeError(`Value '${raw}' not in allowed enum: ${def.enum.join(', ')}`);
  }
  return raw;
}

// CLI action name for an entry within its domain: tool minus pingcode_<domain>_
function actionName(entry) {
  return entry.tool.replace(`pingcode_${entry.domain}_`, '').replace(/_/g, '-');
}

function actionsForDomain(domain) {
  return ENDPOINTS.filter((e) => e.domain === domain).map((e) => ({ action: actionName(e), entry: e }));
}

// MCP tool definitions generated from the registry (optionally domain-filtered).
function toolDefs(domainsSpec) {
  return filterEndpoints(domainsSpec).map((e) => ({
    name: e.tool,
    description: toolDescription(e),
    inputSchema: jsonSchema(e),
  }));
}

module.exports = {
  ENDPOINTS,
  DOMAINS,
  getEntry,
  filterEndpoints,
  buildRequest,
  jsonSchema,
  toolDescription,
  execute,
  parseCliArgs,
  coerceValue,
  actionName,
  actionsForDomain,
  toolDefs,
};
