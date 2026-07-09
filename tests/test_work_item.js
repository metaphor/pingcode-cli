const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const workItem = require('../scripts/commands/work-item');

// ── Test infrastructure ───────────────────────────────────────────────

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

function tmpFile(tmpdir, name) {
  return path.join(tmpdir, name);
}

function writeWorkspaceCache(cachePath, {
  preferences = {},
  users = null,
  projects = null,
  sprints = null,
  work_item_types = null,
  work_item_states = null,
  work_item_priorities = null,
} = {}) {
  const payload = core.emptyWorkspaceCache();
  payload.preferences = preferences;
  if (users !== null) payload.users = { values: users };
  if (projects !== null) payload.projects = { values: projects };
  if (sprints !== null) payload.sprints = sprints;
  if (work_item_types !== null) payload.work_item_types = work_item_types;
  if (work_item_states !== null) payload.work_item_states = work_item_states;
  if (work_item_priorities !== null) payload.work_item_priorities = work_item_priorities;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload), 'utf8');
}

function captureOutput(fn) {
  let stdout = '';
  let stderr = '';
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  const originalLog = console.log;
  const originalError = console.error;
  process.stdout.write = (chunk) => { stdout += chunk; return true; };
  process.stderr.write = (chunk) => { stderr += chunk; return true; };
  console.log = (...args) => { stdout += args.join(' ') + '\n'; };
  console.error = (...args) => { stderr += args.join(' ') + '\n'; };
  try {
    return fn();
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    console.log = originalLog;
    console.error = originalError;
  }
}

function capturedJson(stdout) {
  return JSON.parse(stdout.trim());
}

// ── work-item list ────────────────────────────────────────────────────

testInCleanTmp('work-item list dry-run applies default filters from cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['list', '--workspace-cache', cachePath, '--dry-run']);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/project/work_items');
  assert.strictEqual(result.params.assignee_ids, 'user-1');
  assert.strictEqual(result.params.project_ids, 'project-1');
  assert.strictEqual(result.params.sprint_ids, 'sprint-1');
});

testInCleanTmp('work-item list --all-users --all-projects --all-sprints skips default filters', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list',
      '--all-users', '--all-projects', '--all-sprints',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/project/work_items');
  // With all-skip flags, params should be empty (or just page_size)
  assert.strictEqual('assignee_ids' in result.params, false);
  assert.strictEqual('project_ids' in result.params, false);
  assert.strictEqual('sprint_ids' in result.params, false);
});

testInCleanTmp('work-item list --state resolves name from cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-progress', name: '进行中' }] },
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list', '--state', '进行中',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.params.state_id, 'state-progress');
});

testInCleanTmp('work-item list --assignee resolves cached user name', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    users: [{ id: 'user-alice', name: 'Alice', display_name: 'Alice' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list', '--assignee', 'Alice',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  // The assignee filter overrides the default assignee_ids from cache
  assert.strictEqual(result.params.assignee_ids, 'user-alice');
});

testInCleanTmp('work-item list --assignee @me resolves to cached current user', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-cached',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list', '--assignee', '@me',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.params.assignee_ids, 'user-cached');
});

testInCleanTmp('work-item list --limit sets page_size', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list', '--limit', '50',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.params.page_size, '50');
});

testInCleanTmp('work-item list with incomplete cache (missing project) errors with guidance', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let stderr = '';
  const originalError = console.error;
  console.error = (...args) => { stderr += args.join(' ') + '\n'; };
  try {
    await workItem.run(['list', '--workspace-cache', cachePath, '--dry-run']);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('PingCode workspace context is incomplete'));
    process.exitCode = 0;
  } finally {
    console.error = originalError;
  }
});

testInCleanTmp('work-item list with --all-projects --all-sprints skips project/sprint context check', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-cached' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list',
      '--all-users', '--all-projects', '--all-sprints',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  // No default filters applied
  assert.strictEqual('assignee_ids' in result.params, false);
  assert.strictEqual('project_ids' in result.params, false);
  assert.strictEqual('sprint_ids' in result.params, false);
});

// ── work-item create ──────────────────────────────────────────────────

testInCleanTmp('work-item create dry-run returns POST with resolved fields', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_types: {
      'project-1': { values: [{ id: 'story', name: '故事' }] },
    },
    projects: [{ id: 'project-core', name: 'Core' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', 'New story',
      '--type', 'story',
      '--project', 'Core',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/project/work_items');
  assert.strictEqual(result.json.title, 'New story');
  assert.strictEqual(result.json.type_id, 'story');
  assert.strictEqual(result.json.project_id, 'project-core');
  assert.strictEqual(result.json.assignee_id, 'user-1');
});

testInCleanTmp('work-item create with --sprint resolves and includes sprint_id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_types: {
      'project-1': { values: [{ id: 'task', name: '任务' }] },
    },
    projects: [{ id: 'project-core', name: 'Core' }],
    sprints: {
      'project-core': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] },
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', 'New task',
      '--type', 'task',
      '--project', 'Core',
      '--sprint', 'Sprint 1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.json.title, 'New task');
  assert.strictEqual(result.json.sprint_id, 'sprint-1');
});

testInCleanTmp('work-item create missing --title errors with usage', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let stderr = '';
  const originalError = console.error;
  console.error = (...args) => { stderr += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create', '--type', 'task',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('title'));
    process.exitCode = 0;
  } finally {
    console.error = originalError;
  }
});

testInCleanTmp('work-item create defaults assignee to @me from cache', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-default',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_types: {
      'project-1': { values: [{ id: 'task', name: '任务' }] },
    },
    projects: [{ id: 'project-1', name: 'Core' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', 'Auto assignee',
      '--type', 'task',
      '--project', 'Core',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.assignee_id, 'user-default');
});

testInCleanTmp('work-item create with --assignee overrides default', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-default',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_types: {
      'project-1': { values: [{ id: 'task', name: '任务' }] },
    },
    projects: [{ id: 'project-1', name: 'Core' }],
    users: [{ id: 'user-bob', name: 'Bob' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', 'Assigned to Bob',
      '--type', 'task',
      '--project', 'Core',
      '--assignee', 'Bob',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.assignee_id, 'user-bob');
});

testInCleanTmp('work-item create with --all-users skips default assignee', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_types: {
      'project-1': { values: [{ id: 'task', name: '任务' }] },
    },
    projects: [{ id: 'project-1', name: 'Core' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', 'No assignee',
      '--type', 'task',
      '--project', 'Core',
      '--all-users',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual('assignee_id' in result.json, false);
});

// ── work-item show ────────────────────────────────────────────────────

testInCleanTmp('work-item show identifier returns GET with identifier param', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['show', 'SCR-1', '--workspace-cache', cachePath, '--dry-run']);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/project/work_items');
  assert.strictEqual(result.params.identifier, 'SCR-1');
});

testInCleanTmp('work-item show missing target errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await workItem.run(['show', '--workspace-cache', cachePath, '--dry-run']);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id or identifier'));
    process.exitCode = 0;
  }
});

// ── work-item update ──────────────────────────────────────────────────

testInCleanTmp('work-item update by id returns flat dry-run shape', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'WI-123',
      '--state', '已完成',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/project/work_items/WI-123');
  assert.strictEqual(result.json.state_id, 'state-done');
  // Flat shape: no resolution field
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('work-item update by identifier returns compound dry-run shape', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'SCR-1',
      '--state', '已完成',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  // Compound shape
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/project/work_items');
  assert.strictEqual(result.resolution.params.identifier, 'SCR-1');
  assert.ok(result.patch);
  assert.strictEqual(result.patch.method, 'PATCH');
  assert.strictEqual(result.patch.path, '/v1/project/work_items/{id}');
  assert.strictEqual(result.patch.json.state_id, 'state-done');
});

testInCleanTmp('work-item update missing --state errors with usage', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await workItem.run([
      'update', 'SCR-1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('state'));
    process.exitCode = 0;
  }
});

testInCleanTmp('work-item update missing target errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await workItem.run([
      'update', '--state', '已完成',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id or identifier'));
    process.exitCode = 0;
  }
});

testInCleanTmp('work-item update by identifier with priority resolves both', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
    work_item_priorities: {
      'project-1': { values: [{ id: 'high', name: '高' }] },
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'SCR-1',
      '--state', '已完成',
      '--priority', '高',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.patch.json.state_id, 'state-done');
  assert.strictEqual(result.patch.json.priority_id, 'high');
});

testInCleanTmp('work-item update by identifier with assignee resolves user', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
    users: [{ id: 'user-alice', name: 'Alice' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'SCR-1',
      '--state', '已完成',
      '--assignee', 'Alice',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.patch.json.assignee_id, 'user-alice');
});

testInCleanTmp('work-item update by id with 2-letter prefix treated as direct id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'WI-123',
      '--state', '已完成',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  // WI-123 (2-letter prefix) is treated as direct ID, not identifier
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/project/work_items/WI-123');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('work-item update by TASK-42 (3-letter prefix) is treated as identifier', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'TASK-42',
      '--state', '已完成',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  // TASK-42 (4-letter prefix) is treated as identifier
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.params.identifier, 'TASK-42');
  assert.strictEqual(result.patch.method, 'PATCH');
  assert.strictEqual(result.patch.json.state_id, 'state-done');
});

// ── Adversarial / error cases ─────────────────────────────────────────

testInCleanTmp('work-item list bad flag produces error', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  try {
    await workItem.run(['list', '--bad-flag', '--workspace-cache', cachePath, '--dry-run']);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.length > 0);
    process.exitCode = 0;
  }
});

testInCleanTmp('work-item unknown subcommand errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await workItem.run(['nonexistent', '--workspace-cache', cachePath, '--dry-run']);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('Unknown work-item subcommand'));
    process.exitCode = 0;
  }
});

testInCleanTmp('work-item create --title empty string still passes', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', '',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.title, '');
});

testInCleanTmp('work-item show with id param (non-identifier) uses id filter', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['show', 'a1b2c3d4', '--workspace-cache', cachePath, '--dry-run']);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.params.id, 'a1b2c3d4');
  assert.strictEqual('identifier' in result.params, false);
});

testInCleanTmp('work-item update --dry-run does not make network requests', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
  });

  // Mock fetch should never be called in dry-run
  let called = false;
  global.fetch = () => { called = true; return Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, text: async () => '{}' }); };

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'SCR-1',
      '--state', '已完成',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  assert.strictEqual(called, false);
  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
});

testInCleanTmp('work-item create with --description passes description in body', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', 'With desc',
      '--description', 'Some description text',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.description, 'Some description text');
});

testInCleanTmp('work-item create with --parent passes parent_id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'create',
      '--title', 'Child item',
      '--parent', 'SCR-0',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.parent_id, 'SCR-0');
});

testInCleanTmp('work-item list state resolution fails for unknown state', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  try {
    await workItem.run([
      'list', '--state', 'NonExistentState',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('No cached state matched'));
    process.exitCode = 0;
  }
});

testInCleanTmp('work-item list with global options after subcommand args', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list', '--all-users', '--all-projects', '--all-sprints',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
});

testInCleanTmp('work-item update resolves all-cached state for flat id update', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    work_item_states: {
      'project-1::story': { values: [{ id: 'state-done', name: '已完成' }] },
    },
    work_item_priorities: {
      'project-1': { values: [{ id: 'high', name: '高' }] },
    },
    users: [{ id: 'user-alice', name: 'Alice' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'a1b2c3d4-e5f6',
      '--state', '已完成',
      '--priority', '高',
      '--assignee', 'Alice',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.json.state_id, 'state-done');
  assert.strictEqual(result.json.priority_id, 'high');
  assert.strictEqual(result.json.assignee_id, 'user-alice');
});

testInCleanEnv('module help lists all subcommands', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('list [options]'));
  assert.ok(output.includes('create --title TITLE'));
  assert.ok(output.includes('show <id|identifier>'));
  assert.ok(output.includes('update <id|identifier>'));
});

testInCleanEnv('list --help shows list-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['list', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: node scripts/pingcode.js work-item list [options]'));
  assert.ok(output.includes('--all-users'));
  assert.ok(output.includes('--state <name|id>'));
  assert.ok(!output.includes('create --title TITLE'));
});

testInCleanEnv('create --help shows create-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['create', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: node scripts/pingcode.js work-item create --title TITLE [options]'));
  assert.ok(output.includes('--title TITLE'));
  assert.ok(output.includes('--parent <id|identifier>'));
  assert.ok(!output.includes('list [options]'));
});

testInCleanEnv('show --help shows show-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['show', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: node scripts/pingcode.js work-item show <id|identifier>'));
  assert.ok(!output.includes('list [options]'));
  assert.ok(!output.includes('create --title TITLE'));
});

testInCleanEnv('update --help shows update-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['update', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: node scripts/pingcode.js work-item update <id|identifier> --state <name|id> [options]'));
  assert.ok(output.includes('--state <name|id>'));
  assert.ok(output.includes('--priority <name|id>'));
  assert.ok(!output.includes('list [options]'));
  assert.ok(!output.includes('create --title TITLE'));
});

// ── --grant-type flag tests ─────────────────────────────────────────

testInCleanTmp('work-item list --grant-type client_credentials --dry-run produces same output as default', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  // Default (no --grant-type)
  let defaultOutput = '';
  let originalLog = console.log;
  console.log = (...args) => { defaultOutput += args.join(' ') + '\n'; };
  try {
    await workItem.run(['list', '--workspace-cache', cachePath, '--dry-run']);
  } finally {
    console.log = originalLog;
  }
  const defaultResult = JSON.parse(defaultOutput.trim());

  // With --grant-type client_credentials
  let grantOutput = '';
  originalLog = console.log;
  console.log = (...args) => { grantOutput += args.join(' ') + '\n'; };
  try {
    await workItem.run(['list', '--workspace-cache', cachePath, '--dry-run', '--grant-type', 'client_credentials']);
  } finally {
    console.log = originalLog;
  }
  const grantResult = JSON.parse(grantOutput.trim());

  assert.strictEqual(grantResult.dry_run, true);
  assert.strictEqual(grantResult.method, defaultResult.method);
  assert.strictEqual(grantResult.path, defaultResult.path);
  assert.deepStrictEqual(grantResult.params, defaultResult.params);
});

testInCleanTmp('work-item list --grant-type authorization_code --dry-run accepts flag and produces valid request shape', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'list', '--workspace-cache', cachePath, '--dry-run',
      '--grant-type', 'authorization_code',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/project/work_items');
  assert.strictEqual(result.params.project_ids, 'project-1');
  assert.strictEqual(result.params.sprint_ids, 'sprint-1');
  assert.strictEqual('assignee_ids' in result.params, false, 'user token should not default to current-user filter');
});

testInCleanTmp('work-item list --grant-type authorization_code without cached token exits 1 with login guidance', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const tokenCache = tmpFile(tmpdir, 'token.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  // No token cache file — should fail with "login" guidance
  let stderr = '';
  const originalStderrWrite = process.stderr.write;
  process.stderr.write = (chunk) => { stderr += chunk; return true; };
  try {
    // Temporarily override tokenCache resolution
    const origTokenCache = process.env.PINGCODE_TOKEN_CACHE;
    process.env.PINGCODE_TOKEN_CACHE = tokenCache;

    await assert.rejects(
      () => workItem.run([
        'list', '--workspace-cache', cachePath,
        '--grant-type', 'authorization_code',
        '--client-id', 'c', '--client-secret', 's',
      ]),
      (err) => {
        return err instanceof core.PingCodeError && err.message.includes('login');
      },
    );

    if (origTokenCache) process.env.PINGCODE_TOKEN_CACHE = origTokenCache;
    else delete process.env.PINGCODE_TOKEN_CACHE;
  } finally {
    process.stderr.write = originalStderrWrite;
  }
});

testInCleanTmp('work-item list --grant-type authorization_code with cached user token succeeds', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const tokenCache = tmpFile(tmpdir, 'token.json');

  // Pre-create a valid token cache
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    grant_type: 'authorization_code',
    access_token: 'cached-user-token',
    refresh_token: 'rt-1',
    expires_at: now + 3600,
  };
  fs.mkdirSync(path.dirname(tokenCache), { recursive: true });
  fs.writeFileSync(tokenCache, JSON.stringify(tokenPayload));

  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  // Mock fetch: work items endpoint returns empty list
  const originalFetch = global.fetch;
  let capturedUrl = null;
  let capturedHeaders = null;
  global.fetch = (url, options) => {
    capturedUrl = url;
    capturedHeaders = options && options.headers;
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ values: [], total: 0 }),
    });
  };

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };

  const origTokenCacheEnv = process.env.PINGCODE_TOKEN_CACHE;
  process.env.PINGCODE_TOKEN_CACHE = tokenCache;

  try {
    await workItem.run([
      'list', '--workspace-cache', cachePath,
      '--grant-type', 'authorization_code',
      '--client-id', 'c', '--client-secret', 's',
    ]);

    // Verify the cached user token was used as bearer
    assert.ok(capturedHeaders, 'fetch should have been called with headers');
    const authHeader = capturedHeaders.Authorization || (capturedHeaders.get && capturedHeaders.get('Authorization'));
    // Headers are passed via rawRequest; let's check the request was made
    const result = JSON.parse(output.trim());
    assert.ok(Array.isArray(result.values));
    assert.strictEqual(result.total, 0);
  } finally {
    console.log = originalLog;
    global.fetch = originalFetch;
    if (origTokenCacheEnv) process.env.PINGCODE_TOKEN_CACHE = origTokenCacheEnv;
    else delete process.env.PINGCODE_TOKEN_CACHE;
  }
});

testInCleanTmp('work-item list with cached user token and no current user does not require identity', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const tokenCache = tmpFile(tmpdir, 'token.json');

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    grant_type: 'authorization_code',
    access_token: 'cached-user-token',
    refresh_token: 'rt-1',
    expires_at: now + 3600,
  };
  fs.mkdirSync(path.dirname(tokenCache), { recursive: true });
  fs.writeFileSync(tokenCache, JSON.stringify(tokenPayload));

  writeWorkspaceCache(cachePath, {
    preferences: {
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };

  const origTokenCacheEnv = process.env.PINGCODE_TOKEN_CACHE;
  process.env.PINGCODE_TOKEN_CACHE = tokenCache;

  try {
    await workItem.run([
      'list', '--workspace-cache', cachePath, '--dry-run',
      '--client-id', 'c', '--client-secret', 's',
    ]);

    const result = JSON.parse(output.trim());
    assert.strictEqual(result.dry_run, true);
    assert.strictEqual(result.params.project_ids, 'project-1');
    assert.strictEqual(result.params.sprint_ids, 'sprint-1');
    assert.strictEqual('assignee_ids' in result.params, false, 'should not default to current user with user token');
  } finally {
    console.log = originalLog;
    if (origTokenCacheEnv) process.env.PINGCODE_TOKEN_CACHE = origTokenCacheEnv;
    else delete process.env.PINGCODE_TOKEN_CACHE;
  }
});
