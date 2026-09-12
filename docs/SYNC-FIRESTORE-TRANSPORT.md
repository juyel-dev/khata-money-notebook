# Firestore sync transport

R10 adds the Firestore transport primitive that the future sync orchestrator will call. It does **not** automatically start network sync from the UI.

## Cloud layout

Under `users/{uid}`:

- `notebooks/{id}`, `groups/{id}`, `people/{id}`, `transactions/{id}` — materialized winning entity state.
- `_syncMutations/{mutationId}` — append-only idempotency journal. Every accepted local mutation gets one journal record, even when its version loses the current materialized conflict.
- `_syncTombstones/{entity}:{entityId}` — durable delete versions.
- `_syncMeta/mutationOrder` — a server-side serialized counter used only for journal paging.

Entity documents contain the application payload plus a `version` object. The `syncUpdatedAt` field is server-generated metadata and is never treated as application data.

## Push contract

`pushMutation()` is transactionally serialized in Firestore:

1. Read the journal id, entity document, tombstone, and server mutation-order document.
2. Return immediately when the mutation id is already journaled.
3. Allocate the next server `receivedOrder` value.
4. Append the mutation to `_syncMutations`.
5. Materialize it only when its logical version beats the current entity/tombstone winner.
6. For deletes, remove the entity and write its tombstone.
7. For a newer upsert, clear an older tombstone.

Because the entity/tombstone read and materialization happen inside a Firestore transaction, concurrent pushes cannot overwrite a newer winner based on a stale pre-read.

## Pull contract

`readMutationJournal()` pages by the monotonic `receivedOrder` field rather than client wall-clock time. This avoids pagination ambiguity when several writes arrive within the same timestamp.

The future orchestrator must pass each remote mutation through the R9 logical-clock receive step and through the existing conflict/tombstone rules before changing Dexie.

Remote application must **not** call the local mutation-capture helpers; otherwise a pulled cloud mutation would recursively create a new local cloud mutation.

## Security

The existing owner-only Firestore rules remain the authority for these internal sync collections. Viewer/snapshot access is intentionally not part of R10 and will be added with sharing.

## Important non-goals

R10 does not perform first-account reconciliation, does not modify local data, does not expose sync UI, and does not claim that Firestore sync is live. Those belong to the orchestration and integration milestones.
