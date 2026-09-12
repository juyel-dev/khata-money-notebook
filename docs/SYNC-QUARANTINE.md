# Sync journal quarantine

R15.1 defines the recovery boundary for malformed remote journal rows.

## Policy

- A journal row is quarantined when its payload or mutation metadata fails local validation.
- The quarantine record is durable in the local `khata-sync-db`, separate from the operational mutation queue.
- The record keeps the received order when it is a safe non-negative integer, the validation reason, quarantine time, and the raw Firestore row for later diagnosis/recovery.
- A quarantined row is not applied to the local ledger and is never silently treated as a valid mutation.
- When the row has a safe `receivedOrder`, the pull cursor advances past it after the quarantine write succeeds. This prevents one malformed mutation from permanently blocking later valid mutations.
- When `receivedOrder` is missing or invalid, the client quarantines the row but does **not** advance the cursor. Cursor safety takes precedence over making progress because there is no trustworthy position from which to resume.
- A failed quarantine write is itself a sync failure; the client does not advance the cursor without durable quarantine state.

## Recovery

Quarantined rows are retained until explicitly cleared. The stored raw row and reason provide the diagnostic material needed for a later recovery tool or repaired-data workflow. R15.1 does not auto-repair or auto-replay malformed data.

This boundary intentionally separates **corrupt data** from **transient transport failures**. Transport failures remain in the normal sync error/retry path and are not quarantined.

## Privacy and retention

The raw row is stored only in the user's local sync database. It is not written back to Firestore. Because journal rows can contain ledger data, any future UI exposing quarantine records must treat them as sensitive user data and avoid unnecessary duplication or broad logging.
