'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode relation — Manage work item relations',
    '',
    'Usage: pingcode relation <subcommand> [options]',
    '',
    'Subcommands:',
    '  add <id|identifier> <target_work_item_id> --relation-type TYPE',
    '                              Relate a work item to a target work item',
    '',
    '  create --principal-type TYPE --principal-id ID',
    '         --target-type TYPE --target-id ID',
    '                              Create a generic cross-resource association',
    '                              (e.g. workitem ↔ idea 需求挂接)',
    '  get <relation_id> <id|identifier>',
    '                              Get one work item relation',
    '',
    '  list <id|identifier> [--relation-type TYPE]',
    '                              List the relations of a work item',
    '',
    '  remove <relation_id> <id|identifier>',
    '                              Remove one work item relation',
    '',
    '  type-list                   List work item relation types',
    '',
    '  type-get <id>               Get one work item relation type',
    '',
    'Examples:',
    '  # 建立关联（relate）',
    '  pingcode relation add SCR-123 TARGET_WORK_ITEM_ID --relation-type relate',
    '  # 通用关联：史诗工作项挂接产品需求（idea）',
    '  pingcode relation create --principal-type workitem --principal-id EPIC_ID --target-type idea --target-id IDEA_ID',
    '  # 查看工作项的全部关联',
    '  pingcode relation list SCR-123 --compact',
    '  # 列出可用的关联类型',
    '  pingcode relation type-list --compact',
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
    case 'add':
      console.log([
        'Usage: pingcode relation add <work_item_id|identifier> <target_work_item_id> --relation-type TYPE',
        '',
        'Relate a work item to a target work item.',
        '',
        'Options:',
        '  --relation-type TYPE      Relation type: mention, clone, cloned_by, duplicate,',
        '                            relate, cause, caused_by, block, blocked_by, dependency,',
        '                            or a custom relation type id',
      ].join('\n'));
      break;
    case 'create':
      console.log([
        'Usage: pingcode relation create --principal-type TYPE --principal-id ID --target-type TYPE --target-id ID',
        '',
        'Create a generic association between two resources (works across domains,',
        'e.g. a pjm work item such as an epic and a ship idea/需求).',
        '',
        'Options:',
        '  --principal-type TYPE     Subject resource type, e.g. workitem, idea, ticket, testrun',
        '  --principal-id ID         Subject resource id',
        '  --target-type TYPE        Target resource type, e.g. workitem, idea, ticket, testrun',
        '  --target-id ID            Target resource id',
        '',
        'Example:',
        '  pingcode relation create --principal-type workitem --principal-id EPIC_ID --target-type idea --target-id IDEA_ID',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode relation get <relation_id> <work_item_id|identifier>',
        '',
        'Get one work item relation.',
      ].join('\n'));
      break;
    case 'list':
      console.log([
        'Usage: pingcode relation list <work_item_id|identifier> [--relation-type TYPE]',
        '',
        'List the relations of a work item.',
        '',
        'Options:',
        '  --relation-type TYPE      Filter by relation type',
      ].join('\n'));
      break;
    case 'remove':
      console.log([
        'Usage: pingcode relation remove <relation_id> <work_item_id|identifier>',
        '',
        'Remove one work item relation.',
      ].join('\n'));
      break;
    case 'type-list':
      console.log([
        'Usage: pingcode relation type-list',
        '',
        'List work item relation types.',
      ].join('\n'));
      break;
    case 'type-get':
      console.log([
        'Usage: pingcode relation type-get <relation_type_id>',
        '',
        'Get one work item relation type.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Shared parsing helpers ─────────────────────────────────────────────

// PingCode identifiers look like: PROJECT_KEY-NUMBER (e.g., SCR-1, TASK-42)
function isIdentifier(arg) {
  return /^[A-Z]{3,6}-\d+$/.test(arg);
}

function requirePositionals(positionals, count, message, subcommand) {
  if (positionals.length < count) {
    throw new core.PingCodeError(`${message} Use relation ${subcommand} --help for usage.`);
  }
  if (positionals.length > count) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[count]}. Use relation ${subcommand} --help for usage.`);
  }
  return positionals;
}

// Parse positional-only argv. Unknown flags are ignored (matches the
// positional parsers in idea.js / workitem.js).
function parsePositionalArgs(tokens) {
  const positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  return positionals;
}

// Parse a work item ref positional plus optional string flags.
function parseRefWithFlags(tokens, stringFlags, subcommand) {
  const args = { work_item_ref: null };
  for (const key of Object.values(stringFlags)) args[key] = null;

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.work_item_ref === null) {
        args.work_item_ref = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use relation ${subcommand} --help for usage.`);
    }
    if (arg in stringFlags) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[stringFlags[arg]] = tokens[i + 1];
      i += 1;
    } else if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const flag = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (flag in stringFlags) {
          args[stringFlags[flag]] = value;
        } else {
          throw new core.PingCodeError(`Unknown option: ${flag}. Use relation ${subcommand} --help for usage.`);
        }
      } else if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        continue;
      } else if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
        i += 1;
        continue;
      } else {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use relation ${subcommand} --help for usage.`);
      }
    }
  }
  return args;
}


// ── Add subcommand ────────────────────────────────────────────────────

function parseAddArgs(tokens) {
  const positionals = [];
  let relationType = null;
  const stringFlags = { '--relation-type': 'relation_type' };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (arg in stringFlags) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      relationType = tokens[i + 1];
      i += 1;
      continue;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      const flag = arg.slice(0, eqIndex);
      const value = arg.slice(eqIndex + 1);
      if (flag in stringFlags) {
        relationType = value;
        continue;
      }
      throw new core.PingCodeError(`Unknown option: ${flag}. Use relation add --help for usage.`);
    }
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
    throw new core.PingCodeError(`Unknown option: ${arg}. Use relation add --help for usage.`);
  }

  requirePositionals(
    positionals,
    2,
    'A work item id or identifier and a target work item id are required.',
    'add',
  );
  if (typeof relationType !== 'string' || !relationType.trim()) {
    throw new core.PingCodeError('--relation-type is required and must be non-empty. Use relation add --help for usage.');
  }
  return {
    work_item_ref: positionals[0],
    target_work_item_id: positionals[1],
    relation_type: relationType,
  };
}

async function runAdd(client, opts, args) {
  const body = {
    target_work_item_id: args.target_work_item_id,
    relation_type: args.relation_type,
  };

  // Sort keys for deterministic dry-run output
  const sortedBody = {};
  for (const k of Object.keys(body).sort()) sortedBody[k] = body[k];

  if (isIdentifier(args.work_item_ref)) {
    const resolutionParams = { identifier: args.work_item_ref };

    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        add: {
          method: 'POST',
          path: '/v1/pjm/work_items/{id}/relations',
          json: sortedBody,
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, args.work_item_ref);
    return await client.request(
      'POST',
      `/v1/pjm/work_items/${workItemId}/relations`,
      null,
      body,
      { dry_run: false, use_workspace_cache: false },
    );
  }

  return await client.request(
    'POST',
    `/v1/pjm/work_items/${args.work_item_ref}/relations`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Create subcommand (generic cross-resource association) ────────────

const CREATE_FLAGS = {
  '--principal-type': 'principal_type',
  '--principal-id': 'principal_id',
  '--target-type': 'target_type',
  '--target-id': 'target_id',
};

function parseCreateArgs(tokens) {
  const args = {
    principal_type: null,
    principal_id: null,
    target_type: null,
    target_id: null,
  };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      throw new core.PingCodeError(`Unexpected positional argument: ${arg}. relation create uses flag options only. Use relation create --help for usage.`);
    }
    if (arg in CREATE_FLAGS) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[CREATE_FLAGS[arg]] = tokens[i + 1];
      i += 1;
      continue;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      const flag = arg.slice(0, eqIndex);
      const value = arg.slice(eqIndex + 1);
      if (flag in CREATE_FLAGS) {
        args[CREATE_FLAGS[flag]] = value;
        continue;
      }
      throw new core.PingCodeError(`Unknown option: ${flag}. Use relation create --help for usage.`);
    }
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
    throw new core.PingCodeError(`Unknown option: ${arg}. Use relation create --help for usage.`);
  }

  for (const key of Object.keys(args)) {
    if (typeof args[key] !== 'string' || !args[key].trim()) {
      throw new core.PingCodeError(
        `--${key.replace(/_/g, '-')} is required and must be non-empty. Use relation create --help for usage.`,
      );
    }
  }
  return args;
}

async function runCreate(client, opts, args) {
  const body = {
    principal_type: args.principal_type,
    principal_id: args.principal_id,
    target_type: args.target_type,
    target_id: args.target_id,
  };

  // Sort keys for deterministic dry-run output
  const sortedBody = {};
  for (const k of Object.keys(body).sort()) sortedBody[k] = body[k];

  return await client.request(
    'POST',
    '/v1/relations',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Get subcommand ────────────────────────────────────────────────────

async function runGet(client, opts, args) {
  const [relationId, workItemRef] = requirePositionals(
    args,
    2,
    'A relation id and a work item id or identifier are required.',
    'get',
  );
  const subPath = `/relations/${relationId}`;

  if (isIdentifier(workItemRef)) {
    const resolutionParams = { identifier: workItemRef };

    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        get: {
          method: 'GET',
          path: `/v1/pjm/work_items/{id}${subPath}`,
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, workItemRef);
    return await client.request(
      'GET',
      `/v1/pjm/work_items/${workItemId}${subPath}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/pjm/work_items/${workItemRef}${subPath}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── List subcommand ───────────────────────────────────────────────────

async function runList(client, opts, args) {
  if (!args.work_item_ref) {
    throw new core.PingCodeError('A work item id or identifier is required. Use relation list --help for usage.');
  }
  const params = {};
  if (args.relation_type) {
    params.relation_type = args.relation_type;
  }

  if (isIdentifier(args.work_item_ref)) {
    const resolutionParams = { identifier: args.work_item_ref };

    if (opts.dry_run) {
      const listRequest = {
        method: 'GET',
        path: '/v1/pjm/work_items/{id}/relations',
      };
      if (args.relation_type) listRequest.params = params;
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        list: listRequest,
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, args.work_item_ref);
    return await client.request(
      'GET',
      `/v1/pjm/work_items/${workItemId}/relations`,
      params,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/pjm/work_items/${args.work_item_ref}/relations`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Remove subcommand ─────────────────────────────────────────────────

async function runRemove(client, opts, args) {
  const [relationId, workItemRef] = requirePositionals(
    args,
    2,
    'A relation id and a work item id or identifier are required.',
    'remove',
  );
  const subPath = `/relations/${relationId}`;

  if (isIdentifier(workItemRef)) {
    const resolutionParams = { identifier: workItemRef };

    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        remove: {
          method: 'DELETE',
          path: `/v1/pjm/work_items/{id}${subPath}`,
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, workItemRef);
    return await client.request(
      'DELETE',
      `/v1/pjm/work_items/${workItemId}${subPath}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: false },
    );
  }

  return await client.request(
    'DELETE',
    `/v1/pjm/work_items/${workItemRef}${subPath}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Type-list subcommand ──────────────────────────────────────────────

async function runTypeList(client, opts) {
  return await client.request(
    'GET',
    '/v1/pjm/work_item/relation_types',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Type-get subcommand ───────────────────────────────────────────────

async function runTypeGet(client, opts, args) {
  if (!args.relation_type_id) {
    throw new core.PingCodeError('A relation type id is required. Use relation type-get --help for usage.');
  }

  return await client.request(
    'GET',
    `/v1/pjm/work_item_relation_types/${args.relation_type_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Main dispatcher ───────────────────────────────────────────────────────

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
      case 'add': {
        const addArgs = parseAddArgs(subArgs);
        result = await runAdd(client, opts, addArgs);
        break;
      }
      case 'create': {
        const createArgs = parseCreateArgs(subArgs);
        result = await runCreate(client, opts, createArgs);
        break;
      }
      case 'get': {
        const positionals = parsePositionalArgs(subArgs);
        result = await runGet(client, opts, positionals);
        break;
      }
      case 'list': {
        const listArgs = parseRefWithFlags(subArgs, { '--relation-type': 'relation_type' }, 'list');
        result = await runList(client, opts, listArgs);
        break;
      }
      case 'remove': {
        const positionals = parsePositionalArgs(subArgs);
        result = await runRemove(client, opts, positionals);
        break;
      }
      case 'type-list': {
        result = await runTypeList(client, opts);
        break;
      }
      case 'type-get': {
        const positionals = parsePositionalArgs(subArgs);
        result = await runTypeGet(client, opts, { relation_type_id: positionals[0] || null });
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown relation subcommand: ${subcommand}. Use relation --help for usage.`);
    }

    if (opts.dry_run) {
      core.printJson(result);
    } else if (result !== null && result !== undefined) {
      if (opts.compact) {
        core.printJson(core.compactResponse(result));
      } else {
        core.printJson(result);
      }
    }
  } catch (exc) {
    throw exc;
  }
}

shared.registerModule('relation', {
  name: 'relation',
  description: 'Manage PingCode work item relations',
  run,
});

module.exports = { run, printHelp };
