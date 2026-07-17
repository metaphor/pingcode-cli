const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

function runInstall(args, env = process.env, input = null, cwd = REPO_ROOT) {
  return spawnSync('node', [path.join(REPO_ROOT, 'bin/install.js'), ...args], {
    cwd,
    encoding: 'utf8',
    env,
    input,
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
      ctx: path.join(codexRoot, 'skills', 'pingcode-ctx'),
      auth: path.join(codexRoot, 'skills', 'pingcode-auth'),
      workItem: path.join(codexRoot, 'skills', 'pingcode-workitem'),
    },
    opencode: {
      main: path.join(home, '.config', 'opencode', 'skills', 'pingcode'),
      ctx: path.join(home, '.config', 'opencode', 'skills', 'pingcode-ctx'),
      auth: path.join(home, '.config', 'opencode', 'skills', 'pingcode-auth'),
      workItem: path.join(home, '.config', 'opencode', 'skills', 'pingcode-workitem'),
    },
  };
}

function createAgentHomes(home, codexHome = null, keys = null) {
  const paths = expectedPaths(home, codexHome);
  const selected = keys || Object.keys(paths);
  for (const key of selected) {
    fs.mkdirSync(paths[key].main.split(path.sep).slice(0, -2).join(path.sep), { recursive: true });
  }
}

function assertInstalled(target) {
  assert.ok(fs.existsSync(path.join(target, 'SKILL.md')), `SKILL.md missing in ${target}`);
  const skillDoc = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
  assert.ok(skillDoc.includes('pingcode'), `Expected 'pingcode' command in SKILL.md at ${target}`);
  assert.strictEqual(skillDoc.includes('python3 scripts/pingcode.py'), false, 'Old python command should be removed');
  assert.strictEqual(skillDoc.includes('python3 scripts/pingcode_ctx.py'), false, 'Old python ctx command should be removed');
  // Skill-only payload: these directories/files should NOT be installed
  assert.strictEqual(fs.existsSync(path.join(target, 'scripts')), false, `unexpected scripts/ dir in ${target}`);
  assert.strictEqual(fs.existsSync(path.join(target, 'README.md')), false, `unexpected README.md in ${target}`);
  assert.strictEqual(fs.existsSync(path.join(target, 'agents')), false, `unexpected agents/ dir in ${target}`);
  assert.strictEqual(fs.existsSync(path.join(target, 'skills')), false, `unexpected skills/ dir in ${target}`);
}

function assertNotInstalled(target) {
  assert.strictEqual(fs.existsSync(target), false, `unexpected install at ${target}`);
}

function assertAllSubSkillsInstalled(pathsEntry) {
  assertInstalled(pathsEntry.ctx);
  assertInstalled(pathsEntry.auth);
  assertInstalled(pathsEntry.workItem);
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-install-test-'));
}

function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('installed docs use pingcode command', () => {
  const tmpdir = tmpDir();
  try {
    const target = path.join(tmpdir, 'pingcode skill');
    const result = runInstall(['--target', target, '--force']);
    assert.strictEqual(result.status, 0, result.stderr);

    const skillDoc = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
    const workflows = fs.readFileSync(path.join(target, 'references', 'workflows.md'), 'utf8');

    assert.ok(result.stdout.includes('Installed PingCode skill'));
    assert.ok(skillDoc.includes('pingcode'), 'skill doc should contain pingcode command');
    assert.ok(workflows.includes('pingcode'), 'workflows should contain pingcode command');

    const parentDir = path.dirname(target);
    for (const subName of ['pingcode-ctx', 'pingcode-auth', 'pingcode-workitem']) {
      const subDoc = fs.readFileSync(path.join(parentDir, subName, 'SKILL.md'), 'utf8');
      assert.ok(subDoc.includes('pingcode'), `${subName} doc should contain pingcode command`);
      assert.strictEqual(subDoc.includes('python3 scripts/pingcode.py'), false, `${subName} should not contain old python command`);
      assert.strictEqual(subDoc.includes('python3 scripts/pingcode_ctx.py'), false, `${subName} should not contain old python ctx command`);
    }

    assert.strictEqual(skillDoc.includes('python3 scripts/pingcode.py'), false);
    assert.strictEqual(workflows.includes('python3 scripts/pingcode.py'), false);
    assert.strictEqual(skillDoc.includes('python3 scripts/pingcode_ctx.py'), false);

    // README.md is no longer installed; scripts/ / agents/ / skills/ should not exist
    assert.strictEqual(fs.existsSync(path.join(target, 'README.md')), false);
    assert.strictEqual(fs.existsSync(path.join(target, 'scripts')), false);
    assert.strictEqual(fs.existsSync(path.join(target, 'agents')), false);
    assert.strictEqual(fs.existsSync(path.join(target, 'skills')), false);
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
      assertAllSubSkillsInstalled(paths[key]);
      assert.ok(result.stdout.includes('[ok]'));
    }
    for (const label of ['Codex', 'OpenCode']) {
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
    createAgentHomes(home, null, ['codex']);
    const result = runInstall([], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.codex.main);
    assertAllSubSkillsInstalled(paths.codex);
    for (const key of ['opencode']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].ctx);
      assertNotInstalled(paths[key].auth);
      assertNotInstalled(paths[key].workItem);
    }
    assert.ok(result.stdout.includes('[skip] OpenCode'));
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
      assertNotInstalled(paths[key].ctx);
      assertNotInstalled(paths[key].auth);
      assertNotInstalled(paths[key].workItem);
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
    assertAllSubSkillsInstalled(paths.codex);
    for (const key of ['opencode']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].ctx);
      assertNotInstalled(paths[key].auth);
      assertNotInstalled(paths[key].workItem);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('opencode only scope', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--opencode-only'], env);
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.opencode.main);
    assertAllSubSkillsInstalled(paths.opencode);
    for (const key of ['codex']) {
      assertNotInstalled(paths[key].main);
      assertNotInstalled(paths[key].ctx);
      assertNotInstalled(paths[key].auth);
      assertNotInstalled(paths[key].workItem);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('opencode project-level target install', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const target = path.join(home, 'project', '.opencode', 'skills', 'pingcode');
    const result = runInstall(['--target', target, '--force'], env);
    assert.strictEqual(result.status, 0, result.stderr);

    assertInstalled(target);
    const parentDir = path.dirname(target);
    for (const subName of ['pingcode-ctx', 'pingcode-auth', 'pingcode-workitem']) {
      assert.ok(fs.existsSync(path.join(parentDir, subName, 'SKILL.md')), `${subName} SKILL.md missing`);
    }
    const skillDoc = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
    assert.ok(skillDoc.includes('pingcode'));
  } finally {
    rmDir(tmpdir);
  }
});

test('interactive global install', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--interactive', '--force'], env, '1\n2\n');
    assert.strictEqual(result.status, 0, result.stderr);

    const paths = expectedPaths(home);
    assertInstalled(paths.opencode.main);
    assertAllSubSkillsInstalled(paths.opencode);
    assert.ok(result.stdout.includes('Install summary (global)'));
    assert.ok(result.stdout.includes('OpenCode'));
    for (const key of ['codex']) {
      assertNotInstalled(paths[key].main);
    }
  } finally {
    rmDir(tmpdir);
  }
});

test('interactive project-level install', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    const projectDir = path.join(home, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    const resolvedProjectDir = fs.realpathSync(projectDir);
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--interactive', '--force'], env, '2\n1,2\n', resolvedProjectDir);
    assert.strictEqual(result.status, 0, result.stderr);

    const codexTarget = path.join(resolvedProjectDir, '.codex', 'skills', 'pingcode');
    const opencodeTarget = path.join(resolvedProjectDir, '.opencode', 'skills', 'pingcode');
    assertInstalled(codexTarget);
    assertInstalled(opencodeTarget);
    assert.ok(result.stdout.includes('Install summary (project)'));
    assert.ok(result.stdout.includes('Codex'));
    assert.ok(result.stdout.includes('OpenCode'));
  } finally {
    rmDir(tmpdir);
  }
});

test('interactive invalid scope errors', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--interactive', '--force'], env, '9\n');
    assert.notStrictEqual(result.status, 0);
    assert.ok(result.stderr.includes('Invalid scope choice') || result.stderr.includes('error:'));
  } finally {
    rmDir(tmpdir);
  }
});

test('interactive invalid agent selection errors', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);
    const result = runInstall(['--interactive', '--force'], env, '1\n9\n');
    assert.notStrictEqual(result.status, 0);
    assert.ok(result.stderr.includes('No valid agents selected') || result.stderr.includes('error:'));
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
    assertAllSubSkillsInstalled(paths.codex);
    const defaultCodex = path.join(home, '.codex', 'skills', 'pingcode');
    assert.strictEqual(fs.existsSync(defaultCodex), false, 'default codex location should not be touched');
    for (const key of ['opencode']) {
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
    const opencodeSkillsRoot = path.join(home, '.config', 'opencode', 'skills');
    fs.mkdirSync(opencodeSkillsRoot, { recursive: true });
    createAgentHomes(home, null, ['codex']);
    fs.chmodSync(opencodeSkillsRoot, 0o500);
    const env = isolatedHomeEnv(home);
    let result;
    try {
      result = runInstall([], env);
    } finally {
      fs.chmodSync(opencodeSkillsRoot, 0o700);
    }

    const paths = expectedPaths(home);
    assert.strictEqual(fs.existsSync(path.join(paths.opencode.main, 'SKILL.md')), false);
    assertInstalled(paths.codex.main);
    assert.strictEqual(result.status, 2, result.stdout + result.stderr);
    assert.ok(result.stderr.includes('[fail]'));
    assert.ok(result.stderr.includes('OpenCode'));
    assert.ok(result.stdout.includes('[ok]'));
  } finally {
    rmDir(tmpdir);
  }
});

test('windows platform prints npm install guidance', () => {
  const tmpdir = tmpDir();
  try {
    const home = path.join(tmpdir, 'home');
    fs.mkdirSync(home, { recursive: true });
    const env = isolatedHomeEnv(home);

    // Preload script that patches process.platform check in install.js
    // so the child process behaves as if running on Windows
    const preloadPath = path.join(tmpdir, 'preload-win32.js');
    fs.writeFileSync(preloadPath, [
      "'use strict';",
      "const Module = require('module');",
      "const origCompile = Module.prototype._compile;",
      "Module.prototype._compile = function(content, filename) {",
      "  if (filename.includes('bin/install.js')) {",
      "    content = content.replace('process.platform === \"win32\"', 'true');",
      "  }",
      "  return origCompile.call(this, content, filename);",
      "};",
      "",
    ].join('\n'));

    const target = path.join(home, 'pingcode');
    const result = spawnSync('node', [
      '--require', preloadPath,
      path.join(REPO_ROOT, 'bin/install.js'),
      '--target', target, '--force',
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env,
    });

    assert.strictEqual(result.status, 0, result.stderr);

    // On Windows, no ~/.local/bin/pingcode POSIX wrapper should be created
    const wrapperPath = path.join(home, '.local', 'bin', 'pingcode');
    assert.strictEqual(fs.existsSync(wrapperPath), false, 'Windows should not create POSIX wrapper');

    // Windows guidance should be printed
    assert.ok(result.stdout.includes('npm install -g pingcode-cli'), `Expected Windows guidance, got: ${result.stdout.substring(0, 500)}`);
  } finally {
    rmDir(tmpdir);
  }
});
