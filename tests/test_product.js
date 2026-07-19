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
