'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const config = require('../scripts/commands/config');
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

function setupToken() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('config --help shows module help', async () => {
  const output = await captureLogAsync(() => config.run(['--help']));
  assert.ok(output.includes('PingCode config'));
  assert.ok(output.includes('Subcommands:') || output.includes('type-list-all'));
  assert.ok(output.includes('type-list-all'));
  assert.ok(output.includes('state-update'));
  assert.ok(output.includes('priority-get'));
  assert.ok(output.includes('project-property-update'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('config with no args shows module help', async () => {
  const output = await captureLogAsync(() => config.run([]));
  assert.ok(output.includes('PingCode config'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('config subcommands show their own usage', async () => {
  const subs = [
    'type-list-all', 'type-create', 'type-get', 'type-update', 'type-delete',
    'state-list', 'state-create', 'state-get', 'state-update',
    'priority-get',
    'property-list', 'property-create', 'property-get', 'property-update',
    'process-list', 'process-get',
    'project-state-get',
    'project-property-list', 'project-property-create', 'project-property-get', 'project-property-update',
  ];
  for (const sub of subs) {
    const output = await captureLogAsync(() => config.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode config ${sub}`), `${sub} --help should show usage`);
  }
});

// ── Work item types ────────────────────────────────────────────────────

testInCleanEnv('type-list-all dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['type-list-all', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_types');
});

testInCleanEnv('type-create dry-run posts body', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'type-create', '--name', '功能缺陷', '--group', 'bug', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_types');
  assert.strictEqual(parsed.json.name, '功能缺陷');
  assert.strictEqual(parsed.json.group, 'bug');
});

testInCleanEnv('type-create requires a name', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['type-create', '--group', 'bug']),
    /--name is required/,
  );
});

testInCleanEnv('type-create requires a group', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['type-create', '--name', '功能缺陷']),
    /--group is required/,
  );
});

testInCleanEnv('type-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['type-get', '630da48bc9443b1aa94ce3ea', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea');
});

testInCleanEnv('type-get requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['type-get']),
    /A work item type id is required/,
  );
});

testInCleanEnv('type-update dry-run patches name', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'type-update', '630da48bc9443b1aa94ce3df', '--name', '非功能性需求', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_types/630da48bc9443b1aa94ce3df');
  assert.strictEqual(parsed.json.name, '非功能性需求');
});

testInCleanEnv('type-update requires a name', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['type-update', '630da48bc9443b1aa94ce3df']),
    /--name is required/,
  );
});

testInCleanEnv('type-delete dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['type-delete', '630da48bc9443b1aa94ce3df', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_types/630da48bc9443b1aa94ce3df');
});

testInCleanEnv('type-delete requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['type-delete']),
    /A work item type id is required/,
  );
});

// ── Work item states ───────────────────────────────────────────────────

testInCleanEnv('state-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['state-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_states');
});

testInCleanEnv('state-create dry-run posts body', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'state-create', '--name', '新建', '--type', 'pending', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_states');
  assert.strictEqual(parsed.json.name, '新建');
  assert.strictEqual(parsed.json.type, 'pending');
});

testInCleanEnv('state-create requires a name and a type', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['state-create', '--type', 'pending']),
    /--name is required/,
  );
  await assert.rejects(
    () => config.run(['state-create', '--name', '新建']),
    /--type is required/,
  );
});

testInCleanEnv('state-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['state-get', '5c9b35de90ad7153c2062f18', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18');
});

testInCleanEnv('state-get requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['state-get']),
    /A work item state id is required/,
  );
});

testInCleanEnv('state-update dry-run patches provided fields only', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'state-update', '5c9b35de90ad7153c2062f18', '--name', '待处理', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18');
  assert.strictEqual(parsed.json.name, '待处理');
  assert.strictEqual('type' in parsed.json, false);

  const output2 = await captureLogAsync(() => config.run([
    'state-update', '5c9b35de90ad7153c2062f18', '--name', '待处理', '--type', 'in_progress', '--dry-run',
  ]));
  const parsed2 = JSON.parse(output2);
  assert.strictEqual(parsed2.json.type, 'in_progress');
});

testInCleanEnv('state-update requires an id and at least one field', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['state-update', '--name', '待处理']),
    /A work item state id is required/,
  );
  await assert.rejects(
    () => config.run(['state-update', '5c9b35de90ad7153c2062f18']),
    /At least one field to update is required/,
  );
});

// ── Priorities ─────────────────────────────────────────────────────────

testInCleanEnv('priority-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['priority-get', '5eb623f6a70571487ea47111', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111');
});

testInCleanEnv('priority-get requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['priority-get']),
    /A work item priority id is required/,
  );
});

// ── Work item properties ───────────────────────────────────────────────

testInCleanEnv('property-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['property-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_properties');
});

testInCleanEnv('property-create dry-run posts body with options', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'property-create', '--name', '严重程度', '--type', 'select',
    '--options', '[{"text":"严重"},{"_id":"5efb1859110533727a82c604","text":"一般"}]',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_properties');
  assert.strictEqual(parsed.json.name, '严重程度');
  assert.strictEqual(parsed.json.type, 'select');
  assert.deepStrictEqual(parsed.json.options, [
    { text: '严重' },
    { _id: '5efb1859110533727a82c604', text: '一般' },
  ]);
});

testInCleanEnv('property-create without options posts name and type only', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'property-create', '--name', '备注', '--type', 'text', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.deepStrictEqual(parsed.json, { name: '备注', type: 'text' });
});
testInCleanEnv('property-create requires a name and a type', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['property-create', '--type', 'select']),
    /--name is required/,
  );
  await assert.rejects(
    () => config.run(['property-create', '--name', '严重程度']),
    /--type is required/,
  );
});

testInCleanEnv('property-create rejects non-array or invalid options', async () => {
  setupToken();
  await assert.rejects(
    () => config.run([
      'property-create', '--name', '严重程度', '--type', 'select', '--options', '{"text":"高"}',
    ]),
    /--options must be a JSON array/,
  );
  await assert.rejects(
    () => config.run([
      'property-create', '--name', '严重程度', '--type', 'select', '--options', 'not-json',
    ]),
    /--options must be valid JSON/,
  );
});

testInCleanEnv('property-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['property-get', 'severity', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_properties/severity');
});

testInCleanEnv('property-get requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['property-get']),
    /A work item property id is required/,
  );
});

testInCleanEnv('property-update dry-run patches fields', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'property-update', 'severity',
    '--options', '[{"text":"高"},{"text":"低"}]',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_properties/severity');
  assert.deepStrictEqual(parsed.json.options, [{ text: '高' }, { text: '低' }]);
  assert.strictEqual('name' in parsed.json, false);
});

testInCleanEnv('property-update requires an id and at least one field', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['property-update', '--name', '新名称']),
    /A work item property id is required/,
  );
  await assert.rejects(
    () => config.run(['property-update', 'severity']),
    /At least one field to update is required/,
  );
});

// ── Processes ──────────────────────────────────────────────────────────

testInCleanEnv('process-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['process-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/processes');
});

testInCleanEnv('process-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['process-get', '5fa690f1ae0571487ea49030', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/processes/5fa690f1ae0571487ea49030');
});

testInCleanEnv('process-get requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['process-get']),
    /A project process id is required/,
  );
});

// ── Project states ─────────────────────────────────────────────────────

testInCleanEnv('project-state-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['project-state-get', '66cbf5401e7cc374c85acb1b', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/project_states/66cbf5401e7cc374c85acb1b');
});

testInCleanEnv('project-state-get requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['project-state-get']),
    /A project state id is required/,
  );
});

// ── Global project properties ──────────────────────────────────────────

testInCleanEnv('project-property-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['project-property-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/project_properties');
});

testInCleanEnv('project-property-create dry-run posts body', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'project-property-create', '--name', '项目风险', '--type', 'select',
    '--options', '[{"text":"高"},{"text":"中"},{"text":"低"}]',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/project_properties');
  assert.strictEqual(parsed.json.name, '项目风险');
  assert.strictEqual(parsed.json.type, 'select');
  assert.deepStrictEqual(parsed.json.options, [{ text: '高' }, { text: '中' }, { text: '低' }]);
});

testInCleanEnv('project-property-create requires a name and a type', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['project-property-create', '--type', 'text']),
    /--name is required/,
  );
  await assert.rejects(
    () => config.run(['project-property-create', '--name', '项目风险']),
    /--type is required/,
  );
});

testInCleanEnv('project-property-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run(['project-property-get', 'risk', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/project_properties/risk');
});

testInCleanEnv('project-property-get requires an id', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['project-property-get']),
    /A project property id is required/,
  );
});

testInCleanEnv('project-property-update dry-run patches fields', async () => {
  setupToken();
  const output = await captureLogAsync(() => config.run([
    'project-property-update', 'xiangmuguimo', '--name', '项目规模',
    '--options', '[{"text":"大"},{"text":"小"}]',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/pjm/project_properties/xiangmuguimo');
  assert.strictEqual(parsed.json.name, '项目规模');
  assert.deepStrictEqual(parsed.json.options, [{ text: '大' }, { text: '小' }]);
});

testInCleanEnv('project-property-update requires an id and at least one field', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['project-property-update', '--name', '项目规模']),
    /A project property id is required/,
  );
  await assert.rejects(
    () => config.run(['project-property-update', 'xiangmuguimo']),
    /At least one field to update is required/,
  );
});

// ── Unknown option / unknown subcommand ────────────────────────────────

testInCleanEnv('config subcommand rejects unknown option', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['type-create', '--bogus', 'x']),
    /Unknown option/,
  );
  await assert.rejects(
    () => config.run(['state-list', '--bogus']),
    /Unknown option/,
  );
});

testInCleanEnv('config subcommand rejects extra positional argument', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['state-list', 'extra']),
    /Unexpected argument/,
  );
});

testInCleanEnv('config unknown subcommand errors', async () => {
  setupToken();
  await assert.rejects(
    () => config.run(['unknown']),
    /Unknown config subcommand/,
  );
});
