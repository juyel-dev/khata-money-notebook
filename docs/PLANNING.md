# Planning

## The user

One real person, not a persona exercise: a non-technical shop owner (cloth/garments business) who currently records daily cash transactions in his phone's Notes app as free text, then opens a calculator app separately to work out totals. He is the bar for every UX decision — if he'd hesitate on a screen, the screen is wrong.

Implication: no jargon, no onboarding tutorial he has to read, no screen with more than one obvious next action, big tap targets, numbers always visible without scrolling.

## The job to be done

For each notebook (a business, or a category of money):
- Know the current balance right now, at a glance
- Record: gave ₹X to / got ₹X from [person], with date+time and an optional short note
- See running total per person — how much they owe, or are owed
- See a simple chronological log of everything

That's it. Everything else is explicitly excluded (see below).

## Core entities

- **Notebook** — a ledger (e.g. "Cloth Shop", "Personal Loans", "Family"). Has a name, an opening balance, and a running current balance.
- **Person** — someone money moves to/from within a notebook. Has a name and (derived) totals: total given, total taken, net balance.
- **Transaction** — one entry: type (gave/got), amount, person, date+time, optional note. Belongs to one notebook.

## Explicit non-goals (v1)

These were considered and deliberately cut to protect simplicity — do not add them without a real user request:

- Charts, graphs, spending breakdowns, category tags
- Budgeting, savings goals, recurring transactions
- Multi-currency (INR only)
- Cloud login as a hard requirement (local-first; Supabase sync comes later as *optional*)
- Complex reports/exports beyond a plain JSON/CSV backup
- Anything resembling a generic "finance dashboard" — no KPI tiles, no gradients-and-glass SaaS aesthetic

## Design principles (non-negotiable)

1. **One primary action per screen.** The home screen's job is "open a notebook." A notebook's job is "see balance + add a transaction."
2. **Numbers first.** Balance and amounts are the largest, boldest thing on any screen they appear on.
3. **Two-tap entry.** From a notebook screen: tap Gave/Got → fill amount+person → save. No multi-step wizards.
4. **Never lose data.** Every write goes straight to IndexedDB; there is no "unsaved draft" state a non-technical user can accidentally discard.
5. **Notebook aesthetic, not app aesthetic.** Warm paper tones, ledger-style rows, handwritten-adjacent accents — not blue-gradient SaaS, not Material dashboard defaults.
6. **Bilingual from day one.** English default, Bengali toggle, but *every* screen must be designed assuming Bengali text will run longer.
7. **Scalable code, minimal product.** The codebase should be structured to grow (Supabase sync, more languages, more notebook types) without the *product surface* growing unless truly needed.

## Currency & locale

- Currency: Indian Rupee (₹ / INR) only, formatted with Indian digit grouping (e.g. ₹1,23,456).
- Date/time: localized to device, 12-hour clock with AM/PM by default (editable per-transaction).
- Languages: English (default), Bengali (বাংলা). Architecture must support adding more later.
