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
      skillsRoot: path.join(codexRoot, 'skills'),
      skill: path.join(codexRoot, 'skills', 'pingcode'),
    },
    opencode: {
      skillsRoot: path.join(home, '.config', 'opencode', 'skills'),
      skill: path.join(home, '.config', 'opencode', 'skills', 'pingcode'),
    },
  };
}

function createAgentHomes(home, codexHome = null, keys = null) {
  const paths = expectedPaths(home, codexHome);
  const selected = keys || Object.keys(paths);
  for (const key of selected) {
    fs.mkdirSync(path.dirname(paths[key].skillsRoot), { recursive: true });
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
  // Verify references exist
  assert.ok(fs.existsSync(path.join(target, 'references', 'auth.md')), `references/auth.md missing in ${target}`);
  assert.ok(fs.existsSync(path.join(target, 'references', 'ctx.md')), `references/ctx.md missing in ${target}`);
  assert.ok(fs.existsSync(path.join(target, 'references', 'workitem.md')), `references/workitem.md missing in ${target}`);
}

function assertNotInstalled(target) {
  assert.strictEqual(fs.existsSync(target), false, `unexpected install at ${target}`);
}

function assertSkillInstalled(pathsEntry) {
  assertInstalled(pathsEntry.skill);
}

function assertOldAliasesNotInstalled(pathsEntry) {
  for (const alias of ['pingcode-auth', 'pingcode-ctx', 'pingcode-workitem']) {
    assert.strictEqual(
      fs.existsSync(path.join(pathsEntry.skillsRoot, alias)),
      false,
      `unexpected ${alias} under ${pathsEntry.skillsRoot}`,
    );
  }
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
    const target = path.join(tmpdir, 'install-test');
    const result = runInstall(['--target', target, '--force']);
    assert.strictEqual(result.status, 0, result.stderr);

    const skillDir = path.join(target, 'pingcode');
    const skillDoc = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');

    assert.ok(result.stdout.includes('Installed PingCode skill'));
    assert.ok(skillDoc.includes('pingcode'), 'skill doc should contain pingcode command');

    // Verify reference files
    for (const ref of ['auth', 'ctx', 'workitem']) {
      const refDoc = fs.readFileSync(path.join(skillDir, 'references', `${ref}.md`), 'utf8');
      assert.ok(refDoc.includes('pingcode'), `${ref}.md should contain pingcode command`);
    }

    assert.strictEqual(skillDoc.includes('python3 scripts/pingcode.py'), false);
    assert.strictEqual(skillDoc.includes('python3 scripts/pingcode_ctx.py'), false);

    // No SKILL.md at target root
    assert.strictEqual(fs.existsSync(path.join(target, 'SKILL.md')), false);

    // Old alias directories should NOT exist
    assertOldAliasesNotInstalled({ skillsRoot: target });

    // Single pingcode skill is installed
    assertSkillInstalled({ skillsRoot: target, skill: skillDir });
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
      assertSkillInstalled(paths[key]);
      assertOldAliasesNotInstalled(paths[key]);
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
    assertSkillInstalled(paths.codex);
    assertOldAliasesNotInstalled(paths.codex);
    for (const key of ['opencode']) {
      assertNotInstalled(paths[key].skill);
      assertOldAliasesNotInstalled(paths[key]);
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
      assertNotInstalled(paths[key].skill);
      assertOldAliasesNotInstalled(paths[key]);
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
    assertSkillInstalled(paths.codex);
    assertOldAliasesNotInstalled(paths.codex);
    for (const key of ['opencode']) {
      assertNotInstalled(paths[key].skill);
      assertOldAliasesNotInstalled(paths[key]);
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
    assertSkillInstalled(paths.opencode);
    assertOldAliasesNotInstalled(paths.opencode);
    for (const key of ['codex']) {
      assertNotInstalled(paths[key].skill);
      assertOldAliasesNotInstalled(paths[key]);
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
    const target = path.join(home, 'project', '.opencode', 'skills');
    const result = runInstall(['--target', target, '--force'], env);
    assert.strictEqual(result.status, 0, result.stderr);

    assertOldAliasesNotInstalled({ skillsRoot: target });
    assertSkillInstalled({ skillsRoot: target, skill: path.join(target, 'pingcode') });
    const skillDoc = fs.readFileSync(path.join(target, 'pingcode', 'SKILL.md'), 'utf8');
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
    assertSkillInstalled(paths.opencode);
    assertOldAliasesNotInstalled(paths.opencode);
    assert.ok(result.stdout.includes('Install summary (global)'));
    assert.ok(result.stdout.includes('OpenCode'));
    for (const key of ['codex']) {
      assertNotInstalled(paths[key].skill);
      assertOldAliasesNotInstalled(paths[key]);
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

    const codexRoot = path.join(resolvedProjectDir, '.codex', 'skills');
    const opencodeRoot = path.join(resolvedProjectDir, '.opencode', 'skills');
    for (const root of [codexRoot, opencodeRoot]) {
      assertInstalled(path.join(root, 'pingcode'));
      assertOldAliasesNotInstalled({ skillsRoot: root });
    }
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
    assertSkillInstalled(paths.codex);
    assertOldAliasesNotInstalled(paths.codex);
    const defaultCodex = path.join(home, '.codex');
    assert.strictEqual(fs.existsSync(defaultCodex), false, 'default codex location should not be touched');
    assertSkillInstalled(paths.opencode);
    assertOldAliasesNotInstalled(paths.opencode);
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
    assert.strictEqual(fs.existsSync(path.join(paths.opencode.skill, 'SKILL.md')), false);
    assertSkillInstalled(paths.codex);
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
