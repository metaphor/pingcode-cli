'use strict';

// ── Doctor: cross-platform diagnostic reports for any command ─────────
// `pingcode <module> ... --doctor` runs the command normally while a
// DoctorSession records environment, system parameters, HTTP traffic,
// command output and errors, then writes a sanitized JSON report that
// can be shared for troubleshooting (secrets are redacted on capture).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dns = require('node:dns');
const { spawnSync } = require('node:child_process');

const core = require('./core');

const REPORT_SCHEMA = 'pingcode-doctor/1';
const MAX_EVENTS = 2000;
const MAX_ERRORS = 50;
const MAX_OUTPUT_CHARS = 200000;
const NETWORK_TIMEOUT_MS = 8000;
const CLOCK_SKEW_WARN_SECONDS = 120;

// Query parameter names whose values must never appear in a report.
const SECRET_QUERY_KEYS = [
  'client_secret', 'client_assertion', 'access_token', 'refresh_token',
  'token', 'code', 'password', 'assertion',
];
// Matches "key=value" pairs anywhere: URLs (?k=), free text ( k=), and
// start-of-string. The boundary character is kept via $1.
const SECRET_TEXT_RE = new RegExp(
  `((?:^|[\\s"'&?(])(?:${SECRET_QUERY_KEYS.join('|')})=)[^&\\s"']+`,
  'gi',
);
// CLI flags whose values must never appear in a report.
const SECRET_ARG_FLAGS = new Set(['--client-secret', '--token']);
// CLI flags whose values are identifiers: mask partially (first/last 4).
const PARTIAL_ARG_FLAGS = new Set(['--client-id']);
const SECRET_ENV_KEYS = new Set(['PINGCODE_CLIENT_SECRET', 'PINGCODE_ACCESS_TOKEN']);
const PARTIAL_ENV_KEYS = new Set(['PINGCODE_CLIENT_ID']);

// Whitelist: only these environment variables are recorded. Anything not
// listed never reaches the report, which keeps the privacy surface small.
const REPORT_ENV_KEYS = [
  'PATH', 'LANG', 'LANGUAGE', 'LC_ALL', 'LC_CTYPE', 'TZ',
  'TERM', 'TERM_PROGRAM', 'SHELL', 'HOME',
  'NODE_OPTIONS', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'ALL_PROXY',
  'http_proxy', 'https_proxy', 'no_proxy', 'all_proxy',
  'npm_config_registry', 'npm_config_proxy', 'npm_config_https_proxy',
  'USERPROFILE', 'APPDATA', 'ComSpec',
  'PINGCODE_BASE_URL', 'PINGCODE_CLIENT_ID', 'PINGCODE_CLIENT_SECRET',
  'PINGCODE_ACCESS_TOKEN', 'PINGCODE_TOKEN_CACHE',
  'PINGCODE_WORKSPACE_CACHE', 'PINGCODE_USER_ID', 'PINGCODE_USER_NAME',
];

// ── Flag extraction (dispatcher level) ────────────────────────────────

// Pull --doctor / --doctor-output out of the token list so that every
// module sees the exact argv it would see without them.
function extractDoctorOptions(tokens) {
  const remaining = [];
  let enabled = false;
  let outputPath = null;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--doctor') {
      enabled = true;
      continue;
    }
    if (arg === '--doctor-output') {
      const value = tokens[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error('--doctor-output requires a file path argument');
      }
      outputPath = value;
      enabled = true;
      i += 1;
      continue;
    }
    if (arg.startsWith('--doctor-output=')) {
      outputPath = arg.slice('--doctor-output='.length);
      if (!outputPath) {
        throw new Error('--doctor-output requires a file path argument');
      }
      enabled = true;
      continue;
    }
    remaining.push(arg);
  }
  return { enabled, outputPath, tokens: remaining };
}

// ── Secret masking ─────────────────────────────────────────────────────

function partialMask(value) {
  const s = String(value);
  if (s.length <= 8) return `[MASKED:len=${s.length}]`;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function maskUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return rawUrl;
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (SECRET_QUERY_KEYS.includes(lower)) {
        url.searchParams.set(key, '[REDACTED]');
      } else if (lower === 'client_id') {
        url.searchParams.set(key, partialMask(url.searchParams.get(key)));
      }
    }
    if (url.username) url.username = '[REDACTED]';
    if (url.password) url.password = '[REDACTED]';
    return url.toString();
  } catch (exc) {
    // Not a parseable URL: regex-strip secret-looking query values.
    return rawUrl.replace(SECRET_TEXT_RE, '$1[REDACTED]');
  }
}

function maskText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(SECRET_TEXT_RE, '$1[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED]');
}

function maskArgv(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg.startsWith('--') && arg.includes('=')) {
      const eq = arg.indexOf('=');
      const flag = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (SECRET_ARG_FLAGS.has(flag)) {
        out.push(`${flag}=[REDACTED:len=${value.length}]`);
      } else if (PARTIAL_ARG_FLAGS.has(flag)) {
        out.push(`${flag}=${partialMask(value)}`);
      } else {
        out.push(arg);
      }
      continue;
    }
    if (SECRET_ARG_FLAGS.has(arg) || PARTIAL_ARG_FLAGS.has(arg)) {
      out.push(arg);
      const value = tokens[i + 1];
      if (value !== undefined && !value.startsWith('--')) {
        out.push(SECRET_ARG_FLAGS.has(arg) ? `[REDACTED:len=${value.length}]` : partialMask(value));
        i += 1;
      }
      continue;
    }
    out.push(arg);
  }
  return out;
}

function maskProxyValue(value) {
  try {
    const url = new URL(value);
    if (url.password) url.password = '[REDACTED]';
    if (url.username) url.username = '[REDACTED]';
    return url.toString();
  } catch (exc) {
    return value;
  }
}

function maskEnvValue(key, value) {
  if (SECRET_ENV_KEYS.has(key)) return `set(len=${value.length})`;
  if (PARTIAL_ENV_KEYS.has(key)) return partialMask(value);
  if (/proxy$/i.test(key)) return maskProxyValue(value);
  return value;
}

// ── Environment collectors (pure, testable) ────────────────────────────

function cliVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
  } catch (exc) {
    return null;
  }
}

function requiredNodeMajor() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const m = /(\d+)/.exec((pkg.engines && pkg.engines.node) || '');
    return m ? parseInt(m[1], 10) : 18;
  } catch (exc) {
    return 18;
  }
}

function collectRuntime() {
  const v = process.versions;
  return {
    node: process.version,
    node_versions: { v8: v.v8, uv: v.uv, zlib: v.zlib, openssl: v.openssl, modules: v.modules },
    executable: process.execPath,
    exec_argv: process.execArgv,
    arch: process.arch,
    platform: process.platform,
    pid: process.pid,
    ppid: process.ppid,
    cwd: process.cwd(),
  };
}

function collectSystem() {
  const cpus = os.cpus();
  return {
    type: os.type(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpu_model: cpus.length ? cpus[0].model : null,
    cpu_count: cpus.length,
    total_mem_mb: Math.round(os.totalmem() / (1024 * 1024)),
    free_mem_mb: Math.round(os.freemem() / (1024 * 1024)),
    uptime_hours: Math.round(os.uptime() / 360) / 10,
  };
}

function windowsCodepage() {
  try {
    const res = spawnSync('chcp.com', [], {
      encoding: 'utf8',
      timeout: 5000,
      shell: true,
      windowsHide: true,
    });
    if (res.status !== 0) return null;
    const m = /(\d+)/.exec(res.stdout || '');
    return m ? parseInt(m[1], 10) : null;
  } catch (exc) {
    return null;
  }
}

function collectLocale() {
  const locale = {};
  for (const key of ['LANG', 'LANGUAGE', 'LC_ALL', 'LC_CTYPE', 'TZ', 'TERM']) {
    if (process.env[key] !== undefined) {
      locale[key.toLowerCase()] = process.env[key];
    }
  }
  try {
    locale.tz_name = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (exc) {
    locale.tz_name = null;
  }
  if (process.platform === 'win32') {
    locale.windows_codepage = windowsCodepage();
  }
  return locale;
}

function collectEnv() {
  const general = {};
  const pingcode = {};
  const proxy = {};
  const tls = {};
  for (const key of REPORT_ENV_KEYS) {
    const value = process.env[key];
    if (value === undefined) continue;
    const masked = maskEnvValue(key, value);
    if (key.startsWith('PINGCODE_')) {
      pingcode[key] = masked;
    } else if (/proxy$/i.test(key)) {
      proxy[key] = masked;
    } else if (key.includes('CA_CERTS') || key.includes('SSL_CERT')) {
      tls[key] = masked;
    } else {
      general[key] = masked;
    }
  }
  return { general, pingcode, proxy, tls };
}

function expandPath(value) {
  if (value && value.startsWith('~/')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function probeFs(target) {
  const info = {
    path: target,
    exists: false,
    type: null,
    size: null,
    mtime: null,
    readable: null,
    writable: null,
  };
  let stat = null;
  try {
    stat = fs.statSync(target);
    info.exists = true;
    info.type = stat.isDirectory() ? 'dir' : 'file';
    info.size = stat.isFile() ? stat.size : null;
    info.mtime = stat.mtime.toISOString();
  } catch (exc) {
    info.stat_error = exc.code || exc.message;
  }
  if (stat) {
    try {
      fs.accessSync(target, fs.constants.R_OK);
      info.readable = true;
    } catch (exc) {
      info.readable = false;
    }
    try {
      fs.accessSync(target, fs.constants.W_OK);
      info.writable = true;
    } catch (exc) {
      info.writable = false;
    }
  }
  return info;
}

// Metadata-only cache summaries. Token values are never read into the
// report: only shapes (grant_type, presence flags, expiry) are recorded.
function summarizeTokenCache(cachePath) {
  const info = probeFs(cachePath);
  if (info.exists && info.type === 'file') {
    try {
      const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      info.grant_type = payload.grant_type || 'client_credentials';
      info.has_access_token = typeof payload.access_token === 'string' && payload.access_token.length > 0;
      info.has_refresh_token = typeof payload.refresh_token === 'string' && payload.refresh_token.length > 0;
      if (typeof payload.expires_at === 'number') {
        info.expires_at = payload.expires_at;
        info.expired = payload.expires_at <= Math.floor(Date.now() / 1000);
      }
    } catch (exc) {
      info.parse_error = exc.message;
    }
  }
  return info;
}

function summarizeWorkspaceCache(cachePath) {
  const info = probeFs(cachePath);
  if (info.exists && info.type === 'file') {
    try {
      const payload = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      info.preferences_keys = payload && payload.preferences && typeof payload.preferences === 'object'
        ? Object.keys(payload.preferences)
        : [];
      info.sections = Object.keys(payload || {}).filter((k) => k !== 'preferences');
    } catch (exc) {
      info.parse_error = exc.message;
    }
  }
  return info;
}

function collectPaths() {
  return {
    cwd: process.cwd(),
    home: os.homedir(),
    tmpdir: os.tmpdir(),
    token_cache: summarizeTokenCache(
      expandPath(process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE),
    ),
    workspace_cache: summarizeWorkspaceCache(
      core.resolveWorkspaceCachePath(process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE),
    ),
  };
}

// ── Health checks ──────────────────────────────────────────────────────

function writeFileProbe(dir, basename) {
  const probe = path.join(dir, basename);
  fs.writeFileSync(probe, 'ok');
  try {
    fs.unlinkSync(probe);
  } catch (exc) {
    // unlink failure is reported by the caller's next assertion, ignore here
  }
}

async function runChecks({ baseUrl, network }) {
  const checks = [];
  const add = (id, status, detail) => checks.push({ id, status, detail });

  const major = parseInt(process.version.slice(1).split('.')[0], 10);
  const required = requiredNodeMajor();
  add('node_version', major >= required ? 'pass' : 'fail',
    `Node ${process.version}, requires >=${required}`);

  try {
    const res = spawnSync(process.execPath, ['--version'], {
      encoding: 'utf8', timeout: 10000, windowsHide: true,
    });
    const ok = res.status === 0 && (res.stdout || '').startsWith('v');
    add('spawn_node', ok ? 'pass' : 'fail',
      res.error ? `spawn failed: ${res.error.message}` : `${process.execPath} -> ${(res.stdout || '').trim()}`);
  } catch (exc) {
    add('spawn_node', 'fail', exc.message);
  }

  const tokenCache = summarizeTokenCache(
    expandPath(process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE),
  );
  if (!tokenCache.exists) {
    add('token_cache', 'warn', `token cache not found at ${tokenCache.path} (run auth login)`);
  } else if (tokenCache.parse_error) {
    add('token_cache', 'fail', `invalid JSON at ${tokenCache.path}: ${tokenCache.parse_error}`);
  } else if (tokenCache.expired) {
    add('token_cache', 'warn', `token expired at ${new Date(tokenCache.expires_at * 1000).toISOString()}`);
  } else {
    add('token_cache', 'pass',
      `grant_type=${tokenCache.grant_type} has_refresh=${!!tokenCache.has_refresh_token}`);
  }

  const workspaceCache = summarizeWorkspaceCache(
    core.resolveWorkspaceCachePath(process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE),
  );
  if (!workspaceCache.exists) {
    add('workspace_cache', 'warn', `workspace cache not found at ${workspaceCache.path} (run context init)`);
  } else if (workspaceCache.parse_error) {
    add('workspace_cache', 'fail', `invalid JSON at ${workspaceCache.path}: ${workspaceCache.parse_error}`);
  } else {
    add('workspace_cache', 'pass', `preferences: ${workspaceCache.preferences_keys.join(', ') || 'none'}`);
  }

  try {
    writeFileProbe(os.tmpdir(), `pingcode-doctor-${Date.now()}-${process.pid}.tmp`);
    add('tmp_writable', 'pass', os.tmpdir());
    try {
      writeFileProbe(os.tmpdir(), `pingcode-doctor-中文-${Date.now()}-${process.pid}.tmp`);
      add('unicode_fs', 'pass', 'non-ASCII filename round-trip ok');
    } catch (exc) {
      add('unicode_fs', process.platform === 'win32' ? 'warn' : 'fail', exc.message);
    }
  } catch (exc) {
    add('tmp_writable', 'fail', `${os.tmpdir()}: ${exc.message}`);
    add('unicode_fs', 'skip', 'tmpdir not writable');
  }

  try {
    writeFileProbe(process.cwd(), `pingcode-doctor-cwd-${Date.now()}-${process.pid}.tmp`);
    add('cwd_writable', 'pass', process.cwd());
  } catch (exc) {
    add('cwd_writable', 'warn', `${process.cwd()}: ${exc.message}`);
  }

  if (process.platform === 'win32') {
    const codepage = collectLocale().windows_codepage;
    if (codepage === 65001) {
      add('windows_codepage', 'pass', 'UTF-8 (65001)');
    } else if (codepage === null) {
      add('windows_codepage', 'warn', 'could not determine console codepage');
    } else {
      add('windows_codepage', 'warn',
        `codepage ${codepage} is not UTF-8; non-ASCII output may be garbled (run chcp 65001)`);
    }
  }

  if (!network) {
    add('dns', 'skip', 'network probes disabled');
    add('api_reachable', 'skip', 'network probes disabled');
  } else {
    const host = new URL(baseUrl).hostname;
    const dnsStart = Date.now();
    try {
      const res = await dns.promises.lookup(host, { all: true });
      add('dns', 'pass',
        `${host} -> ${res.map((r) => r.address).join(', ')} (${Date.now() - dnsStart}ms)`);
    } catch (exc) {
      add('dns', 'fail', `${host}: ${exc.message}`);
    }

    const start = Date.now();
    try {
      const res = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'pingcode-cli-doctor' },
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
      });
      const ms = Date.now() - start;
      add('api_reachable', res.status < 500 ? 'pass' : 'warn',
        `GET ${baseUrl} -> HTTP ${res.status} (${ms}ms)`);
      const serverDate = res.headers.get('date');
      if (serverDate) {
        const skew = Math.abs(Date.now() - new Date(serverDate).getTime()) / 1000;
        add('clock_skew', skew > CLOCK_SKEW_WARN_SECONDS ? 'warn' : 'pass',
          `server-local clock skew ~${Math.round(skew)}s`);
      }
      try { await res.arrayBuffer(); } catch (exc) { /* body read is best effort */ }
    } catch (exc) {
      const code = exc && exc.cause && exc.cause.code ? `${exc.cause.code} ` : '';
      add('api_reachable', 'fail', `${baseUrl}: ${code}${exc.message}`);
    }
  }

  return checks;
}

// ── Report assembly ────────────────────────────────────────────────────

function summarizeEvents(events) {
  const summary = { requests: 0, responses: 0, errors: 0, workspace_cache_hits: 0 };
  for (const event of events) {
    if (event.type === 'http_request') summary.requests += 1;
    else if (event.type === 'http_response') summary.responses += 1;
    else if (event.type === 'http_error') summary.errors += 1;
    else if (event.type === 'workspace_cache_hit') summary.workspace_cache_hits += 1;
  }
  return summary;
}

function timestampStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function resolveReportPath(outputPath) {
  if (!outputPath) {
    return path.join(process.cwd(), `pingcode-doctor-${timestampStamp(new Date())}.json`);
  }
  const expanded = expandPath(outputPath);
  if (fs.existsSync(expanded) && fs.statSync(expanded).isDirectory()) {
    return path.join(expanded, `pingcode-doctor-${timestampStamp(new Date())}.json`);
  }
  return expanded;
}

function writeReport(report, outputPath) {
  const target = resolveReportPath(outputPath);
  try {
    fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
    return target;
  } catch (exc) {
    const fallback = path.join(os.tmpdir(), path.basename(target));
    fs.writeFileSync(fallback, JSON.stringify(report, null, 2) + '\n');
    console.error(`[doctor] could not write report to ${target} (${exc.message}); wrote to ${fallback} instead`);
    return fallback;
  }
}

function printSummary(report, reportPath) {
  const counts = { pass: 0, warn: 0, fail: 0, skip: 0 };
  for (const c of report.checks) {
    counts[c.status] = (counts[c.status] || 0) + 1;
  }
  const cmd = report.command;
  const cmdLabel = cmd ? `command '${cmd.module}'` : 'environment check';
  console.error(`[doctor] ${cmdLabel}: exit=${cmd ? cmd.exit_code : 0} verdict=${report.verdict}`);
  for (const c of report.checks) {
    if (c.status === 'warn' || c.status === 'fail') {
      console.error(`[doctor]   ${c.status.toUpperCase()} ${c.id}: ${c.detail}`);
    }
  }
  console.error(
    `[doctor] checks: ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail, ` +
    `${counts.skip} skip; http: ${report.http_summary.requests} requests, ` +
    `${report.http_summary.errors} errors`,
  );
  console.error(`[doctor] report: ${reportPath}`);
}

// Flush pending stdout/stderr bytes so process.exit cannot truncate the
// doctor summary or the command's own tail output (pipes are async).
function flushStreams() {
  return Promise.all([
    new Promise((resolve) => process.stdout.write('', () => resolve())),
    new Promise((resolve) => process.stderr.write('', () => resolve())),
  ]);
}

// ── Session ────────────────────────────────────────────────────────────

class DoctorSession {
  constructor({ argv = null, outputPath = null, network = null } = {}) {
    this.argv = maskArgv(argv !== null && argv !== undefined ? argv : process.argv.slice(2));
    this.outputPath = outputPath;
    const envSetting = process.env.PINGCODE_DOCTOR_NETWORK;
    this.network = network !== null && network !== undefined
      ? !!network
      : !(envSetting === '0' || envSetting === 'false');
    this.baseUrl = (process.env.PINGCODE_BASE_URL || core.DEFAULT_BASE_URL).replace(/\/$/, '');
    this.events = [];
    this.eventsTruncated = false;
    this.errors = [];
    this.output = { stdout: '', stderr: '', truncated: false };
    this.command = { module: null, args: [], started_at: null, duration_ms: null, exit_code: null };
    this.startedAt = null;
    this.finishedAt = null;
    this.reportPath = null;
    this.captured = null;
  }

  start() {
    this.startedAt = Date.now();
  }

  // Sink for core.setDiagnosticSink. Masking happens on capture so that
  // secrets never rest in session state unmasked.
  recordEvent(event) {
    if (this.events.length >= MAX_EVENTS) {
      this.eventsTruncated = true;
      return;
    }
    const masked = { ts: new Date().toISOString(), ...event };
    if (typeof masked.url === 'string') masked.url = maskUrl(masked.url);
    if (typeof masked.error === 'string') masked.error = maskText(masked.error);
    this.events.push(masked);
  }

  recordError(exc, context = null) {
    if (this.errors.length >= MAX_ERRORS) return;
    const isError = exc instanceof Error;
    const entry = {
      ts: new Date().toISOString(),
      name: isError ? exc.name : 'Error',
      message: maskText(isError ? exc.message : String(exc)),
      stack: isError && exc.stack ? maskText(String(exc.stack)) : null,
    };
    if (context) entry.context = context;
    this.errors.push(entry);
  }

  setCommand(moduleName, tokens) {
    this.command.module = moduleName;
    this.command.args = maskArgv(tokens || []);
    this.command.started_at = new Date().toISOString();
  }

  // Tee every write to stdout/stderr into bounded buffers so the report
  // contains what the command actually printed. Content is untouched.
  captureStreams() {
    if (this.captured) return;
    const session = this;
    const originalOut = process.stdout.write.bind(process.stdout);
    const originalErr = process.stderr.write.bind(process.stderr);
    const tee = (channel, original) => function patched(chunk, ...rest) {
      session.appendOutput(channel, chunk);
      return original(chunk, ...rest);
    };
    process.stdout.write = tee('stdout', originalOut);
    process.stderr.write = tee('stderr', originalErr);
    this.captured = { originalOut, originalErr };
  }

  stopCapturing() {
    if (!this.captured) return;
    process.stdout.write = this.captured.originalOut;
    process.stderr.write = this.captured.originalErr;
    this.captured = null;
  }

  appendOutput(channel, chunk) {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    if (this.output[channel].length >= MAX_OUTPUT_CHARS) {
      this.output.truncated = true;
      return;
    }
    this.output[channel] += text;
    if (this.output[channel].length > MAX_OUTPUT_CHARS) {
      this.output[channel] = this.output[channel].slice(0, MAX_OUTPUT_CHARS);
      this.output.truncated = true;
    }
  }

  async finish({ exitCode = 0, error = null } = {}) {
    this.stopCapturing();
    this.finishedAt = Date.now();
    if (error) this.recordError(error, 'command');
    if (this.startedAt !== null) {
      this.command.duration_ms = this.finishedAt - this.startedAt;
    }
    this.command.exit_code = exitCode;

    const checks = await runChecks({ baseUrl: this.baseUrl, network: this.network });
    const hasFail = checks.some((c) => c.status === 'fail');
    const hasWarn = checks.some((c) => c.status === 'warn');
    const verdict = hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy';

    const report = {
      schema: REPORT_SCHEMA,
      generated_at: new Date().toISOString(),
      verdict,
      cli: {
        name: 'pingcode',
        version: cliVersion(),
        argv: this.argv,
        install_root: path.join(__dirname, '..'),
        pid: process.pid,
      },
      command: this.command.module === null ? null : this.command,
      runtime: collectRuntime(),
      system: collectSystem(),
      locale: collectLocale(),
      env: collectEnv(),
      paths: collectPaths(),
      checks,
      http_summary: summarizeEvents(this.events),
      events_truncated: this.eventsTruncated,
      events: this.events,
      output: {
        stdout: maskText(this.output.stdout),
        stderr: maskText(this.output.stderr),
        truncated: this.output.truncated,
      },
      errors: this.errors,
    };
    this.reportPath = writeReport(report, this.outputPath);
    printSummary(report, this.reportPath);
    return { path: this.reportPath, verdict };
  }
}

module.exports = {
  DoctorSession,
  extractDoctorOptions,
  maskUrl,
  maskText,
  maskArgv,
  maskEnvValue,
  collectEnv,
  collectRuntime,
  collectSystem,
  collectLocale,
  flushStreams,
  REPORT_SCHEMA,
};
