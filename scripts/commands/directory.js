'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode directory — Manage PingCode directory (users, teams, departments)',
    '',
    'Usage: pingcode directory <subcommand> [options]',
    '',
    'Subcommands:',
    '  me                                       Show current user info (/v1/myself)',
    '  team                                     Show enterprise info',
    '',
    '  user-list [options]                      List enterprise members',
    '  user-create [options]                    Create an enterprise member',
    '  user-get <user_id|name>                  Show an enterprise member',
    '  user-bulk-update [options]               Bulk update enterprise member properties',
    '',
    '  group-list                               List teams',
    '  group-create [options]                   Create a team',
    '  group-get <group_id>                     Show a team',
    '  group-update <group_id> [options]        Update a team',
    '  group-member-add <group_id> <user_id>    Add a member to a team',
    '  group-member-get <group_id> <user_id>    Show a team member',
    '  group-member-list <group_id>             List team members',
    '  group-member-remove <group_id> <user_id> Remove a member from a team',
    '',
    '  department-list                          List departments',
    '  department-create [options]              Create a department',
    '  department-get <department_id>           Show a department',
    '  department-update <department_id> [opts] Update a department',
    '  department-delete <department_id>        Delete a department',
    '',
    '  job-list                                 List jobs',
    '  job-get <job_id>                         Show a job',
    '  role-list                                List roles',
    '  role-get <role_id>                       Show a role',
    '',
    'Examples:',
    '  # 查看当前登录用户',
    '  pingcode directory me --compact',
    '  # 按关键字搜索企业成员',
    '  pingcode directory user-list --keywords 张三 --compact',
    '  # 列出全部团队',
    '  pingcode directory group-list --compact',
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
  'me': [
    'Usage: pingcode directory me [options]',
    '',
    'Show current user information.',
  ].join('\n'),
  'team': [
    'Usage: pingcode directory team [options]',
    '',
    'Show enterprise information.',
  ].join('\n'),
  'user-list': [
    'Usage: pingcode directory user-list [options]',
    '',
    'List enterprise members.',
    '',
    'Options:',
    '  --name TEXT                Filter by exact member name (unique per enterprise)',
    '  --keywords TEXT            Fuzzy search by name or username',
    '  --emails LIST              Comma-separated emails (max 20)',
    '  --mobiles LIST             Comma-separated mobiles (max 20)',
    '  --department-ids LIST      Comma-separated department ids (max 20)',
  ].join('\n'),
  'user-create': [
    'Usage: pingcode directory user-create [options]',
    '',
    'Create an enterprise member. One of --email or --mobile is required by the API.',
    '',
    'Options:',
    '  --name TEXT                Member name (unique per enterprise, required)',
    '  --display-name TEXT        Display name (required)',
    '  --email TEXT               Email address (unique)',
    '  --mobile TEXT              Mobile number (unique)',
    '  --password TEXT            Password (6-200 characters)',
    '  --department-id ID         Department id',
    '  --job-id ID                Job id',
    '  --employee-number TEXT     Employee number',
  ].join('\n'),
  'user-get': [
    'Usage: pingcode directory user-get <user_id|name>',
    '',
    'Show an enterprise member by raw id or name.',
    '',
    'If given a raw id (24-32 hex characters), fetches the member directly.',
    'Otherwise looks up members by exact name and returns the first match.',
  ].join('\n'),
  'user-update': [
    'Usage: pingcode directory user-update <user_id> [options]',
    '',
    'Partially update an enterprise member. At least one option is required.',
    '',
    'Options:',
    '  --name TEXT                Member name (unique per enterprise)',
    '  --display-name TEXT        Display name',
    '  --email TEXT               Email address (unique)',
    '  --mobile TEXT              Mobile number (unique)',
    '  --status ENUM              enabled or disabled',
    '  --employee-number TEXT     Employee number',
    '  --department-id ID         Department id',
    '  --job-id ID                Job id',
  ].join('\n'),
  'user-bulk-update': [
    'Usage: pingcode directory user-bulk-update [options]',
    '',
    'Bulk update a property of enterprise members.',
    '',
    'Options:',
    '  --user-ids LIST            Comma-separated member ids (required)',
    '  --property-name ENUM       Property to update; currently only status (required)',
    '  --property-value TEXT      New value, e.g. enabled or disabled (required)',
  ].join('\n'),
  'group-list': [
    'Usage: pingcode directory group-list [options]',
    '',
    'List teams.',
  ].join('\n'),
  'group-create': [
    'Usage: pingcode directory group-create [options]',
    '',
    'Create a team.',
    '',
    'Options:',
    '  --name TEXT                Team name (unique per enterprise, required)',
    '  --visibility ENUM          private (default) or public',
    '  --description TEXT         Team description',
  ].join('\n'),
  'group-get': [
    'Usage: pingcode directory group-get <group_id>',
    '',
    'Show a team.',
  ].join('\n'),
  'group-update': [
    'Usage: pingcode directory group-update <group_id> [options]',
    '',
    'Partially update a team. At least one option is required.',
    '',
    'Options:',
    '  --name TEXT                Team name (unique per enterprise)',
    '  --visibility ENUM          private or public',
    '  --description TEXT         Team description',
  ].join('\n'),
  'group-member-add': [
    'Usage: pingcode directory group-member-add <group_id> <user_id> [options]',
    '',
    'Add a member to a team.',
    '',
    'Options:',
    '  --role ENUM                manager or member (required)',
  ].join('\n'),
  'group-member-get': [
    'Usage: pingcode directory group-member-get <group_id> <user_id>',
    '',
    'Show a member of a team. The member id is the user id.',
  ].join('\n'),
  'group-member-list': [
    'Usage: pingcode directory group-member-list <group_id>',
    '',
    'List members of a team.',
  ].join('\n'),
  'group-member-remove': [
    'Usage: pingcode directory group-member-remove <group_id> <user_id>',
    '',
    'Remove a member from a team. The member id is the user id.',
  ].join('\n'),
  'department-list': [
    'Usage: pingcode directory department-list [options]',
    '',
    'List departments.',
  ].join('\n'),
  'department-create': [
    'Usage: pingcode directory department-create [options]',
    '',
    'Create a department.',
    '',
    'Options:',
    '  --name TEXT                Department name (unique per enterprise, required)',
    '  --parent-id ID             Parent department id',
    '  --head-id ID               Department head user id',
  ].join('\n'),
  'department-get': [
    'Usage: pingcode directory department-get <department_id>',
    '',
    'Show a department.',
  ].join('\n'),
  'department-update': [
    'Usage: pingcode directory department-update <department_id> [options]',
    '',
    'Partially update a department. At least one option is required.',
    '',
    'Options:',
    '  --name TEXT                Department name (unique per enterprise)',
    '  --parent-id ID             Parent department id',
    '  --head-id ID               Department head user id',
  ].join('\n'),
  'department-delete': [
    'Usage: pingcode directory department-delete <department_id>',
    '',
    'Delete a department.',
  ].join('\n'),
  'job-list': [
    'Usage: pingcode directory job-list [options]',
    '',
    'List jobs.',
  ].join('\n'),
  'job-get': [
    'Usage: pingcode directory job-get <job_id>',
    '',
    'Show a job.',
  ].join('\n'),
  'role-list': [
    'Usage: pingcode directory role-list [options]',
    '',
    'List roles.',
  ].join('\n'),
  'role-get': [
    'Usage: pingcode directory role-get <role_id>',
    '',
    'Show a role.',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  if (SUBCOMMAND_HELP[subcommand]) {
    console.log(SUBCOMMAND_HELP[subcommand]);
  } else {
    printHelp();
  }
}

// ── Argument parsing helpers ───────────────────────────────────────────

// spec: { positionals: ['group_id'], flags: {'--x': 'x'},
//        label: 'group-get', required: 'A group id is required.' }
function parseArgs(tokens, spec) {
  const valueFlags = spec.flags || {};
  const args = {};
  for (const key of Object.values(valueFlags)) {
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
        args[valueFlags[flag]] = value;
      } else if (arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS) {
        // Global boolean flag (e.g. --dry-run); handled by parseGlobalOptions.
      } else {
        throw new core.PingCodeError(`Unknown option: ${flag}. Use directory ${spec.label} --help for usage.`);
      }
    } else if (positionals.length < positionalCount) {
      positionals.push(arg);
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use directory ${spec.label} --help for usage.`);
    }
  }

  (spec.positionals || []).forEach((name, index) => {
    args[name] = positionals[index] || null;
  });
  if (spec.required && positionals.length < positionalCount) {
    throw new core.PingCodeError(`${spec.required} Use directory ${spec.label} --help for usage.`);
  }
  return args;
}

function requireFlags(args, requirements, label) {
  for (const [key, [flag, desc]] of Object.entries(requirements)) {
    if (args[key] === null || args[key] === undefined || args[key] === '') {
      throw new core.PingCodeError(`${flag} is required and must be ${desc}. Use directory ${label} --help for usage.`);
    }
  }
}

function requireEnum(value, flag, allowed, label) {
  if (!allowed.includes(value)) {
    throw new core.PingCodeError(`${flag} must be one of: ${allowed.join(', ')}. Use directory ${label} --help for usage.`);
  }
  return value;
}

function requireAtLeastOneField(args, excludeKeys, label) {
  const hasField = Object.entries(args).some(
    ([key, value]) => !excludeKeys.includes(key) && value !== null,
  );
  if (!hasField) {
    throw new core.PingCodeError(`At least one field to update is required. Use directory ${label} --help for usage.`);
  }
}

function parseIdList(value, flag) {
  const ids = String(value).split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new core.PingCodeError(`${flag} must be a comma-separated list of ids`);
  }
  return ids;
}

const DIRECTORY_RAW_ID_RE = /^[0-9a-fA-F]{24,32}$/;

// ── me / team subcommands ──────────────────────────────────────────────

async function runMe(client, opts) {
  return await client.request(
    'GET',
    '/v1/myself',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runTeam(client, opts) {
  return await client.request(
    'GET',
    '/v1/directory/team',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── User subcommands ───────────────────────────────────────────────────

async function runUserList(client, opts, args) {
  const params = {};
  if (args.name) params.name = args.name;
  if (args.keywords) params.keywords = args.keywords;
  if (args.emails) params.emails = args.emails;
  if (args.mobiles) params.mobiles = args.mobiles;
  if (args.department_ids) params.department_ids = args.department_ids;

  return await client.request(
    'GET',
    '/v1/directory/users',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runUserCreate(client, opts, args) {
  requireFlags(args, {
    name: ['--name', 'non-empty'],
    display_name: ['--display-name', 'non-empty'],
  }, 'user-create');

  const body = {
    name: args.name,
    display_name: args.display_name,
  };
  if (args.email) body.email = args.email;
  if (args.mobile) body.mobile = args.mobile;
  if (args.password) body.password = args.password;
  if (args.department_id) body.department_id = args.department_id;
  if (args.job_id) body.job_id = args.job_id;
  if (args.employee_number) body.employee_number = args.employee_number;

  return await client.request(
    'POST',
    '/v1/directory/users',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runUserGet(client, opts, args) {
  const input = args.user_id;
  let userId;

  if (DIRECTORY_RAW_ID_RE.test(input)) {
    userId = input;
  } else {
    // Look up by exact name, resolve to id
    const listResp = await client.request(
      'GET',
      '/v1/directory/users',
      { name: input },
      null,
      { dry_run: false, use_workspace_cache: true },
    );
    const values = core.pageValues(listResp);
    if (values.length === 0) {
      throw new core.PingCodeError(`No user found matching "${input}"`);
    }
    userId = values[0].id;
  }

  return await client.request(
    'GET',
    `/v1/directory/users/${userId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runUserUpdate(client, opts, args) {
  requireAtLeastOneField(args, ['user_id'], 'user-update');

  const body = {};
  if (args.name) body.name = args.name;
  if (args.display_name) body.display_name = args.display_name;
  if (args.email) body.email = args.email;
  if (args.mobile) body.mobile = args.mobile;
  if (args.status) {
    requireEnum(args.status, '--status', ['enabled', 'disabled'], 'user-update');
    body.status = args.status;
  }
  if (args.employee_number) body.employee_number = args.employee_number;
  if (args.department_id) body.department_id = args.department_id;
  if (args.job_id) body.job_id = args.job_id;

  return await client.request(
    'PATCH',
    `/v1/directory/users/${args.user_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runUserBulkUpdate(client, opts, args) {
  requireFlags(args, {
    user_ids: ['--user-ids', 'a comma-separated list of user ids'],
    property_name: ['--property-name', 'non-empty'],
    property_value: ['--property-value', 'non-empty'],
  }, 'user-bulk-update');

  const body = {
    user_ids: parseIdList(args.user_ids, '--user-ids'),
    // Docs: property_name 目前仅支持 status
    property_name: requireEnum(args.property_name, '--property-name', ['status'], 'user-bulk-update'),
    property_value: args.property_value,
  };

  return await client.request(
    'POST',
    '/v1/directory/users/bulk',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Group subcommands ──────────────────────────────────────────────────

async function runGroupList(client, opts) {
  return await client.request(
    'GET',
    '/v1/directory/groups',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runGroupCreate(client, opts, args) {
  requireFlags(args, {
    name: ['--name', 'non-empty'],
  }, 'group-create');

  const body = {
    name: args.name,
  };
  if (args.visibility) {
    requireEnum(args.visibility, '--visibility', ['private', 'public'], 'group-create');
    body.visibility = args.visibility;
  }
  if (args.description) body.description = args.description;

  return await client.request(
    'POST',
    '/v1/directory/groups',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runGroupGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/directory/groups/${args.group_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runGroupUpdate(client, opts, args) {
  requireAtLeastOneField(args, ['group_id'], 'group-update');

  const body = {};
  if (args.name) body.name = args.name;
  if (args.visibility) {
    requireEnum(args.visibility, '--visibility', ['private', 'public'], 'group-update');
    body.visibility = args.visibility;
  }
  if (args.description) body.description = args.description;

  return await client.request(
    'PATCH',
    `/v1/directory/groups/${args.group_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runGroupMemberAdd(client, opts, args) {
  requireFlags(args, {
    role: ['--role', 'one of: manager, member'],
  }, 'group-member-add');
  requireEnum(args.role, '--role', ['manager', 'member'], 'group-member-add');

  const body = {
    user_id: args.user_id,
    role: args.role,
  };

  return await client.request(
    'POST',
    `/v1/directory/groups/${args.group_id}/members`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runGroupMemberGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/directory/groups/${args.group_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runGroupMemberList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/directory/groups/${args.group_id}/members`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runGroupMemberRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/directory/groups/${args.group_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Department subcommands ─────────────────────────────────────────────

async function runDepartmentList(client, opts) {
  return await client.request(
    'GET',
    '/v1/directory/departments',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runDepartmentCreate(client, opts, args) {
  requireFlags(args, {
    name: ['--name', 'non-empty'],
  }, 'department-create');

  const body = {
    name: args.name,
  };
  if (args.parent_id) body.parent_id = args.parent_id;
  if (args.head_id) body.head_id = args.head_id;

  return await client.request(
    'POST',
    '/v1/directory/departments',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runDepartmentGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/directory/departments/${args.department_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runDepartmentUpdate(client, opts, args) {
  requireAtLeastOneField(args, ['department_id'], 'department-update');

  const body = {};
  if (args.name) body.name = args.name;
  if (args.parent_id) body.parent_id = args.parent_id;
  if (args.head_id) body.head_id = args.head_id;

  return await client.request(
    'PATCH',
    `/v1/directory/departments/${args.department_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runDepartmentDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/directory/departments/${args.department_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Job / role subcommands ─────────────────────────────────────────────

async function runJobList(client, opts) {
  return await client.request(
    'GET',
    '/v1/directory/jobs',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runJobGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/directory/jobs/${args.job_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runRoleList(client, opts) {
  return await client.request(
    'GET',
    '/v1/directory/roles',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runRoleGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/directory/roles/${args.role_id}`,
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

  let result;
  switch (subcommand) {
    case 'me': {
      result = await runMe(client, opts);
      break;
    }
    case 'team': {
      result = await runTeam(client, opts);
      break;
    }
    case 'user-list': {
      const args = parseArgs(subArgs, { flags: {
        '--name': 'name',
        '--keywords': 'keywords',
        '--emails': 'emails',
        '--mobiles': 'mobiles',
        '--department-ids': 'department_ids',
      }, label: 'user-list' });
      result = await runUserList(client, opts, args);
      break;
    }
    case 'user-create': {
      const args = parseArgs(subArgs, { flags: {
        '--name': 'name',
        '--display-name': 'display_name',
        '--email': 'email',
        '--mobile': 'mobile',
        '--password': 'password',
        '--department-id': 'department_id',
        '--job-id': 'job_id',
        '--employee-number': 'employee_number',
      }, label: 'user-create' });
      result = await runUserCreate(client, opts, args);
      break;
    }
    case 'user-get': {
      const args = parseArgs(subArgs, { positionals: ['user_id'], label: 'user-get', required: 'A user id or name is required.' });
      result = await runUserGet(client, opts, args);
      break;
    }
    case 'user-update': {
      const args = parseArgs(subArgs, { positionals: ['user_id'], flags: {
        '--name': 'name',
        '--display-name': 'display_name',
        '--email': 'email',
        '--mobile': 'mobile',
        '--status': 'status',
        '--employee-number': 'employee_number',
        '--department-id': 'department_id',
        '--job-id': 'job_id',
      }, label: 'user-update', required: 'A user id is required.' });
      result = await runUserUpdate(client, opts, args);
      break;
    }
    case 'user-bulk-update': {
      const args = parseArgs(subArgs, { flags: {
        '--user-ids': 'user_ids',
        '--property-name': 'property_name',
        '--property-value': 'property_value',
      }, label: 'user-bulk-update' });
      result = await runUserBulkUpdate(client, opts, args);
      break;
    }
    case 'group-list': {
      result = await runGroupList(client, opts);
      break;
    }
    case 'group-create': {
      const args = parseArgs(subArgs, { flags: {
        '--name': 'name',
        '--visibility': 'visibility',
        '--description': 'description',
      }, label: 'group-create' });
      result = await runGroupCreate(client, opts, args);
      break;
    }
    case 'group-get': {
      const args = parseArgs(subArgs, { positionals: ['group_id'], label: 'group-get', required: 'A group id is required.' });
      result = await runGroupGet(client, opts, args);
      break;
    }
    case 'group-update': {
      const args = parseArgs(subArgs, { positionals: ['group_id'], flags: {
        '--name': 'name',
        '--visibility': 'visibility',
        '--description': 'description',
      }, label: 'group-update', required: 'A group id is required.' });
      result = await runGroupUpdate(client, opts, args);
      break;
    }
    case 'group-member-add': {
      const args = parseArgs(subArgs, { positionals: ['group_id', 'user_id'], flags: {
        '--role': 'role',
      }, label: 'group-member-add', required: 'A group id and a user id are required.' });
      result = await runGroupMemberAdd(client, opts, args);
      break;
    }
    case 'group-member-get': {
      const args = parseArgs(subArgs, { positionals: ['group_id', 'member_id'], label: 'group-member-get', required: 'A group id and a member id are required.' });
      result = await runGroupMemberGet(client, opts, args);
      break;
    }
    case 'group-member-list': {
      const args = parseArgs(subArgs, { positionals: ['group_id'], label: 'group-member-list', required: 'A group id is required.' });
      result = await runGroupMemberList(client, opts, args);
      break;
    }
    case 'group-member-remove': {
      const args = parseArgs(subArgs, { positionals: ['group_id', 'member_id'], label: 'group-member-remove', required: 'A group id and a member id are required.' });
      result = await runGroupMemberRemove(client, opts, args);
      break;
    }
    case 'department-list': {
      result = await runDepartmentList(client, opts);
      break;
    }
    case 'department-create': {
      const args = parseArgs(subArgs, { flags: {
        '--name': 'name',
        '--parent-id': 'parent_id',
        '--head-id': 'head_id',
      }, label: 'department-create' });
      result = await runDepartmentCreate(client, opts, args);
      break;
    }
    case 'department-get': {
      const args = parseArgs(subArgs, { positionals: ['department_id'], label: 'department-get', required: 'A department id is required.' });
      result = await runDepartmentGet(client, opts, args);
      break;
    }
    case 'department-update': {
      const args = parseArgs(subArgs, { positionals: ['department_id'], flags: {
        '--name': 'name',
        '--parent-id': 'parent_id',
        '--head-id': 'head_id',
      }, label: 'department-update', required: 'A department id is required.' });
      result = await runDepartmentUpdate(client, opts, args);
      break;
    }
    case 'department-delete': {
      const args = parseArgs(subArgs, { positionals: ['department_id'], label: 'department-delete', required: 'A department id is required.' });
      result = await runDepartmentDelete(client, opts, args);
      break;
    }
    case 'job-list': {
      result = await runJobList(client, opts);
      break;
    }
    case 'job-get': {
      const args = parseArgs(subArgs, { positionals: ['job_id'], label: 'job-get', required: 'A job id is required.' });
      result = await runJobGet(client, opts, args);
      break;
    }
    case 'role-list': {
      result = await runRoleList(client, opts);
      break;
    }
    case 'role-get': {
      const args = parseArgs(subArgs, { positionals: ['role_id'], label: 'role-get', required: 'A role id is required.' });
      result = await runRoleGet(client, opts, args);
      break;
    }
    default:
      throw new core.PingCodeError(`Unknown directory subcommand: ${subcommand}. Use directory --help for usage.`);
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
}

shared.registerModule('directory', {
  name: 'directory',
  description: 'Manage PingCode directory (users, teams, departments)',
  run,
});

module.exports = { run, printHelp };
