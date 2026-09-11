# Sync status and reliability model

R7 defines the small state model that the future sync runtime and UI can share. It is intentionally separate from the transport/Firestore adapter.

## User-facing states

| State | Meaning |
| --- | --- |
| `local-only` | The user is signed out. Khata continues to work locally. |
| `syncing` | An account link is being prepared or local mutations are waiting to reach cloud. |
| `synced` | The account is linked, the app is online, and there are no failed/pending mutations. |
| `offline` | The user is signed in but the device is currently offline. Local writes must still work. |
| `error` | One or more mutations have failed and need retry handling. |
| `needs-reconciliation` | The account link cannot safely finish until local/cloud data is explicitly reconciled. |

Priority is deliberate: reconciliation > offline > error > syncing > synced. Signed-out users always remain `local-only`.

## Retry policy

Failed work uses capped exponential backoff: `1000 * 2^attempts`, capped at five minutes. The queue owns retry metadata; the status layer only provides a deterministic delay policy.

## Persistence

The latest status is stored in the existing `khata-sync-db` `syncMeta` table. Malformed persisted status is treated as absent rather than trusted. Subscribers receive updates from the current browser runtime so a future React status indicator can update without polling.

## Scope boundary

R7 does not claim that Firestore sync is live. The existing queue and R5 conflict/tombstone semantics still require a transport/orchestration layer to connect local mutations to Firestore safely. The status model is ready for that integration without changing the money data model.
