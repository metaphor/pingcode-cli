'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Constants ──────────────────────────────────────────────────────────

const PARTICIPANTS_PATH = '/v1/participants';
const RELATIONS_PATH = '/v1/relations';
const ACTIVITIES_PATH = '/v1/activities';
const AUDIT_LOGS_PATH = '/v1/security/audit_logs';
const LOGIN_LOGS_PATH = '/v1/security/login_logs';

// docs/PINGCODE_API.md「关注人」: principal_type 允许值
const PARTICIPANT_PRINCIPAL_TYPES = ['work_item', 'test_case', 'idea', 'ticket', 'page'];
// docs/PINGCODE_API.md「关注人」: type 允许值
const PARTICIPANT_TYPE_VALUES = ['user', 'user_group'];
// docs/PINGCODE_API.md「关联」: principal_type 允许值（资源属性表）
const RELATION_PRINCIPAL_TYPES = ['idea', 'ticket', 'work_item', 'test_plan', 'test_run', 'test_case', 'page'];
// docs/PINGCODE_API.md「关联」: target_type 允许值（资源属性表）
const RELATION_TARGET_TYPES = ['ticket', 'work_item', 'test_case', 'idea', 'page'];
// docs/PINGCODE_API.md「活动记录」: principal_type 允许值
const ACTIVITY_PRINCIPAL_TYPES = ['work_item', 'test_run', 'test_case', 'idea', 'ticket'];

// PingCode identifiers look like: PROJECT_KEY-NUMBER (e.g., SCR-1, TASK-42)
const IDENTIFIER_RE = /^[A-Z]{3,6}-\d+$/;

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode platform — Manage PingCode platform resources (participants, relations, activities, audit logs)',
    '',
    'Usage: pingcode platform <subcommand> [options]',
    '',
    'Subcommands:',
    '  participant-add <principal_id|identifier> [options]',
    '                                  Add a participant (watcher) to a principal',
    '    --participant-id ID          Watched user or user group id (required)',
    '    --type TYPE                  Participant type: user, user_group (required)',
    '    --principal-type TYPE        Principal type: work_item (default), test_case, idea, ticket, page',
    '    --review-id ID               Review principal id; may replace the principal id',
    '',
    '  participant-list <principal_id|identifier> [options]',
    '                                  List participants of a principal',
    '  participant-get <participant_id> <principal_id|identifier> [options]',
    '                                  Show one participant',
    '  participant-remove <participant_id> <principal_id|identifier> [options]',
    '                                  Remove a participant from a principal',
    '',
    '  link-create <principal_id> <target_id> [options]',
    '                                  Create a relation between two resources',
    '    --principal-type TYPE        Principal type (required): idea, ticket, work_item, test_plan, test_run, test_case, page',
    '    --target-type TYPE           Target type (required): ticket, work_item, test_case, idea, page',
    '  link-get <relation_id>         Show a relation',
    '  link-list <principal_id> [options]',
    '                                  List relations of a principal',
    '  link-remove <relation_id>      Delete a relation',
    '',
    '  activity-list <principal_id> [options]',
    '                                  List activity records of a principal',
    '    --principal-type TYPE        Principal type (required): work_item, test_run, test_case, idea, ticket',
    '  activity-get <activity_id> <principal_id> [options]',
    '                                  Show one activity record',
    '',
    '  audit-logs [options]           List audit logs (read-only)',
    '    --operated-between RANGE     Operation time range "start,end" (required)',
    '    --operated-bys IDS           Comma-separated operator ids, up to 20',
    '',
    '  login-logs [options]           List login logs (read-only)',
    '    --logged-between RANGE       Login time range "start,end" (required)',
    '    --user-ids IDS               Comma-separated member ids, up to 20',
    '',
    'Identifier refs like SCR-123 resolve only for participant-* with the',
    'work_item principal (default); every other principal type needs a raw id.',
    '',
    'Examples:',
    '  # 给工作项添加关注人',
    '  pingcode platform participant-add SCR-123 --participant-id USER_ID --type user',
    '  # 查看工作项的动态记录',
    '  pingcode platform activity-list WORK_ITEM_ID --principal-type work_item --compact',
    '  # 查询审计日志',
    '  pingcode platform audit-logs --operated-between 2024-01-01,2024-02-01 --compact',
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
  'participant-add': [
    'Usage: pingcode platform participant-add <principal_id|identifier> [options]',
    '',
    'Add a participant (watcher) to a principal.',
    '',
    'Options:',
    '  --participant-id ID       Watched user id or user group id (required)',
    '  --type TYPE               Participant type: user, user_group (required)',
    '  --principal-type TYPE     Principal type: work_item (default), test_case, idea, ticket, page',
    '  --review-id ID            Review principal id. Either a principal id or',
    '                            --review-id must be given; the API ignores',
    '                            --review-id when both are present.',
    '',
    'Examples:',
    '  pingcode platform participant-add SCR-123 --participant-id a0417f68e846aae315c85d24643678a9 --type user --dry-run',
    '  pingcode platform participant-add --principal-type idea --review-id 6f168f764eba01a5278b87cd --participant-id a0417f68e846aae315c85d24643678a9 --type user',
  ].join('\n'),
  'participant-list': [
    'Usage: pingcode platform participant-list <principal_id|identifier> [options]',
    '',
    'List participants of a principal.',
    '',
    'Options:',
    '  --principal-type TYPE     Principal type: work_item (default), test_case, idea, ticket, page',
    '  --review-id ID            Review principal id. Either a principal id or --review-id must be given.',
  ].join('\n'),
  'participant-get': [
    'Usage: pingcode platform participant-get <participant_id> <principal_id|identifier> [options]',
    '',
    'Show one participant. The participant id is the watched user or user group id.',
    '',
    'Options:',
    '  --principal-type TYPE     Principal type: work_item (default), test_case, idea, ticket, page',
    '  --review-id ID            Review principal id. Either a principal id or --review-id must be given.',
  ].join('\n'),
  'participant-remove': [
    'Usage: pingcode platform participant-remove <participant_id> <principal_id|identifier> [options]',
    '',
    'Remove a participant from a principal. The participant id is the watched',
    'user or user group id.',
    '',
    'Options:',
    '  --principal-type TYPE     Principal type: work_item (default), test_case, idea, ticket, page',
    '  --review-id ID            Review principal id. Either a principal id or --review-id must be given.',
  ].join('\n'),
  'link-create': [
    'Usage: pingcode platform link-create <principal_id> <target_id> --principal-type TYPE --target-type TYPE',
    '',
    'Create a relation between two resources.',
    '',
    'Options:',
    '  --principal-type TYPE     Principal type (required): idea, ticket, work_item, test_plan, test_run, test_case, page',
    '  --target-type TYPE        Target type (required): ticket, work_item, test_case, idea, page',
    '',
    'Examples:',
    '  pingcode platform link-create 547000eb6a70571487623fea 5edca524cad2fa1125cb0630 --principal-type test_run --target-type work_item --dry-run',
  ].join('\n'),
  'link-get': [
    'Usage: pingcode platform link-get <relation_id>',
    '',
    'Show a relation.',
  ].join('\n'),
  'link-list': [
    'Usage: pingcode platform link-list <principal_id> --principal-type TYPE --target-type TYPE',
    '',
    'List relations of a principal.',
    '',
    'Options:',
    '  --principal-type TYPE     Principal type (required): idea, ticket, work_item, test_plan, test_run, test_case, page',
    '  --target-type TYPE        Target type (required): ticket, work_item, test_case, idea, page',
  ].join('\n'),
  'link-remove': [
    'Usage: pingcode platform link-remove <relation_id>',
    '',
    'Delete a relation.',
  ].join('\n'),
  'activity-list': [
    'Usage: pingcode platform activity-list <principal_id> --principal-type TYPE',
    '',
    'List activity records of a principal.',
    '',
    'Options:',
    '  --principal-type TYPE     Principal type (required): work_item, test_run, test_case, idea, ticket',
  ].join('\n'),
  'activity-get': [
    'Usage: pingcode platform activity-get <activity_id> <principal_id> --principal-type TYPE',
    '',
    'Show one activity record.',
    '',
    'Options:',
    '  --principal-type TYPE     Principal type (required): work_item, test_run, test_case, idea, ticket',
  ].join('\n'),
  'audit-logs': [
    'Usage: pingcode platform audit-logs --operated-between RANGE [options]',
    '',
    'List audit logs (read-only). Requires the pcp:read:global:security scope.',
    '',
    'Options:',
    '  --operated-between RANGE  Operation time range "start,end" (required)',
    '  --operated-bys IDS        Comma-separated operator ids, up to 20',
    '',
    'Examples:',
    '  pingcode platform audit-logs --operated-between 2024-01-01,2024-02-01 --dry-run',
  ].join('\n'),
  'login-logs': [
    'Usage: pingcode platform login-logs --logged-between RANGE [options]',
    '',
    'List login logs (read-only). Requires the pcp:read:global:security scope.',
    '',
    'Options:',
    '  --logged-between RANGE    Login time range "start,end" (required)',
    '  --user-ids IDS            Comma-separated member ids, up to 20',
    '',
    'Examples:',
    '  pingcode platform login-logs --logged-between 2024-01-01,2024-02-01 --dry-run',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  if (subcommand in SUBCOMMAND_HELP) {
    console.log(SUBCOMMAND_HELP[subcommand]);
    return;
  }
  printHelp();
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

function requireEnum(value, flag, allowed, usageLabel) {
  if (!allowed.includes(value)) {
    throw new core.PingCodeError(`${flag} must be one of: ${allowed.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  return value;
}

// Resolve a principal reference: identifier refs resolve only for the
// work_item principal; other principals take raw ids only.
function assertPrincipalRefSupported(principalRef, principalType, usageLabel) {
  if (IDENTIFIER_RE.test(principalRef) && principalType !== 'work_item') {
    throw new core.PingCodeError(
      `Identifier refs like ${principalRef} are only supported for the work_item principal; `
      + `pass a raw id for '${principalType}'. Use ${usageLabel} --help for usage.`,
    );
  }
}

// Compound dry-run shape for identifier resolution, mirroring workitem.js runUpdate.
function compoundDryRun(key, request, identifier) {
  return {
    dry_run: true,
    resolution: {
      method: 'GET',
      path: '/v1/project/work_items',
      params: { identifier },
    },
    [key]: request,
  };
}

async function resolveIdentifier(client, identifier) {
  return await core.resolveWorkItemIdentifier(client, identifier);
}

// ── participant-add subcommand ────────────────────────────────────────

function parseParticipantAddArgs(tokens) {
  const usageLabel = 'platform participant-add';
  const stringFlags = {
    '--participant-id': 'participant_id',
    '--type': 'type',
    '--principal-type': 'principal_type',
    '--review-id': 'review_id',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use ${usageLabel} --help for usage.`);
  }
  const principalRef = positionals[0] || null;
  if (!principalRef && !args.review_id) {
    throw new core.PingCodeError(`A principal id or identifier (or --review-id) is required. Use ${usageLabel} --help for usage.`);
  }
  if (typeof args.participant_id !== 'string' || !args.participant_id.trim()) {
    throw new core.PingCodeError(`--participant-id is required and must be non-empty. Use ${usageLabel} --help for usage.`);
  }
  const principalType = args.principal_type === null ? 'work_item' : args.principal_type;
  requireEnum(principalType, '--principal-type', PARTICIPANT_PRINCIPAL_TYPES, usageLabel);
  if (typeof args.type !== 'string' || !args.type.trim()) {
    throw new core.PingCodeError(`--type is required and must be one of: ${PARTICIPANT_TYPE_VALUES.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  requireEnum(args.type, '--type', PARTICIPANT_TYPE_VALUES, usageLabel);
  if (principalRef) {
    assertPrincipalRefSupported(principalRef, principalType, usageLabel);
  }
  return {
    principal_ref: principalRef,
    principal_type: principalType,
    participant_id: args.participant_id,
    type: args.type,
    review_id: args.review_id,
  };
}

async function runParticipantAdd(client, opts, args) {
  const body = {
    principal_type: args.principal_type,
    type: args.type,
    participant_id: args.participant_id,
  };
  if (args.review_id) {
    body.review_id = args.review_id;
  }

  if (args.principal_ref && IDENTIFIER_RE.test(args.principal_ref)) {
    if (opts.dry_run) {
      return compoundDryRun('add', {
        method: 'POST',
        path: PARTICIPANTS_PATH,
        json: { ...body, principal_id: '{id}' },
      }, args.principal_ref);
    }

    body.principal_id = await resolveIdentifier(client, args.principal_ref);
    return await client.request(
      'POST',
      PARTICIPANTS_PATH,
      null,
      body,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  if (args.principal_ref) {
    body.principal_id = args.principal_ref;
  }
  return await client.request(
    'POST',
    PARTICIPANTS_PATH,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── participant-list / get / remove subcommands ───────────────────────

function parsePrincipalQueryArgs(tokens, usageLabel, principalCount, leadLabel) {
  const stringFlags = {
    '--principal-type': 'principal_type',
    '--review-id': 'review_id',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (principalCount === 2 && positionals.length < 1) {
    throw new core.PingCodeError(`${leadLabel} is required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > principalCount) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[principalCount]}. Use ${usageLabel} --help for usage.`);
  }
  const principalRef = positionals[principalCount - 1] || null;
  if (!principalRef && !args.review_id) {
    throw new core.PingCodeError(`A principal id or identifier (or --review-id) is required. Use ${usageLabel} --help for usage.`);
  }
  const principalType = args.principal_type === null ? 'work_item' : args.principal_type;
  requireEnum(principalType, '--principal-type', PARTICIPANT_PRINCIPAL_TYPES, usageLabel);
  if (principalRef) {
    assertPrincipalRefSupported(principalRef, principalType, usageLabel);
  }
  return {
    positionals,
    principal_ref: principalRef,
    principal_type: principalType,
    review_id: args.review_id,
  };
}

function buildParticipantQueryParams(args, resolvedPrincipalId) {
  const params = { principal_type: args.principal_type };
  if (resolvedPrincipalId !== undefined) {
    params.principal_id = resolvedPrincipalId;
  } else if (args.principal_ref) {
    params.principal_id = args.principal_ref;
  }
  if (args.review_id) {
    params.review_id = args.review_id;
  }
  return params;
}

async function requestParticipantList(client, opts, args, principalId) {
  const params = buildParticipantQueryParams(args, principalId);
  return await client.request(
    'GET',
    PARTICIPANTS_PATH,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runParticipantList(client, opts, args) {
  if (args.principal_ref && IDENTIFIER_RE.test(args.principal_ref)) {
    if (opts.dry_run) {
      return compoundDryRun('list', {
        method: 'GET',
        path: PARTICIPANTS_PATH,
        params: buildParticipantQueryParams(args, '{id}'),
      }, args.principal_ref);
    }

    const principalId = await resolveIdentifier(client, args.principal_ref);
    return await requestParticipantList(client, { dry_run: false }, args, principalId);
  }

  return await requestParticipantList(client, opts, args);
}

async function runParticipantGet(client, opts, args) {
  const participantId = args.positionals[0];
  const path = `${PARTICIPANTS_PATH}/${participantId}`;

  if (args.principal_ref && IDENTIFIER_RE.test(args.principal_ref)) {
    if (opts.dry_run) {
      return compoundDryRun('get', {
        method: 'GET',
        path,
        params: buildParticipantQueryParams(args, '{id}'),
      }, args.principal_ref);
    }

    const principalId = await resolveIdentifier(client, args.principal_ref);
    return await client.request(
      'GET',
      path,
      buildParticipantQueryParams(args, principalId),
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    path,
    buildParticipantQueryParams(args),
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runParticipantRemove(client, opts, args) {
  const participantId = args.positionals[0];
  const path = `${PARTICIPANTS_PATH}/${participantId}`;

  if (args.principal_ref && IDENTIFIER_RE.test(args.principal_ref)) {
    if (opts.dry_run) {
      return compoundDryRun('remove', {
        method: 'DELETE',
        path,
        params: buildParticipantQueryParams(args, '{id}'),
      }, args.principal_ref);
    }

    const principalId = await resolveIdentifier(client, args.principal_ref);
    return await client.request(
      'DELETE',
      path,
      buildParticipantQueryParams(args, principalId),
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'DELETE',
    path,
    buildParticipantQueryParams(args),
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── link-create / get / list / remove subcommands ─────────────────────

function parseLinkCreateArgs(tokens) {
  const usageLabel = 'platform link-create';
  const stringFlags = {
    '--principal-type': 'principal_type',
    '--target-type': 'target_type',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (positionals.length < 2) {
    throw new core.PingCodeError(`A principal id and a target id are required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use ${usageLabel} --help for usage.`);
  }
  if (typeof args.principal_type !== 'string' || !args.principal_type.trim()) {
    throw new core.PingCodeError(`--principal-type is required and must be one of: ${RELATION_PRINCIPAL_TYPES.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  requireEnum(args.principal_type, '--principal-type', RELATION_PRINCIPAL_TYPES, usageLabel);
  if (typeof args.target_type !== 'string' || !args.target_type.trim()) {
    throw new core.PingCodeError(`--target-type is required and must be one of: ${RELATION_TARGET_TYPES.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  requireEnum(args.target_type, '--target-type', RELATION_TARGET_TYPES, usageLabel);
  return {
    principal_id: positionals[0],
    target_id: positionals[1],
    principal_type: args.principal_type,
    target_type: args.target_type,
  };
}

async function runLinkCreate(client, opts, args) {
  const body = {
    principal_type: args.principal_type,
    principal_id: args.principal_id,
    target_type: args.target_type,
    target_id: args.target_id,
  };
  return await client.request(
    'POST',
    RELATIONS_PATH,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLinkIdArgs(tokens, label, usageLabel) {
  const { positionals } = collectArgs(tokens, {}, usageLabel);
  if (positionals.length < 1) {
    throw new core.PingCodeError(`A ${label} is required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use ${usageLabel} --help for usage.`);
  }
  return { relation_id: positionals[0] };
}

async function runLinkGet(client, opts, args) {
  return await client.request(
    'GET',
    `${RELATIONS_PATH}/${args.relation_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLinkListArgs(tokens) {
  const usageLabel = 'platform link-list';
  const stringFlags = {
    '--principal-type': 'principal_type',
    '--target-type': 'target_type',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (positionals.length < 1) {
    throw new core.PingCodeError(`A principal id is required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use ${usageLabel} --help for usage.`);
  }
  if (typeof args.principal_type !== 'string' || !args.principal_type.trim()) {
    throw new core.PingCodeError(`--principal-type is required and must be one of: ${RELATION_PRINCIPAL_TYPES.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  requireEnum(args.principal_type, '--principal-type', RELATION_PRINCIPAL_TYPES, usageLabel);
  if (typeof args.target_type !== 'string' || !args.target_type.trim()) {
    throw new core.PingCodeError(`--target-type is required and must be one of: ${RELATION_TARGET_TYPES.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  requireEnum(args.target_type, '--target-type', RELATION_TARGET_TYPES, usageLabel);
  return {
    principal_id: positionals[0],
    principal_type: args.principal_type,
    target_type: args.target_type,
  };
}

async function runLinkList(client, opts, args) {
  const params = {
    principal_type: args.principal_type,
    principal_id: args.principal_id,
    target_type: args.target_type,
  };
  return await client.request(
    'GET',
    RELATIONS_PATH,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runLinkRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `${RELATIONS_PATH}/${args.relation_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── activity-list / activity-get subcommands ──────────────────────────

function requireActivityPrincipalType(args, usageLabel) {
  if (typeof args.principal_type !== 'string' || !args.principal_type.trim()) {
    throw new core.PingCodeError(`--principal-type is required and must be one of: ${ACTIVITY_PRINCIPAL_TYPES.join(', ')}. Use ${usageLabel} --help for usage.`);
  }
  return requireEnum(args.principal_type, '--principal-type', ACTIVITY_PRINCIPAL_TYPES, usageLabel);
}

function parseActivityListArgs(tokens) {
  const usageLabel = 'platform activity-list';
  const stringFlags = {
    '--principal-type': 'principal_type',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (positionals.length < 1) {
    throw new core.PingCodeError(`A principal id is required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > 1) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[1]}. Use ${usageLabel} --help for usage.`);
  }
  const principalType = requireActivityPrincipalType(args, usageLabel);
  return { principal_id: positionals[0], principal_type: principalType };
}

async function runActivityList(client, opts, args) {
  const params = {
    principal_type: args.principal_type,
    principal_id: args.principal_id,
  };
  return await client.request(
    'GET',
    ACTIVITIES_PATH,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseActivityGetArgs(tokens) {
  const usageLabel = 'platform activity-get';
  const stringFlags = {
    '--principal-type': 'principal_type',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (positionals.length < 2) {
    throw new core.PingCodeError(`An activity id and a principal id are required. Use ${usageLabel} --help for usage.`);
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use ${usageLabel} --help for usage.`);
  }
  const principalType = requireActivityPrincipalType(args, usageLabel);
  return {
    activity_id: positionals[0],
    principal_id: positionals[1],
    principal_type: principalType,
  };
}

async function runActivityGet(client, opts, args) {
  const params = {
    principal_type: args.principal_type,
    principal_id: args.principal_id,
  };
  return await client.request(
    'GET',
    `${ACTIVITIES_PATH}/${args.activity_id}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── audit-logs / login-logs subcommands (read-only) ───────────────────

function parseAuditLogsArgs(tokens) {
  const usageLabel = 'platform audit-logs';
  const stringFlags = {
    '--operated-between': 'operated_between',
    '--operated-bys': 'operated_bys',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (positionals.length > 0) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[0]}. Use ${usageLabel} --help for usage.`);
  }
  if (typeof args.operated_between !== 'string' || !args.operated_between.trim()) {
    throw new core.PingCodeError(`--operated-between is required and must be non-empty. Use ${usageLabel} --help for usage.`);
  }
  const params = { operated_between: args.operated_between };
  if (args.operated_bys) {
    params.operated_bys = args.operated_bys;
  }
  return { params };
}

async function runAuditLogs(client, opts, args) {
  return await client.request(
    'GET',
    AUDIT_LOGS_PATH,
    args.params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLoginLogsArgs(tokens) {
  const usageLabel = 'platform login-logs';
  const stringFlags = {
    '--logged-between': 'logged_between',
    '--user-ids': 'user_ids',
  };
  const { args, positionals } = collectArgs(tokens, stringFlags, usageLabel);
  if (positionals.length > 0) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[0]}. Use ${usageLabel} --help for usage.`);
  }
  if (typeof args.logged_between !== 'string' || !args.logged_between.trim()) {
    throw new core.PingCodeError(`--logged-between is required and must be non-empty. Use ${usageLabel} --help for usage.`);
  }
  const params = { logged_between: args.logged_between };
  if (args.user_ids) {
    params.user_ids = args.user_ids;
  }
  return { params };
}

async function runLoginLogs(client, opts, args) {
  return await client.request(
    'GET',
    LOGIN_LOGS_PATH,
    args.params,
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
      case 'participant-add': {
        const args = parseParticipantAddArgs(subArgs);
        result = await runParticipantAdd(client, opts, args);
        break;
      }
      case 'participant-list': {
        const args = parsePrincipalQueryArgs(subArgs, 'platform participant-list', 1);
        result = await runParticipantList(client, opts, args);
        break;
      }
      case 'participant-get': {
        const args = parsePrincipalQueryArgs(subArgs, 'platform participant-get', 2, 'A participant id');
        result = await runParticipantGet(client, opts, args);
        break;
      }
      case 'participant-remove': {
        const args = parsePrincipalQueryArgs(subArgs, 'platform participant-remove', 2, 'A participant id');
        result = await runParticipantRemove(client, opts, args);
        break;
      }
      case 'link-create': {
        const args = parseLinkCreateArgs(subArgs);
        result = await runLinkCreate(client, opts, args);
        break;
      }
      case 'link-get': {
        const args = parseLinkIdArgs(subArgs, 'relation id', 'platform link-get');
        result = await runLinkGet(client, opts, args);
        break;
      }
      case 'link-list': {
        const args = parseLinkListArgs(subArgs);
        result = await runLinkList(client, opts, args);
        break;
      }
      case 'link-remove': {
        const args = parseLinkIdArgs(subArgs, 'relation id', 'platform link-remove');
        result = await runLinkRemove(client, opts, args);
        break;
      }
      case 'activity-list': {
        const args = parseActivityListArgs(subArgs);
        result = await runActivityList(client, opts, args);
        break;
      }
      case 'activity-get': {
        const args = parseActivityGetArgs(subArgs);
        result = await runActivityGet(client, opts, args);
        break;
      }
      case 'audit-logs': {
        const args = parseAuditLogsArgs(subArgs);
        result = await runAuditLogs(client, opts, args);
        break;
      }
      case 'login-logs': {
        const args = parseLoginLogsArgs(subArgs);
        result = await runLoginLogs(client, opts, args);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown platform subcommand: ${subcommand}. Use platform --help for usage.`);
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

shared.registerModule('platform', {
  name: 'platform',
  description: 'Manage PingCode platform resources (participants, relations, activities, audit logs)',
  run,
});

module.exports = { run, printHelp };
