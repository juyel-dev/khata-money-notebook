# Sync conflict and delete semantics

R5 defines the ordering rules that the future Firestore adapter must follow. No Firestore reads/writes are introduced here.

## Version identity

Every queued local mutation receives a version:

```text
changedAt + deviceId + sequence
```

`changedAt` is the primary last-write-wins clock. `deviceId` and the per-device logical `sequence` make equal timestamps deterministic. The device ID is generated once and persisted locally; the logical clock is also durable.

Mutation IDs include the full version identity, so a later edit of the same entity is never confused with an earlier mutation made in the same millisecond.

## Conflict rule

For the same entity, compare versions in this order:

1. newer `changedAt` wins;
2. on an equal timestamp, lexicographically larger `deviceId` wins;
3. on an equal device ID, larger `sequence` wins;
4. if the complete version is still identical, delete wins over upsert;
5. otherwise the larger mutation ID is the final deterministic tie-breaker.

This is a deterministic last-write-wins policy, not a field-level merge. R5 deliberately avoids attempting semantic merges of money records.

## Delete rule

Deletes create durable tombstones rather than relying only on the absence of a document.

A tombstone stores the entity identity and delete version. Any incoming upsert whose version is older than or equal to that tombstone is rejected, preventing a stale offline write from resurrecting deleted data.

A strictly newer upsert may clear the tombstone and recreate the entity.

## Queue interaction

The existing local queue continues to own retry state. Completing a cloud mutation does not remove its version semantics; the future cloud adapter must compare the mutation version before applying a remote change.

R5 does not decide first-account reconciliation or cross-device migration policy. Those decisions belong to R6.
