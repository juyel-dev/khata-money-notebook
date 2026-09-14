# Firestore rules test suite

`firestore.rules.test.ts` in this folder exercises `firestore.rules` against
a real Firestore emulator via `@firebase/rules-unit-testing`. It is **not**
part of the default `npm test` run (see `vitest.config.ts`) because it
needs the emulator running first.

## Why this exists

Security rules are the actual authorization boundary for this app's cloud
data — `lib/firebase/sharing.ts` and friends only ever produce *requests*;
whether those requests succeed is entirely down to `firestore.rules`. Rules
can't be meaningfully unit-tested by reading the `.rules` file — they need
to be evaluated by the real rules engine against real requests, which is
what the emulator provides.

## Running it

```bash
npm install -g firebase-tools   # if not already available
npm run test:rules
```

`test:rules` runs `firebase emulators:exec --only firestore -- "vitest run tests/rules"`.
The first run downloads the Firestore emulator JAR from
`storage.googleapis.com` — this requires that host to be reachable. It was
**not reachable from this sandbox** (network egress here allow-lists only
`npm`/`pypi`/`github`-type hosts), so this suite has been written but not
yet executed anywhere. Run it in an environment with normal internet
access (a dev machine, or CI) before treating the rules hardening in this
PR as fully proven — the manual line-by-line review against
`lib/firebase/sharing.ts` and `lib/firebase/firestoreSync.ts` gives high
confidence, but it is not a substitute for actually running these cases
against the real rules engine.

## What it covers

- Owner isolation: Alice can read/write her own `/users/{uid}/**` data;
  Alice cannot read or write Bob's; an unauthenticated request can't touch
  either.
- The explicit per-subcollection allow-list (`notebooks`, `groups`,
  `people`, `transactions`, `shareRefs`, `_syncMutations`,
  `_syncTombstones`, `_syncMeta`) plus the default-deny catch-all for
  anything else under a user's namespace.
- Share lifecycle: a share can only be created `active: false`; the owner
  can flip it active; nobody else can create/activate a share for
  themselves against another owner's notebook.
- Public read of an active, unexpired share; denied once expired or
  revoked (`active: false`).
- Share child documents must stay inside the declared scope: a child whose
  `notebookId` doesn't match the share's `notebookId` is rejected, and for
  an `individual`-scope share, a transaction/person belonging to a
  different person than `share.personId` is rejected.
- Immutability: `ownerUid`, `scope`, `notebookId`, `personId`,
  `schemaVersion` can't be changed by an update after creation.
- An arbitrary, undeclared subcollection under `/shares/{token}/...` is not
  publicly readable.
