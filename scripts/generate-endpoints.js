#!/usr/bin/env node
'use strict';

// Regenerates scripts/mcp/endpoints.js from the live PingCode API docs.
//
// Usage: node scripts/generate-endpoints.js
//
// Source of truth: https://open.pingcode.com/api_data.js (the apidoc export that
// powers the documentation site). Run again whenever the upstream docs change.

const fs = require('node:fs');
const path = require('node:path');

const DOCS_BASE = 'https://open.pingcode.com';

// Endpoint families already covered by pingcode-cli's curated hand-written
// command modules (identifier resolution, workspace context caching):
//   - workitem list/get/create/update/delete/search (scripts/commands/workitem.js)
//   - pjm project/sprint/member lists (workspace cache + resolveWorkItemIdentifier)
// The MCP server exposes the curated surface through dedicated tools instead.
// Placeholders are normalized to {} before comparison.
const SKIP_FAMILIES = new Set([
  'GET /v1/pjm/projects',
  'GET /v1/pjm/projects/{}/members',
  'GET /v1/pjm/projects/{}/sprints',
  'GET /v1/pjm/workitems',
  'GET /v1/pjm/workitems/{}',
  'POST /v1/pjm/workitems',
  'PATCH /v1/pjm/workitems/{}',
  'DELETE /v1/pjm/workitems/{}',
  'POST /v1/pjm/workitems/search',
]);

// Top-level resources that live directly under /v1/ (no domain segment);
// grouped under the "common" domain for tool naming.
const COMMON_SEGMENTS = new Set([
  'comments', 'attachments', 'workloads', 'relations', 'participants',
  'activities', 'reviews', 'entity_properties', 'permission', 'security',
  'myself', 'workload_types',
]);

// Undocumented internal storage APIs (custom entities, object storage, KV).
const EXCLUDED_PREFIXES = ['/v1/nexus/'];

function normMethod(type) {
  const m = String(type).toUpperCase();
  return m === 'DEL' ? 'DELETE' : m;
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function typeMap(type) {
  switch (type) {
    case 'String':
    case 'Sting': // typo in upstream docs
      return { type: 'string' };
    case 'Number':
    case 'number':
      return { type: 'number' };
    case 'Boolean':
      return { type: 'boolean' };
    case 'Object':
      return { type: 'object' };
    case 'String[]':
      return { type: 'array', items: { type: 'string' } };
    case 'Object[]':
      return { type: 'array', items: { type: 'object' } };
    case 'File':
      return { type: 'string' };
    default:
      return {}; // union types stay unconstrained
  }
}

function fieldDef(field) {
  const def = typeMap(field.type);
  if (field.description) def.description = stripHtml(field.description).slice(0, 300);
  if (field.allowedValues && field.allowedValues.length) {
    if (!def.type || def.type === 'string') def.enum = field.allowedValues.map(String);
    else if (def.type === 'number') {
      const note = `Allowed values: ${field.allowedValues.join(', ')}`;
      def.description = [def.description, note].filter(Boolean).join('. ');
    }
  }
  return def;
}

function domainOf(pathOnly) {
  const segs = pathOnly.split('/').filter(Boolean);
  if (segs[0] !== 'v1' || !segs[1]) return null;
  return COMMON_SEGMENTS.has(segs[1]) ? 'common' : segs[1];
}

function singular(word) {
  if (/(ies)$/.test(word)) return word.replace(/ies$/, 'y');
  if (/(ses)$/.test(word)) return word.replace(/es$/, '');
  if (/(ches|xes|shes)$/.test(word)) return word.replace(/es$/, '');
  if (/s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

function lastResourceSegment(pathOnly) {
  const segs = pathOnly.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    if (!/^\{.+\}$/.test(segs[i]) && !['search', 'bulk'].includes(segs[i])) return segs[i];
  }
  return '';
}

function makeName(method, pathOnly, domain) {
  const segs2 = pathOnly.split('/').filter(Boolean).slice(1); // drop 'v1'
  const rest = domain === 'common' ? segs2 : segs2.slice(1); // common: the segment itself is the resource
  const endsWithParam = /\{[^}]+\}$/.test(pathOnly);
  const isSearch = /(^|\/)search$/.test(pathOnly);
  const isBulk = /(^|\/)bulk$/.test(pathOnly);
  let verb;
  if (isSearch) verb = 'search';
  else if (isBulk) verb = method === 'POST' ? 'batch_create' : method.toLowerCase();
  else if (method === 'GET') verb = endsWithParam ? 'get' : 'list';
  else if (method === 'POST') verb = 'create';
  else if (method === 'PATCH') verb = endsWithParam ? 'update' : 'batch_update';
  else if (method === 'PUT') verb = endsWithParam ? 'replace' : 'batch_replace';
  else if (method === 'DELETE') verb = 'delete';
  else verb = method.toLowerCase();
  const resource = rest
    .filter((s) => !/^\{/.test(s))
    .filter((s) => !['search', 'bulk'].includes(s))
    .map(singular)
    .join('_');
  return { resource, verb };
}

function looksLikeConfigPath(pathOnly) {
  const last = lastResourceSegment(pathOnly);
  if (!last.includes('_')) return false;
  const tail = last.split('_').pop();
  return singular(tail) !== tail;
}

function buildEntries(articles) {
  const entries = [];
  const skipped = { nexus: 0, auth: 0, curated: 0, other: 0 };

  for (const a of articles) {
    const method = normMethod(a.type);
    const rawUrl = a.url.replace(/^https?:\/\/[^/]+/, '');
    const [pathOnly, urlQuery] = rawUrl.split('?');
    if (!pathOnly || pathOnly === '/') { skipped.other++; continue; }
    if (EXCLUDED_PREFIXES.some((p) => pathOnly.startsWith(p))) { skipped.nexus++; continue; }
    if (pathOnly === '/v1/auth/token') { skipped.auth++; continue; }
    const family = `${method} ${pathOnly.replace(/\{[^}]+\}/g, '{}')}`;
    if (SKIP_FAMILIES.has(family)) { skipped.curated++; continue; }
    const domain = domainOf(pathOnly);
    if (!domain) { skipped.other++; continue; }

    // URL placeholders are the source of truth for path params. Doc-declared
    // 路径参数 sometimes use different names (repository_id vs {repo_id});
    // when the counts match, zip them positionally and keep the doc names as
    // aliases. Declared names that match a placeholder directly are dropped.
    const urlPlaceholders = [...new Set([...pathOnly.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
    const pathParams = [...urlPlaceholders];
    const declaredPathParams = [];
    const query = {};
    const body = {};
    let upload = null;

    if (urlQuery) {
      for (const part of urlQuery.split('&')) {
        const [k, v] = part.split('=');
        if (v && /^\{.+\}$/.test(v)) {
          query[k] = { type: 'string', description: `Query parameter ${k}.`, required: true };
        }
      }
    }

    let hasFormFile = false;
    if (a.parameter && a.parameter.fields) {
      for (const [group, arr] of Object.entries(a.parameter.fields)) {
        for (const f of arr) {
          const def = fieldDef(f);
          if (group === '路径参数') { declaredPathParams.push(f.field); continue; }
          if (group === '查询参数') { query[f.field] = { ...def, required: !f.optional }; continue; }
          if (group.includes('form-data')) {
            if (f.type === 'File') hasFormFile = true;
            else body[f.field] = { ...def, required: !f.optional };
            continue;
          }
          body[f.field] = { ...def, required: !f.optional };
        }
      }
    }
    if (hasFormFile) upload = 'file';
    else if (pathOnly === '/v1/attachments' && method === 'POST') upload = 'code';

    const pathAliases = {};
    if (declaredPathParams.length === urlPlaceholders.length) {
      declaredPathParams.forEach((declared, i) => {
        if (declared !== urlPlaceholders[i]) pathAliases[declared] = urlPlaceholders[i];
      });
    }

    let { resource, verb } = makeName(method, pathOnly, domain);
    if (pathOnly === '/v1/myself') verb = 'get';
    if (upload === 'file') verb = 'upload';
    if (upload === 'code') { resource = resource ? `${resource}_code` : 'code'; verb = 'upload'; }

    entries.push({
      tool: null,
      domain,
      method,
      path: pathOnly,
      resource,
      verb,
      name: stripHtml(a.name),
      permission: (a.permission || []).map((p) => p.name).join('/') || null,
      scopes: (a.scopes || []).map((s) => s.name).filter(Boolean),
      pathAliases,
      upload,
      pathParams,
      query: Object.keys(query).length ? query : null,
      body: Object.keys(body).length ? body : null,
    });
  }

  // Deterministic naming with family-level config disambiguation applied before
  // dedup: when a flat config-center family (e.g. /v1/pjm/workitem_tags) shares
  // any verb with a nested resource (e.g. /v1/pjm/workitems/{id}/tags), the whole
  // flat family is suffixed with _config so its verbs stay consistent.
  const families = new Map();
  for (const e of entries) {
    const key = `${e.domain}|${e.resource}`;
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(e);
  }
  for (const members of families.values()) {
    const flat = members.filter((e) => looksLikeConfigPath(e.path));
    const nested = members.filter((e) => !looksLikeConfigPath(e.path));
    if (!flat.length || !nested.length) continue;
    const nestedVerbs = new Set(nested.map((e) => e.verb));
    if (flat.some((e) => nestedVerbs.has(e.verb))) {
      for (const e of flat) e.resource = `${e.resource}_config`;
    }
  }

  const usedNames = new Set();
  for (const e of entries) {
    const base = `pingcode_${e.domain}_${e.resource ? e.resource + '_' : ''}${e.verb}`;
    let tool = base;
    let n = 2;
    while (usedNames.has(tool)) tool = `${base}_${n++}`;
    usedNames.add(tool);
    e.tool = tool;
  }
  return { entries, skipped };
}

async function main() {
  const res = await fetch(`${DOCS_BASE}/api_data.js`);
  if (!res.ok) throw new Error(`Failed to fetch api_data.js: HTTP ${res.status}`);
  const text = await res.text();
  const json = JSON.parse(text.replace(/^define\(/, '').replace(/\);?\s*$/, ''));
  const { entries, skipped } = buildEntries(json.api.filter((a) => a.type && a.url));

  const registry = `'use strict';

// Generated endpoint registry for the PingCode REST API (${DOCS_BASE}/).
// DO NOT EDIT BY HAND — regenerate with: node scripts/generate-endpoints.js
// Each entry is one documented operation exposed as a dedicated MCP tool.
module.exports = {
  ENDPOINTS: [
${entries.map((e) => '    ' + JSON.stringify(e) + ',').join('\n')}
  ],
};
`;
  const file = path.join(__dirname, 'mcp', 'endpoints.js');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, registry);

  const byDomain = {};
  for (const e of entries) byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
  const renamed = entries.filter((e) => /_\d+$/.test(e.tool));
  const aliased = entries.filter((e) => Object.keys(e.pathAliases).length);
  console.log(`generated ${entries.length} endpoints -> ${path.relative(process.cwd(), file)}`);
  console.log(`skipped: ${JSON.stringify(skipped)}`);
  console.log(`per domain: ${JSON.stringify(byDomain)}`);
  if (renamed.length) console.log(`collision-renamed: ${renamed.map((e) => e.tool).join(', ')}`);
  if (aliased.length) console.log(`path-alias entries: ${aliased.map((e) => e.tool).join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
