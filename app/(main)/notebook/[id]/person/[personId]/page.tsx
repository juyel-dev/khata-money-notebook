"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db/schema";
import { getPersonTransactions } from "@/lib/db/transactions";
import { TransactionRow } from "@/components/transaction/TransactionRow";
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
  const transactions = useLiveQuery(() => getPersonTransactions(personId), [personId]);

  if (!person) return null;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-rule/60 px-3 pt-3.5 pb-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-ink transition-colors active:scale-90 active:bg-accent-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="min-w-0 truncate text-[17px] font-semibold leading-6 text-ink">
          {person.name}
        </span>
      </div>

      <div className="px-5 pt-3">
        {transactions?.map((txn) => (
          <TransactionRow
            key={txn.id}
            txn={txn}
            primaryLabel={txn.note || person.name}
          />
        ))}
      </div>

      <div className="fixed bottom-20 inset-x-0 z-20 max-w-md mx-auto px-5">
        <div className="flex gap-3">
          <button
            onClick={() => openAddSheet({ notebookId: id, type: "gave", personId })}
            className="flex-1 rounded-full border-2 border-owe-you bg-paper py-3.5 font-semibold text-owe-you shadow-md transition-transform active:scale-[0.99]"
          >
            {t("notebook.gave")}
          </button>
          <button
            onClick={() => openAddSheet({ notebookId: id, type: "got", personId })}
            className="flex-1 rounded-full bg-accent py-3.5 font-semibold text-paper shadow-md transition-transform active:scale-[0.99]"
          >
            {t("notebook.got")}
          </button>
        </div>
      </div>
      <div className="h-20" />
    </div>
  );
}
