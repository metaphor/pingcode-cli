'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert');

const core = require('../scripts/core');
const speckit = require('../scripts/speckit_extension');
const context = require('../scripts/commands/context');
const { tmpFile, writeWorkspaceCache, mockFetch, fakeResponse } = require('./helpers');

const SAMPLE_TEMPLATE = [
  '# PingCode Integration Configuration',
  'project: ""',
  'product: ""',
  'sprint: ""',
  '',
  'mapping:',
  '  spec_artifact: "特性"',
  '  story_artifact: "用户故事"',
  '  # type_levels:',
  '  #   模块: 2',
  '',
  'priority_mapping:',
  '  p1: "高"                   # P1 MVP',
  '  p2: "中"',
  '  p3: "低"',
  '',
  'defaults:',
  '  spec:',
  '    priority: ""   # spec 卡优先级,留空不设置',
  '  story:',
  '    priority: ""   # 章节卡兜底优先级',
  '',
  'status_mapping:',
  '  completed: "已完成"',
  '',
  'sync:',
  '  complete_story_when_tasks_done: true',
  '',
].join('\n');

function makeTmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-ext-'));
}

// Create a fake installed extension under `<tmpdir>/.specify/extensions/pingcode`.
function makeExt(tmpdir, { withTemplate = true, withConfig = null } = {}) {
  const dir = path.join(tmpdir, '.specify', 'extensions', 'pingcode');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'extension.yml'), 'extension:\n  id: "pingcode"\n');
  if (withTemplate) {
    fs.writeFileSync(path.join(dir, 'pingcode-config.template.yml'), SAMPLE_TEMPLATE);
  }
  if (withConfig !== null) {
    fs.writeFileSync(path.join(dir, 'pingcode-config.yml'), withConfig);
  }
  return {
    dir,
    configPath: path.join(dir, 'pingcode-config.yml'),
    templatePath: path.join(dir, 'pingcode-config.template.yml'),
  };
}

function fakeClient({ products = [], cache = {} } = {}) {
  return {
    workspaceCache: cache,
    request: async () => ({ total: products.length, values: products }),
  };
}

// ask() backed by a queue; missing answers fall back to '' (accept / keep).
function queueAsk(answers) {
  return async () => {
    const next = answers.shift();
    return next === undefined ? '' : next;
  };
}

// choose() backed by a queue of entities to return. The CANCEL sentinel makes
// the next choose() reject like an Esc press.
const CANCEL = Symbol('choose-cancel');
function queueChoose(picked) {
  return async () => {
    const next = picked.shift();
    if (next === undefined) throw new Error('choose queue exhausted');
    if (next === CANCEL) throw new core.PingCodeError('cancelled');
    return next;
  };
}

function canonicalCache() {
  return {
    work_item_types: {
      p1: {
        values: [
          { id: 't1', name: '史诗', group: 'requirement' },
          { id: 't2', name: '特性', group: 'requirement' },
          { id: 't3', name: '用户故事', group: 'requirement' },
        ],
      },
    },
    work_item_priorities: {
      p1: { values: [{ id: 'pr1', name: '高' }, { id: 'pr2', name: '中' }, { id: 'pr3', name: '低' }] },
    },
    work_item_states: {
      'p1::t3': {
        values: [
          { id: 'st1', name: '进行中', state_type: 'in_progress' },
          { id: 'st2', name: '已完成', state_type: 'completed' },
        ],
      },
    },
  };
}

// ── classifyTypeLevel ───────────────────────────────────────────────────

test('classifyTypeLevel maps canonical names and rejects unknown ones', () => {
  assert.strictEqual(speckit.classifyTypeLevel('史诗'), 1);
  assert.strictEqual(speckit.classifyTypeLevel('Epic'), 1);
  assert.strictEqual(speckit.classifyTypeLevel('特性'), 2);
  assert.strictEqual(speckit.classifyTypeLevel('Feature'), 2);
  assert.strictEqual(speckit.classifyTypeLevel('用户故事'), 3);
  assert.strictEqual(speckit.classifyTypeLevel('Story'), 3);
  assert.strictEqual(speckit.classifyTypeLevel('模块'), null);
  assert.strictEqual(speckit.classifyTypeLevel(''), null);
});

// ── findExtension ───────────────────────────────────────────────────────

test('findExtension walks up from nested directories and returns null when absent', () => {
  const tmpdir = makeTmpdir();
  const ext = makeExt(tmpdir);
  const nested = path.join(tmpdir, 'a', 'b', 'c');
  fs.mkdirSync(nested, { recursive: true });
  const found = speckit.findExtension(nested);
  assert.strictEqual(found.configPath, ext.configPath);

  const empty = makeTmpdir();
  assert.strictEqual(speckit.findExtension(empty), null);
});

// ── scanConfig / parseScalar ────────────────────────────────────────────

test('scanConfig parses the closed schema incl. booleans and type_levels', () => {
  const text = [
    '# header comment',
    'project: "网运通项目组"',
    'product: ""',
    '',
    'mapping:',
    '  spec_artifact: "特性"',
    '  type_levels:',
    '    模块: 2',
    '    条目: 3',
    '',
    'sync:',
    '  complete_story_when_tasks_done: true',
  ].join('\n');
  const scan = speckit.scanConfig(text);
  assert.strictEqual(speckit.parseScalar(scan.entries.get('project').raw), '网运通项目组');
  assert.strictEqual(speckit.parseScalar(scan.entries.get('product').raw), '');
  assert.strictEqual(speckit.parseScalar(scan.entries.get('mapping.spec_artifact').raw), '特性');
  assert.strictEqual(speckit.parseScalar(scan.entries.get('sync.complete_story_when_tasks_done').raw), true);
  assert.ok(scan.typeLevels);
  assert.strictEqual(scan.typeLevels.entries.get('模块'), 2);
  assert.strictEqual(scan.typeLevels.entries.get('条目'), 3);
});

// ── applyConfigValues ───────────────────────────────────────────────────

test('applyConfigValues rewrites values in place and preserves comments', () => {
  const out = speckit.applyConfigValues(SAMPLE_TEMPLATE, {
    scalars: {
      project: '网运通项目组',
      'priority_mapping.p1': '紧急',
      'sync.complete_story_when_tasks_done': false,
    },
    typeLevels: null,
  });
  assert.ok(out.includes('project: "网运通项目组"'), 'project value replaced');
  assert.ok(/p1: "紧急" # P1 MVP/.test(out), 'inline comment survives value rewrite');
  assert.ok(out.includes('complete_story_when_tasks_done: false'), 'boolean stays bare');
  assert.ok(out.includes('# PingCode Integration Configuration'), 'header comment survives');
  assert.ok(out.includes('# type_levels:'), 'commented block stays commented');
  assert.ok(out.includes('story_artifact: "用户故事"'), 'untouched keys keep their values');
});

test('applyConfigValues inserts missing keys at section end and appends type_levels', () => {
  const minimal = [
    'project: "旧"',
    'mapping:',
    '  spec_artifact: "特性"',
  ].join('\n');
  const out = speckit.applyConfigValues(minimal, {
    scalars: {
      product: '产品A',
      'defaults.spec.priority': '中',
    },
    typeLevels: { 模块: 2 },
  });
  assert.ok(out.includes('product: "产品A"'), 'missing top-level scalar appended');
  assert.ok(/defaults:\n  spec:\n    priority: "中"/.test(out), 'missing nested section appended');
  assert.ok(/  spec_artifact: "特性"\n  type_levels:\n    模块: 2/.test(out), 'type_levels block inserted into existing mapping section');
  const scan = speckit.scanConfig(out);
  assert.ok(scan.entries.has('defaults.spec.priority'));
  assert.strictEqual(speckit.parseScalar(scan.entries.get('product').raw), '产品A');
});

test('applyConfigValues replaces an existing type_levels block', () => {
  const text = [
    'mapping:',
    '  spec_artifact: "特性"',
    '  type_levels:',
    '    模块: 1',
    '',
    'sync:',
    '  complete_story_when_tasks_done: true',
  ].join('\n');
  const out = speckit.applyConfigValues(text, {
    scalars: {},
    typeLevels: { 模块: 2, 条目: 3 },
  });
  assert.ok(out.includes('    模块: 2'));
  assert.ok(out.includes('    条目: 3'));
  const scan = speckit.scanConfig(out);
  assert.strictEqual(scan.typeLevels.entries.get('模块'), 2);
  assert.strictEqual(scan.typeLevels.entries.get('条目'), 3);
});

test('baseTemplateText prefers the installed template and falls back embedded', () => {
  const tmpdir = makeTmpdir();
  const ext = makeExt(tmpdir);
  assert.ok(speckit.baseTemplateText(ext).includes('spec_artifact: "特性"'));
  const rendered = speckit.applyConfigValues(speckit.baseTemplateText(ext), {
    scalars: { project: 'WYT', 'sync.complete_story_when_tasks_done': true },
    typeLevels: null,
  });
  const scan = speckit.scanConfig(rendered);
  assert.strictEqual(speckit.parseScalar(scan.entries.get('project').raw), 'WYT');
  assert.strictEqual(speckit.parseScalar(scan.entries.get('mapping.story_artifact').raw), '用户故事');
  assert.ok(speckit.baseTemplateText({ templatePath: path.join(tmpdir, 'missing.yml') }).length > 0);
});

// ── Suggestions ─────────────────────────────────────────────────────────

test('suggestArtifacts builds the requirement-first type pool', () => {
  const canonical = [
    { id: 't1', name: '史诗', group: 'requirement' },
    { id: 't2', name: '特性', group: 'requirement' },
    { id: 't3', name: '用户故事', group: 'requirement' },
    { id: 't9', name: '故事', group: 'ticket' }, // non-requirement must not win
  ];
  const { pool } = speckit.suggestArtifacts(canonical);
  assert.deepStrictEqual(pool.map((t) => t.name), ['史诗', '特性', '用户故事']);

  // No requirement-group types at all → fall back to every named type.
  const fallback = speckit.suggestArtifacts([{ id: 't9', name: '故事', group: 'ticket' }]);
  assert.deepStrictEqual(fallback.pool.map((t) => t.name), ['故事']);

  assert.deepStrictEqual(speckit.suggestArtifacts([]).pool, []);
});

test('suggestPriorityMapping and suggestCompletedState pick from dictionaries', () => {
  // Removed helpers: priority/status initialization no longer happens in the
  // CLI flow (kept out of runConfigFlow by design). The only surviving
  // suggestion surface is the type pool via suggestArtifacts.
  const pool = speckit.suggestArtifacts([
    { id: 't2', name: '特性', group: 'requirement' },
    { id: 't3', name: '用户故事', group: 'requirement' },
  ]).pool;
  assert.strictEqual(pool.length, 2);
  assert.strictEqual(speckit.suggestPriorityMapping, undefined);
  assert.strictEqual(speckit.suggestCompletedState, undefined);
});

// ── runConfigFlow ───────────────────────────────────────────────────────

test('runConfigFlow creates the config when none exists (all suggestions accepted)', async () => {
  const tmpdir = makeTmpdir();
  const ext = makeExt(tmpdir);
  const client = fakeClient({ products: [{ id: 'pd1', name: '产品A' }], cache: canonicalCache() });

  const summary = await speckit.runConfigFlow({
    ext,
    project: { id: 'p1', name: '网运通项目组', identifier: 'WYT' },
    sprint: { id: 's1', name: 'Sprint 22' },
    product: { id: 'pd1', name: '产品A' },
    productSelection: 'picked',
    workspaceCache: client.workspaceCache,
    // Flow: product/project auto → sprint text → Spec table → Story table.
    ask: queueAsk(['']),
    choose: queueChoose([
      { id: 't2', name: '特性' },
      { id: 't3', name: '用户故事' },
    ]),
  });

  assert.strictEqual(summary.action, 'created');
  assert.ok(!('backup' in summary), 'no backup for a fresh file');
  const keys = summary.changed.map((c) => c.key);
  for (const expected of [
    'project', 'product', 'sprint',
    'mapping.spec_artifact', 'mapping.story_artifact',
  ]) {
    assert.ok(keys.includes(expected), `changed must include ${expected}`);
  }
  assert.ok(!keys.includes('priority_mapping.p1'), 'priority mapping is not initialized here');
  assert.ok(!keys.includes('status_mapping.completed'), 'status mapping is not initialized here');

  const values = speckit.readConfigValues(ext.configPath).values;
  assert.strictEqual(values.project, '网运通项目组');
  assert.strictEqual(values.product, '产品A');
  assert.strictEqual(values.sprint, 'Sprint 22');
  assert.strictEqual(values['mapping.spec_artifact'], '特性');
  assert.strictEqual(values['mapping.story_artifact'], '用户故事');
  assert.strictEqual(values['sync.complete_story_when_tasks_done'], true);
  assert.ok(!fs.existsSync(`${ext.configPath}.bak`), 'no backup for a fresh file');
});

test('runConfigFlow updates an existing config, honoring declines and backup', async () => {
  const tmpdir = makeTmpdir();
  const existing = [
    '# 手工注释必须保留',
    'project: "旧项目"',
    'product: "旧产品"',
    'sprint: "旧迭代"',
    '',
    'mapping:',
    '  spec_artifact: "特性"',
    '  story_artifact: "用户故事"',
    '',
    'priority_mapping:',
    '  p1: "高"',
    '  p2: "中"',
    '  p3: "低"',
    '',
    'status_mapping:',
    '  completed: "已完成"',
    '',
    'sync:',
    '  complete_story_when_tasks_done: true',
    '',
  ].join('\n');
  const ext = makeExt(tmpdir, { withConfig: existing });
  const client = fakeClient({ products: [{ id: 'pd1', name: '产品A' }], cache: canonicalCache() });

  const summary = await speckit.runConfigFlow({
    ext,
    project: { id: 'p1', name: '网运通项目组' },
    sprint: { id: 's1', name: 'Sprint 22' },
    client,
    workspaceCache: client.workspaceCache,
    // Flow: product/project from main init (skipped → product keeps 旧产品) →
    // sprint keeps → Spec table Esc keeps 特性 → Story table keeps 用户故事.
    product: null,
    productSelection: 'skipped',
    ask: queueAsk(['']),
    choose: queueChoose([CANCEL, { id: 't3', name: '用户故事' }]),
  });

  assert.strictEqual(summary.action, 'updated');
  assert.strictEqual(summary.backup, `${ext.configPath}.bak`);
  assert.ok(fs.existsSync(`${ext.configPath}.bak`), 'pre-existing file backed up');
  const keys = summary.changed.map((c) => c.key);
  assert.ok(keys.includes('project'));
  assert.ok(!keys.includes('product'), 'declined key must not change');
  assert.ok(!keys.includes('sync.complete_story_when_tasks_done'), 'sync toggle is not initialized here');

  const values = speckit.readConfigValues(ext.configPath).values;
  assert.strictEqual(values.project, '网运通项目组');
  assert.strictEqual(values.product, '旧产品', 'declined keeps old value');
  assert.strictEqual(values['sync.complete_story_when_tasks_done'], true);
  assert.ok(fs.readFileSync(ext.configPath, 'utf8').includes('# 手工注释必须保留'));
});

test('runConfigFlow asks levels for non-canonical types and enforces adjacency', async () => {
  const tmpdir = makeTmpdir();
  const ext = makeExt(tmpdir);
  const cache = {
    work_item_types: {
      p1: {
        values: [
          { id: 't1', name: '模块', group: 'requirement' },
          { id: 't2', name: '条目', group: 'requirement' },
        ],
      },
    },
    work_item_priorities: { p1: { values: [] } },
    work_item_states: {
      'p1::t2': { values: [{ id: 'st1', name: '已关闭', state_type: 'completed' }] },
    },
  };
  const client = fakeClient({ products: [], cache });

  const summary = await speckit.runConfigFlow({
    ext,
    project: { id: 'p1', name: '项目P' },
    sprint: { id: 's1', name: 'S1' },
    client,
    workspaceCache: cache,
    // Flow: product/project from main init (skipped) → sprint '' →
    // [choose 模块] → level '2' → [choose 条目] → level '1' (violation,
    // cached level dropped) → [choose 条目] → level '3' → valid.
    product: null,
    productSelection: 'skipped',
    ask: queueAsk(['', '2', '1', '3']),
    choose: queueChoose([
      { id: 't1', name: '模块', group: 'requirement' },
      { id: 't2', name: '条目', group: 'requirement' },
      { id: 't2', name: '条目', group: 'requirement' },
    ]),
  });

  assert.strictEqual(summary.action, 'created');
  const keys = summary.changed.map((c) => c.key);
  assert.ok(keys.includes('mapping.type_levels'), 'type_levels must be written');

  const parsed = speckit.readConfigValues(ext.configPath);
  assert.strictEqual(parsed.values['mapping.spec_artifact'], '模块');
  assert.strictEqual(parsed.values['mapping.story_artifact'], '条目');
  assert.deepStrictEqual(parsed.typeLevels, { 模块: 2, 条目: 3 });
});

test('runConfigFlow dry-run previews without writing', async () => {
  const tmpdir = makeTmpdir();
  const ext = makeExt(tmpdir);
  const client = fakeClient({ products: [], cache: canonicalCache() });

  const summary = await speckit.runConfigFlow({
    ext,
    project: { id: 'p1', name: '网运通项目组' },
    sprint: { id: 's1', name: 'S1' },
    product: { id: 'pd1', name: '产品A' },
    productSelection: 'picked',
    workspaceCache: client.workspaceCache,
    ask: queueAsk(['']),
    choose: queueChoose([
      { id: 't2', name: '特性' },
      { id: 't3', name: '用户故事' },
    ]),
    dryRun: true,
  });

  assert.strictEqual(summary.dry_run, true);
  assert.strictEqual(summary.action, 'created');
  assert.ok(summary.preview.includes('project: "网运通项目组"'));
  assert.ok(!fs.existsSync(ext.configPath), 'dry-run must not write the file');
});

// ── maybeConfigureExtension gates ────────────────────────────────────────

test('maybeConfigureExtension gates by detection, interactivity and flags', async () => {
  const origCwd = process.cwd();
  const empty = makeTmpdir();
  process.chdir(empty);
  try {
    const absent = await speckit.maybeConfigureExtension({
      client: fakeClient(), project: {}, sprint: null, opts: {}, interactive: true, getAsk: () => async () => '',
    });
    assert.deepStrictEqual(absent, { detected: false });
  } finally {
    process.chdir(origCwd);
  }

  const withExt = makeTmpdir();
  makeExt(withExt);
  process.chdir(withExt);
  try {
    const skipped = await speckit.maybeConfigureExtension({
      client: fakeClient(), project: {}, sprint: null, opts: {}, interactive: false, getAsk: () => async () => '',
    });
    assert.deepStrictEqual(skipped, { detected: true, action: 'skipped', reason: 'non_interactive' });

    const disabled = await speckit.maybeConfigureExtension({
      client: fakeClient(), project: {}, sprint: null, opts: { no_speckit_config: true }, interactive: true, getAsk: () => async () => '',
    });
    assert.deepStrictEqual(disabled, { detected: true, action: 'skipped', reason: 'disabled' });

    await assert.rejects(
      speckit.maybeConfigureExtension({
        client: fakeClient(), project: {}, sprint: null, opts: { speckit_config: true }, interactive: false, getAsk: () => async () => '',
      }),
      core.PingCodeError,
    );
  } finally {
    process.chdir(origCwd);
  }
});

// ── context init integration (piped mode stays untouched) ───────────────

test('context init in piped mode skips the extension flow and reports it', async () => {
  const origCwd = process.cwd();
  const tmpdir = makeTmpdir();
  makeExt(tmpdir);

  process.env.PINGCODE_CLIENT_ID = 'cid';
  process.env.PINGCODE_CLIENT_SECRET = 'csecret';
  const cachePath = tmpFile(tmpdir, 'workspace.json');
  // helpers.writeWorkspaceCache wraps projects/users in { values: [...] }.
  writeWorkspaceCache(cachePath, {
    projects: [{ id: 'project-1', name: 'Core Project' }],
    sprints: { 'project-1': { values: [{ id: 'sprint-1', name: 'Sprint 1' }] } },
    users: [{ id: 'user-1', name: 'alice' }],
  });

  mockFetch((url) => {
    const { pathname } = new URL(url);
    if (pathname === '/v1/project/projects') {
      return fakeResponse({ total: 1, values: [{ id: 'project-1', name: 'Core Project' }] });
    }
    if (pathname === '/v1/project/projects/project-1/sprints') {
      return fakeResponse({ total: 1, values: [{ id: 'sprint-1', name: 'Sprint 1' }] });
    }
    if (pathname === '/v1/project/projects/project-1/members') {
      return fakeResponse({
        total: 1,
        values: [{ id: 'member-1', user: { id: 'user-1', display_name: 'Alice', name: 'alice' } }],
      });
    }
    return fakeResponse({ total: 0, values: [] });
  });

  const readline = require('node:readline');
  const originalCreateInterface = readline.createInterface;
  readline.createInterface = () => ({
    question: (_, cb) => cb('1'),
    close: () => {},
  });
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  process.stdin.isTTY = false;
  process.stdout.isTTY = false;

  const originalLog = console.log;
  const chunks = [];
  console.log = (...args) => chunks.push(args.map(String).join(' '));
  try {
    process.chdir(tmpdir);
    await context.run(['init', '--workspace-cache', cachePath, '--token', 'fake']);
  } finally {
    console.log = originalLog;
    readline.createInterface = originalCreateInterface;
    if (stdinDescriptor) Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    else delete process.stdin.isTTY;
    if (stdoutDescriptor) Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    else delete process.stdout.isTTY;
    process.chdir(origCwd);
  }

  const jsonChunks = chunks.filter((c) => c.includes('配置已完成！'));
  assert.ok(jsonChunks.length > 0, 'init must end with the completion line');
  assert.ok(!chunks.some((c) => c.includes('是否同时初始化其配置')),
    'piped mode must not show the extension gate');
  assert.ok(!chunks.some((c) => c.includes('"speckit_extension"')),
    'no result JSON is printed anymore');
  assert.ok(!fs.existsSync(path.join(tmpdir, '.specify', 'extensions', 'pingcode', 'pingcode-config.yml')),
    'piped mode must not write the extension config');
});
