const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { test } = require('node:test');
const crypto = require('node:crypto');
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

const core = require('../scripts/core');

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

// ── OAuth authorization_code & refresh_token tests ─────────────────

testInCleanTmp('grant_type defaults to client_credentials', async (t, tmpdir) => {
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    token_cache: null,
  });
  assert.strictEqual(client.grantType, 'client_credentials');
});

testInCleanTmp('accessToken with authorization_code and no cache throws login guidance', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });
  await assert.rejects(async () => client.accessToken(), (err) => {
    assert.ok(err instanceof core.PingCodeError);
    assert.ok(err.message.includes('login'), `Message should mention login, got: ${err.message}`);
    return true;
  });
});

testInCleanTmp('accessToken with authorization_code uses cached valid token', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const cachePayload = {
    grant_type: 'authorization_code',
    access_token: 'cached-user-token',
    refresh_token: 'rt-1',
    expires_at: now + 3600,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cachePayload));

  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });
  const token = await client.accessToken();
  assert.strictEqual(token, 'cached-user-token');
});

testInCleanTmp('accessToken with authorization_code and expired token refreshes', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const cachePayload = {
    grant_type: 'authorization_code',
    access_token: 'expired-token',
    refresh_token: 'rt-old',
    expires_at: now - 60,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cachePayload));

  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });

  let requestUrl = null;
  mockFetch((url) => {
    requestUrl = url;
    return fakeResponse({ access_token: 'refreshed-token', expires_in: 3600 });
  });

  const token = await client.accessToken();
  assert.strictEqual(token, 'refreshed-token');
  assert.ok(requestUrl.includes('grant_type=refresh_token'));
  assert.ok(requestUrl.includes('refresh_token=rt-old'));

  // Verify cache file updated
  const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cached.access_token, 'refreshed-token');
  assert.strictEqual(cached.refresh_token, 'rt-old'); // preserved
  assert.strictEqual(cached.grant_type, 'authorization_code');
  assert.ok(cached.expires_at > now);
});

testInCleanTmp('accessToken with authorization_code and expired token no refresh_token throws', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const cachePayload = {
    grant_type: 'authorization_code',
    access_token: 'expired-no-refresh',
    expires_at: now - 60,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cachePayload));

  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });

  await assert.rejects(async () => client.accessToken(), (err) => {
    assert.ok(err instanceof core.PingCodeError);
    assert.ok(err.message.includes('login'));
    return true;
  });
});

testInCleanTmp('client_credentials with old cache format still works', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const cachePayload = {
    access_token: 'old-format-token',
    expires_at: now + 3600,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cachePayload));

  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    token_cache: cachePath,
  });
  const token = await client.accessToken();
  assert.strictEqual(token, 'old-format-token');
});

testInCleanTmp('exchangeAuthorizationCode calls token endpoint and caches', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });

  let requestUrl = null;
  mockFetch((url) => {
    requestUrl = url;
    return fakeResponse({
      access_token: 'user-access-token',
      refresh_token: 'user-refresh-token',
      expires_in: 3600,
    });
  });

  const result = await client.exchangeAuthorizationCode('code-1', 'http://127.0.0.1:8765/callback');
  assert.strictEqual(result.access_token, 'user-access-token');
  assert.strictEqual(result.refresh_token, 'user-refresh-token');
  assert.ok(requestUrl.includes('grant_type=authorization_code'));
  assert.ok(requestUrl.includes('code=code-1'));
  assert.ok(requestUrl.includes('client_id=c'));
  assert.ok(requestUrl.includes('client_secret=s'));
  assert.ok(requestUrl.includes('redirect_uri=http%3A%2F%2F127.0.0.1%3A8765%2Fcallback'));

  // Verify cache written
  const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cached.grant_type, 'authorization_code');
  assert.strictEqual(cached.access_token, 'user-access-token');
  assert.strictEqual(cached.refresh_token, 'user-refresh-token');
  assert.ok(typeof cached.expires_at === 'number');
  assert.ok(cached.expires_at > Math.floor(Date.now() / 1000));
});

testInCleanTmp('refreshAccessToken calls refresh endpoint and preserves refresh_token', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });

  let requestUrl = null;
  mockFetch((url) => {
    requestUrl = url;
    return fakeResponse({
      access_token: 'new-access',
      expires_in: 3600,
      // no refresh_token in response
    });
  });

  const token = await client.refreshAccessToken('existing-refresh');
  assert.strictEqual(token, 'new-access');
  assert.ok(requestUrl.includes('grant_type=refresh_token'));
  assert.ok(requestUrl.includes('refresh_token=existing-refresh'));
  assert.ok(requestUrl.includes('client_id=c'));
  assert.ok(requestUrl.includes('client_secret=s'));

  // Verify cache preserves refresh_token from input
  const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cached.access_token, 'new-access');
  assert.strictEqual(cached.refresh_token, 'existing-refresh');
  assert.strictEqual(cached.grant_type, 'authorization_code');
  assert.ok(cached.expires_at > Math.floor(Date.now() / 1000));
});

testInCleanTmp('refreshAccessToken uses new refresh_token from response when present', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });

  mockFetch(() => fakeResponse({
    access_token: 'new-access-2',
    refresh_token: 'new-refresh-2',
    expires_in: 7200,
  }));

  await client.refreshAccessToken('old-refresh');
  const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cached.access_token, 'new-access-2');
  assert.strictEqual(cached.refresh_token, 'new-refresh-2');
  assert.strictEqual(cached.expires_in, undefined, 'expires_in should not be in cache payload');
});

testInCleanTmp('buildAuthorizationUrl returns correct OAuth URL', async (t, tmpdir) => {
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'my-client-id',
    grant_type: 'authorization_code',
  });
  const url = client.buildAuthorizationUrl('http://127.0.0.1:8765/callback', 'state-abc');
  assert.ok(url.startsWith('https://open.pingcode.com/oauth2/authorize'));
  assert.ok(url.includes('response_type=code'));
  assert.ok(url.includes('client_id=my-client-id'));
  assert.ok(url.includes('redirect_uri=http%3A%2F%2F127.0.0.1%3A8765%2Fcallback'));
  assert.ok(url.includes('state=state-abc'));
});

testInCleanTmp('saveCachedToken writes new format with grant_type', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  core.saveCachedToken(cachePath, 'token-1', 3600);
  const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cached.access_token, 'token-1');
  assert.strictEqual(cached.grant_type, 'client_credentials');
  assert.ok(typeof cached.expires_at === 'number');
});

testInCleanTmp('saveCachedToken with refresh_token writes authorization_code format', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  core.saveCachedToken(cachePath, 'token-2', 3600, 'authorization_code', 'rt-1');
  const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cached.access_token, 'token-2');
  assert.strictEqual(cached.grant_type, 'authorization_code');
  assert.strictEqual(cached.refresh_token, 'rt-1');
  assert.ok(typeof cached.expires_at === 'number');
});

testInCleanTmp('loadCachedToken returns full object from new cache format', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    grant_type: 'authorization_code',
    access_token: 'at-1',
    refresh_token: 'rt-1',
    expires_at: now + 3600,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload));

  const cached = core.loadCachedToken(cachePath);
  assert.strictEqual(cached.grant_type, 'authorization_code');
  assert.strictEqual(cached.access_token, 'at-1');
  assert.strictEqual(cached.refresh_token, 'rt-1');
  assert.strictEqual(cached.expires_at, now + 3600);
});

testInCleanTmp('loadCachedToken defaults grant_type to client_credentials for old cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const payload = { access_token: 'old-token', expires_at: now + 3600 };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload));

  const cached = core.loadCachedToken(cachePath);
  assert.strictEqual(cached.grant_type, 'client_credentials');
  assert.strictEqual(cached.access_token, 'old-token');
  assert.strictEqual(cached.refresh_token, null);
});

testInCleanTmp('loadCachedToken returns null for expired token', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const payload = { access_token: 'expired', expires_at: 1 };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload));

  const cached = core.loadCachedToken(cachePath);
  assert.strictEqual(cached, null);
});

testInCleanTmp('client_credentials with cached valid token returns it without network', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    grant_type: 'client_credentials',
    access_token: 'cached-cc-token',
    expires_at: now + 3600,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload));

  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    token_cache: cachePath,
  });

  // Replace fetch with a spy that should NOT be called
  let fetchCalled = false;
  mockFetch(() => {
    fetchCalled = true;
    return fakeResponse({ access_token: 'network-token', expires_in: 3600 });
  });

  const token = await client.accessToken();
  assert.strictEqual(token, 'cached-cc-token');
  assert.strictEqual(fetchCalled, false, 'fetch should not be called for valid cached token');
});

testInCleanTmp('grant_type mismatch between cache and client throws', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    grant_type: 'client_credentials',
    access_token: 'cc-token',
    expires_at: now + 3600,
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload));

  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });

  await assert.rejects(async () => client.accessToken(), (err) => {
    assert.ok(err instanceof core.PingCodeError);
    assert.ok(err.message.includes('grant_type'));
    return true;
  });
});

testInCleanTmp('exchangeAuthorizationCode throws on missing access_token', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const client = new core.PingCodeClient({
    base_url: 'https://open.pingcode.com',
    client_id: 'c',
    client_secret: 's',
    grant_type: 'authorization_code',
    token_cache: cachePath,
  });

  mockFetch(() => fakeResponse({ error: 'invalid_grant' }));

  await assert.rejects(async () => client.exchangeAuthorizationCode('bad-code'), (err) => {
    assert.ok(err instanceof core.PingCodeError);
    assert.ok(err.message.includes('access_token'));
    return true;
  });
});

// ── Auth callback server tests ──────────────────────────────────────

const AUTH_CALLBACK_PORT_BASE = 61700;

function callbackRequest(port, path, params) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams(params).toString();
    const req = http.get(`http://127.0.0.1:${port}${path}?${query}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

test('startAuthCallbackServer happy path resolves with code and state', async () => {
  const port = AUTH_CALLBACK_PORT_BASE + 1;
  const state = crypto.randomUUID();

  const promise = core.startAuthCallbackServer({
    port,
    path: '/callback',
    state,
    timeoutMs: 5000,
  });

  // Brief wait for server to start listening
  await new Promise(resolve => setTimeout(resolve, 60));

  const result = await callbackRequest(port, '/callback', { code: 'code-1', state });
  assert.strictEqual(result.status, 200);
  assert.ok(result.body.includes('Authentication Successful'));

  const resolved = await promise;
  assert.deepStrictEqual(resolved, { code: 'code-1', state });
});

test('startAuthCallbackServer rejects on state mismatch', async () => {
  const port = AUTH_CALLBACK_PORT_BASE + 2;

  const promise = core.startAuthCallbackServer({
    port,
    path: '/callback',
    state: 'expected-state',
    timeoutMs: 5000,
  });

  await new Promise(resolve => setTimeout(resolve, 60));

  const [promiseSettled, httpResult] = await Promise.allSettled([
    promise,
    callbackRequest(port, '/callback', { code: 'code-1', state: 'wrong-state' }),
  ]);

  assert.strictEqual(httpResult.status, 'fulfilled');
  assert.strictEqual(httpResult.value.status, 400);
  assert.ok(httpResult.value.body.includes('State Mismatch'));

  assert.strictEqual(promiseSettled.status, 'rejected');
  assert.ok(promiseSettled.reason instanceof core.PingCodeError);
  assert.ok(promiseSettled.reason.message.includes('State mismatch'));
  assert.ok(promiseSettled.reason.message.includes('expected-state'));
  assert.ok(promiseSettled.reason.message.includes('wrong-state'));
});

test('startAuthCallbackServer rejects on OAuth error', async () => {
  const port = AUTH_CALLBACK_PORT_BASE + 3;

  const promise = core.startAuthCallbackServer({
    port,
    path: '/callback',
    state: 's',
    timeoutMs: 5000,
  });

  await new Promise(resolve => setTimeout(resolve, 60));

  const [promiseSettled, httpResult] = await Promise.allSettled([
    promise,
    callbackRequest(port, '/callback', {
      error: 'access_denied',
      error_description: 'User denied access',
      state: 's',
    }),
  ]);

  assert.strictEqual(httpResult.status, 'fulfilled');
  assert.strictEqual(httpResult.value.status, 400);
  assert.ok(httpResult.value.body.includes('Authentication Error'));
  assert.ok(httpResult.value.body.includes('access_denied'));
  assert.ok(httpResult.value.body.includes('User denied access'));

  assert.strictEqual(promiseSettled.status, 'rejected');
  assert.ok(promiseSettled.reason instanceof core.PingCodeError);
  assert.ok(promiseSettled.reason.message.includes('OAuth error'));
  assert.ok(promiseSettled.reason.message.includes('access_denied'));
  assert.ok(promiseSettled.reason.message.includes('User denied access'));
});

test('startAuthCallbackServer rejects on timeout', async () => {
  const port = AUTH_CALLBACK_PORT_BASE + 4;

  const promise = core.startAuthCallbackServer({
    port,
    path: '/callback',
    state: 's',
    timeoutMs: 200,
  });

  await assert.rejects(() => promise, (err) => {
    assert.ok(err instanceof core.PingCodeError);
    assert.ok(err.message.includes('timed out'));
    return true;
  });
});

test('startAuthCallbackServer closes listener after resolving', async () => {
  const port = AUTH_CALLBACK_PORT_BASE + 5;
  const state = crypto.randomUUID();

  const promise = core.startAuthCallbackServer({
    port,
    path: '/callback',
    state,
    timeoutMs: 5000,
  });

  await new Promise(resolve => setTimeout(resolve, 60));

  await callbackRequest(port, '/callback', { code: 'c', state });
  await promise;

  await assert.rejects(() => callbackRequest(port, '/callback', { code: 'c2', state }), (err) => {
    assert.ok(err.message.includes('ECONNREFUSED') || (err.code && err.code === 'ECONNREFUSED'));
    return true;
  });
});

test('startAuthCallbackServer returns 404 for wrong path', async () => {
  const port = AUTH_CALLBACK_PORT_BASE + 6;

  const promise = core.startAuthCallbackServer({
    port,
    path: '/oauth/callback',
    state: 's',
    timeoutMs: 5000,
  });

  await new Promise(resolve => setTimeout(resolve, 60));

  const result = await callbackRequest(port, '/wrong-path', { code: 'c', state: 's' });
  assert.strictEqual(result.status, 404);

  await callbackRequest(port, '/oauth/callback', { code: 'c', state: 's' });
  await promise;
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

// ── pingcode-ctx --grant-type flag test ──────────────────────────────

testInCleanTmp('pingcode-ctx parser accepts --grant-type', async (t, tmpdir) => {
  const args = pingcodeCtx.buildParser().parseArgs([
    '--workspace-cache', String(tmpFile(tmpdir, 'workspace.json')),
    '--token', 'token-1',
    '--grant-type', 'authorization_code',
  ]);
  assert.strictEqual(args.grant_type, 'authorization_code');
});

testInCleanTmp('pingcode-ctx parser defaults grant_type to client_credentials', async (t, tmpdir) => {
  const args = pingcodeCtx.buildParser().parseArgs([
    '--workspace-cache', String(tmpFile(tmpdir, 'workspace.json')),
    '--token', 'token-1',
  ]);
  assert.strictEqual(args.grant_type, 'client_credentials');
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
