# Firestore sync transport

R10 adds the Firestore transport primitive that the future sync orchestrator will call. It does **not** automatically start network sync from the UI.

## Cloud layout

Under `users/{uid}`:

- `notebooks/{id}`, `groups/{id}`, `people/{id}`, `transactions/{id}` — materialized winning entity state.
- `_syncMutations/{mutationId}` — append-only idempotency journal. Every accepted local mutation gets one journal record, even when its version loses the current materialized conflict.
- `_syncTombstones/{entity}:{entityId}` — durable delete versions.
- `_syncMeta/mutationOrder` — server-serialized counter used only for deterministic journal paging.

Entity documents contain the application payload plus a `version` object. The `syncUpdatedAt` field is server-generated metadata and is never treated as application data.

## Push contract

`pushMutation()` is serialized inside a Firestore transaction:

1. Read the journal id, entity document, tombstone, and server mutation-order document.
2. Return immediately when the mutation id is already journaled.
3. Allocate the next `receivedOrder` value.
4. Append the mutation to `_syncMutations`.
5. Materialize it only when its logical version beats the current entity/tombstone winner.
6. For deletes, remove the entity and write its tombstone.
7. For a newer upsert, clear an older tombstone.

This means concurrent pushes cannot overwrite a newer winner based on a stale pre-read.

The server counter is **not** the conflict clock. Conflict authority remains the R9 logical sequence + device ID + final `changedAt` tie-break. The counter exists only to page the append-only journal safely.

## Pull contract

`readMutationJournal()` pages by the monotonic `receivedOrder` field, not by client wall-clock time. This avoids pagination ambiguity when several writes arrive within the same timestamp.

The future orchestrator must:

- process each remote mutation through the R9 `observeLogicalClock(remoteSequence)` receive step;
- apply the existing conflict and tombstone rules before changing Dexie;
- advance the persisted cursor only after the page has been safely applied.

Remote application must **not** call local mutation-capture helpers, or a pulled mutation would recursively create another cloud mutation.

## Security

The existing owner-only Firestore rules remain the authority for these internal sync collections. Viewer/snapshot access is intentionally not part of R10 and will be added with sharing.

## Non-goals

R10 does not perform first-account reconciliation, does not modify Dexie, does not expose sync UI, and does not claim that Firestore sync is live. The sync orchestrator and local-apply integration are the next milestone.
