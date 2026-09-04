# Navigation

## Structure

Two navigation layers, as specified:
- **Bottom nav** — 3 items, always visible on top-level screens, for the primary "where am I in the app" switching.
- **Hamburger menu** — slide-in drawer from the left, for secondary/infrequent actions that don't need thumb-reach priority.

## Bottom nav (3 items)

| Icon | Label (EN) | Label (BN) | Destination | Purpose |
|---|---|---|---|---|
| 📒 Book | Home | হোম | `/` | Notebook list — the default landing screen |
| ➕ Plus (center, visually emphasized) | Add | যোগ করুন | Opens the transaction entry sheet directly | Fast-path: skip navigating into a notebook if there's only one, or if the last-used notebook should be pre-selected. If more than one notebook exists, this first prompts "which notebook?" as a single lightweight step before the same entry sheet from DESIGN-SYSTEM.md. |
| 🕘 Clock | History | ইতিহাস | `/history` (all notebooks combined, filterable by notebook) | See everything chronologically without drilling into a specific notebook |

The center "Add" item is visually distinct (raised pill / filled accent circle, slightly larger than the other two) since it's the single highest-frequency action in the entire app — this mirrors the "camera button in the middle" pattern from mainstream consumer apps, which the target user is very likely already familiar with from WhatsApp/Instagram-adjacent apps even without technical literacy.

Bottom nav is **not** shown inside the transaction entry sheet, person detail drill-down, or settings — those are stack-navigated (back button / swipe-back returns to the bottom-nav level), keeping the 3-item nav meaning "top level of the app" consistently.

## Hamburger menu (drawer)

Opened via a top-left icon on the Home screen's header (not duplicated on every screen — only Home needs it, since it's for infrequent, app-wide settings, not per-screen actions).

Contents, in order:
1. **Language** — English / বাংলা toggle (also duplicated in Settings, but surfaced here since it's a plausible very-first action for a Bengali-preferring user)
2. **Backup & Restore** — export/import JSON (see DATA-MODEL.md)
3. **Archived Notebooks** — restore or permanently delete
4. **Settings** — app-wide preferences (theme, default currency display already fixed to INR so minimal here)
5. **About / Share this app** — short about text + a native share-sheet button, since the user's brother may want to share it onward
6. **Help** — 3–4 line plain-language explainer of gave/got/owe, no tutorial video, no onboarding wizard — just a static reference for the rare moment of confusion

## Routing map

```
/                              Home (notebook list + banner)
/notebook/new                  New notebook form
/notebook/[id]                 Notebook detail (balance header + person list + Gave/Got buttons)
/notebook/[id]/edit            Edit notebook (name, opening balance, color/icon)
/notebook/[id]/person/[pid]    Person detail (their transaction history + net balance)
/history                       Combined chronological log, filterable by notebook
/settings                      Settings screen
/settings/backup               Backup & restore
/settings/archived              Archived notebooks
/about                          About / share / help
```

Transaction add/edit is **never** its own route — always the bottom sheet component, invoked from the notebook screen, the Add nav item, or a transaction row's edit action. This keeps the "add a transaction" interaction consistent everywhere it can be triggered from, per the two-tap-entry principle in PLANNING.md.

## Back behavior

Standard stack navigation (browser/PWA back = logical "up" one level), except: closing the transaction entry sheet (swipe down or tap outside) returns to wherever it was opened from without a route change, since it was never a route.
