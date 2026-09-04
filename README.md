# Khata — Simple Money Notebook

> A dead-simple, offline-first PWA for tracking who-gave-who-what. Built for a shopkeeper who currently tracks business cash in his phone's Notes app and opens a separate calculator to do the math.

Khata (খাতা = "ledger/notebook" in Bengali/Hindi) replaces that workflow with one purpose-built screen: pick a notebook, tap Gave or Got, done. No dashboards, no charts, no budgeting features, no login wall. Just a fast digital version of the notebook shopkeepers have used for generations.

## Why this exists

The target user (non-technical, runs a cloth shop) needs three things and nothing else:
1. How much did I give/take, to/from whom, and when
2. What's my current balance right now
3. What's the running total with each person — do they owe me, or do I owe them

Every design decision in this repo optimizes for **speed of entry** and **zero learning curve**, not feature completeness.

## Documents in this repo

Read in this order:

1. [`docs/PLANNING.md`](docs/PLANNING.md) — product scope, user, principles, what's explicitly OUT of scope
2. [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — entities, IndexedDB schema, balance calculation logic
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — tech stack, folder structure, state management, PWA setup
4. [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) — colors, typography, spacing, component styles, motion
5. [`docs/NAVIGATION.md`](docs/NAVIGATION.md) — hamburger menu, bottom nav, routing map
6. [`docs/SCREENS.md`](docs/SCREENS.md) — every screen, every component, every state (empty/loading/error)
7. [`docs/I18N.md`](docs/I18N.md) — English/Bengali translation strategy
8. [`docs/PWA.md`](docs/PWA.md) — offline strategy, install prompt, service worker behavior
9. [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased build plan, MVP → Supabase sync

## Tech stack (short version)

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Dexie.js (IndexedDB) · Zustand · next-intl · Serwist (PWA/service worker) · Framer Motion · deployed on Vercel. Full rationale in `docs/ARCHITECTURE.md`.

## Status

Planning complete. No application code has been written yet — this repo currently contains only specification documents for a coding agent/developer to implement against.
