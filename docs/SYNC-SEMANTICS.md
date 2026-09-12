# Sync conflict and delete semantics

R5 defines the ordering rules that the future Firestore adapter must follow. No Firestore reads/writes are introduced here.

## Version identity

Every queued local mutation receives a version:

```text
changedAt + deviceId + sequence
```

`sequence` is a durable per-device Lamport logical clock and is the authoritative ordering field. `deviceId` provides a deterministic tie-breaker when two devices have the same logical sequence. `changedAt` is retained as the real-world timestamp for audit, display, and the final tie-break only.

A device must call `observeLogicalClock(remoteSequence)` when it accepts or otherwise observes a remote version. This advances its local clock to `max(local, remote) + 1` before the next local mutation is created.

This policy deliberately does **not** use client wall-clock time as the authority for conflict resolution. A device with a slow, fast, or incorrectly configured clock therefore cannot silently make a newer mutation look stale merely because its timestamp is lower.

Mutation IDs include the full version identity, so a later edit of the same entity is never confused with an earlier mutation made in the same millisecond.

## Conflict rule

For the same entity, compare versions in this order:

1. larger logical `sequence` wins;
2. on an equal sequence, lexicographically larger `deviceId` wins;
3. on an equal device ID and sequence, newer `changedAt` wins;
4. if the complete version is still identical, delete wins over upsert;
5. otherwise the larger mutation ID is the final deterministic tie-breaker.

This is a deterministic last-write-wins policy, not a field-level merge. R5 deliberately avoids attempting semantic merges of money records.

## Delete rule

Deletes create durable tombstones rather than relying only on the absence of a document.

A tombstone stores the entity identity and delete version. Any incoming upsert whose version is older than or equal to that tombstone is rejected, preventing a stale offline write from resurrecting deleted data.

A strictly newer upsert may clear the tombstone and recreate the entity.

Undo/restore is a new local mutation only when it receives a new logical version. Reusing the pre-delete version cannot override the delete tombstone and must not be treated as a cloud-safe restore.

## Queue interaction

The existing local queue continues to own retry state. Completing a cloud mutation does not remove its version semantics; the future cloud adapter must compare the mutation version before applying a remote change and must advance the local logical clock after observing accepted remote versions.

R5 does not decide first-account reconciliation or cross-device migration policy. Those decisions belong to R6.
