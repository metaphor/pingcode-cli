const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

const { shellQuote } = require('./helpers');

const REPO_ROOT = path.resolve(__dirname, '..');

function expectedCli(target) {
  return 'node ' + shellQuote(path.join(target, 'scripts', 'pingcode.js'));
}

function runInstall(args, env = process.env) {
  return spawnSync('node', ['bin/install.js', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env,
  });
}

function isolatedHomeEnv(homeDir, codexHome = null) {
  const env = { ...process.env };
  env.HOME = homeDir;
  delete env.PINGCODE_SKILL_NAME;
  if (codexHome === null) {
    delete env.CODEX_HOME;
  } else {
    env.CODEX_HOME = codexHome;
  }
  return env;
}

function expectedPaths(home, codexHome = null) {
  const codexRoot = codexHome ? path.resolve(codexHome) : path.join(home, '.codex');
  return {
    codex: {
      main: path.join(codexRoot, 'skills', 'pingcode'),
      alias: path.join(codexRoot, 'skills', 'pingcode-ctx'),
    },
    claude: {
      main: path.join(home, '.claude', 'skills', 'pingcode'),
      alias: path.join(home, '.claude', 'skills', 'pingcode-ctx'),
    },
    openclaw: {
      main: path.join(home, '.openclaw', 'skills', 'pingcode'),
      alias: path.join(home, '.openclaw', 'skills', 'pingcode-ctx'),
    },
    hermes: {
      main: path.join(home, '.hermes', 'skills', 'project-management', 'pingcode'),
      alias: path.join(home, '.hermes', 'skills', 'project-management', 'pingcode-ctx'),
    },
  };
}

function createAgentHomes(home, codexHome = null, keys = null) {
  const paths = expectedPaths(home, codexHome);
  const selected = keys || Object.keys(paths);
  for (const key of selected) {
    if (key === 'hermes') {
      fs.mkdirSync(path.join(home, '.hermes'), { recursive: true });
    } else {
      fs.mkdirSync(paths[key].main.split(path.sep).slice(0, -2).join(path.sep), { recursive: true });
    }
  }
}

function assertInstalled(target) {
  assert.ok(fs.existsSync(path.join(target, 'SKILL.md')), `SKILL.md missing in ${target}`);
  const skillDoc = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
  const expectedCliCmd = expectedCli(target);
  assert.ok(skillDoc.includes(expectedCliCmd), `Expected CLI command ${expectedCliCmd} not found in SKILL.md`);
  assert.strictEqual(skillDoc.includes('python3 scripts/pingcode.py'), false, 'Old python command should be removed');
  assert.strictEqual(skillDoc.includes('python3 scripts/pingcode_ctx.py'), false, 'Old python ctx command should be removed');
}

function assertNotInstalled(target) {
  assert.strictEqual(fs.existsSync(target), false, `unexpected install at ${target}`);
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-install-test-'));
}

function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('installed docs use absolute cli path', () => {
  const tmpdir = tmpDir();
  try {
    const target = path.join(tmpdir, 'pingcode skill');
    const result = runInstall(['--target', target, '--force']);
    assert.strictEqual(result.status, 0, result.stderr);

    const skillDoc = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
    const readme = fs.readFileSync(path.join(target, 'README.md'), 'utf8');
    const workflows = fs.readFileSync(path.join(target, 'references', 'workflows.md'), 'utf8');
    const aliasDoc = fs.readFileSync(path.join(path.dirname(target), 'pingcode-ctx', 'SKILL.md'), 'utf8');
    const expected = expectedCli(target);

    assert.ok(result.stdout.includes('Installed PingCode skill'));
    assert.ok(skillDoc.includes(expected), 'skill doc should contain installed CLI path');
    assert.ok(readme.includes(expected), 'readme should contain installed CLI path');
    assert.ok(workflows.includes(expected), 'workflows should contain installed CLI path');
    assert.ok(aliasDoc.includes(expected), 'alias doc should contain installed CLI path');
    assert.strictEqual(skillDoc.includes('python3 scripts/pingcode.py'), false);
    assert.strictEqual(readme.includes('python3 scripts/pingcode.py'), false);
    assert.strictEqual(workflows.includes('python3 scripts/pingcode.py'), false);
    assert.strictEqual(skillDoc.includes('python3 scripts/pingcode_ctx.py'), false);
    assert.strictEqual(readme.includes('python3 scripts/pingcode_ctx.py'), false);
  } finally {
    rmDir(tmpdir);
  }
});

test('target combined with only flag errors', () => {
  const tmpdir = tmpDir();
  try {
    const target = path.join(tmpdir, 'pingcode');
    const result = runInstall(['--target', target, '--codex-only']);
    assert.notStrictEqual(result.status, 0);
    assert.ok(result.stderr.includes('--target cannot be combined'));
  } finally {
    rmDir(tmpdir);
  }
});

test('default install writes existing agent roots', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    createAgentHomes(home);
    const result = runInstall([], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    for (const key of Object.keys(paths)) {
      assertInstalled(paths[key].main);
      assert.ok(fs.existsSync(paths[key].alias), `alias missing for ${key}`);
      const aliasDoc = fs.readFileSync(path.join(paths[key].alias, 'SKILL.md'), 'utf8');
      assert.ok(aliasDoc.includes(expectedCli(paths[key].main)));
      assert.ok(result.stdout.includes('[ok]'));
    }
    for (const label of ['Codex', 'Claude Code', 'OpenClaw', 'Hermes']) {
      assert.ok(result.stdout.includes(label));
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('default install skips missing agent roots', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    createAgentHomes(home, null, ['codex', 'claude']);
    const result = runInstall([], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.codex.main);
    assert.ok(fs.existsSync(paths.codex.alias));
    assertInstalled(paths.claude.main);
    assert.ok(fs.existsSync(paths.claude.alias));
    for (const key of ['openclaw', 'hermes']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].alias);
    }
    assert.ok(result.stdout.includes('[skip] OpenClaw'));
    assert.ok(result.stdout.includes('[skip] Hermes'));
  } finally {
    rmDir(tmpdir);
  }
});

test('default install no existing agent roots is noop', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall([], env);
    assert.strictEqual(result.status, 0, result.stderr);
    const paths = expectedPaths(home);
    for (const key of Object.keys(paths)) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].alias);
    }
    assert.ok(result.stdout.includes('No supported agent directories were found'));
  } finally {
    rmDir(tmpdir);
  }
});

test('codex only scope', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--codex-only'], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.codex.main);
    assert.ok(fs.existsSync(paths.codex.alias));
    for (const key of ['claude', 'openclaw', 'hermes']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].alias);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('claude only scope', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--claude-only'], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.claude.main);
    assert.ok(fs.existsSync(paths.claude.alias));
    for (const key of ['codex', 'openclaw', 'hermes']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].alias);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('openclaw only scope', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--openclaw-only'], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.openclaw.main);
    assert.ok(fs.existsSync(paths.openclaw.alias));
    for (const key of ['codex', 'claude', 'hermes']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].alias);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('hermes only scope', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--hermes-only'], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.hermes.main);
    assert.ok(fs.existsSync(paths.hermes.alias));
    assert.strictEqual(path.basename(path.dirname(paths.hermes.main)), 'project-management', 'Hermes install must live under the project-management category');
    for (const key of ['codex', 'claude', 'openclaw']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].alias);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('codex home only affects codex root', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const codexHome = path.join(tmpdir, 'custom-codex');
    const env = isolatedHomeEnv(home, codexHome);
    createAgentHomes(home, codexHome);
    const result = runInstall([], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home, codexHome);
    assertInstalled(paths.codex.main);
    assert.ok(fs.existsSync(paths.codex.alias));
    const defaultCodex = path.join(home, '.codex', 'skills', 'pingcode');
    assert.strictEqual(fs.existsSync(defaultCodex), false, 'default codex location should not be touched');
    for (const key of ['claude', 'openclaw', 'hermes']) {
      assertInstalled(paths[key].main);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('per root failure does not abort others', () => {
  if (process.platform === 'win32' || process.getuid() === 0) {
    test.skip('permission-based isolation requires non-root POSIX env');
    return;
  }
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const claudeSkillsRoot = path.join(home, '.claude', 'skills');
    fs.mkdirSync(claudeSkillsRoot, { recursive: true });
    createAgentHomes(home, null, ['codex', 'openclaw', 'hermes']);
    fs.chmodSync(claudeSkillsRoot, 0o500);
    const env = isolatedHomeEnv(home);
    let result;
    try {
      result = runInstall([], env);
    } finally {
      fs.chmodSync(claudeSkillsRoot, 0o700);
    }

    const paths = expectedPaths(home);
    assert.strictEqual(fs.existsSync(path.join(paths.claude.main, 'SKILL.md')), false);
    assertInstalled(paths.codex.main);
    assertInstalled(paths.openclaw.main);
    assertInstalled(paths.hermes.main);
    assert.strictEqual(result.status, 2, result.stdout + result.stderr);
    assert.ok(result.stderr.includes('[fail]'));
    assert.ok(result.stderr.includes('Claude Code'));
    assert.ok(result.stdout.includes('[ok]'));
  } finally {
    rmDir(tmpdir);
  }
});
