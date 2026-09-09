'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const review = require('../scripts/commands/review');
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
  const output = await captureLogAsync(() => review.run(argv));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('review --help shows module help', async () => {
  const output = await captureLogAsync(() => review.run(['--help']));
  assert.ok(output.includes('PingCode review'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('principal-add'));
  assert.ok(output.includes('principal-remove'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('review with no args shows module help', async () => {
  const output = await captureLogAsync(() => review.run([]));
  assert.ok(output.includes('PingCode review'));
});

// ── Subcommand help ───────────────────────────────────────────────────

const ALL_SUBCOMMANDS = [
  'list', 'create', 'get', 'delete',
  'principal-add', 'principal-list', 'principal-get', 'principal-remove',
];

testInCleanEnv('every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => review.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode review ${sub}`),
      `expected usage for ${sub}, got: ${output}`,
    );
  }
});

// ── list ──────────────────────────────────────────────────────────────

testInCleanEnv('review list dry-run builds correct request', async () => {
  const result = await dryRun([
    'list',
    '--principal-type', 'idea',
    '--pilot-id', '63bb744314bd13c9def24cb4',
    '--status', 'completed',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/reviews');
  assert.strictEqual(result.params.principal_type, 'idea');
  assert.strictEqual(result.params.pilot_id, '63bb744314bd13c9def24cb4');
  assert.strictEqual(result.params.status, 'completed');
});

testInCleanEnv('review list requires principal-type and pilot-id', async () => {
  primeEnv();
  await assert.rejects(() => review.run(['list']), /--principal-type is required/);
  await assert.rejects(
    () => review.run(['list', '--principal-type', 'idea']),
    /--pilot-id is required/,
  );
});

testInCleanEnv('review list rejects invalid principal type and status', async () => {
  primeEnv();
  await assert.rejects(
    () => review.run(['list', '--principal-type', 'ticket', '--pilot-id', 'p1']),
    /--principal-type must be one of: idea, work_item, test_case/,
  );
  await assert.rejects(
    () => review.run(['list', '--principal-type', 'idea', '--pilot-id', 'p1', '--status', 'draft']),
    /--status must be one of: pending, in_progress, completed, repealed/,
  );
});

testInCleanEnv('review list rejects extra positional arguments', async () => {
  primeEnv();
  await assert.rejects(
    () => review.run(['list', 'extra', '--principal-type', 'idea', '--pilot-id', 'p1']),
    /Unexpected argument/,
  );
});

// ── create ────────────────────────────────────────────────────────────

testInCleanEnv('review create dry-run builds correct request', async () => {
  const result = await dryRun([
    'create',
    '--title', '这是一个评审',
    '--pilot-id', '63bb744314bd13c9def24cb4',
    '--principal-type', 'idea',
    '--description', '这是一个评审的描述',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/reviews');
  assert.strictEqual(result.json.title, '这是一个评审');
  assert.strictEqual(result.json.pilot_id, '63bb744314bd13c9def24cb4');
  assert.strictEqual(result.json.principal_type, 'idea');
  assert.strictEqual(result.json.description, '这是一个评审的描述');
});

testInCleanEnv('review create requires title, pilot-id, and principal-type', async () => {
  primeEnv();
  await assert.rejects(() => review.run(['create']), /--title is required/);
  await assert.rejects(() => review.run(['create', '--title', 'T']), /--pilot-id is required/);
  await assert.rejects(
    () => review.run(['create', '--title', 'T', '--pilot-id', 'p1']),
    /--principal-type is required/,
  );
});

// ── get ───────────────────────────────────────────────────────────────

testInCleanEnv('review get dry-run builds correct request', async () => {
  const result = await dryRun([
    'get', '6f168f764eba01a5278b87cd',
    '--principal-type', 'idea',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/reviews/6f168f764eba01a5278b87cd');
  assert.strictEqual(result.params.principal_type, 'idea');
});

testInCleanEnv('review get requires a review id and principal-type', async () => {
  primeEnv();
  await assert.rejects(() => review.run(['get']), /A review id is required/);
  await assert.rejects(
    () => review.run(['get', '6f168f764eba01a5278b87cd']),
    /--principal-type is required/,
  );
});

// ── delete ────────────────────────────────────────────────────────────

testInCleanEnv('review delete dry-run builds correct request', async () => {
  const result = await dryRun([
    'delete', '6f168f764eba01a5278b87cd',
    '--principal-type', 'work_item',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/reviews/6f168f764eba01a5278b87cd');
  assert.strictEqual(result.params.principal_type, 'work_item');
});

// ── principal-add ─────────────────────────────────────────────────────

testInCleanEnv('review principal-add dry-run builds correct request', async () => {
  const result = await dryRun([
    'principal-add', '68ccfe6b3eef8131da564e4a',
    '--principal-id', '63bb744514bd13c9def24ceb',
    '--principal-type', 'idea',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/reviews/68ccfe6b3eef8131da564e4a/principals');
  assert.strictEqual(result.json.principal_id, '63bb744514bd13c9def24ceb');
  assert.strictEqual(result.json.principal_type, 'idea');
});

testInCleanEnv('review principal-add requires principal-id and principal-type', async () => {
  primeEnv();
  await assert.rejects(
    () => review.run(['principal-add', '68ccfe6b3eef8131da564e4a']),
    /--principal-id is required/,
  );
  await assert.rejects(
    () => review.run(['principal-add', '68ccfe6b3eef8131da564e4a', '--principal-id', 'p1']),
    /--principal-type is required/,
  );
});

// ── principal-list ────────────────────────────────────────────────────

testInCleanEnv('review principal-list dry-run builds correct request', async () => {
  const result = await dryRun([
    'principal-list', '68ccfe6b3eef8131da564e4a',
    '--principal-type', 'idea',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/reviews/68ccfe6b3eef8131da564e4a/principals');
  assert.strictEqual(result.params.principal_type, 'idea');
});

// ── principal-get ─────────────────────────────────────────────────────

testInCleanEnv('review principal-get dry-run builds correct request', async () => {
  const result = await dryRun([
    'principal-get', '68ccfe6b3eef8131da564e4a', '63bb744514bd13c9def24ceb',
    '--principal-type', 'idea',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(
    result.path,
    '/v1/reviews/68ccfe6b3eef8131da564e4a/principals/63bb744514bd13c9def24ceb',
  );
  assert.strictEqual(result.params.principal_type, 'idea');
});

testInCleanEnv('review principal-get requires review id and principal id', async () => {
  primeEnv();
  await assert.rejects(
    () => review.run(['principal-get']),
    /A review id and a principal id are required/,
  );
  await assert.rejects(
    () => review.run(['principal-get', '68ccfe6b3eef8131da564e4a']),
    /A review id and a principal id are required/,
  );
  await assert.rejects(
    () => review.run(['principal-get', '68ccfe6b3eef8131da564e4a', '63bb744514bd13c9def24ceb']),
    /--principal-type is required/,
  );
});

testInCleanEnv('review principal-get rejects extra positional arguments', async () => {
  primeEnv();
  await assert.rejects(
    () => review.run([
      'principal-get', '68ccfe6b3eef8131da564e4a', '63bb744514bd13c9def24ceb', 'extra',
      '--principal-type', 'idea',
    ]),
    /Unexpected argument/,
  );
});

// ── principal-remove ──────────────────────────────────────────────────

testInCleanEnv('review principal-remove dry-run builds correct request', async () => {
  const result = await dryRun([
    'principal-remove', '68ccfe6b3eef8131da564e4a', '63bb744514bd13c9def24ceb',
    '--principal-type', 'test_case',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(
    result.path,
    '/v1/reviews/68ccfe6b3eef8131da564e4a/principals/63bb744514bd13c9def24ceb',
  );
  assert.strictEqual(result.params.principal_type, 'test_case');
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('review create rejects unknown option', async () => {
  primeEnv();
  await assert.rejects(
    () => review.run(['create', '--title', 'T', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('review unknown subcommand errors', async () => {
  primeEnv();
  await assert.rejects(() => review.run(['unknown']), /Unknown review subcommand/);
});
