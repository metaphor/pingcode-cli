# Learnings - user-token-login

## Wave 1 — OAuth Shape Confirmation (2026-07-09)

### PingCode OAuth API Shape
- **Token endpoint**: `GET /v1/auth/token?grant_type=...` (same endpoint for all grant types)
- **Authorization URL**: `/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&state=...`
- **Token types**: "企业令牌" (Enterprise Token) for `client_credentials`, "用户令牌" (User Token) for `authorization_code`
- **Confirmed**: `redirect_uri` is required in the authorization_code token exchange (RFC 6749 §4.1.3) and must match the redirect_uri used in the authorization request
- **Confirmed**: `client_id` and `client_secret` are required for all grant types following the existing `client_credentials` pattern
- **Assumed**: `refresh_token` grant also requires `client_id` and `client_secret` (follows existing auth pattern)
- **NOT using**: `/oauth2/authorized` HTML-extraction path — standard OAuth2 redirect-based flow is the production path
- **Response shape**: `{access_token, token_type: "Bearer", expires_in, refresh_token}` — `refresh_token` only present for `authorization_code` grant
- **Source**: PingCode REST API docs at open.pingcode.com confirm two token types (enterprise/user), `/v1/myself` endpoint requires "用户令牌"

### URL Encoding
- `buildUrl()` uses `URLSearchParams.set()` which URL-encodes values. The `redirect_uri` parameter (containing `://`) will be encoded as `http%3A%2F%2F...` in the query string. This is correct behavior — the PingCode server will decode it.

### Cache Format Migration
- Old format: `{access_token, expires_at}` — backward compatible, `loadCachedToken` defaults `grant_type` to `'client_credentials'`
- New format: `{grant_type, access_token, refresh_token?, expires_at}` — `refresh_token` only present for `authorization_code`
- `saveCachedToken` always writes `grant_type` (defaults to `'client_credentials'` for backward compat)
