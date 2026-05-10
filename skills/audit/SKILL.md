---
name: audit
description: Comprehensive multi-agent research audit before committing to an implementation. Spawns parallel research agents across the codebase, library docs (Context7), web, and installed skills, cross-questions across waves, runs a devil's advocate pass on architecture/library decisions, and synthesizes one comparative report with pros/cons + a recommendation. Does NOT implement — stops at the report. Use whenever the user types `/audit`, asks "what's the best way to...", "should I use X or Y", "how should I architect...", "audit how to add/fix/refactor X", "compare options for Y", or wants a thorough decision-support analysis before writing code. Also use proactively when the user is about to start a non-trivial feature/refactor and hasn't yet decided on an approach.
when_to_use: User invokes /audit, asks for a comparison of options, asks "best way to" do something non-trivial, debates architecture or library choice, wants tradeoffs surfaced, or is about to commit to a multi-step implementation without a clear plan.
argument-hint: <topic — feature to add, bug to fix, arch question, lib choice, ...>
allowed-tools: Task WebFetch WebSearch Read Grep Glob Skill
---

# Audit

Multi-agent research. Fan out, cross-question, synthesize. **Do NOT implement.** Stop at report.

## Topic

$ARGUMENTS

If empty/vague: ask one clarifying question first.

## Phase 1 — Fleet

Pick 4–6 dimensions. One agent per dimension. Brief = 4–6 sentences, one exact question.

| Dimension | Agent |
|---|---|
| codebase state | `Explore` |
| lib docs | `general-purpose` + Context7/WebFetch |
| web/community | `general-purpose` + WebSearch (or main if 1–2 queries) |
| skill discovery | `general-purpose` running `npx skills find <terms>` + skills.sh |
| git precedent | `Explore` + `git log` grep |
| competing options | `general-purpose`, one per top option |
| build/installer | `Explore` reading `cli.ts`, `bin/`, `package.json` |

Audit touches plugin shape/distribution → always check `cli.ts`, `bin/`, install scripts.

**Spawn wave 1 in one message, parallel.**

## Phase 2 — Cross-question

After wave 1: list gaps + conflicts + new questions. Spawn wave 2 on those. **Cap: 2 follow-up waves.**

Arch / lib / mixed → spawn **one** devil's advocate: "Argue against leading option. Find weakest assumption. Propose strongest alternative + when it beats leader."

Wave 1 converges → skip wave 2.

## Phase 3 — Budget

Soft cap: **6 wave-1, ≤2 follow-up waves, ≤15 total.** Scale down on trivial topics.

## Phase 4 — Report

**Visual. ASCII box tables. Status emojis. Verdict first. User's language. ≤120 lines.**

Status markers:
- ✅ supported / done / yes
- ❌ missing / no
- 🟡 partial — add `(nuance)` after
- 🆕 net new to build
- ⚠️ risk / caveat

Use ASCII box-drawing chars: `┌ ┬ ┐ ├ ┼ ┤ └ ┴ ┘ ─ │`. Pipe-markdown tables interdites.

Template (comparison shape — `X vs Y`, lib choice, parity audit):

```
# Audit: <topic>

╔══════════════════════════════════════════════════════════╗
║ VERDICT: <option> — <1 line reason>                       ║
║ Si <condition>: <other option>                            ║
╚══════════════════════════════════════════════════════════╝

## <Domain 1 — e.g. Users / RBAC>

┌────────────────────────────┬─────────┬─────────────────────┐
│          Feature           │  <A>    │        <B>          │
├────────────────────────────┼─────────┼─────────────────────┤
│ feature 1                  │ ✅      │ ❌                  │
│ feature 2                  │ ✅      │ 🟡 (flag, pas role) │
└────────────────────────────┴─────────┴─────────────────────┘

## <Domain 2>
(same shape, group features par domaine)

---

## État actuel
- `file.ts:42` — fait
- `file.ts:88` — fait

## Risques retenu
- ⚠️ <risque + mitigation>
- ⚠️ <devil's advocate>

## Prochaines étapes
1. …
2. …

## Skills existants
<find-skills, 1 line>
```

Non-comparison audit (single feature/bug, pas X vs Y) : skip tables comparatives. Garder verdict block + état actuel + risques + steps.

End:
> Done. À toi.

## Rules

- **Cite or don't claim.** Codebase claim → `file:line`. No invented paths.
- **Every recommendation has ≥1 concrete drawback.** None? Search harder.
- **Conditional verdicts.** Always name "Si X → autre option" if alternative crédible.
- **Surface conflicts.** Agents disagree → name it.
- **Tight briefs.** 4–6 sentences, one question.
- **Cheap agents.** `Explore` (haiku) for codebase. `general-purpose` for web/Context7/skills.
- **Drop empty sections.** <2 non-evident bullets → cut. No "N/A".
- **No filler.** Lead with verdict. No recap intro.
- **One devil's advocate per audit.**

## Anti-patterns

- Agent that just reads `package.json` → do it yourself.
- Brief "research React Query" → too broad. Be specific.
- Recommendation without conditional fallback.
- Recursive `/audit` → note in steps, stop.
- Implementing anything.

## Example (comparison audit — illustration format only)

```
# Audit: <topic>

╔══════════════════════════════════════════════════════════╗
║ VERDICT: Option A — <reason 1 line>.                      ║
║ Si <condition X>: Option B.                               ║
╚══════════════════════════════════════════════════════════╝

## <Domain 1>

┌──────────────────────┬──────────┬─────────────────────────┐
│       Feature        │ Option A │        Option B         │
├──────────────────────┼──────────┼─────────────────────────┤
│ feature alpha        │ ✅       │ ✅                      │
│ feature beta         │ ✅       │ ❌                      │
│ feature gamma        │ ✅       │ 🟡 (partial — <nuance>) │
│ feature delta        │ ❌       │ ✅                      │
└──────────────────────┴──────────┴─────────────────────────┘

## <Domain 2>

┌──────────────────────┬──────────┬──────────┐
│       Feature        │ Option A │ Option B │
├──────────────────────┼──────────┼──────────┤
│ feature epsilon      │ ✅       │ ❌       │
│ feature zeta         │ ✅       │ 🆕       │
└──────────────────────┴──────────┴──────────┘

---

## État actuel
- `path/to/file.ts:42` — <fact>
- `path/to/other.ts:88` — <fact>

## Risques retenu
- ⚠️ <risk + mitigation>
- ⚠️ <devil's advocate finding>

## Prochaines étapes
1. <action concrète, file à toucher>
2. <action>

## Skills existants
<find-skills result, 1 line>
```

> Done. À toi.
