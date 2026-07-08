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

## Workspace Cache

The CLI owns workspace-cache discovery and validation. Run the requested query/create command first; if cached user/project/sprint context is incomplete, the script exits with guidance. Then invoke `$pingcode-ctx` when available, or run `node scripts/pingcode-ctx.js`, and retry the original command.

For work item queries, the CLI automatically applies cached current user/project/sprint filters unless explicit params or `--all-users`, `--all-projects`, or `--all-sprints` are supplied.

## Main Tool

Use the bundled CLI:

```bash
node scripts/pingcode.js --help
```

When installed by `npx pingcode-skill`, the installer rewrites these examples to the installed
absolute script path, such as `node ~/.codex/skills/pingcode/scripts/pingcode.js`. In Codex,
prefer that installed absolute command because sandbox/network approvals are matched by command
prefix; a stable installed path is more likely to reuse a prior approval than a relative repo path.

Common commands:

```bash
node scripts/pingcode.js --method GET --path /v1/project/projects --param page_size=20
node scripts/pingcode.js --method GET --path /v1/project/work_items --param assignee_ids=@me --param project_ids=PROJECT_ID --param page_size=20 --compact
node scripts/pingcode.js --method GET --path /v1/project/work_item/types --param project_id=PROJECT_ID
node scripts/pingcode.js --method GET --path /v1/project/work_item/states --param project_id=PROJECT_ID --param work_item_type_id=TYPE_ID
node scripts/pingcode.js --method POST --path /v1/project/work_items --data '{"project_id":"PROJECT_ID","type_id":"story","title":"New story","assignee_id":"@me"}'
node scripts/pingcode.js --method POST --path /v1/project/work_items --data '{"project_id":"PROJECT_ID","type_id":"task","parent_id":"STORY_ID","title":"New task","assignee_id":"@me"}'
node scripts/pingcode.js --method PATCH --path /v1/project/work_items/WORK_ITEM_ID --data '{"state_id":"STATE_ID"}'
node scripts/pingcode.js --method GET --path /v1/ship/products --param page_size=20
node scripts/pingcode.js --method POST --path /v1/ship/ideas --data '{"product_id":"PRODUCT_ID","title":"New idea"}'
```

All output is JSON by default so agents can parse it reliably.

## Workflow

1. Read [`references/workflows.md`](references/workflows.md) before mutating PingCode data.
2. Resolve names to IDs using list commands, with `--compact` by default for list/query output. PingCode write APIs usually require IDs.
3. Execute write commands directly once the target project/product/work item and state IDs are unambiguous.
4. Use `--dry-run` only when the target or payload is unusually risky and the user wants a manual preview.
5. For any endpoint, use the single `scripts/pingcode.js --method/--path` command and consult [`references/api.md`](references/api.md).

## Safety Rules

* Never guess `state_id`, `type_id`, `priority_id`, `project_id`, or `product_id`.
* Never infer a human user from an enterprise token. For work item create/query requests, default to `@me` only when a current user is configured; if the user explicitly asks for "所有人" / all users, do not add `assignee_ids=@me` or `assignee_id=@me`.
* For status changes, use cached states when present; otherwise fetch valid states for the work item project and type before patching. Refresh stale type/state dictionaries with `--cache-states`; pass `--work-item-type-id TYPE_ID` only when refreshing one type.
* For work item creates/updates that need `priority_id` or custom `properties`, refresh dictionaries with `--cache-work-item-priorities` and `--cache-work-item-properties`.
* Prefer `--compact` for list/query responses before showing data to the model. Do not pipe raw PingCode JSON through `jq` only to reduce length; let `scripts/pingcode.js` keep useful business fields and drop bulky raw fields.
* Treat HTTP 429 as rate limit. Wait for `x-pc-retry-after` seconds before retrying.
* Prefer the narrowest query possible. Pagination defaults to 30 and maxes at 100.
* Do not echo token values in final answers.
