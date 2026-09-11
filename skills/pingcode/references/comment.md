# 评论

通过 `pingcode comment` 子命令创建、查看、获取和删除工作项评论。

`principal_type` 固定为 `work_item`，只支持工作项评论。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

如果缺少凭证，CLI 会输出配置指引，按指引配置后重试。不要要求用户在对话中粘贴凭证或令牌。

## 命令

```bash
# 创建评论
pingcode comment create SCR-123 --content "这个工作项需要考虑性能优化"

# 创建回复评论
pingcode comment create SCR-123 --content "已确认，稍后处理" --reply-to cmt-456

# 查看评论列表
pingcode comment list SCR-123 --compact

# 获取单个评论
pingcode comment get cmt-456 SCR-123

# 删除评论
pingcode comment delete cmt-456 SCR-123
```

写操作加 `--dry-run` 可预览请求而不实际发送。列表/获取输出默认使用 `--compact`。

## 操作流程

1. 获取目标工作项的 id 或 identifier（如 `SCR-123`）。
2. 创建评论时提供 `--content`（必填），可选 `--reply-to` 回复已有评论。
3. 查看、获取或删除评论时同时提供评论 id 和工作项 id/identifier。
4. 写操作优先使用 `--dry-run` 预览。

## 安全规则

- 禁止猜测 `principal_id`。identifier 会通过 `/v1/project/work_items?identifier=...` 自动解析为 id。
- `principal_type` 固定为 `work_item`，不支持其他主体类型。
- 写操作优先 `--dry-run` 预览。
- HTTP 429 表示触发频率限制，等待 `x-pc-retry-after` 秒后重试。
- 不要在最终回答中回显令牌值。
