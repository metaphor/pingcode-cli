---
name: pingcode-ctx
description: Use this skill when the user wants to initialize or change PingCode workspace context with agent-fronted project, sprint, and user selection. It guides the user through numbered choices in chat and caches the selected current project, sprint, and user.
---

# PingCode Context Setup

Use this skill to configure `.pingcode/cache.json` from an agent frontend such as Codex or OpenCode.

Do not run the terminal-interactive `pingcode context init` command by default. Instead, use the agent frontend Q&A protocol below so the user chooses in chat and the agent writes choices with non-interactive CLI commands.

## Setup

PingCode credentials must be available before initializing or querying workspace context:

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

Optional:

```bash
export PINGCODE_BASE_URL="https://open.pingcode.com"
export PINGCODE_WORKSPACE_CACHE=".pingcode/cache.json"
```

## Agent Frontend Q&A Protocol

This protocol is intentionally platform-neutral and works in Codex, OpenCode, and similar agents:

1. Run a list command for one choice group.
2. Present a numbered list in chat. Include display name, username/email/identifier when present, and ID.
3. Ask the user to reply with one number, ID, or exact name.
4. Resolve the reply to the selected option.
5. Run the matching `context set-current-*` command.
6. Continue to the next choice group.

Ask only one selection question at a time. Never ask the user to paste credentials or tokens.

## Commands

Show current workspace preferences and cached dictionary counts:

```bash
pingcode context list
```

Set current project:

```bash
pingcode context set-current-project PROJECT_ID_OR_NAME
```

Set current sprint/iteration for the cached current project:

```bash
pingcode context set-current-sprint SPRINT_ID_OR_NAME
```

Set current user:

```bash
pingcode context set-current-user USER_ID_OR_NAME
```

Initialize all three preferences interactively:

```bash
pingcode context init
```

If the workspace cache is empty, run `pingcode context init` first to populate it before setting individual preferences.

## Completion

When all three preferences are cached, report the selected current project, sprint, and user from `pingcode context list`. The `$pingcode-workitem` skill can then run routine work item queries and creates with cached defaults.

## Terminal Fallback

If the user explicitly asks for terminal interaction, run:

```bash
pingcode context init
```

This uses Node.js readline and may appear in the tool terminal instead of the agent chat frontend.
