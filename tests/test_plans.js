'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const plans = require('../scripts/commands/plans');
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

const PLAN_ID = '5eb623f6a70571487ea47000';
const TYPE_ID = '630da48bc9443b1aa94ce3ea';
const STATE_ID = '5c9b35de90ad7153c2062f18';
const FLOW_ID = '5ef85b1e9481936604da7fcd';
const PROPERTY_ID = 'severity';
const PROJECT_ID = '5eb623f6a70571487ea47000';

const TYPE_PLANS = '/v1/pjm/work_item_type_plans';
const STATE_PLANS = '/v1/pjm/work_item_state_plans';
const PROPERTY_PLANS = '/v1/pjm/work_item_property_plans';

const SUBCOMMANDS = [
  'type-plan-list', 'type-plan-get',
  'type-plan-type-add', 'type-plan-type-get', 'type-plan-type-update',
  'type-plan-type-list', 'type-plan-type-remove',
  'state-plan-list', 'state-plan-get',
  'state-plan-state-add', 'state-plan-state-get', 'state-plan-state-list', 'state-plan-state-remove',
  'flow-add', 'flow-get', 'flow-list', 'flow-remove',
  'property-plan-list', 'property-plan-get',
  'property-plan-property-add', 'property-plan-property-get',
  'property-plan-property-list', 'property-plan-property-remove',
];

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('plans --help shows module help', async () => {
  const output = await captureLogAsync(() => plans.run(['--help']));
  assert.ok(output.includes('PingCode plans'));
  assert.ok(output.includes('Subcommands:') || output.includes('Type plan subcommands:'));
  assert.ok(output.includes('type-plan-list'));
  assert.ok(output.includes('state-plan-state-add'));
  assert.ok(output.includes('flow-list'));
  assert.ok(output.includes('property-plan-property-remove'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('plans with no args shows module help', async () => {
  const output = await captureLogAsync(() => plans.run([]));
  assert.ok(output.includes('PingCode plans'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('plans subcommand --help shows usage for every subcommand', async () => {
  for (const sub of SUBCOMMANDS) {
    const output = await captureLogAsync(() => plans.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode plans ${sub}`), `missing usage for ${sub}`);
  }
});

// ── Type plan subcommands ──────────────────────────────────────────────

testInCleanEnv('plans type-plan-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'type-plan-list', '--project-id', PROJECT_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, TYPE_PLANS);
  assert.strictEqual(parsed.params.project_id, PROJECT_ID);
});

testInCleanEnv('plans type-plan-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run(['type-plan-get', PLAN_ID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${TYPE_PLANS}/${PLAN_ID}`);
});

testInCleanEnv('plans type-plan-type-add dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'type-plan-type-add', PLAN_ID, TYPE_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `${TYPE_PLANS}/${PLAN_ID}/work_item_types`);
  assert.strictEqual(parsed.json.work_item_type_id, TYPE_ID);
});

testInCleanEnv('plans type-plan-type-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'type-plan-type-get', PLAN_ID, TYPE_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${TYPE_PLANS}/${PLAN_ID}/work_item_types/${TYPE_ID}`);
});

testInCleanEnv('plans type-plan-type-update dry-run patches sub type ids', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'type-plan-type-update', PLAN_ID, TYPE_ID,
    '--sub-type-ids', 'bug,6385c650fef18f2d7222d15d',
    '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `${TYPE_PLANS}/${PLAN_ID}/work_item_types/${TYPE_ID}`);
  assert.deepStrictEqual(parsed.json.sub_type_ids, ['bug', '6385c650fef18f2d7222d15d']);
});

testInCleanEnv('plans type-plan-type-update supports equals form', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'type-plan-type-update', PLAN_ID, TYPE_ID, '--sub-type-ids=bug', '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.deepStrictEqual(parsed.json.sub_type_ids, ['bug']);
});

testInCleanEnv('plans type-plan-type-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'type-plan-type-list', PLAN_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${TYPE_PLANS}/${PLAN_ID}/work_item_types`);
});

testInCleanEnv('plans type-plan-type-remove dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'type-plan-type-remove', PLAN_ID, TYPE_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `${TYPE_PLANS}/${PLAN_ID}/work_item_types/${TYPE_ID}`);
});

// ── State plan subcommands ─────────────────────────────────────────────

testInCleanEnv('plans state-plan-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'state-plan-list', '--project-id', PROJECT_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, STATE_PLANS);
  assert.strictEqual(parsed.params.project_id, PROJECT_ID);
});

testInCleanEnv('plans state-plan-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run(['state-plan-get', PLAN_ID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}`);
});

testInCleanEnv('plans state-plan-state-add dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'state-plan-state-add', PLAN_ID, STATE_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_states`);
  assert.strictEqual(parsed.json.state_id, STATE_ID);
});

testInCleanEnv('plans state-plan-state-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'state-plan-state-get', PLAN_ID, STATE_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_states/${STATE_ID}`);
});

testInCleanEnv('plans state-plan-state-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'state-plan-state-list', PLAN_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_states`);
});

testInCleanEnv('plans state-plan-state-remove dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'state-plan-state-remove', PLAN_ID, STATE_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_states/${STATE_ID}`);
});

// ── State flow subcommands ─────────────────────────────────────────────

testInCleanEnv('plans flow-add dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'flow-add', PLAN_ID, STATE_ID, FLOW_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_state_flows`);
  assert.strictEqual(parsed.json.from_state_id, STATE_ID);
  assert.strictEqual(parsed.json.to_state_id, FLOW_ID);
});

testInCleanEnv('plans flow-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'flow-get', PLAN_ID, FLOW_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_state_flows/${FLOW_ID}`);
});

testInCleanEnv('plans flow-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'flow-list', PLAN_ID, '--from-state', STATE_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_state_flows`);
  assert.strictEqual(parsed.params.from_state_id, STATE_ID);
});

testInCleanEnv('plans flow-remove dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'flow-remove', PLAN_ID, FLOW_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `${STATE_PLANS}/${PLAN_ID}/work_item_state_flows/${FLOW_ID}`);
});

// ── Property plan subcommands ──────────────────────────────────────────

testInCleanEnv('plans property-plan-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'property-plan-list', '--project-id', PROJECT_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, PROPERTY_PLANS);
  assert.strictEqual(parsed.params.project_id, PROJECT_ID);
});

testInCleanEnv('plans property-plan-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run(['property-plan-get', PLAN_ID, '--dry-run']));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${PROPERTY_PLANS}/${PLAN_ID}`);
});

testInCleanEnv('plans property-plan-property-add dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'property-plan-property-add', PLAN_ID, PROPERTY_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `${PROPERTY_PLANS}/${PLAN_ID}/work_item_properties`);
  assert.strictEqual(parsed.json.property_id, PROPERTY_ID);
});

testInCleanEnv('plans property-plan-property-get dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'property-plan-property-get', PLAN_ID, PROPERTY_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${PROPERTY_PLANS}/${PLAN_ID}/work_item_properties/${PROPERTY_ID}`);
});

testInCleanEnv('plans property-plan-property-list dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'property-plan-property-list', PLAN_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `${PROPERTY_PLANS}/${PLAN_ID}/work_item_properties`);
});

testInCleanEnv('plans property-plan-property-remove dry-run builds correct request', async () => {
  setupAuth();
  const output = await captureLogAsync(() => plans.run([
    'property-plan-property-remove', PLAN_ID, PROPERTY_ID, '--dry-run',
  ]));
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `${PROPERTY_PLANS}/${PLAN_ID}/work_item_properties/${PROPERTY_ID}`);
});

// ── Required argument errors ───────────────────────────────────────────

testInCleanEnv('plans type-plan-get requires a plan id', async () => {
  await assert.rejects(() => plans.run(['type-plan-get']), /required/);
});

testInCleanEnv('plans type-plan-type-add requires a work item type id', async () => {
  await assert.rejects(() => plans.run(['type-plan-type-add', PLAN_ID]), /required/);
});

testInCleanEnv('plans type-plan-type-get requires a work item type id', async () => {
  await assert.rejects(() => plans.run(['type-plan-type-get', PLAN_ID]), /required/);
});

testInCleanEnv('plans type-plan-type-update requires sub type ids', async () => {
  await assert.rejects(
    () => plans.run(['type-plan-type-update', PLAN_ID, TYPE_ID]),
    /--sub-type-ids is required/,
  );
});

testInCleanEnv('plans type-plan-type-list requires a plan id', async () => {
  await assert.rejects(() => plans.run(['type-plan-type-list']), /required/);
});

testInCleanEnv('plans type-plan-type-remove requires a work item type id', async () => {
  await assert.rejects(() => plans.run(['type-plan-type-remove', PLAN_ID]), /required/);
});

testInCleanEnv('plans state-plan-get requires a plan id', async () => {
  await assert.rejects(() => plans.run(['state-plan-get']), /required/);
});

testInCleanEnv('plans state-plan-state-add requires a state id', async () => {
  await assert.rejects(() => plans.run(['state-plan-state-add', PLAN_ID]), /required/);
});

testInCleanEnv('plans state-plan-state-get requires a state id', async () => {
  await assert.rejects(() => plans.run(['state-plan-state-get', PLAN_ID]), /required/);
});

testInCleanEnv('plans state-plan-state-list requires a plan id', async () => {
  await assert.rejects(() => plans.run(['state-plan-state-list']), /required/);
});

testInCleanEnv('plans state-plan-state-remove requires a state id', async () => {
  await assert.rejects(() => plans.run(['state-plan-state-remove', PLAN_ID]), /required/);
});

testInCleanEnv('plans flow-add requires from and to state ids', async () => {
  await assert.rejects(() => plans.run(['flow-add', PLAN_ID]), /required/);
  await assert.rejects(() => plans.run(['flow-add', PLAN_ID, STATE_ID]), /required/);
});

testInCleanEnv('plans flow-get requires a flow id', async () => {
  await assert.rejects(() => plans.run(['flow-get', PLAN_ID]), /required/);
});

testInCleanEnv('plans flow-list requires a plan id', async () => {
  await assert.rejects(() => plans.run(['flow-list']), /required/);
});

testInCleanEnv('plans flow-remove requires a flow id', async () => {
  await assert.rejects(() => plans.run(['flow-remove', PLAN_ID]), /required/);
});

testInCleanEnv('plans property-plan-get requires a plan id', async () => {
  await assert.rejects(() => plans.run(['property-plan-get']), /required/);
});

testInCleanEnv('plans property-plan-property-add requires a property id', async () => {
  await assert.rejects(() => plans.run(['property-plan-property-add', PLAN_ID]), /required/);
});

testInCleanEnv('plans property-plan-property-get requires a property id', async () => {
  await assert.rejects(() => plans.run(['property-plan-property-get', PLAN_ID]), /required/);
});

testInCleanEnv('plans property-plan-property-list requires a plan id', async () => {
  await assert.rejects(() => plans.run(['property-plan-property-list']), /required/);
});

testInCleanEnv('plans property-plan-property-remove requires a property id', async () => {
  await assert.rejects(() => plans.run(['property-plan-property-remove', PLAN_ID]), /required/);
});

// ── Unknown option / subcommand / extra args ───────────────────────────

testInCleanEnv('plans rejects unknown option', async () => {
  await assert.rejects(
    () => plans.run(['type-plan-list', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('plans type-plan-list rejects unexpected positional argument', async () => {
  await assert.rejects(
    () => plans.run(['type-plan-list', 'extra']),
    /Unexpected argument/,
  );
});

testInCleanEnv('plans unknown subcommand errors', async () => {
  await assert.rejects(
    () => plans.run(['unknown']),
    /Unknown plans subcommand/,
  );
});
