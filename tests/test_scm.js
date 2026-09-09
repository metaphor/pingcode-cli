'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const scm = require('../scripts/commands/scm');
const { clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

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

function setupAuth() {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(fakeResponse({ access_token: 'tok', expires_in: 3600 }));
}

async function dryRun(argv) {
  setupAuth();
  return await captureLogAsync(() => scm.run([...argv, '--dry-run']));
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('scm --help shows module help', async () => {
  setupAuth();
  const output = await captureLogAsync(() => scm.run(['--help']));
  assert.ok(output.includes('PingCode scm'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('platform-list'));
  assert.ok(output.includes('branch-delete'));
  assert.ok(output.includes('pr-create'));
  assert.ok(output.includes('review-update'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

testInCleanEnv('scm with no args shows module help', async () => {
  setupAuth();
  const output = await captureLogAsync(() => scm.run([]));
  assert.ok(output.includes('PingCode scm'));
});

// ── Subcommand help ────────────────────────────────────────────────────

const ALL_SUBCOMMANDS = [
  'platform-list', 'platform-create', 'platform-get', 'platform-update',
  'user-list', 'user-create', 'user-get', 'user-update',
  'repo-list', 'repo-create', 'repo-get', 'repo-update',
  'branch-list', 'branch-create', 'branch-get', 'branch-update', 'branch-delete',
  'commit-create', 'commit-get', 'commit-list',
  'ref-list', 'ref-create', 'ref-get',
  'pr-list', 'pr-create', 'pr-get', 'pr-update',
  'review-list', 'review-create', 'review-get', 'review-update',
];

testInCleanEnv('every scm subcommand shows its own usage', async () => {
  setupAuth();
  for (const sub of ALL_SUBCOMMANDS) {
    const output = await captureLogAsync(() => scm.run([sub, '--help']));
    assert.ok(
      output.includes(`Usage: pingcode scm ${sub}`),
      `expected usage header for ${sub}, got: ${output}`,
    );
  }
});

// ── Platform subcommands ──────────────────────────────────────────────

testInCleanEnv('scm platform-list dry-run builds correct request', async () => {
  const output = await dryRun(['platform-list', '--name', 'Github']);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/products');
  assert.strictEqual(parsed.params.name, 'Github');
});

testInCleanEnv('scm platform-list without filters omits params', async () => {
  const output = await dryRun(['platform-list']);
  const parsed = JSON.parse(output);
  assert.deepStrictEqual(parsed.params, {});
});

testInCleanEnv('scm platform-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'platform-create',
    '--name', 'Github',
    '--type', 'github',
    '--description', 'Github公有云',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/scm/products');
  assert.strictEqual(parsed.json.name, 'Github');
  assert.strictEqual(parsed.json.type, 'github');
  assert.strictEqual(parsed.json.description, 'Github公有云');
});

testInCleanEnv('scm platform-create requires name and type', async () => {
  await assert.rejects(
    () => scm.run(['platform-create', '--type', 'github']),
    /--name is required/,
  );
  await assert.rejects(
    () => scm.run(['platform-create', '--name', 'Github']),
    /--type is required/,
  );
});

testInCleanEnv('scm platform-get dry-run builds correct request', async () => {
  const output = await dryRun(['platform-get', '564587fe700d43b81b080765']);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765');
});

testInCleanEnv('scm platform-get requires a platform id', async () => {
  await assert.rejects(
    () => scm.run(['platform-get']),
    /A platform id is required/,
  );
});

testInCleanEnv('scm platform-update dry-run sends PATCH with partial body', async () => {
  const output = await dryRun([
    'platform-update', '564587fe700d43b81b080765',
    '--description', 'updated',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765');
  assert.deepStrictEqual(parsed.json, { description: 'updated' });
});

testInCleanEnv('scm platform-update requires a platform id', async () => {
  await assert.rejects(
    () => scm.run(['platform-update', '--name', 'x']),
    /A platform id is required/,
  );
});

// ── User subcommands ──────────────────────────────────────────────────

testInCleanEnv('scm user-list dry-run builds correct request', async () => {
  const output = await dryRun(['user-list', '564587fe700d43b81b080765', '--name', 'terry']);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/users');
  assert.strictEqual(parsed.params.name, 'terry');
});

testInCleanEnv('scm user-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'user-create', '564587fe700d43b81b080765',
    '--name', 'terry',
    '--display-name', 'Terry',
    '--html-url', 'https://github.com/terrylee',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/users');
  assert.strictEqual(parsed.json.name, 'terry');
  assert.strictEqual(parsed.json.display_name, 'Terry');
  assert.strictEqual(parsed.json.html_url, 'https://github.com/terrylee');
});

testInCleanEnv('scm user-create requires name', async () => {
  await assert.rejects(
    () => scm.run(['user-create', '564587fe700d43b81b080765']),
    /--name is required/,
  );
});

testInCleanEnv('scm user-get dry-run builds correct request', async () => {
  const output = await dryRun([
    'user-get', '564587fe700d43b81b080765', '5666aea91f99e33cb7c44964',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964');
});

testInCleanEnv('scm user-get requires platform and user ids', async () => {
  await assert.rejects(
    () => scm.run(['user-get', '564587fe700d43b81b080765']),
    /A platform id and user id are required/,
  );
});

testInCleanEnv('scm user-update dry-run sends PATCH with partial body', async () => {
  const output = await dryRun([
    'user-update', '564587fe700d43b81b080765', '5666aea91f99e33cb7c44964',
    '--display-name', 'Terry',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964');
  assert.deepStrictEqual(parsed.json, { display_name: 'Terry' });
});

// ── Repository subcommands ────────────────────────────────────────────

testInCleanEnv('scm repo-list dry-run builds correct request', async () => {
  const output = await dryRun([
    'repo-list', '564587fe700d43b81b080765', '--full-name', 'worktile/ngx-planet',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/repositories');
  assert.strictEqual(parsed.params.full_name, 'worktile/ngx-planet');
});

testInCleanEnv('scm repo-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'repo-create', '564587fe700d43b81b080765',
    '--name', 'ngx-planet',
    '--full-name', 'worktile/ngx-planet',
    '--is-private',
    '--owner-name', 'terry',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/repositories');
  assert.strictEqual(parsed.json.name, 'ngx-planet');
  assert.strictEqual(parsed.json.full_name, 'worktile/ngx-planet');
  assert.strictEqual(parsed.json.is_private, true);
  assert.strictEqual(parsed.json.owner_name, 'terry');
  assert.strictEqual('is_fork' in parsed.json, false);
});

testInCleanEnv('scm repo-create requires name and full name', async () => {
  await assert.rejects(
    () => scm.run(['repo-create', '564587fe700d43b81b080765', '--name', 'x']),
    /--full-name is required/,
  );
  await assert.rejects(
    () => scm.run(['repo-create', '564587fe700d43b81b080765']),
    /--name is required/,
  );
});

testInCleanEnv('scm repo-get dry-run builds correct request', async () => {
  const output = await dryRun([
    'repo-get', '564587fe700d43b81b080765', '564587fe700d43b81b080766',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766');
});

testInCleanEnv('scm repo-update dry-run sends PATCH with partial body', async () => {
  const output = await dryRun([
    'repo-update', '564587fe700d43b81b080765', '564587fe700d43b81b080766',
    '--description', 'micro frontend library',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, '/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766');
  assert.deepStrictEqual(parsed.json, { description: 'micro frontend library' });
});

// ── Branch subcommands ────────────────────────────────────────────────

const PID = '564587fe700d43b81b080765';
const RID = '564587fe700d43b81b080766';
const BID = '564587fe700d43b81b080767';

testInCleanEnv('scm branch-list dry-run builds correct request', async () => {
  const output = await dryRun([
    'branch-list', PID, RID, '--name', 'terry/#PLM-001', '--work-item-id', '564587fe700d43b81b080ab8',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/branches`);
  assert.strictEqual(parsed.params.name, 'terry/#PLM-001');
  assert.strictEqual(parsed.params.work_item_id, '564587fe700d43b81b080ab8');
});

testInCleanEnv('scm branch-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'branch-create', PID, RID,
    '--name', 'terry/#PLM-001',
    '--sender-name', 'terry',
    '--is-default',
    '--work-item-identifiers', 'PLM-001,PLM-002',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/branches`);
  assert.strictEqual(parsed.json.name, 'terry/#PLM-001');
  assert.strictEqual(parsed.json.sender_name, 'terry');
  assert.strictEqual(parsed.json.is_default, true);
  assert.deepStrictEqual(parsed.json.work_item_identifiers, ['PLM-001', 'PLM-002']);
});

testInCleanEnv('scm branch-create requires name and sender name', async () => {
  await assert.rejects(
    () => scm.run(['branch-create', PID, RID, '--name', 'x']),
    /--sender-name is required/,
  );
  await assert.rejects(
    () => scm.run(['branch-create', PID, RID]),
    /--name is required/,
  );
  await assert.rejects(
    () => scm.run(['branch-create', PID]),
    /A platform id and repository id are required/,
  );
});

testInCleanEnv('scm branch-get dry-run builds correct request', async () => {
  const output = await dryRun(['branch-get', PID, RID, BID]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/branches/${BID}`);
});

testInCleanEnv('scm branch-update dry-run sends PATCH with partial body', async () => {
  const output = await dryRun([
    'branch-update', PID, RID, BID,
    '--is-default',
    '--work-item-identifiers', 'PLM-001',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/branches/${BID}`);
  assert.deepStrictEqual(parsed.json, { is_default: true, work_item_identifiers: ['PLM-001'] });
});

testInCleanEnv('scm branch-delete dry-run builds correct request', async () => {
  const output = await dryRun(['branch-delete', PID, RID, BID]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/branches/${BID}`);
});

testInCleanEnv('scm branch-delete requires all three ids', async () => {
  await assert.rejects(
    () => scm.run(['branch-delete', PID, RID]),
    /A platform id, repository id, and branch id are required/,
  );
});

// ── Commit subcommands ────────────────────────────────────────────────

testInCleanEnv('scm commit-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'commit-create',
    '--sha', '96a024347146ebdc5f481f45e6e6871e0c43af5f',
    '--message', 'feat(scope): #PLM-001 initialization code structure',
    '--committer-name', 'terry',
    '--committed-at', '1403018919',
    '--tree-id', '1bf8989985e70389c07daa5052464a9c6f4896bb',
    '--files-added', 'index.ts',
    '--files-removed', 'utilities.ts,old.ts',
    '--files-modified', 'README.md',
    '--work-item-identifiers', 'PLM-001',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, '/v1/scm/commits');
  assert.strictEqual(parsed.json.sha, '96a024347146ebdc5f481f45e6e6871e0c43af5f');
  assert.strictEqual(parsed.json.committed_at, 1403018919);
  assert.deepStrictEqual(parsed.json.files_added, ['index.ts']);
  assert.deepStrictEqual(parsed.json.files_removed, ['utilities.ts', 'old.ts']);
  assert.deepStrictEqual(parsed.json.files_modified, ['README.md']);
  assert.deepStrictEqual(parsed.json.work_item_identifiers, ['PLM-001']);
});

testInCleanEnv('scm commit-create requires all mandatory fields', async () => {
  await assert.rejects(
    () => scm.run(['commit-create']),
    /--sha is required/,
  );
  await assert.rejects(
    () => scm.run(['commit-create', '--sha', 'abc']),
    /--message is required/,
  );
  await assert.rejects(
    () => scm.run(['commit-create', '--sha', 'abc', '--message', 'm', '--committer-name', 't']),
    /--committed-at is required/,
  );
  await assert.rejects(
    () => scm.run([
      'commit-create',
      '--sha', 'abc', '--message', 'm', '--committer-name', 't', '--committed-at', '1',
    ]),
    /--files-added is required/,
  );
});

testInCleanEnv('scm commit-create rejects non-numeric committed-at', async () => {
  await assert.rejects(
    () => scm.run([
      'commit-create',
      '--sha', 'abc', '--message', 'm', '--committer-name', 't', '--committed-at', 'yesterday',
      '--files-added', 'a', '--files-removed', 'b', '--files-modified', 'c',
    ]),
    /--committed-at must be a number/,
  );
});

testInCleanEnv('scm commit-get dry-run builds correct request', async () => {
  const output = await dryRun(['commit-get', '96a024347146ebdc5f481f45e6e6871e0c43af5f']);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/commits/96a024347146ebdc5f481f45e6e6871e0c43af5f');
});

testInCleanEnv('scm commit-list dry-run builds correct request', async () => {
  const output = await dryRun([
    'commit-list', '--sha', '96a024347146ebdc5f481f45e6e6871e0c43af5f',
    '--work-item-id', '564587fe700d43b81b080ab8',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/scm/commits');
  assert.strictEqual(parsed.params.sha, '96a024347146ebdc5f481f45e6e6871e0c43af5f');
  assert.strictEqual(parsed.params.work_item_id, '564587fe700d43b81b080ab8');
});

// ── Ref subcommands ───────────────────────────────────────────────────

testInCleanEnv('scm ref-list dry-run builds correct request', async () => {
  const output = await dryRun([
    'ref-list', PID, RID, '--meta-type', 'branch', '--meta-id', BID,
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/refs`);
  assert.strictEqual(parsed.params.meta_type, 'branch');
  assert.strictEqual(parsed.params.meta_id, BID);
});

testInCleanEnv('scm ref-list requires meta-type and meta-id', async () => {
  await assert.rejects(
    () => scm.run(['ref-list', PID, RID]),
    /--meta-type is required/,
  );
  await assert.rejects(
    () => scm.run(['ref-list', PID, RID, '--meta-type', 'branch']),
    /--meta-id is required/,
  );
});

testInCleanEnv('scm ref-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'ref-create', PID, RID,
    '--sha', '96a024347146ebdc5f481f45e6e6871e0c43af5f',
    '--meta-type', 'branch',
    '--meta-id', BID,
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/refs`);
  assert.deepStrictEqual(parsed.json, {
    sha: '96a024347146ebdc5f481f45e6e6871e0c43af5f',
    meta_type: 'branch',
    meta_id: BID,
  });
});

testInCleanEnv('scm ref-get dry-run builds correct request', async () => {
  const output = await dryRun(['ref-get', PID, RID, '5e451b7dd704c212f7de8b4f']);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/refs/5e451b7dd704c212f7de8b4f`);
});

// ── Pull request subcommands ──────────────────────────────────────────

const PRID = '594587fe700d43b81b080789';

testInCleanEnv('scm pr-list dry-run builds correct request', async () => {
  const output = await dryRun([
    'pr-list', PID, RID, '--number', '7',
    '--work-item-id', '564587fe700d43b81b080ab8',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/pull_requests`);
  assert.strictEqual(parsed.params.number, 7);
  assert.strictEqual(parsed.params.work_item_id, '564587fe700d43b81b080ab8');
});

testInCleanEnv('scm pr-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'pr-create', PID, RID,
    '--title', 'fix(doc): #PLM-001 fix document title',
    '--number', '1',
    '--creator-name', 'terry',
    '--source-branch-id', BID,
    '--target-branch-id', '564587fe700d43b81b080776',
    '--status', 'merged',
    '--merged-at', '1473018919',
    '--merged-commit-sha', '96a024347146ebdc5f481f45e6e6871e0c43af5f',
    '--comments-count', '2',
    '--changed-files-count', '3',
    '--work-item-identifiers', 'PLM-001',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/pull_requests`);
  assert.strictEqual(parsed.json.number, 1);
  assert.strictEqual(parsed.json.status, 'merged');
  assert.strictEqual(parsed.json.merged_at, 1473018919);
  assert.strictEqual(parsed.json.comments_count, 2);
  assert.strictEqual(parsed.json.changed_files_count, 3);
  assert.deepStrictEqual(parsed.json.work_item_identifiers, ['PLM-001']);
});

testInCleanEnv('scm pr-create requires title, number, creator, target branch, status', async () => {
  await assert.rejects(
    () => scm.run(['pr-create', PID, RID]),
    /--title is required/,
  );
  await assert.rejects(
    () => scm.run(['pr-create', PID, RID, '--title', 't']),
    /--number is required/,
  );
  await assert.rejects(
    () => scm.run(['pr-create', PID, RID, '--title', 't', '--number', '1']),
    /--creator-name is required/,
  );
  await assert.rejects(
    () => scm.run(['pr-create', PID, RID, '--title', 't', '--number', '1', '--creator-name', 'c']),
    /--target-branch-id is required/,
  );
  await assert.rejects(
    () => scm.run([
      'pr-create', PID, RID,
      '--title', 't', '--number', '1', '--creator-name', 'c', '--target-branch-id', 'x',
    ]),
    /--status is required/,
  );
});

testInCleanEnv('scm pr-create rejects non-numeric number', async () => {
  await assert.rejects(
    () => scm.run([
      'pr-create', PID, RID,
      '--title', 't', '--number', 'one', '--creator-name', 'c', '--target-branch-id', 'x', '--status', 'open',
    ]),
    /--number must be a number/,
  );
});

testInCleanEnv('scm pr-get dry-run builds correct request', async () => {
  const output = await dryRun(['pr-get', PID, RID, PRID]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/pull_requests/${PRID}`);
});

testInCleanEnv('scm pr-update dry-run sends PATCH with status and partial body', async () => {
  const output = await dryRun([
    'pr-update', PID, RID, PRID,
    '--status', 'closed',
    '--title', 'new title',
    '--deletions-count', '4',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/pull_requests/${PRID}`);
  assert.strictEqual(parsed.json.status, 'closed');
  assert.strictEqual(parsed.json.title, 'new title');
  assert.strictEqual(parsed.json.deletions_count, 4);
});

testInCleanEnv('scm pr-update requires status', async () => {
  await assert.rejects(
    () => scm.run(['pr-update', PID, RID, PRID, '--title', 'x']),
    /--status is required/,
  );
});

// ── Review subcommands ────────────────────────────────────────────────

const REV = '524587fe700d43b81b080988';

testInCleanEnv('scm review-list dry-run builds correct request', async () => {
  const output = await dryRun(['review-list', PID, RID, PRID]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/pull_requests/${PRID}/reviews`);
  assert.deepStrictEqual(parsed.params, {});
});
testInCleanEnv('scm review-create dry-run builds correct request', async () => {
  const output = await dryRun([
    'review-create', PID, RID, PRID,
    '--status', 'approved',
    '--reviewer-name', 'anytao',
    '--submitted-at', '1403014111',
    '--description', 'Review has approved',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'POST');
  assert.strictEqual(parsed.path, `/v1/scm/products/${PID}/repositories/${RID}/pull_requests/${PRID}/reviews`);
  assert.strictEqual(parsed.json.status, 'approved');
  assert.strictEqual(parsed.json.reviewer_name, 'anytao');
  assert.strictEqual(parsed.json.submitted_at, 1403014111);
  assert.strictEqual(parsed.json.description, 'Review has approved');
});

testInCleanEnv('scm review-create requires status, reviewer, submitted-at', async () => {
  await assert.rejects(
    () => scm.run(['review-create', PID, RID, PRID]),
    /--status is required/,
  );
  await assert.rejects(
    () => scm.run(['review-create', PID, RID, PRID, '--status', 'approved']),
    /--reviewer-name is required/,
  );
  await assert.rejects(
    () => scm.run(['review-create', PID, RID, PRID, '--status', 'approved', '--reviewer-name', 'a']),
    /--submitted-at is required/,
  );
});

testInCleanEnv('scm review-get dry-run builds correct request', async () => {
  const output = await dryRun(['review-get', PID, RID, PRID, REV]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(
    parsed.path,
    `/v1/scm/products/${PID}/repositories/${RID}/pull_requests/${PRID}/reviews/${REV}`,
  );
});

testInCleanEnv('scm review-get requires all four ids', async () => {
  await assert.rejects(
    () => scm.run(['review-get', PID, RID, PRID]),
    /A platform id, repository id, pull request id, and review id are required/,
  );
});

testInCleanEnv('scm review-update dry-run sends PATCH with partial body', async () => {
  const output = await dryRun([
    'review-update', PID, RID, PRID, REV,
    '--status', 'request_changes',
    '--submitted-at', '1403014222',
  ]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.strictEqual(
    parsed.path,
    `/v1/scm/products/${PID}/repositories/${RID}/pull_requests/${PRID}/reviews/${REV}`,
  );
  assert.deepStrictEqual(parsed.json, { status: 'request_changes', submitted_at: 1403014222 });
});

testInCleanEnv('scm review-update with no flags sends empty body', async () => {
  const output = await dryRun(['review-update', PID, RID, PRID, REV]);
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.method, 'PATCH');
  assert.deepStrictEqual(parsed.json, {});
});

// ── Parser errors ─────────────────────────────────────────────────────

testInCleanEnv('scm rejects unknown option', async () => {
  setupAuth();
  await assert.rejects(
    () => scm.run(['platform-list', '--unknown-flag']),
    /Unknown option/,
  );
});

testInCleanEnv('scm rejects missing flag value', async () => {
  setupAuth();
  await assert.rejects(
    () => scm.run(['platform-create', '--name']),
    /Flag --name requires a value/,
  );
});

testInCleanEnv('scm rejects unexpected positional argument', async () => {
  setupAuth();
  await assert.rejects(
    () => scm.run(['platform-get', 'id1', 'id2']),
    /Unexpected argument/,
  );
});

testInCleanEnv('scm unknown subcommand errors', async () => {
  setupAuth();
  await assert.rejects(
    () => scm.run(['unknown']),
    /Unknown scm subcommand/,
  );
});
