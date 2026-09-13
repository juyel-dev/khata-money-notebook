# Restore and sync notes

A backup restore replaces the local ledger, so restore is a source-of-truth mutation rather than a passive local import.

Restore semantics:

- The existing ledger is replaced inside one `khata-db` transaction.
- Any previously staged, not-yet-promoted sync capture intents are discarded because they describe the pre-restore ledger.
- Delete intents are staged for entities that existed locally before restore but are absent from the imported backup.
- Upsert intents are staged for every entity present in the imported backup so a linked account can converge to the restored dataset even when the previous local rows were identical.
- Capture intents are flushed after the local transaction commits. If the separate sync database is unavailable, the intents remain durable in `khata-db` for later retry.
- Existing promoted sync-queue mutations are not deleted during restore. New restore mutations receive newer logical versions and therefore supersede older queued mutations for the same entity.

This keeps backup restore compatible with the local-first and account-scoped sync contracts without requiring a cross-Dexie transaction.
