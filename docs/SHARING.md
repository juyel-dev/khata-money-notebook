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

A viewer's local offline cache (see below) is not touched by revoke — the
next successful *live* read after a revoke will correctly show
unavailable and clear that viewer's cache, but a viewer who stays fully
offline continues to see their last-cached copy until it expires. This is
treated the same as a screenshot: revoke stops *new* access, not a copy
someone already has.

## Local view cache (offline fallback for viewers)

`lib/shared/shareViewCache.ts` — a small dedicated Dexie database
(`khata-share-view-cache`, separate from the owner's own `khata-db`/
`khata-sync-db`, since a viewer opening a public link may have no account
and may never install the app at all) that lets a viewer reopen a share
link without internet after they've successfully loaded it at least once.

- On every successful live read, the snapshot is cached with a timestamp.
- On a definitive "unavailable" response from the server (revoked,
  expired, never existed — `readPublicShare` returning `null`), the cache
  for that token is cleared. This is what keeps revoke meaningful for a
  viewer who *is* online: they get the real answer, not a stale cache.
- On a failed read (`readPublicShare` throwing — most likely no
  connectivity, not a definitive answer from the server), the viewer falls
  back to the cached copy if one exists and is under 7 days old
  (`SHARE_CACHE_MAX_AGE_MS`), with a visible "showing the copy last viewed
  on ..." banner — never silently.
- No image/PDF export exists or is planned; the local cache is the
  offline mechanism for viewers, same as local Dexie is the offline
  mechanism for the app's own owner/user. A viewer who wants a portable
  copy to send elsewhere is expected to screenshot.

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
- image/PDF export of a shared snapshot for the viewer (considered and
  deliberately rejected in favor of the local view cache above — a single
  exported image doesn't scale to a large snapshot, and screenshotting
  already covers the "send this elsewhere" case)

Expiry is represented by `expiresAt` and is settable at creation
(never/7/30/90 days, see ShareSheet) — `null` (never) is still the default.
