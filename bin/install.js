#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const skillName = process.env.PINGCODE_SKILL_NAME || "pingcode";
const aliasName = "pingcode-ctx";
const sourceEntries = [
  "SKILL.md",
  "README.md",
  "agents",
  "references",
  "scripts",
];
const aliasSkillEntries = ["skills/pingcode-ctx/SKILL.md"];

const AGENT_KEYS = ["codex", "claude", "openclaw", "hermes"];

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
    claude: {
      label: "Claude Code",
      agentHome: path.join(home, ".claude"),
      skillsRoot: path.join(home, ".claude", "skills"),
    },
    openclaw: {
      label: "OpenClaw",
      agentHome: path.join(home, ".openclaw"),
      skillsRoot: path.join(home, ".openclaw", "skills"),
    },
    hermes: {
      label: "Hermes",
      agentHome: path.join(home, ".hermes"),
      skillsRoot: path.join(home, ".hermes", "skills", "project-management"),
    },
  };
}

function usage() {
  return [
    "Usage: npx pingcode-skill [--force] [--target <dir>]",
    "                          [--codex-only|--claude-only|--openclaw-only|--hermes-only]",
    "",
    "Default behavior installs the PingCode skill and pingcode-ctx alias",
    "only into supported agent homes that already exist for the current user:",
    "  Codex:     ~/.codex/skills/pingcode (and pingcode-ctx)",
    "  Claude:    ~/.claude/skills/pingcode (and pingcode-ctx)",
    "  OpenClaw:  ~/.openclaw/skills/pingcode (and pingcode-ctx)",
    "  Hermes:    ~/.hermes/skills/project-management/pingcode (and pingcode-ctx)",
    "",
    "Options:",
    "  --force            Overwrite existing installs in every selected root",
    "  --target DIR       Install only into DIR (skips the multi-root flow)",
    "  --codex-only       Install only into the Codex skills root",
    "  --claude-only      Install only into the Claude Code skills root",
    "  --openclaw-only    Install only into the OpenClaw skills root",
    "  --hermes-only      Install only into the Hermes project-management root",
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
  };
  const onlyFlags = {
    "--codex-only": "codex",
    "--claude-only": "claude",
    "--openclaw-only": "openclaw",
    "--hermes-only": "hermes",
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
    } else if (Object.prototype.hasOwnProperty.call(onlyFlags, arg)) {
      if (options.only && options.only !== onlyFlags[arg]) {
        throw new Error(
          "Only one of --codex-only / --claude-only / --openclaw-only / --hermes-only may be set",
        );
      }
      options.only = onlyFlags[arg];
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (options.target && options.only) {
    throw new Error("--target cannot be combined with --codex-only / --claude-only / --openclaw-only / --hermes-only");
  }
  return options;
}

function copyEntry(name, destinationRoot) {
  const source = path.join(packageRoot, name);
  const sourceStat = fs.statSync(source);
  const destination = sourceStat.isDirectory()
    ? path.join(destinationRoot, name)
    : path.join(destinationRoot, path.dirname(name), path.basename(name));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, {
    recursive: true,
    errorOnExist: false,
    force: true,
  });
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_/:=.,+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function rewriteInstalledDocs(destinationRoot) {
  const cliCommand = `node ${shellQuote(path.join(destinationRoot, "scripts", "pingcode.js"))}`;
  const ctxCommand = `${cliCommand} context init`;
  const docs = [
    path.join(destinationRoot, "SKILL.md"),
    path.join(destinationRoot, "README.md"),
    path.join(destinationRoot, "references", "workflows.md"),
  ];

  for (const file of docs) {
    if (!fs.existsSync(file)) {
      continue;
    }
    const original = fs.readFileSync(file, "utf8");
    const rewritten = original
      .replaceAll("python3 scripts/pingcode_ctx.py", ctxCommand)
      .replaceAll("python3 scripts/pingcode.py", cliCommand)
      .replaceAll("node scripts/pingcode-ctx.js", ctxCommand)
      .replaceAll("node scripts/pingcode.js", cliCommand);
    if (rewritten !== original) {
      fs.writeFileSync(file, rewritten);
    }
  }
}

function installAliasSkill(destinationRoot) {
  const aliasRoot = path.join(path.dirname(destinationRoot), aliasName);
  fs.rmSync(aliasRoot, { recursive: true, force: true });
  fs.mkdirSync(aliasRoot, { recursive: true });
  for (const entry of aliasSkillEntries) {
    const source = path.join(packageRoot, entry);
    const destination = path.join(aliasRoot, path.basename(entry));
    fs.copyFileSync(source, destination);
  }
  const cliCommand = `node ${shellQuote(path.join(destinationRoot, "scripts", "pingcode.js"))}`;
  const ctxCommand = `${cliCommand} context init`;
  const skillDoc = path.join(aliasRoot, "SKILL.md");
  const original = fs.readFileSync(skillDoc, "utf8");
  fs.writeFileSync(
    skillDoc,
    original
      .replaceAll("python3 scripts/pingcode_ctx.py", ctxCommand)
      .replaceAll("python3 scripts/pingcode.py", cliCommand)
      .replaceAll("node scripts/pingcode-ctx.js", ctxCommand)
      .replaceAll("node scripts/pingcode.js", cliCommand),
  );
  return aliasRoot;
}

function installToTarget(targetDir, options) {
  if (fs.existsSync(targetDir) && !options.force) {
    const error = new Error(
      `PingCode skill already exists at ${targetDir}. Re-run with --force to overwrite it.`,
    );
    error.code = "EEXIST_TARGET";
    throw error;
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of sourceEntries) {
    copyEntry(entry, targetDir);
  }
  rewriteInstalledDocs(targetDir);
  const aliasTarget = installAliasSkill(targetDir);
  return { mainTarget: targetDir, aliasTarget };
}

function printCredentialGuidance() {
  console.log("");
  console.log("Configure PingCode credentials before use:");
  console.log('  export PINGCODE_CLIENT_ID="..."');
  console.log('  export PINGCODE_CLIENT_SECRET="..."');
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
    const mainTarget = path.join(root.skillsRoot, skillName);
    try {
      const result = installToTarget(mainTarget, options);
      successes.push({
        key,
        label: root.label,
        mainTarget: result.mainTarget,
        aliasTarget: result.aliasTarget,
      });
    } catch (error) {
      failures.push({
        key,
        label: root.label,
        target: mainTarget,
        message: error.message,
      });
    }
  }

  console.log("Install summary:");
  for (const item of successes) {
    console.log(`  [ok]   ${item.label}: ${item.mainTarget}`);
    console.log(`         ${item.label} (pingcode-ctx): ${item.aliasTarget}`);
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
    console.log(`Installed PingCode skill to ${result.mainTarget}`);
    console.log(`Installed PingCode context skill to ${result.aliasTarget}`);
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (options.target) {
    return runSingleTargetInstall(options);
  }
  return runMultiRootInstall(options);
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`error: ${error.message}`);
  console.error("");
  console.error(usage());
  process.exitCode = 1;
}
