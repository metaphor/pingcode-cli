'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const attachment = require('../scripts/commands/attachment');
const { tmpFile, clearEnv, restoreEnv, mockFetch, fakeResponse } = require('./helpers');

// ── Test infrastructure ───────────────────────────────────────────────

function testInCleanEnv(name, fn) {
  test(name, async () => {
    const original = clearEnv();
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-test-'));
    process.env.PINGCODE_TOKEN_CACHE = path.join(tmpdir, 'token.json');
    try {
      await fn(tmpdir);
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

function tokenResponse() {
  return fakeResponse({ access_token: 'tok', expires_in: 3600 });
}

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('attachment --help shows module help', async () => {
  const output = await captureLogAsync(() => attachment.run(['--help']));
  assert.ok(output.includes('PingCode attachment'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('upload-file'));
  assert.ok(output.includes('upload-snippet'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('get'));
  assert.ok(output.includes('delete'));
  assert.ok(output.includes('--dry-run'));
  assert.ok(output.includes('--compact'));
});

// ── Subcommand help ────────────────────────────────────────────────────

testInCleanEnv('attachment upload-file --help shows usage', async () => {
  const output = await captureLogAsync(() => attachment.run(['upload-file', '--help']));
  assert.ok(output.includes('Usage: pingcode attachment upload-file'));
  assert.ok(output.includes('--file'));
  assert.ok(output.includes('--title'));
  assert.ok(output.includes('--comment-id'));
});

testInCleanEnv('attachment upload-snippet --help shows usage', async () => {
  const output = await captureLogAsync(() => attachment.run(['upload-snippet', '--help']));
  assert.ok(output.includes('Usage: pingcode attachment upload-snippet'));
  assert.ok(output.includes('--format'));
  assert.ok(output.includes('--content'));
});

// ── upload-file ───────────────────────────────────────────────────────

testInCleanEnv('attachment upload-file dry-run with raw id', async (tmpdir) => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(tokenResponse());
  const file = tmpFile(tmpdir, 'pic.png');
  fs.writeFileSync(file, 'pngdata');

  const output = await captureLogAsync(() => attachment.run([
    'upload-file', 'work_item', 'wi-123',
    '--file', file,
    '--title', 'screenshot',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.upload.path, '/v1/attachments');
  assert.strictEqual(parsed.upload.params.principal_type, 'work_item');
  assert.strictEqual(parsed.upload.params.principal_id, 'wi-123');
  assert.strictEqual(parsed.upload.form.title, 'screenshot');
  assert.strictEqual(parsed.upload.form.file, file);
  assert.strictEqual(parsed.resolution, null);
});

testInCleanEnv('attachment upload-file dry-run with identifier', async (tmpdir) => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(tokenResponse());
  const file = tmpFile(tmpdir, 'pic.png');
  fs.writeFileSync(file, 'pngdata');

  const output = await captureLogAsync(() => attachment.run([
    'upload-file', 'work_item', 'SCR-123',
    '--file', file,
    '--title', 'screenshot',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.resolution.method, 'GET');
  assert.strictEqual(parsed.resolution.path, '/v1/project/work_items');
  assert.strictEqual(parsed.resolution.params.identifier, 'SCR-123');
  assert.strictEqual(parsed.upload.params.principal_id, '{id}');
});

testInCleanEnv('attachment upload-file with comment-id', async (tmpdir) => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(tokenResponse());
  const file = tmpFile(tmpdir, 'pic.png');
  fs.writeFileSync(file, 'pngdata');

  const output = await captureLogAsync(() => attachment.run([
    'upload-file', 'work_item', 'wi-123',
    '--file', file,
    '--title', 'screenshot',
    '--comment-id', 'cmt-456',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.upload.params.comment_id, 'cmt-456');
});

testInCleanEnv('attachment upload-file requires file and title', async () => {
  await assert.rejects(
    () => attachment.run(['upload-file', 'work_item', 'wi-123']),
    /--file is required/,
  );
  await assert.rejects(
    () => attachment.run(['upload-file', 'work_item', 'wi-123', '--file', '/tmp/x']),
    /--title is required/,
  );
});

testInCleanEnv('attachment upload-file rejects missing file', async () => {
  await assert.rejects(
    () => attachment.run(['upload-file', 'work_item', 'wi-123', '--file', '/tmp/nonexistent', '--title', 'x']),
    /File not found/,
  );
});

testInCleanEnv('attachment upload-file sends multipart request', async (tmpdir) => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  const file = tmpFile(tmpdir, 'pic.png');
  fs.writeFileSync(file, 'pngdata');

  let capturedBody = null;
  let capturedHeaders = null;
  mockFetch((url, options) => {
    if (url.includes('/v1/auth/token')) {
      return tokenResponse();
    }
    capturedBody = options.body;
    capturedHeaders = options.headers;
    return fakeResponse({
      id: 'att-1',
      url: 'https://open.pingcode.com/v1/attachments/att-1',
      title: 'screenshot',
      size: 7,
      type: 'file',
      file_type: 'image',
      ext: 'png',
    });
  });

  const output = await captureLogAsync(() => attachment.run([
    'upload-file', 'work_item', 'wi-123',
    '--file', file,
    '--title', 'screenshot',
  ]));

  assert.ok(capturedBody instanceof FormData, 'request body should be FormData');
  assert.ok(!capturedHeaders['Content-Type'] || capturedHeaders['Content-Type'].includes('multipart/form-data'), 'Content-Type should be multipart');
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.id, 'att-1');
  assert.strictEqual(parsed.type, 'file');
});

// ── upload-snippet ─────────────────────────────────────────────────────

testInCleanEnv('attachment upload-snippet dry-run', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(tokenResponse());

  const output = await captureLogAsync(() => attachment.run([
    'upload-snippet', 'work_item', 'wi-123',
    '--title', 'sample',
    '--format', 'javascript',
    '--content', "const a = 'abc';",
    '--comment-id', 'cmt-456',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.upload.method, 'POST');
  assert.strictEqual(parsed.upload.path, '/v1/attachments');
  assert.strictEqual(parsed.upload.json.principal_type, 'work_item');
  assert.strictEqual(parsed.upload.json.principal_id, 'wi-123');
  assert.strictEqual(parsed.upload.json.title, 'sample');
  assert.strictEqual(parsed.upload.json.format, 'javascript');
  assert.strictEqual(parsed.upload.json.content, "const a = 'abc';");
  assert.strictEqual(parsed.upload.json.comment_id, 'cmt-456');
});

testInCleanEnv('attachment upload-snippet validates required fields', async () => {
  await assert.rejects(
    () => attachment.run(['upload-snippet', 'work_item', 'wi-123']),
    /--title is required/,
  );
  await assert.rejects(
    () => attachment.run(['upload-snippet', 'work_item', 'wi-123', '--title', 'x']),
    /--format is required/,
  );
  await assert.rejects(
    () => attachment.run([
      'upload-snippet', 'work_item', 'wi-123',
      '--title', 'x', '--format', 'bad', '--content', 'c',
    ]),
    /Unsupported snippet format/,
  );
  await assert.rejects(
    () => attachment.run([
      'upload-snippet', 'work_item', 'wi-123',
      '--title', 'x', '--format', 'javascript',
    ]),
    /--content is required/,
  );
});

// ── list ───────────────────────────────────────────────────────────────

testInCleanEnv('attachment list dry-run', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(tokenResponse());

  const output = await captureLogAsync(() => attachment.run([
    'list', 'work_item', 'wi-123',
    '--comment-id', 'cmt-456',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/attachments');
  assert.strictEqual(parsed.params.principal_type, 'work_item');
  assert.strictEqual(parsed.params.principal_id, 'wi-123');
  assert.strictEqual(parsed.params.comment_id, 'cmt-456');
});

// ── get ────────────────────────────────────────────────────────────────

testInCleanEnv('attachment get dry-run', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(tokenResponse());

  const output = await captureLogAsync(() => attachment.run([
    'get', 'att-1', 'work_item', 'wi-123',
    '--comment-id', 'cmt-456',
    '--review-id', 'rev-789',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'GET');
  assert.strictEqual(parsed.path, '/v1/attachments/att-1');
  assert.strictEqual(parsed.params.principal_type, 'work_item');
  assert.strictEqual(parsed.params.principal_id, 'wi-123');
  assert.strictEqual(parsed.params.comment_id, 'cmt-456');
  assert.strictEqual(parsed.params.review_id, 'rev-789');
});

// ── delete ─────────────────────────────────────────────────────────────

testInCleanEnv('attachment delete dry-run', async () => {
  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  mockFetch(tokenResponse());

  const output = await captureLogAsync(() => attachment.run([
    'delete', 'att-1', 'work_item', 'wi-123',
    '--comment-id', 'cmt-456',
    '--dry-run',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.dry_run, true);
  assert.strictEqual(parsed.method, 'DELETE');
  assert.strictEqual(parsed.path, '/v1/attachments/att-1');
  assert.strictEqual(parsed.params.principal_type, 'work_item');
  assert.strictEqual(parsed.params.principal_id, 'wi-123');
  assert.strictEqual(parsed.params.comment_id, 'cmt-456');
});

// ── Validation ─────────────────────────────────────────────────────────

testInCleanEnv('attachment rejects invalid principal_type', async () => {
  await assert.rejects(
    () => attachment.run(['list', 'bad_type', 'id-123']),
    /Invalid principal_type/,
  );
});

testInCleanEnv('attachment requires enough positionals', async () => {
  await assert.rejects(
    () => attachment.run(['list', 'work_item']),
    /principal_type and principal_id are required/,
  );
  await assert.rejects(
    () => attachment.run(['get', 'att-1', 'work_item']),
    /attachment_id, principal_type and principal_id are required/,
  );
});

// ── Compact output ─────────────────────────────────────────────────────

testInCleanEnv('attachment list compact output', async () => {
  mockFetch(fakeResponse({
    page_size: 30,
    page_index: 0,
    total: 1,
    values: [{
      id: 'att-1',
      url: 'https://open.pingcode.com/v1/attachments/att-1',
      title: 'snippet',
      size: 16,
      type: 'snippet',
      format: 'javascript',
      content: "const a = 'abc';",
      line: 1,
      created_at: 1583290347,
      created_by: {
        id: 'u-1',
        url: 'https://open.pingcode.com/v1/directory/users/u-1',
        name: 'john',
        display_name: 'John',
      },
    }],
  }));

  const output = await captureLogAsync(() => attachment.run([
    'list', 'work_item', 'wi-123', '--compact', '--token', 'tok',
  ]));

  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.count, 1);
  const item = parsed.values[0];
  assert.strictEqual(item.title, 'snippet');
  assert.strictEqual(item.created_by, 'John');
  assert.ok(!item.url);
});

// ── Unknown subcommand ─────────────────────────────────────────────────

testInCleanEnv('attachment unknown subcommand errors', async () => {
  await assert.rejects(
    () => attachment.run(['unknown']),
    /Unknown attachment subcommand/,
  );
});
