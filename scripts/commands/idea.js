'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Global option defaults ──────────────────────────────────────────────
const GLOBAL_BOOLEAN_FLAGS = new Set([
  '--dry-run', '--compact', '--no-token-cache', '--no-workspace-cache',
]);

const GLOBAL_STRING_FLAGS = {
  '--base-url': 'base_url',
  '--client-id': 'client_id',
  '--client-secret': 'client_secret',
  '--token': 'token',
  '--user-id': 'user_id',
  '--user-name': 'user_name',
  '--workspace-cache': 'workspace_cache',
  '--grant-type': 'grant_type',
};

function defaultGlobalOpts() {
  return {
    base_url: process.env.PINGCODE_BASE_URL || core.DEFAULT_BASE_URL,
    client_id: process.env.PINGCODE_CLIENT_ID || null,
    client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
    token: process.env.PINGCODE_ACCESS_TOKEN || null,
    user_id: process.env.PINGCODE_USER_ID || null,
    user_name: process.env.PINGCODE_USER_NAME || null,
    no_token_cache: false,
    workspace_cache: process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE,
    no_workspace_cache: false,
    dry_run: false,
    compact: false,
    grant_type: 'auto',
  };
}

function parseGlobalOptions(tokens) {
  const opts = defaultGlobalOpts();
  const remaining = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--help' || arg === '-h') {
      remaining.push(arg);
      continue;
    }
    if (GLOBAL_BOOLEAN_FLAGS.has(arg)) {
      const key = arg.replace(/^--/, '').replace(/-/g, '_');
      opts[key] = true;
      continue;
    }
    const eqIndex = arg.indexOf('=');
    let flag, value, consumedNext = false;
    if (eqIndex !== -1) {
      flag = arg.slice(0, eqIndex);
      value = arg.slice(eqIndex + 1);
    } else if (arg.startsWith('--')) {
      flag = arg;
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        value = tokens[i + 1];
        consumedNext = true;
      } else {
        remaining.push(arg);
        continue;
      }
    } else {
      remaining.push(arg);
      continue;
    }
    if (flag in GLOBAL_STRING_FLAGS) {
      opts[GLOBAL_STRING_FLAGS[flag]] = value;
      if (consumedNext) i += 1;
    } else {
      remaining.push(arg);
      if (consumedNext) remaining.push(value);
      if (consumedNext) i += 1;
    }
  }
  return { opts, remaining };
}

function clientFromOpts(opts) {
  const tokenCache = opts.no_token_cache ? null : (process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE);
  const workspaceCache = opts.no_workspace_cache ? null : opts.workspace_cache;
  return new core.PingCodeClient({
    base_url: opts.base_url,
    client_id: opts.client_id,
    client_secret: opts.client_secret,
    token: opts.token,
    token_cache: tokenCache,
    workspace_cache: workspaceCache,
    grant_type: opts.grant_type,
  });
}

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode idea — Manage ideas (requirements)',
    '',
    'Usage: pingcode idea <subcommand> [options]',
    '',
    'Subcommands:',
    '  create                      Create an idea',
    '  update                      Update an idea',
    '  list                        List ideas',
    '  show                        Show a single idea',
    '  get                         Get a single idea by id or identifier',
    '  search                      Search ideas',
    '  states                      List idea states',
    '  properties                  List idea properties',
    '  suites                      List idea suites',
    '  plans                       List idea plans',
    '  priorities                  List idea priorities',
    '  transition-history          Get transition history of an idea',
    '  transition-histories        List transition histories of ideas',
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
        'Usage: pingcode idea create [options]',
        '',
        'Create an idea.',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode idea update <id|identifier> [options]',
        '',
        'Update an idea.',
      ].join('\n'));
      break;
    case 'list':
      console.log([
        'Usage: pingcode idea list [options]',
        '',
        'List ideas.',
      ].join('\n'));
      break;
    case 'show':
      console.log([
        'Usage: pingcode idea show <id|identifier>',
        '',
        'Show a single idea by id or identifier.',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode idea get <id|identifier>',
        '',
        'Get a single idea by id or identifier.',
      ].join('\n'));
      break;
    case 'search':
      console.log([
        'Usage: pingcode idea search [options]',
        '',
        'Search ideas.',
      ].join('\n'));
      break;
    case 'states':
      console.log([
        'Usage: pingcode idea states [options]',
        '',
        'List idea states.',
      ].join('\n'));
      break;
    case 'properties':
      console.log([
        'Usage: pingcode idea properties [options]',
        '',
        'List idea properties.',
      ].join('\n'));
      break;
    case 'suites':
      console.log([
        'Usage: pingcode idea suites [options]',
        '',
        'List idea suites.',
      ].join('\n'));
      break;
    case 'plans':
      console.log([
        'Usage: pingcode idea plans [options]',
        '',
        'List idea plans.',
      ].join('\n'));
      break;
    case 'priorities':
      console.log([
        'Usage: pingcode idea priorities [options]',
        '',
        'List idea priorities.',
      ].join('\n'));
      break;
    case 'transition-history':
      console.log([
        'Usage: pingcode idea transition-history <id|identifier>',
        '',
        'Get transition history of an idea.',
      ].join('\n'));
      break;
    case 'transition-histories':
      console.log([
        'Usage: pingcode idea transition-histories [options]',
        '',
        'List transition histories of ideas.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
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

  const { opts, remaining: subArgs } = parseGlobalOptions(remaining);
  const client = clientFromOpts(opts);

  try {
    let result;
    switch (subcommand) {
      case 'create':
      case 'update':
      case 'list':
      case 'show':
      case 'get':
      case 'search':
      case 'states':
      case 'properties':
      case 'suites':
      case 'plans':
      case 'priorities':
      case 'transition-history':
      case 'transition-histories':
        throw new core.PingCodeError(`Idea subcommand not yet implemented: ${subcommand}`);
      default:
        throw new core.PingCodeError(`Unknown idea subcommand: ${subcommand}`);
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

shared.registerModule('idea', {
  name: 'idea',
  description: 'Manage PingCode ideas (requirements)',
  run,
});

module.exports = { run, printHelp };
