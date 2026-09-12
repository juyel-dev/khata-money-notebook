# Sync orchestrator

R11 connects the local mutation queue to the R10 Firestore transport and the Dexie local database. It is the first end-to-end sync engine, but it is still an explicit service call; the UI does not auto-start it in this milestone.

## Lifecycle

For a linked Google account, one `syncOnce()` call:

1. recovers mutations left in `syncing` after a crash;
2. pushes pending local mutations in logical-version order;
3. pulls the Firestore mutation journal from the persisted cursor;
4. advances the Lamport clock for every observed remote version;
5. resolves each remote mutation against the persisted local entity version;
6. applies only the winning remote state to Dexie without re-enqueuing it;
7. records local tombstones for remote deletes;
8. persists the journal cursor only after the page has been applied.

An empty pull page is the terminal condition, including the initial `null` cursor case.

## Local version state

Dexie entities intentionally do not gain sync fields. `syncMeta` stores the last known winning sync version per entity so the orchestrator can compare future remote mutations even after an upload has left the queue.

The same metadata stores the per-account journal cursor.

## Safety rules

Remote journal rows are validated before they are trusted. Malformed rows stop the pull rather than being silently skipped.

Remote application bypasses the local mutation-capture helpers. A cloud change therefore cannot recursively create another queued cloud mutation.

A local delete that has produced a tombstone remains authoritative until a strictly newer logical version arrives. Undo/restore must create a new logical version before it can become cloud-authoritative.

A Firestore push failure marks the mutation failed; it is not removed from the queue. A later sync attempt can recover mutations left in `syncing` by a crashed worker.

First-account reconciliation is still a gate. The orchestrator refuses to sync an account whose link has not reached `linked` state, so it cannot silently overwrite local or cloud data.

## Non-goals

R11 does not add automatic background scheduling, UI sync indicators, first-account merge UX, share links, or production Google sign-in flows. Those are subsequent integration/hardening work.
