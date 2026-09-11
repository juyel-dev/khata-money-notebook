# First-account linking and reconciliation

R6 defines the safe transition from local-only Khata data to a Google-linked cloud account.

## Safety rules

- Local data remains usable while signed out.
- Linking never silently replaces local data with cloud data, or cloud data with local data.
- A first link creates a persistent local account-link record with the target Firebase UID.
- Switching to a different Google account is blocked until the existing link has been explicitly reconciled.
- Signing out must not delete local Khata data.

## First-link decisions

The reconciliation planner compares only dataset presence at this stage:

| Local | Cloud | Safe plan |
| --- | --- | --- |
| Empty | Empty | Link only |
| Has data | Empty | Preserve local; explicit confirmation before migration |
| Empty | Has data | Preserve cloud; explicit confirmation before migration |
| Has data | Has data | Reconciliation required; no automatic winner |

When both sides contain data, the sync engine must reconcile entity-level versions using the deterministic R5 ordering rules where version metadata exists. Records without trustworthy sync version metadata must not be guessed into a winner; they require an explicit reconciliation path.

R6 intentionally stops short of moving data automatically. `reconciliation.ts` produces the safe plan, while the later Firestore/sync integration owns the actual transfer after the user confirms the plan.

## Account-link state

`accountLink` is stored in the existing Dexie sync metadata store as JSON:

- `linking` — account target is being prepared.
- `reconciliation-required` — local/cloud state must be resolved before completion.
- `linked` — the account link is complete; sync may use the bound UID.

An account-link record contains the Firebase UID, Google provider, creation timestamp, and state. Malformed metadata is treated as absent rather than trusted.
