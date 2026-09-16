# PingCode CLI

让 AI Agent 和开发者通过官方 REST API 操作 PingCode 的 Node.js 工具：**CLI（pingcode 命令，28 个模块 / 432 个子命令，含 `install` skill 安装器与 `update` 自更新）**、**MCP 服务（pingcode mcp，20 个策展工具）** 与一份极简 skill 路由卡。

## 安装

```bash
npx @metaphorli/pingcode-cli@latest install
```

一条命令会检测当前用户已存在的 Codex / OpenCode 目录，并只安装到这些已有 Agent。每个 Agent 的 skills 根目录下会安装一个 `pingcode` skill 目录（仅 SKILL.md 单文件路由卡）：

```text
~/.codex/skills/pingcode/SKILL.md
~/.config/opencode/skills/pingcode/SKILL.md
```

默认会进入交互式安装，先选择“全局 / 项目级”，再选择要安装的 Agent；在 CI 或脚本中可以使用 `--non-interactive` 保持旧的静默自动安装行为。任何一个已选择目录写入失败（权限、磁盘等问题）不会阻断其他目录，安装结束时会打印每个目录的成功/失败/跳过摘要。

安装时还会在 `~/.local/bin/pingcode` 写入一个全局 wrapper，并把该目录加入 shell PATH。通过 npx 运行安装时，命令会先执行 `npm install -g @metaphorli/pingcode-cli@latest`，wrapper 指向这份持久的全局安装（而不是临时的 npx 缓存目录），因此后续 `pingcode update` 直接生效、不会出现"双安装"。

如果设置了 `CODEX_HOME`，Codex 目录会变成 `$CODEX_HOME/skills/`；其他 Agent 的目录位置不受该变量影响。

安装完成后，配置 PingCode 凭证（详见下文「凭证配置」一节）：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

### 交互式安装（默认）

直接运行安装命令会进入交互式向导：

```bash
npx @metaphorli/pingcode-cli@latest install
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
npx @metaphorli/pingcode-cli@latest install --non-interactive --force
```

### 更新

升级 CLI 到最新版本（检查 npm 最新版本并全局升级）：

```bash
pingcode update            # 检查并升级到最新版
pingcode update --check    # 只检查，不安装
```

未全局安装时，等价命令是 `npm install -g @metaphorli/pingcode-cli@latest`；`pingcode -v` 会显示当前版本并顺带检查 npm 上的最新版本。

`pingcode update` 升级全局安装后，若 PATH 上的 `pingcode` 是指向 npx 缓存的旧 wrapper，会自动把它重新指向新的全局安装。从仍存在该问题的旧版本升级时，请先重跑一次 `npx @metaphorli/pingcode-cli@latest install` 修复 wrapper，之后的 `pingcode update` 即可完全自愈。

升级后刷新已安装的 skill 文件：

```bash
npx @metaphorli/pingcode-cli@latest install --force
```

### 高级用法

只安装到某一个 Agent：

```bash
npx @metaphorli/pingcode-cli@latest install --codex-only --force
npx @metaphorli/pingcode-cli@latest install --opencode-only --force
```

安装到自定义目录（例如项目本地的 `.codex/skills` 或 OpenCode 项目级 `.opencode/skills`）：

```bash
npx @metaphorli/pingcode-cli@latest install --target ".codex/skills" --force
npx @metaphorli/pingcode-cli@latest install --target "$HOME/.config/opencode/skills" --force
npx @metaphorli/pingcode-cli@latest install --target ".opencode/skills" --force
```

`--target` 与 `--codex-only` / `--opencode-only` 互斥；指定 `--target` 后只会安装到给定目录，不再走多 Agent 默认流程。

## 复制给 AI Agent 的安装提示词

把下面这段提示词复制给你的 AI Agent，让它在你的本机环境里完成安装：

```text
请帮我安装 PingCode CLI，让当前 AI Agent 可以通过 PingCode 官方 REST API 查询和操作项目/产品数据。

安装要求：
1. 直接运行：npx @metaphorli/pingcode-cli@latest install --force
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
- 工作项全生命周期：查询、高级搜索（`workitem search` 组合过滤）、创建、更新、批量更新、删除、流转记录、子工作项，以及高频一键命令 `workitem my`（我的未完成项）/ `start`（转为进行中）/ `done`（转为已完成）；`--description` 正文接受 Markdown，发送前自动转为 PingCode 富文本 HTML
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

## 使用方式

同一套引擎、同一份凭证与缓存，两种使用形态：

### CLI（命令行，主力形态）

面向人和能执行命令的 AI Agent。能力按「模块 → 子命令」组织，内置名称→ID 解析、写操作 `--dry-run` 预览、`--compact` 精简输出。

```bash
pingcode auth login --client-id ID --client-secret SECRET   # 登录（用户令牌）
pingcode context init                                       # 初始化工作区上下文（选项目/迭代/用户）
pingcode workitem my --compact                              # 我的未完成项
pingcode workitem done SCR-123                              # 一键完成
pingcode ticket search --filter '{"channel.id":{"in":["C1"]}}' --compact
```

`--help` 是唯一文档源，每个模块都带 Examples：

```bash
pingcode --help                  # 全部模块一览
pingcode workitem --help         # 模块帮助 + 示例
pingcode workitem search --help  # 子命令参数
```

### MCP（薄服务层，给 Claude Desktop / Cursor 等客户端）

`pingcode mcp` 把 CLI 包装成 MCP 服务，只暴露 **20 个策展工具**（对应高频操作，参数对 LLM 友好）；工具内部复用 CLI 命令的全部逻辑。长尾操作请回到 CLI。

```bash
pingcode mcp init --all --yes   # 一键注册到 Codex / OpenCode / Oh My Pi
pingcode mcp                    # 启动 stdio 服务（客户端会自动拉起）
```

Claude Desktop / Cursor 手动配置示例：

```json
{
  "mcpServers": {
    "pingcode": {
      "command": "pingcode",
      "args": ["mcp"],
      "env": {
        "PINGCODE_CLIENT_ID": "your-client-id",
        "PINGCODE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

20 个策展工具：`pingcode_auth_status`、`pingcode_list_projects`、`pingcode_list_sprints`、`pingcode_list_users`、`pingcode_context_get`、`pingcode_context_set`、`pingcode_workitem_list`、`pingcode_workitem_get`、`pingcode_workitem_create`、`pingcode_workitem_update`、`pingcode_workitem_delete`、`pingcode_workitem_search`、`pingcode_workitem_my`、`pingcode_workitem_start`、`pingcode_workitem_done`、`pingcode_comment_create`、`pingcode_comment_list`、`pingcode_workload_create`、`pingcode_product_list`、`pingcode_idea_list`。

## 命令模块一览

全部 432 个子命令的参数与示例见各模块 `--help`，这里只介绍模块定位：

| 模块 | 说明 |
|---|---|
| `workitem` | 工作项全生命周期：查询/高级搜索/创建/更新/批量更新/删除/流转记录/子工作项，以及 `my`/`start`/`done` 高频一键命令 |
| `idea` | 需求：CRUD、高级搜索、字典、流转记录与企业级配置 |
| `product` | 产品：CRUD、成员、标签、需求模块、排期、渠道、工单类型、客户、外部用户 |
| `ticket` | 客服工单：CRUD、搜索、流转记录、字典与企业级配置 |
| `testhub` | 测试管理：测试库、用例、测试计划、执行用例与执行结果、字典 |
| `project` | 项目：CRUD、克隆、进度、成员、项目属性 |
| `sprint` | 迭代：管理、分组、类别、批量创建 |
| `board` | 看板：看板、看板栏、泳道 |
| `version` | 发布：版本、阶段、分组、类别 |
| `tag` | 工作项标签：标签库与打标 |
| `relation` | 工作项关联与关联类型 |
| `deliverable` | 工作项交付目标 |
| `config` | 企业配置：自定义类型/状态/属性、流程、项目属性 |
| `plans` | 配置方案：类型/状态/属性方案与状态流转 |
| `wiki` | 知识库：空间、页面、正文读写、版本 |
| `scm` | 代码托管：平台、仓库、分支、提交、引用、PR、评审 |
| `release` | 部署：环境与部署记录 |
| `build` | 构建记录 |
| `workload` | 工时：登记/查询与工时类型 |
| `review` | 评审与评审内容 |
| `directory` | 组织：成员、团队、部门、职位、角色、企业信息 |
| `platform` | 平台资源：关注人、通用关联、动态、审计与登录日志 |
| `comment` | 评论：多主体（工单/页面/用例等）创建、查询、删除 |
| `attachment` | 附件：文件与代码片段上传、查询、删除 |
| `context` | 工作区上下文：当前用户/项目/迭代与字典缓存 |
| `auth` | 认证：用户令牌登录与状态查询 |
| `install` | Skill 安装器：把 `pingcode` skill 安装/更新到 Codex、OpenCode 与通用 `.agents` 目录（全局安装后直接 `pingcode install`） |
| `update` | 自更新：检查 npm 最新版本并全局升级（`--check` 只检查）；`pingcode -v` 显示当前版本并校验最新版本 |
| `mcp` | MCP 服务与客户端配置 |

所有模块均支持全局选项 `--dry-run`（预览请求）、`--compact`（精简输出）及连接/凭证选项。

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

CLI 默认把工作区偏好和常用字典缓存到 `.pingcode/cache.json`，建议在项目 `.gitignore` 中忽略该目录。缓存内容包括：
- 当前项目 ID / 名称
- 当前迭代 ID / 名称
- 用户列表或项目成员列表
- 工作项类型字典
- 工作项状态字典
- 工作项优先级字典
- 工作项属性字典

相对的缓存路径不随进程 cwd 漂移：CLI 会向上查找最近的已存在缓存（以 git 仓库根为边界），没有则锚定到 `git rev-parse --show-toplevel`，都不满足时才落到当前目录。因此在仓库子目录里执行命令，读写的是仓库根的同一份缓存。绝对路径与 `~/` 开头路径不受影响。

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

## 诊断排查（--doctor）

命令执行失败、结果异常，或怀疑是跨平台环境问题（Windows 编码、代理、TLS、Node 版本等）时，在任意命令后追加 `--doctor` 重新执行一次：

```bash
# 正常执行
pingcode auth login --client-id ID --client-secret SECRET

# 带诊断执行：命令照常运行，结束后生成检测报告
pingcode auth login --client-id ID --client-secret SECRET --doctor

# 只检查环境、不执行业务命令
pingcode --doctor
```

报告为 JSON 文件，**只生成在执行命令的当前目录**（`pingcode-doctor-<时间戳>.json`），不会自动发送或上传；需要排查时把该文件发给维护者即可。`--doctor-output <path>` 可指定报告文件或目录。

报告内容（凭证与令牌在采集时即脱敏，只保留长度或首尾片段）：

- **环境与系统参数**：CLI/Node 版本、OS/内核/架构、CPU/内存、locale 与编码（含 Windows 代码页）、PATH、代理与 TLS 相关环境变量
- **凭证与缓存状态**：token 缓存/工作区缓存的存在性、可读性、JSON 合法性、过期时间（不含令牌值）
- **执行日志**：每次 HTTP 请求/响应（方法、URL、状态码、耗时、错误）、工作区缓存命中、命令的 stdout/stderr 输出
- **错误详情**：完整错误链与堆栈
- **健康检查结论**：Node 版本达标、子进程可创建、临时目录/当前目录可写、非 ASCII 文件名读写、DNS 解析、API 可达性、时钟偏移等，给出 `healthy / degraded / unhealthy` 结论

离线环境可设置 `PINGCODE_DOCTOR_NETWORK=0` 跳过网络探测。

## 参考资料

- 主入口：[skills/pingcode/SKILL.md](skills/pingcode/SKILL.md)（唯一入口；各模块用法见 `pingcode <module> --help`）
- 官方文档：https://open.pingcode.com/

