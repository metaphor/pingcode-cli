'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode project — Manage PingCode projects',
    '',
    'Usage: pingcode project <subcommand> [options]',
    '',
    'Subcommands:',
    '  create [options]            Create a project',
    '  get <id> [options]          Show a single project',
    '  update <id> [options]       Partially update a project',
    '  clone <id> [options]        Clone a project',
    '  progress <id>               Show project progress statistics',
    '  project-states <id>         List states available to a project',
    '',
    '  member-add <project-id> <member-id> [options]',
    '                              Add a member to a project',
    '  member-get <project-id> <member-id>',
    '                              Show a single project member',
    '  member-update <project-id> <member-id> --role-id ID',
    '                              Update a project member role',
    '  member-list <project-id>    List project members',
    '  member-remove <project-id> <member-id>',
    '                              Remove a project member',
    '',
    '  prop-add <project-id> <property-id>',
    '                              Attach a property to a project',
    '  prop-get <project-id> <property-id>',
    '                              Show a project property',
    '  prop-list <project-id>      List project properties',
    '  prop-remove <project-id> <property-id>',
    '                              Detach a property from a project',
    '',
    '  local-config-enable <project-id>',
    '                              Enable local configuration for a project',
    '',
    'Examples:',
    '  # 新建 Scrum 项目',
    '  pingcode project create --type scrum --name 示例项目 --identifier DEMO',
    '  # 查看项目进度统计',
    '  pingcode project progress PROJECT_ID --compact',
    '  # 列出项目成员',
    '  pingcode project member-list PROJECT_ID --compact',
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
        'Usage: pingcode project create [options]',
        '',
        'Create a project.',
        '',
        'Options:',
        '  --type TYPE               Project type (required): kanban, scrum, waterfall, hybrid',
        '  --name TEXT               Project name (required)',
        '  --identifier TEXT         Unique project identifier (required, max 15 chars)',
        '  --process-id ID           Project process id',
        '  --scope-type TYPE         organization (default) or user_group',
        '  --scope-id ID             Team id when --scope-type is user_group',
        '  --visibility VIS          public or private (default private)',
        '  --description TEXT        Project description',
        '  --members JSON            JSON array: [{"id":"...","type":"user|user_group"}]',
        '  --start-at SECONDS        Project start time (unix seconds)',
        '  --end-at SECONDS          Project end time (unix seconds)',
        '  --assignee-id ID          Project owner user id',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode project get <id> [options]',
        '',
        'Show a single project by id.',
        '',
        'Options:',
        '  --include-deleted         Include deleted projects',
        '  --include-archived        Include archived projects',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode project update <id> [options]',
        '',
        'Partially update a project. At least one field is required.',
        '',
        'Options:',
        '  --name TEXT               Project name',
        '  --identifier TEXT         Unique project identifier',
        '  --description TEXT        Project description',
        '  --start-at SECONDS        Project start time (unix seconds)',
        '  --end-at SECONDS          Project end time (unix seconds)',
        '  --assignee-id ID          Project owner user id',
        '  --state-id ID             Project state id',
        '  --properties JSON         JSON object of custom property values',
      ].join('\n'));
      break;
    case 'clone':
      console.log([
        'Usage: pingcode project clone <id> [options]',
        '',
        'Clone a project.',
        '',
        'Options:',
        '  --identifier TEXT         Unique identifier for the clone (required)',
        '  --scope-type TYPE         organization or user_group (default: source value)',
        '  --scope-id ID             Team id when --scope-type is user_group',
        '  --name TEXT               Project name (default: source value)',
        '  --visibility VIS          public or private (default: source value)',
        '  --description TEXT        Project description (default: source value)',
        '  --members JSON            JSON array: [{"id":"...","type":"user|user_group"}] (default: source value)',
      ].join('\n'));
      break;
    case 'progress':
      console.log([
        'Usage: pingcode project progress <id>',
        '',
        'Show work item progress statistics for a project.',
      ].join('\n'));
      break;
    case 'project-states':
      console.log([
        'Usage: pingcode project project-states <id>',
        '',
        'List the project states available to a project.',
      ].join('\n'));
      break;
    case 'member-add':
      console.log([
        'Usage: pingcode project member-add <project-id> <member-id> [options]',
        '',
        'Add a member (user or user group) to a project.',
        '',
        'Options:',
        '  --type TYPE               Member type: user (default) or user_group',
        '  --role-id ID              Role id assigned to the member',
      ].join('\n'));
      break;
    case 'member-get':
      console.log([
        'Usage: pingcode project member-get <project-id> <member-id>',
        '',
        'Show a single project member.',
      ].join('\n'));
      break;
    case 'member-update':
      console.log([
        'Usage: pingcode project member-update <project-id> <member-id> --role-id ID',
        '',
        'Update a project member role.',
        '',
        'Options:',
        '  --role-id ID              New role id (required)',
      ].join('\n'));
      break;
    case 'member-list':
      console.log([
        'Usage: pingcode project member-list <project-id>',
        '',
        'List project members.',
      ].join('\n'));
      break;
    case 'member-remove':
      console.log([
        'Usage: pingcode project member-remove <project-id> <member-id>',
        '',
        'Remove a member from a project.',
      ].join('\n'));
      break;
    case 'prop-add':
      console.log([
        'Usage: pingcode project prop-add <project-id> <property-id>',
        '',
        'Attach a project property to a project.',
      ].join('\n'));
      break;
    case 'prop-get':
      console.log([
        'Usage: pingcode project prop-get <project-id> <property-id>',
        '',
        'Show a single project property.',
      ].join('\n'));
      break;
    case 'prop-list':
      console.log([
        'Usage: pingcode project prop-list <project-id>',
        '',
        'List project properties.',
      ].join('\n'));
      break;
    case 'prop-remove':
      console.log([
        'Usage: pingcode project prop-remove <project-id> <property-id>',
        '',
        'Detach a project property from a project.',
      ].join('\n'));
      break;
    case 'local-config-enable':
      console.log([
        'Usage: pingcode project local-config-enable <project-id>',
        '',
        'Enable local configuration for a project.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Argument parsing ───────────────────────────────────────────────────

function parseNumber(value, label) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new core.PingCodeError(`${label} must be a number`);
  }
  return parsed;
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

function requireFlag(value, flag, subcommand) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new core.PingCodeError(`${flag} is required and must be non-empty. Use project ${subcommand} --help for usage.`);
  }
  return value;
}

function parseSubArgs(tokens, subcommand, spec) {
  const flags = spec.flags || {};
  const numbers = spec.numbers || {};
  const jsonObjects = spec.jsonObjects || {};
  const jsonArrays = spec.jsonArrays || {};
  const booleans = spec.booleans || {};
  const valueFlags = { ...flags, ...numbers, ...jsonObjects, ...jsonArrays };
  const numberKeys = new Set(Object.values(numbers));
  const arrayKeys = new Set(Object.values(jsonArrays));
  const objectKeys = new Set(Object.values(jsonObjects));

  const args = {};
  for (const key of Object.values(valueFlags)) args[key] = null;
  for (const key of Object.values(booleans)) args[key] = false;

  const positionals = [];
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
          args[key] = parseNumber(value, flag);
        } else if (arrayKeys.has(key)) {
          args[key] = parseJsonArray(value, flag);
        } else if (objectKeys.has(key)) {
          args[key] = core.parseJsonObject(value, flag);
        } else {
          args[key] = value;
        }
      } else if (flag in booleans) {
        if (inlineValue === undefined) {
          args[booleans[flag]] = true;
        } else {
          args[booleans[flag]] = inlineValue === 'true';
        }
      } else if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        // Global boolean flag (e.g. --dry-run); handled by parseGlobalOptions.
      } else {
        throw new core.PingCodeError(`Unknown option: ${flag}. Use project ${subcommand} --help for usage.`);
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, args };
}

function parseSingleIdArgs(tokens, subcommand, spec) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, spec);
  if (positionals.length === 0) {
    throw new core.PingCodeError(`A project id is required. Use project ${subcommand} --help for usage.`);
  }
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use project ${subcommand} --help for usage.`);
  }
  args.project_id = positionals[0];
  return args;
}

function parseDoubleIdArgs(tokens, subcommand, spec, secondKey, secondLabel) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, spec);
  if (positionals.length === 0) {
    throw new core.PingCodeError(`A project id is required. Use project ${subcommand} --help for usage.`);
  }
  if (positionals.length === 1) {
    throw new core.PingCodeError(`A ${secondLabel} is required. Use project ${subcommand} --help for usage.`);
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use project ${subcommand} --help for usage.`);
  }
  args.project_id = positionals[0];
  args[secondKey] = positionals[1];
  return args;
}

// ── Create subcommand ──────────────────────────────────────────────────

function parseCreateArgs(tokens) {
  const { positionals, args } = parseSubArgs(tokens, 'create', {
    flags: {
      '--type': 'type',
      '--name': 'name',
      '--identifier': 'identifier',
      '--process-id': 'process_id',
      '--scope-type': 'scope_type',
      '--scope-id': 'scope_id',
      '--visibility': 'visibility',
      '--description': 'description',
      '--assignee-id': 'assignee_id',
    },
    numbers: {
      '--start-at': 'start_at',
      '--end-at': 'end_at',
    },
    jsonArrays: {
      '--members': 'members',
    },
  });
  if (positionals.length > 0) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[0]}. Use project create --help for usage.`);
  }
  requireFlag(args.type, '--type', 'create');
  requireFlag(args.name, '--name', 'create');
  requireFlag(args.identifier, '--identifier', 'create');
  return args;
}

async function runCreate(client, opts, args) {
  const body = {};
  if (args.type) body.type = args.type;
  if (args.process_id) body.process_id = args.process_id;
  if (args.scope_type) body.scope_type = args.scope_type;
  if (args.scope_id) body.scope_id = args.scope_id;
  if (args.name) body.name = args.name;
  if (args.visibility) body.visibility = args.visibility;
  if (args.identifier) body.identifier = args.identifier;
  if (args.description) body.description = args.description;
  if (args.members) body.members = args.members;
  if (args.start_at !== null) body.start_at = args.start_at;
  if (args.end_at !== null) body.end_at = args.end_at;
  if (args.assignee_id) body.assignee_id = args.assignee_id;

  return await client.request(
    'POST',
    '/v1/pjm/projects',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Get subcommand ─────────────────────────────────────────────────────

function parseGetArgs(tokens) {
  return parseSingleIdArgs(tokens, 'get', {
    booleans: {
      '--include-deleted': 'include_deleted',
      '--include-archived': 'include_archived',
    },
  });
}

async function runGet(client, opts, args) {
  const params = {};
  if (args.include_deleted) params.include_deleted = true;
  if (args.include_archived) params.include_archived = true;

  return await client.request(
    'GET',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Update subcommand ──────────────────────────────────────────────────

function parseUpdateArgs(tokens) {
  const args = parseSingleIdArgs(tokens, 'update', {
    flags: {
      '--name': 'name',
      '--identifier': 'identifier',
      '--description': 'description',
      '--assignee-id': 'assignee_id',
      '--state-id': 'state_id',
    },
    numbers: {
      '--start-at': 'start_at',
      '--end-at': 'end_at',
    },
    jsonObjects: {
      '--properties': 'properties',
    },
  });

  const hasUpdateField = Object.entries(args).some(
    ([key, value]) => key !== 'project_id' && value !== null,
  );
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use project update --help for usage.');
  }
  return args;
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.identifier) body.identifier = args.identifier;
  if (args.description) body.description = args.description;
  if (args.start_at !== null) body.start_at = args.start_at;
  if (args.end_at !== null) body.end_at = args.end_at;
  if (args.assignee_id) body.assignee_id = args.assignee_id;
  if (args.state_id) body.state_id = args.state_id;
  if (args.properties) body.properties = args.properties;

  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Clone subcommand ───────────────────────────────────────────────────

function parseCloneArgs(tokens) {
  const args = parseSingleIdArgs(tokens, 'clone', {
    flags: {
      '--identifier': 'identifier',
      '--scope-type': 'scope_type',
      '--scope-id': 'scope_id',
      '--name': 'name',
      '--visibility': 'visibility',
      '--description': 'description',
    },
    jsonArrays: {
      '--members': 'members',
    },
  });

  requireFlag(args.identifier, '--identifier', 'clone');
  return args;
}

async function runClone(client, opts, args) {
  const body = {};
  if (args.scope_type) body.scope_type = args.scope_type;
  if (args.scope_id) body.scope_id = args.scope_id;
  if (args.name) body.name = args.name;
  if (args.visibility) body.visibility = args.visibility;
  if (args.identifier) body.identifier = args.identifier;
  if (args.description) body.description = args.description;
  if (args.members) body.members = args.members;

  return await client.request(
    'POST',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/clone`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Progress subcommand ────────────────────────────────────────────────

function parseProgressArgs(tokens) {
  return parseSingleIdArgs(tokens, 'progress', {});
}

async function runProgress(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/progress`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Project states subcommand ──────────────────────────────────────────

function parseProjectStatesArgs(tokens) {
  return parseSingleIdArgs(tokens, 'project-states', {});
}

async function runProjectStates(client, opts, args) {
  return await client.request(
    'GET',
    '/v1/pjm/project/states',
    { project_id: args.project_id },
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Member subcommands ─────────────────────────────────────────────────

function parseMemberAddArgs(tokens) {
  const args = parseDoubleIdArgs(tokens, 'member-add', {
    flags: {
      '--type': 'member_type',
      '--role-id': 'role_id',
    },
  }, 'member_id', 'member id');
  if (!args.member_type) {
    args.member_type = 'user';
  }
  return args;
}

async function runMemberAdd(client, opts, args) {
  const body = {
    member: {
      id: args.member_id,
      type: args.member_type,
    },
  };
  if (args.role_id) body.role_id = args.role_id;

  return await client.request(
    'POST',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/members`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberGetArgs(tokens) {
  return parseDoubleIdArgs(tokens, 'member-get', {}, 'member_id', 'member id');
}

async function runMemberGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/members/${encodeURIComponent(args.member_id)}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberUpdateArgs(tokens) {
  const args = parseDoubleIdArgs(tokens, 'member-update', {
    flags: {
      '--role-id': 'role_id',
    },
  }, 'member_id', 'member id');
  requireFlag(args.role_id, '--role-id', 'member-update');
  return args;
}

async function runMemberUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/members/${encodeURIComponent(args.member_id)}`,
    null,
    { role_id: args.role_id },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberListArgs(tokens) {
  return parseSingleIdArgs(tokens, 'member-list', {});
}

async function runMemberList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/members`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberRemoveArgs(tokens) {
  return parseDoubleIdArgs(tokens, 'member-remove', {}, 'member_id', 'member id');
}

async function runMemberRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/members/${encodeURIComponent(args.member_id)}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Project property subcommands ───────────────────────────────────────

function parsePropAddArgs(tokens) {
  return parseDoubleIdArgs(tokens, 'prop-add', {}, 'property_id', 'property id');
}

async function runPropAdd(client, opts, args) {
  return await client.request(
    'POST',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/project_properties`,
    null,
    { property_id: args.property_id },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePropGetArgs(tokens) {
  return parseDoubleIdArgs(tokens, 'prop-get', {}, 'property_id', 'property id');
}

async function runPropGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/project_properties/${encodeURIComponent(args.property_id)}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePropListArgs(tokens) {
  return parseSingleIdArgs(tokens, 'prop-list', {});
}

async function runPropList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/project_properties`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePropRemoveArgs(tokens) {
  return parseDoubleIdArgs(tokens, 'prop-remove', {}, 'property_id', 'property id');
}

async function runPropRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/project_properties/${encodeURIComponent(args.property_id)}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Local config subcommand ────────────────────────────────────────────

function parseLocalConfigEnableArgs(tokens) {
  return parseSingleIdArgs(tokens, 'local-config-enable', {});
}

async function runLocalConfigEnable(client, opts, args) {
  return await client.request(
    'POST',
    `/v1/pjm/projects/${encodeURIComponent(args.project_id)}/local_config/enable`,
    null,
    {},
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
      case 'clone': {
        const cloneArgs = parseCloneArgs(subArgs);
        result = await runClone(client, opts, cloneArgs);
        break;
      }
      case 'progress': {
        const progressArgs = parseProgressArgs(subArgs);
        result = await runProgress(client, opts, progressArgs);
        break;
      }
      case 'project-states': {
        const statesArgs = parseProjectStatesArgs(subArgs);
        result = await runProjectStates(client, opts, statesArgs);
        break;
      }
      case 'member-add': {
        const memberAddArgs = parseMemberAddArgs(subArgs);
        result = await runMemberAdd(client, opts, memberAddArgs);
        break;
      }
      case 'member-get': {
        const memberGetArgs = parseMemberGetArgs(subArgs);
        result = await runMemberGet(client, opts, memberGetArgs);
        break;
      }
      case 'member-update': {
        const memberUpdateArgs = parseMemberUpdateArgs(subArgs);
        result = await runMemberUpdate(client, opts, memberUpdateArgs);
        break;
      }
      case 'member-list': {
        const memberListArgs = parseMemberListArgs(subArgs);
        result = await runMemberList(client, opts, memberListArgs);
        break;
      }
      case 'member-remove': {
        const memberRemoveArgs = parseMemberRemoveArgs(subArgs);
        result = await runMemberRemove(client, opts, memberRemoveArgs);
        break;
      }
      case 'prop-add': {
        const propAddArgs = parsePropAddArgs(subArgs);
        result = await runPropAdd(client, opts, propAddArgs);
        break;
      }
      case 'prop-get': {
        const propGetArgs = parsePropGetArgs(subArgs);
        result = await runPropGet(client, opts, propGetArgs);
        break;
      }
      case 'prop-list': {
        const propListArgs = parsePropListArgs(subArgs);
        result = await runPropList(client, opts, propListArgs);
        break;
      }
      case 'prop-remove': {
        const propRemoveArgs = parsePropRemoveArgs(subArgs);
        result = await runPropRemove(client, opts, propRemoveArgs);
        break;
      }
      case 'local-config-enable': {
        const localConfigArgs = parseLocalConfigEnableArgs(subArgs);
        result = await runLocalConfigEnable(client, opts, localConfigArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown project subcommand: ${subcommand}. Use project --help for usage.`);
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

shared.registerModule('project', {
  name: 'project',
  description: 'Manage PingCode projects',
  run,
});

module.exports = { run, printHelp };
