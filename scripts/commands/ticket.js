'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Identifier helpers ─────────────────────────────────────────────────

function isRawId(arg) {
  return /^[a-fA-F0-9]{24,32}$/.test(arg);
}

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode ticket — Manage tickets',
    '',
    'Usage: pingcode ticket <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [options]              List tickets',
    '    --product ID              Filter by product id',
    '    --type ID                 Filter by ticket type id',
    '    --state ID                Filter by ticket state id',
    '    --priority ID             Filter by ticket priority id',
    '    --keywords TEXT           Filter by keywords (matches identifier and title)',
    '    --include-public-image-token',
    '                              Include image resource tokens (description and custom multi-line text properties)',
    '',
    '  get <id>                    Show a single ticket by raw id',
    '',
    '  create [options]            Create a ticket',
    '    --product ID              (required) Raw product id',
    '    --title TEXT              (required) Ticket title (max 255 chars)',
    '    --type ID                 (required) Raw ticket type id',
    '    --description TEXT        Ticket description',
    '    --submitter ID            Raw submitter user id',
    '    --customer ID             Raw customer id',
    '    --channel ID              Raw channel id',
    '    --assignee ID             Raw assignee user id',
    '    --priority ID             Raw priority id',
    '    --properties JSON         Custom properties as JSON object',
    '',
    '  update <id> [options]       Partially update a ticket',
    '    --title TEXT              New title',
    '    --description TEXT        New description',
    '    --type ID                 New ticket type id',
    '    --state ID                New ticket state id',
    '    --assignee ID             New assignee user id',
    '    --submitter ID            New submitter user id',
    '    --solution ID             New solution id',
    '    --priority ID             New priority id',
    '    --customer ID             New customer id',
    '    --properties JSON         New custom properties as JSON object',
    '',
    '  search [options]            Search tickets with structured conditions',
    '    --filter JSON             Structured filter as JSON object',
    '    --keywords TEXT           Keywords (matches identifier and title)',
    '    --limit N                 Max results per page (1-100)',
    '    --page-index N            Page index (starting from 0)',
    '    --include-public-image-token',
    '                              Include image resource tokens',
    '',
    '  transitions <id>            List transition history records of a ticket',
    '  transition <hid> <id>       Get a single transition history record',
    '',
    '  types                       List ticket types for a product',
    '  states                      List ticket states for a product',
    '  properties                  List ticket properties for a product',
    '  channels                    List ticket channels for a product',
    '  priorities                  List ticket priorities for a product',
    '  solutions                   List ticket solutions for a product',
    '  tags                        List ticket tags for a product',
    '    (each requires --product ID)',
    '',
    '  ── Enterprise ticket configuration (distinct from the product-scoped',
    '     dictionaries above: types/states/properties/priorities/solutions list',
    '     one product config via /v1/ship/ticket/*, while the *-resource and',
    '     *-plan subcommands manage enterprise-wide configuration) ──',
    '  state-resource-create [options]',
    '                              Create an enterprise ticket state',
    '    --name TEXT               (required) State name (unique in the enterprise)',
    '    --type TYPE               (required) One of: pending, in_progress, completed, closed',
    '  state-resource-get <id>     Show an enterprise ticket state',
    '  state-resource-update <id> [options]',
    '                              Partially update an enterprise ticket state',
    '    --name TEXT               New state name',
    '    --type TYPE               New state type (pending, in_progress, completed, closed)',
    '  state-resource-list-all     List all enterprise ticket states',
    '  state-plan-list             List ticket state plans',
    '  state-plan-get <plan_id>    Show a ticket state plan',
    '  state-plan-state-add <plan_id> <state_id>',
    '                              Add a ticket state to a state plan',
    '  state-plan-state-get <plan_id> <state_id>',
    '                              Show one state in a state plan',
    '  state-plan-state-list <plan_id>',
    '                              List states in a state plan',
    '  state-plan-state-remove <plan_id> <state_id>',
    '                              Remove a state from a state plan',
    '  state-plan-flow-add <plan_id> <from_state_id> <to_state_id>',
    '                              Add a state flow to a state plan',
    '  state-plan-flow-get <plan_id> <flow_id>',
    '                              Show one state flow in a state plan',
    '  state-plan-flow-list <plan_id>',
    '                              List state flows in a state plan',
    '  state-plan-flow-remove <plan_id> <flow_id>',
    '                              Remove a state flow from a state plan',
    '  property-resource-create [options]',
    '                              Create an enterprise ticket property',
    '    --name TEXT               (required) Property name (unique in the enterprise)',
    '    --type TYPE               (required) text, textarea, select, multi_select,',
    '                              cascade_select, cascade_multi_select, member, members,',
    '                              date, number, progress, rate, or link',
    '    --options JSON            Choice items as JSON array (for select-like types);',
    '                              each item is an object with a required "text" field',
    '  property-resource-get <id>  Show an enterprise ticket property',
    '  property-resource-update <id> [options]',
    '                              Partially update an enterprise ticket property',
    '    --name TEXT               New property name',
    '    --options JSON            Replacement choice items as JSON array (full update)',
    '  property-resource-list-all  List all enterprise ticket properties',
    '  property-plan-list          List ticket property plans',
    '  property-plan-get <plan_id> Show a ticket property plan',
    '  property-plan-property-add <plan_id> <property_id>',
    '                              Add a ticket property to a property plan',
    '  property-plan-property-get <plan_id> <property_id>',
    '                              Show one property in a property plan',
    '  property-plan-property-list <plan_id>',
    '                              List properties in a property plan',
    '  property-plan-property-remove <plan_id> <property_id>',
    '                              Remove a property from a property plan',
    '  type-resource-list          List all enterprise ticket types',
    '  type-resource-get <id>      Show an enterprise ticket type',
    '  priority-resource-list      List all enterprise ticket priorities',
    '  priority-resource-get <id>  Show an enterprise ticket priority',
    '  solution-list               List all enterprise ticket solutions',
    '  solution-get <id>           Show an enterprise ticket solution',
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

function printDictionaryHelp(subcommand, label) {
  console.log([
    `Usage: pingcode ticket ${subcommand} [options]`,
    '',
    `List ticket ${label} for a product.`,
    '',
    'Options:',
    '  --product ID                 (required) Raw product id',
    '',
    'Examples:',
    `  pingcode ticket ${subcommand} --product 6422711c3f12e6c1e46d40e9 --compact`,
  ].join('\n'));
}

function printResourceHelp(subcommand, usage, description) {
  console.log([
    `Usage: pingcode ticket ${subcommand} ${usage}`.trimEnd(),
    '',
    description,
  ].join('\n'));
}

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'list':
      console.log([
        'Usage: pingcode ticket list [options]',
        '',
        'List tickets.',
        '',
        'Options:',
        '  --product ID              Filter by product id (raw id)',
        '  --type ID                 Filter by ticket type id (raw id)',
        '  --state ID                Filter by ticket state id (raw id)',
        '  --priority ID             Filter by ticket priority id (raw id)',
        '  --keywords TEXT           Filter by keywords (matches identifier and title)',
        '  --include-public-image-token',
        '                            Include image resource tokens (description and custom multi-line text properties)',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode ticket get <id> [options]',
        '',
        'Show a single ticket by raw id.',
        '',
        'Options:',
        '  --include-public-image-token',
        '                            Include image resource tokens (description and custom multi-line text properties)',
      ].join('\n'));
      break;
    case 'create':
      console.log([
        'Usage: pingcode ticket create [options]',
        '',
        'Create a ticket.',
        '',
        'Options:',
        '  --product ID              (required) Raw product id',
        '  --title TEXT              (required) Ticket title (max 255 chars)',
        '  --type ID                 (required) Raw ticket type id',
        '  --description TEXT        Ticket description',
        '  --submitter ID            Raw submitter user id',
        '  --customer ID             Raw customer id',
        '  --channel ID              Raw channel id',
        '  --assignee ID             Raw assignee user id',
        '  --priority ID             Raw priority id',
        '  --properties JSON         Custom properties as JSON object',
        '',
        'Examples:',
        '  pingcode ticket create --product 6422711c3f12e6c1e46d40e9 --title "Bug report" --type 63bb744214bd13c9def24ca9 --dry-run',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode ticket update <id> [options]',
        '',
        'Partially update a ticket.',
        '',
        'Options:',
        '  --title TEXT              New title',
        '  --description TEXT        New description',
        '  --type ID                 New ticket type id',
        '  --state ID                New ticket state id',
        '  --assignee ID             New assignee user id',
        '  --submitter ID            New submitter user id',
        '  --solution ID             New solution id',
        '  --priority ID             New priority id',
        '  --customer ID             New customer id',
        '  --properties JSON         New custom properties as JSON object',
        '',
        'At least one field to update is required.',
      ].join('\n'));
      break;
    case 'search':
      console.log([
        'Usage: pingcode ticket search [options]',
        '',
        'Search tickets with structured conditions.',
        '',
        'Options:',
        '  --filter JSON             Structured filter as JSON object (MongoDB-like query syntax)',
        '  --keywords TEXT           Keywords (matches identifier and title)',
        '  --limit N                 Max results per page (1-100)',
        '  --page-index N            Page index (starting from 0)',
        '  --include-public-image-token',
        '                            Include image resource tokens',
        '',
        'Examples:',
        '  pingcode ticket search --filter \'{"title":{"contains":"login"}}\' --dry-run',
      ].join('\n'));
      break;
    case 'transitions':
      console.log([
        'Usage: pingcode ticket transitions <id>',
        '',
        'List transition history records of a ticket.',
        '',
        'Examples:',
        '  pingcode ticket transitions 63eca888a0a13a3efc8d4a43 --compact',
      ].join('\n'));
      break;
    case 'transition':
      console.log([
        'Usage: pingcode ticket transition <transition_history_id> <id>',
        '',
        'Get a single transition history record of a ticket.',
        '',
        'The first argument is the transition history id; the second is the ticket id.',
        '',
        'Examples:',
        '  pingcode ticket transition 64c3676c983bb9481ee1eea5 63eca888a0a13a3efc8d4a43',
      ].join('\n'));
      break;
    case 'types':
      printDictionaryHelp('types', 'types');
      break;
    case 'states':
      printDictionaryHelp('states', 'states');
      break;
    case 'properties':
      printDictionaryHelp('properties', 'properties');
      break;
    case 'channels':
      printDictionaryHelp('channels', 'channels');
      break;
    case 'priorities':
      printDictionaryHelp('priorities', 'priorities');
      break;
    case 'solutions':
      printDictionaryHelp('solutions', 'solutions');
      break;
    case 'tags':
      printDictionaryHelp('tags', 'tags');
      break;
    case 'state-resource-create':
      console.log([
        'Usage: pingcode ticket state-resource-create [options]',
        '',
        'Create an enterprise ticket state.',
        '',
        'Options:',
        '  --name TEXT              (required) State name (unique in the enterprise)',
        '  --type TYPE              (required) One of: pending, in_progress, completed, closed',
        '',
        'Examples:',
        '  pingcode ticket state-resource-create --name "处理中" --type pending --dry-run',
      ].join('\n'));
      break;
    case 'state-resource-get':
      printResourceHelp('state-resource-get', '<id>', 'Show an enterprise ticket state by id.');
      break;
    case 'state-resource-update':
      console.log([
        'Usage: pingcode ticket state-resource-update <id> [options]',
        '',
        'Partially update an enterprise ticket state.',
        '',
        'Options:',
        '  --name TEXT              New state name',
        '  --type TYPE              New state type (pending, in_progress, completed, closed)',
        '',
        'At least one field to update is required.',
      ].join('\n'));
      break;
    case 'state-resource-list-all':
      printResourceHelp('state-resource-list-all', '', 'List all enterprise ticket states.');
      break;
    case 'state-plan-list':
      printResourceHelp('state-plan-list', '', 'List ticket state plans.');
      break;
    case 'state-plan-get':
      printResourceHelp('state-plan-get', '<plan_id>', 'Show a ticket state plan.');
      break;
    case 'state-plan-state-add':
      printResourceHelp('state-plan-state-add', '<plan_id> <state_id>', 'Add a ticket state to a state plan.');
      break;
    case 'state-plan-state-get':
      printResourceHelp('state-plan-state-get', '<plan_id> <state_id>', 'Show one state in a state plan.');
      break;
    case 'state-plan-state-list':
      printResourceHelp('state-plan-state-list', '<plan_id>', 'List states in a state plan.');
      break;
    case 'state-plan-state-remove':
      printResourceHelp('state-plan-state-remove', '<plan_id> <state_id>', 'Remove a state from a state plan.');
      break;
    case 'state-plan-flow-add':
      printResourceHelp('state-plan-flow-add', '<plan_id> <from_state_id> <to_state_id>', 'Add a state flow to a state plan.');
      break;
    case 'state-plan-flow-get':
      printResourceHelp('state-plan-flow-get', '<plan_id> <flow_id>', 'Show one state flow in a state plan.');
      break;
    case 'state-plan-flow-list':
      printResourceHelp('state-plan-flow-list', '<plan_id>', 'List state flows in a state plan.');
      break;
    case 'state-plan-flow-remove':
      printResourceHelp('state-plan-flow-remove', '<plan_id> <flow_id>', 'Remove a state flow from a state plan.');
      break;
    case 'property-resource-create':
      console.log([
        'Usage: pingcode ticket property-resource-create [options]',
        '',
        'Create an enterprise ticket property.',
        '',
        'Options:',
        '  --name TEXT              (required) Property name (unique in the enterprise)',
        '  --type TYPE              (required) text, textarea, select, multi_select,',
        '                           cascade_select, cascade_multi_select, member, members,',
        '                           date, number, progress, rate, or link',
        '  --options JSON           Choice items as JSON array (for select-like types);',
        '                           each item is an object with a required "text" field',
        '',
        'Examples:',
        '  pingcode ticket property-resource-create --name "严重程度" --type select --options \'[{"text":"严重"}]\' --dry-run',
      ].join('\n'));
      break;
    case 'property-resource-get':
      printResourceHelp('property-resource-get', '<id>', 'Show an enterprise ticket property by id.');
      break;
    case 'property-resource-update':
      console.log([
        'Usage: pingcode ticket property-resource-update <id> [options]',
        '',
        'Partially update an enterprise ticket property.',
        '',
        'Options:',
        '  --name TEXT              New property name',
        '  --options JSON           Replacement choice items as JSON array (options are',
        '                           updated as a whole)',
        '',
        'At least one field to update is required.',
      ].join('\n'));
      break;
    case 'property-resource-list-all':
      printResourceHelp('property-resource-list-all', '', 'List all enterprise ticket properties.');
      break;
    case 'property-plan-list':
      printResourceHelp('property-plan-list', '', 'List ticket property plans.');
      break;
    case 'property-plan-get':
      printResourceHelp('property-plan-get', '<plan_id>', 'Show a ticket property plan.');
      break;
    case 'property-plan-property-add':
      printResourceHelp('property-plan-property-add', '<plan_id> <property_id>', 'Add a ticket property to a property plan.');
      break;
    case 'property-plan-property-get':
      printResourceHelp('property-plan-property-get', '<plan_id> <property_id>', 'Show one property in a property plan.');
      break;
    case 'property-plan-property-list':
      printResourceHelp('property-plan-property-list', '<plan_id>', 'List properties in a property plan.');
      break;
    case 'property-plan-property-remove':
      printResourceHelp('property-plan-property-remove', '<plan_id> <property_id>', 'Remove a property from a property plan.');
      break;
    case 'type-resource-list':
      printResourceHelp('type-resource-list', '', 'List all enterprise ticket types (unlike product-scoped `ticket types`).');
      break;
    case 'type-resource-get':
      printResourceHelp('type-resource-get', '<id>', 'Show an enterprise ticket type by id.');
      break;
    case 'priority-resource-list':
      printResourceHelp('priority-resource-list', '', 'List all enterprise ticket priorities (unlike product-scoped `ticket priorities`).');
      break;
    case 'priority-resource-get':
      printResourceHelp('priority-resource-get', '<id>', 'Show an enterprise ticket priority by id.');
      break;
    case 'solution-list':
      printResourceHelp('solution-list', '', 'List all enterprise ticket solutions (unlike product-scoped `ticket solutions`).');
      break;
    case 'solution-get':
      printResourceHelp('solution-get', '<id>', 'Show an enterprise ticket solution by id.');
      break;
    default:
      printHelp();
  }
}

// ── List subcommand ───────────────────────────────────────────────────

function parseListArgs(tokens) {
  const args = {
    product: null,
    type: null,
    state: null,
    priority: null,
    keywords: null,
    include_public_image_token: false,
  };
  const stringFlags = {
    '--product': 'product',
    '--type': 'type',
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
      } else if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket list --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use ticket list --help for usage.`);
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
  if (args.type) {
    if (!isRawId(args.type)) {
      throw new core.PingCodeError('--type must be a raw id');
    }
    params.type_id = args.type;
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
    '/v1/ship/tickets',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Get subcommand ────────────────────────────────────────────────────

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
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use ticket get --help for usage.`);
    }
    if (arg === '--include-public-image-token') {
      includePublicImageToken = true;
      continue;
    }
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
    throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket get --help for usage.`);
  }
  if (!target) {
    throw new core.PingCodeError('A ticket id is required. Use ticket get --help for usage.');
  }
  return { target, include_public_image_token: includePublicImageToken };
}

async function runGet(client, opts, args) {
  const params = {};
  if (args.include_public_image_token) {
    params.include_public_image_token = 'description';
  }

  return await client.request(
    'GET',
    `/v1/ship/tickets/${args.target}`,
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Create subcommand ──────────────────────────────────────────────────

function parseCreateArgs(tokens) {
  const args = {
    product: null,
    title: null,
    type: null,
    description: null,
    submitter: null,
    customer: null,
    channel: null,
    assignee: null,
    priority: null,
    properties: null,
  };
  const stringFlags = {
    '--product': 'product',
    '--title': 'title',
    '--type': 'type',
    '--description': 'description',
    '--submitter': 'submitter',
    '--customer': 'customer',
    '--channel': 'channel',
    '--assignee': 'assignee',
    '--priority': 'priority',
    '--properties': 'properties',
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
      } else if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket create --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use ticket create --help for usage.`);
    }
  }
  return args;
}

function requireRawId(value, flag, subcommand) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new core.PingCodeError(`${flag} is required and must be a raw id. Use ticket ${subcommand} --help for usage.`);
  }
  if (!isRawId(value)) {
    throw new core.PingCodeError(`${flag} must be a raw id`);
  }
}

async function runCreate(client, opts, args) {
  requireRawId(args.product, '--product', 'create');
  if (typeof args.title !== 'string' || !args.title.trim()) {
    throw new core.PingCodeError('--title is required and must be non-empty. Use ticket create --help for usage.');
  }
  requireRawId(args.type, '--type', 'create');

  const optionalIds = [
    ['--submitter', 'submitter_id', args.submitter],
    ['--customer', 'customer_id', args.customer],
    ['--channel', 'channel_id', args.channel],
    ['--assignee', 'assignee_id', args.assignee],
    ['--priority', 'priority_id', args.priority],
  ];
  for (const [flag, bodyKey, value] of optionalIds) {
    if (value && !isRawId(value)) {
      throw new core.PingCodeError(`${flag} must be a raw id`);
    }
  }

  const body = {
    product_id: args.product,
    title: args.title,
    type_id: args.type,
  };
  if (args.description) {
    body.description = args.description;
  }
  for (const [, bodyKey, value] of optionalIds) {
    if (value) {
      body[bodyKey] = value;
    }
  }
  if (args.properties) {
    body.properties = core.parseJsonObject(args.properties, '--properties');
  }

  return await client.request(
    'POST',
    '/v1/ship/tickets',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Update subcommand ──────────────────────────────────────────────────

function parseUpdateArgs(tokens) {
  const args = {
    target: null,
    title: null,
    description: null,
    type: null,
    state: null,
    assignee: null,
    submitter: null,
    solution: null,
    priority: null,
    customer: null,
    properties: null,
  };
  const stringFlags = {
    '--title': 'title',
    '--description': 'description',
    '--type': 'type',
    '--state': 'state',
    '--assignee': 'assignee',
    '--submitter': 'submitter',
    '--solution': 'solution',
    '--priority': 'priority',
    '--customer': 'customer',
    '--properties': 'properties',
  };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.target === null) {
        args.target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use ticket update --help for usage.`);
    }
    if (arg in stringFlags) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[stringFlags[arg]] = tokens[i + 1];
      i += 1;
    } else {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const flag = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (flag in stringFlags) {
          args[stringFlags[flag]] = value;
        } else {
          throw new core.PingCodeError(`Unknown option: ${flag}`);
        }
      } else if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket update --help for usage.`);
      }
    }
  }

  if (!args.target) {
    throw new core.PingCodeError('A ticket id is required. Use ticket update --help for usage.');
  }

  const hasUpdateField = Object.entries(args).some(
    ([key, value]) => key !== 'target' && value !== null,
  );
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use ticket update --help for usage.');
  }

  return args;
}

async function runUpdate(client, opts, args) {
  const idFields = [
    ['--type', 'type_id', args.type],
    ['--state', 'state_id', args.state],
    ['--assignee', 'assignee_id', args.assignee],
    ['--submitter', 'submitter_id', args.submitter],
    ['--solution', 'solution_id', args.solution],
    ['--priority', 'priority_id', args.priority],
    ['--customer', 'customer_id', args.customer],
  ];
  for (const [flag, , value] of idFields) {
    if (value && !isRawId(value)) {
      throw new core.PingCodeError(`${flag} must be a raw id`);
    }
  }

  const body = {};
  if (args.title) {
    body.title = args.title;
  }
  if (args.description) {
    body.description = args.description;
  }
  for (const [, bodyKey, value] of idFields) {
    if (value) {
      body[bodyKey] = value;
    }
  }
  if (args.properties) {
    body.properties = core.parseJsonObject(args.properties, '--properties');
  }

  return await client.request(
    'PATCH',
    `/v1/ship/tickets/${args.target}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Search subcommand ──────────────────────────────────────────────────

function parseSearchArgs(tokens) {
  const args = {
    filter: null,
    keywords: null,
    page_size: null,
    page_index: null,
    include_public_image_token: false,
  };
  const stringFlags = {
    '--filter': 'filter',
    '--keywords': 'keywords',
    '--limit': 'page_size',
    '--page-index': 'page_index',
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
      } else if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket search --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use ticket search --help for usage.`);
    }
  }

  // Validate and convert page_size / page_index to numbers
  if (args.page_size !== null) {
    const num = Number(args.page_size);
    if (Number.isNaN(num) || num < 1 || num > 100) {
      throw new core.PingCodeError('--limit must be a number between 1 and 100');
    }
    args.page_size = num;
  }
  if (args.page_index !== null) {
    const num = Number(args.page_index);
    if (Number.isNaN(num) || num < 0) {
      throw new core.PingCodeError('--page-index must be a non-negative number');
    }
    args.page_index = num;
  }

  // Parse filter as JSON object
  if (args.filter !== null) {
    args.filter = core.parseJsonObject(args.filter, '--filter');
  }

  return args;
}

async function runSearch(client, opts, args) {
  const payload = {};

  if (args.filter !== null) {
    payload.filter = args.filter;
  }
  if (args.keywords !== null) {
    payload.keywords = args.keywords;
  }
  if (args.page_size !== null) {
    payload.page_size = args.page_size;
  }
  if (args.page_index !== null) {
    payload.page_index = args.page_index;
  }
  if (args.include_public_image_token) {
    payload.include_public_image_token = 'description';
  }

  const body = {
    mode: 'query',
    payload: payload,
  };

  return await client.request(
    'POST',
    '/v1/ship/tickets/search',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Transition history subcommands ─────────────────────────────────────

function parseTransitionsArgs(tokens) {
  let target = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (target === null) {
        target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use ticket transitions --help for usage.`);
    }
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
    throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket transitions --help for usage.`);
  }
  if (!target) {
    throw new core.PingCodeError('A ticket id is required. Use ticket transitions --help for usage.');
  }
  return { target };
}

async function runTransitions(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/ship/tickets/${args.target}/transition_histories`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTransitionArgs(tokens) {
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
    throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket transition --help for usage.`);
  }
  return { positionals };
}

async function runTransition(client, opts, positionals) {
  if (positionals.length < 2) {
    throw new core.PingCodeError('A transition history id and a ticket id are required. Use ticket transition --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use ticket transition --help for usage.`);
  }

  const historyId = positionals[0];
  const ticketId = positionals[1];

  return await client.request(
    'GET',
    `/v1/ship/tickets/${ticketId}/transition_histories/${historyId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Dictionary subcommands (types, states, properties, channels,
//    priorities, solutions, tags) ───────────────────────────────────────

function parseDictionaryArgs(tokens) {
  const args = { product: null };
  const stringFlags = { '--product': 'product' };

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
      } else if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use ticket <subcommand> --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use ticket <subcommand> --help for usage.`);
    }
  }

  return args;
}

async function runDictionary(client, opts, args, resource) {
  if (!args.product) {
    throw new core.PingCodeError('--product is required and must be a raw id. Use ticket <subcommand> --help for usage.');
  }
  if (!isRawId(args.product)) {
    throw new core.PingCodeError('--product must be a raw id');
  }

  const params = { product_id: args.product };

  return await client.request(
    'GET',
    `/v1/ship/ticket/${resource}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Enterprise configuration resources ────────────────────────────────
// Endpoints under /v1/ship/ticket_* manage enterprise-wide ticket
// configuration (docs/PINGCODE_API.md 产品配置中心/工单配置). They are distinct
// from the product-scoped dictionary subcommands above (/v1/ship/ticket/*).
// The docs define no delete for ticket_states or ticket_properties, and no
// create/update/delete for state/property plans themselves — only the
// nested add/get/list/remove variants.

const TICKET_STATES_PATH = '/v1/ship/ticket_states';
const TICKET_STATE_PLANS_PATH = '/v1/ship/ticket_state_plans';
const TICKET_PROPERTIES_PATH = '/v1/ship/ticket_properties';
const TICKET_PROPERTY_PLANS_PATH = '/v1/ship/ticket_property_plans';
const TICKET_TYPES_PATH = '/v1/ship/ticket_types';
const TICKET_PRIORITIES_PATH = '/v1/ship/ticket_priorities';
const TICKET_SOLUTIONS_PATH = '/v1/ship/ticket_solutions';

const TICKET_STATE_TYPES = ['pending', 'in_progress', 'completed', 'closed'];
const TICKET_PROPERTY_TYPES = [
  'text', 'textarea', 'select', 'multi_select', 'cascade_select',
  'cascade_multi_select', 'member', 'members', 'date', 'number',
  'progress', 'rate', 'link',
];

function parsePositionalArgs(tokens, subcommand, flags) {
  const flagMap = flags || {};
  const args = {};
  for (const key of Object.values(flagMap)) {
    args[key] = null;
  }
  const positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      const flag = eqIndex === -1 ? arg : arg.slice(0, eqIndex);
      if (flag in flagMap) {
        let value = eqIndex === -1 ? undefined : arg.slice(eqIndex + 1);
        if (value === undefined) {
          if (i + 1 >= tokens.length) {
            throw new core.PingCodeError(`Flag ${flag} requires a value`);
          }
          value = tokens[i + 1];
          i += 1;
        }
        args[flagMap[flag]] = value;
      } else if (!shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        throw new core.PingCodeError(`Unknown option: ${flag}. Use ticket ${subcommand} --help for usage.`);
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, args };
}

function rejectPositionals(positionals, subcommand) {
  if (positionals.length > 0) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[0]}. Use ticket ${subcommand} --help for usage.`);
  }
}

function parseNoArgs(tokens, subcommand) {
  const { positionals } = parsePositionalArgs(tokens, subcommand, {});
  rejectPositionals(positionals, subcommand);
  return {};
}

function parseIdArgs(tokens, subcommand, keys, labels) {
  const { positionals, args } = parsePositionalArgs(tokens, subcommand, {});
  for (let i = 0; i < labels.length; i++) {
    if (positionals.length <= i) {
      throw new core.PingCodeError(`A ${labels[i]} is required. Use ticket ${subcommand} --help for usage.`);
    }
  }
  rejectPositionals(positionals.slice(labels.length), subcommand);
  keys.forEach((key, idx) => { args[key] = positionals[idx]; });
  return args;
}

function parseJsonArray(raw, label) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (exc) {
    throw new core.PingCodeError(`${label} must be valid JSON: ${exc.message}`);
  }
  if (!Array.isArray(data)) {
    throw new core.PingCodeError(`${label} must be a JSON array`);
  }
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || typeof item.text !== 'string' || !item.text.trim()) {
      throw new core.PingCodeError(`${label} items must be objects with a non-empty "text" field`);
    }
  }
  return data;
}

function parseStateResourceCreateArgs(tokens) {
  const { positionals, args } = parsePositionalArgs(tokens, 'state-resource-create', {
    '--name': 'name',
    '--type': 'type',
  });
  rejectPositionals(positionals, 'state-resource-create');
  if (!args.name || !args.name.trim()) {
    throw new core.PingCodeError('--name is required and must be non-empty. Use ticket state-resource-create --help for usage.');
  }
  if (!args.type) {
    throw new core.PingCodeError('--type is required and must be one of: pending, in_progress, completed, closed. Use ticket state-resource-create --help for usage.');
  }
  if (!TICKET_STATE_TYPES.includes(args.type)) {
    throw new core.PingCodeError('--type must be one of: pending, in_progress, completed, closed');
  }
  return { name: args.name, type: args.type };
}

function parseStateResourceUpdateArgs(tokens) {
  const { positionals, args } = parsePositionalArgs(tokens, 'state-resource-update', {
    '--name': 'name',
    '--type': 'type',
  });
  if (positionals.length === 0) {
    throw new core.PingCodeError('A ticket state id is required. Use ticket state-resource-update --help for usage.');
  }
  rejectPositionals(positionals.slice(1), 'state-resource-update');
  if (!args.name && !args.type) {
    throw new core.PingCodeError('At least one field to update is required. Use ticket state-resource-update --help for usage.');
  }
  if (args.type && !TICKET_STATE_TYPES.includes(args.type)) {
    throw new core.PingCodeError('--type must be one of: pending, in_progress, completed, closed');
  }
  const result = { state_id: positionals[0] };
  if (args.name) {
    result.name = args.name;
  }
  if (args.type) {
    result.type = args.type;
  }
  return result;
}

function parsePropertyResourceCreateArgs(tokens) {
  const { positionals, args } = parsePositionalArgs(tokens, 'property-resource-create', {
    '--name': 'name',
    '--type': 'type',
    '--options': 'options',
  });
  rejectPositionals(positionals, 'property-resource-create');
  if (!args.name || !args.name.trim()) {
    throw new core.PingCodeError('--name is required and must be non-empty. Use ticket property-resource-create --help for usage.');
  }
  if (!args.type) {
    throw new core.PingCodeError('--type is required and must be one of: text, textarea, select, multi_select, cascade_select, cascade_multi_select, member, members, date, number, progress, rate, link. Use ticket property-resource-create --help for usage.');
  }
  if (!TICKET_PROPERTY_TYPES.includes(args.type)) {
    throw new core.PingCodeError('--type must be one of: text, textarea, select, multi_select, cascade_select, cascade_multi_select, member, members, date, number, progress, rate, link');
  }
  const result = { name: args.name, type: args.type };
  if (args.options) {
    result.options = parseJsonArray(args.options, '--options');
  }
  return result;
}

function parsePropertyResourceUpdateArgs(tokens) {
  const { positionals, args } = parsePositionalArgs(tokens, 'property-resource-update', {
    '--name': 'name',
    '--options': 'options',
  });
  if (positionals.length === 0) {
    throw new core.PingCodeError('A ticket property id is required. Use ticket property-resource-update --help for usage.');
  }
  rejectPositionals(positionals.slice(1), 'property-resource-update');
  if (!args.name && !args.options) {
    throw new core.PingCodeError('At least one field to update is required. Use ticket property-resource-update --help for usage.');
  }
  const result = { property_id: positionals[0] };
  if (args.name) {
    result.name = args.name;
  }
  if (args.options) {
    result.options = parseJsonArray(args.options, '--options');
  }
  return result;
}

function requestConfig(client, opts, method, path, params, body) {
  return client.request(method, path, params, body, {
    dry_run: opts.dry_run,
    use_workspace_cache: true,
  });
}

function makeResourceList(basePath) {
  return async (client, opts) => requestConfig(client, opts, 'GET', basePath, null, null);
}

function makeResourceGet(basePath) {
  return async (client, opts, args) => requestConfig(
    client,
    opts,
    'GET',
    `${basePath}/${encodeURIComponent(args.id)}`,
    null,
    null,
  );
}

function makePlanList(basePath) {
  return async (client, opts) => requestConfig(client, opts, 'GET', basePath, null, null);
}

function makePlanGet(basePath) {
  return async (client, opts, args) => requestConfig(
    client,
    opts,
    'GET',
    `${basePath}/${encodeURIComponent(args.plan_id)}`,
    null,
    null,
  );
}

function makeNestedAdd(basePath, nested, argKey) {
  return async (client, opts, args) => requestConfig(
    client,
    opts,
    'POST',
    `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}`,
    null,
    { [argKey]: args[argKey] },
  );
}

function makeNestedGet(basePath, nested, argKey) {
  return async (client, opts, args) => requestConfig(
    client,
    opts,
    'GET',
    `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}/${encodeURIComponent(args[argKey])}`,
    null,
    null,
  );
}

function makeNestedList(basePath, nested) {
  return async (client, opts, args) => requestConfig(
    client,
    opts,
    'GET',
    `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}`,
    null,
    null,
  );
}

function makeNestedRemove(basePath, nested, argKey) {
  return async (client, opts, args) => requestConfig(
    client,
    opts,
    'DELETE',
    `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}/${encodeURIComponent(args[argKey])}`,
    null,
    null,
  );
}

async function runStateResourceCreate(client, opts, args) {
  return await requestConfig(client, opts, 'POST', TICKET_STATES_PATH, null, {
    name: args.name,
    type: args.type,
  });
}

async function runStateResourceUpdate(client, opts, args) {
  const body = {};
  if (args.name) {
    body.name = args.name;
  }
  if (args.type) {
    body.type = args.type;
  }
  return await requestConfig(
    client,
    opts,
    'PATCH',
    `${TICKET_STATES_PATH}/${encodeURIComponent(args.state_id)}`,
    null,
    body,
  );
}

async function runStatePlanFlowAdd(client, opts, args) {
  return await requestConfig(
    client,
    opts,
    'POST',
    `${TICKET_STATE_PLANS_PATH}/${encodeURIComponent(args.plan_id)}/ticket_state_flows`,
    null,
    { from_state_id: args.from_state_id, to_state_id: args.to_state_id },
  );
}

async function runPropertyResourceCreate(client, opts, args) {
  const body = { name: args.name, type: args.type };
  if (args.options) {
    body.options = args.options;
  }
  return await requestConfig(client, opts, 'POST', TICKET_PROPERTIES_PATH, null, body);
}

async function runPropertyResourceUpdate(client, opts, args) {
  const body = {};
  if (args.name) {
    body.name = args.name;
  }
  if (args.options) {
    body.options = args.options;
  }
  return await requestConfig(
    client,
    opts,
    'PATCH',
    `${TICKET_PROPERTIES_PATH}/${encodeURIComponent(args.property_id)}`,
    null,
    body,
  );
}

const runStateResourceListAll = makeResourceList(TICKET_STATES_PATH);
const runStateResourceGet = makeResourceGet(TICKET_STATES_PATH);

const runStatePlanList = makePlanList(TICKET_STATE_PLANS_PATH);
const runStatePlanGet = makePlanGet(TICKET_STATE_PLANS_PATH);
const runStatePlanStateAdd = makeNestedAdd(TICKET_STATE_PLANS_PATH, 'ticket_states', 'state_id');
const runStatePlanStateGet = makeNestedGet(TICKET_STATE_PLANS_PATH, 'ticket_states', 'state_id');
const runStatePlanStateList = makeNestedList(TICKET_STATE_PLANS_PATH, 'ticket_states');
const runStatePlanStateRemove = makeNestedRemove(TICKET_STATE_PLANS_PATH, 'ticket_states', 'state_id');
const runStatePlanFlowGet = makeNestedGet(TICKET_STATE_PLANS_PATH, 'ticket_state_flows', 'flow_id');
const runStatePlanFlowList = makeNestedList(TICKET_STATE_PLANS_PATH, 'ticket_state_flows');
const runStatePlanFlowRemove = makeNestedRemove(TICKET_STATE_PLANS_PATH, 'ticket_state_flows', 'flow_id');

const runPropertyResourceListAll = makeResourceList(TICKET_PROPERTIES_PATH);
const runPropertyResourceGet = makeResourceGet(TICKET_PROPERTIES_PATH);

const runPropertyPlanList = makePlanList(TICKET_PROPERTY_PLANS_PATH);
const runPropertyPlanGet = makePlanGet(TICKET_PROPERTY_PLANS_PATH);
const runPropertyPlanPropertyAdd = makeNestedAdd(TICKET_PROPERTY_PLANS_PATH, 'ticket_properties', 'property_id');
const runPropertyPlanPropertyGet = makeNestedGet(TICKET_PROPERTY_PLANS_PATH, 'ticket_properties', 'property_id');
const runPropertyPlanPropertyList = makeNestedList(TICKET_PROPERTY_PLANS_PATH, 'ticket_properties');
const runPropertyPlanPropertyRemove = makeNestedRemove(TICKET_PROPERTY_PLANS_PATH, 'ticket_properties', 'property_id');

const runTypeResourceList = makeResourceList(TICKET_TYPES_PATH);
const runTypeResourceGet = makeResourceGet(TICKET_TYPES_PATH);
const runPriorityResourceList = makeResourceList(TICKET_PRIORITIES_PATH);
const runPriorityResourceGet = makeResourceGet(TICKET_PRIORITIES_PATH);
const runSolutionList = makeResourceList(TICKET_SOLUTIONS_PATH);
const runSolutionGet = makeResourceGet(TICKET_SOLUTIONS_PATH);

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
      case 'search': {
        const searchArgs = parseSearchArgs(subArgs);
        result = await runSearch(client, opts, searchArgs);
        break;
      }
      case 'transitions': {
        const transitionsArgs = parseTransitionsArgs(subArgs);
        result = await runTransitions(client, opts, transitionsArgs);
        break;
      }
      case 'transition': {
        const transitionArgs = parseTransitionArgs(subArgs);
        result = await runTransition(client, opts, transitionArgs.positionals);
        break;
      }
      case 'types': {
        const dictArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, dictArgs, 'types');
        break;
      }
      case 'states': {
        const dictArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, dictArgs, 'states');
        break;
      }
      case 'properties': {
        const dictArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, dictArgs, 'properties');
        break;
      }
      case 'channels': {
        const dictArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, dictArgs, 'channels');
        break;
      }
      case 'priorities': {
        const dictArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, dictArgs, 'priorities');
        break;
      }
      case 'solutions': {
        const dictArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, dictArgs, 'solutions');
        break;
      }
      case 'tags': {
        const dictArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, dictArgs, 'tags');
        break;
      }
      case 'state-resource-create': {
        result = await runStateResourceCreate(client, opts, parseStateResourceCreateArgs(subArgs));
        break;
      }
      case 'state-resource-get': {
        result = await runStateResourceGet(client, opts, parseIdArgs(subArgs, subcommand, ['id'], ['ticket state id']));
        break;
      }
      case 'state-resource-update': {
        result = await runStateResourceUpdate(client, opts, parseStateResourceUpdateArgs(subArgs));
        break;
      }
      case 'state-resource-list-all': {
        result = await runStateResourceListAll(client, opts, parseNoArgs(subArgs, subcommand));
        break;
      }
      case 'state-plan-list': {
        result = await runStatePlanList(client, opts, parseNoArgs(subArgs, subcommand));
        break;
      }
      case 'state-plan-get': {
        result = await runStatePlanGet(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id'], ['state plan id']));
        break;
      }
      case 'state-plan-state-add': {
        result = await runStatePlanStateAdd(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'state_id'], ['state plan id', 'ticket state id']));
        break;
      }
      case 'state-plan-state-get': {
        result = await runStatePlanStateGet(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'state_id'], ['state plan id', 'ticket state id']));
        break;
      }
      case 'state-plan-state-list': {
        result = await runStatePlanStateList(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id'], ['state plan id']));
        break;
      }
      case 'state-plan-state-remove': {
        result = await runStatePlanStateRemove(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'state_id'], ['state plan id', 'ticket state id']));
        break;
      }
      case 'state-plan-flow-add': {
        result = await runStatePlanFlowAdd(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'from_state_id', 'to_state_id'], ['state plan id', 'from_state_id', 'to_state_id']));
        break;
      }
      case 'state-plan-flow-get': {
        result = await runStatePlanFlowGet(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'flow_id'], ['state plan id', 'state flow id']));
        break;
      }
      case 'state-plan-flow-list': {
        result = await runStatePlanFlowList(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id'], ['state plan id']));
        break;
      }
      case 'state-plan-flow-remove': {
        result = await runStatePlanFlowRemove(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'flow_id'], ['state plan id', 'state flow id']));
        break;
      }
      case 'property-resource-create': {
        result = await runPropertyResourceCreate(client, opts, parsePropertyResourceCreateArgs(subArgs));
        break;
      }
      case 'property-resource-get': {
        result = await runPropertyResourceGet(client, opts, parseIdArgs(subArgs, subcommand, ['id'], ['ticket property id']));
        break;
      }
      case 'property-resource-update': {
        result = await runPropertyResourceUpdate(client, opts, parsePropertyResourceUpdateArgs(subArgs));
        break;
      }
      case 'property-resource-list-all': {
        result = await runPropertyResourceListAll(client, opts, parseNoArgs(subArgs, subcommand));
        break;
      }
      case 'property-plan-list': {
        result = await runPropertyPlanList(client, opts, parseNoArgs(subArgs, subcommand));
        break;
      }
      case 'property-plan-get': {
        result = await runPropertyPlanGet(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id'], ['property plan id']));
        break;
      }
      case 'property-plan-property-add': {
        result = await runPropertyPlanPropertyAdd(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'property_id'], ['property plan id', 'ticket property id']));
        break;
      }
      case 'property-plan-property-get': {
        result = await runPropertyPlanPropertyGet(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'property_id'], ['property plan id', 'ticket property id']));
        break;
      }
      case 'property-plan-property-list': {
        result = await runPropertyPlanPropertyList(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id'], ['property plan id']));
        break;
      }
      case 'property-plan-property-remove': {
        result = await runPropertyPlanPropertyRemove(client, opts, parseIdArgs(subArgs, subcommand, ['plan_id', 'property_id'], ['property plan id', 'ticket property id']));
        break;
      }
      case 'type-resource-list': {
        result = await runTypeResourceList(client, opts, parseNoArgs(subArgs, subcommand));
        break;
      }
      case 'type-resource-get': {
        result = await runTypeResourceGet(client, opts, parseIdArgs(subArgs, subcommand, ['id'], ['ticket type id']));
        break;
      }
      case 'priority-resource-list': {
        result = await runPriorityResourceList(client, opts, parseNoArgs(subArgs, subcommand));
        break;
      }
      case 'priority-resource-get': {
        result = await runPriorityResourceGet(client, opts, parseIdArgs(subArgs, subcommand, ['id'], ['ticket priority id']));
        break;
      }
      case 'solution-list': {
        result = await runSolutionList(client, opts, parseNoArgs(subArgs, subcommand));
        break;
      }
      case 'solution-get': {
        result = await runSolutionGet(client, opts, parseIdArgs(subArgs, subcommand, ['id'], ['ticket solution id']));
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown ticket subcommand: ${subcommand}. Use ticket --help for usage.`);
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

shared.registerModule('ticket', {
  name: 'ticket',
  description: 'Manage PingCode tickets',
  run,
});

module.exports = { run, printHelp };
