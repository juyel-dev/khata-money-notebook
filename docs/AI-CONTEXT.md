# AI Agent Context

> Canonical onboarding document for coding agents. Read this before modifying code.

## Mission

Khata is a Bengali-first, offline-first PWA that replaces a paper/Notes-app money notebook with a fast digital ledger. The product is intentionally small. The engineering is allowed to be sophisticated; the user experience is not.

The app records who the user gave money to or took money from, when, how much, and an optional note. It is **not** a debt-management product, accounting suite, budgeting app, collaboration tool, or finance dashboard.

## Source of truth hierarchy

When documentation disagrees with implementation, use this order:

1. Current runtime code and tests on `main`.
2. `docs/ENGINEERING-INVARIANTS.md` for non-negotiable product and data contracts.
3. `docs/SYNC-ARCHITECTURE.md` for cloud/sync behavior.
4. `docs/PRODUCTION-RUNBOOK.md` for deployed infrastructure and human verification.
5. Other focused docs for screen/design/topic detail.
6. Historical roadmap text only when explicitly labeled historical.

Never revive a superseded architecture from an old document merely because it is still present in a stale paragraph.

## Current baseline

Current main baseline for this documentation refresh:

```text
80bc6224bc56011affd502919eec967e0690c634
```

Current stack from `package.json`:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Dexie 4 + IndexedDB
- Firebase Auth + Firestore
- Zustand for ephemeral UI state
- Framer Motion
- lucide-react
- Vitest
- hand-rolled `lib/i18n` context/messages
- custom service-worker/PWA setup

Do not describe the project as Next 14, next-intl, Supabase, or Serwist unless a future code change actually introduces them.

## Runtime architecture

```text
UI / App Router
      ↓
feature/domain helpers
      ↓
Dexie local DB + local mutation capture
      ↓
sync queue / sync engine
      ↓
Firebase Auth identity + Firestore durable replica

Sharing is a separate read-only snapshot boundary:
owner + linked account
      ↓
sync latest state
      ↓
create immutable /shares/{token} snapshot
      ↓
public anonymous viewer
```

Dexie remains the local operational data layer. Cloud is additive and opt-in. Signed-out local use must continue working.

## Current information architecture

```text
HOME
  ↓
KHATA DETAILS
  ├── TRANSACTIONS  ← default
  └── INDIVIDUALS
        ↓
      PERSON DETAIL

HOME / HISTORY / SETTINGS

KHATA DETAILS → kebab → SHARE
  ├── Whole Khata snapshot
  └── One Individual snapshot
```

The Khata detail screen is transaction-first. Individuals are derived from transactions; they are not a separate source of truth.

## Product-language invariants

Preferred user-facing concepts:

- `দিলাম` / `নিলাম`
- `দিয়েছি` / `নিয়েছি` when grammar requires a summary phrase

Do not introduce debt/obligation terminology such as `পাবো`, `দেবো`, owed, debt, payable, receivable, settlement, or net-debt workflows.

Do not introduce currency words/symbols into UI copy merely to restate the currency model when the existing formatter already handles amounts.

## Data model

Primary local entities:

- `Notebook`
- `NotebookGroup`
- `Person`
- `Transaction`
- `Settings`

Amounts are integer paise. Balance is derived from transactions; do not add a second cached balance without an explicit architecture decision.

Current notebook supports optional `pinned` and `groupId` fields.

People are scoped to a notebook. Transactions carry both `notebookId` and `personId`; those references must agree.

See `docs/DATA-MODEL.md` and `docs/ENGINEERING-INVARIANTS.md`.

## Cloud model

Private owner data:

```text
/users/{uid}/notebooks/{notebookId}
/users/{uid}/groups/{groupId}
/users/{uid}/people/{personId}
/users/{uid}/transactions/{transactionId}
```

Public sharing:

```text
/shares/{token}
/shares/{token}/notebooks/{documentId}
/shares/{token}/people/{documentId}
/shares/{token}/transactions/{documentId}
```

The share token is the public authority. Public `/shares` listing is intentionally disabled.

## Sync invariants

- Local writes succeed offline.
- Mutations are durable in the local sync DB.
- Entity identity is stable across local/cloud.
- Deletes use tombstones; old writes cannot resurrect newer deletes.
- Conflict ordering uses deterministic logical version ordering, not wall-clock alone.
- Automatic retries obey durable backoff; manual retry may force failed work back to pending.
- One failed/poison mutation must not block later mutations.
- Remote application must not re-capture as a fresh local mutation.
- Cursor advancement occurs only after the relevant journal page has been safely applied.
- First account linking never silently chooses local or cloud data when both sides are non-empty.

See `docs/SYNC-ARCHITECTURE.md`.

## Sharing invariants

- Owner must have a linked Google/Firebase account.
- Share creation performs a normal sync first.
- A share is a static snapshot, not a live view.
- Snapshot root is created inactive; child payload is written; root is activated last.
- Viewer does not need authentication.
- Viewer can only read active, unexpired shares by exact token.
- Individual share contains exactly one person and that person's transactions.
- Revocation changes `active` to false rather than deleting public payloads.

See `docs/SHARING.md`.

## Backup invariants

Backup format is the versioned `khata-backup` envelope. Current supported version is 2 and includes notebooks, groups, people, and transactions. UI state and sync metadata are not part of the portable backup.

Restore is replacement semantics inside one Dexie transaction after validation; it is not a blind merge.

## Agent change protocol

Before changing code:

1. Locate the real implementation and its tests.
2. Read all relevant callers, not just the definition being changed.
3. Identify behavior contracts from `docs/ENGINEERING-INVARIANTS.md`.
4. Search all tests for old semantics when changing ordering, signatures, or exports.
5. Make the smallest coherent change.
6. Re-read every changed hunk and ask what would break if it is wrong.
7. Report exactly what could not be run when runtime verification is unavailable.

Do not use docs-only work as a reason to hide a runtime change.

## Explicit non-goals

Do not introduce without a separately approved product decision:

- dashboards/charts/KPIs
- budgeting or savings goals
- recurring transactions
- multi-currency
- live collaboration/editing
- debt-management workflows
- server-side application database replacing Dexie
- unnecessary Firebase services

## Key files

```text
lib/db/schema.ts                  local entity schema
lib/db/backup.ts                 versioned backup format/validation
lib/firebase/auth.ts             Google auth routing
lib/firebase/accountLink.ts      persistent cloud-account binding
lib/firebase/reconciliationFlow.ts first-link reconciliation
lib/firebase/syncQueue.ts        durable mutation queue/retry state
lib/firebase/syncEngine.ts       push/pull/apply orchestration
lib/firebase/firestoreSync.ts   Firestore transport/write semantics
lib/firebase/syncTypes.ts        version/order contracts
lib/firebase/syncStatus.ts       user-facing sync state
lib/firebase/sharing.ts          snapshot creation/revocation/public read
firestore.rules                  Firestore authorization boundary
components/sync/SyncProvider.tsx automatic/manual sync orchestration
```
