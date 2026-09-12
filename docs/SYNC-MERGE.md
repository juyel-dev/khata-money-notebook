# Firestore merge semantics

R15.3 reviews every Firestore write path that can retain fields from a previous cloud document.

## Policy

### Canonical entity documents use `merge: true`

The notebook, group, person, and transaction documents are durable cloud replicas of the local Dexie entities. Their sync payload is a complete current entity shape, but fields may be introduced over time by newer app versions. Entity upserts therefore keep `merge: true` so an older client does not erase fields that it does not know about when it writes a newer document.

This is a compatibility choice, not partial-update semantics: sync still uses the mutation version to decide whether the write is the winner before materializing it.

### Schema evolution rule

Because merge semantics retain omitted fields, **removing or renaming an entity field must never be represented by simply omitting that property from the payload**. A future field removal requires an explicit migration/write strategy that deletes or replaces the obsolete field for existing cloud documents.

New optional fields may be added without a backfill. Until an explicit deletion strategy exists, the Firestore entity schema is treated as append-compatible.

### Mutation journal uses replacement semantics

A journal document is an immutable record identified by the mutation ID. It is written with ordinary `set` semantics, so a duplicate mutation cannot silently preserve unrelated fields from a previous document version.

### Mutation-order metadata uses `merge: true`

The `_syncMeta/mutationOrder` document currently owns the `value` field and is updated incrementally. Merge semantics are intentional here because the write is a partial metadata update rather than a canonical application-entity replacement.

### Tombstones are authoritative deletes

A winning delete removes the canonical entity document and stores its version in the tombstone document. An older upsert cannot resurrect an entity behind a newer tombstone.

## R15.3 conclusion

The existing `merge: true` on canonical entity upserts is retained intentionally. The material risk was **field retention during future schema changes**, not a present sync-conflict bug. The guardrail is the schema-evolution rule above plus regression coverage that locks the intended merge/replacement split.
