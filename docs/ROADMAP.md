# Roadmap

> Milestone history and remaining gates. Completed work is historical context; do not treat it as an active implementation task.

## Phase 0 — Foundation ✅

- Next.js app shell
- TypeScript/Tailwind foundation
- Dexie local database
- PWA foundation
- core design language

## Phase 1 — Core ledger ✅

- multiple notebooks
- notebook management
- transaction add/edit/delete
- person history
- combined history
- Bengali-first UI
- offline local persistence

## Phase 2 — Backup, product polish and navigation ✅

- versioned JSON backup/restore
- notebook pin/group support
- home banner system
- theme/settings surfaces
- current Khata transaction-first `Transactions` / `Individuals` information architecture
- empty/loading/error polish

Bengali native-speaker review remains a product-quality/human gate where applicable.

## Phase 3 — Firebase cloud foundation ✅ through R15.4A

### R1–R5 — Identity, schema and deterministic sync foundation ✅

- Firebase Authentication with Google
- Firestore owner namespace and security rules
- entity-level mutation queue
- tombstones
- deterministic logical conflict ordering
- clock-skew-safe semantics

### R6 — First-account linking architecture ✅

- persistent account-link state
- explicit local/cloud reconciliation planner
- no silent overwrite

### R7 — Sync UX/reliability foundation ✅

- status/recovery semantics
- account-aware sync state

### R8–R10 — Local capture and Firestore transport ✅

- local mutation capture
- logical version metadata
- Firestore journal transport/cursoring

### R11 — End-to-end sync orchestrator ✅

- push local mutations
- pull journal pages
- apply remote winners without re-capture
- safe cursor advancement

### R12 — Automatic sync + status UX ✅

- startup/foreground/online/interval sync
- settings status
- manual recovery

### R13 — First-account linking + reconciliation UX ✅

- local/cloud presence inspection
- explicit reconciliation
- version/tombstone-safe migration

### R14 — Sharing snapshots ✅

- Khata/individual read-only snapshots
- Google-authenticated owner
- anonymous token viewer
- revoke
- private owner share references

### R15.1 — Corrupt journal quarantine/recovery ✅

- durable quarantine for malformed journal rows
- safe cursor handling around corruption

### R15.2 — Retry/backoff + poison-mutation handling ✅

- durable retry schedule
- bounded automatic retries
- failed-mutation isolation
- manual retry recovery

### R15.3 — Firestore merge semantics + field-retention review ✅

- canonical entity merge policy reviewed
- journal replacement semantics documented
- schema-evolution rule documented

### R15.4A — Mobile-safe Google authentication ✅

- popup on ordinary desktop web
- redirect on mobile/standalone PWA
- regression coverage for routing

## Remaining production gates

### R15.4B / Human production verification — pending

Not a code milestone yet. Requires the real Firebase project, Google account and devices.

Required evidence:

```text
Google login/session persistence
account linking + reconciliation
online/offline sync
cross-device sync
whole-Khata sharing
individual sharing
anonymous viewer access
revoke behavior
mobile + standalone PWA auth
```

### R15.5 — Operational sync observability/recovery UX — pending

Engineering work to make sync failures, queued mutations, retries, quarantine and recovery more inspectable and actionable in the product.

Start this only after the production human dry-run has supplied real failure/UX observations.

### Final production audit — pending

Whole-repository review covering:

- auth/session behavior
- Firestore rules and data boundaries
- sync correctness/recovery
- sharing security
- backup/restore safety
- PWA/offline reliability
- Bengali/UX correctness
- deployment/config hygiene

### Release hygiene — pending

- final docs/status alignment
- environment/config verification
- dependency/lockfile hygiene when dependencies change
- branch cleanup
- final reproducible verification record

## Explicitly out of scope

Unless separately proposed and approved, do not add:

- charts/KPIs
- budgeting/savings goals
- multi-currency
- recurring transactions
- live collaboration/editing
- debt-management workflows
- unrelated Firebase products
