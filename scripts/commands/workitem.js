'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Extra global boolean flags ──────────────────────────────────────
const EXTRA_BOOLEAN_FLAGS = ['--all-users', '--all-projects', '--all-sprints'];

// Combined set used by sub-parsers to skip globally consumed flags
const ALL_BOOLEAN_FLAGS = new Set([
  ...shared.BASE_GLOBAL_BOOLEAN_FLAGS,
  ...EXTRA_BOOLEAN_FLAGS,
]);

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
    keywords: null,
  };
  const stringFlags = {
    '--state': 'state',
    '--type': 'type',
    '--assignee': 'assignee',
    '--project': 'project',
    '--sprint': 'sprint',
    '--limit': 'limit',
    '--keywords': 'keywords',
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
      } else if (!ALL_BOOLEAN_FLAGS.has(arg)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use workitem list --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem list --help for usage.`);
    }
  }
  return args;
}

async function runList(client, opts, args) {
  const params = {};
  const cache = client.workspaceCache;
  const defaultToCurrentUser = !opts.all_users && client.resolveGrantType() !== 'authorization_code';

  const filtered = core.applyDefaultWorkItemFilters(
    '/v1/project/work_items',
    params,
    client,
    opts.user_id,
    opts.user_name,
    defaultToCurrentUser,
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
  if (args.keywords) {
    filtered.keywords = args.keywords;
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
      } else if (!ALL_BOOLEAN_FLAGS.has(arg)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use workitem create --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem create --help for usage.`);
    }
  }
  return args;
}

async function runCreate(client, opts, args) {
  if (typeof args.title !== 'string' || !args.title.trim()) {
    throw new core.PingCodeError('--title is required and must be non-empty. Use workitem create --help for usage.');
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

// ── Get subcommand ───────────────────────────────────────────────────

function parseGetArgs(tokens) {
  let workItemId = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (workItemId === null) {
        workItemId = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem get --help for usage.`);
    }
    if (ALL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  if (!workItemId) {
    throw new core.PingCodeError('A work item id or identifier is required. Use workitem get --help for usage.');
  }
  return { work_item_id: workItemId };
}

function isIdentifier(arg) {
  // PingCode identifiers look like: PROJECT_KEY-NUMBER (e.g., SCR-1, TASK-42)
  // Project keys are typically 3-6 uppercase letters.
  return /^[A-Z]{3,6}-\d+$/.test(arg);
}

async function runGet(client, opts, args) {
  if (isIdentifier(args.work_item_id)) {
    const resolutionParams = { identifier: args.work_item_id };

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
          path: '/v1/project/work_items/{id}',
        },
      };
    }

    const resolved = await client.request(
      'GET',
      '/v1/project/work_items',
      resolutionParams,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
    const values = core.pageValues(resolved);
    if (values.length === 0) {
      throw new core.PingCodeError(`No work item found with identifier ${args.work_item_id}`);
    }
    const workItemId = values[0].id;
    return await client.request(
      'GET',
      `/v1/project/work_items/${workItemId}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/project/work_items/${args.work_item_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Update subcommand ────────────────────────────────────────────────

function parseUpdateArgs(tokens) {
  const args = {
    target: null,
    title: null,
    description: null,
    type: null,
    project: null,
    sprint: null,
    state: null,
    priority: null,
    assignee: null,
    parent: null,
    version: null,
    board: null,
    entry: null,
    swimlane: null,
    startAt: null,
    endAt: null,
    participants: null,
    storyPoints: null,
    estimatedWorkload: null,
    remainingWorkload: null,
    properties: null,
  };
  const stringFlags = {
    '--title': 'title',
    '--description': 'description',
    '--type': 'type',
    '--project': 'project',
    '--sprint': 'sprint',
    '--state': 'state',
    '--priority': 'priority',
    '--assignee': 'assignee',
    '--parent': 'parent',
    '--version': 'version',
    '--board': 'board',
    '--entry': 'entry',
    '--swimlane': 'swimlane',
    '--start-at': 'startAt',
    '--end-at': 'endAt',
    '--participants': 'participants',
    '--story-points': 'storyPoints',
    '--estimated-workload': 'estimatedWorkload',
    '--remaining-workload': 'remainingWorkload',
    '--properties': 'properties',
  };

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (args.target === null) {
        args.target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem update --help for usage.`);
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
          if (!ALL_BOOLEAN_FLAGS.has(flag) && !(flag in shared.BASE_GLOBAL_STRING_FLAGS)) {
            throw new core.PingCodeError(`Unknown option: ${flag}`);
          }
        }
      } else if (!ALL_BOOLEAN_FLAGS.has(arg)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use workitem update --help for usage.`);
      }
    }
  }

  if (!args.target) {
    throw new core.PingCodeError('A work item id or identifier is required. Use workitem update --help for usage.');
  }

  const hasUpdateField = Object.entries(args).some(
    ([key, value]) => key !== 'target' && value !== null,
  );
  if (!hasUpdateField) {
    throw new core.PingCodeError('At least one field to update is required. Use workitem update --help for usage.');
  }

  return args;
}

function parseNumber(value, label) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new core.PingCodeError(`${label} must be a number`);
  }
  return parsed;
}

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

function resolveParticipants(value, cache) {
  const items = value.split(',').map((s) => s.trim()).filter(Boolean);
  return items.map((item) => {
    if (item.startsWith('@user:')) {
      return core.cachedUserId(item.slice(6), cache);
    }
    const user = findCachedUser(cache, item);
    return user.id;
  });
}

async function runUpdate(client, opts, args) {
  const cache = client.workspaceCache;
  const body = {};

  if (args.title) body.title = args.title;
  if (args.description) body.description = args.description;

  if (args.project) {
    const projectItem = findCachedProject(cache, args.project);
    body.project_id = projectItem.id;
  }
  if (args.type) {
    const typeItem = findCachedWorkItemType(cache, args.type);
    body.type_id = typeItem.id;
  }
  if (args.sprint) {
    const sprintItem = findCachedSprint(cache, args.sprint);
    body.sprint_id = sprintItem.id;
  }
  if (args.state) {
    const stateItem = core.findCachedItem(findAllCachedStates(cache), args.state, 'state');
    body.state_id = stateItem.id;
  }
  if (args.priority) {
    const priorityItem = findCachedPriority(cache, args.priority);
    body.priority_id = priorityItem.id;
  }
  if (args.assignee) {
    const userItem = findCachedUser(cache, args.assignee);
    body.assignee_id = userItem.id;
  }
  if (args.parent) body.parent_id = args.parent;
  if (args.version) body.version_id = args.version;
  if (args.board) body.board_id = args.board;
  if (args.entry) body.entry_id = args.entry;
  if (args.swimlane) body.swimlane_id = args.swimlane;
  if (args.startAt) body.start_at = parseTimestamp(args.startAt, 'start_at');
  if (args.endAt) body.end_at = parseTimestamp(args.endAt, 'end_at');
  if (args.participants) body.participant_ids = resolveParticipants(args.participants, cache);
  if (args.storyPoints) body.story_points = parseNumber(args.storyPoints, 'story_points');
  if (args.estimatedWorkload) body.estimated_workload = parseNumber(args.estimatedWorkload, 'estimated_workload');
  if (args.remainingWorkload) body.remaining_workload = parseNumber(args.remainingWorkload, 'remaining_workload');
  if (args.properties) body.properties = core.parseJsonObject(args.properties, 'properties');

  // Sort keys for deterministic dry-run output
  const sortedBody = {};
  for (const k of Object.keys(body).sort()) sortedBody[k] = body[k];

  // Determine if target is an identifier needing resolution, or a direct work item id
  if (isIdentifier(args.target)) {
    const resolutionParams = { identifier: args.target };

    if (opts.dry_run) {
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
          json: sortedBody,
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
    'PingCode workitem — Manage work items',
    '',
    'Usage: pingcode workitem <subcommand> [options]',
    '',
    'Subcommands:',
    '  list [options]              List work items',
    '    --state <name|id>         Filter by state',
    '    --type <name|id>          Filter by type',
    '    --assignee <name|id|@me>  Filter by assignee',
    '    --project <id|name>       Filter by project',
    '    --sprint <id|name>        Filter by sprint',
    '    --keywords <text>         Search keywords (title, identifier, etc.)',
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
    '  get <id|identifier>         Get a single work item by id or identifier',
    '',
    '  update <id|identifier>      Update a work item',
    '    --title TEXT              New title',
    '    --description TEXT        New description',
    '    --type <name|id>          New work item type',
    '    --project <id|name>       New project',
    '    --sprint <id|name>        New sprint',
    '    --state <name|id>         New state',
    '    --priority <name|id>      New priority',
    '    --assignee <name|id|@me>  New assignee',
    '    --parent <id|identifier>  New parent work item',
    '    --version ID              New version id',
    '    --board ID                New board id',
    '    --entry ID                New entry id',
    '    --swimlane ID             New swimlane id',
    '    --start-at TIMESTAMP      New start time (Unix timestamp or ISO date)',
    '    --end-at TIMESTAMP        New end time (Unix timestamp or ISO date)',
    '    --participants LIST       Comma-separated participant user names/ids',
    '    --story-points NUMBER     New story points',
    '    --estimated-workload NUM  New estimated workload',
    '    --remaining-workload NUM  New remaining workload',
    '    --properties JSON         New custom properties as JSON object',
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
    '  --all-users                 Show work items from all users (skip current-user filter)',
    '  --all-projects              Show work items from all projects (skip current-project filter)',
    '  --all-sprints               Show work items from all sprints (skip current-sprint filter)',
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
        'Usage: pingcode workitem list [options]',
        '',
        'List work items from the current project/sprint/assignee.',
        '',
        'Options:',
        '  --state <name|id>         Filter by state',
        '  --type <name|id>          Filter by type',
        '  --assignee <name|id|@me>  Filter by assignee',
        '  --project <id|name>       Filter by project',
        '  --sprint <id|name>        Filter by sprint',
        '  --keywords <text>         Search keywords (title, identifier, etc.)',
        '  --limit N                 Max results per page',
      ].join('\n'));
      break;
    case 'create':
      console.log([
        'Usage: pingcode workitem create --title TITLE [options]',
        '',
        'Create a new work item.',
        '',
        'Options:',
        '  --title TITLE             Title (required)',
        '  --type <name|id>          Work item type',
        '  --project <id|name>       Target project',
        '  --sprint <id|name>        Target sprint',
        '  --assignee <name|id|@me>  Assignee (defaults to @me)',
        '  --state <name|id>         Initial state',
        '  --priority <name|id>      Priority',
        '  --description TEXT        Description text',
        '  --parent <id|identifier>  Parent work item',
      ].join('\n'));
      break;
    case 'get':
      console.log([
        'Usage: pingcode workitem get <id|identifier>',
        '',
        'Get a single work item by id or identifier.',
        '',
        'Identifiers (e.g. SCR-123) are resolved to an id, then the single item is fetched.',
      ].join('\n'));
      break;
    case 'update':
      console.log([
        'Usage: pingcode workitem update <id|identifier> [options]',
        '',
        'Update a work item. At least one option must be provided.',
        '',
        'Options:',
        '  --title TEXT              New title',
        '  --description TEXT        New description',
        '  --type <name|id>          New work item type',
        '  --project <id|name>       New project',
        '  --sprint <id|name>        New sprint',
        '  --state <name|id>         New state',
        '  --priority <name|id>      New priority',
        '  --assignee <name|id|@me>  New assignee',
        '  --parent <id|identifier>  New parent work item',
        '  --version ID              New version id',
        '  --board ID                New board id',
        '  --entry ID                New entry id',
        '  --swimlane ID             New swimlane id',
        '  --start-at TIMESTAMP      New start time (Unix timestamp or ISO date)',
        '  --end-at TIMESTAMP        New end time (Unix timestamp or ISO date)',
        '  --participants LIST       Comma-separated participant user names/ids',
        '  --story-points NUMBER     New story points',
        '  --estimated-workload NUM  New estimated workload',
        '  --remaining-workload NUM  New remaining workload',
        '  --properties JSON         New custom properties as JSON object',
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

  // Parse global options from remaining tokens, passing workitem-specific boolean flags
  const { opts, remaining: subArgs } = shared.parseGlobalOptions(remaining, EXTRA_BOOLEAN_FLAGS);

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
      default:
        throw new core.PingCodeError(`Unknown workitem subcommand: ${subcommand}. Use workitem --help for usage.`);
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

shared.registerModule('workitem', {
  name: 'workitem',
  description: 'Manage PingCode work items',
  run,
});

module.exports = { run, printHelp };
