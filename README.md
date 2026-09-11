# PingCode CLI

用于让 Codex、OpenCode 等 AI agent 通过 PingCode 官方 REST API 操作项目管理和产品管理数据的 Node.js CLI 与 skill。

## 安装

```bash
npx @metaphorli/pingcode-cli@latest
```

一条命令会检测当前用户已存在的 Codex / OpenCode 目录，并只安装到这些已有 Agent。每个 Agent 的 skills 根目录下会安装一个 `pingcode` skill 目录（仅 SKILL.md 单文件路由卡）：

```text
~/.codex/skills/pingcode/SKILL.md
~/.config/opencode/skills/pingcode/SKILL.md
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
npx @metaphorli/pingcode-cli@latest
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
npx @metaphorli/pingcode-cli@latest --non-interactive --force
```

### 更新

升级到最新版本（覆盖当前用户已存在 Agent 的默认目录）：

```bash
npx @metaphorli/pingcode-cli@latest --force
```

### 高级用法

只安装到某一个 Agent：

```bash
npx @metaphorli/pingcode-cli@latest --codex-only --force
npx @metaphorli/pingcode-cli@latest --opencode-only --force
```

安装到自定义目录（例如项目本地的 `.codex/skills` 或 OpenCode 项目级 `.opencode/skills`）：

```bash
npx @metaphorli/pingcode-cli@latest --target ".codex/skills" --force
npx @metaphorli/pingcode-cli@latest --target "$HOME/.config/opencode/skills" --force
npx @metaphorli/pingcode-cli@latest --target ".opencode/skills" --force
```

`--target` 与 `--codex-only` / `--opencode-only` 互斥；指定 `--target` 后只会安装到给定目录，不再走多 Agent 默认流程。

## 复制给 AI Agent 的安装提示词

把下面这段提示词复制给你的 AI Agent，让它在你的本机环境里完成安装：

```text
请帮我安装 PingCode CLI，让当前 AI Agent 可以通过 PingCode 官方 REST API 查询和操作项目/产品数据。

安装要求：
1. 直接运行：npx @metaphorli/pingcode-cli@latest --force
   该命令会检测当前用户已存在的 Codex 和 OpenCode 目录，并只把 skill 安装到这些已有 Agent 的个人 skills 目录。
2. 安装结束后请检查对应 Agent skills 目录下是否存在 `pingcode` 目录，且目录里有 SKILL.md 入口文件（按你当前使用的 Agent 选择对应路径即可）：
   - ~/.codex/skills/pingcode/SKILL.md
   - ~/.config/opencode/skills/pingcode/SKILL.md
3. 安装完成后，引导我配置环境变量 PINGCODE_CLIENT_ID 和 PINGCODE_CLIENT_SECRET；不要把 secret 写入仓库文件，也不要在对话里回显完整 secret。
4. 如果我还需要默认查询“我的任务”，请继续引导我配置 PINGCODE_USER_NAME 或 PINGCODE_USER_ID。
```

## 能力范围

- 使用 `client_credentials` 获取 PingCode 企业令牌
- 通过 OAuth2 `authorization_code` 获取用户令牌（`pingcode auth login`，含 `refresh_token` 自动刷新）
- 工作项全生命周期：查询、高级搜索（`workitem search` 组合过滤）、创建、更新、批量更新、删除、流转记录、子工作项，以及高频一键命令 `workitem my`（我的未完成项）/ `start`（转为进行中）/ `done`（转为已完成）
- **MCP 服务**：`pingcode mcp` 启动薄 MCP 层（20 个策展工具），`pingcode mcp init` 一键注册到 Codex / OpenCode / Oh My Pi 等客户端
- 项目管理：项目 CRUD/克隆/进度/成员/项目属性，迭代（含分组/类别/批量创建），看板（看板栏/泳道），发布版本（阶段/分组/类别）
- 工作项标签、关联、交付目标、关注人、跨资源关联、活动记录
- 企业级配置：自定义类型/状态/属性、流程，以及类型/状态/属性方案（含状态流转）
- 需求（idea）：查询、搜索、创建、更新、字典与流转记录，企业级需求配置
- 产品：CRUD、成员、标签、需求模块、排期、渠道、工单类型、客户、外部用户
- 工单：CRUD、高级搜索、流转记录、7 类字典与企业级状态/属性/方案管理
- 测试管理：测试库、用例、测试计划、执行用例与执行结果、用例模块、成员、全套字典
- 知识库：空间、页面、正文读写、版本与恢复
- DevOps：代码托管（仓库/分支/提交/引用/PR/评审）、部署环境与部署记录、构建记录
- 协作：评论（多主体 `--principal-type`）、工时登记、评审、组织（成员/团队/部门/职位/角色/企业信息）、审计与登录日志
- 通过子命令（`context`/`workitem`/`auth`/`comment`/`attachment`/`idea`/`product`/`ticket`/`testhub`/`project`/`sprint`/`board`/`version`/`tag`/`relation`/`deliverable`/`config`/`plans`/`wiki`/`scm`/`release`/`build`/`workload`/`review`/`directory`/`platform`）调用 PingCode API

以上能力由同一个 `pingcode` skill 统一提供；每个模块的用法与示例内建在 `pingcode <module> --help` 中（Examples 段），skill 只做路由与规则，不再是平行文档。

## Skill 结构

安装后在同一个 skills 根目录下会有一个 `pingcode` skill 目录，`SKILL.md` 是唯一入口：

| 入口 | 作用 |
|---|---|
| `pingcode/SKILL.md` | 路由卡：前置条件、黄金规则与 26 个模块一览；`SKILL.md` 即全部内容，各模块的子命令与参数细节不再单独成文，直接通过 `pingcode <module> --help` 查看 |

## 子命令

PingCode CLI 通过子命令管理配置和工作项。

### 配置管理 (`context`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `context init` | 交互式初始化工作区上下文 | `pingcode context init` |
| `context list` | 以 JSON 输出当前偏好和字典条目数量 | `pingcode context list` |
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

### 认证管理 (`auth`)

| 子命令 | 说明 |
|---|---|
| `auth login` | OAuth2 用户令牌登录（默认打开浏览器；`--no-browser` 走 URL+授权码；grant-type 自动识别，`--grant-type` 可覆盖） |
| `auth status` | 查看当前认证状态（缓存令牌的类型与有效期） |

### 工作项管理 (`workitem`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `workitem list` | 列出工作项（自动加当前用户/项目/迭代过滤） | `pingcode workitem list --assignee @me --state 进行中` |
| `workitem create` | 创建工作项 | `pingcode workitem create --title "新任务" --type task` |
| `workitem get <id|identifier>` | 获取单个工作项（identifier 自动解析为 id） | `pingcode workitem get SCR-123` |
| `workitem update <id>` | 更新工作项 | `pingcode workitem update SCR-123 --state 已完成` |
| `workitem delete <id|identifier>` | 删除工作项（identifier 自动解析） | `pingcode workitem delete SCR-123 --dry-run` |
| `workitem search` | 高级搜索（组合过滤/日期/自定义属性，POST search 接口） | `pingcode workitem search --keywords "登录" --compact` |
| `workitem batch-update` | 批量更新工作项属性（`--ids` + `--property-name/--property-value`） | `pingcode workitem batch-update --ids ID1,ID2 --property-name priority_id --property-value P1 --dry-run` |
| `workitem transitions <id|identifier>` | 查询工作项状态流转记录列表 | `pingcode workitem transitions SCR-123 --compact` |
| `workitem transition <hid> <id|identifier>` | 查看单条状态流转记录 | `pingcode workitem transition HISTORY_ID SCR-123` |
| `workitem my` | 我的未完成工作项（按当前用户过滤，自动剔除已完成/已关闭，默认精简输出） | `pingcode workitem my --compact` |
| `workitem start <id\|identifier>` | 一键转为进行中（状态名从缓存字典解析，`--state` 可覆盖） | `pingcode workitem start SCR-123 --dry-run` |
| `workitem done <id\|identifier>` | 一键转为已完成 | `pingcode workitem done SCR-123 --dry-run` |

```bash
# 查看当前用户的未完成任务
pingcode workitem list --assignee @me --state 进行中 --compact

# 按类型查询
pingcode workitem list --type bug --assignee @me --compact

# 按关键词搜索
pingcode workitem list --keywords "登录页面" --compact

# 创建工作项（默认负责人为当前用户）
pingcode workitem create --title "实现登录页面" --type task --project "Core" --sprint "Sprint 1"

# 通过编号获取工作项
pingcode workitem get SCR-123

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

### 附件管理 (`attachment`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `attachment upload-file <principal_type> <principal_id>` | 上传文件附件 | `pingcode attachment upload-file work_item SCR-123 --file ./a.png --title 截图` |
| `attachment upload-snippet <principal_type> <principal_id>` | 上传代码片段附件 | `pingcode attachment upload-snippet work_item SCR-123 --title 示例 --format javascript --content "console.log(1)"` |
| `attachment list <principal_type> <principal_id>` | 列出附件 | `pingcode attachment list work_item SCR-123 --compact` |
| `attachment get <attachment-id> <principal_type> <principal_id>` | 获取单个附件 | `pingcode attachment get att-1 work_item SCR-123` |
| `attachment delete <attachment-id> <principal_type> <principal_id>` | 删除附件 | `pingcode attachment delete att-1 work_item SCR-123` |

```bash
# 上传文件附件
pingcode attachment upload-file work_item SCR-123 --file ./a.png --title "截图"

# 上传代码片段
pingcode attachment upload-snippet work_item SCR-123 --title "示例" --format javascript --content "console.log(1)"

# 列出附件
pingcode attachment list work_item SCR-123 --compact

# 获取单个附件
pingcode attachment get att-1 work_item SCR-123

# 删除附件
pingcode attachment delete att-1 work_item SCR-123

# 试运行（预览 API 请求，不发送）
pingcode attachment upload-file work_item SCR-123 --file ./a.png --title "截图" --dry-run
pingcode attachment delete att-1 work_item SCR-123 --dry-run
```

### 需求管理 (`idea`)

| 子命令 | 说明 |
|---|---|
| `idea list` | 查询需求列表（--product 必填） |
| `idea priority-resource-list` | 列出企业级需求优先级 |
| `idea property-plan-list` | 列出需求属性方案 |
| `idea property-plan-property-list <plan_id>` | 列出方案内需求属性 |
| `idea property-resource-list` | 列出企业级需求属性 |
| `idea state-resource-list` | 列出企业级需求状态 |
| `idea search` | 高级搜索需求（POST search） |
| `idea create` | 创建需求（--product/--title 必填） |
| `idea property-resource-create` | 创建企业级需求属性（--options JSON） |
| `idea property-plan-property-add <plan_id> <property_id>` | 添加方案内需求属性 |
| `idea get` | 查看单个需求（identifier 自动解析） |
| `idea priority-resource-get` | 查看企业级需求优先级 |
| `idea property-plan-get` | 查看需求属性方案 |
| `idea property-plan-property-get <plan_id> <property_id>` | 查看方案内需求属性 |
| `idea property-resource-get` | 查看企业级需求属性 |
| `idea state-resource-get` | 查看企业级需求状态 |
| `idea property-resource-update` | 更新企业级需求属性 |
| `idea update` | 更新需求 |
| `idea property-plan-property-remove <plan_id> <property_id>` | 移除方案内需求属性 |
| `idea plans` | 产品级需求排期字典（--product 必填） |
| `idea priorities` | 产品级需求优先级字典（--product 必填） |
| `idea properties` | 产品级需求属性字典（--product 必填） |
| `idea states` | 产品级需求状态字典（--product 必填） |
| `idea suites` | 产品级需求模块字典（--product 必填） |
| `idea transition-histories` | 查询需求状态流转记录列表 |
| `idea transition-history` | 查看单条需求状态流转记录 |

### 产品管理 (`product`)

| 子命令 | 说明 |
|---|---|
| `product channel-list <product_id>` | 列出工单渠道 |
| `product customer-list <product_id>` | 列出客户 |
| `product extuser-list <product_id>` | 列出外部用户 |
| `product list` | 列出product |
| `product member-list <product_id>` | 列出产品成员 |
| `product plan-list <product_id>` | 列出需求排期 |
| `product suite-list <product_id>` | 列出需求模块 |
| `product tag-list <product_id>` | 列出产品标签 |
| `product ticket-type-list <product_id>` | 列出产品工单类型 |
| `product create` | 创建产品（--name/--identifier 必填） |
| `product customer-create` | 创建客户 |
| `product extuser-create` | 创建外部用户（需 email 或 mobile） |
| `product member-add` | 向产品添加成员 |
| `product suite-add` | 添加需求模块 |
| `product tag-add` | 添加产品标签 |
| `product channel-get <product_id> <channel_id>` | 查看工单渠道 |
| `product customer-get <product_id> <customer_id>` | 查看客户 |
| `product extuser-get <product_id> <user_id>` | 查看外部用户 |
| `product get` | 查看product |
| `product member-get <product_id> <member_id>` | 查看产品成员 |
| `product plan-get <product_id>` | 查看需求排期 |
| `product suite-get <product_id> <suite_id>` | 查看需求模块 |
| `product tag-get <product_id> <tag_id>` | 查看产品标签 |
| `product ticket-type-get <product_id> <ticket_type_id>` | 查看产品工单类型 |
| `product customer-update <product_id> <customer_id>` | 更新客户 |
| `product extuser-update <product_id> <user_id>` | 更新外部用户 |
| `product update` | 更新产品 |
| `product extuser-delete <product_id> <user_id>` | 删除外部用户 |
| `product suite-delete <product_id> <suite_id>` | 删除需求模块 |
| `product member-remove <product_id> <member_id>` | 移除产品成员 |
| `product tag-remove <product_id> <tag_id>` | 移除产品标签 |


### 评论管理 (`comment`)

| 子命令 | 说明 | 示例 |
|---|---|---|
| `comment create <id\|identifier>` | 创建工作项评论 | `pingcode comment create SCR-123 --content "需要优化性能"` |
| `comment list <id\|identifier>` | 列出工作项评论 | `pingcode comment list SCR-123 --compact` |
| `comment get <comment-id> <id\|identifier>` | 获取单条评论 | `pingcode comment get cmt-456 SCR-123` |
| `comment delete <comment-id> <id\|identifier>` | 删除评论 | `pingcode comment delete cmt-456 SCR-123` |
| `comment <sub> --principal-type TYPE` | 所有评论子命令支持其他主体：`work_item`（默认）、`work_item_deliverable`、`test_case`、`test_run`、`idea`、`ticket`、`page`；identifier（SCR-123）仅 work_item 系支持 | `pingcode comment create PAGE_ID --content "..." --principal-type page` |

```bash
# 创建工作项评论
pingcode comment create SCR-123 --content "这个工作项需要考虑性能优化"

# 创建回复评论
pingcode comment create SCR-123 --content "已确认，稍后处理" --reply-to cmt-456

# 查看评论列表
pingcode comment list SCR-123 --compact

# 获取单条评论
pingcode comment get cmt-456 SCR-123

# 删除评论
pingcode comment delete cmt-456 SCR-123

# 试运行（预览 API 请求，不发送）
pingcode comment create SCR-123 --content "hello" --dry-run
pingcode comment delete cmt-456 SCR-123 --dry-run
```


### 工单管理 (`ticket`)

| 子命令 | 说明 |
|---|---|
| `ticket list` | 查询工单（--product 必填） |
| `ticket priority-resource-list` | 列出企业级工单优先级 |
| `ticket property-plan-list` | 列出工单属性方案 |
| `ticket property-plan-property-list <plan_id>` | 列出方案内工单属性 |
| `ticket property-resource-list-all` | 列出全部企业级工单属性 |
| `ticket solution-list` | 列出工单解决方案 |
| `ticket state-plan-flow-list <plan_id>` | 列出方案内状态流转 |
| `ticket state-plan-list` | 列出工单状态方案 |
| `ticket state-plan-state-list <plan_id>` | 列出方案内工单状态 |
| `ticket state-resource-list-all` | 列出全部企业级工单状态 |
| `ticket type-resource-list` | 列出企业级工单类型 |
| `ticket search` | 高级搜索工单（mode:query + payload.filter） |
| `ticket create` | 创建工单（--product/--title/--type 必填） |
| `ticket property-resource-create` | 创建企业级工单属性 |
| `ticket state-resource-create` | 创建企业级工单状态 |
| `ticket property-plan-property-add <plan_id> <property_id>` | 添加方案内工单属性 |
| `ticket state-plan-flow-add <plan_id> <from_state_id> <to_state_id>` | 添加方案内状态流转 |
| `ticket state-plan-state-add <plan_id> <state_id>` | 添加方案内工单状态 |
| `ticket get` | 查看单个工单 |
| `ticket priority-resource-get` | 查看企业级工单优先级 |
| `ticket property-plan-get` | 查看工单属性方案 |
| `ticket property-plan-property-get <plan_id> <property_id>` | 查看方案内工单属性 |
| `ticket property-resource-get` | 查看企业级工单属性 |
| `ticket solution-get` | 查看工单解决方案 |
| `ticket state-plan-flow-get <plan_id> <flow_id>` | 查看方案内状态流转 |
| `ticket state-plan-get` | 查看工单状态方案 |
| `ticket state-plan-state-get <plan_id> <state_id>` | 查看方案内工单状态 |
| `ticket state-resource-get` | 查看企业级工单状态 |
| `ticket type-resource-get` | 查看企业级工单类型 |
| `ticket property-resource-update` | 更新企业级工单属性 |
| `ticket state-resource-update` | 更新企业级工单状态 |
| `ticket update` | 更新工单（至少一个字段） |
| `ticket property-plan-property-remove <plan_id> <property_id>` | 移除方案内工单属性 |
| `ticket state-plan-flow-remove <plan_id> <flow_id>` | 移除方案内状态流转 |
| `ticket state-plan-state-remove <plan_id> <state_id>` | 移除方案内工单状态 |
| `ticket channels` | 产品级工单渠道字典（--product 必填） |
| `ticket priorities` | 产品级工单优先级字典（--product 必填） |
| `ticket properties` | 产品级工单属性字典（--product 必填） |
| `ticket solutions` | 产品级工单解决方案字典（--product 必填） |
| `ticket states` | 产品级工单状态字典（--product 必填） |
| `ticket tags` | 产品级工单标签字典（--product 必填） |
| `ticket transition` | 查看单条工单状态流转记录 |
| `ticket transitions` | 查询工单状态流转记录列表 |
| `ticket types` | 产品级工单类型字典（--product 必填） |

### 测试管理 (`testhub`)

| 子命令 | 说明 |
|---|---|
| `testhub case-list` | 查询用例列表（--library-id 必填） |
| `testhub case-property-list` | 列出用例属性 |
| `testhub case-property-plan-list` | 列出用例属性方案 |
| `testhub case-property-plan-property-list <plan_id>` | 列出方案内用例属性 |
| `testhub library-member-list <library_id>` | 列出测试库成员 |
| `testhub plan-list <library_id>` | 列出测试计划 |
| `testhub plan-type-list <library_id>` | 列出计划类型 |
| `testhub run-list` | 列出执行用例 |
| `testhub suite-list` | 查询用例模块（--parent-id 可选） |
| `testhub case-search` | 高级搜索用例（POST search） |
| `testhub run-search` | 高级搜索执行用例（POST search） |
| `testhub case-create` | 创建用例（--test-library-id/--title 必填） |
| `ticket state-plan-flow-get <plan_id> <flow_id>` | 查看方案内状态流转 |
| `testhub plan-create` | 创建测试计划（--name/--type-id/--start-at/--end-at/--assignee-id 必填） |
| `testhub run-create` | 创建执行用例 |
| `testhub case-bulk-create` | 批量创建用例（--items JSON） |
| `testhub run-bulk-create` | 批量创建执行用例（--items JSON） |
| `testhub case-property-plan-property-add <plan_id> <property_id>` | 添加方案内用例属性 |
| `testhub library-member-add <library_id> <member_id>` | 添加测试库成员 |
| `testhub suite-add <library_id> <suite_id>` | 添加用例模块 |
| `testhub case-get` | 查看测试用例 |
| `testhub case-important-level-get` | 查看用例重要程度 |
| `testhub case-property-create` | 创建用例属性（--name/--type 必填，--options JSON） |
| `testhub case-property-get` | 查看用例属性 |
| `testhub case-property-plan-get` | 查看用例属性方案 |
| `testhub case-property-plan-property-get <plan_id> <property_id>` | 查看方案内用例属性 |
| `testhub case-state-get` | 查看用例状态 |
| `testhub case-type-get` | 查看用例类型 |
| `testhub library-member-get <library_id> <member_id>` | 查看测试库成员 |
| `testhub plan-get <library_id> <plan_id>` | 查看测试计划 |
| `testhub plan-state-get` | 查看计划状态 |
| `testhub plan-type-get <library_id>` | 查看计划类型 |
| `testhub run-get` | 查看执行用例 |
| `testhub run-status-get` | 查看执行结果状态 |
| `testhub suite-get <library_id> <suite_id>` | 查看用例模块 |
| `testhub case-property-update` | 更新用例属性 |
| `testhub case-update` | 更新测试用例 |
| `testhub library-member-update <library_id> <member_id>` | 更新测试库成员 |
| `testhub plan-update <library_id> <plan_id>` | 更新测试计划 |
| `testhub run-update` | 更新执行用例（提交执行结果，--status-id 必填） |
| `testhub suite-update <library_id> <suite_id>` | 更新用例模块 |
| `testhub case-bulk-update` | 批量更新用例（--items JSON） |
| `testhub run-bulk-update` | 批量更新执行用例（--items JSON） |
| `testhub case-delete` | 删除测试用例 |
| `testhub suite-delete <library_id> <suite_id>` | 删除用例模块 |
| `testhub case-property-plan-property-remove <plan_id> <property_id>` | 移除方案内用例属性 |
| `testhub library-member-remove <library_id> <member_id>` | 移除测试库成员 |
| `testhub case-histories` | 查询用例各执行的最后一次执行结果 |
| `testhub run-histories` | 查询执行用例的结果记录列表 |
| `testhub run-history` | 查看单条执行结果记录 |
| `testhub case-important-levels` | 测试用例 · important-levels |
| `testhub case-states` | 测试用例 · states |
| `testhub case-types` | 测试用例 · types |
| `testhub library-create` | 创建测试库（--name/--identifier 必填） |
| `testhub library-get` | 查看测试库 |
| `testhub library-list` | 查询测试库列表 |
| `testhub library-update` | 更新测试库 |
| `testhub plan-states` | 测试计划 · states |
| `testhub run-statuses` | 执行用例 · statuses |

### 项目实体 (`project` / `sprint` / `board` / `version`)

| 子命令 | 说明 |
|---|---|
| `project member-list <project_id>` | 列出项目成员 |
| `project prop-list <project_id>` | 列出项目属性 |
| `project create` | 创建项目 |
| `project member-add` | 向项目添加成员（--type user|user_group，--role-id 可选） |
| `project prop-add <project_id> <property_id>` | 添加项目属性 |
| `project get` | 查看项目 |
| `project member-get <project_id> <member_id>` | 查看项目成员 |
| `project prop-get <project_id> <property_id>` | 查看项目属性 |
| `project member-update <project_id> <member_id>` | 更新项目成员 |
| `project update` | 更新项目 |
| `project member-remove <project_id> <member_id>` | 移除项目成员 |
| `project prop-remove <project_id> <property_id>` | 移除项目属性 |
| `project clone` | 克隆项目 |
| `project local-config-enable` | 开启项目本地配置 |
| `project progress` | 查看项目工作项统计进度 |
| `project project-states` | 查询项目状态字典 |
| `sprint category-list <project_id>` | 列出迭代类别 |
| `sprint list <project_id>` | 列出迭代 |
| `sprint section-list <project_id>` | 列出迭代分组 |
| `sprint category-create <project_id>` | 创建迭代类别 |
| `sprint create <project_id>` | 创建迭代 |
| `sprint section-create <project_id>` | 创建迭代分组 |
| `sprint bulk-create` | 批量创建迭代（--items JSON，全局接口） |
| `sprint category-get <project_id> <category_id>` | 查看迭代类别 |
| `sprint get <project_id> <sprint_id>` | 查看迭代 |
| `sprint section-get <project_id> <section_id>` | 查看迭代分组 |
| `sprint category-update <project_id> <category_id>` | 更新迭代类别 |
| `sprint section-update <project_id> <section_id>` | 更新迭代分组 |
| `sprint update <project_id> <sprint_id>` | 更新迭代 |
| `sprint category-delete <project_id> <category_id>` | 删除迭代类别 |
| `sprint section-delete <project_id> <section_id>` | 删除迭代分组 |
| `board entry-list <project_id> <board_id>` | 列出看板栏 |
| `board list <project_id>` | 列出看板 |
| `board swimlane-list <project_id> <board_id>` | 列出泳道 |
| `board create <project_id>` | 创建看板 |
| `board entry-create <project_id> <board_id>` | 创建看板栏 |
| `board swimlane-create <project_id> <board_id>` | 创建泳道 |
| `board entry-get <project_id> <board_id> <entry_id>` | 查看看板栏 |
| `board get <project_id> <board_id>` | 查看看板 |
| `board swimlane-get <project_id> <board_id> <swimlane_id>` | 查看泳道 |
| `board entry-update <project_id> <board_id> <entry_id>` | 更新看板栏 |
| `board swimlane-update <project_id> <board_id> <swimlane_id>` | 更新泳道 |
| `board update <project_id> <board_id>` | 更新看板 |
| `board delete <project_id> <board_id>` | 删除看板 |
| `board entry-delete <project_id> <board_id> <entry_id>` | 删除看板栏 |
| `board swimlane-delete <project_id> <board_id> <swimlane_id>` | 删除泳道 |
| `version category-list <project_id>` | 列出发布类别 |
| `version list <project_id>` | 列出发布版本 |
| `version section-list <project_id>` | 列出发布分组 |
| `version stage-list` | 列出发布阶段 |
| `version category-create <project_id>` | 创建发布类别 |
| `version create <project_id>` | 创建发布版本 |
| `version section-create <project_id>` | 创建发布分组 |
| `version stage-create` | 创建发布阶段 |
| `version bulk-create <project_id>` | 批量创建发布版本 |
| `version category-get <project_id> <category_id>` | 查看发布类别 |
| `version get <project_id> <version_id>` | 查看发布版本 |
| `version section-get <project_id> <section_id>` | 查看发布分组 |
| `version stage-get` | 查看发布阶段 |
| `version category-update <project_id> <category_id>` | 更新发布类别 |
| `version section-update <project_id> <section_id>` | 更新发布分组 |
| `version stage-update` | 更新发布阶段 |
| `version update <project_id> <version_id>` | 更新发布版本 |
| `version category-delete <project_id> <category_id>` | 删除发布类别 |
| `version delete <project_id> <version_id>` | 删除发布版本 |
| `version section-delete <project_id> <section_id>` | 删除发布分组 |
| `version stage-delete` | 删除发布阶段 |

### 标签 / 关联 / 交付目标 (`tag` / `relation` / `deliverable`)

| 子命令 | 说明 |
|---|---|
| `tag list` | 列出工作项标签 |
| `tag create` | 创建工作项标签 |
| `tag add` | 向工作项添加标签（identifier 自动解析） |
| `tag get` | 查看工作项标签 |
| `tag update` | 更新工作项标签 |
| `tag delete` | 删除工作项标签 |
| `tag remove` | 从工作项移除标签（identifier 自动解析） |
| `relation list` | 查询工作项的关联列表 |
| `relation type-list` | 列出工作项关联类型 |
| `relation add` | 创建工作项关联（--relation-type 必填） |
| `relation get <id|identifier> <relation_id>` | 查看工作项关联 |
| `relation type-get` | 查看工作项关联类型 |
| `relation remove <id|identifier> <relation_id>` | 移除工作项关联 |
| `deliverable list` | 查询交付目标（--project-id/--work-item-id 可选） |
| `deliverable create` | 创建交付目标（--work-item-id/--name 必填） |
| `deliverable get` | 查看交付目标 |
| `deliverable update` | 更新交付目标 |
| `deliverable delete` | 删除交付目标 |

### 企业配置 (`config` / `plans`)

| 子命令 | 说明 |
|---|---|
| `config process-list` | 列出项目流程 |
| `config project-property-list` | 列出全局项目属性 |
| `config property-list` | 列出工作项属性 |
| `config state-list` | 列出工作项状态 |
| `config type-list-all` | 查询全部工作项类型（企业级） |
| `config project-property-create` | 创建全局项目属性 |
| `config property-create` | 创建工作项属性 |
| `config state-create` | 创建工作项状态 |
| `config type-create` | 创建工作项类型 |
| `config priority-get` | 查看工作项优先级 |
| `config process-get` | 查看项目流程 |
| `config project-property-get` | 查看全局项目属性 |
| `config project-state-get` | 查看项目状态 |
| `config property-get` | 查看工作项属性 |
| `config state-get` | 查看工作项状态 |
| `config type-get` | 查看工作项类型 |
| `config project-property-update` | 更新全局项目属性 |
| `config property-update` | 更新工作项属性 |
| `config state-update` | 更新工作项状态（仅非系统状态） |
| `config type-update` | 更新工作项类型 |
| `config type-delete` | 删除工作项类型 |
| `plans flow-list <plan_id>` | 列出状态流转 |
| `plans property-plan-list` | 列出属性方案 |
| `plans property-plan-property-list <plan_id>` | 列出方案内属性 |
| `plans state-plan-list` | 列出状态方案 |
| `plans state-plan-state-list <plan_id>` | 列出方案内状态 |
| `plans type-plan-list` | 列出类型方案 |
| `plans type-plan-type-list <plan_id>` | 列出方案内类型 |
| `plans flow-add <plan_id> <flow_id>` | 添加状态流转 |
| `plans property-plan-property-add <plan_id> <property_id>` | 添加方案内属性 |
| `plans state-plan-state-add <plan_id> <state_id>` | 添加方案内状态 |
| `plans type-plan-type-add <plan_id> <type_id>` | 添加方案内类型 |
| `plans flow-get <plan_id> <flow_id>` | 查看状态流转 |
| `plans property-plan-get` | 查看属性方案 |
| `plans property-plan-property-get <plan_id> <property_id>` | 查看方案内属性 |
| `plans state-plan-get` | 查看状态方案 |
| `plans state-plan-state-get <plan_id> <state_id>` | 查看方案内状态 |
| `plans type-plan-get` | 查看类型方案 |
| `plans type-plan-type-get <plan_id> <type_id>` | 查看方案内类型 |
| `plans type-plan-type-update <plan_id> <type_id>` | 更新方案内类型 |
| `plans flow-remove <plan_id> <flow_id>` | 移除状态流转 |
| `plans property-plan-property-remove <plan_id> <property_id>` | 移除方案内属性 |
| `plans state-plan-state-remove <plan_id> <state_id>` | 移除方案内状态 |
| `plans type-plan-type-remove <plan_id> <type_id>` | 移除方案内类型 |

### 知识库 (`wiki`)

| 子命令 | 说明 |
|---|---|
| `wiki member-list <space_id>` | 列出空间成员 |
| `wiki page-list` | 查询页面（--space-id 必填） |
| `wiki space-list` | 列出知识空间 |
| `wiki version-list <page_id>` | 列出页面版本 |
| `wiki page-create` | 创建页面（--space-id/--name 必填，--content+--format-type 可选） |
| `wiki space-create` | 创建知识空间 |
| `wiki member-add <space_id> <member_id>` | 添加空间成员 |
| `wiki content-get` | 读取文档正文 |
| `wiki member-get <space_id> <member_id>` | 查看空间成员 |
| `wiki page-get` | 查看页面 |
| `wiki space-get` | 查看知识空间 |
| `wiki version-get <page_id> <version_id>` | 查看页面版本 |
| `wiki content-update` | 更新文档正文（PUT 全量替换） |
| `wiki page-update` | 更新页面 |
| `wiki space-update` | 更新知识空间 |
| `wiki page-delete` | 删除页面 |
| `wiki space-delete` | 删除知识空间 |
| `wiki member-remove <space_id> <member_id>` | 移除空间成员 |
| `wiki version-restore` | 恢复页面到指定版本 |

### DevOps (`scm` / `release` / `build`)

| 子命令 | 说明 |
|---|---|
| `scm branch-list <platform_id> <repository_id>` | 列出代码分支 |
| `scm commit-list` | 列出代码提交 |
| `scm platform-list` | 列出托管平台 |
| `scm pr-list <platform_id> <repository_id>` | 列出拉取请求 |
| `scm ref-list` | 查询提交引用（--meta-type/--meta-id 必填） |
| `scm repo-list <platform_id>` | 列出代码仓库 |
| `scm review-list <platform_id> <repository_id> <pull_request_id>` | 列出PR 代码评审 |
| `scm user-list <platform_id>` | 列出平台用户 |
| `scm branch-create <platform_id> <repository_id>` | 创建代码分支 |
| `scm commit-create` | 上报代码提交 |
| `scm platform-create` | 创建托管平台 |
| `scm pr-create <platform_id> <repository_id>` | 创建拉取请求 |
| `scm ref-create` | 创建提交引用（--meta-type/--meta-id 必填） |
| `scm repo-create <platform_id>` | 创建代码仓库 |
| `scm review-create <platform_id> <repository_id> <pull_request_id>` | 创建PR 代码评审 |
| `scm user-create <platform_id>` | 创建平台用户 |
| `scm branch-get <platform_id> <repository_id> <branch_id>` | 查看代码分支 |
| `scm commit-get` | 查看提交（id 或 sha） |
| `scm platform-get` | 查看托管平台 |
| `scm pr-get <platform_id> <repository_id> <pull_request_id>` | 查看拉取请求 |
| `scm ref-get <platform_id> <repository_id> <ref_id>` | 查看提交引用 |
| `scm repo-get <platform_id> <repository_id>` | 查看代码仓库 |
| `scm review-get <platform_id> <repository_id> <pull_request_id> <review_id>` | 查看PR 代码评审 |
| `scm user-get <platform_id> <user_id>` | 查看平台用户 |
| `scm branch-update <platform_id> <repository_id> <branch_id>` | 更新代码分支 |
| `scm platform-update` | 更新托管平台 |
| `scm pr-update <platform_id> <repository_id> <pull_request_id>` | 更新拉取请求 |
| `scm repo-update <platform_id> <repository_id>` | 更新代码仓库 |
| `scm review-update <platform_id> <repository_id> <pull_request_id> <review_id>` | 更新PR 代码评审 |
| `scm user-update <platform_id> <user_id>` | 更新平台用户 |
| `scm branch-delete` | 删除分支（默认分支不可删） |
| `release deploy-list` | 查询部署记录（--status 枚举校验） |
| `release env-list` | 查询部署环境（--name 必填） |
| `release deploy-create` | 创建部署记录 |
| `release env-create` | 创建部署环境 |
| `release deploy-get` | 查看部署记录 |
| `release env-get` | 查看部署环境 |
| `release deploy-update` | 全量更新部署记录（PUT，字段齐全） |
| `release env-update` | 全量更新部署环境（PUT，字段齐全） |
| `release deploy-patch` | 局部更新部署记录 |
| `release env-patch` | 局部更新部署环境 |
| `release deploy-delete` | 删除部署记录 |
| `release env-delete` | 删除部署环境 |
| `build list` | 列出构建记录 |
| `build create` | 创建构建记录 |
| `build get` | 查看构建记录 |
| `build update` | 全量更新构建记录（PUT，字段齐全） |
| `build patch` | 局部更新构建记录 |
| `build delete` | 删除构建记录 |

### 组织与平台 (`directory` / `platform` / `workload` / `review`)

| 子命令 | 说明 |
|---|---|
| `directory department-list` | 列出部门 |
| `directory group-list` | 列出团队 |
| `directory group-member-list <group_id>` | 列出团队成员 |
| `directory job-list` | 列出职位 |
| `directory role-list` | 列出角色 |
| `directory user-list` | 列出企业成员 |
| `directory department-create` | 创建部门 |
| `directory group-create` | 创建团队 |
| `directory user-create` | 创建企业成员 |
| `directory group-member-add` | 向团队添加成员 |
| `directory department-get` | 查看部门 |
| `directory group-get` | 查看团队 |
| `directory group-member-get <group_id> <member_id>` | 查看团队成员 |
| `directory job-get` | 查看职位 |
| `directory role-get` | 查看角色 |
| `directory user-get` | 查看企业成员 |
| `directory department-update` | 更新部门 |
| `directory group-update` | 更新团队 |
| `directory user-update` | 更新企业成员 |
| `directory user-bulk-update` | 批量更新企业成员（--items JSON） |
| `directory department-delete` | 删除部门 |
| `directory group-member-remove <group_id> <member_id>` | 移除团队成员 |
| `directory me` | 查看当前登录用户信息 |
| `directory team` | 查看企业信息 |
| `platform activity-list` | 查询动态（--principal-type/--principal-id 必填） |
| `platform link-list` | 查询通用关联（--target-type 必填） |
| `platform participant-list` | 查询关注人（--principal-type 必填） |
| `platform link-create` | 创建跨资源关联（principal/target 四参数必填） |
| `platform participant-add` | 添加关注人（--participant-id/--type 必填；work_item 主体支持 identifier） |
| `platform activity-get` | 查看动态（--principal-type/--principal-id 必填） |
| `platform link-get` | 查看通用关联 |
| `platform participant-get` | 查看关注人（--principal-type 必填） |
| `platform link-remove` | 移除通用关联 |
| `platform participant-remove` | 移除关注人（--principal-type 必填） |
| `platform audit-logs` | 查询审计日志（--operated-between 必填，只读） |
| `platform login-logs` | 查询登录日志（--logged-between 必填，只读） |
| `workload list` | 查询工时（--principal-type/--principal-id 必填） |
| `workload type-list` | 列出工时类型 |
| `workload create` | 登记工时（--duration 单位分钟，--report-at 必填） |
| `workload get` | 查看工时 |
| `workload type-get` | 查看工时类型 |
| `workload update` | 更新工时 |
| `workload delete` | 删除工时 |
| `review list` | 查询评审（--principal-type/--pilot-id 必填） |
| `review principal-list <review_id>` | 列出评审内容 |
| `review create` | 创建评审（--principal-type/--pilot-id 必填） |
| `review principal-add <review_id> --principal-id USER_ID --type user` | 添加评审内容 |
| `review get` | 查看评审（--principal-type/--principal-id 必填） |
| `review principal-get <review_id> <principal_id>` | 查看评审内容 |
| `review delete` | 删除评审（--principal-type/--principal-id 必填） |
| `review principal-remove <review_id> <principal_id>` | 移除评审内容 |

所有模块均支持全局选项 `--dry-run`（预览请求不发送）、`--compact`（精简输出）、`--no-token-cache`、`--no-workspace-cache` 及连接/凭证选项；完整参数见 `pingcode <module> --help` 与 `pingcode <module> <subcommand> --help`。

### MCP 服务 (`mcp`)

CLI 是唯一引擎；`pingcode mcp` 把它包装成 MCP 服务，暴露 20 个策展工具（不是全部 432 个命令的直通），供 Claude Desktop / Cursor 等不会敲终端的客户端使用。

| 子命令 | 说明 |
|---|---|
| `mcp` | 在 stdio 上启动 MCP 服务（供客户端配置 `command: pingcode, args: [mcp]`） |
| `mcp init [--tool codex\|opencode\|omp ... \| --all]` | 把服务注册进 AI 客户端配置：Codex `~/.codex/config.toml`、OpenCode `~/.config/opencode/opencode.json`、Oh My Pi `~/.omp/agent/mcp.json`；保留其他 server，`--dry-run` 预览，`--yes` 跳过确认 |

```bash
# 启动 MCP 服务（一般由客户端自动拉起，无需手动常驻）
pingcode mcp

# 一键注册到全部支持的客户端（先预览）
pingcode mcp init --all --dry-run
pingcode mcp init --all --yes

# 只注册到指定客户端
pingcode mcp init --tool codex --tool omp --client-id ID --client-secret SECRET
```

策展工具清单（20 个）：`pingcode_auth_status`、`pingcode_list_projects`、`pingcode_list_sprints`、`pingcode_list_users`、`pingcode_context_get`、`pingcode_context_set`、`pingcode_workitem_list`、`pingcode_workitem_get`、`pingcode_workitem_create`、`pingcode_workitem_update`、`pingcode_workitem_delete`、`pingcode_workitem_search`、`pingcode_workitem_my`、`pingcode_workitem_start`、`pingcode_workitem_done`、`pingcode_comment_create`、`pingcode_comment_list`、`pingcode_workload_create`、`pingcode_product_list`、`pingcode_idea_list`。每个工具内部复用对应 CLI 命令的全部逻辑（identifier 解析、工作区缓存、错误提示）。长尾操作（测试库配置、知识库、DevOps 等）请在终端使用对应 CLI 命令。

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
# 默认行为：打印授权 URL 并提示粘贴授权码
pingcode auth login --client-id ID --client-secret SECRET

# 自动打开浏览器完成授权
pingcode auth login --client-id ID --client-secret SECRET --browser

# 使用用户令牌查询工作项
# --grant-type 会自动从缓存中识别，且 workitem list 不再默认按当前用户过滤
pingcode workitem list --state 进行中 --compact
```

首次使用用户令牌前必须先运行 `auth login`。`auth login` 成功后的用户令牌会缓存在默认 token cache 中，后续命令不再需要在命令行写 `--grant-type`。当缓存里是企业令牌时，命令仍然走 `client_credentials`；当缓存里是用户令牌时，走 `authorization_code`。显式传 `--grant-type` 会覆盖自动识别。

使用用户令牌时，`workitem list` 不再默认按当前用户过滤（等价于之前加 `--all-users` 的效果），因此不需要配置 `PINGCODE_USER_ID` 或工作区用户。如果你仍想只看自己的，可以显式加 `--assignee @me` 或 `--user-id`。`client_credentials` 模式下仍保持原来的默认过滤行为。

## 工作区缓存

CLI 默认把工作区偏好和常用字典缓存到 `.pingcode/cache.json`，该目录已被 `.gitignore` 忽略。缓存内容包括：
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

- 主入口：[skills/pingcode/SKILL.md](skills/pingcode/SKILL.md)（唯一入口；各模块用法见 `pingcode <module> --help`）
- 官方文档：https://open.pingcode.com/

