'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const wiki = require('../scripts/commands/wiki');
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

function withTokenAuth() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('wiki --help shows module help', async () => {
  const output = await captureLogAsync(() => wiki.run(['--help']));
  assert.ok(output.includes('PingCode wiki'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('space-list'));
  assert.ok(output.includes('page-create'));
  assert.ok(output.includes('version-restore'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('wiki with no args shows module help', async () => {
  const output = await captureLogAsync(() => wiki.run([]));
  assert.ok(output.includes('PingCode wiki'));
});

// ── Subcommand help ───────────────────────────────────────────────────

const WIKI_SUBCOMMANDS = [
  'space-list', 'space-create', 'space-get', 'space-update', 'space-delete',
  'member-add', 'member-get', 'member-list', 'member-remove',
  'page-list', 'page-create', 'page-get', 'page-update', 'page-delete',
  'content-get', 'content-update',
  'version-list', 'version-get', 'version-restore',
];

testInCleanEnv('wiki every subcommand has --help usage', async () => {
  for (const sub of WIKI_SUBCOMMANDS) {
    const output = await captureLogAsync(() => wiki.run([sub, '--help']));
    assert.ok(output.includes(`Usage: pingcode wiki ${sub}`), `missing usage for ${sub}`);
  }
});

// ── Space subcommands ─────────────────────────────────────────────────

testInCleanEnv('wiki space-list dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'space-list',
    '--keywords', '团队',
    '--scope-type', 'user_group',
    '--include-archived',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces');
  assert.strictEqual(parsed.params.keywords, '团队');
  assert.strictEqual(parsed.params.scope_type, 'user_group');
  assert.strictEqual(parsed.params.include_archived, 'true');
});

testInCleanEnv('wiki space-list member filters must be provided together', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-list', '--member-type', 'user']),
    /together/,
  );
});

testInCleanEnv('wiki space-create dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'space-create',
    '--scope-type', 'user_group',
    '--scope-id', '63c8fb32729dee3334d96af7',
    '--name', '团队空间',
    '--identifier', 'GROUP',
    '--visibility', 'private',
    '--description', '团队空间描述',
    '--members', '[{"id":"a0417f68e846aae315c85d24643678a9","type":"user"}]',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces');
  assert.strictEqual(parsed.json.scope_type, 'user_group');
  assert.strictEqual(parsed.json.scope_id, '63c8fb32729dee3334d96af7');
  assert.strictEqual(parsed.json.name, '团队空间');
  assert.strictEqual(parsed.json.identifier, 'GROUP');
  assert.strictEqual(parsed.json.visibility, 'private');
  assert.deepStrictEqual(parsed.json.members, [
    { id: 'a0417f68e846aae315c85d24643678a9', type: 'user' },
  ]);
});

testInCleanEnv('wiki space-create requires scope-type name and identifier', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-create']),
    /--scope-type is required/,
  );
  await assert.rejects(
    () => wiki.run(['space-create', '--scope-type', 'organization']),
    /--name is required/,
  );
  await assert.rejects(
    () => wiki.run(['space-create', '--scope-type', 'organization', '--name', 'X']),
    /--identifier is required/,
  );
});

testInCleanEnv('wiki space-create rejects invalid scope-type', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-create', '--scope-type', 'bogus', '--name', 'X', '--identifier', 'X']),
    /--scope-type must be one of/,
  );
});

testInCleanEnv('wiki space-create rejects non-array members', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run([
      'space-create',
      '--scope-type', 'organization',
      '--name', 'X',
      '--identifier', 'X',
      '--members', '{"id":"a"}',
    ]),
    /--members must be a JSON array/,
  );
});

testInCleanEnv('wiki space-get dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'space-get',
    '642fd641209b56920a6c6e5e',
    '--include-deleted',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces/642fd641209b56920a6c6e5e');
  assert.strictEqual(parsed.params.include_deleted, 'true');
});

testInCleanEnv('wiki space-get requires a space id', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-get']),
    /A space id is required/,
  );
});

testInCleanEnv('wiki space-update dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'space-update',
    '642fd641209b56920a6c6e5e',
    '--name', '示例空间',
    '--description', '新描述',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces/642fd641209b56920a6c6e5e');
  assert.strictEqual(parsed.json.name, '示例空间');
  assert.strictEqual(parsed.json.description, '新描述');
});

testInCleanEnv('wiki space-update requires at least one field', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-update', '642fd641209b56920a6c6e5e']),
    /At least one field to update is required/,
  );
});

testInCleanEnv('wiki space-delete dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'space-delete',
    '642fd641209b56920a6c6e5e',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces/642fd641209b56920a6c6e5e');
});

testInCleanEnv('wiki space-delete requires a space id', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-delete']),
    /A space id is required/,
  );
});

// ── Space member subcommands ──────────────────────────────────────────

testInCleanEnv('wiki member-add dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'member-add',
    '642fd641209b56920a6c6e5e',
    '--member-id', 'a0417f68e846aae315c85d24643678a9',
    '--type', 'user',
    '--role-id', '6422711c3f12e6c1e46d40e6',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces/642fd641209b56920a6c6e5e/members');
  assert.deepStrictEqual(parsed.json.member, {
    id: 'a0417f68e846aae315c85d24643678a9',
    type: 'user',
  });
  assert.strictEqual(parsed.json.role_id, '6422711c3f12e6c1e46d40e6');
});

testInCleanEnv('wiki member-add requires member id and type', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['member-add', '642fd641209b56920a6c6e5e']),
    /--member-id is required/,
  );
  await assert.rejects(
    () => wiki.run(['member-add', '642fd641209b56920a6c6e5e', '--member-id', 'a0417f68e846aae315c85d24643678a9']),
    /--type is required/,
  );
});

testInCleanEnv('wiki member-add rejects invalid type', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['member-add', '642fd641209b56920a6c6e5e', '--member-id', 'a', '--type', 'robot']),
    /--type must be one of/,
  );
});

testInCleanEnv('wiki member-get dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'member-get',
    '642fd641209b56920a6c6e5e',
    'a0417f68e846aae315c85d24643678a9',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('wiki member-get requires space and member ids', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['member-get']),
    /A space id and a member id are required/,
  );
  await assert.rejects(
    () => wiki.run(['member-get', '642fd641209b56920a6c6e5e']),
    /A space id and a member id are required/,
  );
});

testInCleanEnv('wiki member-list dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'member-list',
    '642fd641209b56920a6c6e5e',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces/642fd641209b56920a6c6e5e/members');
});

testInCleanEnv('wiki member-list requires a space id', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['member-list']),
    /A space id is required/,
  );
});

testInCleanEnv('wiki member-remove dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'member-remove',
    '642fd641209b56920a6c6e5e',
    'a0417f68e846aae315c85d24643678a9',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9');
});

testInCleanEnv('wiki member-remove requires space and member ids', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['member-remove', '642fd641209b56920a6c6e5e']),
    /A space id and a member id are required/,
  );
});

// ── Page subcommands ──────────────────────────────────────────────────

testInCleanEnv('wiki page-list dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'page-list',
    '--space-id', '63e1bf51760505c8795ebcc8',
    '--parent-id', '63e1bf51760505c8795ebcce',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/pages');
  assert.strictEqual(parsed.params.space_id, '63e1bf51760505c8795ebcc8');
  assert.strictEqual(parsed.params.parent_id, '63e1bf51760505c8795ebcce');
});

testInCleanEnv('wiki page-create dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'page-create',
    '--space-id', '63e1bf51760505c8795ebcc8',
    '--name', '示例页面',
    '--parent-id', '63e1bf51760505c8795ebcce',
    '--content', '正文内容',
    '--format-type', 'markdown',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/wiki/pages');
  assert.strictEqual(parsed.json.space_id, '63e1bf51760505c8795ebcc8');
  assert.strictEqual(parsed.json.name, '示例页面');
  assert.strictEqual(parsed.json.parent_id, '63e1bf51760505c8795ebcce');
  assert.strictEqual(parsed.json.content, '正文内容');
  assert.strictEqual(parsed.json.format_type, 'markdown');
});

testInCleanEnv('wiki page-create requires space id and name', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['page-create']),
    /--space-id is required/,
  );
  await assert.rejects(
    () => wiki.run(['page-create', '--space-id', '63e1bf51760505c8795ebcc8']),
    /--name is required/,
  );
});

testInCleanEnv('wiki page-create requires content and format-type together', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['page-create', '--space-id', 's', '--name', 'n', '--content', 'text']),
    /--format-type is required/,
  );
  await assert.rejects(
    () => wiki.run(['page-create', '--space-id', 's', '--name', 'n', '--format-type', 'markdown']),
    /--content is required/,
  );
});

testInCleanEnv('wiki page-get dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'page-get',
    '63e1bf51760505c8795ebccc',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/63e1bf51760505c8795ebccc');
});

testInCleanEnv('wiki page-get requires a page id', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['page-get']),
    /A page id is required/,
  );
});

testInCleanEnv('wiki page-update dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'page-update',
    '63e1bf51760505c8795ebccc',
    '--name', '示例页面updated',
    '--lock', '1',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/63e1bf51760505c8795ebccc');
  assert.strictEqual(parsed.json.name, '示例页面updated');
  assert.strictEqual(parsed.json.lock, 1);
});

testInCleanEnv('wiki page-update requires at least one field and lock is 0 or 1', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['page-update', '63e1bf51760505c8795ebccc']),
    /At least one field to update is required/,
  );
  await assert.rejects(
    () => wiki.run(['page-update', '63e1bf51760505c8795ebccc', '--lock', '2']),
    /--lock must be 0 or 1/,
  );
});

testInCleanEnv('wiki page-delete dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'page-delete',
    '63e1bf51760505c8795ebccc',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/63e1bf51760505c8795ebccc');
});

testInCleanEnv('wiki page-delete requires a page id', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['page-delete']),
    /A page id is required/,
  );
});

// ── Content subcommands ───────────────────────────────────────────────

testInCleanEnv('wiki content-get dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'content-get',
    '65093a8e4d4c8ca623da8fcd',
    '--format-type', 'markdown',
    '--version-id', '65093abf4d4c8ca623da8ffe',
    '--include-public-image-token', 'content',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/content');
  assert.strictEqual(parsed.params.format_type, 'markdown');
  assert.strictEqual(parsed.params.version_id, '65093abf4d4c8ca623da8ffe');
  assert.strictEqual(parsed.params.include_public_image_token, 'content');
});

testInCleanEnv('wiki content-get requires a page id and validates image token value', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['content-get']),
    /A page id is required/,
  );
  await assert.rejects(
    () => wiki.run(['content-get', '65093a8e4d4c8ca623da8fcd', '--include-public-image-token', 'bogus']),
    /only supports the value content/,
  );
});

testInCleanEnv('wiki content-update dry-run builds correct PUT request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'content-update',
    '65093a8e4d4c8ca623da8fcd',
    '--content', '**新正文**',
    '--format-type', 'markdown',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'PUT');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/content');
  assert.strictEqual(parsed.json.content, '**新正文**');
  assert.strictEqual(parsed.json.format_type, 'markdown');
});

testInCleanEnv('wiki content-update requires content and format-type', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['content-update', '65093a8e4d4c8ca623da8fcd']),
    /--content is required/,
  );
  await assert.rejects(
    () => wiki.run(['content-update', '65093a8e4d4c8ca623da8fcd', '--content', 'x']),
    /--format-type is required/,
  );
});

testInCleanEnv('wiki content-update rejects block format', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['content-update', '65093a8e4d4c8ca623da8fcd', '--content', 'x', '--format-type', 'block']),
    /--format-type must be one of/,
  );
});

// ── Version subcommands ───────────────────────────────────────────────

testInCleanEnv('wiki version-list dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'version-list',
    '65093a8e4d4c8ca623da8fcd',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/versions');
});

testInCleanEnv('wiki version-list requires a page id', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['version-list']),
    /A page id is required/,
  );
});

testInCleanEnv('wiki version-get dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'version-get',
    '65093a8e4d4c8ca623da8fcd',
    '65093abf4d4c8ca623da8fff',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/versions/65093abf4d4c8ca623da8fff');
});

testInCleanEnv('wiki version-get requires page and version ids', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['version-get', '65093a8e4d4c8ca623da8fcd']),
    /A page id and a version id are required/,
  );
});

testInCleanEnv('wiki version-restore dry-run builds correct request', async () => {
  withTokenAuth();

  const output = await captureLogAsync(() => wiki.run([
    'version-restore',
    '65093a8e4d4c8ca623da8fcd',
    '65093abf4d4c8ca623da8ffe',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/versions/65093abf4d4c8ca623da8ffe/restore');
});

testInCleanEnv('wiki version-restore requires page and version ids', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['version-restore']),
    /A page id and a version id are required/,
  );
});

// ── Arg validation / unknown handling ─────────────────────────────────

testInCleanEnv('wiki space-list rejects unknown option', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-list', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('wiki space-list rejects flag without value', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-list', '--keywords']),
    /Flag --keywords requires a value/,
  );
});

testInCleanEnv('wiki space-list rejects unexpected positional', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['space-list', 'extra']),
    /Unexpected argument/,
  );
});

testInCleanEnv('wiki page-get rejects extra positional', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['page-get', 'id1', 'id2']),
    /Unexpected argument/,
  );
});

testInCleanEnv('wiki unknown subcommand errors', async () => {
  withTokenAuth();

  await assert.rejects(
    () => wiki.run(['unknown']),
    /Unknown wiki subcommand/,
  );
});

