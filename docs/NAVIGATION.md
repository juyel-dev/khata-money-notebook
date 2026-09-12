# Navigation

> Current route and navigation contract. Read `SCREENS.md` for screen behavior.

## IA

```text
HOME
  ↓
KHATA DETAILS
  ├── TRANSACTIONS  ← default
  └── INDIVIDUALS
        ↓
      PERSON DETAIL
```

Secondary top-level surfaces:

```text
HOME / HISTORY / SETTINGS
```

Public share is outside the authenticated/local app hierarchy:

```text
/share/[token]
```

## Home-level navigation

The app shell provides the primary navigation pattern currently implemented in `components/nav/`.

Before changing labels or routes, inspect `BottomNav.tsx` and `HamburgerMenu.tsx`; this document is a contract map, not an excuse to invent new destinations.

Primary destinations include:

| Area | Route | Responsibility |
|---|---|---|
| Home | `/` | notebook list / primary landing |
| Add | sheet | transaction entry path |
| History | `/history` | cross-notebook chronological transactions |
| Settings | `/settings` | preferences, backup, archive, account/sync |
| About | `/about` | app information/share-app surface |

## Khata routes

```text
/notebook/new
/notebook/[id]
/notebook/[id]/edit
/notebook/[id]/person/[personId]
```

Khata detail is transaction-first. The `Individuals` tab is secondary and derived from transactions.

## Transaction entry

Transaction add/edit is a bottom sheet, not a route.

Entry can be launched from:

- Khata detail `দিলাম` / `নিলাম`
- the global Add path when the current app shell exposes it
- person/transaction edit actions as implemented

Keep one transaction-entry implementation instead of creating route-specific variants.

## Khata actions

Current Khata detail kebab actions include the existing notebook controls and Share entry. Sharing is a product action, not a separate top-level navigation destination.

## Public sharing

```text
/share/[token]
```

This route is anonymous/read-only. It reads only the supplied share token snapshot and does not navigate through the owner's private `/users/{uid}` hierarchy.

## Settings paths

```text
/settings
/settings/backup
/settings/archived
```

Account/cloud sync is part of Settings rather than a separate top-level “cloud” section.

## Back behavior

Use normal App Router/browser/PWA back behavior for routed screens.

Transaction entry is a sheet: closing it returns to its previous context without creating a transaction-entry URL.

## Agent constraints

- Do not reintroduce an old “People first” Khata detail flow.
- Do not make Individuals the default tab.
- Do not add a route just to support a modal/sheet that already exists.
- Do not rename routes without a migration/redirect plan and a repository-wide caller search.
- Search all `Link`, `router.push`, route constants, tests and share URLs before changing a path.
