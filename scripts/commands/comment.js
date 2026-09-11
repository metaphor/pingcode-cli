'use strict';

const core = require('../core');
const shared = require('./shared');

function isIdentifier(arg) {
  return /^[A-Z]{3,6}-\d+$/.test(arg);
}

const COMMENT_PRINCIPAL_TYPES = new Set([
  'work_item',
  'work_item_deliverable',
  'test_case',
  'test_run',
  'idea',
  'ticket',
  'page',
]);

function isWorkItemPrincipal(type) {
  return type === 'work_item' || type === 'work_item_deliverable';
}

// ── Comment-specific compact helper ────────────────────────────────────

function compactComment(item) {
  const fields = ['id', 'content', 'created_at', 'is_deleted', 'is_reply_comment'];
  const compact = {};
  for (const key of fields) {
    if (!(key in item)) continue;
    const value = item[key];
    if (value !== null && value !== undefined) {
      compact[key] = value;
    }
  }
  const createdBy = item.created_by;
  if (createdBy && typeof createdBy === 'object' && !Array.isArray(createdBy)) {
    compact.created_by = createdBy.display_name || createdBy.name || createdBy.id;
  }
  const repliedComment = item.replied_comment;
  if (repliedComment && typeof repliedComment === 'object' && !Array.isArray(repliedComment)) {
    compact.replied_comment = {
      id: repliedComment.id,
      content: repliedComment.content,
      is_deleted: repliedComment.is_deleted,
    };
  }
  return compact;
}

function compactCommentResponse(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const values = core.pageValues(payload);
  if (values.length > 0) {
    const result = {
      page_size: payload.page_size,
      page_index: payload.page_index,
      total: payload.total,
      count: values.length,
      values: values.map(compactComment),
    };
    return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== null && v !== undefined));
  }
  return compactComment(payload);
}

// ── Create subcommand ─────────────────────────────────────────────────

function parseCreateArgs(tokens) {
  const args = {
    content: null,
    reply_to: null,
    principal_type: null,
  };
  const stringFlags = {
    '--content': 'content',
    '--reply-to': 'reply_to',
    '--principal-type': 'principal_type',
  };
  const positionals = [];

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      positionals.push(arg);
      continue;
    }
    if (arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS) continue;
    if (arg in stringFlags) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[stringFlags[arg]] = tokens[i + 1];
      i += 1;
      continue;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      const flag = arg.slice(0, eqIndex);
      const value = arg.slice(eqIndex + 1);
      if (flag in stringFlags) {
        args[stringFlags[flag]] = value;
      } else if (flag in shared.BASE_GLOBAL_STRING_FLAGS) {
        // pass through
      } else {
        throw new core.PingCodeError(`Unknown option: ${flag}`);
      }
    } else if (!(arg in shared.BASE_GLOBAL_STRING_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use comment create --help for usage.`);
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value for known global string flags
    }
  }
  return { args, positionals };
}

async function runCreate(client, opts, args, positionals) {
  if (positionals.length === 0) {
    throw new core.PingCodeError('A work item id or identifier is required. Use comment create --help for usage.');
  }
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use comment create --help for usage.`);
  }

  const workItemRef = positionals[0];
  const principalType = args.principal_type || 'work_item';

  if (!COMMENT_PRINCIPAL_TYPES.has(principalType)) {
    throw new core.PingCodeError(`Invalid --principal-type '${principalType}'. Allowed: ${Array.from(COMMENT_PRINCIPAL_TYPES).join(', ')}`);
  }

  if (typeof args.content !== 'string' || !args.content.trim()) {
    throw new core.PingCodeError('--content is required and must be non-empty. Use comment create --help for usage.');
  }

  const body = {
    principal_type: principalType,
    content: args.content,
  };

  if (args.reply_to) {
    body.reply_comment_id = args.reply_to;
  }

  if (isIdentifier(workItemRef)) {
    if (!isWorkItemPrincipal(principalType)) {
      throw new core.PingCodeError(`Identifier refs like ${workItemRef} are only supported for work_item/work_item_deliverable principals; pass a raw id for '${principalType}'.`);
    }
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: { identifier: workItemRef },
        },
        post: {
          method: 'POST',
          path: '/v1/comments',
          json: { ...body, principal_id: '{id}' },
        },
      };
    }

    const resolvedId = await core.resolveWorkItemIdentifier(client, workItemRef);
    body.principal_id = resolvedId;
    return await client.request(
      'POST',
      '/v1/comments',
      null,
      body,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  body.principal_id = workItemRef;
  return await client.request(
    'POST',
    '/v1/comments',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── List subcommand ───────────────────────────────────────────────────

function parseListArgs(tokens) {
  let principalType = null;
  const positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      positionals.push(arg);
      continue;
    }
    if (arg === '--principal-type') {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      principalType = tokens[i + 1];
      i += 1;
      continue;
    }
    if (arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS) continue;
    if (arg in shared.BASE_GLOBAL_STRING_FLAGS) {
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        i += 1;
      }
      continue;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      const flag = arg.slice(0, eqIndex);
      if (flag === '--principal-type') {
        principalType = arg.slice(eqIndex + 1);
      }
      // skip value
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value
    }
  }
  return { positionals, principal_type: principalType || 'work_item' };
}

async function runList(client, opts, positionals, principalType = 'work_item') {
  if (positionals.length === 0) {
    throw new core.PingCodeError('A work item id or identifier is required. Use comment list --help for usage.');
  }
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use comment list --help for usage.`);
  }

  if (!COMMENT_PRINCIPAL_TYPES.has(principalType)) {
    throw new core.PingCodeError(`Invalid --principal-type '${principalType}'. Allowed: ${Array.from(COMMENT_PRINCIPAL_TYPES).join(', ')}`);
  }

  const principalRef = positionals[0];
  const params = { principal_type: principalType };

  if (isIdentifier(principalRef)) {
    if (!isWorkItemPrincipal(principalType)) {
      throw new core.PingCodeError(`Identifier refs like ${principalRef} are only supported for work_item/work_item_deliverable principals; pass a raw id for '${principalType}'.`);
    }
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: { identifier: principalRef },
        },
        get: {
          method: 'GET',
          path: '/v1/comments',
          params: {
            principal_id: '{id}',
            principal_type: principalType,
          },
        },
      };
    }

    const resolvedId = await core.resolveWorkItemIdentifier(client, principalRef);
    params.principal_id = resolvedId;
    return await client.request(
      'GET',
      '/v1/comments',
      params,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  params.principal_id = principalRef;
  return await client.request(
    'GET',
    '/v1/comments',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Get subcommand ────────────────────────────────────────────────────

function parseGetArgs(tokens) {
  let principalType = null;
  const positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      positionals.push(arg);
      continue;
    }
    if (arg === '--principal-type') {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      principalType = tokens[i + 1];
      i += 1;
      continue;
    }
    if (arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS) continue;
    if (arg in shared.BASE_GLOBAL_STRING_FLAGS) {
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        i += 1;
      }
      continue;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      const flag = arg.slice(0, eqIndex);
      if (flag === '--principal-type') {
        principalType = arg.slice(eqIndex + 1);
      }
      // skip value
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value
    }
  }
  return { positionals, principal_type: principalType || 'work_item' };
}

async function runGet(client, opts, positionals, principalType = 'work_item') {
  if (positionals.length < 2) {
    throw new core.PingCodeError('A comment id and work item id/identifier are required. Use comment get --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use comment get --help for usage.`);
  }

  if (!COMMENT_PRINCIPAL_TYPES.has(principalType)) {
    throw new core.PingCodeError(`Invalid --principal-type '${principalType}'. Allowed: ${Array.from(COMMENT_PRINCIPAL_TYPES).join(', ')}`);
  }

  const commentId = positionals[0];
  const principalRef = positionals[1];
  const params = { principal_type: principalType };

  if (isIdentifier(principalRef)) {
    if (!isWorkItemPrincipal(principalType)) {
      throw new core.PingCodeError(`Identifier refs like ${principalRef} are only supported for work_item/work_item_deliverable principals; pass a raw id for '${principalType}'.`);
    }
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: { identifier: principalRef },
        },
        get: {
          method: 'GET',
          path: `/v1/comments/${commentId}`,
          params: {
            principal_id: '{id}',
            principal_type: principalType,
          },
        },
      };
    }

    const resolvedId = await core.resolveWorkItemIdentifier(client, principalRef);
    params.principal_id = resolvedId;
    return await client.request(
      'GET',
      `/v1/comments/${commentId}`,
      params,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  params.principal_id = principalRef;
  return await client.request(
    'GET',
    `/v1/comments/${commentId}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Delete subcommand ─────────────────────────────────────────────────

function parseDeleteArgs(tokens) {
  let principalType = null;
  const positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      positionals.push(arg);
      continue;
    }
    if (arg === '--principal-type') {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      principalType = tokens[i + 1];
      i += 1;
      continue;
    }
    if (arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS) continue;
    if (arg in shared.BASE_GLOBAL_STRING_FLAGS) {
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        i += 1;
      }
      continue;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      const flag = arg.slice(0, eqIndex);
      if (flag === '--principal-type') {
        principalType = arg.slice(eqIndex + 1);
      }
      // skip value
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value
    }
  }
  return { positionals, principal_type: principalType || 'work_item' };
}

async function runDelete(client, opts, positionals, principalType = 'work_item') {
  if (positionals.length < 2) {
    throw new core.PingCodeError('A comment id and work item id/identifier are required. Use comment delete --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use comment delete --help for usage.`);
  }

  if (!COMMENT_PRINCIPAL_TYPES.has(principalType)) {
    throw new core.PingCodeError(`Invalid --principal-type '${principalType}'. Allowed: ${Array.from(COMMENT_PRINCIPAL_TYPES).join(', ')}`);
  }

  const commentId = positionals[0];
  const principalRef = positionals[1];
  const params = { principal_type: principalType };

  if (isIdentifier(principalRef)) {
    if (!isWorkItemPrincipal(principalType)) {
      throw new core.PingCodeError(`Identifier refs like ${principalRef} are only supported for work_item/work_item_deliverable principals; pass a raw id for '${principalType}'.`);
    }
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: { identifier: principalRef },
        },
        delete: {
          method: 'DELETE',
          path: `/v1/comments/${commentId}`,
          params: {
            principal_id: '{id}',
            principal_type: principalType,
          },
        },
      };
    }

    const resolvedId = await core.resolveWorkItemIdentifier(client, principalRef);
    params.principal_id = resolvedId;
    return await client.request(
      'DELETE',
      `/v1/comments/${commentId}`,
      params,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  params.principal_id = principalRef;
  return await client.request(
    'DELETE',
    `/v1/comments/${commentId}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Help ──────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode comment — Manage work-item comments',
    '',
    'Usage: pingcode comment <subcommand> [options]',
    '',
    'Subcommands:',
    '  create <id|identifier>     Create a comment on a work item',
    '    --content TEXT            Comment content (required)',
    '    --reply-to COMMENT_ID     Reply to an existing comment',
    '    --principal-type TYPE     Principal type (default: work_item)',
    '',
    '  list <id|identifier>       List comments on a work item',
    '',
    '  get <comment-id> <id|identifier>',
    '                             Get a single comment',
    '',
    '  delete <comment-id> <id|identifier>',
    '                             Delete a comment',
    '',
    'All subcommands accept --principal-type TYPE to target other principals:',
    '  work_item (default), work_item_deliverable, test_case, test_run, idea, ticket, page.',
    'Identifier refs like SCR-123 resolve only for work_item/work_item_deliverable;',
    'other principals need a raw id.',
    '',
    'Examples:',
    '  # 给工作项添加评论',
    '  pingcode comment create SCR-123 --content "已修复，请验证"',
    '  # 回复某条评论',
    '  pingcode comment create SCR-123 --content 收到 --reply-to COMMENT_ID',
    '  # 列出工作项的全部评论',
    '  pingcode comment list SCR-123 --compact',
    '',
    'Global options:',
    '  --base-url URL              PingCode base URL',
    '  --client-id ID              OAuth client ID',
    '  --client-secret SECRET      OAuth client secret',
    '  --token TOKEN               Bearer token (skip OAuth)',
    '  --user-id ID                Current user ID',
    '  --user-name NAME            Current user name',
    '  --workspace-cache PATH      Workspace cache file path',
    '  --no-workspace-cache        Disable workspace cache',
    '  --no-token-cache            Disable token cache',
    '  --dry-run                   Show API request without executing',
    '  --compact                   Compact output',
    '  --grant-type TYPE           OAuth grant type: client_credentials, authorization_code, or auto (default; uses cached token type)',
    '  --help                      Show this help',
  ].join('\n'));
}

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'create':
      console.log([
        'Usage: pingcode comment create <id|identifier> --content TEXT [options]',
        '',
        'Create a comment on a principal. --principal-type defaults to work_item.',
        '',
        'Options:',
        '  --content TEXT            Comment content (required, non-empty)',
        '  --reply-to COMMENT_ID     Reply to an existing comment',
        '  --principal-type TYPE     Principal type (default: work_item; also work_item_deliverable, test_case, test_run, idea, ticket, page)',
      ].join('\n'));
      break;
    case 'list':
      console.log([
        'Usage: pingcode comment list <id|identifier> [--principal-type TYPE]',
        '',
        'List all comments on a principal. --principal-type defaults to work_item.',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode comment get <comment-id> <id|identifier> [--principal-type TYPE]',
        '',
        'Get a single comment by its id and principal reference. --principal-type defaults to work_item.',
      ].join('\n'));
      break;
    case 'delete':
      console.log([
        'Usage: pingcode comment delete <comment-id> <id|identifier> [--principal-type TYPE]',
        '',
        'Delete a comment by its id and principal reference. --principal-type defaults to work_item.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────

async function run(argv) {
  const tokens = argv || [];

  if (tokens.length === 0 || tokens[0] === '--help' || tokens[0] === '-h') {
    printHelp();
    return;
  }

  const subcommand = tokens[0];
  const remaining = tokens.slice(1);

  if (remaining.includes('--help') || remaining.includes('-h')) {
    printSubcommandHelp(subcommand);
    return;
  }

  const { opts, remaining: subArgs } = shared.parseGlobalOptions(remaining);
  const client = shared.clientFromOpts(opts);

  try {
    let result;
    switch (subcommand) {
      case 'create': {
        const { args, positionals } = parseCreateArgs(subArgs);
        result = await runCreate(client, opts, args, positionals);
        break;
      }
      case 'list': {
        const { positionals, principal_type } = parseListArgs(subArgs);
        result = await runList(client, opts, positionals, principal_type);
        break;
      }
      case 'get': {
        const { positionals, principal_type } = parseGetArgs(subArgs);
        result = await runGet(client, opts, positionals, principal_type);
        break;
      }
      case 'delete': {
        const { positionals, principal_type } = parseDeleteArgs(subArgs);
        result = await runDelete(client, opts, positionals, principal_type);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown comment subcommand: ${subcommand}. Use comment --help for usage.`);
    }

    if (opts.dry_run) {
      core.printJson(result);
    } else if (result !== null && result !== undefined) {
      if (opts.compact) {
        core.printJson(compactCommentResponse(result));
      } else {
        core.printJson(result);
      }
    }
  } catch (exc) {
    throw exc;
  }
}

shared.registerModule('comment', {
  name: 'comment',
  description: 'Manage work-item comments',
  run,
});

module.exports = { run, printHelp };
