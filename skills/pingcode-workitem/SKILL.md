---
name: pingcode-workitem
description: Use this skill when the user asks in natural language to list, create, show, get, or update PingCode work items (任务, 缺陷, 故事, 工作项), for example "查看我当前没完成的任务", "查看我的未解决缺陷", "在故事下新增工作项", or "把工作项改成已完成".
---

# PingCode Work Item

Use this skill to list, create, show, get, and update PingCode work items through the `pingcode workitem` subcommands.

## Setup

PingCode credentials must be available before calling the API:

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

If credentials are missing, the CLI exits with setup guidance; follow that guidance, then retry. Do not ask the user to paste credentials or tokens into chat.

## Commands

```bash
# Work items — list
pingcode workitem list --assignee @me --state 进行中 --compact
pingcode workitem list --type bug --assignee @me --compact
pingcode workitem list --keywords "登录页面" --compact

# Work items — create
pingcode workitem create --title "New task" --type task --project PROJECT_ID --sprint SPRINT_ID
pingcode workitem create --title "Bug fix" --type bug --assignee @me --priority high

# Work items — show
pingcode workitem show SCR-123
pingcode workitem show WI-AbCdEf

# Work items — get (single-item endpoint by id or identifier)
pingcode workitem get WORK_ITEM_ID
pingcode workitem get WYT-852

# Work items — update (by identifier or id; supports --title, --description, --type, --project, --sprint, --state, --priority, --assignee, --parent, --version, --board, --entry, --swimlane, --start-at, --end-at, --participants, --story-points, --estimated-workload, --remaining-workload, --properties)
pingcode workitem update SCR-123 --state 已完成
pingcode workitem update WI-AbCdEf --state 进行中 --priority high
pingcode workitem update SCR-123 --title "Updated title" --story-points 3 --start-at 1736985600
```

Use `--compact` by default for list/query output before showing results to the model. Add `--dry-run` to preview a write request without sending it.

## Workflow

1. Read `references/workflows.md` (bundled with the `$pingcode` skill) before mutating PingCode data.
2. Resolve names to IDs using list commands, with `--compact` by default. PingCode write APIs usually require IDs.
3. Execute write commands directly once the target project/product/work item and state IDs are unambiguous.
4. Consult `references/api.md` (bundled with the `$pingcode` skill) for API reference.

## Defaults and Identity

Cached current user/project/sprint defaults come from the workspace cache (`.pingcode/cache.json`). If the cache is incomplete, initialize it with `$pingcode-ctx` (or `pingcode context init`), then retry the original command.

For queries, the CLI automatically applies cached current user/project/sprint filters unless explicit params or `--all-users`, `--all-projects`, or `--all-sprints` are supplied. For creates, default to `assignee_id=@me` unless the user explicitly asks for "所有人" / all users or names another assignee.

User-token login and its effect on default filtering (no implicit current-user filter; use `--assignee @me` explicitly) are documented in `$pingcode-auth`.

## Safety Rules

* Never guess `state_id`, `type_id`, `priority_id`, `project_id`, or `product_id`.
* For status changes, use cached states when present; otherwise fetch valid states for the work item project and type before patching.
* For creates/updates that need `priority_id` or custom `properties`, refresh dictionaries with `context init`.
* Treat HTTP 429 as rate limit. Wait for `x-pc-retry-after` seconds before retrying.
* Do not echo token values in final answers.
