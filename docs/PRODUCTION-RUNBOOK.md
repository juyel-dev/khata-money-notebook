# Production Runbook

> Infrastructure and verification handoff for agents. This document does not replace the actual Firebase/Vercel configuration; it defines the expected end state and the human gate.

## Scope

Production cloud infrastructure consists of:

```text
Firebase project
├── Authentication / Google
├── Cloud Firestore
└── registered Web App

Vercel
└── production deployment + Firebase public client env
```

Do not enable unrelated Firebase products just because the console offers them.

## Required Vercel/Firebase client configuration

The browser app expects these environment variable names:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

These are browser client configuration values. Firebase Web API keys are not treated as private server credentials. Never place Firebase Admin/service-account private keys in `NEXT_PUBLIC_*` variables.

## Firebase setup

Required:

1. Create/select the dedicated production Firebase project.
2. Register the Khata web app.
3. Enable Google sign-in in Firebase Authentication.
4. Configure the real production domain(s) as authorized domains.
5. Create the production Cloud Firestore database.
6. Deploy the repository's current `firestore.rules` unchanged unless an actual schema/runtime mismatch is demonstrated and the smallest safe rule correction is documented.
7. Create only indexes required by real queries.

Not required for the current architecture:

- Firebase Storage
- Cloud Functions
- Firebase Extensions
- an additional application server/database

App Check is a later hardening decision, not a prerequisite for the core production dry-run.

## Firestore security expectations

The private owner namespace is UID-scoped:

```text
/users/{uid}/...
```

An anonymous viewer must not read it.

Public share snapshots use bearer tokens:

```text
/shares/{token}
```

Public collection listing is disabled. Snapshot reads work only while the share is active and unexpired. Only the authenticated share owner can mutate share metadata or snapshot children.

See `firestore.rules` and `docs/FIRESTORE-ARCHITECTURE.md` as the security source of truth.

## Vercel setup

Configure the six public Firebase environment variables for the production environment and redeploy.

Verify the deployed app initializes Firebase without turning Firebase configuration into a hard dependency for local signed-out use.

The production domain used for auth must exactly match an allowed Firebase Authentication domain.

## Human production gate

The codebase can establish that the flows are structurally implemented; only a real user with the actual Firebase project, Google account and real devices can close this gate.

### Auth

- Open production while signed out.
- Google sign-in succeeds on desktop web.
- Google sign-in succeeds on Android/iPhone mobile browser.
- Google sign-in succeeds when the PWA is installed/standalone.
- Session remains present after a reload.
- Sign out returns to local-only mode without deleting local ledger data.
- Cancelled auth is understandable; do not accept a silent failure.

Redirect auth is expected on mobile/standalone. Popup auth is expected on ordinary desktop web.

### Account linking / reconciliation

Create a test notebook and a few transactions while signed out.

Then sign in and inspect the first-account linking flow.

Test at least:

```text
local empty + cloud empty      → link only
local data + cloud empty       → explicit preserve-local path
local empty + cloud data       → explicit preserve-cloud path
local data + cloud data        → explicit reconciliation, no silent winner
```

Never approve a result where a non-empty side disappears without an explicit user decision.

### Sync

- Create/edit/delete while online.
- Create a mutation while offline.
- Reconnect and confirm it reaches the cloud.
- Open the same account on another device/browser.
- Confirm no duplicate transaction appears.
- Confirm no transaction silently disappears.
- Confirm deletes remain deleted.
- Confirm an ordinary failed mutation does not permanently block later successful mutations.
- Confirm `Sync now` can retry failed work.

### Share: whole Khata

- Linked account creates a whole-Khata share.
- Share link is generated/copied/native-shared.
- Anonymous viewer opens it without signing in.
- Viewer sees only the snapshot's notebook, people and transactions.
- Later owner edits do not mutate that old snapshot.
- Revocation makes the old link inaccessible.

### Share: Individual

- Create a share for one person.
- Anonymous viewer sees exactly that person and only their transactions.
- Another person's transactions are absent.
- Another notebook's data is absent.
- Revoke and verify viewer access is blocked.

### Cross-device reality check

Use two distinct browser/device contexts with the same Google account. Do not validate cross-device sync using two tabs that share one local storage partition; that can hide real account-link and persistence bugs.

## Failure interpretation

Treat these as different classes:

```text
Auth failure        → Firebase Authentication/OAuth configuration
Permission failure  → Firestore rules/path/identity issue
Transport failure   → network/Firestore availability
Queue failure       → local sync mutation/retry state
Reconciliation      → explicit account-link decision path
Share failure       → token/snapshot/security boundary
```

Do not “fix” one class by weakening another.

## Current watch-items

- production Google OAuth/account-link/reconciliation dry-run
- production sharing dry-run
- post-redirect error surfacing via `getRedirectResult` if real-device testing reveals silent cancel/unauthorized-domain failure
- operational sync observability/recovery UX
- package-lock refresh only when dependency installation is intentionally changed

## Release evidence

A production claim is only as strong as its evidence. Record:

```text
Firebase project id
Firestore region
authorized domains
Vercel production URL
deployment result
browser/device auth results
sync results
share/revoke results
known deviations
```

Never mark the human gate green from unit tests alone.
