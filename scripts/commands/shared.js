'use strict';

// Module registry shared by the dispatcher and command modules.
// Command modules register themselves here; the dispatcher discovers
// them without importing command files directly (avoids circular deps).

const registry = new Map();

function registerModule(name, config) {
  registry.set(name, config);
}

function getModule(name) {
  return registry.get(name);
}

function listModules() {
  const modules = [];
  for (const [name, config] of registry) {
    modules.push({ name, description: config.description });
  }
  modules.sort((a, b) => a.name.localeCompare(b.name));
  return modules;
}

function printModulesHelp() {
  const modules = listModules();
  const maxLen = Math.max(...modules.map(m => m.name.length));
  const lines = [
    'Usage: node scripts/pingcode.js <module> [subcommand] [options]',
    '',
    'Modules:',
  ];
  for (const m of modules) {
    const padded = m.name.padEnd(maxLen + 2);
    lines.push(`  ${padded}${m.description}`);
  }
  lines.push('');
  lines.push('Legacy: node scripts/pingcode.js --method METHOD --path PATH [options]');
  lines.push('Options before the subcommand are only supported in legacy mode.');
  console.log(lines.join('\n'));
}

module.exports = { registerModule, getModule, listModules, printModulesHelp };
