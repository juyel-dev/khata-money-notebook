# Engineering Invariants

> Hard contracts for coding agents. A feature is incomplete if it violates one of these silently.

## Product boundary

Khata is a personal money notebook. The core facts are `gave` (money out) and `got` (money in), attached to a person, notebook, time, amount, and optional note.

Never turn these facts into a debt-management workflow. Do not add settlement, payable/receivable, owed, debt, budgeting, category analytics, or collaboration semantics without an explicit product decision.

## Local-first contract

Dexie/IndexedDB is the local operational database. Core screens and writes must remain usable while signed out and offline.

A local mutation must not wait for network access. Cloud sync is an asynchronous durability layer.

Zustand is for transient UI/session state; persistent ledger facts belong in Dexie.

## Entity contract

```text
Notebook
- id
- name
- openingBalance (integer paise)
- createdAt
- updatedAt
- archived
- color
- icon
- pinned? 
- groupId?

NotebookGroup
- id
- name
- createdAt

Person
- id
- notebookId
- name
- phone?
- createdAt

Transaction
- id
- notebookId
- personId
- type: gave | got
- amount (integer paise)
- note?
- occurredAt
- createdAt
```

People are notebook-scoped. Transactions and people must point at the same notebook.

Amounts are non-negative, finite, safe integer paise. Do not store floating-point currency values.

## Balance contract

Balance is derived:

```text
currentBalance = openingBalance
  + sum(got)
  - sum(gave)
```

Do not maintain a second independent running balance unless an explicit design adds a proven reconciliation mechanism.

## Transaction-first Khata detail

Khata detail opens on `Transactions`, not `Individuals`.

`Individuals` are derived from transaction facts. A person card is not an independent accounting aggregate.

Individual cards must not introduce `মোট দিলাম` / `মোট নিলাম` style totals as the primary card purpose.

Person detail is scoped to that person's transaction history.

## Versioning and sync

Every cloud mutation has a deterministic logical version containing at least:

```text
sequence + deviceId + changedAt
```

Comparison must remain deterministic. Wall-clock `changedAt` is not a sufficient standalone conflict clock.

Remote application must not feed back into the local mutation capture path as a new user mutation.

Delete semantics use tombstones. A newer tombstone wins over an older upsert and prevents resurrection.

## Sync queue contract

Queue status includes pending/syncing/failed lifecycle.

Automatic retries respect `nextRetryAt` and a bounded retry policy. Manual retry is an explicit recovery action and may bypass the automatic delay.

One poisoned mutation must not hold all later mutations hostage.

Stale `syncing` work can be reset to pending after a process interruption.

## Journal/cursor contract

The Firestore mutation journal is an immutable mutation record keyed by mutation id.

Journal order/cursor metadata is transport state, not business conflict ordering.

Advance a pull cursor only after the corresponding page is validated and applied safely.

Corrupt ordering metadata must not cause unsafe cursor advancement. Corrupt journal rows are quarantined by the R15.1 policy rather than treated as ordinary transient network failures.

## Firestore write contract

Canonical entity upserts intentionally use `merge: true` for forward-compatible entity fields.

This creates one schema-evolution rule:

> Omitting a field from a merged canonical entity does not delete the old field.

Therefore field removal or rename requires an explicit migration/write strategy.

Journal records use replacement semantics. Tombstones remain authoritative for deletes.

## First-account linking contract

A user can continue using local data while signed out.

First link is explicit and stateful. Never silently replace local data with cloud data or vice versa.

Decision matrix:

| Local | Cloud | Rule |
|---|---|---|
| empty | empty | link-only |
| non-empty | empty | explicit preserve-local decision |
| empty | non-empty | explicit preserve-cloud decision |
| non-empty | non-empty | explicit reconciliation; no automatic winner |

Switching to a different UID requires reconciliation before the new link completes.

Signing out never deletes local ledger data.

## Sharing contract

Sharing is read-only and snapshot-based.

Owner must be signed in with a linked Google/Firebase identity.

Share creation syncs first, then snapshots local ledger state.

Publication sequence:

```text
inactive share root + owner ref
        ↓
child snapshot documents
        ↓
activate root + owner ref
```

A viewer needs no Firebase account. Viewer reads are authorized only by an active, unexpired share token.

Public collection listing is forbidden.

Individual shares may contain exactly one person and only that person's transactions.

Revocation uses `active=false`; deleting payloads is not the security boundary.

## Backup contract

Portable backup is a versioned envelope:

```text
format: khata-backup
version: 2
exportedAt: epoch ms
data:
  notebooks[]
  groups[]
  people[]
  transactions[]
```

Validation happens before mutation. Restore replaces the ledger inside one Dexie transaction and can roll back on failure.

Sync metadata, account-link state, UI state, and Firebase credentials are not portable backup data.

## Authentication contract

Google provider uses `select_account`.

Desktop web uses popup auth. Mobile browsers and standalone PWAs use redirect auth because popup behavior is less reliable there.

Auth initialization must fail soft when Firebase configuration is absent: local app surfaces must not crash merely because cloud env is missing.

## Security contract

Private cloud data is namespaced by Firebase UID and owner-only.

Public sharing is token-scoped and read-only for anonymous viewers.

Never solve a Firestore permission error by broadening reads/writes to `request.auth != null` without checking UID ownership.

Never expose service-account private keys or Firebase Admin credentials through browser `NEXT_PUBLIC_*` variables.

## UX contract

The UI should feel like a paper ledger, not a fintech dashboard.

Use the established warm paper/ink/ledger-green language and large touch targets. Motion confirms spatial changes; it should not decorate ordinary bookkeeping.

Bengali is a first-class UI language. Do not hardcode English-only width assumptions.

## Change safety contract

For every code change:

1. Read the definition and all call sites.
2. Read affected tests and old assertions.
3. Preserve unrelated behavior.
4. Re-read every changed hunk.
5. Run all available verification, or explicitly report what was not run.

For signature/export/order changes, assume hidden callers/tests exist until the entire repository has been searched.
