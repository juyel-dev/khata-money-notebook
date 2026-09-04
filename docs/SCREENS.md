# Screens

Every screen, every state. Written so a developer can implement without needing to ask "what happens if...".

---

## 1. Home (`/`)

**Purpose:** See all notebooks and their balances at a glance; enter one.

**Layout (top to bottom):**
1. Header: app wordmark/logo (small, left) + hamburger menu icon (left of wordmark) — no title text needed, logo is enough
2. Home banner (auto-swipe carousel, see DESIGN-SYSTEM.md) — only rendered if at least one banner item is configured; otherwise this whole block collapses (no empty placeholder)
3. Section label: "Your notebooks" (`--text-h2`, dim)
4. List of Notebook cards (see DESIGN-SYSTEM.md component spec), sorted by most-recently-used
5. Floating "+ New notebook" as a full-width dashed-border row at the bottom of the list (not a separate FAB — the center bottom-nav Add button is reserved for transactions, not notebooks, to avoid ambiguity)

**Empty state (zero notebooks — first launch):**
- Banner still shows if configured
- Center of screen: a simple line illustration (open notebook/ledger, flat single-color style matching the accent), heading "Start your first notebook", one line of body text explaining what a notebook is in plain language, single prominent "Create notebook" button
- No sample/demo data auto-created — an empty first-run confuses no one here, and fake sample rows in a money app are actively bad (risk of a confused user thinking it's real).

**Tap target behavior:**
- Tap a notebook card → `/notebook/[id]`
- Long-press a notebook card → inline quick actions (Edit, Archive) via a small popover, not a separate screen

---

## 2. New / Edit Notebook (`/notebook/new`, `/notebook/[id]/edit`)

**Purpose:** Minimal form, single screen, no wizard steps.

**Fields, in order:**
1. Notebook name (text input, autofocused, required)
2. Opening balance (numeric input, ₹ prefix, defaults to 0, optional — most users will start at 0 and let it build from transactions)
3. Color (row of ~8 fixed swatches, tap to select, one pre-selected by default)
4. Icon (row of ~8 fixed icons — shop, home, wallet, users, cart, briefcase, piggy bank, generic book — tap to select)

**Actions:** single full-width "Save notebook" pill button, sticky at bottom. Cancel = back navigation (no unsaved-changes warning needed — form is short enough that re-entry is trivial).

**Edit mode differences:** same layout, pre-filled, plus a "Archive this notebook" text link (not a button — de-emphasized, destructive-adjacent) below the Save button.

---

## 3. Notebook Detail (`/notebook/[id]`)

**Purpose:** The core screen. Balance + who owes what + fast entry.

**Layout (top to bottom):**
1. Header: back arrow, notebook name (center or left), overflow menu icon (⋮) top-right → Edit / Archive / Delete
2. **Balance header band** (see DESIGN-SYSTEM.md): current balance, large, center. Small caption beneath: "Opening balance ₹X · Updated [relative time]"
3. Section label: "People" with a small search/filter icon if the person list exceeds ~8 (inline search, not a separate screen)
4. List of Person rows (see DESIGN-SYSTEM.md), sorted by most recent transaction first
5. Sticky bottom area (above bottom nav): the two large **Gave / Got** pill buttons, side by side

**Empty state (notebook created, zero people/transactions yet):**
- Balance header still shows (equals opening balance)
- Where the person list would be: short line "No entries yet — tap Gave or Got below to add your first one" pointing visually toward the buttons beneath
- Gave/Got buttons still fully present and functional (this is the entry point, must never be hidden behind an empty state)

**Tap target behavior:**
- Tap a person row → `/notebook/[id]/person/[pid]`
- Tap Gave or Got → opens Transaction Entry Sheet (see section 6) with that type pre-selected and (if opened from a person row's quick-add, not applicable here) no person pre-filled — person is chosen inside the sheet

---

## 4. Person Detail (`/notebook/[id]/person/[pid]`)

**Purpose:** Full history with one person, and their net standing.

**Layout (top to bottom):**
1. Header: back arrow, person's name, overflow menu (Edit name, Delete person — only enabled if they have zero transactions, otherwise disabled with a short explanatory tooltip/toast)
2. Net balance band (smaller version of the notebook balance header): "Owes you ₹X" / "You owe ₹X" / "Settled", plus two smaller stat lines beneath: "Total given: ₹X" and "Total taken: ₹X"
3. Chronological list of Transaction rows (newest first) for this person only, each showing type icon, note (if any), date+time, amount
4. Sticky bottom: same Gave/Got buttons as notebook detail, but here the person is pre-filled in the resulting sheet (since context is already this person)

**Empty state:** cannot exist as a standalone empty state — a person only exists in the data model once they have at least one transaction (see NAVIGATION.md: people are added inline during transaction entry, not via a separate "add person" flow).

**Transaction row interactions:** tap a row → opens Transaction Entry Sheet pre-filled in edit mode; swipe left → reveals Delete (with the 5s undo toast, no confirm dialog, per DATA-MODEL.md).

---

## 5. History (`/history`)

**Purpose:** Everything, everywhere, chronologically — for when the user remembers "when" before they remember "which notebook" or "who."

**Layout:**
1. Header: "History" title, filter icon top-right
2. Filter row (collapsed by default, expands on tap): notebook multi-select chips, date range, type (gave/got/both)
3. Chronological list of Transaction rows across all (non-archived) notebooks, each row additionally showing a small notebook-color dot + notebook name and person name (since context isn't implicit here like it is in Person Detail)
4. Grouped by day with sticky date headers ("Today", "Yesterday", then actual dates) — critical for scanability in a long list

**Empty state:** "No transactions yet" with a short line pointing users back to a notebook via the bottom nav Home item.

---

## 6. Transaction Entry Sheet (bottom sheet, invoked from multiple places — not a route)

**Purpose:** The single highest-frequency screen in the app. Must be fast.

**Fields, in order, in one continuous sheet (no multi-step/wizard):**
1. **Type toggle** at top: Gave / Got segmented control, pre-selected based on entry point (or defaults to "Got" if opened from the neutral center Add nav button, since receiving is marginally more common in most small-cash businesses — confirm with user, easy to flip default)
2. **Amount** — large numeric field, ₹ prefix, numeric keyboard auto-opens, autofocused
3. **Person** — searchable combobox of existing people in this notebook; typing a name not in the list shows an inline "Add '[name]' as new person" option directly in the results, no separate screen/modal
4. **Date & time** — defaults to "now", shown as a single tappable row ("Today, 4:32 PM") that opens the native date/time picker on tap
5. **Note** — single-line text input, optional, placeholder text like "What was this for? (optional)"

**Primary action:** full-width "Save" pill button, sticky at the bottom of the sheet, disabled until Amount + Person are both filled.

**On save:** sheet closes with a downward slide, balance header (wherever visible beneath it) does the brief pulse animation from DESIGN-SYSTEM.md, and a small non-blocking toast confirms ("Saved — ₹500 to Rahim").

**Edit mode:** identical layout, pre-filled, "Save" becomes "Update", plus a "Delete" text link at the bottom (triggers the 5s-undo delete flow, sheet closes immediately on tap).

---

## 7. Settings (`/settings`)

Plain list of rows, grouped:

**Preferences**
- Language (English / বাংলা)
- Theme (Light / Dark / System)

**Data**
- Backup & Restore →
- Archived Notebooks →

**About**
- About Khata
- Share this app
- Help

No account/login section in v1 (see PLANNING.md non-goals) — this section is added in Phase 2 per ROADMAP.md, appearing here as a new "Account & Sync" group, not replacing anything.

---

## 8. Backup & Restore (`/settings/backup`)

- "Export backup" — single button, triggers JSON file generation + native share/download sheet, with a small "Last backup: [date]" line if one has been done before (tracked locally)
- "Import backup" — single button, opens native file picker, on selecting a valid file shows a plain-language warning ("This will add data from the backup file. Existing data won't be deleted.") before confirming — explicit here because it's the one genuinely risky action in the whole app around data integrity

---

## Global patterns used across screens

- **Loading state:** skeleton rows (matching the shape of Notebook/Person/Transaction rows), never a spinner-only blank screen — this is a local-first app so loads should be near-instant, but skeletons prevent flash-of-empty on slower devices.
- **Toasts:** used for confirmations (saved, deleted+undo, link copied), never for errors that need action — those get inline messaging instead.
- **Currency formatting:** every amount, everywhere, via the shared `lib/money.ts` formatter — no ad-hoc `₹${amount}` string concatenation anywhere in screen code.
