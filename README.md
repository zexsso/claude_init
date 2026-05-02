# cc-init

A Claude Code plugin with skills, specialized agents, and a custom statusline.

Aligned with the 2026 Anthropic guidance: skills are the primary extension surface (commands have been merged into skills). New extensions live under `skills/` and are auto-discoverable by Claude Code.

## Installation

```bash
# Clone the repo
git clone https://github.com/zexsso/cc-init.git
cd cc-init

# Install globally with symlinks (recommended — auto-updates on git pull)
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

The CLI installs `commands/`, `agents/`, and `skills/` from this repo into your target `.claude/` directory.

### Statusline Setup

The statusline is a separate opt-in script. To use it:

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

### Skills

| Skill     | Trigger                                                      | Purpose                                                                                                                                                          |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/audit`  | auto on "best way to / should I X or Y / how to architect Z" | Multi-agent research audit — fans out research across codebase, docs (Context7), web, and installed skills, runs cross-questioning + devil's advocate, prints a comparative report. Stops at the report (no implementation). |
| `/commit` | manual only                                                  | Quick conventional commit + push with a one-line, ≤50 char message. Manual invocation only — never auto-fires after edits.                                       |

### Agents

No custom agents. The plugin relies entirely on Claude Code's built-in agents:

- `Explore` — read-only codebase research (haiku)
- `Plan` — read-only research for plan mode
- `general-purpose` — full-tool agent for synthesis, web search, multi-step research

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
├── skills/              # Skills (auto-discovered, /skill-name invocation)
│   ├── audit/
│   │   ├── SKILL.md
│   │   └── evals/
│   └── commit/
│       └── SKILL.md
├── scripts/
│   └── statusline.ts    # Statusline script (Bun)
├── cli.ts               # CLI installer
├── README.md
└── CLAUDE.md
```

## Requirements

- **Claude Code** (2026+ recommended for full skill support)
- **Bun** (for statusline + cli.ts)
- **Git** (for branch/changes in statusline)

## Credential Locations (for usage API)

Checked in order:

1. `CLAUDE_CODE_OAUTH_TOKEN` env var
2. **macOS Keychain** (`Claude Code-credentials`) - primary on macOS
3. `~/.claude/credentials.json`
4. `~/.claude/.credentials.json`
5. `~/.claude.json`
6. `%LOCALAPPDATA%\Claude\credentials.json` (Windows)
7. `%APPDATA%\Claude\credentials.json` (Windows)

## License

MIT
