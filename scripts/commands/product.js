'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Constants ──────────────────────────────────────────────────────────

const PRODUCTS_PATH = '/v1/ship/products';

const PRODUCT_VISIBILITY_VALUES = ['public', 'private'];
const PRODUCT_SCOPE_TYPE_VALUES = ['organization', 'user_group'];
const MEMBER_TYPE_VALUES = ['user', 'user_group'];
const SUITE_TYPE_VALUES = ['product', 'module'];

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
    '  create [options]            Create a product',
    '  update <id> [options]       Partial update (PATCH) of a product',
    '',
    '  member-add <product_id> [options]      Add a member to a product',
    '  member-get <product_id> <member_id>    Show a product member',
    '  member-list <product_id>               List product members',
    '  member-remove <product_id> <member_id> Remove a member from a product',
    '',
    '  tag-add <product_id> [options]         Add a tag to a product',
    '  tag-get <product_id> <tag_id>          Show a product tag',
    '  tag-list <product_id>                  List product tags',
    '  tag-remove <product_id> <tag_id>       Remove a tag from a product',
    '',
    '  suite-add <product_id> [options]       Add a requirement suite to a product',
    '  suite-get <product_id> <suite_id>      Show a requirement suite',
    '  suite-list <product_id>                List requirement suites',
    '  suite-delete <product_id> <suite_id>   Remove a requirement suite',
    '',
    '  plan-list <product_id>                 List requirement plans',
    '  plan-get <product_id> <plan_id>        Show a requirement plan',
    '',
    '  channel-list <product_id>              List ticket channels',
    '  channel-get <product_id> <channel_id>  Show a ticket channel',
    '',
    '  ticket-type-list <product_id>          List ticket types of a product',
    '  ticket-type-get <product_id> <ticket_type_id>  Show a ticket type',
    '',
    '  customer-list <product_id>             List customers',
    '  customer-create <product_id> [options] Create a customer',
    '  customer-get <product_id> <customer_id>          Show a customer',
    '  customer-update <product_id> <customer_id> [options]  Partial update (PATCH) of a customer',
    '',
    '  extuser-list <product_id>              List external users',
    '  extuser-create <product_id> [options]  Create an external user',
    '  extuser-get <product_id> <user_id>     Show an external user',
    '  extuser-update <product_id> <user_id> [options]  Partial update (PATCH) of an external user',
    '  extuser-delete <product_id> <user_id>  Delete an external user',
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
  'create': [
    'Usage: pingcode product create [options]',
    '',
    'Create a product.',
    '',
    'Options:',
    '  --name TEXT               Product name, up to 32 characters (required)',
    '  --identifier TEXT         Product identifier, unique within the org; uppercase letters/digits/underscore/dash, up to 15 characters (required)',
    '  --description TEXT        Product description',
    '  --visibility TYPE         Visibility: public, private (default private)',
    '  --scope-type TYPE         Owner type: organization, user_group (default organization)',
    '  --scope-id ID             Team id; required when --scope-type is user_group',
    '  --members JSON            JSON array of members, e.g. [{"id":"...","type":"user"}]',
    '',
    'Examples:',
    '  pingcode product create --name Demo --identifier DEMO --dry-run',
  ].join('\n'),
  'update': [
    'Usage: pingcode product update <id> [options]',
    '',
    'Partial update (PATCH) of a product. The API only defines partial update',
    'for products. At least one option is required.',
    '',
    'Options:',
    '  --name TEXT               New product name, up to 32 characters',
    '  --identifier TEXT         New product identifier',
    '  --description TEXT        New product description',
  ].join('\n'),
  'member-add': [
    'Usage: pingcode product member-add <product_id> [options]',
    '',
    'Add a member to a product.',
    '',
    'Options:',
    '  --member-id ID            Enterprise member or team id (required)',
    '  --member-type TYPE        Member type: user, user_group (required)',
    '  --role-id ID              Role id',
  ].join('\n'),
  'member-get': [
    'Usage: pingcode product member-get <product_id> <member_id>',
    '',
    'Show a product member. The member id is the enterprise member or team id.',
  ].join('\n'),
  'member-list': [
    'Usage: pingcode product member-list <product_id>',
    '',
    'List product members.',
  ].join('\n'),
  'member-remove': [
    'Usage: pingcode product member-remove <product_id> <member_id>',
    '',
    'Remove a member from a product. The member id is the enterprise member or team id.',
  ].join('\n'),
  'tag-add': [
    'Usage: pingcode product tag-add <product_id> [options]',
    '',
    'Add a tag to a product.',
    '',
    'Options:',
    '  --name TEXT               Tag name, unique within the product (required)',
  ].join('\n'),
  'tag-get': [
    'Usage: pingcode product tag-get <product_id> <tag_id>',
    '',
    'Show a product tag.',
  ].join('\n'),
  'tag-list': [
    'Usage: pingcode product tag-list <product_id>',
    '',
    'List product tags.',
  ].join('\n'),
  'tag-remove': [
    'Usage: pingcode product tag-remove <product_id> <tag_id>',
    '',
    'Remove a tag from a product.',
  ].join('\n'),
  'suite-add': [
    'Usage: pingcode product suite-add <product_id> [options]',
    '',
    'Add a requirement suite (module) to a product.',
    '',
    'Options:',
    '  --name TEXT               Suite name, unique among siblings (required)',
    '  --type TYPE               Suite type: product, module (required)',
    '  --parent-id ID            Parent suite id',
  ].join('\n'),
  'suite-get': [
    'Usage: pingcode product suite-get <product_id> <suite_id>',
    '',
    'Show a requirement suite.',
  ].join('\n'),
  'suite-list': [
    'Usage: pingcode product suite-list <product_id>',
    '',
    'List requirement suites of a product.',
  ].join('\n'),
  'suite-delete': [
    'Usage: pingcode product suite-delete <product_id> <suite_id>',
    '',
    'Remove a requirement suite. Deleting a suite also deletes its child suites.',
  ].join('\n'),
  'plan-list': [
    'Usage: pingcode product plan-list <product_id>',
    '',
    'List requirement plans of a product.',
  ].join('\n'),
  'plan-get': [
    'Usage: pingcode product plan-get <product_id> <plan_id>',
    '',
    'Show a requirement plan.',
  ].join('\n'),
  'channel-list': [
    'Usage: pingcode product channel-list <product_id>',
    '',
    'List ticket channels of a product.',
  ].join('\n'),
  'channel-get': [
    'Usage: pingcode product channel-get <product_id> <channel_id>',
    '',
    'Show a ticket channel.',
  ].join('\n'),
  'ticket-type-list': [
    'Usage: pingcode product ticket-type-list <product_id>',
    '',
    'List ticket types associated with a product.',
  ].join('\n'),
  'ticket-type-get': [
    'Usage: pingcode product ticket-type-get <product_id> <ticket_type_id>',
    '',
    'Show a ticket type associated with a product.',
  ].join('\n'),
  'customer-list': [
    'Usage: pingcode product customer-list <product_id>',
    '',
    'List customers of a product.',
  ].join('\n'),
  'customer-create': [
    'Usage: pingcode product customer-create <product_id> [options]',
    '',
    'Create a customer.',
    '',
    'Options:',
    '  --name TEXT               Customer name (required)',
    '  --assignee-id ID          Customer owner id',
    '  --scale N                 Customer scale (number)',
    '  --description TEXT        Customer description',
  ].join('\n'),
  'customer-get': [
    'Usage: pingcode product customer-get <product_id> <customer_id>',
    '',
    'Show a customer.',
  ].join('\n'),
  'customer-update': [
    'Usage: pingcode product customer-update <product_id> <customer_id> [options]',
    '',
    'Partial update (PATCH) of a customer. The API only defines partial update',
    'for customers. At least one option is required.',
    '',
    'Options:',
    '  --name TEXT               New customer name',
    '  --assignee-id ID          New customer owner id',
    '  --scale N                 New customer scale (number)',
    '  --description TEXT        New customer description',
  ].join('\n'),
  'extuser-list': [
    'Usage: pingcode product extuser-list <product_id>',
    '',
    'List external users of a product.',
  ].join('\n'),
  'extuser-create': [
    'Usage: pingcode product extuser-create <product_id> [options]',
    '',
    'Create an external user.',
    '',
    'Options:',
    '  --name TEXT               External user name (required)',
    '  --email EMAIL             External user email; email or mobile is required',
    '  --mobile MOBILE           External user mobile; email or mobile is required (mobile wins if both given)',
    '  --customer-id ID          Customer the external user belongs to',
  ].join('\n'),
  'extuser-get': [
    'Usage: pingcode product extuser-get <product_id> <user_id>',
    '',
    'Show an external user.',
  ].join('\n'),
  'extuser-update': [
    'Usage: pingcode product extuser-update <product_id> <user_id> [options]',
    '',
    'Partial update (PATCH) of an external user. The API only defines partial',
    'update of the customer association.',
    '',
    'Options:',
    '  --customer-id ID          Customer the external user belongs to (required)',
  ].join('\n'),
  'extuser-delete': [
    'Usage: pingcode product extuser-delete <product_id> <user_id>',
    '',
    'Delete an external user.',
  ].join('\n'),
};

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
      if (subcommand in SUBCOMMAND_HELP) {
        console.log(SUBCOMMAND_HELP[subcommand]);
        return;
      }
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

function requirePositionalIds(positionals, labels, usageLabel) {
  for (let i = 0; i < labels.length; i++) {
    if (i >= positionals.length) {
      const article = /^[aeiou]/i.test(labels[i]) ? 'An' : 'A';
      throw new core.PingCodeError(`${article} ${labels[i]} is required. Use ${usageLabel} --help for usage.`);
    }
  }
  if (positionals.length > labels.length) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[labels.length]}. Use ${usageLabel} --help for usage.`);
  }
  return positionals.slice(0, labels.length);
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
    PRODUCTS_PATH,
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
      PRODUCTS_PATH,
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
    `${PRODUCTS_PATH}/${productId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Create / update subcommands ───────────────────────────────────────

function parseCreateArgs(tokens) {
  const usageLabel = 'product create';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--identifier': 'identifier',
    '--description': 'description',
    '--visibility': 'visibility',
    '--scope-type': 'scope_type',
    '--scope-id': 'scope_id',
    '--members': 'members',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return args;
}

async function runCreate(client, opts, args) {
  const usageLabel = 'product create';
  const body = {
    name: requireString(args, 'name', '--name', usageLabel),
    identifier: requireString(args, 'identifier', '--identifier', usageLabel),
  };
  if (args.description !== null) {
    body.description = args.description;
  }
  if (args.visibility !== null) {
    body.visibility = requireEnum(args.visibility, '--visibility', PRODUCT_VISIBILITY_VALUES, usageLabel);
  }
  if (args.scope_type !== null) {
    body.scope_type = requireEnum(args.scope_type, '--scope-type', PRODUCT_SCOPE_TYPE_VALUES, usageLabel);
  }
  if (args.scope_id !== null) {
    body.scope_id = args.scope_id;
  }
  const members = parseJsonArray(args.members, '--members');
  if (members !== null) {
    body.members = members;
  }

  return await client.request(
    'POST',
    PRODUCTS_PATH,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// The API docs define only partial update (PATCH) for products.
function parseUpdateArgs(tokens) {
  const usageLabel = 'product update';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--identifier': 'identifier',
    '--description': 'description',
  }, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { product_id: productId, ...args };
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) {
    body.name = args.name;
  }
  if (args.identifier !== null) {
    body.identifier = args.identifier;
  }
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'PATCH',
    `${PRODUCTS_PATH}/${args.product_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Member subcommands ────────────────────────────────────────────────

function parseMemberAddArgs(tokens) {
  const usageLabel = 'product member-add';
  const { args, positionals } = collectArgs(tokens, {
    '--member-id': 'member_id',
    '--member-type': 'member_type',
    '--role-id': 'role_id',
  }, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId, ...args };
}

async function runMemberAdd(client, opts, args) {
  const usageLabel = 'product member-add';
  const body = {
    member: {
      id: requireString(args, 'member_id', '--member-id', usageLabel),
      type: requireEnum(
        requireString(args, 'member_type', '--member-type', usageLabel),
        '--member-type', MEMBER_TYPE_VALUES, usageLabel,
      ),
    },
  };
  if (args.role_id !== null) {
    body.role_id = args.role_id;
  }
  return await client.request(
    'POST',
    `${PRODUCTS_PATH}/${args.product_id}/members`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberGetArgs(tokens) {
  const usageLabel = 'product member-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, memberId] = requirePositionalIds(positionals, ['product id', 'member id'], usageLabel);
  return { product_id: productId, member_id: memberId };
}

async function runMemberGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberListArgs(tokens) {
  const usageLabel = 'product member-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runMemberList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/members`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberRemoveArgs(tokens) {
  const usageLabel = 'product member-remove';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, memberId] = requirePositionalIds(positionals, ['product id', 'member id'], usageLabel);
  return { product_id: productId, member_id: memberId };
}

async function runMemberRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `${PRODUCTS_PATH}/${args.product_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Tag subcommands ───────────────────────────────────────────────────

function parseTagAddArgs(tokens) {
  const usageLabel = 'product tag-add';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
  }, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId, ...args };
}

async function runTagAdd(client, opts, args) {
  const body = {
    name: requireString(args, 'name', '--name', 'product tag-add'),
  };
  return await client.request(
    'POST',
    `${PRODUCTS_PATH}/${args.product_id}/tags`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTagGetArgs(tokens) {
  const usageLabel = 'product tag-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, tagId] = requirePositionalIds(positionals, ['product id', 'tag id'], usageLabel);
  return { product_id: productId, tag_id: tagId };
}

async function runTagGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/tags/${args.tag_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTagListArgs(tokens) {
  const usageLabel = 'product tag-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runTagList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/tags`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTagRemoveArgs(tokens) {
  const usageLabel = 'product tag-remove';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, tagId] = requirePositionalIds(positionals, ['product id', 'tag id'], usageLabel);
  return { product_id: productId, tag_id: tagId };
}

async function runTagRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `${PRODUCTS_PATH}/${args.product_id}/tags/${args.tag_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Suite (requirement module) subcommands ────────────────────────────

function parseSuiteAddArgs(tokens) {
  const usageLabel = 'product suite-add';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--type': 'type',
    '--parent-id': 'parent_id',
  }, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId, ...args };
}

async function runSuiteAdd(client, opts, args) {
  const usageLabel = 'product suite-add';
  const body = {
    name: requireString(args, 'name', '--name', usageLabel),
    type: requireEnum(
      requireString(args, 'type', '--type', usageLabel),
      '--type', SUITE_TYPE_VALUES, usageLabel,
    ),
  };
  if (args.parent_id !== null) {
    body.parent_id = args.parent_id;
  }
  return await client.request(
    'POST',
    `${PRODUCTS_PATH}/${args.product_id}/suites`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSuiteGetArgs(tokens) {
  const usageLabel = 'product suite-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, suiteId] = requirePositionalIds(positionals, ['product id', 'suite id'], usageLabel);
  return { product_id: productId, suite_id: suiteId };
}

async function runSuiteGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/suites/${args.suite_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSuiteListArgs(tokens) {
  const usageLabel = 'product suite-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runSuiteList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/suites`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSuiteDeleteArgs(tokens) {
  const usageLabel = 'product suite-delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, suiteId] = requirePositionalIds(positionals, ['product id', 'suite id'], usageLabel);
  return { product_id: productId, suite_id: suiteId };
}

async function runSuiteDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `${PRODUCTS_PATH}/${args.product_id}/suites/${args.suite_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Plan (requirement schedule) subcommands ───────────────────────────

function parsePlanListArgs(tokens) {
  const usageLabel = 'product plan-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runPlanList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/plans`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlanGetArgs(tokens) {
  const usageLabel = 'product plan-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, planId] = requirePositionalIds(positionals, ['product id', 'plan id'], usageLabel);
  return { product_id: productId, plan_id: planId };
}

async function runPlanGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/plans/${args.plan_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Channel subcommands ───────────────────────────────────────────────

function parseChannelListArgs(tokens) {
  const usageLabel = 'product channel-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runChannelList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/channels`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseChannelGetArgs(tokens) {
  const usageLabel = 'product channel-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, channelId] = requirePositionalIds(positionals, ['product id', 'channel id'], usageLabel);
  return { product_id: productId, channel_id: channelId };
}

async function runChannelGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/channels/${args.channel_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Ticket type subcommands ───────────────────────────────────────────

function parseTicketTypeListArgs(tokens) {
  const usageLabel = 'product ticket-type-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runTicketTypeList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/ticket_types`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTicketTypeGetArgs(tokens) {
  const usageLabel = 'product ticket-type-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, ticketTypeId] = requirePositionalIds(positionals, ['product id', 'ticket type id'], usageLabel);
  return { product_id: productId, ticket_type_id: ticketTypeId };
}

async function runTicketTypeGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/ticket_types/${args.ticket_type_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Customer subcommands ──────────────────────────────────────────────

function parseCustomerListArgs(tokens) {
  const usageLabel = 'product customer-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runCustomerList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/customers`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

const CUSTOMER_FIELD_FLAGS = {
  '--name': 'name',
  '--assignee-id': 'assignee_id',
  '--scale': 'scale',
  '--description': 'description',
};

function parseCustomerCreateArgs(tokens) {
  const usageLabel = 'product customer-create';
  const { args, positionals } = collectArgs(tokens, CUSTOMER_FIELD_FLAGS, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId, ...args };
}

async function runCustomerCreate(client, opts, args) {
  const usageLabel = 'product customer-create';
  const body = {
    name: requireString(args, 'name', '--name', usageLabel),
  };
  if (args.assignee_id !== null) {
    body.assignee_id = args.assignee_id;
  }
  if (args.scale !== null) {
    body.scale = parseNumber(args.scale, '--scale');
  }
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'POST',
    `${PRODUCTS_PATH}/${args.product_id}/customers`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCustomerGetArgs(tokens) {
  const usageLabel = 'product customer-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, customerId] = requirePositionalIds(positionals, ['product id', 'customer id'], usageLabel);
  return { product_id: productId, customer_id: customerId };
}

async function runCustomerGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/customers/${args.customer_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// The API docs define only partial update (PATCH) for customers.
function parseCustomerUpdateArgs(tokens) {
  const usageLabel = 'product customer-update';
  const { args, positionals } = collectArgs(tokens, CUSTOMER_FIELD_FLAGS, usageLabel);
  const [productId, customerId] = requirePositionalIds(positionals, ['product id', 'customer id'], usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { product_id: productId, customer_id: customerId, ...args };
}

async function runCustomerUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) {
    body.name = args.name;
  }
  if (args.assignee_id !== null) {
    body.assignee_id = args.assignee_id;
  }
  if (args.scale !== null) {
    body.scale = parseNumber(args.scale, '--scale');
  }
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'PATCH',
    `${PRODUCTS_PATH}/${args.product_id}/customers/${args.customer_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── External user subcommands ─────────────────────────────────────────

function parseExtuserListArgs(tokens) {
  const usageLabel = 'product extuser-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId };
}

async function runExtuserList(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/users`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseExtuserCreateArgs(tokens) {
  const usageLabel = 'product extuser-create';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--email': 'email',
    '--mobile': 'mobile',
    '--customer-id': 'customer_id',
  }, usageLabel);
  const [productId] = requirePositionalIds(positionals, ['product id'], usageLabel);
  return { product_id: productId, ...args };
}

async function runExtuserCreate(client, opts, args) {
  const usageLabel = 'product extuser-create';
  const body = {
    name: requireString(args, 'name', '--name', usageLabel),
  };
  if (args.email !== null) {
    body.email = args.email;
  }
  if (args.mobile !== null) {
    body.mobile = args.mobile;
  }
  if (args.email === null && args.mobile === null) {
    throw new core.PingCodeError(`Either --email or --mobile is required. Use ${usageLabel} --help for usage.`);
  }
  if (args.customer_id !== null) {
    body.customer_id = args.customer_id;
  }
  return await client.request(
    'POST',
    `${PRODUCTS_PATH}/${args.product_id}/users`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseExtuserGetArgs(tokens) {
  const usageLabel = 'product extuser-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, userId] = requirePositionalIds(positionals, ['product id', 'user id'], usageLabel);
  return { product_id: productId, user_id: userId };
}

async function runExtuserGet(client, opts, args) {
  return await client.request(
    'GET',
    `${PRODUCTS_PATH}/${args.product_id}/users/${args.user_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// The API docs define only partial update (PATCH) of the customer
// association for external users.
function parseExtuserUpdateArgs(tokens) {
  const usageLabel = 'product extuser-update';
  const { args, positionals } = collectArgs(tokens, {
    '--customer-id': 'customer_id',
  }, usageLabel);
  const [productId, userId] = requirePositionalIds(positionals, ['product id', 'user id'], usageLabel);
  return { product_id: productId, user_id: userId, ...args };
}

async function runExtuserUpdate(client, opts, args) {
  const body = {
    customer_id: requireString(args, 'customer_id', '--customer-id', 'product extuser-update'),
  };
  return await client.request(
    'PATCH',
    `${PRODUCTS_PATH}/${args.product_id}/users/${args.user_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseExtuserDeleteArgs(tokens) {
  const usageLabel = 'product extuser-delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const [productId, userId] = requirePositionalIds(positionals, ['product id', 'user id'], usageLabel);
  return { product_id: productId, user_id: userId };
}

async function runExtuserDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `${PRODUCTS_PATH}/${args.product_id}/users/${args.user_id}`,
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
      case 'create': {
        const createArgs = parseCreateArgs(subArgs);
        result = await runCreate(client, opts, createArgs);
        break;
      }
      case 'update': {
        const updateArgs = parseUpdateArgs(subArgs);
        result = await runUpdate(client, opts, updateArgs);
        break;
      }
      case 'member-add': {
        const addArgs = parseMemberAddArgs(subArgs);
        result = await runMemberAdd(client, opts, addArgs);
        break;
      }
      case 'member-get': {
        const getArgs = parseMemberGetArgs(subArgs);
        result = await runMemberGet(client, opts, getArgs);
        break;
      }
      case 'member-list': {
        const listArgs = parseMemberListArgs(subArgs);
        result = await runMemberList(client, opts, listArgs);
        break;
      }
      case 'member-remove': {
        const removeArgs = parseMemberRemoveArgs(subArgs);
        result = await runMemberRemove(client, opts, removeArgs);
        break;
      }
      case 'tag-add': {
        const addArgs = parseTagAddArgs(subArgs);
        result = await runTagAdd(client, opts, addArgs);
        break;
      }
      case 'tag-get': {
        const getArgs = parseTagGetArgs(subArgs);
        result = await runTagGet(client, opts, getArgs);
        break;
      }
      case 'tag-list': {
        const listArgs = parseTagListArgs(subArgs);
        result = await runTagList(client, opts, listArgs);
        break;
      }
      case 'tag-remove': {
        const removeArgs = parseTagRemoveArgs(subArgs);
        result = await runTagRemove(client, opts, removeArgs);
        break;
      }
      case 'suite-add': {
        const addArgs = parseSuiteAddArgs(subArgs);
        result = await runSuiteAdd(client, opts, addArgs);
        break;
      }
      case 'suite-get': {
        const getArgs = parseSuiteGetArgs(subArgs);
        result = await runSuiteGet(client, opts, getArgs);
        break;
      }
      case 'suite-list': {
        const listArgs = parseSuiteListArgs(subArgs);
        result = await runSuiteList(client, opts, listArgs);
        break;
      }
      case 'suite-delete': {
        const deleteArgs = parseSuiteDeleteArgs(subArgs);
        result = await runSuiteDelete(client, opts, deleteArgs);
        break;
      }
      case 'plan-list': {
        const listArgs = parsePlanListArgs(subArgs);
        result = await runPlanList(client, opts, listArgs);
        break;
      }
      case 'plan-get': {
        const getArgs = parsePlanGetArgs(subArgs);
        result = await runPlanGet(client, opts, getArgs);
        break;
      }
      case 'channel-list': {
        const listArgs = parseChannelListArgs(subArgs);
        result = await runChannelList(client, opts, listArgs);
        break;
      }
      case 'channel-get': {
        const getArgs = parseChannelGetArgs(subArgs);
        result = await runChannelGet(client, opts, getArgs);
        break;
      }
      case 'ticket-type-list': {
        const listArgs = parseTicketTypeListArgs(subArgs);
        result = await runTicketTypeList(client, opts, listArgs);
        break;
      }
      case 'ticket-type-get': {
        const getArgs = parseTicketTypeGetArgs(subArgs);
        result = await runTicketTypeGet(client, opts, getArgs);
        break;
      }
      case 'customer-list': {
        const listArgs = parseCustomerListArgs(subArgs);
        result = await runCustomerList(client, opts, listArgs);
        break;
      }
      case 'customer-create': {
        const createArgs = parseCustomerCreateArgs(subArgs);
        result = await runCustomerCreate(client, opts, createArgs);
        break;
      }
      case 'customer-get': {
        const getArgs = parseCustomerGetArgs(subArgs);
        result = await runCustomerGet(client, opts, getArgs);
        break;
      }
      case 'customer-update': {
        const updateArgs = parseCustomerUpdateArgs(subArgs);
        result = await runCustomerUpdate(client, opts, updateArgs);
        break;
      }
      case 'extuser-list': {
        const listArgs = parseExtuserListArgs(subArgs);
        result = await runExtuserList(client, opts, listArgs);
        break;
      }
      case 'extuser-create': {
        const createArgs = parseExtuserCreateArgs(subArgs);
        result = await runExtuserCreate(client, opts, createArgs);
        break;
      }
      case 'extuser-get': {
        const getArgs = parseExtuserGetArgs(subArgs);
        result = await runExtuserGet(client, opts, getArgs);
        break;
      }
      case 'extuser-update': {
        const updateArgs = parseExtuserUpdateArgs(subArgs);
        result = await runExtuserUpdate(client, opts, updateArgs);
        break;
      }
      case 'extuser-delete': {
        const deleteArgs = parseExtuserDeleteArgs(subArgs);
        result = await runExtuserDelete(client, opts, deleteArgs);
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
