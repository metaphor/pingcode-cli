'use strict';

const fs = require('node:fs');
const os = require('node:os');
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

function fakeNpm(viewResult, installResult = null, rootResult = { status: 1 }) {
  const calls = [];
  return {
    calls,
    npm(args, options = {}) {
      calls.push({ args, options });
      if (args[0] === 'view') {
        return viewResult;
      }
      if (args[0] === 'root') {
        return rootResult;
      }
      return installResult;
    },
  };
}

// Sandboxes HOME/PATH so wrapper reconciliation runs against throwaway files.
async function withSandbox(run) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-update-'));
  const prevHome = process.env.HOME;
  const prevPath = process.env.PATH;
  process.env.HOME = tmp;
  try {
    return await run(tmp);
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = prevPath;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
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

// ── colorize ──────────────────────────────────────────────────────────

test('colorize emits ANSI when enabled and plain text when disabled', () => {
  assert.strictEqual(update.colorize('✔ Already up to date', update.YELLOW, true),
    '\x1b[33m✔ Already up to date\x1b[0m');
  assert.strictEqual(update.colorize('✓ Updated to 1.2.3', update.GREEN, true),
    '\x1b[32m✓ Updated to 1.2.3\x1b[0m');
  assert.strictEqual(update.colorize('plain', update.GREEN, false), 'plain');
});

test('colorEnabled honors NO_COLOR and FORCE_COLOR over TTY state', () => {
  const originalNoColor = process.env.NO_COLOR;
  const originalForce = process.env.FORCE_COLOR;
  try {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    assert.strictEqual(update.colorEnabled({ isTTY: false }), false);
    assert.strictEqual(update.colorEnabled({ isTTY: true }), true);
    process.env.NO_COLOR = '1';
    assert.strictEqual(update.colorEnabled({ isTTY: true }), false);
    process.env.FORCE_COLOR = '1';
    assert.strictEqual(update.colorEnabled({ isTTY: false }), true, 'FORCE_COLOR wins over NO_COLOR');
  } finally {
    if (originalNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = originalNoColor;
    if (originalForce === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = originalForce;
  }
});

// ── run() ─────────────────────────────────────────────────────────────

test('update reports up to date without installing', async () => {
  const fake = fakeNpm({ status: 0, stdout: '0.9.1\n' });
  const { logs } = await withCapturedConsole(() =>
    update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }));
  assert.strictEqual(fake.calls.length, 1);
  assert.deepStrictEqual(logs[0], 'Current version: 0.9.1');
  assert.ok(logs[1].includes('✔ Already up to date'), logs.join('\n'));
  assert.strictEqual(logs.length, 2, logs.join('\n'));
});

test('update --check reports without installing', async () => {
  const fake = fakeNpm({ status: 0, stdout: '1.2.3\n' });
  const { logs } = await withCapturedConsole(() =>
    update.run(['--check'], { npm: fake.npm, localVersion: () => '0.9.1' }));
  assert.strictEqual(fake.calls.length, 1, 'only npm view should run');
  assert.deepStrictEqual(logs[0], 'Current version: 0.9.1');
  assert.ok(logs[1].includes('New version available: 1.2.3'), logs.join('\n'));
  assert.ok(logs.join('\n').includes('Run `pingcode update` to install'), logs.join('\n'));
  assert.ok(!logs.join('\n').includes('Updating...'), 'check mode must not install');
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
  assert.deepStrictEqual(logs[0], 'Current version: 0.9.1');
  const joined = logs.join('\n');
  assert.ok(joined.includes('New version available: 1.2.3'), joined);
  assert.ok(joined.includes('Updating...'), joined);
  assert.ok(joined.includes('✓ Updated to 1.2.3'), joined);
  assert.ok(!joined.includes(' at '), 'success line must not print a path');
  assert.ok(joined.includes('pingcode install --force'), joined);
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

// ── wrapper reconciliation (refreshGlobalWrapper) ─────────────────────

test('update re-points a stale npx-cache wrapper at the global install', { skip: process.platform === 'win32' }, async () => {
  await withSandbox(async (tmp) => {
    const binDir = path.join(tmp, '.local', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const staleScript = path.join(tmp, '_npx', 'abc123', 'node_modules', '@metaphorli', 'pingcode-cli', 'scripts', 'pingcode.js');
    const wrapperPath = path.join(binDir, 'pingcode');
    fs.writeFileSync(wrapperPath, `#!/bin/sh\nexec node '${staleScript}' "$@"\n`, { mode: 0o755 });

    const globalLib = path.join(tmp, 'global', 'lib', 'node_modules');
    const globalScript = path.join(globalLib, '@metaphorli', 'pingcode-cli', 'scripts', 'pingcode.js');
    fs.mkdirSync(path.dirname(globalScript), { recursive: true });
    fs.writeFileSync(globalScript, '#!/usr/bin/env node\n');
    process.env.PATH = binDir;

    const fake = fakeNpm(
      { status: 0, stdout: '1.2.3\n' },
      { status: 0 },
      { status: 0, stdout: `${globalLib}\n` },
    );
    const { logs } = await withCapturedConsole(() =>
      update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }));

    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.startsWith('#!/bin/sh'), content);
    assert.ok(content.includes(globalScript), content);
    assert.ok(content.includes('"$@"'), content);
    assert.ok(logs.join('\n').includes('Re-pointed'), logs.join('\n'));
  });
});

test('update leaves an already-current wrapper untouched', { skip: process.platform === 'win32' }, async () => {
  await withSandbox(async (tmp) => {
    const binDir = path.join(tmp, '.local', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const globalLib = path.join(tmp, 'global', 'lib', 'node_modules');
    const globalScript = path.join(globalLib, '@metaphorli', 'pingcode-cli', 'scripts', 'pingcode.js');
    fs.mkdirSync(path.dirname(globalScript), { recursive: true });
    fs.writeFileSync(globalScript, '#!/usr/bin/env node\n');
    const wrapperPath = path.join(binDir, 'pingcode');
    fs.writeFileSync(wrapperPath, `#!/bin/sh\nexec node '${globalScript}' "$@"\n`, { mode: 0o755 });
    process.env.PATH = binDir;

    const fake = fakeNpm(
      { status: 0, stdout: '1.2.3\n' },
      { status: 0 },
      { status: 0, stdout: `${globalLib}\n` },
    );
    const { logs } = await withCapturedConsole(() =>
      update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }));

    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.includes(`exec node '${globalScript}' "$@"`), content);
    assert.ok(!logs.join('\n').includes('Re-pointed'), logs.join('\n'));
    assert.ok(!logs.join('\n').includes('does not manage'), logs.join('\n'));
  });
});

test('update notes but never rewrites an unmanaged wrapper target', { skip: process.platform === 'win32' }, async () => {
  await withSandbox(async (tmp) => {
    const binDir = path.join(tmp, '.local', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const checkoutScript = path.join(tmp, 'checkout', 'scripts', 'pingcode.js');
    const wrapperPath = path.join(binDir, 'pingcode');
    fs.writeFileSync(wrapperPath, `#!/bin/sh\nexec node '${checkoutScript}' "$@"\n`, { mode: 0o755 });

    const globalLib = path.join(tmp, 'global', 'lib', 'node_modules');
    const globalScript = path.join(globalLib, '@metaphorli', 'pingcode-cli', 'scripts', 'pingcode.js');
    fs.mkdirSync(path.dirname(globalScript), { recursive: true });
    fs.writeFileSync(globalScript, '#!/usr/bin/env node\n');
    process.env.PATH = binDir;

    const fake = fakeNpm(
      { status: 0, stdout: '1.2.3\n' },
      { status: 0 },
      { status: 0, stdout: `${globalLib}\n` },
    );
    const { logs } = await withCapturedConsole(() =>
      update.run([], { npm: fake.npm, localVersion: () => '0.9.1' }));

    const content = fs.readFileSync(wrapperPath, 'utf8');
    assert.ok(content.includes(checkoutScript), content);
    assert.ok(logs.join('\n').includes('does not manage'), logs.join('\n'));
  });
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
