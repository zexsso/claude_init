#!/usr/bin/env bun
/**
 * cc-init CLI
 *
 * Usage:
 *   bun cli.ts setup [--global] [--symlink]
 *   bun cli.ts uninstall [--global]
 *   bun cli.ts status
 */

import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { execSync } from "node:child_process";

// Colors
const c = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

const log = {
  info: (msg: string) => console.log(`${c.cyan}[cc-init]${c.reset} ${msg}`),
  success: (msg: string) => console.log(`${c.green}[cc-init]${c.reset} ${msg}`),
  warn: (msg: string) => console.log(`${c.yellow}[cc-init]${c.reset} ${msg}`),
  error: (msg: string) => console.log(`${c.red}[cc-init]${c.reset} ${msg}`),
  item: (msg: string) => console.log(`  ${c.dim}${msg}${c.reset}`),
};

// Paths
const PKG_ROOT = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")); // Handle Windows paths
const GLOBAL_CLAUDE = join(homedir(), ".claude");
const LOCAL_CLAUDE = ".claude";

function isInGitRepo(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getTargetDir(forceGlobal: boolean): string {
  if (forceGlobal) return GLOBAL_CLAUDE;
  // Smart detection: use local if in git repo, otherwise global
  return isInGitRepo() ? LOCAL_CLAUDE : GLOBAL_CLAUDE;
}

type InstallResult = { count: number; symlinkFailed: boolean };

function installFiles(srcDir: string, targetDir: string, useSymlink: boolean): InstallResult {
  if (!existsSync(srcDir)) return { count: 0, symlinkFailed: false };

  mkdirSync(targetDir, { recursive: true });

  const files = readdirSync(srcDir).filter(f => f.endsWith(".md"));
  let symlinkFailed = false;

  for (const file of files) {
    const src = join(srcDir, file);
    const dest = join(targetDir, file);

    // Remove existing (file or symlink)
    if (existsSync(dest)) {
      unlinkSync(dest);
    }

    if (useSymlink) {
      try {
        symlinkSync(resolve(src), dest);
        log.item(`Linked: ${file}`);
      } catch (err: any) {
        if (err.code === "EPERM") {
          // Windows symlink permission error - fallback to copy
          symlinkFailed = true;
          cpSync(src, dest);
          log.item(`Copied: ${file} (symlink failed)`);
        } else {
          throw err;
        }
      }
    } else {
      cpSync(src, dest);
      log.item(`Copied: ${file}`);
    }
  }
  return { count: files.length, symlinkFailed };
}

function removeFiles(srcDir: string, targetDir: string): number {
  if (!existsSync(srcDir) || !existsSync(targetDir)) return 0;

  const files = readdirSync(srcDir).filter(f => f.endsWith(".md"));
  let removed = 0;

  for (const file of files) {
    const dest = join(targetDir, file);
    if (existsSync(dest)) {
      rmSync(dest);
      log.item(`Removed: ${file}`);
      removed++;
    }
  }
  return removed;
}

function setup(args: string[]) {
  const forceGlobal = args.includes("--global") || args.includes("-g");
  const useSymlink = args.includes("--symlink") || args.includes("-s");

  const targetDir = getTargetDir(forceGlobal);
  const isGlobal = targetDir === GLOBAL_CLAUDE;

  log.info(`Installing to ${isGlobal ? "~/.claude (global)" : ".claude (project)"}`);

  // Install commands
  log.info("Installing commands...");
  const cmdResult = installFiles(
    join(PKG_ROOT, "commands"),
    join(targetDir, "commands"),
    useSymlink
  );

  // Install agents
  log.info("Installing agents...");
  const agentResult = installFiles(
    join(PKG_ROOT, "agents"),
    join(targetDir, "agents"),
    useSymlink
  );

  console.log();
  log.success(`Installed ${cmdResult.count} commands and ${agentResult.count} agents!`);

  // Symlink permission warning
  const symlinkFailed = cmdResult.symlinkFailed || agentResult.symlinkFailed;
  if (symlinkFailed) {
    console.log();
    log.warn("Symlinks failed due to permission error.");
    log.warn("Files were copied instead. To enable symlinks:");
    if (process.platform === "win32") {
      log.item("Option 1: Run terminal as Administrator");
      log.item("Option 2: Enable Developer Mode in Windows Settings > Privacy & Security > For developers");
    } else {
      log.item("Check directory permissions or run with appropriate privileges");
    }
  }

  // Statusline hint
  const statuslineScript = join(PKG_ROOT, "scripts", "statusline.ts");
  if (existsSync(statuslineScript)) {
    console.log();
    log.warn("To enable statusline, add to ~/.claude/settings.json:");
    console.log(`
{
  "statusLine": {
    "type": "command",
    "command": "bun ${statuslineScript}",
    "padding": 0
  }
}
`);
  }

  if (!useSymlink && !symlinkFailed) {
    log.warn("Tip: Use --symlink for auto-updates on git pull");
  }
}

function uninstall(args: string[]) {
  const forceGlobal = args.includes("--global") || args.includes("-g");
  const targetDir = getTargetDir(forceGlobal);
  const isGlobal = targetDir === GLOBAL_CLAUDE;

  log.info(`Uninstalling from ${isGlobal ? "~/.claude (global)" : ".claude (project)"}`);

  const cmdRemoved = removeFiles(join(PKG_ROOT, "commands"), join(targetDir, "commands"));
  const agentRemoved = removeFiles(join(PKG_ROOT, "agents"), join(targetDir, "agents"));

  console.log();
  log.success(`Removed ${cmdRemoved} commands and ${agentRemoved} agents`);
  log.info("Statusline config in settings.json was preserved");
}

function status() {
  log.info("Checking installation status...\n");

  const locations = [
    { name: "Global (~/.claude)", path: GLOBAL_CLAUDE },
    { name: "Local (.claude)", path: LOCAL_CLAUDE },
  ];

  for (const loc of locations) {
    console.log(`${c.cyan}${loc.name}:${c.reset}`);

    const cmdDir = join(loc.path, "commands");
    const agentDir = join(loc.path, "agents");

    if (existsSync(cmdDir)) {
      const cmds = readdirSync(cmdDir).filter(f => f.endsWith(".md"));
      log.item(`Commands: ${cmds.length} (${cmds.map(f => f.replace(".md", "")).join(", ")})`);
    } else {
      log.item("Commands: none");
    }

    if (existsSync(agentDir)) {
      const agents = readdirSync(agentDir).filter(f => f.endsWith(".md"));
      log.item(`Agents: ${agents.length} (${agents.map(f => f.replace(".md", "")).join(", ")})`);
    } else {
      log.item("Agents: none");
    }
    console.log();
  }
}

function showHelp() {
  console.log(`
${c.cyan}cc-init${c.reset} - Claude Code productivity toolkit

${c.yellow}Usage:${c.reset}
  bun cli.ts <command> [options]

${c.yellow}Commands:${c.reset}
  setup       Install commands and agents
  uninstall   Remove installed commands and agents
  status      Show installation status

${c.yellow}Options:${c.reset}
  --global, -g    Force global installation (~/.claude)
  --symlink, -s   Use symlinks instead of copying (auto-updates)

${c.yellow}Examples:${c.reset}
  bun cli.ts setup              # Smart install (project or global)
  bun cli.ts setup --global     # Force global install
  bun cli.ts setup -g -s        # Global with symlinks
  bun cli.ts uninstall --global # Remove from global
  bun cli.ts status             # Check what's installed
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "setup":
  case "install":
    setup(args.slice(1));
    break;
  case "uninstall":
  case "remove":
    uninstall(args.slice(1));
    break;
  case "status":
    status();
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    showHelp();
    break;
  default:
    log.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
