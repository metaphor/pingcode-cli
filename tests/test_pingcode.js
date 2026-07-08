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

// ── Core library tests ──────────────────────────────────────────────

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

testInCleanEnv('compact work item response keeps business fields', () => {
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
  const result = pingcode.compactResponse(payload);
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

testInCleanTmp('workspace cache save merges latest disk cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const first = pingcode.emptyWorkspaceCache();
  first.work_item_priorities = { 'project-1': { values: [{ id: 'high' }] } };
  pingcode.saveWorkspaceCache(cachePath, first);
  const second = pingcode.emptyWorkspaceCache();
  second.projects = { values: [{ id: 'project-1', name: 'Core' }] };
  pingcode.saveWorkspaceCache(cachePath, second);
  const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(payload.work_item_priorities['project-1'].values[0].id, 'high');
  assert.strictEqual(payload.projects.values[0].name, 'Core');
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

// ── pingcode-ctx integration test ───────────────────────────────────

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

// ── Dispatcher tests ────────────────────────────────────────────────

testInCleanEnv('main prints help', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [path.join(REPO_ROOT, 'scripts', 'pingcode.js'), '--help'], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('config'));
  assert.ok(result.stdout.includes('work-item'));
});

testInCleanEnv('dispatcher prints module list with --help', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('config'));
  assert.ok(result.stdout.includes('work-item'));
  assert.ok(result.stdout.includes('Usage:'));
});

testInCleanEnv('dispatcher prints module list with -h', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), '-h',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('config'));
  assert.ok(result.stdout.includes('work-item'));
});

testInCleanEnv('dispatcher prints work-item help', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), 'work-item', '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('work-item'));
  assert.ok(result.stdout.includes('list'));
  assert.ok(result.stdout.includes('create'));
  assert.ok(result.stdout.includes('show'));
  assert.ok(result.stdout.includes('update'));
});

testInCleanEnv('dispatcher prints config help', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), 'config', '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('config'));
  assert.ok(result.stdout.includes('init'));
  assert.ok(result.stdout.includes('set-current-user'));
  assert.ok(result.stdout.includes('set-current-project'));
  assert.ok(result.stdout.includes('set-current-sprint'));
  assert.ok(result.stdout.includes('list'));
});

testInCleanEnv('dispatcher unknown module exits 1', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), 'unknown-module',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 1);
  assert.ok(result.stderr.includes('Unknown module'));
});

testInCleanEnv('dispatcher global flag before module is rejected', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'),
    '--base-url', 'https://open.pingcode.com',
    'work-item', 'list', '--dry-run',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 1);
  assert.ok(result.stderr.includes('Unknown module'));
});

testInCleanEnv('dispatcher no args prints help', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'),
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('config'));
  assert.ok(result.stdout.includes('work-item'));
});

testInCleanEnv('dispatcher bad flag produces error', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), '--bad-flag',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 1);
  assert.ok(result.stderr.length > 0);
});

testInCleanEnv('dispatcher work-item subcommand with bad flag exits with error', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), 'work-item', '--bad-flag',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 1);
  assert.ok(result.stderr.includes('Unknown work-item subcommand'));
});

testInCleanEnv('dispatcher --method flag fails with unknown module after cleanup', async () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'),
    '--method', 'GET',
    '--path', '/v1/project/projects',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 1);
  assert.ok(result.stderr.includes('Unknown module'));
});
