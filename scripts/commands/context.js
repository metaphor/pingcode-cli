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
      'Usage: node scripts/pingcode.js context init [options]',
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
      'Usage: node scripts/pingcode.js context list [options]',
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
      'Usage: node scripts/pingcode.js context set-current-user <id|name|@me> [options]',
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
      'Usage: node scripts/pingcode.js context set-current-project <id|name> [options]',
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
      'Usage: node scripts/pingcode.js context set-current-sprint <id|name> [options]',
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
    'Usage: node scripts/pingcode.js context <subcommand> [options]',
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

const BOOLEAN_FLAGS = new Set([
  '--no-workspace-cache', '--no-token-cache',
  '--dry-run', '--refresh',
]);

const STRING_FLAGS = {
  '--base-url': 'base_url',
  '--client-id': 'client_id',
  '--client-secret': 'client_secret',
  '--token': 'token',
  '--workspace-cache': 'workspace_cache',
  '--grant-type': 'grant_type',
};

function parseContextArgs(tokens) {
  const opts = {
    base_url: process.env.PINGCODE_BASE_URL || core.DEFAULT_BASE_URL,
    client_id: process.env.PINGCODE_CLIENT_ID || null,
    client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
    token: process.env.PINGCODE_ACCESS_TOKEN || null,
    workspace_cache: process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE,
    no_workspace_cache: false,
    no_token_cache: false,
    dry_run: false,
    refresh: false,
    grant_type: 'auto',
  };

  const positionals = [];
  let helpRequested = false;

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--help' || arg === '-h') {
      helpRequested = true;
      continue;
    }
    if (BOOLEAN_FLAGS.has(arg)) {
      const key = arg.replace(/^--/, '').replace(/-/g, '_');
      opts[key] = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      let flag, value;
      if (eqIndex !== -1) {
        flag = arg.slice(0, eqIndex);
        value = arg.slice(eqIndex + 1);
      } else {
        flag = arg;
        if (i + 1 < tokens.length) {
          value = tokens[i + 1];
          i += 1;
        } else {
          throw new core.PingCodeError(`Flag ${flag} requires a value`);
        }
      }
      if (!(flag in STRING_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${flag}`);
      }
      opts[STRING_FLAGS[flag]] = value;
      continue;
    }
    positionals.push(arg);
  }

  return {
    subcommand: positionals[0] || null,
    value: positionals[1] || null,
    opts,
    helpRequested,
  };
}

// ── Client ─────────────────────────────────────────────────────────

function createClient(opts) {
  const tokenCache = opts.no_token_cache
    ? null
    : (process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE);
  const workspaceCache = opts.no_workspace_cache ? null : opts.workspace_cache;
  return new core.PingCodeClient({
    base_url: opts.base_url,
    client_id: opts.client_id,
    client_secret: opts.client_secret,
    token: opts.token,
    token_cache: tokenCache,
    workspace_cache: workspaceCache,
    grant_type: opts.grant_type,
  });
}

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

  // Print preferences
  console.log('Preferences:');
  const prefs = cache.preferences || {};
  const prefKeys = Object.keys(prefs).sort();
  if (prefKeys.length === 0) {
    console.log('  (none)');
  } else {
    for (const key of prefKeys) {
      console.log(`  ${key}: ${prefs[key]}`);
    }
  }

  // Print cached dictionary summary
  console.log('');
  console.log('Cached dictionaries:');
  const counts = countDictionaryEntries(cache);
  const countKeys = Object.keys(counts).sort();
  for (const key of countKeys) {
    const label = key.replace(/_/g, ' ');
    console.log(`  ${label}: ${counts[key]} items`);
  }
}

// ── Subcommand name mapping ────────────────────────────────────────

const SUBCOMMAND_ALIASES = {
  'set-current-user': 'set-current-user',
  'set-current-project': 'set-current-project',
  'set-current-sprint': 'set-current-sprint',
  init: 'init',
  list: 'list',
};

// ── Run ────────────────────────────────────────────────────────────

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

  if (!subcommand || !(subcommand in SUBCOMMAND_ALIASES)) {
    throw new core.PingCodeError(
      `Unknown context subcommand: ${subcommand || '(none)'}. ` +
      'Valid subcommands: init, set-current-user, set-current-project, set-current-sprint, list.',
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
