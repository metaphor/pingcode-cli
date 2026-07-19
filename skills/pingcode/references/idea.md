# 需求 (Idea)

通过 `pingcode idea` 子命令列出、创建、查看、获取、搜索和更新 PingCode 需求。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

如果缺少凭证，CLI 会输出配置指引，按指引配置后重试。不要要求用户在对话中粘贴凭证或令牌。

## 命令

```bash
# 查询需求列表
pingcode idea list --product PRODUCT_ID --compact
pingcode idea list --product PRODUCT_ID --state STATE_ID --priority PRIORITY_ID --keywords "登录页面" --compact
pingcode idea list --product PRODUCT_ID --include-public-image-token --compact

# 通过 identifier 获取需求（get 接受 identifier 或 raw ID）
pingcode idea get SLC-1
pingcode idea get IDEA_ID

# 搜索需求
pingcode idea search --product PRODUCT_ID --filter '{"state": {"in": ["STATE_ID"]}}' --keywords "登录" --limit 20 --page-index 1
pingcode idea search --product PRODUCT_ID --include-public-image-token --limit 50 --page-index 1

# 创建需求（--product 必须是 raw ID；--assignee 支持从缓存解析名称）
pingcode idea create --product PRODUCT_ID --title "新增登录功能" --dry-run
pingcode idea create --product PRODUCT_ID --title "新增登录功能" --description "支持手机号登录" --assignee "张三" --suite SUITE_ID --priority PRIORITY_ID --properties '{"custom_field": "value"}'

# 更新需求（通过 identifier 或 id；支持 --title、--description、--state、--priority、--assignee、--progress、--plan-at、--real-at、--plan、--suite、--properties）
pingcode idea update SLC-1 --state STATE_ID --priority PRIORITY_ID --dry-run
pingcode idea update SLC-1 --title "修正后的标题" --progress 0.5 --plan-at '{"from": "2026-07-20", "to": "2026-07-30", "granularity": "day"}' --real-at '{"from": "2026-07-21", "to": "2026-07-31", "granularity": "day"}' --plan PLAN_ID --suite SUITE_ID --properties '{"custom_field": "value"}'

# 查询需求字典（均需 --product raw ID）
pingcode idea states --product PRODUCT_ID
pingcode idea properties --product PRODUCT_ID
pingcode idea suites --product PRODUCT_ID
pingcode idea plans --product PRODUCT_ID
pingcode idea priorities --product PRODUCT_ID

# 查询需求状态流转历史
pingcode idea transition-history TRANSITION_HISTORY_ID SLC-1
pingcode idea transition-histories SLC-1
pingcode idea transition-histories IDEA_ID
```

查询/列表输出默认使用 `--compact`。写操作加 `--dry-run` 可预览请求而不实际发送。

## 操作流程

1. 使用 `pingcode context init` 初始化工作区缓存，确保用户列表等字典可用。
2. 从产品后台或字典接口获取 `product_id`、`state_id`、`priority_id`、`suite_id`、`plan_id` 等 raw ID。
3. 使用 `pingcode idea list --product PRODUCT_ID --compact` 查看需求标识符（如 `SLC-1`）。
4. 创建需求时先加 `--dry-run` 预览，确认无误后去掉 `--dry-run` 执行真实写入。
5. 更新需求时通过 identifier（如 `SLC-1`）定位，涉及字典 ID 的字段均使用 raw ID。
6. 获取单条需求用 `get`（identifier 或 raw ID 均可）。

## 安全规则

- 禁止猜测 `product_id`、`state_id`、`priority_id`、`suite_id`、`plan_id`。这些字段必须使用 PingCode Web UI 或字典接口返回的 raw ID。
- 只有 `--assignee` 支持通过名称从工作区缓存解析；其他名称到 ID 的转换必须依赖缓存或字典接口。
- 创建/更新需求前优先使用 `--dry-run` 预览请求，确认字段正确后再执行真实写入。
- 不要在最终回答中回显令牌值。
- HTTP 429 表示触发频率限制，等待 `x-pc-retry-after` 秒后重试。
