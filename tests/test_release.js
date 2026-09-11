'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const release = require('../scripts/commands/release');
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
  const output = await captureLogAsync(() => release.run(argv));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('release --help shows module help', async () => {
  const output = await captureLogAsync(() => release.run(['--help']));
  assert.ok(output.includes('PingCode release'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('env-list'));
  assert.ok(output.includes('deploy-create'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('release with no args shows module help', async () => {
  const output = await captureLogAsync(() => release.run([]));
  assert.ok(output.includes('PingCode release'));
});

// ── Subcommand help ───────────────────────────────────────────────────

const ALL_SUBCOMMANDS = [
  'env-list', 'env-create', 'env-get', 'env-update', 'env-patch', 'env-delete',
  'deploy-list', 'deploy-create', 'deploy-get', 'deploy-update', 'deploy-patch', 'deploy-delete',
];

testInCleanEnv('every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => release.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode release ${sub}`),
      `expected usage for ${sub}, got: ${output}`,
    );
  }
});

// ── env-list ──────────────────────────────────────────────────────────

testInCleanEnv('release env-list dry-run builds correct request', async () => {
  const result = await dryRun(['env-list', '--name', 'Production', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/release/environments');
  assert.strictEqual(result.params.name, 'Production');
});

testInCleanEnv('release env-list requires a name', async () => {
  primeEnv();
  await assert.rejects(() => release.run(['env-list']), /--name is required/);
});

testInCleanEnv('release env-list rejects extra positional arguments', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['env-list', 'extra', '--name', 'Production']),
    /Unexpected argument/,
  );
});

// ── env-create ────────────────────────────────────────────────────────

testInCleanEnv('release env-create dry-run builds correct request', async () => {
  const result = await dryRun([
    'env-create',
    '--name', 'Production',
    '--html-url', 'https://env.example.com',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/release/environments');
  assert.strictEqual(result.json.name, 'Production');
  assert.strictEqual(result.json.html_url, 'https://env.example.com');
});

testInCleanEnv('release env-create requires a name', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['env-create', '--html-url', 'https://env.example.com']),
    /--name is required/,
  );
});

// ── env-get ───────────────────────────────────────────────────────────

testInCleanEnv('release env-get dry-run builds correct request', async () => {
  const result = await dryRun(['env-get', '564587fe700d43b81b080123', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/release/environments/564587fe700d43b81b080123');
});

testInCleanEnv('release env-get requires an environment id', async () => {
  primeEnv();
  await assert.rejects(() => release.run(['env-get']), /An environment id is required/);
});

// ── env-update (PUT) ──────────────────────────────────────────────────

testInCleanEnv('release env-update dry-run sends PUT with full payload', async () => {
  const result = await dryRun([
    'env-update', '564587fe700d43b81b080123',
    '--name', 'Staging',
    '--html-url', 'https://staging.example.com',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PUT');
  assert.strictEqual(result.path, '/v1/release/environments/564587fe700d43b81b080123');
  assert.strictEqual(result.json.name, 'Staging');
  assert.strictEqual(result.json.html_url, 'https://staging.example.com');
});

testInCleanEnv('release env-update requires a name', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['env-update', '564587fe700d43b81b080123']),
    /--name is required/,
  );
});

// ── env-patch (PATCH) ─────────────────────────────────────────────────

testInCleanEnv('release env-patch dry-run sends PATCH with partial payload', async () => {
  const result = await dryRun([
    'env-patch', '564587fe700d43b81b080123',
    '--name', 'Staging',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.json.name, 'Staging');
  assert.strictEqual('html_url' in result.json, false);
});

testInCleanEnv('release env-patch requires at least one field', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['env-patch', '564587fe700d43b81b080123']),
    /At least one field to update is required/,
  );
});

// ── env-delete ────────────────────────────────────────────────────────

testInCleanEnv('release env-delete dry-run builds correct request', async () => {
  const result = await dryRun(['env-delete', '564587fe700d43b81b080123', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/release/environments/564587fe700d43b81b080123');
});

// ── deploy-list ───────────────────────────────────────────────────────

testInCleanEnv('release deploy-list dry-run builds correct request', async () => {
  const result = await dryRun([
    'deploy-list',
    '--env-id', '564587fe700d43b81b080123',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/release/deploys');
  assert.strictEqual(result.params.env_id, '564587fe700d43b81b080123');
});

// ── deploy-create ─────────────────────────────────────────────────────

const DEPLOY_CREATE_ARGS = [
  '--status', 'deployed',
  '--env-id', '564587fe700d43b81b080123',
  '--release-name', '1.1.0',
  '--release-url', 'https://example.com/release/1.1.0',
  '--start-at', '1583143467',
  '--end-at', '1583143667',
  '--duration', '200',
  '--work-item-identifiers', '["PLM-001"]',
];

testInCleanEnv('release deploy-create dry-run builds correct request', async () => {
  const result = await dryRun(['deploy-create', ...DEPLOY_CREATE_ARGS, '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/release/deploys');
  assert.strictEqual(result.json.status, 'deployed');
  assert.strictEqual(result.json.env_id, '564587fe700d43b81b080123');
  assert.strictEqual(result.json.release_name, '1.1.0');
  assert.strictEqual(result.json.release_url, 'https://example.com/release/1.1.0');
  assert.strictEqual(result.json.start_at, 1583143467);
  assert.strictEqual(result.json.end_at, 1583143667);
  assert.strictEqual(result.json.duration, 200);
  assert.deepStrictEqual(result.json.work_item_identifiers, ['PLM-001']);
});

testInCleanEnv('release deploy-create requires status, env-id, release-name, and times', async () => {
  primeEnv();
  await assert.rejects(() => release.run(['deploy-create']), /--status is required/);
  await assert.rejects(
    () => release.run(['deploy-create', '--status', 'deployed']),
    /--env-id is required/,
  );
  await assert.rejects(
    () => release.run(['deploy-create', '--status', 'deployed', '--env-id', 'e1']),
    /--release-name is required/,
  );
  await assert.rejects(
    () => release.run(['deploy-create', '--status', 'deployed', '--env-id', 'e1', '--release-name', '1.0']),
    /--start-at is required/,
  );
  await assert.rejects(
    () => release.run(['deploy-create', '--status', 'deployed', '--env-id', 'e1', '--release-name', '1.0', '--start-at', '1583143467']),
    /--end-at is required/,
  );
  await assert.rejects(
    () => release.run(['deploy-create', '--status', 'deployed', '--env-id', 'e1', '--release-name', '1.0', '--start-at', '1583143467', '--end-at', '1583143667']),
    /--duration is required/,
  );
});

testInCleanEnv('release deploy-create rejects invalid status', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['deploy-create', '--status', 'failed', '--env-id', 'e1', '--release-name', '1.0', '--start-at', '1', '--end-at', '2', '--duration', '3']),
    /--status must be one of: not_deployed, deployed/,
  );
});

// ── deploy-get ────────────────────────────────────────────────────────

testInCleanEnv('release deploy-get dry-run builds correct request', async () => {
  const result = await dryRun(['deploy-get', '564587fe700d43b81b080339', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/release/deploys/564587fe700d43b81b080339');
});

testInCleanEnv('release deploy-get requires a deploy id', async () => {
  primeEnv();
  await assert.rejects(() => release.run(['deploy-get']), /A deploy id is required/);
});

// ── deploy-update (PUT) ───────────────────────────────────────────────

testInCleanEnv('release deploy-update dry-run sends PUT with full payload', async () => {
  const result = await dryRun(['deploy-update', '564587fe700d43b81b080339', ...DEPLOY_CREATE_ARGS, '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PUT');
  assert.strictEqual(result.path, '/v1/release/deploys/564587fe700d43b81b080339');
  assert.strictEqual(result.json.status, 'deployed');
  assert.strictEqual(result.json.duration, 200);
});

// ── deploy-patch (PATCH) ──────────────────────────────────────────────

testInCleanEnv('release deploy-patch dry-run sends PATCH with partial payload', async () => {
  const result = await dryRun([
    'deploy-patch', '564587fe700d43b81b080339',
    '--status', 'not_deployed',
    '--duration', '120',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.json.status, 'not_deployed');
  assert.strictEqual(result.json.duration, 120);
  assert.strictEqual('env_id' in result.json, false);
  assert.strictEqual('release_name' in result.json, false);
});

testInCleanEnv('release deploy-patch requires at least one field', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['deploy-patch', '564587fe700d43b81b080339']),
    /At least one field to update is required/,
  );
});

// ── deploy-delete ─────────────────────────────────────────────────────

testInCleanEnv('release deploy-delete dry-run builds correct request', async () => {
  const result = await dryRun(['deploy-delete', '564587fe700d43b81b080339', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/release/deploys/564587fe700d43b81b080339');
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('release env-create rejects unknown option', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['env-create', '--name', 'X', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('release unknown subcommand errors', async () => {
  primeEnv();
  await assert.rejects(
    () => release.run(['unknown']),
    /Unknown release subcommand/,
  );
});
