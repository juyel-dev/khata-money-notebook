# Architecture

## Tech stack & rationale

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Best-supported path to a Vercel deploy, file-based routing keeps screen structure obvious, works fully client-rendered for the app shell (this is a local-first app — no server data-fetching needed for core flows) |
| Language | **TypeScript** | Money app — type safety on amounts/entities is not optional |
| Styling | **Tailwind CSS** | Fast to keep consistent with a small custom design-token set (see DESIGN-SYSTEM.md); no heavy component-library visual identity to fight against |
| UI primitives | **shadcn/ui** (unstyled Radix primitives, restyled per DESIGN-SYSTEM.md) | Accessible dialogs/sheets/dropdowns for free (bottom sheets, menus) without importing a whole "SaaS look" |
| Local database | **Dexie.js** (IndexedDB wrapper) | IndexedDB directly is painful; Dexie gives clean async queries + indexes + reactive `useLiveQuery` hook, ideal for the local-first model in DATA-MODEL.md |
| State (UI, not persisted) | **Zustand** | Tiny, no boilerplate, used only for ephemeral UI state (active notebook, sheet open/closed) — persisted data always comes from Dexie, never duplicated into a store |
| i18n | **next-intl** | Clean App Router support, straightforward `en`/`bn` message files, see I18N.md |
| PWA / service worker | **Serwist** (maintained successor to next-pwa/Workbox) | Offline-first caching, install prompt, background asset caching |
| Animation | **Framer Motion** | Used sparingly — page transitions, the home banner auto-swipe, the undo toast — never decorative |
| Deployment | **Vercel** | Matches stated goal; zero-config Next.js hosting |
| Future sync (Phase 2) | **Supabase** | Postgres + auth + realtime, added later as an *optional* account layer — see ROADMAP.md. Local IndexedDB remains source of truth for offline use even after sync is added. |

## Why fully client-side (no server database in v1)

This is a private ledger app for one person's own money records. There is no v1 requirement for a backend: everything reads/writes IndexedDB directly in the browser. Next.js is used purely as the app framework + build/deploy pipeline, not as a backend. This keeps the app genuinely offline-capable (core promise of the PWA) and avoids building auth/API infra before it's needed.

When Supabase is added (Phase 2), it becomes an **optional, additive sync layer** — the app must keep working fully offline with zero account for users who never opt in.

## Folder structure

```
khata/
├── app/
│   ├── layout.tsx                 # root layout: fonts, PWA meta, i18n provider
│   ├── (main)/
│   │   ├── layout.tsx              # app shell: hamburger + bottom nav
│   │   ├── page.tsx                 # Home — notebook list
│   │   ├── notebook/[id]/
│   │   │   ├── page.tsx              # Notebook detail — person list + balance
│   │   │   ├── person/[personId]/page.tsx   # Person detail — history + net
│   │   │   └── history/page.tsx      # Full chronological transaction log
│   │   ├── settings/page.tsx        # Settings — language, backup, about
│   │   └── notebook/new/page.tsx    # New notebook form
│   └── manifest.ts                 # PWA manifest
├── components/
│   ├── ui/                          # shadcn primitives, restyled
│   ├── notebook/                    # NotebookCard, NotebookForm, BalanceHeader
│   ├── transaction/                 # TransactionSheet (add/edit), TransactionRow
│   ├── person/                      # PersonCard, PersonBalanceBadge
│   ├── nav/                         # BottomNav, HamburgerMenu, HomeBanner
│   └── shared/                      # EmptyState, UndoToast, ConfirmDialog
├── lib/
│   ├── db/
│   │   ├── schema.ts                 # Dexie schema (DATA-MODEL.md)
│   │   ├── notebooks.ts              # CRUD + derived balance queries
│   │   ├── people.ts
│   │   └── transactions.ts
│   ├── money.ts                     # paise <-> rupee formatting helpers (Intl.NumberFormat en-IN)
│   ├── i18n/                        # next-intl config + en.json, bn.json
│   └── pwa/                         # Serwist service worker config
├── public/
│   ├── icons/                       # PWA icons, app icon set
│   └── manifest assets
├── docs/                            # this folder
└── ...config files (next.config, tailwind.config, tsconfig)
```

## State flow (how a screen gets data)

1. Screen component calls a Dexie `useLiveQuery` hook (e.g. `useNotebooks()`, `usePersonTransactions(personId)`).
2. Dexie queries IndexedDB directly; `useLiveQuery` re-renders automatically on any write — no manual cache invalidation, no Redux-style action dispatching for data.
3. Derived numbers (balances, per-person net) are computed in `lib/db/*.ts` query functions, colocated with the query, not scattered across components.
4. Zustand is touched only for things that are *not* persisted data: which bottom sheet is open, which notebook is currently "active" in a session, banner carousel index.

This keeps the mental model simple for whoever codes this: **Dexie is the single source of truth for data. Zustand is only for transient UI state.**

## PWA behavior summary (full detail in PWA.md)

- Installable (manifest + icons), works fully offline after first load.
- Service worker precaches the app shell; runtime-caches nothing external since there is no external data dependency in v1.
- No network requests required for any core flow (add/view/edit transactions, view balances).

## Non-functional requirements

- Cold start to interactive: must feel instant on a mid-range Android phone (this is the real target device, not desktop).
- All interactive targets ≥ 44×44px (non-technical user, likely on a 5–6" screen, one-handed use in a shop).
- No layout shift when Bengali text (typically 20–40% longer than English) is active.
