const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const comment = require('../scripts/commands/comment');
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

testInCleanEnv('comment --help shows module help', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run(['--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Subcommands:'));
  assert.ok(output.includes('create <id|identifier>'));
  assert.ok(output.includes('list <id|identifier>'));
  assert.ok(output.includes('get <comment-id>'));
  assert.ok(output.includes('delete <comment-id>'));
  assert.ok(output.includes('--content'));
  assert.ok(output.includes('--reply-to'));
  assert.ok(output.includes('--dry-run'));
});

testInCleanEnv('comment create --help shows create-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run(['create', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode comment create <id|identifier> --content TEXT'));
  assert.ok(output.includes('--content TEXT'));
  assert.ok(output.includes('--reply-to'));
});

testInCleanEnv('comment list --help shows list-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run(['list', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode comment list <id|identifier>'));
});

testInCleanEnv('comment get --help shows get-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run(['get', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode comment get <comment-id> <id|identifier>'));
});

testInCleanEnv('comment delete --help shows delete-specific usage', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run(['delete', '--help']);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('Usage: pingcode comment delete <comment-id> <id|identifier>'));
});

// ── Create subcommand ─────────────────────────────────────────────────

testInCleanTmp('comment create with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'create', 'SCR-123',
      '--content', 'hello',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/project/work_items');
  assert.strictEqual(result.resolution.params.identifier, 'SCR-123');
  assert.ok(result.post);
  assert.strictEqual(result.post.method, 'POST');
  assert.strictEqual(result.post.path, '/v1/comments');
  assert.strictEqual(result.post.json.content, 'hello');
  assert.strictEqual(result.post.json.principal_type, 'work_item');
  assert.strictEqual(result.post.json.principal_id, '{id}');
});

testInCleanTmp('comment create with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'create', '5edca524cad2fa1125cb0630',
      '--content', 'hello',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'POST');
  assert.strictEqual(result.path, '/v1/comments');
  assert.strictEqual(result.json.content, 'hello');
  assert.strictEqual(result.json.principal_id, '5edca524cad2fa1125cb0630');
  assert.strictEqual(result.json.principal_type, 'work_item');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('comment create with --reply-to includes reply_comment_id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'create', 'SCR-123',
      '--content', 'reply',
      '--reply-to', 'cmt-789',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.post.json.content, 'reply');
  assert.strictEqual(result.post.json.reply_comment_id, 'cmt-789');
});

testInCleanTmp('comment create missing --content errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await comment.run([
      'create', 'SCR-123',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('content'));
    process.exitCode = 0;
  }
});

testInCleanTmp('comment create --content empty string errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await comment.run([
      'create', 'SCR-123',
      '--content', '',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('content'));
    assert.ok(exc.message.includes('non-empty'));
    process.exitCode = 0;
  }
});

testInCleanTmp('comment create missing work item id errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await comment.run([
      'create',
      '--content', 'hello',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id or identifier'));
    process.exitCode = 0;
  }
});

testInCleanTmp('comment create with --dry-run does not make network requests', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let called = false;
  global.fetch = () => { called = true; return Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, text: async () => '{}' }); };

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'create', 'SCR-123',
      '--content', 'test',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  assert.strictEqual(called, false);
  assert.ok(JSON.parse(output.trim()).dry_run);
});

// ── List subcommand ───────────────────────────────────────────────────

testInCleanTmp('comment list with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'list', 'SCR-123',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/project/work_items');
  assert.strictEqual(result.resolution.params.identifier, 'SCR-123');
  assert.ok(result.get);
  assert.strictEqual(result.get.method, 'GET');
  assert.strictEqual(result.get.path, '/v1/comments');
  assert.strictEqual(result.get.params.principal_id, '{id}');
  assert.strictEqual(result.get.params.principal_type, 'work_item');
});

testInCleanTmp('comment list with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'list', '5edca524cad2fa1125cb0630',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/comments');
  assert.strictEqual(result.params.principal_id, '5edca524cad2fa1125cb0630');
  assert.strictEqual(result.params.principal_type, 'work_item');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('comment list missing work item id errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await comment.run([
      'list',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('id or identifier'));
    process.exitCode = 0;
  }
});

testInCleanTmp('comment list with --compact flag is accepted and produces compact output', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const tokenCache = tmpFile(tmpdir, 'token.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  // Pre-create a valid token cache
  const now = Math.floor(Date.now() / 1000);
  fs.writeFileSync(tokenCache, JSON.stringify({
    grant_type: 'client_credentials',
    access_token: 'test-token',
    expires_at: now + 3600,
  }));

  const origTokenCacheEnv = process.env.PINGCODE_TOKEN_CACHE;
  process.env.PINGCODE_TOKEN_CACHE = tokenCache;

  // Mock fetch to return a typical comment list response
  const originalFetch = global.fetch;
  global.fetch = (url, options) => {
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        page_size: 30,
        page_index: 0,
        total: 2,
        values: [
          {
            id: 'cmt-1',
            content: 'First comment',
            created_at: 1565255712,
            created_by: { id: 'user-1', name: 'alice', display_name: 'Alice' },
            is_deleted: 0,
            is_reply_comment: 0,
            replied_comment: null,
            attachment_count: 0,
            attachments: [],
          },
          {
            id: 'cmt-2',
            content: 'Reply',
            created_at: 1565255800,
            created_by: { id: 'user-2', name: 'bob', display_name: 'Bob' },
            is_deleted: 0,
            is_reply_comment: 1,
            replied_comment: { id: 'cmt-1', content: 'First comment', is_deleted: 0 },
            attachment_count: 0,
            attachments: [],
          },
        ],
      }),
    });
  };

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'list', 'a1b2c3d4',
      '--workspace-cache', cachePath, '--compact',
      '--client-id', 'c', '--client-secret', 's',
    ]);
  } finally {
    console.log = originalLog;
    global.fetch = originalFetch;
    if (origTokenCacheEnv) process.env.PINGCODE_TOKEN_CACHE = origTokenCacheEnv;
    else delete process.env.PINGCODE_TOKEN_CACHE;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.total, 2);
  assert.strictEqual(result.values.length, 2);
  assert.strictEqual(result.values[0].id, 'cmt-1');
  assert.strictEqual(result.values[0].content, 'First comment');
  assert.strictEqual(result.values[0].created_by, 'Alice');
  assert.strictEqual(result.values[1].id, 'cmt-2');
  assert.strictEqual(result.values[1].created_by, 'Bob');
  assert.ok(result.values[1].replied_comment);
  assert.strictEqual(result.values[1].replied_comment.id, 'cmt-1');
  // Compact should exclude verbose fields
  assert.strictEqual('attachment_count' in result.values[0], false);
  assert.strictEqual('attachments' in result.values[0], false);
  assert.strictEqual('url' in result.values[0], false);
});

// ── Get subcommand ────────────────────────────────────────────────────

testInCleanTmp('comment get with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'get', 'cmt-456', 'SCR-123',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/project/work_items');
  assert.strictEqual(result.resolution.params.identifier, 'SCR-123');
  assert.ok(result.get);
  assert.strictEqual(result.get.method, 'GET');
  assert.strictEqual(result.get.path, '/v1/comments/cmt-456');
  assert.strictEqual(result.get.params.principal_id, '{id}');
  assert.strictEqual(result.get.params.principal_type, 'work_item');
});

testInCleanTmp('comment get with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'get', 'cmt-456', '5edca524cad2fa1125cb0630',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'GET');
  assert.strictEqual(result.path, '/v1/comments/cmt-456');
  assert.strictEqual(result.params.principal_id, '5edca524cad2fa1125cb0630');
  assert.strictEqual(result.params.principal_type, 'work_item');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('comment get missing args errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await comment.run([
      'get', 'cmt-456',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('comment id'));
    process.exitCode = 0;
  }
});

testInCleanTmp('comment get with --compact flag produces compact output', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const tokenCache = tmpFile(tmpdir, 'token.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  const now = Math.floor(Date.now() / 1000);
  fs.writeFileSync(tokenCache, JSON.stringify({
    grant_type: 'client_credentials',
    access_token: 'test-token',
    expires_at: now + 3600,
  }));

  const origTokenCacheEnv = process.env.PINGCODE_TOKEN_CACHE;
  process.env.PINGCODE_TOKEN_CACHE = tokenCache;

  const originalFetch = global.fetch;
  global.fetch = (url, options) => {
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        id: 'cmt-456',
        url: 'https://open.pingcode.com/v1/comments/cmt-456',
        content: 'A comment',
        attachment_count: 0,
        attachments: [],
        is_reply_comment: 0,
        replied_comment: null,
        created_at: 1565255712,
        created_by: { id: 'user-1', name: 'alice', display_name: 'Alice' },
        is_deleted: 0,
      }),
    });
  };

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'get', 'cmt-456', 'a1b2c3d4',
      '--workspace-cache', cachePath, '--compact',
      '--client-id', 'c', '--client-secret', 's',
    ]);
  } finally {
    console.log = originalLog;
    global.fetch = originalFetch;
    if (origTokenCacheEnv) process.env.PINGCODE_TOKEN_CACHE = origTokenCacheEnv;
    else delete process.env.PINGCODE_TOKEN_CACHE;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.id, 'cmt-456');
  assert.strictEqual(result.content, 'A comment');
  assert.strictEqual(result.created_by, 'Alice');
  assert.strictEqual('attachment_count' in result, false);
  assert.strictEqual('url' in result, false);
});

// ── Delete subcommand ─────────────────────────────────────────────────

testInCleanTmp('comment delete with identifier returns compound dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'delete', 'cmt-456', 'SCR-123',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.ok(result.resolution);
  assert.strictEqual(result.resolution.method, 'GET');
  assert.strictEqual(result.resolution.path, '/v1/project/work_items');
  assert.strictEqual(result.resolution.params.identifier, 'SCR-123');
  assert.ok(result.delete);
  assert.strictEqual(result.delete.method, 'DELETE');
  assert.strictEqual(result.delete.path, '/v1/comments/cmt-456');
  assert.strictEqual(result.delete.params.principal_id, '{id}');
  assert.strictEqual(result.delete.params.principal_type, 'work_item');
});

testInCleanTmp('comment delete with raw id returns flat dry-run', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([
      'delete', 'cmt-456', '5edca524cad2fa1125cb0630',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
  } finally {
    console.log = originalLog;
  }

  const result = JSON.parse(output.trim());
  assert.strictEqual(result.dry_run, true);
  assert.strictEqual(result.method, 'DELETE');
  assert.strictEqual(result.path, '/v1/comments/cmt-456');
  assert.strictEqual(result.params.principal_id, '5edca524cad2fa1125cb0630');
  assert.strictEqual(result.params.principal_type, 'work_item');
  assert.strictEqual('resolution' in result, false);
});

testInCleanTmp('comment delete missing args errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await comment.run([
      'delete', 'cmt-456',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('comment id'));
    process.exitCode = 0;
  }
});

// ── Adversarial / error cases ─────────────────────────────────────────

testInCleanTmp('comment unknown subcommand errors', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  try {
    await comment.run([
      'nonexistent',
      '--workspace-cache', cachePath, '--dry-run',
    ]);
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('Unknown comment subcommand'));
    process.exitCode = 0;
  }
});

testInCleanEnv('comment with no args shows module help', async () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => { output += args.join(' ') + '\n'; };
  try {
    await comment.run([]);
  } finally {
    console.log = originalLog;
  }
  assert.ok(output.includes('PingCode comment'));
});

// ── resolver helper ───────────────────────────────────────────────────

testInCleanTmp('resolveWorkItemIdentifier resolves identifier to id', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const tokenCache = tmpFile(tmpdir, 'token.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  const now = Math.floor(Date.now() / 1000);
  fs.writeFileSync(tokenCache, JSON.stringify({
    grant_type: 'client_credentials',
    access_token: 'test-token',
    expires_at: now + 3600,
  }));

  const origTokenCacheEnv = process.env.PINGCODE_TOKEN_CACHE;
  process.env.PINGCODE_TOKEN_CACHE = tokenCache;

  const originalFetch = global.fetch;
  global.fetch = (url, options) => {
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        values: [{ id: '5edca524cad2fa1125cb0630', identifier: 'SCR-123' }],
        total: 1,
      }),
    });
  };

  try {
    const client = new core.PingCodeClient({
      workspace_cache: cachePath,
      client_id: 'c',
      client_secret: 's',
      token_cache: tokenCache,
    });
    const id = await core.resolveWorkItemIdentifier(client, 'SCR-123');
    assert.strictEqual(id, '5edca524cad2fa1125cb0630');
  } finally {
    global.fetch = originalFetch;
    if (origTokenCacheEnv) process.env.PINGCODE_TOKEN_CACHE = origTokenCacheEnv;
    else delete process.env.PINGCODE_TOKEN_CACHE;
  }
});

testInCleanTmp('resolveWorkItemIdentifier throws when none found', async (t, tmpdir) => {
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  const tokenCache = tmpFile(tmpdir, 'token.json');
  writeWorkspaceCache(cachePath, {
    preferences: { current_user_id: 'user-1' },
  });

  const now = Math.floor(Date.now() / 1000);
  fs.writeFileSync(tokenCache, JSON.stringify({
    grant_type: 'client_credentials',
    access_token: 'test-token',
    expires_at: now + 3600,
  }));

  const origTokenCacheEnv = process.env.PINGCODE_TOKEN_CACHE;
  process.env.PINGCODE_TOKEN_CACHE = tokenCache;

  const originalFetch = global.fetch;
  global.fetch = (url, options) => {
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ values: [], total: 0 }),
    });
  };

  try {
    const client = new core.PingCodeClient({
      workspace_cache: cachePath,
      client_id: 'c',
      client_secret: 's',
      token_cache: tokenCache,
    });
    await core.resolveWorkItemIdentifier(client, 'NONEXIST-999');
    assert.fail('Expected error was not thrown');
  } catch (exc) {
    assert.ok(exc.message.includes('No work item found'));
    assert.ok(exc instanceof core.PingCodeError);
  } finally {
    global.fetch = originalFetch;
    if (origTokenCacheEnv) process.env.PINGCODE_TOKEN_CACHE = origTokenCacheEnv;
    else delete process.env.PINGCODE_TOKEN_CACHE;
  }
});
