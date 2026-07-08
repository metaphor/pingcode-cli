#!/usr/bin/env node
'use strict';

const readline = require('node:readline');

const pingcode = require('./pingcode');

function pageValues(payload) {
  return pingcode.pageValues(payload);
}

function displayName(item) {
  const entity = pingcode.normalizedEntity(item);
  for (const key of ['display_name', 'name', 'identifier', 'email', 'id']) {
    const value = entity[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return '<unnamed>';
}

function itemId(item, label) {
  const value = pingcode.normalizedEntity(item).id;
  if (typeof value !== 'string' || !value) {
    throw new pingcode.PingCodeError(`Selected ${label} has no id`);
  }
  return value;
}

async function promptChoice(label, items, inputFunc) {
  if (!items || items.length === 0) {
    throw new pingcode.PingCodeError(`No ${label} options are available`);
  }
  console.log(`\nSelect current ${label}:`);
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const entity = pingcode.normalizedEntity(item);
    const details = [];
    const itemIdentifier = entity.identifier;
    const itemEmail = entity.email;
    const itemName = entity.name;
    if (typeof itemIdentifier === 'string' && itemIdentifier) {
      details.push(itemIdentifier);
    }
    if (typeof itemName === 'string' && itemName && itemName !== displayName(item)) {
      details.push(itemName);
    }
    if (typeof itemEmail === 'string' && itemEmail) {
      details.push(itemEmail);
    }
    const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';
    console.log(`  ${index + 1}. ${displayName(item)} [${itemId(item, label)}]${suffix}`);
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
      return pingcode.findCachedItem(items, trimmed, label);
    } catch (exc) {
      console.log(`Invalid ${label} selection: ${exc.message}`);
    }
  }
}

async function fetchProjects(client, refresh = false) {
  if (refresh || !client.workspaceCache.projects || typeof client.workspaceCache.projects !== 'object') {
    return await pingcode.cacheProjects(client);
  }
  return client.workspaceCache.projects;
}

async function fetchSprints(client, projectId, refresh = false) {
  const sprintsCache = client.workspaceCache.sprints || {};
  if (refresh || !sprintsCache[projectId] || typeof sprintsCache[projectId] !== 'object') {
    return await pingcode.cacheSprints(client, projectId);
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
    return await pingcode.cacheUsers(client, projectId);
  }
  return usersCache;
}

async function cacheContext(client, project, sprint, user) {
  if (!client.workspaceCache.preferences) client.workspaceCache.preferences = {};
  const preferences = client.workspaceCache.preferences;
  preferences.current_project_id = itemId(project, 'project');
  preferences.current_project_name = displayName(project);
  preferences.current_sprint_id = itemId(sprint, 'sprint');
  preferences.current_sprint_name = displayName(sprint);
  preferences.current_user_id = itemId(user, 'user');
  preferences.current_user_name = displayName(user);
  client.saveWorkspaceCache();
  return {
    message: 'PingCode workspace context cached',
    workspace_cache: client.workspaceCachePath || null,
    preferences,
  };
}

function buildParser() {
  return {
    parseArgs(argv) {
      const args = {
        base_url: process.env.PINGCODE_BASE_URL || pingcode.DEFAULT_BASE_URL,
        client_id: process.env.PINGCODE_CLIENT_ID || null,
        client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
        token: process.env.PINGCODE_ACCESS_TOKEN || null,
        no_token_cache: false,
        workspace_cache: process.env.PINGCODE_WORKSPACE_CACHE || pingcode.DEFAULT_WORKSPACE_CACHE,
        refresh: false,
      };

      const booleanFlags = new Set(['--no-token-cache', '--refresh']);
      const stringFlags = {
        '--base-url': 'base_url',
        '--client-id': 'client_id',
        '--client-secret': 'client_secret',
        '--token': 'token',
        '--workspace-cache': 'workspace_cache',
      };

      const tokens = argv || process.argv.slice(2);
      for (let i = 0; i < tokens.length; i++) {
        const arg = tokens[i];
        if (arg === '--help' || arg === '-h') {
          console.log(usageText());
          process.exit(0);
        }
        if (booleanFlags.has(arg)) {
          const key = arg.replace(/^--/, '').replace(/-/g, '_');
          args[key] = true;
          continue;
        }
        const eqIndex = arg.indexOf('=');
        let flag, value, consumedNext = false;
        if (eqIndex !== -1) {
          flag = arg.slice(0, eqIndex);
          value = arg.slice(eqIndex + 1);
        } else {
          flag = arg;
          if (i + 1 < tokens.length) {
            value = tokens[i + 1];
            consumedNext = true;
          } else {
            throw new pingcode.PingCodeError(`Flag ${flag} requires a value`);
          }
        }
        if (!(flag in stringFlags)) {
          throw new pingcode.PingCodeError(`Unknown option: ${flag}`);
        }
        args[stringFlags[flag]] = value;
        if (consumedNext) i += 1;
      }
      return args;
    },
  };
}

function usageText() {
  return [
    'Interactively configure PingCode workspace context',
    '',
    'Usage: node scripts/pingcode-ctx.js [options]',
    '',
    'Options:',
    '  --base-url URL',
    '  --client-id ID',
    '  --client-secret SECRET',
    '  --token TOKEN',
    '  --no-token-cache',
    '  --workspace-cache PATH',
    '  --refresh',
    '  -h, --help',
  ].join('\n');
}

async function run(args, inputFunc) {
  const tokenCache = args.no_token_cache ? null : (process.env.PINGCODE_TOKEN_CACHE || pingcode.DEFAULT_TOKEN_CACHE);
  const client = new pingcode.PingCodeClient({
    base_url: args.base_url,
    client_id: args.client_id,
    client_secret: args.client_secret,
    token: args.token,
    token_cache: tokenCache,
    workspace_cache: args.workspace_cache,
  });

  let rl = null;
  if (!inputFunc) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    inputFunc = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
  }

  try {
    const project = await promptChoice('project', pageValues(await fetchProjects(client, args.refresh)), inputFunc);
    const projectId = itemId(project, 'project');
    const sprint = await promptChoice('sprint', pageValues(await fetchSprints(client, projectId, args.refresh)), inputFunc);
    const user = await promptChoice('user', pageValues(await fetchUsers(client, projectId, args.refresh)), inputFunc);
    return await cacheContext(client, project, sprint, user);
  } finally {
    if (rl) rl.close();
  }
}

async function main(argv) {
  const parser = buildParser();
  let args;
  try {
    args = parser.parseArgs(argv);
  } catch (exc) {
    console.error(`error: ${exc.message}`);
    process.exitCode = 1;
    return;
  }
  try {
    pingcode.printJson(await run(args));
  } catch (exc) {
    if (exc instanceof pingcode.PingCodeError) {
      console.error(`error: ${exc.message}`);
    } else {
      console.error(`error: ${exc.message}`);
    }
    process.exitCode = 1;
  }
}

module.exports = {
  pageValues,
  displayName,
  itemId,
  promptChoice,
  fetchProjects,
  fetchSprints,
  fetchUsers,
  cacheContext,
  buildParser,
  run,
  main,
};

if (require.main === module) {
  main().catch((exc) => {
    console.error(`error: ${exc.message}`);
    process.exitCode = 1;
  });
}
