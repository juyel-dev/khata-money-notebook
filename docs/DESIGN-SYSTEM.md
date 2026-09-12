# Design System

> Visual language for agents. Preserve the paper-ledger character; do not drift toward a generic fintech dashboard.

## Direction

**A real paper ledger, digitized — not a fintech dashboard.**

The product should feel calm, trustworthy and fast. Visual sophistication belongs in hierarchy and craft, not decoration.

## Palette

Current semantic tokens live in `app/globals.css`. The design thesis remains:

```text
warm paper background
warm ink text
deep ledger green primary accent
terracotta for `দিলাম` / money-out emphasis
neutral ink-dim metadata
subtle paper/ledger rules
```

Do not introduce blue-gradient SaaS styling, glassmorphism or KPI-dashboard surfaces.

## Typography

The repository uses the current font setup in the root layout/CSS. Preserve readable Bengali and Latin pairing and make money amounts visually stable.

Amounts should use tabular numerals where the existing token/component supports it.

## Layout

- Mobile-first.
- Touch targets should remain comfortably tappable.
- Use the existing spacing/radius/shadow vocabulary before inventing new tokens.
- Prefer flat ledger rows and restrained cards over nested card-in-card decoration.
- Bottom sheets should feel like physical surfaces entering from the bottom.

## Core information hierarchy

Home:

```text
header
↓
banners when configured
↓
Khata cards
```

Khata detail:

```text
Khata header
↓
balance
↓
Transactions / Individuals tabs
↓
ledger content
↓
sticky দিলাম / নিলাম actions
```

Transactions are the default tab.

## Notebook cards

Notebook cards should communicate quickly:

- notebook identity
- current balance
- useful compact metadata already implemented
- pinned state when applicable
- group/organization context when the current UI exposes it

Do not turn cards into finance-dashboard KPI blocks.

## Transaction rows

Rows should scan like a paper ledger:

- person/context
- `দিলাম` or `নিলাম` semantic signal
- note/date metadata when applicable
- amount with strong numeric hierarchy

Avoid debt-summary badges as the default interaction pattern.

## Individuals

Individuals are a derived navigation view. Their cards should primarily identify a person and show useful context/count as implemented.

Do not add `মোট দিলাম`, `মোট নিলাম`, owed/debt balances or other accounting-summary widgets unless explicitly introduced as a product decision.

## Entry sheet

Transaction entry is the highest-frequency flow:

```text
type
↓
amount
↓
person
↓
date/time
↓
note
↓
save/update
```

Keep it compact, thumb-friendly and visually quiet.

## Sharing UI

Share is accessed from a Khata's actions menu.

The product language should make the distinction clear:

- share this Khata
- share one individual

Do not present sharing as collaboration or editing.

## Status/error UI

Sync status should be informative but subordinate to the ledger. Avoid persistent dashboards for transport details.

Actionable failures belong in actionable UI; harmless confirmations can use the existing toast pattern.

## Motion

Motion reinforces structure:

- sheet enters/exits vertically
- tab state changes are subtle
- balance updates can use a restrained confirmation pulse
- no playful bouncing or decorative motion in routine ledger actions

## Agent rule

Before adding a new component style, search `app/globals.css` and adjacent feature components for an existing token/pattern. Reuse before introducing another visual vocabulary.
