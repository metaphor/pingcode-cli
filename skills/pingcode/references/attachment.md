# 附件

通过 `pingcode attachment` 子命令上传、查看、获取和删除 PingCode 附件。

附件支持挂到多种主体上：`work_item`（工作项）、`work_item_deliverable`（工作项交付物）、`test_case`（测试用例）、`test_run`（测试执行）、`idea`（需求）、`ticket`（工单）、`page`（Wiki 页面）。

对于 `work_item` 和 `work_item_deliverable`，`principal_id` 支持使用工作项编号（如 `SCR-123`），CLI 会自动通过 `/v1/project/work_items?identifier=...` 解析为真实 id。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

如果缺少凭证，CLI 会输出配置指引，按指引配置后重试。不要要求用户在对话中粘贴凭证或令牌。

## 命令

```bash
# 上传文件附件
pingcode attachment upload-file work_item SCR-123 --file ./a.png --title "截图"

# 上传代码片段附件
pingcode attachment upload-snippet work_item SCR-123 --title "示例" --format javascript --content "const a = 'abc';"

# 列出工作项附件
pingcode attachment list work_item SCR-123 --compact

# 获取单个附件
pingcode attachment get att-1 work_item SCR-123

# 删除附件
pingcode attachment delete att-1 work_item SCR-123
```

写操作加 `--dry-run` 可预览请求而不实际发送。列表/获取输出默认使用 `--compact`。

## 主体类型说明

| 子命令 | 支持的主体类型 |
|---|---|
| `upload-file` | `work_item`, `work_item_deliverable`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| `upload-snippet` | `work_item`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| `list` | `work_item`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| `get` | `work_item`, `work_item_deliverable`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| `delete` | `work_item`, `test_case`, `test_run`, `idea`, `ticket`, `page` |

## 操作流程

1. 确认目标主体的类型和 id/identifier。
2. 上传文件时提供 `--file`（本地路径）和 `--title`；上传代码片段时提供 `--title`、`--format`、`--content`。
3. 如果需要把附件挂到评论下，加 `--comment-id`。
4. 写操作优先使用 `--dry-run` 预览。

## 安全规则

- 禁止猜测 `principal_id`。工作项 identifier 会自动解析为 id。
- 写操作优先 `--dry-run` 预览。
- HTTP 429 表示触发频率限制，等待 `x-pc-retry-after` 秒后重试。
- 不要在最终回答中回显令牌值。
- 上传文件时 `--file` 必须是真实存在的本地文件路径。
