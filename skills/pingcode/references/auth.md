# 认证

PingCode 支持两种令牌类型：

- `client_credentials` → 企业令牌。不区分用户身份，拥有系统管理员权限。
- `authorization_code` → 用户令牌。代表具体人类用户，适合以个人身份操作 PingCode。

## 企业令牌

已配置凭证但未缓存用户令牌时，命令默认按 `client_credentials` 执行。

## 用户令牌登录

首次使用用户令牌前必须先运行 `auth login`。默认行为会自动打开浏览器完成授权：

```bash
pingcode auth login --client-id ID --client-secret SECRET
```

如果当前环境无法打开浏览器（例如远程服务器、容器），可加上 `--no-browser`，改为打印授权 URL 并提示粘贴授权码：

```bash
pingcode auth login --client-id ID --client-secret SECRET --no-browser
```

`auth login` 默认 grant_type 为 `authorization_code`，无需显式传入。

登录成功后用户令牌缓存在默认 token cache 中。后续命令自动识别缓存的 grant_type：

- 缓存为企业令牌 → 按 `client_credentials` 执行
- 缓存为用户令牌 → 按 `authorization_code` 执行

显式传 `--grant-type` 可覆盖自动识别。未缓存用户令牌时 fallback 为 `client_credentials`。

## 查看认证状态

使用 `auth status` 查看当前认证状态，包括凭证是否配置、token cache 是否存在、令牌是否有效、剩余有效期等：

```bash
# 查看默认 token cache 的认证状态
pingcode auth status

# 指定 token cache 和凭证
pingcode auth status --token-cache /path/to/token.json --client-id ID --client-secret SECRET

# 查看是否会使用显式传入的访问令牌（不会写入 cache）
pingcode auth status --token TOKEN

# 紧凑输出
pingcode auth status --compact

# 试运行，不发起网络请求
pingcode auth status --dry-run
```

输出示例（已登录）：

```json
{
  "authenticated": true,
  "grant_type": "authorization_code",
  "base_url": "https://open.pingcode.com",
  "token_cache": "/Users/.../.cache/pingcode/token.json",
  "token_cache_exists": true,
  "token_valid": true,
  "token_expires_at": 1739956800,
  "token_expires_in": 7185,
  "credentials": {
    "client_id_configured": true,
    "client_secret_configured": true
  },
  "workspace_cache": ".pingcode/cache.json",
  "workspace_cache_exists": true
}
```

安全规则：

- `auth status` 不会回显 `access_token` 或 `refresh_token` 的值。
- `--token` 仅用于本次检查，不会保存到 token cache。
- 当令牌过期或 token cache 不存在时，`authenticated` 和 `token_valid` 为 `false`。

## 用户令牌下的行为

使用用户令牌时，`pingcode workitem list` 不再默认按当前用户过滤（等价于加 `--all-users`），因此不需要配置 `PINGCODE_USER_ID` 或工作区用户。如需只看自己的工作项，显式加 `--assignee @me` 或 `--user-id`。`client_credentials` 模式下保持原有的默认过滤行为。

`@me` 身份解析方式不变：仍然从工作区缓存、`PINGCODE_USER_ID` 或 `PINGCODE_USER_NAME` 展开，不会从令牌本身推断。
