'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

const SUBCOMMANDS = [
  'list', 'create', 'get', 'update', 'delete',
  'entry-list', 'entry-create', 'entry-get', 'entry-update', 'entry-delete',
  'swimlane-list', 'swimlane-create', 'swimlane-get', 'swimlane-update', 'swimlane-delete',
];

function printHelp() {
  console.log([
    'PingCode board — Manage PingCode boards (kanban boards, entries, swimlanes)',
    '',
    'Usage: pingcode board <subcommand> [options]',
    '',
    'Subcommands:',
    '  list <project_id>                     List boards of a project',
    '  create <project_id>                   Create a board',
    '  get <project_id> <board_id>           Show a board',
    '  update <project_id> <board_id>        Update a board',
    '  delete <project_id> <board_id>        Delete a board',
    '',
    '  entry-list <project_id> <board_id>              List board entries',
    '  entry-create <project_id> <board_id>            Create a board entry',
    '  entry-get <project_id> <board_id> <entry_id>    Show a board entry',
    '  entry-update <project_id> <board_id> <entry_id> Update a board entry',
    '  entry-delete <project_id> <board_id> <entry_id> Delete a board entry',
    '',
    '  swimlane-list <project_id> <board_id>                 List swimlanes',
    '  swimlane-create <project_id> <board_id>               Create a swimlane',
    '  swimlane-get <project_id> <board_id> <swimlane_id>    Show a swimlane',
    '  swimlane-update <project_id> <board_id> <swimlane_id> Update a swimlane',
    '  swimlane-delete <project_id> <board_id> <swimlane_id> Delete a swimlane',
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
    'Usage: pingcode board list <project_id> [options]',
    '',
    'List boards of a project.',
  ].join('\n'),
  'create': [
    'Usage: pingcode board create <project_id> --name NAME [options]',
    '',
    'Create a board.',
    '',
    'Options:',
    '  --name TEXT               Board name, unique per project (required)',
    '  --work-item-types JSON    JSON array of work item types, e.g. ["epic","story"]',
  ].join('\n'),
  'get': [
    'Usage: pingcode board get <project_id> <board_id> [options]',
    '',
    'Show a board.',
  ].join('\n'),
  'update': [
    'Usage: pingcode board update <project_id> <board_id> [options]',
    '',
    'Partially update a board.',
    '',
    'Options:',
    '  --name TEXT               New board name, unique per project',
    '  --work-item-types JSON    JSON array of work item types, e.g. ["epic","story"]',
  ].join('\n'),
  'delete': [
    'Usage: pingcode board delete <project_id> <board_id> [options]',
    '',
    'Delete a board.',
  ].join('\n'),
  'entry-list': [
    'Usage: pingcode board entry-list <project_id> <board_id> [options]',
    '',
    'List entries (columns) of a board.',
  ].join('\n'),
  'entry-create': [
    'Usage: pingcode board entry-create <project_id> <board_id> --name NAME [options]',
    '',
    'Create a board entry (column).',
    '',
    'Options:',
    '  --name TEXT               Entry name, unique per board (required)',
    '  --wip-limit N             Work in progress limit',
    '  --is-split                Split the entry into in-progress and completed;',
    '                            use --is-split=false to explicitly disable',
    '  --definition-of-done TEXT Definition of done',
  ].join('\n'),
  'entry-get': [
    'Usage: pingcode board entry-get <project_id> <board_id> <entry_id> [options]',
    '',
    'Show a board entry.',
  ].join('\n'),
  'entry-update': [
    'Usage: pingcode board entry-update <project_id> <board_id> <entry_id> [options]',
    '',
    'Partially update a board entry.',
    '',
    'Options:',
    '  --name TEXT               New entry name, unique per board',
    '  --wip-limit N             Work in progress limit',
    '  --is-split                Split the entry into in-progress and completed;',
    '                            use --is-split=false to explicitly disable',
    '  --definition-of-done TEXT Definition of done',
  ].join('\n'),
  'entry-delete': [
    'Usage: pingcode board entry-delete <project_id> <board_id> <entry_id> [options]',
    '',
    'Delete a board entry.',
  ].join('\n'),
  'swimlane-list': [
    'Usage: pingcode board swimlane-list <project_id> <board_id> [options]',
    '',
    'List swimlanes of a board.',
  ].join('\n'),
  'swimlane-create': [
    'Usage: pingcode board swimlane-create <project_id> <board_id> --name NAME',
    '',
    'Create a swimlane.',
    '',
    'Options:',
    '  --name TEXT               Swimlane name, unique per board (required)',
  ].join('\n'),
  'swimlane-get': [
    'Usage: pingcode board swimlane-get <project_id> <board_id> <swimlane_id> [options]',
    '',
    'Show a swimlane.',
  ].join('\n'),
  'swimlane-update': [
    'Usage: pingcode board swimlane-update <project_id> <board_id> <swimlane_id> [options]',
    '',
    'Partially update a swimlane.',
    '',
    'Options:',
    '  --name TEXT               New swimlane name, unique per board',
  ].join('\n'),
  'swimlane-delete': [
    'Usage: pingcode board swimlane-delete <project_id> <board_id> <swimlane_id> [options]',
    '',
    'Delete a swimlane.',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'list':
    case 'create':
    case 'get':
    case 'update':
    case 'delete':
    case 'entry-list':
    case 'entry-create':
    case 'entry-get':
    case 'entry-update':
    case 'entry-delete':
    case 'swimlane-list':
    case 'swimlane-create':
    case 'swimlane-get':
    case 'swimlane-update':
    case 'swimlane-delete':
      console.log(SUBCOMMAND_HELP[subcommand]);
      break;
    default:
      printHelp();
  }
}

// ── Argument parsing helpers ───────────────────────────────────────────

// spec: { positionals: ['project_id'], flags: {'--x': 'x'}, numbers: {'--n': 'n'},
//        jsonArrays: {'--a': 'a'}, booleans: {'--b': 'b'},
//        label: 'board-get', required: 'A project id is required.' }
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
        throw new core.PingCodeError(`Unknown option: ${flag}. Use board ${spec.label} --help for usage.`);
      }
    } else if (positionals.length < positionalCount) {
      positionals.push(arg);
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use board ${spec.label} --help for usage.`);
    }
  }

  (spec.positionals || []).forEach((name, index) => {
    args[name] = positionals[index] || null;
  });
  if (spec.required && positionals.length < positionalCount) {
    throw new core.PingCodeError(`${spec.required} Use board ${spec.label} --help for usage.`);
  }
  return args;
}

function requireFlags(args, requirements, label) {
  for (const [key, [flag, desc]] of Object.entries(requirements)) {
    if (args[key] === null || args[key] === undefined || args[key] === '') {
      throw new core.PingCodeError(`${flag} is required and must be ${desc}. Use board ${label} --help for usage.`);
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

// ── Board subcommands ──────────────────────────────────────────────────

function parseListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id'],
    label: 'list',
    required: 'A project id is required.',
  });
}

async function runList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/boards`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['project_id'],
    flags: {
      '--name': 'name',
    },
    jsonArrays: {
      '--work-item-types': 'work_item_types',
    },
    label: 'create',
    required: 'A project id is required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'create');
  return args;
}

async function runCreate(client, opts, args) {
  const body = { name: args.name };
  if (args.work_item_types) body.work_item_types = args.work_item_types;

  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.project_id}/boards`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id'],
    label: 'get',
    required: 'A project id and a board id are required.',
  });
}

async function runGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id'],
    flags: {
      '--name': 'name',
    },
    jsonArrays: {
      '--work-item-types': 'work_item_types',
    },
    label: 'update',
    required: 'A project id and a board id are required.',
  });
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.work_item_types) body.work_item_types = args.work_item_types;

  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id'],
    label: 'delete',
    required: 'A project id and a board id are required.',
  });
}

async function runDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Board entry subcommands ────────────────────────────────────────────

function parseEntryListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id'],
    label: 'entry-list',
    required: 'A project id and a board id are required.',
  });
}

async function runEntryList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/entries`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEntryCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['project_id', 'board_id'],
    flags: {
      '--name': 'name',
      '--definition-of-done': 'definition_of_done',
    },
    numbers: {
      '--wip-limit': 'wip_limit',
    },
    booleans: {
      '--is-split': 'is_split',
    },
    label: 'entry-create',
    required: 'A project id and a board id are required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'entry-create');
  return args;
}

async function runEntryCreate(client, opts, args) {
  const body = { name: args.name };
  if (args.wip_limit !== null) body.wip_limit = args.wip_limit;
  if (args.is_split !== null) body.is_split = args.is_split;
  if (args.definition_of_done) body.definition_of_done = args.definition_of_done;

  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/entries`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEntryGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id', 'entry_id'],
    label: 'entry-get',
    required: 'A project id, a board id, and an entry id are required.',
  });
}

async function runEntryGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/entries/${args.entry_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEntryUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id', 'entry_id'],
    flags: {
      '--name': 'name',
      '--definition-of-done': 'definition_of_done',
    },
    numbers: {
      '--wip-limit': 'wip_limit',
    },
    booleans: {
      '--is-split': 'is_split',
    },
    label: 'entry-update',
    required: 'A project id, a board id, and an entry id are required.',
  });
}

async function runEntryUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.wip_limit !== null) body.wip_limit = args.wip_limit;
  if (args.is_split !== null) body.is_split = args.is_split;
  if (args.definition_of_done) body.definition_of_done = args.definition_of_done;

  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/entries/${args.entry_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseEntryDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id', 'entry_id'],
    label: 'entry-delete',
    required: 'A project id, a board id, and an entry id are required.',
  });
}

async function runEntryDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/entries/${args.entry_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Swimlane subcommands ───────────────────────────────────────────────

function parseSwimlaneListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id'],
    label: 'swimlane-list',
    required: 'A project id and a board id are required.',
  });
}

async function runSwimlaneList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/swimlanes`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSwimlaneCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['project_id', 'board_id'],
    flags: {
      '--name': 'name',
    },
    label: 'swimlane-create',
    required: 'A project id and a board id are required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'swimlane-create');
  return args;
}

async function runSwimlaneCreate(client, opts, args) {
  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/swimlanes`,
    null,
    { name: args.name },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSwimlaneGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id', 'swimlane_id'],
    label: 'swimlane-get',
    required: 'A project id, a board id, and a swimlane id are required.',
  });
}

async function runSwimlaneGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/swimlanes/${args.swimlane_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSwimlaneUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id', 'swimlane_id'],
    flags: {
      '--name': 'name',
    },
    label: 'swimlane-update',
    required: 'A project id, a board id, and a swimlane id are required.',
  });
}

async function runSwimlaneUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;

  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/swimlanes/${args.swimlane_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSwimlaneDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['project_id', 'board_id', 'swimlane_id'],
    label: 'swimlane-delete',
    required: 'A project id, a board id, and a swimlane id are required.',
  });
}

async function runSwimlaneDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.project_id}/boards/${args.board_id}/swimlanes/${args.swimlane_id}`,
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
      case 'delete': {
        const deleteArgs = parseDeleteArgs(subArgs);
        result = await runDelete(client, opts, deleteArgs);
        break;
      }
      case 'entry-list': {
        const entryListArgs = parseEntryListArgs(subArgs);
        result = await runEntryList(client, opts, entryListArgs);
        break;
      }
      case 'entry-create': {
        const entryCreateArgs = parseEntryCreateArgs(subArgs);
        result = await runEntryCreate(client, opts, entryCreateArgs);
        break;
      }
      case 'entry-get': {
        const entryGetArgs = parseEntryGetArgs(subArgs);
        result = await runEntryGet(client, opts, entryGetArgs);
        break;
      }
      case 'entry-update': {
        const entryUpdateArgs = parseEntryUpdateArgs(subArgs);
        result = await runEntryUpdate(client, opts, entryUpdateArgs);
        break;
      }
      case 'entry-delete': {
        const entryDeleteArgs = parseEntryDeleteArgs(subArgs);
        result = await runEntryDelete(client, opts, entryDeleteArgs);
        break;
      }
      case 'swimlane-list': {
        const swimlaneListArgs = parseSwimlaneListArgs(subArgs);
        result = await runSwimlaneList(client, opts, swimlaneListArgs);
        break;
      }
      case 'swimlane-create': {
        const swimlaneCreateArgs = parseSwimlaneCreateArgs(subArgs);
        result = await runSwimlaneCreate(client, opts, swimlaneCreateArgs);
        break;
      }
      case 'swimlane-get': {
        const swimlaneGetArgs = parseSwimlaneGetArgs(subArgs);
        result = await runSwimlaneGet(client, opts, swimlaneGetArgs);
        break;
      }
      case 'swimlane-update': {
        const swimlaneUpdateArgs = parseSwimlaneUpdateArgs(subArgs);
        result = await runSwimlaneUpdate(client, opts, swimlaneUpdateArgs);
        break;
      }
      case 'swimlane-delete': {
        const swimlaneDeleteArgs = parseSwimlaneDeleteArgs(subArgs);
        result = await runSwimlaneDelete(client, opts, swimlaneDeleteArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown board subcommand: ${subcommand}. Use board --help for usage.`);
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

shared.registerModule('board', {
  name: 'board',
  description: 'Manage PingCode boards (kanban boards, entries, swimlanes)',
  run,
});

module.exports = { run, printHelp };
