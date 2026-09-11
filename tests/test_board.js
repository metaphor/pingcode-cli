'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const board = require('../scripts/commands/board');
const { clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

// ── Test infrastructure ───────────────────────────────────────────────

const ALL_SUBCOMMANDS = [
  'list', 'create', 'get', 'update', 'delete',
  'entry-list', 'entry-create', 'entry-get', 'entry-update', 'entry-delete',
  'swimlane-list', 'swimlane-create', 'swimlane-get', 'swimlane-update', 'swimlane-delete',
];

const PROJECT_ID = '5eb623f6a70571487ea41919';
const BOARD_ID = '5eb623f6a70571487ea47222';
const ENTRY_ID = '5ab623f6a70571487ea45634';
const SWIMLANE_ID = '5bb623f6a70571487ea44357';

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

async function dryRunOutput(args) {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
  const output = await captureLogAsync(() => board.run([...args, '--dry-run']));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('board --help shows module help', async () => {
  const output = await captureLogAsync(() => board.run(['--help']));
  assert.ok(output.includes('PingCode board'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('delete'));
  assert.ok(output.includes('entry-create'));
  assert.ok(output.includes('swimlane-update'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('board with no args shows module help', async () => {
  const output = await captureLogAsync(() => board.run([]));
  assert.ok(output.includes('PingCode board'));
});

testInCleanEnv('board every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => board.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode board ${sub}`), `missing usage for ${sub}`);
  }
});

// ── Board subcommands ─────────────────────────────────────────────────

testInCleanEnv('board list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['list', PROJECT_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards`);
});

testInCleanEnv('board list requires a project id', async () => {
  await assert.rejects(() => board.run(['list']), /required/);
});

testInCleanEnv('board create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'create', PROJECT_ID,
    '--name', '一个看板',
    '--work-item-types', '["epic","story"]',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards`);
  assert.strictEqual(parsed.json.name, '一个看板');
  assert.deepStrictEqual(parsed.json.work_item_types, ['epic', 'story']);
});

testInCleanEnv('board create requires a project id and a name', async () => {
  await assert.rejects(() => board.run(['create']), /required/);
  await assert.rejects(() => board.run(['create', PROJECT_ID]), /--name is required/);
});

testInCleanEnv('board create rejects non-array work-item-types', async () => {
  await assert.rejects(
    () => board.run(['create', PROJECT_ID, '--name', 'B', '--work-item-types', '"epic"']),
    /--work-item-types must be a JSON array/,
  );
});

testInCleanEnv('board get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['get', PROJECT_ID, BOARD_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}`);
});

testInCleanEnv('board get requires a project id and a board id', async () => {
  await assert.rejects(() => board.run(['get', PROJECT_ID]), /required/);
});

testInCleanEnv('board update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'update', PROJECT_ID, BOARD_ID,
    '--name', 'kanban renamed',
    '--work-item-types', '["bug"]',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}`);
  assert.strictEqual(parsed.json.name, 'kanban renamed');
  assert.deepStrictEqual(parsed.json.work_item_types, ['bug']);
});

testInCleanEnv('board update requires a project id and a board id', async () => {
  await assert.rejects(() => board.run(['update', PROJECT_ID]), /required/);
});

testInCleanEnv('board delete dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['delete', PROJECT_ID, BOARD_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}`);
});

testInCleanEnv('board delete requires a project id and a board id', async () => {
  await assert.rejects(() => board.run(['delete', PROJECT_ID]), /required/);
});

// ── Board entry subcommands ───────────────────────────────────────────

testInCleanEnv('board entry-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['entry-list', PROJECT_ID, BOARD_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/entries`);
});

testInCleanEnv('board entry-list requires a project id and a board id', async () => {
  await assert.rejects(() => board.run(['entry-list', PROJECT_ID]), /required/);
});

testInCleanEnv('board entry-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'entry-create', PROJECT_ID, BOARD_ID,
    '--name', '一个看板栏',
    '--wip-limit', '3',
    '--is-split',
    '--definition-of-done', 'Unit test passed',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/entries`);
  assert.strictEqual(parsed.json.name, '一个看板栏');
  assert.strictEqual(parsed.json.wip_limit, 3);
  assert.strictEqual(parsed.json.is_split, true);
  assert.strictEqual(parsed.json.definition_of_done, 'Unit test passed');
});

testInCleanEnv('board entry-create is-split=false sends explicit false', async () => {
  const parsed = await dryRunOutput([
    'entry-create', PROJECT_ID, BOARD_ID,
    '--name', '需求池',
    '--is-split=false',
  ]);
  assert.strictEqual(parsed.json.is_split, false);
});

testInCleanEnv('board entry-create omits wip-limit and is-split when absent', async () => {
  const parsed = await dryRunOutput(['entry-create', PROJECT_ID, BOARD_ID, '--name', '需求池']);
  assert.strictEqual(parsed.json.name, '需求池');
  assert.ok(!('wip_limit' in parsed.json));
  assert.ok(!('is_split' in parsed.json));
});

testInCleanEnv('board entry-create requires a name and ids', async () => {
  await assert.rejects(() => board.run(['entry-create', PROJECT_ID]), /required/);
  await assert.rejects(
    () => board.run(['entry-create', PROJECT_ID, BOARD_ID]),
    /--name is required/,
  );
});

testInCleanEnv('board entry-create rejects non-numeric wip-limit', async () => {
  await assert.rejects(
    () => board.run(['entry-create', PROJECT_ID, BOARD_ID, '--name', 'E', '--wip-limit', 'many']),
    /--wip-limit must be a number/,
  );
});

testInCleanEnv('board entry-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['entry-get', PROJECT_ID, BOARD_ID, ENTRY_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/entries/${ENTRY_ID}`);
});

testInCleanEnv('board entry-get requires all three ids', async () => {
  await assert.rejects(() => board.run(['entry-get', PROJECT_ID, BOARD_ID]), /required/);
});

testInCleanEnv('board entry-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'entry-update', PROJECT_ID, BOARD_ID, ENTRY_ID,
    '--name', '需求池 renamed',
    '--wip-limit', '5',
    '--is-split=false',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/entries/${ENTRY_ID}`);
  assert.strictEqual(parsed.json.name, '需求池 renamed');
  assert.strictEqual(parsed.json.wip_limit, 5);
  assert.strictEqual(parsed.json.is_split, false);
});

testInCleanEnv('board entry-update requires all three ids', async () => {
  await assert.rejects(() => board.run(['entry-update', PROJECT_ID, BOARD_ID]), /required/);
});

testInCleanEnv('board entry-delete dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['entry-delete', PROJECT_ID, BOARD_ID, ENTRY_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/entries/${ENTRY_ID}`);
});

testInCleanEnv('board entry-delete requires all three ids', async () => {
  await assert.rejects(() => board.run(['entry-delete', PROJECT_ID, BOARD_ID]), /required/);
});

// ── Swimlane subcommands ──────────────────────────────────────────────

testInCleanEnv('board swimlane-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['swimlane-list', PROJECT_ID, BOARD_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/swimlanes`);
});

testInCleanEnv('board swimlane-list requires a project id and a board id', async () => {
  await assert.rejects(() => board.run(['swimlane-list', PROJECT_ID]), /required/);
});

testInCleanEnv('board swimlane-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'swimlane-create', PROJECT_ID, BOARD_ID,
    '--name', '一个泳道',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/swimlanes`);
  assert.strictEqual(parsed.json.name, '一个泳道');
});

testInCleanEnv('board swimlane-create requires a name and ids', async () => {
  await assert.rejects(() => board.run(['swimlane-create', PROJECT_ID]), /required/);
  await assert.rejects(
    () => board.run(['swimlane-create', PROJECT_ID, BOARD_ID]),
    /--name is required/,
  );
});

testInCleanEnv('board swimlane-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['swimlane-get', PROJECT_ID, BOARD_ID, SWIMLANE_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/swimlanes/${SWIMLANE_ID}`);
});

testInCleanEnv('board swimlane-get requires all three ids', async () => {
  await assert.rejects(() => board.run(['swimlane-get', PROJECT_ID, BOARD_ID]), /required/);
});

testInCleanEnv('board swimlane-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'swimlane-update', PROJECT_ID, BOARD_ID, SWIMLANE_ID,
    '--name', '泳道 renamed',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/swimlanes/${SWIMLANE_ID}`);
  assert.strictEqual(parsed.json.name, '泳道 renamed');
});

testInCleanEnv('board swimlane-update requires all three ids', async () => {
  await assert.rejects(() => board.run(['swimlane-update', PROJECT_ID, BOARD_ID]), /required/);
});

testInCleanEnv('board swimlane-delete dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['swimlane-delete', PROJECT_ID, BOARD_ID, SWIMLANE_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/boards/${BOARD_ID}/swimlanes/${SWIMLANE_ID}`);
});

testInCleanEnv('board swimlane-delete requires all three ids', async () => {
  await assert.rejects(() => board.run(['swimlane-delete', PROJECT_ID, BOARD_ID]), /required/);
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('board list rejects unknown option', async () => {
  await assert.rejects(
    () => board.run(['list', PROJECT_ID, '--bogus']),
    /Unknown option/,
  );
});

testInCleanEnv('board unknown subcommand errors', async () => {
  await assert.rejects(
    () => board.run(['unknown']),
    /Unknown board subcommand/,
  );
});
