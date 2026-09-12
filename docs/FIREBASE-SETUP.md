# Firebase Setup

> Infrastructure contract for the current Firebase implementation. For production execution see `PRODUCTION-RUNBOOK.md`.

## Required services

Create/use the dedicated production Firebase project for Khata and configure only the services currently required:

- Firebase Authentication
- Google sign-in provider
- Cloud Firestore
- Firebase Web App registration

Storage, Cloud Functions, Extensions and other products are not required by the current client architecture.

## Web client environment

The current code reads exactly:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These values come from the registered Firebase Web App configuration.

Do not commit environment-specific values to the repository. Do not place Firebase Admin/service-account private credentials in `NEXT_PUBLIC_*` variables.

## Client initialization

`lib/firebase/config.ts` validates that all six public values exist.

`lib/firebase/client.ts` returns `null` when configuration is incomplete or initialization fails. This fail-soft boundary is intentional: signed-out/local usage must not crash simply because Firebase is unavailable.

## Authentication

`lib/firebase/auth.ts` owns Google sign-in and uses:

```text
prompt=select_account
```

Routing:

```text
ordinary desktop web     → signInWithPopup
mobile browser           → signInWithRedirect
installed standalone PWA → signInWithRedirect
```

Firebase Authentication must have Google enabled, and the real production web origin must be an authorized domain.

Real-device redirect/cancel behavior remains a human production test because it depends on the actual Google/Firebase project configuration.

## Firestore

Cloud application data is UID-owned under `/users/{uid}/...`.

Read-only public sharing is under `/shares/{token}` and is bearer-token controlled.

The current canonical rules are stored in repository root `firestore.rules`.

Do not replace them with a broadly authenticated rule merely to solve a setup error.

## Production setup order

```text
Firebase project
  ↓
Web app registration
  ↓
Google provider
  ↓
Authorized production domain
  ↓
Firestore database
  ↓
Deploy firestore.rules
  ↓
Set Vercel env
  ↓
Production deploy
  ↓
Human auth/sync/share dry-run
```

## What this file does not certify

A configured Firebase project is not proof that production authentication, account linking, cross-device sync or sharing works end-to-end. Those require real credentials, the real deployed domain and real browser/device execution.
