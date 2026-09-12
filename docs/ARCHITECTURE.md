# Architecture

> Current implementation architecture. For agent onboarding and hard constraints, read `AI-CONTEXT.md` and `ENGINEERING-INVARIANTS.md` first.

## Runtime stack

| Layer | Current implementation | Contract |
|---|---|---|
| Framework | Next.js 16 App Router | App Router is the route/UI shell and deployment build surface. |
| UI | React 19 + TypeScript | Client-first interaction; keep business rules out of presentational components when a domain helper already exists. |
| Styling | Tailwind CSS v4 + project CSS tokens | Preserve the established paper-ledger visual language. |
| Local persistence | Dexie 4 / IndexedDB | Operational source for the local ledger; must work offline and signed out. |
| UI/session state | Zustand | Ephemeral UI state only; do not duplicate persistent ledger data here. |
| i18n | Hand-rolled `lib/i18n` context/messages | English/Bengali runtime switching without locale routes. |
| Cloud identity | Firebase Authentication | Google provider; optional for local use. |
| Cloud persistence/transport | Cloud Firestore | Durable replica, sync journal, account-link and share snapshot boundary. |
| Motion | Framer Motion | Spatial/confirmation motion only. |
| Icons | lucide-react | Shared icon vocabulary. |
| Testing | Vitest | Unit/integration behavior coverage. |
| Hosting | Vercel | Production deployment and environment configuration. |

Do not copy old documentation that says Next 14, next-intl, Serwist, or Supabase. Those descriptions are obsolete for the current repository.

## High-level data flow

```text
User interaction
   ↓
React/App Router UI
   ↓
lib/db domain helpers / local mutation capture
   ↓
Dexie ledger tables
   ↓
local sync queue (when cloud-linked)
   ↓
Firebase sync engine
   ↕
Firestore owner namespace + mutation journal
```

Sharing is a separate snapshot flow:

```text
linked owner
  ↓
sync latest local state
  ↓
read local notebook/person/transactions
  ↓
inactive /shares/{token}
  ↓
write snapshot children
  ↓
activate share
  ↓
anonymous read-only viewer
```

## Local database

Current `lib/db/schema.ts` contains:

```text
notebooks
people
transactions
groups
settings
```

Notebook has optional `pinned` and `groupId` fields. Dexie schema version 2 adds indexes for those fields while preserving existing data.

Business data is read from Dexie using feature/domain helpers and reactive queries. A persisted ledger value should not also live as a separately authoritative Zustand value.

## Cloud boundary

Firebase is additive. A missing Firebase configuration must not crash local app startup; `getFirebaseServices()` returns `null` when the expected public config is incomplete or Firebase initialization fails.

The browser configuration is read from:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Firebase Admin credentials are not a browser concern.

## Authentication

`lib/firebase/auth.ts` owns Google sign-in/sign-out and auth-state observation.

Current provider behavior:

```text
ordinary desktop browser → signInWithPopup
mobile browser           → signInWithRedirect
installed standalone PWA → signInWithRedirect
```

Google provider uses `prompt=select_account`.

## Account binding

`lib/firebase/accountLink.ts` stores the local binding to a Firebase UID. The first link is an explicit reconciliation boundary, not merely a login event.

See `ACCOUNT-LINKING.md` for the decision matrix and migration semantics.

## Sync orchestration

`components/sync/SyncProvider.tsx` coordinates:

- account-link state
- online/offline state
- queue state
- persisted sync status
- first-link reconciliation
- automatic sync
- manual sync/retry

Automatic sync runs on linked startup/settled auth, online return, visibility return and a 60-second interval. Manual `Sync now` is also an explicit recovery path.

The implementation details and invariants live in `SYNC-ARCHITECTURE.md`.

## Firestore ownership model

```text
/users/{uid}/notebooks/{id}
/users/{uid}/groups/{id}
/users/{uid}/people/{id}
/users/{uid}/transactions/{id}
```

The local entity id is reused as the Firestore document id.

Supporting sync/journal metadata uses helpers in `lib/firebase/firestoreSchema.ts` and transport code in `lib/firebase/firestoreSync.ts`. Never invent cloud paths without reading those helpers first.

## Sharing

Public share snapshots live below `/shares/{token}` with child collections for notebooks, people and transactions.

Share scope is one of:

```text
khata
individual
```

The root record contains owner, scope, notebook, optional person, title, timestamps, active state and schema version.

The root and owner private reference are published inactive first. Snapshot children are written before activation. Viewer reads are blocked after revoke (`active=false`).

See `SHARING.md` and `firestore.rules`.

## UI architecture

Current feature boundaries are grouped by purpose:

```text
components/account/
components/home/
components/nav/
components/notebook/
components/person/
components/share/
components/sync/
components/transaction/
components/shared/
```

Routes are under `app/(main)` with a separate public `/share/[token]` route.

## PWA

The app is a standalone-installable PWA with local IndexedDB persistence and a service worker. Core ledger reads/writes must remain available with no network. The service worker is part of the app shell, not the data source.

See `PWA.md` for current behavior and verification.

## Testing expectations

When changing code:

1. Find the definition.
2. Find every caller/export consumer.
3. Find every test that asserts the affected semantics.
4. Change tests when behavior intentionally changes.
5. Re-read the whole diff before opening a PR.

Historical sync work exposed the risk of changing a signature or ordering rule without updating every caller/test. Treat repository-wide search as mandatory for public or cross-module changes.
