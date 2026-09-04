"use client";

import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";

export function TransactionRow({
  txn,
  primaryLabel,
  notebookLabel,
}: {
  txn: Transaction;
  /** Person name (notebook-wide views) or note (person-detail view) shown as the primary line */
  primaryLabel: string;
  /** Optional notebook name/color dot shown for combined History view */
  notebookLabel?: React.ReactNode;
}) {
  const { locale } = useI18n();
  const openEditSheet = useUIStore((s) => s.openEditSheet);
  const isGave = txn.type === "gave";

  const dateStr = new Date(txn.occurredAt).toLocaleString(locale === "bn" ? "bn-BD" : "en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <button
      onClick={() => openEditSheet({ notebookId: txn.notebookId, transactionId: txn.id })}
      className="w-full flex items-center gap-3 py-3 border-b border-rule text-left active:opacity-70"
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isGave ? "bg-owe-you-soft text-owe-you" : "bg-you-owe-soft text-you-owe"
        }`}
      >
        {isGave ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink truncate">{primaryLabel}</div>
        <div className="text-xs text-ink-dim flex items-center gap-1.5">
          {notebookLabel}
          {dateStr}
        </div>
      </div>
      <div className={`tabular-nums font-bold ${isGave ? "text-owe-you" : "text-you-owe"}`}>
        {isGave ? "−" : "+"}
        {formatMoney(txn.amount)}
      </div>
    </button>
  );
}
