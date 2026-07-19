# PingCode CLI 参考文档

## 能力范围

- 使用 `client_credentials` 获取企业令牌
- 通过 OAuth2 `authorization_code` 获取用户令牌（`pingcode auth login`）
- 查询项目、迭代、看板、工作项类型、状态、优先级
- 查询、创建、更新工作项（支持 `--dry-run`）
- 在故事下创建子工作项（`--parent`）
- 通过子命令 `context *`、`workitem *`、`auth *` 调用 PingCode API

能力统一由 `pingcode` skill 提供，涵盖认证、工作区上下文与工作项操作；具体细节分别参考 `references/auth.md`、`references/ctx.md`、`references/workitem.md`。

## Skill 结构

| Skill | 作用 |
|---|---|
| `pingcode` | 统一入口：认证、工作区上下文初始化、工作项操作；按主题分文件参考 `references/auth.md`、`references/ctx.md`、`references/workitem.md` |

## 子命令

### 配置管理 (`context`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `context init` | 交互式初始化工作区上下文 | `pingcode context init` |
| `context list` | 显示当前偏好和字典摘要 | `pingcode context list` |
| `context set-current-user <id>` | 设置当前用户 | `pingcode context set-current-user @me` |
| `context set-current-project <id>` | 设置当前项目 | `pingcode context set-current-project PROJECT_ID` |
| `context set-current-sprint <id>` | 设置当前迭代 | `pingcode context set-current-sprint SPRINT_ID` |

### 工作项管理 (`workitem`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `workitem list` | 列出工作项（自动按当前用户/项目/迭代过滤） | `pingcode workitem list --assignee @me --state 进行中` |
| `workitem create` | 创建工作项 | `pingcode workitem create --title "新任务" --type task` |
| `workitem show <id>` | 通过列表接口按 id 或 identifier 查询 | `pingcode workitem show SCR-123` |
| `workitem get <id\|identifier>` | 通过官方单个工作项接口查询 | `pingcode workitem get WORK_ITEM_ID` |
| `workitem update <id>` | 更新工作项（支持 title/description/type/project/sprint/priority/assignee/parent/state 等） | `pingcode workitem update SCR-123 --state 已完成` |

```bash
pingcode workitem list --assignee @me --state 进行中 --compact
pingcode workitem create --title "实现登录页面" --type task --project "Core" --sprint "Sprint 1"
pingcode workitem show SCR-123
pingcode workitem get WORK_ITEM_ID
pingcode workitem update SCR-123 --title "修正后的标题" --priority 高 --state 已完成
pingcode workitem create --title "test" --type task --dry-run
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

也可在单次调用时传入 `--client-id`、`--client-secret`、`--user-id`、`--user-name`、`--workspace-cache`。推荐由 shell profile 或 secret 管理工具注入环境变量，不要将 secret 提交到仓库。

## 用户令牌登录

支持通过 OAuth2 `authorization_code` 获取用户令牌，适合以个人身份操作 PingCode。

```bash
pingcode auth login --client-id ID --client-secret SECRET
pingcode workitem list --state 进行中 --compact
```

首次使用用户令牌前必须先运行 `auth login`。令牌缓存在 token cache 中，后续命令自动识别 grant_type。显式传 `--grant-type` 可覆盖自动识别。

使用用户令牌时 `workitem list` 不再默认按当前用户过滤；需显式加 `--assignee @me`。`client_credentials` 模式保持原有默认过滤行为。

## 工作区缓存

CLI 将工作区偏好和常用字典缓存到 `.pingcode/cache.json`（已加入 `.gitignore`）。缓存内容包括用户、项目、迭代 ID/名称，以及工作项类型、状态、优先级、属性字典。

推荐初始化上下文后再执行工作项操作：

```bash
# 终端交互式初始化
pingcode context init
```

在 Agent 中通过 `pingcode` skill 的上下文能力初始化，等效于执行 `pingcode context init`。

使用 pingcode skill 执行常规工作项查询或创建前，应先确认工作区缓存里有 `current_user_id`、`current_project_id`、`current_sprint_id`。缺少任一项时先运行 `pingcode context init`，完成后再重试原来的 PingCode 操作。

查询时 CLI 自动补充当前用户/项目/迭代过滤。明确要求"所有人""全部项目""全部迭代"时分别加 `--all-users`、`--all-projects`、`--all-sprints`。
