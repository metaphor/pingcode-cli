'use strict';

const readline = require('node:readline');

const core = require('../core');
const shared = require('./shared');
const speckitExtension = require('../speckit_extension');

// ── Interactive selection ──────────────────────────────────────────

// Width-aware truncation/padding lives in shared (arrowSelect); the selector
// below only maps PingCode entities to display labels.

// Single-line description of a choice. Ids are intentionally omitted from the
// interactive menus; each label keeps only its human-relevant details:
//   project → `name (identifier)`, sprint → `name`, user → `name (account, email)`.
function describeChoice(label, item) {
  const entity = core.normalizedEntity(item);
  const name = core.displayName(item);
  const details = [];
  if (label === 'project') {
    if (typeof entity.identifier === 'string' && entity.identifier) {
      details.push(entity.identifier);
    }
  } else if (label === 'user') {
    if (typeof entity.name === 'string' && entity.name && entity.name !== name) {
      details.push(entity.name);
    }
    if (typeof entity.email === 'string' && entity.email) {
      details.push(entity.email);
    }
  }
  const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';
  return `${name}${suffix}`;
}

// TTY menus render as radio-style ASCII tables; each label defines its
// columns. Project gains the identifier prefix column, per the extension UI.
const TABLE_SPECS = {
  project: {
    columns: [{ header: '项目' }, { header: '编号' }, { header: 'ID' }],
    cells: (item) => {
      const entity = core.normalizedEntity(item);
      return [core.displayName(item), entity.identifier || '', entity.id || ''];
    },
  },
  sprint: {
    columns: [{ header: '迭代' }, { header: 'ID' }],
    cells: (item) => {
      const entity = core.normalizedEntity(item);
      return [core.displayName(item), entity.id || ''];
    },
  },
  user: {
    columns: [{ header: '用户' }, { header: '账号' }],
    cells: (item) => {
      const entity = core.normalizedEntity(item);
      return [core.displayName(item), entity.name || ''];
    },
  },
  product: {
    columns: [{ header: '产品线' }, { header: 'ID' }],
    cells: (item) => {
      const entity = core.normalizedEntity(item);
      return [core.displayName(item), entity.id || ''];
    },
  },
  type: {
    columns: [{ header: '类型' }, { header: 'ID' }],
    cells: (item) => {
      const entity = core.normalizedEntity(item);
      return [core.displayName(item), entity.id || ''];
    },
  },
};

async function promptChoice(label, items, inputFunc, options = {}) {
  if (!items || items.length === 0) {
    throw new core.PingCodeError(`No ${label} options are available`);
  }
  if (typeof inputFunc === 'function') {
    return textPromptChoice(label, items, inputFunc);
  }
  if (process.stdin.isTTY && process.stdout.isTTY) {
    const spec = TABLE_SPECS[label];
    if (spec) {
      // initialName pre-positions the cursor on the row whose entity name
      // matches (the current config value); empty matches the 留空 row.
      let initialIndex = 0;
      if (options.initialName !== undefined) {
        const wanted = String(options.initialName || '');
        const exact = items.findIndex((item) => String((item && item.name) || '') === wanted);
        if (exact >= 0) {
          initialIndex = exact;
        } else {
          const emptyRow = items.findIndex((item) => item && item.__empty__);
          if (emptyRow >= 0 && wanted === '') initialIndex = emptyRow;
        }
      }
      return shared.arrowTable({
        title: options.title || `Select current ${label}`,
        columns: spec.columns,
        rows: items.map((item) => ({ value: item, cells: spec.cells(item) })),
        initialIndex,
      });
    }
    return arrowPromptChoice(label, items, options);
  }
  throw new core.PingCodeError(
    `Selecting a ${label} requires an interactive terminal, and no input source is available.`
  );
}

// Fallback for non-interactive callers (piped stdin, tests, programmatic
// input): print a numbered list and accept a number, id, or name as text.
async function textPromptChoice(label, items, inputFunc) {
  console.log(`\nSelect current ${label}:`);
  for (let index = 0; index < items.length; index++) {
    console.log(`  ${index + 1}. ${describeChoice(label, items[index])}`);
  }

  while (true) {
    const raw = await inputFunc(`Enter ${label} number, id, or name: `);
    if (raw === null || raw === undefined) {
      throw new core.PingCodeError(`No ${label} selected: input stream ended`);
    }
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) {
      const index = parseInt(trimmed, 10);
      if (index >= 1 && index <= items.length) {
        return items[index - 1];
      }
    }
    try {
      return core.findCachedItem(items, trimmed, label);
    } catch (exc) {
      console.log(`Invalid ${label} selection: ${exc.message}`);
    }
  }
}

// Interactive selector: ↑/↓ to move, Enter to confirm, Esc/Ctrl+C to cancel.
// With `columns` > 1 the items render as a row-major grid navigated with all
// four arrow keys (grid moves clamp at the edges; a single column wraps).
// Rendering and key handling live in shared.arrowSelect; streams are
// injectable so tests can drive key events without a real TTY.
async function arrowPromptChoice(label, items, { input = process.stdin, output = process.stdout, columns = 1 } = {}) {
  return shared.arrowSelect({
    title: `Select current ${label}`,
    options: items.map((item) => ({ value: item, label: describeChoice(label, item) })),
    columns,
    input,
    output,
  });
}

async function fetchProjects(client, refresh = false) {
  if (refresh || !client.workspaceCache.projects || typeof client.workspaceCache.projects !== 'object') {
    return await core.cacheProjects(client);
  }
  return client.workspaceCache.projects;
}

async function fetchSprints(client, projectId, refresh = false) {
  const sprintsCache = client.workspaceCache.sprints || {};
  if (refresh || !sprintsCache[projectId] || typeof sprintsCache[projectId] !== 'object') {
    return await core.cacheSprints(client, projectId);
  }
  return sprintsCache[projectId];
}

async function fetchUsers(client, projectId, refresh = false) {
  const usersCache = client.workspaceCache.users;
  // The users cache is project-scoped: a payload without a matching project_id
  // marker (e.g. a stale global directory listing) must never be trusted.
  if (
    refresh ||
    !usersCache ||
    typeof usersCache !== 'object' ||
    usersCache.project_id !== projectId
  ) {
    return await core.cacheUsers(client, projectId);
  }
  return usersCache;
}

// Prefetching dictionaries is best effort: writing the preferences is the
// primary action and must not fail because an optional fetch did. Failures are
// reported on stderr and in the command's JSON result rather than swallowed.
// Every dictionary the init/extension flow needs already cached for this
// project AND refreshed within the TTL? Then the whole refresh chain can be
// skipped — that is what makes repeated `context init` runs instant instead
// of ~10-20s of serial API calls. A complete-but-stale cache is refreshed:
// blind trust in dictionaries causes silent downstream failures (stale state
// names, missing priorities) that only surface at `workitem create` time.
function dictionariesCached(client, projectId) {
  const cache = client.workspaceCache || {};
  const types = core.pageValues((cache.work_item_types || {})[projectId]);
  if (types.length === 0) return false;
  if (core.pageValues((cache.work_item_priorities || {})[projectId]).length === 0) return false;
  const states = cache.work_item_states || {};
  for (const type of types) {
    const typeId = core.normalizedEntity(type).id;
    if (typeof typeId !== 'string' || !typeId) return false;
    if (core.pageValues(states[`${projectId}::${typeId}`]).length === 0) return false;
  }
  const stamped = Date.parse(cache.dictionary_cached_at || '');
  if (!Number.isFinite(stamped)) return false;
  return Date.now() - stamped < core.DICTIONARY_CACHE_TTL_MS;
}

async function tryCacheProjectDictionaries(client, projectId, refresh = false, hardAuth = false) {
  if (typeof projectId !== 'string' || !projectId) {
    return { cached: false, reason: 'no project id resolved' };
  }
  if (!refresh && dictionariesCached(client, projectId)) {
    return { cached: true, reused: true };
  }
  try {
    await core.cacheProjectDictionaries(client, projectId);
    return { cached: true };
  } catch (exc) {
    // `context init` treats auth as a hard requirement (it cannot pick
    // anything without dictionaries); `context set-current-*` stay offline
    // friendly and only warn.
    if (hardAuth && core.isAuthError(exc)) {
      throw new core.PingCodeError('未登录或认证已失效，请先执行: pingcode auth login');
    }
    console.error(`warning: could not cache work item dictionaries: ${exc.message}`);
    return { cached: false, reason: exc.message };
  }
}

async function cacheContext(client, project, sprint, user, product, dictionaries, productSelection) {
  if (!client.workspaceCache.preferences) client.workspaceCache.preferences = {};
  const preferences = client.workspaceCache.preferences;
  preferences.current_project_id = core.itemId(project, 'project');
  preferences.current_project_name = core.displayName(project);
  if (sprint) {
    preferences.current_sprint_id = core.itemId(sprint, 'sprint');
    preferences.current_sprint_name = core.displayName(sprint);
  } else {
    // Explicitly cleared: drop stale sprint preferences so runtime resolution
    // (args > config > in-progress sprint discovery) is not shadowed.
    delete preferences.current_sprint_id;
    delete preferences.current_sprint_name;
  }
  preferences.current_user_id = core.itemId(user, 'user');
  preferences.current_user_name = core.displayName(user);
  if (productSelection === 'picked' && product) {
    preferences.current_product_id = core.itemId(product, 'product');
    preferences.current_product_name = core.displayName(product);
  }
  // productSelection !== 'picked'（管道输入跳过）时保留已有产品偏好。
  client.saveWorkspaceCache();
  return {
    message: 'PingCode workspace context cached',
    workspace_cache: client.workspaceCachePath || null,
    preferences,
    dictionaries_cached: Boolean(dictionaries && dictionaries.cached),
    ...(dictionaries && dictionaries.reason ? { dictionaries_error: dictionaries.reason } : {}),
  };
}

// ── Help ───────────────────────────────────────────────────────────

function printHelp(subcommand) {
  if (subcommand === 'init') {
    console.log([
      'Usage: pingcode context init [options]',
      '',
      'Interactively configure PingCode workspace context.',
      'Prompts for product line, project, sprint/iteration, and user',
      '(arrow keys + Enter), then writes the results to the workspace cache.',
      'Falls back to text input when stdin is not a terminal.',
      '',
      'If a spec-kit-pingcode extension is detected around the working',
      'directory (.specify/extensions/pingcode/), init also offers to configure',
      'the extension\'s pingcode-config.yml: every key is confirmed individually',
      'as old -> new, and the previous file is backed up to .bak. Skipped',
      'automatically when stdin is not a terminal (piped input keeps working).',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
      '  --refresh                Re-fetch dictionaries from API',
      '  --speckit-config         Force the extension config step (terminal required)',
      '  --no-speckit-config      Skip the extension config step',
    ].join('\n'));
    return;
  }

  if (subcommand === 'list') {
    console.log([
      'Usage: pingcode context list [options]',
      '',
      'Print current workspace preferences and a summary of cached dictionaries.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
    ].join('\n'));
    return;
  }

  if (subcommand === 'set-current-user') {
    console.log([
      'Usage: pingcode context set-current-user <id|name|@me> [options]',
      '',
      'Set the current PingCode user for this workspace.',
      '',
      'Arguments:',
      '  <id|name|@me>   User ID, cached user name/display name, or @me to use the',
      '                   already-cached current user ID.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache (requires env vars)',
      '  --dry-run                Show what would be set without writing',
    ].join('\n'));
    return;
  }

  if (subcommand === 'set-current-project') {
    console.log([
      'Usage: pingcode context set-current-project <id|name> [options]',
      '',
      'Set the current PingCode project for this workspace.',
      '',
      'Arguments:',
      '  <id|name>   Project ID or cached project name.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
      '  --dry-run                Show what would be set without writing',
    ].join('\n'));
    return;
  }

  if (subcommand === 'set-current-sprint') {
    console.log([
      'Usage: pingcode context set-current-sprint <id|name> [options]',
      '',
      'Set the current PingCode sprint/iteration for this workspace.',
      '',
      'Arguments:',
      '  <id|name>   Sprint ID or cached sprint name.',
      '',
      'Options:',
      '  --workspace-cache PATH   Cache file path',
      '  --no-workspace-cache     Disable workspace cache',
      '  --dry-run                Show what would be set without writing',
    ].join('\n'));
    return;
  }

  // Default: module-level help
  console.log([
    'PingCode context — Manage workspace context',
    '',
    'Usage: pingcode context <subcommand> [options]',
    '',
    'Subcommands:',
    '  init                     Initialize workspace context (interactive)',
    '  set-current-user <id>    Set the current user (id, name, or @me)',
    '  set-current-project <id> Set the current project (id or name)',
    '  set-current-sprint <id>  Set the current sprint/iteration (id or name)',
    '  list                     Show current preferences and cached dictionary summary',
    '',
    'Examples:',
    '  # 交互式初始化工作区上下文（项目/迭代/用户）',
    '  pingcode context init',
    '  # 设置当前项目',
    '  pingcode context set-current-project DEMO',
    '  # 查看当前上下文与缓存字典',
    '  pingcode context list',
    '',
    'Global options:',
    '  --base-url URL           PingCode base URL',
    '  --workspace-cache PATH   Workspace cache file path',
    '  --no-workspace-cache     Disable workspace cache',
    '  --dry-run                Show what would be done without executing',
    '  --grant-type TYPE        OAuth grant type: client_credentials, authorization_code, or auto (default; uses cached token type)',
    '  --help                   Show this help',
  ].join('\n'));
}

// ── Parser ─────────────────────────────────────────────────────────

function parseContextArgs(tokens) {
  const { opts, remaining } = shared.parseGlobalOptions(tokens, [
    '--refresh',
    '--speckit-config',
    '--no-speckit-config',
  ]);

  const helpRequested = remaining.includes('--help') || remaining.includes('-h');
  const positionals = remaining.filter(a => !a.startsWith('-'));

  return {
    subcommand: positionals[0] || null,
    value: positionals[1] || null,
    opts,
    helpRequested,
  };
}

// ── Client ─────────────────────────────────────────────────────────

const createClient = shared.clientFromOpts;

// ── Dictionary counts (copied from config.js; not exported from core) ──

function countDictionaryEntries(cache) {
  const counts = {};

  const users = core.pageValues(cache.users);
  counts.users = users.length;

  const projects = core.pageValues(cache.projects);
  counts.projects = projects.length;

  let sprintTotal = 0;
  for (const v of Object.values(cache.sprints || {})) {
    sprintTotal += core.pageValues(v).length;
  }
  counts.sprints = sprintTotal;

  let typesTotal = 0;
  for (const v of Object.values(cache.work_item_types || {})) {
    typesTotal += core.pageValues(v).length;
  }
  counts.work_item_types = typesTotal;

  let statesTotal = 0;
  for (const v of Object.values(cache.work_item_states || {})) {
    statesTotal += core.pageValues(v).length;
  }
  counts.work_item_states = statesTotal;

  let prioTotal = 0;
  for (const v of Object.values(cache.work_item_priorities || {})) {
    prioTotal += core.pageValues(v).length;
  }
  counts.work_item_priorities = prioTotal;

  let propsTotal = 0;
  for (const v of Object.values(cache.work_item_properties || {})) {
    propsTotal += core.pageValues(v).length;
  }
  counts.work_item_properties = propsTotal;

  let ideaStatesTotal = 0;
  for (const v of Object.values(cache.idea_states || {})) {
    ideaStatesTotal += core.pageValues(v).length;
  }
  counts.idea_states = ideaStatesTotal;

  let ideaPrioTotal = 0;
  for (const v of Object.values(cache.idea_priorities || {})) {
    ideaPrioTotal += core.pageValues(v).length;
  }
  counts.idea_priorities = ideaPrioTotal;

  return counts;
}

// ── Handlers ───────────────────────────────────────────────────────

async function selectProduct(client, choose) {
  // TTY-only step; 产品线为必选项。获取失败或企业无产品线时直接终止并给出
  // 指引，而不是留空继续。
  let products = [];
  try {
    const resp = await client.request('GET', speckitExtension.PRODUCTS_PATH, {}, null, {
      dry_run: false,
      use_workspace_cache: false,
    });
    products = core.pageValues(resp).filter((p) => p && typeof p.name === 'string' && p.name);
  } catch (exc) {
    if (core.isAuthError(exc)) {
      throw new core.PingCodeError('未登录或认证已失效，请先执行: pingcode auth login');
    }
    throw new core.PingCodeError(
      `无法获取产品线列表：${exc.message}。产品线为必选项，请检查网络或产品域权限后重试。`,
    );
  }
  if (products.length === 0) {
    throw new core.PingCodeError('当前企业没有可选的产品线。产品线为必选项，请先在 PingCode 创建产品线后重试。');
  }
  const picked = await choose('product', products);
  return { selection: 'picked', product: picked };
}

async function handleInit(opts, inputFunc) {
  const client = createClient(opts);
  const refresh = Boolean(opts.refresh);

  // Arrow-key selector needs a real terminal on both ends; tests and callers
  // with an injected inputFunc use the text fallback instead.
  const useArrowSelector = typeof inputFunc !== 'function'
    && Boolean(process.stdin.isTTY && process.stdout.isTTY);

  let rl = null;
  let speckitRl = null;
  if (!useArrowSelector && typeof inputFunc !== 'function') {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    inputFunc = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));
  }

  try {
    const choose = useArrowSelector
      ? (label, list, options) => promptChoice(label, list, undefined, options)
      : (label, list) => promptChoice(label, list, inputFunc);
    // 选择顺序：产品线（必选）→ 项目 → 迭代（可留空）→ 用户。产品线为
    // TTY-only（管道脚本保持 3 行契约，保留已有产品偏好）；获取失败直接终止。
    // 认证失败统一转换为一条可执行指引，而不是裸 HTTP 错误中断。
    let productSelection;
    let product;
    let project;
    let sprint;
    let user;
    try {
      ({ selection: productSelection, product } = useArrowSelector
        ? await selectProduct(client, choose)
        : { selection: 'skipped', product: null });
      project = await choose('project', core.pageValues(await fetchProjects(client, refresh)));
      const projectId = core.itemId(project, 'project');
      // Sprint is allowed to stay empty: a trailing sentinel row resolves to
      // null, which clears stale current_sprint_* preferences so the runtime
      // resolution chain (args > config > in-progress discovery) takes over.
      const sprintChoice = await choose('sprint', [
        ...core.pageValues(await fetchSprints(client, projectId, refresh)),
        { __empty__: true, name: '（留空，运行时动态解析）' },
      ]);
      sprint = sprintChoice && sprintChoice.__empty__ ? null : sprintChoice;
      user = await choose('user', core.pageValues(await fetchUsers(client, projectId, refresh)));
      var dictionaries = await tryCacheProjectDictionaries(client, projectId, refresh, true);
    } catch (exc) {
      if (core.isAuthError(exc)) {
        throw new core.PingCodeError('未登录或认证已失效，请先执行: pingcode auth login');
      }
      throw exc;
    }
    await cacheContext(client, project, sprint, user, product, dictionaries, productSelection);

    // spec-kit-pingcode extension config: best effort, never fails the init.
    // Runs only in a real terminal; piped stdin keeps its documented contract.
    let speckitSummary = null;
    try {
      speckitSummary = await speckitExtension.maybeConfigureExtension({
        client,
        project,
        sprint,
        product,
        productSelection,
        opts,
        interactive: useArrowSelector,
        getAsk: () => {
          if (!speckitRl) {
            speckitRl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });
          }
          return (prompt) => new Promise((resolve) => {
            // Raw-mode menus (arrowSelect/arrowTable) pause stdin on settle;
            // a paused stdin neither delivers answers nor keeps the event
            // loop alive, so a pending question would silently exit. Resume
            // before every question.
            process.stdin.resume();
            speckitRl.question(prompt, resolve);
          });
        },
        choose: (label, list, options) => promptChoice(label, list, undefined, options),
      });
    } catch (exc) {
      console.error(`warning: spec-kit-pingcode 扩展配置未完成: ${exc.message}`);
    }
    if (speckitSummary && speckitSummary.preview) {
      // --dry-run: show the config that would be written.
      console.log(speckitSummary.preview);
    }

    console.log('配置已完成！');
  } finally {
    if (rl) rl.close();
    if (speckitRl) speckitRl.close();
  }
}

async function handleSetCurrentUser(value, opts) {
  if (!value) {
    throw new core.PingCodeError(
      'Usage: context set-current-user <id|name|@me>\n' +
      '  <id>         Direct user ID\n' +
      '  <name>       Cached user name or display name\n' +
      '  @me          Use the already-cached current user ID',
    );
  }

  const client = createClient(opts);

  // Expand @me placeholder to the cached current user ID.
  let userId = value;
  if (value === '@me') {
    userId = core.currentUserId(null, client.workspaceCache);
  }

  if (opts.dry_run) {
    core.printJson({
      dry_run: true,
      action: 'set-current-user',
      input: value,
      resolved_user_id: userId,
    });
    return;
  }

  const result = await core.setCurrentUser(client, userId);
  core.printJson(result);
}

async function handleSetCurrentProject(value, opts) {
  if (!value) {
    throw new core.PingCodeError(
      'Usage: context set-current-project <id|name>',
    );
  }

  const client = createClient(opts);

  if (opts.dry_run) {
    // Try to resolve the project ID from the cache for dry-run display.
    let resolvedId = value;
    const projects = core.pageValues(client.workspaceCache.projects);
    try {
      const found = core.findCachedItem(projects, value, 'project');
      if (found && found.id) resolvedId = found.id;
    } catch (_) {
      // Keep the raw value if resolution fails.
    }
    core.printJson({
      dry_run: true,
      action: 'set-current-project',
      input: value,
      resolved_project_id: resolvedId,
    });
    return;
  }

  // Resolving a project by name needs the projects dictionary, so make sure it
  // is cached before delegating; otherwise the raw name would be stored as id.
  // Offline/unreachable tenants keep the previous cache-only behaviour.
  try {
    await fetchProjects(client, false);
  } catch (exc) {
    console.error(`warning: could not refresh the project list: ${exc.message}`);
  }
  const result = await core.setCurrentProject(client, value);
  const resolvedProjectId = (result.preferences || {}).current_project_id;
  const dictionaries = await tryCacheProjectDictionaries(client, resolvedProjectId);
  result.dictionaries_cached = Boolean(dictionaries.cached);
  if (dictionaries.reason) result.dictionaries_error = dictionaries.reason;
  core.printJson(result);
}

async function handleSetCurrentSprint(value, opts) {
  if (!value) {
    throw new core.PingCodeError(
      'Usage: context set-current-sprint <id|name>',
    );
  }

  const client = createClient(opts);

  if (opts.dry_run) {
    // Try to resolve the sprint ID from the cache for dry-run display.
    let resolvedId = value;
    const allSprints = [];
    for (const payload of Object.values(client.workspaceCache.sprints || {})) {
      allSprints.push(...core.pageValues(payload));
    }
    try {
      const found = core.findCachedItem(allSprints, value, 'sprint');
      if (found && found.id) resolvedId = found.id;
    } catch (_) {
      // Keep the raw value if resolution fails.
    }
    core.printJson({
      dry_run: true,
      action: 'set-current-sprint',
      input: value,
      resolved_sprint_id: resolvedId,
    });
    return;
  }

  const result = await core.setCurrentSprint(client, value);
  core.printJson(result);
}

async function handleList(opts) {
  const client = createClient(opts);
  const cache = client.workspaceCache;

  const preferences = cache.preferences || {};

  core.printJson({
    preferences,
    dictionaries: countDictionaryEntries(cache),
  });
}

// ── Run ────────────────────────────────────────────────────────────

const VALID_SUBCOMMANDS = new Set([
  'init', 'set-current-user', 'set-current-project', 'set-current-sprint', 'list',
]);

async function run(argv) {
  const tokens = argv || [];

  // No args or first arg is help → module-level help.
  if (tokens.length === 0 || tokens[0] === '--help' || tokens[0] === '-h') {
    printHelp();
    return;
  }

  const parsed = parseContextArgs(tokens);

  // If --help was found anywhere, show help for the subcommand if known.
  if (parsed.helpRequested) {
    printHelp(parsed.subcommand);
    return;
  }

  const subcommand = parsed.subcommand;

  if (!subcommand || !VALID_SUBCOMMANDS.has(subcommand)) {
    throw new core.PingCodeError(
      `Unknown context subcommand: ${subcommand || '(none)'}. Use context --help for usage.`
    );
  }

  switch (subcommand) {
    case 'init':
      await handleInit(parsed.opts);
      break;
    case 'set-current-user':
      await handleSetCurrentUser(parsed.value, parsed.opts);
      break;
    case 'set-current-project':
      await handleSetCurrentProject(parsed.value, parsed.opts);
      break;
    case 'set-current-sprint':
      await handleSetCurrentSprint(parsed.value, parsed.opts);
      break;
    case 'list':
      await handleList(parsed.opts);
      break;
    default:
      throw new core.PingCodeError(`Unknown context subcommand: ${subcommand}`);
  }
}

// ── Register ───────────────────────────────────────────────────────

shared.registerModule('context', {
  name: 'context',
  description: 'Manage PingCode workspace context',
  run,
});

module.exports = { run, printHelp, parseContextArgs, createClient, promptChoice, arrowPromptChoice, displayWidth: shared.displayWidth };
