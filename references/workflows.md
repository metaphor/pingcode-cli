# PingCode Workflows

## Command Styles

The CLI supports two command styles. Prefer the **subcommand** style for common operations; fall back to the **legacy** `--method/--path` style for endpoints not yet covered by subcommands.

| Style | Example |
|---|---|
| Subcommand (preferred) | `node scripts/pingcode.js work-item list --assignee @me --compact` |
| Legacy (fallback) | `node scripts/pingcode.js --method GET --path /v1/project/work_items --param assignee_ids=@me --compact` |

Most workflows below show both styles. The subcommand style is easier for AI agents to construct and includes built-in validation.

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

Use one frontend question at a time:

1. List project options:

   ```bash
   node scripts/pingcode.js --context-options project
   ```

   Ask the user to choose one numbered option, ID, or exact name, then run:

   ```bash
   node scripts/pingcode.js --set-current-project PROJECT_ID_OR_NAME
   ```

2. List sprint/iteration options for the cached project:

   ```bash
   node scripts/pingcode.js --context-options sprint
   ```

   Ask the user to choose one, then run:

   ```bash
   node scripts/pingcode.js --set-current-sprint SPRINT_ID_OR_NAME
   ```

3. List user options for the cached project:

   ```bash
   node scripts/pingcode.js --context-options user
   ```

   Ask the user to choose one, then run:

   ```bash
   node scripts/pingcode.js --set-current-user USER_ID_OR_NAME
   ```

### Terminal Interactive Setup

For terminal interactive setup, run:

```bash
node scripts/pingcode-ctx.js
```

This guides the user to choose a project, sprint/iteration, and current user, then caches those choices.

Manual setup is also available:

```bash
node scripts/pingcode.js --cache-projects
node scripts/pingcode.js --set-current-project PROJECT_ID
node scripts/pingcode.js --cache-sprints
node scripts/pingcode.js --set-current-sprint SPRINT_ID
node scripts/pingcode.js --cache-users
node scripts/pingcode.js --set-current-user USER_ID_OR_CACHED_NAME
node scripts/pingcode.js --cache-states
node scripts/pingcode.js --cache-work-item-priorities
node scripts/pingcode.js --cache-work-item-properties
```

If a work item query or create command needs current user/project/sprint defaults and the workspace cache is incomplete, run `node scripts/pingcode-ctx.js` before retrying. Use manual cache commands only when an interactive terminal is unavailable.

`--cache-users` uses the cached current project or `--project-id` to cache project members. It falls back to `/v1/directory/users` only when no project is available. Cached user lists let agents answer "xxx 的工作项" with `--param assignee_ids=@user:xxx` without another lookup.

For `GET /v1/project/work_items`, the CLI automatically applies cached defaults:

* current user as `assignee_ids`
* current project as `project_ids`
* current sprint/iteration as `sprint_ids`

If the user explicitly asks for all users, all projects, or all iterations, pass `--all-users`, `--all-projects`, or `--all-sprints`.

## View My Current Unfinished Tasks

**Subcommand (preferred):**

```bash
node scripts/pingcode.js work-item list --assignee @me --compact
```

Filter by type, state, etc.:

```bash
node scripts/pingcode.js work-item list --assignee @me --type task --state 进行中 --compact
```

**Legacy fallback:**

```bash
node scripts/pingcode.js --method GET --path /v1/project/work_items --param assignee_ids=@me --param page_size=100 --compact
```

Use this same current-user filter for generic work item queries unless the user explicitly asks for "所有人" / all users.

The model should treat state types `pending` and `in_progress` as unfinished unless the user defines a different rule.

## View My Unresolved Defects

**Subcommand (preferred):**

```bash
node scripts/pingcode.js work-item list --type bug --assignee @me --compact
```

**Legacy fallback:**

```bash
node scripts/pingcode.js --method GET --path /v1/project/work_items --param type_ids=bug --param assignee_ids=@me --param page_size=100 --compact
```

This returns assigned bugs whose state type is `pending` or `in_progress`.

## Create a Work Item Under a Story

**Subcommand (preferred):**

1. Find the parent story by identifier:

   ```bash
   node scripts/pingcode.js work-item show MND-123 --compact
   ```

2. Create the child work item:

   ```bash
   node scripts/pingcode.js work-item create --title "Child task" --type task --parent MND-123
   ```

**Legacy fallback:**

1. Find the parent story:

   ```bash
   node scripts/pingcode.js --method GET --path /v1/project/work_items --param identifier=MND-123 --compact
   ```

2. Read `id`, `project.id`, and choose child `type_id`.
3. Execute after the parent story is unambiguous:

   ```bash
   node scripts/pingcode.js --method POST --path /v1/project/work_items --data '{"project_id":"PROJECT_ID","type_id":"task","parent_id":"STORY_ID","title":"Child task","assignee_id":"@me"}'
   ```

Omit `assignee_id` only when the user explicitly asks for "所有人" / unassigned behavior or names a different assignee.

## Update a Work Item Status

**Subcommand (preferred):**

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

**Legacy fallback:**

1. Locate the work item:

   ```bash
   node scripts/pingcode.js --method GET --path /v1/project/work_items --param identifier=SCR-123 --compact
   ```

2. Read the work item's `project.id` and `type`.
3. Fetch available states from cache, or refresh cache if needed. Without `--work-item-type-id`, `--cache-states` first refreshes the current project's work item type dictionary, then caches states for every type:

   ```bash
   node scripts/pingcode.js --cache-states --project-id PROJECT_ID
   node scripts/pingcode.js --cache-states --project-id PROJECT_ID --work-item-type-id TYPE_ID
   node scripts/pingcode.js --method GET --path /v1/project/work_item/states --param project_id=PROJECT_ID --param work_item_type_id=TYPE_ID
   ```

4. Choose the exact `state_id`.
5. Execute after target item and state are unambiguous:

   ```bash
   node scripts/pingcode.js --method PATCH --path /v1/project/work_items/WORK_ITEM_ID --data '{"state_id":"STATE_ID"}'
   ```

## Create a Work Item or Story

**Subcommand (preferred):**

```bash
node scripts/pingcode.js work-item create --title "New story" --type story --project PROJECT_ID
node scripts/pingcode.js work-item create --title "Bug fix" --type bug --assignee @me --priority high
```

The subcommand resolves names to IDs from the workspace cache automatically. Add `--dry-run` to preview the request.

**Legacy fallback:**

1. Resolve the project:

   ```bash
   node scripts/pingcode.js --method GET --path /v1/project/projects --param keywords="Project name"
   ```

2. Resolve the work item type:

   ```bash
   node scripts/pingcode.js --method GET --path /v1/project/work_item/types --param project_id=PROJECT_ID
   ```

3. Resolve optional state, priority, sprint, board, entry, and assignee IDs. Use `--cache-work-item-priorities` for priority dictionaries and `--cache-work-item-properties` for custom field dictionaries.
4. Execute:

   ```bash
   node scripts/pingcode.js --method POST --path /v1/project/work_items --data '{"project_id":"PROJECT_ID","type_id":"story","title":"Title","assignee_id":"@me"}'
   ```

Omit `assignee_id` only when the user explicitly asks for "所有人" / unassigned behavior or names a different assignee.

## Create a Product Idea

1. Resolve the product:

   ```bash
   node scripts/pingcode.js --method GET --path /v1/ship/products --param keywords="Product name"
   ```

2. Resolve optional suites, states, priorities, and assignee IDs. Use `--cache-idea-states --product-id PRODUCT_ID` and `--cache-idea-priorities --product-id PRODUCT_ID` before setting idea state or priority IDs.
3. Execute:

   ```bash
   node scripts/pingcode.js --method POST --path /v1/ship/ideas --data '{"product_id":"PRODUCT_ID","title":"Idea title"}'
   ```

## Use an Unwrapped Endpoint

Call any supported PingCode REST endpoint with the single CLI command:

```bash
node scripts/pingcode.js --method GET --path /v1/project/projects --param page_size=20
node scripts/pingcode.js --method PATCH --path /v1/project/projects/PROJECT_ID --data '{"description":"Updated"}'
```

For write operations, execute directly after IDs and payload fields are clear. `--dry-run` remains available when the user asks to preview a high-risk payload before sending it.
