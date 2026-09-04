# Khata — Simple Money Notebook

> A dead-simple, offline-first PWA for tracking who-gave-who-what. Built for a shopkeeper who currently tracks business cash in his phone's Notes app and opens a separate calculator to do the math.

Khata (খাতা = "ledger/notebook" in Bengali/Hindi) replaces that workflow with one purpose-built screen: pick a notebook, tap Gave or Got, done. No dashboards, no charts, no budgeting features, no login wall. Just a fast digital version of the notebook shopkeepers have used for generations.

## Status

**Phase 0 + Phase 1 (MVP) implemented** — this repo now contains both the full spec and a working app.

Working:
- Multiple notebooks, each with opening balance + live-computed current balance
- People per notebook with per-person totals (owes you / you owe / settled)
- Add/edit/delete transactions via the bottom sheet (Gave/Got, amount, person, date/time, note)
- Undo on delete (5s toast)
- Combined History screen with per-notebook filter, grouped by day
- Settings: language toggle (English/Bengali), JSON export/import backup, archive/restore/delete notebooks
- Offline-capable: Dexie/IndexedDB local storage, app-shell service worker, installable PWA manifest + icons
- Design system tokens (paper/ink/accent/owe-you/you-owe palette, Inter + Noto Sans Bengali) wired into Tailwind
- Clean `next build` and `eslint` with zero errors/warnings

Not yet done:
- Native speaker review pass on the Bengali strings (current `lib/i18n/bn.json` is a first-pass translation, flagged for review in `docs/I18N.md`)
- Home banner (auto-swipe carousel) component
- Dark mode toggle wiring (tokens exist in `app/globals.css`, no UI switch yet)
- **Deployed to Vercel** — not yet connected
- Supabase sync (Phase 2, intentionally deferred — see `docs/ROADMAP.md`)

## Local development

```bash
npm install
npm run dev
```

## Deploying to Vercel

Not yet done — connect this repo in the Vercel dashboard (or via the Vercel CLI/MCP) and it should deploy with zero config, since it's a standard Next.js App Router project. One thing to double check post-deploy: `next/font/google` needs outbound internet access at build time to fetch Inter and Noto Sans Bengali, which Vercel's build environment has by default (this was the one thing the sandbox this was built in couldn't reach).

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Dexie.js · Zustand · Framer Motion · lucide-react · a hand-rolled i18n context (not next-intl — simpler given this is a single-user local app, not a routed multi-locale site) · a minimal custom service worker (not Serwist yet — see the note at the top of `public/sw.js`).

## Planning documents

The full spec this app was built against — read these to understand *why* something is built the way it is, or to plan what comes next:

1. [`docs/PLANNING.md`](docs/PLANNING.md) — product scope, user, principles, what's explicitly OUT of scope
2. [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — entities, IndexedDB schema, balance calculation logic
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — tech stack, folder structure, state management, PWA setup
4. [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) — colors, typography, spacing, component styles, motion
5. [`docs/NAVIGATION.md`](docs/NAVIGATION.md) — hamburger menu, bottom nav, routing map
6. [`docs/SCREENS.md`](docs/SCREENS.md) — every screen, every component, every state (empty/loading/error)
7. [`docs/I18N.md`](docs/I18N.md) — English/Bengali translation strategy
8. [`docs/PWA.md`](docs/PWA.md) — offline strategy, install prompt, service worker behavior
9. [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased build plan, MVP → Supabase sync

## Repo structure

```
khata-money-notebook/
├── app/            # Next.js App Router — screens, layouts, PWA manifest
├── components/     # UI components (nav, notebook, person, transaction, shared, pwa)
├── lib/            # Dexie schema + queries, i18n, money formatting, Zustand store
├── public/         # PWA icons, manifest assets, service worker
└── docs/           # Full planning spec (read this to understand the "why")
```
