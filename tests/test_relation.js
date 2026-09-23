'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const relation = require('../scripts/commands/relation');
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

testInCleanEnv('relation --help shows module help', async () => {
  const output = await captureLogAsync(() => relation.run(['--help']));
  assert.ok(output.includes('PingCode relation'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('add'));
  assert.ok(output.includes('type-list'));
  assert.ok(output.includes('type-get'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('relation with no args shows module help', async () => {
  const output = await captureLogAsync(() => relation.run([]));
  assert.ok(output.includes('PingCode relation'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('relation subcommands show their own usage', async () => {
  const cases = [
    ['add', ['Usage: pingcode relation add', '--relation-type TYPE']],
    ['get', ['Usage: pingcode relation get <relation_id> <work_item_id|identifier>']],
    ['list', ['Usage: pingcode relation list <work_item_id|identifier>', '--relation-type TYPE']],
    ['remove', ['Usage: pingcode relation remove <relation_id> <work_item_id|identifier>']],
    ['type-list', ['Usage: pingcode relation type-list']],
    ['type-get', ['Usage: pingcode relation type-get <relation_type_id>']],
  ];
  for (const [sub, expects] of cases) {
    const output = await captureLogAsync(() => relation.run([sub, '--help']));
    for (const expect of expects) {
      assert.ok(output.includes(expect), `${sub} --help should include "${expect}"`);
    }
  }
});

// ── Add subcommand ────────────────────────────────────────────────────

testInCleanEnv('relation add dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'add',
    '5edca524cad2b06305cfa112',
    '5f9a65ef20ef8153c1462e64',
    '--relation-type', 'relate',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/work_items/5edca524cad2b06305cfa112/relations');
  assert.strictEqual(parsed.json.target_work_item_id, '5f9a65ef20ef8153c1462e64');
  assert.strictEqual(parsed.json.relation_type, 'relate');
  assert.strictEqual('resolution' in parsed, false);
});

testInCleanEnv('relation add by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'add',
    'SCR-4',
    '5f9a65ef20ef8153c1462e64',
    '--relation-type', 'duplicate',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-4');
  assert.strictEqual(parsed.add.method, 'POST');
  assert.strictEqual(parsed.add.path, '/v1/pjm/work_items/{id}/relations');
  assert.strictEqual(parsed.add.json.relation_type, 'duplicate');
  assert.strictEqual(parsed.add.json.target_work_item_id, '5f9a65ef20ef8153c1462e64');
});

testInCleanEnv('relation add requires positional args', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['add', '--relation-type', 'relate']),
    /A work item id or identifier and a target work item id are required/,
  );
  await assert.rejects(
    () => relation.run(['add', 'SCR-4']),
    /A work item id or identifier and a target work item id are required/,
  );
});

testInCleanEnv('relation add requires a relation type', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['add', 'SCR-4', '5f9a65ef20ef8153c1462e64']),
    /--relation-type is required/,
  );
});

testInCleanEnv('relation add rejects unknown option', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['add', 'SCR-4', '5f9a65ef20ef8153c1462e64', '--relation-type', 'relate', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('relation add rejects extra positional arguments', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['add', 'SCR-4', 'target-1', 'target-2', '--relation-type', 'relate']),
    /Unexpected argument/,
  );
});

// ── Get subcommand ────────────────────────────────────────────────────

testInCleanEnv('relation get dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'get',
    '58fb35de50ef8153c2062e36',
    '5edca524cad2b06305cfa112',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_items/5edca524cad2b06305cfa112/relations/58fb35de50ef8153c2062e36');
  assert.strictEqual('resolution' in parsed, false);
});

testInCleanEnv('relation get by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'get',
    '58fb35de50ef8153c2062e36',
    'SCR-4',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-4');
  assert.strictEqual(parsed.get.method, 'GET');
  assert.strictEqual(parsed.get.path, '/v1/pjm/work_items/{id}/relations/58fb35de50ef8153c2062e36');
});

testInCleanEnv('relation get requires a relation id and a work item ref', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['get']),
    /A relation id and a work item id or identifier are required/,
  );
  await assert.rejects(
    () => relation.run(['get', '58fb35de50ef8153c2062e36']),
    /A relation id and a work item id or identifier are required/,
  );
});

// ── List subcommand ───────────────────────────────────────────────────

testInCleanEnv('relation list dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'list',
    '5edca524cad2b06305cfa112',
    '--relation-type', 'block',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_items/5edca524cad2b06305cfa112/relations');
  assert.strictEqual(parsed.params.relation_type, 'block');
  assert.strictEqual('resolution' in parsed, false);
});

testInCleanEnv('relation list by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'list',
    'SCR-4',
    '--relation-type', 'block',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-4');
  assert.strictEqual(parsed.list.method, 'GET');
  assert.strictEqual(parsed.list.path, '/v1/pjm/work_items/{id}/relations');
  assert.strictEqual(parsed.list.params.relation_type, 'block');
});

testInCleanEnv('relation list requires a work item ref', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['list']),
    /A work item id or identifier is required/,
  );
});

// ── Remove subcommand ─────────────────────────────────────────────────

testInCleanEnv('relation remove dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'remove',
    '58fb35de50ef8153c2062e36',
    '5edca524cad2b06305cfa112',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/pjm/work_items/5edca524cad2b06305cfa112/relations/58fb35de50ef8153c2062e36');
});

testInCleanEnv('relation remove by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'remove',
    '58fb35de50ef8153c2062e36',
    'SCR-4',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-4');
  assert.strictEqual(parsed.remove.method, 'DELETE');
  assert.strictEqual(parsed.remove.path, '/v1/pjm/work_items/{id}/relations/58fb35de50ef8153c2062e36');
});

testInCleanEnv('relation remove requires a relation id and a work item ref', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['remove']),
    /A relation id and a work item id or identifier are required/,
  );
  await assert.rejects(
    () => relation.run(['remove', '58fb35de50ef8153c2062e36']),
    /A relation id and a work item id or identifier are required/,
  );
});

// ── Type-list subcommand ──────────────────────────────────────────────

testInCleanEnv('relation type-list dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'type-list',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item/relation_types');
});

// ── Type-get subcommand ───────────────────────────────────────────────

testInCleanEnv('relation type-get dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'type-get',
    '676510af06fd48a4a4e12616',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_relation_types/676510af06fd48a4a4e12616');
});

testInCleanEnv('relation type-get requires a relation type id', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['type-get']),
    /A relation type id is required/,
  );
});

// ── Unknown subcommand ─────────────────────────────────────────────────

testInCleanEnv('relation unknown subcommand errors', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['unknown']),
    /Unknown relation subcommand/,
  );
});

// ── Create subcommand (generic cross-resource association) ────────────

testInCleanEnv('relation create --help shows usage', async () => {
  const output = await captureLogAsync(() => relation.run(['create', '--help']));
  assert.ok(output.includes('Usage: pingcode relation create'));
  assert.ok(output.includes('--principal-type TYPE'));
  assert.ok(output.includes('--target-type TYPE'));
  assert.ok(output.includes('--target-id ID'));
});

testInCleanEnv('relation create dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'create',
    '--principal-type', 'workitem',
    '--principal-id', '6a4b0b9a5c980582561877af',
    '--target-type', 'idea',
    '--target-id', '681023e372a449eae7986a2b',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/relations');
  assert.deepStrictEqual(parsed.json, {
    principal_type: 'workitem',
    principal_id: '6a4b0b9a5c980582561877af',
    target_type: 'idea',
    target_id: '681023e372a449eae7986a2b',
  });
});

testInCleanEnv('relation create accepts equals-style flags', async () => {
  setupToken();

  const output = await captureLogAsync(() => relation.run([
    'create',
    '--principal-type=workitem',
    '--principal-id=6a4b0b9a5c980582561877af',
    '--target-type=idea',
    '--target-id=681023e372a449eae7986a2b',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.path, '/v1/relations');
  assert.strictEqual(parsed.json.principal_type, 'workitem');
  assert.strictEqual(parsed.json.target_type, 'idea');
});

testInCleanEnv('relation create rejects positional arguments', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['create', 'SCR-4']),
    /relation create uses flag options only/,
  );
});

testInCleanEnv('relation create requires all four flags', async () => {
  setupToken();
  await assert.rejects(
    () => relation.run(['create', '--principal-type', 'workitem']),
    /--principal-id is required/,
  );
  await assert.rejects(
    () => relation.run(['create', '--principal-type', 'workitem', '--principal-id', 'A', '--target-type', 'idea']),
    /--target-id is required/,
  );
});
