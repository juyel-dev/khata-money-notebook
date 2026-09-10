"use client";

import Link from "next/link";
import type { Person } from "@/lib/db/schema";
import type { PersonTotals } from "@/lib/db/people";
import { formatMoney } from "@/lib/money";
import { avatarColorFor } from "@/lib/shared/notebookStyle";
import { useI18n } from "@/lib/i18n";

export function PersonRow({
  notebookId,
  person,
  totals,
  txnCount,
}: {
  notebookId: string;
  person: Person;
  totals: PersonTotals;
  /** Optional transaction count (Individuals tab) shown ahead of the summary */
  txnCount?: number;
}) {
  const { t, locale } = useI18n();
  const bg = avatarColorFor(person.name);
  const initial = person.name.trim().charAt(0).toUpperCase();

  const lastLine = totals.lastTransactionAt
    ? new Date(totals.lastTransactionAt).toLocaleDateString(
        locale === "bn" ? "bn-BD" : "en-IN",
        {
          day: "numeric",
          month: "short",
          numberingSystem: "latn",
        }
      )
    : "";

  return (
    <Link
      href={`/notebook/${notebookId}/person/${person.id}`}
      className="flex items-center gap-3 p-3.5 mb-2.5 bg-paper-card border border-rule rounded-2xl shadow-sm active:opacity-80"
    >
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[#241F16] shrink-0"
        style={{ backgroundColor: bg }}
      >
        {initial}
      </span>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink truncate">{person.name}</div>

        {(txnCount != null || lastLine) && (
          <div className="text-xs text-ink-dim truncate">
            {txnCount != null
              ? t(txnCount === 1 ? "notebook.txnCountOne" : "notebook.txnCount", {
                  count: txnCount,
                })
              : null}
            {txnCount != null && lastLine ? " · " : null}
            {lastLine ? `${t("notebook.last")} · ${lastLine}` : null}
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1 text-[11px] font-semibold tabular-nums">
        {totals.totalGiven > 0 && (
          <span className="rounded-full bg-owe-you-soft text-owe-you px-2.5 py-1 whitespace-nowrap">
            {t("person.totalGiven")} {formatMoney(totals.totalGiven)}
          </span>
        )}

        {totals.totalTaken > 0 && (
          <span className="rounded-full bg-you-owe-soft text-you-owe px-2.5 py-1 whitespace-nowrap">
            {t("person.totalTaken")} {formatMoney(totals.totalTaken)}
          </span>
        )}
      </div>
    </Link>
  );
}
