# Local mutation capture

R8 connects successful local Dexie writes to the existing sync queue. The local database remains the source of truth for interactive use; queue capture happens only after the local write succeeds.

## Covered entities

Notebook, group, person, and transaction create/update/delete flows enqueue entity-level mutations. Permanent notebook deletion also queues deletes for its people and transactions. Group deletion queues the updated ungrouped notebooks plus the group delete.

## Reliability contract

A failed local write does not enqueue a cloud mutation. A successful local write remains successful even when no cloud transport is configured or available; the queue simply retains the pending mutation for a later sync worker.

The queue stores the mutation version from R5. The future Firestore transport must preserve that metadata, use the R5 tombstone semantics for deletes, and apply the explicit clock-skew policy before deciding a remote mutation is stale.

R8 does not introduce automatic Firestore network activity. It only makes local mutations available to the future transport layer.
