# 认证

PingCode 支持两种令牌类型：

- `client_credentials` → 企业令牌。不区分用户身份，拥有系统管理员权限。
- `authorization_code` → 用户令牌。代表具体人类用户，适合以个人身份操作 PingCode。

## 企业令牌

已配置凭证但未缓存用户令牌时，命令默认按 `client_credentials` 执行。

## 用户令牌登录

首次使用用户令牌前必须先运行 `auth login`，会在浏览器中完成授权：

```bash
pingcode auth login --client-id ID --client-secret SECRET
```

`auth login` 默认 grant_type 为 `authorization_code`，无需显式传入。

登录成功后用户令牌缓存在默认 token cache 中。后续命令自动识别缓存的 grant_type：

- 缓存为企业令牌 → 按 `client_credentials` 执行
- 缓存为用户令牌 → 按 `authorization_code` 执行

显式传 `--grant-type` 可覆盖自动识别。未缓存用户令牌时 fallback 为 `client_credentials`。

## 用户令牌下的行为

使用用户令牌时，`pingcode workitem list` 不再默认按当前用户过滤（等价于加 `--all-users`），因此不需要配置 `PINGCODE_USER_ID` 或工作区用户。如需只看自己的工作项，显式加 `--assignee @me` 或 `--user-id`。`client_credentials` 模式下保持原有的默认过滤行为。

`@me` 身份解析方式不变：仍然从工作区缓存、`PINGCODE_USER_ID` 或 `PINGCODE_USER_NAME` 展开，不会从令牌本身推断。
