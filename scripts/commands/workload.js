'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Constants ──────────────────────────────────────────────────────────

const WORKLOADS_PATH = '/v1/workloads';
const WORKLOAD_TYPES_PATH = '/v1/workload_types';

const WORKLOAD_PRINCIPAL_TYPE_VALUES = ['work_item', 'idea', 'test_case'];

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode workload — Manage PingCode workloads (work hours) and workload types',
    '',
    'Usage: pingcode workload <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [options]              List workloads',
    '  create [options]            Create a workload',
    '  get <workload_id>           Show a workload',
    '  update <workload_id> [options]   Partial update (PATCH) of a workload',
    '  delete <workload_id>        Delete a workload',
    '',
    '  type-list                   List workload types',
    '  type-get <type_id>          Show a workload type',
    '',
    'Examples:',
    '  # 给工作项登记 4.5 小时工时',
    '  pingcode workload create --principal-type work_item --principal-id WORK_ITEM_ID --duration 4.5 --report-at 1583290309',
    '  # 查询工作项的工时记录',
    '  pingcode workload list --principal-type work_item --principal-id WORK_ITEM_ID --compact',
    '  # 列出工时类型',
    '  pingcode workload type-list --compact',
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

const SUBCOMMAND_HELP = {
  'list': [
    'Usage: pingcode workload list [options]',
    '',
    'List workloads.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: work_item, idea, test_case',
    '                             (required when --pilot-id or --principal-id is given)',
    '  --pilot-id ID              Id of the product, project, or test library',
    '  --principal-id ID          Principal id',
    '  --start-at N               Filter by report date range start (Unix timestamp; use with --end-at)',
    '  --end-at N                 Filter by report date range end (Unix timestamp; use with --start-at)',
    '  --report-by-id ID          Filter by reporter user id',
  ].join('\n'),
  'create': [
    'Usage: pingcode workload create [options]',
    '',
    'Create a workload.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: work_item, idea, test_case (required)',
    '  --principal-id ID          Principal id (required)',
    '  --duration N               Duration in hours, 0-24 with at most one decimal (required)',
    '  --report-at N              Report date, 10-digit Unix timestamp (required)',
    '  --type-id ID               Workload type id',
    '  --report-by-id ID          Reporter user id (required for enterprise tokens)',
    '  --recorded-at TEXT         Recorded time; defaults to now',
    '  --description TEXT         Workload description',
    '',
    'Examples:',
    '  pingcode workload create --principal-type work_item --principal-id 564587fe700d43b81b080ab8 --duration 4.5 --report-at 1583290309 --dry-run',
  ].join('\n'),
  'get': [
    'Usage: pingcode workload get <workload_id>',
    '',
    'Show a single workload.',
  ].join('\n'),
  'update': [
    'Usage: pingcode workload update <workload_id> [options]',
    '',
    'Partial update (PATCH) of a workload. At least one option is required.',
    'User tokens can only update workloads recorded by the user.',
    '',
    'Options:',
    '  --type-id ID               Workload type id',
    '  --duration N               Duration in hours, 0-24 with at most one decimal',
    '  --report-at N              Report date, 10-digit Unix timestamp',
    '  --description TEXT         Workload description',
  ].join('\n'),
  'delete': [
    'Usage: pingcode workload delete <workload_id>',
    '',
    'Delete a workload.',
    'User tokens can only delete workloads recorded by the user.',
  ].join('\n'),
  'type-list': [
    'Usage: pingcode workload type-list',
    '',
    'List workload types.',
  ].join('\n'),
  'type-get': [
    'Usage: pingcode workload type-get <type_id>',
    '',
    'Show a single workload type.',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'list':
    case 'create':
    case 'get':
    case 'update':
    case 'delete':
    case 'type-list':
    case 'type-get':
      console.log(SUBCOMMAND_HELP[subcommand]);
      break;
    default:
      printHelp();
  }
}

// ── Argument parsing helpers ───────────────────────────────────────────

function collectArgs(tokens, stringFlags, usageLabel) {
  const args = {};
  for (const key of Object.values(stringFlags)) {
    args[key] = null;
  }
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
      continue;
    }
    if (!(arg in shared.BASE_GLOBAL_STRING_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use ${usageLabel} --help for usage.`);
    }
    if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value for known global string flags
    }
  }
  return { args, positionals };
}

function requireNoPositionals(positionals, usageLabel) {
  if (positionals.length > 0) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[0]}. Use ${usageLabel} --help for usage.`);
  }
}

function requireSingleId(positionals, resourceLabel, usageLabel) {
  if (positionals.length === 0) {
    throw new core.PingCodeError(`${/^[aeiou]/i.test(resourceLabel) ? 'An' : 'A'} ${resourceLabel} id is required. Use ${usageLabel} --help for usage.`);
  }
  requireNoPositionals(positionals.slice(1), usageLabel);
  return positionals[0];
}

function requireString(args, key, flag, usageLabel) {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new core.PingCodeError(`${flag} is required and must be non-empty. Use ${usageLabel} --help for usage.`);
  }
  return value;
}

function requireEnum(value, flag, allowed, usageLabel) {
  if (!allowed.includes(value)) {
    throw new core.PingCodeError(`${flag} must be one of: ${allowed.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  return value;
}

function requireNumber(args, key, flag, usageLabel) {
  if (args[key] === null) {
    throw new core.PingCodeError(`${flag} is required and must be a number. Use ${usageLabel} --help for usage.`);
  }
  return parseNumber(args[key], flag);
}

function parseNumber(value, flag) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new core.PingCodeError(`${flag} must be a number`);
  }
  return num;
}

function requireAtLeastOneField(args, usageLabel) {
  const hasField = Object.values(args).some((value) => value !== null);
  if (!hasField) {
    throw new core.PingCodeError(`At least one field to update is required. Use ${usageLabel} --help for usage.`);
  }
}

// ── Workload subcommands ───────────────────────────────────────────────

const LIST_STRING_FLAGS = {
  '--principal-type': 'principal_type',
  '--pilot-id': 'pilot_id',
  '--principal-id': 'principal_id',
  '--start-at': 'start_at',
  '--end-at': 'end_at',
  '--report-by-id': 'report_by_id',
};

function parseListArgs(tokens) {
  const usageLabel = 'workload list';
  const { args, positionals } = collectArgs(tokens, LIST_STRING_FLAGS, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  if (args.principal_type !== null) {
    requireEnum(args.principal_type, '--principal-type', WORKLOAD_PRINCIPAL_TYPE_VALUES, usageLabel);
  }
  return args;
}

async function runList(client, opts, args) {
  const params = {};
  for (const key of Object.values(LIST_STRING_FLAGS)) {
    if (args[key] !== null) {
      params[key] = args[key];
    }
  }
  return await client.request(
    'GET',
    WORKLOADS_PATH,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCreateArgs(tokens) {
  const usageLabel = 'workload create';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-type': 'principal_type',
    '--principal-id': 'principal_id',
    '--duration': 'duration',
    '--report-at': 'report_at',
    '--type-id': 'type_id',
    '--report-by-id': 'report_by_id',
    '--recorded-at': 'recorded_at',
    '--description': 'description',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return args;
}

async function runCreate(client, opts, args) {
  const usageLabel = 'workload create';
  const body = {
    principal_type: requireEnum(
      requireString(args, 'principal_type', '--principal-type', usageLabel),
      '--principal-type', WORKLOAD_PRINCIPAL_TYPE_VALUES, usageLabel,
    ),
    principal_id: requireString(args, 'principal_id', '--principal-id', usageLabel),
    duration: requireNumber(args, 'duration', '--duration', usageLabel),
    report_at: requireNumber(args, 'report_at', '--report-at', usageLabel),
  };
  if (args.type_id !== null) {
    body.type_id = args.type_id;
  }
  if (args.report_by_id !== null) {
    body.report_by_id = args.report_by_id;
  }
  if (args.recorded_at !== null) {
    body.recorded_at = args.recorded_at;
  }
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'POST',
    WORKLOADS_PATH,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseGetArgs(tokens) {
  const usageLabel = 'workload get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { workload_id: requireSingleId(positionals, 'workload', usageLabel) };
}

async function runGet(client, opts, args) {
  return await client.request(
    'GET',
    `${WORKLOADS_PATH}/${args.workload_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUpdateArgs(tokens) {
  const usageLabel = 'workload update';
  const { args, positionals } = collectArgs(tokens, {
    '--type-id': 'type_id',
    '--duration': 'duration',
    '--report-at': 'report_at',
    '--description': 'description',
  }, usageLabel);
  const workloadId = requireSingleId(positionals, 'workload', usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { workload_id: workloadId, ...args };
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.type_id !== null) {
    body.type_id = args.type_id;
  }
  if (args.duration !== null) {
    body.duration = parseNumber(args.duration, '--duration');
  }
  if (args.report_at !== null) {
    body.report_at = parseNumber(args.report_at, '--report-at');
  }
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'PATCH',
    `${WORKLOADS_PATH}/${args.workload_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeleteArgs(tokens) {
  const usageLabel = 'workload delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { workload_id: requireSingleId(positionals, 'workload', usageLabel) };
}

async function runDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `${WORKLOADS_PATH}/${args.workload_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Workload type subcommands ──────────────────────────────────────────

function parseTypeListArgs(tokens) {
  const usageLabel = 'workload type-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return {};
}

async function runTypeList(client, opts) {
  return await client.request(
    'GET',
    WORKLOAD_TYPES_PATH,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTypeGetArgs(tokens) {
  const usageLabel = 'workload type-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { type_id: requireSingleId(positionals, 'workload type', usageLabel) };
}

async function runTypeGet(client, opts, args) {
  return await client.request(
    'GET',
    `${WORKLOAD_TYPES_PATH}/${args.type_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Main dispatcher ────────────────────────────────────────────────────

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
        const getArgs = parseGetArgs(subArgs);
        result = await runGet(client, opts, getArgs);
        break;
      }
      case 'update': {
        const updateArgs = parseUpdateArgs(subArgs);
        result = await runUpdate(client, opts, updateArgs);
        break;
      }
      case 'delete': {
        const deleteArgs = parseDeleteArgs(subArgs);
        result = await runDelete(client, opts, deleteArgs);
        break;
      }
      case 'type-list': {
        parseTypeListArgs(subArgs);
        result = await runTypeList(client, opts);
        break;
      }
      case 'type-get': {
        const typeGetArgs = parseTypeGetArgs(subArgs);
        result = await runTypeGet(client, opts, typeGetArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown workload subcommand: ${subcommand}. Use workload --help for usage.`);
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

shared.registerModule('workload', {
  name: 'workload',
  description: 'Manage PingCode workloads (work hours) and workload types',
  run,
});

module.exports = { run, printHelp };
