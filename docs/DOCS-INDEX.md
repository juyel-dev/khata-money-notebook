# Documentation Index

> Navigation for coding agents. Start here, then open only the docs relevant to the task.

## Start here

1. `AI-CONTEXT.md` — canonical repository onboarding, source-of-truth hierarchy, architecture map and change protocol.
2. `ENGINEERING-INVARIANTS.md` — non-negotiable product/data/sync/auth/sharing contracts.
3. `ARCHITECTURE.md` — runtime stack and module boundaries.

## Data and persistence

- `DATA-MODEL.md` — local entities, indexes, backup envelope and derived values.
- `SYNC-ARCHITECTURE.md` — local/cloud synchronization, version ordering, queue, journal, reconciliation and recovery.
- `SYNC-MERGE.md` — Firestore merge/replacement semantics and schema-evolution rule.

## Firebase / cloud

- `FIRESTORE-ARCHITECTURE.md` — cloud paths, ownership, transport boundaries and security model.
- `FIREBASE-SETUP.md` — Firebase project/service/env requirements.
- `ACCOUNT-LINKING.md` — first Google account link and local/cloud reconciliation.
- `SHARING.md` — immutable read-only snapshot sharing, token boundary, publication and revoke semantics.
- `PRODUCTION-RUNBOOK.md` — Firebase/Vercel production setup plus human end-to-end verification.

## Product/UI contracts

- `PLANNING.md` — product mission, principles and explicit non-goals.
- `SCREENS.md` — current screen-level behavior and states.
- `NAVIGATION.md` — routes and primary navigation structure.
- `DESIGN-SYSTEM.md` — visual language, spacing, type, color and motion.
- `I18N.md` — language architecture and copy constraints.
- `PWA.md` — offline/install/service-worker behavior.

## Planning/status

- `ROADMAP.md` — current milestone history and remaining gates. Treat completed milestones as history, not active tasks.

## Multi-agent process memory

- `agent-retrospectives/README.md` — purpose and ownership model.
- `agent-retrospectives/CHATGPT.md` — ChatGPT's first-person engineering/process retrospective.
- `agent-retrospectives/CLAUDE.md` — reserved for Claude's own retrospective.
- `agent-retrospectives/OPENCODE.md` — reserved for OpenCode's own retrospective.
- `agent-retrospectives/PROCESS.md` — rules for keeping agent retrospectives separate from product truth.
- `agent-retrospectives/AGENT-TAKEOVER-CHECKLIST.md` — takeover checklist for a new agent entering the project.
- `agent-retrospectives/FINAL-NOTE.md` — scope reminder for this process-memory area.
- `agent-retrospectives/TAKEOVER.md` — compact takeover reminder.
- `agent-retrospectives/HANDOFF-PROTOCOL.md` — multi-agent handoff protocol.
- `agent-retrospectives/CHATGPT-NEXT.md` — next-cycle discipline note.
- `agent-retrospectives/BRANCH-TEST.txt` — temporary marker; should be removed in history cleanup.

These retrospective files are process memory only. They never outrank current implementation, tests, or engineering invariants.

## Documentation rules for agents

- Docs are implementation guidance, not permission to invent new product behavior.
- A stale statement is corrected instead of followed when current code disagrees.
- Runtime code/tests outrank narrative docs.
- When an architecture change is approved, update the focused architecture/invariant docs in the same change so future agents do not learn the obsolete model.
- Never add credentials, API keys, tokens or private configuration values to documentation.
- Agent-specific retrospectives must be written by the agent whose name owns the file; do not impersonate another agent's first-person account.
