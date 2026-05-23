---
description: Quick commit and push with minimal, clean messages. Use when the user types /commit or asks to commit and push current changes with a short conventional message. Always require explicit invocation — do not auto-fire after edits, the user controls when commits happen.
disable-model-invocation: true
allowed-tools: Bash(git :*)
---

Terse conventional commits for a clean history. No fluff. Why over what.

## ⚠️ Git identity — never break

- NEVER touch git config, `--author`, `Co-Authored-By`, or AI signatures.
- ALWAYS use the machine's configured account. Commits are the human's, not AI's.

## Workflow

1. `git add -A`
2. `git diff --cached --stat` — see what changed
3. Commit with a one-line message (below)
4. `git push`

## Message

`<type>: <imperative summary>`

- Types: `feat` `fix` `refactor` `perf` `docs` `test` `chore` `build` `ci` `update`
- Imperative: "add" not "added"
- ≤50 chars, no trailing period, lowercase after colon
- One line. No body — diff says what.

## Examples

```
feat: add user auth
fix: resolve memory leak
refactor: simplify api routes
```

## Execution

- No interactive commands, no verbose output.
- No changes → exit silently. Push fails → report error only.
