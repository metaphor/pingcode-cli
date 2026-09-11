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

// State types treated as terminal (done) when listing unfinished work items.
const TERMINAL_STATE_TYPES = new Set(['completed', 'closed']);
const START_STATE_NAME = '进行中';
const DONE_STATE_NAME = '已完成';

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

// ── My subcommand ─────────────────────────────────────────────────────

function parseMyArgs(tokens) {
  const args = {
    type: null,
    project: null,
    sprint: null,
    limit: null,
  };
  const stringFlags = {
    '--type': 'type',
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
      } else if (!ALL_BOOLEAN_FLAGS.has(arg)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use workitem my --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem my --help for usage.`);
    }
  }
  return args;
}

function workItemStateRef(item) {
  if (typeof item.state_id === 'string' && item.state_id) return item.state_id;
  if (item.state && typeof item.state === 'object' && typeof item.state.id === 'string') {
    return item.state.id;
  }
  return null;
}

async function runMy(client, opts, args) {
  const cache = client.workspaceCache;

  const params = core.applyDefaultWorkItemFilters(
    '/v1/project/work_items',
    {},
    client,
    opts.user_id,
    opts.user_name,
    true,
    opts.all_projects,
    opts.all_sprints,
  );
  // `my` is always scoped to the current user, like `list --assignee @me`.
  params.assignee_ids = findCachedUser(cache, '@me').id;

  if (args.type) {
    params.type_ids = findCachedWorkItemType(cache, args.type).id;
  }
  if (args.project) {
    params.project_ids = findCachedProject(cache, args.project).id;
  }
  if (args.sprint) {
    params.sprint_ids = findCachedSprint(cache, args.sprint).id;
  }
  if (args.limit) {
    params.page_size = String(args.limit);
  }

  const response = await client.request(
    'GET',
    '/v1/project/work_items',
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
  if (opts.dry_run) return response;

  // Exclude items whose state is terminal (completed/closed) using the
  // cached state dictionary. Without cached states, degrade to a plain
  // list and tell the user how to populate the cache.
  const terminalIds = new Set(
    findAllCachedStates(cache)
      .filter((s) => TERMINAL_STATE_TYPES.has(String(s.type || '').toLowerCase()))
      .map((s) => s.id),
  );
  if (terminalIds.size === 0) {
    console.error(
      'hint: no cached work item states; showing all states including completed/closed. ' +
      'Run `pingcode context init --refresh` to cache dictionaries.',
    );
    return response;
  }
  const values = core.pageValues(response);
  return { ...response, values: values.filter((item) => !terminalIds.has(workItemStateRef(item))) };
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

// ── Start / Done subcommands ──────────────────────────────────────────

function parseStateChangeArgs(tokens, subcommand) {
  let target = null;
  let state = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--state') {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError('Flag --state requires a value');
      }
      state = tokens[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1 && arg.slice(0, eqIndex) === '--state') {
        state = arg.slice(eqIndex + 1);
        continue;
      }
      if (ALL_BOOLEAN_FLAGS.has(arg)) continue;
      if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
        i += 1;
        continue;
      }
      throw new core.PingCodeError(`Unknown option: ${arg}. Use workitem ${subcommand} --help for usage.`);
    }
    if (target === null) {
      target = arg;
      continue;
    }
    throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem ${subcommand} --help for usage.`);
  }
  if (!target) {
    throw new core.PingCodeError(`A work item id or identifier is required. Use workitem ${subcommand} --help for usage.`);
  }
  return { target, state };
}

function resolveTargetStateId(cache, defaultName, overrideName, subcommand) {
  const query = overrideName || defaultName;
  const states = findAllCachedStates(cache);
  try {
    return core.findCachedItem(states, query, 'state').id;
  } catch (exc) {
    if (overrideName) throw exc;
    if (states.length === 0) {
      throw new core.PingCodeError(
        `No cached work item states available to resolve "${defaultName}". ` +
        'Refresh the workspace cache first, or use --state to specify the target state. ' +
        `Use workitem ${subcommand} --help for usage.`,
      );
    }
    const available = states.map((s) => `${s.name} (${s.type || 'unknown type'})`).join(', ');
    throw new core.PingCodeError(
      `State "${defaultName}" not found in cached work item states. ` +
      `Available states: ${available}. ` +
      'Use --state to override the target state. ' +
      `Use workitem ${subcommand} --help for usage.`,
    );
  }
}

async function runStart(client, opts, args) {
  const stateId = resolveTargetStateId(client.workspaceCache, START_STATE_NAME, args.state, 'start');
  return await runUpdate(client, opts, { target: args.target, state: stateId });
}

async function runDone(client, opts, args) {
  const stateId = resolveTargetStateId(client.workspaceCache, DONE_STATE_NAME, args.state, 'done');
  return await runUpdate(client, opts, { target: args.target, state: stateId });
}

// ── Delete subcommand ────────────────────────────────────────────────

function parseDeleteArgs(tokens) {
  let target = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (target === null) {
        target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem delete --help for usage.`);
    }
    if (ALL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  if (!target) {
    throw new core.PingCodeError('A work item id or identifier is required. Use workitem delete --help for usage.');
  }
  return { target };
}

async function runDelete(client, opts, args) {
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
        delete: {
          method: 'DELETE',
          path: '/v1/pjm/work_items/{id}',
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, args.target);
    return await client.request(
      'DELETE',
      `/v1/pjm/work_items/${workItemId}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: false },
    );
  }

  return await client.request(
    'DELETE',
    `/v1/pjm/work_items/${args.target}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Search subcommand ────────────────────────────────────────────────

function parseSearchArgs(tokens) {
  const args = {
    filter: null,
    keywords: null,
    page_size: null,
    page_index: null,
    include_deleted: false,
    include_archived: false,
  };
  const stringFlags = {
    '--filter': 'filter',
    '--keywords': 'keywords',
    '--page-size': 'page_size',
    '--page-index': 'page_index',
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
      if (arg === '--include-deleted') {
        args.include_deleted = true;
        continue;
      }
      if (arg === '--include-archived') {
        args.include_archived = true;
        continue;
      }
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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use workitem search --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem search --help for usage.`);
    }
  }

  if (args.page_size !== null) {
    const num = Number(args.page_size);
    if (Number.isNaN(num) || num < 1 || num > 100) {
      throw new core.PingCodeError('--page-size must be a number between 1 and 100');
    }
    args.page_size = num;
  }
  if (args.page_index !== null) {
    const num = Number(args.page_index);
    if (Number.isNaN(num) || num < 0) {
      throw new core.PingCodeError('--page-index must be a non-negative number');
    }
    args.page_index = num;
  }
  if (args.filter !== null) {
    args.filter = core.parseJsonObject(args.filter, '--filter');
  }

  return args;
}

async function runSearch(client, opts, args) {
  const payload = {};

  if (args.filter !== null) payload.filter = args.filter;
  if (args.keywords !== null) payload.keywords = args.keywords;
  if (args.page_size !== null) payload.page_size = args.page_size;
  if (args.page_index !== null) payload.page_index = args.page_index;
  if (args.include_deleted) payload.include_deleted = true;
  if (args.include_archived) payload.include_archived = true;

  return await client.request(
    'POST',
    '/v1/pjm/work_items/search',
    null,
    { mode: 'query', payload },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Batch update subcommand ──────────────────────────────────────────

function parseBatchUpdateArgs(tokens) {
  const args = {
    ids: null,
    propertyName: null,
    propertyValue: null,
  };
  const stringFlags = {
    '--ids': 'ids',
    '--property-name': 'propertyName',
    '--property-value': 'propertyValue',
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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use workitem batch-update --help for usage.`);
      }
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem batch-update --help for usage.`);
    }
  }

  if (args.ids === null || !args.ids.trim()) {
    throw new core.PingCodeError('--ids is required and must be a comma-separated list of work item ids. Use workitem batch-update --help for usage.');
  }
  if (args.propertyName === null || !args.propertyName.trim()) {
    throw new core.PingCodeError('--property-name is required and must be non-empty. Use workitem batch-update --help for usage.');
  }

  return args;
}

async function runBatchUpdate(client, opts, args) {
  const ids = args.ids.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new core.PingCodeError('--ids is required and must be a comma-separated list of work item ids. Use workitem batch-update --help for usage.');
  }

  const body = { ids, property_name: args.propertyName };
  if (args.propertyValue !== null) {
    body.property_value = args.propertyValue;
  }

  return await client.request(
    'PATCH',
    '/v1/pjm/work_items',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: false },
  );
}

// ── Transition histories subcommands ─────────────────────────────────

function parseTransitionsArgs(tokens) {
  let target = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      if (target === null) {
        target = arg;
        continue;
      }
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use workitem transitions --help for usage.`);
    }
    if (ALL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  if (!target) {
    throw new core.PingCodeError('A work item id or identifier is required. Use workitem transitions --help for usage.');
  }
  return { target };
}

async function runTransitions(client, opts, args) {
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
        list: {
          method: 'GET',
          path: '/v1/pjm/work_items/{id}/transition_histories',
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, args.target);
    return await client.request(
      'GET',
      `/v1/pjm/work_items/${workItemId}/transition_histories`,
      null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/pjm/work_items/${args.target}/transition_histories`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseTransitionArgs(tokens) {
  const positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (ALL_BOOLEAN_FLAGS.has(arg)) continue;
    if (shared.BASE_GLOBAL_STRING_FLAGS[arg]) {
      i += 1;
      continue;
    }
  }
  return { positionals };
}

async function runTransition(client, opts, positionals) {
  if (positionals.length < 2) {
    throw new core.PingCodeError('A transition history id and a work item id/identifier are required. Use workitem transition --help for usage.');
  }
  if (positionals.length > 2) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[2]}. Use workitem transition --help for usage.`);
  }

  const historyId = positionals[0];
  const workItemRef = positionals[1];

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
        get: {
          method: 'GET',
          path: `/v1/pjm/work_items/{id}/transition_histories/${historyId}`,
        },
      };
    }

    const workItemId = await core.resolveWorkItemIdentifier(client, workItemRef);
    return await client.request(
      'GET',
      `/v1/pjm/work_items/${workItemId}/transition_histories/${historyId}`,
      null,
      null,
      { dry_run: false, use_workspace_cache: true },
    );
  }

  return await client.request(
    'GET',
    `/v1/pjm/work_items/${workItemRef}/transition_histories/${historyId}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
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
    '  my [options]                List my unfinished work items (compact)',
    '    --project <id|name>       Scope to a project',
    '    --sprint <id|name>        Scope to a sprint',
    '    --type <name|id>          Filter by type',
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
    '  start <id|identifier>       Move a work item to an in-progress state',
    '    --state <name|id>         Target state name (default: 进行中)',
    '',
    '  done <id|identifier>        Move a work item to a completed state',
    '    --state <name|id>         Target state name (default: 已完成)',
    '',
    '  delete <id|identifier>      Delete a work item',
    '',
    '  search [options]            Search work items with a structured query',
    '    --filter JSON             MongoDB-like filter as JSON object',
    '    --keywords TEXT           Keywords (work item identifier or title)',
    '    --page-size N             Results per page (1-100)',
    '    --page-index N            Page index, from 0',
    '    --include-deleted         Include deleted work items',
    '    --include-archived        Include archived work items',
    '',
    '  batch-update [options]      Batch update one property on many work items',
    '    --ids LIST                Comma-separated work item ids (required)',
    '    --property-name NAME      Property to update (required)',
    '    --property-value VALUE    New property value',
    '',
    '  transitions <id|identifier> List work item transition histories',
    '',
    '  transition <history_id> <id|identifier>',
    '                              Get one transition history record',
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
    case 'my':
      console.log([
        'Usage: pingcode workitem my [options]',
        '',
        'List the current user\'s unfinished work items (compact output by default).',
        'Equivalent to `workitem list --assignee @me` with completed/closed states',
        'excluded using the cached state dictionary. Without cached states it falls',
        'back to listing all of the current user\'s work items with a hint.',
        '',
        'Options:',
        '  --project <id|name>       Scope to a project (default: current project)',
        '  --sprint <id|name>        Scope to a sprint (default: current sprint)',
        '  --type <name|id>          Filter by type',
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
    case 'start':
      console.log([
        'Usage: pingcode workitem start <id|identifier> [options]',
        '',
        'Move a work item to an in-progress state (PATCH with the resolved state id).',
        '',
        'Options:',
        '  --state <name|id>         Target state name (default: 进行中). Use this when',
        '                            your workspace names the in-progress state differently.',
      ].join('\n'));
      break;
    case 'done':
      console.log([
        'Usage: pingcode workitem done <id|identifier> [options]',
        '',
        'Move a work item to a completed state (PATCH with the resolved state id).',
        '',
        'Options:',
        '  --state <name|id>         Target state name (default: 已完成). Use this when',
        '                            your workspace names the completed state differently.',
      ].join('\n'));
      break;
    case 'delete':
      console.log([
        'Usage: pingcode workitem delete <id|identifier>',
        '',
        'Delete a work item.',
        '',
        'Identifiers (e.g. SCR-123) are resolved to an id, then the item is deleted.',
      ].join('\n'));
      break;
    case 'search':
      console.log([
        'Usage: pingcode workitem search [options]',
        '',
        'Search work items with a structured query (POST /v1/pjm/work_items/search).',
        '',
        'Options:',
        '  --filter JSON             MongoDB-like filter object, e.g. \'{"title":{"contains":"bug"}}\'',
        '  --keywords TEXT           Keywords (work item identifier or title)',
        '  --page-size N             Results per page (1-100)',
        '  --page-index N            Page index, from 0',
        '  --include-deleted         Include deleted work items',
        '  --include-archived        Include archived work items',
      ].join('\n'));
      break;
    case 'batch-update':
      console.log([
        'Usage: pingcode workitem batch-update --ids LIST --property-name NAME [options]',
        '',
        'Batch update one property across work items (up to 100 ids per call).',
        '',
        'Options:',
        '  --ids LIST                Comma-separated work item ids (required)',
        '  --property-name NAME      Property name: title, start_at, end_at, description,',
        '                            priority_id, assignee_id, state_id, story_points,',
        '                            estimated_workload, remaining_workload, or custom key (required)',
        '  --property-value VALUE    New property value (optional)',
      ].join('\n'));
      break;
    case 'transitions':
      console.log([
        'Usage: pingcode workitem transitions <id|identifier>',
        '',
        'List the transition histories of a work item.',
        '',
        'Identifiers (e.g. SCR-123) are resolved to an id first.',
      ].join('\n'));
      break;
    case 'transition':
      console.log([
        'Usage: pingcode workitem transition <history_id> <id|identifier>',
        '',
        'Get a single transition history record of a work item.',
        '',
        'Identifiers (e.g. SCR-123) are resolved to an id first.',
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
    let forceCompact = false;
    switch (subcommand) {
      case 'list': {
        const args = parseListArgs(subArgs);
        result = await runList(client, opts, args);
        break;
      }
      case 'my': {
        const args = parseMyArgs(subArgs);
        forceCompact = true;
        result = await runMy(client, opts, args);
        break;
      }
      case 'start': {
        const args = parseStateChangeArgs(subArgs, 'start');
        result = await runStart(client, opts, args);
        break;
      }
      case 'done': {
        const args = parseStateChangeArgs(subArgs, 'done');
        result = await runDone(client, opts, args);
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
      case 'search': {
        const args = parseSearchArgs(subArgs);
        result = await runSearch(client, opts, args);
        break;
      }
      case 'batch-update': {
        const args = parseBatchUpdateArgs(subArgs);
        result = await runBatchUpdate(client, opts, args);
        break;
      }
      case 'transitions': {
        const args = parseTransitionsArgs(subArgs);
        result = await runTransitions(client, opts, args);
        break;
      }
      case 'transition': {
        const args = parseTransitionArgs(subArgs);
        result = await runTransition(client, opts, args.positionals);
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
