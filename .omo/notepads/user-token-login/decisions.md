# Decisions - user-token-login

- Trigger: both `login` subcommand and global `--grant-type` flag.
- Code acquisition: browser + local callback as primary; URL-paste fallback when browser or callback unavailable.
- Token cache: reuse existing `~/.cache/pingcode-skill/token.json` format, extended with `grant_type` and `refresh_token`.
- Local callback: optional; paste code is always available.
- Start work approved by user at 2026-07-09.

## Wave 1 Implementation Decisions (2026-07-09)

### cache format
- `loadCachedToken` now returns `{grant_type, access_token, refresh_token, expires_at}` object (was: token string). Null on invalid/expired.
- `saveCachedToken` signature: `(cachePath, token, expiresIn, grantType='client_credentials', refreshToken=null)`. Backward compatible — existing 3-arg calls still work.
- Old cache format `{access_token, expires_at}` auto-detected: `grant_type` defaults to `'client_credentials'`, `refresh_token` defaults to `null`.
- `readRawTokenCache` reads file regardless of expiry, used by `accessToken()` to extract `refresh_token` when the access token has expired.

### accessToken() flow
- `client_credentials`: unchanged. Cache hit → use it. Cache miss → fetch from server.
- `authorization_code`: Cache hit (valid, matching grant_type) → use it. Cache miss + `refresh_token` in raw file → refresh. Otherwise → throw "run `login`" guidance.
- Grant type mismatch between cache and client → throw clear error.

### New methods
- `exchangeAuthorizationCode(code, redirectUri)`: calls `GET /v1/auth/token?grant_type=authorization_code...`, includes `redirect_uri`, caches full payload with `grant_type='authorization_code'`. Returns `{access_token, refresh_token}`.
- `refreshAccessToken(refreshToken)`: calls `GET /v1/auth/token?grant_type=refresh_token...`, includes `client_id`/`client_secret`. Preserves existing `refresh_token` if response doesn't include one. Returns new access token.
- `buildAuthorizationUrl(redirectUri, state)`: returns URL with pathname `/oauth2/authorize` and query params `response_type=code`, `client_id`, `redirect_uri`, `state`.

### API shape assumptions documented
- `redirect_uri` is REQUIRED in token exchange when used in authorization request (RFC 6749).
- `client_id`/`client_secret` are required for all grant types.
- `/oauth2/authorize` is the authorization endpoint.
- All documented in `references/api.md` with confirmed/assumed status markers.

### Testing
- 18 new tests added covering: default grant_type, auth_code with/without cache, expired token refresh, old cache format backward compat, exchange/refresh/build methods, saveCachedToken/loadCachedToken format, grant type mismatch, error states.
- All 130 tests pass (112 original + 18 new).
