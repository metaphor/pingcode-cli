'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const product = require('../scripts/commands/product');
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

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('product --help shows module help', async () => {
  const output = await captureLogAsync(() => product.run(['--help']));
  assert.ok(output.includes('PingCode product'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('get'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('product with no args shows module help', async () => {
  const output = await captureLogAsync(() => product.run([]));
  assert.ok(output.includes('PingCode product'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('product list --help shows list-specific usage', async () => {
  const output = await captureLogAsync(() => product.run(['list', '--help']));
  assert.ok(output.includes('Usage: pingcode product list [options]'));
  assert.ok(output.includes('--keywords'));
  assert.ok(output.includes('--limit'));
});

testInCleanEnv('product get --help shows get-specific usage', async () => {
  const output = await captureLogAsync(() => product.run(['get', '--help']));
  assert.ok(output.includes('Usage: pingcode product get <id|name>'));
});

// ── List subcommand ───────────────────────────────────────────────────

testInCleanEnv('product list dry-run builds correct request', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));

  const output = await captureLogAsync(() => product.run([
    'list',
    '--keywords', '核心',
    '--limit', '5',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/ship/products');
  assert.strictEqual(parsed.params.keywords, '核心');
  assert.strictEqual(parsed.params.page_size, '5');
});

testInCleanEnv('product list rejects unknown option', async () => {
  await assert.rejects(
    () => product.run(['list', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('product list requires value for keywords', async () => {
  await assert.rejects(
    () => product.run(['list', '--keywords']),
    /Flag --keywords requires a value/,
  );
});

// ── Get subcommand ────────────────────────────────────────────────────

testInCleanEnv('product get dry-run builds correct request', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));

  const output = await captureLogAsync(() => product.run([
    'get',
    '6422711c3f12e6c1e46d40e9',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/ship/products/6422711c3f12e6c1e46d40e9');
});

testInCleanEnv('product get requires a product id or name', async () => {
  await assert.rejects(
    () => product.run(['get']),
    /A product id or name is required/,
  );
});

testInCleanEnv('product get rejects extra positional arguments', async () => {
  await assert.rejects(
    () => product.run(['get', 'id1', 'id2']),
    /Unexpected argument/,
  );
});

// ── Unknown subcommand ─────────────────────────────────────────────────

testInCleanEnv('product unknown subcommand errors', async () => {
  await assert.rejects(
    () => product.run(['unknown']),
    /Unknown product subcommand/,
  );
});

// ── Extended subcommands (Wave 4) ─────────────────────────────────────

const EXTENDED_SUBCOMMANDS = [
  'create', 'update',
  'member-add', 'member-get', 'member-list', 'member-remove',
  'tag-add', 'tag-get', 'tag-list', 'tag-remove',
  'suite-add', 'suite-get', 'suite-list', 'suite-delete',
  'plan-list', 'plan-get',
  'channel-list', 'channel-get',
  'ticket-type-list', 'ticket-type-get',
  'customer-list', 'customer-create', 'customer-get', 'customer-update',
  'extuser-list', 'extuser-create', 'extuser-get', 'extuser-update', 'extuser-delete',
];

const PID = '6422711c3f12e6c1e46d40e9';

function setupToken() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

testInCleanEnv('product --help lists extended subcommands', async () => {
  const output = await captureLogAsync(() => product.run(['--help']));
  for (const sub of EXTENDED_SUBCOMMANDS) {
    assert.ok(output.includes(sub), `help should mention ${sub}`);
  }
});

testInCleanEnv('every product subcommand has --help usage', async () => {
  for (const sub of EXTENDED_SUBCOMMANDS) {
    const output = await captureLogAsync(() => product.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode product ${sub}`),
      `${sub} --help should print its usage`,
    );
  }
});

// ── create / update ───────────────────────────────────────────────────

testInCleanEnv('product create dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'create',
    '--name', '示例产品',
    '--identifier', 'DEMO',
    '--description', '示例产品描述',
    '--visibility', 'public',
    '--scope-type', 'user_group',
    '--scope-id', 'team123',
    '--members', '[{"id":"u1","type":"user"},{"id":"g1","type":"user_group"}]',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/ship/products');
  assert.strictEqual(parsed.json.name, '示例产品');
  assert.strictEqual(parsed.json.identifier, 'DEMO');
  assert.strictEqual(parsed.json.description, '示例产品描述');
  assert.strictEqual(parsed.json.visibility, 'public');
  assert.strictEqual(parsed.json.scope_type, 'user_group');
  assert.strictEqual(parsed.json.scope_id, 'team123');
  assert.deepStrictEqual(parsed.json.members, [
    { id: 'u1', type: 'user' },
    { id: 'g1', type: 'user_group' },
  ]);
});

testInCleanEnv('product create requires name and identifier', async () => {
  await assert.rejects(() => product.run(['create', '--identifier', 'DEMO']), /--name is required/);
  await assert.rejects(() => product.run(['create', '--name', 'X']), /--identifier is required/);
});

testInCleanEnv('product create rejects unexpected positional', async () => {
  await assert.rejects(() => product.run(['create', 'extra']), /Unexpected argument/);
});

testInCleanEnv('product update dry-run sends PATCH with fields', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'update', PID,
    '--name', '新名称',
    '--identifier', 'NEWID',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}`);
  assert.strictEqual(parsed.json.name, '新名称');
  assert.strictEqual(parsed.json.identifier, 'NEWID');
});

testInCleanEnv('product update requires id and at least one field', async () => {
  await assert.rejects(() => product.run(['update']), /A product id is required/);
  await assert.rejects(() => product.run(['update', PID]), /At least one field to update is required/);
});

// ── members ───────────────────────────────────────────────────────────

testInCleanEnv('product member-add dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'member-add', PID,
    '--member-id', 'a0417f68e846aae315c85d24643678a9',
    '--member-type', 'user',
    '--role-id', 'role123',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/members`);
  assert.strictEqual(parsed.json.member.id, 'a0417f68e846aae315c85d24643678a9');
  assert.strictEqual(parsed.json.member.type, 'user');
  assert.strictEqual(parsed.json.role_id, 'role123');
});

testInCleanEnv('product member-add validates member fields', async () => {
  await assert.rejects(
    () => product.run(['member-add', PID]),
    /--member-id is required/,
  );
  await assert.rejects(
    () => product.run(['member-add', PID, '--member-id', 'u1']),
    /--member-type is required/,
  );
  await assert.rejects(
    () => product.run(['member-add', PID, '--member-id', 'u1', '--member-type', 'bogus']),
    /--member-type must be one of/,
  );
});

testInCleanEnv('product member-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['member-get', PID, 'abc123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/members/abc123`);
});

testInCleanEnv('product member-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['member-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/members`);
});

testInCleanEnv('product member-remove dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['member-remove', PID, 'abc123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/members/abc123`);
});

testInCleanEnv('product member subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['member-get']), /A product id is required/);
  await assert.rejects(() => product.run(['member-get', PID]), /A member id is required/);
  await assert.rejects(() => product.run(['member-list']), /A product id is required/);
  await assert.rejects(() => product.run(['member-remove', PID]), /A member id is required/);
  await assert.rejects(() => product.run(['member-get', PID, 'a', 'b']), /Unexpected argument/);
});

// ── tags ──────────────────────────────────────────────────────────────

testInCleanEnv('product tag-add dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['tag-add', PID, '--name', '标签-1', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/tags`);
  assert.strictEqual(parsed.json.name, '标签-1');
});

testInCleanEnv('product tag-add requires name', async () => {
  await assert.rejects(() => product.run(['tag-add', PID]), /--name is required/);
});

testInCleanEnv('product tag-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['tag-get', PID, 'tag123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/tags/tag123`);
});

testInCleanEnv('product tag-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['tag-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/tags`);
});

testInCleanEnv('product tag-remove dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['tag-remove', PID, 'tag123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/tags/tag123`);
});

testInCleanEnv('product tag subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['tag-get']), /A product id is required/);
  await assert.rejects(() => product.run(['tag-get', PID]), /A tag id is required/);
  await assert.rejects(() => product.run(['tag-list']), /A product id is required/);
  await assert.rejects(() => product.run(['tag-remove', PID]), /A tag id is required/);
});

// ── suites ────────────────────────────────────────────────────────────

testInCleanEnv('product suite-add dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'suite-add', PID,
    '--name', '技术支持确认',
    '--type', 'module',
    '--parent-id', 'suite123',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/suites`);
  assert.strictEqual(parsed.json.name, '技术支持确认');
  assert.strictEqual(parsed.json.type, 'module');
  assert.strictEqual(parsed.json.parent_id, 'suite123');
});

testInCleanEnv('product suite-add validates name and type', async () => {
  await assert.rejects(() => product.run(['suite-add', PID]), /--name is required/);
  await assert.rejects(() => product.run(['suite-add', PID, '--name', 'X']), /--type is required/);
  await assert.rejects(
    () => product.run(['suite-add', PID, '--name', 'X', '--type', 'bogus']),
    /--type must be one of/,
  );
});

testInCleanEnv('product suite-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['suite-get', PID, 'suite123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/suites/suite123`);
});

testInCleanEnv('product suite-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['suite-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/suites`);
});

testInCleanEnv('product suite-delete dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['suite-delete', PID, 'suite123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/suites/suite123`);
});

testInCleanEnv('product suite subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['suite-get']), /A product id is required/);
  await assert.rejects(() => product.run(['suite-get', PID]), /A suite id is required/);
  await assert.rejects(() => product.run(['suite-list']), /A product id is required/);
  await assert.rejects(() => product.run(['suite-delete', PID]), /A suite id is required/);
});

// ── plans ─────────────────────────────────────────────────────────────

testInCleanEnv('product plan-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['plan-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/plans`);
});

testInCleanEnv('product plan-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['plan-get', PID, 'plan123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/plans/plan123`);
});

testInCleanEnv('product plan subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['plan-list']), /A product id is required/);
  await assert.rejects(() => product.run(['plan-get', PID]), /A plan id is required/);
});

// ── channels ──────────────────────────────────────────────────────────

testInCleanEnv('product channel-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['channel-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/channels`);
});

testInCleanEnv('product channel-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['channel-get', PID, 'ch123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/channels/ch123`);
});

testInCleanEnv('product channel subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['channel-list']), /A product id is required/);
  await assert.rejects(() => product.run(['channel-get', PID]), /A channel id is required/);
});

// ── ticket types ──────────────────────────────────────────────────────

testInCleanEnv('product ticket-type-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['ticket-type-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/ticket_types`);
});

testInCleanEnv('product ticket-type-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['ticket-type-get', PID, 'tt123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/ticket_types/tt123`);
});

testInCleanEnv('product ticket-type subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['ticket-type-list']), /A product id is required/);
  await assert.rejects(() => product.run(['ticket-type-get', PID]), /A ticket type id is required/);
});

// ── customers ─────────────────────────────────────────────────────────

testInCleanEnv('product customer-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['customer-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/customers`);
});

testInCleanEnv('product customer-create dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'customer-create', PID,
    '--name', '上海XX新零售有限公司',
    '--assignee-id', 'u1',
    '--scale', '200',
    '--description', '客户描述',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/customers`);
  assert.strictEqual(parsed.json.name, '上海XX新零售有限公司');
  assert.strictEqual(parsed.json.assignee_id, 'u1');
  assert.strictEqual(parsed.json.scale, 200);
  assert.strictEqual(parsed.json.description, '客户描述');
});

testInCleanEnv('product customer-create requires name', async () => {
  await assert.rejects(() => product.run(['customer-create', PID]), /--name is required/);
});

testInCleanEnv('product customer-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['customer-get', PID, 'cust123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/customers/cust123`);
});

testInCleanEnv('product customer-update dry-run sends PATCH with fields', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'customer-update', PID, 'cust123',
    '--scale', '300',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/customers/cust123`);
  assert.strictEqual(parsed.json.scale, 300);
});

testInCleanEnv('product customer-update requires id and a field', async () => {
  await assert.rejects(() => product.run(['customer-update']), /A product id is required/);
  await assert.rejects(() => product.run(['customer-update', PID]), /A customer id is required/);
  await assert.rejects(() => product.run(['customer-update', PID, 'cust123']), /At least one field to update is required/);
});

testInCleanEnv('product customer subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['customer-list']), /A product id is required/);
  await assert.rejects(() => product.run(['customer-get', PID]), /A customer id is required/);
});

// ── external users ────────────────────────────────────────────────────

testInCleanEnv('product extuser-list dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['extuser-list', PID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/users`);
});

testInCleanEnv('product extuser-create dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'extuser-create', PID,
    '--name', 'jack',
    '--email', 'jack@email.com',
    '--customer-id', 'cust123',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/users`);
  assert.strictEqual(parsed.json.name, 'jack');
  assert.strictEqual(parsed.json.email, 'jack@email.com');
  assert.strictEqual(parsed.json.customer_id, 'cust123');
});

testInCleanEnv('product extuser-create accepts mobile instead of email', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'extuser-create', PID,
    '--name', 'jack',
    '--mobile', '13800138000',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.json.mobile, '13800138000');
  assert.strictEqual(parsed.json.email, undefined);
});

testInCleanEnv('product extuser-create requires name and email or mobile', async () => {
  await assert.rejects(() => product.run(['extuser-create', PID]), /--name is required/);
  await assert.rejects(
    () => product.run(['extuser-create', PID, '--name', 'jack']),
    /Either --email or --mobile is required/,
  );
});

testInCleanEnv('product extuser-get dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['extuser-get', PID, 'user123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/users/user123`);
});

testInCleanEnv('product extuser-update dry-run sends PATCH with customer', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run([
    'extuser-update', PID, 'user123',
    '--customer-id', 'cust123',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/users/user123`);
  assert.strictEqual(parsed.json.customer_id, 'cust123');
});

testInCleanEnv('product extuser-update requires customer id', async () => {
  await assert.rejects(() => product.run(['extuser-update']), /A product id is required/);
  await assert.rejects(() => product.run(['extuser-update', PID]), /An user id is required/);
  await assert.rejects(
    () => product.run(['extuser-update', PID, 'user123']),
    /--customer-id is required/,
  );
});

testInCleanEnv('product extuser-delete dry-run builds correct request', async () => {
  setupToken();
  const output = await captureLogAsync(() => product.run(['extuser-delete', PID, 'user123', '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/ship/products/${PID}/users/user123`);
});

testInCleanEnv('product extuser subcommands require positional ids', async () => {
  await assert.rejects(() => product.run(['extuser-list']), /A product id is required/);
  await assert.rejects(() => product.run(['extuser-get', PID]), /An user id is required/);
  await assert.rejects(() => product.run(['extuser-delete', PID]), /An user id is required/);
});

// ── Unknown options on new parsers ────────────────────────────────────

testInCleanEnv('extended subcommands reject unknown options', async () => {
  await assert.rejects(() => product.run(['customer-create', PID, '--bogus', 'x']), /Unknown option/);
  await assert.rejects(() => product.run(['member-add', PID, '--nope=1']), /Unknown option/);
});
