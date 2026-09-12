# First-Account Linking and Reconciliation

> Current behavior for binding local Khata data to a Google/Firebase account.

## Principle

Sign-in and account linking are separate concepts.

```text
Google identity established
        ↓
inspect local/cloud state
        ↓
explicit link/reconciliation
        ↓
linked UID becomes the sync identity
```

Local use remains possible before and after linking.

Signing out does not delete local ledger data.

## Safety rules

- Never silently replace non-empty local data with cloud data.
- Never silently replace non-empty cloud data with local data.
- Never bind a new Firebase UID while an existing different binding remains unresolved.
- Never bypass reconciliation just because one side appears newer by wall-clock time.
- Preserve version/tombstone semantics when moving between local and cloud states.

## Decision matrix

| Local | Cloud | Required action |
|---|---|---|
| empty | empty | `link-only` |
| non-empty | empty | explicit `preserve-local` |
| empty | non-empty | explicit `preserve-cloud` |
| non-empty | non-empty | explicit reconciliation; no automatic winner |

Dataset presence is determined by the planner, not by a UI guess.

## Link state

`accountLink` is persisted in sync metadata. Current states:

```text
linking
reconciliation-required
linked
```

The record binds the Firebase UID and provider metadata plus timestamps/state. Malformed metadata is not trusted as a valid link.

## Preserve local

The local ledger remains authoritative for the first-link choice.

The reconciliation path advances the local logical clock beyond known cloud versions/tombstones, creates fresh local mutations, removes cloud-only state through sync/tombstone semantics, then completes the link and runs normal sync.

It is not a raw Firestore overwrite followed by “linked=true”.

## Preserve cloud

The cloud snapshot becomes the local ledger baseline.

Local ledger tables and stale sync metadata are replaced from the cloud state, the local logical clock is advanced beyond the newest known cloud version, and remote versions/tombstones are restored into local sync metadata before completing the link.

Again, this is a version-aware migration, not an unchecked overwrite.

## Current runtime flow

`SyncProvider` coordinates the user-visible path:

1. User signs into Google.
2. Settings/Account exposes cloud setup.
3. `startAccountLink()` checks existing binding and online state.
4. `inspectFirstAccountLink()` computes local/cloud presence and safe plan.
5. Empty/empty completes immediately and runs sync.
6. Any non-empty case moves to `reconciliation-required` and waits for an explicit action.
7. Confirmed action completes the link and returns the app to normal sync.

## Account switching

If a persisted link exists for UID A and the signed-in Firebase identity is UID B, the app must not silently switch ownership. Reconciliation is required before UID B becomes the linked sync identity.

## Production test gate

Test these four matrix states with real Firebase data before treating account linking as production-ready. The automated suite can validate planner/state semantics, but only the real deployment can prove Google session persistence, Firestore permissions and cross-device identity behavior.
