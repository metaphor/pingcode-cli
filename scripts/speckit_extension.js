'use strict';

// spec-kit-pingcode extension integration for `pingcode context init`.
//
// When an installed spec-kit-pingcode extension is detected around the working
// directory (.specify/extensions/pingcode/extension.yml), `context init` offers
// to configure the extension's pingcode-config.yml in the same run. The CLI
// edits that file directly: every key is confirmed individually as
// `old -> suggested`, the previous file is backed up to `.bak`, and comments in
// the existing file are preserved (line-based value replacement).
//
// Suggestions derive from the selections and dictionaries the init flow
// already produced (project, sprint, cached work item types/states/
// priorities), plus one best-effort product list call.
//
// Non-TTY runs (piped stdin — e.g. the pipe documented in the extension's
// /speckit.pingcode.init step 7) skip this flow entirely; --speckit-config
// forces it on and requires a terminal, --no-speckit-config skips it always.

const fs = require('node:fs');
const path = require('node:path');
const core = require('./core');

const PRODUCTS_PATH = '/v1/ship/products';
const EMPTY_DISPLAY = '(空)';
const LEVEL_LABELS = { 1: '史诗层', 2: '特性层', 3: '用户故事层' };
const LEVEL_PROMPT = `[1=${LEVEL_LABELS[1]}/2=${LEVEL_LABELS[2]}/3=${LEVEL_LABELS[3]}]`;

// Fallback used only when generating a brand-new config and the installed
// extension did not ship its template file. Mirrors
// pingcode-config.template.yml from Spec-Kit-PingCode v2.4.0.
// eslint-disable-next-line no-use-before-define
const EMBEDDED_TEMPLATE = [
  '# PingCode Integration Configuration',
  '# 复制为 pingcode-config.yml 并按你的项目定制:',
  '#   cp .specify/extensions/pingcode/pingcode-config.template.yml \\',
  '#      .specify/extensions/pingcode/pingcode-config.yml',
  '',
  '# PingCode 项目(必填)',
  '# 支持项目名或项目标识符,如 "网运通项目组" 或 "WYT"',
  '# 运行时通过 `pingcode context set-current-project` 解析为 project_id',
  'project: ""',
  '',
  '# 产品(可选,需求关联用)',
  '# specstoissues 触发时需要选择产品下的「需求」(idea);留空 = 每次运行交互选择',
  '# 解析优先级:--product 命令参数 > 此处 > 交互选择',
  'product: ""',
  '',
  '# 迭代(可选,留空 = 每次运行动态解析)',
  '# 解析优先级:--sprint 命令参数 > 此处 > context 当前迭代 > sprint list --status in_progress 自动/询问',
  'sprint: ""',
  '',
  '# 制品 → 工作项映射',
  '# 只有两级会建工作项:spec 整体、spec 的 User Story 章节;两个映射必须落在需求树相邻层级',
  '# (史诗=1/特性=2/用户故事=3,不跳级)。spec 卡上方的未映射祖先层在建卡时向用户确认',
  '# (需求必问,中间工作项层只选已有);下方的层永不询问。',
  '# Phase 与任务不建工作项,也不折叠进卡描述;任务进度只看本地 tasks.md(sync-status 收尾)。',
  '# 类型名以项目实际配置为准,可用 /speckit.pingcode.discover-context 查询',
  'mapping:',
  '  # SPEC.md 整体映射的工作项类型,默认 "特性"(需求树第 2 层,挂所选史诗下)',
  '  # 留空 "" = spec 不建卡(此时必须配置 story_artifact)',
  '  spec_artifact: "特性"',
  '',
  '  # spec.md 的 `### User Story N` 章节映射的工作项类型,默认 "用户故事"(第 3 层,挂 spec 卡下)',
  '  # 必须为 spec 的紧邻下一层;留空 "" = 章节不建卡,全文并入 spec 卡描述',
  '  story_artifact: "用户故事"',
  '',
  '  # 类型层级归类(可选):仅当项目类型名不含规范词(史诗/特性/用户故事)时由 init 询问后写入',
  '  # 层级:1=史诗层 2=特性层 3=用户故事层',
  '  # type_levels:',
  '  #   模块: 2',
  '  #   条目: 3',
  '',
  '# 章节 P1/P2/P3 → 项目优先级名(创建章节卡时使用)',
  '# 从章节标题尾注捕获 P 编号(如 "(Priority: P1)"、"(P1)"),按此映射设置 --priority',
  '# 未捕获编号的章节回落 defaults.story.priority,仍未设置则不设优先级',
  '# 优先级名以项目实际字典为准,可用 /speckit.pingcode.discover-context 查询',
  'priority_mapping:',
  '  p1: "高"                   # P1 MVP',
  '  p2: "中"',
  '  p3: "低"',
  '',
  '# 默认值(可选)',
  'defaults:',
  '  spec:',
  '    priority: ""   # spec 卡优先级,留空不设置',
  '  story:',
  '    priority: ""   # 章节卡兜底优先级(章节无 P 编号时)',
  '',
  '# 状态映射(sync-status 使用)',
  '# 某张卡关联的任务全部勾选 [x] 后,将该卡流转到以下状态',
  '# 名称不匹配时按 state_type=completed 兜底解析',
  'status_mapping:',
  '  completed: "已完成"',
  '',
  '# 同步行为',
  'sync:',
  '  # 卡的任务全部完成后,是否自动将该卡流转到完成态',
  '  complete_story_when_tasks_done: true',
  '',
  '# 环境变量覆盖(优先级高于本文件):',
  '#   SPECKIT_PINGCODE_PROJECT',
  '#   SPECKIT_PINGCODE_PRODUCT',
  '#   SPECKIT_PINGCODE_SPRINT',
  '#   SPECKIT_PINGCODE_SPEC_ARTIFACT',
  '#   SPECKIT_PINGCODE_STORY_ARTIFACT',
  '#   SPECKIT_PINGCODE_PRIORITY_P1',
  '#   SPECKIT_PINGCODE_PRIORITY_P2',
  '#   SPECKIT_PINGCODE_PRIORITY_P3',
  '#   SPECKIT_PINGCODE_STATUS_COMPLETED',
].join('\n');

// ── Detection ─────────────────────────────────────────────────────────

// Walk up from startDir looking for the spec-kit-pingcode extension marker.
function findExtension(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  for (;;) {
    const extDir = path.join(dir, '.specify', 'extensions', 'pingcode');
    if (fs.existsSync(path.join(extDir, 'extension.yml'))) {
      return {
        dir: extDir,
        configPath: path.join(extDir, 'pingcode-config.yml'),
        templatePath: path.join(extDir, 'pingcode-config.template.yml'),
      };
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// ── Requirement-tree levels (史诗=1 / 特性=2 / 用户故事=3) ────────────

function classifyTypeLevel(name) {
  const raw = String(name || '');
  const lower = raw.toLowerCase();
  if (lower.includes('epic') || raw.includes('史诗')) return 1;
  if (lower.includes('feature') || raw.includes('特性')) return 2;
  if (lower.includes('story') || raw.includes('故事')) return 3;
  return null;
}

// ── YAML line editor (closed schema: flat scalars, one optional block) ──

function stripInlineComment(rest) {
  const v = String(rest == null ? '' : rest).trim();
  if (!v || v.startsWith('#')) return '';
  if (v.startsWith('"') || v.startsWith("'")) return v;
  const hash = v.indexOf(' #');
  return hash === -1 ? v : v.slice(0, hash).trim();
}

function parseScalar(raw) {
  let v = String(raw == null ? '' : raw).trim();
  if (!v) return '';
  if (v.startsWith('"') || v.startsWith("'")) {
    const quote = v[0];
    const end = v.indexOf(quote, 1);
    return end === -1 ? v.slice(1) : v.slice(1, end);
  }
  const hash = v.indexOf(' #');
  if (hash !== -1) v = v.slice(0, hash).trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function formatScalar(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Trailing comment of a raw scalar value (e.g. ` "高"  # P1 MVP` → ` # P1 MVP`),
// so rewriting a value in place keeps the line's documentation.
function entryComment(raw) {
  const trimmed = String(raw == null ? '' : raw).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const quote = trimmed[0];
    const end = trimmed.indexOf(quote, 1);
    if (end === -1) return '';
    const tail = trimmed.slice(end + 1).trim();
    return tail.startsWith('#') ? ` ${tail}` : '';
  }
  const hash = trimmed.indexOf('#');
  return hash === -1 ? '' : ` ${trimmed.slice(hash).trim()}`;
}

function displayValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const s = String(value == null ? '' : value);
  return s === '' ? EMPTY_DISPLAY : s;
}

// Structural scan of a pingcode-config.yml text. Only understands the schema
// the extension template defines: top-level scalars, second-level scalars in
// known sections, defaults.spec/story.priority, and the optional
// mapping.type_levels block. Everything else (comments, unknown keys) is
// ignored here and preserved verbatim when editing.
//
// Returns { lines, entries, sections, typeLevels }:
//   entries:   Map<dottedKey, { index, indent, key, raw }>
//   sections:  Map<topLevelKey, { startIndex, endIndex }>
//   typeLevels: { startIndex, endIndex, entries: Map<name, level> } | null
function scanConfig(text) {
  const lines = String(text || '').split('\n');
  const entries = new Map();
  const sections = new Map();
  let typeLevels = null;
  let section = null;
  let subsection = null;
  let inTypeLevels = false;

  const extendSection = (i) => {
    if (section && sections.has(section)) sections.get(section).endIndex = i;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const match = trimmed.match(/^([^:#\s][^:]*?):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const raw = match[2];

    if (indent === 0) {
      inTypeLevels = false;
      section = key;
      subsection = null;
      sections.set(key, { startIndex: i, endIndex: i });
      if (stripInlineComment(raw) !== '') {
        entries.set(key, { index: i, indent: 0, key, raw });
      }
      continue;
    }

    if (inTypeLevels) {
      const level = parseInt(stripInlineComment(raw), 10);
      if (Number.isFinite(level)) {
        typeLevels.entries.set(key, level);
        typeLevels.endIndex = i;
        continue;
      }
      inTypeLevels = false; // non-entry line closes the block; falls through
    }

    if (indent <= 2) {
      if (section && stripInlineComment(raw) === '') {
        if (section === 'defaults' && (key === 'spec' || key === 'story')) {
          subsection = key;
        } else {
          if (section === 'mapping' && key === 'type_levels') {
            inTypeLevels = true;
            typeLevels = { startIndex: i, endIndex: i, entries: new Map() };
          }
          subsection = null;
        }
        extendSection(i);
        continue;
      }
      if (section) {
        entries.set(`${section}.${key}`, { index: i, indent, key, raw });
      }
      extendSection(i);
      continue;
    }

    // indent >= 3: third level (defaults.spec.priority) or type_levels entry
    // that used a smaller indent than expected.
    if (section && subsection) {
      entries.set(`${section}.${subsection}.${key}`, { index: i, indent, key, raw });
      extendSection(i);
    }
  }

  return { lines, entries, sections, typeLevels };
}

function spliceLines(text, start, deleteCount, insertLines) {
  const lines = text.split('\n');
  lines.splice(start, deleteCount, ...insertLines);
  return lines.join('\n');
}

// Apply updates to a pingcode-config.yml text. Existing lines are rewritten in
// place (comments survive); missing keys are inserted at the end of their
// section, or appended as a new block when the section itself is missing.
// updates: { scalars: { dottedKey: string|boolean }, typeLevels: {name, level}|null }
function applyConfigValues(text, updates) {
  const scalars = updates.scalars || {};
  const wantLevels = updates.typeLevels && Object.keys(updates.typeLevels).length > 0
    ? { ...updates.typeLevels }
    : null;

  // Pass 1: rewrite existing scalar lines in place (no index shifts).
  let scan = scanConfig(text);
  const lines = scan.lines.slice();
  for (const [key, value] of Object.entries(scalars)) {
    const entry = scan.entries.get(key);
    if (entry) {
      lines[entry.index] = `${' '.repeat(entry.indent)}${entry.key}: ${formatScalar(value)}${entryComment(entry.raw)}`;
    }
  }
  let current = lines.join('\n');

  // Pass 2: insert scalars missing from the file, one key at a time.
  for (const [key, value] of Object.entries(scalars)) {
    scan = scanConfig(current);
    if (scan.entries.has(key)) continue;
    const segments = key.split('.');
    const top = segments[0];
    const sectionInfo = scan.sections.get(top);
    if (segments.length === 1) {
      if (sectionInfo) {
        // Bare `key:` header line already exists → give it a value.
        current = spliceLines(current, sectionInfo.startIndex, 1, [`${top}: ${formatScalar(value)}`]);
      } else {
        current = current ? `${current}\n${top}: ${formatScalar(value)}` : `${top}: ${formatScalar(value)}`;
      }
      continue;
    }
    const headers = [];
    for (let depth = 1; depth < segments.length - 1; depth++) {
      headers.push(`${'  '.repeat(depth)}${segments[depth]}:`);
    }
    const leaf = `${'  '.repeat(segments.length - 1)}${segments[segments.length - 1]}: ${formatScalar(value)}`;
    if (sectionInfo) {
      current = spliceLines(current, sectionInfo.endIndex + 1, 0, [...headers, leaf]);
    } else {
      const block = ['', `${top}:`, ...headers, leaf];
      current = current ? `${current}\n${block.join('\n')}` : block.join('\n');
    }
  }

  // Pass 3: the mapping.type_levels block.
  if (wantLevels) {
    scan = scanConfig(current);
    const block = ['  type_levels:'];
    for (const [name, level] of Object.entries(wantLevels)) {
      block.push(`    ${name}: ${level}`);
    }
    if (scan.typeLevels) {
      const count = scan.typeLevels.endIndex - scan.typeLevels.startIndex + 1;
      current = spliceLines(current, scan.typeLevels.startIndex, count, block);
    } else {
      const mapping = scan.sections.get('mapping');
      if (mapping) {
        current = spliceLines(current, mapping.endIndex + 1, 0, block);
      } else {
        const fullBlock = ['mapping:', ...block];
        current = current ? `${current}\n${fullBlock.join('\n')}` : fullBlock.join('\n');
      }
    }
  }

  return current;
}

function baseTemplateText(ext) {
  if (ext && ext.templatePath && fs.existsSync(ext.templatePath)) {
    try {
      return fs.readFileSync(ext.templatePath, 'utf8');
    } catch (_) {
      // Fall through to the embedded copy.
    }
  }
  return EMBEDDED_TEMPLATE;
}

// Read the current config values, or null when the file does not exist yet.
function readConfigValues(configPath) {
  if (!fs.existsSync(configPath)) return null;
  const text = fs.readFileSync(configPath, 'utf8');
  const scan = scanConfig(text);
  const values = {};
  for (const [key, entry] of scan.entries) {
    values[key] = parseScalar(entry.raw);
  }
  const typeLevels = {};
  if (scan.typeLevels) {
    for (const [name, level] of scan.typeLevels.entries) {
      typeLevels[name] = level;
    }
  }
  return { values, typeLevels, text };
}

// ── Suggestions ─────────────────────────────────────────────────────────

// Pick the requirement-tree type pool: requirement-group types first so the
// mapping tables (Spec/Story 映射到) offer the right candidates.
function suggestArtifacts(types) {
  const named = (types || []).filter((t) => t && typeof t.name === 'string' && t.name);
  const requirement = named.filter((t) => t.group === 'requirement');
  const pool = requirement.length > 0 ? requirement : named;
  return { pool };
}

// ── Interactive flow ────────────────────────────────────────────────────

function isAffirmativeOrEmpty(raw) {
  return /^\s*(y|yes)?\s*$/i.test(String(raw == null ? '' : raw));
}

// Run the per-key confirmation flow and write (or preview) the config file.
//   ask(prompt) -> string        free-text answers (readline-backed, level asks)
//   choose(label, items) -> item entity picker (arrow-select backed)
async function runConfigFlow({
  ext,
  project,
  sprint,
  product,
  productSelection,
  workspaceCache,
  ask,
  choose,
  dryRun = false,
}) {
  const existing = readConfigValues(ext.configPath);
  const old = existing ? existing.values : {};
  const oldTypeLevels = existing ? existing.typeLevels : {};
  const finalTypeLevels = {};
  const final = {};

  const projectId = core.itemId(project, 'project');

  const levelOf = (name) => {
    const canonical = classifyTypeLevel(name);
    if (canonical) return canonical;
    if (Object.prototype.hasOwnProperty.call(oldTypeLevels, name)) return oldTypeLevels[name];
    if (Object.prototype.hasOwnProperty.call(finalTypeLevels, name)) return finalTypeLevels[name];
    return null;
  };

  // Non-canonical type names need an explicit level (written to type_levels).
  async function resolveLevel(name) {
    for (;;) {
      const raw = ((await ask(`类型「${name}」不是规范名，归属需求树层级? ${LEVEL_PROMPT} `)) || '').trim();
      if (raw === '1' || raw === '2' || raw === '3') {
        const level = Number(raw);
        finalTypeLevels[name] = level;
        return level;
      }
    }
  }

  const types = core.pageValues((workspaceCache.work_item_types || {})[projectId])
    .filter((t) => t && typeof t.name === 'string' && t.name);

  // 1-3: 产品线/项目/迭代 all come straight from the main init selections —
  // no second interaction for any of them. Picking 留空 in the main init
  // clears the config sprint (runtime resolution chain takes over).
  final.product = productSelection === 'picked' && product
    ? core.displayName(product)
    : (productSelection === 'empty' ? '' : (old.product || ''));
  final.project = core.displayName(project);
  final.sprint = sprint ? core.displayName(sprint) : '';

  // 4-5: Spec/Story 映射 — always a table pick with the cursor pre-positioned
  // on the current value; level classification and adjacency validation apply.
  const pool = suggestArtifacts(types).pool;

  let specName = '';
  {
    const oldSpec = old['mapping.spec_artifact'] || '';
    let picked = null;
    try {
      picked = await choose('type', pool, {
        title: `Spec 映射到（当前：${displayValue(oldSpec)}）`,
        initialName: oldSpec,
      });
    } catch (_) {
      picked = null; // Esc → keep current value
    }
    specName = picked && typeof picked.name === 'string' && picked.name ? picked.name : oldSpec;
    if (!specName) {
      throw new core.PingCodeError('Spec 映射到不能为空（至少 spec 整体要建卡），已取消扩展配置初始化。');
    }
  }
  let specLevel = levelOf(specName);
  if (specLevel === null) specLevel = await resolveLevel(specName);

  let storyName = '';
  if (specLevel === 3) {
    console.log('Spec 映射到位于用户故事层（第 3 层），无相邻下一层，Story 映射到留空（单卡模式）。');
  } else {
    for (;;) {
      const oldStory = old['mapping.story_artifact'] || '';
      const emptyType = { __empty__: true, name: '（留空，不按章节建卡）' };
      let picked = null;
      try {
        picked = await choose('type', [...pool, emptyType], {
          title: `Story 映射到（当前：${displayValue(oldStory)}）`,
          initialName: oldStory,
        });
      } catch (_) {
        picked = null; // Esc → keep old value
      }
      const candidate = picked ? (picked.__empty__ ? '' : picked.name) : oldStory;
      if (candidate && candidate === specName) {
        console.log(`Story 映射到「${candidate}」与 Spec 映射到同名同级，必须落在其相邻下一层，请重选。`);
        continue;
      }
      if (candidate) {
        let level = levelOf(candidate);
        if (level === null) level = await resolveLevel(candidate);
        if (level !== specLevel + 1) {
          // Drop the just-cached level so re-picking the same name re-asks it
          // instead of looping on the rejected answer forever.
          delete finalTypeLevels[candidate];
          console.log(
            `「${candidate}」属于第 ${level} 层，与 Spec 映射到「${specName}」（第 ${specLevel} 层）`
            + `不相邻（必须为第 ${specLevel + 1} 层），请重选。`,
          );
          continue;
        }
      }
      storyName = candidate;
      break;
    }
  }
  final['mapping.spec_artifact'] = specName;
  final['mapping.story_artifact'] = storyName;

  // 优先级映射、默认优先级、收尾状态、同步开关不再在此初始化：这些键不进
  // `final`，applyConfigValues 便不会触碰既有文件的对应行（原样保留）。

  // Diff against the old file.
  const changed = [];
  for (const [key, value] of Object.entries(final)) {
    const previous = Object.prototype.hasOwnProperty.call(old, key) ? old[key] : '';
    if (String(previous) !== String(value)) {
      changed.push({ key, from: displayValue(previous), to: displayValue(value) });
    }
  }
  if (Object.keys(finalTypeLevels).length > 0
    && JSON.stringify(finalTypeLevels) !== JSON.stringify(oldTypeLevels)) {
    changed.push({
      key: 'mapping.type_levels',
      from: Object.keys(oldTypeLevels).length > 0 ? JSON.stringify(oldTypeLevels) : '(无)',
      to: JSON.stringify(finalTypeLevels),
    });
  }

  // Write (or preview). A pre-existing file is backed up to `.bak` first.
  let action = 'unchanged';
  let backup = null;
  let preview = null;
  if (changed.length > 0 || !existing) {
    const base = existing ? existing.text : baseTemplateText(ext);
    preview = applyConfigValues(base, {
      scalars: final,
      typeLevels: Object.keys(finalTypeLevels).length > 0 ? finalTypeLevels : null,
    });
    if (!dryRun) {
      if (existing) {
        backup = `${ext.configPath}.bak`;
        fs.copyFileSync(ext.configPath, backup);
      }
      fs.mkdirSync(ext.dir, { recursive: true });
      fs.writeFileSync(ext.configPath, preview);
    }
    action = existing ? 'updated' : 'created';
  }

  const summary = { config_path: ext.configPath, action, changed };
  if (backup) summary.backup = backup;
  if (dryRun) {
    summary.dry_run = true;
    if (preview !== null) summary.preview = preview;
  }
  return summary;
}

// Gate for `pingcode context init`. Decides whether the extension config step
// runs; never throws for ordinary skips (callers record the summary in their
// JSON result). interactive = real terminal on both stdin and stdout.
async function maybeConfigureExtension({
  client,
  project,
  sprint,
  product,
  productSelection,
  opts,
  interactive,
  getAsk,
  choose,
}) {
  if (opts.no_speckit_config) {
    return { detected: Boolean(findExtension()), action: 'skipped', reason: 'disabled' };
  }
  const ext = findExtension();
  if (!ext) {
    return { detected: false };
  }
  if (!interactive && !opts.speckit_config) {
    // Piped stdin (scripts, CI, the extension's own /speckit.pingcode.init
    // pipe) must keep working untouched.
    return { detected: true, action: 'skipped', reason: 'non_interactive' };
  }
  if (!interactive && opts.speckit_config) {
    throw new core.PingCodeError('--speckit-config 需要交互终端；管道模式下请去掉该参数运行。');
  }
  const ask = getAsk();
  const gate = (await ask('检测到 spec-kit-pingcode 扩展，是否同时初始化其配置？[Y/N] ')) || '';
  if (!isAffirmativeOrEmpty(gate)) {
    return { detected: true, action: 'skipped', reason: 'user_declined', config_path: ext.configPath };
  }
  const flow = await runConfigFlow({
    ext,
    project,
    sprint,
    product,
    productSelection,
    workspaceCache: client.workspaceCache,
    ask,
    choose,
    dryRun: Boolean(opts.dry_run),
  });
  return { detected: true, config_path: ext.configPath, ...flow };
}

module.exports = {
  PRODUCTS_PATH,
  EMBEDDED_TEMPLATE,
  findExtension,
  classifyTypeLevel,
  stripInlineComment,
  parseScalar,
  formatScalar,
  displayValue,
  scanConfig,
  applyConfigValues,
  baseTemplateText,
  readConfigValues,
  suggestArtifacts,
  runConfigFlow,
  maybeConfigureExtension,
};
