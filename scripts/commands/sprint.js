'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

const SUBCOMMANDS = [
  'list', 'create', 'get', 'update', 'bulk-create',
  'section-list', 'section-create', 'section-get', 'section-update', 'section-delete',
  'category-list', 'category-create', 'category-get', 'category-update', 'category-delete',
];

function printHelp() {
  console.log([
    'PingCode sprint — Manage PingCode sprints (iterations)',
    '',
    'Usage: pingcode sprint <subcommand> [options]',
    '',
    'Subcommands:',
    '  list <project_id> [options]             List sprints of a project',
    '  create <project_id>                     Create a sprint',
    '  get <project_id> <sprint_id>            Show a sprint',
    '  update <project_id> <sprint_id>         Update a sprint',
    '  bulk-create                             Bulk create sprints',
    '',
    '  section-list <project_id>               List sprint sections',
    '  section-create <project_id>             Create a sprint section',
    '  section-get <project_id> <section_id>   Show a sprint section',
    '  section-update <project_id> <section_id> Rename a sprint section',
    '  section-delete <project_id> <section_id> Delete a sprint section',
    '',
    '  category-list <project_id>                    List sprint categories',
    '  category-create <project_id>                  Create a sprint category',
    '  category-get <project_id> <category_id>       Show a sprint category',
    '  category-update <project_id> <category_id>    Update a sprint category',
    '  category-delete <project_id> <category_id>    Delete a sprint category',
    '',
    'Note: the PingCode API does not document a delete endpoint for sprints.',
    '',
    'Examples:',
    '  # 列出项目的迭代',
    '  pingcode sprint list PROJECT_ID --compact',
    '  # 新建迭代',
    '  pingcode sprint create PROJECT_ID --name "Sprint 1" --start-at 1704038400 --end-at 1705248000 --assignee-id USER_ID',
    '  # 查看迭代详情',
    '  pingcode sprint get PROJECT_ID SPRINT_ID --compact',
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
    'Usage: pingcode sprint list <project_id> [options]',
    '',
    'List sprints of a project.',
    '',
    'Options:',
    '  --name TEXT               Filter by sprint name',
    '  --status STATUS           pending, in_progress, or completed',
    '  --created-between A,B     Created between two timestamps (comma separated)',
    '  --updated-between A,B     Updated between two timestamps (comma separated)',
  ].join('\n'),
  'create': [
    'Usage: pingcode sprint create <project_id> [options]',
    '',
    'Create a sprint.',
    '',
    'Options:',
    '  --name TEXT               Sprint name (required)',
    '  --start-at SECONDS        Planned start time, unix seconds (required)',
    '  --end-at SECONDS          Planned end time, unix seconds (required)',
    '  --assignee-id ID          Sprint owner user id (required)',
    '  --description TEXT        Sprint description',
    '  --status STATUS           pending, in_progress, or completed',
    '  --category-ids JSON       JSON array of sprint category ids',
  ].join('\n'),
  'get': [
    'Usage: pingcode sprint get <project_id> <sprint_id> [options]',
    '',
    'Show a sprint.',
  ].join('\n'),
  'update': [
    'Usage: pingcode sprint update <project_id> <sprint_id> [options]',
    '',
    'Partially update a sprint.',
    '',
    'Options:',
    '  --name TEXT               New sprint name',
    '  --start-at SECONDS        New planned start time, unix seconds',
    '  --end-at SECONDS          New planned end time, unix seconds',
    '  --assignee-id ID          New sprint owner user id',
    '  --description TEXT        New sprint description',
    '  --status STATUS           pending, in_progress, or completed',
    '  --category-ids JSON       JSON array of sprint category ids',
  ].join('\n'),
  'bulk-create': [
    'Usage: pingcode sprint bulk-create --items JSON',
    '',
    'Bulk create sprints (max 100).',
    '',
    'Options:',
    '  --items JSON              JSON array of sprints, each with project_id, name,',
    '                            start_at, end_at, assignee_id and optional',
    '                            description, status, category_ids',
  ].join('\n'),
  'section-list': [
    'Usage: pingcode sprint section-list <project_id> [options]',
    '',
    'List sprint sections.',
  ].join('\n'),
  'section-create': [
    'Usage: pingcode sprint section-create <project_id> --name NAME',
    '',
    'Create a sprint section.',
    '',
    'Options:',
    '  --name TEXT               Section name (required)',
  ].join('\n'),
  'section-get': [
    'Usage: pingcode sprint section-get <project_id> <section_id> [options]',
    '',
    'Show a sprint section.',
  ].join('\n'),
  'section-update': [
    'Usage: pingcode sprint section-update <project_id> <section_id> --name NAME',
    '',
    'Partially update a sprint section.',
    '',
    'Options:',
    '  --name TEXT               New section name (required)',
  ].join('\n'),
  'section-delete': [
    'Usage: pingcode sprint section-delete <project_id> <section_id> [options]',
    '',
    'Delete a sprint section.',
  ].join('\n'),
  'category-list': [
    'Usage: pingcode sprint category-list <project_id> [options]',
    '',
    'List sprint categories.',
  ].join('\n'),
  'category-create': [
    'Usage: pingcode sprint category-create <project_id> --name NAME [options]',
    '',
    'Create a sprint category.',
    '',
    'Options:',
    '  --name TEXT               Category name (required)',
    '  --section-id ID           Owning sprint section id',
  ].join('\n'),
  'category-get': [
    'Usage: pingcode sprint category-get <project_id> <category_id> [options]',
    '',
    'Show a sprint category.',
  ].join('\n'),
  'category-update': [
    'Usage: pingcode sprint category-update <project_id> <category_id> [options]',
    '',
    'Partially update a sprint category.',
    '',
    'Options:',
    '  --name TEXT               New category name',
    '  --section-id ID           Owning sprint section id',
  ].join('\n'),
  'category-delete': [
    'Usage: pingcode sprint category-delete <project_id> <category_id> [options]',
    '',
    'Delete a sprint category.',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'list':
    case 'create':
    case 'get':
    case 'update':
    case 'bulk-create':
    case 'section-list':
    case 'section-create':
    case 'section-get':
    case 'section-update':
    case 'section-delete':
    case 'category-list':
    case 'category-create':
    case 'category-get':
    case 'category-update':
    case 'category-delete':
      console.log(SUBCOMMAND_HELP[subcommand]);
      break;
    default:
      printHelp();
  }
}

// ── Argument parsing helpers ───────────────────────────────────────────

// spec: { positionals: ['project_id'], flags: {'--x': 'x'}, numbers: {'--n': 'n'},
//        jsonArrays: {'--a': 'a'}, booleans: {'--b': 'b'},
//        label: 'sprint-get', required: 'A project id is required.' }
function parseArgs(tokens, spec) {
  const valueFlags = {
    ...(spec.flags || {}),
    ...(spec.numbers || {}),
    ...(spec.jsonArrays || {}),
  };
  const numberKeys = new Set(Object.values(spec.numbers || {}));
  const arrayKeys = new Set(Object.values(spec.jsonArrays || {}));

  const args = {};
  for (const key of Object.values(valueFlags)) {
    args[key] = null;
  }
  for (const key of Object.values(spec.booleans || {})) {
    args[key] = null;
  }

  const positionals = [];
  const positionalCount = (spec.positionals || []).length;

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      const flag = eqIndex === -1 ? arg : arg.slice(0, eqIndex);
      const inlineValue = eqIndex === -1 ? undefined : arg.slice(eqIndex + 1);

      if (flag in valueFlags) {
        let value = inlineValue;
        if (value === undefined) {
          if (i + 1 >= tokens.length) {
            throw new core.PingCodeError(`Flag ${flag} requires a value`);
          }
          value = tokens[i + 1];
          i += 1;
        }
        const key = valueFlags[flag];
        if (numberKeys.has(key)) {
          args[key] = parseNumberFlag(value, flag);
        } else if (arrayKeys.has(key)) {
          args[key] = parseJsonArray(value, flag);
        } else {
          args[key] = value;
        }
      } else if (flag in (spec.booleans || {})) {
        args[spec.booleans[flag]] = inlineValue === undefined ? true : inlineValue === 'true';
      } else if (arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS) {
        // Global boolean flag (e.g. --dry-run); handled by parseGlobalOptions.
      } else {
        throw new core.PingCodeError(`Unknown option: ${flag}. Use sprint ${spec.label} --help for usage.`);
      }
    } else if (positionals.length < positionalCount) {
      positionals.push(arg);
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use sprint ${spec.label} --help for usage.`);
    }
  }

  (spec.positionals || []).forEach((name, index) => {
    args[name] = positionals[index] || null;
  });
  if (spec.required && positionals.length < positionalCount) {
    throw new core.PingCodeError(`${spec.required} Use sprint ${spec.label} --help for usage.`);
  }
  return args;
}

function requireFlags(args, requirements, label) {
  for (const [key, [flag, desc]] of Object.entries(requirements)) {
    if (args[key] === null || args[key] === undefined || args[key] === '') {
      throw new core.PingCodeError(`${flag} is required and must be ${desc}. Use sprint ${label} --help for usage.`);
    }
  }
}

function parseNumberFlag(value, flag) {
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

// ── Sprint subcommands ─────────────────────────────────────────────────

function parseListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id'],
    flags: {
      '--name': 'name',
      '--status': 'status',
      '--created-between': 'created_between',
      '--updated-between': 'updated_between',
    },
    label: 'list',
    required: 'A project id is required.',
  });
}

async function runList(client, opts, args) {
  const params = {};
  if (args.name) params.name = args.name;
  if (args.status) params.status = args.status;
  if (args.created_between) params.created_between = args.created_between;
  if (args.updated_between) params.updated_between = args.updated_between;

  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/sprints`,
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['project_id'],
    flags: {
      '--name': 'name',
      '--assignee-id': 'assignee_id',
      '--description': 'description',
      '--status': 'status',
    },
    numbers: {
      '--start-at': 'start_at',
      '--end-at': 'end_at',
    },
    jsonArrays: {
      '--category-ids': 'category_ids',
    },
    label: 'create',
    required: 'A project id is required.',
  });
  requireFlags(args, {
    name: ['--name', 'a string'],
    start_at: ['--start-at', 'a number (unix seconds)'],
    end_at: ['--end-at', 'a number (unix seconds)'],
    assignee_id: ['--assignee-id', 'a string'],
  }, 'create');
  return args;
}

async function runCreate(client, opts, args) {
  const body = {
    name: args.name,
    start_at: args.start_at,
    end_at: args.end_at,
    assignee_id: args.assignee_id,
  };
  if (args.description) body.description = args.description;
  if (args.status) body.status = args.status;
  if (args.category_ids) body.category_ids = args.category_ids;

  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.project_id}/sprints`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'sprint_id'],
    label: 'get',
    required: 'A project id and a sprint id are required.',
  });
}

async function runGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/sprints/${args.sprint_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'sprint_id'],
    flags: {
      '--name': 'name',
      '--assignee-id': 'assignee_id',
      '--description': 'description',
      '--status': 'status',
    },
    numbers: {
      '--start-at': 'start_at',
      '--end-at': 'end_at',
    },
    jsonArrays: {
      '--category-ids': 'category_ids',
    },
    label: 'update',
    required: 'A project id and a sprint id are required.',
  });
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.start_at !== null) body.start_at = args.start_at;
  if (args.end_at !== null) body.end_at = args.end_at;
  if (args.assignee_id) body.assignee_id = args.assignee_id;
  if (args.description) body.description = args.description;
  if (args.status) body.status = args.status;
  if (args.category_ids) body.category_ids = args.category_ids;

  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.project_id}/sprints/${args.sprint_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseBulkCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--items': 'items',
    },
    label: 'bulk-create',
  });
  if (args.items === null) {
    throw new core.PingCodeError('--items is required and must be a JSON array. Use sprint bulk-create --help for usage.');
  }
  args.items = parseJsonArray(args.items, '--items');
  return args;
}

async function runBulkCreate(client, opts, args) {
  return await client.request(
    'POST',
    '/v1/pjm/sprints/bulk',
    null,
    { sprints: args.items },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Sprint section subcommands ─────────────────────────────────────────

function parseSectionListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id'],
    label: 'section-list',
    required: 'A project id is required.',
  });
}

async function runSectionList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/sprint_sections`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['project_id'],
    flags: {
      '--name': 'name',
    },
    label: 'section-create',
    required: 'A project id is required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'section-create');
  return args;
}

async function runSectionCreate(client, opts, args) {
  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.project_id}/sprint_sections`,
    null,
    { name: args.name },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'section_id'],
    label: 'section-get',
    required: 'A project id and a section id are required.',
  });
}

async function runSectionGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/sprint_sections/${args.section_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['project_id', 'section_id'],
    flags: {
      '--name': 'name',
    },
    label: 'section-update',
    required: 'A project id and a section id are required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'section-update');
  return args;
}

async function runSectionUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.project_id}/sprint_sections/${args.section_id}`,
    null,
    { name: args.name },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'section_id'],
    label: 'section-delete',
    required: 'A project id and a section id are required.',
  });
}

async function runSectionDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.project_id}/sprint_sections/${args.section_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Sprint category subcommands ────────────────────────────────────────

function parseCategoryListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id'],
    label: 'category-list',
    required: 'A project id is required.',
  });
}

async function runCategoryList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/sprint_categories`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['project_id'],
    flags: {
      '--name': 'name',
      '--section-id': 'section_id',
    },
    label: 'category-create',
    required: 'A project id is required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'category-create');
  return args;
}

async function runCategoryCreate(client, opts, args) {
  const body = { name: args.name };
  if (args.section_id) body.section_id = args.section_id;

  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.project_id}/sprint_categories`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'category_id'],
    label: 'category-get',
    required: 'A project id and a category id are required.',
  });
}

async function runCategoryGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/sprint_categories/${args.category_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'category_id'],
    flags: {
      '--name': 'name',
      '--section-id': 'section_id',
    },
    label: 'category-update',
    required: 'A project id and a category id are required.',
  });
}

async function runCategoryUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.section_id) body.section_id = args.section_id;

  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.project_id}/sprint_categories/${args.category_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'category_id'],
    label: 'category-delete',
    required: 'A project id and a category id are required.',
  });
}

async function runCategoryDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.project_id}/sprint_categories/${args.category_id}`,
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
      case 'bulk-create': {
        const bulkCreateArgs = parseBulkCreateArgs(subArgs);
        result = await runBulkCreate(client, opts, bulkCreateArgs);
        break;
      }
      case 'section-list': {
        const sectionListArgs = parseSectionListArgs(subArgs);
        result = await runSectionList(client, opts, sectionListArgs);
        break;
      }
      case 'section-create': {
        const sectionCreateArgs = parseSectionCreateArgs(subArgs);
        result = await runSectionCreate(client, opts, sectionCreateArgs);
        break;
      }
      case 'section-get': {
        const sectionGetArgs = parseSectionGetArgs(subArgs);
        result = await runSectionGet(client, opts, sectionGetArgs);
        break;
      }
      case 'section-update': {
        const sectionUpdateArgs = parseSectionUpdateArgs(subArgs);
        result = await runSectionUpdate(client, opts, sectionUpdateArgs);
        break;
      }
      case 'section-delete': {
        const sectionDeleteArgs = parseSectionDeleteArgs(subArgs);
        result = await runSectionDelete(client, opts, sectionDeleteArgs);
        break;
      }
      case 'category-list': {
        const categoryListArgs = parseCategoryListArgs(subArgs);
        result = await runCategoryList(client, opts, categoryListArgs);
        break;
      }
      case 'category-create': {
        const categoryCreateArgs = parseCategoryCreateArgs(subArgs);
        result = await runCategoryCreate(client, opts, categoryCreateArgs);
        break;
      }
      case 'category-get': {
        const categoryGetArgs = parseCategoryGetArgs(subArgs);
        result = await runCategoryGet(client, opts, categoryGetArgs);
        break;
      }
      case 'category-update': {
        const categoryUpdateArgs = parseCategoryUpdateArgs(subArgs);
        result = await runCategoryUpdate(client, opts, categoryUpdateArgs);
        break;
      }
      case 'category-delete': {
        const categoryDeleteArgs = parseCategoryDeleteArgs(subArgs);
        result = await runCategoryDelete(client, opts, categoryDeleteArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown sprint subcommand: ${subcommand}. Use sprint --help for usage.`);
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

shared.registerModule('sprint', {
  name: 'sprint',
  description: 'Manage PingCode sprints (iterations)',
  run,
});

module.exports = { run, printHelp };
