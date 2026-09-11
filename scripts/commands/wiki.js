'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Constants ─────────────────────────────────────────────────────────

const WIKI_SCOPE_TYPES = ['organization', 'user_group', 'user'];
const WIKI_MEMBER_TYPES = ['user', 'user_group'];
const WIKI_CONTENT_FORMATS = ['text', 'markdown', 'html', 'block'];
const WIKI_CONTENT_UPDATE_FORMATS = ['text', 'markdown', 'html'];
const WIKI_VISIBILITIES = ['public', 'private'];

// ── Shared parsing helpers ────────────────────────────────────────────

// spec: {
//   usage: 'wiki space-list',            // used in error messages
//   stringFlags: { '--x': 'x' },
//   booleanFlags: ['--flag'],            // valueless flags
//   maxPositionals: 0,                   // 0 = no positionals allowed
//   positionalError: 'A space id ...',   // message when too few positionals
// }
function parseArgs(tokens, spec) {
  const args = {};
  for (const key of Object.values(spec.stringFlags || {})) {
    args[key] = null;
  }
  for (const flag of spec.booleanFlags || []) {
    args[flag.replace(/^--/, '').replace(/-/g, '_')] = false;
  }

  const positionals = [];
  const stringFlags = spec.stringFlags || {};
  const booleanFlags = spec.booleanFlags || [];

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (booleanFlags.includes(arg)) {
      args[arg.replace(/^--/, '').replace(/-/g, '_')] = true;
      continue;
    }
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
      if (flag in stringFlags) {
        args[stringFlags[flag]] = arg.slice(eqIndex + 1);
      } else {
        throw new core.PingCodeError(`Unknown option: ${flag}`);
      }
      continue;
    }
    if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use ${spec.usage} --help for usage.`);
    }
  }

  const maxPositionals = spec.maxPositionals || 0;
  if (maxPositionals === 0) {
    if (positionals.length > 0) {
      throw new core.PingCodeError(`Unexpected argument: ${positionals[0]}. Use ${spec.usage} --help for usage.`);
    }
  } else {
    if (positionals.length < maxPositionals) {
      throw new core.PingCodeError(`${spec.positionalError}. Use ${spec.usage} --help for usage.`);
    }
    if (positionals.length > maxPositionals) {
      throw new core.PingCodeError(`Unexpected argument: ${positionals[maxPositionals]}. Use ${spec.usage} --help for usage.`);
    }
  }

  return { args, positionals };
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
  return data;
}

function requireText(value, flag, usage) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new core.PingCodeError(`${flag} is required and must be non-empty. Use ${usage} --help for usage.`);
  }
  return value;
}

function requireEnum(value, flag, allowed, usage) {
  if (!allowed.includes(value)) {
    throw new core.PingCodeError(`${flag} must be one of: ${allowed.join(', ')}. Use ${usage} --help for usage.`);
  }
  return value;
}

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode wiki — Manage PingCode wiki spaces and pages',
    '',
    'Usage: pingcode wiki <subcommand> [options]',
    '',
    'Subcommands:',
    '  space-list [options]        List wiki spaces',
    '  space-create [options]      Create a wiki space',
    '  space-get <space_id>        Show a wiki space',
    '  space-update <space_id>     Partially update a wiki space',
    '  space-delete <space_id>     Delete a wiki space',
    '',
    '  member-add <space_id> [options]',
    '                              Add a member to a wiki space',
    '  member-get <space_id> <member_id>',
    '                              Show a wiki space member',
    '  member-list <space_id>      List wiki space members',
    '  member-remove <space_id> <member_id>',
    '                              Remove a member from a wiki space',
    '',
    '  page-list [options]         List wiki pages',
    '  page-create [options]       Create a wiki page',
    '  page-get <page_id>          Show a wiki page',
    '  page-update <page_id>       Partially update a wiki page',
    '  page-delete <page_id>       Delete a wiki page',
    '',
    '  content-get <page_id> [options]',
    '                              Get a wiki page content',
    '  content-update <page_id> [options]',
    '                              Update a wiki page content',
    '',
    '  version-list <page_id>      List wiki page versions',
    '  version-get <page_id> <version_id>',
    '                              Show a wiki page version',
    '  version-restore <page_id> <version_id>',
    '                              Restore a wiki page to a version',
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
    case 'space-list':
      console.log([
        'Usage: pingcode wiki space-list [options]',
        '',
        'List wiki spaces.',
        '',
        'Options:',
        '  --scope-type TYPE         organization, user_group, or user',
        '  --scope-id ID             Team id (only for scope_type=user_group)',
        '  --keywords TEXT           Keywords (searches name)',
        '  --member-type TYPE        user or user_group (requires --member-id)',
        '  --member-id ID            Member id (requires --member-type)',
        '  --created-between A,B     Created between two timestamps',
        '  --updated-between A,B     Updated between two timestamps',
        '  --include-deleted         Include deleted spaces',
        '  --include-archived        Include archived spaces',
      ].join('\n'));
      break;
    case 'space-create':
      console.log([
        'Usage: pingcode wiki space-create [options]',
        '',
        'Create a wiki space.',
        '',
        'Options:',
        '  --scope-type TYPE         Required. organization, user_group, or user',
        '  --scope-id ID             Team id (required when scope_type=user_group)',
        '  --name TEXT               Required. Space name (max 32 characters)',
        '  --identifier IDENT        Required. Unique space identifier (max 15 characters)',
        '  --visibility VIS          public or private',
        '  --description TEXT        Space description',
        '  --members JSON            JSON array of members, e.g. \'[{"id":"...","type":"user"}]\'',
      ].join('\n'));
      break;
    case 'space-get':
      console.log([
        'Usage: pingcode wiki space-get <space_id> [options]',
        '',
        'Show a single wiki space.',
        '',
        'Options:',
        '  --include-deleted         Include deleted spaces',
        '  --include-archived        Include archived spaces',
      ].join('\n'));
      break;
    case 'space-update':
      console.log([
        'Usage: pingcode wiki space-update <space_id> [options]',
        '',
        'Partially update a wiki space. At least one field is required.',
        '',
        'Options:',
        '  --name TEXT               Space name (max 32 characters)',
        '  --identifier IDENT        Unique space identifier (max 15 characters)',
        '  --description TEXT        Space description',
      ].join('\n'));
      break;
    case 'space-delete':
      console.log([
        'Usage: pingcode wiki space-delete <space_id>',
        '',
        'Delete a wiki space.',
      ].join('\n'));
      break;
    case 'member-add':
      console.log([
        'Usage: pingcode wiki member-add <space_id> [options]',
        '',
        'Add a member to a wiki space.',
        '',
        'Options:',
        '  --member-id ID            Required. Enterprise user id or team id',
        '  --type TYPE               Required. user or user_group',
        '  --role-id ID              Role id',
      ].join('\n'));
      break;
    case 'member-get':
      console.log([
        'Usage: pingcode wiki member-get <space_id> <member_id>',
        '',
        'Show a single wiki space member. member_id is the user or team id.',
      ].join('\n'));
      break;
    case 'member-list':
      console.log([
        'Usage: pingcode wiki member-list <space_id>',
        '',
        'List the members of a wiki space.',
      ].join('\n'));
      break;
    case 'member-remove':
      console.log([
        'Usage: pingcode wiki member-remove <space_id> <member_id>',
        '',
        'Remove a member from a wiki space. member_id is the user or team id.',
      ].join('\n'));
      break;
    case 'page-list':
      console.log([
        'Usage: pingcode wiki page-list [options]',
        '',
        'List wiki pages.',
        '',
        'Options:',
        '  --space-id ID             Space id',
        '  --parent-id ID            Parent page id',
      ].join('\n'));
      break;
    case 'page-create':
      console.log([
        'Usage: pingcode wiki page-create [options]',
        '',
        'Create a wiki page.',
        '',
        'Options:',
        '  --space-id ID             Required. Space id',
        '  --name TEXT               Required. Page name',
        '  --parent-id ID            Parent page id',
        '  --content TEXT            Page content (requires --format-type)',
        '  --format-type TYPE        text, markdown, html, or block (requires --content)',
      ].join('\n'));
      break;
    case 'page-get':
      console.log([
        'Usage: pingcode wiki page-get <page_id>',
        '',
        'Show a single wiki page.',
      ].join('\n'));
      break;
    case 'page-update':
      console.log([
        'Usage: pingcode wiki page-update <page_id> [options]',
        '',
        'Partially update a wiki page. At least one field is required.',
        '',
        'Options:',
        '  --name TEXT               Page name',
        '  --parent-id ID            Parent page id',
        '  --lock N                  0 (unlock) or 1 (lock)',
      ].join('\n'));
      break;
    case 'page-delete':
      console.log([
        'Usage: pingcode wiki page-delete <page_id>',
        '',
        'Delete a wiki page.',
      ].join('\n'));
      break;
    case 'content-get':
      console.log([
        'Usage: pingcode wiki content-get <page_id> [options]',
        '',
        'Get the content of a wiki page.',
        '',
        'Options:',
        '  --format-type TYPE        text (default), markdown, html, or block',
        '  --version-id ID           Page version id (defaults to current version)',
        '  --include-public-image-token TOKEN',
        '                            Only supports the value content; requires format_type',
        '                            markdown, html, or block',
      ].join('\n'));
      break;
    case 'content-update':
      console.log([
        'Usage: pingcode wiki content-update <page_id> [options]',
        '',
        'Update (full replacement) the content of a wiki page.',
        '',
        'Options:',
        '  --content TEXT            Required. New page content',
        '  --format-type TYPE        Required. text, markdown, or html',
      ].join('\n'));
      break;
    case 'version-list':
      console.log([
        'Usage: pingcode wiki version-list <page_id>',
        '',
        'List the versions of a wiki page.',
      ].join('\n'));
      break;
    case 'version-get':
      console.log([
        'Usage: pingcode wiki version-get <page_id> <version_id>',
        '',
        'Show a single wiki page version.',
      ].join('\n'));
      break;
    case 'version-restore':
      console.log([
        'Usage: pingcode wiki version-restore <page_id> <version_id>',
        '',
        'Restore a wiki page to the given version.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Space subcommands ──────────────────────────────────────────────────

function parseSpaceListArgs(tokens) {
  const { args } = parseArgs(tokens, {
    usage: 'wiki space-list',
    stringFlags: {
      '--scope-type': 'scope_type',
      '--scope-id': 'scope_id',
      '--keywords': 'keywords',
      '--member-type': 'member_type',
      '--member-id': 'member_id',
      '--created-between': 'created_between',
      '--updated-between': 'updated_between',
    },
    booleanFlags: ['--include-deleted', '--include-archived'],
  });
  return args;
}

async function runSpaceList(client, opts, args) {
  const params = {};
  if (args.scope_type) {
    params.scope_type = requireEnum(args.scope_type, '--scope-type', WIKI_SCOPE_TYPES, 'wiki space-list');
  }
  if (args.scope_id) {
    params.scope_id = args.scope_id;
  }
  if (args.keywords) {
    params.keywords = args.keywords;
  }
  if (args.member_type || args.member_id) {
    if (!args.member_type || !args.member_id) {
      throw new core.PingCodeError('--member-type and --member-id must be provided together. Use wiki space-list --help for usage.');
    }
    params.member_type = requireEnum(args.member_type, '--member-type', WIKI_MEMBER_TYPES, 'wiki space-list');
    params.member_id = args.member_id;
  }
  if (args.created_between) {
    params.created_between = args.created_between;
  }
  if (args.updated_between) {
    params.updated_between = args.updated_between;
  }
  if (args.include_deleted) {
    params.include_deleted = 'true';
  }
  if (args.include_archived) {
    params.include_archived = 'true';
  }

  return await client.request(
    'GET',
    '/v1/wiki/spaces',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSpaceCreateArgs(tokens) {
  const { args } = parseArgs(tokens, {
    usage: 'wiki space-create',
    stringFlags: {
      '--scope-type': 'scope_type',
      '--scope-id': 'scope_id',
      '--name': 'name',
      '--identifier': 'identifier',
      '--visibility': 'visibility',
      '--description': 'description',
      '--members': 'members',
    },
  });
  return args;
}

async function runSpaceCreate(client, opts, args) {
  const scopeType = requireText(args.scope_type, '--scope-type', 'wiki space-create');
  requireEnum(scopeType, '--scope-type', WIKI_SCOPE_TYPES, 'wiki space-create');
  const name = requireText(args.name, '--name', 'wiki space-create');
  const identifier = requireText(args.identifier, '--identifier', 'wiki space-create');

  const body = {
    scope_type: scopeType,
    name,
    identifier,
  };
  if (args.scope_id) {
    body.scope_id = args.scope_id;
  }
  if (args.visibility) {
    body.visibility = requireEnum(args.visibility, '--visibility', WIKI_VISIBILITIES, 'wiki space-create');
  }
  if (args.description) {
    body.description = args.description;
  }
  if (args.members) {
    body.members = parseJsonArray(args.members, '--members');
  }

  return await client.request(
    'POST',
    '/v1/wiki/spaces',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSpaceGetArgs(tokens) {
  const { args, positionals } = parseArgs(tokens, {
    usage: 'wiki space-get',
    booleanFlags: ['--include-deleted', '--include-archived'],
    maxPositionals: 1,
    positionalError: 'A space id is required',
  });
  return { space_id: positionals[0], include_deleted: args.include_deleted, include_archived: args.include_archived };
}

async function runSpaceGet(client, opts, args) {
  const params = {};
  if (args.include_deleted) {
    params.include_deleted = 'true';
  }
  if (args.include_archived) {
    params.include_archived = 'true';
  }

  return await client.request(
    'GET',
    `/v1/wiki/spaces/${args.space_id}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSpaceUpdateArgs(tokens) {
  const { args, positionals } = parseArgs(tokens, {
    usage: 'wiki space-update',
    stringFlags: {
      '--name': 'name',
      '--identifier': 'identifier',
      '--description': 'description',
    },
    maxPositionals: 1,
    positionalError: 'A space id is required',
  });
  return { space_id: positionals[0], ...args };
}

async function runSpaceUpdate(client, opts, args) {
  const body = {};
  if (args.name) {
    body.name = args.name;
  }
  if (args.identifier) {
    body.identifier = args.identifier;
  }
  if (args.description) {
    body.description = args.description;
  }
  if (Object.keys(body).length === 0) {
    throw new core.PingCodeError('At least one field to update is required. Use wiki space-update --help for usage.');
  }

  return await client.request(
    'PATCH',
    `/v1/wiki/spaces/${args.space_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSpaceDeleteArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki space-delete',
    maxPositionals: 1,
    positionalError: 'A space id is required',
  });
  return { space_id: positionals[0] };
}

async function runSpaceDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/wiki/spaces/${args.space_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Space member subcommands ───────────────────────────────────────────

function parseMemberAddArgs(tokens) {
  const { args, positionals } = parseArgs(tokens, {
    usage: 'wiki member-add',
    stringFlags: {
      '--member-id': 'member_id',
      '--type': 'type',
      '--role-id': 'role_id',
    },
    maxPositionals: 1,
    positionalError: 'A space id is required',
  });
  return { space_id: positionals[0], ...args };
}

async function runMemberAdd(client, opts, args) {
  const memberId = requireText(args.member_id, '--member-id', 'wiki member-add');
  const type = requireText(args.type, '--type', 'wiki member-add');
  requireEnum(type, '--type', WIKI_MEMBER_TYPES, 'wiki member-add');

  const body = {
    member: {
      id: memberId,
      type,
    },
  };
  if (args.role_id) {
    body.role_id = args.role_id;
  }

  return await client.request(
    'POST',
    `/v1/wiki/spaces/${args.space_id}/members`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberGetArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki member-get',
    maxPositionals: 2,
    positionalError: 'A space id and a member id are required',
  });
  return { space_id: positionals[0], member_id: positionals[1] };
}

async function runMemberGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/wiki/spaces/${args.space_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberListArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki member-list',
    maxPositionals: 1,
    positionalError: 'A space id is required',
  });
  return { space_id: positionals[0] };
}

async function runMemberList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/wiki/spaces/${args.space_id}/members`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseMemberRemoveArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki member-remove',
    maxPositionals: 2,
    positionalError: 'A space id and a member id are required',
  });
  return { space_id: positionals[0], member_id: positionals[1] };
}

async function runMemberRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/wiki/spaces/${args.space_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Page subcommands ───────────────────────────────────────────────────

function parsePageListArgs(tokens) {
  const { args } = parseArgs(tokens, {
    usage: 'wiki page-list',
    stringFlags: {
      '--space-id': 'space_id',
      '--parent-id': 'parent_id',
    },
  });
  return args;
}

async function runPageList(client, opts, args) {
  const params = {};
  if (args.space_id) {
    params.space_id = args.space_id;
  }
  if (args.parent_id) {
    params.parent_id = args.parent_id;
  }

  return await client.request(
    'GET',
    '/v1/wiki/pages',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePageCreateArgs(tokens) {
  const { args } = parseArgs(tokens, {
    usage: 'wiki page-create',
    stringFlags: {
      '--space-id': 'space_id',
      '--name': 'name',
      '--parent-id': 'parent_id',
      '--content': 'content',
      '--format-type': 'format_type',
    },
  });
  return args;
}

async function runPageCreate(client, opts, args) {
  const spaceId = requireText(args.space_id, '--space-id', 'wiki page-create');
  const name = requireText(args.name, '--name', 'wiki page-create');

  if (args.content && !args.format_type) {
    throw new core.PingCodeError('--format-type is required when --content is given. Use wiki page-create --help for usage.');
  }
  if (args.format_type && !args.content) {
    throw new core.PingCodeError('--content is required when --format-type is given. Use wiki page-create --help for usage.');
  }

  const body = {
    space_id: spaceId,
    name,
  };
  if (args.parent_id) {
    body.parent_id = args.parent_id;
  }
  if (args.content) {
    body.content = args.content;
    body.format_type = requireEnum(args.format_type, '--format-type', WIKI_CONTENT_FORMATS, 'wiki page-create');
  }

  return await client.request(
    'POST',
    '/v1/wiki/pages',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePageGetArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki page-get',
    maxPositionals: 1,
    positionalError: 'A page id is required',
  });
  return { page_id: positionals[0] };
}

async function runPageGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/wiki/pages/${args.page_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePageUpdateArgs(tokens) {
  const { args, positionals } = parseArgs(tokens, {
    usage: 'wiki page-update',
    stringFlags: {
      '--name': 'name',
      '--parent-id': 'parent_id',
      '--lock': 'lock',
    },
    maxPositionals: 1,
    positionalError: 'A page id is required',
  });
  return { page_id: positionals[0], ...args };
}

async function runPageUpdate(client, opts, args) {
  const body = {};
  if (args.name) {
    body.name = args.name;
  }
  if (args.parent_id) {
    body.parent_id = args.parent_id;
  }
  if (args.lock !== null) {
    if (args.lock !== '0' && args.lock !== '1') {
      throw new core.PingCodeError('--lock must be 0 or 1. Use wiki page-update --help for usage.');
    }
    body.lock = Number(args.lock);
  }
  if (Object.keys(body).length === 0) {
    throw new core.PingCodeError('At least one field to update is required. Use wiki page-update --help for usage.');
  }

  return await client.request(
    'PATCH',
    `/v1/wiki/pages/${args.page_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePageDeleteArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki page-delete',
    maxPositionals: 1,
    positionalError: 'A page id is required',
  });
  return { page_id: positionals[0] };
}

async function runPageDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/wiki/pages/${args.page_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Content subcommands ────────────────────────────────────────────────

function parseContentGetArgs(tokens) {
  const { args, positionals } = parseArgs(tokens, {
    usage: 'wiki content-get',
    stringFlags: {
      '--format-type': 'format_type',
      '--version-id': 'version_id',
      '--include-public-image-token': 'include_public_image_token',
    },
    maxPositionals: 1,
    positionalError: 'A page id is required',
  });
  return { page_id: positionals[0], ...args };
}

async function runContentGet(client, opts, args) {
  const params = {};
  if (args.format_type) {
    params.format_type = requireEnum(args.format_type, '--format-type', WIKI_CONTENT_FORMATS, 'wiki content-get');
  }
  if (args.version_id) {
    params.version_id = args.version_id;
  }
  if (args.include_public_image_token) {
    if (args.include_public_image_token !== 'content') {
      throw new core.PingCodeError('--include-public-image-token only supports the value content. Use wiki content-get --help for usage.');
    }
    params.include_public_image_token = args.include_public_image_token;
  }

  return await client.request(
    'GET',
    `/v1/wiki/pages/${args.page_id}/content`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseContentUpdateArgs(tokens) {
  const { args, positionals } = parseArgs(tokens, {
    usage: 'wiki content-update',
    stringFlags: {
      '--content': 'content',
      '--format-type': 'format_type',
    },
    maxPositionals: 1,
    positionalError: 'A page id is required',
  });
  return { page_id: positionals[0], ...args };
}

async function runContentUpdate(client, opts, args) {
  const content = requireText(args.content, '--content', 'wiki content-update');
  const formatType = requireText(args.format_type, '--format-type', 'wiki content-update');
  requireEnum(formatType, '--format-type', WIKI_CONTENT_UPDATE_FORMATS, 'wiki content-update');

  const body = {
    content,
    format_type: formatType,
  };

  return await client.request(
    'PUT',
    `/v1/wiki/pages/${args.page_id}/content`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Version subcommands ────────────────────────────────────────────────

function parseVersionListArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki version-list',
    maxPositionals: 1,
    positionalError: 'A page id is required',
  });
  return { page_id: positionals[0] };
}

async function runVersionList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/wiki/pages/${args.page_id}/versions`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseVersionGetArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki version-get',
    maxPositionals: 2,
    positionalError: 'A page id and a version id are required',
  });
  return { page_id: positionals[0], version_id: positionals[1] };
}

async function runVersionGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/wiki/pages/${args.page_id}/versions/${args.version_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseVersionRestoreArgs(tokens) {
  const { positionals } = parseArgs(tokens, {
    usage: 'wiki version-restore',
    maxPositionals: 2,
    positionalError: 'A page id and a version id are required',
  });
  return { page_id: positionals[0], version_id: positionals[1] };
}

async function runVersionRestore(client, opts, args) {
  return await client.request(
    'POST',
    `/v1/wiki/pages/${args.page_id}/versions/${args.version_id}/restore`,
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
      case 'space-list': {
        const args = parseSpaceListArgs(subArgs);
        result = await runSpaceList(client, opts, args);
        break;
      }
      case 'space-create': {
        const args = parseSpaceCreateArgs(subArgs);
        result = await runSpaceCreate(client, opts, args);
        break;
      }
      case 'space-get': {
        const args = parseSpaceGetArgs(subArgs);
        result = await runSpaceGet(client, opts, args);
        break;
      }
      case 'space-update': {
        const args = parseSpaceUpdateArgs(subArgs);
        result = await runSpaceUpdate(client, opts, args);
        break;
      }
      case 'space-delete': {
        const args = parseSpaceDeleteArgs(subArgs);
        result = await runSpaceDelete(client, opts, args);
        break;
      }
      case 'member-add': {
        const args = parseMemberAddArgs(subArgs);
        result = await runMemberAdd(client, opts, args);
        break;
      }
      case 'member-get': {
        const args = parseMemberGetArgs(subArgs);
        result = await runMemberGet(client, opts, args);
        break;
      }
      case 'member-list': {
        const args = parseMemberListArgs(subArgs);
        result = await runMemberList(client, opts, args);
        break;
      }
      case 'member-remove': {
        const args = parseMemberRemoveArgs(subArgs);
        result = await runMemberRemove(client, opts, args);
        break;
      }
      case 'page-list': {
        const args = parsePageListArgs(subArgs);
        result = await runPageList(client, opts, args);
        break;
      }
      case 'page-create': {
        const args = parsePageCreateArgs(subArgs);
        result = await runPageCreate(client, opts, args);
        break;
      }
      case 'page-get': {
        const args = parsePageGetArgs(subArgs);
        result = await runPageGet(client, opts, args);
        break;
      }
      case 'page-update': {
        const args = parsePageUpdateArgs(subArgs);
        result = await runPageUpdate(client, opts, args);
        break;
      }
      case 'page-delete': {
        const args = parsePageDeleteArgs(subArgs);
        result = await runPageDelete(client, opts, args);
        break;
      }
      case 'content-get': {
        const args = parseContentGetArgs(subArgs);
        result = await runContentGet(client, opts, args);
        break;
      }
      case 'content-update': {
        const args = parseContentUpdateArgs(subArgs);
        result = await runContentUpdate(client, opts, args);
        break;
      }
      case 'version-list': {
        const args = parseVersionListArgs(subArgs);
        result = await runVersionList(client, opts, args);
        break;
      }
      case 'version-get': {
        const args = parseVersionGetArgs(subArgs);
        result = await runVersionGet(client, opts, args);
        break;
      }
      case 'version-restore': {
        const args = parseVersionRestoreArgs(subArgs);
        result = await runVersionRestore(client, opts, args);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown wiki subcommand: ${subcommand}. Use wiki --help for usage.`);
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

shared.registerModule('wiki', {
  name: 'wiki',
  description: 'Manage PingCode wiki spaces and pages',
  run,
});

module.exports = { run, printHelp };
