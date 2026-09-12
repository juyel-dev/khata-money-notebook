# Planning

> Product intent and non-goals. This is a product constraint document, not a list of implementation details.

## User/job

Khata is designed around a non-technical small-business user who wants a fast digital notebook for money movement.

The core job is:

- open the relevant Khata
- know its current cash balance
- record `দিলাম` / `নিলাম`
- attach the transaction to a person and time
- optionally add a short note
- review the chronological ledger

The app should feel as direct as writing in a paper khata, without requiring a calculator app or a finance dashboard.

## Product model

Core entities:

- Notebook
- NotebookGroup
- Person
- Transaction

`Individuals` is a derived view, not a fourth accounting entity.

Cloud account identity is optional for local use. Google/Firebase identity becomes necessary for cloud sync and sharing.

## Non-negotiable UX principles

1. **Ledger first.** The Khata detail page opens on Transactions.
2. **One obvious next action.** Avoid navigation depth for frequent entry.
3. **Numbers are primary.** Amounts and balance must be easy to scan.
4. **Offline first.** Local writes do not wait for network.
5. **No fake financial complexity.** Do not turn simple transaction facts into debt-management UI.
6. **Bengali first-class.** Layout and copy must work naturally in Bengali.
7. **Paper-ledger aesthetic.** Avoid generic fintech/admin-dashboard visual language.
8. **Engineering can scale; product surface stays small.** Sophistication belongs in reliability, not in extra screens/features.

## Current navigation model

```text
HOME
  ↓
KHATA DETAILS
  ├── TRANSACTIONS  ← default
  └── INDIVIDUALS
        ↓
      PERSON DETAIL
```

Share is accessed from a Khata's actions menu and produces a public read-only snapshot.

## Currency

The data layer stores integer paise. The UI uses the shared money formatter at the presentation boundary.

Do not introduce multi-currency without a separate product decision.

## Cloud product boundary

Firebase/Auth/Firestore are additive infrastructure for:

- Google identity
- durable sync
- read-only snapshot sharing

They do not turn Khata into a collaborative workspace.

## Explicit non-goals

Do not add without a deliberate new product phase:

- charts or dashboards
- KPI/finance analytics
- budgeting or savings goals
- recurring transactions
- categories/tags as a new bookkeeping taxonomy
- multi-currency
- live collaborative editing
- viewer accounts
- debt-management/settlement workflows
- arbitrary accounting reports
- server-side database replacing Dexie
- unnecessary backend services

## Agent interpretation rule

When a feature request appears to conflict with this document, do not “split the difference” silently. Identify the conflict and require an explicit product decision before implementing a new product surface.
