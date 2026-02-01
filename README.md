# cc-init

A Claude Code plugin with productivity commands, specialized agents, and a custom statusline.

## Installation

```bash
# Clone the repo
git clone https://github.com/zexsso/cc-init.git
cd cc-init

# Install globally with symlinks (recommended)
bun cli.ts setup --global --symlink
```

### CLI Commands

```bash
bun cli.ts setup              # Smart install (project if in git repo, else global)
bun cli.ts setup --global     # Force global (~/.claude)
bun cli.ts setup --symlink    # Use symlinks (auto-updates)
bun cli.ts uninstall          # Remove from current location
bun cli.ts uninstall --global # Remove from global
bun cli.ts status             # Check what's installed
```

### Statusline Setup

The statusline is separate from the plugin. To use it:

1. **Install Bun** (if not installed):

   ```bash
   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash

   # Windows (PowerShell)
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **Add to `~/.claude/settings.json`**:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "bun /path/to/cc-init/scripts/statusline.ts",
       "padding": 0
     }
   }
   ```

3. **For API usage limits** (shows real usage %), ensure one of:
   - `CLAUDE_CODE_OAUTH_TOKEN` environment variable is set, or
   - Credentials exist in `~/.claude/credentials.json`

## Features

### Commands (8)

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `/commit`              | Fast conventional commits with immediate push |
| `/create-pull-request` | Auto-generated PR creation                    |
| `/watch-ci`            | Monitor CI pipeline and auto-fix failures     |
| `/fix-pr-comments`     | Resolve PR review comments systematically     |
| `/run-tasks`           | Execute GitHub issues with EPCT workflow      |
| `/epct`                | Explore-Plan-Code-Test methodology            |
| `/explore`             | Deep codebase exploration                     |
| `/oneshot`             | Quick one-shot task execution                 |

### Agents (4)

| Agent              | Description                                   |
| ------------------ | --------------------------------------------- |
| `explore-codebase` | Comprehensive code discovery and analysis     |
| `explore-docs`     | Documentation exploration                     |
| `websearch`        | Quick web research with authoritative sources |
| `action`           | Action-focused task execution                 |

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
│   └── plugin.json      # Plugin manifest
├── commands/            # Slash commands (8)
├── agents/              # Specialized agents (4)
├── scripts/
│   └── statusline.ts    # Statusline script (Bun)
├── cli.ts               # CLI installer
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
5. `$HOME/Library/Application Support/Claude/credentials.json` (macOS)
6. `%LOCALAPPDATA%\Claude\credentials.json` (Windows)
7. `%APPDATA%\Claude\credentials.json` (Windows)

## License

MIT
