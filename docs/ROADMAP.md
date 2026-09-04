# Roadmap

Phased so an implementer (human or coding agent) always has a shippable, testable milestone rather than one giant build.

## Phase 0 — Foundation
- Next.js 14 + TypeScript + Tailwind project scaffold, deployed to Vercel from an empty shell (confirms the pipeline works before any feature code)
- Design tokens from DESIGN-SYSTEM.md wired into `tailwind.config`
- Dexie schema from DATA-MODEL.md, with a small seed/dev-only script for local testing (never shipped to production, never auto-run for real users — see "no fake sample data" in SCREENS.md)
- Base layout: app shell, bottom nav, hamburger drawer (structure only, screens are stubs)

**Done when:** empty app shell is installable as a PWA and deployed on Vercel.

## Phase 1 — Core ledger (this is the MVP the brother actually uses)
- Home screen: notebook list, create/edit/archive notebook
- Notebook detail: balance header, person list, Gave/Got buttons
- Transaction entry sheet: add + edit + delete (with undo)
- Person detail screen
- History screen with notebook filter
- English only at this stage is acceptable to unblock testing, but Bengali strings should be added before this phase is considered "done" — this app doesn't count as finished for its actual user until Bengali works

**Done when:** the target user (the brother) can fully replace his current Notes-app + calculator workflow with this app, in Bengali, offline, on his own phone.

## Phase 2 — Backup, polish, i18n completeness
- JSON export/import (Backup & Restore screen)
- Dark mode
- Full Bengali translation pass reviewed by a native speaker
- Home banner component (auto-swipe, tap-to-copy-link) wired to a simple config (even just a hardcoded array in v1 — no CMS needed yet)
- PWA install-prompt polish (iOS instructions, update-available toast)
- Empty states, loading skeletons, animation polish per DESIGN-SYSTEM.md motion principles

**Done when:** the app feels complete and trustworthy enough that the brother would recommend it to another shop owner (the stated success signal from the original brief).

## Phase 3 — Optional cloud sync (Supabase)
Only build this once Phase 1–2 are validated by real daily use. Explicitly optional and additive:

- Supabase project: `notebooks`, `people`, `transactions` tables mirroring the Dexie schema, with `user_id` ownership
- Auth: phone-number OTP login (most natural for this user base — avoid email/password for a non-technical audience) via Supabase Auth
- Sync strategy: local IndexedDB remains source of truth for offline use; a background sync layer pushes/pulls deltas when online, last-write-wins conflict resolution (acceptable for a single-user-per-account ledger — no concurrent-editor scenario in v1)
- Sync is **opt-in**: users who never create an account keep using the app exactly as in Phase 1–2, fully local, forever
- This is also the natural point to add multi-device support (same shop's ledger on the owner's phone and, say, a tablet at the counter)

**Done when:** a user can opt into an account, and their notebooks appear on a second device, without the local-only experience regressing for anyone who doesn't opt in.

## Explicitly not on this roadmap

Anything from the "Explicit non-goals" list in PLANNING.md (charts, budgeting, multi-currency, recurring transactions) stays out unless a future phase is deliberately proposed and scoped with the same rigor as the phases above — not added incrementally because "it'd be easy."
