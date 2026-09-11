'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode deliverable — Manage work item deliverable targets',
    '',
    'Usage: pingcode deliverable <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [--project-id ID] [--work-item-id ID]',
    '                              List work item deliverable targets',
    '',
    '  create --work-item-id ID --name NAME [--content-type TYPE] [--content JSON]',
    '                              Create a work item deliverable target',
    '',
    '  get <id>                    Get one work item deliverable target',
    '',
    '  update <id> [--work-item-id ID] [--name NAME] [--content-type TYPE] [--content JSON]',
    '                              Partially update a work item deliverable target',
    '',
    '  delete <id>                 Delete a work item deliverable target',
    '',
    'Examples:',
    '  # 列出工作项的交付目标',
    '  pingcode deliverable list --work-item-id WORK_ITEM_ID --compact',
    '  # 新建一个链接类型的交付目标',
    '  pingcode deliverable create --work-item-id WORK_ITEM_ID --name 设计文档 --content-type link --content \'{"name":"设计文档","href":"https://example.com/doc"}\'',
    '  # 查看交付目标',
    '  pingcode deliverable get DELIVERABLE_TARGET_ID --compact',
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
    case 'list':
      console.log([
        'Usage: pingcode deliverable list [--project-id ID] [--work-item-id ID]',
        '',
        'List work item deliverable targets.',
        '',
        'Options:',
        '  --project-id ID           Filter by project id (waterfall or hybrid projects)',
        '  --work-item-id ID         Filter by work item id',
      ].join('\n'));
      break;
    case 'create':
      console.log([
        'Usage: pingcode deliverable create --work-item-id ID --name NAME [--content-type TYPE] [--content JSON]',
        '',
        'Create a work item deliverable target. The work item must belong to a',
        'waterfall or hybrid project.',
        '',
        'Options:',
        '  --work-item-id ID         Work item id (required)',
        '  --name NAME               Deliverable target name (required)',
        '  --content-type TYPE       Deliverable content type; only "link" is supported',
        '  --content JSON            Deliverable content as a JSON object, e.g.',
        '                            \'{"name":"PingCode","href":"https://www.pingcode.com"}\'',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode deliverable get <deliverable_target_id>',
        '',
        'Get one work item deliverable target.',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode deliverable update <deliverable_target_id> [--work-item-id ID] [--name NAME] [--content-type TYPE] [--content JSON]',
        '',
        'Partially update a work item deliverable target.',
        '',
        'Options:',
        '  --work-item-id ID         Move the target to another work item',
        '  --name NAME               New deliverable target name',
        '  --content-type TYPE       Deliverable content type; only "link" is supported',
        '  --content JSON            Deliverable content as a JSON object',
      ].join('\n'));
      break;
    case 'delete':
      console.log([
        'Usage: pingcode deliverable delete <deliverable_target_id>',
        '',
        'Delete a work item deliverable target.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Shared parsing helpers ─────────────────────────────────────────────

const CONTENT_FLAGS = {
  '--work-item-id': 'work_item_id',
  '--name': 'name',
  '--content-type': 'content_type',
  '--content': 'content',
};

function parseFieldArgs(tokens, subcommand, allowedFlags) {
  const args = { target: null };
  for (const key of Object.values(allowedFlags)) args[key] = null;

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.target === null) {
        args.target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use deliverable ${subcommand} --help for usage.`);
    }
    if (arg in allowedFlags) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[allowedFlags[arg]] = tokens[i + 1];
      i += 1;
    } else if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const flag = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (flag in allowedFlags) {
          args[allowedFlags[flag]] = value;
        } else {
          throw new core.PingCodeError(`Unknown option: ${flag}. Use deliverable ${subcommand} --help for usage.`);
        }
      } else if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        continue;
      } else if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
        i += 1;
        continue;
      } else {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use deliverable ${subcommand} --help for usage.`);
      }
    }
  }
  return args;
}

function requireDeliverableId(value, subcommand) {
  if (!value) {
    throw new core.PingCodeError(`A deliverable target id is required. Use deliverable ${subcommand} --help for usage.`);
  }
  return value;
}

// ── List subcommand ───────────────────────────────────────────────────

function parseListArgs(tokens) {
  return parseFieldArgs(tokens, 'list', {
    '--project-id': 'project_id',
    '--work-item-id': 'work_item_id',
  });
}

async function runList(client, opts, args) {
  const params = {};
  if (args.project_id) {
    params.project_id = args.project_id;
  }
  if (args.work_item_id) {
    params.work_item_id = args.work_item_id;
  }

  return await client.request(
    'GET',
    '/v1/pjm/deliverables',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Create subcommand ─────────────────────────────────────────────────

function parseCreateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'create', CONTENT_FLAGS);
  if (typeof args.work_item_id !== 'string' || !args.work_item_id.trim()) {
    throw new core.PingCodeError('--work-item-id is required and must be a raw id. Use deliverable create --help for usage.');
  }
  if (typeof args.name !== 'string' || !args.name.trim()) {
    throw new core.PingCodeError('--name is required and must be non-empty. Use deliverable create --help for usage.');
  }
  return args;
}

async function runCreate(client, opts, args) {
  const body = {};
  if (args.work_item_id) body.work_item_id = args.work_item_id;
  if (args.name) body.name = args.name;
  if (args.content_type) body.content_type = args.content_type;
  if (args.content) body.content = core.parseJsonObject(args.content, '--content');

  // Sort keys for deterministic dry-run output
  const sortedBody = {};
  for (const k of Object.keys(body).sort()) sortedBody[k] = body[k];

  return await client.request(
    'POST',
    '/v1/pjm/deliverables',
    null,
    sortedBody,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Get subcommand ────────────────────────────────────────────────────

async function runGet(client, opts, args) {
  const deliverableId = requireDeliverableId(args.target, 'get');

  return await client.request(
    'GET',
    `/v1/pjm/deliverables/${deliverableId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Update subcommand ─────────────────────────────────────────────────

function parseUpdateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'update', CONTENT_FLAGS);
  if (!args.target) {
    throw new core.PingCodeError('A deliverable target id is required. Use deliverable update --help for usage.');
  }
  const hasUpdateField = args.work_item_id !== null
    || args.name !== null
    || args.content_type !== null
    || args.content !== null;
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use deliverable update --help for usage.');
  }
  return args;
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.work_item_id !== null) body.work_item_id = args.work_item_id;
  if (args.name !== null) body.name = args.name;
  if (args.content_type !== null) body.content_type = args.content_type;
  if (args.content !== null) body.content = core.parseJsonObject(args.content, '--content');

  // Sort keys for deterministic dry-run output
  const sortedBody = {};
  for (const k of Object.keys(body).sort()) sortedBody[k] = body[k];

  return await client.request(
    'PATCH',
    `/v1/pjm/deliverables/${args.target}`,
    null,
    sortedBody,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Delete subcommand ─────────────────────────────────────────────────

async function runDelete(client, opts, args) {
  const deliverableId = requireDeliverableId(args.target, 'delete');

  return await client.request(
    'DELETE',
    `/v1/pjm/deliverables/${deliverableId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: false },
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
      case 'list': {
        const listArgs = parseListArgs(subArgs);
        result = await runList(client, opts, listArgs);
        break;
      }
      case 'create': {
        const createArgs = parseCreateArgs(subArgs);
        result = await runCreate(client, opts, createArgs);
        break;
      }
      case 'get': {
        const getArgs = parseFieldArgs(subArgs, 'get', {});
        result = await runGet(client, opts, getArgs);
        break;
      }
      case 'update': {
        const updateArgs = parseUpdateArgs(subArgs);
        result = await runUpdate(client, opts, updateArgs);
        break;
      }
      case 'delete': {
        const deleteArgs = parseFieldArgs(subArgs, 'delete', {});
        result = await runDelete(client, opts, deleteArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown deliverable subcommand: ${subcommand}. Use deliverable --help for usage.`);
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

shared.registerModule('deliverable', {
  name: 'deliverable',
  description: 'Manage PingCode work item deliverable targets',
  run,
});

module.exports = { run, printHelp };
