# Agent Retrospectives

This directory stores durable engineering retrospectives written by the different AI agents that work on Khata.

These files are **agent-owned notes, not product specifications**. They record what an agent learned from the repository, where collaboration failed or became fragile, what the agent contributed, and what future agents should do differently.

## Ownership

```text
CHATGPT.md   → ChatGPT / OpenAI coding-agent retrospective
CLAUDE.md    → Claude retrospective
OPENCODE.md  → OpenCode retrospective
```

Each agent should write only its own retrospective in its own file. Do not rewrite another agent's first-person account as though you were that agent.

## How to use these files

Read them when you need to understand the **working history of the multi-agent engineering process**, especially before taking over a long-running task.

They do not outrank implementation or the canonical engineering contracts:

```text
runtime code + tests
        ↓
docs/ENGINEERING-INVARIANTS.md
        ↓
docs/AI-CONTEXT.md / focused technical docs
        ↓
docs/agent-retrospectives/*   ← process memory only
```

A retrospective must never be used as permission to revive an obsolete implementation or product decision.

## Writing standard

Each retrospective should capture:

- repo-specific lessons, not generic AI advice
- concrete mistakes and their impact
- useful collaboration patterns
- the agent's actual contribution, without inflating it
- verification limitations and how they were handled
- decisions that future agents should preserve
- process improvements for the next engineering cycle

Keep sensitive credentials, tokens, personal secrets, and hidden chain-of-thought out of these files.
