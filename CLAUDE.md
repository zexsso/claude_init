# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**cc-init** is a Claude Code plugin with commands, agents, and a statusline.

## Structure

```
cc-init/
├── .claude-plugin/
│   └── plugin.json      # Plugin manifest
├── commands/            # Slash commands (.md)
├── agents/              # Agents (.md)
├── scripts/
│   └── statusline.ts    # Statusline script (Bun)
├── README.md
└── CLAUDE.md
```

## Plugin Components

### Commands (`commands/*.md`)

YAML frontmatter options:
- `allowed-tools` - Tools the command can use
- `description` - Shown in `/help`
- `argument-hint` - Placeholder shown for arguments

Available commands:
| Command | Description |
|---------|-------------|
| `/commit` | Quick commit and push with minimal, clean messages |
| `/create-pull-request` | Create and push PR with auto-generated title and description |
| `/epct` | Systematic implementation using Explore-Plan-Code-Test methodology |
| `/explore <question>` | Deep codebase exploration to answer specific questions |
| `/fix-pr-comments [pr-number]` | Fetch PR review comments and implement all requested changes |
| `/oneshot <feature>` | Ultra-fast feature implementation (Explore-Code-Test, no planning) |
| `/run-tasks <issue|file>` | Execute GitHub issues or task files with full EPCT workflow and PR creation |
| `/watch-ci [run-id]` | Monitor CI pipeline and automatically fix failures until green |

### Agents (`agents/*.md`)

Agent definitions with specialized prompts and tool access.

Available agents:
| Agent | Model | Purpose |
|-------|-------|---------|
| `explore-codebase` | haiku | Find relevant code, patterns, and dependencies for feature implementation |
| `explore-docs` | haiku | Retrieve library documentation via Context7 and WebFetch |
| `websearch` | haiku | Quick web searches with summarized results |
| `action` | haiku | Conditional batch executor (verify before acting, max 5 tasks) |

## Statusline (`scripts/statusline.ts`)

Two-line output:
```
[████████████████████] 96.1% | 2h 30m
Ctx: 26.1% | ⚡main | (+14,-18)
```

**Data sources:**
- Usage % from `https://api.anthropic.com/api/oauth/usage` (requires OAuth token)
- Context tokens from transcript file
- Git info from `git` commands

**Setup in `~/.claude/settings.json`:**
```json
{
  "statusLine": {
    "type": "command",
    "command": "bun C:\\path\\to\\scripts\\statusline.ts",
    "padding": 0
  }
}
```

## Adding Components

### New Command

Create `commands/my-command.md`:
```markdown
---
allowed-tools: Bash(git :*), Read, Edit
description: My command description
---

Prompt here...
```

### New Agent

Create `agents/my-agent.md` with agent definition.

## Docs

- [Statusline](https://code.claude.com/docs/en/statusline)
- [Slash Commands](https://code.claude.com/docs/en/slash-commands)
- [Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Plugins](https://code.claude.com/docs/en/plugins)
