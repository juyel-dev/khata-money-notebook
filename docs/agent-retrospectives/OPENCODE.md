# OpenCode Retrospective

> Process memory from my work on Khata. This is an agent retrospective, not a product specification and not a substitute for current code/tests. I write only my own first-person account here.

## Scope of this note

This record captures what I learned as the runtime-validation and implementation counterpart on `juyel-dev/khata-money-notebook`: PR validation, test/lint/type/build/browser evidence, branch hygiene, and the mistakes I made or helped expose. It intentionally does **not** reproduce hidden chain-of-thought.

## What I did

### PR validation loop (PRs #6–#25)

My standard loop per PR branch was: checkout → full diff review → `npm test` → lint → `tsc` → build → focused tests → browser smoke → exact report back, with no code changes when the role was validation-only. The suite grew from 48/48 (PR #5 era) to 116/116 (PR #25) with every merge kept green, including a post-merge test run on `main` each time.

Concrete cases from the session transcript:

- PR #17 needed exactly one test-only fix (a one-line `as unknown as` cast, committed as `f5196d9`) — nothing more.
- PR #25 needed zero fixes: the user's DOM `matchMedia` mock-typing fix was correct and complete, so I reported green (116/116, lint clean, `tsc` 0 errors, build success, browser smoke clean with Settings rendering and zero console messages) without touching code.

### Branch hygiene

Deleted exactly 50 remote branches in one pass, keeping only `main` plus `r14-working` per the CTO's instruction — list-driven, nothing outside the list.

### Session recovery and hygiene PRs

When the long-running `Khata MONEY WEB DEVELOPMENT` session became unusable (details below), I diagnosed the provider error from the session database, recovered the full work state from the auto-compaction summary, and continued in a fresh session: PR #27 removed the four accidental retrospective artifacts (`BRANCH-TEST.txt`, `TAKEOVER.md`, `FINAL-NOTE.md`, `.keep`) in one clean docs-only commit, verified mergeable, and merged.

## Mistakes and lessons from my own work

### 1. Docs commits landed directly on main

While constructing `docs/agent-retrospectives/`, intermediate commits (`baa26bb`, `d1127ee`) and a probe file (`BRANCH-TEST.txt` via `8292f4b temp`) were pushed straight to `main` instead of going through branch → PR → review. That is precisely the hygiene damage PR #27 had to clean up.

Lesson:

> Documentation work follows the same branch → PR workflow as product code. No temp/probe files on `main`, ever — regardless of how small the file feels.

### 2. Switching models mid-session broke the session permanently

The old session mixed `muse-spark-1.2` and `muse-spark-1.3` with the `xhigh` reasoning variant. The next request failed permanently with `reasoning encrypted_content was not issued to this caller`: reasoning blocks encrypted under one model/gateway routing cannot be replayed under another, and no retry can fix the stored transcript.

Lesson:

> Pick one model + variant per session and stay on it. If a switch is genuinely needed, compact first or start fresh — and trust the compaction summary plus current repo truth to recover, which is exactly what worked here.

### 3. I planned around a tool that was not available

I once attempted a `chrome-devtools_navigate_page` call when the chrome-devtools MCP was not enabled, producing an invalid-tool error mid-task.

Lesson:

> Verify tool availability from the actual tool list before building a plan on it. When browser MCP is off, say so and validate through available means instead of reaching for missing tools.

### 4. Keep the workdir clean

The worktree carried untracked root-level leftovers (`AGENTS.md`, `CLAUDE.md`) unrelated to any commit. They were harmless but noisy.

Lesson:

> Check `git status` before and after every task. Untracked files that are not part of the change should be explained or removed, not silently carried along.

## Collaboration pattern that worked

```text
ChatGPT
  → architecture / reasoning / audit / diff review

OpenCode (me)
  → checkout + diff re-read + tests/lint/tsc/build/browser evidence

User
  → production credentials / Firebase console / real devices / merge decisions
```

Two rules made this work:

1. **Validation-only means validation-only.** Report exact numbers (tests, lint, `tsc`, build, browser observations) and change nothing. When something is not run, list it under UNVALIDATED explicitly.
2. **Evidence is not authority by itself.** A green suite supports the invariant the CTO reasoned about; it never replaces call-site and test-semantics review of the actual diff.

## What I would preserve and avoid

### Preserve

- Full loop per PR: diff review first, then tests/lint/tsc/build, then browser smoke, then exact report.
- Post-merge verification on `main`, not just on the PR branch.
- List-driven destructive operations (branch deletes): exact list, nothing outside it.
- One clean commit per docs/hygiene change; PR body with Summary / Files / Cleanup / UNVALIDATED / History-hygiene.
- Shared repo as memory; the PR diff as the handoff artifact.

### Avoid

- Direct-to-`main` commits for "trivial" docs or probe files.
- Mid-session model/variant switches with reasoning-heavy variants.
- Claiming any validation (tests, build, browser, production) without the actual evidence in hand.
- Writing in another agent's retrospective file — each file has exactly one owner.
