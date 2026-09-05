"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db/schema";
import { getPersonTotals } from "@/lib/db/people";
import { getPersonTransactions } from "@/lib/db/transactions";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { formatMoney } from "@/lib/money";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";

export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string; personId: string }>;
}) {
  const { id, personId } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const openAddSheet = useUIStore((s) => s.openAddSheet);

  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const totals = useLiveQuery(() => getPersonTotals(personId), [personId]);
  const transactions = useLiveQuery(() => getPersonTransactions(personId), [personId]);

  if (!person || !totals) return null;

  const badge =
    totals.net > 0
      ? { label: `${t("notebook.owesYou")} ${formatMoney(totals.net)}`, cls: "text-owe-you" }
      : totals.net < 0
      ? { label: `${t("notebook.youOwe")} ${formatMoney(-totals.net)}`, cls: "text-you-owe" }
      : { label: t("notebook.settled"), cls: "text-neutral-settled" };

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-1">
        <button onClick={() => router.back()} className="p-2 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-semibold text-ink truncate">{person.name}</span>
      </div>

      <div className="px-6 pt-3 pb-5 text-center">
        <div className={`text-3xl font-bold tabular-nums ${badge.cls}`}>{badge.label}</div>
        <div className="flex justify-center gap-6 mt-3 text-xs text-ink-dim">
          <span>
            {t("person.totalGiven")}: <span className="tabular-nums font-medium text-ink">{formatMoney(totals.totalGiven)}</span>
          </span>
          <span>
            {t("person.totalTaken")}: <span className="tabular-nums font-medium text-ink">{formatMoney(totals.totalTaken)}</span>
          </span>
        </div>
      </div>

      <div className="px-5">
        {transactions?.map((txn) => (
          <TransactionRow key={txn.id} txn={txn} primaryLabel={txn.note || (txn.type === "gave" ? t("notebook.gave") : t("notebook.got"))} />
        ))}
      </div>

      <div className="fixed bottom-20 inset-x-0 z-20 max-w-md mx-auto px-5">
        <div className="flex gap-3">
          <button
            onClick={() => openAddSheet({ notebookId: id, type: "gave", personId })}
            className="flex-1 rounded-full border-2 border-owe-you text-owe-you font-semibold py-3.5 bg-paper shadow-md"
          >
            {t("notebook.gave")}
          </button>
          <button
            onClick={() => openAddSheet({ notebookId: id, type: "got", personId })}
            className="flex-1 rounded-full bg-accent text-paper font-semibold py-3.5 shadow-md"
          >
            {t("notebook.got")}
          </button>
        </div>
      </div>
      <div className="h-20" />
    </div>
  );
}
