  'use strict';

// Module registry shared by the dispatcher and command modules.
// Command modules register themselves here; the dispatcher discovers
// them without importing command files directly (avoids circular deps).

const core = require('../core');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');

const registry = new Map();

function registerModule(name, config) {
  registry.set(name, config);
}

function getModule(name) {
  return registry.get(name);
}

// ── Interactive arrow-key selector ──────────────────────────────────

// East Asian wide/fullwidth code point ranges (wcwidth-style). CJK text
// occupies two terminal cells per character while String.length counts one;
// ignoring this padded menu lines past the terminal width, the lines wrapped,
// and the cursor-up redraw drifted (stacking menus on every keypress).
const WIDE_CODEPOINT_RANGES = [
  [0x1100, 0x115f], [0x2329, 0x232a], [0x2e80, 0x303e], [0x3041, 0x33ff],
  [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xa960, 0xa97f],
  [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe10, 0xfe19], [0xfe30, 0xfe6f],
  [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f300, 0x1f64f], [0x1f900, 0x1f9ff],
  [0x20000, 0x2fffd], [0x30000, 0x3fffd],
];

function codePointWidth(codePoint) {
  for (const [start, end] of WIDE_CODEPOINT_RANGES) {
    if (codePoint >= start && codePoint <= end) return 2;
  }
  return 1;
}

// Number of terminal cells a string occupies when rendered.
function displayWidth(text) {
  let width = 0;
  for (const char of text) {
    width += codePointWidth(char.codePointAt(0));
  }
  return width;
}

// Truncate to a maximum display width, reserving one cell for the ellipsis.
function truncateToWidth(text, maxWidth) {
  if (displayWidth(text) <= maxWidth) return text;
  let out = '';
  let width = 0;
  for (const char of text) {
    const charWidth = codePointWidth(char.codePointAt(0));
    if (width + charWidth > maxWidth - 1) break;
    out += char;
    width += charWidth;
  }
  return `${out}…`;
}

// Arrow-key menu over `options` (`[{ value, label }]`).
//   single (default): ↑/↓ (and ←/→ when columns > 1) to move, Enter to pick.
//   multi:            Space toggles the highlighted entry, Enter confirms the
//                     checked set (possibly empty — callers decide).
// Esc / Ctrl+C always reject with a PingCodeError. Grid layouts clamp at the
// edges; a single column wraps. Redraws in place inside a scrolling viewport;
// every emitted line is display-width aware so nothing ever wraps.
// Streams are injectable so tests can drive key events without a real TTY.
function arrowSelect({
  title,
  options,
  multi = false,
  initialSelected = [],
  initialIndex = 0,
  columns = 1,
  input = process.stdin,
  output = process.stdout,
}) {
  if (!Array.isArray(options) || options.length === 0) {
    return Promise.reject(new core.PingCodeError(`${title}: no options are available`));
  }
  if (typeof input.setRawMode !== 'function') {
    return Promise.reject(new core.PingCodeError(`${title} requires an interactive terminal.`));
  }

  const total = options.length;
  const cols = Math.max(1, Math.min(8, columns || 1));
  const checked = new Set(multi ? initialSelected : []);
  let selected = Math.max(0, Math.min(total - 1, initialIndex));
  let winStart = Math.floor(selected / cols) * cols;
  let cellWidth = 80;
  let visibleRows = 12;
  let drawn = 0;

  // Re-read the live terminal size every frame. Keep the last column free:
  // lines of exactly `columns` cells sit on the autowrap boundary and wrap
  // differently across terminals, which would shift the redraw.
  const measure = () => {
    const usable = Math.max(20, (output.columns || 80) - 1);
    cellWidth = cols > 1 ? Math.floor((usable - (cols - 1) * 2) / cols) : usable;
    visibleRows = Math.max(3, Math.min(12, (output.rows || 24) - 6));
  };

  const renderRow = (startIndex, endIndex) => {
    const cells = [];
    for (let index = startIndex; index < endIndex; index++) {
      const option = options[index];
      const isSelected = index === selected;
      const text = truncateToWidth(option.label, cellWidth - (multi ? 6 : 2));
      const pad = ' '.repeat(Math.max(0, cellWidth - (multi ? 6 : 2) - displayWidth(text)));
      const cursor = isSelected ? '\u001b[36m❯\u001b[0m' : ' ';
      const box = multi ? (checked.has(option.value) ? '[x]' : '[ ]') : '';
      cells.push(`${cursor} ${box}${box ? ' ' : ''}${text}${pad}`);
    }
    return cells.join('  ');
  };

  const render = (firstRender) => {
    measure();
    if (selected < winStart) winStart = Math.floor(selected / cols) * cols;
    if (selected >= winStart + cols * visibleRows) {
      const row = Math.floor(selected / cols);
      winStart = Math.max(0, row - visibleRows + 1) * cols;
    }
    const hint = multi
      ? '↑/↓ move, Space toggle, Enter confirm, Esc cancel'
      : (cols > 1 ? '↑/↓/←/→ move, Enter select, Esc cancel' : '↑/↓ move, Enter select, Esc cancel');
    const usable = Math.max(20, (output.columns || 80) - 1);
    const header = truncateToWidth(`${title}: (${selected + 1}/${total}) ${hint}`, usable);
    const lines = [header];
    const end = Math.min(total, winStart + cols * visibleRows);
    for (let index = winStart; index < end; index += cols) {
      lines.push(renderRow(index, Math.min(end, index + cols)));
    }
    if (!firstRender) {
      output.write(`\u001b[${drawn}A\r\u001b[J`);
    }
    output.write(`${lines.join('\n')}\n`);
    drawn = lines.length;
  };

  const clearMenu = () => {
    if (drawn > 0) {
      output.write(`\u001b[${drawn}A\r\u001b[J`);
    }
  };

  readline.emitKeypressEvents(input);
  const previousRaw = input.isRaw === true;
  input.setRawMode(true);
  input.resume();
  output.write('\u001b[?25l'); // hide cursor while the menu is live

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      input.removeListener('keypress', onKey);
      input.setRawMode(previousRaw);
      input.pause();
      output.write('\u001b[?25h'); // restore cursor
      clearMenu();
      if (error) {
        output.write(`${title}: cancelled.\n`);
        reject(error);
      } else {
        const label = multi
          ? `${value.length} selected`
          : options[selected].label;
        output.write(`${title}: ${label}\n`);
        resolve(value);
      }
    };

    const moveBy = (delta) => {
      const next = selected + delta;
      if (cols > 1) {
        selected = Math.max(0, Math.min(total - 1, next));
      } else {
        selected = (next + total) % total;
      }
      render(false);
    };

    function onKey(str, key) {
      if (!key || settled) return;
      if (key.ctrl && key.name === 'c') {
        settle(new core.PingCodeError(`${title}: cancelled`));
        return;
      }
      switch (key.name) {
        case 'up':
          moveBy(-cols);
          break;
        case 'down':
          moveBy(cols);
          break;
        case 'left':
          moveBy(-1);
          break;
        case 'right':
          moveBy(1);
          break;
        case 'space':
          if (multi) {
            if (checked.has(options[selected].value)) {
              checked.delete(options[selected].value);
            } else {
              checked.add(options[selected].value);
            }
            render(false);
          }
          break;
        case 'return':
        case 'enter': {
          const picked = multi
            ? options.filter((option) => checked.has(option.value)).map((option) => option.value)
            : options[selected].value;
          settle(null, picked);
          break;
        }
        case 'escape':
          settle(new core.PingCodeError(`${title}: cancelled`));
          break;
        default:
          break;
      }
    }

    input.on('keypress', onKey);
    render(true);
  });
}

// Radio-style ASCII table selector. First column is a cursor circle: ○ idle,
// ● on the row the cursor sits on (single select). The cursor always starts
// on the first row.
//   columns: [{ header }]
//   rows:    [{ value, cells: [string, ...] }]  (cells count === columns count)
// ↑/↓ move (wrapping), Enter resolves rows[selected].value, Esc/Ctrl+C cancel.
function arrowTable({
  title,
  columns,
  rows,
  initialIndex = 0,
  input = process.stdin,
  output = process.stdout,
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return Promise.reject(new core.PingCodeError(`${title}: no options are available`));
  }
  if (typeof input.setRawMode !== 'function') {
    return Promise.reject(new core.PingCodeError(`${title} requires an interactive terminal.`));
  }

  let selected = Math.max(0, Math.min(rows.length - 1, initialIndex));
  // Column widths from header + cell contents, display-width aware so CJK
  // cells keep the vertical borders aligned. Column 0 is the cursor circle.
  const SELECT_HEADER = '选择';
  const selectWidth = Math.max(displayWidth(SELECT_HEADER), 2);
  const columnWidths = columns.map((col, index) => {
    let width = displayWidth(String(col.header || ''));
    for (const row of rows) {
      width = Math.max(width, displayWidth(String(row.cells[index] ?? '')));
    }
    return Math.max(width, 2);
  });

  const padCell = (text, width) => String(text) + ' '.repeat(Math.max(0, width - displayWidth(String(text))));
  const borderLine = () => `+${[selectWidth, ...columnWidths].map((width) => '-'.repeat(width + 2)).join('+')}+`;
  const headerLine = () =>
    `| ${padCell(SELECT_HEADER, selectWidth)} | ${columns.map((col, index) => padCell(col.header || '', columnWidths[index])).join(' | ')} |`;
  const dataLine = (row, isCursor) =>
    `| ${padCell(isCursor ? '●' : '○', selectWidth)} | ${row.cells.map((cell, index) => padCell(cell ?? '', columnWidths[index])).join(' | ')} |`;

  let visibleRows = Math.max(3, Math.min(12, (output.rows || 24) - 6));
  let winStart = 0;
  let drawn = 0;

  const render = (firstRender) => {
    if (selected < winStart) winStart = selected;
    if (selected >= winStart + visibleRows) winStart = selected - visibleRows + 1;
    const header = truncateToWidth(
      `${title}: (${selected + 1}/${rows.length}) ↑/↓ move, Enter select, Esc cancel`,
      Math.max(20, (output.columns || 80) - 1),
    );
    const lines = [header, borderLine(), headerLine(), borderLine()];
    const end = Math.min(rows.length, winStart + visibleRows);
    for (let index = winStart; index < end; index++) {
      lines.push(dataLine(rows[index], index === selected));
    }
    lines.push(borderLine());
    if (!firstRender) {
      output.write(`\u001b[${drawn}A\r\u001b[J`);
    }
    output.write(`${lines.join('\n')}\n`);
    drawn = lines.length;
  };

  readline.emitKeypressEvents(input);
  const previousRaw = input.isRaw === true;
  input.setRawMode(true);
  input.resume();
  output.write('\u001b[?25l'); // hide cursor while the table is live

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      input.removeListener('keypress', onKey);
      input.setRawMode(previousRaw);
      input.pause();
      output.write('\u001b[?25h'); // restore cursor
      if (drawn > 0) output.write(`\u001b[${drawn}A\r\u001b[J`);
      if (error) {
        output.write(`${title}: cancelled.\n`);
        reject(error);
      } else {
        const row = rows[selected];
        output.write(`${title}: ${String(row.cells[0] ?? '').trim()}\n`);
        resolve(value);
      }
    };

    function onKey(str, key) {
      if (!key || settled) return;
      if (key.ctrl && key.name === 'c') {
        settle(new core.PingCodeError(`${title}: cancelled`));
        return;
      }
      switch (key.name) {
        case 'up':
          selected = (selected - 1 + rows.length) % rows.length;
          render(false);
          break;
        case 'down':
          selected = (selected + 1) % rows.length;
          render(false);
          break;
        case 'return':
        case 'enter':
          settle(null, rows[selected].value);
          break;
        case 'escape':
          settle(new core.PingCodeError(`${title}: cancelled`));
          break;
        default:
          break;
      }
    }

    input.on('keypress', onKey);
    render(true);
  });
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
    'Usage: pingcode <module> [subcommand] [options]',
    '',
    'Modules:',
  ];
  for (const m of modules) {
    const padded = m.name.padEnd(maxLen + 2);
    lines.push(`  ${padded}${m.description}`);
  }
  lines.push('');
  lines.push('Global options (work with any module):');
  lines.push('  --doctor                    Run in diagnostic mode; executes normally and writes a sanitized JSON health report into the current directory');
  lines.push('  --doctor-output <path>      Doctor report file or directory (default: ./pingcode-doctor-<timestamp>.json)');
  console.log(lines.join('\n'));
}

const BASE_GLOBAL_BOOLEAN_FLAGS = new Set([
  '--dry-run', '--compact', '--no-token-cache', '--no-workspace-cache',
]);

const BASE_GLOBAL_STRING_FLAGS = {
  '--base-url': 'base_url',
  '--client-id': 'client_id',
  '--client-secret': 'client_secret',
  '--token': 'token',
  '--user-id': 'user_id',
  '--user-name': 'user_name',
  '--workspace-cache': 'workspace_cache',
  '--grant-type': 'grant_type',
};

function defaultGlobalOpts(extraBooleanFlags = []) {
  const opts = {
    base_url: process.env.PINGCODE_BASE_URL || core.DEFAULT_BASE_URL,
    client_id: process.env.PINGCODE_CLIENT_ID || null,
    client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
    token: process.env.PINGCODE_ACCESS_TOKEN || null,
    user_id: process.env.PINGCODE_USER_ID || null,
    user_name: process.env.PINGCODE_USER_NAME || null,
    no_token_cache: false,
    workspace_cache: process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE,
    no_workspace_cache: false,
    dry_run: false,
    compact: false,
    grant_type: 'auto',
  };
  for (const flag of extraBooleanFlags) {
    const key = flag.replace(/^--/, '').replace(/-/g, '_');
    opts[key] = false;
  }
  return opts;
}

function parseGlobalOptions(tokens, extraBooleanFlags = []) {
  const booleanFlags = new Set([...BASE_GLOBAL_BOOLEAN_FLAGS, ...extraBooleanFlags]);
  const opts = defaultGlobalOpts(extraBooleanFlags);
  const remaining = [];

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--help' || arg === '-h') {
      remaining.push(arg);
      continue;
    }
    if (booleanFlags.has(arg)) {
      const key = arg.replace(/^--/, '').replace(/-/g, '_');
      opts[key] = true;
      continue;
    }
    const eqIndex = arg.indexOf('=');
    let flag, value, consumedNext = false;
    if (eqIndex !== -1) {
      flag = arg.slice(0, eqIndex);
      value = arg.slice(eqIndex + 1);
    } else if (arg.startsWith('--')) {
      flag = arg;
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        value = tokens[i + 1];
        consumedNext = true;
      } else {
        remaining.push(arg);
        continue;
      }
    } else {
      remaining.push(arg);
      continue;
    }
    if (flag in BASE_GLOBAL_STRING_FLAGS) {
      opts[BASE_GLOBAL_STRING_FLAGS[flag]] = value;
      if (consumedNext) i += 1;
    } else {
      remaining.push(arg);
      if (consumedNext) remaining.push(value);
      if (consumedNext) i += 1;
    }
  }
  return { opts, remaining };
}

function clientFromOpts(opts) {
  const tokenCache = opts.no_token_cache
    ? null
    : (process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE);
  const workspaceCache = opts.no_workspace_cache ? null : opts.workspace_cache;
  return new core.PingCodeClient({
    base_url: opts.base_url,
    client_id: opts.client_id,
    client_secret: opts.client_secret,
    token: opts.token,
    token_cache: tokenCache,
    workspace_cache: workspaceCache,
    grant_type: opts.grant_type,
  });
}

// ── Self-management (install/update) plumbing ────────────────────────
// npm package coordinates and spawn wrapper shared by the commands that
// manage the CLI's own installation. Goes through the user's `npm` on PATH
// so the configured registry and prefix are honored.
const PACKAGE_NAME = "@metaphorli/pingcode-cli";

function defaultNpm(args, options = {}) {
  return spawnSync("npm", args, {
    encoding: "utf8",
    // Windows resolves npm via npm.cmd, which needs a shell.
    shell: process.platform === "win32",
    ...options,
  });
}

module.exports = {
  registerModule, getModule, listModules, printModulesHelp,
  BASE_GLOBAL_BOOLEAN_FLAGS, BASE_GLOBAL_STRING_FLAGS,
  defaultGlobalOpts, parseGlobalOptions, clientFromOpts,
  PACKAGE_NAME, defaultNpm,
  arrowSelect, arrowTable, displayWidth, truncateToWidth,
};

