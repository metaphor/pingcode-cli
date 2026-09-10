'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode tag — Manage work item tags',
    '',
    'Usage: pingcode tag <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [--name TEXT]          List all work item tags',
    '',
    '  create --name NAME          Create a work item tag',
    '',
    '  get <tag_id>                Get a work item tag by id',
    '',
    '  get <tag_id> <id|identifier>',
    '                              Get one tag attached to a work item',
    '',
    '  update <tag_id> [--name NAME]',
    '                              Partially update a work item tag',
    '',
    '  delete <tag_id>             Delete a work item tag',
    '',
    '  add <id|identifier> <tag_id>',
    '                              Attach a tag to a work item',
    '',
    '  remove <tag_id> <id|identifier>',
    '                              Remove a tag from a work item',
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
        'Usage: pingcode tag list [--name TEXT]',
        '',
        'List all work item tags.',
        '',
        'Options:',
        '  --name TEXT               Filter by tag name',
      ].join('\n'));
      break;
    case 'create':
      console.log([
        'Usage: pingcode tag create --name NAME',
        '',
        'Create a work item tag. The name is unique within the enterprise.',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode tag get <tag_id>',
        '       pingcode tag get <tag_id> <work_item_id|identifier>',
        '',
        'With one argument, get a work item tag by id.',
        'With a work item id/identifier, get that tag attached to the work item.',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode tag update <tag_id> [--name NAME]',
        '',
        'Partially update a work item tag.',
        '',
        'Options:',
        '  --name TEXT               New tag name (unique within the enterprise)',
      ].join('\n'));
      break;
    case 'delete':
      console.log([
        'Usage: pingcode tag delete <tag_id>',
        '',
        'Delete a work item tag.',
      ].join('\n'));
      break;
    case 'add':
      console.log([
        'Usage: pingcode tag add <work_item_id|identifier> <tag_id>',
        '',
        'Attach a tag to a work item.',
      ].join('\n'));
      break;
    case 'remove':
      console.log([
        'Usage: pingcode tag remove <tag_id> <work_item_id|identifier>',
        '',
        'Remove a tag from a work item.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Shared parsing helpers ─────────────────────────────────────────────


// PingCode identifiers look like: PROJECT_KEY-NUMBER (e.g., SCR-1, TASK-42)
function isIdentifier(arg) {
  return /^[A-Z]{3,6}-\d+$/.test(arg);
}

function requireTagId(value, subcommand) {
  if (!value) {
    throw new core.PingCodeError(`A tag id is required. Use tag ${subcommand} --help for usage.`);
  }
  return value;
}

function requireWorkItemRef(value, subcommand) {
  if (!value) {
    throw new core.PingCodeError(`A work item id or identifier is required. Use tag ${subcommand} --help for usage.`);
  }
  return value;
}

// Parse positional-only argv. Unknown flags are ignored (matches the
// positional parsers in idea.js / workitem.js).
function parsePositionalArgs(tokens) {
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
  return positionals;
}

// ── List subcommand ───────────────────────────────────────────────────

function parseListArgs(tokens) {
  const args = { name: null };
  const stringFlags = { '--name': 'name' };

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
          throw new core.PingCodeError(`Unknown option: ${flag}. Use tag list --help for usage.`);
        }
      } else {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use tag list --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use tag list --help for usage.`);
    }
  }
  return args;
}

async function runList(client, opts, args) {
  const params = {};
  if (args.name) {
    params.name = args.name;
  }

  return await client.request(
    'GET',
    '/v1/pjm/work_item_tags',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Create subcommand ─────────────────────────────────────────────────

function parseCreateArgs(tokens) {
  const args = { name: null };
  const stringFlags = { '--name': 'name' };

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
          throw new core.PingCodeError(`Unknown option: ${flag}. Use tag create --help for usage.`);
        }
      } else {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use tag create --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use tag create --help for usage.`);
    }
  }
  if (typeof args.name !== 'string' || !args.name.trim()) {
    throw new core.PingCodeError('--name is required and must be non-empty. Use tag create --help for usage.');
  }
  return args;
}

async function runCreate(client, opts, args) {
  return await client.request(
    'POST',
    '/v1/pjm/work_item_tags',
    null,
    { name: args.name },
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Get subcommand (global tag, or tag on a work item) ────────────────

async function runGet(client, opts, args) {
  const tagId = requireTagId(args.tag_id, 'get');

  // Single argument: fetch the global tag.
  if (!args.work_item_ref) {
    return await client.request(
      'GET',
      `/v1/pjm/work_item_tags/${tagId}`,
      null,
      null,
      { dry_run: opts.dry_run, use_workspace_cache: true },
    );
  }

  // Two arguments: fetch the tag attached to a work item.
  const subPath = `/tags/${tagId}`;
  if (isIdentifier(args.work_item_ref)) {
    const resolutionParams = { identifier: args.work_item_ref };

    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        get: {
          method: 'GET',
          path: `/v1/pjm/work_items/{id}${subPath}`,
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, args.work_item_ref);
    return await client.request(
      'GET',
      `/v1/pjm/work_items/${workItemId}${subPath}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/pjm/work_items/${args.work_item_ref}${subPath}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Update subcommand ─────────────────────────────────────────────────

function parseUpdateArgs(tokens) {
  const args = { tag_id: null, name: null };
  const stringFlags = { '--name': 'name' };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.tag_id === null) {
        args.tag_id = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use tag update --help for usage.`);
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
          throw new core.PingCodeError(`Unknown option: ${flag}. Use tag update --help for usage.`);
        }
      } else if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        continue;
      } else if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
        i += 1;
        continue;
      } else {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use tag update --help for usage.`);
      }
    }
  }
  if (!args.tag_id) {
    throw new core.PingCodeError('A tag id is required. Use tag update --help for usage.');
  }
  const hasUpdateField = args.name !== null;
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use tag update --help for usage.');
  }
  return args;
}

async function runUpdate(client, opts, args) {
  const body = {};
  if (args.name !== null) body.name = args.name;

  return await client.request(
    'PATCH',
    `/v1/pjm/work_item_tags/${args.tag_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Delete subcommand ─────────────────────────────────────────────────

async function runDelete(client, opts, args) {
  const tagId = requireTagId(args.tag_id, 'delete');

  return await client.request(
    'DELETE',
    `/v1/pjm/work_item_tags/${tagId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Add subcommand (attach tag to a work item) ────────────────────────

async function runAdd(client, opts, args) {
  const workItemRef = requireWorkItemRef(args.work_item_ref, 'add');
  const tagId = requireTagId(args.tag_id, 'add');
  const body = { tag_id: tagId };
  const subPath = '/tags';

  if (isIdentifier(workItemRef)) {
    const resolutionParams = { identifier: workItemRef };

    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        add: {
          method: 'POST',
          path: `/v1/pjm/work_items/{id}${subPath}`,
          json: body,
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, workItemRef);
    return await client.request(
      'POST',
      `/v1/pjm/work_items/${workItemId}${subPath}`,
      null,
      body,
      { dry_run: false, use_workspace_cache: false },
    );
  }

  return await client.request(
    'POST',
    `/v1/pjm/work_items/${workItemRef}${subPath}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Remove subcommand (detach tag from a work item) ───────────────────

async function runRemove(client, opts, args) {
  const tagId = requireTagId(args.tag_id, 'remove');
  const workItemRef = requireWorkItemRef(args.work_item_ref, 'remove');
  const subPath = `/tags/${tagId}`;

  if (isIdentifier(workItemRef)) {
    const resolutionParams = { identifier: workItemRef };

    if (opts.dry_run) {
      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        remove: {
          method: 'DELETE',
          path: `/v1/pjm/work_items/{id}${subPath}`,
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, workItemRef);
    return await client.request(
      'DELETE',
      `/v1/pjm/work_items/${workItemId}${subPath}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: false },
    );
  }

  return await client.request(
    'DELETE',
    `/v1/pjm/work_items/${workItemRef}${subPath}`,
    null,
    null,
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
        const positionals = parsePositionalArgs(subArgs);
        result = await runGet(client, opts, {
          tag_id: positionals[0] || null,
          work_item_ref: positionals[1] || null,
        });
        break;
      }
      case 'update': {
        const updateArgs = parseUpdateArgs(subArgs);
        result = await runUpdate(client, opts, updateArgs);
        break;
      }
      case 'delete': {
        const positionals = parsePositionalArgs(subArgs);
        result = await runDelete(client, opts, { tag_id: positionals[0] || null });
        break;
      }
      case 'add': {
        const positionals = parsePositionalArgs(subArgs);
        result = await runAdd(client, opts, {
          work_item_ref: positionals[0] || null,
          tag_id: positionals[1] || null,
        });
        break;
      }
      case 'remove': {
        const positionals = parsePositionalArgs(subArgs);
        result = await runRemove(client, opts, {
          tag_id: positionals[0] || null,
          work_item_ref: positionals[1] || null,
        });
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown tag subcommand: ${subcommand}. Use tag --help for usage.`);
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

shared.registerModule('tag', {
  name: 'tag',
  description: 'Manage PingCode work item tags',
  run,
});

module.exports = { run, printHelp };
