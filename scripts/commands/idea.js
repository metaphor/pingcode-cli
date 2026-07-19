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

// ── Identifier helpers ─────────────────────────────────────────────────

function isIdentifier(arg) {
  return /^[A-Z]{3,6}-\d+$/.test(arg);
}

function isRawId(arg) {
  return /^[a-fA-F0-9]{24,32}$/.test(arg);
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
        'Options:',
        '  --product ID                 Filter by raw product id',
        '  --state ID                   Filter by raw state id',
        '  --priority ID                Filter by raw priority id',
        '  --keywords TEXT              Filter by keywords (matches identifier and title)',
        '  --include-public-image-token  Include image access token in response',
      ].join('\n'));
      break;
    case 'show':
      console.log([
        'Usage: pingcode idea show <identifier>',
        '',
        'Show a single idea by identifier (e.g. SLC-1).',
        'Only identifiers (format PROJ-123) are accepted; use `idea get` for raw ids.',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode idea get <id|identifier>',
        '',
        'Get a single idea by raw id or identifier.',
        'For identifiers (format PROJ-123), first resolves to a raw id via keyword search.',
        '',
        'Options:',
        '  --include-public-image-token  Include image access token in response',
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

// ── List subcommand ───────────────────────────────────────────────────

function parseListArgs(tokens) {
  const args = {
    product: null,
    state: null,
    priority: null,
    keywords: null,
    include_public_image_token: false,
  };
  const stringFlags = {
    '--product': 'product',
    '--state': 'state',
    '--priority': 'priority',
    '--keywords': 'keywords',
  };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg in stringFlags) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[stringFlags[arg]] = tokens[i + 1];
      i += 1;
    } else if (arg.startsWith('--')) {
      if (arg === '--include-public-image-token') {
        args.include_public_image_token = true;
        continue;
      }
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const flag = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (flag in stringFlags) {
          args[stringFlags[flag]] = value;
        } else {
          throw new core.PingCodeError(`Unknown option: ${flag}`);
        }
      } else if (!(arg in GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use idea list --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea list --help for usage.`);
    }
  }
  return args;
}

async function runList(client, opts, args) {
  const params = {};
  if (args.product) {
    if (!isRawId(args.product)) {
      throw new core.PingCodeError('--product must be a raw id');
    }
    params.product_id = args.product;
  }
  if (args.state) {
    if (!isRawId(args.state)) {
      throw new core.PingCodeError('--state must be a raw id');
    }
    params.state_id = args.state;
  }
  if (args.priority) {
    if (!isRawId(args.priority)) {
      throw new core.PingCodeError('--priority must be a raw id');
    }
    params.priority_id = args.priority;
  }
  if (args.keywords) {
    params.keywords = args.keywords;
  }
  if (args.include_public_image_token) {
    params.include_public_image_token = 'description';
  }

  return await client.request(
    'GET',
    '/v1/ship/ideas',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Show subcommand ──────────────────────────────────────────────────

function parseShowArgs(tokens) {
  let target = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (target === null) {
        target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea show --help for usage.`);
    }
    if (GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  if (!target) {
    throw new core.PingCodeError('An idea identifier is required. Use idea show --help for usage.');
  }
  return { target };
}

async function runShow(client, opts, args) {
  if (!isIdentifier(args.target)) {
    if (isRawId(args.target)) {
      throw new core.PingCodeError('Idea show requires an identifier, not a raw id. Use idea get for raw ids.');
    }
    throw new core.PingCodeError(`Invalid idea identifier: ${args.target}. Expected format like PROJ-123.`);
  }

  if (opts.dry_run) {
    return {
      dry_run: true,
      resolution: {
        method: 'GET',
        path: '/v1/ship/ideas',
        params: { keywords: args.target },
      },
      show: {
        method: 'GET',
        path: '/v1/ship/ideas',
        params: { keywords: args.target },
      },
    };
  }

  const result = await client.request(
    'GET',
    '/v1/ship/ideas',
    { keywords: args.target },
    null,
    { dry_run: false, use_workspace_cache: true },
  );

  const values = core.pageValues(result);
  if (values.length === 0) {
    throw new core.PingCodeError(`No idea found with identifier ${args.target}`);
  }
  return values[0];
}

// ── Get subcommand ───────────────────────────────────────────────────

function parseGetArgs(tokens) {
  let target = null;
  let includePublicImageToken = false;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (target === null) {
        target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea get --help for usage.`);
    }
    if (arg === '--include-public-image-token') {
      includePublicImageToken = true;
      continue;
    }
    if (GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  if (!target) {
    throw new core.PingCodeError('An idea id or identifier is required. Use idea get --help for usage.');
  }
  return { target, include_public_image_token: includePublicImageToken };
}

async function runGet(client, opts, args) {
  const params = {};
  if (args.include_public_image_token) {
    params.include_public_image_token = 'description';
  }

  if (isIdentifier(args.target)) {
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/ship/ideas',
          params: { keywords: args.target },
        },
        get: {
          method: 'GET',
          path: '/v1/ship/ideas/{id}',
          params: Object.keys(params).length > 0 ? params : undefined,
        },
      };
    }

    const resolved = await client.request(
      'GET',
      '/v1/ship/ideas',
      { keywords: args.target },
      null,
      { dry_run: false, use_workspace_cache: true },
    );
    const values = core.pageValues(resolved);
    if (values.length === 0) {
      throw new core.PingCodeError(`No idea found with identifier ${args.target}`);
    }
    const ideaId = values[0].id;
    return await client.request(
      'GET',
      `/v1/ship/ideas/${ideaId}`,
      Object.keys(params).length > 0 ? params : null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/ship/ideas/${args.target}`,
    Object.keys(params).length > 0 ? params : null,
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

  const { opts, remaining: subArgs } = parseGlobalOptions(remaining);
  const client = clientFromOpts(opts);

  try {
    let result;
    switch (subcommand) {
      case 'list': {
        const listArgs = parseListArgs(subArgs);
        result = await runList(client, opts, listArgs);
        break;
      }
      case 'show': {
        const showArgs = parseShowArgs(subArgs);
        result = await runShow(client, opts, showArgs);
        break;
      }
      case 'get': {
        const getArgs = parseGetArgs(subArgs);
        result = await runGet(client, opts, getArgs);
        break;
      }
      case 'create':
      case 'update':
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
