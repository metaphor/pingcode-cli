'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const mcpServer = require('../scripts/mcp-server');
const mcpCmd = require('../scripts/commands/mcp');
const {
  tmpFile, clearEnv, restoreEnv, mockFetch, fakeResponse, writeWorkspaceCache,
} = require('./helpers');

// ── Test infrastructure ───────────────────────────────────────────────

function testInCleanTmp(name, fn) {
  test(name, async (t) => {
    const original = clearEnv();
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-mcp-test-'));
    process.env.PINGCODE_TOKEN_CACHE = path.join(tmpdir, 'token.json');
    try {
      await fn(t, tmpdir);
    } finally {
      restoreEnv(original);
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });
}

function captureStdout(fn) {
  let stdout = '';
  const originalLog = console.log;
  console.log = (...args) => { stdout += args.join(' ') + '\n'; };
  try {
    return fn();
  } finally {
    console.log = originalLog;
  }
}

async function toolJson(name, args) {
  const result = await mcpServer.handleTool(name, args);
  assert.ok(!result.isError, `expected success for ${name}: ${JSON.stringify(result)}`);
  assert.strictEqual(result.content.length, 1);
  assert.strictEqual(result.content[0].type, 'text');
  return JSON.parse(result.content[0].text);
}

// Queue of fake HTTP responses; records every requested URL.
function mockHttp(queue) {
  const calls = [];
  mockFetch((url, options) => {
    calls.push({ url: String(url), options: options || {} });
    const next = queue.shift();
    if (!next) {
      throw new Error(`unexpected request: ${url}`);
    }
    return next;
  });
  return calls;
}

function withCreds() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
}

const TOKEN = () => fakeResponse({ access_token: 'tok', expires_in: 3600 });

// Redirect every client writer at tmp paths so tests never touch $HOME.
function patchClients(tmpdir) {
  const writes = [];
  const originals = mcpCmd.CLIENTS.map((client) => ({
    filePath: client.filePath,
    write: client.write,
  }));
  mcpCmd.CLIENTS.forEach((client, index) => {
    const ext = client.id === 'codex' ? '.toml' : '.json';
    client.filePath = () => tmpFile(tmpdir, `${client.id}-config${ext}`);
    client.write = (filePath, env) => {
      writes.push(client.id);
      return originals[index].write(filePath, env);
    };
  });
  return {
    writes,
    restore() {
      mcpCmd.CLIENTS.forEach((client, index) => {
        client.filePath = originals[index].filePath;
        client.write = originals[index].write;
      });
    },
  };
}

const WORKSPACE_STATES = {
  'proj-1::type-1': {
    values: [
      { id: 'st-todo', name: 'To Do', type: 'started' },
      { id: 'st-progress', name: '进行中', type: 'started' },
      { id: 'st-done', name: '已完成', type: 'completed' },
    ],
  },
};

// ── TOOLS registry ────────────────────────────────────────────────────

test('TOOLS exposes exactly the 20 curated tools with valid schemas', () => {
  const expected = [
    'pingcode_auth_status',
    'pingcode_list_projects',
    'pingcode_list_sprints',
    'pingcode_list_users',
    'pingcode_context_get',
    'pingcode_context_set',
    'pingcode_workitem_list',
    'pingcode_workitem_get',
    'pingcode_workitem_create',
    'pingcode_workitem_update',
    'pingcode_workitem_delete',
    'pingcode_workitem_search',
    'pingcode_workitem_my',
    'pingcode_workitem_start',
    'pingcode_workitem_done',
    'pingcode_comment_create',
    'pingcode_comment_list',
    'pingcode_workload_create',
    'pingcode_product_list',
    'pingcode_idea_list',
  ];
  assert.strictEqual(mcpServer.TOOLS.length, 20);
  assert.deepStrictEqual(
    mcpServer.TOOLS.map((tool) => tool.name).sort(),
    [...expected].sort(),
  );
  for (const tool of mcpServer.TOOLS) {
    assert.ok(tool.name.startsWith('pingcode_'), tool.name);
    assert.strictEqual(typeof tool.description, 'string');
    assert.ok(tool.description.length > 0, tool.name);
    assert.strictEqual(tool.inputSchema.type, 'object');
    assert.ok(typeof tool.inputSchema.properties === 'object');
  }
});

test('handleTool rejects unknown tools', async () => {
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_nonexistent', {}),
    (exc) => exc instanceof core.PingCodeError && /Unknown tool: pingcode_nonexistent/.test(exc.message),
  );
});

// ── Server wiring (fake transport; no real stdio) ─────────────────────

function createFakeTransport() {
  return {
    sent: [],
    started: false,
    async start() { this.started = true; },
    async send(message) { this.sent.push(message); },
    async close() {},
  };
}

async function waitForResponse(transport, id) {
  for (let i = 0; i < 50; i += 1) {
    const found = transport.sent.find((message) => message.id === id);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return transport.sent.find((message) => message.id === id) || null;
}

test('runMcpServer connects a transport and answers tools/list', async () => {
  const transport = createFakeTransport();
  await mcpServer.runMcpServer(transport);
  assert.strictEqual(transport.started, true);

  transport.onmessage({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  const response = await waitForResponse(transport, 1);
  assert.ok(response, 'tools/list response expected');
  assert.ok(response.result);
  assert.strictEqual(response.result.tools.length, mcpServer.TOOLS.length);
  assert.deepStrictEqual(
    response.result.tools.map((tool) => tool.name),
    mcpServer.TOOLS.map((tool) => tool.name),
  );
});

test('runMcpServer wraps tool errors as isError results', async () => {
  const transport = createFakeTransport();
  await mcpServer.runMcpServer(transport);

  transport.onmessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'pingcode_nonexistent', arguments: {} },
  });
  const response = await waitForResponse(transport, 2);
  assert.ok(response, 'tools/call response expected');
  assert.strictEqual(response.result.isError, true);
  assert.ok(response.result.content[0].text.startsWith('Error: Unknown tool:'));
});

// ── Direct tools: auth / projects / sprints / users / context ─────────

testInCleanTmp('pingcode_auth_status reports the token cache state', async (t, tmpdir) => {
  const status = await toolJson('pingcode_auth_status', {});
  assert.strictEqual(status.authenticated, false);
  assert.strictEqual(status.token_valid, false);
});

testInCleanTmp('pingcode_list_projects caches and returns projects', async (t, tmpdir) => {
  withCreds();
  process.env.PINGCODE_WORKSPACE_CACHE = tmpFile(tmpdir, 'workspace.json');
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'proj-1', name: 'Alpha' }], total: 1 }),
  ]);

  const projects = await toolJson('pingcode_list_projects', {});
  assert.strictEqual(calls[0].url.includes('/v1/auth/token'), true);
  assert.strictEqual(calls[1].url.includes('/v1/project/projects'), true);
  assert.strictEqual(projects.values[0].name, 'Alpha');
});

testInCleanTmp('pingcode_list_sprints requires project_id', async (t, tmpdir) => {
  withCreds();
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_list_sprints', {}),
    /project_id is required/,
  );
});

testInCleanTmp('pingcode_list_sprints fetches sprints for the project', async (t, tmpdir) => {
  withCreds();
  process.env.PINGCODE_WORKSPACE_CACHE = tmpFile(tmpdir, 'workspace.json');
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'sprint-1', name: 'Sprint 1' }], total: 1 }),
  ]);

  const sprints = await toolJson('pingcode_list_sprints', { project_id: 'proj-1' });
  assert.strictEqual(calls[1].url.includes('/v1/project/projects/proj-1/sprints'), true);
  assert.strictEqual(sprints.values[0].name, 'Sprint 1');
});

testInCleanTmp('pingcode_list_users fetches project members', async (t, tmpdir) => {
  withCreds();
  process.env.PINGCODE_WORKSPACE_CACHE = tmpFile(tmpdir, 'workspace.json');
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'user-1', display_name: 'Alice' }], total: 1 }),
  ]);

  const users = await toolJson('pingcode_list_users', { project_id: 'proj-1' });
  assert.strictEqual(calls[1].url.includes('/v1/project/projects/proj-1/members'), true);
  assert.strictEqual(users.values[0].display_name, 'Alice');
});

testInCleanTmp('buildClient requires credentials from args or env', async (t, tmpdir) => {
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_list_projects', {}),
    (exc) => exc instanceof core.PingCodeError && exc.message.includes('PINGCODE_CLIENT_ID'),
  );
});

testInCleanTmp('pingcode_context_get reports preferences and dictionary counts', async (t, tmpdir) => {
  withCreds();
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  process.env.PINGCODE_WORKSPACE_CACHE = cachePath;
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1', current_project_id: 'proj-1' },
    users: [{ id: 'user-1', display_name: 'Alice' }],
    projects: [{ id: 'proj-1', name: 'Alpha' }],
    sprints: { 'proj-1': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] } },
  });

  const context = await toolJson('pingcode_context_get', {});
  assert.strictEqual(context.preferences.current_project_id, 'proj-1');
  assert.deepStrictEqual(context.dictionary_counts, { users: 1, projects: 1, sprints: 1 });
});

testInCleanTmp('pingcode_context_set caches current user and sprint', async (t, tmpdir) => {
  withCreds();
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  process.env.PINGCODE_WORKSPACE_CACHE = cachePath;
  writeWorkspaceCache(cachePath, {
    users: [{ id: 'user-1', display_name: 'Alice' }],
    sprints: { 'proj-1': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] } },
  });
  mockHttp([TOKEN()]);

  const result = await toolJson('pingcode_context_set', { user_id: 'user-1', sprint_id: 'sprint-1' });
  assert.strictEqual(result.user_set, 'user-1');
  assert.strictEqual(result.sprint_set, 'sprint-1');

  const saved = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(saved.preferences.current_user_id, 'user-1');
  assert.strictEqual(saved.preferences.current_sprint_id, 'sprint-1');
});

testInCleanTmp('pingcode_context_set caches the project and prefetches dictionaries', async (t, tmpdir) => {
  withCreds();
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  process.env.PINGCODE_WORKSPACE_CACHE = cachePath;
  writeWorkspaceCache(cachePath, {
    projects: [{ id: 'proj-1', name: 'Alpha' }],
  });
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [], total: 0 }),
    fakeResponse({ values: [], total: 0 }),
  ]);

  const result = await toolJson('pingcode_context_set', { project_id: 'proj-1' });
  assert.strictEqual(result.project_set, 'proj-1');
  assert.strictEqual(result.dictionaries_cached, true);
  assert.strictEqual(calls.length, 3, 'token plus types and priorities fetches expected');

  const saved = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(saved.preferences.current_project_id, 'proj-1');
});

// ── Bridged tools: workitem ───────────────────────────────────────────

const WORKITEM_CACHE = {
  preferences: {
    current_user_id: 'user-1',
    current_user_name: 'Alice',
    current_project_id: 'proj-1',
    current_project_name: 'Alpha',
    current_sprint_id: 'sprint-1',
    current_sprint_name: 'Sprint 1',
  },
  users: [{ id: 'user-1', display_name: 'Alice' }],
  projects: [{ id: 'proj-1', name: 'Alpha' }],
  sprints: { 'proj-1': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] } },
  work_item_states: WORKSPACE_STATES,
};

function setupWorkitem(tmpdir) {
  withCreds();
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  process.env.PINGCODE_WORKSPACE_CACHE = cachePath;
  writeWorkspaceCache(cachePath, WORKITEM_CACHE);
  return cachePath;
}

testInCleanTmp('pingcode_workitem_list bridges keywords and limit', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'wi-1', title: 'Bug A' }], total: 1 }),
  ]);

  const items = await toolJson('pingcode_workitem_list', {
    keywords: 'bug',
    limit: 5,
    all_users: true,
    all_projects: true,
    all_sprints: true,
  });
  const listUrl = new URL(calls[1].url);
  assert.strictEqual(listUrl.pathname, '/v1/project/work_items');
  assert.strictEqual(listUrl.searchParams.get('keywords'), 'bug');
  assert.strictEqual(listUrl.searchParams.get('page_size'), '5');
  assert.strictEqual(listUrl.searchParams.get('assignee_ids'), null);
  assert.strictEqual(items.values[0].title, 'Bug A');
});

testInCleanTmp('pingcode_workitem_get fetches a work item by raw id', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'a1b2c3d4e5f6', title: 'Bug A' }),
  ]);
  const item = await toolJson('pingcode_workitem_get', { id: 'a1b2c3d4e5f6' });
  assert.strictEqual(calls[1].url.includes('/v1/project/work_items/a1b2c3d4e5f6'), true);
  assert.strictEqual(item.id, 'a1b2c3d4e5f6');
  assert.strictEqual(item.title, 'Bug A');
});

testInCleanTmp('pingcode_workitem_get requires a target', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_workitem_get', {}),
    /work item id or identifier is required/,
  );
});

testInCleanTmp('pingcode_workitem_create posts with cached defaults', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'wi-new', title: 'Fix login' }),
  ]);

  const item = await toolJson('pingcode_workitem_create', { title: 'Fix login' });
  assert.strictEqual(calls[1].url.includes('/v1/project/work_items'), true);
  const body = JSON.parse(calls[1].options.body);
  assert.strictEqual(body.title, 'Fix login');
  assert.strictEqual(body.project_id, 'proj-1');
  assert.strictEqual(body.assignee_id, 'user-1');
  assert.strictEqual(item.id, 'wi-new');
});

testInCleanTmp('pingcode_workitem_create requires a title', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_workitem_create', {}),
    /title is required/,
  );
});

testInCleanTmp('pingcode_workitem_update patches title by raw id', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'a1b2c3d4e5f6', title: 'Renamed' }),
  ]);

  const item = await toolJson('pingcode_workitem_update', { id: 'a1b2c3d4e5f6', title: 'Renamed' });
  assert.strictEqual(calls[1].url.includes('/v1/project/work_items/a1b2c3d4e5f6'), true);
  const body = JSON.parse(calls[1].options.body);
  assert.strictEqual(body.title, 'Renamed');
  assert.strictEqual(item.title, 'Renamed');
});

testInCleanTmp('pingcode_workitem_delete deletes by raw id', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'a1b2c3d4e5f6' }),
  ]);

  const item = await toolJson('pingcode_workitem_delete', { id: 'a1b2c3d4e5f6' });
  assert.strictEqual(calls[1].options.method, 'DELETE');
  assert.strictEqual(calls[1].url.includes('/v1/pjm/work_items/a1b2c3d4e5f6'), true);
  assert.strictEqual(item.id, 'a1b2c3d4e5f6');
});

testInCleanTmp('pingcode_workitem_search posts a structured query', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'wi-2', title: 'Bug B' }], total: 1 }),
  ]);

  const items = await toolJson('pingcode_workitem_search', { keywords: 'bug', page_size: 10 });
  assert.strictEqual(new URL(calls[1].url).pathname, '/v1/pjm/work_items/search');
  const body = JSON.parse(calls[1].options.body);
  assert.strictEqual(body.mode, 'query');
  assert.strictEqual(body.payload.keywords, 'bug');
  assert.strictEqual(body.payload.page_size, 10);
  assert.strictEqual(items.values[0].title, 'Bug B');
});

testInCleanTmp('pingcode_workitem_my scopes to the cached context', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({
      values: [{ id: 'wi-3', title: 'Done task', state_id: 'st-done' }],
      total: 1,
    }),
  ]);

  const items = await toolJson('pingcode_workitem_my', {});
  const listUrl = new URL(calls[1].url);
  assert.strictEqual(listUrl.searchParams.get('assignee_ids'), 'user-1');
  assert.strictEqual(listUrl.searchParams.get('project_ids'), 'proj-1');
  assert.strictEqual(listUrl.searchParams.get('sprint_ids'), 'sprint-1');
  // Terminal (completed) states are filtered out of `my`.
  assert.strictEqual(items.values, undefined, 'completed items are filtered out of `my`');
});

testInCleanTmp('pingcode_workitem_start moves to the cached in-progress state', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'a1b2c3d4e5f6', state_id: 'st-progress' }),
  ]);

  await toolJson('pingcode_workitem_start', { id: 'a1b2c3d4e5f6' });
  assert.strictEqual(calls[1].options.method, 'PATCH');
  const body = JSON.parse(calls[1].options.body);
  assert.strictEqual(body.state_id, 'st-progress');
});

testInCleanTmp('pingcode_workitem_done moves to the cached completed state', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'a1b2c3d4e5f6', state_id: 'st-done' }),
  ]);

  await toolJson('pingcode_workitem_done', { id: 'a1b2c3d4e5f6' });
  const body = JSON.parse(calls[1].options.body);
  assert.strictEqual(body.state_id, 'st-done');
});

// ── Bridged tools: comment / workload / product / idea ────────────────

testInCleanTmp('pingcode_comment_create posts a comment', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'c-1', content: 'LGTM' }),
  ]);

  const comment = await toolJson('pingcode_comment_create', {
    work_item_id: 'a1b2c3d4e5f6',
    content: 'LGTM',
  });
  assert.strictEqual(new URL(calls[1].url).pathname, '/v1/comments');
  const body = JSON.parse(calls[1].options.body);
  assert.strictEqual(body.principal_type, 'work_item');
  assert.strictEqual(body.principal_id, 'a1b2c3d4e5f6');
  assert.strictEqual(body.content, '<p>LGTM</p>');
  assert.strictEqual(comment.id, 'c-1');
});

testInCleanTmp('pingcode_comment_create requires content', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_comment_create', { work_item_id: 'a1b2c3d4e5f6' }),
    /content is required/,
  );
});

testInCleanTmp('pingcode_comment_list lists comments for a work item', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'c-2', content: 'hello' }], total: 1 }),
  ]);

  const comments = await toolJson('pingcode_comment_list', { work_item_id: 'a1b2c3d4e5f6' });
  const url = new URL(calls[1].url);
  assert.strictEqual(url.pathname, '/v1/comments');
  assert.strictEqual(url.searchParams.get('principal_id'), 'a1b2c3d4e5f6');
  assert.strictEqual(url.searchParams.get('principal_type'), 'work_item');
  assert.strictEqual(comments.values[0].content, 'hello');
});

testInCleanTmp('pingcode_workload_create posts a workload', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ id: 'wl-1', duration: 4.5 }),
  ]);

  const workload = await toolJson('pingcode_workload_create', {
    principal_type: 'work_item',
    principal_id: 'a1b2c3d4e5f6',
    duration: 4.5,
    report_at: 1583290309,
    description: 'pairing',
  });
  assert.strictEqual(new URL(calls[1].url).pathname, '/v1/workloads');
  const body = JSON.parse(calls[1].options.body);
  assert.strictEqual(body.principal_type, 'work_item');
  assert.strictEqual(body.principal_id, 'a1b2c3d4e5f6');
  assert.strictEqual(body.duration, 4.5);
  assert.strictEqual(body.report_at, 1583290309);
  assert.strictEqual(body.description, 'pairing');
  assert.strictEqual(workload.id, 'wl-1');
});

testInCleanTmp('pingcode_workload_create requires the mandatory fields', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_workload_create', {}),
    /principal_type is required/,
  );
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_workload_create', { principal_type: 'work_item' }),
    /principal_id is required/,
  );
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_workload_create', {
      principal_type: 'work_item', principal_id: 'a1b2c3d4e5f6',
    }),
    /duration is required/,
  );
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_workload_create', {
      principal_type: 'work_item', principal_id: 'a1b2c3d4e5f6', duration: 1,
    }),
    /report_at is required/,
  );
});

testInCleanTmp('pingcode_product_list bridges keywords and limit', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'p-1', name: 'App' }], total: 1 }),
  ]);

  const products = await toolJson('pingcode_product_list', { keywords: 'app', limit: 5 });
  const url = new URL(calls[1].url);
  assert.strictEqual(url.pathname, '/v1/ship/products');
  assert.strictEqual(url.searchParams.get('keywords'), 'app');
  assert.strictEqual(url.searchParams.get('page_size'), '5');
  assert.strictEqual(products.values[0].name, 'App');
});

testInCleanTmp('pingcode_idea_list fetches ideas for a product', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  const calls = mockHttp([
    TOKEN(),
    fakeResponse({ values: [{ id: 'i-1', title: 'Dark mode' }], total: 1 }),
  ]);

  const ideas = await toolJson('pingcode_idea_list', { product: 'a1b2c3d4e5f6a1b2c3d4e5f6', keywords: 'dark' });
  const url = new URL(calls[1].url);
  assert.strictEqual(url.pathname, '/v1/ship/ideas');
  assert.strictEqual(url.searchParams.get('product_id'), 'a1b2c3d4e5f6a1b2c3d4e5f6');
  assert.strictEqual(url.searchParams.get('keywords'), 'dark');
  assert.strictEqual(ideas.values[0].title, 'Dark mode');
});

testInCleanTmp('pingcode_idea_list requires a product raw id', async (t, tmpdir) => {
  setupWorkitem(tmpdir);
  await assert.rejects(
    () => mcpServer.handleTool('pingcode_idea_list', {}),
    /product \(raw id\) is required/,
  );
});

// ── mcp init: argument parsing ────────────────────────────────────────

test('parseMcpArgs accepts tool, credential, and flow options', () => {
  const parsed = mcpCmd.parseMcpArgs([
    '--tool', 'codex', '--tool=omp', '--yes', '--dry-run',
    '--client-id', 'cid', '--client-secret', 'sec',
    '--base-url', 'https://pingcode.example.com',
  ]);
  assert.deepStrictEqual(parsed.opts.tool, ['codex', 'omp']);
  assert.strictEqual(parsed.opts.yes, true);
  assert.strictEqual(parsed.opts.dry_run, true);
  assert.strictEqual(parsed.opts.client_id, 'cid');
  assert.strictEqual(parsed.opts.client_secret, 'sec');
  assert.strictEqual(parsed.opts.base_url, 'https://pingcode.example.com');
  assert.strictEqual(parsed.helpRequested, false);
});

test('parseMcpArgs rejects unknown options and missing values', () => {
  assert.throws(() => mcpCmd.parseMcpArgs(['--bogus']), /Unknown option: --bogus/);
  assert.throws(() => mcpCmd.parseMcpArgs(['--tool']), /--tool requires a value/);
});

// ── mcp init: config writers ──────────────────────────────────────────

test('buildStdioEntry embeds the package command and optional env', () => {
  const bare = mcpCmd.buildStdioEntry({});
  assert.deepStrictEqual(bare, { command: 'npx', args: ['-y', mcpCmd.PACKAGE_REF, 'mcp'] });

  const withEnv = mcpCmd.buildStdioEntry({ PINGCODE_CLIENT_ID: 'cid' });
  assert.deepStrictEqual(withEnv.env, { PINGCODE_CLIENT_ID: 'cid' });
});

test('mergeOmpConfig adds pingcode and keeps other servers', () => {
  const existing = {
    $schema: 'https://example.com/schema.json',
    mcpServers: {
      grafana: { command: 'npx', args: ['-y', 'grafana-mcp'] },
      pingcode: { command: 'old', args: ['old'] },
    },
  };
  const merged = mcpCmd.mergeOmpConfig(existing, { PINGCODE_CLIENT_ID: 'cid' });

  assert.strictEqual(merged.$schema, 'https://example.com/schema.json');
  assert.deepStrictEqual(merged.mcpServers.grafana, existing.mcpServers.grafana);
  assert.strictEqual(merged.mcpServers.pingcode.command, 'npx');
  assert.deepStrictEqual(merged.mcpServers.pingcode.args, ['-y', mcpCmd.PACKAGE_REF, 'mcp']);
  assert.deepStrictEqual(merged.mcpServers.pingcode.env, { PINGCODE_CLIENT_ID: 'cid' });
  // The input object is not mutated.
  assert.strictEqual(existing.mcpServers.pingcode.command, 'old');
});

test('mergeOmpConfig adds a default $schema on fresh configs', () => {
  const merged = mcpCmd.mergeOmpConfig({}, {});
  assert.strictEqual(merged.$schema, mcpCmd.OMP_SCHEMA_URL);
  assert.deepStrictEqual(merged.mcpServers.pingcode, mcpCmd.buildStdioEntry({}));
});

test('writeOmpConfig merges into an existing file on disk', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-mcp-writer-'));
  try {
    const filePath = tmpFile(tmpdir, 'mcp.json');
    fs.writeFileSync(filePath, JSON.stringify({
      mcpServers: { other: { command: 'uvx', args: ['other-mcp'] } },
    }, null, 2));

    mcpCmd.writeOmpConfig(filePath, { PINGCODE_CLIENT_ID: 'cid', PINGCODE_CLIENT_SECRET: 'sec' });
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.strictEqual(saved.mcpServers.other.command, 'uvx');
    assert.strictEqual(saved.mcpServers.pingcode.command, 'npx');
    assert.strictEqual(saved.mcpServers.pingcode.env.PINGCODE_CLIENT_SECRET, 'sec');
  } finally {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  }
});

test('writeOpenCodeConfig strips JSONC comments and preserves other entries', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-mcp-writer-'));
  try {
    const filePath = tmpFile(tmpdir, 'opencode.json');
    fs.writeFileSync(filePath, [
      '{',
      '  // OpenCode config',
      '  "theme": "dark",',
      '  "mcp": {',
      '    "other": { "type": "local", "command": ["uvx", "other-mcp"] }',
      '  }',
      '}',
    ].join('\n'));

    mcpCmd.writeOpenCodeConfig(filePath, { PINGCODE_CLIENT_ID: 'cid' });
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.strictEqual(saved.theme, 'dark');
    assert.strictEqual(saved.mcp.other.command[0], 'uvx');
    assert.strictEqual(saved.mcp.pingcode.type, 'local');
    assert.deepStrictEqual(saved.mcp.pingcode.command, ['npx', '-y', mcpCmd.PACKAGE_REF, 'mcp']);
    assert.strictEqual(saved.mcp.pingcode.enabled, true);
    assert.deepStrictEqual(saved.mcp.pingcode.environment, { PINGCODE_CLIENT_ID: 'cid' });
  } finally {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  }
});

test('applyCodexConfig creates the pingcode block in an empty config', () => {
  const output = mcpCmd.applyCodexConfig('', { PINGCODE_CLIENT_ID: 'cid' });
  assert.ok(output.includes('[mcp_servers.pingcode]'));
  assert.ok(output.includes('command = "npx"'));
  assert.ok(output.includes('"mcp"'));
  assert.ok(output.includes('PINGCODE_CLIENT_ID = "cid"'));
  assert.ok(output.endsWith('\n'));
});

test('applyCodexConfig appends pingcode and preserves other servers', () => {
  const raw = [
    'model = "gpt-5"',
    '',
    '[mcp_servers.other]',
    'command = "uvx"',
    'args = ["other-mcp"]',
    '',
  ].join('\n');
  const output = mcpCmd.applyCodexConfig(raw, { PINGCODE_CLIENT_ID: 'cid' });

  assert.ok(output.includes('model = "gpt-5"'));
  assert.ok(output.includes('[mcp_servers.other]'));
  assert.ok(output.includes('command = "uvx"'));
  assert.ok(output.includes('[mcp_servers.pingcode]'));
  assert.ok(output.indexOf('[mcp_servers.other]') < output.indexOf('[mcp_servers.pingcode]'));
  assert.ok(output.includes('PINGCODE_CLIENT_ID = "cid"'));
});

test('applyCodexConfig replaces an existing pingcode block including its env table', () => {
  const raw = [
    'model = "gpt-5"',
    '',
    '[mcp_servers.pingcode]',
    'command = "npx"',
    'args = ["-y", "@old/pkg", "--mcp"]',
    'enabled = true',
    '',
    '[mcp_servers.pingcode.env]',
    'PINGCODE_CLIENT_ID = "old-id"',
    '',
    '[mcp_servers.other]',
    'command = "uvx"',
    '',
  ].join('\n');
  const output = mcpCmd.applyCodexConfig(raw, { PINGCODE_CLIENT_ID: 'new-id', PINGCODE_CLIENT_SECRET: 'new-sec' });

  assert.ok(!output.includes('@old/pkg'), 'stale command must be replaced');
  assert.ok(!output.includes('"old-id"'), 'stale env must be replaced');
  assert.ok(output.includes('PINGCODE_CLIENT_ID = "new-id"'));
  assert.ok(output.includes('PINGCODE_CLIENT_SECRET = "new-sec"'));
  assert.ok(output.includes('[mcp_servers.other]'));
  assert.ok(output.includes('command = "uvx"'), 'unrelated server survives the rewrite');
  assert.ok(output.includes('model = "gpt-5"'));
});

test('writeCodexConfig creates parent directories and writes the config', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-mcp-writer-'));
  try {
    const filePath = path.join(tmpdir, 'nested', 'dir', 'config.toml');
    mcpCmd.writeCodexConfig(filePath, { PINGCODE_CLIENT_ID: 'cid' });
    const saved = fs.readFileSync(filePath, 'utf8');
    assert.ok(saved.includes('[mcp_servers.pingcode]'));
    assert.ok(saved.includes(`"${mcpCmd.PACKAGE_REF}"`));
  } finally {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  }
});

// ── mcp init: interactive selection ───────────────────────────────────

function queueAsk(answers) {
  const queue = [...answers];
  return async () => queue.shift();
}

test('selectClientsInteractive parses numbers, ids, all, and retries invalid input', async () => {
  const label = 'Select AI clients';
  const all = await captureStdout(async () =>
    await mcpCmd.selectClientsInteractive(label, mcpCmd.CLIENTS, queueAsk(['1, 3'])));
  assert.strictEqual(all.length, 2);
  assert.deepStrictEqual(all.map((client) => client.id), ['codex', 'omp']);

  const byId = await mcpCmd.selectClientsInteractive(label, mcpCmd.CLIENTS, queueAsk(['omp']));
  assert.deepStrictEqual(byId.map((client) => client.id), ['omp']);

  const everything = await mcpCmd.selectClientsInteractive(label, mcpCmd.CLIENTS, queueAsk(['all']));
  assert.strictEqual(everything.length, mcpCmd.CLIENTS.length);

  const empty = await mcpCmd.selectClientsInteractive(label, mcpCmd.CLIENTS, queueAsk(['']));
  assert.deepStrictEqual(empty, []);

  const retried = await captureStdout(async () =>
    await mcpCmd.selectClientsInteractive(label, mcpCmd.CLIENTS, queueAsk(['nope', '2'])));
  assert.deepStrictEqual(retried.map((client) => client.id), ['opencode']);
});

// ── mcp init: runInit flows ───────────────────────────────────────────

testInCleanTmp('runInit --dry-run prints the plan and writes nothing', async (t, tmpdir) => {
  const patched = patchClients(tmpdir);
  try {
    let stdout = '';
    const originalLog = console.log;
    console.log = (...args) => { stdout += args.join(' ') + '\n'; };
    try {
      await mcpCmd.runInit(['--all', '--yes', '--dry-run', '--client-id', 'cid', '--client-secret', 'sec']);
    } finally {
      console.log = originalLog;
    }

    const plan = JSON.parse(stdout.trim());
    assert.strictEqual(plan.action, 'mcp init');
    assert.strictEqual(plan.package, mcpCmd.PACKAGE_REF);
    assert.deepStrictEqual(plan.clients.map((client) => client.id), ['codex', 'opencode', 'omp']);
    assert.deepStrictEqual(plan.environment, { PINGCODE_CLIENT_ID: 'cid', PINGCODE_CLIENT_SECRET: 'sec' });
    assert.strictEqual(patched.writes.length, 0, 'dry-run must not write any config');
  } finally {
    patched.restore();
  }
});

testInCleanTmp('runInit --tool writes only the selected client config', async (t, tmpdir) => {
  const patched = patchClients(tmpdir);
  try {
    const codexPath = tmpFile(tmpdir, 'codex-out.toml');
    fs.writeFileSync(codexPath, '[mcp_servers.other]\ncommand = "uvx"\n');
    mcpCmd.CLIENTS[0].filePath = () => codexPath;

    let output = '';
    const originalLog = console.log;
    console.log = (...args) => { output += args.join(' ') + '\n'; };
    try {
      await mcpCmd.runInit(['--tool', 'codex', '--yes', '--client-id', 'cid', '--client-secret', 'sec']);
    } finally {
      console.log = originalLog;
    }

    assert.deepStrictEqual(patched.writes, ['codex']);
    const saved = fs.readFileSync(codexPath, 'utf8');
    assert.ok(saved.includes('[mcp_servers.pingcode]'));
    assert.ok(saved.includes('PINGCODE_CLIENT_ID = "cid"'));
    assert.ok(saved.includes('[mcp_servers.other]'));
    assert.ok(output.includes('Configured OpenAI Codex CLI'));
    assert.strictEqual(fs.existsSync(tmpFile(tmpdir, 'omp-config.json')), false);
  } finally {
    patched.restore();
  }
});

testInCleanTmp('runInit without --tool/--all prompts an interactive multi-select', async (t, tmpdir) => {
  const patched = patchClients(tmpdir);
  try {
    let output = '';
    const originalLog = console.log;
    console.log = (...args) => { output += args.join(' ') + '\n'; };
    try {
      await mcpCmd.runInit(['--yes'], ['1,3', 'cid', 'sec']);
    } finally {
      console.log = originalLog;
    }

    assert.deepStrictEqual(patched.writes, ['codex', 'omp']);
    assert.ok(output.includes('Select AI clients to configure for PingCode MCP'));
    const ompPath = tmpFile(tmpdir, 'omp-config.json');
    const saved = JSON.parse(fs.readFileSync(ompPath, 'utf8'));
    assert.strictEqual(saved.mcpServers.pingcode.command, 'npx');
    assert.strictEqual(saved.mcpServers.pingcode.env.PINGCODE_CLIENT_SECRET, 'sec');
  } finally {
    patched.restore();
  }
});

testInCleanTmp('runInit aborts when the confirmation is declined', async (t, tmpdir) => {
  const patched = patchClients(tmpdir);
  try {
    let output = '';
    const originalLog = console.log;
    console.log = (...args) => { output += args.join(' ') + '\n'; };
    try {
      await mcpCmd.runInit(['--tool', 'codex'], ['', '', 'n']);
    } finally {
      console.log = originalLog;
    }

    assert.ok(output.includes('Aborted.'));
    assert.strictEqual(patched.writes.length, 0, 'declined runs must not write configs');
  } finally {
    patched.restore();
  }
});

testInCleanTmp('runInit rejects unknown client ids', async (t, tmpdir) => {
  await assert.rejects(
    () => mcpCmd.runInit(['--tool', 'nope', '--yes']),
    /Unknown client: nope/,
  );
});
