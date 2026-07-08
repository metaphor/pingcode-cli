#!/usr/bin/env node

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "..", "scripts", "pingcode-ctx.js");
const result = spawnSync("node", [script, ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`error: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
