'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Constants ──────────────────────────────────────────────────────────

const ENVIRONMENTS_PATH = '/v1/release/environments';
const DEPLOYS_PATH = '/v1/release/deploys';

const DEPLOY_STATUS_VALUES = ['not_deployed', 'deployed'];

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode release — Manage PingCode deployment environments and deploys',
    '',
    'Usage: pingcode release <subcommand> [options]',
    '',
    'Subcommands:',
    '  env-list --name NAME                      List environments (filter by name)',
    '  env-create [options]                      Create an environment',
    '  env-get <env_id>                          Show an environment',
    '  env-update <env_id> [options]             Full update (PUT) of an environment',
    '  env-patch <env_id> [options]              Partial update (PATCH) of an environment',
    '  env-delete <env_id>                       Delete an environment',
    '',
    '  deploy-list [options]                     List deploys',
    '  deploy-create [options]                   Create a deploy',
    '  deploy-get <deploy_id>                    Show a deploy',
    '  deploy-update <deploy_id> [options]       Full update (PUT) of a deploy',
    '  deploy-patch <deploy_id> [options]        Partial update (PATCH) of a deploy',
    '  deploy-delete <deploy_id>                 Delete a deploy',
    '',
    'Examples:',
    '  # 按名称查部署环境',
    '  pingcode release env-list --name Production --compact',
    '  # 新建部署环境',
    '  pingcode release env-create --name Staging',
    '  # 登记一次部署',
    '  pingcode release deploy-create --status deployed --env-id ENV_ID --release-name 1.1.0 --start-at 1583143467 --end-at 1583143667 --duration 200',
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
  'env-list': [
    'Usage: pingcode release env-list --name NAME',
    '',
    'List environments, filtered by name.',
    '',
    'Options:',
    '  --name TEXT               Environment name to filter by (required)',
  ].join('\n'),
  'env-create': [
    'Usage: pingcode release env-create [options]',
    '',
    'Create an environment.',
    '',
    'Options:',
    '  --name TEXT               Environment name, unique within the team (required)',
    '  --html-url URL            Environment URL; omitted from PingCode if empty',
    '',
    'Examples:',
    '  pingcode release env-create --name Production --html-url https://env.example.com --dry-run',
  ].join('\n'),
  'env-get': [
    'Usage: pingcode release env-get <env_id>',
    '',
    'Show a single environment.',
  ].join('\n'),
  'env-update': [
    'Usage: pingcode release env-update <env_id> [options]',
    '',
    'Full update (PUT) of an environment.',
    '',
    'Options:',
    '  --name TEXT               Environment name, unique within the team (required)',
    '  --html-url URL            Environment URL; omitted from PingCode if empty',
  ].join('\n'),
  'env-patch': [
    'Usage: pingcode release env-patch <env_id> [options]',
    '',
    'Partial update (PATCH) of an environment. At least one option is required.',
    '',
    'Options:',
    '  --name TEXT               New environment name, unique within the team',
    '  --html-url URL            New environment URL',
  ].join('\n'),
  'env-delete': [
    'Usage: pingcode release env-delete <env_id>',
    '',
    'Delete an environment. Associated deploys must be deleted first.',
  ].join('\n'),
  'deploy-list': [
    'Usage: pingcode release deploy-list [options]',
    '',
    'List deploys.',
    '',
    'Options:',
    '  --env-id ID               Filter by environment id',
  ].join('\n'),
  'deploy-create': [
    'Usage: pingcode release deploy-create [options]',
    '',
    'Create a deploy.',
    '',
    'Options:',
    '  --status STATUS           Deploy status: not_deployed, deployed (required)',
    '  --env-id ID               Environment id (required)',
    '  --release-name TEXT       Release name (required)',
    '  --release-url URL         Release URL; omitted from PingCode if empty',
    '  --start-at N              Deploy start time, Unix timestamp (required)',
    '  --end-at N                Deploy end time, Unix timestamp (required)',
    '  --duration N              Deploy duration in seconds (required)',
    '  --work-item-identifiers JSON   JSON array of work item identifiers, e.g. ["PLM-001"]',
    '',
    'Examples:',
    '  pingcode release deploy-create --status deployed --env-id 564587fe700d43b81b080123 --release-name 1.1.0 --start-at 1583143467 --end-at 1583143667 --duration 200 --dry-run',
  ].join('\n'),
  'deploy-get': [
    'Usage: pingcode release deploy-get <deploy_id>',
    '',
    'Show a single deploy.',
  ].join('\n'),
  'deploy-update': [
    'Usage: pingcode release deploy-update <deploy_id> [options]',
    '',
    'Full update (PUT) of a deploy.',
    '',
    'Options:',
    '  --status STATUS           Deploy status: not_deployed, deployed (required)',
    '  --env-id ID               Environment id (required)',
    '  --release-name TEXT       Release name (required)',
    '  --release-url URL         Release URL; omitted from PingCode if empty',
    '  --start-at N              Deploy start time, Unix timestamp (required)',
    '  --end-at N                Deploy end time, Unix timestamp (required)',
    '  --duration N              Deploy duration in seconds (required)',
    '  --work-item-identifiers JSON   JSON array of work item identifiers, e.g. ["PLM-001"]',
  ].join('\n'),
  'deploy-patch': [
    'Usage: pingcode release deploy-patch <deploy_id> [options]',
    '',
    'Partial update (PATCH) of a deploy. At least one option is required.',
    '',
    'Options:',
    '  --status STATUS           Deploy status: not_deployed, deployed',
    '  --env-id ID               Environment id',
    '  --release-name TEXT       Release name',
    '  --release-url URL         Release URL',
    '  --start-at N              Deploy start time, Unix timestamp',
    '  --end-at N                Deploy end time, Unix timestamp',
    '  --duration N              Deploy duration in seconds',
    '  --work-item-identifiers JSON   JSON array of work item identifiers, e.g. ["PLM-001"]',
  ].join('\n'),
  'deploy-delete': [
    'Usage: pingcode release deploy-delete <deploy_id>',
    '',
    'Delete a deploy.',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'env-list':
    case 'env-create':
    case 'env-get':
    case 'env-update':
    case 'env-patch':
    case 'env-delete':
    case 'deploy-list':
    case 'deploy-create':
    case 'deploy-get':
    case 'deploy-update':
    case 'deploy-patch':
    case 'deploy-delete':
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

// ── Environment subcommands ────────────────────────────────────────────

function parseEnvListArgs(tokens) {
  const usageLabel = 'release env-list';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  requireString(args, 'name', '--name', usageLabel);
  return args;
}

async function runEnvList(client, opts, args) {
  return await client.request(
    'GET',
    ENVIRONMENTS_PATH,
    { name: args.name },
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEnvCreateArgs(tokens) {
  const usageLabel = 'release env-create';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--html-url': 'html_url',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return args;
}

function buildEnvPayload(args, usageLabel) {
  const body = { name: requireString(args, 'name', '--name', usageLabel) };
  if (args.html_url !== null) {
    body.html_url = args.html_url;
  }
  return body;
}

async function runEnvCreate(client, opts, args) {
  return await client.request(
    'POST',
    ENVIRONMENTS_PATH,
    null,
    buildEnvPayload(args, 'release env-create'),
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEnvGetArgs(tokens) {
  const usageLabel = 'release env-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { env_id: requireSingleId(positionals, 'environment', usageLabel) };
}

async function runEnvGet(client, opts, args) {
  return await client.request(
    'GET',
    `${ENVIRONMENTS_PATH}/${args.env_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEnvUpdateArgs(tokens) {
  const usageLabel = 'release env-update';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--html-url': 'html_url',
  }, usageLabel);
  const envId = requireSingleId(positionals, 'environment', usageLabel);
  return { env_id: envId, ...args };
}

async function runEnvUpdate(client, opts, args) {
  const body = buildEnvPayload(args, 'release env-update');
  return await client.request(
    'PUT',
    `${ENVIRONMENTS_PATH}/${args.env_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEnvPatchArgs(tokens) {
  const usageLabel = 'release env-patch';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--html-url': 'html_url',
  }, usageLabel);
  const envId = requireSingleId(positionals, 'environment', usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { env_id: envId, ...args };
}

async function runEnvPatch(client, opts, args) {
  const body = {};
  if (args.name !== null) {
    body.name = args.name;
  }
  if (args.html_url !== null) {
    body.html_url = args.html_url;
  }
  return await client.request(
    'PATCH',
    `${ENVIRONMENTS_PATH}/${args.env_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEnvDeleteArgs(tokens) {
  const usageLabel = 'release env-delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { env_id: requireSingleId(positionals, 'environment', usageLabel) };
}

async function runEnvDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `${ENVIRONMENTS_PATH}/${args.env_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Deploy subcommands ─────────────────────────────────────────────────

function parseDeployListArgs(tokens) {
  const usageLabel = 'release deploy-list';
  const { args, positionals } = collectArgs(tokens, {
    '--env-id': 'env_id',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return args;
}

async function runDeployList(client, opts, args) {
  const params = {};
  if (args.env_id !== null) {
    params.env_id = args.env_id;
  }
  return await client.request(
    'GET',
    DEPLOYS_PATH,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

const DEPLOY_STRING_FLAGS = {
  '--status': 'status',
  '--env-id': 'env_id',
  '--release-name': 'release_name',
  '--release-url': 'release_url',
  '--start-at': 'start_at',
  '--end-at': 'end_at',
  '--duration': 'duration',
  '--work-item-identifiers': 'work_item_identifiers',
};

function buildDeployPayload(args, usageLabel) {
  const body = {
    status: requireEnum(
      requireString(args, 'status', '--status', usageLabel),
      '--status', DEPLOY_STATUS_VALUES, usageLabel,
    ),
    env_id: requireString(args, 'env_id', '--env-id', usageLabel),
    release_name: requireString(args, 'release_name', '--release-name', usageLabel),
    start_at: requireNumber(args, 'start_at', '--start-at', usageLabel),
    end_at: requireNumber(args, 'end_at', '--end-at', usageLabel),
    duration: requireNumber(args, 'duration', '--duration', usageLabel),
  };
  if (args.release_url !== null) {
    body.release_url = args.release_url;
  }
  const workItemIdentifiers = parseJsonArray(args.work_item_identifiers, '--work-item-identifiers');
  if (workItemIdentifiers !== null) {
    body.work_item_identifiers = workItemIdentifiers;
  }
  return body;
}

function parseDeployCreateArgs(tokens) {
  const usageLabel = 'release deploy-create';
  const { args, positionals } = collectArgs(tokens, DEPLOY_STRING_FLAGS, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return args;
}

async function runDeployCreate(client, opts, args) {
  return await client.request(
    'POST',
    DEPLOYS_PATH,
    null,
    buildDeployPayload(args, 'release deploy-create'),
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeployGetArgs(tokens) {
  const usageLabel = 'release deploy-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { deploy_id: requireSingleId(positionals, 'deploy', usageLabel) };
}

async function runDeployGet(client, opts, args) {
  return await client.request(
    'GET',
    `${DEPLOYS_PATH}/${args.deploy_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeployUpdateArgs(tokens) {
  const usageLabel = 'release deploy-update';
  const { args, positionals } = collectArgs(tokens, DEPLOY_STRING_FLAGS, usageLabel);
  const deployId = requireSingleId(positionals, 'deploy', usageLabel);
  return { deploy_id: deployId, ...args };
}

async function runDeployUpdate(client, opts, args) {
  const body = buildDeployPayload(args, 'release deploy-update');
  return await client.request(
    'PUT',
    `${DEPLOYS_PATH}/${args.deploy_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeployPatchArgs(tokens) {
  const usageLabel = 'release deploy-patch';
  const { args, positionals } = collectArgs(tokens, DEPLOY_STRING_FLAGS, usageLabel);
  const deployId = requireSingleId(positionals, 'deploy', usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { deploy_id: deployId, ...args };
}

async function runDeployPatch(client, opts, args) {
  const body = {};
  if (args.status !== null) {
    body.status = requireEnum(args.status, '--status', DEPLOY_STATUS_VALUES, 'release deploy-patch');
  }
  if (args.env_id !== null) {
    body.env_id = args.env_id;
  }
  if (args.release_name !== null) {
    body.release_name = args.release_name;
  }
  if (args.release_url !== null) {
    body.release_url = args.release_url;
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
  const workItemIdentifiers = parseJsonArray(args.work_item_identifiers, '--work-item-identifiers');
  if (workItemIdentifiers !== null) {
    body.work_item_identifiers = workItemIdentifiers;
  }
  return await client.request(
    'PATCH',
    `${DEPLOYS_PATH}/${args.deploy_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeployDeleteArgs(tokens) {
  const usageLabel = 'release deploy-delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  return { deploy_id: requireSingleId(positionals, 'deploy', usageLabel) };
}

async function runDeployDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `${DEPLOYS_PATH}/${args.deploy_id}`,
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
      case 'env-list': {
        const listArgs = parseEnvListArgs(subArgs);
        result = await runEnvList(client, opts, listArgs);
        break;
      }
      case 'env-create': {
        const createArgs = parseEnvCreateArgs(subArgs);
        result = await runEnvCreate(client, opts, createArgs);
        break;
      }
      case 'env-get': {
        const getArgs = parseEnvGetArgs(subArgs);
        result = await runEnvGet(client, opts, getArgs);
        break;
      }
      case 'env-update': {
        const updateArgs = parseEnvUpdateArgs(subArgs);
        result = await runEnvUpdate(client, opts, updateArgs);
        break;
      }
      case 'env-patch': {
        const patchArgs = parseEnvPatchArgs(subArgs);
        result = await runEnvPatch(client, opts, patchArgs);
        break;
      }
      case 'env-delete': {
        const deleteArgs = parseEnvDeleteArgs(subArgs);
        result = await runEnvDelete(client, opts, deleteArgs);
        break;
      }
      case 'deploy-list': {
        const listArgs = parseDeployListArgs(subArgs);
        result = await runDeployList(client, opts, listArgs);
        break;
      }
      case 'deploy-create': {
        const createArgs = parseDeployCreateArgs(subArgs);
        result = await runDeployCreate(client, opts, createArgs);
        break;
      }
      case 'deploy-get': {
        const getArgs = parseDeployGetArgs(subArgs);
        result = await runDeployGet(client, opts, getArgs);
        break;
      }
      case 'deploy-update': {
        const updateArgs = parseDeployUpdateArgs(subArgs);
        result = await runDeployUpdate(client, opts, updateArgs);
        break;
      }
      case 'deploy-patch': {
        const patchArgs = parseDeployPatchArgs(subArgs);
        result = await runDeployPatch(client, opts, patchArgs);
        break;
      }
      case 'deploy-delete': {
        const deleteArgs = parseDeployDeleteArgs(subArgs);
        result = await runDeployDelete(client, opts, deleteArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown release subcommand: ${subcommand}. Use release --help for usage.`);
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

shared.registerModule('release', {
  name: 'release',
  description: 'Manage PingCode release environments and deploys',
  run,
});

module.exports = { run, printHelp };
