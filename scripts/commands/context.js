'use strict';

const readline = require('node:readline');

const core = require('../core');
const shared = require('./shared');

// ── Interactive selection ──────────────────────────────────────────

async function promptChoice(label, items, inputFunc) {
  if (!items || items.length === 0) {
    throw new core.PingCodeError(`No ${label} options are available`);
  }
  console.log(`\nSelect current ${label}:`);
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const entity = core.normalizedEntity(item);
    const details = [];
    const itemIdentifier = entity.identifier;
    const itemEmail = entity.email;
    const itemName = entity.name;
    if (typeof itemIdentifier === 'string' && itemIdentifier) {
      details.push(itemIdentifier);
    }
    if (typeof itemName === 'string' && itemName && itemName !== core.displayName(item)) {
      details.push(itemName);
    }
    if (typeof itemEmail === 'string' && itemEmail) {
      details.push(itemEmail);
    }
    const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';
    console.log(`  ${index + 1}. ${core.displayName(item)} [${core.itemId(item, label)}]${suffix}`);
  }

  while (true) {
    const raw = await inputFunc(`Enter ${label} number, id, or name: `);
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) {
      const index = parseInt(trimmed, 10);
      if (index >= 1 && index <= items.length) {
        return items[index - 1];
      }
    }
    try {
      return core.findCachedItem(items, trimmed, label);
    } catch (exc) {
      console.log(`Invalid ${label} selection: ${exc.message}`);
    }
  }
}

async function fetchProjects(client, refresh = false) {
  if (refresh || !client.workspaceCache.projects || typeof client.workspaceCache.projects !== 'object') {
    return await core.cacheProjects(client);
  }
  return client.workspaceCache.projects;
}

async function fetchSprints(client, projectId, refresh = false) {
  const sprintsCache = client.workspaceCache.sprints || {};
  if (refresh || !sprintsCache[projectId] || typeof sprintsCache[projectId] !== 'object') {
    return await core.cacheSprints(client, projectId);
  }
  return sprintsCache[projectId];
}

async function fetchUsers(client, projectId, refresh = false) {
  const usersCache = client.workspaceCache.users;
  if (
    refresh ||
    !usersCache ||
    typeof usersCache !== 'object' ||
    (usersCache.project_id !== null && usersCache.project_id !== undefined && usersCache.project_id !== projectId)
  ) {
    return await core.cacheUsers(client, projectId);
  }
  return usersCache;
}

async function cacheContext(client, project, sprint, user) {
  if (!client.workspaceCache.preferences) client.workspaceCache.preferences = {};
  const preferences = client.workspaceCache.preferences;
  preferences.current_project_id = core.itemId(project, 'project');
  preferences.current_project_name = core.displayName(project);
  preferences.current_sprint_id = core.itemId(sprint, 'sprint');
  preferences.current_sprint_name = core.displayName(sprint);
  preferences.current_user_id = core.itemId(user, 'user');
  preferences.current_user_name = core.displayName(user);
  client.saveWorkspaceCache();
  return {
    message: 'PingCode workspace context cached',
    workspace_cache: client.workspaceCachePath || null,
    preferences,
  };
}

// ── Help ───────────────────────────────────────────────────────────

function printHelp(subcommand) {
  if (subcommand === 'init') {
    console.log([
      'Usage: pingcode context init [options]',
      '',
      'Interactively configure PingCode workspace context.',
      'Prompts for project, sprint/iteration, and user selection,',
      'then writes the results to the workspace cache.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
      '  --refresh                Re-fetch dictionaries from API',
    ].join('\n'));
    return;
  }

  if (subcommand === 'list') {
    console.log([
      'Usage: pingcode context list [options]',
      '',
      'Print current workspace preferences and a summary of cached dictionaries.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
    ].join('\n'));
    return;
  }

  if (subcommand === 'set-current-user') {
    console.log([
      'Usage: pingcode context set-current-user <id|name|@me> [options]',
      '',
      'Set the current PingCode user for this workspace.',
      '',
      'Arguments:',
      '  <id|name|@me>   User ID, cached user name/display name, or @me to use the',
      '                   already-cached current user ID.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache (requires env vars)',
      '  --dry-run                Show what would be set without writing',
    ].join('\n'));
    return;
  }

  if (subcommand === 'set-current-project') {
    console.log([
      'Usage: pingcode context set-current-project <id|name> [options]',
      '',
      'Set the current PingCode project for this workspace.',
      '',
      'Arguments:',
      '  <id|name>   Project ID or cached project name.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
      '  --dry-run                Show what would be set without writing',
    ].join('\n'));
    return;
  }

  if (subcommand === 'set-current-sprint') {
    console.log([
      'Usage: pingcode context set-current-sprint <id|name> [options]',
      '',
      'Set the current PingCode sprint/iteration for this workspace.',
      '',
      'Arguments:',
      '  <id|name>   Sprint ID or cached sprint name.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
      '  --dry-run                Show what would be set without writing',
    ].join('\n'));
    return;
  }

  // Default: module-level help
  console.log([
    'PingCode context — Manage workspace context',
    '',
    'Usage: pingcode context <subcommand> [options]',
    '',
    'Subcommands:',
    '  init                     Initialize workspace context (interactive)',
    '  set-current-user <id>    Set the current user (id, name, or @me)',
    '  set-current-project <id> Set the current project (id or name)',
    '  set-current-sprint <id>  Set the current sprint/iteration (id or name)',
    '  list                     Show current preferences and cached dictionary summary',
    '',
    'Global options:',
    '  --base-url URL           PingCode base URL',
    '  --workspace-cache PATH   Workspace cache file path',
    '  --no-workspace-cache     Disable workspace cache',
    '  --dry-run                Show what would be done without executing',
    '  --grant-type TYPE        OAuth grant type: client_credentials, authorization_code, or auto (default; uses cached token type)',
    '  --help                   Show this help',
  ].join('\n'));
}

// ── Parser ─────────────────────────────────────────────────────────

function parseContextArgs(tokens) {
  const { opts, remaining } = shared.parseGlobalOptions(tokens, ['--refresh']);

  const helpRequested = remaining.includes('--help') || remaining.includes('-h');
  const positionals = remaining.filter(a => !a.startsWith('-'));

  return {
    subcommand: positionals[0] || null,
    value: positionals[1] || null,
    opts,
    helpRequested,
  };
}

// ── Client ─────────────────────────────────────────────────────────

const createClient = shared.clientFromOpts;

// ── Dictionary counts (copied from config.js; not exported from core) ──

function countDictionaryEntries(cache) {
  const counts = {};

  const users = core.pageValues(cache.users);
  counts.users = users.length;

  const projects = core.pageValues(cache.projects);
  counts.projects = projects.length;

  let sprintTotal = 0;
  for (const v of Object.values(cache.sprints || {})) {
    sprintTotal += core.pageValues(v).length;
  }
  counts.sprints = sprintTotal;

  let typesTotal = 0;
  for (const v of Object.values(cache.work_item_types || {})) {
    typesTotal += core.pageValues(v).length;
  }
  counts.work_item_types = typesTotal;

  let statesTotal = 0;
  for (const v of Object.values(cache.work_item_states || {})) {
    statesTotal += core.pageValues(v).length;
  }
  counts.work_item_states = statesTotal;

  let prioTotal = 0;
  for (const v of Object.values(cache.work_item_priorities || {})) {
    prioTotal += core.pageValues(v).length;
  }
  counts.work_item_priorities = prioTotal;

  let propsTotal = 0;
  for (const v of Object.values(cache.work_item_properties || {})) {
    propsTotal += core.pageValues(v).length;
  }
  counts.work_item_properties = propsTotal;

  let ideaStatesTotal = 0;
  for (const v of Object.values(cache.idea_states || {})) {
    ideaStatesTotal += core.pageValues(v).length;
  }
  counts.idea_states = ideaStatesTotal;

  let ideaPrioTotal = 0;
  for (const v of Object.values(cache.idea_priorities || {})) {
    ideaPrioTotal += core.pageValues(v).length;
  }
  counts.idea_priorities = ideaPrioTotal;

  return counts;
}

// ── Handlers ───────────────────────────────────────────────────────

async function handleInit(opts, inputFunc) {
  const client = createClient(opts);
  const refresh = Boolean(opts.refresh);

  let rl = null;
  if (!inputFunc) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    inputFunc = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
  }

  try {
  const project = await promptChoice('project', core.pageValues(await fetchProjects(client, refresh)), inputFunc);
  const projectId = core.itemId(project, 'project');
  const sprint = await promptChoice('sprint', core.pageValues(await fetchSprints(client, projectId, refresh)), inputFunc);
  const user = await promptChoice('user', core.pageValues(await fetchUsers(client, projectId, refresh)), inputFunc);
    const result = await cacheContext(client, project, sprint, user);
    core.printJson(result);
  } finally {
    if (rl) rl.close();
  }
}

async function handleSetCurrentUser(value, opts) {
  if (!value) {
    throw new core.PingCodeError(
      'Usage: context set-current-user <id|name|@me>\n' +
      '  <id>         Direct user ID\n' +
      '  <name>       Cached user name or display name\n' +
      '  @me          Use the already-cached current user ID',
    );
  }

  const client = createClient(opts);

  // Expand @me placeholder to the cached current user ID.
  let userId = value;
  if (value === '@me') {
    userId = core.currentUserId(null, client.workspaceCache);
  }

  if (opts.dry_run) {
    core.printJson({
      dry_run: true,
      action: 'set-current-user',
      input: value,
      resolved_user_id: userId,
    });
    return;
  }

  const result = await core.setCurrentUser(client, userId);
  core.printJson(result);
}

async function handleSetCurrentProject(value, opts) {
  if (!value) {
    throw new core.PingCodeError(
      'Usage: context set-current-project <id|name>',
    );
  }

  const client = createClient(opts);

  if (opts.dry_run) {
    // Try to resolve the project ID from the cache for dry-run display.
    let resolvedId = value;
    const projects = core.pageValues(client.workspaceCache.projects);
    try {
      const found = core.findCachedItem(projects, value, 'project');
      if (found && found.id) resolvedId = found.id;
    } catch (_) {
      // Keep the raw value if resolution fails.
    }
    core.printJson({
      dry_run: true,
      action: 'set-current-project',
      input: value,
      resolved_project_id: resolvedId,
    });
    return;
  }

  const result = await core.setCurrentProject(client, value);
  core.printJson(result);
}

async function handleSetCurrentSprint(value, opts) {
  if (!value) {
    throw new core.PingCodeError(
      'Usage: context set-current-sprint <id|name>',
    );
  }

  const client = createClient(opts);

  if (opts.dry_run) {
    // Try to resolve the sprint ID from the cache for dry-run display.
    let resolvedId = value;
    const allSprints = [];
    for (const payload of Object.values(client.workspaceCache.sprints || {})) {
      allSprints.push(...core.pageValues(payload));
    }
    try {
      const found = core.findCachedItem(allSprints, value, 'sprint');
      if (found && found.id) resolvedId = found.id;
    } catch (_) {
      // Keep the raw value if resolution fails.
    }
    core.printJson({
      dry_run: true,
      action: 'set-current-sprint',
      input: value,
      resolved_sprint_id: resolvedId,
    });
    return;
  }

  const result = await core.setCurrentSprint(client, value);
  core.printJson(result);
}

async function handleList(opts) {
  const client = createClient(opts);
  const cache = client.workspaceCache;

  const preferences = cache.preferences || {};

  core.printJson({
    preferences,
    dictionaries: countDictionaryEntries(cache),
  });
}

// ── Run ────────────────────────────────────────────────────────────

const VALID_SUBCOMMANDS = new Set([
  'init', 'set-current-user', 'set-current-project', 'set-current-sprint', 'list',
]);

async function run(argv) {
  const tokens = argv || [];

  // No args or first arg is help → module-level help.
  if (tokens.length === 0 || tokens[0] === '--help' || tokens[0] === '-h') {
    printHelp();
    return;
  }

  const parsed = parseContextArgs(tokens);

  // If --help was found anywhere, show help for the subcommand if known.
  if (parsed.helpRequested) {
    printHelp(parsed.subcommand);
    return;
  }

  const subcommand = parsed.subcommand;

  if (!subcommand || !VALID_SUBCOMMANDS.has(subcommand)) {
    throw new core.PingCodeError(
      `Unknown context subcommand: ${subcommand || '(none)'}. Use context --help for usage.`
    );
  }

  switch (subcommand) {
    case 'init':
      await handleInit(parsed.opts);
      break;
    case 'set-current-user':
      await handleSetCurrentUser(parsed.value, parsed.opts);
      break;
    case 'set-current-project':
      await handleSetCurrentProject(parsed.value, parsed.opts);
      break;
    case 'set-current-sprint':
      await handleSetCurrentSprint(parsed.value, parsed.opts);
      break;
    case 'list':
      await handleList(parsed.opts);
      break;
    default:
      throw new core.PingCodeError(`Unknown context subcommand: ${subcommand}`);
  }
}

// ── Register ───────────────────────────────────────────────────────

shared.registerModule('context', {
  name: 'context',
  description: 'Manage PingCode workspace context',
  run,
});

module.exports = { run, printHelp, parseContextArgs, createClient };
