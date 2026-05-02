---
name: audit
description: Comprehensive multi-agent research audit before committing to an implementation. Spawns parallel research agents across the codebase, library docs (Context7), web, and installed skills, cross-questions across waves, runs a devil's advocate pass on architecture/library decisions, and synthesizes one comparative report with pros/cons + a recommendation. Does NOT implement — stops at the report. Use whenever the user types `/audit`, asks "what's the best way to...", "should I use X or Y", "how should I architect...", "audit how to add/fix/refactor X", "compare options for Y", or wants a thorough decision-support analysis before writing code. Also use proactively when the user is about to start a non-trivial feature/refactor and hasn't yet decided on an approach.
when_to_use: User invokes /audit, asks for a comparison of options, asks "best way to" do something non-trivial, debates architecture or library choice, wants tradeoffs surfaced, or is about to commit to a multi-step implementation without a clear plan.
argument-hint: <topic — feature to add, bug to fix, arch question, lib choice, ...>
allowed-tools: Task WebFetch WebSearch Read Grep Glob Skill
---

# Audit

You are running a multi-agent research audit. The goal is to spawn many specialized researchers, gather independent perspectives across codebase + library docs + web + existing skills, surface real tradeoffs, then synthesize one report that helps the user pick the best implementation path.

**Hard rule: do NOT implement anything.** Stop at the report. The user picks what to do next (`/epct`, `/oneshot`, manual work).

## Audit topic

$ARGUMENTS

If `$ARGUMENTS` is empty or vague, ask the user one clarifying question before fanning out. Don't run a fleet on a topic you don't understand — wasteful and the report will be generic.

## Phase 0 — Classify the audit

Read the topic and classify into one of:

- **feature** — "how to add X", "best way to implement Y"
- **bug** — "why does X fail / how to fix root cause"
- **arch** — structural decision: monorepo vs split, layering, boundaries, restructuring
- **lib** — library/framework/tool choice: A vs B, picking a stack
- **mixed** — touches several (most real prompts)

The kind drives the fleet roster, the cross-questioning strategy, and the report shape. Write the classification down explicitly in your scratch reasoning before spawning anything — it's the cheapest way to keep the audit focused.

## Phase 1 — Plan the fleet

Decide which research dimensions matter for THIS prompt. Don't run a fixed roster — pick what's actually load-bearing for the topic. Common dimensions and the agent type that fits:

| Dimension | When it matters | Agent |
|---|---|---|
| codebase current state | always for arch/feature/bug | `Explore` (built-in haiku, read-only). For deep whole-file reads or import-chain following, fall back to `general-purpose` with explicit Read instructions. |
| library docs / Context7 | any lib/API/framework mention | `general-purpose` with Context7 MCP + WebFetch (no dedicated docs agent — orchestrate from main) |
| web / community patterns | newer libs, recent best practices, debates | `general-purpose` with WebSearch + WebFetch tools (or call WebSearch directly from main if 1-2 searches) |
| existing skill check | always — see Phase 3 | `general-purpose` running find-skills playbook |
| precedent / git history | refactors, "we tried X before" | `Explore` with grep on `git log` |
| competing options deep-dive | lib/arch — one agent per top option | `general-purpose` with Context7 + WebFetch per option, parallel |
| installer / build tooling | when audit touches plugin shape, distribution, build scripts | `Explore` — explicitly tell it to read `cli.ts`, `bin/`, `package.json` scripts, install scripts at repo root |

Pick **4–6 dimensions for wave 1**. Each agent gets a tight brief (4–6 sentences max) naming the **exact question** that researcher must answer. No "research X generally" — be specific. Example:

> Brief for codebase agent: "Find every place in this repo where the statusline reads from the OAuth token cache. Cite file:line. Note the current cache TTL and where it's defined. Do NOT suggest improvements — just report state."

**Always check the repo root for `cli.ts`, `bin/`, `package.json` scripts, and install/build scripts** when the audit touches plugin shape, distribution, or anything structural. Past iterations of this skill missed `cli.ts` and a baseline answer caught it — don't repeat.

**Spawn all wave-1 agents in a single message in parallel.** This matters — sequential fan-out wastes wall time.

## Phase 2 — Cross-questioning strategy

After wave 1 returns, pick the strategy that fits the audit kind:

- **(a) Wave-based** (default for feature/arch) — read all wave-1 returns, write down: (1) gaps where no agent answered, (2) conflicts where two agents disagree, (3) follow-up questions that only became visible after seeing wave 1. Spawn wave 2 with focused briefs on those gaps. Cap at **2 follow-up waves**.
- **(b) Single-round** (small bug, narrow lib question) — wave 1 + synthesize. No wave 2.
- **(c) Devil's advocate** — once a leading recommendation crystallizes, spawn **one challenger agent** whose brief is: "Argue against the leading option `X`. Find its weakest assumption. Propose the strongest alternative and explain when it would beat `X`."

**Combinations by audit kind:**
- arch / lib → **always (a) + (c)**
- feature → (a), add (c) only if there's a clear forking decision
- bug → (b) usually; (a) only if root cause stays unclear after wave 1
- mixed → (a) + (c)

## Phase 3 — Skill discovery (always)

Run a quick existing-skill check. The `find-skills` playbook lives at `.agents/skills/find-skills/SKILL.md` (read it first if unsure). Spawn one agent with this brief:

> "Is there an existing installable skill that already solves `<topic>`? Run `npx skills find <terms>` with 2–3 keyword variations. Check `https://skills.sh/` leaderboard. For each candidate: install count, source reputation, install command. Treat <100 installs with skepticism. Return: name + count + source + install cmd, or 'none found'."

Surface this in the final report — even if no skill fits, it's useful info ("we checked, no existing solution, custom is justified").

## Phase 4 — Budget

Soft cap: **6 wave-1 agents, ≤2 follow-up waves, ≤15 total agents**. Scale down ruthlessly for trivial topics (a one-line bugfix doesn't need 6 agents). Scale up only when the prompt clearly demands it (a multi-system arch decision might warrant 8–10).

**Diminishing-returns check** before spawning wave 2: if wave-1 returns are already converging on the same answer, stop. Don't spawn just to look thorough.

## Phase 5 — Synthesize

Build one final report. Pick the template that fits the audit kind. These are starting shapes — adapt sections to what the research actually found. Don't keep a section that has nothing to say in it.

### Feature audit template
```
# Audit: <topic>
## Problem framing
## Existing state in codebase
(file:line citations from research agents)
## Options considered
| Option | Pros | Cons | Risk | Effort |
## Recommendation
(name the option + the 2–3 reasons it wins)
## Open questions
(things the user must decide that the audit can't)
## Concrete next steps
(numbered, actionable, names files to touch)
```

### Bug audit template
```
# Audit: <bug>
## Symptom
## Reproduction path
(file:line refs to the failing code path)
## Root-cause hypotheses (ranked by likelihood)
## Fix options
| Option | Scope | Risk | Tests needed |
## Recommendation + why
```

### Arch / lib audit template
```
# Audit: <decision>
## Context
(why this is being decided now, constraints)
## Options
| Option | Pros | Cons | Lock-in | Migration cost |
## Devil's advocate findings
(what the challenger agent surfaced about the leading option)
## Recommendation
## Decision criteria for the user
(if X matters most → option A. If Y matters most → option B.)
```

For mixed prompts, build your own structure but always keep: **problem → options compared → recommendation → next steps**.

## Phase 6 — Print and stop

Print the report directly in chat. Do NOT write it to a file unless the user asks. Do NOT implement.

End the report with this exact line:

> Audit done. To act on this: `/epct` for a planned implementation, `/oneshot` for a fast direct one, or describe what you want built.

## Rules

- **Cite or don't claim.** Every codebase claim must cite `file:line` returned by a research agent. No invented paths.
- **Every recommendation needs at least one concrete drawback.** If you can't name one, you didn't search hard enough — go spawn another agent.
- **Surface conflicts.** If two agents disagree, name the conflict in the report. Don't paper over it.
- **Tight briefs.** Each agent brief = 4–6 sentences, one clear question. Long briefs produce diffuse answers.
- **Use cheap agents for fan-out.** Prefer built-in Haiku `Explore` for codebase research. Use `general-purpose` for web search (with WebSearch + WebFetch tools), find-skills lookups, deep file reads, and Context7/WebFetch docs research. For 1-2 quick searches, call WebSearch directly from main rather than spawning an agent.
- **Speak the user's language.** If the prompt is French, write the report in French.
- **No filler.** This skill is invoked because the user wants signal. Skip recap intros. Lead with the answer.
- **One devil's advocate per audit, not per option.** More than one and you're just generating noise.

## Anti-patterns to avoid

- Spawning a research agent that just reads `package.json` — you can do that yourself with `Read`.
- Writing a brief like "research React Query" — too broad. Make it "what's the recommended cache invalidation pattern for React Query v5 with optimistic updates? Cite the official docs."
- Producing a report that recommends option A without explaining when option B would be better. Real recommendations are conditional.
- Calling `/audit` recursively from inside an audit. If a sub-question deserves its own audit, note it in "Open questions" and stop.
- Implementing anything. This skill stops at the report.
