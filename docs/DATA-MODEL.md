# Data Model

> Current local/cloud entity contract. Read `ENGINEERING-INVARIANTS.md` before changing any field or relationship.

## Persistence model

The operational ledger lives in Dexie/IndexedDB. Firebase is an additive cloud replica/sync layer when a user links an account.

Current Dexie database: `khata-db`.

Current schema version: 2.

## Entities

### Notebook

```text
Notebook {
  id: string
  name: string
  openingBalance: number       // safe integer paise
  createdAt: number            // epoch ms
  updatedAt: number            // epoch ms
  archived: boolean
  color: NotebookColor
  icon: NotebookIcon
  pinned?: boolean              // optional v2 field
  groupId?: string | null       // optional v2 field
}
```

`NotebookColor` is the fixed union implemented in `lib/db/schema.ts` and `NotebookIcon` is the fixed union implemented there. Do not invent persisted values outside those unions without updating every validator/serializer/test that depends on them.

### NotebookGroup

```text
NotebookGroup {
  id: string
  name: string
  createdAt: number
}
```

A notebook may reference one group or remain ungrouped. Group membership is optional.

### Person

```text
Person {
  id: string
  notebookId: string
  name: string
  phone?: string
  createdAt: number
}
```

A person belongs to exactly one notebook. The same real-world person may have distinct records in different notebooks.

### Transaction

```text
Transaction {
  id: string
  notebookId: string
  personId: string
  type: "gave" | "got"
  amount: number             // safe integer paise, non-negative
  note?: string
  occurredAt: number         // epoch ms; transaction event time
  createdAt: number           // epoch ms; save/audit time
}
```

A transaction's `personId` and `notebookId` must refer to the same notebook.

## Amount contract

Store money as integer paise:

```text
₹1 = 100 paise
```

No floating-point currency values are persisted.

Validation must reject non-finite, negative or unsafe integer paise values. Formatting belongs at the presentation boundary.

## Balance contract

Notebook balance is derived, never stored as a second authoritative value:

```text
currentBalance = openingBalance
  + sum(transactions where type == "got")
  - sum(transactions where type == "gave")
```

The model describes the user's own cash movement. Avoid debt-management language in product copy.

## Individuals

The Individuals view is derived from the notebook's transactions plus its people collection.

There is no separate `Individual` persistence entity.

The current Khata detail page opens on `Transactions`; individuals are a secondary filtered view. This is an information-architecture contract, not merely a UI preference.

## Dexie indexes

Current schema declares:

```text
notebooks:
  id, archived, createdAt, updatedAt, pinned, groupId

people:
  id, notebookId, name

transactions:
  id, notebookId, personId, occurredAt, type

settings:
  key

groups:
  id, name, createdAt
```

Before adding an index, check actual query patterns and the Dexie schema version. Avoid speculative indexes.

## Edit/delete semantics

Transactions and people can be edited according to current UI/domain rules. Transaction deletion participates in the sync/tombstone system when cloud-linked.

Notebook archival is the normal hide path. Permanent destructive actions are separate and guarded by current UI behavior.

Undo is a user-level restoration/new mutation concept; it must not reuse an old sync version.

## Backup format

Portable backup is a versioned envelope, not raw table arrays:

```json
{
  "format": "khata-backup",
  "version": 2,
  "exportedAt": 0,
  "data": {
    "notebooks": [],
    "groups": [],
    "people": [],
    "transactions": []
  }
}
```

Current supported backup version: `2`.

The backup validator checks:

- envelope format/version
- collection presence
- entity ids and required fields
- timestamps
- safe integer paise
- notebook style unions
- unique ids
- notebook/group/people/transaction foreign keys
- transaction/person notebook agreement

Nothing should mutate IndexedDB until validation passes.

Restore uses replacement semantics inside one Dexie read/write transaction. It is not a merge operation. Existing data is snapshotted before replacement so the caller can provide recovery/undo behavior.

## Cloud projection

The same local entity ids are reused as Firestore document ids:

```text
/users/{uid}/notebooks/{notebookId}
/users/{uid}/groups/{groupId}
/users/{uid}/people/{personId}
/users/{uid}/transactions/{transactionId}
```

Cloud versions, tombstones, journal rows and mutation metadata are sync concerns and are documented in `SYNC-ARCHITECTURE.md`; do not pollute the business entity model with transport state unless there is a deliberate compatibility reason.

## Schema evolution

Optional fields are currently added append-compatibly (example: `pinned`, `groupId`).

Because Firestore canonical entity upserts use `merge:true`, **omitting a field does not delete it from an existing cloud document**. Removing/renaming a persisted field therefore requires an explicit migration/write strategy.

Never silently reinterpret an old field name as a new meaning.
