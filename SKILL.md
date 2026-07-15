---
name: pingcode
description: Use this skill whenever the user mentions PingCode or asks in natural language to view their current unfinished tasks, view unresolved defects or bugs, create a work item under a story, create or update stories/work items, change work item status, query project or product progress, or operate PingCode product/project management through the official REST API using client_credentials authentication.
---

# PingCode

Use this skill to call PingCode REST APIs safely and repeatably.

## Output Size Rule

Use `--compact` by default for PingCode list/query commands before showing results to the model, especially `/v1/project/work_items`. Only omit `--compact` when the user explicitly needs raw fields or a follow-up operation requires fields not present in compact output.

## Natural Language Triggers

Use this skill implicitly when the user mentions `PingCode`, `pingcode`, `工作项`, `故事`, `缺陷`, `任务`, `迭代`, `项目进度`, `产品需求`, or asks for actions such as:

* "查看我当前没完成的任务"
* "查看我的未解决缺陷"
* "帮我在 xxx 故事下新增工作项"
* "把某个工作项改成已完成/进行中"
* "创建一个故事/任务/缺陷"

When the request is natural language, map it to the closest CLI workflow below. Do not ask the user to provide a command unless a required ID or target remains ambiguous after lookup.

## Setup

Run the requested CLI command directly. If credentials or identity settings are missing, `scripts/pingcode.js` exits with setup guidance; follow that guidance, then retry. Do not ask the user to paste credentials or tokens into chat.

`client_credentials` returns an enterprise token and does not identify a human user. For work item create/query requests, let the CLI apply cached current-user defaults unless the user explicitly asks for "所有人" / all users or names another assignee.

The CLI also supports user tokens via `node scripts/pingcode.js login` with `--grant-type authorization_code` (the default for `login`). User tokens represent a specific human user and can be used for commands that require a user identity. After `login`, the CLI automatically detects the cached user token grant type, so subsequent commands do not need `--grant-type` unless you want to override it. `client_credentials` remains the fallback when no user token is cached.

## Workspace Cache

The CLI owns workspace-cache discovery and validation. Run the requested query/create command first; if cached user/project/sprint context is incomplete, the script exits with guidance. Then invoke `$pingcode-ctx` when available, or run `node scripts/pingcode.js context init`, and retry the original command.

For work item queries, the CLI automatically applies cached current user/project/sprint filters unless explicit params or `--all-users`, `--all-projects`, or `--all-sprints` are supplied.

## Main Tool

Use the bundled CLI:

```bash
node scripts/pingcode.js --help
```

When installed by `npx pingcode-cli`, the installer rewrites these examples to the installed
absolute script path, such as `node ~/.codex/skills/pingcode/scripts/pingcode.js`. In Codex,
prefer that installed absolute command because sandbox/network approvals are matched by command
prefix; a stable installed path is more likely to reuse a prior approval than a relative repo path.

### Subcommand Mode (Preferred)

Prefer the structured subcommands for common work item and context operations:

```bash
# Context — workspace management
node scripts/pingcode.js context list
node scripts/pingcode.js context init
node scripts/pingcode.js context set-current-project PROJECT_ID
node scripts/pingcode.js context set-current-sprint SPRINT_ID
node scripts/pingcode.js context set-current-user USER_ID_OR_NAME

# Work items — list
node scripts/pingcode.js work-item list --assignee @me --state 进行中 --compact
node scripts/pingcode.js work-item list --type bug --assignee @me --compact
node scripts/pingcode.js work-item list --keywords "登录页面" --compact

# Work items — create
node scripts/pingcode.js work-item create --title "New task" --type task --project PROJECT_ID --sprint SPRINT_ID
node scripts/pingcode.js work-item create --title "Bug fix" --type bug --assignee @me --priority high

# Work items — show
node scripts/pingcode.js work-item show SCR-123
node scripts/pingcode.js work-item show WI-AbCdEf

# Work items — get (single-item endpoint by id or identifier)
node scripts/pingcode.js work-item get WORK_ITEM_ID
node scripts/pingcode.js work-item get WYT-852

# Work items — update (by identifier or id; supports --title, --description, --type, --project, --sprint, --state, --priority, --assignee, --parent, --version, --board, --entry, --swimlane, --start-at, --end-at, --participants, --story-points, --estimated-workload, --remaining-workload, --properties)
node scripts/pingcode.js work-item update SCR-123 --state 已完成
node scripts/pingcode.js work-item update WI-AbCdEf --state 进行中 --priority high
node scripts/pingcode.js work-item update SCR-123 --title "Updated title" --story-points 3 --start-at 1736985600
```

## Workflow

1. Read [`references/workflows.md`](references/workflows.md) before mutating PingCode data.
2. Resolve names to IDs using list commands, with `--compact` by default for list/query output. PingCode write APIs usually require IDs.
3. Execute write commands directly once the target project/product/work item and state IDs are unambiguous.
4. Use `--dry-run` only when the target or payload is unusually risky and the user wants a manual preview.
5. For common operations, prefer the structured subcommands (`work-item list`, `work-item create`, `work-item show`, `work-item get`, `work-item update`). Consult [`references/api.md`](references/api.md) for API reference.

## Safety Rules

* Never guess `state_id`, `type_id`, `priority_id`, `project_id`, or `product_id`.
* Never infer a human user from an enterprise token. For work item create/query requests, default to `@me` only when a current user is configured; if the user explicitly asks for "所有人" / all users, do not add `assignee_ids=@me` or `assignee_id=@me`.
* For status changes, use cached states when present; otherwise fetch valid states for the work item project and type before patching.
* For work item creates/updates that need `priority_id` or custom `properties`, refresh dictionaries with `context init`.
* Prefer `--compact` for list/query responses before showing data to the model. Do not pipe raw PingCode JSON through `jq` only to reduce length; let `scripts/pingcode.js` keep useful business fields and drop bulky raw fields.
* Treat HTTP 429 as rate limit. Wait for `x-pc-retry-after` seconds before retrying.
* Prefer the narrowest query possible. Pagination defaults to 30 and maxes at 100.
* Do not echo token values in final answers.
