# Firebase + Firestore foundation

Khata remains local-first. Dexie stays the operational local database; Firebase is the durable cloud boundary for the future sync engine and read-only sharing.

## Firestore ownership model

Application data is namespaced below the authenticated Google account UID:

```text
users/{uid}
users/{uid}/notebooks/{notebookId}
users/{uid}/groups/{groupId}
users/{uid}/people/{personId}
users/{uid}/transactions/{transactionId}
```

The local Dexie entity IDs are reused as Firestore document IDs. This keeps identity stable across local/cloud reconciliation and avoids a second mapping table.

The cloud document shapes intentionally track the local entities in `lib/db/schema.ts`:

- `Notebook` → `CloudNotebook`
- `NotebookGroup` → `CloudNotebookGroup`
- `Person` → `CloudPerson`
- `Transaction` → `CloudTransaction`
- `CloudUserProfile` holds Firebase account metadata needed by later account/sync work.

`lib/firebase/firestoreSchema.ts` contains types and path helpers only. R3 does not perform Firestore reads/writes and does not change local data behavior.

## Security boundary

`firestore.rules` currently allows read/write only when the authenticated Firebase UID matches the `{uid}` namespace. Unauthenticated users cannot access application cloud data.

This is deliberately an owner-only foundation. Public snapshot tokens, viewer access, revoke semantics, and any share-specific rules are introduced later in the sharing phases rather than weakening the owner boundary now.

Before production cloud sync ships, the rules should be tightened with document-shape/integrity validation and exercised against the Firebase Rules Emulator or an equivalent automated rules test setup.

## Firebase setup

Enable Google sign-in in Firebase Authentication and create the Firestore database for the same Firebase project. Keep the existing `NEXT_PUBLIC_FIREBASE_*` environment configuration local to the deployment environment.
