---
name: pingcode-cli-extender
description: 教 OpenCode 如何给 pingcode-cli 仓库新增 PingCode API CLI 操作及其对应 skill 参考文档。当用户提到“给 PingCode CLI 加命令/能力/操作”、“新增 PingCode API 操作”、“为某个 PingCode API 端点生成 CLI 和 skill 文档”、“扩展 pingcode-cli 功能”或任何类似意图时，立即触发此 skill。即使未明确说“新增命令”，只要请求涉及扩展 pingcode-cli 功能，就优先使用此 skill。
---

# pingcode-cli-extender

给 `pingcode-cli` 仓库新增一个 PingCode API CLI 命令模块，并同步更新对应的 `pingcode` skill 参考文档，让新能力能被 AI Agent 自然语言调用。

## 何时使用此 skill

只要用户请求涉及扩展 PingCode CLI 功能，就优先触发：

- “给 pingcode cli 加一个获取项目列表的命令”
- “新增 PingCode API 操作：查询项目/迭代/成员”
- “实现 pingcode project list”
- “为某个 PingCode API 端点生成 CLI 和 skill 文档”
- “在 skills/pingcode 里补充 XX 相关能力”
- “扩展 pingcode-cli，支持 XX”

## 前置检查

开始之前，先确认三件事：

1. **当前工作目录在 pingcode-cli 仓库根目录**（即存在 `scripts/pingcode.js`、`skills/pingcode/SKILL.md`、`package.json`）。
2. 用户是否已经给出要新增的 API 领域/端点/命令名。如果用户只说了模糊需求（如“加个项目的命令”），先问清楚：
   - PingCode API 端点是什么？（如 `GET /v1/projects`）
   - 需要哪些子命令？（如 `list`、`show`、`create`）
   - 关键参数有哪些？（如 `--name`、`--project`）
3. 如果用户提供了 PingCode 官方文档或 curl 示例，优先参考这些输入。

## 整体工作流

执行以下步骤，**不要跳过验证**：

1. **探索现有模式** — 读取仓库中已有的命令模块和 skill 参考文档，总结复用模式。
2. **设计命令结构** — 根据 API 端点和用户意图，确定模块名、子命令、参数。
3. **生成命令模块** — 创建 `scripts/commands/<domain>.js`。
4. **注册命令** — 在 `scripts/pingcode.js` 添加 `require('./commands/<domain>')`。
5. **生成 skill 参考文档** — 创建 `skills/pingcode/references/<domain>.md`。
6. **更新 skill 入口** — 更新 `skills/pingcode/SKILL.md` 的路由表、速查表和安全规则。
7. **（可选）生成测试** — 如果仓库已有同领域测试，生成 `tests/test_<domain>.js`。
8. **验证** — 运行 `node scripts/pingcode.js <domain> --help` 和 `npm test`，确保通过。

## 第 1 步：探索现有模式

读取以下文件，把它们当成模板：

- `scripts/pingcode.js` — 命令注册入口
- `scripts/commands/shared.js` — `registerModule` 注册表
- `scripts/commands/workitem.js` — 最复杂的命令模块，含子命令分发、参数解析、缓存查找
- `scripts/commands/context.js` — 子命令相对简单，含 set-current-* 操作
- `scripts/commands/auth.js` — 单命令模块，含 OAuth 流程
- `skills/pingcode/SKILL.md` — skill 入口和路由表
- `skills/pingcode/references/workitem.md` — 参考文档示例
- `skills/pingcode/references/ctx.md` — 较简单的参考文档示例
- `package.json` — 确认 `files` 字段是否包含新增目录（`skills/pingcode/references/` 是目录通配，通常无需修改）

## 第 2 步：设计命令结构

模块名用英文小写，多个单词用 `-` 连接，例如 `project`、`sprint`、`wiki-page`。不要与现有模块重名。

每个模块通常包含：

- `printHelp()` — 模块级帮助
- `printXxxHelp()` — 子命令级帮助（可选）
- `parseXxxArgs(tokens)` — 参数解析
- `createClient(opts)` — 创建 `core.PingCodeClient`
- 若干 `handleXxx` / `runXxx` 处理函数
- `async function run(argv, inputFunc)` — 模块入口，分发子命令
- `shared.registerModule('<domain>', { name: '<domain>', description: '...', run })`

### 全局选项约定

命令模块必须支持这些全局选项（参考 `workitem.js` 的 `defaultGlobalOpts`）：

- `--base-url`
- `--client-id`
- `--client-secret`
- `--token`
- `--user-id`
- `--user-name`
- `--workspace-cache`
- `--no-workspace-cache`
- `--token-cache`（如有必要）
- `--no-token-cache`（如有必要）
- `--dry-run`
- `--compact`（list/show 命令）
- `--grant-type`

布尔选项用 `Set`，字符串选项用映射表（如 `STRING_FLAGS`）。未知选项要抛 `core.PingCodeError('Unknown option: ...')`。

### 输出约定

- list/show/get 等查询结果用 `core.printJson(...)` 输出 JSON。
- 错误信息用 `throw new core.PingCodeError('...')`。
- 写操作优先支持 `--dry-run`，返回 `{ dry_run: true, ... }`。

### 安全约定

- 不要猜测 ID。名称 → ID 的解析优先使用工作区缓存（`core.findCachedItem`）。
- 写操作（create/update/delete）默认先 `--dry-run` 预览。
- 不要回显令牌、client_secret。
- HTTP 429 限流：读取 `x-pc-retry-after` 后等待重试。

## 第 3 步：生成命令模块

创建 `scripts/commands/<domain>.js`。按以下模板组织：

```javascript
'use strict';

const core = require('../core');
const shared = require('./shared');

const BOOLEAN_FLAGS = new Set([
  '--dry-run', '--compact', // 根据实际命令添加
]);

const STRING_FLAGS = {
  '--base-url': 'base_url',
  '--client-id': 'client_id',
  '--client-secret': 'client_secret',
  // 其他参数映射
};

function parseArgs(tokens) {
  const opts = {
    base_url: process.env.PINGCODE_BASE_URL || core.DEFAULT_BASE_URL,
    client_id: process.env.PINGCODE_CLIENT_ID || null,
    client_secret: process.env.PINGCODE_CLIENT_SECRET || null,
    dry_run: false,
    compact: false,
  };
  let helpRequested = false;
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg === '--help' || arg === '-h') { helpRequested = true; continue; }
    if (BOOLEAN_FLAGS.has(arg)) {
      opts[arg.replace(/^--/, '').replace(/-/g, '_')] = true;
      continue;
    }
    if (arg.startsWith('--')) {
      // 解析 --flag value 或 --flag=value
      const eqIndex = arg.indexOf('=');
      let flag, value;
      if (eqIndex !== -1) { flag = arg.slice(0, eqIndex); value = arg.slice(eqIndex + 1); }
      else {
        flag = arg;
        if (i + 1 < tokens.length) { value = tokens[i + 1]; i += 1; }
        else throw new core.PingCodeError(`Flag ${flag} requires a value`);
      }
      if (!(flag in STRING_FLAGS)) throw new core.PingCodeError(`Unknown option: ${flag}`);
      opts[STRING_FLAGS[flag]] = value;
      continue;
    }
    // 位置参数处理
  }
  return { opts, helpRequested, positionals: [] };
}

function createClient(opts) {
  return new core.PingCodeClient({
    base_url: opts.base_url,
    client_id: opts.client_id,
    client_secret: opts.client_secret,
  });
}

function printHelp() {
  console.log([
    'PingCode <domain> — <description>',
    '',
    'Usage: pingcode <domain> <subcommand> [options]',
    '',
    'Subcommands:',
    '  list    List ...',
    '  show    Show ...',
    '',
    'Run `pingcode <domain> <subcommand> --help` for subcommand-specific usage.',
  ].join('\n'));
}

async function run(argv) {
  const tokens = argv || [];
  if (tokens.length === 0 || tokens[0] === '--help' || tokens[0] === '-h') {
    printHelp();
    return;
  }
  // 子命令分发
}

shared.registerModule('<domain>', {
  name: '<domain>',
  description: '<description>',
  run,
});

module.exports = { run, printHelp, parseArgs, createClient };
```

实际生成时替换 `<domain>` 和 `<description>`，并根据 API 增删字段和子命令。

## 第 4 步：注册命令

在 `scripts/pingcode.js` 的 module registry 区域，添加一行：

```javascript
require('./commands/<domain>');
```

放在现有 `require('./commands/...)` 行附近，保持按字母顺序更佳。

## 第 5 步：生成 skill 参考文档

创建 `skills/pingcode/references/<domain>.md`，用中文编写。结构参考 `workitem.md`：

```markdown
# <中文领域名>

通过 `pingcode <domain>` 子命令 ...。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

## 命令

```bash
# 示例命令
pingcode <domain> list --compact
pingcode <domain> show ID
```

## 操作流程

1. ...
2. ...

## 安全规则

- 禁止猜测 `xxx_id`。
- 写操作优先 `--dry-run`。
- 不要回显令牌。
```

## 第 6 步：更新 skill 入口

编辑 `skills/pingcode/SKILL.md`：

1. **路由表**：新增一行，说明该领域对应哪个 reference 文件。例如：
   - `项目/产品/成员查询 → 阅读 references/project.md`
2. **自然语言速查表**：新增用户请求到 CLI 命令的映射。
3. **安全规则**：如果新领域有特殊安全规则，补充到“安全规则”小节。
4. **快速开始 / 能力范围**：如新增能力属于常用场景，可简要提及。

修改时保持原有风格，用中文，使用表格和代码块。

## 第 7 步：生成测试（可选但推荐）

如果仓库中已有同领域测试或测试基础设施完善，创建 `tests/test_<domain>.js`。参考 `tests/test_workitem.js` / `tests/test_context.js`：

- 使用 `node --test` 内置测试框架（`describe/it` 或 `test`）。
- 测试参数解析函数（`parseArgs`）的边界情况。
- 测试 help 输出包含关键信息。
- 对需要网络调用的 API，使用 mock client 或仅测试解析/输出逻辑。

## 第 8 步：验证

必须完成以下检查，并在最终回复中报告结果：

1. `node scripts/pingcode.js <domain> --help` 能正常输出帮助。
2. 如果生成了子命令 help：`node scripts/pingcode.js <domain> <subcommand> --help` 能正常输出。
3. `node -c scripts/commands/<domain>.js` 语法检查通过。
4. `node scripts/pingcode.js` 顶层帮助中能看到新模块。
5. `npm test` 通过（或至少没有因为本次修改而新增失败）。
6. 如果新增了 `skills/pingcode/references/<domain>.md`，确认 `skills/pingcode/SKILL.md` 已正确引用它。

## 常见错误处理

- 缺少 `PINGCODE_CLIENT_ID` / `PINGCODE_CLIENT_SECRET`：输出仓库 README 中的配置指引，不要索取用户粘贴 secret。
- 模块名与现有模块冲突：询问用户是否要覆盖，默认重命名或拒绝。
- 生成文件后 `npm test` 失败：先修复失败再向用户报告完成。
- 用户意图模糊：先确认 API 端点和子命令，不要直接猜测生成。

## 输出汇报

完成所有步骤后，向用户汇报：

- 新增/修改了哪些文件；
- 新命令的用法示例（1-2 个）；
- 验证结果（`--help` 输出、`npm test` 结果）。
