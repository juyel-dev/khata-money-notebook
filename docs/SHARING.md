# Read-Only Sharing Snapshots

> Current sharing architecture. Sharing is snapshot publication, not collaboration.

## Scope

A user must have a linked Google/Firebase account to create or revoke a share.

Supported scopes:

```text
khata
individual
```

### Whole Khata

Snapshot contains the selected notebook plus its people and transactions.

### Individual

Snapshot contains exactly one person and only that person's transactions.

## Snapshot lifecycle

```text
validate linked owner
       ↓
sync latest state
       ↓
read local Dexie state
       ↓
create inactive share root + private owner ref
       ↓
write snapshot children
       ↓
activate share
       ↓
return /share/{token}
```

The snapshot is static. Later owner edits do not mutate an existing share.

## Token model

Each share uses a cryptographically generated token as the public URL identifier.

The token is the bearer authority for public viewer access.

Viewers do not need a Firebase account.

The public `shares` collection is not listable.

## Firestore layout

```text
/shares/{token}
/shares/{token}/notebooks/{notebookId}
/shares/{token}/people/{personId}
/shares/{token}/transactions/{transactionId}
```

Root record:

```text
token
ownerUid
scope
notebookId
personId? 
title
createdAt
expiresAt
active
schemaVersion
```

A separate private owner reference is stored at:

```text
/users/{uid}/shareRefs/{token}
```

This makes active-link management possible without exposing a queryable public share collection.

## Publication safety

The root is inactive while children are being written. Only after successful snapshot publication is `active` switched to true.

Transactions/people are written in chunks below the Firestore batch limit rather than packed into one large document.

Share creation performs one normal sync first so the snapshot reflects the latest owner state that has crossed the sync boundary.

## Security

Public viewer can read a share only when:

```text
active == true
AND
(expiresAt == null OR expiresAt > request.time)
```

Owner-only mutation requires Firebase UID ownership.

Public viewers cannot write snapshots, mutate metadata, or enumerate `/shares`.

## Revoke

Revoke is a root/reference metadata update:

```text
active = false
```

The snapshot payload can remain stored because public access is controlled by the root authorization state.

## Snapshot integrity checks

The public reader validates the root record and snapshot consistency before returning data.

For individual shares it rejects snapshots with:

- missing `personId`
- more than one person
- the wrong person id
- a transaction belonging to another person

For whole-Khata shares it rejects people or transactions pointing at another notebook.

## Deliberate non-goals

Do not introduce without an explicit product decision:

- live sharing
- collaborative editing
- “Can edit” permissions
- comments/reactions
- viewer accounts
- transaction-level sharing as a new UI concept

Expiry is represented by `expiresAt`, but the current creation path uses `null` (Never).
