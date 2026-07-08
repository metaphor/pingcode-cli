---
name: pingcode-ctx
description: Use this skill when the user wants to initialize or change PingCode workspace context with agent-fronted project, sprint, and user selection. It guides the user through numbered choices in chat and caches the selected current project, sprint, and user.
---

# PingCode Context Setup

Use this skill to configure `.pingcode-skill/cache.json` from an agent frontend such as Codex or Claude Code.

Do not run the terminal-interactive `pingcode-ctx` command by default. Instead, use the agent frontend Q&A protocol below so the user chooses in chat and the agent writes choices with non-interactive CLI commands.

## Setup

PingCode credentials must be available before listing options:

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

Optional:

```bash
export PINGCODE_BASE_URL="https://open.pingcode.com"
export PINGCODE_WORKSPACE_CACHE=".pingcode-skill/cache.json"
```

## Agent Frontend Q&A Protocol

This protocol is intentionally platform-neutral and works in Codex, Claude Code, and similar agents:

1. Run a list command for one choice group.
2. Present a numbered list in chat. Include display name, username/email/identifier when present, and ID.
3. Ask the user to reply with one number, ID, or exact name.
4. Resolve the reply to the selected option.
5. Run the matching `--set-current-*` command.
6. Continue to the next choice group.

Ask only one selection question at a time. Never ask the user to paste credentials or tokens.

## Commands

List project options:

```bash
node scripts/pingcode.js --context-options project
```

After the user chooses:

```bash
node scripts/pingcode.js --set-current-project PROJECT_ID_OR_NAME
```

List sprint/iteration options for the cached current project:

```bash
node scripts/pingcode.js --context-options sprint
```

After the user chooses:

```bash
node scripts/pingcode.js --set-current-sprint SPRINT_ID_OR_NAME
```

List user options for the cached current project:

```bash
node scripts/pingcode.js --context-options user
```

After the user chooses:

```bash
node scripts/pingcode.js --set-current-user USER_ID_OR_NAME
```

If a project is not cached yet but user options are needed for a known project, pass:

```bash
node scripts/pingcode.js --context-options user --project-id PROJECT_ID
```

## Completion

When all three preferences are cached, report the selected current project, sprint, and user from the command output. The normal `$pingcode` skill can then run routine work item queries and creates with cached defaults.

## Terminal Fallback

If the user explicitly asks for terminal interaction, run:

```bash
node scripts/pingcode-ctx.js
```

This uses Node.js readline and may appear in the tool terminal instead of the agent chat frontend.
