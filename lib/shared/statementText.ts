import type { Transaction } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";

const RULE = "──────────────";

// Same date format TransactionRow uses, minus the time (a statement line
// doesn't need minute-level precision the way a live list does).
function formatDate(occurredAt: number, locale: string): string {
  return new Date(occurredAt).toLocaleString(locale === "bn" ? "bn-BD" : "en-IN", {
    day: "numeric",
    month: "short",
    numberingSystem: "latn",
  });
}

// Plain-text statement for one person, meant for pasting into WhatsApp/SMS.
// Entirely local — no account or network involved, unlike the cloud share
// link. Newest-first, matching getPersonTransactions()'s own order (same
// source of truth as the in-app list, not a separately invented one).
export function buildPersonStatementText({
  notebookName,
  personName,
  transactions,
  locale,
}: {
  notebookName: string;
  personName: string;
  transactions: Transaction[];
  locale: string;
}): string {
  const lines = transactions.map((txn) => {
    const sign = txn.type === "gave" ? "−" : "+";
    const amount = `${sign}${formatMoney(txn.amount)}`;
    const note = txn.note ? ` (${txn.note})` : "";
    return `${formatDate(txn.occurredAt, locale)} — ${amount}${note}`;
  });

  return [`${notebookName} — ${personName}`, RULE, ...lines, RULE].join("\n");
}
