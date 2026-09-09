'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const deliverable = require('../scripts/commands/deliverable');
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

testInCleanEnv('deliverable --help shows module help', async () => {
  const output = await captureLogAsync(() => deliverable.run(['--help']));
  assert.ok(output.includes('PingCode deliverable'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('create'));
  assert.ok(output.includes('delete'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('deliverable with no args shows module help', async () => {
  const output = await captureLogAsync(() => deliverable.run([]));
  assert.ok(output.includes('PingCode deliverable'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('deliverable subcommands show their own usage', async () => {
  const cases = [
    ['list', ['Usage: pingcode deliverable list', '--project-id ID', '--work-item-id ID']],
    ['create', ['Usage: pingcode deliverable create', '--work-item-id ID', '--name NAME', '--content-type TYPE', '--content JSON']],
    ['get', ['Usage: pingcode deliverable get <deliverable_target_id>']],
    ['update', ['Usage: pingcode deliverable update <deliverable_target_id>', '--content JSON']],
    ['delete', ['Usage: pingcode deliverable delete <deliverable_target_id>']],
  ];
  for (const [sub, expects] of cases) {
    const output = await captureLogAsync(() => deliverable.run([sub, '--help']));
    for (const expect of expects) {
      assert.ok(output.includes(expect), `${sub} --help should include "${expect}"`);
    }
  }
});

// ── List subcommand ───────────────────────────────────────────────────

testInCleanEnv('deliverable list dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => deliverable.run([
    'list',
    '--project-id', '6375cc81e3004de4ea14aa52',
    '--work-item-id', '63761fee31caaf77189816b4',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/deliverables');
  assert.strictEqual(parsed.params.project_id, '6375cc81e3004de4ea14aa52');
  assert.strictEqual(parsed.params.work_item_id, '63761fee31caaf77189816b4');
});

testInCleanEnv('deliverable list rejects unknown option', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['list', '--unknown-flag']),
    /Unknown option/,
  );
});

// ── Create subcommand ─────────────────────────────────────────────────

testInCleanEnv('deliverable create dry-run posts body', async () => {
  setupToken();

  const output = await captureLogAsync(() => deliverable.run([
    'create',
    '--work-item-id', '63761fee31caaf77189816b4',
    '--name', '阶段交付目标',
    '--content-type', 'link',
    '--content', '{"name":"PingCode","href":"https://www.pingcode.com"}',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/deliverables');
  assert.strictEqual(parsed.json.work_item_id, '63761fee31caaf77189816b4');
  assert.strictEqual(parsed.json.name, '阶段交付目标');
  assert.strictEqual(parsed.json.content_type, 'link');
  assert.deepStrictEqual(parsed.json.content, {
    name: 'PingCode',
    href: 'https://www.pingcode.com',
  });
});

testInCleanEnv('deliverable create requires a work item id', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['create', '--name', '阶段交付目标']),
    /--work-item-id is required/,
  );
});

testInCleanEnv('deliverable create requires a name', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['create', '--work-item-id', '63761fee31caaf77189816b4']),
    /--name is required/,
  );
});

testInCleanEnv('deliverable create rejects non-object content', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run([
      'create',
      '--work-item-id', '63761fee31caaf77189816b4',
      '--name', '阶段交付目标',
      '--content', '[1,2]',
    ]),
    /--content must be a JSON object/,
  );
  await assert.rejects(
    () => deliverable.run([
      'create',
      '--work-item-id', '63761fee31caaf77189816b4',
      '--name', '阶段交付目标',
      '--content', 'not-json',
    ]),
    /--content must be valid JSON/,
  );
});

// ── Get subcommand ────────────────────────────────────────────────────

testInCleanEnv('deliverable get dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => deliverable.run([
    'get',
    '63761fee31caaf7718981876',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/deliverables/63761fee31caaf7718981876');
});

testInCleanEnv('deliverable get requires a deliverable target id', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['get']),
    /A deliverable target id is required/,
  );
});

// ── Update subcommand ─────────────────────────────────────────────────

testInCleanEnv('deliverable update dry-run patches fields', async () => {
  setupToken();

  const output = await captureLogAsync(() => deliverable.run([
    'update',
    '63761fee31caaf7718981876',
    '--name', '新交付目标',
    '--content', '{"name":"Wiki","href":"https://www.pingcode.com/wiki"}',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/pjm/deliverables/63761fee31caaf7718981876');
  assert.strictEqual(parsed.json.name, '新交付目标');
  assert.deepStrictEqual(parsed.json.content, {
    name: 'Wiki',
    href: 'https://www.pingcode.com/wiki',
  });
  assert.strictEqual('work_item_id' in parsed.json, false);
  assert.strictEqual('content_type' in parsed.json, false);
});

testInCleanEnv('deliverable update requires a deliverable target id', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['update', '--name', '新交付目标']),
    /A deliverable target id is required/,
  );
});

testInCleanEnv('deliverable update requires a field to update', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['update', '63761fee31caaf7718981876']),
    /At least one field to update is required/,
  );
});

// ── Delete subcommand ─────────────────────────────────────────────────

testInCleanEnv('deliverable delete dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => deliverable.run([
    'delete',
    '63761fee31caaf7718981876',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/pjm/deliverables/63761fee31caaf7718981876');
});

testInCleanEnv('deliverable delete requires a deliverable target id', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['delete']),
    /A deliverable target id is required/,
  );
});

// ── Unknown subcommand ─────────────────────────────────────────────────

testInCleanEnv('deliverable unknown subcommand errors', async () => {
  setupToken();
  await assert.rejects(
    () => deliverable.run(['unknown']),
    /Unknown deliverable subcommand/,
  );
});
