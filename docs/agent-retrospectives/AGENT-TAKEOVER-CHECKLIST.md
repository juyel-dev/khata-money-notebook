# Agent Takeover Checklist

Use this before taking over a Khata task from another AI agent.

```text
1. Read docs/AI-CONTEXT.md
2. Read docs/ENGINEERING-INVARIANTS.md
3. Read the focused topic docs named by the task
4. Inspect current code on the target branch
5. Inspect associated tests
6. Identify current branch/head and recent PR history
7. Search all call sites before changing signatures/exports/routes
8. Search tests for old semantics before changing behavior/order
9. Make the smallest coherent change
10. Re-read the full diff
11. Verify with available runtime tooling
12. Record unvalidated areas explicitly
13. Keep agent retrospective notes separate from product/architecture docs
```

For multi-agent handoff, the repository is the shared memory. Do not rely on a previous chat summary when current code/tests can answer the question.
