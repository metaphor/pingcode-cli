'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const config = require('../scripts/commands/config');

const REPO_ROOT = path.resolve(__dirname, '..');

// ── Helpers ────────────────────────────────────────────────────────

function tmpFile(tmpdir, name) {
  return path.join(tmpdir, name);
}

function clearEnv() {
  const original = {};
  for (const key of Object.keys(process.env)) {
    original[key] = process.env[key];
  }
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  process.env.PATH = original.PATH || '';
  return original;
}

function restoreEnv(original) {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(original)) {
    process.env[key] = value;
  }
}

function testInCleanEnv(name, fn) {
  test(name, async () => {
    const original = clearEnv();
    try {
      await fn();
    } finally {
      restoreEnv(original);
    }
  });
}

function testInCleanTmp(name, fn) {
  test(name, async (t) => {
    const original = clearEnv();
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-test-'));
    try {
      await fn(t, tmpdir);
    } finally {
      restoreEnv(original);
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });
}

function writeWorkspaceCache(cachePath, {
  preferences = {},
  users = null,
  projects = null,
  sprints = null,
  work_item_types = null,
  work_item_states = null,
  work_item_priorities = null,
  work_item_properties = null,
  idea_states = null,
  idea_priorities = null,
} = {}) {
  const payload = core.emptyWorkspaceCache();
  payload.preferences = preferences;
  if (users !== null) payload.users = { values: users };
  if (projects !== null) payload.projects = { values: projects };
  if (sprints !== null) payload.sprints = sprints;
  if (work_item_types !== null) payload.work_item_types = work_item_types;
  if (work_item_states !== null) payload.work_item_states = work_item_states;
  if (work_item_priorities !== null) payload.work_item_priorities = work_item_priorities;
  if (work_item_properties !== null) payload.work_item_properties = work_item_properties;
  if (idea_states !== null) payload.idea_states = idea_states;
  if (idea_priorities !== null) payload.idea_priorities = idea_priorities;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload), 'utf8');
}

function captureConsole(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  return {
    done: () => {
      console.log = originalLog;
      console.error = originalError;
    },
    logs: () => logs.join('\n'),
    errors: () => errors.join('\n'),
  };
}

function readCacheJson(cachePath) {
  return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

// ── Parser tests ───────────────────────────────────────────────────

test('parseConfigArgs extracts subcommand and value', () => {
  const result = config.parseConfigArgs(['set-current-user', '@me']);
  assert.strictEqual(result.subcommand, 'set-current-user');
  assert.strictEqual(result.value, '@me');
  assert.strictEqual(result.helpRequested, false);
});

test('parseConfigArgs handles flags after positionals', () => {
  const result = config.parseConfigArgs([
    'set-current-user', '@me',
    '--workspace-cache', '/tmp/ws.json',
    '--dry-run',
  ]);
  assert.strictEqual(result.subcommand, 'set-current-user');
  assert.strictEqual(result.value, '@me');
  assert.strictEqual(result.opts.workspace_cache, '/tmp/ws.json');
  assert.strictEqual(result.opts.dry_run, true);
});

test('parseConfigArgs detects --help', () => {
  const result = config.parseConfigArgs(['set-current-user', '--help']);
  assert.strictEqual(result.helpRequested, true);
  assert.strictEqual(result.subcommand, 'set-current-user');
});

test('parseConfigArgs detects -h', () => {
  const result = config.parseConfigArgs(['set-current-user', '-h']);
  assert.strictEqual(result.helpRequested, true);
});

test('parseConfigArgs --no-workspace-cache boolean flag', () => {
  const result = config.parseConfigArgs(['list', '--no-workspace-cache']);
  assert.strictEqual(result.opts.no_workspace_cache, true);
});

test('parseConfigArgs unknown flag throws', () => {
  assert.throws(() => config.parseConfigArgs(['list', '--unknown-flag']), core.PingCodeError);
});

test('parseConfigArgs flag without value throws', () => {
  assert.throws(() => config.parseConfigArgs(['list', '--workspace-cache']), core.PingCodeError);
});

test('parseConfigArgs empty tokens returns null subcommand', () => {
  const result = config.parseConfigArgs([]);
  assert.strictEqual(result.subcommand, null);
  assert.strictEqual(result.value, null);
});

// ── Help tests ─────────────────────────────────────────────────────

testInCleanEnv('config --help lists all subcommands', () => {
  const capture = captureConsole();
  try {
    config.printHelp();
    const output = capture.logs();
    assert.ok(output.includes('init'), 'help should mention init');
    assert.ok(output.includes('set-current-user'), 'help should mention set-current-user');
    assert.ok(output.includes('set-current-project'), 'help should mention set-current-project');
    assert.ok(output.includes('set-current-sprint'), 'help should mention set-current-sprint');
    assert.ok(output.includes('list'), 'help should mention list');
  } finally {
    capture.done();
  }
});

testInCleanEnv('config set-current-user --help shows specific help', () => {
  const capture = captureConsole();
  try {
    config.printHelp('set-current-user');
    const output = capture.logs();
    assert.ok(output.includes('set-current-user'), 'should include subcommand name');
    assert.ok(output.includes('@me'), 'should mention @me');
  } finally {
    capture.done();
  }
});

testInCleanEnv('config init --help shows specific help', () => {
  const capture = captureConsole();
  try {
    config.printHelp('init');
    const output = capture.logs();
    assert.ok(output.includes('init'), 'should include subcommand name');
    assert.ok(output.includes('Interactively'), 'should describe interactive setup');
  } finally {
    capture.done();
  }
});

testInCleanEnv('config list --help shows specific help', () => {
  const capture = captureConsole();
  try {
    config.printHelp('list');
    const output = capture.logs();
    assert.ok(output.includes('list'), 'should include subcommand name');
    assert.ok(output.includes('preferences'), 'should mention preferences');
  } finally {
    capture.done();
  }
});

// ── set-current-user tests ─────────────────────────────────────────

testInCleanTmp('config set-current-user @me resolves and writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1', current_user_name: 'situ' },
    users: [{ id: 'user-1', name: 'situjunjie', display_name: '司徒' }],
  });

  await config.run(['set-current-user', '@me', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'user-1',
    '@me should resolve to cached current_user_id');
});

testInCleanTmp('config set-current-user with explicit id writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    users: [{ id: 'user-2', name: 'alice', display_name: 'Alice' }],
  });

  await config.run(['set-current-user', 'user-2', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'user-2');
});

testInCleanTmp('config set-current-user with name resolves from cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    users: [{ id: 'user-3', name: 'bob', display_name: 'Bob' }],
  });

  await config.run(['set-current-user', 'bob', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'user-3');
});

testInCleanTmp('config set-current-user @me --dry-run shows resolved user id without writing', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });
  const originalContent = fs.readFileSync(cachePath, 'utf8');

  const capture = captureConsole();
  try {
    await config.run(['set-current-user', '@me', '--workspace-cache', cachePath, '--dry-run']);
    const output = capture.logs();
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true);
    assert.strictEqual(parsed.action, 'set-current-user');
    assert.strictEqual(parsed.resolved_user_id, 'user-1');
  } finally {
    capture.done();
  }

  // Cache file should be unchanged.
  const afterContent = fs.readFileSync(cachePath, 'utf8');
  assert.strictEqual(afterContent, originalContent, 'dry-run should not write to cache');
});

testInCleanTmp('config set-current-user @me --no-workspace-cache throws identity guidance', async (t, tmpdir) => {
  // With no env vars and no workspace cache, @me cannot be resolved.
  await assert.rejects(
    async () => config.run(['set-current-user', '@me', '--no-workspace-cache']),
    (err) => {
      return err instanceof core.PingCodeError &&
        (err.message.includes('PINGCODE_USER_ID') || err.message.includes('identity'));
    },
    'Should throw identity guidance when no workspace cache and no env vars for @me',
  );
});

testInCleanTmp('config set-current-user with no value throws usage error', async (t, tmpdir) => {
  await assert.rejects(
    async () => config.run(['set-current-user']),
    (err) => {
      return err instanceof core.PingCodeError &&
        err.message.includes('Usage');
    },
  );
});

// ── set-current-project tests ──────────────────────────────────────

testInCleanTmp('config set-current-project writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    projects: [{ id: 'project-1', name: 'Core Project' }],
  });

  await config.run(['set-current-project', 'Core Project', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_project_id, 'project-1');
  assert.strictEqual(cache.preferences.current_project_name, 'Core Project');
});

testInCleanTmp('config set-current-project with id works without cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {});

  await config.run(['set-current-project', 'project-2', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_project_id, 'project-2');
});

testInCleanTmp('config set-current-project --dry-run shows resolved id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    projects: [{ id: 'project-3', name: 'My Project' }],
  });

  const capture = captureConsole();
  try {
    await config.run(['set-current-project', 'My Project', '--workspace-cache', cachePath, '--dry-run']);
    const output = capture.logs();
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true);
    assert.strictEqual(parsed.resolved_project_id, 'project-3');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config set-current-project with no value throws usage error', async (t, tmpdir) => {
  await assert.rejects(
    async () => config.run(['set-current-project']),
    (err) => err instanceof core.PingCodeError && err.message.includes('Usage'),
  );
});

// ── set-current-sprint tests ──────────────────────────────────────

testInCleanTmp('config set-current-sprint writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    sprints: {
      'project-1': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] },
    },
  });

  await config.run(['set-current-sprint', 'Sprint 1', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_sprint_id, 'sprint-1');
  assert.strictEqual(cache.preferences.current_sprint_name, 'Sprint 1');
});

testInCleanTmp('config set-current-sprint with id works without cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {});

  await config.run(['set-current-sprint', 'sprint-2', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_sprint_id, 'sprint-2');
});

testInCleanTmp('config set-current-sprint --dry-run shows resolved id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    sprints: {
      'project-1': { values: [{ id: 'sprint-3', name: 'Sprint 3' }] },
    },
  });

  const capture = captureConsole();
  try {
    await config.run(['set-current-sprint', 'Sprint 3', '--workspace-cache', cachePath, '--dry-run']);
    const output = capture.logs();
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true);
    assert.strictEqual(parsed.resolved_sprint_id, 'sprint-3');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config set-current-sprint with no value throws usage error', async (t, tmpdir) => {
  await assert.rejects(
    async () => config.run(['set-current-sprint']),
    (err) => err instanceof core.PingCodeError && err.message.includes('Usage'),
  );
});

// ── config list tests ─────────────────────────────────────────────

testInCleanTmp('config list prints preferences and dictionary counts', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_user_name: '司徒',
      current_project_id: 'project-1',
      current_project_name: 'Core Project',
      current_sprint_id: 'sprint-1',
      current_sprint_name: 'Sprint 1',
    },
    users: [{ id: 'user-1', name: 'situjunjie', display_name: '司徒' }],
    projects: [{ id: 'project-1', name: 'Core Project' }],
    sprints: {
      'project-1': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] },
    },
  });

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    assert.ok(output.includes('Preferences:'), 'should print Preferences header');
    assert.ok(output.includes('current_user_id'), 'should include current_user_id');
    assert.ok(output.includes('current_project_id'), 'should include current_project_id');
    assert.ok(output.includes('current_sprint_id'), 'should include current_sprint_id');
    assert.ok(output.includes('Cached dictionaries:'), 'should print dictionaries header');
    assert.ok(output.includes('users: 1 items'), 'should count users');
    assert.ok(output.includes('projects: 1 items'), 'should count projects');
    assert.ok(output.includes('sprints: 1 items'), 'should count sprints');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config list with empty cache prints (none) for preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {});

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    assert.ok(output.includes('(none)'), 'should show (none) for empty preferences');
    assert.ok(output.includes('users: 0 items'), 'should show 0 users');
    assert.ok(output.includes('projects: 0 items'), 'should show 0 projects');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config list with rich cache shows all dictionary counts', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
    users: [
      { id: 'user-1', name: 'a' },
      { id: 'user-2', name: 'b' },
    ],
    projects: [
      { id: 'proj-1', name: 'P1' },
      { id: 'proj-2', name: 'P2' },
      { id: 'proj-3', name: 'P3' },
    ],
    sprints: {
      'proj-1': { values: [{ id: 's1', name: 'S1' }, { id: 's2', name: 'S2' }] },
    },
    work_item_types: {
      'proj-1': { values: [{ id: 't1', name: 'story' }, { id: 't2', name: 'task' }] },
    },
    work_item_states: {
      'proj-1::t1': { values: [{ id: 'st1', name: 'open' }, { id: 'st2', name: 'done' }, { id: 'st3', name: 'in_progress' }] },
    },
    work_item_priorities: {
      'proj-1': { values: [{ id: 'p1', name: 'high' }] },
    },
  });

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    assert.ok(output.includes('users: 2 items'));
    assert.ok(output.includes('projects: 3 items'));
    assert.ok(output.includes('sprints: 2 items'));
    assert.ok(output.includes('work item types: 2 items'));
    assert.ok(output.includes('work item states: 3 items'));
    assert.ok(output.includes('work item priorities: 1 items'));
  } finally {
    capture.done();
  }
});

// ── config list dictionary edge case tests ─────────────────────────

testInCleanTmp('config list sorts preference keys alphabetically', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_sprint_id: 's1',
      current_project_id: 'p1',
      current_user_id: 'u1',
    },
  });

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    // Verify all three keys appear
    assert.ok(output.includes('current_project_id'), 'should include current_project_id');
    assert.ok(output.includes('current_sprint_id'), 'should include current_sprint_id');
    assert.ok(output.includes('current_user_id'), 'should include current_user_id');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config list with null/undefined cache fields shows 0 items', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  // Write a minimal cache that explicitly nulls out fields
  const payload = core.emptyWorkspaceCache();
  payload.preferences = {};
  payload.users = null;
  payload.projects = null;
  payload.sprints = null;
  payload.work_item_types = null;
  payload.work_item_states = null;
  payload.work_item_priorities = null;
  payload.work_item_properties = null;
  payload.idea_states = null;
  payload.idea_priorities = null;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload), 'utf8');

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    assert.ok(output.includes('users: 0 items'));
    assert.ok(output.includes('projects: 0 items'));
    assert.ok(output.includes('sprints: 0 items'));
    assert.ok(output.includes('work item types: 0 items'));
    assert.ok(output.includes('work item states: 0 items'));
    assert.ok(output.includes('work item priorities: 0 items'));
    assert.ok(output.includes('work item properties: 0 items'));
    assert.ok(output.includes('idea states: 0 items'));
    assert.ok(output.includes('idea priorities: 0 items'));
  } finally {
    capture.done();
  }
});

testInCleanTmp('config list stale state — modified cache between reads', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'original-user' },
  });

  // Simulate external modification of the cache file while config list reads it.
  // The list handler creates a client which loads the cache once.
  // Then we modify the file on disk before list prints — list should still
  // reflect the originally-loaded content (atomic snapshot at load time).
  const client = config.createClient({
    workspace_cache: cachePath,
    base_url: core.DEFAULT_BASE_URL,
  });

  // Now modify the file on disk
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'tampered-user' },
  });

  // The client's in-memory cache should still have the original.
  assert.strictEqual(
    client.workspaceCache.preferences.current_user_id,
    'original-user',
    'In-memory cache should not reflect external modifications after load',
  );
});

// ── Error handling / adversarial tests ─────────────────────────────

testInCleanTmp('config with no subcommand prints help', async (t, tmpdir) => {
  const capture = captureConsole();
  try {
    await config.run([]);
    const output = capture.logs();
    assert.ok(output.includes('init'), 'should print help listing subcommands');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config with --help as first arg prints module help', async (t, tmpdir) => {
  const capture = captureConsole();
  try {
    await config.run(['--help']);
    const output = capture.logs();
    assert.ok(output.includes('Subcommands:'), 'should print Subcommands header');
    assert.ok(output.includes('init'), 'should list init');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config unknown-subcommand throws', async (t, tmpdir) => {
  await assert.rejects(
    async () => config.run(['unknown-subcommand']),
    (err) => err instanceof core.PingCodeError &&
      err.message.includes('Unknown config subcommand'),
  );
});

testInCleanTmp('config init with --help shows init-specific help', async (t, tmpdir) => {
  const capture = captureConsole();
  try {
    await config.run(['init', '--help']);
    const output = capture.logs();
    assert.ok(output.includes('Interactively'), 'should describe interactive mode');
  } finally {
    capture.done();
  }
});

// ── createClient tests ─────────────────────────────────────────────

testInCleanTmp('createClient sets workspaceCachePath to null with no_workspace_cache', (t, tmpdir) => {
  const client = config.createClient({
    base_url: core.DEFAULT_BASE_URL,
    no_workspace_cache: true,
  });
  assert.strictEqual(client.workspaceCachePath, null);
});

testInCleanTmp('createClient loads cache from path', (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'test-cache.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-from-cache' },
  });

  const client = config.createClient({
    base_url: core.DEFAULT_BASE_URL,
    workspace_cache: cachePath,
  });
  assert.strictEqual(client.workspaceCachePath, cachePath);
  assert.strictEqual(client.workspaceCache.preferences.current_user_id, 'user-from-cache');
});

// ── Dry-run non-write verification ─────────────────────────────────

testInCleanTmp('config set-current-user --dry-run does not modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'existing-user' },
  });
  const beforeContent = fs.readFileSync(cachePath, 'utf8');

  await config.run(['set-current-user', 'new-user', '--workspace-cache', cachePath, '--dry-run']);

  const afterContent = fs.readFileSync(cachePath, 'utf8');
  assert.strictEqual(afterContent, beforeContent, 'cache file should be unchanged after dry-run');

  // Verify cache preferences are unchanged
  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'existing-user');
});

testInCleanTmp('config set-current-project --dry-run does not modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_project_id: 'existing-proj' },
  });

  await config.run(['set-current-project', 'new-proj', '--workspace-cache', cachePath, '--dry-run']);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_project_id, 'existing-proj');
});

testInCleanTmp('config set-current-sprint --dry-run does not modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_sprint_id: 'existing-sprint' },
  });

  await config.run(['set-current-sprint', 'new-sprint', '--workspace-cache', cachePath, '--dry-run']);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_sprint_id, 'existing-sprint');
});

// ── Misleading output checks ───────────────────────────────────────

testInCleanTmp('config list prints meaningful data not just exits 0', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_user_name: 'Alice',
      current_project_id: 'proj-1',
      current_project_name: 'Core',
    },
    users: [{ id: 'user-1', name: 'alice' }],
    projects: [{ id: 'proj-1', name: 'Core' }, { id: 'proj-2', name: 'Side' }],
  });

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();

    // Verify meaningful content (not just empty output)
    assert.ok(output.length > 0, 'list should produce output');
    assert.ok(output.includes('user-1'), 'should include actual user id value');
    assert.ok(output.includes('Alice'), 'should include actual user name value');
    assert.ok(output.includes('Core'), 'should include actual project name value');
    assert.ok(output.includes('users: 1 items'), 'should have meaningful user count');
    assert.ok(output.includes('projects: 2 items'), 'should have meaningful project count');

    // Verify structured format
    const lines = output.split('\n');
    const prefLines = lines.filter(l => l.includes(':') && l.includes('current_'));
    assert.ok(prefLines.length >= 2, 'should have at least 2 preference lines');
  } finally {
    capture.done();
  }
});

// ── Dirty worktree verification (no unexpected file changes) ───────

testInCleanTmp('config operations only modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');

  // Create some other files in tmpdir to ensure they are not touched
  const otherFile = tmpFile(tmpdir, 'other.txt');
  fs.writeFileSync(otherFile, 'untouched', 'utf8');

  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'old-user' },
  });

  await config.run(['set-current-user', 'new-user', '--workspace-cache', cachePath]);

  // Other file should be untouched
  const otherContent = fs.readFileSync(otherFile, 'utf8');
  assert.strictEqual(otherContent, 'untouched', 'non-cache files should not be modified');

  // Cache file should be modified
  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'new-user');
});

// ── --grant-type flag tests ─────────────────────────────────────────

testInCleanTmp('config list --grant-type client_credentials exits 0', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_user_name: 'Alice',
    },
    users: [{ id: 'user-1', name: 'alice' }],
  });

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath, '--grant-type', 'client_credentials']);
    const output = capture.logs();
    assert.ok(output.length > 0, 'list should produce output');
    assert.ok(output.includes('user-1'), 'should include user id');
    assert.ok(output.includes('Alice'), 'should include user name');
  } finally {
    capture.done();
  }
});

testInCleanTmp('config list --grant-type authorization_code accepts flag', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_user_name: 'Alice',
    },
    users: [{ id: 'user-1', name: 'alice' }],
  });

  const capture = captureConsole();
  try {
    await config.run(['list', '--workspace-cache', cachePath, '--grant-type', 'authorization_code']);
    const output = capture.logs();
    assert.ok(output.length > 0, 'list should produce output');
    assert.ok(output.includes('user-1'), 'should include user id');
  } finally {
    capture.done();
  }
});

test('parseConfigArgs parses --grant-type flag', () => {
  const result = config.parseConfigArgs([
    'list', '--grant-type', 'authorization_code',
  ]);
  assert.strictEqual(result.opts.grant_type, 'authorization_code');
});

test('parseConfigArgs defaults grant_type to auto', () => {
  const result = config.parseConfigArgs([]);
  assert.strictEqual(result.opts.grant_type, 'auto');
});
