'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const directory = require('../scripts/commands/directory');
const { clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

// ── Test infrastructure ───────────────────────────────────────────────

function testInCleanEnv(name, fn) {
  test(name, async () => {
    const original = clearEnv();
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-test-'));
    process.env.PINGCODE_TOKEN_CACHE = path.join(tmpdir, 'token.json');
    process.env.PINGCODE_WORKSPACE_CACHE = path.join(tmpdir, 'workspace.json');
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

function setupAuth() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('directory --help shows module help', async () => {
  const output = await captureLogAsync(() => directory.run(['--help']));
  assert.ok(output.includes('PingCode directory'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('user-create'));
  assert.ok(output.includes('group-member-remove'));
  assert.ok(output.includes('department-delete'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('directory with no args shows module help', async () => {
  const output = await captureLogAsync(() => directory.run([]));
  assert.ok(output.includes('PingCode directory'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('directory every subcommand --help shows usage', async () => {
  const subcommands = [
    'me', 'team',
    'user-list', 'user-create', 'user-get', 'user-update', 'user-bulk-update',
    'group-list', 'group-create', 'group-get', 'group-update',
    'group-member-add', 'group-member-get', 'group-member-list', 'group-member-remove',
    'department-list', 'department-create', 'department-get', 'department-update', 'department-delete',
    'job-list', 'job-get', 'role-list', 'role-get',
  ];
  for (const sub of subcommands) {
    const output = await captureLogAsync(() => directory.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode directory ${sub}`), `missing usage for ${sub}`);
  }
});

// ── me / team subcommands ──────────────────────────────────────────────

testInCleanEnv('directory me dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['me', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/myself');
});

testInCleanEnv('directory team dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['team', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/team');
});

// ── User subcommands ───────────────────────────────────────────────────

testInCleanEnv('directory user-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'user-list',
    '--keywords', 'john',
    '--department-ids', '6422711c3f12e6c1e46d40e6,6422711c3f12e6c1e46d40e2',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/users');
  assert.strictEqual(parsed.params.keywords, 'john');
  assert.strictEqual(parsed.params.department_ids, '6422711c3f12e6c1e46d40e6,6422711c3f12e6c1e46d40e2');
});

testInCleanEnv('directory user-list rejects unknown option', async () => {
  await assert.rejects(
    () => directory.run(['user-list', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('directory user-create dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'user-create',
    '--name', 'john',
    '--display-name', 'John',
    '--email', 'john@email.com',
    '--mobile', '15000000000',
    '--password', '123456',
    '--department-id', '6422711c3f12e6c1e46d40e6',
    '--job-id', '6440c881c56f557eb1aff6e5',
    '--employee-number', 'zxv',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/directory/users');
  assert.strictEqual(parsed.json.name, 'john');
  assert.strictEqual(parsed.json.display_name, 'John');
  assert.strictEqual(parsed.json.email, 'john@email.com');
  assert.strictEqual(parsed.json.mobile, '15000000000');
  assert.strictEqual(parsed.json.password, '123456');
  assert.strictEqual(parsed.json.department_id, '6422711c3f12e6c1e46d40e6');
  assert.strictEqual(parsed.json.job_id, '6440c881c56f557eb1aff6e5');
  assert.strictEqual(parsed.json.employee_number, 'zxv');
});

testInCleanEnv('directory user-create requires name and display name', async () => {
  await assert.rejects(
    () => directory.run(['user-create', '--display-name', 'John']),
    /--name is required/,
  );
  await assert.rejects(
    () => directory.run(['user-create', '--name', 'john']),
    /--display-name is required/,
  );
});

testInCleanEnv('directory user-create rejects unexpected positional', async () => {
  await assert.rejects(
    () => directory.run(['user-create', 'extra']),
    /Unexpected argument/,
  );
});

testInCleanEnv('directory user-get dry-run builds correct request for raw id', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'user-get', 'a0417f68e846aae315c85d24643678a9', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/users/a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('directory user-get resolves name to id', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch([
    fakeResponse({ access_token: 'tok', expires_in: 3600 }),
    fakeResponse({
      page_size: 30,
      page_index: 0,
      total: 1,
      values: [{ id: 'a0417f68e846aae315c85d24643678a9', name: 'john' }],
    }),
    fakeResponse({ id: 'a0417f68e846aae315c85d24643678a9', name: 'john' }),
  ]);

  const output = await captureLogAsync(() => directory.run(['user-get', 'john', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/users/a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('directory user-get errors when no user matches name', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch([
    fakeResponse({ access_token: 'tok', expires_in: 3600 }),
    fakeResponse({ page_size: 30, page_index: 0, total: 0, values: [] }),
  ]);

  await assert.rejects(
    () => directory.run(['user-get', 'ghost']),
    /No user found matching "ghost"/,
  );
});

testInCleanEnv('directory user-get requires a user id or name', async () => {
  await assert.rejects(
    () => directory.run(['user-get']),
    /A user id or name is required/,
  );
});

testInCleanEnv('directory user-update dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'user-update', 'a0417f68e846aae315c85d24643678a9',
    '--display-name', 'John Updated',
    '--status', 'disabled',
    '--department-id', '6422711c3f12e6c1e46d40e2',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/directory/users/a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.json.display_name, 'John Updated');
  assert.strictEqual(parsed.json.status, 'disabled');
  assert.strictEqual(parsed.json.department_id, '6422711c3f12e6c1e46d40e2');
});

testInCleanEnv('directory user-update requires at least one field', async () => {
  await assert.rejects(
    () => directory.run(['user-update', 'a0417f68e846aae315c85d24643678a9']),
    /At least one field to update is required/,
  );
  await assert.rejects(
    () => directory.run(['user-update']),
    /A user id is required/,
  );
});

testInCleanEnv('directory user-update rejects invalid status', async () => {
  await assert.rejects(
    () => directory.run(['user-update', 'a0417f68e846aae315c85d24643678a9', '--status', 'paused']),
    /--status must be one of: enabled, disabled/,
  );
});

testInCleanEnv('directory user-bulk-update dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'user-bulk-update',
    '--user-ids', 'a0417f68e846aae315c85d24643678a9, 70e9933e5e7948779b9b8978b6489038',
    '--property-name', 'status',
    '--property-value', 'disabled',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/directory/users/bulk');
  assert.deepStrictEqual(parsed.json.user_ids, [
    'a0417f68e846aae315c85d24643678a9',
    '70e9933e5e7948779b9b8978b6489038',
  ]);
  assert.strictEqual(parsed.json.property_name, 'status');
  assert.strictEqual(parsed.json.property_value, 'disabled');
});

testInCleanEnv('directory user-bulk-update requires all fields', async () => {
  await assert.rejects(
    () => directory.run(['user-bulk-update', '--property-name', 'status', '--property-value', 'disabled']),
    /--user-ids is required/,
  );
  await assert.rejects(
    () => directory.run(['user-bulk-update', '--user-ids', 'a0417f68e846aae315c85d24643678a9', '--property-value', 'disabled']),
    /--property-name is required/,
  );
  await assert.rejects(
    () => directory.run(['user-bulk-update', '--user-ids', 'a0417f68e846aae315c85d24643678a9', '--property-name', 'status']),
    /--property-value is required/,
  );
});

testInCleanEnv('directory user-bulk-update rejects unsupported property name', async () => {
  await assert.rejects(
    () => directory.run([
      'user-bulk-update',
      '--user-ids', 'a0417f68e846aae315c85d24643678a9',
      '--property-name', 'email',
      '--property-value', 'x@y.com',
    ]),
    /--property-name must be one of: status/,
  );
});

// ── Group subcommands ──────────────────────────────────────────────────

testInCleanEnv('directory group-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['group-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/groups');
});

testInCleanEnv('directory group-create dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'group-create',
    '--name', 'Open Team',
    '--visibility', 'public',
    '--description', 'This is Open Team.',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/directory/groups');
  assert.strictEqual(parsed.json.name, 'Open Team');
  assert.strictEqual(parsed.json.visibility, 'public');
  assert.strictEqual(parsed.json.description, 'This is Open Team.');
});

testInCleanEnv('directory group-create requires name', async () => {
  await assert.rejects(
    () => directory.run(['group-create', '--visibility', 'public']),
    /--name is required/,
  );
});

testInCleanEnv('directory group-create rejects invalid visibility', async () => {
  await assert.rejects(
    () => directory.run(['group-create', '--name', 'T', '--visibility', 'hidden']),
    /--visibility must be one of: private, public/,
  );
});

testInCleanEnv('directory group-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['group-get', '63c8fb32729dee3334d96af7', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/groups/63c8fb32729dee3334d96af7');
});

testInCleanEnv('directory group-get requires a group id', async () => {
  await assert.rejects(
    () => directory.run(['group-get']),
    /A group id is required/,
  );
});

testInCleanEnv('directory group-update dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'group-update', '63c8fb32729dee3334d96af7',
    '--visibility', 'public',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/directory/groups/63c8fb32729dee3334d96af7');
  assert.strictEqual(parsed.json.visibility, 'public');
});

testInCleanEnv('directory group-update requires at least one field', async () => {
  await assert.rejects(
    () => directory.run(['group-update', '63c8fb32729dee3334d96af7']),
    /At least one field to update is required/,
  );
});

testInCleanEnv('directory group-member-add dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'group-member-add', '64ca0f67cb78a0a80e1a999e', 'a0417f68e846aae315c85d24643678a9',
    '--role', 'manager',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members');
  assert.strictEqual(parsed.json.user_id, 'a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.json.role, 'manager');
});

testInCleanEnv('directory group-member-add requires user id and role', async () => {
  await assert.rejects(
    () => directory.run(['group-member-add', '--role', 'member']),
    /A group id and a user id are required/,
  );
  await assert.rejects(
    () => directory.run(['group-member-add', '64ca0f67cb78a0a80e1a999e', '--role', 'member']),
    /A group id and a user id are required/,
  );
  await assert.rejects(
    () => directory.run(['group-member-add', '64ca0f67cb78a0a80e1a999e', 'a0417f68e846aae315c85d24643678a9']),
    /--role is required/,
  );
  await assert.rejects(
    () => directory.run(['group-member-add', '64ca0f67cb78a0a80e1a999e', 'a0417f68e846aae315c85d24643678a9', '--role', 'owner']),
    /--role must be one of: manager, member/,
  );
});

testInCleanEnv('directory group-member-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'group-member-get', '64ca0f67cb78a0a80e1a999e', 'a0417f68e846aae315c85d24643678a9', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members/a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('directory group-member-get requires two ids', async () => {
  await assert.rejects(
    () => directory.run(['group-member-get', '64ca0f67cb78a0a80e1a999e']),
    /A group id and a member id are required/,
  );
});

testInCleanEnv('directory group-member-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['group-member-list', '64ca0f67cb78a0a80e1a999e', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members');
});

testInCleanEnv('directory group-member-remove dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'group-member-remove', '64ca0f67cb78a0a80e1a999e', 'a0417f68e846aae315c85d24643678a9', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members/a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('directory group-member-remove requires two ids', async () => {
  await assert.rejects(
    () => directory.run(['group-member-remove']),
    /A group id and a member id are required/,
  );
});

// ── Department subcommands ─────────────────────────────────────────────

testInCleanEnv('directory department-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['department-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/departments');
});

testInCleanEnv('directory department-create dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'department-create',
    '--name', '技术支持',
    '--parent-id', '6422711c3f12e6c1e46d40e2',
    '--head-id', 'a0417f68e846aae315c85d24643678a9',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/directory/departments');
  assert.strictEqual(parsed.json.name, '技术支持');
  assert.strictEqual(parsed.json.parent_id, '6422711c3f12e6c1e46d40e2');
  assert.strictEqual(parsed.json.head_id, 'a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('directory department-create requires name', async () => {
  await assert.rejects(
    () => directory.run(['department-create', '--parent-id', 'p']),
    /--name is required/,
  );
});

testInCleanEnv('directory department-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['department-get', '6422711c3f12e6c1e46d40e6', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/departments/6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('directory department-get requires a department id', async () => {
  await assert.rejects(
    () => directory.run(['department-get']),
    /A department id is required/,
  );
});

testInCleanEnv('directory department-update dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run([
    'department-update', '6422711c3f12e6c1e46d40e6',
    '--head-id', '70e9933e5e7948779b9b8978b6489038',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/directory/departments/6422711c3f12e6c1e46d40e6');
  assert.strictEqual(parsed.json.head_id, '70e9933e5e7948779b9b8978b6489038');
});

testInCleanEnv('directory department-update requires id and a field', async () => {
  await assert.rejects(
    () => directory.run(['department-update']),
    /A department id is required/,
  );
  await assert.rejects(
    () => directory.run(['department-update', '6422711c3f12e6c1e46d40e6']),
    /At least one field to update is required/,
  );
});

testInCleanEnv('directory department-delete dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['department-delete', '6422711c3f12e6c1e46d40e6', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/directory/departments/6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('directory department-delete requires a department id', async () => {
  await assert.rejects(
    () => directory.run(['department-delete']),
    /A department id is required/,
  );
});

// ── Job / role subcommands ─────────────────────────────────────────────

testInCleanEnv('directory job-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['job-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/jobs');
});

testInCleanEnv('directory job-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['job-get', '6440c881c56f557eb1aff6e5', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/jobs/6440c881c56f557eb1aff6e5');
});

testInCleanEnv('directory job-get requires a job id', async () => {
  await assert.rejects(
    () => directory.run(['job-get']),
    /A job id is required/,
  );
});

testInCleanEnv('directory role-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['role-list', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/roles');
});

testInCleanEnv('directory role-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => directory.run(['role-get', '6422711c3f12e6c1e46d40e6', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/directory/roles/6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('directory role-get requires a role id', async () => {
  await assert.rejects(
    () => directory.run(['role-get']),
    /A role id is required/,
  );
});

// ── Parse errors ───────────────────────────────────────────────────────

testInCleanEnv('directory flag missing value errors', async () => {
  await assert.rejects(
    () => directory.run(['user-create', '--name']),
    /Flag --name requires a value/,
  );
});

testInCleanEnv('directory unknown subcommand errors', async () => {
  await assert.rejects(
    () => directory.run(['unknown']),
    /Unknown directory subcommand/,
  );
});

testInCleanEnv('directory group-get rejects unknown option', async () => {
  await assert.rejects(
    () => directory.run(['group-get', '63c8fb32729dee3334d96af7', '--bogus']),
    /Unknown option/,
  );
});
