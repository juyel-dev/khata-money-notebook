# Design System

## Design direction in one line

**A real paper ledger, digitized — not a fintech dashboard.** Warm, calm, high-contrast numbers, generous tap targets, almost no chrome. If a screen could be mistaken for a stock-trading app or a generic admin panel, it's wrong.

## Color palette

Base: warm off-white "paper," not clinical white. One confident accent (deep ledger-green, evokes money/trust without going full fintech-blue). Two clear semantic colors for the owe/owed distinction — this is the single most important color signal in the app.

```
--color-paper:        #FBF7EF   /* main background — warm off-white, not #FFFFFF */
--color-paper-dark:    #14140F   /* dark mode background — warm near-black, not pure black */
--color-ink:           #241F16   /* primary text — warm near-black, "ink on paper" */
--color-ink-dim:        #6B6455  /* secondary text */
--color-rule:           #E4DCC8  /* hairlines / row dividers — like ledger paper rules */

--color-accent:         #2F6B4F  /* primary brand accent — deep ledger green (buttons, active states) */
--color-accent-soft:     #E4EFE7  /* accent tint background (chips, selected states) */

--color-owe-you:         #B4491F  /* "they owe you" / money coming — warm terracotta, NOT alarm-red */
--color-owe-you-soft:     #F6E4DA
--color-you-owe:           #2F6B4F  /* "you owe them" reuses accent green — deliberate: green = balance in their favor is not a "danger" state */
--color-you-owe-soft:       #E4EFE7

--color-neutral-settled:    #6B6455  /* "settled" state — same tone as dim text, deliberately unremarkable */

--color-danger:              #A13A2E  /* destructive actions only (delete notebook), used nowhere else */
```

Rationale for owe-you/you-owe: avoid the reflexive red=bad/green=good banking convention here, because "you owe someone" is a completely normal, neutral daily-business state for a shopkeeper, not a warning. Using alarm-red for it would add false anxiety to routine bookkeeping. Terracotta (warm, attention-getting but not alarming) marks "money is owed to you"; the brand green marks "you owe" — both are just information, not verdicts.

## Typography

Two-font system, both required to render Bengali cleanly at the same visual weight as English (no mismatched line-height between scripts):

- **UI / Latin text:** `Inter` — humanist, friendly, excellent number legibility (critical for a money app — tabular figures).
- **Bengali text:** `Noto Sans Bengali` — pairs cleanly with Inter at matching x-height/weight, avoids the "half the app looks unfinished" problem common when Bengali is an afterthought font.
- **Numbers everywhere (balances, amounts):** `font-variant-numeric: tabular-nums` so digits align in columns (person list, transaction rows) — non-negotiable for a ledger app.

Scale (mobile-first, rem):
```
--text-display: 2.25rem / 700   /* current balance on notebook screen — the single biggest number in the app */
--text-h1:      1.5rem  / 700   /* screen titles */
--text-h2:      1.125rem/ 600   /* section headers, person name in list */
--text-body:    1rem    / 400   /* default */
--text-small:   0.875rem/ 400   /* timestamps, notes, secondary metadata */
--text-caption: 0.75rem / 500   /* labels, badges */
```

## Spacing & shape

- Base unit: 4px. Standard paddings: 12/16/24px.
- Corner radius: **12px** on cards and sheets, **999px (full pill)** on buttons and badges — soft and approachable, not sharp SaaS-card edges, not overly rounded "toy" bubble style either.
- Row-based lists (people, transactions) use a **hairline divider** (`--color-rule`) rather than card-in-card shadows, to reinforce the "ledger page" feel over "app dashboard" feel.
- Shadows are minimal: one soft elevation level for the bottom sheet and FAB only. No card shadows on list rows — flat, paper-like.

## Core components (visual spec)

### Balance header (top of a Notebook screen)
Full-width band in `--color-accent` (or paper with accent text — see SCREENS.md for exact treatment), notebook name small at top, current balance in `--text-display` size dead center, opening balance + "as of [date]" in `--text-caption` beneath it.

### Notebook card (Home screen list)
Left: colored icon chip (notebook's chosen color/icon from a fixed set of ~8). Middle: notebook name (h2) + person count (`--text-small`, dim). Right: current balance, bold, tabular-nums, colored green/terracotta/dim by sign.

### Person row (Notebook detail screen)
Left: initial-avatar circle (first letter of name, background = deterministic pastel from a fixed 6-color set, not random). Middle: name (h2) + "Last: [gave/got] ₹X on [date]" (`--text-small`, dim). Right: net balance badge — "Owes you ₹X" (terracotta) / "You owe ₹X" (green) / "Settled" (dim), pill-shaped.

### Transaction row (History / Person detail)
Left: colored dot or small icon indicating gave (↑, terracotta) vs got (↓, green). Middle: person name (if in notebook-wide history) or note (if in person detail) as primary line, date+time as secondary line (`--text-small`). Right: amount, bold, tabular-nums, colored by type.

### Gave/Got entry buttons
Two large pill buttons side-by-side, equal width, min-height 56px, at the bottom of the Notebook detail screen (thumb-reachable). "Gave" = outlined/ghost in `--color-owe-you` tone (money leaving), "Got" = filled in `--color-accent` (money arriving) — reinforces the color language established above.

### Transaction entry sheet (bottom sheet, not full page nav)
Slides up from bottom (Framer Motion spring, ~300ms). Big amount field first (numeric keypad auto-focused), then person (searchable dropdown + "add new person" inline — never a separate screen), then date/time (defaults to now, tap to edit via native picker), then optional note (single line). One full-width Save button, pill, accent-filled, sticky at bottom of the sheet. This is the highest-frequency interaction in the app and must never require more than this one sheet.

### Home banner (auto-swipe carousel)
Full-width rounded-12px card at top of Home, fixed height (~120px), auto-advances every 5s (pauses on touch), dot indicators beneath. Tap → opens the linked URL in a new tab and copies it to clipboard with a small toast confirmation ("Link copied"), mirroring the referenced Claude-app banner pattern. Used for optional announcements/tips — never ads, never used to upsell within the app itself in v1.

### Undo toast
Bottom-anchored, slides up, `--color-ink` background with `--color-paper` text (inverted, high contrast), auto-dismisses after 5s, "Undo" as an underlined text action, not a button — keeps it lightweight since it's a frequent, low-stakes confirmation.

## Dark mode

Supported from v1 (a shop is often lit poorly / used at night). Token-swap only (see `--color-paper-dark` above) — no separate dark-specific component variants needed if all components consume tokens, not raw colors.

## Motion principles

- Motion is used to reinforce spatial hierarchy (sheets slide from the direction they "live" in), never for decoration.
- Standard easing: `ease-out`, 200–300ms. Nothing bounces except the banner dot indicator transition (subtle).
- Number changes (balance updating after a save) use a brief scale/opacity pulse on the changed digits, not a full re-render flash — confirms the save happened without being distracting.
