'use strict';

const crypto = require('node:crypto');
const os = require('node:os');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

const core = require('../core');
const shared = require('./shared');

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:8765/callback';
const DEFAULT_PORT = 8765;

// ── Flag maps ──────────────────────────────────────────────────────────

const BOOLEAN_FLAGS = new Set([
  '--no-browser', '--no-token-cache', '--no-workspace-cache', '--dry-run',
]);

const STRING_FLAGS = {
  '--redirect-uri': 'redirect_uri',
  '--port': 'port',
  '--code': 'code',
  '--grant-type': 'grant_type',
  '--client-id': 'client_id',
  '--client-secret': 'client_secret',
  '--base-url': 'base_url',
  '--token-cache': 'token_cache',
  '--workspace-cache': 'workspace_cache',
};

// ── Parser ─────────────────────────────────────────────────────────────

function parseLoginArgs(tokens) {
  const opts = {
    redirect_uri: process.env.PINGCODE_REDIRECT_URI || DEFAULT_REDIRECT_URI,
    port: process.env.PINGCODE_CALLBACK_PORT
      ? parseInt(process.env.PINGCODE_CALLBACK_PORT, 10)
      : DEFAULT_PORT,
    code: null,
    grant_type: 'authorization_code',
    client_id: process.env.PINGCODE_CLIENT_ID || null,
    client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
    base_url: process.env.PINGCODE_BASE_URL || core.DEFAULT_BASE_URL,
    token_cache: process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE,
    workspace_cache: process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE,
    no_browser: false,
    no_token_cache: false,
    no_workspace_cache: false,
    dry_run: false,
  };

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
        if (!(flag in STRING_FLAGS)) {
          throw new core.PingCodeError(`Unknown option: ${flag}`);
        }
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
    throw new core.PingCodeError(`Unexpected argument: ${arg}. Use login --help for usage.`);
  }

  // Convert --port to number
  if (typeof opts.port === 'string') {
    const parsed = parseInt(opts.port, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
      throw new core.PingCodeError(`Invalid port: ${opts.port}`);
    }
    opts.port = parsed;
  }

  return { opts, helpRequested };
}

// ── Client ─────────────────────────────────────────────────────────────

function createClient(opts) {
  const tokenCache = opts.no_token_cache ? null : opts.token_cache;
  const workspaceCache = opts.no_workspace_cache ? null : opts.workspace_cache;
  return new core.PingCodeClient({
    base_url: opts.base_url,
    client_id: opts.client_id,
    client_secret: opts.client_secret,
    token_cache: tokenCache,
    workspace_cache: workspaceCache,
    grant_type: opts.grant_type,
  });
}

// ── Browser opening ────────────────────────────────────────────────────

function openBrowser(url) {
  const platform = os.platform();
  let command, args;

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Browser process exited with code ${code}`));
      }
    });
  });
}

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode login — Authenticate with your PingCode user account',
    '',
    'Usage: node scripts/pingcode.js login [options]',
    '',
    'Options:',
    '  --redirect-uri URI         Redirect URI for OAuth callback',
    `                            (default: ${DEFAULT_REDIRECT_URI})`,
    `  --port PORT                Local callback server port (default: ${DEFAULT_PORT})`,
    '  --no-browser              Print the authorization URL and prompt for code',
    '  --code CODE               Authorization code (skip browser and callback)',
    '  --grant-type TYPE         OAuth grant type (default: authorization_code)',
    '  --client-id ID            OAuth client ID',
    '  --client-secret SECRET    OAuth client secret',
    '  --base-url URL            PingCode base URL',
    '  --token-cache PATH        Token cache file path',
    '  --no-token-cache          Disable token cache',
    '  --workspace-cache PATH    Workspace cache file path',
    '  --no-workspace-cache      Disable workspace cache',
    '  --dry-run                 Show planned actions without executing',
    '  --help                    Show this help',
    '',
    'Credentials can also be set via environment variables:',
    '  PINGCODE_CLIENT_ID        OAuth client ID',
    '  PINGCODE_CLIENT_SECRET    OAuth client secret',
    '  PINGCODE_BASE_URL         PingCode base URL',
    '  PINGCODE_TOKEN_CACHE      Token cache file path',
    '  PINGCODE_WORKSPACE_CACHE  Workspace cache file path',
    '  PINGCODE_REDIRECT_URI     Redirect URI (default: http://127.0.0.1:8765/callback)',
    '  PINGCODE_CALLBACK_PORT    Callback server port (default: 8765)',
  ].join('\n'));
}

// ── Helper: prompt for code from stdin ──────────────────────────────────

function promptForCode(inputFunc) {
  if (inputFunc) {
    return inputFunc('Paste the authorization code from the URL: ');
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Paste the authorization code from the URL: ', (code) => {
      rl.close();
      resolve(code.trim());
    });
  });
}

// ── Helper: extract path from redirect URI ─────────────────────────────

function extractCallbackPath(redirectUri) {
  try {
    const url = new URL(redirectUri);
    return url.pathname || '/callback';
  } catch (_) {
    return '/callback';
  }
}

// ── Dry-run: exchange request shape ────────────────────────────────────

function buildDryRunExchange(opts, code) {
  const params = {
    grant_type: opts.grant_type,
    code: code,
    client_id: opts.client_id,
    client_secret: opts.client_secret,
  };
  // Include redirect_uri if the API requires it (authorization_code flow)
  if (opts.grant_type === 'authorization_code' && opts.redirect_uri) {
    params.redirect_uri = opts.redirect_uri;
  }
  return {
    dry_run: true,
    method: 'GET',
    path: '/v1/auth/token',
    params: params,
  };
}

// ── Main ────────────────────────────────────────────────────────────────

async function run(argv, inputFunc) {
  const tokens = argv || [];

  // No args → help
  if (tokens.length === 0) {
    printHelp();
    return;
  }

  const { opts, helpRequested } = parseLoginArgs(tokens);

  if (helpRequested) {
    printHelp();
    return;
  }

  // Validate credentials
  if (!opts.client_id) {
    throw new core.PingCodeError(
      'Missing credentials. Set PINGCODE_CLIENT_ID and PINGCODE_CLIENT_SECRET, ' +
      'or pass --client-id and --client-secret.\n' + core.AUTH_ENV_GUIDANCE
    );
  }
  if (!opts.client_secret) {
    throw new core.PingCodeError(
      'Missing credentials. Set PINGCODE_CLIENT_ID and PINGCODE_CLIENT_SECRET, ' +
      'or pass --client-id and --client-secret.\n' + core.AUTH_ENV_GUIDANCE
    );
  }

  // ── Dry-run mode ──────────────────────────────────────────────────
  if (opts.dry_run) {
    if (opts.code) {
      // With --code: show the exchange request shape
      core.printJson(buildDryRunExchange(opts, opts.code));
      return;
    }

    // Without --code: show the authorization URL (no server, no browser)
    const client = createClient(opts);
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = client.buildAuthorizationUrl(opts.redirect_uri, state);
    console.log(authUrl);
    return;
  }

  // ── Code provided directly ────────────────────────────────────────
  if (opts.code) {
    const client = createClient(opts);
    await client.exchangeAuthorizationCode(opts.code, opts.redirect_uri);
    console.log(`User token saved for grant_type ${opts.grant_type}`);
    return;
  }

  // ── Browser + callback flow ───────────────────────────────────────
  const client = createClient(opts);
  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = client.buildAuthorizationUrl(opts.redirect_uri, state);
  const callbackPath = extractCallbackPath(opts.redirect_uri);

  if (opts.no_browser) {
    // Print URL and prompt for code
    console.log('Open this URL in your browser to authorize:');
    console.log(authUrl);
    const code = await promptForCode(inputFunc);
    if (!code) {
      throw new core.PingCodeError('No authorization code provided');
    }
    await client.exchangeAuthorizationCode(code, opts.redirect_uri);
    console.log(`User token saved for grant_type ${opts.grant_type}`);
    return;
  }

  // Try to open the browser; fall back to URL + prompt on failure
  let browserOpened = false;
  try {
    await openBrowser(authUrl);
    browserOpened = true;
  } catch (_) {
    // Browser spawn failed; fall back to printing the URL
    console.log('Could not open browser automatically.');
    console.log('Open this URL in your browser to authorize:');
    console.log(authUrl);
    const code = await promptForCode(inputFunc);
    if (!code) {
      throw new core.PingCodeError('No authorization code provided');
    }
    await client.exchangeAuthorizationCode(code, opts.redirect_uri);
    console.log(`User token saved for grant_type ${opts.grant_type}`);
    return;
  }

  if (browserOpened) {
    // Start callback server and wait for the redirect
    const result = await core.startAuthCallbackServer({
      port: opts.port,
      path: callbackPath,
      state: state,
    });
    await client.exchangeAuthorizationCode(result.code, opts.redirect_uri);
    console.log(`User token saved for grant_type ${opts.grant_type}`);
  }
}

// ── Register ───────────────────────────────────────────────────────────

shared.registerModule('login', {
  name: 'login',
  description: 'Authenticate with your PingCode user account',
  run,
});

module.exports = { run, printHelp, parseLoginArgs, createClient, buildDryRunExchange };
