# Screens

> Current UI behavior for agents. This describes the implementation target now; old v1 descriptions must not override current code.

## 1. Home (`/`)

Purpose: open and manage notebooks.

Current expectations:

- App header uses the current Khata navigation pattern.
- Configured home banners may be shown; the banner system is data-driven in `lib/banners.ts`.
- Notebook cards are the main content.
- A notebook may be pinned and grouped.
- New notebook remains a direct action.

A blank first-run state must remain simple and must not invent sample financial data.

## 2. New / Edit Notebook

Routes:

```text
/notebook/new
/notebook/[id]/edit
```

Notebook form edits the persisted notebook fields supported by the current model: name, opening balance, color, icon, and the existing optional organization fields as applicable to the current UI.

Do not infer new fields from old docs; inspect the form and domain helper before changing it.

## 3. Khata Detail (`/notebook/[id]`)

This is the central ledger screen.

Header:

- back to Home
- Khata name
- pinned indicator when applicable
- kebab actions
- Share entry
- Edit/archive/pin actions according to current UI

Balance header shows the derived notebook balance.

### Tabs

The page contains two tabs:

```text
Transactions  ← DEFAULT
Individuals
```

The transaction tab is the default because the ledger itself is the source-of-truth view.

### Transactions tab

- Shows all transactions in the notebook.
- Groups rows by day.
- Newest-first ordering is the normal scan order.
- Each row resolves the person's name from the notebook people map.
- Empty state explains that the first transaction can be added below.

### Individuals tab

- Derived from the notebook's transaction data and people data.
- Shows people who participate in transactions.
- Person cards are not a second accounting source.
- Do not turn these cards into debt-summary tiles or add `মোট দিলাম` / `মোট নিলাম` totals as a new primary pattern.

### Entry actions

Fixed bottom actions:

```text
দিলাম / Gave
নিলাম / Got
```

They open the transaction entry sheet. The selected type is pre-filled from the button.

## 4. Person Detail (`/notebook/[id]/person/[personId]`)

Purpose: inspect one person's transaction history.

The page is a filtered history view for that person. It must not become the default Khata view or a new debt-management dashboard.

Transaction rows remain editable/deletable through the existing transaction flow.

Any summary shown must follow the current implementation; do not reintroduce old `Owes you / You owe / Settled` copy merely because it appears in historical documentation.

## 5. History (`/history`)

Purpose: cross-notebook chronological transaction history.

The page aggregates transactions across notebooks and provides the current filtering/scan experience implemented in the repository.

Do not infer filters or routes from older screen specs; inspect `app/(main)/history/page.tsx` before extending the screen.

## 6. Transaction Entry Sheet

This remains a bottom sheet, not a route.

The sheet is shared by add/edit flows.

Core fields:

- type (`gave` or `got`)
- amount
- person
- date/time
- optional note

Person selection is part of the transaction flow; people are not a separate global-management screen.

Save/update writes to Dexie first. When cloud-linked, the corresponding mutation is captured for sync.

The sheet must remain fast, touch-friendly and usable offline.

## 7. Settings (`/settings`)

Settings is the app-wide control surface.

Current areas include language/theme/data/archived content and the account + cloud sync experience added by the Firebase phases.

When changing Settings, inspect the current page and connected components rather than restoring the old Phase-1 “no account” structure.

## 8. Backup & Restore (`/settings/backup`)

Current backup format:

```text
khata-backup / version 2
```

Export includes notebooks, groups, people and transactions.

Import is validated before mutation. Restore uses replacement semantics inside one Dexie transaction.

Do not describe backup as cloud sync. It remains a portable user-controlled file.

## 9. Archived Notebooks (`/settings/archived`)

Purpose: recover or permanently remove archived notebooks according to the current destructive-action flow.

Archival is not a sync deletion shortcut; cloud-linked deletes/archives follow the corresponding domain mutation semantics.

## 10. About (`/about`)

Static app information and app-sharing surfaces. Keep copy aligned with the current product vocabulary.

## 11. Public Share (`/share/[token]`)

Public, read-only snapshot viewer.

Viewer does not need to sign in.

The page reads a single bearer-token share and renders only its snapshot payload. It must never fall back to private `/users/{uid}` data.

The viewer should gracefully treat these cases as inaccessible:

- missing share
- inactive share
- expired share
- malformed snapshot
- invalid individual snapshot boundary

## 12. Account / cloud sync UI

Account is not a replacement for local use.

The current flow is:

```text
signed out local use
        ↓
Google sign-in
        ↓
Set up cloud sync
        ↓
first-link inspection
        ↓
link-only OR explicit reconciliation
        ↓
linked + normal sync
```

When linked, Settings exposes sync state and manual recovery/sync actions.

A cloud failure must not erase or disable the user's local ledger.

## Global UI rules

- Persisted data comes from Dexie/cloud domain code, not ad-hoc component state.
- Amount formatting uses the shared money formatter.
- Bengali copy is a first-class layout constraint.
- Do not add debt-management wording.
- Do not introduce dashboard/KPI cards.
- Error states should help the user recover rather than only show a generic toast.
- Destructive operations require the current established guard/undo pattern.

## Agent rule

Before changing a screen, inspect:

```text
route/page.tsx
relevant feature components
relevant lib/db or lib/firebase helpers
associated tests
```

Then update the focused docs if the intended screen contract has actually changed.
