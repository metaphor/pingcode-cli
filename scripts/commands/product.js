'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode product — Manage products',
    '',
    'Usage: pingcode product <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [options]              List products',
    '    --keywords TEXT           Filter by keywords (matches name and identifier)',
    '    --limit N                 Max results per page',
    '',
    '  get <id|name>               Show a single product by raw id or name',
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
        'Usage: pingcode product list [options]',
        '',
        'List products.',
        '',
        'Options:',
        '  --keywords TEXT           Filter by keywords (matches name and identifier)',
        '  --limit N                 Max results per page',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode product get <id|name>',
        '',
        'Show a single product by raw id or name.',
        '',
        'If given a raw id (24-32 hex characters), fetches the product directly.',
        'Otherwise searches products by keywords and returns the first match.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── List subcommand ───────────────────────────────────────────────────

function parseListArgs(tokens) {
  const args = {
    keywords: null,
    limit: null,
  };
  const stringFlags = {
    '--keywords': 'keywords',
    '--limit': 'limit',
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
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const flag = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (flag in stringFlags) {
          args[stringFlags[flag]] = value;
        } else {
          throw new core.PingCodeError(`Unknown option: ${flag}`);
        }
      } else {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use product list --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use product list --help for usage.`);
    }
  }
  return args;
}

async function runList(client, opts, args) {
  const params = {};
  if (args.keywords) {
    params.keywords = args.keywords;
  }
  if (args.limit) {
    params.page_size = String(args.limit);
  }

  return await client.request(
    'GET',
    '/v1/ship/products',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Get subcommand ────────────────────────────────────────────────────

function parseGetArgs(tokens) {
  let productId = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (productId === null) {
        productId = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use product get --help for usage.`);
    }
    throw new core.PingCodeError(`Unknown option: ${arg}. Use product get --help for usage.`);
  }
  if (!productId) {
    throw new core.PingCodeError('A product id or name is required. Use product get --help for usage.');
  }
  return { product_id: productId };
}

const PRODUCT_RAW_ID_RE = /^[0-9a-fA-F]{24,32}$/;

async function runGet(client, opts, args) {
  const input = args.product_id;
  let productId;

  if (PRODUCT_RAW_ID_RE.test(input)) {
    productId = input;
  } else {
    // Search by keywords, resolve to id
    const listResp = await client.request(
      'GET',
      '/v1/ship/products',
      { keywords: input },
      null,
      { dry_run: false, use_workspace_cache: true },
    );
    const values = core.pageValues(listResp);
    if (values.length === 0) {
      throw new core.PingCodeError(`No product found matching "${input}"`);
    }
    productId = values[0].id;
  }

  return await client.request(
    'GET',
    `/v1/ship/products/${productId}`,
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
      case 'list': {
        const listArgs = parseListArgs(subArgs);
        result = await runList(client, opts, listArgs);
        break;
      }
      case 'get': {
        const getArgs = parseGetArgs(subArgs);
        result = await runGet(client, opts, getArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown product subcommand: ${subcommand}. Use product --help for usage.`);
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

shared.registerModule('product', {
  name: 'product',
  description: 'Manage PingCode products',
  run,
});

module.exports = { run, printHelp };
