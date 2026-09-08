"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Pin } from "lucide-react";
import type { Notebook } from "@/lib/db/schema";
import { getNotebookBalance } from "@/lib/db/notebooks";
import { db } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";
import { colorHex } from "@/lib/shared/notebookStyle";
import { NOTEBOOK_ICON_MAP } from "./icons";
import { useI18n } from "@/lib/i18n";

export function NotebookCard({ notebook }: { notebook: Notebook }) {
  const { t } = useI18n();
  const balance = useLiveQuery(() => getNotebookBalance(notebook.id), [notebook.id]);
  const peopleCount = useLiveQuery(
    () => db.people.where("notebookId").equals(notebook.id).count(),
    [notebook.id]
  );
  const Icon = NOTEBOOK_ICON_MAP[notebook.icon];
  const hex = colorHex(notebook.color);
  const balanceColor =
    balance == null ? "text-ink" : balance > 0 ? "text-you-owe" : balance < 0 ? "text-owe-you" : "text-ink-dim";

  return (
    <Link
      href={`/notebook/${notebook.id}`}
      className="flex items-center gap-3 p-3.5 mb-2.5 bg-paper-card border border-rule rounded-2xl shadow-sm active:opacity-80"
    >
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: hex }}
      >
        <Icon size={19} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-h2 font-semibold text-ink truncate flex items-center gap-1.5">
          {notebook.pinned && <Pin size={12} className="text-accent shrink-0" fill="currentColor" />}
          <span className="truncate">{notebook.name}</span>
        </div>
        <div className="text-xs text-ink-dim">
          {peopleCount ?? 0} {peopleCount === 1 ? t("home.person") : t("home.people")}
        </div>
      </div>
      <div className={`tabular-nums font-bold ${balanceColor}`}>
        {balance != null ? formatMoney(balance) : "…"}
      </div>
    </Link>
  );
}
