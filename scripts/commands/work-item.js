'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Global option defaults ────────────────────────────────────────────
const GLOBAL_BOOLEAN_FLAGS = new Set([
  '--dry-run', '--compact', '--no-token-cache', '--no-workspace-cache',
  '--all-users', '--all-projects', '--all-sprints',
]);

const GLOBAL_STRING_FLAGS = {
  '--base-url': 'base_url',
  '--client-id': 'client_id',
  '--client-secret': 'client_secret',
  '--token': 'token',
  '--user-id': 'user_id',
  '--user-name': 'user_name',
  '--workspace-cache': 'workspace_cache',
};

function defaultGlobalOpts() {
  return {
    base_url: process.env.PINGCODE_BASE_URL || core.DEFAULT_BASE_URL,
    client_id: process.env.PINGCODE_CLIENT_ID || null,
    client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
    token: process.env.PINGCODE_ACCESS_TOKEN || null,
    user_id: process.env.PINGCODE_USER_ID || null,
    user_name: process.env.PINGCODE_USER_NAME || null,
    no_token_cache: false,
    workspace_cache: process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE,
    no_workspace_cache: false,
    dry_run: false,
    compact: false,
    all_users: false,
    all_projects: false,
    all_sprints: false,
  };
}

function parseGlobalOptions(tokens) {
  const opts = defaultGlobalOpts();
  const remaining = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (GLOBAL_BOOLEAN_FLAGS.has(arg)) {
      const key = arg.replace(/^--/, '').replace(/-/g, '_');
      opts[key] = true;
      continue;
    }
    const eqIndex = arg.indexOf('=');
    let flag, value, consumedNext = false;
    if (eqIndex !== -1) {
      flag = arg.slice(0, eqIndex);
      value = arg.slice(eqIndex + 1);
    } else if (arg.startsWith('--')) {
      flag = arg;
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        value = tokens[i + 1];
        consumedNext = true;
      } else {
        // Boolean-like flag with no value — could be a subcommand flag
        remaining.push(arg);
        continue;
      }
    } else {
      remaining.push(arg);
      continue;
    }
    if (flag in GLOBAL_STRING_FLAGS) {
      opts[GLOBAL_STRING_FLAGS[flag]] = value;
      if (consumedNext) i += 1;
    } else {
      // Not a recognized global flag — pass through as subcommand arg
      remaining.push(arg);
      if (consumedNext) remaining.push(value);
      if (consumedNext) i += 1;
    }
  }
  return { opts, remaining };
}

function clientFromOpts(opts) {
  const tokenCache = opts.no_token_cache ? null : (process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE);
  const workspaceCache = opts.no_workspace_cache ? null : opts.workspace_cache;
  return new core.PingCodeClient({
    base_url: opts.base_url,
    client_id: opts.client_id,
    client_secret: opts.client_secret,
    token: opts.token,
    token_cache: tokenCache,
    workspace_cache: workspaceCache,
  });
}

// ── Cache lookup helpers ──────────────────────────────────────────────

function findAllCachedStates(cache) {
  const all = [];
  const seen = new Set();
  const states = cache.work_item_states || {};
  for (const key of Object.keys(states)) {
    const payload = states[key];
    for (const s of core.pageValues(payload)) {
      if (s.id && !seen.has(s.id)) {
        seen.add(s.id);
        all.push(s);
      }
    }
  }
  return all;
}

function findCachedWorkItemType(cache, query) {
  // Types are keyed by project_id. Search across all projects.
  const types = cache.work_item_types || {};
  const seen = new Set();
  const all = [];
  for (const key of Object.keys(types)) {
    for (const t of core.pageValues(types[key])) {
      if (t.id && !seen.has(t.id)) {
        seen.add(t.id);
        all.push(t);
      }
    }
  }
  return core.findCachedItem(all, query, 'work item type');
}

function findCachedPriority(cache, query) {
  const priorities = cache.work_item_priorities || {};
  const seen = new Set();
  const all = [];
  for (const key of Object.keys(priorities)) {
    for (const p of core.pageValues(priorities[key])) {
      if (p.id && !seen.has(p.id)) {
        seen.add(p.id);
        all.push(p);
      }
    }
  }
  return core.findCachedItem(all, query, 'priority');
}

function findCachedUser(cache, query) {
  const users = core.pageValues(cache.users);
  if (query === '@me') {
    return { id: core.currentUserId(null, cache) };
  }
  return core.findCachedItem(users, query, 'user');
}

function findCachedProject(cache, query) {
  const projects = core.pageValues(cache.projects);
  return core.findCachedItem(projects, query, 'project');
}

function findCachedSprint(cache, query) {
  const sprints = cache.sprints || {};
  const seen = new Set();
  const all = [];
  for (const key of Object.keys(sprints)) {
    for (const s of core.pageValues(sprints[key])) {
      if (s.id && !seen.has(s.id)) {
        seen.add(s.id);
        all.push(s);
      }
    }
  }
  return core.findCachedItem(all, query, 'sprint');
}

// Resolve a name-or-id string to an id. If the value is already a raw id
// (no letters that suggest a name), return it as-is without cache lookup.
function resolveId(value, resolver, cache, label) {
  if (!value) return null;
  // Check if the value looks like a raw id (no spaces, no CJK, but could be a name)
  // We always try cache lookup first; if it fails, treat as raw id.
  try {
    const item = resolver(cache, value);
    const itemId = item.id;
    if (typeof itemId === 'string' && itemId) return itemId;
    return value; // fallback: use value as raw id
  } catch (exc) {
    // If cache lookup fails, use the raw value as id
    return value;
  }
}

// ── List subcommand ───────────────────────────────────────────────────

function parseListArgs(tokens) {
  const args = {
    state: null,
    type: null,
    assignee: null,
    project: null,
    sprint: null,
    limit: null,
  };
  const stringFlags = {
    '--state': 'state',
    '--type': 'type',
    '--assignee': 'assignee',
    '--project': 'project',
    '--sprint': 'sprint',
    '--limit': 'limit',
  };

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
          throw new core.PingCodeError(`Unknown option: ${flag}`);
        }
      } else if (!(arg in GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use work-item list --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use work-item list --help for usage.`);
    }
  }
  return args;
}

async function runList(client, opts, args) {
  const params = {};
  const cache = client.workspaceCache;

  // Apply default filters (assignee, project, sprint) unless --all-* flags are set
  const filtered = core.applyDefaultWorkItemFilters(
    '/v1/project/work_items',
    params,
    client,
    opts.user_id,
    opts.user_name,
    !opts.all_users,
    opts.all_projects,
    opts.all_sprints,
  );

  // Resolve explicit filters
  if (args.state) {
    const stateItem = core.findCachedItem(findAllCachedStates(cache), args.state, 'state');
    filtered.state_id = stateItem.id;
  }
  if (args.type) {
    const typeItem = findCachedWorkItemType(cache, args.type);
    filtered.type_ids = typeItem.id;
  }
  if (args.assignee) {
    const userItem = findCachedUser(cache, args.assignee);
    filtered.assignee_ids = userItem.id;
  }
  if (args.project) {
    const projectItem = findCachedProject(cache, args.project);
    filtered.project_ids = projectItem.id;
  }
  if (args.sprint) {
    const sprintItem = findCachedSprint(cache, args.sprint);
    filtered.sprint_ids = sprintItem.id;
  }
  if (args.limit) {
    filtered.page_size = String(args.limit);
  }

  return await client.request(
    'GET',
    '/v1/project/work_items',
    filtered,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Create subcommand ─────────────────────────────────────────────────

function parseCreateArgs(tokens) {
  const args = {
    title: null,
    type: null,
    project: null,
    sprint: null,
    assignee: null,
    state: null,
    priority: null,
    description: null,
    parent: null,
  };
  const stringFlags = {
    '--title': 'title',
    '--type': 'type',
    '--project': 'project',
    '--sprint': 'sprint',
    '--assignee': 'assignee',
    '--state': 'state',
    '--priority': 'priority',
    '--description': 'description',
    '--parent': 'parent',
  };

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
          throw new core.PingCodeError(`Unknown option: ${flag}`);
        }
      } else if (!(arg in GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use work-item create --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use work-item create --help for usage.`);
    }
  }
  return args;
}

async function runCreate(client, opts, args) {
  if (args.title === null) {
    throw new core.PingCodeError('--title is required. Use work-item create --help for usage.');
  }

  // Ensure workspace context for defaults
  core.ensureWorkItemWorkspaceContext(
    '/v1/project/work_items',
    client,
    'POST',
    !opts.all_users,
    opts.all_projects,
    opts.all_sprints,
  );

  const cache = client.workspaceCache;

  // Build body
  const body = { title: args.title };

  // Resolve project
  if (args.project) {
    const projectItem = findCachedProject(cache, args.project);
    body.project_id = projectItem.id;
  } else {
    const projectId = (cache.preferences || {}).current_project_id;
    if (typeof projectId === 'string' && projectId) {
      body.project_id = projectId;
    }
  }

  // Resolve type
  if (args.type) {
    const typeItem = findCachedWorkItemType(cache, args.type);
    body.type_id = typeItem.id;
  }

  // Resolve sprint
  if (args.sprint) {
    const sprintItem = findCachedSprint(cache, args.sprint);
    body.sprint_id = sprintItem.id;
  }

  // Resolve state
  if (args.state) {
    const stateItem = core.findCachedItem(findAllCachedStates(cache), args.state, 'state');
    body.state_id = stateItem.id;
  }

  // Resolve priority
  if (args.priority) {
    const priorityItem = findCachedPriority(cache, args.priority);
    body.priority_id = priorityItem.id;
  }

  // Description
  if (args.description) {
    body.description = args.description;
  }

  // Parent
  if (args.parent) {
    body.parent_id = args.parent;
  }

  // Resolve assignee
  if (args.assignee) {
    const userItem = findCachedUser(cache, args.assignee);
    body.assignee_id = userItem.id;
  }

  // Apply default assignee (unless --all-users or explicit --assignee)
  const withDefaults = core.applyDefaultWorkItemCreateBody(
    'POST',
    '/v1/project/work_items',
    body,
    client,
    opts.user_id,
    !opts.all_users && !args.assignee,
  );

  return await client.request(
    'POST',
    '/v1/project/work_items',
    null,
    withDefaults,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Show subcommand ──────────────────────────────────────────────────

function parseShowArgs(tokens) {
  // First non-flag token is the id/identifier
  let target = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (target === null) {
        target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use work-item show --help for usage.`);
    }
    // Consume flag+value for global options (already parsed)
    if (GLOBAL_BOOLEAN_FLAGS.has(arg)) continue;
    if (GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
    // For --help (already handled in parseGlobalOptions)
  }
  if (!target) {
    throw new core.PingCodeError('A work item id or identifier is required. Use work-item show --help for usage.');
  }
  return { target };
}

async function runShow(client, opts, args) {
  const params = {};
  // Detect if target is an identifier (uppercase letters + dash + number)
  const isIdFormat = /^[A-Z]{3,6}-\d+$/.test(args.target);
  if (isIdFormat) {
    params.identifier = args.target;
  } else {
    params.id = args.target;
  }

  const result = await client.request(
    'GET',
    '/v1/project/work_items',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );

  if (opts.dry_run) return result;

  // For real results, compact if requested, otherwise return first match
  if (opts.compact) {
    return core.compactResponse(result);
  }
  return result;
}

// ── Update subcommand ────────────────────────────────────────────────

function parseUpdateArgs(tokens) {
  const args = {
    target: null,
    state: null,
    priority: null,
    assignee: null,
  };
  const stringFlags = {
    '--state': 'state',
    '--priority': 'priority',
    '--assignee': 'assignee',
  };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.target === null) {
        args.target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use work-item update --help for usage.`);
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
          if (!(flag in GLOBAL_BOOLEAN_FLAGS) && !(flag in GLOBAL_STRING_FLAGS)) {
            throw new core.PingCodeError(`Unknown option: ${flag}`);
          }
        }
      } else if (!(arg in GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use work-item update --help for usage.`);
      }
    }
  }

  if (!args.target) {
    throw new core.PingCodeError('A work item id or identifier is required. Use work-item update --help for usage.');
  }
  if (!args.state) {
    throw new core.PingCodeError('--state is required. Use work-item update --help for usage.');
  }
  return args;
}

function isIdentifier(arg) {
  // PingCode identifiers look like: PROJECT_KEY-NUMBER (e.g., SCR-1, TASK-42)
  // Project keys are typically 3-6 uppercase letters.
  return /^[A-Z]{3,6}-\d+$/.test(arg);
}

async function runUpdate(client, opts, args) {
  const cache = client.workspaceCache;

  // Resolve state id
  const stateItem = core.findCachedItem(findAllCachedStates(cache), args.state, 'state');
  const stateId = stateItem.id;

  // Build patch body
  const body = { state_id: stateId };

  // Resolve priority
  if (args.priority) {
    const priorityItem = findCachedPriority(cache, args.priority);
    body.priority_id = priorityItem.id;
  }

  // Resolve assignee
  if (args.assignee) {
    const userItem = findCachedUser(cache, args.assignee);
    body.assignee_id = userItem.id;
  }

  // Determine if target is an identifier needing resolution, or a direct work item id
  if (isIdentifier(args.target)) {
    // Identifier: need to resolve to work item id first
    const resolutionParams = { identifier: args.target };

    if (opts.dry_run) {
      // Sort keys for deterministic output
      const sorted = {};
      const keys = Object.keys(body).sort();
      for (const k of keys) sorted[k] = body[k];

      return {
        dry_run: true,
        resolution: {
          method: 'GET',
          path: '/v1/project/work_items',
          params: resolutionParams,
        },
        patch: {
          method: 'PATCH',
          path: '/v1/project/work_items/{id}',
          json: sorted,
        },
      };
    }

    // Non-dry-run: resolve the identifier to get the work item id
    const resolved = await client.request(
      'GET',
      '/v1/project/work_items',
      resolutionParams,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
    const values = core.pageValues(resolved);
    if (values.length === 0) {
      throw new core.PingCodeError(`No work item found with identifier ${args.target}`);
    }
    const workItemId = values[0].id;
    return await client.request(
      'PATCH',
      `/v1/project/work_items/${workItemId}`,
      null,
      body,
      { dry_run: false, use_workspace_cache: false },
    );
  }

  // Direct ID: patch immediately
  return await client.request(
    'PATCH',
    `/v1/project/work_items/${args.target}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Help ──────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode work-item — Manage work items',
    '',
    'Usage: node scripts/pingcode.js work-item <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [options]              List work items',
    '    --all-users               Show work items from all users (skip current-user filter)',
    '    --all-projects            Show work items from all projects (skip current-project filter)',
    '    --all-sprints             Show work items from all sprints (skip current-sprint filter)',
    '    --state <name|id>         Filter by state',
    '    --type <name|id>          Filter by type',
    '    --assignee <name|id|@me>  Filter by assignee',
    '    --project <id|name>       Filter by project',
    '    --sprint <id|name>        Filter by sprint',
    '    --limit N                 Max results per page',
    '',
    '  create --title TITLE        Create a new work item',
    '    --type <name|id>          Work item type',
    '    --project <id|name>       Target project',
    '    --sprint <id|name>        Target sprint',
    '    --assignee <name|id|@me>  Assignee (defaults to @me)',
    '    --state <name|id>         Initial state',
    '    --priority <name|id>      Priority',
    '    --description TEXT        Description text',
    '    --parent <id|identifier>  Parent work item',
    '',
    '  show <id|identifier>        Show a single work item',
    '',
    '  update <id|identifier>      Update a work item',
    '    --state <name|id>         New state (required)',
    '    --priority <name|id>      New priority',
    '    --assignee <name|id|@me>  New assignee',
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
    '  --help                      Show this help',
  ].join('\n'));
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

  // Parse global options from remaining tokens
  const { opts, remaining: subArgs } = parseGlobalOptions(remaining);

  const client = clientFromOpts(opts);

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
      case 'show': {
        const args = parseShowArgs(subArgs);
        result = await runShow(client, opts, args);
        break;
      }
      case 'update': {
        const args = parseUpdateArgs(subArgs);
        result = await runUpdate(client, opts, args);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown work-item subcommand: ${subcommand}. Use work-item --help for usage.`);
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

shared.registerModule('work-item', {
  name: 'work-item',
  description: 'Manage PingCode work items',
  run,
});

module.exports = { run, printHelp };
