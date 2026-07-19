# 工作项

通过 `pingcode workitem` 子命令列出、创建、查看、获取和更新 PingCode 工作项。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

如果缺少凭证，CLI 会输出配置指引，按指引配置后重试。不要要求用户在对话中粘贴凭证或令牌。

## 命令

```bash
# 查询工作项
pingcode workitem list --assignee @me --state 进行中 --compact
pingcode workitem list --type bug --assignee @me --compact
pingcode workitem list --keywords "登录页面" --compact

# 创建工作项
pingcode workitem create --title "New task" --type task --project PROJECT_ID --sprint SPRINT_ID
pingcode workitem create --title "Bug fix" --type bug --assignee @me --priority high

# 查看工作项
pingcode workitem show SCR-123
pingcode workitem show WI-AbCdEf

# 获取工作项（单个工作项接口，通过 id 或 identifier）
pingcode workitem get WORK_ITEM_ID
pingcode workitem get WYT-852

# 更新工作项（通过 identifier 或 id；支持 --title、--description、--type、--project、--sprint、--state、--priority、--assignee、--parent、--version、--board、--entry、--swimlane、--start-at、--end-at、--participants、--story-points、--estimated-workload、--remaining-workload、--properties）
pingcode workitem update SCR-123 --state 已完成
pingcode workitem update WI-AbCdEf --state 进行中 --priority high
pingcode workitem update SCR-123 --title "Updated title" --story-points 3 --start-at 1736985600
```

查询/列表输出默认使用 `--compact`。写操作加 `--dry-run` 可预览请求而不实际发送。

## 操作流程

1. 使用 list 命令将名称解析为 ID，默认加 `--compact`。PingCode 写接口通常需要 ID。
2. 目标项目/产品/工作项和状态 ID 明确后直接执行写命令。
3. 写操作优先使用 `--dry-run` 预览。

## 默认值与身份

当前用户/项目/迭代默认值来自工作区缓存（`.pingcode/cache.json`）。缓存不完整时先用 `pingcode context init` 初始化，然后重试原命令。

查询时 CLI 自动应用缓存的当前用户/项目/迭代过滤条件，除非传了显式参数或 `--all-users`、`--all-projects`、`--all-sprints`。创建时默认使用 `assignee_id=@me`，除非用户明确要求"所有人"或指定了其他负责人。

用户令牌登录及其对默认过滤行为的影响（不再隐式按当前用户过滤；需显式加 `--assignee @me`）见 `references/auth.md`。

## 安全规则

- 禁止猜测 `state_id`、`type_id`、`priority_id`、`project_id`、`product_id`。
- 状态变更优先使用缓存的状态字典；否则先获取工作项项目和类型的有效状态后再更新。
- 创建/更新需要 `priority_id` 或自定义 `properties` 时，先通过 `context init` 刷新字典。
- HTTP 429 表示触发频率限制，等待 `x-pc-retry-after` 秒后重试。
- 不要在最终回答中回显令牌值。
