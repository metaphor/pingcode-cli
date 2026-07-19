const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const idea = require('../scripts/commands/idea');
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

// ── Module help ───────────────────────────────────────────────────────

testInCleanEnv('idea --help shows module help', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('PingCode idea'));
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('create'));
  assert.ok(output.includes('update'));
  assert.ok(output.includes('list'));
  assert.ok(output.includes('show'));
  assert.ok(output.includes('get'));
  assert.ok(output.includes('search'));
  assert.ok(output.includes('states'));
  assert.ok(output.includes('properties'));
  assert.ok(output.includes('suites'));
  assert.ok(output.includes('plans'));
  assert.ok(output.includes('priorities'));
  assert.ok(output.includes('transition-history'));
  assert.ok(output.includes('transition-histories'));
  assert.ok(output.includes('--dry-run'));
});

testInCleanEnv('idea with no args shows module help', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([]);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('PingCode idea'));
});

// ── Subcommand help ──────────────────────────────────────────────────

testInCleanEnv('idea create --help shows create-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['create', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea create [options]'));
  assert.ok(output.includes('--product'));
  assert.ok(output.includes('--title'));
  assert.ok(output.includes('--assignee'));
  assert.ok(output.includes('--description'));
  assert.ok(output.includes('--suite'));
  assert.ok(output.includes('--priority'));
  assert.ok(output.includes('--properties'));
});

testInCleanEnv('idea update --help shows update-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['update', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea update <id|identifier> [options]'));
  assert.ok(output.includes('--title'));
  assert.ok(output.includes('--description'));
  assert.ok(output.includes('--state'));
  assert.ok(output.includes('--priority'));
  assert.ok(output.includes('--assignee'));
  assert.ok(output.includes('--progress'));
  assert.ok(output.includes('--plan-at'));
  assert.ok(output.includes('--real-at'));
  assert.ok(output.includes('--plan'));
  assert.ok(output.includes('--suite'));
  assert.ok(output.includes('--properties'));
});

testInCleanEnv('idea list --help shows list-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['list', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea list [options]'));
  assert.ok(output.includes('--product'));
  assert.ok(output.includes('--state'));
  assert.ok(output.includes('--priority'));
  assert.ok(output.includes('--keywords'));
  assert.ok(output.includes('--include-public-image-token'));
});

testInCleanEnv('idea show --help shows show-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['show', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea show <identifier>'));
  assert.ok(output.includes('Only identifiers'));
});

testInCleanEnv('idea get --help shows get-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['get', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea get <id|identifier>'));
  assert.ok(output.includes('--include-public-image-token'));
});

testInCleanEnv('idea search --help shows search-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['search', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea search [options]'));
  assert.ok(output.includes('--filter'));
  assert.ok(output.includes('--keywords'));
  assert.ok(output.includes('--page-size'));
  assert.ok(output.includes('--page-index'));
  assert.ok(output.includes('--include-public-image-token'));
});

testInCleanEnv('idea states --help shows states-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['states', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea states [options]'));
  assert.ok(output.includes('--product'));
});

testInCleanEnv('idea properties --help shows properties-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['properties', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea properties [options]'));
});

testInCleanEnv('idea suites --help shows suites-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['suites', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea suites [options]'));
});

testInCleanEnv('idea plans --help shows plans-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['plans', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea plans [options]'));
});

testInCleanEnv('idea priorities --help shows priorities-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['priorities', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea priorities [options]'));
});

testInCleanEnv('idea transition-history --help shows transition-history-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['transition-history', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea transition-history'));
  assert.ok(output.includes('transition_history_id'));
});

testInCleanEnv('idea transition-histories --help shows transition-histories-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run(['transition-histories', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode idea transition-histories <id|identifier>'));
});

// ── Create dry-run ────────────────────────────────────────────────────

testInCleanTmp('idea create dry-run returns flat structure with required fields', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'create',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--title', 'New feature',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/ship/ideas');
  assert.strictEqual(result.json.product_id, '6422711c3f12e6c1e46d40e9');
  assert.strictEqual(result.json.title, 'New feature');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('idea create dry-run with all optional fields', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: {},
    users: [{ id: 'user-99', name: 'john', display_name: 'John' }],
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'create',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--title', 'Full idea',
      '--description', 'A description',
      '--suite', '5cb9466afda1ce4ca0090001',
      '--priority', '5cb9466afda1ce4ca0090005',
      '--assignee', 'john',
      '--properties', '{"key":"value"}',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/ship/ideas');
  assert.strictEqual(result.json.product_id, '6422711c3f12e6c1e46d40e9');
  assert.strictEqual(result.json.title, 'Full idea');
  assert.strictEqual(result.json.description, 'A description');
  assert.strictEqual(result.json.suite_id, '5cb9466afda1ce4ca0090001');
  assert.strictEqual(result.json.priority_id, '5cb9466afda1ce4ca0090005');
  assert.strictEqual(result.json.assignee_id, 'user-99');
  assert.deepStrictEqual(result.json.properties, { key: 'value' });
});

// ── Update dry-run ────────────────────────────────────────────────────

testInCleanTmp('idea update with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'update', 'SLC-1',
      '--title', 'Updated title',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/ship/ideas');
  assert.strictEqual(result.resolution.params.keywords, 'SLC-1');
  assert.ok(result.update);
  assert.strictEqual(result.update.method, 'PATCH');
  assert.strictEqual(result.update.path, '/v1/ship/ideas/{id}');
  assert.strictEqual(result.update.json.title, 'Updated title');
});

testInCleanTmp('idea update with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'update', '5edca524cad2fa1125cb0630',
      '--title', 'Updated title',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'PATCH');
  assert.strictEqual(result.path, '/v1/ship/ideas/5edca524cad2fa1125cb0630');
  assert.strictEqual(result.json.title, 'Updated title');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('idea update with progress and plan-at fields', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'update', '5edca524cad2fa1125cb0630',
      '--progress', '0.5',
      '--plan-at', '{"from":1736985600,"to":1739577600,"granularity":"day"}',
      '--state', '63e1bf51898a0be5a2d21b2a',
      '--priority', '64c3676c983bb9481ee1eea5',
      '--plan', '65a1bf51898a0be5a2d21b2b',
      '--suite', '65b1bf51898a0be5a2d21b2c',
      '--real-at', '{"from":1736985600,"to":1739577600,"granularity":"month"}',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.json.progress, 0.5);
  assert.deepStrictEqual(result.json.plan_at, { from: 1736985600, to: 1739577600, granularity: 'day' });
  assert.deepStrictEqual(result.json.real_at, { from: 1736985600, to: 1739577600, granularity: 'month' });
  assert.strictEqual(result.json.state_id, '63e1bf51898a0be5a2d21b2a');
  assert.strictEqual(result.json.priority_id, '64c3676c983bb9481ee1eea5');
  assert.strictEqual(result.json.plan_id, '65a1bf51898a0be5a2d21b2b');
  assert.strictEqual(result.json.suite_id, '65b1bf51898a0be5a2d21b2c');
});

// ── List dry-run ──────────────────────────────────────────────────────

testInCleanTmp('idea list dry-run returns flat structure', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'list',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/ideas');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('idea list dry-run with all filters', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'list',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--state', '63e1bf51898a0be5a2d21b2a',
      '--priority', '64c3676c983bb9481ee1eea5',
      '--keywords', 'login',
      '--include-public-image-token',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/ideas');
  assert.strictEqual(result.params.product_id, '6422711c3f12e6c1e46d40e9');
  assert.strictEqual(result.params.state_id, '63e1bf51898a0be5a2d21b2a');
  assert.strictEqual(result.params.priority_id, '64c3676c983bb9481ee1eea5');
  assert.strictEqual(result.params.keywords, 'login');
  assert.strictEqual(result.params.include_public_image_token, 'description');
});

// ── Show dry-run ──────────────────────────────────────────────────────

testInCleanTmp('idea show with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'show', 'SLC-1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/ship/ideas');
  assert.strictEqual(result.resolution.params.keywords, 'SLC-1');
  assert.ok(result.show);
  assert.strictEqual(result.show.method, 'GET');
  assert.strictEqual(result.show.path, '/v1/ship/ideas');
  assert.strictEqual(result.show.params.keywords, 'SLC-1');
});

// ── Get dry-run ───────────────────────────────────────────────────────

testInCleanTmp('idea get with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'get', 'SLC-1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/ship/ideas');
  assert.strictEqual(result.resolution.params.keywords, 'SLC-1');
  assert.ok(result.get);
  assert.strictEqual(result.get.method, 'GET');
  assert.strictEqual(result.get.path, '/v1/ship/ideas/{id}');
  assert.strictEqual(result.get.params, undefined);
});

testInCleanTmp('idea get with identifier and --include-public-image-token', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'get', 'SLC-1',
      '--include-public-image-token',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.deepStrictEqual(result.get.params, { include_public_image_token: 'description' });
});

testInCleanTmp('idea get with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'get', '5edca524cad2fa1125cb0630',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/ideas/5edca524cad2fa1125cb0630');
  assert.strictEqual('resolution' in result, false);
});

// ── Search dry-run ────────────────────────────────────────────────────

testInCleanTmp('idea search dry-run returns flat POST structure', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'search',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/ship/ideas/search');
  assert.strictEqual(result.json.mode, 'query');
  assert.deepStrictEqual(result.json.payload, {});
});

testInCleanTmp('idea search dry-run with all options', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'search',
      '--filter', '{"title":{"contains":"login"}}',
      '--keywords', 'auth',
      '--page-size', '10',
      '--page-index', '0',
      '--include-public-image-token',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/ship/ideas/search');
  assert.strictEqual(result.json.mode, 'query');
  assert.deepStrictEqual(result.json.payload.filter, { title: { contains: 'login' } });
  assert.strictEqual(result.json.payload.keywords, 'auth');
  assert.strictEqual(result.json.payload.page_size, 10);
  assert.strictEqual(result.json.payload.page_index, 0);
  assert.strictEqual(result.json.payload.include_public_image_token, 'description');
});

// ── Dictionary dry-run (states, properties, suites, plans, priorities) ─

testInCleanTmp('idea states dry-run returns flat GET structure', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'states',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/idea/states');
  assert.strictEqual(result.params.product_id, '6422711c3f12e6c1e46d40e9');
});

testInCleanTmp('idea properties dry-run returns flat GET structure', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'properties',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/idea/properties');
  assert.strictEqual(result.params.product_id, '6422711c3f12e6c1e46d40e9');
});

testInCleanTmp('idea suites dry-run returns flat GET structure', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'suites',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/idea/suites');
  assert.strictEqual(result.params.product_id, '6422711c3f12e6c1e46d40e9');
});

testInCleanTmp('idea plans dry-run returns flat GET structure', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'plans',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/idea/plans');
  assert.strictEqual(result.params.product_id, '6422711c3f12e6c1e46d40e9');
});

testInCleanTmp('idea priorities dry-run returns flat GET structure', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'priorities',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/idea/priorities');
  assert.strictEqual(result.params.product_id, '6422711c3f12e6c1e46d40e9');
});

// ── Transition-histories dry-run ──────────────────────────────────────

testInCleanTmp('idea transition-histories with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'transition-histories', 'SLC-1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/ship/ideas');
  assert.strictEqual(result.resolution.params.keywords, 'SLC-1');
  assert.ok(result.list);
  assert.strictEqual(result.list.method, 'GET');
  assert.strictEqual(result.list.path, '/v1/ship/ideas/{id}/transition_histories');
});

testInCleanTmp('idea transition-histories with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'transition-histories', '5edca524cad2fa1125cb0630',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/ideas/5edca524cad2fa1125cb0630/transition_histories');
  assert.strictEqual('resolution' in result, false);
});

// ── Transition-history dry-run ────────────────────────────────────────

testInCleanTmp('idea transition-history with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'transition-history', '64c3676c983bb9481ee1eea5', 'SLC-1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/ship/ideas');
  assert.strictEqual(result.resolution.params.keywords, 'SLC-1');
  assert.ok(result.get);
  assert.strictEqual(result.get.method, 'GET');
  assert.strictEqual(result.get.path, '/v1/ship/ideas/{id}/transition_histories/64c3676c983bb9481ee1eea5');
});

testInCleanTmp('idea transition-history with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await idea.run([
      'transition-history', '64c3676c983bb9481ee1eea5', '5edca524cad2fa1125cb0630',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/ship/ideas/5edca524cad2fa1125cb0630/transition_histories/64c3676c983bb9481ee1eea5');
  assert.strictEqual('resolution' in result, false);
});

// ── Error paths: missing required parameters ──────────────────────────

testInCleanTmp('idea create missing --product errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'create',
      '--title', 'No product',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('product'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea create missing --title errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'create',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('title'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea show missing identifier errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'show',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('identifier'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea get missing id errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'get',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id or identifier'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update missing target errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update',
      '--title', 'No target',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id or identifier'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update with target but no update fields errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update', 'SLC-1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('At least one field'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea states missing --product errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'states',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('product'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea transition-histories missing id errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'transition-histories',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id or identifier'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea transition-history missing both args errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'transition-history',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('transition history id'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea transition-history missing idea ref errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'transition-history', '64c3676c983bb9481ee1eea5',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('transition history id'));
    assert.ok(exc.message.includes('required'));
    process.exitCode = 0;
  }
});

// ── Error paths: ID type parameters reject name input ─────────────────

testInCleanTmp('idea create --product with name rejects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'create',
      '--product', 'my-product-name',
      '--title', 'Test',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('product'));
    assert.ok(exc.message.includes('raw id'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea list --product with name rejects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'list',
      '--product', 'not-a-hex-id',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('product'));
    assert.ok(exc.message.includes('raw id'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea show with raw id rejects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'show', '5edca524cad2fa1125cb0630',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('identifier'));
    assert.ok(exc.message.includes('not a raw id'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea show with invalid identifier format rejects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'show', 'invalid-format',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('identifier'));
    assert.ok(exc.message.includes('Invalid'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update --state with name rejects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update', '5edca524cad2fa1125cb0630',
      '--state', 'open',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('state'));
    assert.ok(exc.message.includes('raw id'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea states --product with name rejects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'states',
      '--product', 'MyProduct',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('product'));
    assert.ok(exc.message.includes('raw id'));
    process.exitCode = 0;
  }
});

// ── Error paths: invalid JSON / validation ────────────────────────────

testInCleanTmp('idea search --filter invalid JSON errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'search',
      '--filter', 'not-json',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('filter'));
    assert.ok(exc.message.includes('JSON'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea search --filter JSON array rejects', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'search',
      '--filter', '[1,2,3]',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('filter'));
    assert.ok(exc.message.includes('object'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea create --properties invalid JSON errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'create',
      '--product', '6422711c3f12e6c1e46d40e9',
      '--title', 'Test',
      '--properties', '{broken json',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('properties'));
    assert.ok(exc.message.includes('JSON'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea search --page-size out of range errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'search',
      '--page-size', '200',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('page-size'));
    assert.ok(exc.message.includes('between 1 and 100'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea search --page-index negative errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'search',
      '--page-index', '-1',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('page-index'));
    assert.ok(exc.message.includes('non-negative'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update --progress out of range errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update', 'SLC-1',
      '--progress', '1.5',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('progress'));
    assert.ok(exc.message.includes('between 0 and 1'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update --progress too many decimals errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update', 'SLC-1',
      '--progress', '0.123',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('progress'));
    assert.ok(exc.message.includes('decimal'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update --plan-at invalid JSON errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update', 'SLC-1',
      '--plan-at', 'not-json',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('plan-at'));
    assert.ok(exc.message.includes('JSON'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update --plan-at missing granularity errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update', 'SLC-1',
      '--plan-at', '{"from":1,"to":2}',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('plan-at'));
    assert.ok(exc.message.includes('granularity'));
    process.exitCode = 0;
  }
});

testInCleanTmp('idea update --plan-at invalid granularity errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'update', 'SLC-1',
      '--plan-at', '{"from":1,"to":2,"granularity":"hour"}',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('plan-at'));
    assert.ok(exc.message.includes('granularity'));
    process.exitCode = 0;
  }
});

// ── Unknown subcommand ────────────────────────────────────────────────

testInCleanTmp('idea unknown subcommand errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, { preferences: {} });

  try {
    await idea.run([
      'nonexistent',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('Unknown idea subcommand'));
    process.exitCode = 0;
  }
});

// ── printHelp function direct call ────────────────────────────────────

testInCleanEnv('idea.printHelp() outputs module help', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    idea.printHelp();
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('PingCode idea'));
  assert.ok(output.includes('Subcommands:'));
});
