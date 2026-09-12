# Khata — Simple Money Notebook

> Bengali-first, offline-first money notebook PWA. Fast ledger entry first; cloud sync and read-only sharing are opt-in additions.

## Current status

The repository contains the implemented local ledger, PWA/offline foundation, versioned backup/restore, Firebase Authentication, Firestore sync, first-account reconciliation, read-only share snapshots, and mobile-safe Google auth routing.

Current engineering baseline for this documentation refresh:

```text
80bc6224bc56011affd502919eec967e0690c634
```

The remaining production gate is real Firebase/Vercel human verification with real Google credentials/devices. See `docs/PRODUCTION-RUNBOOK.md` and `docs/ROADMAP.md`.

## Product boundary

Khata records:

- money the user `দিলাম` / `gave`
- money the user `নিলাম` / `got`
- person
- date/time
- amount
- optional note

It is intentionally **not** a debt-management system, collaborative ledger, budgeting tool, accounting dashboard, or analytics product.

## Architecture at a glance

```text
React / Next.js 16
       ↓
Dexie / IndexedDB  ← local operational source
       ↓
sync queue + sync engine
       ↕
Firebase Auth + Cloud Firestore

Khata share:
linked owner → sync → immutable /shares/{token} snapshot → anonymous viewer
```

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Dexie 4 / IndexedDB
- Firebase Authentication + Cloud Firestore
- Zustand
- Framer Motion
- lucide-react
- Vitest
- hand-rolled i18n context/messages (`en`, `bn`)
- custom service-worker/PWA implementation
- Vercel

## Run locally

```bash
npm install
npm run dev
```

Useful verification scripts:

```bash
npm test
npm run lint
npm run build
```

Firebase is configuration-driven. Without complete `NEXT_PUBLIC_FIREBASE_*` configuration, local/signed-out app usage must still fail soft rather than crash.

## Required Firebase client environment

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Do not place Firebase Admin/service-account credentials in these variables.

## Documentation for coding agents

Start with these, in order:

1. [`docs/AI-CONTEXT.md`](docs/AI-CONTEXT.md) — canonical onboarding and source-of-truth hierarchy
2. [`docs/ENGINEERING-INVARIANTS.md`](docs/ENGINEERING-INVARIANTS.md) — hard product/data/sync/security contracts
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — runtime architecture/module boundaries
4. [`docs/SYNC-ARCHITECTURE.md`](docs/SYNC-ARCHITECTURE.md) — sync engine contract
5. [`docs/DOCS-INDEX.md`](docs/DOCS-INDEX.md) — full documentation map

Topic-specific docs:

- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md)
- [`docs/ACCOUNT-LINKING.md`](docs/ACCOUNT-LINKING.md)
- [`docs/FIREBASE-SETUP.md`](docs/FIREBASE-SETUP.md)
- [`docs/FIRESTORE-ARCHITECTURE.md`](docs/FIRESTORE-ARCHITECTURE.md)
- [`docs/SHARING.md`](docs/SHARING.md)
- [`docs/PRODUCTION-RUNBOOK.md`](docs/PRODUCTION-RUNBOOK.md)
- [`docs/SCREENS.md`](docs/SCREENS.md)
- [`docs/NAVIGATION.md`](docs/NAVIGATION.md)
- [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)
- [`docs/I18N.md`](docs/I18N.md)
- [`docs/PWA.md`](docs/PWA.md)
- [`docs/SYNC-MERGE.md`](docs/SYNC-MERGE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/PLANNING.md`](docs/PLANNING.md)

## Repository map

```text
app/                  Next.js routes/app shell
components/           feature UI
lib/db/               Dexie schema/domain/backup
lib/firebase/         auth, account-link, reconciliation, sync, sharing
lib/shared/           shared helpers
public/               PWA assets/service worker
firestore.rules       Firestore authorization boundary
docs/                 agent-facing engineering/product contracts
```

## Agent workflow

Do not start by editing the first plausible file.

Read the current implementation, all relevant call sites, and the associated tests. For any signature/export/order change, search the whole repository for callers and old semantic assertions before editing.

Re-read every diff hunk before opening a PR. Documentation that becomes stale must be updated when the architecture actually changes.

## Production

Firebase/Vercel production setup and the human verification gate live in [`docs/PRODUCTION-RUNBOOK.md`](docs/PRODUCTION-RUNBOOK.md).

A green unit-test suite does not certify Google OAuth, Firestore permissions, cross-device sync, or real share/revoke behavior.
