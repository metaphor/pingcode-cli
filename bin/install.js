#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { stdin, stdout } = require("node:process");

const packageRoot = path.resolve(__dirname, "..");
const SUB_SKILLS = [
  { name: "pingcode-ctx", entries: ["skills/pingcode-ctx/SKILL.md"] },
  { name: "pingcode-auth", entries: ["skills/pingcode-auth/SKILL.md"] },
  {
    name: "pingcode-workitem",
    entries: ["skills/pingcode-workitem/SKILL.md", "references"],
  },
];

const WRAPPER_PATH_BLOCK = "# pingcode-cli PATH";

const AGENT_KEYS = ["codex", "opencode"];

function defaultAgentRoots() {
  const home = os.homedir();
  const codexHome = process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(home, ".codex");
  return {
    codex: {
      label: "Codex",
      agentHome: codexHome,
      skillsRoot: path.join(codexHome, "skills"),
    },
    opencode: {
      label: "OpenCode",
      agentHome: path.join(home, ".config", "opencode"),
      skillsRoot: path.join(home, ".config", "opencode", "skills"),
    },
  };
}

function projectAgentRoots() {
  const cwd = process.cwd();
  return {
    codex: {
      label: "Codex",
      skillsRoot: path.join(cwd, ".codex", "skills"),
    },
    opencode: {
      label: "OpenCode",
      skillsRoot: path.join(cwd, ".opencode", "skills"),
    },
  };
}

function usage() {
  return [
    "Usage: npx pingcode-cli [--force] [--target <dir>]",
    "                        [--codex-only|--opencode-only]",
    "                        [--interactive|--non-interactive]",
    "",
    "Default behavior installs the PingCode skills",
    "pingcode-ctx, pingcode-auth, pingcode-workitem",
    "only into supported agent homes that already exist for the current user:",
    "  Codex:     ~/.codex/skills/{pingcode-ctx,pingcode-auth,pingcode-workitem}",
    "  OpenCode:  ~/.config/opencode/skills/{pingcode-ctx,pingcode-auth,pingcode-workitem}",
    "",
    "Project-level OpenCode install is supported via --target:",
    "  npx pingcode-cli --target \".opencode/skills\" --force",
    "",
    "Interactive install lets you choose global/project scope and agents:",
    "  npx pingcode-cli --interactive",
    "",
    "Non-interactive auto-install (useful for CI/scripts):",
    "  npx pingcode-cli --non-interactive",
    "",
    "Options:",
    "  --force            Overwrite existing installs in every selected root",
    "  --target DIR       Install only into DIR (skips the multi-root flow)",
    "  --codex-only       Install only into the Codex skills root",
    "  --opencode-only    Install only into the OpenCode skills root",
    "  --interactive      Prompt for install scope and agent selection",
    "  --non-interactive  Skip prompts and use the default auto-install behavior",
    "  -h, --help         Show this help",
    "",
    "CODEX_HOME overrides the Codex root only.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    force: false,
    target: null,
    only: null,
    help: false,
    interactive: false,
    nonInteractive: false,
  };
  const onlyFlags = {
    "--codex-only": "codex",
    "--opencode-only": "opencode",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--target") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--target requires a directory");
      }
      options.target = path.resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--interactive") {
      options.interactive = true;
    } else if (arg === "--non-interactive") {
      options.nonInteractive = true;
    } else if (Object.prototype.hasOwnProperty.call(onlyFlags, arg)) {
      if (options.only && options.only !== onlyFlags[arg]) {
        throw new Error(
          "Only one of --codex-only / --opencode-only may be set",
        );
      }
      options.only = onlyFlags[arg];
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (options.target && options.only) {
    throw new Error("--target cannot be combined with --codex-only / --opencode-only");
  }
  if (options.interactive && (options.target || options.only)) {
    throw new Error("--interactive cannot be combined with --target or --*-only flags");
  }
  if (options.interactive && options.nonInteractive) {
    throw new Error("--interactive and --non-interactive cannot be combined");
  }
  return options;
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_/:=.,+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function rewriteDocFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const cliCommand = "pingcode";
  const ctxCommand = "pingcode context init";
  const original = fs.readFileSync(filePath, "utf8");
  const rewritten = original
    // Defensive: absolute paths from historical installs
    .replace(/node\s+\S*\/scripts\/pingcode-ctx\.js/g, ctxCommand)
    .replace(/node\s+\S*\/scripts\/pingcode\.js/g, cliCommand)
    // Python3 legacy
    .replaceAll("python3 scripts/pingcode_ctx.py", ctxCommand)
    .replaceAll("python3 scripts/pingcode.py", cliCommand)
    // Literal node scripts references (relative paths)
    .replaceAll("node scripts/pingcode-ctx.js", ctxCommand)
    .replaceAll("node scripts/pingcode.js", cliCommand);
  if (rewritten !== original) {
    fs.writeFileSync(filePath, rewritten);
  }
}

function installSubSkill(parentDir, subSkill) {
  const target = path.join(parentDir, subSkill.name);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const entry of subSkill.entries) {
    const source = path.join(packageRoot, entry);
    const destination = path.join(target, path.basename(entry));
    fs.cpSync(source, destination, { recursive: true, force: true });
  }
  rewriteDocFile(path.join(target, "SKILL.md"));
  rewriteDocFile(path.join(target, "references", "workflows.md"));
  return target;
}

function installToTarget(targetDir, options) {
  const existing = SUB_SKILLS.map((sub) => path.join(targetDir, sub.name)).filter(
    (dir) => fs.existsSync(dir),
  );
  if (existing.length > 0 && !options.force) {
    const error = new Error(
      `PingCode skills already exist at ${existing[0]}. Re-run with --force to overwrite them.`,
    );
    error.code = "EEXIST_TARGET";
    throw error;
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const subTargets = SUB_SKILLS.map((sub) => ({
    name: sub.name,
    target: installSubSkill(targetDir, sub),
  }));

  installGlobalWrapper();
  return { target: targetDir, subTargets };
}

function printCredentialGuidance() {
  console.log("");
  console.log("Configure PingCode credentials before use:");
  console.log('  export PINGCODE_CLIENT_ID="..."');
  console.log('  export PINGCODE_CLIENT_SECRET="..."');
}

function installGlobalWrapper() {
  // On Windows, only print guidance — global wrapper via npm install -g
  if (process.platform === "win32") {
    console.log("");
    console.log("For a global pingcode command on Windows, run:");
    console.log("  npm install -g pingcode-cli");
    return;
  }

  const home = os.homedir();
  const binDir = path.join(home, ".local", "bin");
  const wrapperPath = path.join(binDir, "pingcode");
  const pingcodeScript = path.join(packageRoot, "scripts", "pingcode.js");

  // Create ~/.local/bin if it does not exist
  try {
    fs.mkdirSync(binDir, { recursive: true });
  } catch (err) {
    console.warn(`Could not create ${binDir}: ${err.message}`);
    console.warn("Skipping global pingcode wrapper.");
    return;
  }

  // Write the POSIX wrapper script
  const wrapperContent = [
    "#!/bin/sh",
    `exec node ${shellQuote(pingcodeScript)} "$@"`,
    "",
  ].join("\n");

  try {
    fs.writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 });
  } catch (err) {
    console.warn(`Could not write ${wrapperPath}: ${err.message}`);
    console.warn("Skipping global pingcode wrapper.");
    return;
  }

  console.log("");
  console.log(`Global wrapper installed: ${wrapperPath}`);

  // Append ~/.local/bin to existing shell profiles behind a guard comment
  const pathLine = 'export PATH="$HOME/.local/bin:$PATH"';
  const block = [
    WRAPPER_PATH_BLOCK,
    pathLine,
  ].join("\n");

  const profiles = [".bashrc", ".zshrc", ".bash_profile", ".zprofile"];
  let anyUpdated = false;

  for (const profile of profiles) {
    const profilePath = path.join(home, profile);
    if (!fs.existsSync(profilePath)) {
      continue;
    }
    try {
      const content = fs.readFileSync(profilePath, "utf8");
      if (content.includes(WRAPPER_PATH_BLOCK)) {
        // Already present, skip
        anyUpdated = true;
        continue;
      }
      const newContent = content.trimEnd() + "\n\n" + block + "\n";
      fs.writeFileSync(profilePath, newContent);
      console.log(`  Added ~/.local/bin to ${profile}`);
      anyUpdated = true;
    } catch (err) {
      console.warn(`  Could not update ${profile}: ${err.message}`);
    }
  }

  if (!anyUpdated) {
    console.log("");
    console.log("No writable shell profile found. Add this line to your shell profile manually:");
    console.log(`  ${pathLine}`);
  }
}

function existingAgentKeys(roots) {
  return AGENT_KEYS.filter((key) => fs.existsSync(roots[key].agentHome));
}

function runMultiRootInstall(options) {
  const roots = defaultAgentRoots();
  const keys = options.only ? [options.only] : existingAgentKeys(roots);
  const successes = [];
  const failures = [];
  const skipped = options.only
    ? []
    : AGENT_KEYS.filter((key) => !keys.includes(key)).map((key) => roots[key]);

  for (const key of keys) {
    const root = roots[key];
    const target = root.skillsRoot;
    try {
      const result = installToTarget(target, options);
      successes.push({
        key,
        label: root.label,
        target: result.target,
        subTargets: result.subTargets,
      });
    } catch (error) {
      failures.push({
        key,
        label: root.label,
        target,
        message: error.message,
      });
    }
  }

  console.log("Install summary:");
  for (const item of successes) {
    console.log(`  [ok]   ${item.label}: ${item.target}`);
    for (const sub of item.subTargets) {
      console.log(`         ${item.label} (${sub.name}): ${sub.target}`);
    }
  }
  for (const item of skipped) {
    console.log(`  [skip] ${item.label}: ${item.agentHome} does not exist`);
  }
  for (const item of failures) {
    console.error(`  [fail] ${item.label}: ${item.target}`);
    console.error(`         ${item.message}`);
  }

  if (successes.length > 0) {
    printCredentialGuidance();
  }

  if (keys.length === 0) {
    console.log("");
    console.log("No supported agent directories were found for the current user.");
    console.log("Create an agent home first, or use --target DIR to install to a custom location.");
    return 0;
  }
  if (failures.length === 0) {
    return 0;
  }
  if (successes.length === 0) {
    return 1;
  }
  // Partial success: surface a non-zero exit so CI / agents can detect it.
  return 2;
}

function runSingleTargetInstall(options) {
  const target = options.target;
  try {
    const result = installToTarget(target, options);
    console.log(`Installed PingCode skills to ${result.target}`);
    for (const sub of result.subTargets) {
      console.log(`Installed ${sub.name} skill to ${sub.target}`);
    }
    printCredentialGuidance();
    return 0;
  } catch (error) {
    if (error.code === "EEXIST_TARGET") {
      console.error(error.message);
      return 1;
    }
    throw error;
  }
}

function agentRootsForScope(scope) {
  if (scope === "project") {
    return projectAgentRoots();
  }
  return defaultAgentRoots();
}

function buildTargets(scope, keys) {
  const roots = agentRootsForScope(scope);
  return keys.map((key) => ({
    key,
    label: roots[key].label,
    target: roots[key].skillsRoot,
  }));
}

function printInteractiveSummary(successes, failures, scope) {
  console.log("");
  console.log(`Install summary (${scope}):`);
  for (const item of successes) {
    console.log(`  [ok]   ${item.label}: ${item.target}`);
    for (const sub of item.subTargets) {
      console.log(`         ${item.label} (${sub.name}): ${sub.target}`);
    }
  }
  for (const item of failures) {
    console.error(`  [fail] ${item.label}: ${item.target}`);
    console.error(`         ${item.message}`);
  }
  if (successes.length > 0) {
    printCredentialGuidance();
  }
}

function runInteractiveInstall(options) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  return new Promise((resolve, reject) => {
    let scope = null;
    let selectedKeys = null;

    function finish(error, code) {
      rl.close();
      if (error) {
        reject(error);
      } else {
        resolve(code);
      }
    }

    function doInstall() {
      try {
        const targets = buildTargets(scope, selectedKeys);
        const successes = [];
        const failures = [];

        console.log("");
        console.log("Installing...");
        for (const target of targets) {
          try {
            const result = installToTarget(target.target, options);
            successes.push({ ...target, subTargets: result.subTargets });
          } catch (err) {
            failures.push({ ...target, message: err.message });
          }
        }

        printInteractiveSummary(successes, failures, scope);

        if (successes.length === 0) {
          finish(null, 1);
        } else if (failures.length === 0) {
          finish(null, 0);
        } else {
          finish(null, 2);
        }
      } catch (err) {
        finish(err);
      }
    }

    function askAgents() {
      const roots = defaultAgentRoots();
      console.log("");
      console.log("Select agents to install (comma-separated numbers, default: all):");
      AGENT_KEYS.forEach((key, index) => {
        console.log(`  ${index + 1}) ${roots[key].label}`);
      });
      rl.question(`Enter choices (1-${AGENT_KEYS.length}): `, (answer) => {
        const trimmed = answer.trim();
        if (!trimmed) {
          selectedKeys = [...AGENT_KEYS];
          doInstall();
          return;
        }
        const selected = new Set();
        for (const part of trimmed.split(",")) {
          const num = parseInt(part.trim(), 10);
          if (Number.isNaN(num) || num < 1 || num > AGENT_KEYS.length) {
            continue;
          }
          selected.add(AGENT_KEYS[num - 1]);
        }
        if (selected.size === 0) {
          finish(new Error("No valid agents selected"));
          return;
        }
        selectedKeys = [...selected];
        doInstall();
      });
    }

    function askScope() {
      console.log("");
      console.log("Select install scope:");
      console.log("  1) Global      - install under home directory (e.g. ~/.config/opencode/skills)");
      console.log("  2) Project-level - install under current directory (e.g. ./.opencode/skills)");
      rl.question("Enter choice (1-2, default: 1): ", (answer) => {
        const trimmed = answer.trim();
        if (!trimmed || trimmed === "1") {
          scope = "global";
        } else if (trimmed === "2") {
          scope = "project";
        } else {
          finish(new Error(`Invalid scope choice: ${trimmed}`));
          return;
        }
        askAgents();
      });
    }

    askScope();
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return 0;
  }
  let code;
  if (options.interactive) {
    code = await runInteractiveInstall(options);
  } else if (options.target || options.only || options.nonInteractive) {
    if (options.target) {
      code = runSingleTargetInstall(options);
    } else {
      code = runMultiRootInstall(options);
    }
  } else if (process.stdin.isTTY) {
    code = await runInteractiveInstall(options);
  } else {
    code = runMultiRootInstall(options);
  }
  installGlobalWrapper();
  return code;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`error: ${error.message}`);
  console.error("");
  console.error(usage());
  process.exitCode = 1;
});
