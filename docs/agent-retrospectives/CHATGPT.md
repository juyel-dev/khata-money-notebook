# ChatGPT Retrospective

> Process memory from my work on Khata. This is an agent retrospective, not a product specification and not a substitute for current code/tests.

## Scope of this note

This record captures what I learned while acting as the technical lead across the Khata work described in this repository and chat session: architecture decisions, implementation/review habits, collaboration with Claude/OpenCode, mistakes I made or helped expose, and the contribution I actually made.

It intentionally does **not** reproduce hidden chain-of-thought. It records durable engineering lessons and observable decisions.

## What I learned about Khata

Khata looks small at the UI surface but has unusually strong correctness requirements because it stores money records and promises local-first behavior.

The central product lesson was to keep the user model simple while allowing the engineering model to be rigorous:

```text
simple user action
      ↓
local durable write
      ↓
optional cloud durability
      ↓
deterministic recovery/conflict behavior
```

The important product boundary is also unusually easy to violate accidentally. `দিলাম` / `নিলাম` are transaction facts; Khata should not silently become a debt-management or accounting-dashboard product.

A second important lesson was that the information architecture is itself a correctness constraint: Khata detail is **Transactions-first**, while Individuals are derived from transaction facts. Reintroducing a person-first flow would not be a harmless UI variation; it would change the intended product model.

## What I contributed

My main contribution was not a single feature. It was establishing and repeatedly enforcing a system-level engineering approach around the existing implementation.

### Architecture and product direction

I helped stabilize these decisions:

- Dexie/IndexedDB remains the local operational source of truth.
- Firebase Authentication + Firestore are additive cloud infrastructure.
- Google sign-in is optional for ordinary local use but required for cloud linking/sharing.
- First-account linking is an explicit reconciliation boundary, not just a login event.
- Sync is entity-based and durable, with queue state, logical versions, tombstones and journal/cursor handling.
- Share links are read-only snapshots, not collaboration.
- Mobile/standalone Google auth uses redirect; ordinary desktop web uses popup.

### Engineering review discipline

I became much stricter about repository-wide impact rather than reviewing a changed function in isolation.

The durable review protocol now used in this project is:

1. Read every diff hunk and ask what breaks if it is wrong.
2. For every changed signature/export/alias, search every caller and test.
3. For every behavior/order change, search all tests for the old semantic assertion.
4. Remove unrelated formatting, stale imports and history noise before PR.

This protocol was shaped by real misses in the project rather than generic style advice.

### Documentation rebuild

The largest documentation contribution was the post-R15 repository context rebuild. I studied the current code instead of trusting the older Phase-1 documents and rewrote the documentation around the actual Next.js 16/React 19/Dexie/Firebase implementation.

The agent-facing documentation now has explicit onboarding, invariants, sync architecture, production runbook and documentation index layers. It also records superseded technologies so future agents do not accidentally revive old Next 14/next-intl/Supabase/Serwist assumptions.

## Mistakes and lessons from my own work

### 1. Old documentation was allowed to remain too authoritative for too long

The repository had documentation that described obsolete architecture such as Next 14, next-intl, Supabase and Serwist even after the implementation had moved elsewhere.

Lesson:

> Documentation drift is an engineering bug when coding agents consume the docs as instructions.

The fix was to establish a source-of-truth hierarchy and a canonical `AI-CONTEXT.md` rather than asking every future agent to reconcile contradictions from scratch.

### 2. I sometimes trusted local context more than full call-site evidence

During earlier sync rounds, implementation changes exposed the danger of changing a function signature/export/order rule without checking every consumer. Examples included missed caller arity and stale test expectations.

Lesson:

> A correct definition with an incomplete caller audit is still an incorrect repository change.

That is why the explicit Loop-2 call-site search and Loop-3 test-semantics search became mandatory.

### 3. Verification claims need hard boundaries

I cannot run the project's browser/device/production environment from my own tool boundary. I therefore learned to separate:

```text
code reasoning / repository inspection
              ≠
local runtime verification
              ≠
production human verification
```

I should never call a test suite, build, browser smoke test or production OAuth flow green unless that evidence actually exists.

### 4. Documentation can accidentally become a second source of truth

Adding more docs creates a new failure mode: two documents can disagree about the same behavior.

Lesson:

- invariants should be few and explicit
- focused docs should describe implementation details
- retrospective docs should be process memory only
- current code/tests outrank narrative documentation

That is why the new retrospective area is explicitly lower priority than runtime code and engineering invariants.

### 5. History hygiene matters even for “small” documentation work

Agent-assisted work can easily produce a chain of tiny add/remove commits that obscures the actual change.

Lesson:

> The final PR should present a coherent implementation unit, not a transcript of the agent's editing process.

For documentation work, a single meaningful commit before PR is preferable to dummy commits or accidental churn.

## Collaboration with OpenCode

OpenCode has been valuable as the runtime-validation and implementation counterpart because it can operate in the development environment where tests, lint, TypeScript checks, builds and browser smoke are available.

The useful division of labor became:

```text
ChatGPT
  → architecture / reasoning / audit / diff review / repo changes

OpenCode
  → runtime verification / browser-device checks / local environment evidence

User
  → production credentials / Firebase console / real devices / final merge decisions
```

The collaboration works best when OpenCode is given a **validation-only** role after the engineering change is already reasoned through, rather than being asked to “fix whatever fails” without a constrained review boundary.

A second lesson is that OpenCode output is evidence, not authority by itself. Its results still need to be mapped back to the intended invariant and the actual diff.

## Collaboration with Claude

Claude is another implementation-capable agent working against the same repository. The important lesson from this multi-agent setup is that shared repo state is stronger than chat-local memory.

Because Claude, OpenCode and I can each hold different conversational context, durable docs should carry the current architecture and process rules. Agent-specific retrospectives can then preserve what each agent learned without pretending that one agent's memory is universal truth.

The useful pattern is:

```text
shared repository
    ↓
canonical docs + code/tests
    ↓
agents work independently
    ↓
PR/diff becomes the handoff artifact
    ↓
next agent re-reads current repo truth
```

This reduces the risk of “I remember we decided X” becoming a reason to implement X when the repository has already moved on.

## Why the agent-retrospective folder exists

This folder solves a different problem from the normal engineering docs.

`AI-CONTEXT.md` answers:

> “How should an agent understand the repository now?”

`ENGINEERING-INVARIANTS.md` answers:

> “What must not be broken?”

This retrospective answers:

> “What did this agent learn while working here, including process failures that are easy to repeat?”

That distinction should remain permanent.

## Lessons I would carry into the next milestone

### Preserve

- Read current code before trusting old docs.
- Treat money, offline writes, deletes and cloud reconciliation as correctness-sensitive.
- Search all callers/tests before changing cross-module contracts.
- Separate local correctness from cloud/network correctness.
- Treat production Google OAuth and real-device behavior as human verification gates.
- Keep sharing read-only and snapshot-based until an explicit product decision changes it.
- Prefer one strong invariant over many vague recommendations.

### Avoid

- speculative features because the architecture could support them
- reviving historical technologies from stale documentation
- broad Firestore permission changes as a quick fix
- claiming runtime verification without evidence
- using a retrospective as a source of product truth
- noisy commit history that records the agent's editing mistakes instead of the final change

## Current self-assessment

My strongest contribution on this project is **system coherence**: connecting product intent, data safety, sync semantics, security boundaries, agent workflow and documentation so they reinforce each other.

My main recurring risk is **over-trusting assumptions that feel consistent with previous context**. The corrective habit is repository-wide evidence: current code, current tests, current diff, current callers, current deployment state.

That is the standard I should continue to use on every future Khata milestone.
