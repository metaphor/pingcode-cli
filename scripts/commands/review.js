'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Constants ──────────────────────────────────────────────────────────

const REVIEWS_PATH = '/v1/reviews';

const REVIEW_PRINCIPAL_TYPE_VALUES = ['idea', 'work_item', 'test_case'];
const REVIEW_STATUS_VALUES = ['pending', 'in_progress', 'completed', 'repealed'];

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode review — Manage PingCode reviews and review principals',
    '',
    'Usage: pingcode review <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [options]                            List reviews',
    '  create [options]                          Create a review',
    '  get <review_id> [options]                 Show a review',
    '  delete <review_id> [options]              Delete a review',
    '',
    '  principal-add <review_id> [options]       Add a principal (review content) to a review',
    '  principal-list <review_id> [options]      List principals of a review',
    '  principal-get <review_id> <principal_id> [options]   Show a principal of a review',
    '  principal-remove <review_id> <principal_id> [options]   Remove a principal from a review',
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
    'Usage: pingcode review list [options]',
    '',
    'List reviews.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
    '  --pilot-id ID              Id of the product, project, or test library (required)',
    '  --status STATUS            Filter by status: pending, in_progress, completed, repealed',
    '',
    'Examples:',
    '  pingcode review list --principal-type idea --pilot-id 63bb744314bd13c9def24cb4 --compact',
  ].join('\n'),
  'create': [
    'Usage: pingcode review create [options]',
    '',
    'Create a review.',
    '',
    'Options:',
    '  --title TEXT               Review title (required)',
    '  --pilot-id ID              Id of the product, project, or test library (required)',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
    '  --description TEXT         Review description',
  ].join('\n'),
  'get': [
    'Usage: pingcode review get <review_id> [options]',
    '',
    'Show a single review.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
  ].join('\n'),
  'delete': [
    'Usage: pingcode review delete <review_id> [options]',
    '',
    'Delete a review.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
  ].join('\n'),
  'principal-add': [
    'Usage: pingcode review principal-add <review_id> [options]',
    '',
    'Add a principal (review content) to a review.',
    '',
    'Options:',
    '  --principal-id ID          Id of the review content (required)',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
  ].join('\n'),
  'principal-list': [
    'Usage: pingcode review principal-list <review_id> [options]',
    '',
    'List principals (review contents) of a review.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
  ].join('\n'),
  'principal-get': [
    'Usage: pingcode review principal-get <review_id> <principal_id> [options]',
    '',
    'Show a single principal (review content) of a review.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
  ].join('\n'),
  'principal-remove': [
    'Usage: pingcode review principal-remove <review_id> <principal_id> [options]',
    '',
    'Remove a principal (review content) from a review.',
    '',
    'Options:',
    '  --principal-type TYPE      Principal type: idea, work_item, test_case (required)',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'list':
    case 'create':
    case 'get':
    case 'delete':
    case 'principal-add':
    case 'principal-list':
    case 'principal-get':
    case 'principal-remove':
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

function requirePositionalCount(positionals, count, message, usageLabel) {
  if (positionals.length < count) {
    throw new core.PingCodeError(`${message} Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > count) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[count]}. Use ${usageLabel} --help for usage.`);
  }
  return positionals.slice(0, count);
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

function requirePrincipalType(args, usageLabel) {
  return requireEnum(
    requireString(args, 'principal_type', '--principal-type', usageLabel),
    '--principal-type', REVIEW_PRINCIPAL_TYPE_VALUES, usageLabel,
  );
}

// ── Review subcommands ─────────────────────────────────────────────────

function parseListArgs(tokens) {
  const usageLabel = 'review list';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-type': 'principal_type',
    '--pilot-id': 'pilot_id',
    '--status': 'status',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  if (args.status !== null) {
    requireEnum(args.status, '--status', REVIEW_STATUS_VALUES, usageLabel);
  }
  return args;
}

async function runList(client, opts, args) {
  const usageLabel = 'review list';
  const params = {
    principal_type: requirePrincipalType(args, usageLabel),
    pilot_id: requireString(args, 'pilot_id', '--pilot-id', usageLabel),
  };
  if (args.status !== null) {
    params.status = args.status;
  }
  return await client.request(
    'GET',
    REVIEWS_PATH,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCreateArgs(tokens) {
  const usageLabel = 'review create';
  const { args, positionals } = collectArgs(tokens, {
    '--title': 'title',
    '--pilot-id': 'pilot_id',
    '--principal-type': 'principal_type',
    '--description': 'description',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return args;
}

async function runCreate(client, opts, args) {
  const usageLabel = 'review create';
  const body = {
    title: requireString(args, 'title', '--title', usageLabel),
    pilot_id: requireString(args, 'pilot_id', '--pilot-id', usageLabel),
    principal_type: requirePrincipalType(args, usageLabel),
  };
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'POST',
    REVIEWS_PATH,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseGetArgs(tokens) {
  const usageLabel = 'review get';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-type': 'principal_type',
  }, usageLabel);
  const [reviewId] = requirePositionalCount(positionals, 1, 'A review id is required.', usageLabel);
  return { review_id: reviewId, ...args };
}

async function runGet(client, opts, args) {
  const params = { principal_type: requirePrincipalType(args, 'review get') };
  return await client.request(
    'GET',
    `${REVIEWS_PATH}/${args.review_id}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeleteArgs(tokens) {
  const usageLabel = 'review delete';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-type': 'principal_type',
  }, usageLabel);
  const [reviewId] = requirePositionalCount(positionals, 1, 'A review id is required.', usageLabel);
  return { review_id: reviewId, ...args };
}

async function runDelete(client, opts, args) {
  const params = { principal_type: requirePrincipalType(args, 'review delete') };
  return await client.request(
    'DELETE',
    `${REVIEWS_PATH}/${args.review_id}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Review principal subcommands ───────────────────────────────────────

function parsePrincipalAddArgs(tokens) {
  const usageLabel = 'review principal-add';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-id': 'principal_id',
    '--principal-type': 'principal_type',
  }, usageLabel);
  const [reviewId] = requirePositionalCount(positionals, 1, 'A review id is required.', usageLabel);
  return { review_id: reviewId, ...args };
}

async function runPrincipalAdd(client, opts, args) {
  const usageLabel = 'review principal-add';
  const body = {
    principal_id: requireString(args, 'principal_id', '--principal-id', usageLabel),
    principal_type: requirePrincipalType(args, usageLabel),
  };
  return await client.request(
    'POST',
    `${REVIEWS_PATH}/${args.review_id}/principals`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePrincipalListArgs(tokens) {
  const usageLabel = 'review principal-list';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-type': 'principal_type',
  }, usageLabel);
  const [reviewId] = requirePositionalCount(positionals, 1, 'A review id is required.', usageLabel);
  return { review_id: reviewId, ...args };
}

async function runPrincipalList(client, opts, args) {
  const params = { principal_type: requirePrincipalType(args, 'review principal-list') };
  return await client.request(
    'GET',
    `${REVIEWS_PATH}/${args.review_id}/principals`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePrincipalGetArgs(tokens) {
  const usageLabel = 'review principal-get';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-type': 'principal_type',
  }, usageLabel);
  const [reviewId, principalId] = requirePositionalCount(
    positionals, 2, 'A review id and a principal id are required.', usageLabel,
  );
  return { review_id: reviewId, principal_id: principalId, ...args };
}

async function runPrincipalGet(client, opts, args) {
  const params = { principal_type: requirePrincipalType(args, 'review principal-get') };
  return await client.request(
    'GET',
    `${REVIEWS_PATH}/${args.review_id}/principals/${args.principal_id}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePrincipalRemoveArgs(tokens) {
  const usageLabel = 'review principal-remove';
  const { args, positionals } = collectArgs(tokens, {
    '--principal-type': 'principal_type',
  }, usageLabel);
  const [reviewId, principalId] = requirePositionalCount(
    positionals, 2, 'A review id and a principal id are required.', usageLabel,
  );
  return { review_id: reviewId, principal_id: principalId, ...args };
}

async function runPrincipalRemove(client, opts, args) {
  const params = { principal_type: requirePrincipalType(args, 'review principal-remove') };
  return await client.request(
    'DELETE',
    `${REVIEWS_PATH}/${args.review_id}/principals/${args.principal_id}`,
    params,
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
      case 'delete': {
        const deleteArgs = parseDeleteArgs(subArgs);
        result = await runDelete(client, opts, deleteArgs);
        break;
      }
      case 'principal-add': {
        const addArgs = parsePrincipalAddArgs(subArgs);
        result = await runPrincipalAdd(client, opts, addArgs);
        break;
      }
      case 'principal-list': {
        const plistArgs = parsePrincipalListArgs(subArgs);
        result = await runPrincipalList(client, opts, plistArgs);
        break;
      }
      case 'principal-get': {
        const pgetArgs = parsePrincipalGetArgs(subArgs);
        result = await runPrincipalGet(client, opts, pgetArgs);
        break;
      }
      case 'principal-remove': {
        const premArgs = parsePrincipalRemoveArgs(subArgs);
        result = await runPrincipalRemove(client, opts, premArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown review subcommand: ${subcommand}. Use review --help for usage.`);
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

shared.registerModule('review', {
  name: 'review',
  description: 'Manage PingCode reviews and review principals',
  run,
});

module.exports = { run, printHelp };
