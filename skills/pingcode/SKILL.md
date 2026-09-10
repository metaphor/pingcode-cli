---
name: pingcode
description: 当用户提到 PingCode、工作项、任务、缺陷、故事、需求/idea、项目、迭代、测试用例、测试计划、工单、知识库、页面、工时、代码仓库、分支、提交、拉取请求、构建、部署、评审、用户令牌、OAuth 登录、认证、查看我的任务、创建或更新工作项时使用此 skill。即使未明确点名，只要请求涉及 PingCode 数据操作，就优先触发此 skill。
---

# PingCode

统一的 PingCode CLI 操作 skill：认证、工作区上下文与工作项。

## 何时使用此 skill

只要用户请求涉及 PingCode 数据，就优先触发：

- 查看/查询工作项、任务、缺陷、故事、需求/idea、产品、附件、工单、测试用例/测试计划/执行结果、知识库页面、工时、代码仓库/分支/提交/PR、构建/部署/评审、标签/关联/交付物
- 创建/更新/删除/搜索工作项或需求，或修改状态、负责人、迭代，批量更新工作项
- 创建/更新测试库、用例、测试计划，提交执行结果；创建工单；读写知识库页面正文；登记工时
- 管理项目/迭代/看板/发布版本、企业级配置（类型/状态/属性方案）、客户、团队成员
- 上传、查看、删除 PingCode 附件（文件或代码片段）
- 初始化或切换项目、迭代、用户上下文
- 登录 PingCode、切换令牌类型、处理认证问题
- 任何提到「PingCode」「我的任务」「未解决缺陷」「产品」等的请求

## 快速开始

```bash
# 1. 认证（用户令牌，默认打开浏览器）
pingcode auth login --client-id ID --client-secret SECRET

# 1.1 无浏览器环境（远程服务器/容器）使用 URL+授权码方式
pingcode auth login --client-id ID --client-secret SECRET --no-browser

# 2. 初始化工作区上下文
pingcode context init

# 3. 列出工作项
pingcode workitem list --assignee @me --compact
```

## 前置条件

调用任何 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

可选配置：

```bash
export PINGCODE_BASE_URL="https://open.pingcode.com"
export PINGCODE_TOKEN_CACHE="$HOME/.cache/pingcode/token.json"
export PINGCODE_WORKSPACE_CACHE=".pingcode/cache.json"
```

不要要求用户在对话中粘贴凭证或令牌，不要在最终回答中回显令牌值。

## 执行工作项命令前检查

在回答 `pingcode workitem *` 相关请求前，先确认工作区缓存是否完整：

1. 运行 `pingcode context list` 查看 `current_user_id`、`current_project_id`、`current_sprint_id` 是否已缓存
2. 缺少任一项时，先引导用户完成 `pingcode context init`（终端交互）或按 Agent 前台问答流程选择项目、迭代、用户
3. 完成后再重试原工作项命令

## 路由表

按用户请求场景选择要阅读的参考文件：

- 登录、切换令牌、询问认证方式或 grant_type、查看当前认证状态 → 阅读 `references/auth.md`
- 选择项目/迭代/用户、初始化上下文、Agent 前台问答 → 阅读 `references/ctx.md`
- 查询/创建/更新/删除/搜索工作项、改状态、指派负责人、批量更新、流转记录 → 阅读 `references/workitem.md`
- 查询/创建/更新需求及其企业级配置 → 阅读 `references/idea.md`
- 查询产品及成员/标签/模块/客户/外部用户 → 阅读 `references/product.md`
- 查看/创建/删除工作项或其他主体评论 → 阅读 `references/comment.md`
- 上传/查看/删除附件 → 阅读 `references/attachment.md`
- 工单 CRUD/搜索/字典/企业配置 → 阅读 `references/ticket.md`
- 测试库/用例/测试计划/执行用例 → 阅读 `references/testhub.md`
- 项目/迭代/看板/发布版本/标签/关联/交付目标 → 阅读 `references/entities.md`
- 企业级类型/状态/属性及配置方案 → 阅读 `references/config.md`
- 代码托管/部署环境/构建记录 → 阅读 `references/devops.md`
- 知识库/工时/评审/组织成员/关注人/审计日志 → 阅读 `references/collab.md`

## 自然语言速查表

将常见请求映射为 CLI 命令：

| 用户请求 | 对应命令 |
|---|---|
| 查看我当前没完成的任务 | `pingcode workitem list --assignee @me --state 进行中 --compact` |
| 查看我的未解决缺陷 | `pingcode workitem list --type bug --assignee @me --state 未解决 --compact` |
| 在故事下新增任务 | `pingcode workitem create --title "标题" --type task --parent STORY-123 --dry-run` |
| 把工作项改成已完成 | `pingcode workitem update SCR-123 --state 已完成 --dry-run` |
| 查看某产品下的需求 | `pingcode idea list --product PRODUCT_ID --compact` |
| 查看 PingCode 产品列表 | `pingcode product list --compact` |
| 查看 PingCode 产品详情 | `pingcode product get PRODUCT_ID` |
| 创建需求并预览 | `pingcode idea create --product PRODUCT_ID --title "新增登录" --dry-run` |
| 初始化当前项目/迭代/用户 | `pingcode context init` |
| 登录 PingCode 获取用户令牌（默认打开浏览器） | `pingcode auth login --client-id ID --client-secret SECRET` |
| 登录 PingCode 获取用户令牌（无浏览器环境） | `pingcode auth login --client-id ID --client-secret SECRET --no-browser` |
| 查看 PingCode 认证状态 | `pingcode auth status` |
| 查看工作项评论 | `pingcode comment list SCR-123 --compact` |
| 添加工作项评论 | `pingcode comment create SCR-123 --content "..." --dry-run` |
| 查看工作项附件列表 | `pingcode attachment list work_item SCR-123 --compact` |
| 上传文件到工作项 | `pingcode attachment upload-file work_item SCR-123 --file ./a.png --title "截图" --dry-run` |
| 上传代码片段到工作项 | `pingcode attachment upload-snippet work_item SCR-123 --title "示例" --format javascript --content "..." --dry-run` |
| 删除工作项 | `pingcode workitem delete SCR-123 --dry-run` |
| 组合条件搜索工作项 | `pingcode workitem search --keywords "登录" --compact` |
| 查看工作项流转记录 | `pingcode workitem transitions SCR-123 --compact` |
| 查看测试用例列表 | `pingcode testhub case-list --library-id LIBRARY_ID --compact` |
| 提交用例执行结果 | `pingcode testhub run-update RUN_ID --status-id STATUS_ID --dry-run` |
| 创建知识库页面 | `pingcode wiki page-create --space-id SPACE_ID --name 纪要 --dry-run` |
| 登记工时 | `pingcode workload create --principal-type work_item --principal-id ID --duration 120 --report-at 1736985600 --dry-run` |
| 给工作项打标签 | `pingcode tag add SCR-123 TAG_ID --dry-run` |
| 查看当前用户信息 | `pingcode directory me` |
| 在页面上添加评论 | `pingcode comment create PAGE_ID --content "..." --principal-type page` |

## 安全规则

- 禁止回显令牌值。
- 禁止猜测 `state_id`、`type_id`、`priority_id`、`project_id`、`product_id`。先通过 list 命令或上下文字典将名称解析为 ID。
- 需求字典（`states`、`properties`、`suites`、`plans`、`priorities`）必须使用 raw ID；不要猜测 `suite_id`、`plan_id`、`state_id`、`priority_id`。`product_id` 同样必须是 raw ID。
- HTTP 429 表示触发频率限制，等待 `x-pc-retry-after` 秒后重试。
- 写操作先使用 `--dry-run` 预览请求，确认后再执行真实写入。
- 默认使用 `--compact` 展示 list/get 输出，除非用户要求完整详情。
- 未缓存工作区上下文时，不要直接执行写操作；先引导用户完成上下文初始化。

## 常见错误处理

- 缺少 `PINGCODE_CLIENT_ID`/`PINGCODE_CLIENT_SECRET`：输出配置指引，不要索取用户粘贴 secret。
- 用户令牌模式下工作项过滤行为变化：不再默认按当前用户过滤，需显式加 `--assignee @me`（详见 `references/auth.md`）。
- 429 限流：读取响应头 `x-pc-retry-after` 后等待并重试。
- 缓存中缺少项目/迭代/用户：先执行 `pingcode context init` 或按 Agent 前台问答流程补全。

