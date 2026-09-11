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
  actionLabel,
}: {
  txn: Transaction;
  /** Person name (notebook-wide views) or note (person-detail view) shown as the primary line */
  primaryLabel: string;
  /** Optional notebook name/color dot shown for combined History view */
  notebookLabel?: React.ReactNode;
  /** Optional action word (দিলাম/নিলাম) shown ahead of the date line */
  actionLabel?: string;
}) {
  const { locale } = useI18n();
  const openEditSheet = useUIStore((s) => s.openEditSheet);
  const isGave = txn.type === "gave";

  const dateStr = new Date(txn.occurredAt).toLocaleString(
    locale === "bn" ? "bn-BD" : "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      numberingSystem: "latn",
    }
  );

  return (
    <button
      onClick={() => openEditSheet({ notebookId: txn.notebookId, transactionId: txn.id })}
      className="group w-full flex items-center gap-3 py-3 border-b border-rule/80 text-left transition-colors active:opacity-70"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
          isGave ? "bg-owe-you-soft text-owe-you" : "bg-you-owe-soft text-you-owe"
        }`}
      >
        {isGave ? <ArrowUpRight size={15} strokeWidth={2} /> : <ArrowDownLeft size={15} strokeWidth={2} />}
      </span>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="line-clamp-2 break-words text-[15px] font-medium leading-5 text-ink">
          {primaryLabel}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-4 text-ink-dim">
          {actionLabel && <span className="font-medium">{actionLabel} ·</span>}
          {notebookLabel}
          {dateStr}
        </div>
      </div>

      <div
        className={`shrink-0 tabular-nums text-[15px] font-semibold tracking-[-0.01em] ${
          isGave ? "text-owe-you" : "text-you-owe"
        }`}
      >
        {isGave ? "−" : "+"}
        {formatMoney(txn.amount)}
      </div>
    </button>
  );
}
