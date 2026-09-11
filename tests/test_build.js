'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const build = require('../scripts/commands/build');
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

async function captureLogAsync(fn) {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await fn();
  } finally {
    console.log = originalLog;
  }
  return output;
}

function primeEnv() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

async function dryRun(argv) {
  primeEnv();
  const output = await captureLogAsync(() => build.run(argv));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('build --help shows module help', async () => {
  const output = await captureLogAsync(() => build.run(['--help']));
  assert.ok(output.includes('PingCode build'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('patch'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('build with no args shows module help', async () => {
  const output = await captureLogAsync(() => build.run([]));
  assert.ok(output.includes('PingCode build'));
});

// ── Subcommand help ───────────────────────────────────────────────────

const ALL_SUBCOMMANDS = ['list', 'create', 'get', 'update', 'patch', 'delete'];

testInCleanEnv('every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => build.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode build ${sub}`),
      `expected usage for ${sub}, got: ${output}`,
    );
  }
});

// ── list ──────────────────────────────────────────────────────────────

testInCleanEnv('build list dry-run builds correct request', async () => {
  const result = await dryRun(['list', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/build/builds');
});

testInCleanEnv('build list rejects extra positional arguments', async () => {
  primeEnv();
  await assert.rejects(() => build.run(['list', 'extra']), /Unexpected argument/);
});

// ── create ────────────────────────────────────────────────────────────

const BUILD_CREATE_ARGS = [
  '--name', 'unit-test',
  '--identifier', '131',
  '--provider', 'jenkins',
  '--status', 'success',
  '--start-at', '1583290309',
  '--end-at', '1583290347',
  '--duration', '38',
  '--job-url', 'https://your-job-url',
  '--result-overview', '1000 test cases pass',
  '--result-url', 'https://your-result-url',
  '--work-item-identifiers', '["PLM-001"]',
];

testInCleanEnv('build create dry-run builds correct request', async () => {
  const result = await dryRun(['create', ...BUILD_CREATE_ARGS, '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/build/builds');
  assert.strictEqual(result.json.name, 'unit-test');
  assert.strictEqual(result.json.identifier, '131');
  assert.strictEqual(result.json.provider, 'jenkins');
  assert.strictEqual(result.json.status, 'success');
  assert.strictEqual(result.json.start_at, 1583290309);
  assert.strictEqual(result.json.end_at, 1583290347);
  assert.strictEqual(result.json.duration, 38);
  assert.strictEqual(result.json.job_url, 'https://your-job-url');
  assert.strictEqual(result.json.result_overview, '1000 test cases pass');
  assert.strictEqual(result.json.result_url, 'https://your-result-url');
  assert.deepStrictEqual(result.json.work_item_identifiers, ['PLM-001']);
});

testInCleanEnv('build create requires name, identifier, provider, status, and times', async () => {
  primeEnv();
  await assert.rejects(() => build.run(['create']), /--name is required/);
  await assert.rejects(() => build.run(['create', '--name', 'b']), /--identifier is required/);
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131']),
    /--provider is required/,
  );
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131', '--provider', 'jenkins']),
    /--status is required/,
  );
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131', '--provider', 'jenkins', '--status', 'success']),
    /--start-at is required/,
  );
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131', '--provider', 'jenkins', '--status', 'success', '--start-at', '1583290309']),
    /--end-at is required/,
  );
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131', '--provider', 'jenkins', '--status', 'success', '--start-at', '1583290309', '--end-at', '1583290347']),
    /--duration is required/,
  );
});

testInCleanEnv('build create rejects invalid provider and status', async () => {
  primeEnv();
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131', '--provider', 'circleci', '--status', 'success', '--start-at', '1', '--end-at', '2', '--duration', '3']),
    /--provider must be one of: bamboo, bitbucket, jenkins, other/,
  );
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131', '--provider', 'jenkins', '--status', 'running', '--start-at', '1', '--end-at', '2', '--duration', '3']),
    /--status must be one of: success, failure/,
  );
});

testInCleanEnv('build create rejects malformed work-item-identifiers JSON', async () => {
  primeEnv();
  await assert.rejects(
    () => build.run(['create', '--name', 'b', '--identifier', '131', '--provider', 'jenkins', '--status', 'success', '--start-at', '1', '--end-at', '2', '--duration', '3', '--work-item-identifiers', '{"a":1}']),
    /--work-item-identifiers must be a JSON array/,
  );
});

// ── get ───────────────────────────────────────────────────────────────

testInCleanEnv('build get dry-run builds correct request', async () => {
  const result = await dryRun(['get', '564587fe700d43b81b080765', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/build/builds/564587fe700d43b81b080765');
});

testInCleanEnv('build get requires a build id', async () => {
  primeEnv();
  await assert.rejects(() => build.run(['get']), /A build id is required/);
});

testInCleanEnv('build get rejects extra positional arguments', async () => {
  primeEnv();
  await assert.rejects(() => build.run(['get', 'id1', 'id2']), /Unexpected argument/);
});

// ── update (PUT) ──────────────────────────────────────────────────────

testInCleanEnv('build update dry-run sends PUT with full payload', async () => {
  const result = await dryRun(['update', '564587fe700d43b81b080765', ...BUILD_CREATE_ARGS, '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PUT');
  assert.strictEqual(result.path, '/v1/build/builds/564587fe700d43b81b080765');
  assert.strictEqual(result.json.name, 'unit-test');
  assert.strictEqual(result.json.status, 'success');
});

testInCleanEnv('build update requires required fields', async () => {
  primeEnv();
  await assert.rejects(
    () => build.run(['update', '564587fe700d43b81b080765']),
    /--name is required/,
  );
});

// ── patch (PATCH) ─────────────────────────────────────────────────────

testInCleanEnv('build patch dry-run sends PATCH with partial payload', async () => {
  const result = await dryRun([
    'patch', '564587fe700d43b81b080765',
    '--status', 'failure',
    '--duration', '45',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.json.status, 'failure');
  assert.strictEqual(result.json.duration, 45);
  assert.strictEqual('name' in result.json, false);
  assert.strictEqual('provider' in result.json, false);
});

testInCleanEnv('build patch requires at least one field', async () => {
  primeEnv();
  await assert.rejects(
    () => build.run(['patch', '564587fe700d43b81b080765']),
    /At least one field to update is required/,
  );
});

// ── delete ────────────────────────────────────────────────────────────

testInCleanEnv('build delete dry-run builds correct request', async () => {
  const result = await dryRun(['delete', '564587fe700d43b81b080765', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/build/builds/564587fe700d43b81b080765');
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('build list rejects unknown option', async () => {
  primeEnv();
  await assert.rejects(() => build.run(['list', '--unknown-flag']), /Unknown option/);
});

testInCleanEnv('build unknown subcommand errors', async () => {
  primeEnv();
  await assert.rejects(() => build.run(['unknown']), /Unknown build subcommand/);
});
