# 工单

通过 `pingcode ticket` 子命令操作 PingCode 客服工单（tickets）。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

## 命令

```bash
# 查询工单（--product 必填，参数以 help 为准）
pingcode ticket list --product PRODUCT_ID --compact
pingcode ticket get TICKET_ID

# 创建工单（--product/--title/--type 必填）
pingcode ticket create --product PRODUCT_ID --title "客服问题" --type TICKET_TYPE_ID --dry-run

# 更新工单（至少一个字段）
pingcode ticket update TICKET_ID --title "新标题" --dry-run

# 高级搜索（组合过滤，类 MongoDB filter 语法）
pingcode ticket search --filter '{"channel.id":{"in":["CHANNEL_ID"]}}' --compact

# 流转记录
pingcode ticket transitions TICKET_ID --compact
pingcode ticket transition HISTORY_ID TICKET_ID

# 字典（均为 --product 必填，raw ID）
pingcode ticket types --product PRODUCT_ID
pingcode ticket states --product PRODUCT_ID
pingcode ticket properties --product PRODUCT_ID
pingcode ticket channels --product PRODUCT_ID
pingcode ticket priorities --product PRODUCT_ID
pingcode ticket solutions --product PRODUCT_ID
pingcode ticket tags --product PRODUCT_ID
```

## 企业级配置（company-wide，非产品级）

```bash
# 工单状态资源（支持创建/更新，文档未定义删除）
pingcode ticket state-resource-create --name 处理中 --type in_progress
pingcode ticket state-resource-list-all
pingcode ticket state-resource-update STATE_ID --name 新名称 --dry-run

# 状态方案与状态流转
pingcode ticket state-plan-list
pingcode ticket state-plan-state-add PLAN_ID STATE_ID --dry-run
pingcode ticket state-plan-flow-add PLAN_ID FROM_STATE_ID TO_STATE_ID --dry-run

# 工单属性资源与属性方案
pingcode ticket property-resource-create --name 渠道来源 --type single_select --options '[{"text":"邮件"},{"text":"电话"}]'
pingcode ticket property-plan-list
pingcode ticket property-plan-property-add PLAN_ID PROPERTY_ID --dry-run

# 类型/优先级/解决方案（只读）
pingcode ticket type-resource-list
pingcode ticket priority-resource-list
pingcode ticket solution-list
```

## 安全规则

- `product_id`、`type_id` 等 ID 一律使用 raw ID，先用字典命令解析，禁止猜测。
- 写操作先 `--dry-run` 预览。
- 字典命令 `states/priorities/...` 是产品级（`--product` 必填）；`state-resource-*`/`type-resource-*` 等是企业级资源，帮助文本有注明。
