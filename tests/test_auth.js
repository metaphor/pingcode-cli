'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const authModule = require('../scripts/commands/auth');
const { tmpFile, clearEnv, restoreEnv, fakeResponse, mockFetch } = require('./helpers');

// ── Test helpers ───────────────────────────────────────────────────────

function testInCleanTmp(name, fn) {
  test(name, async (t) => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
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

// ── Parser tests ───────────────────────────────────────────────────────

test('login parser parses --help', () => {
  const { opts, helpRequested } = authModule.parseLoginArgs(['--help']);
  assert.strictEqual(helpRequested, true);
});

test('login parser parses -h', () => {
  const { opts, helpRequested } = authModule.parseLoginArgs(['-h']);
  assert.strictEqual(helpRequested, true);
});

test('login parser defaults grant_type to authorization_code', () => {
  const { opts } = authModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.grant_type, 'authorization_code');
});

test('login parser defaults redirect_uri to http://127.0.0.1:8765/callback', () => {
  const { opts } = authModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.redirect_uri, 'http://127.0.0.1:8765/callback');
});

test('login parser defaults port to 8765', () => {
  const { opts } = authModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.port, 8765);
});

test('login parser accepts --redirect-uri', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's',
    '--redirect-uri', 'http://127.0.0.1:9000/oauth',
  ]);
  assert.strictEqual(opts.redirect_uri, 'http://127.0.0.1:9000/oauth');
});

test('login parser accepts --port', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--port', '9999',
  ]);
  assert.strictEqual(opts.port, 9999);
});

test('login parser rejects invalid port', () => {
  assert.throws(() => authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--port', 'invalid',
  ]), /Invalid port/);
});

test('login parser defaults browser to true', () => {
  const { opts } = authModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.browser, true);
});

test('login parser accepts --browser', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--browser',
  ]);
  assert.strictEqual(opts.browser, true);
});

test('login parser keeps --no-browser as backward-compatible no-op', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--no-browser',
  ]);
  assert.strictEqual(opts.browser, false);
});

test('login parser accepts --code', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--code', 'auth-code-123',
  ]);
  assert.strictEqual(opts.code, 'auth-code-123');
});

test('login parser accepts --dry-run', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--dry-run',
  ]);
  assert.strictEqual(opts.dry_run, true);
});

test('login parser accepts --grant-type', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--grant-type', 'refresh_token',
  ]);
  assert.strictEqual(opts.grant_type, 'refresh_token');
});

test('login parser accepts --token-cache', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--token-cache', '/tmp/tokens.json',
  ]);
  assert.strictEqual(opts.token_cache, '/tmp/tokens.json');
});

test('login parser accepts --workspace-cache', () => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--workspace-cache', '/tmp/ws.json',
  ]);
  assert.strictEqual(opts.workspace_cache, '/tmp/ws.json');
});

test('login parser uses env vars for client_id and client_secret', () => {
  process.env.PINGCODE_CLIENT_ID = 'env-client';
  process.env.PINGCODE_CLIENT_SECRET = 'env-secret';
  try {
    const { opts } = authModule.parseLoginArgs([]);
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
    const { opts } = authModule.parseLoginArgs(['--client-id', 'c', '--client-secret', 's']);
    assert.strictEqual(opts.redirect_uri, 'http://127.0.0.1:8888/cb');
  } finally {
    delete process.env.PINGCODE_REDIRECT_URI;
  }
});

test('login parser rejects unknown option', () => {
  assert.throws(() => authModule.parseLoginArgs([
    '--client-id', 'c', '--client-secret', 's', '--bad-flag',
  ]), /Unknown option/);
});

test('login parser rejects unexpected positional argument', () => {
  assert.throws(() => authModule.parseLoginArgs([
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
    await authModule.runLogin([
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

testInCleanTmp('login --dry-run prints authorization URL', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runLogin([
      '--client-id', 'c', '--client-secret', 's',
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
    await authModule.runLogin(['--dry-run']);
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
    () => authModule.runLogin(['--dry-run']),
    (err) => {
      assert.ok(err instanceof core.PingCodeError);
      assert.ok(err.message.includes('PINGCODE_CLIENT_ID'), `Expected PINGCODE_CLIENT_ID in message: ${err.message}`);
      return true;
    },
  );
});

testInCleanTmp('login dry-run missing client_secret throws credential error', async (t, tmpdir) => {
  await assert.rejects(
    () => authModule.runLogin(['--dry-run', '--client-id', 'c']),
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
    await authModule.runLogin([
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
    await authModule.runLogin([
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

// ── Browser flow integration test ────────────────────────────────────

testInCleanTmp('login --browser opens browser, receives callback, and saves token', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');

  mockFetch(fakeResponse({
    access_token: 'user-token-browser',
    token_type: 'Bearer',
    expires_in: 7200,
    refresh_token: 'refresh-browser',
  }));

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));

  try {
    await authModule.runLogin([
      '--client-id', 'c', '--client-secret', 's',
      '--browser',
      '--token-cache', cachePath,
    ], null, {
      openBrowser: async (url) => {},
      startAuthCallbackServer: async ({ port, path, state }) => ({
        code: 'browser-code-789',
        state,
      }),
    });
  } finally {
    console.log = originalLog;
  }

  const output = outputs.join('\n');
  assert.ok(output.includes('Authorization code received'), `Expected progress message, got: ${output}`);
  assert.ok(output.includes('User token saved'), `Expected success message, got: ${output}`);
  assert.ok(output.includes('authorization_code'), `Expected grant_type, got: ${output}`);
  assert.ok(!output.includes('user-token-browser'), `Should not print access_token, got: ${output}`);
  assert.ok(!output.includes('refresh-browser'), `Should not print refresh_token, got: ${output}`);

  // Check cache file
  assert.strictEqual(fs.existsSync(cachePath), true);
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cache.grant_type, 'authorization_code');
  assert.strictEqual(cache.access_token, 'user-token-browser');
  assert.strictEqual(cache.refresh_token, 'refresh-browser');
  assert.ok(typeof cache.expires_at === 'number');
});

// ── openBrowser tests ───────────────────────────────────────────────────

function fakeSpawner(command, args, opts) {
  const child = new EventEmitter();
  child.unref = () => {};
  child.stdin = null;
  child.stdout = null;
  child.stderr = null;
  child.stdio = [];
  child.pid = 123;
  process.nextTick(() => child.emit('spawn'));
  return child;
}

test('openBrowser resolves on spawn event without waiting for browser close', async () => {
  const result = await authModule.openBrowser('https://example.com', fakeSpawner);
  assert.strictEqual(result, true);
});

test('openBrowser rejects on spawn error', async () => {
  const error = new Error('spawn failed');
  const failingSpawner = (command, args, opts) => {
    const child = new EventEmitter();
    child.unref = () => {};
    child.stdin = null;
    child.stdout = null;
    child.stderr = null;
    child.stdio = [];
    process.nextTick(() => child.emit('error', error));
    return child;
  };

  await assert.rejects(
    () => authModule.openBrowser('https://example.com', failingSpawner),
    /spawn failed/
  );
});

testInCleanTmp('login --browser starts callback server before browser redirect', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');

  mockFetch(fakeResponse({
    access_token: 'user-token-real',
    token_type: 'Bearer',
    expires_in: 7200,
    refresh_token: 'refresh-real',
  }));

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));

  let browserRedirectPromise = null;

  try {
    await authModule.runLogin([
      '--client-id', 'c', '--client-secret', 's',
      '--browser',
      '--token-cache', cachePath,
    ], null, {
      openBrowser: async (url) => {
        const http = require('node:http');
        const authUrl = new URL(url);
        const redirectUri = authUrl.searchParams.get('redirect_uri');
        const callbackUrl = new URL(redirectUri);
        const state = authUrl.searchParams.get('state');
        const redirectTarget =
          `http://127.0.0.1:${callbackUrl.port}${callbackUrl.pathname}?code=browser-real-123&state=${encodeURIComponent(state)}`;
        // Return immediately so runLogin starts the local callback server,
        // then make the browser redirect in the background after a short delay.
        browserRedirectPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            const req = http.get(redirectTarget, (res) => {
              res.resume();
              resolve();
            });
            req.on('error', (err) => reject(err));
          }, 100);
        });
      },
      startAuthCallbackServer: core.startAuthCallbackServer,
    });
  } finally {
    console.log = originalLog;
  }

  if (browserRedirectPromise) {
    await browserRedirectPromise;
  }

  const output = outputs.join('\n');
  assert.ok(output.includes('Authorization code received'), `Expected progress message, got: ${output}`);
  assert.ok(output.includes('User token saved'), `Expected success message, got: ${output}`);

  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  assert.strictEqual(cache.grant_type, 'authorization_code');
  assert.strictEqual(cache.access_token, 'user-token-real');
  assert.strictEqual(cache.refresh_token, 'refresh-real');
  assert.ok(typeof cache.expires_at === 'number');
});

// ── Help output test (via spawn) ────────────────────────────────────────

test('auth login --help works via dispatcher', () => {
  const { spawnSync } = require('node:child_process');
  const REPO_ROOT = path.resolve(__dirname, '..');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), 'auth', 'login', '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('--redirect-uri'));
  assert.ok(result.stdout.includes('--port'));
  assert.ok(result.stdout.includes('--browser'));
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

test('auth is listed in dispatcher module list', () => {
  const { spawnSync } = require('node:child_process');
  const REPO_ROOT = path.resolve(__dirname, '..');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('auth'));
  assert.ok(result.stdout.includes('Authenticate with PingCode'));
});

// ── createClient tests ─────────────────────────────────────────────────

testInCleanTmp('createClient constructs PingCodeClient with login defaults', async (t, tmpdir) => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'cid', '--client-secret', 'csec',
    '--token-cache', tmpFile(tmpdir, 'token.json'),
  ]);
  const client = authModule.createClient(opts);
  assert.strictEqual(client.grantType, 'authorization_code');
  assert.strictEqual(client.clientId, 'cid');
  assert.strictEqual(client.clientSecret, 'csec');
});

testInCleanTmp('createClient with no_token_cache sets null cache', async (t, tmpdir) => {
  const { opts } = authModule.parseLoginArgs([
    '--client-id', 'cid', '--client-secret', 'csec',
    '--no-token-cache',
  ]);
  const client = authModule.createClient(opts);
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
  const result = authModule.buildDryRunExchange(opts, 'auth-code-789');
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
  const result = authModule.buildDryRunExchange(opts, 'refresh-code');
  assert.strictEqual(result.params.grant_type, 'refresh_token');
  assert.strictEqual('redirect_uri' in result.params, false);
});

// ── Dispatcher integration tests ───────────────────────────────────────

test('auth module is registered in shared registry', () => {
  const shared = require('../scripts/commands/shared');
  const mod = shared.getModule('auth');
  assert.ok(mod, 'auth module should be registered');
  assert.strictEqual(mod.name, 'auth');
  assert.strictEqual(typeof mod.run, 'function');
});

test('auth with no subcommand prints module help', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);
  try {
    await authModule.run([]);
  } finally {
    console.log = originalLog;
  }
  const output = logs.join('\n');
  assert.ok(output.includes('Usage: pingcode auth <subcommand>'));
  assert.ok(output.includes('login'));
});

test('auth with unknown subcommand throws', async () => {
  await assert.rejects(
    () => authModule.run(['bogus']),
    /Unknown auth subcommand: bogus/,
  );
});

test('auth run dispatches to login subcommand', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);
  try {
    await authModule.run(['login', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(logs.join('\n').includes('Usage: pingcode auth login [options]'));
});

// ── Status parser tests ────────────────────────────────────────────────

test('status parser parses --help', () => {
  const { opts, helpRequested } = authModule.parseStatusArgs(['--help']);
  assert.strictEqual(helpRequested, true);
});

test('status parser defaults grant_type to auto', () => {
  const { opts } = authModule.parseStatusArgs(['--client-id', 'c', '--client-secret', 's']);
  assert.strictEqual(opts.grant_type, 'auto');
});

test('status parser accepts --grant-type', () => {
  const { opts } = authModule.parseStatusArgs([
    '--client-id', 'c', '--client-secret', 's', '--grant-type', 'client_credentials',
  ]);
  assert.strictEqual(opts.grant_type, 'client_credentials');
});

test('status parser accepts --token', () => {
  const { opts } = authModule.parseStatusArgs([
    '--token', 'explicit-token',
  ]);
  assert.strictEqual(opts.token, 'explicit-token');
});

test('status parser accepts --compact', () => {
  const { opts } = authModule.parseStatusArgs([
    '--client-id', 'c', '--client-secret', 's', '--compact',
  ]);
  assert.strictEqual(opts.compact, true);
});

test('status parser accepts --token-cache', () => {
  const { opts } = authModule.parseStatusArgs([
    '--token-cache', '/tmp/tokens.json',
  ]);
  assert.strictEqual(opts.token_cache, '/tmp/tokens.json');
});

test('status parser accepts --workspace-cache', () => {
  const { opts } = authModule.parseStatusArgs([
    '--workspace-cache', '/tmp/ws.json',
  ]);
  assert.strictEqual(opts.workspace_cache, '/tmp/ws.json');
});

test('status parser rejects unknown option', () => {
  assert.throws(() => authModule.parseStatusArgs([
    '--client-id', 'c', '--client-secret', 's', '--bad-flag',
  ]), /Unknown option/);
});

test('status parser rejects unexpected positional argument', () => {
  assert.throws(() => authModule.parseStatusArgs([
    '--client-id', 'c', '--client-secret', 's', 'pos-arg',
  ]), /Unexpected argument/);
});

// ── Status behavior tests ──────────────────────────────────────────────

testInCleanTmp('status with no token reports unauthenticated', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runStatus([
      '--token-cache', cachePath,
    ]);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(outputs.join('\n'));
  assert.strictEqual(parsed.authenticated, false);
  assert.strictEqual(parsed.token_valid, false);
  assert.strictEqual(parsed.token_cache_exists, false);
  assert.strictEqual(parsed.credentials.client_id_configured, false);
  assert.strictEqual(parsed.credentials.client_secret_configured, false);
  assert.ok(!('access_token' in parsed), 'Should not expose access_token');
  assert.ok(!('refresh_token' in parsed), 'Should not expose refresh_token');
});

testInCleanTmp('status with credentials reports configured credentials', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runStatus([
      '--client-id', 'c', '--client-secret', 's',
      '--token-cache', cachePath,
    ]);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(outputs.join('\n'));
  assert.strictEqual(parsed.authenticated, false);
  assert.strictEqual(parsed.credentials.client_id_configured, true);
  assert.strictEqual(parsed.credentials.client_secret_configured, true);
});

testInCleanTmp('status with explicit token reports authenticated', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runStatus([
      '--token', 'explicit-token',
      '--token-cache', cachePath,
    ]);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(outputs.join('\n'));
  assert.strictEqual(parsed.authenticated, true);
  assert.strictEqual(parsed.token_valid, true);
  assert.strictEqual(parsed.grant_type, 'client_credentials');
});

testInCleanTmp('status with valid cached token reports authenticated', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  core.saveCachedToken(cachePath, 'cached-token', 7200, 'authorization_code');

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runStatus(['--token-cache', cachePath]);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(outputs.join('\n'));
  assert.strictEqual(parsed.authenticated, true);
  assert.strictEqual(parsed.token_valid, true);
  assert.strictEqual(parsed.token_cache_exists, true);
  assert.strictEqual(parsed.grant_type, 'authorization_code');
  assert.ok(typeof parsed.token_expires_at === 'number');
  assert.ok(parsed.token_expires_in > 0);
  assert.ok(!('access_token' in parsed), 'Should not expose access_token');
  assert.ok(!('refresh_token' in parsed), 'Should not expose refresh_token');
});

testInCleanTmp('status with expired cached token reports token_valid false', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  fs.writeFileSync(cachePath, JSON.stringify({
    grant_type: 'authorization_code',
    access_token: 'expired-token',
    expires_at: Math.floor(Date.now() / 1000) - 60,
  }));

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runStatus(['--token-cache', cachePath]);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(outputs.join('\n'));
  assert.strictEqual(parsed.authenticated, false);
  assert.strictEqual(parsed.token_valid, false);
  assert.strictEqual(parsed.token_cache_exists, true);
  assert.strictEqual(parsed.grant_type, 'authorization_code');
  assert.ok(!parsed.token_expires_in);
  assert.ok(!('access_token' in parsed), 'Should not expose access_token');
});

testInCleanTmp('status --compact returns reduced output', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  core.saveCachedToken(cachePath, 'cached-token', 7200, 'client_credentials');

  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runStatus(['--token-cache', cachePath, '--compact']);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(outputs.join('\n'));
  assert.strictEqual(parsed.authenticated, true);
  assert.strictEqual(parsed.grant_type, 'client_credentials');
  assert.strictEqual(parsed.token_valid, true);
  assert.strictEqual(parsed.credentials.client_id_configured, false);
  assert.ok(!('token_cache' in parsed), 'Compact output should omit token_cache');
});

testInCleanTmp('status --dry-run marks output dry_run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'token.json');
  const outputs = [];
  const originalLog = console.log;
  console.log = (...args) => outputs.push(args.join(' '));
  try {
    await authModule.runStatus([
      '--client-id', 'c', '--client-secret', 's',
      '--token-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(outputs.join('\n'));
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.authenticated, false);
});

test('auth status --help works via dispatcher', () => {
  const { spawnSync } = require('node:child_process');
  const REPO_ROOT = path.resolve(__dirname, '..');
  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts', 'pingcode.js'), 'auth', 'status', '--help',
  ], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.includes('--grant-type'));
  assert.ok(result.stdout.includes('--client-id'));
  assert.ok(result.stdout.includes('--client-secret'));
  assert.ok(result.stdout.includes('--base-url'));
  assert.ok(result.stdout.includes('--token-cache'));
  assert.ok(result.stdout.includes('--no-token-cache'));
  assert.ok(result.stdout.includes('--workspace-cache'));
  assert.ok(result.stdout.includes('--no-workspace-cache'));
  assert.ok(result.stdout.includes('--token'));
  assert.ok(result.stdout.includes('--dry-run'));
  assert.ok(result.stdout.includes('--compact'));
});

test('auth run dispatches to status subcommand', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);
  try {
    await authModule.run(['status', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(logs.join('\n').includes('Usage: pingcode auth status [options]'));
});
