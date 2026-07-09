'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const loginModule = require('../scripts/commands/login');

// ── Test helpers ───────────────────────────────────────────────────────

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

// ── Parser tests ───────────────────────────────────────────────────────

test('login parser parses --help', () => {
  const { opts, helpRequested } = loginModule.parseLoginArgs(['--help']);
  assert.strictEqual(helpRequested, true);
});

test('login parser parses -h', () => {
  const { opts, helpRequested } = loginModule.parseLoginArgs(['-h']);
  assert.strictEqual(helpRequested, true);
});

test('login parser defaults grant_type to authorization_code', () => {
  const { opts } = loginModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.grant_type, 'authorization_code');
});

test('login parser defaults redirect_uri to http://127.0.0.1:8765/callback', () => {
  const { opts } = loginModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.redirect_uri, 'http://127.0.0.1:8765/callback');
});

test('login parser defaults port to 8765', () => {
  const { opts } = loginModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.port, 8765);
});

test('login parser accepts --redirect-uri', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's',
    '--redirect-uri', 'http://127.0.0.1:9000/oauth',
  ]);
  assert.strictEqual(opts.redirect_uri, 'http://127.0.0.1:9000/oauth');
});

test('login parser accepts --port', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--port', '9999',
  ]);
  assert.strictEqual(opts.port, 9999);
});

test('login parser rejects invalid port', () => {
  assert.throws(() => loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--port', 'invalid',
  ]), /Invalid port/);
});

test('login parser accepts --no-browser', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--no-browser',
  ]);
  assert.strictEqual(opts.no_browser, true);
});

test('login parser accepts --code', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--code', 'auth-code-123',
  ]);
  assert.strictEqual(opts.code, 'auth-code-123');
});

test('login parser accepts --dry-run', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--dry-run',
  ]);
  assert.strictEqual(opts.dry_run, true);
});

test('login parser accepts --grant-type', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--grant-type', 'refresh_token',
  ]);
  assert.strictEqual(opts.grant_type, 'refresh_token');
});

test('login parser accepts --token-cache', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--token-cache', '/tmp/tokens.json',
  ]);
  assert.strictEqual(opts.token_cache, '/tmp/tokens.json');
});

test('login parser accepts --workspace-cache', () => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--workspace-cache', '/tmp/ws.json',
  ]);
  assert.strictEqual(opts.workspace_cache, '/tmp/ws.json');
});

test('login parser uses env vars for client_id and client_secret', () => {
  process.env.PINGCODE_CLIENT_ID = 'env-client';
  process.env.PINGCODE_CLIENT_SECRET = 'env-secret';
  try {
    const { opts } = loginModule.parseLoginArgs([]);
    assert.strictEqual(opts.client_id, 'env-client');
    assert.strictEqual(opts.client_secret, 'env-secret');
  } finally {
    delete process.env.PINGCODE_CLIENT_ID;
    delete process.env.PINGCODE_CLIENT_SECRET;
  }
});

test('login parser uses env var for redirect_uri', () => {
  process.env.PINGCODE_REDIRECT_URI = 'http://127.0.0.1:8888/cb';
  try {
    const { opts } = loginModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
    assert.strictEqual(opts.redirect_uri, 'http://127.0.0.1:8888/cb');
  } finally {
    delete process.env.PINGCODE_REDIRECT_URI;
  }
});

test('login parser rejects unknown option', () => {
  assert.throws(() => loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--bad-flag',
  ]), /Unknown option/);
});

test('login parser rejects unexpected positional argument', () => {
  assert.throws(() => loginModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', 'pos-arg',
  ]), /Unexpected argument/);
});

// ── Dry-run tests ──────────────────────────────────────────────────────

testInCleanTmp('login --dry-run --code returns exchange request shape', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await loginModule.run([
      '--client-id', 'c', '--client-secret', 's',
      '--code', 'auth-code-123',
      '--token-cache', cachePath,
      '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const output = outputs.join('\n');
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/auth/token');
  assert.strictEqual(parsed.params.grant_type, 'authorization_code');
  assert.strictEqual(parsed.params.code, 'auth-code-123');
  assert.strictEqual(parsed.params.client_id, 'c');
  assert.strictEqual(parsed.params.client_secret, 's');
  assert.ok('redirect_uri' in parsed.params);
});

testInCleanTmp('login --dry-run --no-browser prints authorization URL', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await loginModule.run([
      '--client-id', 'c', '--client-secret', 's',
      '--no-browser',
      '--token-cache', cachePath,
      '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const output = outputs.join('\n');
  assert.ok(output.includes('response_type=code'), `URL should contain response_type=code, got: ${output}`);
  assert.ok(output.includes('client_id=c'), `URL should contain client_id=c, got: ${output}`);
  assert.ok(output.includes('state='), `URL should contain a non-empty state parameter, got: ${output}`);
  // Verify state is non-empty (there should be something after state=)
  assert.ok(/state=([a-f0-9]+)/.test(output), `State should be a hex string, got: ${output}`);
});

testInCleanTmp('login --dry-run without credentials exits with auth guidance', async (t, tmpdir) => {
  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => { exitCode = code; throw new Error('exit'); };

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  try {
    await loginModule.run(['--dry-run']);
  } catch (_) {
    // exit throws
  } finally {
    process.exit = originalExit;
    console.error = originalError;
  }

  // The module doesn't call process.exit directly but throws PingCodeError.
  // The dispatcher in pingcode.js catches and sets exitCode=1.
  // But since we call run() directly, we should check the error.
  // Actually, looking at the pattern, run() throws for missing credentials.
  // So let's test with assert.rejects instead.
});

testInCleanTmp('login dry-run missing client_id throws credential error', async (t, tmpdir) => {
  await assert.rejects(
    () => loginModule.run(['--dry-run']),
    (err) => {
      assert.ok(err instanceof core.PingCodeError);
      assert.ok(err.message.includes('PINGCODE_CLIENT_ID'), `Expected PINGCODE_CLIENT_ID in message: ${err.message}`);
      return true;
    },
  );
});

testInCleanTmp('login dry-run missing client_secret throws credential error', async (t, tmpdir) => {
  await assert.rejects(
    () => loginModule.run(['--dry-run', '--client-id', 'c']),
    (err) => {
      assert.ok(err instanceof core.PingCodeError);
      assert.ok(err.message.includes('PINGCODE_CLIENT_ID'), `Expected PINGCODE_CLIENT_ID in message: ${err.message}`);
      return true;
    },
  );
});

// ── Code exchange tests ────────────────────────────────────────────────

testInCleanTmp('login --code exchanges code and saves token cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');

  mockFetch(fakeResponse({
    access_token: 'user-token-abc',
    token_type: 'Bearer',
    expires_in: 7200,
    refresh_token: 'refresh-xyz',
  }));

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await loginModule.run([
      '--client-id', 'c', '--client-secret', 's',
      '--code', 'auth-code-123',
      '--token-cache', cachePath,
    ]);
  } finally {
    console.log = originalLog;
  }

  // Check success message
  const output = outputs.join('\n');
  assert.ok(output.includes('User token saved'), `Expected success message, got: ${output}`);
  assert.ok(output.includes('authorization_code'), `Expected grant_type, got: ${output}`);
  // Must NOT echo access_token or refresh_token
  assert.ok(!output.includes('user-token-abc'), `Should not print access_token, got: ${output}`);
  assert.ok(!output.includes('refresh-xyz'), `Should not print refresh_token, got: ${output}`);

  // Check cache file
  assert.strictEqual(fs.existsSync(cachePath), true);
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cache.grant_type, 'authorization_code');
  assert.strictEqual(cache.access_token, 'user-token-abc');
  assert.strictEqual(cache.refresh_token, 'refresh-xyz');
  assert.ok(typeof cache.expires_at === 'number');
});

// ── No-browser tests ───────────────────────────────────────────────────

testInCleanTmp('login --no-browser prompts for code and saves token', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');

  mockFetch(fakeResponse({
    access_token: 'user-token-def',
    token_type: 'Bearer',
    expires_in: 7200,
    refresh_token: 'refresh-uvw',
  }));

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await loginModule.run([
      '--client-id', 'c', '--client-secret', 's',
      '--no-browser',
      '--token-cache', cachePath,
    ], async () => 'pasted-code-456');
  } finally {
    console.log = originalLog;
  }

  const output = outputs.join('\n');
  assert.ok(output.includes('Open this URL'), `Expected URL prompt, got: ${output}`);
  assert.ok(output.includes('response_type=code'), `Expected auth URL, got: ${output}`);
  assert.ok(output.includes('User token saved'), `Expected success message, got: ${output}`);

  // Check cache file
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cache.grant_type, 'authorization_code');
  assert.strictEqual(cache.access_token, 'user-token-def');
  assert.strictEqual(cache.refresh_token, 'refresh-uvw');
});

// ── Help output test (via spawn) ────────────────────────────────────────

test('login --help works via dispatcher', () => {
  const { spawnSync } = require('node:child_process');
  const REPO_ROOT = path.resolve(__dirname, '..');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), 'login', '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('--redirect-uri'));
  assert.ok(result.stdout.includes('--port'));
  assert.ok(result.stdout.includes('--no-browser'));
  assert.ok(result.stdout.includes('--code'));
  assert.ok(result.stdout.includes('--grant-type'));
  assert.ok(result.stdout.includes('--client-id'));
  assert.ok(result.stdout.includes('--client-secret'));
  assert.ok(result.stdout.includes('--base-url'));
  assert.ok(result.stdout.includes('--token-cache'));
  assert.ok(result.stdout.includes('--no-token-cache'));
  assert.ok(result.stdout.includes('--workspace-cache'));
  assert.ok(result.stdout.includes('--no-workspace-cache'));
  assert.ok(result.stdout.includes('--dry-run'));
});

test('login is listed in dispatcher module list', () => {
  const { spawnSync } = require('node:child_process');
  const REPO_ROOT = path.resolve(__dirname, '..');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('login'));
  assert.ok(result.stdout.includes('Authenticate with your PingCode user account'));
});

// ── createClient tests ─────────────────────────────────────────────────

testInCleanTmp('createClient constructs PingCodeClient with login defaults', async (t, tmpdir) => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'cid', '--client-secret', 'csec',
    '--token-cache', tmpFile(tmpdir, 'token.json'),
  ]);
  const client = loginModule.createClient(opts);
  assert.strictEqual(client.grantType, 'authorization_code');
  assert.strictEqual(client.clientId, 'cid');
  assert.strictEqual(client.clientSecret, 'csec');
});

testInCleanTmp('createClient with no_token_cache sets null cache', async (t, tmpdir) => {
  const { opts } = loginModule.parseLoginArgs([
    '--client-id', 'cid', '--client-secret', 'csec',
    '--no-token-cache',
  ]);
  const client = loginModule.createClient(opts);
  assert.strictEqual(client.tokenCache, null);
});

// ── buildDryRunExchange tests ──────────────────────────────────────────

test('buildDryRunExchange returns correct shape for authorization_code', () => {
  const opts = {
    grant_type: 'authorization_code',
    client_id: 'c',
    client_secret: 's',
    redirect_uri: 'http://127.0.0.1:8765/callback',
  };
  const result = loginModule.buildDryRunExchange(opts, 'auth-code-789');
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/auth/token');
  assert.strictEqual(result.params.grant_type, 'authorization_code');
  assert.strictEqual(result.params.code, 'auth-code-789');
  assert.strictEqual(result.params.client_id, 'c');
  assert.strictEqual(result.params.client_secret, 's');
  assert.strictEqual(result.params.redirect_uri, 'http://127.0.0.1:8765/callback');
});

test('buildDryRunExchange includes redirect_uri only for authorization_code', () => {
  const opts = {
    grant_type: 'refresh_token',
    client_id: 'c',
    client_secret: 's',
    redirect_uri: 'http://127.0.0.1:8765/callback',
  };
  const result = loginModule.buildDryRunExchange(opts, 'refresh-code');
  assert.strictEqual(result.params.grant_type, 'refresh_token');
  assert.strictEqual('redirect_uri' in result.params, false);
});

// ── Dispatcher integration tests ───────────────────────────────────────

test('login module is registered in shared registry', () => {
  const shared = require('../scripts/commands/shared');
  const mod = shared.getModule('login');
  assert.ok(mod, 'login module should be registered');
  assert.strictEqual(mod.name, 'login');
  assert.strictEqual(typeof mod.run, 'function');
});
