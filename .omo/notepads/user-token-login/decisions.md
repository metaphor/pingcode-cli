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

## Wave 2 Implementation Decisions (2026-07-09)

### startAuthCallbackServer design
- **Location**: Added to `scripts/core.js` (not a separate `scripts/auth-server.js`). Keeps all auth primitives in one module.
- **Dependencies**: `node:http` and `node:url` only. No Express, no external packages.
- **Port handling**: Default listens on caller-specified port. No default port — caller picks (will be `login` subcommand in Wave 3).
- **Binding**: Listens on `127.0.0.1` only (loopback) — never on `0.0.0.0`. This prevents the callback from being accessible from the network.
- **Close guarantee**: Promise settles only after `server.close()` callback fires, ensuring the port is released before the Promise resolves/rejects. This avoids port-reuse races in the upcoming `login` flow.
- **Keep-alive**: All responses include `Connection: close` header so the server doesn't wait 5s for keep-alive timeout before closing.
- **HTML responses**: Each scenario (success, error, state mismatch, bad request) returns a user-friendly HTML page. Error descriptions are HTML-escaped.

### escapeHtml helper
- Small utility for HTML-escaping OAuth error messages in response bodies. Prevents XSS in error_description params.

### Test methodology
- Fixed port range (61701-61706) rather than dynamic port allocation, to avoid `getFreePort()` → `server.listen()` race conditions.
- `Promise.allSettled` pattern for concurrent HTTP response + promise rejection tests.
- All tests verify both the HTTP response (status code, body content) and the Promise outcome (resolve/reject).

## Wave 4 Implementation Decisions (2026-07-09)

### Flag scope
- `--grant-type` is a global flag on `work-item`, `config`, and `pingcode-ctx` commands, not a top-level dispatcher flag.
- Each command module parses `--grant-type` independently alongside its other string flags (following existing per-module parser pattern).
- Default is `'client_credentials'` everywhere — no behavior change when the flag is omitted.

### Client construction
- `grant_type: opts.grant_type` is passed directly to the `PingCodeClient` constructor from each module's client factory function.
- No changes to `scripts/core.js` — `PingCodeClient` already accepted `grant_type` in its constructor from Wave 1.

### Testing strategy
- Parser unit tests verify flag parsing and default value in each module.
- Integration tests verify:
  - `--grant-type client_credentials` with `--dry-run` produces identical output to default (no flag).
  - `--grant-type authorization_code` without cached token exits with `login` guidance (via `assert.rejects`).
  - `--grant-type authorization_code` with cached token succeeds (via `global.fetch` mock).
  - `config list` accepts both `client_credentials` and `authorization_code` grant types.
  - `pingcode-ctx` parser accepts `--grant-type` and defaults correctly.

## Wave 3 Implementation Decisions (2026-07-09)

### Login subcommand location
- **File**: `scripts/commands/login.js` — follows the established command module pattern.
- **Registration**: `shared.registerModule('login', ...)` with side-effect `require('./commands/login')` in `scripts/pingcode.js`.
- **No external dependencies**: Uses only Node built-ins (`node:crypto`, `node:child_process`, `node:readline`, `node:os`).

### Default grant type
- `login` defaults `grant_type` to `'authorization_code'` (not `'client_credentials'`). This is the only command module where `authorization_code` is the default.
- `--grant-type` flag is still accepted for consistency with other commands.

### Browser spawning
- Cross-platform via `node:child_process.spawn` with platform detection: `open` (macOS), `xdg-open` (Linux), `cmd /c start` (Windows).
- Non-blocking: spawn with `detached: true` and `stdio: 'ignore'`.
- Failure is non-fatal: falls back to printing the URL and prompting for code.

### Dry-run design
- Dry-run with `--code` returns the exchange request shape directly (no client object needed for `buildUrl`).
- Dry-run without `--code` still creates a client to call `buildAuthorizationUrl()` (needs `baseUrl`/`clientId` from opts), but never touches the network.
- The callback server is NEVER started in dry-run mode.

### stdin mocking for tests
- `promptForCode()` and `run()` accept optional `inputFunc` parameter (same pattern as `pingcode-ctx.js`).
- This avoids the problem of `process.stdin` being a read-only getter in Node.js >= 18.

### Parser flag validation order
- Unknown flags are rejected BEFORE attempting to consume the next token as a value.
- This prevents misleading "Flag requires a value" error when the flag itself is unrecognized.

### Security: token secrecy
- Success output only prints `User token saved for grant_type authorization_code` — never echoes `access_token` or `refresh_token`.
- Dry-run output with `--code` includes the code in params (it's a one-time code about to be exchanged), but the real flow never prints it.

## Wave 5 Documentation Decisions (2026-07-09)

### Endpoint documentation
- `/oauth2/authorize` is documented as the production authorization endpoint.
- `/oauth2/authorized` is explicitly called out as a docs-only test fixture; production uses the `redirect_uri` callback via `startAuthCallbackServer`.
- Parameter tables and request/response examples were added for `authorization_code` and `refresh_token` grants.

### README positioning
- `client_credentials` remains the primary/default documented flow.
- User-token login is presented as an optional alternative for human-user operations.

### Package manifest
- Explicit `files` entries added for `scripts/commands/login.js` and `tests/test_login.js` even though the `scripts/commands/` directory entry already covers the former; explicit entries improve clarity and ensure `npm pack` includes them.
- No `scripts/auth-server.js` entry was added because callback server logic lives in `scripts/core.js`.

### No behavior change
- No product code was modified. Only documentation, package manifest, and notepad summaries were updated.
