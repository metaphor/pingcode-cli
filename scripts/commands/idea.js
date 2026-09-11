'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Identifier helpers ─────────────────────────────────────────────────

function isIdentifier(arg) {
  return /^[A-Z]{2,}-\d+$/.test(arg);
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
    'Enterprise configuration resources (company-wide, not product-scoped):',
    '  Distinct from the per-product dictionary subcommands states/priorities/properties',
    '  above; resource ids are enterprise-level and no --product flag is needed.',
    '  state-resource-list            List enterprise-wide idea states',
    '  state-resource-get             Get an enterprise idea state by id',
    '  priority-resource-list         List enterprise-wide idea priorities',
    '  priority-resource-get          Get an enterprise idea priority by id',
    '  property-resource-list         List enterprise idea properties',
    '  property-resource-create       Create an enterprise idea property',
    '  property-resource-get          Get an enterprise idea property by id',
    '  property-resource-update       Partially update an enterprise idea property',
    '  property-plan-list             List idea property plans',
    '  property-plan-get              Get an idea property plan by id',
    '  property-plan-property-add     Add an idea property to a property plan',
    '  property-plan-property-get     Get an idea property within a property plan',
    '  property-plan-property-list    List idea properties within a property plan',
    '  property-plan-property-remove  Remove an idea property from a property plan',
    '',
    'Examples:',
    '  # 创建需求（idea）',
    '  pingcode idea create --product PRODUCT_ID --title "支持导出报表"',
    '  # 按关键字搜索需求',
    '  pingcode idea search --keywords 导出 --compact',
    '  # 列出产品的需求状态字典',
    '  pingcode idea states --product PRODUCT_ID --compact',
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
        '',
        'Options:',
        '  --product ID                 (required) Raw product id',
        '  --title TEXT                 (required) Idea title (max 255 chars)',
        '  --assignee NAME              Assignee (name resolvable from workspace cache)',
        '  --description TEXT           Description',
        '  --suite ID                   Raw suite id',
        '  --priority ID                Raw priority id',
        '  --properties JSON            Properties as JSON object',
        '',
        'Examples:',
        '  pingcode idea create --product 6422711c3f12e6c1e46d40e9 --title "New feature"',
        '  pingcode idea create --product 6422711c3f12e6c1e46d40e9 --title "New" --assignee john --priority 5cb9466afda1ce4ca0090005 --dry-run',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode idea update <id|identifier> [options]',
        '',
        'Update an idea.',
        '',
        'Options:',
        '  --title TEXT                 New title',
        '  --description TEXT           New description',
        '  --state ID                   Raw state id',
        '  --priority ID                Raw priority id',
        '  --assignee NAME              Assignee (name resolvable from workspace cache)',
        '  --progress NUM               Progress (0 to 1, at most 2 decimal places)',
        '  --plan-at JSON               Plan time range as JSON: {"from":<ts>,"to":<ts>,"granularity":"day"}',
        '  --real-at JSON               Real time range as JSON (same format as --plan-at)',
        '  --plan ID                    Raw plan id',
        '  --suite ID                   Raw suite id',
        '  --properties JSON            Properties as JSON object',
        '',
        'Examples:',
        '  pingcode idea update SLC-1 --title "Updated title"',
        '  pingcode idea update SLC-1 --state 63e1bf51898a0be5a2d21b2a --progress 0.5 --dry-run',
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
        'Search ideas using structured query filters.',
        '',
        'Options:',
        '  --filter JSON                Filter conditions as JSON object (MongoDB-like query syntax)',
        '  --keywords TEXT              Keywords to filter by (matches identifier and title)',
        '  --limit NUM                  Number of results per page (1-100, default 30)',
        '  --page-index NUM             Page index starting from 0 (default 0)',
        '  --include-public-image-token  Include image access token in response',
        '',
        'Examples:',
        '  pingcode idea search --keywords "login" --compact',
        '  pingcode idea search --filter \'{"title":{"contains":"账号"}}\' --dry-run',
        '  pingcode idea search --filter \'{"product.id":{"in":["6422711c3f12e6c1e46d40e9"]}}\' --limit 10',
      ].join('\n'));
      break;
    case 'states':
      console.log([
        'Usage: pingcode idea states [options]',
        '',
        'List idea states for a product.',
        '',
        'Options:',
        '  --product ID                 (required) Raw product id',
        '',
        'Examples:',
        '  pingcode idea states --product 6422711c3f12e6c1e46d40e9 --compact',
      ].join('\n'));
      break;
    case 'properties':
      console.log([
        'Usage: pingcode idea properties [options]',
        '',
        'List idea properties for a product.',
        '',
        'Options:',
        '  --product ID                 (required) Raw product id',
        '',
        'Examples:',
        '  pingcode idea properties --product 6422711c3f12e6c1e46d40e9 --compact',
      ].join('\n'));
      break;
    case 'suites':
      console.log([
        'Usage: pingcode idea suites [options]',
        '',
        'List idea suites (modules) for a product.',
        '',
        'Options:',
        '  --product ID                 (required) Raw product id',
        '',
        'Examples:',
        '  pingcode idea suites --product 6422711c3f12e6c1e46d40e9 --compact',
      ].join('\n'));
      break;
    case 'plans':
      console.log([
        'Usage: pingcode idea plans [options]',
        '',
        'List idea plans for a product.',
        '',
        'Options:',
        '  --product ID                 (required) Raw product id',
        '',
        'Examples:',
        '  pingcode idea plans --product 6422711c3f12e6c1e46d40e9 --compact',
      ].join('\n'));
      break;
    case 'priorities':
      console.log([
        'Usage: pingcode idea priorities [options]',
        '',
        'List idea priorities for a product.',
        '',
        'Options:',
        '  --product ID                 (required) Raw product id',
        '',
        'Examples:',
        '  pingcode idea priorities --product 6422711c3f12e6c1e46d40e9 --compact',
      ].join('\n'));
      break;
    case 'transition-history':
      console.log([
        'Usage: pingcode idea transition-history <transition_history_id> <id|identifier>',
        '',
        'Get a single transition history record of an idea.',
        '',
        'The first argument is the transition history id; the second is the idea id or identifier.',
        'For identifiers (format PROJ-123), first resolves to a raw id via keyword search.',
        '',
        'Examples:',
        '  pingcode idea transition-history 64c3676c983bb9481ee1eea5 64b4d70ba368e6594360ea24',
        '  pingcode idea transition-history 64c3676c983bb9481ee1eea5 SLC-1 --dry-run',
      ].join('\n'));
      break;
    case 'transition-histories':
      console.log([
        'Usage: pingcode idea transition-histories <id|identifier>',
        '',
        'List transition history records of an idea.',
        '',
        'For identifiers (format PROJ-123), first resolves to a raw id via keyword search.',
        '',
        'Examples:',
        '  pingcode idea transition-histories 64b4d70ba368e6594360ea24 --compact',
        '  pingcode idea transition-histories SLC-1 --dry-run',
      ].join('\n'));
      break;
    case 'state-resource-list':
      console.log([
        'Usage: pingcode idea state-resource-list',
        '',
        'List enterprise-wide idea states (GET /v1/ship/idea_states).',
        '',
        'Unlike the per-product dictionary subcommand `idea states` (GET /v1/ship/idea/states,',
        'requires --product), this lists company-level configuration resources.',
        '',
        'Examples:',
        '  pingcode idea state-resource-list --compact',
      ].join('\n'));
      break;
    case 'state-resource-get':
      console.log([
        'Usage: pingcode idea state-resource-get <idea_state_id>',
        '',
        'Get an enterprise-wide idea state by id.',
        '',
        'Examples:',
        '  pingcode idea state-resource-get 63e1bf51898a0be5a2d21b2a --dry-run',
      ].join('\n'));
      break;
    case 'priority-resource-list':
      console.log([
        'Usage: pingcode idea priority-resource-list',
        '',
        'List enterprise-wide idea priorities (GET /v1/ship/idea_priorities).',
        '',
        'Unlike the per-product dictionary subcommand `idea priorities` (GET /v1/ship/idea/priorities,',
        'requires --product), this lists company-level configuration resources.',
        '',
        'Examples:',
        '  pingcode idea priority-resource-list --compact',
      ].join('\n'));
      break;
    case 'priority-resource-get':
      console.log([
        'Usage: pingcode idea priority-resource-get <priority_id>',
        '',
        'Get an enterprise-wide idea priority by id.',
        '',
        'Examples:',
        '  pingcode idea priority-resource-get 5cb9466afda1ce4ca0090005 --dry-run',
      ].join('\n'));
      break;
    case 'property-resource-list':
      console.log([
        'Usage: pingcode idea property-resource-list',
        '',
        'List enterprise-wide idea properties (GET /v1/ship/idea_properties).',
        '',
        'Unlike the per-product dictionary subcommand `idea properties` (GET /v1/ship/idea/properties,',
        'requires --product), this lists company-level configuration resources.',
        '',
        'Examples:',
        '  pingcode idea property-resource-list --compact',
      ].join('\n'));
      break;
    case 'property-resource-create':
      console.log([
        'Usage: pingcode idea property-resource-create [options]',
        '',
        'Create an enterprise idea property.',
        '',
        'Options:',
        '  --name TEXT                 (required) Property name, unique within the enterprise',
        '  --type TYPE                 (required) One of: text, textarea, select, multi_select,',
        '                              cascade_select, cascade_multi_select, member, members,',
        '                              date, number, progress, rate, link',
        '  --options JSON              (optional) Choice options as JSON array of',
        '                              {"text":"..."} objects; "_id" and "parent_id" are optional',
        '',
        'Examples:',
        '  pingcode idea property-resource-create --name "严重程度" --type select --dry-run',
        '  pingcode idea property-resource-create --name "严重程度" --type select --options \'[{"text":"严重"},{"text":"一般"}]\'',
      ].join('\n'));
      break;
    case 'property-resource-get':
      console.log([
        'Usage: pingcode idea property-resource-get <property_id>',
        '',
        'Get an enterprise idea property by id.',
        'Property ids may be slugs (e.g. severity), not only hex ids.',
        '',
        'Examples:',
        '  pingcode idea property-resource-get severity --dry-run',
      ].join('\n'));
      break;
    case 'property-resource-update':
      console.log([
        'Usage: pingcode idea property-resource-update <property_id> [options]',
        '',
        'Partially update an enterprise idea property.',
        '',
        'Options:',
        '  --name TEXT                 New property name',
        '  --options JSON              Replacement choice options as JSON array (options are',
        '                              replaced as a whole)',
        '',
        'Examples:',
        '  pingcode idea property-resource-update severity --name "严重程度-update" --dry-run',
        '  pingcode idea property-resource-update severity --options \'[{"text":"严重"},{"text":"一般"}]\'',
      ].join('\n'));
      break;
    case 'property-plan-list':
      console.log([
        'Usage: pingcode idea property-plan-list',
        '',
        'List idea property plans (GET /v1/ship/idea_property_plans).',
        '',
        'Examples:',
        '  pingcode idea property-plan-list --compact',
      ].join('\n'));
      break;
    case 'property-plan-get':
      console.log([
        'Usage: pingcode idea property-plan-get <property_plan_id>',
        '',
        'Get an idea property plan by id.',
        '',
        'Examples:',
        '  pingcode idea property-plan-get 5f8a21f18ef715265de90c22 --dry-run',
      ].join('\n'));
      break;
    case 'property-plan-property-add':
      console.log([
        'Usage: pingcode idea property-plan-property-add <property_plan_id> <property_id>',
        '',
        'Add an idea property to an idea property plan.',
        '',
        'The first argument is the property plan id; the second is the idea property id.',
        '',
        'Examples:',
        '  pingcode idea property-plan-property-add 5d7a21f19ef715269ae90c50 solution --dry-run',
      ].join('\n'));
      break;
    case 'property-plan-property-get':
      console.log([
        'Usage: pingcode idea property-plan-property-get <property_plan_id> <property_id>',
        '',
        'Get an idea property within an idea property plan.',
        '',
        'The first argument is the property plan id; the second is the idea property id.',
        '',
        'Examples:',
        '  pingcode idea property-plan-property-get 5d7a21f19ef715269ae90c50 solution --dry-run',
      ].join('\n'));
      break;
    case 'property-plan-property-list':
      console.log([
        'Usage: pingcode idea property-plan-property-list <property_plan_id>',
        '',
        'List idea properties within an idea property plan.',
        '',
        'Examples:',
        '  pingcode idea property-plan-property-list 5d7a21f19ef715269ae90c50 --compact',
      ].join('\n'));
      break;
    case 'property-plan-property-remove':
      console.log([
        'Usage: pingcode idea property-plan-property-remove <property_plan_id> <property_id>',
        '',
        'Remove an idea property from an idea property plan.',
        '',
        'The first argument is the property plan id; the second is the idea property id.',
        '',
        'Examples:',
        '  pingcode idea property-plan-property-remove 5d7a21f19ef715269ae90c50 solution --dry-run',
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
      } else if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
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
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
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
    const searchParams = { keywords: args.target };
    if (args.include_public_image_token) {
      searchParams.include_public_image_token = 'description';
    }

    if (opts.dry_run) {
      return {
        dry_run: true,
        get: {
          method: 'GET',
          path: '/v1/ship/ideas',
          params: searchParams,
        },
      };
    }

    const result = await client.request(
      'GET',
      '/v1/ship/ideas',
      searchParams,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
    const values = core.pageValues(result);
    if (values.length === 0) {
      throw new core.PingCodeError(`No idea found with identifier ${args.target}`);
    }
    return values[0];
  }

  return await client.request(
    'GET',
    `/v1/ship/ideas/${args.target}`,
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Transition Histories subcommand (list) ────────────────────────────

function parseTransitionHistoriesArgs(tokens) {
  let target = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (target === null) {
        target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea transition-histories --help for usage.`);
    }
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  if (!target) {
    throw new core.PingCodeError('An idea id or identifier is required. Use idea transition-histories --help for usage.');
  }
  return { target };
}

async function runTransitionHistories(client, opts, args) {
  if (isIdentifier(args.target)) {
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/ship/ideas',
          params: { keywords: args.target },
        },
        list: {
          method: 'GET',
          path: '/v1/ship/ideas/{id}/transition_histories',
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
      `/v1/ship/ideas/${ideaId}/transition_histories`,
      null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/ship/ideas/${args.target}/transition_histories`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Transition History subcommand (single) ────────────────────────────

function parseTransitionHistoryArgs(tokens) {
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
  }
  return { positionals };
}

async function runTransitionHistory(client, opts, positionals) {
  if (positionals.length < 2) {
    throw new core.PingCodeError('A transition history id and an idea id/identifier are required. Use idea transition-history --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use idea transition-history --help for usage.`);
  }

  const historyId = positionals[0];
  const ideaRef = positionals[1];

  if (isIdentifier(ideaRef)) {
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/ship/ideas',
          params: { keywords: ideaRef },
        },
        get: {
          method: 'GET',
          path: `/v1/ship/ideas/{id}/transition_histories/${historyId}`,
        },
      };
    }

    const resolved = await client.request(
      'GET',
      '/v1/ship/ideas',
      { keywords: ideaRef },
      null,
      { dry_run: false, use_workspace_cache: true },
    );
    const values = core.pageValues(resolved);
    if (values.length === 0) {
      throw new core.PingCodeError(`No idea found with identifier ${ideaRef}`);
    }
    const ideaId = values[0].id;
    return await client.request(
      'GET',
      `/v1/ship/ideas/${ideaId}/transition_histories/${historyId}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/ship/ideas/${ideaRef}/transition_histories/${historyId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Create subcommand ──────────────────────────────────────────────────

function parseCreateArgs(tokens) {
  const args = {
    product: null,
    title: null,
    assignee: null,
    description: null,
    suite: null,
    priority: null,
    properties: null,
  };
  const stringFlags = {
    '--product': 'product',
    '--title': 'title',
    '--assignee': 'assignee',
    '--description': 'description',
    '--suite': 'suite',
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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use idea create --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea create --help for usage.`);
    }
  }
  return args;
}

async function runCreate(client, opts, args) {
  // Validate required fields
  if (typeof args.product !== 'string' || !args.product.trim()) {
    throw new core.PingCodeError('--product is required and must be a raw id. Use idea create --help for usage.');
  }
  if (!isRawId(args.product)) {
    throw new core.PingCodeError('--product must be a raw id');
  }
  if (typeof args.title !== 'string' || !args.title.trim()) {
    throw new core.PingCodeError('--title is required and must be non-empty. Use idea create --help for usage.');
  }

  // Build body
  const body = {
    product_id: args.product,
    title: args.title,
  };

  // Description
  if (args.description) {
    body.description = args.description;
  }

  // Suite (raw ID)
  if (args.suite) {
    if (!isRawId(args.suite)) {
      throw new core.PingCodeError('--suite must be a raw id');
    }
    body.suite_id = args.suite;
  }

  // Priority (raw ID)
  if (args.priority) {
    if (!isRawId(args.priority)) {
      throw new core.PingCodeError('--priority must be a raw id');
    }
    body.priority_id = args.priority;
  }

  // Properties (JSON object)
  if (args.properties) {
    body.properties = core.parseJsonObject(args.properties, '--properties');
  }

  // Assignee (name resolvable from cache)
  if (args.assignee) {
    const cache = client.workspaceCache;
    const userId = core.cachedUserId(args.assignee, cache);
    body.assignee_id = userId;
  }

  return await client.request(
    'POST',
    '/v1/ship/ideas',
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
    state: null,
    priority: null,
    assignee: null,
    progress: null,
    planAt: null,
    realAt: null,
    plan: null,
    suite: null,
    properties: null,
  };
  const stringFlags = {
    '--title': 'title',
    '--description': 'description',
    '--state': 'state',
    '--priority': 'priority',
    '--assignee': 'assignee',
    '--progress': 'progress',
    '--plan-at': 'planAt',
    '--real-at': 'realAt',
    '--plan': 'plan',
    '--suite': 'suite',
    '--properties': 'properties',
  };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.target === null) {
        args.target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea update --help for usage.`);
    }
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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use idea update --help for usage.`);
      }
    }
  }

  if (!args.target) {
    throw new core.PingCodeError('An idea id or identifier is required. Use idea update --help for usage.');
  }

  const hasUpdateField = Object.entries(args).some(
    ([key, value]) => key !== 'target' && value !== null,
  );
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use idea update --help for usage.');
  }

  return args;
}

function validateProgress(value) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new core.PingCodeError('--progress must be a number between 0 and 1');
  }
  if (num < 0 || num > 1) {
    throw new core.PingCodeError('--progress must be between 0 and 1');
  }
  // At most 2 decimal places
  const str = String(value);
  const dotIndex = str.indexOf('.');
  if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) {
    throw new core.PingCodeError('--progress must have at most 2 decimal places');
  }
  return num;
}

function validatePlanAt(raw, label) {
  const obj = core.parseJsonObject(raw, label);
  if (!obj) return null;
  if (typeof obj.from === 'undefined' || typeof obj.to === 'undefined' || typeof obj.granularity === 'undefined') {
    throw new core.PingCodeError(`${label} must include from, to, and granularity fields`);
  }
  const validGranularities = new Set(['year', 'quarter', 'month', 'day']);
  if (!validGranularities.has(obj.granularity)) {
    throw new core.PingCodeError(`${label} granularity must be one of: year, quarter, month, day`);
  }
  return obj;
}

async function runUpdate(client, opts, args) {
  const body = {};

  if (args.title) body.title = args.title;
  if (args.description) body.description = args.description;

  if (args.state) {
    if (!isRawId(args.state)) {
      throw new core.PingCodeError('--state must be a raw id');
    }
    body.state_id = args.state;
  }
  if (args.priority) {
    if (!isRawId(args.priority)) {
      throw new core.PingCodeError('--priority must be a raw id');
    }
    body.priority_id = args.priority;
  }
  if (args.assignee) {
    const cache = client.workspaceCache;
    const userId = core.cachedUserId(args.assignee, cache);
    body.assignee_id = userId;
  }
  if (args.progress) {
    body.progress = validateProgress(args.progress);
  }
  if (args.planAt) {
    body.plan_at = validatePlanAt(args.planAt, '--plan-at');
  }
  if (args.realAt) {
    body.real_at = validatePlanAt(args.realAt, '--real-at');
  }
  if (args.plan) {
    if (!isRawId(args.plan)) {
      throw new core.PingCodeError('--plan must be a raw id');
    }
    body.plan_id = args.plan;
  }
  if (args.suite) {
    if (!isRawId(args.suite)) {
      throw new core.PingCodeError('--suite must be a raw id');
    }
    body.suite_id = args.suite;
  }
  if (args.properties) {
    body.properties = core.parseJsonObject(args.properties, '--properties');
  }

  // Resolve identifier to raw id if needed
  let targetId = args.target;
  if (isIdentifier(args.target)) {
    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/ship/ideas',
          params: { keywords: args.target },
        },
        update: {
          method: 'PATCH',
          path: '/v1/ship/ideas/{id}',
          json: body,
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
    targetId = values[0].id;
  }

  return await client.request(
    'PATCH',
    `/v1/ship/ideas/${targetId}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Search subcommand ────────────────────────────────────────────────────

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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use idea search --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea search --help for usage.`);
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
    '/v1/ship/ideas/search',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Dictionary subcommands (states, properties, suites, plans, priorities)

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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use idea <subcommand> --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea <subcommand> --help for usage.`);
    }
  }

  return args;
}

async function runDictionary(client, opts, args, resource) {
  if (!args.product) {
    throw new core.PingCodeError('--product is required and must be a raw id. Use idea <subcommand> --help for usage.');
  }
  if (!isRawId(args.product)) {
    throw new core.PingCodeError('--product must be a raw id');
  }

  const params = { product_id: args.product };

  return await client.request(
    'GET',
    `/v1/ship/idea/${resource}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Enterprise resource subcommands (idea_states / idea_priorities / idea_properties / idea_property_plans)

const IDEA_PROPERTY_TYPES = new Set([
  'text', 'textarea', 'select', 'multi_select', 'cascade_select',
  'cascade_multi_select', 'member', 'members', 'date', 'number',
  'progress', 'rate', 'link',
]);

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

function validatePropertyOptions(options, label) {
  for (const option of options) {
    if (option === null || typeof option !== 'object' || Array.isArray(option)) {
      throw new core.PingCodeError(`${label} entries must be JSON objects`);
    }
    if (typeof option.text !== 'string' || !option.text.trim()) {
      throw new core.PingCodeError(`${label} entries require a text field`);
    }
  }
  return options;
}

function parseResourcePositionals(tokens, subcommand, spec) {
  const values = {};
  let index = 0;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (index >= spec.length) {
        throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea ${subcommand} --help for usage.`);
      }
      values[spec[index].key] = arg;
      index += 1;
      continue;
    }
    if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    const eqIndex = arg.indexOf('=');
    throw new core.PingCodeError(
      `Unknown option: ${eqIndex !== -1 ? arg.slice(0, eqIndex) : arg}. Use idea ${subcommand} --help for usage.`,
    );
  }
  for (const item of spec) {
    if (!values[item.key]) {
      throw new core.PingCodeError(`${item.label} is required. Use idea ${subcommand} --help for usage.`);
    }
  }
  return values;
}

function parsePropertyResourceCreateArgs(tokens) {
  const args = { name: null, type: null, options: null };
  const stringFlags = { '--name': 'name', '--type': 'type', '--options': 'options' };

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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use idea property-resource-create --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea property-resource-create --help for usage.`);
    }
  }

  if (!args.name || !args.name.trim()) {
    throw new core.PingCodeError('--name is required and must be non-empty. Use idea property-resource-create --help for usage.');
  }
  if (!args.type) {
    throw new core.PingCodeError('--type is required and must be a valid property type. Use idea property-resource-create --help for usage.');
  }
  if (!IDEA_PROPERTY_TYPES.has(args.type)) {
    throw new core.PingCodeError(`--type must be one of: ${[...IDEA_PROPERTY_TYPES].join(', ')}`);
  }
  if (args.options !== null) {
    args.options = validatePropertyOptions(parseJsonArray(args.options, '--options'), '--options');
  }
  return args;
}

function parsePropertyResourceUpdateArgs(tokens) {
  const args = { target: null, name: null, options: null };
  const stringFlags = { '--name': 'name', '--options': 'options' };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.target === null) {
        args.target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use idea property-resource-update --help for usage.`);
    }
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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use idea property-resource-update --help for usage.`);
      }
    }
  }

  if (!args.target) {
    throw new core.PingCodeError('An idea property id is required. Use idea property-resource-update --help for usage.');
  }
  if (args.name === null && args.options === null) {
    throw new core.PingCodeError('At least one field to update is required. Use idea property-resource-update --help for usage.');
  }
  if (args.options !== null) {
    args.options = validatePropertyOptions(parseJsonArray(args.options, '--options'), '--options');
  }
  return args;
}

async function runResourceGet(client, opts, path) {
  return await client.request(
    'GET',
    path,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runPropertyResourceCreate(client, opts, args) {
  const body = {
    name: args.name,
    type: args.type,
  };
  if (args.options) {
    body.options = args.options;
  }

  return await client.request(
    'POST',
    '/v1/ship/idea_properties',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runPropertyResourceUpdate(client, opts, args) {
  const body = {};
  if (args.name) {
    body.name = args.name;
  }
  if (args.options) {
    body.options = args.options;
  }

  return await client.request(
    'PATCH',
    `/v1/ship/idea_properties/${args.target}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runPlanPropertyAdd(client, opts, args) {
  return await client.request(
    'POST',
    `/v1/ship/idea_property_plans/${args.plan_id}/idea_properties`,
    null,
    { property_id: args.property_id },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runPlanPropertyRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/ship/idea_property_plans/${args.plan_id}/idea_properties/${args.property_id}`,
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
      case 'search': {
        const searchArgs = parseSearchArgs(subArgs);
        result = await runSearch(client, opts, searchArgs);
        break;
      }
      case 'states': {
        const statesArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, statesArgs, 'states');
        break;
      }
      case 'properties': {
        const propsArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, propsArgs, 'properties');
        break;
      }
      case 'suites': {
        const suitesArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, suitesArgs, 'suites');
        break;
      }
      case 'plans': {
        const plansArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, plansArgs, 'plans');
        break;
      }
      case 'priorities': {
        const prioritiesArgs = parseDictionaryArgs(subArgs);
        result = await runDictionary(client, opts, prioritiesArgs, 'priorities');
        break;
      }
      case 'transition-histories': {
        const thListArgs = parseTransitionHistoriesArgs(subArgs);
        result = await runTransitionHistories(client, opts, thListArgs);
        break;
      }
      case 'transition-history': {
        const thArgs = parseTransitionHistoryArgs(subArgs);
        result = await runTransitionHistory(client, opts, thArgs.positionals);
        break;
      }
      case 'state-resource-list': {
        parseResourcePositionals(subArgs, 'state-resource-list', []);
        result = await runResourceGet(client, opts, '/v1/ship/idea_states');
        break;
      }
      case 'state-resource-get': {
        const stateGetArgs = parseResourcePositionals(subArgs, 'state-resource-get', [
          { key: 'state_id', label: 'An idea state id' },
        ]);
        result = await runResourceGet(client, opts, `/v1/ship/idea_states/${stateGetArgs.state_id}`);
        break;
      }
      case 'priority-resource-list': {
        parseResourcePositionals(subArgs, 'priority-resource-list', []);
        result = await runResourceGet(client, opts, '/v1/ship/idea_priorities');
        break;
      }
      case 'priority-resource-get': {
        const priorityGetArgs = parseResourcePositionals(subArgs, 'priority-resource-get', [
          { key: 'priority_id', label: 'An idea priority id' },
        ]);
        result = await runResourceGet(client, opts, `/v1/ship/idea_priorities/${priorityGetArgs.priority_id}`);
        break;
      }
      case 'property-resource-list': {
        parseResourcePositionals(subArgs, 'property-resource-list', []);
        result = await runResourceGet(client, opts, '/v1/ship/idea_properties');
        break;
      }
      case 'property-resource-create': {
        const propCreateArgs = parsePropertyResourceCreateArgs(subArgs);
        result = await runPropertyResourceCreate(client, opts, propCreateArgs);
        break;
      }
      case 'property-resource-get': {
        const propGetArgs = parseResourcePositionals(subArgs, 'property-resource-get', [
          { key: 'property_id', label: 'An idea property id' },
        ]);
        result = await runResourceGet(client, opts, `/v1/ship/idea_properties/${propGetArgs.property_id}`);
        break;
      }
      case 'property-resource-update': {
        const propUpdateArgs = parsePropertyResourceUpdateArgs(subArgs);
        result = await runPropertyResourceUpdate(client, opts, propUpdateArgs);
        break;
      }
      case 'property-plan-list': {
        parseResourcePositionals(subArgs, 'property-plan-list', []);
        result = await runResourceGet(client, opts, '/v1/ship/idea_property_plans');
        break;
      }
      case 'property-plan-get': {
        const planGetArgs = parseResourcePositionals(subArgs, 'property-plan-get', [
          { key: 'plan_id', label: 'A property plan id' },
        ]);
        result = await runResourceGet(client, opts, `/v1/ship/idea_property_plans/${planGetArgs.plan_id}`);
        break;
      }
      case 'property-plan-property-add': {
        const ppAddArgs = parseResourcePositionals(subArgs, 'property-plan-property-add', [
          { key: 'plan_id', label: 'A property plan id' },
          { key: 'property_id', label: 'An idea property id' },
        ]);
        result = await runPlanPropertyAdd(client, opts, ppAddArgs);
        break;
      }
      case 'property-plan-property-get': {
        const ppGetArgs = parseResourcePositionals(subArgs, 'property-plan-property-get', [
          { key: 'plan_id', label: 'A property plan id' },
          { key: 'property_id', label: 'An idea property id' },
        ]);
        result = await runResourceGet(
          client,
          opts,
          `/v1/ship/idea_property_plans/${ppGetArgs.plan_id}/idea_properties/${ppGetArgs.property_id}`,
        );
        break;
      }
      case 'property-plan-property-list': {
        const ppListArgs = parseResourcePositionals(subArgs, 'property-plan-property-list', [
          { key: 'plan_id', label: 'A property plan id' },
        ]);
        result = await runResourceGet(
          client,
          opts,
          `/v1/ship/idea_property_plans/${ppListArgs.plan_id}/idea_properties`,
        );
        break;
      }
      case 'property-plan-property-remove': {
        const ppRemoveArgs = parseResourcePositionals(subArgs, 'property-plan-property-remove', [
          { key: 'plan_id', label: 'A property plan id' },
          { key: 'property_id', label: 'An idea property id' },
        ]);
        result = await runPlanPropertyRemove(client, opts, ppRemoveArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown idea subcommand: ${subcommand}. Use idea --help for usage.`);
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
