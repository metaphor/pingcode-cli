'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const testhub = require('../scripts/commands/testhub');
const { tmpFile, clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

// ── Test infrastructure ───────────────────────────────────────────────

const ALL_SUBCOMMANDS = [
  'library-list', 'library-create', 'library-get', 'library-update',
  'case-list', 'case-create', 'case-get', 'case-update', 'case-delete',
  'case-bulk-create', 'case-bulk-update', 'case-search', 'case-histories',
  'plan-list', 'plan-create', 'plan-get', 'plan-update',
  'run-list', 'run-create', 'run-get', 'run-update',
  'run-bulk-create', 'run-bulk-update', 'run-search', 'run-histories', 'run-history',
  'case-states', 'case-state-get',
  'case-types', 'case-type-get',
  'case-important-levels', 'case-important-level-get',
  'plan-states', 'plan-state-get',
  'run-statuses', 'run-status-get',
  'case-property-list', 'case-property-create', 'case-property-get', 'case-property-update',
  'case-property-plan-list', 'case-property-plan-get',
  'case-property-plan-property-add', 'case-property-plan-property-get',
  'case-property-plan-property-list', 'case-property-plan-property-remove',
  'library-member-add', 'library-member-get', 'library-member-list',
  'library-member-update', 'library-member-remove',
  'suite-add', 'suite-get', 'suite-list', 'suite-update', 'suite-delete',
  'plan-type-list', 'plan-type-get',
];

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

function captureLog(fn) {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return output;
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
  const output = await captureLogAsync(() => testhub.run([...args, '--dry-run']));
  return JSON.parse(output);
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('testhub --help shows module help', async () => {
  const output = await captureLogAsync(() => testhub.run(['--help']));
  assert.ok(output.includes('PingCode testhub'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('library-list'));
  assert.ok(output.includes('case-search'));
  assert.ok(output.includes('plan-create'));
  assert.ok(output.includes('run-history'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('testhub with no args shows module help', async () => {
  const output = await captureLogAsync(() => testhub.run([]));
  assert.ok(output.includes('PingCode testhub'));
});

testInCleanEnv('testhub every subcommand --help shows usage', async () => {
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => testhub.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode testhub ${sub}`), `missing usage for ${sub}`);
  }
});

// ── Library subcommands ───────────────────────────────────────────────

testInCleanEnv('testhub library-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'library-list',
    '--keywords', '核心',
    '--scope-type', 'user_group',
    '--include-deleted',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries');
  assert.strictEqual(parsed.params.keywords, '核心');
  assert.strictEqual(parsed.params.scope_type, 'user_group');
  assert.strictEqual(parsed.params.include_deleted, true);
});

testInCleanEnv('testhub library-list rejects unknown option', async () => {
  await assert.rejects(
    () => testhub.run(['library-list', '--bogus']),
    /Unknown option/,
  );
});

testInCleanEnv('testhub library-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'library-create',
    '--name', '测试库',
    '--identifier', 'CSK',
    '--visibility', 'private',
    '--description', '这是一个测试库',
    '--members', '[{"id":"a0417f68e846aae315c85d24643678a9","type":"user"}]',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries');
  assert.strictEqual(parsed.json.name, '测试库');
  assert.strictEqual(parsed.json.identifier, 'CSK');
  assert.strictEqual(parsed.json.visibility, 'private');
  assert.deepStrictEqual(parsed.json.members, [{ id: 'a0417f68e846aae315c85d24643678a9', type: 'user' }]);
});

testInCleanEnv('testhub library-create requires name and identifier', async () => {
  await assert.rejects(
    () => testhub.run(['library-create', '--identifier', 'CSK']),
    /--name is required/,
  );
  await assert.rejects(
    () => testhub.run(['library-create', '--name', '测试库']),
    /--identifier is required/,
  );
});

testInCleanEnv('testhub library-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['library-get', '5eb623f6a70571487ea47000']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000');
});

testInCleanEnv('testhub library-get requires a library id', async () => {
  await assert.rejects(
    () => testhub.run(['library-get']),
    /A library id is required/,
  );
});

testInCleanEnv('testhub library-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'library-update', '5eb623f6a70571487ea47000',
    '--name', '新名称',
    '--description', '新描述',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000');
  assert.strictEqual(parsed.json.name, '新名称');
  assert.strictEqual(parsed.json.description, '新描述');
});

testInCleanEnv('testhub library-update requires a library id', async () => {
  await assert.rejects(
    () => testhub.run(['library-update', '--name', '新名称']),
    /A library id is required/,
  );
});


// ── Case subcommands ──────────────────────────────────────────────────

testInCleanEnv('testhub case-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'case-list',
    '--library-id', '5eb623f6a70571487ea47000',
    '--keywords', '登录',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/cases');
  assert.strictEqual(parsed.params.library_id, '5eb623f6a70571487ea47000');
  assert.strictEqual(parsed.params.keywords, '登录');
});

testInCleanEnv('testhub case-list rejects unknown option', async () => {
  await assert.rejects(
    () => testhub.run(['case-list', '--bogus']),
    /Unknown option/,
  );
});

testInCleanEnv('testhub case-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'case-create',
    '--library-id', '5eb623f6a70571487ea47000',
    '--title', '这是一个测试用例',
    '--suite-id', '55714870a70ea4eb623f6700',
    '--participant-ids', 'user-a, user-b',
    '--properties', '{"prop_a":"v"}',
    '--steps', '[{"description":"步骤一","is_group":true}]',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/cases');
  assert.strictEqual(parsed.json.test_library_id, '5eb623f6a70571487ea47000');
  assert.strictEqual(parsed.json.title, '这是一个测试用例');
  assert.strictEqual(parsed.json.suite_id, '55714870a70ea4eb623f6700');
  assert.deepStrictEqual(parsed.json.participant_ids, ['user-a', 'user-b']);
  assert.deepStrictEqual(parsed.json.properties, { prop_a: 'v' });
  assert.deepStrictEqual(parsed.json.steps, [{ description: '步骤一', is_group: true }]);
});

testInCleanEnv('testhub case-create requires library id and title', async () => {
  await assert.rejects(
    () => testhub.run(['case-create', '--title', '标题']),
    /--library-id is required/,
  );
  await assert.rejects(
    () => testhub.run(['case-create', '--library-id', '5eb623f6a70571487ea47000']),
    /--title is required/,
  );
});

testInCleanEnv('testhub case-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-get', '5edca524cad2fa112b06305c']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/cases/5edca524cad2fa112b06305c');
});

testInCleanEnv('testhub case-get requires a case id', async () => {
  await assert.rejects(
    () => testhub.run(['case-get']),
    /A case id is required/,
  );
});

testInCleanEnv('testhub case-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'case-update', '5edca524cad2fa112b06305c',
    '--title', '新标题',
    '--state-id', '686f62038668bbae4f4dd0c1',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/testhub/cases/5edca524cad2fa112b06305c');
  assert.strictEqual(parsed.json.title, '新标题');
  assert.strictEqual(parsed.json.state_id, '686f62038668bbae4f4dd0c1');
});

testInCleanEnv('testhub case-update requires a case id', async () => {
  await assert.rejects(
    () => testhub.run(['case-update', '--title', '新标题']),
    /A case id is required/,
  );
});

testInCleanEnv('testhub case-delete dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-delete', '5edca524cad2fa112b06305c']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/testhub/cases/5edca524cad2fa112b06305c');
});

testInCleanEnv('testhub case-delete requires a case id', async () => {
  await assert.rejects(
    () => testhub.run(['case-delete']),
    /A case id is required/,
  );
});

testInCleanEnv('testhub case-bulk-create dry-run builds correct request', async () => {
  const items = [
    { test_library_id: '5eb623f6a70571487ea47000', title: '用例一' },
    { test_library_id: '5eb623f6a70571487ea47000', title: '用例二' },
  ];
  const parsed = await dryRunOutput(['case-bulk-create', '--items', JSON.stringify(items)]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/cases/bulk');
  assert.deepStrictEqual(parsed.json.cases, items);
});

testInCleanEnv('testhub case-bulk-create requires items JSON array', async () => {
  await assert.rejects(
    () => testhub.run(['case-bulk-create']),
    /--items is required/,
  );
  await assert.rejects(
    () => testhub.run(['case-bulk-create', '--items', '{"title":"x"}']),
    /--items must be a JSON array/,
  );
});

testInCleanEnv('testhub case-bulk-update dry-run builds correct request', async () => {
  const items = [{ case_id: '5edca524cad2fa112b06305c', title: '新标题' }];
  const parsed = await dryRunOutput(['case-bulk-update', '--items', JSON.stringify(items)]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/testhub/cases/bulk');
  assert.deepStrictEqual(parsed.json.cases, items);
});

testInCleanEnv('testhub case-bulk-update requires items JSON array', async () => {
  await assert.rejects(
    () => testhub.run(['case-bulk-update']),
    /--items is required/,
  );
});

testInCleanEnv('testhub case-search dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'case-search',
    '--filter', '{"title":{"contains":"登录"}}',
    '--keywords', 'CSK',
    '--limit', '10',
    '--page-index', '2',
    '--include-deleted',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/cases/search');
  assert.strictEqual(parsed.json.mode, 'query');
  assert.deepStrictEqual(parsed.json.payload.filter, { title: { contains: '登录' } });
  assert.strictEqual(parsed.json.payload.keywords, 'CSK');
  assert.strictEqual(parsed.json.payload.page_size, 10);
  assert.strictEqual(parsed.json.payload.page_index, 2);
  assert.strictEqual(parsed.json.payload.include_deleted, true);
});

testInCleanEnv('testhub case-search rejects invalid limit', async () => {
  await assert.rejects(
    () => testhub.run(['case-search', '--limit', '500']),
    /--limit must be a number between 1 and 100/,
  );
});

testInCleanEnv('testhub case-histories dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-histories', '5edca524cad2fa112b06305c']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/cases/5edca524cad2fa112b06305c/histories');
});

testInCleanEnv('testhub case-histories requires a case id', async () => {
  await assert.rejects(
    () => testhub.run(['case-histories']),
    /A case id is required/,
  );
});

// ── Plan subcommands ──────────────────────────────────────────────────

testInCleanEnv('testhub plan-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'plan-list', '5eb623f6a70571487ea47000',
    '--name', '测试计划',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/plans');
  assert.strictEqual(parsed.params.name, '测试计划');
});

testInCleanEnv('testhub plan-list requires a library id', async () => {
  await assert.rejects(
    () => testhub.run(['plan-list', '--name', '测试计划']),
    /A library id is required/,
  );
});

testInCleanEnv('testhub plan-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'plan-create', '5eb623f6a70571487ea47000',
    '--name', '测试计划',
    '--type-id', '641d0ab2b998f883f9c67b2f',
    '--start-at', '1589791860',
    '--end-at', '1589791870',
    '--assignee-id', 'a0417f68e846aae315c85d24643678a9',
    '--version-id', '641d0ab2b998f883f9c67b2c',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/plans');
  assert.strictEqual(parsed.json.name, '测试计划');
  assert.strictEqual(parsed.json.type_id, '641d0ab2b998f883f9c67b2f');
  assert.strictEqual(parsed.json.start_at, 1589791860);
  assert.strictEqual(parsed.json.end_at, 1589791870);
  assert.strictEqual(parsed.json.assignee_id, 'a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.json.version_id, '641d0ab2b998f883f9c67b2c');
});

testInCleanEnv('testhub plan-create requires required fields', async () => {
  await assert.rejects(
    () => testhub.run(['plan-create', '5eb623f6a70571487ea47000']),
    /--name is required/,
  );
  await assert.rejects(
    () => testhub.run(['plan-create', '5eb623f6a70571487ea47000', '--name', '计划']),
    /--type-id is required/,
  );
  await assert.rejects(
    () => testhub.run(['plan-create', '5eb623f6a70571487ea47000', '--name', '计划', '--type-id', 't']),
    /--start-at is required/,
  );
  await assert.rejects(
    () => testhub.run(['plan-create', '5eb623f6a70571487ea47000', '--name', '计划', '--type-id', 't', '--start-at', '1']),
    /--end-at is required/,
  );
  await assert.rejects(
    () => testhub.run(['plan-create', '5eb623f6a70571487ea47000', '--name', '计划', '--type-id', 't', '--start-at', '1', '--end-at', '2']),
    /--assignee-id is required/,
  );
});

testInCleanEnv('testhub plan-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['plan-get', '5eb623f6a70571487ea47000', '5eb6a70571487623fea47000']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000');
});

testInCleanEnv('testhub plan-get requires library and plan ids', async () => {
  await assert.rejects(
    () => testhub.run(['plan-get']),
    /A library id and plan id are required/,
  );
  await assert.rejects(
    () => testhub.run(['plan-get', '5eb623f6a70571487ea47000']),
    /A library id and plan id are required/,
  );
});

testInCleanEnv('testhub plan-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'plan-update', '5eb623f6a70571487ea47000', '5eb6a70571487623fea47000',
    '--name', '新计划名',
    '--end-at', '1589791999',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000');
  assert.strictEqual(parsed.json.name, '新计划名');
  assert.strictEqual(parsed.json.end_at, 1589791999);
});

testInCleanEnv('testhub plan-update requires library and plan ids', async () => {
  await assert.rejects(
    () => testhub.run(['plan-update', '5eb623f6a70571487ea47000']),
    /A library id and plan id are required/,
  );
});


// ── Run subcommands ───────────────────────────────────────────────────

testInCleanEnv('testhub run-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'run-list',
    '--plan-id', '5eb6a70571487623fea47000',
    '--status-id', '65115f0939286e26e05a66db',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/runs');
  assert.strictEqual(parsed.params.plan_id, '5eb6a70571487623fea47000');
  assert.strictEqual(parsed.params.status_id, '65115f0939286e26e05a66db');
});

testInCleanEnv('testhub run-list rejects unknown option', async () => {
  await assert.rejects(
    () => testhub.run(['run-list', '--bogus']),
    /Unknown option/,
  );
});

testInCleanEnv('testhub run-create dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'run-create',
    '--library-id', '5eb623f6a70571487ea47000',
    '--plan-id', '5eb6a70571487623fea47000',
    '--case-id', '5edca524cad2fa112b06305c',
    '--executor-id', 'a0417f68e846aae315c85d24643678a9',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/runs');
  assert.strictEqual(parsed.json.library_id, '5eb623f6a70571487ea47000');
  assert.strictEqual(parsed.json.plan_id, '5eb6a70571487623fea47000');
  assert.strictEqual(parsed.json.case_id, '5edca524cad2fa112b06305c');
  assert.strictEqual(parsed.json.executor_id, 'a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('testhub run-create requires library, plan and case ids', async () => {
  await assert.rejects(
    () => testhub.run(['run-create']),
    /--library-id is required/,
  );
  await assert.rejects(
    () => testhub.run(['run-create', '--library-id', '5eb623f6a70571487ea47000']),
    /--plan-id is required/,
  );
  await assert.rejects(
    () => testhub.run(['run-create', '--library-id', '5eb623f6a70571487ea47000', '--plan-id', 'p']),
    /--case-id is required/,
  );
});

testInCleanEnv('testhub run-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['run-get', '547000eb6a70571487623fea']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/runs/547000eb6a70571487623fea');
});

testInCleanEnv('testhub run-get requires a run id', async () => {
  await assert.rejects(
    () => testhub.run(['run-get']),
    /A run id is required/,
  );
});

testInCleanEnv('testhub run-update dry-run builds correct request', async () => {
  const steps = [{ step_id: '524cad5edb06305cca2fa112', status_id: 's1', actual_value: 'ok' }];
  const parsed = await dryRunOutput([
    'run-update', '547000eb6a70571487623fea',
    '--status-id', '65115f0939286e26e05a66db',
    '--remark', '通过',
    '--steps', JSON.stringify(steps),
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/testhub/runs/547000eb6a70571487623fea');
  assert.strictEqual(parsed.json.status_id, '65115f0939286e26e05a66db');
  assert.strictEqual(parsed.json.remark, '通过');
  assert.deepStrictEqual(parsed.json.steps, steps);
});

testInCleanEnv('testhub run-update requires a run id and status id', async () => {
  await assert.rejects(
    () => testhub.run(['run-update']),
    /A run id is required/,
  );
  await assert.rejects(
    () => testhub.run(['run-update', '547000eb6a70571487623fea']),
    /--status-id is required/,
  );
});


testInCleanEnv('testhub run-bulk-create dry-run builds correct request', async () => {
  const items = [
    { library_id: '5eb623f6a70571487ea47000', plan_id: '5eb6a70571487623fea47000', case_id: '5edca524cad2fa112b06305c' },
  ];
  const parsed = await dryRunOutput(['run-bulk-create', '--items', JSON.stringify(items)]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/runs/bulk');
  assert.deepStrictEqual(parsed.json.runs, items);
});

testInCleanEnv('testhub run-bulk-create requires items JSON array', async () => {
  await assert.rejects(
    () => testhub.run(['run-bulk-create']),
    /--items is required/,
  );
});

testInCleanEnv('testhub run-bulk-update dry-run builds correct request', async () => {
  const items = [{ run_id: '547000eb6a70571487623fea', status_id: '65115f0939286e26e05a66db' }];
  const parsed = await dryRunOutput(['run-bulk-update', '--items', JSON.stringify(items)]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/testhub/runs/bulk');
  assert.deepStrictEqual(parsed.json.runs, items);
});

testInCleanEnv('testhub run-bulk-update requires items JSON array', async () => {
  await assert.rejects(
    () => testhub.run(['run-bulk-update']),
    /--items is required/,
  );
});

testInCleanEnv('testhub run-search dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'run-search',
    '--filter', '{"plan.id":{"in":["5eb6a70571487623fea47000"]}}',
    '--keywords', '登录',
    '--limit', '20',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/runs/search');
  assert.strictEqual(parsed.json.mode, 'query');
  assert.deepStrictEqual(parsed.json.payload.filter, { 'plan.id': { in: ['5eb6a70571487623fea47000'] } });
  assert.strictEqual(parsed.json.payload.keywords, '登录');
  assert.strictEqual(parsed.json.payload.page_size, 20);
});

testInCleanEnv('testhub run-search rejects invalid page index', async () => {
  await assert.rejects(
    () => testhub.run(['run-search', '--page-index', '-1']),
    /--page-index must be a non-negative number/,
  );
});

testInCleanEnv('testhub run-histories dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['run-histories', '547000eb6a70571487623fea']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/runs/547000eb6a70571487623fea/histories');
});

testInCleanEnv('testhub run-histories requires a run id', async () => {
  await assert.rejects(
    () => testhub.run(['run-histories']),
    /A run id is required/,
  );
});

testInCleanEnv('testhub run-history dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'run-history', '547000eb6a70571487623fea', '65115f0939286e26e05a66db',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/runs/547000eb6a70571487623fea/histories/65115f0939286e26e05a66db');
});

testInCleanEnv('testhub run-history requires run and history ids', async () => {
  await assert.rejects(
    () => testhub.run(['run-history', '547000eb6a70571487623fea']),
    /A run id and history id are required/,
  );
});

// ── General error handling ────────────────────────────────────────────

testInCleanEnv('testhub unknown subcommand errors', async () => {
  await assert.rejects(
    () => testhub.run(['unknown']),
    /Unknown testhub subcommand/,
  );
});

testInCleanEnv('testhub rejects unexpected positional argument', async () => {
  await assert.rejects(
    () => testhub.run(['library-list', 'extra']),
    /Unexpected argument/,
  );
});

testInCleanEnv('testhub rejects missing flag value', async () => {
  await assert.rejects(
    () => testhub.run(['library-list', '--keywords']),
    /Flag --keywords requires a value/,
  );
});

// ── Dictionary subcommands ────────────────────────────────────────────

testInCleanEnv('testhub case-states dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-states']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_states');
});

testInCleanEnv('testhub case-state-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-state-get', '686f62038668bbae4f4dd0c1']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_states/686f62038668bbae4f4dd0c1');
});

testInCleanEnv('testhub case-state-get requires a case state id', async () => {
  await assert.rejects(
    () => testhub.run(['case-state-get']),
    /A case state id is required/,
  );
});

testInCleanEnv('testhub case-types dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-types']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_types');
});

testInCleanEnv('testhub case-type-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-type-get', '5cf189b35de9c20620ad7153']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_types/5cf189b35de9c20620ad7153');
});

testInCleanEnv('testhub case-type-get requires a case type id', async () => {
  await assert.rejects(
    () => testhub.run(['case-type-get']),
    /A case type id is required/,
  );
});

testInCleanEnv('testhub case-important-levels dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-important-levels']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_important_levels');
});

testInCleanEnv('testhub case-important-level-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-important-level-get', '57a109b35ae8c20630fd7256']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256');
});

testInCleanEnv('testhub case-important-level-get requires an importance level id', async () => {
  await assert.rejects(
    () => testhub.run(['case-important-level-get']),
    /An importance level id is required/,
  );
});

testInCleanEnv('testhub plan-states dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['plan-states']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/plan_states');
});

testInCleanEnv('testhub plan-state-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['plan-state-get', '652d0cb2b798f983d9c67c2b']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/plan_states/652d0cb2b798f983d9c67c2b');
});

testInCleanEnv('testhub plan-state-get requires a plan state id', async () => {
  await assert.rejects(
    () => testhub.run(['plan-state-get']),
    /A plan state id is required/,
  );
});

testInCleanEnv('testhub run-statuses dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['run-statuses']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/run_statuses');
});

testInCleanEnv('testhub run-status-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['run-status-get', '68d117800d5dd2484a198261']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/run_statuses/68d117800d5dd2484a198261');
});

testInCleanEnv('testhub run-status-get requires a run status id', async () => {
  await assert.rejects(
    () => testhub.run(['run-status-get']),
    /A run status id is required/,
  );
});

testInCleanEnv('testhub dictionary lists reject unknown option', async () => {
  await assert.rejects(
    () => testhub.run(['case-states', '--bogus']),
    /Unknown option/,
  );
});

// ── Case property subcommands ─────────────────────────────────────────

testInCleanEnv('testhub case-property-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-property-list']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_properties');
});

testInCleanEnv('testhub case-property-create dry-run builds correct request', async () => {
  const options = [{ text: '严重' }, { text: '一般' }];
  const parsed = await dryRunOutput([
    'case-property-create',
    '--name', '严重程度',
    '--type', 'select',
    '--options', JSON.stringify(options),
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/case_properties');
  assert.strictEqual(parsed.json.name, '严重程度');
  assert.strictEqual(parsed.json.type, 'select');
  assert.deepStrictEqual(parsed.json.options, options);
});

testInCleanEnv('testhub case-property-create requires name and type', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-create']),
    /--name is required/,
  );
  await assert.rejects(
    () => testhub.run(['case-property-create', '--name', '严重程度']),
    /--type is required/,
  );
});

testInCleanEnv('testhub case-property-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-property-get', 'severity']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_properties/severity');
});

testInCleanEnv('testhub case-property-get requires a property id', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-get']),
    /A property id is required/,
  );
});

testInCleanEnv('testhub case-property-update dry-run builds correct request', async () => {
  const options = [{ id: '5efb1859110533727a82c603', text: '严重-update' }, { text: '一般' }];
  const parsed = await dryRunOutput([
    'case-property-update', 'severity',
    '--name', '严重程度-update',
    '--options', JSON.stringify(options),
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/testhub/case_properties/severity');
  assert.strictEqual(parsed.json.name, '严重程度-update');
  assert.deepStrictEqual(parsed.json.options, options);
});

testInCleanEnv('testhub case-property-update requires a property id', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-update']),
    /A property id is required/,
  );
});

// ── Case property plan subcommands ────────────────────────────────────

testInCleanEnv('testhub case-property-plan-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-property-plan-list', '--library-id', '5eb623f6a70571487ea47000']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_property_plans');
  assert.strictEqual(parsed.params.library_id, '5eb623f6a70571487ea47000');
});

testInCleanEnv('testhub case-property-plan-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-property-plan-get', '5f8a21f18ef715265de90c21']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21');
});

testInCleanEnv('testhub case-property-plan-get requires a property plan id', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-plan-get']),
    /A property plan id is required/,
  );
});

testInCleanEnv('testhub case-property-plan-property-add dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'case-property-plan-property-add', '5f8a21f18ef715265de90c21',
    '--property-id', 'environment',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties');
  assert.strictEqual(parsed.json.property_id, 'environment');
});

testInCleanEnv('testhub case-property-plan-property-add requires plan and property ids', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-plan-property-add']),
    /A property plan id is required/,
  );
  await assert.rejects(
    () => testhub.run(['case-property-plan-property-add', '5f8a21f18ef715265de90c21']),
    /--property-id is required/,
  );
});

testInCleanEnv('testhub case-property-plan-property-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'case-property-plan-property-get', '5f8a21f18ef715265de90c21', 'environment',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties/environment',
  );
});

testInCleanEnv('testhub case-property-plan-property-get requires plan and property ids', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-plan-property-get']),
    /A property plan id and property id are required/,
  );
});

testInCleanEnv('testhub case-property-plan-property-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['case-property-plan-property-list', '5f8a21f18ef715265de90c21']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties',
  );
});

testInCleanEnv('testhub case-property-plan-property-list requires a property plan id', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-plan-property-list']),
    /A property plan id is required/,
  );
});

testInCleanEnv('testhub case-property-plan-property-remove dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'case-property-plan-property-remove', '5f8a21f18ef715265de90c21', 'environment',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties/environment',
  );
});

testInCleanEnv('testhub case-property-plan-property-remove requires plan and property ids', async () => {
  await assert.rejects(
    () => testhub.run(['case-property-plan-property-remove']),
    /A property plan id and property id are required/,
  );
});

// ── Library member subcommands ────────────────────────────────────────

testInCleanEnv('testhub library-member-add dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'library-member-add', '5eb623f6a70571487ea47000',
    '--member-id', 'a0417f68e846aae315c85d24643678a9',
    '--member-type', 'user',
    '--role-id', '6422711c3f12e6c1e46d40e6',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/members');
  assert.deepStrictEqual(parsed.json.member, {
    id: 'a0417f68e846aae315c85d24643678a9',
    type: 'user',
  });
  assert.strictEqual(parsed.json.role_id, '6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('testhub library-member-add requires library, member id and type', async () => {
  await assert.rejects(
    () => testhub.run(['library-member-add']),
    /A library id is required/,
  );
  await assert.rejects(
    () => testhub.run(['library-member-add', '5eb623f6a70571487ea47000']),
    /--member-id is required/,
  );
  await assert.rejects(
    () => testhub.run(['library-member-add', '5eb623f6a70571487ea47000', '--member-id', 'u1']),
    /--member-type is required/,
  );
});

testInCleanEnv('testhub library-member-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'library-member-get', '5eb623f6a70571487ea47000', 'a0417f68e846aae315c85d24643678a9',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9',
  );
});

testInCleanEnv('testhub library-member-get requires library and member ids', async () => {
  await assert.rejects(
    () => testhub.run(['library-member-get']),
    /A library id and member id are required/,
  );
});

testInCleanEnv('testhub library-member-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['library-member-list', '5eb623f6a70571487ea47000']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/members');
});

testInCleanEnv('testhub library-member-list requires a library id', async () => {
  await assert.rejects(
    () => testhub.run(['library-member-list']),
    /A library id is required/,
  );
});

testInCleanEnv('testhub library-member-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'library-member-update', '5eb623f6a70571487ea47000', 'a0417f68e846aae315c85d24643678a9',
    '--role-id', '6422711c3f12e6c1e46d40e6',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9',
  );
  assert.strictEqual(parsed.json.role_id, '6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('testhub library-member-update requires library and member ids', async () => {
  await assert.rejects(
    () => testhub.run(['library-member-update']),
    /A library id and member id are required/,
  );
});

testInCleanEnv('testhub library-member-remove dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'library-member-remove', '5eb623f6a70571487ea47000', 'a0417f68e846aae315c85d24643678a9',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9',
  );
});

testInCleanEnv('testhub library-member-remove requires library and member ids', async () => {
  await assert.rejects(
    () => testhub.run(['library-member-remove']),
    /A library id and member id are required/,
  );
});

// ── Suite (case module) subcommands ───────────────────────────────────

testInCleanEnv('testhub suite-add dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'suite-add', '5eb623f6a70571487ea47000',
    '--name', '登录',
    '--parent-id', '5eb623f6a70571487ea46999',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/suites');
  assert.strictEqual(parsed.json.name, '登录');
  assert.strictEqual(parsed.json.parent_id, '5eb623f6a70571487ea46999');
});

testInCleanEnv('testhub suite-add requires library id and name', async () => {
  await assert.rejects(
    () => testhub.run(['suite-add']),
    /A library id is required/,
  );
  await assert.rejects(
    () => testhub.run(['suite-add', '5eb623f6a70571487ea47000']),
    /--name is required/,
  );
});

testInCleanEnv('testhub suite-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'suite-get', '5eb623f6a70571487ea47000', '55714870a70ea4eb623f6700',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700',
  );
});

testInCleanEnv('testhub suite-get requires library and suite ids', async () => {
  await assert.rejects(
    () => testhub.run(['suite-get']),
    /A library id and suite id are required/,
  );
});

testInCleanEnv('testhub suite-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'suite-list', '5eb623f6a70571487ea47000', '--parent-id', 'root',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/suites');
  assert.strictEqual(parsed.params.parent_id, 'root');
});

testInCleanEnv('testhub suite-list requires a library id', async () => {
  await assert.rejects(
    () => testhub.run(['suite-list']),
    /A library id is required/,
  );
});

testInCleanEnv('testhub suite-update dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'suite-update', '5eb623f6a70571487ea47000', '55714870a70ea4eb623f6700',
    '--name', '注册',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700',
  );
  assert.strictEqual(parsed.json.name, '注册');
});

testInCleanEnv('testhub suite-update requires library and suite ids', async () => {
  await assert.rejects(
    () => testhub.run(['suite-update']),
    /A library id and suite id are required/,
  );
});

testInCleanEnv('testhub suite-delete dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'suite-delete', '5eb623f6a70571487ea47000', '55714870a70ea4eb623f6700',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700',
  );
});

testInCleanEnv('testhub suite-delete requires library and suite ids', async () => {
  await assert.rejects(
    () => testhub.run(['suite-delete']),
    /A library id and suite id are required/,
  );
});

// ── Plan type subcommands ─────────────────────────────────────────────

testInCleanEnv('testhub plan-type-list dry-run builds correct request', async () => {
  const parsed = await dryRunOutput(['plan-type-list', '5eb623f6a70571487ea47000']);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types');
});

testInCleanEnv('testhub plan-type-list requires a library id', async () => {
  await assert.rejects(
    () => testhub.run(['plan-type-list']),
    /A library id is required/,
  );
});

testInCleanEnv('testhub plan-type-get dry-run builds correct request', async () => {
  const parsed = await dryRunOutput([
    'plan-type-get', '5eb623f6a70571487ea47000', '642f765b6950bc66cfa82f05',
  ]);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(
    parsed.path,
    '/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types/642f765b6950bc66cfa82f05',
  );
});

testInCleanEnv('testhub plan-type-get requires library and plan type ids', async () => {
  await assert.rejects(
    () => testhub.run(['plan-type-get']),
    /A library id and plan type id are required/,
  );
});
