# Data Model

Local-first. All data lives in IndexedDB (via Dexie.js) on-device. No data leaves the device in v1 — Supabase sync is a later, optional phase (see `ROADMAP.md`).

## Entities

### Notebook
```
Notebook {
  id: string (uuid)
  name: string                    // "Cloth Shop", "Family", etc.
  openingBalance: number          // in paise (integer) to avoid float errors
  createdAt: number (epoch ms)
  updatedAt: number (epoch ms)
  archived: boolean               // soft-hide, never hard-delete by default
  color: string                   // one of a fixed accent palette, for visual distinction between notebooks
  icon: string                    // one of a fixed small icon set (shop, home, wallet, users, etc.)
}
```

### Person
```
Person {
  id: string (uuid)
  notebookId: string              // FK -> Notebook.id
  name: string
  phone?: string                  // optional, for future "share via WhatsApp" feature
  createdAt: number
}
```
Note: a person is scoped to one notebook, not global. If the same real person appears in two notebooks, they get two Person records. This matches the mental model of "this shop's ledger" vs "family ledger" being separate books — matches user's stated intent, avoids a merge-identity feature no one asked for.

### Transaction
```
Transaction {
  id: string (uuid)
  notebookId: string              // FK -> Notebook.id
  personId: string                // FK -> Person.id
  type: "gave" | "got"            // "gave" = money OUT (I gave to them), "got" = money IN (I got from them)
  amount: number                  // in paise (integer)
  note?: string                   // short free text, optional
  occurredAt: number (epoch ms)   // user-editable date+time of the transaction itself
  createdAt: number (epoch ms)    // when the record was actually saved (audit only, not shown prominently)
}
```

## Amount storage

Store amounts as **integer paise** (₹1 = 100), never floats. Format for display with `Intl.NumberFormat('en-IN')` (Indian digit grouping) at the presentation layer only. This avoids the classic 0.1 + 0.2 floating point bug in a money app.

## Balance calculation

**Notebook current balance** (derived, not stored — always computed):
```
currentBalance = openingBalance
  + sum(transactions where type == "got")
  - sum(transactions where type == "gave")
```
Mental model: "got" is money coming into my hand (balance goes up), "gave" is money leaving my hand (balance goes down). This matches how a shopkeeper thinks about their own cash-in-hand, not about the other person's debt.

**Per-person net** (derived):
```
totalGiven  = sum(transactions where personId == X and type == "gave")
totalTaken  = sum(transactions where personId == X and type == "got")
net         = totalGiven - totalTaken
```
- `net > 0` → they owe me `net` (I gave more than I took from them) → show as "Owes you ₹X" in the accent/red-adjacent tone
- `net < 0` → I owe them `|net|` → show as "You owe ₹X" in the accent/green-adjacent tone
- `net == 0` → "Settled"

This "owes you / you owe" framing is what makes the app instantly readable to a non-technical user — it must never be phrased as raw "gave/got totals" without the plain-language net line.

## Derived values are computed, not cached

For v1 scale (a shop owner's daily transactions — hundreds to low thousands of rows per notebook, not millions), balances are computed on read via an indexed Dexie query, not maintained as a running cached counter. This avoids an entire class of bugs (cache drift, double-counting on edit/delete) at negligible performance cost. Revisit only if a notebook exceeds ~10k transactions.

## IndexedDB indexes (Dexie schema)

```js
db.version(1).stores({
  notebooks: 'id, archived, createdAt',
  people:    'id, notebookId, name',
  transactions: 'id, notebookId, personId, occurredAt, type'
});
```

## Edit & delete rules

- Transactions and people can be edited or deleted (soft-delete with a 5-second "Undo" toast, not a confirm dialog — confirm dialogs are friction for a non-technical daily-use app; undo is safer *and* faster).
- Notebooks are archived, not deleted, by default. A separate "Delete permanently" action exists in notebook settings behind one extra confirm step, since it's destructive and rare.

## Backup / export

- Manual "Export backup" action (from Settings) serializes all notebooks/people/transactions to a single JSON file, offered via the browser's native share/download.
- Manual "Import backup" reads that JSON back in, with a clear warning if it would overwrite existing data.
- This is the v1 answer to "what if I lose my phone" — cloud sync (Phase 2, see ROADMAP.md) makes it automatic.
