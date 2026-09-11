'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const project = require('../scripts/commands/project');
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

function setupAuth() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

const PROJECT_ID = '5eb623f6a70571487ea47000';
const MEMBER_ID = 'a0417f68e846aae315c85d24643678a9';
const PROPERTY_ID = 'risk';

const SUBCOMMANDS = [
  'create', 'get', 'update', 'clone', 'progress', 'project-states',
  'member-add', 'member-get', 'member-update', 'member-list', 'member-remove',
  'prop-add', 'prop-get', 'prop-list', 'prop-remove', 'local-config-enable',
];

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('project --help shows module help', async () => {
  const output = await captureLogAsync(() => project.run(['--help']));
  assert.ok(output.includes('PingCode project'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('create'));
  assert.ok(output.includes('member-add'));
  assert.ok(output.includes('prop-list'));
  assert.ok(output.includes('local-config-enable'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('project with no args shows module help', async () => {
  const output = await captureLogAsync(() => project.run([]));
  assert.ok(output.includes('PingCode project'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('project subcommand --help shows usage for every subcommand', async () => {
  for (const sub of SUBCOMMANDS) {
    const output = await captureLogAsync(() => project.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode project ${sub}`), `missing usage for ${sub}`);
  }
});

// ── Create subcommand ──────────────────────────────────────────────────

testInCleanEnv('project create dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'create',
    '--type', 'scrum',
    '--name', 'Scrum项目',
    '--identifier', 'SCR',
    '--process-id', '5fa690f1ae0571487ea49030',
    '--scope-type', 'user_group',
    '--scope-id', '63c8fb32729dee3334d96af7',
    '--visibility', 'private',
    '--description', '这是一个scrum类型的项目',
    '--members', '[{"id":"' + MEMBER_ID + '","type":"user"}]',
    '--start-at', '1680278400',
    '--end-at', '1682870399',
    '--assignee-id', MEMBER_ID,
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/projects');
  assert.strictEqual(parsed.json.type, 'scrum');
  assert.strictEqual(parsed.json.name, 'Scrum项目');
  assert.strictEqual(parsed.json.identifier, 'SCR');
  assert.strictEqual(parsed.json.scope_type, 'user_group');
  assert.strictEqual(parsed.json.visibility, 'private');
  assert.deepStrictEqual(parsed.json.members, [{ id: MEMBER_ID, type: 'user' }]);
  assert.strictEqual(parsed.json.start_at, 1680278400);
  assert.strictEqual(parsed.json.end_at, 1682870399);
  assert.strictEqual(parsed.json.assignee_id, MEMBER_ID);
});

testInCleanEnv('project create requires type name and identifier', async () => {
  await assert.rejects(
    () => project.run(['create', '--name', 'X', '--identifier', 'X']),
    /--type is required/,
  );
  await assert.rejects(
    () => project.run(['create', '--type', 'scrum', '--identifier', 'X']),
    /--name is required/,
  );
  await assert.rejects(
    () => project.run(['create', '--type', 'scrum', '--name', 'X']),
    /--identifier is required/,
  );
});

// ── Get subcommand ─────────────────────────────────────────────────────

testInCleanEnv('project get dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'get', PROJECT_ID, '--include-deleted', '--include-archived', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}`);
  assert.strictEqual(parsed.params.include_deleted, true);
  assert.strictEqual(parsed.params.include_archived, true);
});

testInCleanEnv('project get requires a project id', async () => {
  await assert.rejects(
    () => project.run(['get']),
    /A project id is required/,
  );
});

// ── Update subcommand ──────────────────────────────────────────────────

testInCleanEnv('project update dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'update', PROJECT_ID,
    '--name', '新名称',
    '--state-id', '66cbf3b4b78a55fcd1a76296',
    '--start-at', '1680278400',
    '--properties', '{"prop_a":"prop_a_value"}',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}`);
  assert.strictEqual(parsed.json.name, '新名称');
  assert.strictEqual(parsed.json.state_id, '66cbf3b4b78a55fcd1a76296');
  assert.strictEqual(parsed.json.start_at, 1680278400);
  assert.deepStrictEqual(parsed.json.properties, { prop_a: 'prop_a_value' });
});

testInCleanEnv('project update requires at least one field', async () => {
  await assert.rejects(
    () => project.run(['update', PROJECT_ID]),
    /At least one field to update is required/,
  );
});

// ── Clone subcommand ───────────────────────────────────────────────────

testInCleanEnv('project clone dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'clone', PROJECT_ID,
    '--identifier', 'SCRC',
    '--name', '复制的Scrum项目',
    '--visibility', 'public',
    '--members', '[{"id":"' + MEMBER_ID + '","type":"user"}]',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/clone`);
  assert.strictEqual(parsed.json.identifier, 'SCRC');
  assert.strictEqual(parsed.json.name, '复制的Scrum项目');
  assert.strictEqual(parsed.json.visibility, 'public');
  assert.deepStrictEqual(parsed.json.members, [{ id: MEMBER_ID, type: 'user' }]);
});

testInCleanEnv('project clone requires an identifier', async () => {
  await assert.rejects(
    () => project.run(['clone', PROJECT_ID, '--name', 'X']),
    /--identifier is required/,
  );
});

// ── Progress subcommand ────────────────────────────────────────────────

testInCleanEnv('project progress dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'progress', PROJECT_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/progress`);
});

testInCleanEnv('project progress requires a project id', async () => {
  await assert.rejects(
    () => project.run(['progress']),
    /A project id is required/,
  );
});

// ── Project states subcommand ──────────────────────────────────────────

testInCleanEnv('project project-states dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'project-states', PROJECT_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/project/states');
  assert.strictEqual(parsed.params.project_id, PROJECT_ID);
});

testInCleanEnv('project project-states requires a project id', async () => {
  await assert.rejects(
    () => project.run(['project-states']),
    /A project id is required/,
  );
});

// ── Member subcommands ─────────────────────────────────────────────────

testInCleanEnv('project member-add dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'member-add', PROJECT_ID, MEMBER_ID,
    '--role-id', '6422711c3f12e6c1e46d40e6',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/members`);
  assert.deepStrictEqual(parsed.json.member, { id: MEMBER_ID, type: 'user' });
  assert.strictEqual(parsed.json.role_id, '6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('project member-add supports user_group type', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'member-add', PROJECT_ID, MEMBER_ID, '--type', 'user_group', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.deepStrictEqual(parsed.json.member, { id: MEMBER_ID, type: 'user_group' });
  assert.strictEqual(parsed.json.role_id, undefined);
});

testInCleanEnv('project member-add requires member id', async () => {
  await assert.rejects(
    () => project.run(['member-add', PROJECT_ID]),
    /A member id is required/,
  );
  await assert.rejects(
    () => project.run(['member-add']),
    /A project id is required/,
  );
});

testInCleanEnv('project member-get dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'member-get', PROJECT_ID, MEMBER_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/members/${MEMBER_ID}`);
});

testInCleanEnv('project member-get requires member id', async () => {
  await assert.rejects(
    () => project.run(['member-get', PROJECT_ID]),
    /A member id is required/,
  );
});

testInCleanEnv('project member-update dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'member-update', PROJECT_ID, MEMBER_ID,
    '--role-id', '6422711c3f12e6c1e46d40e6',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/members/${MEMBER_ID}`);
  assert.strictEqual(parsed.json.role_id, '6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('project member-update requires a role id', async () => {
  await assert.rejects(
    () => project.run(['member-update', PROJECT_ID, MEMBER_ID]),
    /--role-id is required/,
  );
});

testInCleanEnv('project member-list dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'member-list', PROJECT_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/members`);
});

testInCleanEnv('project member-list requires a project id', async () => {
  await assert.rejects(
    () => project.run(['member-list']),
    /A project id is required/,
  );
});

testInCleanEnv('project member-remove dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'member-remove', PROJECT_ID, MEMBER_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/members/${MEMBER_ID}`);
});

testInCleanEnv('project member-remove requires member id', async () => {
  await assert.rejects(
    () => project.run(['member-remove', PROJECT_ID]),
    /A member id is required/,
  );
});

// ── Project property subcommands ───────────────────────────────────────

testInCleanEnv('project prop-add dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'prop-add', PROJECT_ID, PROPERTY_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/project_properties`);
  assert.strictEqual(parsed.json.property_id, PROPERTY_ID);
});

testInCleanEnv('project prop-add requires property id', async () => {
  await assert.rejects(
    () => project.run(['prop-add', PROJECT_ID]),
    /A property id is required/,
  );
});

testInCleanEnv('project prop-get dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'prop-get', PROJECT_ID, PROPERTY_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/project_properties/${PROPERTY_ID}`);
});

testInCleanEnv('project prop-get requires property id', async () => {
  await assert.rejects(
    () => project.run(['prop-get', PROJECT_ID]),
    /A property id is required/,
  );
});

testInCleanEnv('project prop-list dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'prop-list', PROJECT_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/project_properties`);
});

testInCleanEnv('project prop-list requires a project id', async () => {
  await assert.rejects(
    () => project.run(['prop-list']),
    /A project id is required/,
  );
});

testInCleanEnv('project prop-remove dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'prop-remove', PROJECT_ID, PROPERTY_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/project_properties/${PROPERTY_ID}`);
});

testInCleanEnv('project prop-remove requires property id', async () => {
  await assert.rejects(
    () => project.run(['prop-remove', PROJECT_ID]),
    /A property id is required/,
  );
});

// ── Local config subcommand ────────────────────────────────────────────

testInCleanEnv('project local-config-enable dry-run builds correct request', async () => {
  setupAuth();

  const output = await captureLogAsync(() => project.run([
    'local-config-enable', PROJECT_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/pjm/projects/${PROJECT_ID}/local_config/enable`);
  assert.deepStrictEqual(parsed.json, {});
});

testInCleanEnv('project local-config-enable requires a project id', async () => {
  await assert.rejects(
    () => project.run(['local-config-enable']),
    /A project id is required/,
  );
});

// ── Error handling ─────────────────────────────────────────────────────

testInCleanEnv('project unknown subcommand errors', async () => {
  await assert.rejects(
    () => project.run(['unknown']),
    /Unknown project subcommand/,
  );
});

testInCleanEnv('project rejects unknown option', async () => {
  await assert.rejects(
    () => project.run(['get', PROJECT_ID, '--bogus-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('project create rejects unexpected positional argument', async () => {
  await assert.rejects(
    () => project.run(['create', 'extra', '--type', 'scrum', '--name', 'X', '--identifier', 'X']),
    /Unexpected argument/,
  );
});

testInCleanEnv('project create requires value for flags', async () => {
  await assert.rejects(
    () => project.run(['create', '--name']),
    /Flag --name requires a value/,
  );
});

testInCleanEnv('project create rejects non-numeric start-at', async () => {
  await assert.rejects(
    () => project.run(['create', '--type', 'scrum', '--name', 'X', '--identifier', 'X', '--start-at', 'abc']),
    /--start-at must be a number/,
  );
});

testInCleanEnv('project create rejects invalid members JSON array', async () => {
  await assert.rejects(
    () => project.run(['create', '--type', 'scrum', '--name', 'X', '--identifier', 'X', '--members', '{"id":"a"}']),
    /--members must be a JSON array/,
  );
});
