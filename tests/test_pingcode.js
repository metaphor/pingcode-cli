const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const pingcode = require('../scripts/pingcode');
const pingcodeCtx = require('../scripts/pingcode-ctx');

const REPO_ROOT = path.resolve(__dirname, '..');

function tmpFile(tmpdir, name) {
  return path.join(tmpdir, name);
}

function clearEnv() {
  const original = {};
  for (const key of Object.keys(process.env)) {
    original[key] = process.env[key];
  }
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  process.env.PATH = original.PATH || '';
  return original;
}

function restoreEnv(original) {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(original)) {
    process.env[key] = value;
  }
}

function testInCleanEnv(name, fn) {
  test(name, async () => {
    const original = clearEnv();
    try {
      await fn();
    } finally {
      restoreEnv(original);
    }
  });
}

function testInCleanTmp(name, fn) {
  test(name, async (t) => {
    const original = clearEnv();
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-test-'));
    try {
      await fn(t, tmpdir);
    } finally {
      restoreEnv(original);
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });
}

function writeWorkspaceCache(cachePath, {
  preferences = {},
  users = null,
  projects = null,
  sprints = null,
  work_item_types = null,
  work_item_states = null,
  work_item_priorities = null,
  work_item_properties = null,
  idea_states = null,
  idea_priorities = null,
} = {}) {
  const payload = pingcode.emptyWorkspaceCache();
  payload.preferences = preferences;
  if (users !== null) payload.users = { values: users };
  if (projects !== null) payload.projects = { values: projects };
  if (sprints !== null) payload.sprints = sprints;
  if (work_item_types !== null) payload.work_item_types = work_item_types;
  if (work_item_states !== null) payload.work_item_states = work_item_states;
  if (work_item_priorities !== null) payload.work_item_priorities = work_item_priorities;
  if (work_item_properties !== null) payload.work_item_properties = work_item_properties;
  if (idea_states !== null) payload.idea_states = idea_states;
  if (idea_priorities !== null) payload.idea_priorities = idea_priorities;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload), 'utf8');
}

function parseArgsWithWorkspaceCache(items, cachePath) {
  const parser = pingcode.buildParser();
  return parser.parseArgs(['--workspace-cache', String(cachePath), ...items]);
}

function mockFetch(response) {
  global.fetch = async (url, options) => {
    if (typeof response === 'function') {
      return response(url, options);
    }
    if (Array.isArray(response)) {
      const next = response.shift();
      return next;
    }
    return response;
  };
}

function fakeResponse(payload, status = 200) {
  const content = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: () => null },
    text: async () => content,
  };
}

testInCleanEnv('build_url merges query parameters', () => {
  const url = pingcode.buildUrl(
    'https://open.pingcode.com',
    '/v1/project/work_items?identifier=SCR-1',
    { page_size: 20, project_ids: ['p1', 'p2'] },
  );
  assert.strictEqual(
    url,
    'https://open.pingcode.com/v1/project/work_items?identifier=SCR-1&page_size=20&project_ids=p1%2Cp2',
  );
});

testInCleanTmp('single command workitem create dry run payload', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'POST',
    '--path', '/v1/project/work_items',
    '--data', '{"project_id":"project-1","type_id":"story","title":"New story"}',
    '--dry-run',
  ], cachePath);
  const result = await pingcode.run(args);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/project/work_items');
  assert.strictEqual(result.json.project_id, 'project-1');
  assert.strictEqual(result.json.type_id, 'story');
  assert.strictEqual(result.json.assignee_id, 'user-1');
});

testInCleanEnv('compact work item response keeps business fields', async () => {
  const parser = pingcode.buildParser();
  const args = parser.parseArgs([
    '--token', 'token-1',
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--param', 'page_size=100',
    '--compact',
    '--all-users',
    '--all-projects',
    '--all-sprints',
  ]);
  const payload = {
    page_size: 100,
    page_index: 0,
    total: 1,
    values: [
      {
        id: 'wi-1',
        identifier: 'SCR-1',
        type: 'story',
        title: 'Long raw item',
        description: 'large markdown body',
        state: { id: 'state-1', name: '进行中', type: 'in_progress', color: '#fff' },
        priority: { id: 'high', name: '高' },
        project: { id: 'project-1', name: 'Core', url: 'https://example' },
        parent: { id: 'parent-1', identifier: 'SCR-0', title: 'Parent' },
        assignee: { id: 'user-1', display_name: 'Alice', avatar: 'https://example/avatar.png' },
        html_url: 'https://example/workitems/SCR-1',
        created_by: { id: 'user-2' },
      },
    ],
  };
  mockFetch(fakeResponse(payload));
  const result = await pingcode.run(args);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.count, 1);
  const item = result.values[0];
  assert.strictEqual(item.identifier, 'SCR-1');
  assert.strictEqual(item.state, '进行中');
  assert.strictEqual(item.state_type, 'in_progress');
  assert.strictEqual(item.priority, '高');
  assert.strictEqual(item.project, 'Core');
  assert.strictEqual(item.assignee, 'Alice');
  assert.strictEqual(item.parent_identifier, 'SCR-0');
  assert.strictEqual(item.parent_title, 'Parent');
  assert.strictEqual('description' in item, false);
  assert.strictEqual('created_by' in item, false);
  assert.strictEqual(JSON.stringify(item).includes('avatar'), false);
});

testInCleanTmp('workitem create defaults assignee from cached current user', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-cached',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'POST',
    '--path', '/v1/project/work_items',
    '--data', '{"project_id":"project-1","type_id":"story","title":"New story"}',
    '--dry-run',
  ], cachePath);
  const result = await pingcode.run(args);
  assert.strictEqual(result.json.assignee_id, 'user-cached');
});

testInCleanTmp('workitem create all users skips default assignee', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-cached',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'POST',
    '--path', '/v1/project/work_items',
    '--all-users',
    '--data', '{"project_id":"project-1","type_id":"story","title":"New story"}',
    '--dry-run',
  ], cachePath);
  process.env.PINGCODE_USER_ID = 'user-1';
  const result = await pingcode.run(args);
  assert.strictEqual('assignee_id' in result.json, false);
});

testInCleanEnv('workitem create missing current user prints identity guidance', () => {
  const parser = pingcode.buildParser();
  const args = parser.parseArgs([
    '--method', 'POST',
    '--path', '/v1/project/work_items',
    '--data', '{"project_id":"project-1","type_id":"story","title":"New story"}',
    '--dry-run',
    '--no-workspace-cache',
  ]);
  return assert.rejects(async () => pingcode.run(args), (err) => {
    assert.ok(err.message.includes('PingCode workspace context is incomplete'));
    assert.ok(err.message.includes('current_user_id'));
    assert.ok(err.message.includes('pingcode-ctx.js'));
    return true;
  });
});

testInCleanEnv('single command maps params', async () => {
  const parser = pingcode.buildParser();
  const args = parser.parseArgs([
    '--method', 'GET',
    '--path', '/v1/project/work_item/states',
    '--param', 'project_id=project-1',
    '--param', 'work_item_type_id=story',
    '--dry-run',
  ]);
  const result = await pingcode.run(args);
  assert.strictEqual(result.path, '/v1/project/work_item/states');
  assert.strictEqual(result.params.project_id, 'project-1');
  assert.strictEqual(result.params.work_item_type_id, 'story');
});

testInCleanTmp('me placeholder expands from environment', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-cached',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--param', 'assignee_ids=@me',
    '--dry-run',
  ], cachePath);
  process.env.PINGCODE_USER_ID = 'user-1';
  const result = await pingcode.run(args);
  assert.strictEqual(result.params.assignee_ids, 'user-1');
  assert.strictEqual(result.params.project_ids, 'project-1');
  assert.strictEqual(result.params.sprint_ids, 'sprint-1');
});

testInCleanTmp('me placeholder expands from user id flag', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-cached',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'POST',
    '--path', '/v1/project/work_items',
    '--user-id', 'user-flag-1',
    '--data', '{"project_id":"project-1","type_id":"task","title":"Task","assignee_id":"@me"}',
    '--dry-run',
  ], cachePath);
  const result = await pingcode.run(args);
  assert.strictEqual(result.json.assignee_id, 'user-flag-1');
});

testInCleanTmp('me name placeholder expands from user name flag', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--user-name', 'Situ',
    '--param', 'keywords=@me_name',
    '--dry-run',
  ], cachePath);
  const result = await pingcode.run(args);
  assert.strictEqual(result.params.keywords, 'Situ');
  assert.strictEqual(result.params.assignee_ids, 'user-1');
});

testInCleanEnv('missing me placeholder prints identity guidance', () => {
  const parser = pingcode.buildParser();
  const args = parser.parseArgs([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--param', 'assignee_ids=@me',
    '--dry-run',
    '--no-workspace-cache',
  ]);
  return assert.rejects(async () => pingcode.run(args), (err) => {
    assert.ok(err.message.includes('PINGCODE_USER_ID'));
    assert.ok(err.message.includes('--user-id'));
    assert.ok(err.message.includes('client_credentials is an enterprise token'));
    return true;
  });
});

testInCleanEnv('missing credentials prints environment guidance', async () => {
  const client = new pingcode.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: null,
    client_secret: null,
    token_cache: null,
  });
  await assert.rejects(async () => client.accessToken(), (err) => {
    assert.ok(err.message.includes('PINGCODE_CLIENT_ID'));
    assert.ok(err.message.includes('export PINGCODE_CLIENT_SECRET'));
    return true;
  });
});

testInCleanTmp('access token uses client credentials and writes cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const client = new pingcode.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'client',
    client_secret: 'secret',
    token_cache: cachePath,
  });
  let requestUrl = null;
  mockFetch((url) => {
    requestUrl = url;
    return fakeResponse({ access_token: 'token-1', expires_in: 3600 });
  });
  const token = await client.accessToken();
  assert.strictEqual(token, 'token-1');
  assert.strictEqual(fs.existsSync(cachePath), true);
  assert.ok(requestUrl.includes('grant_type=client_credentials'));
  assert.ok(requestUrl.includes('client_id=client'));
  assert.ok(requestUrl.includes('client_secret=secret'));
});

testInCleanTmp('workspace current user falls back to cached preference', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-cached',
      current_project_id: 'project-cached',
      current_sprint_id: 'sprint-cached',
    },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--dry-run',
  ], cachePath);
  const result = await pingcode.run(args);
  assert.strictEqual(result.params.assignee_ids, 'user-cached');
  assert.strictEqual(result.params.project_ids, 'project-cached');
  assert.strictEqual(result.params.sprint_ids, 'sprint-cached');
});

testInCleanTmp('all project and sprint flags skip default filters', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: { current_user_id: 'user-cached' } });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--all-projects',
    '--all-sprints',
    '--dry-run',
  ], cachePath);
  const result = await pingcode.run(args);
  assert.deepStrictEqual(result.params, { assignee_ids: 'user-cached' });
});

testInCleanTmp('missing current project returns ctx guidance without fetch', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: { current_user_id: 'user-cached' } });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--token', 'token-1',
  ], cachePath);
  let called = false;
  mockFetch(() => { called = true; return fakeResponse({}); });
  await assert.rejects(async () => pingcode.run(args), (err) => {
    assert.ok(err.message.includes('PingCode workspace context is incomplete'));
    assert.ok(err.message.includes('pingcode-ctx.js'));
    return true;
  });
  assert.strictEqual(called, false);
});

testInCleanTmp('missing current project dry run does not fetch projects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: { current_user_id: 'user-cached' } });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--dry-run',
  ], cachePath);
  let called = false;
  mockFetch(() => { called = true; return fakeResponse({}); });
  await assert.rejects(async () => pingcode.run(args), (err) => {
    assert.ok(err.message.includes('PingCode workspace context is incomplete'));
    return true;
  });
  assert.strictEqual(called, false);
});

testInCleanTmp('missing current sprint returns ctx guidance without fetch', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-cached', current_project_id: 'project-1' },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--token', 'token-1',
  ], cachePath);
  let called = false;
  mockFetch(() => { called = true; return fakeResponse({}); });
  await assert.rejects(async () => pingcode.run(args), (err) => {
    assert.ok(err.message.includes('PingCode workspace context is incomplete'));
    assert.ok(err.message.includes('pingcode-ctx.js'));
    return true;
  });
  assert.strictEqual(called, false);
});

testInCleanTmp('user name placeholder expands from cached users', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-cached',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    users: [{ id: 'user-2', name: 'Alice Chen', email: 'alice@example.test' }],
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_items',
    '--param', 'assignee_ids=@user:Alice',
    '--dry-run',
  ], cachePath);
  const result = await pingcode.run(args);
  assert.strictEqual(result.params.assignee_ids, 'user-2');
});

testInCleanTmp('cache states reuses workspace cache without network', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const cachedStates = { values: [{ id: 'state-1', name: '进行中' }] };
  writeWorkspaceCache(cachePath, {
    work_item_states: { 'project-1::task': cachedStates },
  });
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_item/states',
    '--param', 'project_id=project-1',
    '--param', 'work_item_type_id=task',
  ], cachePath);
  let called = false;
  mockFetch(() => { called = true; return fakeResponse({}); });
  const result = await pingcode.run(args);
  assert.deepStrictEqual(result, cachedStates);
  assert.strictEqual(called, false);
});

testInCleanTmp('work item types write and reuse workspace cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_item/types',
    '--token', 'token-1',
    '--param', 'project_id=project-1',
  ], cachePath);
  mockFetch(fakeResponse({ values: [{ id: 'story', name: '故事' }] }));
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.values[0].id, 'story');
  assert.strictEqual(payload.work_item_types['project-1'].values[0].name, '故事');
  mockFetch(() => { throw new Error('should not be called'); });
  const cachedResult = await pingcode.run(args);
  assert.strictEqual(cachedResult.values[0].id, 'story');
});

testInCleanTmp('workspace cache save merges latest disk cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const first = pingcode.emptyWorkspaceCache();
  first.work_item_priorities = { 'project-1': { values: [{ id: 'high' }] } };
  const second = pingcode.emptyWorkspaceCache();
  second.idea_priorities = { 'product-1': { values: [{ id: 'p0' }] } };
  pingcode.saveWorkspaceCache(cachePath, first);
  pingcode.saveWorkspaceCache(cachePath, second);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(payload.work_item_priorities['project-1'].values[0].id, 'high');
  assert.strictEqual(payload.idea_priorities['product-1'].values[0].id, 'p0');
});

testInCleanTmp('workspace cache save uses atomic temp file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const payload = pingcode.emptyWorkspaceCache();
  pingcode.saveWorkspaceCache(cachePath, payload);
  const tempFiles = fs.readdirSync(tmpdir).filter(name => name.startsWith('.workspace.json.') && name.endsWith('.tmp'));
  assert.deepStrictEqual(tempFiles, []);
});

testInCleanTmp('workspace cache save compacts unneeded api fields', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const payload = pingcode.emptyWorkspaceCache();
  payload.work_item_states = {
    'project-1::story': {
      values: [
        {
          id: 'state-1',
          name: '打开',
          type: 'pending',
          color: '#56ABFB',
          url: 'https://example.test/state-1',
        },
      ],
    },
  };
  payload.users = {
    values: [
      {
        id: 'member-1',
        url: 'https://example.test/member-1',
        user: {
          id: 'user-1',
          display_name: 'Alice',
          email: 'alice@example.test',
          avatar: 'https://example.test/avatar.png',
        },
      },
    ],
  };
  payload.projects = {
    values: [
      {
        id: 'project-1',
        name: 'Project',
        created_by: { id: 'user-1' },
        url: 'https://example.test/project-1',
      },
    ],
  };
  pingcode.saveWorkspaceCache(cachePath, payload);
  const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cached.work_item_states['project-1::story'].values[0].id, 'state-1');
  assert.strictEqual(cached.work_item_states['project-1::story'].values[0].type, 'pending');
  assert.strictEqual('color' in cached.work_item_states['project-1::story'].values[0], false);
  assert.strictEqual('url' in cached.work_item_states['project-1::story'].values[0], false);
  assert.strictEqual(cached.users.values[0].user.display_name, 'Alice');
  assert.strictEqual('avatar' in cached.users.values[0].user, false);
  assert.strictEqual('email' in cached.users.values[0].user, false);
  assert.strictEqual('created_by' in cached.projects.values[0], false);
});

testInCleanTmp('get states writes workspace cache after network success', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_item/states',
    '--token', 'token-1',
    '--param', 'project_id=project-1',
    '--param', 'work_item_type_id=task',
  ], cachePath);
  mockFetch(fakeResponse({ values: [{ id: 'state-1', name: '已完成' }] }));
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.values[0].id, 'state-1');
  assert.strictEqual(payload.work_item_states['project-1::task'].values[0].name, '已完成');
});

testInCleanTmp('cache states refresh bypasses stale workspace cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_project_id: 'project-1' },
    work_item_states: { 'project-1::task': { values: [{ id: 'old-state', name: '旧状态' }] } },
  });
  const args = parseArgsWithWorkspaceCache([
    '--cache-states',
    '--work-item-type-id', 'task',
    '--token', 'token-1',
  ], cachePath);
  let callCount = 0;
  mockFetch(() => {
    callCount += 1;
    return fakeResponse({ values: [{ id: 'new-state', name: '新状态' }] });
  });
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.values[0].id, 'new-state');
  assert.strictEqual(payload.work_item_states['project-1::task'].values[0].id, 'new-state');
  assert.strictEqual(callCount, 1);
});

testInCleanTmp('cache states without type refreshes types and all states', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: { current_project_id: 'project-1' } });
  const args = parseArgsWithWorkspaceCache([
    '--cache-states',
    '--token', 'token-1',
  ], cachePath);
  const responses = [
    { values: [{ id: 'story', name: '故事' }, { id: 'task', name: '任务' }] },
    { values: [{ id: 'story-done', name: '已完成' }] },
    { values: [{ id: 'task-done', name: '已完成' }] },
  ];
  mockFetch(() => fakeResponse(responses.shift()));
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.project_id, 'project-1');
  assert.deepStrictEqual(new Set(Object.keys(result.work_item_states)), new Set(['story', 'task']));
  assert.strictEqual(payload.work_item_types['project-1'].values[0].id, 'story');
  assert.strictEqual(payload.work_item_states['project-1::story'].values[0].id, 'story-done');
  assert.strictEqual(payload.work_item_states['project-1::task'].values[0].id, 'task-done');
});

testInCleanTmp('work item priorities write and reuse workspace cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_item/priorities',
    '--token', 'token-1',
    '--param', 'project_id=project-1',
  ], cachePath);
  mockFetch(fakeResponse({ values: [{ id: 'high', name: '高' }] }));
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.values[0].id, 'high');
  assert.strictEqual(payload.work_item_priorities['project-1'].values[0].name, '高');
  mockFetch(() => { throw new Error('should not be called'); });
  const cachedResult = await pingcode.run(args);
  assert.strictEqual(cachedResult.values[0].id, 'high');
});

testInCleanTmp('work item properties write and reuse workspace cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const args = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/project/work_item/properties',
    '--token', 'token-1',
    '--param', 'project_id=project-1',
    '--param', 'work_item_type_id=story',
  ], cachePath);
  mockFetch(fakeResponse({ values: [{ id: 'custom-1', name: '自定义字段' }] }));
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.values[0].id, 'custom-1');
  assert.strictEqual(payload.work_item_properties['project-1::story'].values[0].name, '自定义字段');
  mockFetch(() => { throw new Error('should not be called'); });
  const cachedResult = await pingcode.run(args);
  assert.strictEqual(cachedResult.values[0].id, 'custom-1');
});

testInCleanTmp('cache work item properties without type refreshes types and all properties', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: { current_project_id: 'project-1' } });
  const args = parseArgsWithWorkspaceCache([
    '--cache-work-item-properties',
    '--token', 'token-1',
  ], cachePath);
  const responses = [
    { values: [{ id: 'story', name: '故事' }, { id: 'task', name: '任务' }] },
    { values: [{ id: 'story-field', name: '故事字段' }] },
    { values: [{ id: 'task-field', name: '任务字段' }] },
  ];
  mockFetch(() => fakeResponse(responses.shift()));
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.project_id, 'project-1');
  assert.deepStrictEqual(new Set(Object.keys(result.work_item_properties)), new Set(['story', 'task']));
  assert.strictEqual(payload.work_item_properties['project-1::story'].values[0].id, 'story-field');
  assert.strictEqual(payload.work_item_properties['project-1::task'].values[0].id, 'task-field');
});

testInCleanTmp('idea states and priorities write workspace cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const statesArgs = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/ship/idea/states',
    '--token', 'token-1',
    '--param', 'product_id=product-1',
  ], cachePath);
  const prioritiesArgs = parseArgsWithWorkspaceCache([
    '--method', 'GET',
    '--path', '/v1/ship/idea/priorities',
    '--token', 'token-1',
    '--param', 'product_id=product-1',
  ], cachePath);
  const responses = [
    { values: [{ id: 'idea-open', name: '打开' }] },
    { values: [{ id: 'idea-high', name: '高' }] },
  ];
  mockFetch(() => fakeResponse(responses.shift()));
  const statesResult = await pingcode.run(statesArgs);
  const prioritiesResult = await pingcode.run(prioritiesArgs);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(statesResult.values[0].id, 'idea-open');
  assert.strictEqual(prioritiesResult.values[0].id, 'idea-high');
  assert.strictEqual(payload.idea_states['product-1'].values[0].name, '打开');
  assert.strictEqual(payload.idea_priorities['product-1'].values[0].name, '高');
  mockFetch(() => { throw new Error('should not be called'); });
  const cachedStates = await pingcode.run(statesArgs);
  const cachedPriorities = await pingcode.run(prioritiesArgs);
  assert.strictEqual(cachedStates.values[0].id, 'idea-open');
  assert.strictEqual(cachedPriorities.values[0].id, 'idea-high');
});

testInCleanTmp('cache users uses project members when project id is available', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const args = parseArgsWithWorkspaceCache([
    '--cache-users',
    '--project-id', 'project-1',
    '--token', 'token-1',
  ], cachePath);
  let requestUrl = null;
  mockFetch((url) => {
    requestUrl = url;
    return fakeResponse({ values: [{ id: 'user-1', name: 'Situ' }] });
  });
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.ok(requestUrl.includes('/v1/project/projects/project-1/members'));
  assert.strictEqual(result.values[0].id, 'user-1');
  assert.strictEqual(payload.users.project_id, 'project-1');
});

testInCleanTmp('set current user accepts cached user name', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    users: [{ id: 'user-1', name: 'Situ', email: 'situ@example.test' }],
  });
  const args = parseArgsWithWorkspaceCache(['--set-current-user', 'Situ'], cachePath);
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.preferences.current_user_id, 'user-1');
  assert.strictEqual(payload.preferences.current_user_name, 'Situ');
});

testInCleanTmp('set current user accepts cached project member display name', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    users: [
      {
        id: 'member-1',
        type: 'user',
        user: {
          id: 'user-1',
          display_name: '司徒',
          name: 'situjunjie',
          email: 'situ@example.test',
        },
      },
    ],
  });
  const args = parseArgsWithWorkspaceCache(['--set-current-user', '司徒'], cachePath);
  const result = await pingcode.run(args);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(result.preferences.current_user_id, 'user-1');
  assert.strictEqual(result.preferences.current_user_name, '司徒');
  assert.strictEqual(payload.preferences.current_user_id, 'user-1');
});

testInCleanTmp('context options user outputs nested project member names', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const args = parseArgsWithWorkspaceCache([
    '--context-options', 'user',
    '--project-id', 'project-1',
    '--token', 'token-1',
  ], cachePath);
  mockFetch(fakeResponse({
    values: [
      {
        id: 'member-1',
        project: { id: 'project-1', name: 'Core Project' },
        user: {
          id: 'user-1',
          display_name: '司徒',
          name: 'situjunjie',
          email: 'situ@example.test',
        },
      },
    ],
  }));
  const result = await pingcode.run(args);
  assert.strictEqual(result.kind, 'user');
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.options[0].id, 'user-1');
  assert.strictEqual(result.options[0].display_name, '司徒');
  assert.strictEqual(result.options[0].name, 'situjunjie');
  assert.strictEqual('email' in result.options[0], false);
});

testInCleanTmp('pingcode ctx selects and caches workspace context', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const args = pingcodeCtx.buildParser().parseArgs([
    '--workspace-cache', String(cachePath),
    '--token', 'token-1',
  ]);
  const responses = [
    { values: [{ id: 'project-1', name: 'Core Project' }] },
    { values: [{ id: 'sprint-1', name: 'Sprint 1' }] },
    {
      values: [
        {
          id: 'member-1',
          user: {
            id: 'user-1',
            display_name: '司徒',
            name: 'situjunjie',
            email: 'situ@example.test',
          },
        },
      ],
    },
  ];
  mockFetch(() => fakeResponse(responses.shift()));
  const selections = ['1', '1', '1'];
  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    const result = await pingcodeCtx.run(args, async () => selections.shift());
    const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    assert.strictEqual(result.preferences.current_project_id, 'project-1');
    assert.strictEqual(result.preferences.current_sprint_id, 'sprint-1');
    assert.strictEqual(result.preferences.current_user_id, 'user-1');
    assert.strictEqual(payload.preferences.current_project_name, 'Core Project');
    assert.strictEqual(payload.preferences.current_sprint_name, 'Sprint 1');
    assert.strictEqual(payload.preferences.current_user_name, '司徒');
    const outputText = outputs.join('\n');
    assert.ok(outputText.includes('司徒'));
    assert.ok(outputText.includes('situjunjie'));
  } finally {
    console.log = originalLog;
  }
});

testInCleanEnv('main prints help', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [path.join(REPO_ROOT, 'scripts', 'pingcode.js'), '--help'], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('Single-command PingCode REST API caller'));
});
