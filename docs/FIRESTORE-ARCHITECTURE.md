# Firestore Architecture

> Current Firestore data, transport and authorization model.

## Purpose

Firestore is the durable cloud boundary for Firebase identity, synchronization and read-only share snapshots.

It is not the local operational database. Dexie remains the app's offline/local data layer.

## Owner namespace

Canonical ledger entities are stored under the Firebase UID:

```text
users/{uid}/notebooks/{notebookId}
users/{uid}/groups/{groupId}
users/{uid}/people/{personId}
users/{uid}/transactions/{transactionId}
```

Local ids are reused as Firestore document ids so reconciliation does not require a second identity-mapping table.

Supporting sync metadata/journal/tombstone paths are defined by the current Firestore schema/transport helpers. Before adding a path, read `lib/firebase/firestoreSchema.ts` and `lib/firebase/firestoreSync.ts`.

## Security boundary

`firestore.rules` is UID-owner based for private data.

Anonymous users cannot read `/users/{uid}/...`.

An authenticated user cannot read/write another user's owner namespace.

Public sharing is isolated under `/shares/{token}`.

## Public share namespace

```text
shares/{token}
shares/{token}/notebooks/{documentId}
shares/{token}/people/{documentId}
shares/{token}/transactions/{documentId}
```

The root record includes:

```text
token
ownerUid
scope: khata | individual
notebookId
personId? 
title
createdAt
expiresAt
active
schemaVersion
```

The token is the bearer authority for anonymous reads. The public `/shares` collection cannot be listed.

## Share access rules

Public viewer:

- may `get` an active, unexpired share root by exact token
- may read its snapshot child documents while the share is active/unexpired
- may not list the share collection
- may not write share metadata or snapshot data

Share owner:

- must be authenticated
- can manage their own share root/reference and snapshot children

The repository-root `firestore.rules` is the authoritative implementation.

## Publication model

Share creation is intentionally staged:

```text
create inactive public root
create inactive owner reference
write notebook snapshot
write people snapshot
write transaction snapshot
activate public root + owner reference
```

This prevents partially written snapshot data from becoming publicly readable during creation.

## Sync writes

Canonical entities use `merge:true` so an older client does not erase fields introduced by a newer client.

This means omission is not deletion. Schema field removal/rename requires an explicit migration/write strategy.

Journal records use replacement semantics. Delete operations use tombstones/version records so stale upserts cannot resurrect newer deletes.

## Query/index discipline

Firestore indexes must reflect real application queries. Do not create speculative composite indexes simply because the database supports them.

Current public share reading is token-scoped and then reads child collections under the token; it is not a global collection query.

## Production security checks

Before considering the backend ready, verify:

```text
anonymous -> /users/*             DENY
other UID -> /users/owner/*      DENY
anonymous -> /shares/token       ALLOW only while active/unexpired
anonymous -> list /shares        DENY
anonymous -> revoked share       DENY
anonymous -> expired share       DENY
viewer -> write share             DENY
owner -> own share                ALLOW
non-owner -> other's share write DENY
```

Use emulator/rules testing when available and real production dry-run for deployed configuration.
