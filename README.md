# PingCode CLI

用于让 Codex、Claude 等 AI agent 通过 PingCode 官方 REST API 操作项目管理和产品管理数据的 Node.js CLI 与 skill。

## 安装

```bash
npx pingcode-cli@latest
```

一条命令会检测当前用户已存在的 Codex / Claude Code / OpenClaw / Hermes 目录，并只安装到这些已有 Agent：

```text
~/.codex/skills/pingcode                          (+ pingcode-ctx)
~/.claude/skills/pingcode                         (+ pingcode-ctx)
~/.openclaw/skills/pingcode                       (+ pingcode-ctx)
~/.hermes/skills/project-management/pingcode      (+ pingcode-ctx)
```

任何一个已选择目录写入失败（权限、磁盘等问题）不会阻断其他目录，安装结束时会打印每个目录的成功/失败/跳过摘要。

如果设置了 `CODEX_HOME`，Codex 目录会变成 `$CODEX_HOME/skills/pingcode`；其他三个目录的位置不受该变量影响。

安装完成后，配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

创建或查询工作项时，如果没有明确指定“所有人”或其他负责人，CLI 会默认使用当前用户，因此建议同时配置用户身份：

```bash
export PINGCODE_USER_NAME="你的 PingCode 用户名或显示名"
export PINGCODE_USER_ID="你的 PingCode 用户 ID"
```

### 更新

升级到最新版本（覆盖当前用户已存在 Agent 的默认目录）：

```bash
npx pingcode-cli@latest --force
```

### 高级用法

只安装到某一个 Agent：

```bash
npx pingcode-cli@latest --codex-only --force
npx pingcode-cli@latest --claude-only --force
npx pingcode-cli@latest --openclaw-only --force
npx pingcode-cli@latest --hermes-only --force
```

安装到自定义目录（例如项目本地的 `.claude/skills/pingcode`）：

```bash
npx pingcode-cli@latest --target ".claude/skills/pingcode" --force
npx pingcode-cli@latest --target "$HOME/.codex/skills/pingcode" --force
```

`--target` 与 `--codex-only` / `--claude-only` / `--openclaw-only` / `--hermes-only` 互斥；指定 `--target` 后只会安装到给定目录，不再走多 Agent 默认流程。

## 复制给 AI Agent 的安装提示词

把下面这段提示词复制给你的 AI Agent，让它在你的本机环境里完成安装：

```text
请帮我安装 PingCode CLI，让当前 AI Agent 可以通过 PingCode 官方 REST API 查询和操作项目/产品数据。

安装要求：
1. 直接运行：npx pingcode-cli@latest --force
   该命令会检测当前用户已存在的 Codex、Claude Code、OpenClaw 和 Hermes 目录，并只把 skill 安装到这些已有 Agent 的个人 skills 目录。
2. 安装结束后请检查下列 SKILL.md 入口文件是否存在（按你当前使用的 Agent 选择对应路径即可）：
   - ~/.codex/skills/pingcode/SKILL.md 与 ~/.codex/skills/pingcode-ctx/SKILL.md
   - ~/.claude/skills/pingcode/SKILL.md 与 ~/.claude/skills/pingcode-ctx/SKILL.md
   - ~/.openclaw/skills/pingcode/SKILL.md 与 ~/.openclaw/skills/pingcode-ctx/SKILL.md
   - ~/.hermes/skills/project-management/pingcode/SKILL.md 与 ~/.hermes/skills/project-management/pingcode-ctx/SKILL.md
3. 安装完成后，引导我配置环境变量 PINGCODE_CLIENT_ID 和 PINGCODE_CLIENT_SECRET；不要把 secret 写入仓库文件，也不要在对话里回显完整 secret。
4. 如果我还需要默认查询“我的任务”，请继续引导我配置 PINGCODE_USER_NAME 或 PINGCODE_USER_ID。
```

## 能力范围

- 使用 `client_credentials` 获取 PingCode 企业令牌
- 查询项目、迭代、看板、工作项类型、状态、优先级
- 查询、创建、更新工作项
- 更新工作项状态
- 在故事下创建子工作项（通过 `parent_id`）
- 查询、创建、更新产品和产品需求
- 通过子命令（`config *`, `work-item *`）或 `--method/--path` 调用 PingCode API

## 子命令

PingCode CLI 支持结构化子命令和传统 `--method/--path` 两种调用方式。

### 配置管理 (`config`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `config init` | 交互式初始化工作区上下文 | `node scripts/pingcode.js config init` |
| `config list` | 显示当前偏好和字典摘要 | `node scripts/pingcode.js config list` |
| `config set-current-user <id>` | 设置当前用户 | `node scripts/pingcode.js config set-current-user @me` |
| `config set-current-project <id>` | 设置当前项目 | `node scripts/pingcode.js config set-current-project PROJECT_ID` |
| `config set-current-sprint <id>` | 设置当前迭代 | `node scripts/pingcode.js config set-current-sprint SPRINT_ID` |

```bash
# 查看当前工作区配置
node scripts/pingcode.js config list

# 交互式初始化
node scripts/pingcode.js config init

# 设置当前项目
node scripts/pingcode.js config set-current-project my-project
```

### 工作项管理 (`work-item`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `work-item list` | 列出工作项（自动加当前用户/项目/迭代过滤） | `node scripts/pingcode.js work-item list --assignee @me --state 进行中` |
| `work-item create` | 创建工作项 | `node scripts/pingcode.js work-item create --title "新任务" --type task` |
| `work-item show <id>` | 查看单个工作项 | `node scripts/pingcode.js work-item show SCR-123` |
| `work-item update <id>` | 更新工作项 | `node scripts/pingcode.js work-item update SCR-123 --state 已完成` |

```bash
# 查看当前用户的未完成任务
node scripts/pingcode.js work-item list --assignee @me --state 进行中 --compact

# 按类型查询
node scripts/pingcode.js work-item list --type bug --assignee @me --compact

# 创建工作项（默认负责人为当前用户）
node scripts/pingcode.js work-item create --title "实现登录页面" --type task --project "Core" --sprint "Sprint 1"

# 通过编号查看工作项
node scripts/pingcode.js work-item show SCR-123

# 通过编号更新状态（支持 identifier 或 id）
node scripts/pingcode.js work-item update SCR-123 --state 已完成

# 通过 id 更新状态
node scripts/pingcode.js work-item update WI-AbCdEf --state 进行中 --priority 高

# 试运行（预览 API 请求，不发送）
node scripts/pingcode.js work-item create --title "test" --type task --dry-run
node scripts/pingcode.js work-item update SCR-123 --state 已完成 --dry-run
```

### 传统方式 (Legacy)

原有的 `--method/--path` 调用方式继续支持，适用于未被新子命令覆盖的 API 操作：

```bash
# 查询项目列表
node scripts/pingcode.js --method GET --path /v1/project/projects --param page_size=20

# 通过查询参数过滤工作项
node scripts/pingcode.js --method GET --path /v1/project/work_items --param assignee_ids=@me --param page_size=20 --compact

# 创建产品需求
node scripts/pingcode.js --method POST --path /v1/ship/ideas --data '{"product_id":"PRODUCT_ID","title":"New idea"}'

# 更新工作项（传统 PATCH）
node scripts/pingcode.js --method PATCH --path /v1/project/work_items/WORK_ITEM_ID --data '{"state_id":"STATE_ID"}'
```

## 自然语言使用方式

安装并启用 skill 后，用户可以直接用自然语言描述需求，例如：

- 查看我当前没完成的任务
- 查看我的未解决缺陷
- 帮我在某个故事下新增工作项
- 把某个工作项改成已完成
- 创建一个用户故事

大模型应根据语义自动选择 `$pingcode` skill，并把自然语言转换成通用 CLI 命令和参数。不要为每个自然语言场景新增专门命令；统一使用 `scripts/pingcode.js` 的通用命令组合完成。

如果平台没有稳定的隐式 skill 选择能力，可以显式写：

```text
使用 $pingcode 查看我当前没完成的任务
使用 $pingcode-ctx 初始化 PingCode 当前项目、迭代和用户
```

## 凭证配置

在 PingCode 企业后台创建应用，配置数据访问范围，然后设置环境变量：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

可选配置：

```bash
export PINGCODE_BASE_URL="https://open.pingcode.com"
export PINGCODE_TOKEN_CACHE="$HOME/.cache/pingcode-skill/token.json"
export PINGCODE_WORKSPACE_CACHE=".pingcode-skill/cache.json"
export PINGCODE_USER_NAME="你的 PingCode 用户名或显示名"
export PINGCODE_USER_ID="你的 PingCode 用户 ID"
```

也可以在单次调用时传入 `--client-id`、`--client-secret`、`--user-id`、`--user-name`、`--workspace-cache`。日常使用推荐放在本机 shell profile 或由 1Password、macOS Keychain、Vault、CI secret 等工具注入为环境变量；不建议把 secret 写进仓库里的配置文件。不要把 `client_secret`、access token 或 token cache 提交到仓库。

如果脚本调用时缺少 `PINGCODE_CLIENT_ID` / `PINGCODE_CLIENT_SECRET`，会直接输出 `export` 配置示例并退出。企业令牌不能代表个人身份；操作创建工作项、查询工作项时，如果用户没有明确说“所有人”或指定其他负责人，agent 应默认使用当前用户。当前用户来自 `PINGCODE_USER_ID` / `PINGCODE_USER_NAME`、`--user-id` / `--user-name` 或工作区缓存；如果没有配置，agent 应先缓存用户列表，再让用户选择自己的 PingCode 用户。

## 初次使用

首次在一个工作区使用前，先用 `pingcode-ctx` 初始化项目上下文，选择当前项目、当前迭代和当前用户：

```text
使用 $pingcode-ctx 初始化 PingCode 当前项目、迭代和用户
```

## 工作区缓存

CLI 默认把工作区偏好和常用字典缓存到 `.pingcode-skill/cache.json`，该目录已被 `.gitignore` 忽略。缓存内容包括：

- 当前用户 ID / 名称
- 当前项目 ID / 名称
- 当前迭代 ID / 名称
- 用户列表或项目成员列表
- 工作项类型字典
- 工作项状态字典
- 工作项优先级字典
- 工作项属性字典
- 需求状态字典
- 需求优先级字典

首次写入默认缓存时，如果当前项目已有 `.gitignore`，CLI 会自动确保 `.pingcode-skill/` 已加入忽略列表。

推荐初始化当前上下文后再执行日常工作项查询或创建：

### Agent 前台问答方式

在 Codex、Claude Code 等 Agent 产品里，推荐显式调用 `$pingcode-ctx`：

```text
使用 $pingcode-ctx 初始化 PingCode 当前项目、迭代和用户
```

该 skill 会让 Agent 在前台聊天里按顺序展示项目、迭代、用户的编号选项。用户回复编号、ID 或名称后，Agent 会执行非交互式命令写入 `.pingcode-skill/cache.json`。这个流程不依赖某个产品的专用 UI 控件，因此可兼容 Codex、Claude Code 和其他支持 skills 的 Agent。

底层命令如下：

```bash
node scripts/pingcode.js --context-options project
node scripts/pingcode.js --set-current-project PROJECT_ID_OR_NAME
node scripts/pingcode.js --context-options sprint
node scripts/pingcode.js --set-current-sprint SPRINT_ID_OR_NAME
node scripts/pingcode.js --context-options user
node scripts/pingcode.js --set-current-user USER_ID_OR_NAME
```

### 终端交互方式

如果你是在普通 shell 里手动执行，也可以运行：

```bash
node scripts/pingcode-ctx.js
```

该命令会在终端里引导选择当前项目、当前迭代和当前用户，并写入同一个工作区缓存。通过 npm 安装后也可以直接运行：

```bash
pingcode-ctx
```

使用 `$pingcode` skill 执行常规工作项查询或创建前，应先确认工作区缓存里有 `current_user_id`、`current_project_id`、`current_sprint_id`。缺少任一项时先运行 `pingcode-ctx`，完成后再重试原来的 PingCode 操作。

首次在一个工作区使用时可以按下面顺序显式初始化：

```bash
node scripts/pingcode.js --cache-projects
node scripts/pingcode.js --set-current-project PROJECT_ID
node scripts/pingcode.js --cache-sprints
node scripts/pingcode.js --set-current-sprint SPRINT_ID
node scripts/pingcode.js --cache-users
node scripts/pingcode.js --set-current-user USER_ID_OR_CACHED_NAME
node scripts/pingcode.js --cache-states
node scripts/pingcode.js --cache-work-item-priorities
node scripts/pingcode.js --cache-work-item-properties
# 产品需求字典按产品缓存，需要产品 ID：
node scripts/pingcode.js --cache-idea-states --product-id PRODUCT_ID
node scripts/pingcode.js --cache-idea-priorities --product-id PRODUCT_ID
```

如果查询或创建工作项时工作区上下文不完整，CLI 会提示先运行 `pingcode-ctx`。agent 应先完成交互式上下文初始化，再重试原查询或创建命令。没有交互终端时，才使用下面的 `--cache-*` / `--set-current-*` 命令手动初始化。

如果租户没有全局用户列表接口，`--cache-users --project-id PROJECT_ID` 会缓存项目成员。之后查询“某某的工作项”时可以直接使用缓存：

```bash
node scripts/pingcode.js --method GET --path /v1/project/work_items --param assignee_ids=@user:某某
```

查询工作项时，CLI 会自动补当前用户、当前项目、当前迭代过滤条件。用户明确要求“所有人”“全部项目”“全部迭代”时分别加 `--all-users`、`--all-projects`、`--all-sprints`。

## 自然语言到命令的映射原则

- 当前用户默认规则：操作创建工作项、查询工作项时，如果用户没有明确说“所有人”或指定其他负责人，默认按当前用户处理。查询工作项时 CLI 会自动加当前用户过滤；创建时在 JSON 里加 `"assignee_id":"@me"`。
- 当前项目/迭代默认规则：查询工作项时默认加缓存的当前项目和当前迭代。用户明确说“全部项目”或“全部迭代”时，用 `--all-projects` 或 `--all-sprints` 跳过对应过滤。
- “所有人”：这是当前用户默认规则的 opt-out。用户明确说“所有人”时，查询用 `--all-users`，创建时不要加 `assignee_id=@me`，但仍应尽量用项目、迭代、类型、状态等条件缩小范围。
- “我”的身份：因为使用企业令牌，不能从 token 推断具体用户。优先读取工作区缓存、`PINGCODE_USER_ID` / `PINGCODE_USER_NAME`，或使用 `--user-id` / `--user-name`；如果没有配置，就先运行 `--cache-users` 并让用户选择。
- 用户占位符：CLI 支持在参数和 JSON 请求体里使用 `@me` 表示当前用户 ID，使用 `@me_name` 表示当前用户名称，使用 `@user:<名称或ID>` 从缓存用户列表解析 ID。如果对应配置不存在，脚本会输出配置引导并退出。
- “未完成”：查询工作项后，由模型把 `state.type` 为 `pending`、`in_progress` 的项视为未完成，除非用户另有定义。
- “未解决缺陷”：调用 `/v1/project/work_items`，传 `type_ids=bug`、负责人过滤和 `--compact`，例如 `--param assignee_ids=@me`，再按状态过滤未完成项。
- “在某故事下新增工作项”：先调用 `/v1/project/work_items` 按编号或关键词找到父故事，再调用 `POST /v1/project/work_items` 并传 `parent_id`。
- 状态更新：优先用缓存状态字典；没有缓存或怀疑过期时运行 `--cache-states`，它会先缓存当前项目的工作项类型字典，再缓存每个类型的状态；只刷新单个类型时传 `--work-item-type-id TYPE_ID`。不要猜 `state_id`。

## 参考资料

- Skill 入口：[SKILL.md](SKILL.md)
- API 摘要：[references/api.md](references/api.md)
- 操作流程：[references/workflows.md](references/workflows.md)
- 官方文档：https://open.pingcode.com/

## Star History

<a href="https://www.star-history.com/?repos=situjunjie%2Fpingcode-skill&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=situjunjie/pingcode-skill&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=situjunjie/pingcode-skill&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=situjunjie/pingcode-skill&type=date&legend=top-left" />
 </picture>
</a>
