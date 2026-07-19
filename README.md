# PingCode CLI

用于让 Codex、OpenCode 等 AI agent 通过 PingCode 官方 REST API 操作项目管理和产品管理数据的 Node.js CLI 与 skill。

## 安装

```bash
npx pingcode-cli@latest
```

一条命令会检测当前用户已存在的 Codex / OpenCode 目录，并只安装到这些已有 Agent。每个 Agent 的 skills 根目录下会安装一个 `pingcode` skill 目录，其中包含 `references/` 子目录：

```text
~/.codex/skills/pingcode
~/.codex/skills/pingcode/references/auth.md
~/.codex/skills/pingcode/references/ctx.md
~/.codex/skills/pingcode/references/workitem.md
~/.config/opencode/skills/pingcode
~/.config/opencode/skills/pingcode/references/auth.md
~/.config/opencode/skills/pingcode/references/ctx.md
~/.config/opencode/skills/pingcode/references/workitem.md
```

默认会进入交互式安装，先选择“全局 / 项目级”，再选择要安装的 Agent；在 CI 或脚本中可以使用 `--non-interactive` 保持旧的静默自动安装行为。任何一个已选择目录写入失败（权限、磁盘等问题）不会阻断其他目录，安装结束时会打印每个目录的成功/失败/跳过摘要。

如果设置了 `CODEX_HOME`，Codex 目录会变成 `$CODEX_HOME/skills/`；其他 Agent 的目录位置不受该变量影响。

安装完成后，配置 PingCode 凭证（详见下文「凭证配置」一节）：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

### 交互式安装（默认）

直接运行安装命令会进入交互式向导：

```bash
npx pingcode-cli@latest
```

流程：
1. 选择安装范围：
   - **Global**（全局，安装到 `~/.codex`、`~/.config/opencode` 等）
   - **Project-level**（项目级，安装到当前目录的 `.codex`、`.opencode` 等）
2. 选择要安装的 Agent（可多选）
3. 安装完成后会打印摘要和凭证配置提示

示例输入（全局安装 OpenCode）：

```text
Select install scope:
  1) Global
  2) Project-level
Enter choice (1-2, default: 1): 1

Select agents to install (comma-separated numbers, default: all):
  1) Codex
  2) OpenCode
Enter choices (1-2): 2
```

### 非交互式安装（CI/脚本）

在自动化环境中使用 `--non-interactive`，会保持原来的自动检测并安装到已有 Agent 目录的逻辑：

```bash
npx pingcode-cli@latest --non-interactive --force
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
npx pingcode-cli@latest --opencode-only --force
```

安装到自定义目录（例如项目本地的 `.codex/skills` 或 OpenCode 项目级 `.opencode/skills`）：

```bash
npx pingcode-cli@latest --target ".codex/skills" --force
npx pingcode-cli@latest --target "$HOME/.config/opencode/skills" --force
npx pingcode-cli@latest --target ".opencode/skills" --force
```

`--target` 与 `--codex-only` / `--opencode-only` 互斥；指定 `--target` 后只会安装到给定目录，不再走多 Agent 默认流程。

## 复制给 AI Agent 的安装提示词

把下面这段提示词复制给你的 AI Agent，让它在你的本机环境里完成安装：

```text
请帮我安装 PingCode CLI，让当前 AI Agent 可以通过 PingCode 官方 REST API 查询和操作项目/产品数据。

安装要求：
1. 直接运行：npx pingcode-cli@latest --force
   该命令会检测当前用户已存在的 Codex 和 OpenCode 目录，并只把 skill 安装到这些已有 Agent 的个人 skills 目录。
2. 安装结束后请检查对应 Agent skills 目录下是否存在 `pingcode` 目录，且目录里有 SKILL.md 入口文件和 `references/` 子目录（按你当前使用的 Agent 选择对应路径即可）：
   - ~/.codex/skills/pingcode/SKILL.md
   - ~/.config/opencode/skills/pingcode/SKILL.md
3. 安装完成后，引导我配置环境变量 PINGCODE_CLIENT_ID 和 PINGCODE_CLIENT_SECRET；不要把 secret 写入仓库文件，也不要在对话里回显完整 secret。
4. 如果我还需要默认查询“我的任务”，请继续引导我配置 PINGCODE_USER_NAME 或 PINGCODE_USER_ID。
```

## 能力范围

- 使用 `client_credentials` 获取 PingCode 企业令牌
- 通过 OAuth2 `authorization_code` 获取用户令牌（`pingcode auth login`）
- 查询项目、迭代、看板、工作项类型、状态、优先级
- 查询、创建、更新工作项（含状态更新，支持 `--dry-run` 试运行）
- 在故事下创建子工作项（通过 `--parent`）
- 通过子命令（`context *`, `workitem *`, `auth *`）调用 PingCode API

以上能力由同一个 `pingcode` skill 统一提供，并通过 `references/` 下的 `auth.md`、`ctx.md`、`workitem.md` 分别补充用户令牌登录、工作区上下文初始化、工作项操作的详细参考。

## Skill 结构

安装后在同一个 skills 根目录下会有一个 `pingcode` skill 目录，其 `references/` 子目录按主题拆分参考文档：

| 入口 | 作用 |
|---|---|
| `pingcode/SKILL.md` | 路由入口，统一提供 PingCode CLI 的各项能力 |
| `pingcode/references/auth.md` | 用户令牌登录：`pingcode auth login`、grant-type 自动识别与覆盖、令牌类型说明 |
| `pingcode/references/ctx.md` | 工作区上下文初始化：在 Agent 前台按编号选择当前项目、迭代、用户并写入缓存 |
| `pingcode/references/workitem.md` | 工作项操作：`workitem list / create / show / get / update` 子命令及完整参数；含共享安全规则 |

## 子命令

PingCode CLI 通过子命令管理配置和工作项。

### 配置管理 (`context`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `context init` | 交互式初始化工作区上下文 | `pingcode context init` |
| `context list` | 显示当前偏好和字典摘要 | `pingcode context list` |
| `context set-current-user <id>` | 设置当前用户 | `pingcode context set-current-user @me` |
| `context set-current-project <id>` | 设置当前项目 | `pingcode context set-current-project PROJECT_ID` |
| `context set-current-sprint <id>` | 设置当前迭代 | `pingcode context set-current-sprint SPRINT_ID` |

```bash
# 查看当前工作区配置
pingcode context list

# 交互式初始化
pingcode context init

# 设置当前项目
pingcode context set-current-project my-project
```

### 工作项管理 (`workitem`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `workitem list` | 列出工作项（自动加当前用户/项目/迭代过滤） | `pingcode workitem list --assignee @me --state 进行中` |
| `workitem create` | 创建工作项 | `pingcode workitem create --title "新任务" --type task` |
| `workitem show <id>` | 查看单个工作项（通过列表接口按 id 或 identifier 查询） | `pingcode workitem show SCR-123` |
| `workitem get <id|identifier>` | 获取单个工作项（官方单个工作项接口；identifier 会先解析为 id） | `pingcode workitem get WORK_ITEM_ID` |
| `workitem update <id>` | 更新工作项 | `pingcode workitem update SCR-123 --state 已完成` |

```bash
# 查看当前用户的未完成任务
pingcode workitem list --assignee @me --state 进行中 --compact

# 按类型查询
pingcode workitem list --type bug --assignee @me --compact

# 按关键词搜索
pingcode workitem list --keywords "登录页面" --compact

# 创建工作项（默认负责人为当前用户）
pingcode workitem create --title "实现登录页面" --type task --project "Core" --sprint "Sprint 1"

# 通过编号查看工作项
pingcode workitem show SCR-123

# 通过 id 获取单个工作项（官方单个工作项接口）
pingcode workitem get WORK_ITEM_ID

# 通过编号更新状态（支持 identifier 或 id；支持 --title/--description/--type/--project/--sprint/--priority/--assignee/--parent/--version/--board/--entry/--swimlane/--start-at/--end-at/--participants/--story-points/--estimated-workload/--remaining-workload/--properties）
pingcode workitem update SCR-123 --state 已完成

# 更新工作项多个属性
pingcode workitem update SCR-123 --title "修正后的标题" --priority 高 --story-points 3 --start-at 1736985600

# 通过 id 更新状态
pingcode workitem update WI-AbCdEf --state 进行中 --priority 高

# 试运行（预览 API 请求，不发送）
pingcode workitem create --title "test" --type task --dry-run
pingcode workitem update SCR-123 --state 已完成 --dry-run
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
使用 $pingcode 初始化 PingCode 当前项目、迭代和用户
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
export PINGCODE_TOKEN_CACHE="$HOME/.cache/pingcode/token.json"
export PINGCODE_WORKSPACE_CACHE=".pingcode/cache.json"
export PINGCODE_USER_NAME="你的 PingCode 用户名或显示名"
export PINGCODE_USER_ID="你的 PingCode 用户 ID"
```

也可以在单次调用时传入 `--client-id`、`--client-secret`、`--user-id`、`--user-name`、`--workspace-cache`。日常使用推荐放在本机 shell profile 或由 1Password、macOS Keychain、Vault、CI secret 等工具注入为环境变量；不建议把 secret 写进仓库里的配置文件。不要把 `client_secret`、access token 或 token cache 提交到仓库。

如果脚本调用时缺少 `PINGCODE_CLIENT_ID` / `PINGCODE_CLIENT_SECRET`，会直接输出 `export` 配置示例并退出。企业令牌不能代表个人身份；操作创建工作项、查询工作项时，如果用户没有明确说“所有人”或指定其他负责人，agent 应默认使用当前用户。当前用户来自 `PINGCODE_USER_ID` / `PINGCODE_USER_NAME`、`--user-id` / `--user-name` 或工作区缓存；如果没有配置，agent 应先缓存用户列表，再让用户选择自己的 PingCode 用户。

## User token login

除了 `client_credentials` 企业令牌，CLI 也支持通过 OAuth2 `authorization_code` 获取用户令牌。用户令牌代表具体的人类用户，适合需要以个人身份操作 PingCode 的场景。

```bash
# 在浏览器中完成授权
pingcode auth login --client-id ID --client-secret SECRET

# 使用用户令牌查询工作项
# --grant-type 会自动从缓存中识别，且 workitem list 不再默认按当前用户过滤
pingcode workitem list --state 进行中 --compact
```

首次使用用户令牌前必须先运行 `auth login`。`auth login` 成功后的用户令牌会缓存在默认 token cache 中，后续命令不再需要在命令行写 `--grant-type`。当缓存里是企业令牌时，命令仍然走 `client_credentials`；当缓存里是用户令牌时，走 `authorization_code`。显式传 `--grant-type` 会覆盖自动识别。

使用用户令牌时，`workitem list` 不再默认按当前用户过滤（等价于之前加 `--all-users` 的效果），因此不需要配置 `PINGCODE_USER_ID` 或工作区用户。如果你仍想只看自己的，可以显式加 `--assignee @me` 或 `--user-id`。`client_credentials` 模式下仍保持原来的默认过滤行为。

## 工作区缓存

CLI 默认把工作区偏好和常用字典缓存到 `.pingcode/cache.json`，该目录已被 `.gitignore` 忽略。缓存内容包括：

- 当前用户 ID / 名称
- 当前项目 ID / 名称
- 当前迭代 ID / 名称
- 用户列表或项目成员列表
- 工作项类型字典
- 工作项状态字典
- 工作项优先级字典
- 工作项属性字典

首次写入默认缓存时，如果当前项目已有 `.gitignore`，CLI 会自动确保 `.pingcode/` 已加入忽略列表。

推荐初始化当前上下文后再执行日常工作项查询或创建：

### Agent 前台问答方式

在 Codex、OpenCode 等 Agent 产品里，推荐显式调用 `$pingcode`：

```text
使用 $pingcode 初始化 PingCode 当前项目、迭代和用户
```

该 skill 会让 Agent 在前台聊天里按顺序展示项目、迭代、用户的编号选项。用户回复编号、ID 或名称后，Agent 会执行非交互式命令写入 `.pingcode/cache.json`。这个流程不依赖某个产品的专用 UI 控件，因此可兼容 Codex、OpenCode 和其他支持 skills 的 Agent。

### 终端交互方式

如果你是在普通 shell 里手动执行，也可以运行：

```bash
pingcode context init
```

该命令会在终端里引导选择当前项目、当前迭代和当前用户，并写入同一个工作区缓存。

使用 `$pingcode` skill 执行常规工作项查询或创建前，应先确认工作区缓存里有 `current_user_id`、`current_project_id`、`current_sprint_id`。缺少任一项时先运行 `pingcode context init`，完成后再重试原来的 PingCode 操作。

查询工作项时，CLI 会自动补当前用户、当前项目、当前迭代过滤条件。用户明确要求“所有人”“全部项目”“全部迭代”时分别加 `--all-users`、`--all-projects`、`--all-sprints`。

## 参考资料

- 主入口：[skills/pingcode/SKILL.md](skills/pingcode/SKILL.md)
- 用户令牌登录：[skills/pingcode/references/auth.md](skills/pingcode/references/auth.md)
- 工作区上下文：[skills/pingcode/references/ctx.md](skills/pingcode/references/ctx.md)
- 工作项操作：[skills/pingcode/references/workitem.md](skills/pingcode/references/workitem.md)
- 官方文档：https://open.pingcode.com/

