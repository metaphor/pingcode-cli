'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const registry = require('../scripts/mcp/registry');
const core = require('../scripts/core');
const { clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

// ── Test infrastructure ───────────────────────────────────────────────

function testInCleanEnv(name, fn) {
  test(name, async () => {
    const original = clearEnv();
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-test-'));
    process.env.PINGCODE_TOKEN_CACHE = path.join(tmpdir, 'token.json');
    try {
      await fn();
    } finally {
      restoreEnv(original);
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });
}

const VALID_TYPES = new Set(['string', 'number', 'boolean', 'object', 'array']);

// Families claimed by the curated command layer must never appear as
// generated endpoints (see SKIP_FAMILIES in scripts/generate-endpoints.js).
const CURATED_FAMILIES = [
  'GET /v1/pjm/projects',
  'GET /v1/pjm/projects/{}/members',
  'GET /v1/pjm/projects/{}/sprints',
  'GET /v1/pjm/workitems',
  'GET /v1/pjm/workitems/{}',
  'POST /v1/pjm/workitems',
  'PATCH /v1/pjm/workitems/{}',
  'DELETE /v1/pjm/workitems/{}',
  'POST /v1/pjm/workitems/search',
];

// ── Registry integrity ────────────────────────────────────────────────

testInCleanEnv('registry has unique tool names and a stable shape', () => {
  const names = registry.ENDPOINTS.map((e) => e.tool);
  assert.ok(names.length > 400, `expected a full registry, got ${names.length}`);
  assert.equal(new Set(names).size, names.length);
  for (const e of registry.ENDPOINTS) {
    assert.match(e.tool, /^pingcode_[a-z0-9_]+$/, e.tool);
    assert.ok(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(e.method), e.tool);
    assert.ok(e.path.startsWith('/v1/'), e.tool);
    assert.ok(Array.isArray(e.pathParams), e.tool);
    assert.ok(['common', 'pjm', 'ship', 'testhub', 'wiki', 'devops', 'directory'].includes(e.domain), e.tool);
  }
});

testInCleanEnv('registry declares every path placeholder as a path param', () => {
  for (const e of registry.ENDPOINTS) {
    const placeholders = [...e.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    assert.deepEqual(new Set(placeholders), new Set(e.pathParams), e.tool);
  }
});

testInCleanEnv('registry keeps curated families out of generated endpoints', () => {
  for (const family of CURATED_FAMILIES) {
    const [method, normalized] = family.split(' ');
    const hit = registry.ENDPOINTS.find(
      (e) => e.method === method && e.path.replace(/\{[^}]+\}/g, '{}') === normalized
    );
    assert.equal(hit, undefined, `${family} must come from the curated layer only`);
  }
});

testInCleanEnv('every entry produces a valid JSON schema', () => {
  for (const e of registry.ENDPOINTS) {
    const schema = registry.jsonSchema(e);
    assert.equal(schema.type, 'object');
    for (const [key, def] of Object.entries(schema.properties)) {
      if (def.type) assert.ok(VALID_TYPES.has(def.type), `${e.tool}.${key}: ${def.type}`);
      if (def.items) assert.ok(VALID_TYPES.has(def.items.type), `${e.tool}.${key}[]`);
    }
    for (const req of schema.required) {
      assert.ok(schema.properties[req], `${e.tool}: required ${req} missing from properties`);
    }
  }
});

// ── toolDefs ──────────────────────────────────────────────────────────

testInCleanEnv('toolDefs lists everything and honors domain filters', () => {
  assert.equal(registry.toolDefs().length, registry.ENDPOINTS.length);
  const filtered = registry.toolDefs('wiki');
  assert.ok(filtered.length > 0);
  assert.ok(filtered.length < registry.ENDPOINTS.length);
  for (const def of filtered) {
    assert.ok(def.name.startsWith('pingcode_wiki_'), def.name);
  }
  assert.equal(registry.toolDefs('nope').length, 0);
  for (const def of registry.toolDefs()) {
    assert.equal(typeof def.description, 'string');
    assert.ok(def.description.length > 0, def.name);
    assert.equal(def.inputSchema.type, 'object');
  }
});

testInCleanEnv('toolDefs schemas expose required path params and controls', () => {
  const del = registry.toolDefs('pjm').find((d) => d.name === 'pingcode_pjm_deliverable_delete');
  assert.ok(del, 'deliverable delete tool def must exist');
  assert.deepEqual(del.inputSchema.required, ['deliverable_target_id']);
  assert.equal(del.inputSchema.properties.deliverable_target_id.type, 'string');
  assert.equal(del.inputSchema.properties.dry_run.type, 'boolean');
  assert.equal(del.inputSchema.properties.compact.type, 'boolean');

  const list = registry.toolDefs('common').find((d) => d.name === 'pingcode_common_workload_list');
  assert.ok(list, 'workload list tool def must exist');
  assert.equal(list.inputSchema.properties.fetch_all.type, 'boolean');
  assert.deepEqual(list.inputSchema.required, []);
});

testInCleanEnv('action names round-trip through actionsForDomain', () => {
  for (const e of registry.ENDPOINTS) {
    const action = registry.actionName(e);
    assert.ok(!action.startsWith('pingcode_'));
    const hit = registry.actionsForDomain(e.domain).find((a) => a.action === action);
    assert.equal(hit.entry.tool, e.tool);
  }
});

// ── buildRequest ──────────────────────────────────────────────────────

const DEL_ENTRY = registry.getEntry('pingcode_pjm_deliverable_delete');
const LIST_ENTRY = registry.getEntry('pingcode_common_comment_list');

testInCleanEnv('buildRequest substitutes path params with URL encoding', () => {
  const req = registry.buildRequest(DEL_ENTRY, { deliverable_target_id: 'abc 123' });
  assert.equal(req.method, 'DELETE');
  assert.equal(req.path, '/v1/pjm/deliverables/abc%20123');
  assert.deepEqual(req.params, {});
  assert.equal(req.body, null);
});

testInCleanEnv('buildRequest throws PingCodeError when required args are missing', () => {
  assert.throws(() => registry.buildRequest(DEL_ENTRY, {}), /Missing required argument\(s\): deliverable_target_id/);
  assert.throws(
    () => registry.buildRequest(registry.getEntry('pingcode_ship_ticket_search'), {}),
    /Missing required argument\(s\): mode/
  );
  try {
    registry.buildRequest(DEL_ENTRY, {});
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof core.PingCodeError);
  }
});

testInCleanEnv('buildRequest splits query and body arguments per the docs', () => {
  const req = registry.buildRequest(LIST_ENTRY, { principal_type: 'workitem', principal_id: 'p1' });
  assert.equal(req.path, '/v1/comments');
  assert.deepEqual(req.params, { principal_type: 'workitem', principal_id: 'p1' });
  assert.equal(req.body, null);

  const create = registry.getEntry('pingcode_pjm_workitem_tag_create');
  const req2 = registry.buildRequest(create, { workitem_id: 'w1', tag_id: 't1' });
  assert.equal(req2.path, '/v1/pjm/workitems/w1/tags');
  assert.deepEqual(req2.params, {});
  assert.deepEqual(req2.body, { tag_id: 't1' });
});

testInCleanEnv('buildRequest accepts doc-declared alias names for URL placeholders', () => {
  const repoGet = registry.getEntry('pingcode_devops_product_repo_get');
  assert.ok(repoGet, 'repo get entry must exist');
  assert.deepEqual(repoGet.pathAliases, { repository_id: 'repo_id' });
  const viaAlias = registry.buildRequest(repoGet, { product_id: 'p1', repository_id: 'r1' });
  const viaCanonical = registry.buildRequest(repoGet, { product_id: 'p1', repo_id: 'r1' });
  assert.equal(viaAlias.path, '/v1/devops/products/p1/repos/r1');
  assert.equal(viaCanonical.path, viaAlias.path);
});

testInCleanEnv('buildRequest nests dotted body keys and passes array bodies through', () => {
  const search = registry.getEntry('pingcode_ship_ticket_search');
  const req = registry.buildRequest(search, {
    mode: 'query',
    payload: { keywords: 'x' },
    'payload.filter': { a: 1 },
  });
  assert.deepEqual(req.body.payload, { keywords: 'x', filter: { a: 1 } });

  const spaceCreate = registry.getEntry('pingcode_wiki_space_create');
  const members = [{ id: 'u1', type: 'user' }];
  const req2 = registry.buildRequest(spaceCreate, {
    scope_type: 'user',
    name: 'N',
    identifier: 'I',
    members,
    'members.id': 'ignored',
  });
  // members.id / members.type are doc-only dotted fields of the array items;
  // the array argument passes through untouched.
  assert.equal(req2.body.members, members);
  assert.equal(req2.body['members.id'], undefined);
});

testInCleanEnv('buildRequest requires a file for file uploads', () => {
  const upload = registry.getEntry('pingcode_common_attachment_upload');
  assert.ok(upload && upload.upload === 'file');
  assert.throws(
    () => registry.buildRequest(upload, { principal_type: 'workitem', principal_id: 'p1', title: 'T' }),
    /Missing required argument\(s\): file/
  );
});

// ── execute ───────────────────────────────────────────────────────────

function fakeClient() {
  return {
    baseUrl: 'https://open.pingcode.com',
    calls: [],
    async request(method, rawPath, params, body) {
      this.calls.push({ method, path: rawPath, params, body });
      return { id: 'res-1', ok: 1 };
    },
    async rawRequest(method, rawPath, params, body) {
      this.calls.push({ method, path: rawPath, params, body });
      return { id: 'res-raw' };
    },
  };
}

testInCleanEnv('execute dry_run returns the request preview without touching the client', async () => {
  const client = fakeClient();
  const result = await registry.execute(client, DEL_ENTRY, { deliverable_target_id: 'w1' }, { dry_run: true });
  assert.equal(result.dry_run, true);
  assert.equal(result.method, 'DELETE');
  assert.equal(result.url, 'https://open.pingcode.com/v1/pjm/deliverables/w1');
  assert.equal(result.path, '/v1/pjm/deliverables/w1');
  assert.deepEqual(result.params, {});
  assert.equal(result.json, null);
  assert.equal(client.calls.length, 0);
});

testInCleanEnv('execute sends method, path, params, and body through the client', async () => {
  const client = fakeClient();
  const create = registry.getEntry('pingcode_pjm_workitem_tag_create');
  const result = await registry.execute(client, create, { workitem_id: 'w1', tag_id: 't1' });
  assert.deepEqual(client.calls[0], {
    method: 'POST',
    path: '/v1/pjm/workitems/w1/tags',
    params: {},
    body: { tag_id: 't1' },
  });
  assert.deepEqual(result, { id: 'res-1', ok: 1 });
});

testInCleanEnv('execute compact folds list responses through core.compactResponse', async () => {
  const client = fakeClient();
  client.request = async () => ({ page_size: 50, page_index: 0, total: 1, values: [{ id: 'a', extra: 'x' }] });
  const result = await registry.execute(
    client,
    registry.getEntry('pingcode_common_workload_list'),
    {},
    { compact: true }
  );
  assert.ok(Array.isArray(result.values));
  assert.equal(result.values.length, 1);
  assert.equal(result.count, 1);
});

testInCleanEnv('execute fetch_all merges every page via mockFetch', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  const requested = [];
  mockFetch(async (url) => {
    const u = new URL(String(url));
    requested.push(u.pathname + u.search);
    if (u.pathname === '/v1/auth/token') {
      return fakeResponse({ access_token: 'tok', expires_in: 3600 });
    }
    const pageIndex = Number(u.searchParams.get('page_index'));
    const pages = [
      { page_size: 100, page_index: 0, total: 3, values: [{ id: 'a' }, { id: 'b' }] },
      { page_size: 100, page_index: 1, total: 3, values: [{ id: 'c' }] },
    ];
    return fakeResponse(pages[pageIndex] || { page_size: 100, page_index: pageIndex, total: 3, values: [] });
  });
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'cid',
    client_secret: 'csecret',
    token_cache: null,
    workspace_cache: null,
  });
  const result = await registry.execute(
    client,
    registry.getEntry('pingcode_common_workload_list'),
    { principal_type: 'workitem' },
    { fetch_all: true }
  );
  assert.deepEqual(result.values.map((v) => v.id), ['a', 'b', 'c']);
  assert.equal(result.count, 3);
  assert.equal(result.total, 3);
  assert.equal(result.page_size, 100);
  assert.equal(result.page_index, 1);
  const pageCalls = requested.filter((p) => p.startsWith('/v1/workloads'));
  assert.equal(pageCalls.length, 2);
  assert.match(pageCalls[0], /page_index=0/);
  assert.match(pageCalls[0], /page_size=100/);
  assert.match(pageCalls[0], /principal_type=workitem/);
  assert.match(pageCalls[1], /page_index=1/);
});

testInCleanEnv('execute fetch_all is only offered on list-shaped GET endpoints', async () => {
  const get = registry.getEntry('pingcode_pjm_deliverable_delete');
  assert.equal(registry.jsonSchema(get).properties.fetch_all, undefined);
  const client = fakeClient();
  await registry.execute(client, get, { deliverable_target_id: 'd1' }, { fetch_all: true });
  assert.equal(client.calls.length, 1, 'fetch_all must be a no-op on non-list endpoints');
});

// ── parseCliArgs / coerceValue ────────────────────────────────────────

testInCleanEnv('parseCliArgs handles =, space, and boolean flag forms', () => {
  const entry = registry.getEntry('pingcode_pjm_workitem_tag_create');
  const args = registry.parseCliArgs(entry, ['--workitem-id', 'w1', '--tag-id=t9']);
  assert.deepEqual(args, { workitem_id: 'w1', tag_id: 't9' });
});

testInCleanEnv('parseCliArgs rejects unknown flags and positional arguments', () => {
  const entry = registry.getEntry('pingcode_pjm_workitem_tag_create');
  assert.throws(() => registry.parseCliArgs(entry, ['--nope', 'x']), /Unknown flag --nope/);
  assert.throws(() => registry.parseCliArgs(entry, ['positional']), /Unexpected argument: positional/);
});

testInCleanEnv('coerceValue converts scalars, arrays, and objects', () => {
  const { coerceValue } = registry;
  assert.equal(coerceValue('42', { type: 'number' }), 42);
  assert.equal(coerceValue('false', { type: 'boolean' }), false);
  assert.equal(coerceValue('', { type: 'boolean' }), true);
  assert.deepEqual(coerceValue('a,b', { type: 'array' }), ['a', 'b']);
  assert.deepEqual(coerceValue('[1,2]', { type: 'array' }), [1, 2]);
  assert.deepEqual(coerceValue('{"a":1}', { type: 'object' }), { a: 1 });
  assert.throws(() => coerceValue('x', { type: 'number' }), /Expected a number/);
});

testInCleanEnv('parseCliArgs enforces doc enums', () => {
  assert.throws(
    () => registry.parseCliArgs(LIST_ENTRY, ['--principal_type', 'wat', '--principal_id', 'p1']),
    /not in allowed enum/
  );
});
