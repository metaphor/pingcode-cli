# AGENT.md

给 AI Agent 的操作指引。当前内容：doctor 诊断报告的分析方法。

## Doctor 诊断报告分析

用户命令执行失败、结果异常或怀疑环境问题时，让用户在**原命令后追加 `--doctor`** 重新执行一次：

```bash
pingcode <原命令...> --doctor
```

命令会照常执行，结束后在**执行命令的当前目录**生成 `pingcode-doctor-<时间戳>.json`（已自动脱敏：凭证/令牌只保留 `len=N` 或首尾片段）。`pingcode --doctor`（不带命令）是纯环境体检，此时 `command` 为 `null`。报告不会自动上传，让用户提供该文件，或直接读取后按下述方法分析。

### 报告结构速查

| 字段 | 内容 |
|---|---|
| `verdict` | `healthy` / `degraded`（有 warn）/ `unhealthy`（有 fail，或命令本身退出码非 0，见 `command_execution` 检查项） |
| `command` | `{module, args, started_at, duration_ms, exit_code}`；bare 模式为 `null` |
| `errors[]` | 按序记录的错误：`{name, message, stack, context}`，`message` 已脱敏 |
| `checks[]` | 环境健康检查：`{id, status: pass\|warn\|fail\|skip, detail}` |
| `events[]` | 执行日志。`http_request`（method/url/body：`{type:'json', keys:[...]}` 或上传时 `{type:'form', fields:[...]}`）、`http_response`（status/duration_ms/bytes）、`http_error`（status/error/aborted）、`workspace_cache_hit` |
| `http_summary` | `{requests, responses, errors, workspace_cache_hits}` 计数 |
| `output` | 命令的 `{stdout, stderr, truncated}`（各上限 200KB，已脱敏） |
| `paths` | `token_cache` / `workspace_cache` 的存在性、可读写性、JSON 合法性、`grant_type`、`expires_at`/`expired`、`preferences_keys` |
| `env` | 白名单环境变量，分 `general` / `pingcode` / `proxy` / `tls` 四组 |
| `runtime` / `system` / `locale` | Node 版本（含 openssl）、OS/内核/CPU/内存、LANG/编码（Windows 含 `windows_codepage`） |

checks 的 id：`command_execution`（命令自身的退出结果，非 0 即 fail）、`node_version`、`spawn_node`、`node_duplicates`、`token_cache`、`workspace_cache`、`tmp_writable`、`unicode_fs`、`cwd_writable`、`windows_codepage`/`long_path`/`path_length`/`file_rename`（仅 win32）、`dns`、`api_reachable`、`clock_skew`。`dns`/`api_reachable`/`clock_skew` 为 `skip` 表示网络探测被禁用（`PINGCODE_DOCTOR_NETWORK=0`）；探测目标是 `--base-url` / `PINGCODE_BASE_URL` 解析出的实际 API 地址。`http_error.error` 在网络层失败时会带括号内的 cause code（如 `(ECONNREFUSED)`、`(ENOTFOUND)`、`(SELF_SIGNED_CERT_IN_CHAIN)`），这是定位网络问题的首要线索。

### 定位流程

按顺序执行，通常前两步就能定位：

1. **看 `command.exit_code` 与 `errors[]`**：非零退出时 `errors` 里就是抛出的异常，`message` 区分两类前缀——`HTTP <status> ...` 是 API 层返回了错误（后面带响应体片段），`Request failed: ...` 是请求根本没到服务端（网络层）。
2. **看 `checks[]` 中所有 `warn`/`fail`**：环境类根因直接可判（过期令牌、DNS 失败、编码问题等）。
3. **看 `events[]` 的 HTTP 轨迹**：找到最后一个 `http_error` 或非 2xx 的 `http_response`；`http_summary.requests === 0` 说明请求都没发出（在上下文/参数校验阶段就失败了，错误在 `errors`/`output` 里）。
4. **交叉验证**：HTTP 401 时必须回看 `paths.token_cache`（`expired`/`grant_type`/`exists`）；连接失败时回看 `env.proxy`、`env.tls`、`checks.api_reachable`。

### 故障模式对照表

| 定位线索 | 根因 | 处理 |
|---|---|---|
| `token_cache.expired: true`，或 401 | 令牌过期 | 重新 `pingcode auth login` |
| errors 含 `Cached token grant_type ... does not match` | 缓存的 grant_type 与配置不一致 | 删除 token 缓存后重新登录 |
| errors 含 `Missing credentials` | 凭证未配置 | 设置 `PINGCODE_CLIENT_ID` / `PINGCODE_CLIENT_SECRET` |
| `http_error.aborted: true` 或 `Request failed:` 且 `duration_ms`≈30000 | 请求超时（30s 上限） | 查 `env.proxy`、`checks.api_reachable`；代理问题修 `HTTPS_PROXY` |
| `api_reachable` fail，error 含 `SELF_SIGNED_CERT` / `UNABLE_TO_VERIFY` | 企业代理 TLS 拦截 | 设 `NODE_EXTRA_CA_CERTS` 指向公司根证书 |
| `api_reachable` 或 `http_error` 含 `ECONNREFUSED` / `ETIMEDOUT` | 服务未监听、端口/防火墙问题 | 确认 base_url 与网络出口；私化部署查服务状态 |
| `dns` fail 或 `http_error.error` 含 `(ENOTFOUND)` | 域名解析失败 | hosts / VPN / 内网 DNS |
| `clock_skew` warn（偏差 >120s） | 系统时间不准 | 校准系统时间（会导致 TLS 与令牌校验失败的隐藏原因） |
| `http_error.status: 429` | 触发限流 | 读响应头 `x-pc-retry-after`，等待后重试 |
| `workspace_cache` not found 或 `preferences_keys` 缺 `current_user_id` / `current_project_id` / `current_sprint_id` | 工作区上下文未初始化 | `pingcode context init` 后重试原命令 |
| `node_version` fail | Node 低于 engines 要求（>=18） | 升级 Node |
| `unicode_fs` fail 或 `windows_codepage` warn（非 65001） | Windows 编码问题 | `chcp 65001` 或开启系统 UTF-8（非 ASCII 输出乱码的典型根因） |
| `spawn_node` fail | 子进程被杀软/权限拦截 | 放行 `node` 子进程 |
| 非 2xx 且 error 带 5xx / `Response was not JSON` | 服务端或网关问题 | 让用户把报告文件提交 issue |
| `exit_code` 为 0、`errors` 为空，但用户认为结果不对 | 数据或参数问题 | 读 `output.stdout` 看实际返回内容 |

### 环境类问题（Windows 高发）

判断「环境导致」最有力的方法是**双机对比**：让用户在正常机器和故障机器各跑一次 `pingcode --doctor`（不带命令），diff 两份报告的 `system`、`locale`、`env`、`paths`、`checks`。Windows 专属检查项及其含义：

| 检查项 | 含义 | 处理 |
|---|---|---|
| `windows_codepage` warn | 控制台代码页非 65001，中文输出乱码 | `chcp 65001` 或开启系统 Beta UTF-8 选项 |
| `unicode_fs` fail/warn | 非 ASCII（中文）文件名读写失败，典型于代码页问题 | 同上；检查 NTFS 卷与临时目录 |
| `long_path` fail | 超过 260 字符（MAX_PATH）的路径读写失败 | 组策略开启 LongPathsEnabled，或缩短缓存/工作区路径 |
| `path_length` warn | PATH 超过 ~2047 字符，spawn 随机失败 | 清理 PATH 冗余项 |
| `file_rename` fail | 写/重命名/删除被拒（EBUSY/EPERM） | 杀软或 OneDrive 同步锁文件，加白名单或移出同步目录 |
| `node_duplicates` warn | PATH 上有多个 node（nvm/scoop/volta/官方混装） | 旧版本优先被解析，清理 PATH 顺序 |

Windows 平台还有两个固有事实，排查时需知道：`~/.local/bin` 包装脚本只在 POSIX 提供（Windows 的 `pingcode` 来自 npm 全局 bin）；npm 子进程调用固定走 `shell: true`。`spawn_node` fail 时优先怀疑杀软拦截。

### 输出要求

分析后向用户报告四件事：**现象**（哪个命令、什么退出码）→ **直接原因**（errors/checks/events 中的具体证据，引用原文）→ **根因**（对照表结论）→ **修复步骤**（给出具体可执行的命令）。修复后让用户去掉 `--doctor` 重跑原命令确认。无法定位时，让用户把报告文件附到仓库 issue。
