  'use strict';

// Module registry shared by the dispatcher and command modules.
// Command modules register themselves here; the dispatcher discovers
// them without importing command files directly (avoids circular deps).

const core = require('../core');

const registry = new Map();

function registerModule(name, config) {
  registry.set(name, config);
}

function getModule(name) {
  return registry.get(name);
}

function listModules() {
  const modules = [];
  for (const [name, config] of registry) {
    modules.push({ name, description: config.description });
  }
  modules.sort((a, b) => a.name.localeCompare(b.name));
  return modules;
}

function printModulesHelp() {
  const modules = listModules();
  const maxLen = Math.max(...modules.map(m => m.name.length));
  const lines = [
    'Usage: pingcode <module> [subcommand] [options]',
    '',
    'Modules:',
  ];
  for (const m of modules) {
    const padded = m.name.padEnd(maxLen + 2);
    lines.push(`  ${padded}${m.description}`);
  }
  console.log(lines.join('\n'));
}

const BASE_GLOBAL_BOOLEAN_FLAGS = new Set([
  '--dry-run', '--compact', '--no-token-cache', '--no-workspace-cache',
]);

const BASE_GLOBAL_STRING_FLAGS = {
  '--base-url': 'base_url',
  '--client-id': 'client_id',
  '--client-secret': 'client_secret',
  '--token': 'token',
  '--user-id': 'user_id',
  '--user-name': 'user_name',
  '--workspace-cache': 'workspace_cache',
  '--grant-type': 'grant_type',
};

function defaultGlobalOpts(extraBooleanFlags = []) {
  const opts = {
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
    grant_type: 'auto',
  };
  for (const flag of extraBooleanFlags) {
    const key = flag.replace(/^--/, '').replace(/-/g, '_');
    opts[key] = false;
  }
  return opts;
}

function parseGlobalOptions(tokens, extraBooleanFlags = []) {
  const booleanFlags = new Set([...BASE_GLOBAL_BOOLEAN_FLAGS, ...extraBooleanFlags]);
  const opts = defaultGlobalOpts(extraBooleanFlags);
  const remaining = [];

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--help' || arg === '-h') {
      remaining.push(arg);
      continue;
    }
    if (booleanFlags.has(arg)) {
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
        remaining.push(arg);
        continue;
      }
    } else {
      remaining.push(arg);
      continue;
    }
    if (flag in BASE_GLOBAL_STRING_FLAGS) {
      opts[BASE_GLOBAL_STRING_FLAGS[flag]] = value;
      if (consumedNext) i += 1;
    } else {
      remaining.push(arg);
      if (consumedNext) remaining.push(value);
      if (consumedNext) i += 1;
    }
  }
  return { opts, remaining };
}

function clientFromOpts(opts) {
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

module.exports = {
  registerModule, getModule, listModules, printModulesHelp,
  BASE_GLOBAL_BOOLEAN_FLAGS, BASE_GLOBAL_STRING_FLAGS,
  defaultGlobalOpts, parseGlobalOptions, clientFromOpts,
};
