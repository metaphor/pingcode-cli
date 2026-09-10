'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const workload = require('../scripts/commands/workload');
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
  const output = await captureLogAsync(() => workload.run(argv));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('workload --help shows module help', async () => {
  const output = await captureLogAsync(() => workload.run(['--help']));
  assert.ok(output.includes('PingCode workload'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('type-list'));
  assert.ok(output.includes('type-get'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('workload with no args shows module help', async () => {
  const output = await captureLogAsync(() => workload.run([]));
  assert.ok(output.includes('PingCode workload'));
});

// ── Subcommand help ───────────────────────────────────────────────────

const ALL_SUBCOMMANDS = ['list', 'create', 'get', 'update', 'delete', 'type-list', 'type-get'];

testInCleanEnv('every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => workload.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode workload ${sub}`),
      `expected usage for ${sub}, got: ${output}`,
    );
  }
});

// ── list ──────────────────────────────────────────────────────────────

testInCleanEnv('workload list dry-run builds correct request', async () => {
  const result = await dryRun([
    'list',
    '--principal-type', 'work_item',
    '--pilot-id', '63bb744314bd13c9def24cb4',
    '--principal-id', '564587fe700d43b81b080ab8',
    '--start-at', '1583290309',
    '--end-at', '1585878309',
    '--report-by-id', 'a0417f68e846aae315c85d24643678a9',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/workloads');
  assert.strictEqual(result.params.principal_type, 'work_item');
  assert.strictEqual(result.params.pilot_id, '63bb744314bd13c9def24cb4');
  assert.strictEqual(result.params.principal_id, '564587fe700d43b81b080ab8');
  assert.strictEqual(result.params.start_at, '1583290309');
  assert.strictEqual(result.params.end_at, '1585878309');
  assert.strictEqual(result.params.report_by_id, 'a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('workload list sends no params when no filters given', async () => {
  const result = await dryRun(['list', '--dry-run']);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/workloads');
  assert.deepStrictEqual(result.params, {});
});

testInCleanEnv('workload list rejects invalid principal type', async () => {
  primeEnv();
  await assert.rejects(
    () => workload.run(['list', '--principal-type', 'product']),
    /--principal-type must be one of: work_item, idea, test_case/,
  );
});

testInCleanEnv('workload list rejects extra positional arguments', async () => {
  primeEnv();
  await assert.rejects(() => workload.run(['list', 'extra']), /Unexpected argument/);
});

// ── create ────────────────────────────────────────────────────────────

testInCleanEnv('workload create dry-run builds correct request', async () => {
  const result = await dryRun([
    'create',
    '--principal-type', 'work_item',
    '--principal-id', '564587fe700d43b81b080ab8',
    '--duration', '4.5',
    '--report-at', '1583290309',
    '--type-id', '5a86eaf6a72585327ea46fge0',
    '--report-by-id', 'a0417f68e846aae315c85d24643678a9',
    '--recorded-at', '2020-03-04T10:00:00+08:00',
    '--description', '这是一个工时',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/workloads');
  assert.strictEqual(result.json.principal_type, 'work_item');
  assert.strictEqual(result.json.principal_id, '564587fe700d43b81b080ab8');
  assert.strictEqual(result.json.duration, 4.5);
  assert.strictEqual(result.json.report_at, 1583290309);
  assert.strictEqual(result.json.type_id, '5a86eaf6a72585327ea46fge0');
  assert.strictEqual(result.json.report_by_id, 'a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(result.json.recorded_at, '2020-03-04T10:00:00+08:00');
  assert.strictEqual(result.json.description, '这是一个工时');
});

testInCleanEnv('workload create requires principal-type, principal-id, duration, report-at', async () => {
  primeEnv();
  await assert.rejects(() => workload.run(['create']), /--principal-type is required/);
  await assert.rejects(
    () => workload.run(['create', '--principal-type', 'work_item']),
    /--principal-id is required/,
  );
  await assert.rejects(
    () => workload.run(['create', '--principal-type', 'work_item', '--principal-id', 'p1']),
    /--duration is required/,
  );
  await assert.rejects(
    () => workload.run(['create', '--principal-type', 'work_item', '--principal-id', 'p1', '--duration', '4']),
    /--report-at is required/,
  );
});

testInCleanEnv('workload create rejects invalid principal type and non-numeric duration', async () => {
  primeEnv();
  await assert.rejects(
    () => workload.run(['create', '--principal-type', 'ticket', '--principal-id', 'p1', '--duration', '4', '--report-at', '1583290309']),
    /--principal-type must be one of: work_item, idea, test_case/,
  );
  await assert.rejects(
    () => workload.run(['create', '--principal-type', 'work_item', '--principal-id', 'p1', '--duration', 'abc', '--report-at', '1583290309']),
    /--duration must be a number/,
  );
});

// ── get ───────────────────────────────────────────────────────────────

testInCleanEnv('workload get dry-run builds correct request', async () => {
  const result = await dryRun(['get', '5edca524cad2fa112b06105c', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/workloads/5edca524cad2fa112b06105c');
});

testInCleanEnv('workload get requires a workload id', async () => {
  primeEnv();
  await assert.rejects(() => workload.run(['get']), /A workload id is required/);
});

// ── update (PATCH) ────────────────────────────────────────────────────

testInCleanEnv('workload update dry-run sends PATCH with partial payload', async () => {
  const result = await dryRun([
    'update', '5edca524cad2fa112b06105c',
    '--duration', '6',
    '--description', 'updated workload',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/workloads/5edca524cad2fa112b06105c');
  assert.strictEqual(result.json.duration, 6);
  assert.strictEqual(result.json.description, 'updated workload');
  assert.strictEqual('type_id' in result.json, false);
  assert.strictEqual('report_at' in result.json, false);
});

testInCleanEnv('workload update requires at least one field', async () => {
  primeEnv();
  await assert.rejects(
    () => workload.run(['update', '5edca524cad2fa112b06105c']),
    /At least one field to update is required/,
  );
});

// ── delete ────────────────────────────────────────────────────────────

testInCleanEnv('workload delete dry-run builds correct request', async () => {
  const result = await dryRun(['delete', '5edca524cad2fa112b06105c', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/workloads/5edca524cad2fa112b06105c');
});

testInCleanEnv('workload delete requires a workload id', async () => {
  primeEnv();
  await assert.rejects(() => workload.run(['delete']), /A workload id is required/);
});

// ── type-list / type-get ──────────────────────────────────────────────

testInCleanEnv('workload type-list dry-run builds correct request', async () => {
  const result = await dryRun(['type-list', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/workload_types');
});

testInCleanEnv('workload type-get dry-run builds correct request', async () => {
  const result = await dryRun(['type-get', '5a86eaf6a72585327ea46fge0', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/workload_types/5a86eaf6a72585327ea46fge0');
});

testInCleanEnv('workload type-get requires a type id', async () => {
  primeEnv();
  await assert.rejects(() => workload.run(['type-get']), /A workload type id is required/);
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('workload create rejects unknown option', async () => {
  primeEnv();
  await assert.rejects(
    () => workload.run(['create', '--principal-type', 'work_item', '--unknown-flag', 'x']),
    /Unknown option/,
  );
});

testInCleanEnv('workload unknown subcommand errors', async () => {
  primeEnv();
  await assert.rejects(() => workload.run(['unknown']), /Unknown workload subcommand/);
});
