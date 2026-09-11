'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode version — Manage PingCode releases (versions)',
    '',
    'Usage: pingcode version <subcommand> [options]',
    '',
    'Subcommands:',
    '  list <project_id> [options]                 List versions of a project',
    '  create <project_id> [options]               Create a version',
    '  get <project_id> <version_id>               Show a version',
    '  update <project_id> <version_id> [options]  Partially update a version',
    '  delete <project_id> <version_id>            Delete a version',
    '  bulk-create                                 Bulk create versions',
    '    --items JSON                              JSON array of version objects (max 100)',
    '',
    '  stage-list                                  List version stages',
    '  stage-create [options]                      Create a version stage',
    '  stage-get <stage_id>                        Show a version stage',
    '  stage-update <stage_id> [options]           Partially update a version stage',
    '  stage-delete <stage_id> [options]           Delete a version stage',
    '',
    '  section-list <project_id>                   List version sections',
    '  section-create <project_id> [options]       Create a version section',
    '  section-get <project_id> <section_id>       Show a version section',
    '  section-update <project_id> <section_id> [options]',
    '                                              Partially update a version section',
    '  section-delete <project_id> <section_id>    Delete a version section',
    '',
    '  category-list <project_id>                  List version categories',
    '  category-create <project_id> [options]      Create a version category',
    '  category-get <project_id> <category_id>     Show a version category',
    '  category-update <project_id> <category_id> [options]',
    '                                              Partially update a version category',
    '  category-delete <project_id> <category_id>  Delete a version category',
    '',
    'Examples:',
    '  # 列出项目的版本',
    '  pingcode version list PROJECT_ID --compact',
    '  # 新建版本',
    '  pingcode version create PROJECT_ID --name v1.0.0 --start-at 2024-01-01 --end-at 2024-02-01 --assignee-id USER_ID',
    '  # 重命名版本',
    '  pingcode version update PROJECT_ID VERSION_ID --name v1.0.1',
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
        'Usage: pingcode version list <project_id> [options]',
        '',
        'List versions of a project.',
        '',
        'Options:',
        '  --name TEXT                Filter by version name',
        '  --status STATUS            Filter by status: pending, in_progress, published',
        '  --created-between RANGE    Created between "start,end" (comma separated)',
        '  --updated-between RANGE    Updated between "start,end" (comma separated)',
      ].join('\n'));
      break;
    case 'create':
      console.log([
        'Usage: pingcode version create <project_id> [options]',
        '',
        'Create a version.',
        '',
        'Options:',
        '  --name TEXT                Version name (unique within the project) (required)',
        '  --start-at TIME            Start time, Unix timestamp or ISO date (required)',
        '  --end-at TIME              End time, Unix timestamp or ISO date (required)',
        '  --assignee-id ID           Assignee user id (required)',
        '  --stage-id ID              Version stage id',
        '  --category-ids IDS         Comma-separated version category ids',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode version get <project_id> <version_id>',
        '',
        'Show a single version.',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode version update <project_id> <version_id> [options]',
        '',
        'Partially update a version. At least one option is required.',
        '',
        'Options:',
        '  --name TEXT                Version name (unique within the project)',
        '  --start-at TIME            Start time, Unix timestamp or ISO date',
        '  --end-at TIME              End time, Unix timestamp or ISO date',
        '  --assignee-id ID           Assignee user id',
        '  --stage-id ID              Version stage id',
        '  --operate-at TIME          Stage date (must be sent together with --stage-id)',
        '  --category-ids IDS         Comma-separated version category ids',
      ].join('\n'));
      break;
    case 'delete':
      console.log([
        'Usage: pingcode version delete <project_id> <version_id>',
        '',
        'Delete a version.',
      ].join('\n'));
      break;
    case 'bulk-create':
      console.log([
        'Usage: pingcode version bulk-create --items JSON',
        '',
        'Bulk create versions.',
        '',
        'Options:',
        '  --items JSON               JSON array of version objects, each with project_id,',
        '                             name, start_at, end_at, assignee_id and optional',
        '                             stage_id / category_ids (max 100 items)',
      ].join('\n'));
      break;
    case 'stage-list':
      console.log([
        'Usage: pingcode version stage-list',
        '',
        'List version stages.',
      ].join('\n'));
      break;
    case 'stage-create':
      console.log([
        'Usage: pingcode version stage-create [options]',
        '',
        'Create a version stage.',
        '',
        'Options:',
        '  --name TEXT                Stage name (unique within the enterprise) (required)',
        '  --type TYPE                Stage type: pending, in_progress, published (required)',
      ].join('\n'));
      break;
    case 'stage-get':
      console.log([
        'Usage: pingcode version stage-get <stage_id>',
        '',
        'Show a single version stage.',
      ].join('\n'));
      break;
    case 'stage-update':
      console.log([
        'Usage: pingcode version stage-update <stage_id> [options]',
        '',
        'Partially update a version stage. At least one option is required.',
        '',
        'Options:',
        '  --name TEXT                Stage name (unique within the enterprise)',
        '  --type TYPE                Stage type: pending, in_progress, published',
      ].join('\n'));
      break;
    case 'stage-delete':
      console.log([
        'Usage: pingcode version stage-delete <stage_id> [options]',
        '',
        'Delete a version stage.',
        '',
        'Options:',
        '  --replace-id ID            Replacement stage id (required by the server when',
        '                             the stage is in use)',
      ].join('\n'));
      break;
    case 'section-list':
      console.log([
        'Usage: pingcode version section-list <project_id>',
        '',
        'List version sections of a project.',
      ].join('\n'));
      break;
    case 'section-create':
      console.log([
        'Usage: pingcode version section-create <project_id> [options]',
        '',
        'Create a version section.',
        '',
        'Options:',
        '  --name TEXT                Section name (required)',
        '  --description TEXT         Section description',
      ].join('\n'));
      break;
    case 'section-get':
      console.log([
        'Usage: pingcode version section-get <project_id> <section_id>',
        '',
        'Show a single version section.',
      ].join('\n'));
      break;
    case 'section-update':
      console.log([
        'Usage: pingcode version section-update <project_id> <section_id> [options]',
        '',
        'Partially update a version section.',
        '',
        'Options:',
        '  --name TEXT                Section name (required)',
        '  --description TEXT         Section description',
      ].join('\n'));
      break;
    case 'section-delete':
      console.log([
        'Usage: pingcode version section-delete <project_id> <section_id>',
        '',
        'Delete a version section.',
      ].join('\n'));
      break;
    case 'category-list':
      console.log([
        'Usage: pingcode version category-list <project_id>',
        '',
        'List version categories of a project.',
      ].join('\n'));
      break;
    case 'category-create':
      console.log([
        'Usage: pingcode version category-create <project_id> [options]',
        '',
        'Create a version category.',
        '',
        'Options:',
        '  --name TEXT                Category name (required)',
        '  --section-id ID            Version section the category belongs to',
      ].join('\n'));
      break;
    case 'category-get':
      console.log([
        'Usage: pingcode version category-get <project_id> <category_id>',
        '',
        'Show a single version category.',
      ].join('\n'));
      break;
    case 'category-update':
      console.log([
        'Usage: pingcode version category-update <project_id> <category_id> [options]',
        '',
        'Partially update a version category. At least one option is required.',
        '',
        'Options:',
        '  --name TEXT                Category name',
        '  --section-id ID            Version section the category belongs to',
      ].join('\n'));
      break;
    case 'category-delete':
      console.log([
        'Usage: pingcode version category-delete <project_id> <category_id>',
        '',
        'Delete a version category.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Shared argument parsing ────────────────────────────────────────────

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

function requireProjectId(positionals, usageLabel) {
  if (positionals.length === 0) {
    throw new core.PingCodeError(`A project id is required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use ${usageLabel} --help for usage.`);
  }
  return positionals[0];
}

function requireNoPositionals(positionals, usageLabel) {
  if (positionals.length > 0) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[0]}. Use ${usageLabel} --help for usage.`);
  }
}

function requireSingleId(positionals, resourceLabel, usageLabel) {
  if (positionals.length === 0) {
    throw new core.PingCodeError(`A ${resourceLabel} id is required. Use ${usageLabel} --help for usage.`);
  }
  requireNoPositionals(positionals.slice(1), usageLabel);
  return positionals[0];
}

function requireProjectIdAndResourceId(positionals, resourceLabel, usageLabel) {
  if (positionals.length < 2) {
    throw new core.PingCodeError(`A project id and a ${resourceLabel} id are required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use ${usageLabel} --help for usage.`);
  }
  return { projectId: positionals[0], resourceId: positionals[1] };
}

function requireString(args, key, flag, usageLabel) {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new core.PingCodeError(`${flag} is required and must be non-empty. Use ${usageLabel} --help for usage.`);
  }
  return value;
}

function requireTimestamp(args, key, flag, usageLabel) {
  if (args[key] === null) {
    throw new core.PingCodeError(`${flag} is required and must be a Unix timestamp or ISO date. Use ${usageLabel} --help for usage.`);
  }
  return args[key];
}

function requireEnum(value, flag, allowed, usageLabel) {
  if (!allowed.includes(value)) {
    throw new core.PingCodeError(`${flag} must be one of: ${allowed.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  return value;
}

function requireAtLeastOneField(args, usageLabel) {
  const hasField = Object.values(args).some((value) => value !== null);
  if (!hasField) {
    throw new core.PingCodeError(`At least one field to update is required. Use ${usageLabel} --help for usage.`);
  }
}

const VERSION_STATUS_VALUES = ['pending', 'in_progress', 'published'];

function parseTimestamp(value, label) {
  const trimmed = String(value).trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new core.PingCodeError(`${label} must be a Unix timestamp or ISO date string`);
  }
  return Math.floor(date.getTime() / 1000);
}

function parseIdList(value, flag) {
  const ids = String(value).split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new core.PingCodeError(`${flag} must be a comma-separated list of ids`);
  }
  return ids;
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

// ── Version subcommands ────────────────────────────────────────────────

function parseListArgs(tokens) {
  const usageLabel = 'version list';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--status': 'status',
    '--created-between': 'created_between',
    '--updated-between': 'updated_between',
  }, usageLabel);
  const projectId = requireProjectId(positionals, usageLabel);
  if (args.status !== null) {
    requireEnum(args.status, '--status', VERSION_STATUS_VALUES, usageLabel);
  }
  return { projectId, ...args };
}

async function runList(client, opts, args) {
  const params = {};
  if (args.name !== null) {
    params.name = args.name;
  }
  if (args.status !== null) {
    params.status = args.status;
  }
  if (args.created_between !== null) {
    params.created_between = args.created_between;
  }
  if (args.updated_between !== null) {
    params.updated_between = args.updated_between;
  }
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.projectId}/versions`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCreateArgs(tokens) {
  const usageLabel = 'version create';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--start-at': 'start_at',
    '--end-at': 'end_at',
    '--assignee-id': 'assignee_id',
    '--stage-id': 'stage_id',
    '--category-ids': 'category_ids',
  }, usageLabel);
  const projectId = requireProjectId(positionals, usageLabel);
  requireString(args, 'name', '--name', usageLabel);
  requireTimestamp(args, 'start_at', '--start-at', usageLabel);
  requireTimestamp(args, 'end_at', '--end-at', usageLabel);
  requireString(args, 'assignee_id', '--assignee-id', usageLabel);
  return { projectId, ...args };
}

async function runCreate(client, opts, args) {
  const body = {
    name: args.name,
    start_at: parseTimestamp(args.start_at, '--start-at'),
    end_at: parseTimestamp(args.end_at, '--end-at'),
    assignee_id: args.assignee_id,
  };
  if (args.stage_id !== null) {
    body.stage_id = args.stage_id;
  }
  if (args.category_ids !== null) {
    body.category_ids = parseIdList(args.category_ids, '--category-ids');
  }
  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.projectId}/versions`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseGetArgs(tokens) {
  const usageLabel = 'version get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'version', usageLabel);
  return { projectId, versionId: resourceId };
}

async function runGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.projectId}/versions/${args.versionId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUpdateArgs(tokens) {
  const usageLabel = 'version update';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--start-at': 'start_at',
    '--end-at': 'end_at',
    '--assignee-id': 'assignee_id',
    '--stage-id': 'stage_id',
    '--operate-at': 'operate_at',
    '--category-ids': 'category_ids',
  }, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'version', usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { projectId, versionId: resourceId, ...args };
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) {
    body.name = args.name;
  }
  if (args.start_at !== null) {
    body.start_at = parseTimestamp(args.start_at, '--start-at');
  }
  if (args.end_at !== null) {
    body.end_at = parseTimestamp(args.end_at, '--end-at');
  }
  if (args.assignee_id !== null) {
    body.assignee_id = args.assignee_id;
  }
  if (args.stage_id !== null) {
    body.stage_id = args.stage_id;
  }
  if (args.operate_at !== null) {
    body.operate_at = parseTimestamp(args.operate_at, '--operate-at');
  }
  if (args.category_ids !== null) {
    body.category_ids = parseIdList(args.category_ids, '--category-ids');
  }
  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.projectId}/versions/${args.versionId}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseDeleteArgs(tokens) {
  const usageLabel = 'version delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'version', usageLabel);
  return { projectId, versionId: resourceId };
}

async function runDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.projectId}/versions/${args.versionId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── bulk-create subcommand ─────────────────────────────────────────────

function parseBulkCreateArgs(tokens) {
  const usageLabel = 'version bulk-create';
  const { args, positionals } = collectArgs(tokens, {
    '--items': 'items',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  if (args.items === null || !args.items.trim()) {
    throw new core.PingCodeError('--items is required and must be a JSON array of version objects. Use version bulk-create --help for usage.');
  }
  const items = parseJsonArray(args.items, '--items');
  for (const item of items) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new core.PingCodeError('--items must be a JSON array of version objects');
    }
  }
  if (items.length > 100) {
    throw new core.PingCodeError('--items must contain at most 100 versions');
  }
  return { items };
}

async function runBulkCreate(client, opts, args) {
  return await client.request(
    'POST',
    '/v1/pjm/versions/bulk',
    null,
    { versions: args.items },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Stage subcommands ──────────────────────────────────────────────────

function parseStageListArgs(tokens) {
  const usageLabel = 'version stage-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  return {};
}

async function runStageList(client, opts) {
  return await client.request(
    'GET',
    '/v1/pjm/stages',
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseStageCreateArgs(tokens) {
  const usageLabel = 'version stage-create';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--type': 'type',
  }, usageLabel);
  requireNoPositionals(positionals, usageLabel);
  requireString(args, 'name', '--name', usageLabel);
  if (args.type === null) {
    throw new core.PingCodeError(`--type is required and must be one of: ${VERSION_STATUS_VALUES.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  requireEnum(args.type, '--type', VERSION_STATUS_VALUES, usageLabel);
  return args;
}

async function runStageCreate(client, opts, args) {
  return await client.request(
    'POST',
    '/v1/pjm/stages',
    null,
    { name: args.name, type: args.type },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseStageGetArgs(tokens) {
  const usageLabel = 'version stage-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const stageId = requireSingleId(positionals, 'stage', usageLabel);
  return { stageId };
}

async function runStageGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/stages/${args.stageId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseStageUpdateArgs(tokens) {
  const usageLabel = 'version stage-update';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--type': 'type',
  }, usageLabel);
  const stageId = requireSingleId(positionals, 'stage', usageLabel);
  requireAtLeastOneField(args, usageLabel);
  if (args.type !== null) {
    requireEnum(args.type, '--type', VERSION_STATUS_VALUES, usageLabel);
  }
  return { stageId, ...args };
}

async function runStageUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) {
    body.name = args.name;
  }
  if (args.type !== null) {
    body.type = args.type;
  }
  return await client.request(
    'PATCH',
    `/v1/pjm/stages/${args.stageId}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseStageDeleteArgs(tokens) {
  const usageLabel = 'version stage-delete';
  const { args, positionals } = collectArgs(tokens, {
    '--replace-id': 'replace_id',
  }, usageLabel);
  const stageId = requireSingleId(positionals, 'stage', usageLabel);
  return { stageId, replace_id: args.replace_id };
}

async function runStageDelete(client, opts, args) {
  const params = args.replace_id !== null ? { replace_id: args.replace_id } : null;
  return await client.request(
    'DELETE',
    `/v1/pjm/stages/${args.stageId}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Section subcommands ────────────────────────────────────────────────

function parseSectionListArgs(tokens) {
  const usageLabel = 'version section-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const projectId = requireProjectId(positionals, usageLabel);
  return { projectId };
}

async function runSectionList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.projectId}/version_sections`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionCreateArgs(tokens) {
  const usageLabel = 'version section-create';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--description': 'description',
  }, usageLabel);
  const projectId = requireProjectId(positionals, usageLabel);
  requireString(args, 'name', '--name', usageLabel);
  return { projectId, ...args };
}

async function runSectionCreate(client, opts, args) {
  const body = { name: args.name };
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.projectId}/version_sections`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionGetArgs(tokens) {
  const usageLabel = 'version section-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'section', usageLabel);
  return { projectId, sectionId: resourceId };
}

async function runSectionGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.projectId}/version_sections/${args.sectionId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionUpdateArgs(tokens) {
  const usageLabel = 'version section-update';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--description': 'description',
  }, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'section', usageLabel);
  requireString(args, 'name', '--name', usageLabel);
  return { projectId, sectionId: resourceId, ...args };
}

async function runSectionUpdate(client, opts, args) {
  const body = { name: args.name };
  if (args.description !== null) {
    body.description = args.description;
  }
  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.projectId}/version_sections/${args.sectionId}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSectionDeleteArgs(tokens) {
  const usageLabel = 'version section-delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'section', usageLabel);
  return { projectId, sectionId: resourceId };
}

async function runSectionDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.projectId}/version_sections/${args.sectionId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Category subcommands ───────────────────────────────────────────────

function parseCategoryListArgs(tokens) {
  const usageLabel = 'version category-list';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const projectId = requireProjectId(positionals, usageLabel);
  return { projectId };
}

async function runCategoryList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.projectId}/version_categories`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryCreateArgs(tokens) {
  const usageLabel = 'version category-create';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--section-id': 'section_id',
  }, usageLabel);
  const projectId = requireProjectId(positionals, usageLabel);
  requireString(args, 'name', '--name', usageLabel);
  return { projectId, ...args };
}

async function runCategoryCreate(client, opts, args) {
  const body = { name: args.name };
  if (args.section_id !== null) {
    body.section_id = args.section_id;
  }
  return await client.request(
    'POST',
    `/v1/pjm/projects/${args.projectId}/version_categories`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryGetArgs(tokens) {
  const usageLabel = 'version category-get';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'category', usageLabel);
  return { projectId, categoryId: resourceId };
}

async function runCategoryGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/pjm/projects/${args.projectId}/version_categories/${args.categoryId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryUpdateArgs(tokens) {
  const usageLabel = 'version category-update';
  const { args, positionals } = collectArgs(tokens, {
    '--name': 'name',
    '--section-id': 'section_id',
  }, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'category', usageLabel);
  requireAtLeastOneField(args, usageLabel);
  return { projectId, categoryId: resourceId, ...args };
}

async function runCategoryUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) {
    body.name = args.name;
  }
  if (args.section_id !== null) {
    body.section_id = args.section_id;
  }
  return await client.request(
    'PATCH',
    `/v1/pjm/projects/${args.projectId}/version_categories/${args.categoryId}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCategoryDeleteArgs(tokens) {
  const usageLabel = 'version category-delete';
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  const { projectId, resourceId } = requireProjectIdAndResourceId(positionals, 'category', usageLabel);
  return { projectId, categoryId: resourceId };
}

async function runCategoryDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/pjm/projects/${args.projectId}/version_categories/${args.categoryId}`,
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
        const args = parseListArgs(subArgs);
        result = await runList(client, opts, args);
        break;
      }
      case 'create': {
        const args = parseCreateArgs(subArgs);
        result = await runCreate(client, opts, args);
        break;
      }
      case 'get': {
        const args = parseGetArgs(subArgs);
        result = await runGet(client, opts, args);
        break;
      }
      case 'update': {
        const args = parseUpdateArgs(subArgs);
        result = await runUpdate(client, opts, args);
        break;
      }
      case 'delete': {
        const args = parseDeleteArgs(subArgs);
        result = await runDelete(client, opts, args);
        break;
      }
      case 'bulk-create': {
        const args = parseBulkCreateArgs(subArgs);
        result = await runBulkCreate(client, opts, args);
        break;
      }
      case 'stage-list': {
        parseStageListArgs(subArgs);
        result = await runStageList(client, opts);
        break;
      }
      case 'stage-create': {
        const args = parseStageCreateArgs(subArgs);
        result = await runStageCreate(client, opts, args);
        break;
      }
      case 'stage-get': {
        const args = parseStageGetArgs(subArgs);
        result = await runStageGet(client, opts, args);
        break;
      }
      case 'stage-update': {
        const args = parseStageUpdateArgs(subArgs);
        result = await runStageUpdate(client, opts, args);
        break;
      }
      case 'stage-delete': {
        const args = parseStageDeleteArgs(subArgs);
        result = await runStageDelete(client, opts, args);
        break;
      }
      case 'section-list': {
        const args = parseSectionListArgs(subArgs);
        result = await runSectionList(client, opts, args);
        break;
      }
      case 'section-create': {
        const args = parseSectionCreateArgs(subArgs);
        result = await runSectionCreate(client, opts, args);
        break;
      }
      case 'section-get': {
        const args = parseSectionGetArgs(subArgs);
        result = await runSectionGet(client, opts, args);
        break;
      }
      case 'section-update': {
        const args = parseSectionUpdateArgs(subArgs);
        result = await runSectionUpdate(client, opts, args);
        break;
      }
      case 'section-delete': {
        const args = parseSectionDeleteArgs(subArgs);
        result = await runSectionDelete(client, opts, args);
        break;
      }
      case 'category-list': {
        const args = parseCategoryListArgs(subArgs);
        result = await runCategoryList(client, opts, args);
        break;
      }
      case 'category-create': {
        const args = parseCategoryCreateArgs(subArgs);
        result = await runCategoryCreate(client, opts, args);
        break;
      }
      case 'category-get': {
        const args = parseCategoryGetArgs(subArgs);
        result = await runCategoryGet(client, opts, args);
        break;
      }
      case 'category-update': {
        const args = parseCategoryUpdateArgs(subArgs);
        result = await runCategoryUpdate(client, opts, args);
        break;
      }
      case 'category-delete': {
        const args = parseCategoryDeleteArgs(subArgs);
        result = await runCategoryDelete(client, opts, args);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown version subcommand: ${subcommand}. Use version --help for usage.`);
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

shared.registerModule('version', {
  name: 'version',
  description: 'Manage PingCode releases (versions)',
  run,
});

module.exports = { run, printHelp };
