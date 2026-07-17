---
name: pingcode-auth
description: Use this skill when the user wants to log in to PingCode with a user token via OAuth2 authorization_code (pingcode auth login), switch between enterprise client_credentials and user tokens, override or auto-detect the grant type, or asks about PingCode token types and authentication.
---

# PingCode Auth

Use this skill to manage PingCode authentication: enterprise `client_credentials` tokens and user tokens obtained through OAuth2 `authorization_code`.

## Setup

PingCode credentials must be available before logging in or calling any API. Create an app in the PingCode enterprise console, configure its data access scope, then set:

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

Optional:

```bash
export PINGCODE_BASE_URL="https://open.pingcode.com"
export PINGCODE_TOKEN_CACHE="$HOME/.cache/pingcode/token.json"
```

Do not ask the user to paste credentials or tokens into chat, and never echo token values in final answers.

## Token Types

* `client_credentials` returns an enterprise token. It does not identify a human user.
* `authorization_code` returns a user token. It represents a specific human user and suits commands that require a user identity.

## User Token Login

Run `auth login` before using a user token for the first time. It opens a browser authorization flow:

```bash
pingcode auth login --client-id ID --client-secret SECRET
```

`--grant-type authorization_code` is the default for `auth login`, so it does not need to be passed explicitly.

After a successful `auth login`, the user token is stored in the default token cache. Subsequent commands automatically detect the cached token's grant type, so `--grant-type` does not need to appear on the command line:

* When the cache holds an enterprise token, commands run as `client_credentials`.
* When the cache holds a user token, commands run as `authorization_code`.

Passing `--grant-type` explicitly overrides the auto-detected type. `client_credentials` remains the fallback when no user token is cached.

## Behavior Under User Tokens

With a user token, `workitem list` no longer applies the current-user filter by default (equivalent to the old `--all-users` behavior), so `PINGCODE_USER_ID` or a workspace user is not required. To see only your own items, add `--assignee @me` or `--user-id` explicitly. Under `client_credentials`, the original default filtering behavior is unchanged.

`@me` identity resolution does not change: `@me` still expands from the workspace cache, `PINGCODE_USER_ID`, or `PINGCODE_USER_NAME`, and is never inferred from the token itself.

For work item commands that run under these tokens, see `$pingcode-workitem`. For workspace context (current user/project/sprint), see `$pingcode-ctx`. For shared rules and routing, see `$pingcode`.
