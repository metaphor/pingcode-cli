'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const sprint = require('../scripts/commands/sprint');
const { clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

// ── Test infrastructure ───────────────────────────────────────────────

const ALL_SUBCOMMANDS = [
  'list', 'create', 'get', 'update', 'bulk-create',
  'section-list', 'section-create', 'section-get', 'section-update', 'section-delete',
  'category-list', 'category-create', 'category-get', 'category-update', 'category-delete',
];

const PROJECT_ID = '5eb623f6a70571487ea47000';
const SPRINT_ID = '5ecf7b74eaab845a2aa53132';
const SECTION_ID = '634f869a0fd987b7ea320833';
const CATEGORY_ID = '676a460a0fd987b7ea320887';

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
  const output = await captureLogAsync(() => sprint.run([...args, '--dry-run']));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('sprint --help shows module help', async () => {
  const output = await captureLogAsync(() => sprint.run(['--help']));
  assert.ok(output.includes('PingCode sprint'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('bulk-create'));
  assert.ok(output.includes('section-create'));
  assert.ok(output.includes('category-delete'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('sprint with no args shows module help', async () => {
  const output = await captureLogAsync(() => sprint.run([]));
  assert.ok(output.includes('PingCode sprint'));
});

testInCleanEnv('sprint every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => sprint.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode sprint ${sub}`), `missing usage for ${sub}`);
  }
});

// ── Sprint subcommands ────────────────────────────────────────────────

testInCleanEnv('sprint list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'list', PROJECT_ID,
    '--status', 'in_progress',
    '--created-between', '100,200',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprints`);
  assert.strictEqual(parsed.params.status, 'in_progress');
  assert.strictEqual(parsed.params.created_between, '100,200');
});

testInCleanEnv('sprint list requires a project id', async () => {
  await assert.rejects(() => sprint.run(['list']), /required/);
});

testInCleanEnv('sprint create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'create', PROJECT_ID,
    '--name', 'Sprint 2',
    '--start-at', '1589791860',
    '--end-at', '1589791860',
    '--assignee-id', 'a0417f68e846aae315c85d24643678a9',
    '--description', 'This is sprint 2',
    '--status', 'pending',
    '--category-ids', `[\"${CATEGORY_ID}\"]`,
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprints`);
  assert.strictEqual(parsed.json.name, 'Sprint 2');
  assert.strictEqual(parsed.json.start_at, 1589791860);
  assert.strictEqual(parsed.json.end_at, 1589791860);
  assert.strictEqual(parsed.json.assignee_id, 'a0417f68e846aae315c85d24643678a9');
  assert.deepStrictEqual(parsed.json.category_ids, [CATEGORY_ID]);
});

testInCleanEnv('sprint create requires name, times, and assignee', async () => {
  await assert.rejects(() => sprint.run(['create', PROJECT_ID]), /--name is required/);
  await assert.rejects(
    () => sprint.run(['create', PROJECT_ID, '--name', 'Sprint 2']),
    /--start-at is required/,
  );
  await assert.rejects(
    () => sprint.run(['create', PROJECT_ID, '--name', 'Sprint 2', '--start-at', '1']),
    /--end-at is required/,
  );
  await assert.rejects(
    () => sprint.run(['create', PROJECT_ID, '--name', 'Sprint 2', '--start-at', '1', '--end-at', '2']),
    /--assignee-id is required/,
  );
});

testInCleanEnv('sprint create rejects non-numeric start-at', async () => {
  await assert.rejects(
    () => sprint.run(['create', PROJECT_ID, '--name', 'S', '--start-at', 'soon', '--end-at', '1', '--assignee-id', 'u']),
    /--start-at must be a number/,
  );
});

testInCleanEnv('sprint create rejects non-array category-ids', async () => {
  await assert.rejects(
    () => sprint.run(['create', PROJECT_ID, '--name', 'S', '--start-at', '1', '--end-at', '2', '--assignee-id', 'u', '--category-ids', '{"a":1}']),
    /--category-ids must be a JSON array/,
  );
});

testInCleanEnv('sprint get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['get', PROJECT_ID, SPRINT_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprints/${SPRINT_ID}`);
});

testInCleanEnv('sprint get requires a project id and a sprint id', async () => {
  await assert.rejects(() => sprint.run(['get', PROJECT_ID]), /A project id and a sprint id are required/);
  await assert.rejects(() => sprint.run(['get']), /required/);
});

testInCleanEnv('sprint update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'update', PROJECT_ID, SPRINT_ID,
    '--name', 'Sprint 2 renamed',
    '--status', 'completed',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprints/${SPRINT_ID}`);
  assert.strictEqual(parsed.json.name, 'Sprint 2 renamed');
  assert.strictEqual(parsed.json.status, 'completed');
});

testInCleanEnv('sprint update requires a project id and a sprint id', async () => {
  await assert.rejects(() => sprint.run(['update', PROJECT_ID]), /required/);
});

testInCleanEnv('sprint bulk-create dry-run builds correct request', async () => {
  const items = [{
    project_id: PROJECT_ID,
    name: 'Sprint 3',
    start_at: 1589791860,
    end_at: 1589791860,
    assignee_id: 'a0417f68e846aae315c85d24643678a9',
  }];
  const parsed = await dryRunOutput(['bulk-create', '--items', JSON.stringify(items)]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/sprints/bulk');
  assert.deepStrictEqual(parsed.json.sprints, items);
});

testInCleanEnv('sprint bulk-create requires items', async () => {
  await assert.rejects(() => sprint.run(['bulk-create']), /--items is required/);
  await assert.rejects(
    () => sprint.run(['bulk-create', '--items', '{"name":"Sprint 3"}']),
    /--items must be a JSON array/,
  );
});

// ── Sprint section subcommands ────────────────────────────────────────

testInCleanEnv('sprint section-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['section-list', PROJECT_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_sections`);
});

testInCleanEnv('sprint section-list requires a project id', async () => {
  await assert.rejects(() => sprint.run(['section-list']), /required/);
});

testInCleanEnv('sprint section-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['section-create', PROJECT_ID, '--name', 'Section 1']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_sections`);
  assert.strictEqual(parsed.json.name, 'Section 1');
});

testInCleanEnv('sprint section-create requires a project id and a name', async () => {
  await assert.rejects(() => sprint.run(['section-create']), /required/);
  await assert.rejects(() => sprint.run(['section-create', PROJECT_ID]), /--name is required/);
});

testInCleanEnv('sprint section-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['section-get', PROJECT_ID, SECTION_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_sections/${SECTION_ID}`);
});

testInCleanEnv('sprint section-get requires a project id and a section id', async () => {
  await assert.rejects(() => sprint.run(['section-get', PROJECT_ID]), /required/);
});

testInCleanEnv('sprint section-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['section-update', PROJECT_ID, SECTION_ID, '--name', 'Section renamed']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_sections/${SECTION_ID}`);
  assert.strictEqual(parsed.json.name, 'Section renamed');
});

testInCleanEnv('sprint section-update requires ids and a name', async () => {
  await assert.rejects(() => sprint.run(['section-update', PROJECT_ID]), /required/);
  await assert.rejects(
    () => sprint.run(['section-update', PROJECT_ID, SECTION_ID]),
    /--name is required/,
  );
});

testInCleanEnv('sprint section-delete dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['section-delete', PROJECT_ID, SECTION_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_sections/${SECTION_ID}`);
});

testInCleanEnv('sprint section-delete requires a project id and a section id', async () => {
  await assert.rejects(() => sprint.run(['section-delete', PROJECT_ID]), /required/);
});

// ── Sprint category subcommands ───────────────────────────────────────

testInCleanEnv('sprint category-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['category-list', PROJECT_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_categories`);
});

testInCleanEnv('sprint category-list requires a project id', async () => {
  await assert.rejects(() => sprint.run(['category-list']), /required/);
});

testInCleanEnv('sprint category-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'category-create', PROJECT_ID,
    '--name', 'Category 1',
    '--section-id', SECTION_ID,
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_categories`);
  assert.strictEqual(parsed.json.name, 'Category 1');
  assert.strictEqual(parsed.json.section_id, SECTION_ID);
});

testInCleanEnv('sprint category-create requires a project id and a name', async () => {
  await assert.rejects(() => sprint.run(['category-create']), /required/);
  await assert.rejects(() => sprint.run(['category-create', PROJECT_ID]), /--name is required/);
});

testInCleanEnv('sprint category-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['category-get', PROJECT_ID, CATEGORY_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_categories/${CATEGORY_ID}`);
});

testInCleanEnv('sprint category-get requires a project id and a category id', async () => {
  await assert.rejects(() => sprint.run(['category-get', PROJECT_ID]), /required/);
});

testInCleanEnv('sprint category-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'category-update', PROJECT_ID, CATEGORY_ID,
    '--name', 'Category 2',
    '--section-id', SECTION_ID,
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_categories/${CATEGORY_ID}`);
  assert.strictEqual(parsed.json.name, 'Category 2');
  assert.strictEqual(parsed.json.section_id, SECTION_ID);
});

testInCleanEnv('sprint category-update requires a project id and a category id', async () => {
  await assert.rejects(() => sprint.run(['category-update', PROJECT_ID]), /required/);
});

testInCleanEnv('sprint category-delete dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['category-delete', PROJECT_ID, CATEGORY_ID]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/sprint_categories/${CATEGORY_ID}`);
});

testInCleanEnv('sprint category-delete requires a project id and a category id', async () => {
  await assert.rejects(() => sprint.run(['category-delete', PROJECT_ID]), /required/);
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('sprint list rejects unknown option', async () => {
  await assert.rejects(
    () => sprint.run(['list', PROJECT_ID, '--bogus']),
    /Unknown option/,
  );
});

testInCleanEnv('sprint unknown subcommand errors', async () => {
  await assert.rejects(
    () => sprint.run(['unknown']),
    /Unknown sprint subcommand/,
  );
});
