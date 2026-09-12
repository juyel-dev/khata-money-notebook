# First-account linking and reconciliation

R6 defines the safe transition from local-only Khata data to a Google-linked cloud account. R13 adds the user-facing setup and explicit reconciliation actions.

## Safety rules

- Local data remains usable while signed out.
- Linking never silently replaces local data with cloud data, or cloud data with local data.
- A first link creates a persistent local account-link record with the target Firebase UID.
- Switching to a different Google account is blocked until the existing link has been explicitly reconciled.
- Signing out must not delete local Khata data.
- A user choice to keep one side is applied through the existing sync engine/version rules; it is not a direct unchecked overwrite.

## First-link decisions

The reconciliation planner compares dataset presence:

| Local | Cloud | Safe plan |
| --- | --- | --- |
| Empty | Empty | Link only |
| Has data | Empty | Preserve local; explicit confirmation before migration |
| Empty | Has data | Preserve cloud; explicit confirmation before migration |
| Has data | Has data | Reconciliation required; no automatic winner |

R13 presents the local/cloud counts before the user confirms a choice. When both sides contain data, the UI intentionally does not invent an automatic merge. The user can explicitly keep the device copy or use the cloud copy. A future entity-level merge review can be added separately without weakening this safety boundary.

When preserving the device copy, migration first advances the local Lamport clock past every known cloud entity/tombstone version, creates fresh local mutations, deletes cloud-only entities through tombstone-aware mutations, then completes the account link and runs the sync engine.

When using the cloud copy, local ledger tables and stale sync queue/tombstone/version state are replaced from the cloud snapshot. The device Lamport clock is advanced past the latest known cloud version so future local edits remain causally newer. Cloud entity versions and tombstones are restored into local sync metadata before the account link is completed.

## Account-link state

`accountLink` is stored in the existing Dexie sync metadata store as JSON:

- `linking` — account target is being prepared.
- `reconciliation-required` — local/cloud state must be resolved before completion.
- `linked` — the account link is complete; sync may use the bound UID.

An account-link record contains the Firebase UID, Google provider, creation timestamp, and state. Malformed metadata is treated as absent rather than trusted.

## R13 runtime flow

1. Google sign-in establishes the Firebase identity.
2. Settings shows **Set up cloud sync** while the local link is absent.
3. The setup action reads local and cloud dataset counts.
4. Empty/empty completes the link immediately.
5. Any non-empty case enters explicit reconciliation before `linked` can be reached.
6. After a confirmed action, the link completes and R12 automatic sync can take over.

The setup reads are owner-only Firestore reads. Viewer/sharing paths are intentionally not part of this flow.
