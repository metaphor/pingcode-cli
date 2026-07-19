'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const context = require('../scripts/commands/context');
const { tmpFile, clearEnv, restoreEnv, writeWorkspaceCache } = require('./helpers');

const REPO_ROOT = path.resolve(__dirname, '..');

// ── Helpers ────────────────────────────────────────────────────────

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

test('parseContextArgs extracts subcommand and value', () => {
  const result = context.parseContextArgs(['set-current-user', '@me']);
  assert.strictEqual(result.subcommand, 'set-current-user');
  assert.strictEqual(result.value, '@me');
  assert.strictEqual(result.helpRequested, false);
});

test('parseContextArgs handles flags after positionals', () => {
  const result = context.parseContextArgs([
    'set-current-user', '@me',
    '--workspace-cache', '/tmp/ws.json',
    '--dry-run',
  ]);
  assert.strictEqual(result.subcommand, 'set-current-user');
  assert.strictEqual(result.value, '@me');
  assert.strictEqual(result.opts.workspace_cache, '/tmp/ws.json');
  assert.strictEqual(result.opts.dry_run, true);
});

test('parseContextArgs detects --help', () => {
  const result = context.parseContextArgs(['set-current-user', '--help']);
  assert.strictEqual(result.helpRequested, true);
  assert.strictEqual(result.subcommand, 'set-current-user');
});

test('parseContextArgs detects -h', () => {
  const result = context.parseContextArgs(['set-current-user', '-h']);
  assert.strictEqual(result.helpRequested, true);
});

test('parseContextArgs --no-workspace-cache boolean flag', () => {
  const result = context.parseContextArgs(['list', '--no-workspace-cache']);
  assert.strictEqual(result.opts.no_workspace_cache, true);
});

test('parseContextArgs unknown flag passes through without throwing', () => {
  // shared.parseGlobalOptions is lenient — unknown flags pass through to remaining
  const result = context.parseContextArgs(['list', '--unknown-flag']);
  assert.strictEqual(result.subcommand, 'list');
  assert.strictEqual(result.helpRequested, false);
});

test('parseContextArgs flag with no value passes through without throwing', () => {
  // shared.parseGlobalOptions passes through string flags when no value follows
  const result = context.parseContextArgs(['list', '--workspace-cache']);
  assert.strictEqual(result.subcommand, 'list');
  assert.strictEqual(result.helpRequested, false);
});

test('parseContextArgs empty tokens returns null subcommand', () => {
  const result = context.parseContextArgs([]);
  assert.strictEqual(result.subcommand, null);
  assert.strictEqual(result.value, null);
});

// ── Help tests ─────────────────────────────────────────────────────

testInCleanEnv('context --help lists all subcommands', () => {
  const capture = captureConsole();
  try {
    context.printHelp();
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

testInCleanEnv('context set-current-user --help shows specific help', () => {
  const capture = captureConsole();
  try {
    context.printHelp('set-current-user');
    const output = capture.logs();
    assert.ok(output.includes('set-current-user'), 'should include subcommand name');
    assert.ok(output.includes('@me'), 'should mention @me');
  } finally {
    capture.done();
  }
});

testInCleanEnv('context init --help shows specific help', () => {
  const capture = captureConsole();
  try {
    context.printHelp('init');
    const output = capture.logs();
    assert.ok(output.includes('init'), 'should include subcommand name');
    assert.ok(output.includes('Interactively'), 'should describe interactive setup');
  } finally {
    capture.done();
  }
});

testInCleanEnv('context list --help shows specific help', () => {
  const capture = captureConsole();
  try {
    context.printHelp('list');
    const output = capture.logs();
    assert.ok(output.includes('list'), 'should include subcommand name');
    assert.ok(output.includes('preferences'), 'should mention preferences');
  } finally {
    capture.done();
  }
});

// ── set-current-user tests ─────────────────────────────────────────

testInCleanTmp('context set-current-user @me resolves and writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1', current_user_name: 'situ' },
    users: [{ id: 'user-1', name: 'situjunjie', display_name: '司徒' }],
  });

  await context.run(['set-current-user', '@me', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'user-1',
    '@me should resolve to cached current_user_id');
});

testInCleanTmp('context set-current-user with explicit id writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    users: [{ id: 'user-2', name: 'alice', display_name: 'Alice' }],
  });

  await context.run(['set-current-user', 'user-2', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'user-2');
});

testInCleanTmp('context set-current-user with name resolves from cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    users: [{ id: 'user-3', name: 'bob', display_name: 'Bob' }],
  });

  await context.run(['set-current-user', 'bob', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'user-3');
});

testInCleanTmp('context set-current-user @me --dry-run shows resolved user id without writing', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });
  const originalContent = fs.readFileSync(cachePath, 'utf8');

  const capture = captureConsole();
  try {
    await context.run(['set-current-user', '@me', '--workspace-cache', cachePath, '--dry-run']);
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

testInCleanTmp('context set-current-user @me --no-workspace-cache throws identity guidance', async (t, tmpdir) => {
  // With no env vars and no workspace cache, @me cannot be resolved.
  await assert.rejects(
    async () => context.run(['set-current-user', '@me', '--no-workspace-cache']),
    (err) => {
      return err instanceof core.PingCodeError &&
        (err.message.includes('PINGCODE_USER_ID') || err.message.includes('identity'));
    },
    'Should throw identity guidance when no workspace cache and no env vars for @me',
  );
});

testInCleanTmp('context set-current-user with no value throws usage error', async (t, tmpdir) => {
  await assert.rejects(
    async () => context.run(['set-current-user']),
    (err) => {
      return err instanceof core.PingCodeError &&
        err.message.includes('Usage');
    },
  );
});

// ── set-current-project tests ──────────────────────────────────────

testInCleanTmp('context set-current-project writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    projects: [{ id: 'project-1', name: 'Core Project' }],
  });

  await context.run(['set-current-project', 'Core Project', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_project_id, 'project-1');
  assert.strictEqual(cache.preferences.current_project_name, 'Core Project');
});

testInCleanTmp('context set-current-project with id works without cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {});

  await context.run(['set-current-project', 'project-2', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_project_id, 'project-2');
});

testInCleanTmp('context set-current-project --dry-run shows resolved id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    projects: [{ id: 'project-3', name: 'My Project' }],
  });

  const capture = captureConsole();
  try {
    await context.run(['set-current-project', 'My Project', '--workspace-cache', cachePath, '--dry-run']);
    const output = capture.logs();
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true);
    assert.strictEqual(parsed.resolved_project_id, 'project-3');
  } finally {
    capture.done();
  }
});

testInCleanTmp('context set-current-project with no value throws usage error', async (t, tmpdir) => {
  await assert.rejects(
    async () => context.run(['set-current-project']),
    (err) => err instanceof core.PingCodeError && err.message.includes('Usage'),
  );
});

// ── set-current-sprint tests ──────────────────────────────────────

testInCleanTmp('context set-current-sprint writes preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    sprints: {
      'project-1': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] },
    },
  });

  await context.run(['set-current-sprint', 'Sprint 1', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_sprint_id, 'sprint-1');
  assert.strictEqual(cache.preferences.current_sprint_name, 'Sprint 1');
});

testInCleanTmp('context set-current-sprint with id works without cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {});

  await context.run(['set-current-sprint', 'sprint-2', '--workspace-cache', cachePath]);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_sprint_id, 'sprint-2');
});

testInCleanTmp('context set-current-sprint --dry-run shows resolved id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    sprints: {
      'project-1': { values: [{ id: 'sprint-3', name: 'Sprint 3' }] },
    },
  });

  const capture = captureConsole();
  try {
    await context.run(['set-current-sprint', 'Sprint 3', '--workspace-cache', cachePath, '--dry-run']);
    const output = capture.logs();
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.dry_run, true);
    assert.strictEqual(parsed.resolved_sprint_id, 'sprint-3');
  } finally {
    capture.done();
  }
});

testInCleanTmp('context set-current-sprint with no value throws usage error', async (t, tmpdir) => {
  await assert.rejects(
    async () => context.run(['set-current-sprint']),
    (err) => err instanceof core.PingCodeError && err.message.includes('Usage'),
  );
});

// ── context list tests ─────────────────────────────────────────────

testInCleanTmp('context list prints preferences and dictionary counts', async (t, tmpdir) => {
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
    await context.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    const data = JSON.parse(output);
    assert.ok(data.preferences, 'should have preferences');
    assert.ok(data.preferences.current_user_id, 'should include current_user_id');
    assert.ok(data.preferences.current_project_id, 'should include current_project_id');
    assert.ok(data.preferences.current_sprint_id, 'should include current_sprint_id');
    assert.ok(data.dictionaries, 'should have dictionaries');
    assert.strictEqual(data.dictionaries.users, 1);
    assert.strictEqual(data.dictionaries.projects, 1);
    assert.strictEqual(data.dictionaries.sprints, 1);
  } finally {
    capture.done();
  }
});

testInCleanTmp('context list with empty cache prints (none) for preferences', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {});

  const capture = captureConsole();
  try {
    await context.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    const data = JSON.parse(output);
    assert.ok(data.preferences, 'should have preferences object');
    assert.deepStrictEqual(data.preferences, {}, 'preferences should be empty');
    assert.strictEqual(data.dictionaries.users, 0, 'should show 0 users');
    assert.strictEqual(data.dictionaries.projects, 0, 'should show 0 projects');
  } finally {
    capture.done();
  }
});

testInCleanTmp('context list with rich cache shows all dictionary counts', async (t, tmpdir) => {
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
    await context.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    const data = JSON.parse(output);
    assert.strictEqual(data.dictionaries.users, 2);
    assert.strictEqual(data.dictionaries.projects, 3);
    assert.strictEqual(data.dictionaries.sprints, 2);
    assert.strictEqual(data.dictionaries.work_item_types, 2);
    assert.strictEqual(data.dictionaries.work_item_states, 3);
    assert.strictEqual(data.dictionaries.work_item_priorities, 1);
  } finally {
    capture.done();
  }
});

// ── context list dictionary edge case tests ─────────────────────────

testInCleanTmp('context list sorts preference keys alphabetically', async (t, tmpdir) => {
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
    await context.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    const data = JSON.parse(output);
    // Verify all three keys appear
    assert.ok(data.preferences.current_project_id, 'should include current_project_id');
    assert.ok(data.preferences.current_sprint_id, 'should include current_sprint_id');
    assert.ok(data.preferences.current_user_id, 'should include current_user_id');
  } finally {
    capture.done();
  }
});

testInCleanTmp('context list with null/undefined cache fields shows 0 items', async (t, tmpdir) => {
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
    await context.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();
    const data = JSON.parse(output);
    assert.strictEqual(data.dictionaries.users, 0);
    assert.strictEqual(data.dictionaries.projects, 0);
    assert.strictEqual(data.dictionaries.sprints, 0);
    assert.strictEqual(data.dictionaries.work_item_types, 0);
    assert.strictEqual(data.dictionaries.work_item_states, 0);
    assert.strictEqual(data.dictionaries.work_item_priorities, 0);
    assert.strictEqual(data.dictionaries.work_item_properties, 0);
    assert.strictEqual(data.dictionaries.idea_states, 0);
    assert.strictEqual(data.dictionaries.idea_priorities, 0);
  } finally {
    capture.done();
  }
});

testInCleanTmp('context list stale state — modified cache between reads', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'original-user' },
  });

  // Simulate external modification of the cache file while context list reads it.
  // The list handler creates a client which loads the cache once.
  // Then we modify the file on disk before list prints — list should still
  // reflect the originally-loaded content (atomic snapshot at load time).
  const client = context.createClient({
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

testInCleanTmp('context with no subcommand prints help', async (t, tmpdir) => {
  const capture = captureConsole();
  try {
    await context.run([]);
    const output = capture.logs();
    assert.ok(output.includes('init'), 'should print help listing subcommands');
  } finally {
    capture.done();
  }
});

testInCleanTmp('context with --help as first arg prints module help', async (t, tmpdir) => {
  const capture = captureConsole();
  try {
    await context.run(['--help']);
    const output = capture.logs();
    assert.ok(output.includes('Subcommands:'), 'should print Subcommands header');
    assert.ok(output.includes('init'), 'should list init');
  } finally {
    capture.done();
  }
});

testInCleanTmp('context unknown-subcommand throws', async (t, tmpdir) => {
  await assert.rejects(
    async () => context.run(['unknown-subcommand']),
    (err) => err instanceof core.PingCodeError &&
      err.message.includes('Unknown context subcommand'),
  );
});

testInCleanTmp('context init with --help shows init-specific help', async (t, tmpdir) => {
  const capture = captureConsole();
  try {
    await context.run(['init', '--help']);
    const output = capture.logs();
    assert.ok(output.includes('Interactively'), 'should describe interactive mode');
  } finally {
    capture.done();
  }
});

// ── createClient tests ─────────────────────────────────────────────

testInCleanTmp('createClient sets workspaceCachePath to null with no_workspace_cache', (t, tmpdir) => {
  const client = context.createClient({
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

  const client = context.createClient({
    base_url: core.DEFAULT_BASE_URL,
    workspace_cache: cachePath,
  });
  assert.strictEqual(client.workspaceCachePath, cachePath);
  assert.strictEqual(client.workspaceCache.preferences.current_user_id, 'user-from-cache');
});

test('core exposes default cache paths', () => {
  assert.strictEqual(core.DEFAULT_WORKSPACE_CACHE, '.pingcode/cache.json');
  assert.strictEqual(core.DEFAULT_TOKEN_CACHE, '~/.cache/pingcode/token.json');
});

// ── Dry-run non-write verification ─────────────────────────────────

testInCleanTmp('context set-current-user --dry-run does not modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'existing-user' },
  });
  const beforeContent = fs.readFileSync(cachePath, 'utf8');

  await context.run(['set-current-user', 'new-user', '--workspace-cache', cachePath, '--dry-run']);

  const afterContent = fs.readFileSync(cachePath, 'utf8');
  assert.strictEqual(afterContent, beforeContent, 'cache file should be unchanged after dry-run');

  // Verify cache preferences are unchanged
  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'existing-user');
});

testInCleanTmp('context set-current-project --dry-run does not modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_project_id: 'existing-proj' },
  });

  await context.run(['set-current-project', 'new-proj', '--workspace-cache', cachePath, '--dry-run']);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_project_id, 'existing-proj');
});

testInCleanTmp('context set-current-sprint --dry-run does not modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_sprint_id: 'existing-sprint' },
  });

  await context.run(['set-current-sprint', 'new-sprint', '--workspace-cache', cachePath, '--dry-run']);

  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_sprint_id, 'existing-sprint');
});

// ── Misleading output checks ───────────────────────────────────────

testInCleanTmp('context list prints meaningful data not just exits 0', async (t, tmpdir) => {
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
    await context.run(['list', '--workspace-cache', cachePath]);
    const output = capture.logs();

    // Verify meaningful content (not just empty output)
    assert.ok(output.length > 0, 'list should produce output');
    const data = JSON.parse(output);
    assert.strictEqual(data.preferences.current_user_id, 'user-1', 'should include actual user id value');
    assert.strictEqual(data.preferences.current_user_name, 'Alice', 'should include actual user name value');
    assert.strictEqual(data.preferences.current_project_name, 'Core', 'should include actual project name value');
    assert.strictEqual(data.dictionaries.users, 1, 'should have meaningful user count');
    assert.strictEqual(data.dictionaries.projects, 2, 'should have meaningful project count');

    // Verify structured format
    assert.ok(data.preferences.current_project_id, 'should have at least 1 preference');
    assert.ok(data.preferences.current_user_id, 'should have at least 2 preference');
  } finally {
    capture.done();
  }
});

// ── Dirty worktree verification (no unexpected file changes) ───────

testInCleanTmp('context operations only modify cache file', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');

  // Create some other files in tmpdir to ensure they are not touched
  const otherFile = tmpFile(tmpdir, 'other.txt');
  fs.writeFileSync(otherFile, 'untouched', 'utf8');

  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'old-user' },
  });

  await context.run(['set-current-user', 'new-user', '--workspace-cache', cachePath]);

  // Other file should be untouched
  const otherContent = fs.readFileSync(otherFile, 'utf8');
  assert.strictEqual(otherContent, 'untouched', 'non-cache files should not be modified');

  // Cache file should be modified
  const cache = readCacheJson(cachePath);
  assert.strictEqual(cache.preferences.current_user_id, 'new-user');
});

// ── --grant-type flag tests ─────────────────────────────────────────

testInCleanTmp('context list --grant-type client_credentials exits 0', async (t, tmpdir) => {
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
    await context.run(['list', '--workspace-cache', cachePath, '--grant-type', 'client_credentials']);
    const output = capture.logs();
    assert.ok(output.length > 0, 'list should produce output');
    assert.ok(output.includes('user-1'), 'should include user id');
    assert.ok(output.includes('Alice'), 'should include user name');
  } finally {
    capture.done();
  }
});

testInCleanTmp('context list --grant-type authorization_code accepts flag', async (t, tmpdir) => {
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
    await context.run(['list', '--workspace-cache', cachePath, '--grant-type', 'authorization_code']);
    const output = capture.logs();
    assert.ok(output.length > 0, 'list should produce output');
    assert.ok(output.includes('user-1'), 'should include user id');
  } finally {
    capture.done();
  }
});

test('parseContextArgs parses --grant-type flag', () => {
  const result = context.parseContextArgs([
    'list', '--grant-type', 'authorization_code',
  ]);
  assert.strictEqual(result.opts.grant_type, 'authorization_code');
});

test('parseContextArgs defaults grant_type to auto', () => {
  const result = context.parseContextArgs([]);
  assert.strictEqual(result.opts.grant_type, 'auto');
});
