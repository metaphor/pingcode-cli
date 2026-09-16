#!/usr/bin/env node
'use strict';

// ── Library layer ────────────────────────────────────────────────────
// Import everything from the shared core module and re-export it
// so that require('./pingcode') remains fully backward-compatible
// for existing tests and the unified pingcode skill.
const core = require('./core');

module.exports = { ...core };

// ── Module registry ──────────────────────────────────────────────────
// Import command modules so they self-register with the shared registry.
// (Side-effect imports; no circular dependency because these import from
// ./shared and ../core, never from ../pingcode.)
require('./commands/attachment');
require('./commands/auth');
require('./commands/board');
require('./commands/build');
require('./commands/comment');
require('./commands/config');
require('./commands/context');
require('./commands/deliverable');
require('./commands/directory');
require('./commands/install');
require('./commands/mcp');
require('./commands/plans');
require('./commands/platform');
require('./commands/product');
require('./commands/project');
require('./commands/relation');
require('./commands/release');
require('./commands/review');
require('./commands/scm');
require('./commands/sprint');
require('./commands/tag');
require('./commands/testhub');
require('./commands/ticket');
require('./commands/update');
require('./commands/wiki');
require('./commands/workitem');
require('./commands/workload');

const shared = require('./commands/shared');

// ── Dispatcher ───────────────────────────────────────────────────────
function fatal(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function dispatcherMain(argv) {
  const rawTokens = argv || process.argv.slice(2);

  // (0) Doctor mode: strip --doctor / --doctor-output from the token list
  // and, when enabled, wrap the whole dispatch in a diagnostic session.
  // The session records environment, HTTP traffic, output and errors,
  // then writes a sanitized JSON report before the process exits.
  const doctor = require('./doctor');
  const { enabled, tokens, outputPath, baseUrl } = doctor.extractDoctorOptions(rawTokens);
  const session = enabled ? new doctor.DoctorSession({ argv: rawTokens, outputPath, baseUrl }) : null;
  if (session) {
    session.start();
    core.setDiagnosticSink((event) => session.recordEvent(event));
    session.captureStreams();
  }
  // Finalize the report, flush streams (pipes are async and process.exit
  // would truncate pending bytes), then exit. Doctor never changes a
  // command's exit code; bare `pingcode --doctor` exits 1 only when a
  // health check itself failed. Errors are recorded by the caller via
  // session.recordError so each failure lands in the report exactly once.
  const finishDoctor = async (exitCode) => {
    const result = await session.finish({ exitCode });
    await doctor.flushStreams();
    return result;
  };

  // (1) No args, or --help / -h as the first positional arg → help.
  if (tokens.length === 0) {
    if (!session) {
      shared.printModulesHelp();
      process.exit(0);
    }
    // Bare `pingcode --doctor`: environment-only health report.
    const result = await finishDoctor(0);
    process.exit(result.verdict === 'unhealthy' ? 1 : 0);
  }
  if (tokens[0] === '--help' || tokens[0] === '-h') {
    shared.printModulesHelp();
    if (session) await finishDoctor(0);
    process.exit(0);
  }

  // (1.5) -v / --version → print the running version and check npm for the
  // latest release (best effort; offline degrades to a stderr notice).
  if (tokens[0] === '-v' || tokens[0] === '--version') {
    await require('./commands/update').printVersionInfo();
    if (session) await finishDoctor(0);
    process.exit(0);
  }

  const firstArg = tokens[0];

  // (2) Recognised module name → dispatch to that module.
  const mod = shared.getModule(firstArg);
  if (mod) {
    if (session) session.setCommand(firstArg, tokens.slice(1));
    try {
      await mod.run(tokens.slice(1));
      // Modules may signal a non-zero exit (e.g. install partial failures)
      // via process.exitCode; honor it while defaulting to success.
      if (session) await finishDoctor(process.exitCode || 0);
      process.exit(process.exitCode || 0);
    } catch (exc) {
      if (session) {
        session.recordError(exc, 'command');
        await finishDoctor(1);
        console.error(`error: ${exc.message}`);
        process.exit(1);
      }
      fatal(exc.message);
    }
  }

  // (3) Unknown argument.
  if (session) {
    const exc = new Error(`Unknown module: ${firstArg}`);
    session.recordError(exc, 'dispatch');
    await finishDoctor(1);
    console.error(`error: ${exc.message}`);
    process.exit(1);
  }
  fatal(`Unknown module: ${firstArg}`);
}

// ── Entry point ──────────────────────────────────────────────────────
if (require.main === module) {
  dispatcherMain().catch((exc) => {
    console.error(`error: ${exc.message}`);
    process.exitCode = 1;
  });
}
