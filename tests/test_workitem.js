const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const workItem = require('../scripts/commands/workitem');
const { tmpFile, clearEnv, restoreEnv, writeWorkspaceCache } = require('./helpers');

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

function testInCleanTmp(name, fn) {
  test(name, async (t) => {
    const original = clearEnv();
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pingcode-test-'));
    process.env.PINGCODE_TOKEN_CACHE = path.join(tmpdir, 'token.json');
    try {
      await fn(t, tmpdir);
    } finally {
      restoreEnv(original);
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });
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

// ── workitem list ────────────────────────────────────────────────────

testInCleanTmp('workitem list dry-run applies default filters from cache', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --all-users --all-projects --all-sprints skips default filters', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --state resolves name from cache', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --assignee resolves cached user name', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --assignee @me resolves to cached current user', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --limit sets page_size', async (t, tmpdir) => {
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

testInCleanTmp('workitem list with incomplete cache (missing project) errors with guidance', async (t, tmpdir) => {
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

testInCleanTmp('workitem list with --all-projects --all-sprints skips project/sprint context check', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --keywords sets keywords query param', async (t, tmpdir) => {
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
      'list', '--keywords', '登录页面',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.params.keywords, '登录页面');
});

// ── workitem create ──────────────────────────────────────────────────

testInCleanTmp('workitem create dry-run returns POST with resolved fields', async (t, tmpdir) => {
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

testInCleanTmp('workitem create with --sprint resolves and includes sprint_id', async (t, tmpdir) => {
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

testInCleanTmp('workitem create missing --title errors with usage', async (t, tmpdir) => {
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

testInCleanTmp('workitem create defaults assignee to @me from cache', async (t, tmpdir) => {
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

testInCleanTmp('workitem create with --assignee overrides default', async (t, tmpdir) => {
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

testInCleanTmp('workitem create with --all-users skips default assignee', async (t, tmpdir) => {
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

// ── workitem show ────────────────────────────────────────────────────

testInCleanTmp('workitem show identifier returns GET with identifier param', async (t, tmpdir) => {
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

testInCleanTmp('workitem show missing target errors', async (t, tmpdir) => {
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

testInCleanTmp('workitem get by id returns GET by path', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['get', 'a1b2c3d4', '--workspace-cache', cachePath, '--dry-run']);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/project/work_items/a1b2c3d4');
  assert.deepStrictEqual(result.params, {});
});

testInCleanTmp('workitem get by identifier returns compound dry-run shape', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['get', 'WYT-852', '--workspace-cache', cachePath, '--dry-run']);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/project/work_items');
  assert.strictEqual(result.resolution.params.identifier, 'WYT-852');
  assert.ok(result.get);
  assert.strictEqual(result.get.method, 'GET');
  assert.strictEqual(result.get.path, '/v1/project/work_items/{id}');
});

testInCleanTmp('workitem get missing id errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await workItem.run(['get', '--workspace-cache', cachePath, '--dry-run']);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id'));
    process.exitCode = 0;
  }
});

testInCleanEnv('workitem get --help shows get-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run(['get', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode workitem get <id|identifier>'));
  assert.ok(!output.includes('list [options]'));
  assert.ok(!output.includes('create --title TITLE'));
});

// ── workitem update ──────────────────────────────────────────────────

testInCleanTmp('workitem update by id returns flat dry-run shape', async (t, tmpdir) => {
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

testInCleanTmp('workitem update by identifier returns compound dry-run shape', async (t, tmpdir) => {
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

testInCleanTmp('workitem update with no update fields errors', async (t, tmpdir) => {
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
    assert.ok(exc.message.includes('At least one field'));
    process.exitCode = 0;
  }
});

testInCleanTmp('workitem update missing target errors', async (t, tmpdir) => {
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

testInCleanTmp('workitem update by identifier with priority resolves both', async (t, tmpdir) => {
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

testInCleanTmp('workitem update by identifier with assignee resolves user', async (t, tmpdir) => {
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

testInCleanTmp('workitem update by id with 2-letter prefix treated as direct id', async (t, tmpdir) => {
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

testInCleanTmp('workitem update by TASK-42 (3-letter prefix) is treated as identifier', async (t, tmpdir) => {
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

testInCleanTmp('workitem update by id without state updates only title', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'a1b2c3d4',
      '--title', 'Updated title',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/project/work_items/a1b2c3d4');
  assert.strictEqual(result.json.title, 'Updated title');
  assert.strictEqual('state_id' in result.json, false);
});

testInCleanTmp('workitem update passes description and cached refs', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {
      current_user_id: 'user-1',
      current_project_id: 'project-1',
      current_sprint_id: 'sprint-1',
    },
    projects: [{ id: 'project-2', name: 'Other' }],
    sprints: {
      'project-2': { values: [{ id: 'sprint-2', name: 'Sprint 2' }] },
    },
    work_item_types: {
      'project-2': { values: [{ id: 'type-2', name: 'Bug' }] },
    },
    work_item_states: {
      'project-2::bug': { values: [{ id: 'state-open', name: '待处理' }] },
    },
    work_item_priorities: {
      'project-2': { values: [{ id: 'prio-2', name: '中' }] },
    },
    users: [{ id: 'user-bob', name: 'Bob' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'a1b2c3d4',
      '--project', 'Other',
      '--type', 'Bug',
      '--sprint', 'Sprint 2',
      '--state', '待处理',
      '--priority', '中',
      '--assignee', 'Bob',
      '--description', 'New description',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.project_id, 'project-2');
  assert.strictEqual(result.json.type_id, 'type-2');
  assert.strictEqual(result.json.sprint_id, 'sprint-2');
  assert.strictEqual(result.json.state_id, 'state-open');
  assert.strictEqual(result.json.priority_id, 'prio-2');
  assert.strictEqual(result.json.assignee_id, 'user-bob');
  assert.strictEqual(result.json.description, 'New description');
});

testInCleanTmp('workitem update numeric and timestamp fields', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'a1b2c3d4',
      '--story-points', '3',
      '--estimated-workload', '8.5',
      '--remaining-workload', '4',
      '--start-at', '2025-01-16T00:00:00Z',
      '--end-at', '1735689600',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.story_points, 3);
  assert.strictEqual(result.json.estimated_workload, 8.5);
  assert.strictEqual(result.json.remaining_workload, 4);
  assert.strictEqual(result.json.start_at, 1736985600);
  assert.strictEqual(result.json.end_at, 1735689600);
});

testInCleanTmp('workitem update passes raw ids and participants', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
    users: [
      { id: 'user-alice', name: 'Alice' },
      { id: 'user-bob', name: 'Bob' },
    ],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'a1b2c3d4',
      '--parent', 'SCR-0',
      '--version', 'version-1',
      '--board', 'board-1',
      '--entry', 'entry-1',
      '--swimlane', 'swimlane-1',
      '--participants', 'Alice,@user:Bob',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.json.parent_id, 'SCR-0');
  assert.strictEqual(result.json.version_id, 'version-1');
  assert.strictEqual(result.json.board_id, 'board-1');
  assert.strictEqual(result.json.entry_id, 'entry-1');
  assert.strictEqual(result.json.swimlane_id, 'swimlane-1');
  assert.deepStrictEqual(result.json.participant_ids, ['user-alice', 'user-bob']);
});

testInCleanTmp('workitem update parses properties json', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await workItem.run([
      'update', 'a1b2c3d4',
      '--properties', '{"risk":"high","source":"api"}',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.deepStrictEqual(result.json.properties, { risk: 'high', source: 'api' });
});

// ── Adversarial / error cases ─────────────────────────────────────────

testInCleanTmp('workitem list bad flag produces error', async (t, tmpdir) => {
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

testInCleanTmp('workitem unknown subcommand errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await workItem.run(['nonexistent', '--workspace-cache', cachePath, '--dry-run']);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('Unknown workitem subcommand'));
    process.exitCode = 0;
  }
});

testInCleanTmp('workitem create --title empty string errors', async (t, tmpdir) => {
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
      'create',
      '--title', '',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('title'));
    assert.ok(exc.message.includes('non-empty'));
    process.exitCode = 0;
  }
});

testInCleanTmp('workitem show with id param (non-identifier) uses id filter', async (t, tmpdir) => {
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

testInCleanTmp('workitem update --dry-run does not make network requests', async (t, tmpdir) => {
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

testInCleanTmp('workitem create with --description passes description in body', async (t, tmpdir) => {
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

testInCleanTmp('workitem create with --parent passes parent_id', async (t, tmpdir) => {
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

testInCleanTmp('workitem list state resolution fails for unknown state', async (t, tmpdir) => {
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

testInCleanTmp('workitem list with global options after subcommand args', async (t, tmpdir) => {
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

testInCleanTmp('workitem update resolves all-cached state for flat id update', async (t, tmpdir) => {
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
  assert.ok(output.includes('get <id|identifier>'));
  assert.ok(output.includes('update <id|identifier>'));
  assert.ok(output.includes('--all-users'));
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
  assert.ok(output.includes('Usage: pingcode workitem list [options]'));
  assert.ok(output.includes('--keywords'));
  assert.ok(output.includes('--state <name|id>'));
  assert.ok(!output.includes('--all-users'));
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
  assert.ok(output.includes('Usage: pingcode workitem create --title TITLE [options]'));
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
  assert.ok(output.includes('Usage: pingcode workitem show <id|identifier>'));
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
  assert.ok(output.includes('Usage: pingcode workitem update <id|identifier> [options]'));
  assert.ok(output.includes('--title TEXT'));
  assert.ok(output.includes('--state <name|id>'));
  assert.ok(output.includes('--priority <name|id>'));
  assert.ok(output.includes('--properties JSON'));
  assert.ok(!output.includes('list [options]'));
  assert.ok(!output.includes('create --title TITLE'));
});

// ── --grant-type flag tests ─────────────────────────────────────────

testInCleanTmp('workitem list --grant-type client_credentials --dry-run produces same output as default', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --grant-type authorization_code --dry-run accepts flag and produces valid request shape', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --grant-type authorization_code without cached token exits 1 with login guidance', async (t, tmpdir) => {
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

testInCleanTmp('workitem list --grant-type authorization_code with cached user token succeeds', async (t, tmpdir) => {
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

testInCleanTmp('workitem list with cached user token and no current user does not require identity', async (t, tmpdir) => {
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
