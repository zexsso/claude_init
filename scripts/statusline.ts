#!/usr/bin/env bun
/**
 * Claude Code Statusline
 *
 * Line 1: [████████████] 96.1% | 2h 30m
 * Line 2: Ctx: 26.1% | ⚡main | (+14,-18)
 */

import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_TOKENS = 200_000;
const CACHE_TTL_MS = 30_000; // Cache API response for 30s
const GIT_TIMEOUT_MS = 2000;
const CACHE_FILE = join(tmpdir(), "claude-statusline-cache.json");

// Credential paths to check (in order of priority)
const CRED_PATHS = [
  join(homedir(), ".claude", "credentials.json"),
  join(homedir(), ".claude", ".credentials.json"),
  join(homedir(), ".claude.json"),
  // macOS Application Support
  join(homedir(), "Library", "Application Support", "Claude", "credentials.json"),
];

// ANSI Colors
const COLOR = {
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface HookInput {
  transcript_path: string;
  cwd: string;
  workspace: { current_dir: string };
  cost: { total_duration_ms: number };
}

interface CachedUsage {
  percent: number;
  resetMs: number;
  cachedAt: number;
}

// ============================================================================
// CACHING
// ============================================================================

function readCache(): CachedUsage | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(readFileSync(CACHE_FILE, "utf8")) as CachedUsage;
    if (Date.now() - data.cachedAt < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}

function writeCache(percent: number, resetMs: number): void {
  try {
    const data: CachedUsage = { percent, resetMs, cachedAt: Date.now() };
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {}
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatTime(ms: number): string {
  if (ms <= 0) return "0m";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function progressBar(percent: number, width = 25): string {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * width);
  return `${COLOR.gray}[${COLOR.cyan}${"█".repeat(filled)}${" ".repeat(width - filled)}${COLOR.gray}]${COLOR.reset}`;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

function getTokenFromKeychain(): string | null {
  // macOS Keychain support
  if (process.platform !== "darwin") return null;
  try {
    const output = execSync('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null', {
      encoding: "utf8",
      timeout: 2000,
    });
    const data = JSON.parse(output.trim());
    return data?.claudeAiOauth?.accessToken || null;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  // Check environment variable first
  const envToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (envToken) return envToken;

  // Try macOS Keychain first (most common on macOS)
  const keychainToken = getTokenFromKeychain();
  if (keychainToken) return keychainToken;

  // Try each credential path
  for (const credPath of CRED_PATHS) {
    try {
      if (!existsSync(credPath)) continue;
      const data = JSON.parse(readFileSync(credPath, "utf8"));
      const token = data?.claudeAiOauth?.accessToken;
      if (token) return token;
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchUsage(): Promise<{ percent: number; resetMs: number } | null> {
  // Check cache first
  const cached = readCache();
  if (cached) return { percent: cached.percent, resetMs: cached.resetMs - (Date.now() - cached.cachedAt) };

  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const fiveHour = data?.five_hour;
    const percent = fiveHour?.utilization ?? 0;
    const resetMs = fiveHour?.resets_at
      ? Math.max(0, new Date(fiveHour.resets_at).getTime() - Date.now())
      : 5 * 60 * 60 * 1000;

    writeCache(percent, resetMs);
    return { percent, resetMs };
  } catch {
    return null;
  }
}

function getContextPercent(transcriptPath: string): number {
  if (!transcriptPath || !existsSync(transcriptPath)) return 0;

  try {
    // Read last 50KB of file (optimization: don't parse entire transcript)
    const stats = statSync(transcriptPath);
    const fd = Bun.file(transcriptPath);
    const start = Math.max(0, stats.size - 50000);
    const content = readFileSync(transcriptPath, "utf8").slice(start);

    // Find last valid usage entry
    const lines = content.split("\n").reverse();
    for (const line of lines) {
      if (!line.includes('"usage"')) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.isSidechain || entry.isApiErrorMessage || !entry.message?.usage) continue;
        const u = entry.message.usage;
        const tokens = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
        return Math.min(100, (tokens / MAX_TOKENS) * 100);
      } catch {}
    }
  } catch {}
  return 0;
}

function getGitInfo(cwd: string): { branch: string; added: number; removed: number } {
  try {
    // Single git command for all info
    const output = execSync(
      'git branch --show-current && git diff --numstat && echo "---" && git diff --numstat --cached',
      { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: GIT_TIMEOUT_MS }
    );

    const [branchLine, ...rest] = output.split("\n");
    const branch = branchLine?.trim() || "";
    let added = 0, removed = 0;

    for (const line of rest) {
      if (line === "---" || !line.trim()) continue;
      const [a, r] = line.split("\t");
      if (a !== "-") added += parseInt(a, 10) || 0;
      if (r !== "-") removed += parseInt(r, 10) || 0;
    }

    return { branch, added, removed };
  } catch {
    return { branch: "", added: 0, removed: 0 };
  }
}

// ============================================================================
// OUTPUT
// ============================================================================

function buildOutput(usage: { percent: number; resetMs: number } | null, ctxPercent: number, git: { branch: string; added: number; removed: number }, sessionMs: number): string {
  const { gray, white, yellow, green, red, reset } = COLOR;

  const usagePercent = usage?.percent ?? ctxPercent;
  const resetTime = formatTime(usage?.resetMs ?? (5 * 60 * 60 * 1000 - sessionMs));

  // Line 1: Progress bar with usage
  const line1 = `${progressBar(usagePercent)} ${white}${usagePercent.toFixed(1)}%${reset} ${gray}|${reset} ${white}${resetTime}${reset}`;

  // Line 2: Context + Git info
  const parts = [`${gray}Ctx:${reset} ${white}${ctxPercent.toFixed(1)}%${reset}`];
  if (git.branch) parts.push(`${yellow}⚡${git.branch}${reset}`);
  if (git.added || git.removed) parts.push(`${gray}(${green}+${git.added}${gray},${red}-${git.removed}${gray})${reset}`);

  const line2 = parts.join(` ${gray}|${reset} `);

  return `${line1}\n${line2}`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  try {
    // Read stdin
    const chunks: string[] = [];
    for await (const chunk of Bun.stdin.stream()) {
      chunks.push(new TextDecoder().decode(chunk));
    }
    const input: HookInput = JSON.parse(chunks.join(""));
    const cwd = input.workspace?.current_dir || input.cwd;

    // Fetch all data in parallel
    const [usage, ctxPercent, git] = await Promise.all([
      fetchUsage(),
      Promise.resolve(getContextPercent(input.transcript_path)),
      Promise.resolve(getGitInfo(cwd)),
    ]);

    console.log(buildOutput(usage, ctxPercent, git, input.cost?.total_duration_ms ?? 0));
  } catch {
    console.log(`${COLOR.gray}--${COLOR.reset}\n`);
  }
}

main();
