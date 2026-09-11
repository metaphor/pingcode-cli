# 测试管理

通过 `pingcode testhub` 子命令操作测试库、用例、测试计划与执行用例。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

## 测试库

```bash
pingcode testhub library-list --compact
pingcode testhub library-create --name 回归库 --identifier REGRESSION [--scope-type project --scope-id ID]
pingcode testhub library-get LIBRARY_ID
pingcode testhub library-update LIBRARY_ID --description "..." --dry-run
# 注意：API 未提供测试库删除接口

# 库成员
pingcode testhub library-member-add LIBRARY_ID MEMBER_ID --type user
pingcode testhub library-member-list LIBRARY_ID

# 用例模块（suite-list 可用 --parent-id 查一级模块）
pingcode testhub suite-add LIBRARY_ID --name 登录模块
pingcode testhub suite-list LIBRARY_ID
pingcode testhub suite-delete LIBRARY_ID SUITE_ID --dry-run
```

## 用例

```bash
pingcode testhub case-list --library-id LIBRARY_ID --compact
pingcode testhub case-create --test-library-id LIBRARY_ID --title "验证登录" [--suite SUITE_ID] [--type TYPE_ID] [--steps JSON]
pingcode testhub case-get CASE_ID
pingcode testhub case-update CASE_ID --title "新标题" --dry-run
pingcode testhub case-delete CASE_ID --dry-run
pingcode testhub case-bulk-create --items '[{"test_library_id":"...","title":"..."}]'
pingcode testhub case-bulk-update --items JSON
pingcode testhub case-search --keywords 登录 --compact
pingcode testhub case-histories CASE_ID   # 各执行用例最后一次执行结果
```

## 测试计划与执行用例

```bash
pingcode testhub plan-list LIBRARY_ID --compact
pingcode testhub plan-create LIBRARY_ID --name "V1回归" --type PLAN_TYPE_ID --start-at 1736985600 --end-at 1739577600 --assignee-id USER_ID
pingcode testhub plan-update LIBRARY_ID PLAN_ID --state-id STATE_ID --dry-run

pingcode testhub run-list --plan-id PLAN_ID --compact
pingcode testhub run-create --library-id LIBRARY_ID --plan-id PLAN_ID --case-id CASE_ID [--executor-id USER_ID]
pingcode testhub run-update RUN_ID --status-id STATUS_ID [--remark "..."]   # 提交执行结果
pingcode testhub run-search --keywords ... --compact
pingcode testhub run-histories RUN_ID    # 执行结果记录
pingcode testhub run-history RUN_ID HISTORY_ID

# 计划类型
pingcode testhub plan-type-list LIBRARY_ID
```

## 字典（企业级）

```bash
pingcode testhub case-states
pingcode testhub case-types
pingcode testhub case-important-levels
pingcode testhub plan-states
pingcode testhub run-statuses
pingcode testhub case-property-list
pingcode testhub case-property-create --name 优先复核 --type single_select --options '[{"text":"是"},{"text":"否"}]'
pingcode testhub case-property-plan-list --library-id LIBRARY_ID
```

## 安全规则

- `library_id`/`plan_id`/`case_id` 等全部使用 raw ID，先 list 解析，禁止猜测。
- 文档未提供测试库/计划/执行用例的删除接口；仅用例可删除（`case-delete`）。
- 写操作先 `--dry-run` 预览。
