'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const version = require('../scripts/commands/version');
const { tmpFile, clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

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
  const output = await captureLogAsync(() => version.run(argv));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('version --help shows module help', async () => {
  const output = await captureLogAsync(() => version.run(['--help']));
  assert.ok(output.includes('PingCode version'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('bulk-create'));
  assert.ok(output.includes('stage-list'));
  assert.ok(output.includes('section-list'));
  assert.ok(output.includes('category-list'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('version with no args shows module help', async () => {
  const output = await captureLogAsync(() => version.run([]));
  assert.ok(output.includes('PingCode version'));
});

// ── Subcommand help ───────────────────────────────────────────────────

const ALL_SUBCOMMANDS = [
  'list', 'create', 'get', 'update', 'delete', 'bulk-create',
  'stage-list', 'stage-create', 'stage-get', 'stage-update', 'stage-delete',
  'section-list', 'section-create', 'section-get', 'section-update', 'section-delete',
  'category-list', 'category-create', 'category-get', 'category-update', 'category-delete',
];

testInCleanEnv('every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => version.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode version ${sub}`),
      `expected usage for ${sub}, got: ${output}`,
    );
  }
});

// ── list ──────────────────────────────────────────────────────────────

testInCleanEnv('version list dry-run builds correct request', async () => {
  const result = await dryRun([
    'list', 'proj-1',
    '--name', '1.0.0',
    '--status', 'published',
    '--created-between', '1704067200,1706745600',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/versions');
  assert.strictEqual(result.params.name, '1.0.0');
  assert.strictEqual(result.params.status, 'published');
  assert.strictEqual(result.params.created_between, '1704067200,1706745600');
  assert.strictEqual('updated_between' in result.params, false);
});

testInCleanEnv('version list requires a project id', async () => {
  await assert.rejects(() => version.run(['list']), /A project id is required/);
});

testInCleanEnv('version list rejects extra positional arguments', async () => {
  await assert.rejects(
    () => version.run(['list', 'p1', 'p2']),
    /Unexpected argument/,
  );
});

testInCleanEnv('version list rejects invalid status', async () => {
  await assert.rejects(
    () => version.run(['list', 'p1', '--status', 'done']),
    /--status must be one of: pending, in_progress, published/,
  );
});

// ── create ────────────────────────────────────────────────────────────

testInCleanEnv('version create dry-run builds correct request', async () => {
  const result = await dryRun([
    'create', 'proj-1',
    '--name', '1.0.0',
    '--start-at', '1704067200',
    '--end-at', '1706745600',
    '--assignee-id', 'user-1',
    '--stage-id', 'stage-1',
    '--category-ids', 'cat-1, cat-2',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/versions');
  assert.strictEqual(result.json.name, '1.0.0');
  assert.strictEqual(result.json.start_at, 1704067200);
  assert.strictEqual(result.json.end_at, 1706745600);
  assert.strictEqual(result.json.assignee_id, 'user-1');
  assert.strictEqual(result.json.stage_id, 'stage-1');
  assert.deepStrictEqual(result.json.category_ids, ['cat-1', 'cat-2']);
});

testInCleanEnv('version create accepts ISO dates for timestamps', async () => {
  const result = await dryRun([
    'create', 'proj-1',
    '--name', '1.0.0',
    '--start-at', '2024-01-16T00:00:00Z',
    '--end-at', '1706745600',
    '--assignee-id', 'user-1',
    '--dry-run',
  ]);
  assert.strictEqual(result.json.start_at, 1705363200);
});

testInCleanEnv('version create requires a project id', async () => {
  await assert.rejects(
    () => version.run(['create', '--name', '1.0.0']),
    /A project id is required/,
  );
});

testInCleanEnv('version create requires name, times and assignee', async () => {
  await assert.rejects(
    () => version.run(['create', 'p1', '--start-at', '1', '--end-at', '2', '--assignee-id', 'u1']),
    /--name is required/,
  );
  await assert.rejects(
    () => version.run(['create', 'p1', '--name', '1.0.0', '--end-at', '2', '--assignee-id', 'u1']),
    /--start-at is required/,
  );
  await assert.rejects(
    () => version.run(['create', 'p1', '--name', '1.0.0', '--start-at', '1', '--assignee-id', 'u1']),
    /--end-at is required/,
  );
  await assert.rejects(
    () => version.run(['create', 'p1', '--name', '1.0.0', '--start-at', '1', '--end-at', '2']),
    /--assignee-id is required/,
  );
});

testInCleanEnv('version create rejects invalid timestamp', async () => {
  await assert.rejects(
    () => version.run(['create', 'p1', '--name', '1.0.0', '--start-at', 'not-a-date', '--end-at', '2', '--assignee-id', 'u1']),
    /--start-at must be a Unix timestamp or ISO date string/,
  );
});

testInCleanEnv('version create requires value for --name', async () => {
  await assert.rejects(
    () => version.run(['create', 'p1', '--name']),
    /Flag --name requires a value/,
  );
});

// ── get ───────────────────────────────────────────────────────────────

testInCleanEnv('version get dry-run builds correct request', async () => {
  const result = await dryRun(['get', 'proj-1', 'ver-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/versions/ver-1');
});

testInCleanEnv('version get requires project and version ids', async () => {
  await assert.rejects(() => version.run(['get', 'p1']), /A project id and a version id are required/);
  await assert.rejects(() => version.run(['get']), /A project id and a version id are required/);
});

testInCleanEnv('version get rejects extra positional arguments', async () => {
  await assert.rejects(
    () => version.run(['get', 'p1', 'v1', 'v2']),
    /Unexpected argument/,
  );
});

// ── update ────────────────────────────────────────────────────────────

testInCleanEnv('version update dry-run builds correct request', async () => {
  const result = await dryRun([
    'update', 'proj-1', 'ver-1',
    '--name', '2.0.0',
    '--stage-id', 'stage-2',
    '--operate-at', '1706745600',
    '--category-ids', 'cat-9',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/versions/ver-1');
  assert.strictEqual(result.json.name, '2.0.0');
  assert.strictEqual(result.json.stage_id, 'stage-2');
  assert.strictEqual(result.json.operate_at, 1706745600);
  assert.deepStrictEqual(result.json.category_ids, ['cat-9']);
  assert.strictEqual('start_at' in result.json, false);
});

testInCleanEnv('version update requires project and version ids', async () => {
  await assert.rejects(
    () => version.run(['update', 'p1', '--name', 'x']),
    /A project id and a version id are required/,
  );
});

testInCleanEnv('version update requires at least one field', async () => {
  await assert.rejects(
    () => version.run(['update', 'p1', 'v1']),
    /At least one field to update is required/,
  );
});

// ── delete ────────────────────────────────────────────────────────────

testInCleanEnv('version delete dry-run builds correct request', async () => {
  const result = await dryRun(['delete', 'proj-1', 'ver-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/versions/ver-1');
});

testInCleanEnv('version delete requires project and version ids', async () => {
  await assert.rejects(() => version.run(['delete', 'p1']), /A project id and a version id are required/);
});

// ── bulk-create ───────────────────────────────────────────────────────

testInCleanEnv('version bulk-create dry-run builds correct request', async () => {
  const items = [
    { project_id: 'p1', name: '1.0.0', start_at: 1704067200, end_at: 1706745600, assignee_id: 'u1' },
    { project_id: 'p1', name: '2.0.0', start_at: 1706745600, end_at: 1709251200, assignee_id: 'u2', stage_id: 's1', category_ids: ['c1'] },
  ];
  const result = await dryRun([
    'bulk-create',
    '--items', JSON.stringify(items),
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/pjm/versions/bulk');
  assert.deepStrictEqual(result.json.versions, items);
});

testInCleanEnv('version bulk-create requires --items', async () => {
  await assert.rejects(
    () => version.run(['bulk-create']),
    /--items is required/,
  );
});

testInCleanEnv('version bulk-create rejects non-array items', async () => {
  await assert.rejects(
    () => version.run(['bulk-create', '--items', '{"name":"1.0.0"}']),
    /--items must be a JSON array/,
  );
});

testInCleanEnv('version bulk-create rejects more than 100 items', async () => {
  const items = [];
  for (let i = 0; i < 101; i++) {
    items.push({ project_id: 'p1', name: `v${i}`, start_at: 1, end_at: 2, assignee_id: 'u1' });
  }
  await assert.rejects(
    () => version.run(['bulk-create', '--items', JSON.stringify(items)]),
    /--items must contain at most 100 versions/,
  );
});

// ── stage subcommands ─────────────────────────────────────────────────

testInCleanEnv('version stage-list dry-run builds correct request', async () => {
  const result = await dryRun(['stage-list', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/stages');
  assert.deepStrictEqual(result.params, {});
});

testInCleanEnv('version stage-create dry-run builds correct request', async () => {
  const result = await dryRun(['stage-create', '--name', '开发中', '--type', 'in_progress', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/pjm/stages');
  assert.strictEqual(result.json.name, '开发中');
  assert.strictEqual(result.json.type, 'in_progress');
});

testInCleanEnv('version stage-create requires name and type', async () => {
  await assert.rejects(
    () => version.run(['stage-create', '--type', 'pending']),
    /--name is required/,
  );
  await assert.rejects(
    () => version.run(['stage-create', '--name', '未开始']),
    /--type is required/,
  );
  await assert.rejects(
    () => version.run(['stage-create', '--name', '未开始', '--type', 'done']),
    /--type must be one of: pending, in_progress, published/,
  );
});

testInCleanEnv('version stage-get dry-run builds correct request', async () => {
  const result = await dryRun(['stage-get', 'stage-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/stages/stage-1');
});

testInCleanEnv('version stage-get requires a stage id', async () => {
  await assert.rejects(() => version.run(['stage-get']), /A stage id is required/);
  await assert.rejects(
    () => version.run(['stage-get', 's1', 's2']),
    /Unexpected argument/,
  );
});

testInCleanEnv('version stage-update dry-run builds correct request', async () => {
  const result = await dryRun(['stage-update', 'stage-1', '--type', 'published', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/pjm/stages/stage-1');
  assert.strictEqual(result.json.type, 'published');
  assert.strictEqual('name' in result.json, false);
});

testInCleanEnv('version stage-update requires a stage id and a field', async () => {
  await assert.rejects(() => version.run(['stage-update']), /A stage id is required/);
  await assert.rejects(
    () => version.run(['stage-update', 's1']),
    /At least one field to update is required/,
  );
});

testInCleanEnv('version stage-delete dry-run builds correct request', async () => {
  const result = await dryRun(['stage-delete', 'stage-1', '--replace-id', 'stage-2', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/pjm/stages/stage-1');
  assert.strictEqual(result.params.replace_id, 'stage-2');
});

testInCleanEnv('version stage-delete without replace-id omits params', async () => {
  const result = await dryRun(['stage-delete', 'stage-1', '--dry-run']);
  assert.strictEqual(result.method, 'DELETE');
  assert.deepStrictEqual(result.params, {});
});

testInCleanEnv('version stage-delete requires a stage id', async () => {
  await assert.rejects(() => version.run(['stage-delete']), /A stage id is required/);
});

// ── section subcommands ───────────────────────────────────────────────

testInCleanEnv('version section-list dry-run builds correct request', async () => {
  const result = await dryRun(['section-list', 'proj-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_sections');
});

testInCleanEnv('version section-list requires a project id', async () => {
  await assert.rejects(() => version.run(['section-list']), /A project id is required/);
});

testInCleanEnv('version section-create dry-run builds correct request', async () => {
  const result = await dryRun([
    'section-create', 'proj-1',
    '--name', '私有部署',
    '--description', '私有部署发布分组',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_sections');
  assert.strictEqual(result.json.name, '私有部署');
  assert.strictEqual(result.json.description, '私有部署发布分组');
});

testInCleanEnv('version section-create requires a project id and name', async () => {
  await assert.rejects(() => version.run(['section-create']), /A project id is required/);
  await assert.rejects(
    () => version.run(['section-create', 'p1']),
    /--name is required/,
  );
});

testInCleanEnv('version section-get dry-run builds correct request', async () => {
  const result = await dryRun(['section-get', 'proj-1', 'sec-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_sections/sec-1');
});

testInCleanEnv('version section-get requires project and section ids', async () => {
  await assert.rejects(
    () => version.run(['section-get', 'p1']),
    /A project id and a section id are required/,
  );
});

testInCleanEnv('version section-update dry-run builds correct request', async () => {
  const result = await dryRun([
    'section-update', 'proj-1', 'sec-1',
    '--name', '私有部署',
    '--description', '新描述',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_sections/sec-1');
  assert.strictEqual(result.json.name, '私有部署');
  assert.strictEqual(result.json.description, '新描述');
});

testInCleanEnv('version section-update requires project/section ids and name', async () => {
  await assert.rejects(
    () => version.run(['section-update', 'p1']),
    /A project id and a section id are required/,
  );
  await assert.rejects(
    () => version.run(['section-update', 'p1', 's1', '--description', 'd']),
    /--name is required/,
  );
});

testInCleanEnv('version section-delete dry-run builds correct request', async () => {
  const result = await dryRun(['section-delete', 'proj-1', 'sec-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_sections/sec-1');
});

testInCleanEnv('version section-delete requires project and section ids', async () => {
  await assert.rejects(
    () => version.run(['section-delete', 'p1']),
    /A project id and a section id are required/,
  );
});

// ── category subcommands ──────────────────────────────────────────────

testInCleanEnv('version category-list dry-run builds correct request', async () => {
  const result = await dryRun(['category-list', 'proj-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_categories');
});

testInCleanEnv('version category-list requires a project id', async () => {
  await assert.rejects(() => version.run(['category-list']), /A project id is required/);
});

testInCleanEnv('version category-create dry-run builds correct request', async () => {
  const result = await dryRun([
    'category-create', 'proj-1',
    '--name', '私有部署发布',
    '--section-id', 'sec-1',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_categories');
  assert.strictEqual(result.json.name, '私有部署发布');
  assert.strictEqual(result.json.section_id, 'sec-1');
});

testInCleanEnv('version category-create without section omits section_id', async () => {
  const result = await dryRun(['category-create', 'proj-1', '--name', '开源版', '--dry-run']);
  assert.strictEqual('section_id' in result.json, false);
});

testInCleanEnv('version category-create requires a project id and name', async () => {
  await assert.rejects(() => version.run(['category-create']), /A project id is required/);
  await assert.rejects(
    () => version.run(['category-create', 'p1']),
    /--name is required/,
  );
});

testInCleanEnv('version category-get dry-run builds correct request', async () => {
  const result = await dryRun(['category-get', 'proj-1', 'cat-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_categories/cat-1');
});

testInCleanEnv('version category-get requires project and category ids', async () => {
  await assert.rejects(
    () => version.run(['category-get', 'p1']),
    /A project id and a category id are required/,
  );
});

testInCleanEnv('version category-update dry-run builds correct request', async () => {
  const result = await dryRun([
    'category-update', 'proj-1', 'cat-1',
    '--section-id', 'sec-2',
    '--dry-run',
  ]);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_categories/cat-1');
  assert.strictEqual(result.json.section_id, 'sec-2');
  assert.strictEqual('name' in result.json, false);
});

testInCleanEnv('version category-update requires project/category ids and a field', async () => {
  await assert.rejects(
    () => version.run(['category-update', 'p1']),
    /A project id and a category id are required/,
  );
  await assert.rejects(
    () => version.run(['category-update', 'p1', 'c1']),
    /At least one field to update is required/,
  );
});

testInCleanEnv('version category-delete dry-run builds correct request', async () => {
  const result = await dryRun(['category-delete', 'proj-1', 'cat-1', '--dry-run']);
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/pjm/projects/proj-1/version_categories/cat-1');
});

testInCleanEnv('version category-delete requires project and category ids', async () => {
  await assert.rejects(
    () => version.run(['category-delete', 'p1']),
    /A project id and a category id are required/,
  );
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('version list rejects unknown option', async () => {
  await assert.rejects(
    () => version.run(['list', 'p1', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('version stage-create rejects unknown option', async () => {
  await assert.rejects(
    () => version.run(['stage-create', '--name', 'x', '--type', 'pending', '--color', 'red']),
    /Unknown option/,
  );
});

testInCleanEnv('version unknown subcommand errors', async () => {
  await assert.rejects(
    () => version.run(['unknown']),
    /Unknown version subcommand/,
  );
});
