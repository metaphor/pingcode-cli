'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const tag = require('../scripts/commands/tag');
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

testInCleanEnv('tag --help shows module help', async () => {
  const output = await captureLogAsync(() => tag.run(['--help']));
  assert.ok(output.includes('PingCode tag'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('create'));
  assert.ok(output.includes('add'));
  assert.ok(output.includes('remove'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('tag with no args shows module help', async () => {
  const output = await captureLogAsync(() => tag.run([]));
  assert.ok(output.includes('PingCode tag'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('tag subcommands show their own usage', async () => {
  const cases = [
    ['list', ['Usage: pingcode tag list', '--name TEXT']],
    ['create', ['Usage: pingcode tag create --name NAME']],
    ['get', ['Usage: pingcode tag get <tag_id>']],
    ['update', ['Usage: pingcode tag update <tag_id>', '--name NAME']],
    ['delete', ['Usage: pingcode tag delete <tag_id>']],
    ['add', ['Usage: pingcode tag add <work_item_id|identifier> <tag_id>']],
    ['remove', ['Usage: pingcode tag remove <tag_id> <work_item_id|identifier>']],
  ];
  for (const [sub, expects] of cases) {
    const output = await captureLogAsync(() => tag.run([sub, '--help']));
    for (const expect of expects) {
      assert.ok(output.includes(expect), `${sub} --help should include "${expect}"`);
    }
  }
});

// ── List subcommand ───────────────────────────────────────────────────

testInCleanEnv('tag list dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'list',
    '--name', '标签-1',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_tags');
  assert.strictEqual(parsed.params.name, '标签-1');
});

testInCleanEnv('tag list rejects unknown option', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['list', '--unknown-flag']),
    /Unknown option/,
  );
});

// ── Create subcommand ─────────────────────────────────────────────────

testInCleanEnv('tag create dry-run posts name body', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'create',
    '--name', '标签-1',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_tags');
  assert.strictEqual(parsed.json.name, '标签-1');
});

testInCleanEnv('tag create requires a name', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['create']),
    /--name is required/,
  );
});

// ── Get subcommand ────────────────────────────────────────────────────

testInCleanEnv('tag get dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'get',
    '5e6b35de50ef8153c2062f70',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70');
});

testInCleanEnv('tag get requires a tag id', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['get']),
    /A tag id is required/,
  );
});

testInCleanEnv('tag get with work item dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'get',
    '5e6b35de50ef8153c2062f70',
    '5edca524cad2fa1125cb0630',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/pjm/work_items/5edca524cad2fa1125cb0630/tags/5e6b35de50ef8153c2062f70');
  assert.strictEqual('resolution' in parsed, false);
});

testInCleanEnv('tag get by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'get',
    '5e6b35de50ef8153c2062f70',
    'SCR-5',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-5');
  assert.strictEqual(parsed.get.method, 'GET');
  assert.strictEqual(parsed.get.path, '/v1/pjm/work_items/{id}/tags/5e6b35de50ef8153c2062f70');
});

// ── Update subcommand ─────────────────────────────────────────────────

testInCleanEnv('tag update dry-run patches name body', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'update',
    '5e6b35de50ef8153c2062f70',
    '--name', '标签-2',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70');
  assert.strictEqual(parsed.json.name, '标签-2');
});

testInCleanEnv('tag update requires a field to update', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['update', '5e6b35de50ef8153c2062f70']),
    /At least one field to update is required/,
  );
});

testInCleanEnv('tag update requires a tag id', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['update', '--name', '标签-2']),
    /A tag id is required/,
  );
});

// ── Delete subcommand ─────────────────────────────────────────────────

testInCleanEnv('tag delete dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'delete',
    '5e6b35de50ef8153c2062f70',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70');
});

testInCleanEnv('tag delete requires a tag id', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['delete']),
    /A tag id is required/,
  );
});

// ── Add subcommand (attach tag to work item) ──────────────────────────

testInCleanEnv('tag add dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'add',
    '5edca524cad2fa1125cb0630',
    '5e6b35de50ef8153c2062f70',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/pjm/work_items/5edca524cad2fa1125cb0630/tags');
  assert.strictEqual(parsed.json.tag_id, '5e6b35de50ef8153c2062f70');
  assert.strictEqual('resolution' in parsed, false);
});

testInCleanEnv('tag add by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'add',
    'SCR-5',
    '5e6b35de50ef8153c2062f70',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-5');
  assert.strictEqual(parsed.add.method, 'POST');
  assert.strictEqual(parsed.add.path, '/v1/pjm/work_items/{id}/tags');
  assert.strictEqual(parsed.add.json.tag_id, '5e6b35de50ef8153c2062f70');
});

testInCleanEnv('tag add requires a work item ref and a tag id', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['add']),
    /A work item id or identifier is required/,
  );
  await assert.rejects(
    () => tag.run(['add', 'SCR-5']),
    /A tag id is required/,
  );
});

testInCleanEnv('tag add by identifier resolves then posts', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  const cachePath = tmpFile(os.tmpdir(), `pingcode-tag-${Date.now()}-cache.json`);

  const queue = [
    fakeResponse({ access_token: 'tok', expires_in: 3600 }),
    fakeResponse({ page_size: 30, page_index: 0, total: 1, values: [{ id: 'resolved-id' }] }),
    fakeResponse({ id: 'tag-link-id' }),
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
    await tag.run(['add', 'SCR-1', '5e6b35de50ef8153c2062f70', '--workspace-cache', cachePath]);
  } finally {
    console.log = originalLog;
    global.fetch = originalFetch;
    fs.rmSync(cachePath, { recursive: true, force: true });
  }

  assert.strictEqual(calls.length, 3, 'token, resolution, and add requests expected');
  assert.ok(calls[1].includes('/v1/project/work_items'), 'second call resolves the identifier');
  assert.ok(calls[2].includes('/v1/pjm/work_items/resolved-id/tags'), 'add targets the resolved id');
  const result = JSON.parse(output.trim());
  assert.strictEqual(result.id, 'tag-link-id');
});

// ── Remove subcommand (detach tag from work item) ─────────────────────

testInCleanEnv('tag remove dry-run builds correct request', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'remove',
    '5e6b35de50ef8153c2062f70',
    '5edca524cad2fa1125cb0630',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/pjm/work_items/5edca524cad2fa1125cb0630/tags/5e6b35de50ef8153c2062f70');
});

testInCleanEnv('tag remove by identifier returns compound dry-run shape', async () => {
  setupToken();

  const output = await captureLogAsync(() => tag.run([
    'remove',
    '5e6b35de50ef8153c2062f70',
    'SCR-5',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-5');
  assert.strictEqual(parsed.remove.method, 'DELETE');
  assert.strictEqual(parsed.remove.path, '/v1/pjm/work_items/{id}/tags/5e6b35de50ef8153c2062f70');
});

testInCleanEnv('tag remove requires a tag id and a work item ref', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['remove']),
    /A tag id is required/,
  );
  await assert.rejects(
    () => tag.run(['remove', '5e6b35de50ef8153c2062f70']),
    /A work item id or identifier is required/,
  );
});

// ── Unknown subcommand ─────────────────────────────────────────────────

testInCleanEnv('tag unknown subcommand errors', async () => {
  setupToken();
  await assert.rejects(
    () => tag.run(['unknown']),
    /Unknown tag subcommand/,
  );
});
