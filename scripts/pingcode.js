#!/usr/bin/env node
'use strict';

// ── Library layer ────────────────────────────────────────────────────
// Import everything from the shared core module and re-export it
// so that require('./pingcode') remains fully backward-compatible
// for the pingcode-ctx alias skill and existing tests.
const core = require('./core');

module.exports = { ...core };

// ── Module registry ──────────────────────────────────────────────────
// Import command modules so they self-register with the shared registry.
// (Side-effect imports; no circular dependency because these import from
// ./shared and ../core, never from ../pingcode.)
require('./commands/context');
require('./commands/work-item');
require('./commands/auth');

const shared = require('./commands/shared');

// ── Dispatcher ───────────────────────────────────────────────────────
function fatal(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function dispatcherMain(argv) {
  const tokens = argv || process.argv.slice(2);

  // (1) No args, or --help / -h as the first positional arg → help.
  if (tokens.length === 0 || tokens[0] === '--help' || tokens[0] === '-h') {
    shared.printModulesHelp();
    process.exit(0);
  }

  const firstArg = tokens[0];

  // (2) Recognised module name → dispatch to that module.
  const mod = shared.getModule(firstArg);
  if (mod) {
    try {
      await mod.run(tokens.slice(1));
      process.exit(0);
    } catch (exc) {
      fatal(exc.message);
    }
  }

  // (3) Unknown argument.
  fatal(`Unknown module: ${firstArg}`);
}

// ── Entry point ──────────────────────────────────────────────────────
if (require.main === module) {
  dispatcherMain().catch((exc) => {
    console.error(`error: ${exc.message}`);
    process.exitCode = 1;
  });
}
