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
}: {
  notebookId: string;
  person: Person;
  totals: PersonTotals;
}) {
  const { t, locale } = useI18n();
  const bg = avatarColorFor(person.name);
  const initial = person.name.trim().charAt(0).toUpperCase();

  const badge =
    totals.net > 0
      ? { label: `${t("notebook.owesYou")} ${formatMoney(totals.net)}`, cls: "bg-owe-you-soft text-owe-you" }
      : totals.net < 0
      ? { label: `${t("notebook.youOwe")} ${formatMoney(-totals.net)}`, cls: "bg-you-owe-soft text-you-owe" }
      : { label: t("notebook.settled"), cls: "bg-transparent text-neutral-settled" };

  const lastLine = totals.lastTransactionAt
    ? new Date(totals.lastTransactionAt).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-IN", {
        day: "numeric",
        month: "short",
        numberingSystem: "latn",
      })
    : "";

  return (
    <Link
      href={`/notebook/${notebookId}/person/${person.id}`}
      className="flex items-center gap-3 py-3 border-b border-rule active:opacity-70"
    >
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-ink shrink-0"
        style={{ backgroundColor: bg }}
      >
        {initial}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink truncate">{person.name}</div>
        {lastLine && <div className="text-xs text-ink-dim">{t("notebook.last")} · {lastLine}</div>}
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.cls}`}>
        {badge.label}
      </span>
    </Link>
  );
}
