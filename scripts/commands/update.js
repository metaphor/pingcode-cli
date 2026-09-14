'use strict';

// pingcode update — self-update the installed CLI from npm.
// Checks the registry (via `npm view`, so the user's configured registry is
// honored) and, when behind, upgrades the global install. Use `--check` to
// only report. The npm layer is injectable for tests.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const shared = require("./shared");

const PACKAGE_NAME = "@metaphorli/pingcode-cli";
const packageRoot = path.resolve(__dirname, "..", "..");

function defaultLocalVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  return pkg.version;
}

function defaultNpm(args, options = {}) {
  return spawnSync("npm", args, {
    encoding: "utf8",
    // Windows resolves npm via npm.cmd, which needs a shell.
    shell: process.platform === "win32",
    ...options,
  });
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
    "global install (`npm install -g @metaphorli/pingcode-cli@latest`).",
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
  console.log(`pingcode CLI ${current} — checking npm for updates...`);

  const view = npm(["view", PACKAGE_NAME, "version"]);
  if (view.error || view.status !== 0) {
    const detail = view.error ? view.error.message : (view.stderr || "").trim();
    throw new Error(`Could not query npm for the latest version: ${detail}`);
  }
  const latest = view.stdout.trim().split("\n").pop().trim();

  if (compareVersions(latest, current) <= 0) {
    console.log(`Already up to date (latest on npm: ${latest}).`);
    return 0;
  }

  if (options.check) {
    console.log(`Update available: ${current} → ${latest}. Run \`pingcode update\` to install.`);
    return 0;
  }

  console.log(`Updating ${current} → ${latest} via npm install -g ${PACKAGE_NAME}@latest ...`);
  const install = npm(["install", "-g", `${PACKAGE_NAME}@latest`], { stdio: "inherit" });
  if (install.error || install.status !== 0) {
    const detail = install.error ? install.error.message : `exit code ${install.status}`;
    throw new Error(
      `Global install failed (${detail}). Run it manually: npm install -g ${PACKAGE_NAME}@latest`,
    );
  }

  console.log(`Updated to ${latest}.`);
  console.log("Run `pingcode install --force` to refresh installed skill files.");
  return 0;
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
  PACKAGE_NAME,
};
