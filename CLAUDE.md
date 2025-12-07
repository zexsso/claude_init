# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Test

- `bun run build` - Compiles TypeScript to JavaScript in dist/ folder
- `bun run dev` - Run CLI directly without building (e.g., `bun run dev claude-code setup`)
- `bun run dev-test` - Test setup with temporary folder (removes test-claude-config first)
- **`bun test:run`** - Run tests in non-interactive mode (**CRITICAL**: always use `test:run`, not `test`)
- `bun test:watch` - Run tests in watch mode for development
- Run single test: `bun test:run tests/setup.test.ts`

### Release

- `bun run release` - Automated release (version bump, build, git tag, npm publish via release-it)

## Project Architecture

CLI tool built with TypeScript and Bun that sets up Claude Code configurations with AIBlueprint defaults.

### Directory Structure

```
src/
├── cli.ts                    # Entry point, Commander.js command routing
├── commands/
│   ├── setup.ts              # Main setup orchestrator
│   ├── setup/                # Setup submodules
│   │   ├── dependencies.ts   # Installs bun, ccusage
│   │   ├── settings.ts       # settings.json manipulation
│   │   ├── shell-shortcuts.ts # Shell alias configuration
│   │   ├── symlinks.ts       # Symlink creation logic
│   │   └── utils.ts          # Setup utilities
│   ├── addHook.ts            # Individual hook installation
│   ├── addCommand.ts         # Individual command installation
│   ├── symlink.ts            # Cross-tool symlink management
│   ├── statusline.ts         # Statusline-only setup
│   └── pro.ts                # Premium feature management
├── lib/
│   ├── license-checker.ts    # Premium license validation
│   ├── pro-installer.ts      # Premium content installer
│   ├── setup-helper.ts       # Setup utilities
│   └── token-storage.ts      # Token persistence
└── utils/
    ├── claude-config.ts      # Config file utilities
    ├── file-installer.ts     # GitHub download with local fallback
    └── github.ts             # GitHub API wrapper

claude-code-config/           # Template files copied to ~/.claude/
├── commands/                 # Slash command templates (.md files)
├── hooks/                    # Hook scripts
├── agents/                   # Agent configurations
├── scripts/                  # Utility scripts (statusline, validator)
└── song/                     # Notification sounds
```

### Key Flows

**Setup Command** (`src/commands/setup.ts`):
1. Interactive feature selection via `inquirer`
2. Downloads templates from GitHub (falls back to local `claude-code-config/`)
3. Merges hooks into `~/.claude/settings.json`
4. Installs dependencies (`bun`, `ccusage`) if selected
5. Configures shell aliases (`cc`, `ccc`)

**File Installation** (`src/utils/file-installer.ts`):
- Primary: Fetches from GitHub repo for latest templates
- Fallback: Uses local `claude-code-config/` when GitHub unavailable

### CLI Commands

All commands are under `aiblueprint claude-code`:
- `setup` - Full interactive setup
- `add hook <type>` - Install specific hook (e.g., `post-edit-typescript`)
- `add commands [name]` - List or install commands
- `symlink` - Create symlinks between Claude Code, Codex, OpenCode, FactoryAI
- `statusline` - Setup statusline only
- `pro activate|status|setup|update` - Premium features

### Testing

Tests use Vitest with mocked fs-extra and inquirer:
- `tests/setup.test.ts` - Setup command unit tests
- `tests/*.integration.test.ts` - Integration tests with actual file operations
- `tests/utils/*.test.ts` - Utility function tests

### Platform Support

- macOS (primary) - `.zshenv` for shell shortcuts
- Linux - `.bashrc`/`.zshrc` support
- Windows - Limited (no shell shortcuts)

## Critical Workflow

- **AFTER EVERY MODIFICATION**: Run `bun test:run` to verify changes
- **NEVER** use `bun test` (interactive) - always use `test:run`
- **NEVER** manually test CLI commands - use the test suite

## Before Editing Claude Code Features

Read the official Claude Code docs first:
- Hooks: https://docs.claude.com/en/docs/claude-code/hooks
- Commands: https://docs.claude.com/en/docs/claude-code/slash-commands
- Settings: https://docs.claude.com/en/docs/claude-code/settings
