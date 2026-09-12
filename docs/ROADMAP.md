# Roadmap

Phased so an implementer (human or coding agent) always has a shippable, testable milestone rather than one giant build.

## Phase 0 — Foundation
- Next.js + TypeScript + Tailwind project scaffold
- Design tokens, Dexie schema, app shell, PWA foundation

**Done when:** the app is installable as a PWA and the local foundation is stable.

## Phase 1 — Core ledger
- Home notebook list and notebook management
- Notebook detail, balance, transactions and individuals
- Transaction add/edit/delete with undo
- Person detail and combined History
- Bengali-first user experience

**Done when:** the target user can replace the Notes-app + calculator workflow with Khata, in Bengali and offline.

## Phase 2 — Backup, polish, i18n
- JSON export/import
- Dark mode
- Bengali review/completeness pass
- Home banner carousel and PWA install/update polish
- Empty/loading/error states and motion polish

**Done when:** the app feels complete and trustworthy for daily use.

## Phase 3 — Firebase cloud foundation
The cloud layer is additive and opt-in. Dexie remains the local operational source of truth.

### R1–R5 — Identity, schema and deterministic conflict foundation
- Firebase Authentication with Google
- Firestore user-owned cloud model and security rules
- Entity-level mutation queue and tombstones
- Lamport logical ordering and deterministic conflict resolution
- Clock-skew-safe ordering semantics

### R6 — First-account linking architecture
- Persistent local account-link state
- Explicit local/cloud reconciliation planner
- No silent overwrite during first linking

### R7 — Sync UX/reliability foundation
- Recovery/reset semantics and sync-state foundations

### R8–R10 — Local capture and Firestore transport
- Mutation capture for local CRUD
- Logical version metadata
- Firestore journal transport and cursoring

### R11 — End-to-end sync orchestrator ✅
- Push local mutations
- Pull remote journal pages
- Apply winning remote state without re-capture
- Persist cursor only after safe page application

### R12 — Automatic sync + status UX ✅
- Sync on linked-account startup, foreground, online return and interval
- Settings sync status
- Manual retry/recovery

### R13 — First-account linking + reconciliation UX ✅
- Inspect local and cloud dataset presence
- Empty/empty direct link
- Explicit local-vs-cloud reconciliation choice when data exists
- Version-aware migration and tombstone-safe linking

### R14 — Sharing snapshots ✅
- Khata-level or individual read-only share snapshots
- Google-authenticated owner creates/revokes links
- Viewer access without login
- Token-scoped Firestore security rules
- Private owner share references for active-link management

### R15 — Sync production hardening
#### R15.1 — Corrupt journal quarantine/recovery policy ✅
- Durable local quarantine for malformed journal rows
- Safe cursor advancement when `receivedOrder` is trustworthy
- Cursor hold when ordering metadata is corrupt
- Explicit separation of corrupt-data handling from transient transport retry

#### R15.2 — Retry/backoff + poison-mutation handling 🚧
- Durable exponential retry scheduling
- Automatic retries only after the backoff window
- Failed mutation isolation so one poison mutation does not block later mutations
- Auto-retry cutoff with explicit manual recovery still available

#### Remaining R15 work
- Firestore `merge:true` field-retention review
- Production Google OAuth/session verification
- Operational sync observability and recovery UX

**Cloud phase done when:** a user can opt into Google/Firebase, safely connect existing local data, use the same Khata across devices, and continue using the app fully offline without data loss or silent overwrites.

## Explicitly not on this roadmap

Anything from the "Explicit non-goals" list in PLANNING.md (charts, budgeting, multi-currency, recurring transactions, collaborative editing/debt-management workflows) stays out unless a future phase is deliberately proposed and scoped with the same rigor as the phases above.
