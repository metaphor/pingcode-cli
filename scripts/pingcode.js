#!/usr/bin/env node
'use strict';

// ── Library layer ────────────────────────────────────────────────────
// Import everything from the shared core module and re-export it
// so that require('./pingcode') remains fully backward-compatible
// for scripts/pingcode-ctx.js and existing tests.
const core = require('./core');

module.exports = { ...core };

// ── Module registry ──────────────────────────────────────────────────
// Import command modules so they self-register with the shared registry.
// (Side-effect imports; no circular dependency because these import from
// ./shared and ../core, never from ../pingcode.)
require('./commands/config');
require('./commands/work-item');

const shared = require('./commands/shared');

// ── Legaacy entry flags ──────────────────────────────────────────────
// These flags signal "the user intends to use the old --method/--path
// interface or a cache/set-current helper command". When the first
// argument matches one of these, the dispatcher delegates to the legacy
// main() and the original parser/behaviour is preserved unchanged.
const LEGACY_ENTRY_FLAGS = new Set([
  '--method', '--path',
  '--cache-users', '--cache-projects', '--cache-sprints',
  '--cache-work-item-types', '--cache-work-item-priorities',
  '--cache-work-item-properties',
  '--cache-states', '--cache-idea-states', '--cache-idea-priorities',
  '--context-options',
  '--set-current-user', '--set-current-project', '--set-current-sprint',
]);

// ── Dispatcher ───────────────────────────────────────────────────────
async function dispatcherMain(argv) {
  const tokens = argv || process.argv.slice(2);

  // (1) No args, or --help / -h as the first positional arg → new help.
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
    } catch (exc) {
      console.error(`error: ${exc.message}`);
      process.exitCode = 1;
    }
    return;
  }

  // (3) Legacy entry flag → delegate to the original main() unchanged.
  if (LEGACY_ENTRY_FLAGS.has(firstArg)) {
    await core.main(argv);
    return;
  }

  // (4) Any other --flag in the first position (global options before a
  //     subcommand are only supported in legacy mode).
  if (firstArg.startsWith('--')) {
    console.error(
      'error: Unknown module. ' +
      'Options before the subcommand are only supported in legacy mode. ' +
      'Did you mean to use --method/--path?',
    );
    process.exit(1);
  }

  // (5) Unknown positional argument.
  console.error(`error: Unknown module: ${firstArg}`);
  process.exit(1);
}

// ── Entry point ──────────────────────────────────────────────────────
if (require.main === module) {
  dispatcherMain().catch((exc) => {
    console.error(`error: ${exc.message}`);
    process.exitCode = 1;
  });
}
