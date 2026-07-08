# PingCode Workflows

## Natural Language Mapping

| User says | Use |
|---|---|
| "查看当前没完成的任务" | `work-item list --assignee @me --compact`, then filter by non-completed states. Unless the user says "所有人", require the configured current user. |
| "查看所有人当前没完成的任务" | `work-item list --all-users --compact`, then filter by non-completed states. Do not add the current-user assignee filter. |
| "查看我的未解决缺陷" | `work-item list --type bug --assignee @me --compact`, then filter by non-completed states. |
| "帮我在 xxx 故事下新增工作项" | Find the story, then `work-item create --title "..." --type task --parent STORY_ID` with `assignee_id=@me` unless another assignee or "所有人" is explicit. |
| "把某个工作项改成已完成/进行中" | `work-item update <id|identifier> --state 已完成`. Resolve states from cache first. |
| "创建一个故事/任务/缺陷" | `work-item create --title "..." --type story|task|bug --project PROJECT_ID` with `assignee_id=@me` unless another assignee or "所有人" is explicit. |

This skill uses `client_credentials`, so the token is an enterprise token and does not represent a specific human user. For work item create/query requests, default to the configured current user unless the user explicitly says "所有人" / all users or names another assignee. Use `PINGCODE_USER_ID` / `PINGCODE_USER_NAME`, the matching CLI flags, or the workspace cache if present. If none is set, cache users first and ask the user to choose their PingCode user before filtering or assigning.

The CLI accepts identity placeholders:

* `@me` expands to `PINGCODE_USER_ID`.
* `@me_name` expands to `PINGCODE_USER_NAME`.
* `@user:<name-or-id>` expands from cached users.
* If the required variable is missing, the CLI exits with setup guidance instead of guessing.

## Output Size Rule

Use `--compact` by default for PingCode list/query commands before showing results to the model. This keeps useful business fields and avoids sending long raw JSON. Omit `--compact` only when raw fields are explicitly needed.

## Workspace Cache Setup

Use the workspace cache before routine queries so repeated API calls stay low. Setup can be explicit:

Before routine work item queries or creates, ensure `.pingcode-skill/cache.json` has `preferences.current_user_id`, `preferences.current_project_id`, and `preferences.current_sprint_id`. If any of them is missing, run the interactive setup first, then retry the original operation.

### Agent Frontend Setup

In Codex, Claude Code, or another agent frontend, prefer `$pingcode-ctx` when available. The agent should not run a blocking Node.js readline flow unless the user explicitly asks for terminal interaction.

1. Run the interactive setup skill:
   ```text
   使用 $pingcode-ctx 初始化 PingCode 当前项目、迭代和用户
   ```
   The skill guides the user through selecting a project, sprint, and user via the agent's frontend chat.

### Terminal Interactive Setup

For terminal interactive setup, run:

```bash
node scripts/pingcode-ctx.js
```

This guides the user to choose a project, sprint/iteration, and current user, then caches those choices.

If a work item query or create command needs current user/project/sprint defaults and the workspace cache is incomplete, run `node scripts/pingcode-ctx.js` before retrying.

For `GET /v1/project/work_items`, the CLI automatically applies cached defaults:

* current user as `assignee_ids`
* current project as `project_ids`
* current sprint/iteration as `sprint_ids`

If the user explicitly asks for all users, all projects, or all iterations, pass `--all-users`, `--all-projects`, or `--all-sprints`.

## View My Current Unfinished Tasks

```bash
node scripts/pingcode.js work-item list --assignee @me --compact
```

Filter by type, state, etc.:

```bash
node scripts/pingcode.js work-item list --assignee @me --type task --state 进行中 --compact
```

Use this same current-user filter for generic work item queries unless the user explicitly asks for "所有人" / all users.

The model should treat state types `pending` and `in_progress` as unfinished unless the user defines a different rule.

## View My Unresolved Defects

```bash
node scripts/pingcode.js work-item list --type bug --assignee @me --compact
```

This returns assigned bugs whose state type is `pending` or `in_progress`.

## Create a Work Item Under a Story

1. Find the parent story by identifier:

   ```bash
   node scripts/pingcode.js work-item show MND-123 --compact
   ```

2. Create the child work item:

   ```bash
   node scripts/pingcode.js work-item create --title "Child task" --type task --parent MND-123
   ```

Omit `assignee_id` only when the user explicitly asks for "所有人" / unassigned behavior or names a different assignee.

## Update a Work Item Status

Update by identifier (resolves to id automatically):

```bash
node scripts/pingcode.js work-item update SCR-123 --state 已完成
```

Or by id:

```bash
node scripts/pingcode.js work-item update WI-AbCdEf --state 进行中 --priority high
```

Use `--dry-run` to preview before executing:

```bash
node scripts/pingcode.js work-item update SCR-123 --state 已完成 --dry-run
```

## Create a Work Item or Story

```bash
node scripts/pingcode.js work-item create --title "New story" --type story --project PROJECT_ID
node scripts/pingcode.js work-item create --title "Bug fix" --type bug --assignee @me --priority high
```

The subcommand resolves names to IDs from the workspace cache automatically. Add `--dry-run` to preview the request.

Omit `assignee_id` only when the user explicitly asks for "所有人" / unassigned behavior or names a different assignee.
