# Read-only sharing snapshots

R14 adds bearer-token read-only snapshots without changing the private owner sync model.

## Scope

A signed-in owner with a linked Google/Firebase account can share either:

- a whole Khata (notebook metadata, its people, and its transactions), or
- one individual (that person and only that person's transactions).

The snapshot is static. Later edits in the owner's Khata do not change an existing share link.

## Token and access model

Each share uses a cryptographically random token as its public URL identifier. The token is the authority for viewer access; viewers do not need a Firebase account.

The root `/shares/{token}` document is readable only while `active == true` and `expiresAt` is null or still in the future. Public collection listing is disabled. Snapshot child documents inherit the same token gate. Only the authenticated owner can create, update, or revoke a share.

The owner also receives a private `users/{uid}/shareRefs/{token}` record so active links can be listed without making the public `/shares` collection queryable.

## Snapshot publication safety

The share root and owner reference are created inactive first. Snapshot child documents are written before the root is activated. A partial write therefore does not become viewer-visible.

The share service runs one normal sync before reading local Dexie state so the published snapshot reflects the latest owner ledger that has successfully gone through the sync boundary.

Large people/transaction collections are written in batches below Firestore's per-batch write limit. The snapshot is spread across child collections rather than packed into one document, avoiding a single-document size ceiling.

## Revocation

Revocation is a metadata state change (`active: false`) rather than a public-data delete. Existing links immediately fail the public read rule, while the owner keeps a local record of the revoked share reference.

## Deliberate non-goals

R14 does not add live sharing, shared editing, viewer comments, viewer authentication, or transaction-level sharing. Expiring links remain represented by `expiresAt`, but the first release creates links with `expiresAt: null` (Never).
