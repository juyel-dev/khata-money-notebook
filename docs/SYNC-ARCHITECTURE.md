# Sync Architecture

> Current implementation contract for agents working on cloud sync. Read together with `ENGINEERING-INVARIANTS.md`.

## Boundary

Khata is local-first:

```text
Dexie ledger
   ↓ local mutation capture
Durable local sync DB
   ↓
Sync engine
   ↕
Firestore owner data + mutation journal
```

Firebase Auth supplies identity. Firestore is a durable cloud replica and transport journal, not the primary interactive database for ordinary ledger UI.

## Local stores

The main Dexie database (`khata-db`) contains user ledger tables:

```text
notebooks
people
transactions
groups
settings
```

A separate sync DB stores account-link state, sync status/identity and mutation records needed for durable transport. Keep operational ledger data separate from sync metadata conceptually even when both use IndexedDB.

## Mutation lifecycle

```text
local CRUD
  ↓
capture mutation
  ↓
create logical version
  ↓
persist queue row: pending
  ↓
automatic/manual sync
  ↓
mark syncing
  ↓
Firestore write + journal transport
  ↓
remove/settle queue row
```

A local write must finish without waiting for Firebase.

The capture path must be invoked by user-originated local mutations. Applying a remote winner must not re-enqueue itself.

## Mutation identity

Mutation ids are deterministic from the entity, entity id and version inputs.

The mutation payload identifies the entity and operation; delete mutations may carry no canonical payload.

## Version ordering

The conflict version is deterministic and logically monotonic for a device. Ordering is Lamport-first, followed by device identity, with `changedAt` retained as metadata rather than trusted as the sole ordering authority.

Conceptually:

```text
compare(a, b):
  sequence → deviceId → changedAt
```

Do not reintroduce wall-clock-first conflict ordering without a new architecture decision. Device clock skew is expected in real deployments.

## Push semantics

The sync engine pushes queued local mutations to the authenticated user's Firestore namespace.

Canonical entity writes use `merge:true`. This is intentional so newer fields are not erased by an older client that does not know those fields.

Delete pushes remove the canonical document and write an authoritative tombstone/version record.

Mutation journal records are immutable and use replacement semantics.

## Pull semantics

The engine reads remote journal pages using a durable cursor/order boundary.

For each page:

1. Validate each journal row.
2. Decide whether the remote mutation is a winner using the logical version.
3. Apply winning state to local Dexie without re-capture.
4. Quarantine malformed rows when they meet the corrupt-journal policy.
5. Advance the cursor only when page safety is established.

The journal's `receivedOrder`/cursor information is transport pagination state. It is not a business conflict clock.

## Tombstones

Deletes are durable logical facts.

A winning delete:

```text
canonical entity document → removed
entity tombstone/version   → retained
```

An older upsert cannot resurrect the deleted entity.

Undo/restore is a new user mutation and must receive a new logical version; it must not reuse the deleted version.

## Retry and poison mutations

Queue rows expose pending/syncing/failed states.

Automatic retry is bounded and uses durable `nextRetryAt` backoff. The current automatic retry cutoff is 8 attempts.

Manual retry explicitly moves failed mutations back to pending and clears the retry schedule.

A failed mutation is isolated: later mutations remain eligible for processing.

After a process interruption, stale `syncing` rows can be reset to pending.

## Corrupt journal handling

Malformed journal/order data is not equivalent to a transient network failure.

R15.1 policy:

- malformed journal rows are quarantined locally
- safe cursor progress may continue only when ordering metadata is trustworthy
- corrupt ordering metadata holds the cursor rather than guessing
- quarantine is durable so the same bad row does not repeatedly poison sync

Corruption and transient transport failure must remain separately observable concepts.

## Firestore path model

```text
users/{uid}/notebooks/{notebookId}
users/{uid}/groups/{groupId}
users/{uid}/people/{personId}
users/{uid}/transactions/{transactionId}
```

Sync ids are the same as local Dexie ids. Do not add a mapping layer without an explicit reason.

Supporting sync/journal metadata lives under the owner's namespace as defined by the current Firestore schema/helpers; inspect `lib/firebase/firestoreSchema.ts` and `firestoreSync.ts` before introducing new paths.

## First account link

The first link is not just a sign-in event. It binds the local sync identity to the Firebase UID and reconciles local/cloud state.

```text
Google sign-in
    ↓
inspect link + local/cloud dataset presence
    ↓
empty/empty → link-only
non-empty    → explicit reconciliation
    ↓
complete account link
    ↓
normal sync
```

Preserve-local and preserve-cloud actions are implemented through the sync/version rules, not a blind database overwrite.

Switching accounts while an existing binding exists requires explicit reconciliation first.

## Sync UX

`components/sync/SyncProvider.tsx` owns application-level orchestration:

- refresh persisted sync/link state
- manual `Sync now`
- automatic sync on linked startup
- online return
- visibility return
- periodic 60-second attempt
- retry failed mutations on explicit manual recovery

User-facing status is derived from sign-in, online state, link state and queue state. Do not make the ledger unusable just because cloud sync is unavailable.

## Share interaction with sync

Share creation calls a normal sync before taking its snapshot. This gives the share service the latest locally known state that has crossed the sync boundary.

Sharing then snapshots local Dexie data; the share is independent and static after publication.

## Extension rules

When changing sync code, inspect all of these together:

```text
lib/firebase/syncTypes.ts
lib/firebase/syncIdentity.ts
lib/firebase/syncQueue.ts
lib/firebase/syncDb.ts
lib/firebase/firestoreSync.ts
lib/firebase/syncEngine.ts
lib/firebase/reconciliation.ts
lib/firebase/reconciliationFlow.ts
lib/firebase/syncStatus.ts
components/sync/SyncProvider.tsx
```

Also inspect every corresponding `*.test.ts` file before changing semantics. Historical regressions came from changing ordering/signatures without updating every test/call site.
