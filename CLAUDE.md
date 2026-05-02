# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**cc-init** is a Claude Code plugin with skills, custom agents, and a statusline.

Aligned with Anthropic's 2026 guidance: skills are the primary extension surface (commands have been merged into skills). New extensions should be added under `skills/`. Existing files in `commands/` still work, but `skills/` is preferred for anything new — supports supporting files, frontmatter controls, and auto-trigger.

## Structure

```
cc-init/
├── .claude-plugin/
│   └── plugin.json      # Plugin manifest
├── skills/              # Skills (preferred extension type)
│   ├── audit/
│   │   ├── SKILL.md
│   │   └── evals/
│   └── commit/
│       └── SKILL.md
├── scripts/
│   └── statusline.ts    # Statusline script (Bun)
├── cli.ts               # CLI installer (handles commands/agents/skills)
├── README.md
└── CLAUDE.md
```

## Plugin Components

### Skills (`skills/<skill-name>/SKILL.md`)

YAML frontmatter options (most useful):

- `name` — defaults to dir name; lowercase + hyphens, max 64 chars
- `description` — what the skill does and when to trigger; primary auto-invoke signal. Front-load the key use case (capped at 1,536 chars in the listing)
- `argument-hint` — placeholder shown in autocomplete (e.g. `<topic>`)
- `allowed-tools` — pre-approved tools while skill is active (no permission prompt)
- `disable-model-invocation: true` — manual-only invocation (use for /commit, /deploy)
- `user-invocable: false` — Claude-only, hide from `/` menu (background knowledge skills)
- `context: fork` + `agent: <type>` — run skill body in a forked subagent

Available skills:

| Skill     | Trigger                                         | Description                                                                                                            |
| --------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/audit`  | auto on decision/architecture/comparison phrases | Multi-agent research audit. Spawns parallel research, cross-questions, runs devil's advocate, returns comparative report. Stops at the report — does not implement. |
| `/commit` | manual only (`disable-model-invocation: true`)  | Quick conventional commit + push with one-line message.                                                                |

### Agents (`agents/*.md`)

This plugin currently ships no custom agents. Claude Code's built-in agents cover the needs:

- `Explore` — read-only codebase research (haiku, returns excerpts)
- `Plan` — read-only research used in plan mode
- `general-purpose` — full-tool agent for synthesis, web search (with WebSearch + WebFetch), and multi-step research

If you add a custom agent later, drop a `.md` file in `agents/` (the dir gets created on first file). The CLI installer picks it up automatically on next `setup`.

### Commands (`commands/*.md`)

Currently empty — `commit` was migrated to a skill (`skills/commit/SKILL.md`). The `commands/` directory is preserved as a valid location for future legacy commands but new extensions should go in `skills/`.

If you do add a command file, the same frontmatter as skills works (`allowed-tools`, `description`, `argument-hint`).

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

Cache: 30s TTL on disk at `tmpdir()/claude-statusline-cache.json`. Sync writes (commit `05b4391` fixed multi-session race). Stale-cache fallback on API failure.

**Setup in `~/.claude/settings.json`:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /path/to/cc-init/scripts/statusline.ts",
    "padding": 0
  }
}
```

## Adding Components

### New skill (preferred)

Create `skills/my-skill/SKILL.md`:

```markdown
---
description: What this skill does and when to trigger. Be specific about user phrases that should fire it.
allowed-tools: Read Grep Bash(git :*)
argument-hint: <optional-arg>
---

Your skill instructions here. Imperative, focused, explain the why.
```

Optionally add supporting files (`scripts/`, `references/`, `evals/`) in the same directory. Reference them from `SKILL.md` so Claude knows when to load them.

### New agent

Create `agents/my-agent.md`:

```markdown
---
name: my-agent
description: When Claude should delegate to this agent. Be specific.
model: haiku
tools: Read, Grep, WebSearch
---

System prompt for the agent.
```

### New legacy command

Discouraged for new content (use a skill instead). If needed:

```markdown
---
allowed-tools: Bash(git :*), Read, Edit
description: Command description
---

Prompt body.
```

## Local CLI Workflow

```bash
bun cli.ts setup --global --symlink   # Install globally with symlinks (auto-updates on git pull)
bun cli.ts status                     # See what's installed where
bun cli.ts uninstall --global         # Remove
```

The CLI walks `commands/`, `agents/`, and `skills/` from the repo and copies/symlinks them into the target `.claude/` directory. Skills are detected as subdirs containing a `SKILL.md`.

## Docs

- [Skills](https://code.claude.com/docs/en/skills) — primary extension type (2026)
- [Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Plugins](https://code.claude.com/docs/en/plugins)
- [Statusline](https://code.claude.com/docs/en/statusline)
- [Slash commands (legacy)](https://code.claude.com/docs/en/slash-commands)
