'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode config — Manage PingCode configuration (types, states, priorities, properties, processes)',
    '',
    'Usage: pingcode config <subcommand> [options]',
    '',
    'Work item types (/v1/pjm/work_item_types):',
    '  type-list-all               List all work item types',
    '  type-create --name NAME --group GROUP',
    '                              Create a work item type',
    '  type-get <type_id>          Get one work item type',
    '  type-update <type_id> --name NAME',
    '                              Rename a work item type',
    '  type-delete <type_id>       Delete a work item type',
    '',
    'Work item states (/v1/pjm/work_item_states):',
    '  state-list                  List all work item states',
    '  state-create --name NAME --type TYPE',
    '                              Create a work item state',
    '  state-get <state_id>        Get one work item state',
    '  state-update <state_id> [--name NAME] [--type TYPE]',
    '                              Partially update a non-system work item state',
    '',
    'Priorities (/v1/pjm/work_item_priorities):',
    '  priority-get <priority_id>  Get one work item priority',
    '',
    'Work item properties (/v1/pjm/work_item_properties):',
    '  property-list               List all work item properties',
    '  property-create --name NAME --type TYPE [--options JSON]',
    '                              Create a work item property',
    '  property-get <property_id>  Get one work item property',
    '  property-update <property_id> [--name NAME] [--options JSON]',
    '                              Partially update a work item property',
    '',
    'Processes (/v1/pjm/processes):',
    '  process-list                List all project processes',
    '  process-get <process_id>    Get one project process',
    '',
    'Project states (/v1/pjm/project_states):',
    '  project-state-get <state_id>',
    '                              Get one project state',
    '',
    'Global project properties (/v1/pjm/project_properties):',
    '  project-property-list       List all global project properties',
    '  project-property-create --name NAME --type TYPE [--options JSON]',
    '                              Create a global project property',
    '  project-property-get <property_id>',
    '                              Get one global project property',
    '  project-property-update <property_id> [--name NAME] [--options JSON]',
    '                              Partially update a global project property',
    '',
    'Notes:',
    '  - The official API documents only single-resource GETs for priorities and',
    '    project states (no list endpoints), and no delete endpoints for work item',
    '    states, work item properties, or global project properties.',
    '  - Only non-system work item states can be updated.',
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
    case 'type-list-all':
      console.log([
        'Usage: pingcode config type-list-all',
        '',
        'List all work item types.',
      ].join('\n'));
      break;
    case 'type-create':
      console.log([
        'Usage: pingcode config type-create --name NAME --group GROUP',
        '',
        'Create a work item type. The name must be unique within the enterprise.',
        '',
        'Options:',
        '  --name NAME               Work item type name (required)',
        '  --group GROUP             Work item type group (required); allowed values:',
        '                            requirement, task, bug, issue, plan',
      ].join('\n'));
      break;
    case 'type-get':
      console.log([
        'Usage: pingcode config type-get <work_item_type_id>',
        '',
        'Get one work item type.',
      ].join('\n'));
      break;
    case 'type-update':
      console.log([
        'Usage: pingcode config type-update <work_item_type_id> --name NAME',
        '',
        'Rename a work item type. The name must be unique within the enterprise.',
        '',
        'Options:',
        '  --name NAME               New work item type name (required)',
      ].join('\n'));
      break;
    case 'type-delete':
      console.log([
        'Usage: pingcode config type-delete <work_item_type_id>',
        '',
        'Delete a work item type.',
      ].join('\n'));
      break;
    case 'state-list':
      console.log([
        'Usage: pingcode config state-list',
        '',
        'List all work item states.',
      ].join('\n'));
      break;
    case 'state-create':
      console.log([
        'Usage: pingcode config state-create --name NAME --type TYPE',
        '',
        'Create a work item state. The name must be unique within the enterprise.',
        '',
        'Options:',
        '  --name NAME               Work item state name (required)',
        '  --type TYPE               Work item state type (required); allowed values:',
        '                            pending, in_progress, completed, closed',
      ].join('\n'));
      break;
    case 'state-get':
      console.log([
        'Usage: pingcode config state-get <state_id>',
        '',
        'Get one work item state.',
      ].join('\n'));
      break;
    case 'state-update':
      console.log([
        'Usage: pingcode config state-update <state_id> [--name NAME] [--type TYPE]',
        '',
        'Partially update a work item state. Only non-system states can be updated.',
        '',
        'Options:',
        '  --name NAME               New work item state name',
        '  --type TYPE               New work item state type; allowed values:',
        '                            pending, in_progress, completed, closed',
      ].join('\n'));
      break;
    case 'priority-get':
      console.log([
        'Usage: pingcode config priority-get <priority_id>',
        '',
        'Get one work item priority.',
      ].join('\n'));
      break;
    case 'property-list':
      console.log([
        'Usage: pingcode config property-list',
        '',
        'List all work item properties.',
      ].join('\n'));
      break;
    case 'property-create':
      console.log([
        'Usage: pingcode config property-create --name NAME --type TYPE [--options JSON]',
        '',
        'Create a work item property. The name must be unique within the enterprise.',
        '',
        'Options:',
        '  --name NAME               Work item property name (required)',
        '  --type TYPE               Work item property type (required); allowed values:',
        '                            text, textarea, select, multi_select, cascade_select,',
        '                            cascade_multi_select, member, members, date, number,',
        '                            progress, rate, link',
        '  --options JSON            Options as a JSON array, e.g.',
        '                            \'[{"text":"High"},{"text":"Low"}]\'; available for',
        '                            select, multi_select, cascade_select,',
        '                            cascade_multi_select; entries accept _id and parent_id',
        '                            (parent_id builds cascade hierarchy, up to 4 levels)',
      ].join('\n'));
      break;
    case 'property-get':
      console.log([
        'Usage: pingcode config property-get <property_id>',
        '',
        'Get one work item property.',
      ].join('\n'));
      break;
    case 'property-update':
      console.log([
        'Usage: pingcode config property-update <property_id> [--name NAME] [--options JSON]',
        '',
        'Partially update a work item property. Options are replaced wholesale.',
        '',
        'Options:',
        '  --name NAME               New work item property name',
        '  --options JSON            Options as a JSON array (replaces all options)',
      ].join('\n'));
      break;
    case 'process-list':
      console.log([
        'Usage: pingcode config process-list',
        '',
        'List all project processes.',
      ].join('\n'));
      break;
    case 'process-get':
      console.log([
        'Usage: pingcode config process-get <process_id>',
        '',
        'Get one project process.',
      ].join('\n'));
      break;
    case 'project-state-get':
      console.log([
        'Usage: pingcode config project-state-get <state_id>',
        '',
        'Get one project state.',
      ].join('\n'));
      break;
    case 'project-property-list':
      console.log([
        'Usage: pingcode config project-property-list',
        '',
        'List all global project properties.',
      ].join('\n'));
      break;
    case 'project-property-create':
      console.log([
        'Usage: pingcode config project-property-create --name NAME --type TYPE [--options JSON]',
        '',
        'Create a global project property. The name must be unique within the enterprise.',
        '',
        'Options:',
        '  --name NAME               Project property name (required)',
        '  --type TYPE               Project property type (required); allowed values:',
        '                            text, textarea, select, multi_select, cascade_select,',
        '                            cascade_multi_select, member, members, date, number,',
        '                            progress, rate, link',
        '  --options JSON            Options as a JSON array, e.g.',
        '                            \'[{"text":"High"},{"text":"Low"}]\'; available for',
        '                            select, multi_select, cascade_select,',
        '                            cascade_multi_select; entries accept _id and parent_id',
        '                            (parent_id builds cascade hierarchy, up to 4 levels)',
      ].join('\n'));
      break;
    case 'project-property-get':
      console.log([
        'Usage: pingcode config project-property-get <property_id>',
        '',
        'Get one global project property.',
      ].join('\n'));
      break;
    case 'project-property-update':
      console.log([
        'Usage: pingcode config project-property-update <property_id> [--name NAME] [--options JSON]',
        '',
        'Partially update a global project property. Options are replaced wholesale.',
        '',
        'Options:',
        '  --name NAME               New project property name',
        '  --options JSON            Options as a JSON array (replaces all options)',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Shared parsing helpers ─────────────────────────────────────────────

const TYPE_CREATE_FLAGS = { '--name': 'name', '--group': 'group' };
const TYPE_UPDATE_FLAGS = { '--name': 'name' };
const STATE_CREATE_FLAGS = { '--name': 'name', '--type': 'type' };
const STATE_UPDATE_FLAGS = { '--name': 'name', '--type': 'type' };
const PROPERTY_CREATE_FLAGS = { '--name': 'name', '--type': 'type', '--options': 'options' };
const PROPERTY_UPDATE_FLAGS = { '--name': 'name', '--options': 'options' };

function parseFieldArgs(tokens, subcommand, allowedFlags, allowTarget = true) {
  const args = { target: null };
  for (const key of Object.values(allowedFlags)) args[key] = null;

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (allowTarget && args.target === null) {
        args.target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use config ${subcommand} --help for usage.`);
    }
    if (arg in allowedFlags) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[allowedFlags[arg]] = tokens[i + 1];
      i += 1;
    } else if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const flag = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (flag in allowedFlags) {
          args[allowedFlags[flag]] = value;
        } else {
          throw new core.PingCodeError(`Unknown option: ${flag}. Use config ${subcommand} --help for usage.`);
        }
      } else if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        continue;
      } else if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
        i += 1;
        continue;
      } else {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use config ${subcommand} --help for usage.`);
      }
    }
  }
  return args;
}

function requireNonEmpty(value, label, subcommand) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new core.PingCodeError(`${label} is required and must be non-empty. Use config ${subcommand} --help for usage.`);
  }
  return value;
}

function requireTarget(value, label, subcommand) {
  if (!value) {
    throw new core.PingCodeError(`A ${label} is required. Use config ${subcommand} --help for usage.`);
  }
  return value;
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

function sortedBody(body) {
  const result = {};
  for (const k of Object.keys(body).sort()) result[k] = body[k];
  return result;
}

// ── Work item types ────────────────────────────────────────────────────

async function runTypeListAll(client, opts) {
  return await client.request(
    'GET',
    '/v1/pjm/work_item_types',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTypeCreateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'type-create', TYPE_CREATE_FLAGS);
  requireNonEmpty(args.name, '--name', 'type-create');
  requireNonEmpty(args.group, '--group', 'type-create');
  return args;
}

async function runTypeCreate(client, opts, args) {
  const body = { name: args.name, group: args.group };
  return await client.request(
    'POST',
    '/v1/pjm/work_item_types',
    null,
    sortedBody(body),
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

async function runTypeGet(client, opts, args) {
  const typeId = requireTarget(args.target, 'work item type id', 'type-get');
  return await client.request(
    'GET',
    `/v1/pjm/work_item_types/${typeId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTypeUpdateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'type-update', TYPE_UPDATE_FLAGS);
  requireTarget(args.target, 'work item type id', 'type-update');
  requireNonEmpty(args.name, '--name', 'type-update');
  return args;
}

async function runTypeUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    `/v1/pjm/work_item_types/${args.target}`,
    null,
    sortedBody({ name: args.name }),
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

async function runTypeDelete(client, opts, args) {
  const typeId = requireTarget(args.target, 'work item type id', 'type-delete');
  return await client.request(
    'DELETE',
    `/v1/pjm/work_item_types/${typeId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Work item states ───────────────────────────────────────────────────

async function runStateList(client, opts) {
  return await client.request(
    'GET',
    '/v1/pjm/work_item_states',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseStateCreateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'state-create', STATE_CREATE_FLAGS);
  requireNonEmpty(args.name, '--name', 'state-create');
  requireNonEmpty(args.type, '--type', 'state-create');
  return args;
}

async function runStateCreate(client, opts, args) {
  const body = { name: args.name, type: args.type };
  return await client.request(
    'POST',
    '/v1/pjm/work_item_states',
    null,
    sortedBody(body),
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

async function runStateGet(client, opts, args) {
  const stateId = requireTarget(args.target, 'work item state id', 'state-get');
  return await client.request(
    'GET',
    `/v1/pjm/work_item_states/${stateId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseStateUpdateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'state-update', STATE_UPDATE_FLAGS);
  requireTarget(args.target, 'work item state id', 'state-update');
  const hasUpdateField = args.name !== null || args.type !== null;
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use config state-update --help for usage.');
  }
  return args;
}

async function runStateUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) body.name = args.name;
  if (args.type !== null) body.type = args.type;
  return await client.request(
    'PATCH',
    `/v1/pjm/work_item_states/${args.target}`,
    null,
    sortedBody(body),
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Work item priorities ───────────────────────────────────────────────

async function runPriorityGet(client, opts, args) {
  const priorityId = requireTarget(args.target, 'work item priority id', 'priority-get');
  return await client.request(
    'GET',
    `/v1/pjm/work_item_priorities/${priorityId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Work item properties ───────────────────────────────────────────────

async function runPropertyList(client, opts) {
  return await client.request(
    'GET',
    '/v1/pjm/work_item_properties',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePropertyCreateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'property-create', PROPERTY_CREATE_FLAGS);
  requireNonEmpty(args.name, '--name', 'property-create');
  requireNonEmpty(args.type, '--type', 'property-create');
  return args;
}

async function runPropertyCreate(client, opts, args) {
  const body = { name: args.name, type: args.type };
  if (args.options) body.options = parseJsonArray(args.options, '--options');
  return await client.request(
    'POST',
    '/v1/pjm/work_item_properties',
    null,
    sortedBody(body),
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

async function runPropertyGet(client, opts, args) {
  const propertyId = requireTarget(args.target, 'work item property id', 'property-get');
  return await client.request(
    'GET',
    `/v1/pjm/work_item_properties/${propertyId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePropertyUpdateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'property-update', PROPERTY_UPDATE_FLAGS);
  requireTarget(args.target, 'work item property id', 'property-update');
  const hasUpdateField = args.name !== null || args.options !== null;
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use config property-update --help for usage.');
  }
  return args;
}

async function runPropertyUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) body.name = args.name;
  if (args.options !== null) body.options = parseJsonArray(args.options, '--options');
  return await client.request(
    'PATCH',
    `/v1/pjm/work_item_properties/${args.target}`,
    null,
    sortedBody(body),
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Processes ──────────────────────────────────────────────────────────

async function runProcessList(client, opts) {
  return await client.request(
    'GET',
    '/v1/pjm/processes',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runProcessGet(client, opts, args) {
  const processId = requireTarget(args.target, 'project process id', 'process-get');
  return await client.request(
    'GET',
    `/v1/pjm/processes/${processId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Project states ─────────────────────────────────────────────────────

async function runProjectStateGet(client, opts, args) {
  const stateId = requireTarget(args.target, 'project state id', 'project-state-get');
  return await client.request(
    'GET',
    `/v1/pjm/project_states/${stateId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Global project properties ──────────────────────────────────────────

async function runProjectPropertyList(client, opts) {
  return await client.request(
    'GET',
    '/v1/pjm/project_properties',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseProjectPropertyCreateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'project-property-create', PROPERTY_CREATE_FLAGS);
  requireNonEmpty(args.name, '--name', 'project-property-create');
  requireNonEmpty(args.type, '--type', 'project-property-create');
  return args;
}

async function runProjectPropertyCreate(client, opts, args) {
  const body = { name: args.name, type: args.type };
  if (args.options) body.options = parseJsonArray(args.options, '--options');
  return await client.request(
    'POST',
    '/v1/pjm/project_properties',
    null,
    sortedBody(body),
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

async function runProjectPropertyGet(client, opts, args) {
  const propertyId = requireTarget(args.target, 'project property id', 'project-property-get');
  return await client.request(
    'GET',
    `/v1/pjm/project_properties/${propertyId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseProjectPropertyUpdateArgs(tokens) {
  const args = parseFieldArgs(tokens, 'project-property-update', PROPERTY_UPDATE_FLAGS);
  requireTarget(args.target, 'project property id', 'project-property-update');
  const hasUpdateField = args.name !== null || args.options !== null;
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use config project-property-update --help for usage.');
  }
  return args;
}

async function runProjectPropertyUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) body.name = args.name;
  if (args.options !== null) body.options = parseJsonArray(args.options, '--options');
  return await client.request(
    'PATCH',
    `/v1/pjm/project_properties/${args.target}`,
    null,
    sortedBody(body),
    { dry_run: opts.dry_run, use_workspace_cache: false },
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
      case 'type-list-all': {
        parseFieldArgs(subArgs, 'type-list-all', {}, false);
        result = await runTypeListAll(client, opts);
        break;
      }
      case 'type-create': {
        const args = parseTypeCreateArgs(subArgs);
        result = await runTypeCreate(client, opts, args);
        break;
      }
      case 'type-get': {
        const args = parseFieldArgs(subArgs, 'type-get', {});
        result = await runTypeGet(client, opts, args);
        break;
      }
      case 'type-update': {
        const args = parseTypeUpdateArgs(subArgs);
        result = await runTypeUpdate(client, opts, args);
        break;
      }
      case 'type-delete': {
        const args = parseFieldArgs(subArgs, 'type-delete', {});
        result = await runTypeDelete(client, opts, args);
        break;
      }
      case 'state-list': {
        parseFieldArgs(subArgs, 'state-list', {}, false);
        result = await runStateList(client, opts);
        break;
      }
      case 'state-create': {
        const args = parseStateCreateArgs(subArgs);
        result = await runStateCreate(client, opts, args);
        break;
      }
      case 'state-get': {
        const args = parseFieldArgs(subArgs, 'state-get', {});
        result = await runStateGet(client, opts, args);
        break;
      }
      case 'state-update': {
        const args = parseStateUpdateArgs(subArgs);
        result = await runStateUpdate(client, opts, args);
        break;
      }
      case 'priority-get': {
        const args = parseFieldArgs(subArgs, 'priority-get', {});
        result = await runPriorityGet(client, opts, args);
        break;
      }
      case 'property-list': {
        parseFieldArgs(subArgs, 'property-list', {}, false);
        result = await runPropertyList(client, opts);
        break;
      }
      case 'property-create': {
        const args = parsePropertyCreateArgs(subArgs);
        result = await runPropertyCreate(client, opts, args);
        break;
      }
      case 'property-get': {
        const args = parseFieldArgs(subArgs, 'property-get', {});
        result = await runPropertyGet(client, opts, args);
        break;
      }
      case 'property-update': {
        const args = parsePropertyUpdateArgs(subArgs);
        result = await runPropertyUpdate(client, opts, args);
        break;
      }
      case 'process-list': {
        parseFieldArgs(subArgs, 'process-list', {}, false);
        result = await runProcessList(client, opts);
        break;
      }
      case 'process-get': {
        const args = parseFieldArgs(subArgs, 'process-get', {});
        result = await runProcessGet(client, opts, args);
        break;
      }
      case 'project-state-get': {
        const args = parseFieldArgs(subArgs, 'project-state-get', {});
        result = await runProjectStateGet(client, opts, args);
        break;
      }
      case 'project-property-list': {
        parseFieldArgs(subArgs, 'project-property-list', {}, false);
        result = await runProjectPropertyList(client, opts);
        break;
      }
      case 'project-property-create': {
        const args = parseProjectPropertyCreateArgs(subArgs);
        result = await runProjectPropertyCreate(client, opts, args);
        break;
      }
      case 'project-property-get': {
        const args = parseFieldArgs(subArgs, 'project-property-get', {});
        result = await runProjectPropertyGet(client, opts, args);
        break;
      }
      case 'project-property-update': {
        const args = parseProjectPropertyUpdateArgs(subArgs);
        result = await runProjectPropertyUpdate(client, opts, args);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown config subcommand: ${subcommand}. Use config --help for usage.`);
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

shared.registerModule('config', {
  name: 'config',
  description: 'Manage PingCode configuration (types, states, priorities, properties, processes)',
  run,
});

module.exports = { run, printHelp };
