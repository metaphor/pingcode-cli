'use strict';

// pingcode update — self-update the installed CLI from npm.
// Checks the registry (via `npm view`, so the user's configured registry is
// honored) and, when behind, upgrades the global install. Use `--check` to
// only report. The npm layer is injectable for tests.

const fs = require("node:fs");
const path = require("node:path");

const shared = require("./shared");
const install = require("./install");

const PACKAGE_NAME = shared.PACKAGE_NAME;
const defaultNpm = shared.defaultNpm;
const packageRoot = path.resolve(__dirname, "..", "..");

// ── Output colors ─────────────────────────────────────────────────────
// Green for "new version / updated", yellow for "already up to date".
// Colors collapse to plain text on non-TTY output or under NO_COLOR.

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";

function colorEnabled(stream = process.stdout) {
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  if (process.env.NO_COLOR) return false;
  return Boolean(stream.isTTY);
}

function colorize(text, code, enabled = colorEnabled()) {
  if (!enabled) return text;
  return `${code}${text}${RESET}`;
}

function defaultLocalVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  return pkg.version;
}

// Compare two dotted versions; returns -1 when a < b, 0 when equal, 1 when a > b.
// Prerelease suffixes (1.0.0-beta.1) sort below the corresponding release.
function compareVersions(a, b) {
  function parse(version) {
    const [main, pre = ""] = version.trim().split("-");
    const numbers = main.split(".").map((part) => parseInt(part, 10) || 0);
    while (numbers.length < 3) {
      numbers.push(0);
    }
    return { numbers, pre };
  }
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i += 1) {
    if (left.numbers[i] !== right.numbers[i]) {
      return left.numbers[i] < right.numbers[i] ? -1 : 1;
    }
  }
  if (left.pre === right.pre) {
    return 0;
  }
  if (left.pre && !right.pre) {
    return -1;
  }
  if (!left.pre && right.pre) {
    return 1;
  }
  return left.pre < right.pre ? -1 : 1;
}

function parseArgs(argv) {
  const options = { help: false, check: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--check" || arg === "-c") {
      options.check = true;
    } else {
      throw new Error(`Unknown option: ${arg}. Use pingcode update --help for usage.`);
    }
  }
  return options;
}

function usage() {
  return [
    "Usage: pingcode update [--check]",
    "",
    "Check npm for a newer release of the CLI and, when behind, upgrade the",
    "global install (`npm install -g @metaphorli/pingcode-cli@latest`). If",
    "the `pingcode` on PATH is the ~/.local/bin wrapper of an npx-run",
    "install, it is re-pointed at the fresh global install.",
    "",
    "Options:",
    "  --check, -c   Only report whether an update is available; do not install",
    "  -h, --help    Show this help",
    "",
    "After upgrading, refresh installed skill files with:",
    "  pingcode install --force",
  ].join("\n");
}

async function run(argv, deps = {}) {
  const options = parseArgs(argv || []);
  if (options.help) {
    console.log(usage());
    return 0;
  }

  const npm = deps.npm || defaultNpm;
  const localVersion = deps.localVersion || defaultLocalVersion;

  const current = localVersion();
  console.log(`Current version: ${current}`);

  const view = npm(["view", PACKAGE_NAME, "version"]);
  if (view.error || view.status !== 0) {
    const detail = view.error ? view.error.message : (view.stderr || "").trim();
    throw new Error(`Could not query npm for the latest version: ${detail}`);
  }
  const latest = view.stdout.trim().split("\n").pop().trim();

  if (compareVersions(latest, current) <= 0) {
    console.log(colorize(`✔ Already up to date`, YELLOW));
    return 0;
  }

  console.log(colorize(`New version available: ${latest}`, GREEN));

  if (options.check) {
    console.log(`Run \`pingcode update\` to install.`);
    return 0;
  }

  console.log("Updating...");
  const install = npm(["install", "-g", `${PACKAGE_NAME}@latest`], { stdio: "inherit" });
  if (install.error || install.status !== 0) {
    const detail = install.error ? install.error.message : `exit code ${install.status}`;
    throw new Error(
      `Global install failed (${detail}). Run it manually: npm install -g ${PACKAGE_NAME}@latest`,
    );
  }

  console.log(colorize(`✓ Updated to ${latest}`, GREEN));
  refreshGlobalWrapper(npm);
  console.log("Run `pingcode install --force` to refresh installed skill files.");
  return 0;
}

// ── PATH wrapper reconciliation ──────────────────────────────────────

// First `pingcode` executable on PATH — the one the shell actually runs.
function findWrapperOnPath() {
  if (process.platform === "win32") {
    return null; // no POSIX wrapper; `npm install -g` is the only install
  }
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    const candidate = path.join(dir, "pingcode");
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // absent — keep scanning
    }
  }
  return null;
}

// Extract the script path from the wrapper body written by install.js
// (`exec node <quoted-script> "$@"`); null for anything else, e.g. the
// npm global bin symlink or a hand-rolled script.
function wrapperTarget(wrapperPath) {
  let content;
  try {
    content = fs.readFileSync(wrapperPath, "utf8");
  } catch {
    return null;
  }
  const match = content.match(/^exec node (.+) "\$\@"/m);
  if (!match) {
    return null;
  }
  const quoted = match[1];
  if (quoted.startsWith("'") && quoted.endsWith("'")) {
    return quoted.slice(1, -1).replace(/'\\''/g, "'");
  }
  return quoted;
}

// After `npm install -g`, the `pingcode` on PATH may still execute a stale
// copy — historically the ~/.local/bin wrapper of an npx-run install, which
// pins the ephemeral npx cache. Re-point such wrappers at the fresh global
// install; any other unmanaged target only gets a note, never a rewrite.
function refreshGlobalWrapper(npm) {
  const wrapperPath = findWrapperOnPath();
  if (!wrapperPath) {
    return;
  }
  const current = wrapperTarget(wrapperPath);
  const rootOut = npm(["root", "-g"]);
  if (!current || rootOut.error || rootOut.status !== 0) {
    return;
  }
  const globalScript = path.join(
    (rootOut.stdout || "").trim(), "@metaphorli", "pingcode-cli", "scripts", "pingcode.js",
  );
  if (!fs.existsSync(globalScript) || current === globalScript) {
    return;
  }
  if (install.isNpxCachePath(current)) {
    install.installGlobalWrapper({ scriptPath: globalScript });
    console.log(`Re-pointed ${wrapperPath} at the global install (it pointed into the temporary npx cache).`);
  } else {
    console.log(`Note: ${wrapperPath} still runs ${current}, which \`npm install -g\` does not manage.`);
  }
}

// `pingcode -v` — print the running version, then best-effort check npm for
// the latest release. Network problems degrade to a stderr notice and never
// fail the command.
async function printVersionInfo(deps = {}) {
  const npm = deps.npm || defaultNpm;
  const localVersion = deps.localVersion || defaultLocalVersion;
  const current = localVersion();
  console.log(`pingcode-cli ${current}`);

  const view = npm(["view", PACKAGE_NAME, "version"]);
  if (view.error || view.status !== 0) {
    const detail = view.error ? view.error.message : (view.stderr || "").trim();
    console.error(`Could not check npm for the latest version: ${detail}`);
    return 0;
  }
  const latest = view.stdout.trim().split("\n").pop().trim();
  if (compareVersions(latest, current) <= 0) {
    console.log(`Latest on npm: ${latest} (up to date).`);
  } else {
    console.log(`Latest on npm: ${latest} — run \`pingcode update\` to upgrade.`);
  }
  return 0;
}

shared.registerModule("update", {
  name: "update",
  description: "Update the globally installed CLI from npm",
  run,
});

module.exports = {
  run, parseArgs, usage, compareVersions, printVersionInfo,
  findWrapperOnPath, wrapperTarget, refreshGlobalWrapper,
  colorize, colorEnabled, GREEN, YELLOW,
  PACKAGE_NAME,
};
