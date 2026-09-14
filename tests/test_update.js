'use strict';

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

const update = require('../scripts/commands/update');

const REPO_ROOT = path.resolve(__dirname, '..');

async function withCapturedConsole(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...parts) => logs.push(parts.join(' '));
  console.error = (...parts) => errors.push(parts.join(' '));
  try {
    await fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  return { logs, errors };
}

function fakeNpm(viewResult, installResult = null) {
  const calls = [];
  return {
    calls,
    npm(args, options = {}) {
      calls.push({ args, options });
      if (args[0] === 'view') {
        return viewResult;
      }
      return installResult;
    },
  };
}

// ── compareVersions ───────────────────────────────────────────────────

test('compareVersions orders releases numerically', () => {
  assert.strictEqual(update.compareVersions('0.9.1', '0.9.1'), 0);
  assert.strictEqual(update.compareVersions('0.9.2', '0.9.1'), 1);
  assert.strictEqual(update.compareVersions('0.9.1', '0.9.2'), -1);
  assert.strictEqual(update.compareVersions('0.10.0', '0.9.9'), 1);
  assert.strictEqual(update.compareVersions('1.0.0', '0.99.99'), 1);
});

test('compareVersions sorts prereleases below their release', () => {
  assert.strictEqual(update.compareVersions('1.0.0-beta.1', '1.0.0'), -1);
  assert.strictEqual(update.compareVersions('1.0.0', '1.0.0-beta.1'), 1);
  assert.strictEqual(update.compareVersions('1.0.0-beta.2', '1.0.0-beta.1'), 1);
});

// ── run() ─────────────────────────────────────────────────────────────

test('update reports up to date without installing', async () => {
  const fake = fakeNpm({ status: 0, stdout: '0.9.1\n' });
  const { logs } = await withCapturedConsole(() =>
    update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }));
  assert.strictEqual(fake.calls.length, 1);
  assert.ok(logs.join('\n').includes('Already up to date'), logs.join('\n'));
});

test('update --check reports without installing', async () => {
  const fake = fakeNpm({ status: 0, stdout: '1.2.3\n' });
  const { logs } = await withCapturedConsole(() =>
    update.run(['--check'], { npm: fake.npm, localVersion: () => '0.9.1' }));
  assert.strictEqual(fake.calls.length, 1, 'only npm view should run');
  assert.ok(logs.join('\n').includes('Update available: 0.9.1 → 1.2.3'), logs.join('\n'));
});

test('update upgrades the global package when behind', async () => {
  const fake = fakeNpm(
    { status: 0, stdout: '1.2.3\n' },
    { status: 0 },
  );
  const { logs } = await withCapturedConsole(() =>
    update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }));
  const installCall = fake.calls.find((call) => call.args[0] === 'install');
  assert.ok(installCall, 'npm install should run');
  assert.deepStrictEqual(installCall.args, ['install', '-g', '@metaphorli/pingcode-cli@latest']);
  assert.strictEqual(installCall.options.stdio, 'inherit');
  assert.ok(logs.join('\n').includes('Updated to 1.2.3'), logs.join('\n'));
  assert.ok(logs.join('\n').includes('pingcode install --force'), logs.join('\n'));
});

test('update surfaces npm view failures', async () => {
  const fake = fakeNpm({ status: 1, stderr: 'registry unreachable' });
  await assert.rejects(
    () => update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }),
    /Could not query npm for the latest version/,
  );
});

test('update surfaces failed global installs', async () => {
  const fake = fakeNpm({ status: 0, stdout: '1.2.3\n' }, { status: 1 });
  await assert.rejects(
    () => update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }),
    /Global install failed.*npm install -g @metaphorli\/pingcode-cli@latest/s,
  );
});

test('update rejects unknown options', async () => {
  await assert.rejects(
    () => update.run(['--bogus'], { npm: fakeNpm({ status: 0, stdout: '0.9.1\n' }).npm }),
    /Unknown option: --bogus/,
  );
});

// ── printVersionInfo (`pingcode -v`) ──────────────────────────────────

test('-v prints current version and up-to-date status', async () => {
  const fake = fakeNpm({ status: 0, stdout: '0.9.1\n' });
  const { logs } = await withCapturedConsole(() =>
    update.printVersionInfo({ npm: fake.npm, localVersion: () => '0.9.1' }));
  assert.strictEqual(logs[0], 'pingcode-cli 0.9.1');
  assert.ok(logs.join('\n').includes('Latest on npm: 0.9.1 (up to date)'), logs.join('\n'));
});

test('-v points at pingcode update when behind', async () => {
  const fake = fakeNpm({ status: 0, stdout: '1.2.3\n' });
  const { logs } = await withCapturedConsole(() =>
    update.printVersionInfo({ npm: fake.npm, localVersion: () => '0.9.1' }));
  assert.strictEqual(logs[0], 'pingcode-cli 0.9.1');
  assert.ok(logs.join('\n').includes('run `pingcode update` to upgrade'), logs.join('\n'));
});

test('-v degrades gracefully when npm is unreachable', async () => {
  const fake = fakeNpm({ error: new Error('getaddrinfo ENOTFOUND registry.npmjs.org') });
  const { logs, errors } = await withCapturedConsole(() =>
    update.printVersionInfo({ npm: fake.npm, localVersion: () => '0.9.1' }));
  assert.strictEqual(logs[0], 'pingcode-cli 0.9.1');
  assert.strictEqual(errors.length, 1);
  assert.ok(errors[0].includes('Could not check npm for the latest version'), errors[0]);
});

// ── CLI surface ───────────────────────────────────────────────────────

test('pingcode update --help prints usage', () => {
  const result = spawnSync('node', [path.join(REPO_ROOT, 'scripts/pingcode.js'), 'update', '--help'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('Usage: pingcode update [--check]'), result.stdout);
});
