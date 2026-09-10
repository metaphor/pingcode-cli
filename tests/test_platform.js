'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const platform = require('../scripts/commands/platform');
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

testInCleanEnv('platform --help shows module help', async () => {
  const output = await captureLogAsync(() => platform.run(['--help']));
  assert.ok(output.includes('PingCode platform'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('participant-add'));
  assert.ok(output.includes('link-create'));
  assert.ok(output.includes('activity-list'));
  assert.ok(output.includes('audit-logs'));
  assert.ok(output.includes('login-logs'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('platform with no args shows module help', async () => {
  const output = await captureLogAsync(() => platform.run([]));
  assert.ok(output.includes('PingCode platform'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('platform subcommands show their own usage', async () => {
  const cases = [
    ['participant-add', ['Usage: pingcode platform participant-add', '--participant-id ID', '--type TYPE', '--review-id ID']],
    ['participant-list', ['Usage: pingcode platform participant-list', '--principal-type TYPE']],
    ['participant-get', ['Usage: pingcode platform participant-get <participant_id>']],
    ['participant-remove', ['Usage: pingcode platform participant-remove <participant_id>']],
    ['link-create', ['Usage: pingcode platform link-create', '--principal-type TYPE', '--target-type TYPE']],
    ['link-get', ['Usage: pingcode platform link-get <relation_id>']],
    ['link-list', ['Usage: pingcode platform link-list', '--target-type TYPE']],
    ['link-remove', ['Usage: pingcode platform link-remove <relation_id>']],
    ['activity-list', ['Usage: pingcode platform activity-list', '--principal-type TYPE']],
    ['activity-get', ['Usage: pingcode platform activity-get <activity_id>']],
    ['audit-logs', ['Usage: pingcode platform audit-logs', '--operated-between RANGE']],
    ['login-logs', ['Usage: pingcode platform login-logs', '--logged-between RANGE']],
  ];
  for (const [sub, expects] of cases) {
    const output = await captureLogAsync(() => platform.run([sub, '--help']));
    for (const expect of expects) {
      assert.ok(output.includes(expect), `${sub} --help should include "${expect}"`);
    }
  }
});

// ── participant-add subcommand ────────────────────────────────────────

testInCleanEnv('participant-add dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-add',
    '63e1bf51760505c8795ebccc',
    '--participant-id', 'a0417f68e846aae315c85d24643678a9',
    '--type', 'user',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/participants');
  assert.strictEqual(parsed.json.principal_type, 'work_item');
  assert.strictEqual(parsed.json.principal_id, '63e1bf51760505c8795ebccc');
  assert.strictEqual(parsed.json.participant_id, 'a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.json.type, 'user');
  assert.strictEqual('resolution' in parsed, false);
});

testInCleanEnv('participant-add dry-run with explicit principal type and review id', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-add',
    '683562430d684517b06b814b',
    '--participant-id', 'a0417f68e846aae315c85d24643678a9',
    '--type', 'user_group',
    '--principal-type', 'idea',
    '--review-id', '6f168f764eba01a5278b87cd',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.json.principal_type, 'idea');
  assert.strictEqual(parsed.json.review_id, '6f168f764eba01a5278b87cd');
  assert.strictEqual(parsed.json.type, 'user_group');
});

testInCleanEnv('participant-add dry-run with review id only omits principal id', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-add',
    '--principal-type', 'idea',
    '--review-id', '6f168f764eba01a5278b87cd',
    '--participant-id', 'a0417f68e846aae315c85d24643678a9',
    '--type', 'user',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/participants');
  assert.strictEqual(parsed.json.principal_type, 'idea');
  assert.strictEqual(parsed.json.review_id, '6f168f764eba01a5278b87cd');
  assert.strictEqual('principal_id' in parsed.json, false);
});

testInCleanEnv('participant-add by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-add',
    'SCR-123',
    '--participant-id', 'a0417f68e846aae315c85d24643678a9',
    '--type', 'user',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-123');
  assert.strictEqual(parsed.add.method, 'POST');
  assert.strictEqual(parsed.add.path, '/v1/participants');
  assert.strictEqual(parsed.add.json.principal_id, '{id}');
  assert.strictEqual(parsed.add.json.participant_id, 'a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('participant-add by identifier resolves then posts', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  const cachePath = tmpFile(os.tmpdir(), `pingcode-platform-${Date.now()}-cache.json`);

  const queue = [
    fakeResponse({ access_token: 'tok', expires_in: 3600 }),
    fakeResponse({ page_size: 30, page_index: 0, total: 1, values: [{ id: 'resolved-id' }] }),
    fakeResponse({ id: 'participant-link-id', type: 'user' }),
  ];
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    calls.push(String(url));
    return queue.shift();
  };

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await platform.run([
      'participant-add',
      'SCR-1',
      '--participant-id', 'a0417f68e846aae315c85d24643678a9',
      '--type', 'user',
      '--workspace-cache', cachePath,
    ]);
  } finally {
    console.log = originalLog;
    global.fetch = originalFetch;
    fs.rmSync(cachePath, { recursive: true, force: true });
  }

  assert.strictEqual(calls.length, 3, 'token, resolution, and add requests expected');
  assert.ok(calls[1].includes('/v1/project/work_items'), 'second call resolves the identifier');
  assert.ok(calls[2].includes('/v1/participants'), 'add targets the participants endpoint');
  const result = JSON.parse(output.trim());
  assert.strictEqual(result.id, 'participant-link-id');
});

testInCleanEnv('participant-add rejects identifier ref for non-work_item principal', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run([
      'participant-add', 'SCR-123',
      '--principal-type', 'idea',
      '--participant-id', 'a0417f68e846aae315c85d24643678a9',
      '--type', 'user',
    ]),
    /only supported for the work_item principal/,
  );
});

testInCleanEnv('participant-add validates principal and participant types', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run([
      'participant-add', '63e1bf51760505c8795ebccc',
      '--participant-id', 'u1',
      '--type', 'user',
      '--principal-type', 'bogus',
    ]),
    /--principal-type must be one of/,
  );
  await assert.rejects(
    () => platform.run([
      'participant-add', '63e1bf51760505c8795ebccc',
      '--participant-id', 'u1',
      '--type', 'robot',
    ]),
    /--type must be one of/,
  );
});

testInCleanEnv('participant-add requires principal, participant id, and type', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['participant-add', '--participant-id', 'u1', '--type', 'user']),
    /A principal id or identifier \(or --review-id\) is required/,
  );
  await assert.rejects(
    () => platform.run(['participant-add', '63e1bf51760505c8795ebccc', '--type', 'user']),
    /--participant-id is required/,
  );
  await assert.rejects(
    () => platform.run(['participant-add', '63e1bf51760505c8795ebccc', '--participant-id', 'u1']),
    /--type is required/,
  );
});

// ── participant-list subcommand ───────────────────────────────────────

testInCleanEnv('participant-list dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-list',
    '63e1bf51760505c8795ebccc',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/participants');
  assert.strictEqual(parsed.params.principal_type, 'work_item');
  assert.strictEqual(parsed.params.principal_id, '63e1bf51760505c8795ebccc');
});

testInCleanEnv('participant-list dry-run with review id only', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-list',
    '--principal-type', 'ticket',
    '--review-id', '6f168f764eba01a5278b87cd',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.params.principal_type, 'ticket');
  assert.strictEqual(parsed.params.review_id, '6f168f764eba01a5278b87cd');
  assert.strictEqual('principal_id' in parsed.params, false);
});

testInCleanEnv('participant-list by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-list', 'SCR-123', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-123');
  assert.strictEqual(parsed.list.method, 'GET');
  assert.strictEqual(parsed.list.path, '/v1/participants');
  assert.strictEqual(parsed.list.params.principal_id, '{id}');
});

testInCleanEnv('participant-list requires a principal id or review id', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['participant-list']),
    /A principal id or identifier \(or --review-id\) is required/,
  );
});

// ── participant-get subcommand ────────────────────────────────────────

testInCleanEnv('participant-get dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-get',
    'a0417f68e846aae315c85d24643678a9',
    '63e1bf51760505c8795ebccc',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/participants/a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.params.principal_type, 'work_item');
  assert.strictEqual(parsed.params.principal_id, '63e1bf51760505c8795ebccc');
});

testInCleanEnv('participant-get by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-get', 'a0417f68e846aae315c85d24643678a9', 'SCR-123', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-123');
  assert.strictEqual(parsed.get.method, 'GET');
  assert.strictEqual(parsed.get.path, '/v1/participants/a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.get.params.principal_id, '{id}');
});

testInCleanEnv('participant-get requires participant and principal ids', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['participant-get']),
    /A participant id is required/,
  );
  await assert.rejects(
    () => platform.run(['participant-get', 'a0417f68e846aae315c85d24643678a9']),
    /A principal id or identifier \(or --review-id\) is required/,
  );
});

// ── participant-remove subcommand ─────────────────────────────────────

testInCleanEnv('participant-remove dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-remove',
    'a0417f68e846aae315c85d24643678a9',
    '63e1bf51760505c8795ebccc',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/participants/a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.params.principal_id, '63e1bf51760505c8795ebccc');
});

testInCleanEnv('participant-remove by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'participant-remove', 'a0417f68e846aae315c85d24643678a9', 'SCR-123', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-123');
  assert.strictEqual(parsed.remove.method, 'DELETE');
  assert.strictEqual(parsed.remove.path, '/v1/participants/a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.remove.params.principal_id, '{id}');
});

testInCleanEnv('participant-remove requires participant and principal ids', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['participant-remove']),
    /A participant id is required/,
  );
  await assert.rejects(
    () => platform.run(['participant-remove', 'a0417f68e846aae315c85d24643678a9']),
    /A principal id or identifier \(or --review-id\) is required/,
  );
});

// ── link-create subcommand ────────────────────────────────────────────

testInCleanEnv('link-create dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'link-create',
    '547000eb6a70571487623fea',
    '5edca524cad2fa1125cb0630',
    '--principal-type', 'test_run',
    '--target-type', 'work_item',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/relations');
  assert.strictEqual(parsed.json.principal_type, 'test_run');
  assert.strictEqual(parsed.json.principal_id, '547000eb6a70571487623fea');
  assert.strictEqual(parsed.json.target_type, 'work_item');
  assert.strictEqual(parsed.json.target_id, '5edca524cad2fa1125cb0630');
});

testInCleanEnv('link-create requires type flags and principal ids', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['link-create']),
    /A principal id and a target id are required/,
  );
  await assert.rejects(
    () => platform.run(['link-create', '547000eb6a70571487623fea', '5edca524cad2fa1125cb0630']),
    /--principal-type is required/,
  );
  await assert.rejects(
    () => platform.run([
      'link-create', '547000eb6a70571487623fea', '5edca524cad2fa1125cb0630',
      '--principal-type', 'test_run',
    ]),
    /--target-type is required/,
  );
  await assert.rejects(
    () => platform.run([
      'link-create', '547000eb6a70571487623fea', '5edca524cad2fa1125cb0630',
      '--principal-type', 'test_run', '--target-type', 'test_plan',
    ]),
    /--target-type must be one of/,
  );
});

// ── link-get subcommand ───────────────────────────────────────────────

testInCleanEnv('link-get dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'link-get', 'fa1125cb06305edca524cad2', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/relations/fa1125cb06305edca524cad2');
});

testInCleanEnv('link-get requires a relation id', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['link-get']),
    /A relation id is required/,
  );
});

// ── link-list subcommand ──────────────────────────────────────────────

testInCleanEnv('link-list dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'link-list',
    '64b4d70ba368e6594360ea24',
    '--principal-type', 'idea',
    '--target-type', 'ticket',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/relations');
  assert.strictEqual(parsed.params.principal_type, 'idea');
  assert.strictEqual(parsed.params.principal_id, '64b4d70ba368e6594360ea24');
  assert.strictEqual(parsed.params.target_type, 'ticket');
});

testInCleanEnv('link-list requires principal and target types', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['link-list']),
    /A principal id is required/,
  );
  await assert.rejects(
    () => platform.run(['link-list', '64b4d70ba368e6594360ea24']),
    /--principal-type is required/,
  );
  await assert.rejects(
    () => platform.run([
      'link-list', '64b4d70ba368e6594360ea24', '--principal-type', 'idea',
    ]),
    /--target-type is required/,
  );
});

// ── link-remove subcommand ────────────────────────────────────────────

testInCleanEnv('link-remove dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'link-remove', 'fa1125cb06305edca524cad2', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/relations/fa1125cb06305edca524cad2');
});

testInCleanEnv('link-remove requires a relation id', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['link-remove']),
    /A relation id is required/,
  );
});

// ── activity-list subcommand ──────────────────────────────────────────

testInCleanEnv('activity-list dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'activity-list',
    '683562430d684517b06b814b',
    '--principal-type', 'idea',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/activities');
  assert.strictEqual(parsed.params.principal_type, 'idea');
  assert.strictEqual(parsed.params.principal_id, '683562430d684517b06b814b');
});

testInCleanEnv('activity-list requires a principal id and type', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['activity-list']),
    /A principal id is required/,
  );
  await assert.rejects(
    () => platform.run(['activity-list', '683562430d684517b06b814b']),
    /--principal-type is required/,
  );
  await assert.rejects(
    () => platform.run([
      'activity-list', '683562430d684517b06b814b', '--principal-type', 'page',
    ]),
    /--principal-type must be one of/,
  );
});

// ── activity-get subcommand ───────────────────────────────────────────

testInCleanEnv('activity-get dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'activity-get',
    '694ae20fdb8e0baef70f7ddb',
    '683562430d684517b06b814b',
    '--principal-type', 'idea',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/activities/694ae20fdb8e0baef70f7ddb');
  assert.strictEqual(parsed.params.principal_type, 'idea');
  assert.strictEqual(parsed.params.principal_id, '683562430d684517b06b814b');
});

testInCleanEnv('activity-get requires activity id, principal id, and type', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['activity-get']),
    /An activity id and a principal id are required/,
  );
  await assert.rejects(
    () => platform.run(['activity-get', '694ae20fdb8e0baef70f7ddb']),
    /An activity id and a principal id are required/,
  );
  await assert.rejects(
    () => platform.run([
      'activity-get', '694ae20fdb8e0baef70f7ddb', '683562430d684517b06b814b',
    ]),
    /--principal-type is required/,
  );
});

// ── audit-logs subcommand ─────────────────────────────────────────────

testInCleanEnv('audit-logs dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'audit-logs',
    '--operated-between', '2024-01-01,2024-02-01',
    '--operated-bys', 'a0417f68e846aae315c85d24643678a9,63c8fb32729dee3334d96af7',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/security/audit_logs');
  assert.strictEqual(parsed.params.operated_between, '2024-01-01,2024-02-01');
  assert.strictEqual(parsed.params.operated_bys, 'a0417f68e846aae315c85d24643678a9,63c8fb32729dee3334d96af7');
});

testInCleanEnv('audit-logs dry-run without optional operators', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'audit-logs', '--operated-between', '2024-01-01,2024-02-01', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.params.operated_between, '2024-01-01,2024-02-01');
  assert.strictEqual('operated_bys' in parsed.params, false);
});

testInCleanEnv('audit-logs requires operated-between', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['audit-logs']),
    /--operated-between is required/,
  );
});

// ── login-logs subcommand ─────────────────────────────────────────────

testInCleanEnv('login-logs dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'login-logs',
    '--logged-between', '2024-01-01,2024-02-01',
    '--user-ids', 'a0417f68e846aae315c85d24643678a9',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/security/login_logs');
  assert.strictEqual(parsed.params.logged_between, '2024-01-01,2024-02-01');
  assert.strictEqual(parsed.params.user_ids, 'a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('login-logs dry-run without optional user ids', async () => {
  setupToken();

  const output = await captureLogAsync(() => platform.run([
    'login-logs', '--logged-between', '2024-01-01,2024-02-01', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.params.logged_between, '2024-01-01,2024-02-01');
  assert.strictEqual('user_ids' in parsed.params, false);
});

testInCleanEnv('login-logs requires logged-between', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['login-logs']),
    /--logged-between is required/,
  );
});

// ── Unknown option / subcommand ───────────────────────────────────────

testInCleanEnv('platform rejects unknown option', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['link-create', '--bogus', 'x']),
    /Unknown option/,
  );
});

testInCleanEnv('platform rejects unknown subcommand', async () => {
  setupToken();
  await assert.rejects(
    () => platform.run(['bogus']),
    /Unknown platform subcommand: bogus/,
  );
});
