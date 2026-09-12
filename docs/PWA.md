# PWA & Offline Strategy

> Current PWA contract. Cloud sync is additive; it must never become the only way to use the ledger.

## Core promise

After a successful initial load, the core ledger should remain usable without network access:

- open notebooks
- inspect balances
- view transactions
- add/edit/delete local transactions
- use local backup/restore

The service worker provides the app shell; Dexie provides data persistence.

## Service worker

Inspect the actual `public/sw.js` and build/runtime configuration before modifying caching behavior. Do not assume a library-based Serwist/Workbox setup from historical docs.

The service worker must not cache sensitive per-user Firestore data as a substitute for the application database.

## Firebase interaction

Cloud operations are intentionally network-dependent and optional:

```text
local ledger → Dexie
cloud sync   → Firestore when linked + online
```

A failed/offline Firebase request must not erase or block local ledger writes.

## Install

The app is intended to run as a standalone PWA. Installed standalone mode is also relevant to Firebase auth: the current auth implementation selects redirect auth for standalone/mobile contexts.

## Storage safety

Local storage persistence is a financial-record safety concern. Preserve any existing storage-persistence behavior and do not add an automatic data-clearing flow.

Manual JSON backup remains an independent recovery mechanism.

## Pull-down / reload safety

On mobile, a downward sheet gesture must not accidentally cause a browser/page reload. When changing sheet/scroll behavior, verify the interaction boundary carefully because this is a real PWA usability requirement.

## Offline test contract

Minimum regression scenario:

```text
load once
→ go offline
→ create notebook
→ add transactions
→ close/reopen app
→ verify data and derived balance
→ reconnect
→ if linked, allow sync
→ verify cloud/cross-device state
```

Do not describe cloud sync as the offline mechanism. Local Dexie persistence is the offline mechanism.

## Agent rules

- Keep service-worker scope narrow.
- Do not cache credentials or private cloud snapshots globally.
- Do not make offline local CRUD depend on network calls.
- Do not introduce forced reloads during active transaction entry.
- When changing install/auth behavior, test both normal browser and standalone PWA paths.
