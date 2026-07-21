'use strict';

const core = require('../core');
const shared = require('./shared');

const PRINCIPAL_TYPES = new Set([
  'work_item',
  'work_item_deliverable',
  'test_case',
  'test_run',
  'idea',
  'ticket',
  'page',
]);

const SNIPPET_FORMATS = new Set([
  'clike', 'css', 'dart', 'django', 'dockerfile', 'go', 'markdown', 'nginx',
  'python', 'php', 'shell', 'sql', 'swift', 'html', 'javascript', 'jsx',
  'pascal', 'sass', 'stylus', 'vue', 'yaml', 'haskell',
]);

function isIdentifier(arg) {
  return /^[A-Z]{3,6}-\d+$/.test(arg);
}

function isWorkItemPrincipal(type) {
  return type === 'work_item' || type === 'work_item_deliverable';
}

function validatePrincipalType(type, allowedTypes) {
  if (!type || typeof type !== 'string') {
    throw new core.PingCodeError('principal_type is required.');
  }
  if (!allowedTypes.has(type)) {
    const allowed = Array.from(allowedTypes).join(', ');
    throw new core.PingCodeError(`Invalid principal_type '${type}' for this subcommand. Allowed: ${allowed}`);
  }
  return type;
}

function compactAttachment(item) {
  const fields = [
    'id', 'title', 'size', 'type', 'file_type', 'ext', 'download_url',
    'format', 'content', 'line', 'created_at',
  ];
  const compact = {};
  for (const key of fields) {
    if (!(key in item)) continue;
    const value = item[key];
    if (value !== null && value !== undefined) {
      compact[key] = value;
    }
  }
  const createdBy = item.created_by;
  if (createdBy && typeof createdBy === 'object' && !Array.isArray(createdBy)) {
    compact.created_by = createdBy.display_name || createdBy.name || createdBy.id;
  }
  return compact;
}

function compactAttachmentResponse(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const values = core.pageValues(payload);
  if (values.length > 0) {
    const result = {
      page_size: payload.page_size,
      page_index: payload.page_index,
      total: payload.total,
      count: values.length,
      values: values.map(compactAttachment),
    };
    return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== null && v !== undefined));
  }
  return compactAttachment(payload);
}

// ── Helpers ───────────────────────────────────────────────────────────

async function resolvePrincipalId(client, principalType, principalRef, dryRun) {
  if (isWorkItemPrincipal(principalType) && isIdentifier(principalRef)) {
    if (dryRun) {
      return { resolvedId: '{id}', resolution: {
        method: 'GET',
        path: '/v1/project/work_items',
        params: { identifier: principalRef },
      } };
    }
    const resolvedId = await core.resolveWorkItemIdentifier(client, principalRef);
    return { resolvedId, resolution: null };
  }
  return { resolvedId: principalRef, resolution: null };
}

// ── upload-file ───────────────────────────────────────────────────────

function parseUploadFileArgs(tokens) {
  const args = {
    file: null,
    title: null,
    comment_id: null,
  };
  const stringFlags = {
    '--file': 'file',
    '--title': 'title',
    '--comment-id': 'comment_id',
  };
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
    } else if (!(arg in shared.BASE_GLOBAL_STRING_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use attachment upload-file --help for usage.`);
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value for known global string flags
    }
  }
  return { args, positionals };
}

async function runUploadFile(client, opts, args, positionals) {
  if (positionals.length < 2) {
    throw new core.PingCodeError('principal_type and principal_id are required. Use attachment upload-file --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use attachment upload-file --help for usage.`);
  }

  const principalType = validatePrincipalType(
    positionals[0],
    new Set(['work_item', 'work_item_deliverable', 'test_case', 'test_run', 'idea', 'ticket', 'page']),
  );
  const principalRef = positionals[1];

  if (typeof args.file !== 'string' || !args.file.trim()) {
    throw new core.PingCodeError('--file is required. Use attachment upload-file --help for usage.');
  }
  if (typeof args.title !== 'string' || !args.title.trim()) {
    throw new core.PingCodeError('--title is required. Use attachment upload-file --help for usage.');
  }

  const { resolvedId, resolution } = await resolvePrincipalId(client, principalType, principalRef, opts.dry_run);

  const params = {
    principal_type: principalType,
    principal_id: resolvedId,
  };
  if (args.comment_id) {
    params.comment_id = args.comment_id;
  }

  if (opts.dry_run) {
    return {
      dry_run: true,
      resolution,
      upload: {
        method: 'POST',
        path: '/v1/attachments',
        params,
        form: {
          title: args.title,
          file: args.file,
        },
      },
    };
  }

  const form = core.buildFileUploadForm(args.file, args.title);
  return await client.request(
    'POST',
    '/v1/attachments',
    params,
    form,
    { dry_run: false, use_workspace_cache: true },
  );
}

// ── upload-snippet ──────────────────────────────────────────────────────

function parseUploadSnippetArgs(tokens) {
  const args = {
    title: null,
    format: null,
    content: null,
    comment_id: null,
  };
  const stringFlags = {
    '--title': 'title',
    '--format': 'format',
    '--content': 'content',
    '--comment-id': 'comment_id',
  };
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
    } else if (!(arg in shared.BASE_GLOBAL_STRING_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use attachment upload-snippet --help for usage.`);
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value for known global string flags
    }
  }
  return { args, positionals };
}

async function runUploadSnippet(client, opts, args, positionals) {
  if (positionals.length < 2) {
    throw new core.PingCodeError('principal_type and principal_id are required. Use attachment upload-snippet --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use attachment upload-snippet --help for usage.`);
  }

  const principalType = validatePrincipalType(
    positionals[0],
    new Set(['work_item', 'test_case', 'test_run', 'idea', 'ticket', 'page']),
  );
  const principalRef = positionals[1];

  if (typeof args.title !== 'string' || !args.title.trim()) {
    throw new core.PingCodeError('--title is required. Use attachment upload-snippet --help for usage.');
  }
  if (typeof args.format !== 'string' || !args.format.trim()) {
    throw new core.PingCodeError('--format is required. Use attachment upload-snippet --help for usage.');
  }
  if (!SNIPPET_FORMATS.has(args.format)) {
    throw new core.PingCodeError(`Unsupported snippet format: ${args.format}. See --help for allowed values.`);
  }
  if (typeof args.content !== 'string' || !args.content.trim()) {
    throw new core.PingCodeError('--content is required. Use attachment upload-snippet --help for usage.');
  }

  const { resolvedId, resolution } = await resolvePrincipalId(client, principalType, principalRef, opts.dry_run);

  const body = {
    principal_type: principalType,
    principal_id: resolvedId,
    title: args.title,
    format: args.format,
    content: args.content,
  };
  if (args.comment_id) {
    body.comment_id = args.comment_id;
  }

  if (opts.dry_run) {
    return {
      dry_run: true,
      resolution,
      upload: {
        method: 'POST',
        path: '/v1/attachments',
        json: body,
      },
    };
  }

  return await client.request(
    'POST',
    '/v1/attachments',
    null,
    body,
    { dry_run: false, use_workspace_cache: true },
  );
}

// ── list ──────────────────────────────────────────────────────────────

function parseListArgs(tokens) {
  const args = {
    comment_id: null,
  };
  const stringFlags = {
    '--comment-id': 'comment_id',
  };
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
    } else if (!(arg in shared.BASE_GLOBAL_STRING_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use attachment list --help for usage.`);
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value for known global string flags
    }
  }
  return { args, positionals };
}

async function runList(client, opts, args, positionals) {
  if (positionals.length < 2) {
    throw new core.PingCodeError('principal_type and principal_id are required. Use attachment list --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use attachment list --help for usage.`);
  }

  const principalType = validatePrincipalType(
    positionals[0],
    new Set(['work_item', 'test_case', 'test_run', 'idea', 'ticket', 'page']),
  );
  const principalRef = positionals[1];

  const { resolvedId } = await resolvePrincipalId(client, principalType, principalRef, opts.dry_run);

  const params = {
    principal_type: principalType,
    principal_id: resolvedId,
  };
  if (args.comment_id) {
    params.comment_id = args.comment_id;
  }

  return await client.request(
    'GET',
    '/v1/attachments',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── get ───────────────────────────────────────────────────────────────

function parseGetArgs(tokens) {
  const args = {
    comment_id: null,
    review_id: null,
  };
  const stringFlags = {
    '--comment-id': 'comment_id',
    '--review-id': 'review_id',
  };
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
    } else if (!(arg in shared.BASE_GLOBAL_STRING_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use attachment get --help for usage.`);
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value for known global string flags
    }
  }
  return { args, positionals };
}

async function runGet(client, opts, args, positionals) {
  if (positionals.length < 3) {
    throw new core.PingCodeError('attachment_id, principal_type and principal_id are required. Use attachment get --help for usage.');
  }
  if (positionals.length > 3) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[3]}. Use attachment get --help for usage.`);
  }

  const attachmentId = positionals[0];
  const principalType = validatePrincipalType(
    positionals[1],
    new Set(['work_item', 'work_item_deliverable', 'test_case', 'test_run', 'idea', 'ticket', 'page']),
  );
  const principalRef = positionals[2];

  const { resolvedId } = await resolvePrincipalId(client, principalType, principalRef, opts.dry_run);

  const params = {
    principal_type: principalType,
    principal_id: resolvedId,
  };
  if (args.comment_id) {
    params.comment_id = args.comment_id;
  }
  if (args.review_id) {
    params.review_id = args.review_id;
  }

  return await client.request(
    'GET',
    `/v1/attachments/${attachmentId}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── delete ────────────────────────────────────────────────────────────

function parseDeleteArgs(tokens) {
  const args = {
    comment_id: null,
  };
  const stringFlags = {
    '--comment-id': 'comment_id',
  };
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
    } else if (!(arg in shared.BASE_GLOBAL_STRING_FLAGS)) {
      throw new core.PingCodeError(`Unknown option: ${arg}. Use attachment delete --help for usage.`);
    } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
      i += 1; // skip value for known global string flags
    }
  }
  return { args, positionals };
}

async function runDelete(client, opts, args, positionals) {
  if (positionals.length < 3) {
    throw new core.PingCodeError('attachment_id, principal_type and principal_id are required. Use attachment delete --help for usage.');
  }
  if (positionals.length > 3) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[3]}. Use attachment delete --help for usage.`);
  }

  const attachmentId = positionals[0];
  const principalType = validatePrincipalType(
    positionals[1],
    new Set(['work_item', 'test_case', 'test_run', 'idea', 'ticket', 'page']),
  );
  const principalRef = positionals[2];

  const { resolvedId } = await resolvePrincipalId(client, principalType, principalRef, opts.dry_run);

  const params = {
    principal_type: principalType,
    principal_id: resolvedId,
  };
  if (args.comment_id) {
    params.comment_id = args.comment_id;
  }

  return await client.request(
    'DELETE',
    `/v1/attachments/${attachmentId}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode attachment — Manage attachments',
    '',
    'Usage: pingcode attachment <subcommand> [options]',
    '',
    'Subcommands:',
    '  upload-file <principal_type> <principal_id>',
    '    Upload a file attachment',
    '    --file PATH                 File path to upload (required)',
    '    --title TITLE               Attachment title (required)',
    '    --comment-id ID             Associate with a comment',
    '',
    '  upload-snippet <principal_type> <principal_id>',
    '    Upload a code snippet attachment',
    '    --title TITLE               Snippet title (required)',
    '    --format FORMAT             Language/format (required)',
    '    --content TEXT              Snippet content (required)',
    '    --comment-id ID             Associate with a comment',
    '',
    '  list <principal_type> <principal_id>',
    '    List attachments',
    '    --comment-id ID             Filter by comment',
    '',
    '  get <attachment-id> <principal_type> <principal_id>',
    '    Get a single attachment',
    '    --comment-id ID             Comment context',
    '    --review-id ID              Review context',
    '',
    '  delete <attachment-id> <principal_type> <principal_id>',
    '    Delete an attachment',
    '    --comment-id ID             Comment context',
    '',
    'Supported principal types:',
    '  work_item, work_item_deliverable, test_case, test_run, idea, ticket, page',
    '',
    'Note: work_item identifiers like SCR-123 are accepted for work_item and',
    'work_item_deliverable principal types and resolved automatically.',
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
    '  --grant-type TYPE           OAuth grant type: client_credentials, authorization_code, or auto',
    '  --help                      Show this help',
  ].join('\n'));
}

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'upload-file':
      console.log([
        'Usage: pingcode attachment upload-file <principal_type> <principal_id> --file PATH --title TITLE [options]',
        '',
        'Upload a file attachment to a principal. principal_type and principal_id are required.',
        'For work_item and work_item_deliverable, principal_id may be an identifier like SCR-123.',
        '',
        'Options:',
        '  --file PATH                 File path to upload (required)',
        '  --title TITLE               Attachment title (required)',
        '  --comment-id ID             Associate with a comment',
      ].join('\n'));
      break;
    case 'upload-snippet':
      console.log([
        'Usage: pingcode attachment upload-snippet <principal_type> <principal_id> --title TITLE --format FORMAT --content TEXT [options]',
        '',
        'Upload a code snippet attachment to a principal. principal_type and principal_id are required.',
        'For work_item, principal_id may be an identifier like SCR-123.',
        '',
        'Options:',
        '  --title TITLE               Snippet title (required)',
        '  --format FORMAT             Language/format (required)',
        '  --content TEXT              Snippet content (required)',
        '  --comment-id ID             Associate with a comment',
      ].join('\n'));
      break;
    case 'list':
      console.log([
        'Usage: pingcode attachment list <principal_type> <principal_id> [options]',
        '',
        'List attachments for a principal.',
        '',
        'Options:',
        '  --comment-id ID             Filter by comment',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode attachment get <attachment-id> <principal_type> <principal_id> [options]',
        '',
        'Get a single attachment by id.',
        '',
        'Options:',
        '  --comment-id ID             Comment context',
        '  --review-id ID              Review context',
      ].join('\n'));
      break;
    case 'delete':
      console.log([
        'Usage: pingcode attachment delete <attachment-id> <principal_type> <principal_id> [options]',
        '',
        'Delete an attachment by id.',
        '',
        'Options:',
        '  --comment-id ID             Comment context',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────

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
      case 'upload-file': {
        const { args, positionals } = parseUploadFileArgs(subArgs);
        result = await runUploadFile(client, opts, args, positionals);
        break;
      }
      case 'upload-snippet': {
        const { args, positionals } = parseUploadSnippetArgs(subArgs);
        result = await runUploadSnippet(client, opts, args, positionals);
        break;
      }
      case 'list': {
        const { args, positionals } = parseListArgs(subArgs);
        result = await runList(client, opts, args, positionals);
        break;
      }
      case 'get': {
        const { args, positionals } = parseGetArgs(subArgs);
        result = await runGet(client, opts, args, positionals);
        break;
      }
      case 'delete': {
        const { args, positionals } = parseDeleteArgs(subArgs);
        result = await runDelete(client, opts, args, positionals);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown attachment subcommand: ${subcommand}. Use attachment --help for usage.`);
    }

    if (opts.dry_run) {
      core.printJson(result);
    } else if (result !== null && result !== undefined) {
      if (opts.compact) {
        core.printJson(compactAttachmentResponse(result));
      } else {
        core.printJson(result);
      }
    }
  } catch (exc) {
    throw exc;
  }
}

shared.registerModule('attachment', {
  name: 'attachment',
  description: 'Manage attachments',
  run,
});

module.exports = { run, printHelp };
