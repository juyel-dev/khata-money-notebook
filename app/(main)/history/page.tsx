"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock } from "lucide-react";
import { db } from "@/lib/db/schema";
import { getAllTransactions } from "@/lib/db/transactions";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { HamburgerMenu } from "@/components/nav/HamburgerMenu";
import { useI18n } from "@/lib/i18n";
import { colorHex } from "@/lib/shared/notebookStyle";

function dayLabel(ts: number, t: (k: string) => string, locale: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return t("history.today");
  if (sameDay(d, yesterday)) return t("history.yesterday");
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const [filterNotebookId, setFilterNotebookId] = useState<string | "all">("all");

  const notebooks = useLiveQuery(() => db.notebooks.filter((n) => !n.archived).toArray(), []);
  const allTxns = useLiveQuery(() => getAllTransactions(), []);
  const people = useLiveQuery(() => db.people.toArray(), []);
  const notebookMap = useMemo(() => new Map((notebooks ?? []).map((n) => [n.id, n])), [notebooks]);
  const peopleMap = useMemo(() => new Map((people ?? []).map((p) => [p.id, p])), [people]);

  const filtered = useMemo(() => {
    if (!allTxns) return [];
    return filterNotebookId === "all" ? allTxns : allTxns.filter((t) => t.notebookId === filterNotebookId);
  }, [allTxns, filterNotebookId]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filtered }[] = [];
    for (const txn of filtered) {
      const label = dayLabel(txn.occurredAt, t, locale);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(txn);
      else groups.push({ label, items: [txn] });
    }
    return groups;
  }, [filtered, t, locale]);

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center gap-3 mb-3">
        <HamburgerMenu />
        <span className="text-lg font-bold text-ink">{t("history.title")}</span>
      </div>

      {notebooks && notebooks.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          <button
            onClick={() => setFilterNotebookId("all")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border ${
              filterNotebookId === "all" ? "bg-accent text-paper border-accent" : "border-rule text-ink-dim"
            }`}
          >
            {t("history.filterAll")}
          </button>
          {notebooks.map((nb) => (
            <button
              key={nb.id}
              onClick={() => setFilterNotebookId(nb.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border`}
              style={
                filterNotebookId === nb.id
                  ? { backgroundColor: colorHex(nb.color), borderColor: colorHex(nb.color), color: "#FBF7EF" }
                  : { borderColor: "var(--color-rule)", color: "var(--color-ink-dim)" }
              }
            >
              {nb.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} title={t("history.empty")} body={t("history.emptyBody")} />
      ) : (
        grouped.map((group) => (
          <div key={group.label} className="mb-2">
            <div className="sticky top-0 bg-paper text-xs font-semibold uppercase tracking-wide text-ink-dim py-2">
              {group.label}
            </div>
            {group.items.map((txn) => {
              const nb = notebookMap.get(txn.notebookId);
              const person = peopleMap.get(txn.personId);
              return (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  primaryLabel={person?.name ?? ""}
                  notebookLabel={
                    filterNotebookId === "all" && nb ? (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: colorHex(nb.color) }}
                        />
                        {nb.name} ·
                      </span>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
