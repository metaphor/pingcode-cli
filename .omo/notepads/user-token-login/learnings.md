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

## Wave 4 — --grant-type Global Flag (2026-07-09)

### Flag Wiring Pattern
- Each command module has its own flag parser with local string/boolean flag maps; `--grant-type` was added as a string flag with default `'client_credentials'` in each.
- `work-item.js`: Added to `GLOBAL_STRING_FLAGS` (used in `parseGlobalOptions()`) and `defaultGlobalOpts()`, then passed via `clientFromOpts()` to `PingCodeClient`.
- `config.js`: Added to `STRING_FLAGS` (used in `parseConfigArgs()`) and default opts, then passed via `createClient()` to `PingCodeClient`.
- `pingcode-ctx.js`: Added to `stringFlags` in `buildParser().parseArgs()`, default args, and passed in `run()` to `PingCodeClient`.
- `PingCodeClient` constructor already accepted `grant_type` from Wave 1 — no core.js changes needed.

### Dry-Run Behavior
- `client.request()` returns the dry_run shape immediately without calling `accessToken()`, so `--grant-type` with `--dry-run` always succeeds regardless of token cache state.
- The `--grant-type authorization_code` without cached token test must use real (non-dry-run) requests to hit the `accessToken()` → "run login" error path.

### Help Text
- Each module's help text mentions `--grant-type TYPE` in the global options section with description: `OAuth grant type: client_credentials (default) or authorization_code`.

### Test Coverage
- 10 new tests across `test_work_item.js` (4), `test_config.js` (4), `test_pingcode.js` (2).
- All 10 pass; existing 130 tests unchanged. Total: 146, of which 140 pass (6 pre-existing failures in Wave 2 callback server tests).

## Wave 2 — Local OAuth Callback Server (2026-07-09)

### Implementation
- `startAuthCallbackServer({port, path, state, timeoutMs})` returns a Promise that resolves with `{code, state}` on success.
- Uses only `node:http` and `node:url` — no external dependencies.
- Responds with HTML pages for success, error, state mismatch, and bad-request scenarios.
- All response paths include `Connection: close` header to avoid Node.js default 5s keep-alive delay.
- Server fully closes (including `'close'` event) before the Promise settles — port is guaranteed released.

### Cleanup Logic Bug
- Initial `cleanup()` had inverted return values: returned `false` on first call (meaning "I handled it"), but callers checked `if (!cleanup()) return;` which skipped the resolve/reject. Fixed by returning `true` on first call.
- Later refactored to `finish(action, value)` pattern that calls `server.close(callback)` and resolves/rejects inside the `'close'` callback — this ensures the Promise doesn't settle until the port is released.

### Keep-Alive Trap
- Node.js HTTP server defaults to 5s keep-alive. `server.close()` waits for all connections to end. Without `Connection: close`, tests took ~4s each waiting for keep-alive timeout. Setting `res.setHeader('Connection', 'close')` makes the server close immediately after response.

### Test Approach
- Used fixed high port numbers (61701-61706) to avoid race conditions between `getFreePort()` finding a port and the server listening on it.
- Used `Promise.allSettled` for state-mismatch and OAuth-error tests to avoid unhandled promise rejection warnings (the HTTP response and promise rejection fire concurrently).
- 6 new tests: happy path, state mismatch, OAuth error, timeout, server-close-verification, wrong-path-404.

### Port Close Guarantee
- The `finish()` function queues the resolve/reject action and executes it inside `server.close(callback)`, ensuring the `'close'` event fires before the Promise settles.
- This means callers can immediately reuse the port after the Promise resolves — important for Wave 3's login flow.

### Total Tests
- 146 tests pass (0 fail) including all 6 new callback server tests.

## Wave 3 — Login Subcommand (2026-07-09)

### Implementation
- New `scripts/commands/login.js` module following the same command pattern as `work-item.js` and `config.js`.
- Self-registers via `shared.registerModule('login', ...)`; loaded via `require('./commands/login')` side-effect in `scripts/pingcode.js`.

### Flag Parsing
- Own `parseLoginArgs()` with local `BOOLEAN_FLAGS` and `STRING_FLAGS` maps.
- Default `grant_type` is `authorization_code` (login is specifically for user-token auth).
- `--redirect-uri` defaults to `http://127.0.0.1:8765/callback`; `--port` defaults to `8765`.
- Unknown flag detection happens before value consumption to avoid misleading "flag requires a value" error for unknown flags.
- Supports env vars: `PINGCODE_REDIRECT_URI`, `PINGCODE_CALLBACK_PORT` in addition to existing credential env vars.

### Browser Opening
- Uses `node:child_process` spawn with `open` (macOS), `xdg-open` (Linux), or `start` (Windows).
- Browser spawn failure gracefully falls back to printing the authorization URL and prompting for code from stdin.

### Code-Paste Mode (`--no-browser`)
- Prints the authorization URL and uses `node:readline` to prompt for the code on stdin.
- `promptForCode()` accepts optional `inputFunc` parameter for testability (same pattern as `pingcode-ctx.js`).

### Dry-Run Mode
- With `--code`: returns `{dry_run: true, method: 'GET', path: '/v1/auth/token', params: {...}}` — no server, no browser, no network.
- Without `--code`: prints the authorization URL (generated with real state) — no server, no browser.
- Does not start the callback server and does not open the browser in any dry-run scenario.

### Test Coverage
- 32 new tests in `tests/test_login.js` covering: parser (all flags, defaults, env vars, error cases), dry-run with `--code` and `--no-browser`, credential errors, `--code` exchange with mocked fetch + cache verification, `--no-browser` with mocked stdin, dispatcher integration (help output, module listing), `createClient`, `buildDryRunExchange`.
- All 178 tests pass (146 existing + 32 new).

## Wave 5 — Documentation and Package Manifest (2026-07-09)

### Documentation
- `references/api.md`: Added parameter tables for `/oauth2/authorize`, `/v1/auth/token?grant_type=authorization_code`, and `/v1/auth/token?grant_type=refresh_token`. Added request/response JSON examples. Documented `/oauth2/authorized` as a docs-only test fixture (not production).
- `README.md`: Added a "User token login" section in Chinese with `node scripts/pingcode.js login` and `node scripts/pingcode.js work-item list --grant-type authorization_code ...` examples. Kept `client_credentials` as the primary/default flow.
- `SKILL.md`: Added a paragraph in the Setup section noting `login` with `--grant-type authorization_code` is available, while `client_credentials` remains the default for other commands.
- `references/workflows.md`: Added a note that user-token login is available for human-user operations but does not change the `@me` identity resolution workflow.

### Package manifest
- `package.json`: Added explicit `files` entries for `scripts/commands/login.js` and `tests/test_login.js`.

### Verification
- `npm test`: 178 pass, 0 fail.
- `npm pack --dry-run`: lists `scripts/commands/login.js` and `tests/test_login.js`.
- `node bin/install.js --target <tmp>/install --force`: copied docs contain the new login content and paths are rewritten to the installed absolute path.
