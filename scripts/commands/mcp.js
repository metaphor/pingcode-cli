'use strict';

// `pingcode mcp` — run the MCP server over stdio, and `pingcode mcp init`
// to register it with supported AI clients. The config writers merge the
// pingcode entry incrementally: existing pingcode entries are replaced,
// unrelated servers are preserved.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const core = require('../core');
const shared = require('./shared');
const mcpServer = require('../mcp-server');

// The published package reference used in generated MCP configs.
const PACKAGE_REF = '@metaphorli/pingcode-cli@latest';
const SERVER_NAME = 'pingcode';
const OMP_SCHEMA_URL = 'https://raw.githubusercontent.com/can1357/oh-my-pi/main/packages/coding-agent/src/config/mcp-schema.json';

// ── Config file helpers ───────────────────────────────────────────────

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseJsonFile(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (exc) {
    throw new core.PingCodeError(`Invalid JSON in ${filePath}: ${exc.message}`);
  }
}

function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function parseJsoncFile(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (_) {
    // OpenCode supports JSONC; strip comments and try again.
    const stripped = stripJsonComments(raw);
    try {
      return JSON.parse(stripped);
    } catch (exc) {
      throw new core.PingCodeError(`Invalid JSON/JSONC in ${filePath}: ${exc.message}`);
    }
  }
}

function writeJsonFile(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// ── Config writers (pure merge functions + thin file wrappers) ────────

function buildStdioEntry(env) {
  const entry = {
    command: 'npx',
    args: ['-y', PACKAGE_REF, 'mcp'],
  };
  if (Object.keys(env).length > 0) {
    entry.env = env;
  }
  return entry;
}

function mergeOmpConfig(config, env) {
  const merged = { ...config };
  merged.mcpServers = { ...(config.mcpServers || {}) };
  merged.mcpServers[SERVER_NAME] = buildStdioEntry(env);
  if (merged.$schema === undefined) {
    merged.$schema = OMP_SCHEMA_URL;
  }
  return merged;
}

function writeOmpConfig(filePath, env) {
  const config = parseJsonFile(filePath, { mcpServers: {} });
  writeJsonFile(filePath, mergeOmpConfig(config, env));
}

function mergeOpenCodeConfig(config, env) {
  const merged = { ...config };
  merged.mcp = { ...(config.mcp || {}) };
  const entry = {
    type: 'local',
    command: ['npx', '-y', PACKAGE_REF, 'mcp'],
    enabled: true,
  };
  if (Object.keys(env).length > 0) {
    entry.environment = env;
  }
  merged.mcp[SERVER_NAME] = entry;
  return merged;
}

function writeOpenCodeConfig(filePath, env) {
  const config = parseJsoncFile(filePath, {});
  writeJsonFile(filePath, mergeOpenCodeConfig(config, env));
}

function tomlString(value) {
  // TOML basic strings are compatible with JSON-stringified simple values.
  return JSON.stringify(value);
}

function tomlStringArray(items) {
  return `[${items.map(tomlString).join(', ')}]`;
}

function buildCodexServerLines(env) {
  const lines = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = ${tomlString('npx')}`,
    `args = ${tomlStringArray(['-y', PACKAGE_REF, 'mcp'])}`,
    `enabled = true`,
  ];
  const envKeys = Object.keys(env);
  if (envKeys.length > 0) {
    lines.push('');
    lines.push(`[mcp_servers.${SERVER_NAME}.env]`);
    for (const key of envKeys) {
      lines.push(`${key} = ${tomlString(env[key])}`);
    }
  }
  return lines;
}

// Pure TOML merge: replace the existing [mcp_servers.pingcode] block (its
// sub-tables included) in place, or append it after the other entries.
function applyCodexConfig(raw, env) {
  const newLines = buildCodexServerLines(env);
  if (!raw) {
    return newLines.join('\n') + '\n';
  }

  const lines = raw.split(/\r?\n/);
  const header = `[mcp_servers.${SERVER_NAME}]`;
  const startLine = lines.findIndex((line) => line.trim() === header);
  if (startLine !== -1) {
    let endLine = lines.length;
    for (let i = startLine + 1; i < lines.length; i += 1) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('[') && !trimmed.startsWith(`[mcp_servers.${SERVER_NAME}.`)) {
        endLine = i;
        break;
      }
    }
    const insert = [...newLines];
    if (startLine > 0 && lines[startLine - 1].trim() !== '') {
      insert.unshift('');
    }
    lines.splice(startLine, endLine - startLine, ...insert);
    return lines.join('\n');
  }

  const trimmed = raw.replace(/\s*$/, '\n');
  return trimmed + '\n' + newLines.join('\n') + '\n';
}

function writeCodexConfig(filePath, env) {
  ensureDir(filePath);
  let raw = '';
  if (fs.existsSync(filePath)) {
    raw = fs.readFileSync(filePath, 'utf8');
  }
  fs.writeFileSync(filePath, applyCodexConfig(raw, env));
}

// ── Supported clients ─────────────────────────────────────────────────

function getOpenCodeConfigPath() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'opencode', 'opencode.json');
  }
  return path.join(os.homedir(), '.config', 'opencode', 'opencode.json');
}

const CLIENTS = [
  {
    id: 'codex',
    name: 'OpenAI Codex CLI',
    filePath: () => path.join(os.homedir(), '.codex', 'config.toml'),
    write: writeCodexConfig,
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    filePath: () => getOpenCodeConfigPath(),
    write: writeOpenCodeConfig,
  },
  {
    id: 'omp',
    name: 'Oh My Pi',
    filePath: () => path.join(os.homedir(), '.omp', 'agent', 'mcp.json'),
    write: writeOmpConfig,
  },
];

// ── Interactive prompts ───────────────────────────────────────────────

function createAsk(inputFunc) {
  if (typeof inputFunc === 'function') {
    return inputFunc;
  }
  if (Array.isArray(inputFunc)) {
    const queue = [...inputFunc];
    return async (prompt) => {
      const next = queue.shift();
      if (next === undefined) {
        throw new core.PingCodeError(`Unexpected prompt (no queued answer): ${prompt}`);
      }
      return next;
    };
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
  ask._rl = rl;
  return ask;
}

function closeAsk(ask) {
  if (ask && ask._rl) {
    ask._rl.close();
  }
}

function isYes(value) {
  return /^(y|yes)$/i.test((value || '').trim());
}

async function selectClientsInteractive(label, clients, ask) {
  console.log(`\n${label}`);
  for (let i = 0; i < clients.length; i += 1) {
    console.log(`  ${i + 1}. ${clients[i].name} (${clients[i].id})`);
  }
  while (true) {
    const raw = await ask('Select clients to configure (numbers or ids, comma-separated; "all"; empty to cancel): ');
    const trimmed = (raw || '').trim();
    if (!trimmed) {
      return [];
    }
    if (/^all$/i.test(trimmed)) {
      return clients.slice();
    }
    const selected = [];
    let invalid = null;
    for (const token of trimmed.split(/[,，\s]+/).filter(Boolean)) {
      if (/^\d+$/.test(token)) {
        const index = parseInt(token, 10);
        if (index >= 1 && index <= clients.length) {
          if (!selected.includes(clients[index - 1])) {
            selected.push(clients[index - 1]);
          }
          continue;
        }
        invalid = token;
        break;
      }
      const found = clients.find((c) => c.id === token.toLowerCase());
      if (!found) {
        invalid = token;
        break;
      }
      if (!selected.includes(found)) {
        selected.push(found);
      }
    }
    if (invalid) {
      console.log(`Invalid selection: ${invalid}`);
      continue;
    }
    return selected;
  }
}

// ── Parser ────────────────────────────────────────────────────────────

function parseMcpArgs(tokens) {
  const { opts, remaining } = shared.parseGlobalOptions(tokens, ['--all', '--yes']);
  const tools = [];
  let helpRequested = false;

  for (let i = 0; i < remaining.length; i += 1) {
    const arg = remaining[i];
    if (arg === '--help' || arg === '-h') {
      helpRequested = true;
      continue;
    }
    if (arg === '--tool') {
      if (i + 1 >= remaining.length) {
        throw new core.PingCodeError('Option --tool requires a value');
      }
      tools.push(remaining[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith('--tool=')) {
      tools.push(arg.slice('--tool='.length));
      continue;
    }
    throw new core.PingCodeError(`Unknown option: ${arg}`);
  }

  opts.tool = tools;
  return { opts, helpRequested };
}

// ── Init flow ─────────────────────────────────────────────────────────

function selectClients(opts, ask) {
  if (opts.all) {
    return Promise.resolve(CLIENTS.slice());
  }
  if (opts.tool && opts.tool.length > 0) {
    const unknown = opts.tool.find((id) => !CLIENTS.some((c) => c.id === id));
    if (unknown) {
      return Promise.reject(new core.PingCodeError(`Unknown client: ${unknown}`));
    }
    return Promise.resolve(CLIENTS.filter((c) => opts.tool.includes(c.id)));
  }
  return selectClientsInteractive('Select AI clients to configure for PingCode MCP', CLIENTS, ask);
}

async function promptCredentials(opts, ask) {
  const env = {};

  if (opts.client_id) {
    env.PINGCODE_CLIENT_ID = opts.client_id;
  } else {
    const answer = await ask('PingCode Client ID (optional, press Enter to skip): ');
    const trimmed = (answer || '').trim();
    if (trimmed) {
      env.PINGCODE_CLIENT_ID = trimmed;
    }
  }

  if (opts.client_secret) {
    env.PINGCODE_CLIENT_SECRET = opts.client_secret;
  } else {
    const answer = await ask('PingCode Client Secret (optional, press Enter to skip): ');
    const trimmed = (answer || '').trim();
    if (trimmed) {
      env.PINGCODE_CLIENT_SECRET = trimmed;
    }
  }

  if (opts.base_url && opts.base_url !== core.DEFAULT_BASE_URL) {
    env.PINGCODE_BASE_URL = opts.base_url;
  }

  return env;
}

async function confirmSelection(selectedClients, ask, opts) {
  if (opts.yes) {
    return true;
  }
  const names = selectedClients.map((client) => client.name).join(', ');
  const answer = await ask(`The following clients will be configured: ${names}. Proceed? (y/N): `);
  return isYes(answer);
}

function printDryRun(selectedClients, env) {
  const result = {
    action: 'mcp init',
    package: PACKAGE_REF,
    command: 'pingcode mcp',
    clients: selectedClients.map((client) => ({
      id: client.id,
      name: client.name,
      file: client.filePath(),
    })),
    environment: env,
  };
  core.printJson(result);
}

async function runInit(argv, inputFunc) {
  const parsed = parseMcpArgs(argv || []);
  if (parsed.helpRequested) {
    printInitHelp();
    return;
  }

  const ask = createAsk(inputFunc);
  try {
    const selected = await selectClients(parsed.opts, ask);
    if (selected.length === 0) {
      console.log('No AI clients selected. Nothing to do.');
      return;
    }

    const env = await promptCredentials(parsed.opts, ask);
    const confirmed = await confirmSelection(selected, ask, parsed.opts);
    if (!confirmed) {
      console.log('Aborted.');
      return;
    }

    if (parsed.opts.dry_run) {
      printDryRun(selected, env);
      return;
    }

    for (const client of selected) {
      const filePath = client.filePath();
      client.write(filePath, env);
      console.log(`Configured ${client.name}: ${filePath}`);
    }
  } finally {
    closeAsk(ask);
  }
}

// ── Help ──────────────────────────────────────────────────────────────

function printInitHelp() {
  console.log([
    'pingcode mcp init — Configure PingCode MCP in AI clients',
    '',
    'Usage: pingcode mcp init [options]',
    '',
    'Options:',
    '  --all                   Configure all supported clients',
    '  --tool <id>             Configure a specific client (can be repeated)',
    '  --client-id ID          PingCode OAuth client ID (written to the client config)',
    '  --client-secret SECRET  PingCode OAuth client secret (written to the client config)',
    '  --base-url URL          PingCode base URL',
    '  --dry-run               Show what would be written without writing',
    '  --yes                   Skip the final confirmation prompt',
    '  --help                  Show this help',
    '',
    'Supported clients: codex, opencode, omp',
    '',
    'Examples:',
    '  pingcode mcp init',
    '  pingcode mcp init --all --yes --client-id ID --client-secret SECRET',
    '  pingcode mcp init --tool codex --dry-run',
  ].join('\n'));
}

function printHelp() {
  console.log([
    'pingcode mcp — Run the PingCode MCP server and configure clients',
    '',
    'Usage:',
    '  pingcode mcp                 Start the MCP server on stdio',
    '  pingcode mcp init [options]  Register the server with AI clients',
    '',
    'Run `pingcode mcp init --help` for configuration options.',
    'Supported clients: codex, opencode, omp',
  ].join('\n'));
}

// ── Run ───────────────────────────────────────────────────────────────

async function run(argv, inputFunc) {
  const tokens = argv || [];

  if (tokens.length === 0) {
    console.error('PingCode MCP server running on stdio (press Ctrl+C to stop)');
    await mcpServer.runMcpServer();
    return;
  }

  if (tokens[0] === '--help' || tokens[0] === '-h') {
    printHelp();
    return;
  }

  const subcommand = tokens[0];
  const remaining = tokens.slice(1);
  switch (subcommand) {
    case 'init':
      await runInit(remaining, inputFunc);
      break;
    default:
      throw new core.PingCodeError(`Unknown mcp subcommand: ${subcommand}. Use pingcode mcp --help for usage.`);
  }
}

// ── Register ──────────────────────────────────────────────────────────

shared.registerModule('mcp', {
  name: 'mcp',
  description: 'Run the PingCode MCP server and configure clients',
  run,
});

module.exports = {
  run, runInit, printHelp, printInitHelp, parseMcpArgs,
  CLIENTS, PACKAGE_REF, SERVER_NAME, OMP_SCHEMA_URL,
  buildStdioEntry, mergeOmpConfig, writeOmpConfig,
  mergeOpenCodeConfig, writeOpenCodeConfig,
  buildCodexServerLines, applyCodexConfig, writeCodexConfig,
  stripJsonComments, selectClientsInteractive, isYes,
};

