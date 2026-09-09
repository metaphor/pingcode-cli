'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const ticket = require('../scripts/commands/ticket');
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

function mockToken() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

const PRODUCT_ID = '6422711c3f12e6c1e46d40e9';
const TICKET_ID = '63eca888a0a13a3efc8d4a43';
const TYPE_ID = '63bb744214bd13c9def24ca9';
const STATE_ID = '63eca880a0a13a3efc8d49d9';
const PRIORITY_ID = '5cb9466afda1ce4ca0090005';
const SOLUTION_ID = '62f217ae16e3661a20124330';
const CHANNEL_ID = '63eca881a0a13a3efc8d49ed';
const CUSTOMER_ID = '63eca881a0a13a3efc8d49fc';
const USER_ID = 'a0417f68e846aae315c85d24643678a9';
const HISTORY_ID = '64c3676c983bb9481ee1eea5';
const STATE_PLAN_ID = '63feb3da9cc1ead1d2be93f4';
const PROPERTY_PLAN_ID = '5f8a21f18ef715265de90c21';
const STATE_FLOW_ID = '63feb3da9cc1ead1d2be93fd';
const TICKET_PROPERTY_ID = 'severity';
const FROM_STATE_ID = '63bb744214bd13c9def24ca5';

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('ticket --help shows module help', async () => {
  const output = await captureLogAsync(() => ticket.run(['--help']));
  assert.ok(output.includes('PingCode ticket'));
  assert.ok(output.includes('Subcommands:'));
  for (const sub of ['list', 'get', 'create', 'update', 'search', 'transitions', 'transition',
    'types', 'states', 'properties', 'channels', 'priorities', 'solutions', 'tags',
    'state-resource-create', 'state-resource-get', 'state-resource-update', 'state-resource-list-all',
    'state-plan-list', 'state-plan-get',
    'state-plan-state-add', 'state-plan-state-get', 'state-plan-state-list', 'state-plan-state-remove',
    'state-plan-flow-add', 'state-plan-flow-get', 'state-plan-flow-list', 'state-plan-flow-remove',
    'property-resource-create', 'property-resource-get', 'property-resource-update', 'property-resource-list-all',
    'property-plan-list', 'property-plan-get',
    'property-plan-property-add', 'property-plan-property-get', 'property-plan-property-list', 'property-plan-property-remove',
    'type-resource-list', 'type-resource-get',
    'priority-resource-list', 'priority-resource-get',
    'solution-list', 'solution-get']) {
    assert.ok(output.includes(sub), `help should mention ${sub}`);
  }
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('ticket with no args shows module help', async () => {
  const output = await captureLogAsync(() => ticket.run([]));
  assert.ok(output.includes('PingCode ticket'));
});

// ── Subcommand help ───────────────────────────────────────────────────

testInCleanEnv('every ticket subcommand --help shows Usage', async () => {
  const subcommands = ['list', 'get', 'create', 'update', 'search', 'transitions', 'transition',
    'types', 'states', 'properties', 'channels', 'priorities', 'solutions', 'tags',
    'state-resource-create', 'state-resource-get', 'state-resource-update', 'state-resource-list-all',
    'state-plan-list', 'state-plan-get',
    'state-plan-state-add', 'state-plan-state-get', 'state-plan-state-list', 'state-plan-state-remove',
    'state-plan-flow-add', 'state-plan-flow-get', 'state-plan-flow-list', 'state-plan-flow-remove',
    'property-resource-create', 'property-resource-get', 'property-resource-update', 'property-resource-list-all',
    'property-plan-list', 'property-plan-get',
    'property-plan-property-add', 'property-plan-property-get', 'property-plan-property-list', 'property-plan-property-remove',
    'type-resource-list', 'type-resource-get',
    'priority-resource-list', 'priority-resource-get',
    'solution-list', 'solution-get'];
  for (const sub of subcommands) {
    const output = await captureLogAsync(() => ticket.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode ticket ${sub}`),
      `${sub} --help should show usage`,
    );
  }
});

// ── List subcommand ───────────────────────────────────────────────────

testInCleanEnv('ticket list dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'list',
    '--product', PRODUCT_ID,
    '--type', TYPE_ID,
    '--state', STATE_ID,
    '--priority', PRIORITY_ID,
    '--keywords', '网络',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/ship/tickets');
  assert.strictEqual(parsed.params.product_id, PRODUCT_ID);
  assert.strictEqual(parsed.params.type_id, TYPE_ID);
  assert.strictEqual(parsed.params.state_id, STATE_ID);
  assert.strictEqual(parsed.params.priority_id, PRIORITY_ID);
  assert.strictEqual(parsed.params.keywords, '网络');
});

testInCleanEnv('ticket list with include-public-image-token sets param', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'list',
    '--include-public-image-token',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/ship/tickets');
  assert.strictEqual(parsed.params.include_public_image_token, 'description');
});

testInCleanEnv('ticket list rejects unknown option', async () => {
  await assert.rejects(
    () => ticket.run(['list', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('ticket list requires value for keywords', async () => {
  await assert.rejects(
    () => ticket.run(['list', '--keywords']),
    /Flag --keywords requires a value/,
  );
});

testInCleanEnv('ticket list rejects non-raw product id', async () => {
  mockToken();

  await assert.rejects(
    () => ticket.run(['list', '--product', 'not-an-id', '--dry-run']),
    /--product must be a raw id/,
  );
});

// ── Get subcommand ────────────────────────────────────────────────────

testInCleanEnv('ticket get dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'get', TICKET_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/tickets/${TICKET_ID}`);
});

testInCleanEnv('ticket get with include-public-image-token sets param', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'get', TICKET_ID, '--include-public-image-token', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.params.include_public_image_token, 'description');
});

testInCleanEnv('ticket get requires a ticket id', async () => {
  await assert.rejects(
    () => ticket.run(['get']),
    /A ticket id is required/,
  );
});

testInCleanEnv('ticket get rejects extra positional arguments', async () => {
  await assert.rejects(
    () => ticket.run(['get', TICKET_ID, TICKET_ID]),
    /Unexpected argument/,
  );
});

testInCleanEnv('ticket get rejects unknown option', async () => {
  await assert.rejects(
    () => ticket.run(['get', TICKET_ID, '--bogus']),
    /Unknown option/,
  );
});

// ── Create subcommand ─────────────────────────────────────────────────

testInCleanEnv('ticket create dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'create',
    '--product', PRODUCT_ID,
    '--title', '希望新增支持第三方账号注册',
    '--type', TYPE_ID,
    '--description', '<p>描述</p>',
    '--submitter', USER_ID,
    '--customer', CUSTOMER_ID,
    '--channel', CHANNEL_ID,
    '--assignee', USER_ID,
    '--priority', PRIORITY_ID,
    '--properties', '{"prop_a":"value_a"}',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/ship/tickets');
  assert.strictEqual(parsed.json.product_id, PRODUCT_ID);
  assert.strictEqual(parsed.json.title, '希望新增支持第三方账号注册');
  assert.strictEqual(parsed.json.type_id, TYPE_ID);
  assert.strictEqual(parsed.json.description, '<p>描述</p>');
  assert.strictEqual(parsed.json.submitter_id, USER_ID);
  assert.strictEqual(parsed.json.customer_id, CUSTOMER_ID);
  assert.strictEqual(parsed.json.channel_id, CHANNEL_ID);
  assert.strictEqual(parsed.json.assignee_id, USER_ID);
  assert.strictEqual(parsed.json.priority_id, PRIORITY_ID);
  assert.deepStrictEqual(parsed.json.properties, { prop_a: 'value_a' });
});

testInCleanEnv('ticket create with minimal required fields', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'create',
    '--product', PRODUCT_ID,
    '--title', 'Bug report',
    '--type', TYPE_ID,
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.json.product_id, PRODUCT_ID);
  assert.strictEqual(parsed.json.title, 'Bug report');
  assert.strictEqual(parsed.json.type_id, TYPE_ID);
  assert.strictEqual(Object.keys(parsed.json).length, 3);
});

testInCleanEnv('ticket create requires product', async () => {
  await assert.rejects(
    () => ticket.run(['create', '--title', 't', '--type', TYPE_ID]),
    /--product is required/,
  );
});

testInCleanEnv('ticket create requires title', async () => {
  await assert.rejects(
    () => ticket.run(['create', '--product', PRODUCT_ID, '--type', TYPE_ID]),
    /--title is required/,
  );
});

testInCleanEnv('ticket create requires type', async () => {
  await assert.rejects(
    () => ticket.run(['create', '--product', PRODUCT_ID, '--title', 't']),
    /--type is required/,
  );
});

testInCleanEnv('ticket create rejects invalid properties JSON', async () => {
  mockToken();

  await assert.rejects(
    () => ticket.run([
      'create',
      '--product', PRODUCT_ID,
      '--title', 't',
      '--type', TYPE_ID,
      '--properties', 'not-json',
      '--dry-run',
    ]),
    /--properties must be valid JSON/,
  );
});

testInCleanEnv('ticket create rejects non-raw priority id', async () => {
  mockToken();

  await assert.rejects(
    () => ticket.run([
      'create',
      '--product', PRODUCT_ID,
      '--title', 't',
      '--type', TYPE_ID,
      '--priority', 'xyz',
      '--dry-run',
    ]),
    /--priority must be a raw id/,
  );
});

// ── Update subcommand ─────────────────────────────────────────────────

testInCleanEnv('ticket update dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'update', TICKET_ID,
    '--title', '新标题',
    '--state', STATE_ID,
    '--solution', SOLUTION_ID,
    '--properties', '{"prop_b":123}',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/ship/tickets/${TICKET_ID}`);
  assert.strictEqual(parsed.json.title, '新标题');
  assert.strictEqual(parsed.json.state_id, STATE_ID);
  assert.strictEqual(parsed.json.solution_id, SOLUTION_ID);
  assert.deepStrictEqual(parsed.json.properties, { prop_b: 123 });
});

testInCleanEnv('ticket update requires a ticket id', async () => {
  await assert.rejects(
    () => ticket.run(['update', '--title', 't']),
    /A ticket id is required/,
  );
});

testInCleanEnv('ticket update requires at least one field', async () => {
  await assert.rejects(
    () => ticket.run(['update', TICKET_ID]),
    /At least one field to update is required/,
  );
});

testInCleanEnv('ticket update rejects extra positional arguments', async () => {
  await assert.rejects(
    () => ticket.run(['update', TICKET_ID, TICKET_ID, '--title', 't']),
    /Unexpected argument/,
  );
});

// ── Search subcommand ─────────────────────────────────────────────────

testInCleanEnv('ticket search dry-run returns flat POST structure', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'search', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/ship/tickets/search');
  assert.strictEqual(parsed.json.mode, 'query');
  assert.deepStrictEqual(parsed.json.payload, {});
});

testInCleanEnv('ticket search dry-run with all options', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'search',
    '--filter', '{"title":{"contains":"注册"},"product.id":{"in":["' + PRODUCT_ID + '"]}}',
    '--keywords', 'SLC-T1',
    '--limit', '10',
    '--page-index', '2',
    '--include-public-image-token',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/ship/tickets/search');
  assert.strictEqual(parsed.json.mode, 'query');
  assert.deepStrictEqual(parsed.json.payload.filter, {
    title: { contains: '注册' },
    'product.id': { in: [PRODUCT_ID] },
  });
  assert.strictEqual(parsed.json.payload.keywords, 'SLC-T1');
  assert.strictEqual(parsed.json.payload.page_size, 10);
  assert.strictEqual(parsed.json.payload.page_index, 2);
  assert.strictEqual(parsed.json.payload.include_public_image_token, 'description');
});

testInCleanEnv('ticket search rejects invalid filter JSON', async () => {
  await assert.rejects(
    () => ticket.run(['search', '--filter', 'not-json']),
    /--filter must be valid JSON/,
  );
});

testInCleanEnv('ticket search rejects out-of-range limit', async () => {
  await assert.rejects(
    () => ticket.run(['search', '--limit', '0']),
    /--limit must be a number between 1 and 100/,
  );
});

testInCleanEnv('ticket search rejects negative page index', async () => {
  await assert.rejects(
    () => ticket.run(['search', '--page-index', '-1']),
    /--page-index must be a non-negative number/,
  );
});

// ── Transition history subcommands ────────────────────────────────────

testInCleanEnv('ticket transitions dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'transitions', TICKET_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/tickets/${TICKET_ID}/transition_histories`);
});

testInCleanEnv('ticket transitions requires a ticket id', async () => {
  await assert.rejects(
    () => ticket.run(['transitions']),
    /A ticket id is required/,
  );
});

testInCleanEnv('ticket transitions rejects extra positional arguments', async () => {
  await assert.rejects(
    () => ticket.run(['transitions', TICKET_ID, TICKET_ID]),
    /Unexpected argument/,
  );
});

testInCleanEnv('ticket transition dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'transition', HISTORY_ID, TICKET_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/tickets/${TICKET_ID}/transition_histories/${HISTORY_ID}`);
});

testInCleanEnv('ticket transition requires both arguments', async () => {
  await assert.rejects(
    () => ticket.run(['transition']),
    /A transition history id and a ticket id are required/,
  );
});

testInCleanEnv('ticket transition requires ticket id', async () => {
  await assert.rejects(
    () => ticket.run(['transition', HISTORY_ID]),
    /A transition history id and a ticket id are required/,
  );
});

testInCleanEnv('ticket transition rejects extra positional arguments', async () => {
  await assert.rejects(
    () => ticket.run(['transition', HISTORY_ID, TICKET_ID, 'extra']),
    /Unexpected argument/,
  );
});

// ── Dictionary subcommands ────────────────────────────────────────────

testInCleanEnv('ticket dictionary subcommands dry-run build correct requests', async () => {
  mockToken();

  const dictionaries = [
    ['types', 'types'],
    ['states', 'states'],
    ['properties', 'properties'],
    ['channels', 'channels'],
    ['priorities', 'priorities'],
    ['solutions', 'solutions'],
    ['tags', 'tags'],
  ];
  for (const [sub, resource] of dictionaries) {
    const output = await captureLogAsync(() => ticket.run([
      sub, '--product', PRODUCT_ID, '--dry-run',
    ]));

    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true, `${sub} should be dry-run`);
    assert.strictEqual(parsed.method, 'GET', `${sub} should be GET`);
    assert.strictEqual(parsed.path, `/v1/ship/ticket/${resource}`, `${sub} path mismatch`);
    assert.strictEqual(parsed.params.product_id, PRODUCT_ID, `${sub} product_id mismatch`);
  }
});

testInCleanEnv('ticket dictionary requires product', async () => {
  await assert.rejects(
    () => ticket.run(['states']),
    /--product is required/,
  );
});

testInCleanEnv('ticket dictionary rejects non-raw product id', async () => {
  mockToken();

  await assert.rejects(
    () => ticket.run(['types', '--product', 'short', '--dry-run']),
    /--product must be a raw id/,
  );
});

// ── Unknown subcommand ────────────────────────────────────────────────

testInCleanEnv('ticket unknown subcommand errors', async () => {
  await assert.rejects(
    () => ticket.run(['unknown']),
    /Unknown ticket subcommand/,
  );
});

// ── Enterprise configuration: ticket state resource ──────────────────

testInCleanEnv('ticket state-resource-create dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-resource-create', '--name', '处理中', '--type', 'pending', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/ship/ticket_states');
  assert.strictEqual(parsed.json.name, '处理中');
  assert.strictEqual(parsed.json.type, 'pending');
});

testInCleanEnv('ticket state-resource-create requires name', async () => {
  await assert.rejects(
    () => ticket.run(['state-resource-create', '--type', 'pending']),
    /--name is required/,
  );
});

testInCleanEnv('ticket state-resource-create requires type', async () => {
  await assert.rejects(
    () => ticket.run(['state-resource-create', '--name', '处理中']),
    /--type is required/,
  );
});

testInCleanEnv('ticket state-resource-create rejects invalid type', async () => {
  await assert.rejects(
    () => ticket.run(['state-resource-create', '--name', 'X', '--type', 'bogus']),
    /--type must be one of/,
  );
});

testInCleanEnv('ticket state-resource-get dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-resource-get', STATE_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/ticket_states/${STATE_ID}`);
});

testInCleanEnv('ticket state-resource-get requires an id', async () => {
  await assert.rejects(
    () => ticket.run(['state-resource-get']),
    /A ticket state id is required/,
  );
});

testInCleanEnv('ticket state-resource-update dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-resource-update', STATE_ID, '--name', '已完成', '--type', 'completed', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/ship/ticket_states/${STATE_ID}`);
  assert.strictEqual(parsed.json.name, '已完成');
  assert.strictEqual(parsed.json.type, 'completed');
});

testInCleanEnv('ticket state-resource-update requires an id', async () => {
  await assert.rejects(
    () => ticket.run(['state-resource-update', '--name', 'X']),
    /A ticket state id is required/,
  );
});

testInCleanEnv('ticket state-resource-update requires at least one field', async () => {
  await assert.rejects(
    () => ticket.run(['state-resource-update', STATE_ID]),
    /At least one field to update is required/,
  );
});

testInCleanEnv('ticket state-resource-list-all dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-resource-list-all', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/ship/ticket_states');
});

// ── Enterprise configuration: ticket state plans ─────────────────────

testInCleanEnv('ticket state-plan-list dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-plan-list', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/ship/ticket_state_plans');
});

testInCleanEnv('ticket state-plan-list rejects extra positional arguments', async () => {
  await assert.rejects(
    () => ticket.run(['state-plan-list', STATE_PLAN_ID]),
    /Unexpected argument/,
  );
});

testInCleanEnv('ticket state-plan-get dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-plan-get', STATE_PLAN_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}`);
});

testInCleanEnv('ticket state-plan-get requires a plan id', async () => {
  await assert.rejects(
    () => ticket.run(['state-plan-get']),
    /A state plan id is required/,
  );
});

testInCleanEnv('ticket state-plan-state subcommands dry-run build correct requests', async () => {
  mockToken();

  const cases = [
    ['state-plan-state-add', 'POST', `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_states`, [STATE_PLAN_ID, STATE_ID]],
    ['state-plan-state-get', 'GET', `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_states/${STATE_ID}`, [STATE_PLAN_ID, STATE_ID]],
    ['state-plan-state-list', 'GET', `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_states`, [STATE_PLAN_ID]],
    ['state-plan-state-remove', 'DELETE', `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_states/${STATE_ID}`, [STATE_PLAN_ID, STATE_ID]],
  ];
  for (const [sub, method, path, argv] of cases) {
    const output = await captureLogAsync(() => ticket.run([sub, ...argv, '--dry-run']));
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true, `${sub} should be dry-run`);
    assert.strictEqual(parsed.method, method, `${sub} method mismatch`);
    assert.strictEqual(parsed.path, path, `${sub} path mismatch`);
  }
});

testInCleanEnv('ticket state-plan-state-add sends state id in body', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-plan-state-add', STATE_PLAN_ID, STATE_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.deepStrictEqual(parsed.json, { state_id: STATE_ID });
});

testInCleanEnv('ticket state-plan-state-add requires a state id', async () => {
  await assert.rejects(
    () => ticket.run(['state-plan-state-add', STATE_PLAN_ID]),
    /A ticket state id is required/,
  );
});

testInCleanEnv('ticket state-plan-state-remove requires a state id', async () => {
  await assert.rejects(
    () => ticket.run(['state-plan-state-remove', STATE_PLAN_ID]),
    /A ticket state id is required/,
  );
});

testInCleanEnv('ticket state-plan-flow-add dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'state-plan-flow-add', STATE_PLAN_ID, FROM_STATE_ID, STATE_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_state_flows`);
  assert.strictEqual(parsed.json.from_state_id, FROM_STATE_ID);
  assert.strictEqual(parsed.json.to_state_id, STATE_ID);
});

testInCleanEnv('ticket state-plan-flow-add requires from and to state ids', async () => {
  await assert.rejects(
    () => ticket.run(['state-plan-flow-add', STATE_PLAN_ID]),
    /A from_state_id is required/,
  );
  await assert.rejects(
    () => ticket.run(['state-plan-flow-add', STATE_PLAN_ID, FROM_STATE_ID]),
    /A to_state_id is required/,
  );
});

testInCleanEnv('ticket state-plan-flow subcommands dry-run build correct requests', async () => {
  mockToken();

  const cases = [
    ['state-plan-flow-get', 'GET', `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_state_flows/${STATE_FLOW_ID}`, [STATE_PLAN_ID, STATE_FLOW_ID]],
    ['state-plan-flow-list', 'GET', `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_state_flows`, [STATE_PLAN_ID]],
    ['state-plan-flow-remove', 'DELETE', `/v1/ship/ticket_state_plans/${STATE_PLAN_ID}/ticket_state_flows/${STATE_FLOW_ID}`, [STATE_PLAN_ID, STATE_FLOW_ID]],
  ];
  for (const [sub, method, path, argv] of cases) {
    const output = await captureLogAsync(() => ticket.run([sub, ...argv, '--dry-run']));
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true, `${sub} should be dry-run`);
    assert.strictEqual(parsed.method, method, `${sub} method mismatch`);
    assert.strictEqual(parsed.path, path, `${sub} path mismatch`);
  }
});

testInCleanEnv('ticket state-plan-flow-get requires a flow id', async () => {
  await assert.rejects(
    () => ticket.run(['state-plan-flow-get', STATE_PLAN_ID]),
    /A state flow id is required/,
  );
});

// ── Enterprise configuration: ticket property resource ───────────────

testInCleanEnv('ticket property-resource-create dry-run builds correct request', async () => {
  mockToken();

  const options = [{ text: '严重' }, { text: '一般' }];
  const output = await captureLogAsync(() => ticket.run([
    'property-resource-create', '--name', '严重程度', '--type', 'select',
    '--options', JSON.stringify(options), '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/ship/ticket_properties');
  assert.strictEqual(parsed.json.name, '严重程度');
  assert.strictEqual(parsed.json.type, 'select');
  assert.deepStrictEqual(parsed.json.options, options);
});

testInCleanEnv('ticket property-resource-create requires name', async () => {
  await assert.rejects(
    () => ticket.run(['property-resource-create', '--type', 'select']),
    /--name is required/,
  );
});

testInCleanEnv('ticket property-resource-create requires type', async () => {
  await assert.rejects(
    () => ticket.run(['property-resource-create', '--name', '严重程度']),
    /--type is required/,
  );
});

testInCleanEnv('ticket property-resource-create rejects invalid type', async () => {
  await assert.rejects(
    () => ticket.run(['property-resource-create', '--name', 'X', '--type', 'bogus']),
    /--type must be one of/,
  );
});

testInCleanEnv('ticket property-resource-create rejects invalid options JSON', async () => {
  await assert.rejects(
    () => ticket.run(['property-resource-create', '--name', 'X', '--type', 'select', '--options', 'not-json']),
    /--options must be valid JSON/,
  );
  await assert.rejects(
    () => ticket.run(['property-resource-create', '--name', 'X', '--type', 'select', '--options', '{"text":"严重"}']),
    /--options must be a JSON array/,
  );
  await assert.rejects(
    () => ticket.run(['property-resource-create', '--name', 'X', '--type', 'select', '--options', '[{}]']),
    /items must be objects with a non-empty "text" field/,
  );
});

testInCleanEnv('ticket property-resource-get dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'property-resource-get', TICKET_PROPERTY_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/ship/ticket_properties/${TICKET_PROPERTY_ID}`);
});

testInCleanEnv('ticket property-resource-get requires an id', async () => {
  await assert.rejects(
    () => ticket.run(['property-resource-get']),
    /A ticket property id is required/,
  );
});

testInCleanEnv('ticket property-resource-update dry-run builds correct request', async () => {
  mockToken();

  const options = [{ _id: '5efb1859110533727a82c603', text: '严重-update' }, { text: '一般' }];
  const output = await captureLogAsync(() => ticket.run([
    'property-resource-update', TICKET_PROPERTY_ID, '--name', '严重程度-update',
    '--options', JSON.stringify(options), '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/ship/ticket_properties/${TICKET_PROPERTY_ID}`);
  assert.strictEqual(parsed.json.name, '严重程度-update');
  assert.deepStrictEqual(parsed.json.options, options);
});

testInCleanEnv('ticket property-resource-update requires an id', async () => {
  await assert.rejects(
    () => ticket.run(['property-resource-update', '--name', 'X']),
    /A ticket property id is required/,
  );
});

testInCleanEnv('ticket property-resource-update requires at least one field', async () => {
  await assert.rejects(
    () => ticket.run(['property-resource-update', TICKET_PROPERTY_ID]),
    /At least one field to update is required/,
  );
});

testInCleanEnv('ticket property-resource-list-all dry-run builds correct request', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'property-resource-list-all', '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/ship/ticket_properties');
});

// ── Enterprise configuration: ticket property plans ──────────────────

testInCleanEnv('ticket property-plan subcommands dry-run build correct requests', async () => {
  mockToken();

  const cases = [
    ['property-plan-list', 'GET', '/v1/ship/ticket_property_plans', []],
    ['property-plan-get', 'GET', `/v1/ship/ticket_property_plans/${PROPERTY_PLAN_ID}`, [PROPERTY_PLAN_ID]],
    ['property-plan-property-add', 'POST', `/v1/ship/ticket_property_plans/${PROPERTY_PLAN_ID}/ticket_properties`, [PROPERTY_PLAN_ID, TICKET_PROPERTY_ID]],
    ['property-plan-property-get', 'GET', `/v1/ship/ticket_property_plans/${PROPERTY_PLAN_ID}/ticket_properties/${TICKET_PROPERTY_ID}`, [PROPERTY_PLAN_ID, TICKET_PROPERTY_ID]],
    ['property-plan-property-list', 'GET', `/v1/ship/ticket_property_plans/${PROPERTY_PLAN_ID}/ticket_properties`, [PROPERTY_PLAN_ID]],
    ['property-plan-property-remove', 'DELETE', `/v1/ship/ticket_property_plans/${PROPERTY_PLAN_ID}/ticket_properties/${TICKET_PROPERTY_ID}`, [PROPERTY_PLAN_ID, TICKET_PROPERTY_ID]],
  ];
  for (const [sub, method, path, argv] of cases) {
    const output = await captureLogAsync(() => ticket.run([sub, ...argv, '--dry-run']));
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true, `${sub} should be dry-run`);
    assert.strictEqual(parsed.method, method, `${sub} method mismatch`);
    assert.strictEqual(parsed.path, path, `${sub} path mismatch`);
  }
});

testInCleanEnv('ticket property-plan-property-add sends property id in body', async () => {
  mockToken();

  const output = await captureLogAsync(() => ticket.run([
    'property-plan-property-add', PROPERTY_PLAN_ID, TICKET_PROPERTY_ID, '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.deepStrictEqual(parsed.json, { property_id: TICKET_PROPERTY_ID });
});

testInCleanEnv('ticket property-plan subcommands require plan and property ids', async () => {
  await assert.rejects(
    () => ticket.run(['property-plan-get']),
    /A property plan id is required/,
  );
  await assert.rejects(
    () => ticket.run(['property-plan-property-add', PROPERTY_PLAN_ID]),
    /A ticket property id is required/,
  );
  await assert.rejects(
    () => ticket.run(['property-plan-property-remove', PROPERTY_PLAN_ID]),
    /A ticket property id is required/,
  );
});

// ── Enterprise configuration: types, priorities, solutions ───────────

testInCleanEnv('ticket type/priority/solution resource subcommands dry-run build correct requests', async () => {
  mockToken();

  const cases = [
    ['type-resource-list', 'GET', '/v1/ship/ticket_types', []],
    ['type-resource-get', 'GET', `/v1/ship/ticket_types/${TYPE_ID}`, [TYPE_ID]],
    ['priority-resource-list', 'GET', '/v1/ship/ticket_priorities', []],
    ['priority-resource-get', 'GET', `/v1/ship/ticket_priorities/${PRIORITY_ID}`, [PRIORITY_ID]],
    ['solution-list', 'GET', '/v1/ship/ticket_solutions', []],
    ['solution-get', 'GET', `/v1/ship/ticket_solutions/${SOLUTION_ID}`, [SOLUTION_ID]],
  ];
  for (const [sub, method, path, argv] of cases) {
    const output = await captureLogAsync(() => ticket.run([sub, ...argv, '--dry-run']));
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true, `${sub} should be dry-run`);
    assert.strictEqual(parsed.method, method, `${sub} method mismatch`);
    assert.strictEqual(parsed.path, path, `${sub} path mismatch`);
  }
});

testInCleanEnv('ticket type/priority/solution resource subcommands require an id', async () => {
  await assert.rejects(
    () => ticket.run(['type-resource-get']),
    /A ticket type id is required/,
  );
  await assert.rejects(
    () => ticket.run(['priority-resource-get']),
    /A ticket priority id is required/,
  );
  await assert.rejects(
    () => ticket.run(['solution-get']),
    /A ticket solution id is required/,
  );
});

testInCleanEnv('ticket state-resource-list-all rejects unknown option', async () => {
  await assert.rejects(
    () => ticket.run(['state-resource-list-all', '--bogus']),
    /Unknown option/,
  );
});
