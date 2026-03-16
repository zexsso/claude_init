#!/usr/bin/env bun
/**
 * Claude Code Statusline
 *
 * Line 1: [████████████] 2.0% | 4h 12m | Wk: 0.0%
 * Line 2: Ctx: 26.1% | ⚡main | (+14,-18)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_TOKENS = 200_000;
const CACHE_TTL_MS = 30_000;
const GIT_TIMEOUT_MS = 2_000;
const KEYCHAIN_TIMEOUT_MS = 2_000;
const TRANSCRIPT_TAIL_BYTES = 50_000;
const FIVE_HOUR_MS = 5 * 60 * 60 * 1000;
const SEVEN_DAY_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_FILE = join(tmpdir(), "claude-statusline-cache.json");

const CRED_PATHS = (() => {
  const home = homedir();
  const paths = [
    join(home, ".claude", "credentials.json"),
    join(home, ".claude", ".credentials.json"),
    join(home, ".claude.json"),
  ];
  if (process.platform === "darwin") {
    paths.push(join(home, "Library", "Application Support", "Claude", "credentials.json"));
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    const appData = process.env.APPDATA;
    if (localAppData) paths.push(join(localAppData, "Claude", "credentials.json"));
    if (appData) paths.push(join(appData, "Claude", "credentials.json"));
  }
  return paths;
})();

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
  resetsAt: number;
  weekPercent: number;
  weekResetsAt: number;
  cachedAt: number;
}

interface UsageData {
  percent: number;
  resetMs: number;
  weekPercent: number;
  weekResetMs: number;
}

// ============================================================================
// CACHING
// ============================================================================

function readCache(): CachedUsage | null {
  try {
    const data = JSON.parse(readFileSync(CACHE_FILE, "utf8")) as CachedUsage;
    if (Date.now() - data.cachedAt < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}

function writeCache(usage: Omit<CachedUsage, "cachedAt">): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify({ ...usage, cachedAt: Date.now() }));
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

function extractOAuthToken(json: string): string | null {
  try {
    return JSON.parse(json)?.claudeAiOauth?.accessToken || null;
  } catch {
    return null;
  }
}

function parseBucket(bucket: any, defaultMs: number, now: number): { utilization: number; resetsAt: number } {
  return {
    utilization: bucket?.utilization ?? 0,
    resetsAt: bucket?.resets_at ? new Date(bucket.resets_at).getTime() : now + defaultMs,
  };
}

function cachedToUsage(cached: CachedUsage): UsageData {
  const now = Date.now();
  return {
    percent: cached.percent,
    resetMs: Math.max(0, cached.resetsAt - now),
    weekPercent: cached.weekPercent,
    weekResetMs: Math.max(0, cached.weekResetsAt - now),
  };
}

// ============================================================================
// DATA FETCHING
// ============================================================================

function getToken(): string | null {
  const envToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (envToken) return envToken;

  // macOS Keychain
  if (process.platform === "darwin") {
    try {
      const { execSync } = require("node:child_process");
      const output = execSync('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null', {
        encoding: "utf8",
        timeout: KEYCHAIN_TIMEOUT_MS,
      });
      const token = extractOAuthToken(output.trim());
      if (token) return token;
    } catch {}
  }

  // Credential files
  for (const credPath of CRED_PATHS) {
    try {
      const token = extractOAuthToken(readFileSync(credPath, "utf8"));
      if (token) return token;
    } catch {}
  }
  return null;
}

async function fetchUsage(): Promise<UsageData | null> {
  const cached = readCache();
  if (cached) return cachedToUsage(cached);

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
    const now = Date.now();

    const fiveHour = parseBucket(data?.five_hour, FIVE_HOUR_MS, now);
    const sevenDay = parseBucket(data?.seven_day, SEVEN_DAY_MS, now);

    const cacheData = {
      percent: fiveHour.utilization,
      resetsAt: fiveHour.resetsAt,
      weekPercent: sevenDay.utilization,
      weekResetsAt: sevenDay.resetsAt,
    };

    writeCache(cacheData);
    return cachedToUsage({ ...cacheData, cachedAt: now });
  } catch {
    return null;
  }
}

async function getContextPercent(transcriptPath: string): Promise<number> {
  if (!transcriptPath) return 0;

  try {
    const file = Bun.file(transcriptPath);
    const size = file.size;
    const start = Math.max(0, size - TRANSCRIPT_TAIL_BYTES);
    const content = await file.slice(start, size).text();

    // Scan backward for the last usage entry
    let pos = content.length;
    while (pos > 0) {
      const lineEnd = pos;
      pos = content.lastIndexOf("\n", pos - 1);
      const line = content.slice(pos + 1, lineEnd);
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
    const output = execSync(
      'git branch --show-current && git diff HEAD --numstat',
      { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: GIT_TIMEOUT_MS }
    );

    const [branchLine, ...rest] = output.split("\n");
    const branch = branchLine?.trim() || "";
    let added = 0, removed = 0;

    for (const line of rest) {
      if (!line.trim()) continue;
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

function buildOutput(usage: UsageData | null, ctxPercent: number, git: { branch: string; added: number; removed: number }): string {
  const { gray, white, yellow, green, red, reset } = COLOR;

  const usagePercent = usage?.percent ?? 0;
  const resetTime = formatTime(usage?.resetMs ?? 0);
  const weekPercent = usage?.weekPercent ?? 0;

  const line1 = `${progressBar(usagePercent)} ${white}${usagePercent.toFixed(1)}%${reset} ${gray}|${reset} ${white}${resetTime}${reset} ${gray}|${reset} ${gray}Week:${reset} ${white}${weekPercent.toFixed(1)}%${reset}`;

  const parts = [`${gray}Ctx:${reset} ${white}${ctxPercent.toFixed(1)}%${reset}`];
  if (git.branch) parts.push(`${yellow}⚡${git.branch}${reset}`);
  if (git.added || git.removed) parts.push(`${gray}(${green}+${git.added}${gray},${red}-${git.removed}${gray})${reset}`);

  return `${line1}\n${parts.join(` ${gray}|${reset} `)}`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  try {
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    for await (const chunk of Bun.stdin.stream()) {
      chunks.push(decoder.decode(chunk, { stream: true }));
    }
    const input: HookInput = JSON.parse(chunks.join(""));
    const cwd = input.workspace?.current_dir || input.cwd;

    const git = getGitInfo(cwd);
    const [usage, ctxPercent] = await Promise.all([
      fetchUsage(),
      getContextPercent(input.transcript_path),
    ]);

    console.log(buildOutput(usage, ctxPercent, git));
  } catch {
    console.log(`${COLOR.gray}--${COLOR.reset}\n`);
  }
}

main();
