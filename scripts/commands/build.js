'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Constants ──────────────────────────────────────────────────────────

const BUILDS_PATH = '/v1/build/builds';

const PROVIDER_VALUES = ['bamboo', 'bitbucket', 'jenkins', 'other'];
const BUILD_STATUS_VALUES = ['success', 'failure'];

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode build — Manage PingCode build records',
    '',
    'Usage: pingcode build <subcommand> [options]',
    '',
    'Subcommands:',
    '  list                        List build records',
    '  create [options]            Create a build record',
    '  get <build_id>              Show a build record',
    '  update <build_id> [options] Full update (PUT) of a build record',
    '  patch <build_id> [options]  Partial update (PATCH) of a build record',
    '  delete <build_id>           Delete a build record',
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
    'Usage: pingcode build list',
    '',
    'List build records.',
  ].join('\n'),
  'create': [
    'Usage: pingcode build create [options]',
    '',
    'Create a build record.',
    '',
    'Options:',
    '  --name TEXT               Build name (required)',
    '  --identifier TEXT         Build number (required)',
    '  --provider NAME           Build tool: bamboo, bitbucket, jenkins, other (required)',
    '  --status STATUS           Build status: success, failure (required)',
    '  --start-at N              Build start time, Unix timestamp (required)',
    '  --end-at N                Build end time, Unix timestamp (required)',
    '  --duration N              Build duration in seconds (required)',
    '  --job-url URL             Build job URL; omitted from PingCode if empty',
    '  --result-overview TEXT    Build result overview',
    '  --result-url URL          Build result URL; omitted from PingCode if empty',
    '  --work-item-identifiers JSON   JSON array of work item identifiers, e.g. ["PLM-001"]',
    '',
    'Examples:',
    '  pingcode build create --name unit-test --identifier 131 --provider jenkins --status success --start-at 1583290309 --end-at 1583290347 --duration 38 --dry-run',
  ].join('\n'),
  'get': [
    'Usage: pingcode build get <build_id>',
    '',
    'Show a single build record.',
  ].join('\n'),
  'update': [
    'Usage: pingcode build update <build_id> [options]',
    '',
    'Full update (PUT) of a build record.',
    '',
    'Options:',
    '  --name TEXT               Build name (required)',
    '  --identifier TEXT         Build number (required)',
    '  --provider NAME           Build tool: bamboo, bitbucket, jenkins, other (required)',
    '  --status STATUS           Build status: success, failure (required)',
    '  --start-at N              Build start time, Unix timestamp (required)',
    '  --end-at N                Build end time, Unix timestamp (required)',
    '  --duration N              Build duration in seconds (required)',
    '  --job-url URL             Build job URL; omitted from PingCode if empty',
    '  --result-overview TEXT    Build result overview',
    '  --result-url URL          Build result URL; omitted from PingCode if empty',
    '  --work-item-identifiers JSON   JSON array of work item identifiers, e.g. ["PLM-001"]',
  ].join('\n'),
  'patch': [
    'Usage: pingcode build patch <build_id> [options]',
    '',
    'Partial update (PATCH) of a build record. At least one option is required.',
    '',
    'Options:',
    '  --name TEXT               Build name',
    '  --identifier TEXT         Build number',
    '  --provider NAME           Build tool: bamboo, bitbucket, jenkins, other',
    '  --status STATUS           Build status: success, failure',
    '  --start-at N              Build start time, Unix timestamp',
    '  --end-at N                Build end time, Unix timestamp',
    '  --duration N              Build duration in seconds',
    '  --job-url URL             Build job URL',
    '  --result-overview TEXT    Build result overview',
    '  --result-url URL          Build result URL',
    '  --work-item-identifiers JSON   JSON array of work item identifiers, e.g. ["PLM-001"]',
  ].join('\n'),
  'delete': [
    'Usage: pingcode build delete <build_id>',
    '',
    'Delete a build record.',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'list':
    case 'create':
    case 'get':
    case 'update':
    case 'patch':
    case 'delete':
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

function parseJsonArray(raw, label) {
  if (!raw) {
    return null;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (exc) {
    throw new core.PingCodeError(`${label} must be valid JSON: ${exc.message}`);
  }
  if (!Array.isArray(data)) {
    throw new core.PingCodeError(`${label} must be a JSON array`);
  }
  return data;
}

function requireAtLeastOneField(args, usageLabel) {
  const hasField = Object.values(args).some((value) => value !== null);
  if (!hasField) {
    throw new core.PingCodeError(`At least one field to update is required. Use ${usageLabel} --help for usage.`);
  }
}

// ── Build subcommands ──────────────────────────────────────────────────

function parseListArgs(tokens) {
  const usageLabel = 'build list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return {};
}

async function runList(client, opts) {
  return await client.request(
    'GET',
    BUILDS_PATH,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

const BUILD_STRING_FLAGS = {
  '--name': 'name',
  '--identifier': 'identifier',
  '--provider': 'provider',
  '--status': 'status',
  '--start-at': 'start_at',
  '--end-at': 'end_at',
  '--duration': 'duration',
  '--job-url': 'job_url',
  '--result-overview': 'result_overview',
  '--result-url': 'result_url',
  '--work-item-identifiers': 'work_item_identifiers',
};

function buildBuildPayload(args, usageLabel) {
  const body = {
    name: requireString(args, 'name', '--name', usageLabel),
    identifier: requireString(args, 'identifier', '--identifier', usageLabel),
    provider: requireEnum(
      requireString(args, 'provider', '--provider', usageLabel),
      '--provider', PROVIDER_VALUES, usageLabel,
    ),
    status: requireEnum(
      requireString(args, 'status', '--status', usageLabel),
      '--status', BUILD_STATUS_VALUES, usageLabel,
    ),
    start_at: requireNumber(args, 'start_at', '--start-at', usageLabel),
    end_at: requireNumber(args, 'end_at', '--end-at', usageLabel),
    duration: requireNumber(args, 'duration', '--duration', usageLabel),
  };
  if (args.job_url !== null) {
    body.job_url = args.job_url;
  }
  if (args.result_overview !== null) {
    body.result_overview = args.result_overview;
  }
  if (args.result_url !== null) {
    body.result_url = args.result_url;
  }
  const workItemIdentifiers = parseJsonArray(args.work_item_identifiers, '--work-item-identifiers');
  if (workItemIdentifiers !== null) {
    body.work_item_identifiers = workItemIdentifiers;
  }
  return body;
}

function parseCreateArgs(tokens) {
  const usageLabel = 'build create';
  const { args, positionals } = collectArgs(tokens, BUILD_STRING_FLAGS, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return args;
}

async function runCreate(client, opts, args) {
  return await client.request(
    'POST',
    BUILDS_PATH,
    null,
    buildBuildPayload(args, 'build create'),
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseGetArgs(tokens) {
  const usageLabel = 'build get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { build_id: requireSingleId(positionals, 'build', usageLabel) };
}

async function runGet(client, opts, args) {
  return await client.request(
    'GET',
    `${BUILDS_PATH}/${args.build_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUpdateArgs(tokens) {
  const usageLabel = 'build update';
  const { args, positionals } = collectArgs(tokens, BUILD_STRING_FLAGS, usageLabel);
  const buildId = requireSingleId(positionals, 'build', usageLabel);
  return { build_id: buildId, ...args };
}

async function runUpdate(client, opts, args) {
  const body = buildBuildPayload(args, 'build update');
  return await client.request(
    'PUT',
    `${BUILDS_PATH}/${args.build_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePatchArgs(tokens) {
  const usageLabel = 'build patch';
  const { args, positionals } = collectArgs(tokens, BUILD_STRING_FLAGS, usageLabel);
  const buildId = requireSingleId(positionals, 'build', usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { build_id: buildId, ...args };
}

async function runPatch(client, opts, args) {
  const body = {};
  if (args.name !== null) {
    body.name = args.name;
  }
  if (args.identifier !== null) {
    body.identifier = args.identifier;
  }
  if (args.provider !== null) {
    body.provider = requireEnum(args.provider, '--provider', PROVIDER_VALUES, 'build patch');
  }
  if (args.status !== null) {
    body.status = requireEnum(args.status, '--status', BUILD_STATUS_VALUES, 'build patch');
  }
  if (args.start_at !== null) {
    body.start_at = parseNumber(args.start_at, '--start-at');
  }
  if (args.end_at !== null) {
    body.end_at = parseNumber(args.end_at, '--end-at');
  }
  if (args.duration !== null) {
    body.duration = parseNumber(args.duration, '--duration');
  }
  if (args.job_url !== null) {
    body.job_url = args.job_url;
  }
  if (args.result_overview !== null) {
    body.result_overview = args.result_overview;
  }
  if (args.result_url !== null) {
    body.result_url = args.result_url;
  }
  const workItemIdentifiers = parseJsonArray(args.work_item_identifiers, '--work-item-identifiers');
  if (workItemIdentifiers !== null) {
    body.work_item_identifiers = workItemIdentifiers;
  }
  return await client.request(
    'PATCH',
    `${BUILDS_PATH}/${args.build_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeleteArgs(tokens) {
  const usageLabel = 'build delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { build_id: requireSingleId(positionals, 'build', usageLabel) };
}

async function runDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `${BUILDS_PATH}/${args.build_id}`,
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
        parseListArgs(subArgs);
        result = await runList(client, opts);
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
      case 'patch': {
        const patchArgs = parsePatchArgs(subArgs);
        result = await runPatch(client, opts, patchArgs);
        break;
      }
      case 'delete': {
        const deleteArgs = parseDeleteArgs(subArgs);
        result = await runDelete(client, opts, deleteArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown build subcommand: ${subcommand}. Use build --help for usage.`);
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

shared.registerModule('build', {
  name: 'build',
  description: 'Manage PingCode build records',
  run,
});

module.exports = { run, printHelp };
