# 产品

通过 `pingcode product` 子命令列出和获取 PingCode 产品。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

如果缺少凭证，CLI 会输出配置指引，按指引配置后重试。不要要求用户在对话中粘贴凭证或令牌。

## 命令

```bash
# 列出产品（默认 --compact）
pingcode product list --compact

# 按关键词搜索产品
pingcode product list --keywords "核心产品" --compact

# 限制返回数量
pingcode product list --limit 10 --compact

# 查看单个产品详情（需使用产品 raw id）
pingcode product get PRODUCT_ID

# 预览 API 请求而不实际发送
pingcode product list --dry-run
pingcode product get PRODUCT_ID --dry-run

# 创建/更新产品
pingcode product create --name "新产品" --identifier NEWPROD --dry-run
pingcode product update PRODUCT_ID --description "..." --dry-run

# 产品成员 / 标签 / 需求模块 / 排期
pingcode product member-add PRODUCT_ID USER_ID --type user
pingcode product member-list PRODUCT_ID
pingcode product tag-add PRODUCT_ID --name 核心词
pingcode product tag-list PRODUCT_ID
pingcode product suite-add PRODUCT_ID --name 登录模块 --type module
pingcode product suite-list PRODUCT_ID
pingcode product plan-list PRODUCT_ID --compact

# 渠道 / 工单类型（只读）
pingcode product channel-list PRODUCT_ID
pingcode product ticket-type-list PRODUCT_ID

# 客户与外部用户
pingcode product customer-list PRODUCT_ID
pingcode product customer-create PRODUCT_ID --name 客户A
pingcode product extuser-list PRODUCT_ID
pingcode product extuser-create PRODUCT_ID --name 外部用户 --email a@b.com
```

## 操作流程

1. 使用 `pingcode product list --compact` 查看产品列表，记录目标产品的 `id`。
2. 使用 `pingcode product get PRODUCT_ID` 查看某个产品的完整详情。
3. 拿到产品 `id` 后，可在需求（idea）命令中作为 `--product` 参数使用。

## 安全规则

- 禁止猜测 `product_id`。应通过 `product list` 获取产品 ID 后再用于其他命令。
- 列表/详情查询输出默认使用 `--compact`。
- 写操作优先使用 `--dry-run` 预览（当前 product 模块仅支持查询）。
- HTTP 429 表示触发频率限制，等待 `x-pc-retry-after` 秒后重试。
- 不要在最终回答中回显令牌值。
