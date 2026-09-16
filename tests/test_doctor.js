'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const doctor = require('../scripts/doctor');
const {
  clearEnv, restoreEnv, mockFetch, fakeResponse, writeWorkspaceCache,
} = require('./helpers');

const CLI_ENTRY = path.join(__dirname, '..', 'scripts', 'pingcode.js');

function tmpWorkdir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function doctorSpawnEnv() {
  return {
    ...process.env,
    PINGCODE_DOCTOR_NETWORK: '0',
    PINGCODE_CLIENT_SECRET: 'e2e-secret-42',
  };
}

// ── --doctor flag extraction ──────────────────────────────────────────

test('extractDoctorOptions strips --doctor anywhere in the token list', () => {
  assert.deepStrictEqual(
    doctor.extractDoctorOptions(['auth', 'login', '--doctor', '--client-secret', 'x']),
    { enabled: true, outputPath: null, baseUrl: null, tokens: ['auth', 'login', '--client-secret', 'x'] },
  );
  const leading = doctor.extractDoctorOptions(['--doctor', 'workitem', 'list', '--compact']);
  assert.strictEqual(leading.enabled, true);
  assert.deepStrictEqual(leading.tokens, ['workitem', 'list', '--compact']);
  assert.strictEqual(doctor.extractDoctorOptions(['workitem', 'list']).enabled, false);
});

test('extractDoctorOptions consumes --doctor-output with a value', () => {
  assert.deepStrictEqual(
    doctor.extractDoctorOptions(['workitem', 'list', '--doctor-output', '/tmp/r.json']),
    { enabled: true, outputPath: '/tmp/r.json', baseUrl: null, tokens: ['workitem', 'list'] },
  );
  assert.deepStrictEqual(
    doctor.extractDoctorOptions(['--doctor-output=/tmp/r.json', 'config', 'list']),
    { enabled: true, outputPath: '/tmp/r.json', baseUrl: null, tokens: ['config', 'list'] },
  );
  assert.throws(
    () => doctor.extractDoctorOptions(['config', 'list', '--doctor-output', '--compact']),
    /--doctor-output requires/,
  );
  assert.throws(() => doctor.extractDoctorOptions(['--doctor-output']), /--doctor-output requires/);
});

test('extractDoctorOptions peeks --base-url without stripping it', () => {
  const spaced = doctor.extractDoctorOptions(['directory', 'me', '--doctor', '--base-url', 'https://x.test']);
  assert.strictEqual(spaced.baseUrl, 'https://x.test');
  assert.ok(spaced.tokens.includes('--base-url'), '--base-url must stay for the module');
  assert.ok(spaced.tokens.includes('https://x.test'));
  const eq = doctor.extractDoctorOptions(['--doctor', '--base-url=https://y.test', 'config', 'list']);
  assert.strictEqual(eq.baseUrl, 'https://y.test');
  assert.deepStrictEqual(eq.tokens, ['--base-url=https://y.test', 'config', 'list']);
  assert.strictEqual(doctor.extractDoctorOptions(['workitem', 'list']).baseUrl, null);
});

test('DoctorSession probes the base URL given by --base-url', () => {
  // The dispatcher parses --base-url and passes it explicitly.
  const { baseUrl } = doctor.extractDoctorOptions(['directory', 'me', '--doctor', '--base-url', 'https://x.test']);
  const session = new doctor.DoctorSession({
    argv: ['directory', 'me', '--doctor', '--base-url', 'https://x.test'],
    baseUrl,
    network: false,
  });
  assert.strictEqual(session.baseUrl, 'https://x.test');
  const fallback = new doctor.DoctorSession({ argv: ['--doctor'], network: false });
  assert.strictEqual(fallback.baseUrl, core.DEFAULT_BASE_URL);
  const envWins = (() => {
    const original = process.env.PINGCODE_BASE_URL;
    process.env.PINGCODE_BASE_URL = 'https://env.test';
    try {
      return new doctor.DoctorSession({ argv: ['--doctor'], network: false }).baseUrl;
    } finally {
      if (original === undefined) delete process.env.PINGCODE_BASE_URL;
      else process.env.PINGCODE_BASE_URL = original;
    }
  })();
  assert.strictEqual(envWins, 'https://env.test');
});

// ── Secret masking ────────────────────────────────────────────────────

test('maskUrl redacts secret query parameters but keeps the rest', () => {
  const masked = doctor.maskUrl(
    'https://open.pingcode.com/v1/auth/token?grant_type=client_credentials' +
    '&client_id=abcdef123456&client_secret=topsecret-value',
  );
  assert.ok(masked.includes('grant_type=client_credentials'));
  assert.ok(masked.includes('client_secret=%5BREDACTED%5D'));
  assert.ok(!masked.includes('topsecret-value'));
  // client_id is partially masked, never echoed whole
  assert.ok(!masked.includes('abcdef123456'));
  assert.ok(masked.includes('abcd...3456'));
});

test('maskText redacts secrets in free text and bearer tokens', () => {
  const masked = doctor.maskText(
    'request failed for https://x.test/api?client_secret=abc123 tail; auth was Bearer eyJhbGci.abc.def',
  );
  assert.ok(!masked.includes('abc123'));
  assert.ok(masked.includes('client_secret=[REDACTED]'));
  assert.ok(masked.includes('Bearer [REDACTED]'));
});

test('maskArgv redacts secret flag values in both forms', () => {
  const masked = doctor.maskArgv([
    'auth', 'login', '--client-secret', 'hushhush', '--token=abcd1234efgh',
    '--client-id', 'client-identity-99', 'context', 'init',
  ]);
  const joined = JSON.stringify(masked);
  assert.ok(!joined.includes('hushhush'));
  assert.ok(joined.includes('[REDACTED:len=8]'));
  assert.ok(!joined.includes('abcd1234efgh'));
  assert.ok(joined.includes('--token=[REDACTED:len=12]'));
  assert.ok(!joined.includes('client-identity-99'));
  assert.ok(joined.includes('clie...y-99'));
  // non-secret flags pass through untouched
  assert.ok(joined.includes('"context"'));
});

// ── Environment collection ────────────────────────────────────────────

test('collectEnv masks credentials and groups by category', () => {
  const original = clearEnv();
  try {
    process.env.PINGCODE_CLIENT_SECRET = 'env-secret-1234567890';
    process.env.PINGCODE_CLIENT_ID = 'client-identity-99';
    process.env.PINGCODE_BASE_URL = 'https://pingcode.example.com';
    process.env.HTTPS_PROXY = 'http://user:proxy-pass@proxy.corp:8080';
    const env = doctor.collectEnv();
    assert.strictEqual(
      env.pingcode.PINGCODE_CLIENT_SECRET,
      `set(len=${'env-secret-1234567890'.length})`,
    );
    assert.strictEqual(env.pingcode.PINGCODE_CLIENT_ID, 'clie...y-99');
    assert.strictEqual(env.pingcode.PINGCODE_BASE_URL, 'https://pingcode.example.com');
    assert.ok(env.proxy.HTTPS_PROXY.includes('%5BREDACTED%5D'));
    const flat = JSON.stringify(env);
    assert.ok(!flat.includes('env-secret-1234567890'));
    assert.ok(!flat.includes('proxy-pass'));
  } finally {
    restoreEnv(original);
  }
});

// ── Session report (offline) ──────────────────────────────────────────

test('DoctorSession writes a sanitized report with command metadata', async () => {
  const original = clearEnv();
  const workdir = tmpWorkdir('pingcode-doctor-test-');
  const reportPath = path.join(workdir, 'report.json');
  try {
    process.env.PINGCODE_CLIENT_SECRET = 'session-secret-123456';
    const session = new doctor.DoctorSession({
      argv: ['auth', 'login', '--client-secret', 'argv-secret-99'],
      outputPath: reportPath,
      network: false,
    });
    session.start();
    session.setCommand('auth', ['login', '--client-secret', 'argv-secret-99']);
    session.recordEvent({
      type: 'http_request', method: 'GET',
      url: 'https://open.pingcode.com/v1/auth/token?client_secret=xyz',
    });
    session.recordError(new Error('boom with client_secret=abc in text'), 'command');
    session.recordError(new Error('HTTP 401 unauthorized'), 'command');
    const result = await session.finish({ exitCode: 1 });

    assert.strictEqual(result.path, reportPath);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.strictEqual(report.schema, doctor.REPORT_SCHEMA);
    assert.strictEqual(report.command.module, 'auth');
    assert.strictEqual(report.command.exit_code, 1);
    assert.ok(Array.isArray(report.checks) && report.checks.length > 0);
    // non-zero exit marks the run itself unhealthy via the synthetic check
    assert.strictEqual(report.verdict, 'unhealthy');
    const cmdCheck = report.checks.find((c) => c.id === 'command_execution');
    assert.ok(cmdCheck, 'command_execution check recorded');
    assert.strictEqual(cmdCheck.status, 'fail');
    assert.strictEqual(report.runtime.node, process.version);
    assert.ok(report.events.some((e) => e.type === 'http_request'));
    assert.ok(report.errors.some((e) => e.message.includes('boom')));
    assert.ok(report.errors.some((e) => e.message.includes('HTTP 401')));
    assert.strictEqual(report.errors.length, 2, 'each error recorded exactly once');

    // secrets never reach the file, in any form
    const raw = fs.readFileSync(reportPath, 'utf8');
    assert.ok(!raw.includes('session-secret-123456'));
    assert.ok(!raw.includes('argv-secret-99'));
    assert.ok(!raw.includes('client_secret=xyz'));
    assert.ok(!raw.includes('client_secret=abc'));
    assert.strictEqual(
      report.env.pingcode.PINGCODE_CLIENT_SECRET,
      `set(len=${'session-secret-123456'.length})`,
    );
    assert.ok(report.cli.argv.join(' ').includes('[REDACTED'));
  } finally {
    restoreEnv(original);
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

test('DoctorSession with --doctor-output pointing at a directory writes inside it', async () => {
  const workdir = tmpWorkdir('pingcode-doctor-dir-');
  try {
    const session = new doctor.DoctorSession({ argv: ['--doctor'], outputPath: workdir, network: false });
    session.start();
    const result = await session.finish({ exitCode: 0 });
    assert.strictEqual(path.dirname(result.path), workdir);
    assert.ok(fs.existsSync(result.path));
    JSON.parse(fs.readFileSync(result.path, 'utf8'));
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

// ── Diagnostic sink over PingCodeClient ───────────────────────────────

test('doctor sink records masked HTTP events from PingCodeClient', async () => {
  const workdir = tmpWorkdir('pingcode-doctor-sink-');
  const reportPath = path.join(workdir, 'report.json');
  try {
    const session = new doctor.DoctorSession({
      argv: ['auth', 'status'],
      outputPath: reportPath,
      network: false,
    });
    session.start();
    // Wire the client exactly like the dispatcher does.
    core.setDiagnosticSink((event) => session.recordEvent(event));
    const client = new core.PingCodeClient({
      base_url: 'https://example.test',
      token_cache: null,
      workspace_cache: null,
    });
    mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
    await client.rawRequest(
      'GET', '/v1/auth/token',
      { client_id: 'abcdef123456', client_secret: 'raw-secret-value' },
      null, false,
    );
    mockFetch(fakeResponse({ error: 'bad credentials' }, 401));
    await assert.rejects(
      () => client.rawRequest('GET', '/v1/auth/token', { client_secret: 'other-secret-1' }, null, false),
      /HTTP 401/,
    );
    core.setDiagnosticSink(null);
    await session.finish({ exitCode: 0 });
    core.setDiagnosticSink(null);

    const req = session.events.find((e) => e.type === 'http_request');
    const res = session.events.find((e) => e.type === 'http_response');
    const err = session.events.find((e) => e.type === 'http_error');
    assert.ok(req, 'http_request recorded');
    assert.ok(res, 'http_response recorded');
    assert.ok(err, 'http_error recorded');
    assert.ok(!req.url.includes('raw-secret-value'));
    assert.ok(req.url.includes('client_secret='));
    assert.ok(!req.url.includes('abcdef123456'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(err.status, 401);

    // the written report is clean as well
    const raw = fs.readFileSync(reportPath, 'utf8');
    assert.ok(!raw.includes('raw-secret-value'));
    assert.ok(!raw.includes('other-secret-1'));
    assert.ok(raw.includes('http_request'));
  } finally {
    core.setDiagnosticSink(null);
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

test('doctor sink records workspace cache hits', async () => {
  const events = [];
  core.setDiagnosticSink((e) => events.push(e));
  const workdir = tmpWorkdir('pingcode-doctor-cache-');
  try {
    const cachePath = path.join(workdir, 'cache.json');
    writeWorkspaceCache(cachePath, { projects: { project_id: 'p1', name: 'P1' } });
    const client = new core.PingCodeClient({
      base_url: 'https://example.test',
      token_cache: null,
      workspace_cache: cachePath,
    });
    const response = await client.request('GET', '/v1/project/projects', {});
    assert.deepStrictEqual(response, { values: { project_id: 'p1', name: 'P1' } });
    const hit = events.find((e) => e.type === 'workspace_cache_hit');
    assert.ok(hit, 'workspace_cache_hit recorded');
    assert.strictEqual(hit.raw_path, '/v1/project/projects');
  } finally {
    core.setDiagnosticSink(null);
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

// ── End-to-end via the real dispatcher ────────────────────────────────

test('bare pingcode --doctor writes a report into the cwd and exits 0', () => {
  const workdir = tmpWorkdir('pingcode-doctor-e2e-');
  try {
    const res = spawnSync(process.execPath, [CLI_ENTRY, '--doctor'], {
      cwd: workdir,
      encoding: 'utf8',
      timeout: 30000,
      env: doctorSpawnEnv(),
    });
    assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
    assert.ok(res.stderr.includes('[doctor] report:'));
    const files = fs.readdirSync(workdir)
      .filter((f) => /^pingcode-doctor-\d{8}-\d{6}\.json$/.test(f));
    assert.strictEqual(files.length, 1);
    const raw = fs.readFileSync(path.join(workdir, files[0]), 'utf8');
    const report = JSON.parse(raw);
    assert.strictEqual(report.command, null);
    assert.ok(!raw.includes('e2e-secret-42'));
    assert.strictEqual(report.env.pingcode.PINGCODE_CLIENT_SECRET, 'set(len=13)');
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

test('pingcode --doctor with an unknown module reports and exits 1', () => {
  const workdir = tmpWorkdir('pingcode-doctor-e2e-bad-');
  try {
    const res = spawnSync(process.execPath, [CLI_ENTRY, '--doctor', 'nosuchmodule', 'list'], {
      cwd: workdir,
      encoding: 'utf8',
      timeout: 30000,
      env: doctorSpawnEnv(),
    });
    assert.strictEqual(res.status, 1);
    assert.ok(res.stderr.includes('Unknown module: nosuchmodule'));
    assert.ok(res.stderr.includes('[doctor] report:'));
    const files = fs.readdirSync(workdir)
      .filter((f) => /^pingcode-doctor-\d{8}-\d{6}\.json$/.test(f));
    assert.strictEqual(files.length, 1);
    const report = JSON.parse(fs.readFileSync(path.join(workdir, files[0]), 'utf8'));
    assert.ok(report.errors.some((e) => e.message.includes('Unknown module: nosuchmodule')));
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

test('pingcode --doctor <module> --help runs the module and writes a report', () => {
  const workdir = tmpWorkdir('pingcode-doctor-e2e-help-');
  try {
    const res = spawnSync(process.execPath, [CLI_ENTRY, '--doctor', 'update', '--help'], {
      cwd: workdir,
      encoding: 'utf8',
      timeout: 30000,
      env: doctorSpawnEnv(),
    });
    assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
    assert.ok(res.stdout.includes('Usage:'));
    assert.ok(res.stderr.includes("[doctor] command 'update': exit=0"));
    const files = fs.readdirSync(workdir)
      .filter((f) => /^pingcode-doctor-\d{8}-\d{6}\.json$/.test(f));
    assert.strictEqual(files.length, 1);
    const report = JSON.parse(fs.readFileSync(path.join(workdir, files[0]), 'utf8'));
    assert.strictEqual(report.command.module, 'update');
    assert.strictEqual(report.command.exit_code, 0);
    assert.deepStrictEqual(report.command.args, ['--help']);
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});
