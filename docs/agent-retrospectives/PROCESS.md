# Multi-Agent Retrospective Process

> Coordination contract for the agent-owned retrospective files in this directory.

## Ownership

Each agent writes only its own first-person retrospective:

```text
ChatGPT  → CHATGPT.md
Claude   → CLAUDE.md
OpenCode → OPENCODE.md
```

Do not synthesize another agent's experience and store it under that agent's name.

## What belongs here

Record durable process memory that is easy to lose between chat contexts:

- repository-specific lessons
- mistakes and their consequences
- collaboration patterns
- verification limitations
- actual contributions
- handoff advice for future agents

Do not turn this into a second roadmap or architecture specification.

## What does not belong here

Never store:

- credentials or tokens
- private user secrets
- service-account keys
- hidden chain-of-thought
- unverified claims presented as facts
- product decisions that exist only in a retrospective

## Authority

Retrospectives are lower-priority process memory:

```text
current code/tests
    ↓
engineering invariants
    ↓
canonical/focused docs
    ↓
agent retrospectives
```

When a retrospective conflicts with current implementation, keep the historical lesson but follow current repository truth.

## Update timing

An agent should update its retrospective after a meaningful milestone, especially after discovering a repeated failure mode or a collaboration lesson worth preserving.

The file should remain concise enough to be useful during agent onboarding. Prefer concrete examples from this repository over generic advice.
