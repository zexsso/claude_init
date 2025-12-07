# cc-init

A Claude Code plugin with productivity commands, specialized agents, and a custom statusline.

## Installation

### Plugin Installation

```bash
# In Claude Code, add as local marketplace
/plugin marketplace add C:\path\to\cc-init

# Install the plugin
/plugin install cc-init@cc-init
```

### Statusline Setup

The statusline is separate from the plugin. To use it:

1. **Install Bun** (if not installed):
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **Add to `~/.claude/settings.json`**:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "bun C:\\path\\to\\cc-init\\scripts\\statusline.ts",
       "padding": 0
     }
   }
   ```

3. **For API usage limits** (shows real usage %), ensure one of:
   - `CLAUDE_CODE_OAUTH_TOKEN` environment variable is set, or
   - Credentials exist in `~/.claude/credentials.json`

## Features

### Commands (8)

| Command | Description |
|---------|-------------|
| `/commit` | Fast conventional commits with immediate push |
| `/create-pull-request` | Auto-generated PR creation |
| `/watch-ci` | Monitor CI pipeline and auto-fix failures |
| `/fix-pr-comments` | Resolve PR review comments systematically |
| `/run-tasks` | Execute GitHub issues with EPCT workflow |
| `/epct` | Explore-Plan-Code-Test methodology |
| `/explore` | Deep codebase exploration |
| `/oneshot` | Quick one-shot task execution |

### Agents (4)

| Agent | Description |
|-------|-------------|
| `explore-codebase` | Comprehensive code discovery and analysis |
| `explore-docs` | Documentation exploration |
| `websearch` | Quick web research with authoritative sources |
| `action` | Action-focused task execution |

### Statusline

```
[██████████████████████████] 96.1% | 2h 30m
Ctx: 26.1% | ⚡main | (+14,-18)
```

**Line 1:** 5-hour usage % with progress bar + time until reset
**Line 2:** Context % | git branch | uncommitted changes

## Structure

```
cc-init/
├── .claude-plugin/
│   └── plugin.json
├── commands/
├── agents/
├── scripts/
│   └── statusline.ts
├── README.md
└── CLAUDE.md
```

## Requirements

- **Claude Code**
- **Bun** (for statusline)
- **Git** (for branch/changes)

## Credential Locations (for usage API)

Checked in order:
1. `CLAUDE_CODE_OAUTH_TOKEN` env var
2. `~/.claude/credentials.json`
3. `~/.claude/.credentials.json`
4. `~/.claude.json`
5. `%LOCALAPPDATA%\Claude\credentials.json`
6. `%APPDATA%\Claude\credentials.json`

## License

MIT
