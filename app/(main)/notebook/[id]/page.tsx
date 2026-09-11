"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, MoreVertical, Pin, PinOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "@/lib/db/schema";
import { deriveIndividuals } from "@/lib/db/people";
import { getNotebookTransactions } from "@/lib/db/transactions";
import { BalanceHeader } from "@/components/notebook/BalanceHeader";
import { PersonRow } from "@/components/person/PersonRow";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { dayLabel, groupByDay } from "@/lib/shared/grouping";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";
import { archiveNotebook, setNotebookPinned } from "@/lib/db/notebooks";

type DetailTab = "transactions" | "individuals";

export default function NotebookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale } = useI18n();
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const [menuOpen, setMenuOpen] = useState(false);
  // Transactions is the default tab — the khata opens on its ledger.
  const [tab, setTab] = useState<DetailTab>("transactions");

  const notebook = useLiveQuery(() => db.notebooks.get(id), [id]);
  // Exactly two collection reads for both tabs — people resolve through a
  // Map, individuals derive from the same arrays. No per-row queries.
  const txns = useLiveQuery(() => getNotebookTransactions(id), [id]);
  const people = useLiveQuery(() => db.people.where("notebookId").equals(id).toArray(), [id]);

  const peopleMap = useMemo(() => new Map((people ?? []).map((p) => [p.id, p])), [people]);
  const grouped = useMemo(
    () => groupByDay(txns ?? [], (ts) => dayLabel(ts, t, locale)),
    [txns, t, locale]
  );
  const individuals = useMemo(
    () => deriveIndividuals(txns ?? [], people ?? []),
    [txns, people]
  );

  if (!notebook) return null;

  return (
    <div>
      <div className="flex items-center justify-between px-3 pt-4 pb-1 relative">
        <button onClick={() => router.push("/")} className="p-2 text-ink rounded-full active:bg-accent-soft active:scale-90 transition-all">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-semibold text-ink truncate flex items-center gap-1.5">
          {notebook.pinned && <Pin size={14} className="text-accent shrink-0" fill="currentColor" />}
          {notebook.name}
        </span>
        <button onClick={() => setMenuOpen((v) => !v)} className="p-2 text-ink">
          <MoreVertical size={20} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-3 top-12 z-40 bg-paper-card border border-rule rounded-xl shadow-lg overflow-hidden w-52"
              >
                <button
                  onClick={() => {
                    setNotebookPinned(id, !notebook.pinned);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-ink hover:bg-accent-soft"
                >
                  {notebook.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  {notebook.pinned ? t("notebook.unpinAction") : t("notebook.pinAction")}
                </button>
                <Link
                  href={`/notebook/${id}/edit`}
                  className="block px-4 py-3 text-sm text-ink hover:bg-accent-soft"
                >
                  {t("notebook.editNotebook")}
                </Link>
                <button
                  onClick={async () => {
                    await archiveNotebook(id, true);
                    router.push("/");
                  }}
                  className="block w-full text-left px-4 py-3 text-sm text-danger hover:bg-accent-soft"
                >
                  {t("notebook.archiveNotebook")}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <BalanceHeader notebook={notebook} />

      {/* Tab bar — part of the header hierarchy, compact by design */}
      <div
        role="tablist"
        aria-label={t("notebook.tabsLabel")}
        className="mx-5 mt-1 mb-3 flex rounded-full border border-rule bg-paper-card p-1"
      >
        {(["transactions", "individuals"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`khata-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`khata-panel-${key}`}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              tab === key ? "bg-accent text-paper shadow-sm" : "text-ink-dim"
            }`}
          >
            {key === "transactions" ? t("notebook.tabsTransactions") : t("notebook.tabsIndividuals")}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`khata-panel-${tab}`}
        aria-labelledby={`khata-tab-${tab}`}
        className="px-5"
      >
        {tab === "transactions" ? (
          !txns ? null : txns.length === 0 ? (
            <EmptyState
              illustration="/illustrations/empty-entries.svg"
              title={t("notebook.emptyTransactionsTitle")}
              body={t("notebook.emptyTransactionsBody")}
            />
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-2">
                <div className="sticky top-0 bg-paper text-xs font-semibold uppercase tracking-wide text-ink-dim py-2">
                  {group.label}
                </div>
                {group.items.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn}
                    primaryLabel={peopleMap.get(txn.personId)?.name ?? ""}
                    actionLabel={txn.type === "gave" ? t("notebook.gave") : t("notebook.got")}
                  />
                ))}
              </div>
            ))
          )
        ) : !txns ? null : individuals.length === 0 ? (
          <EmptyState
            illustration="/illustrations/empty-entries.svg"
            title={t("notebook.emptyIndividualsTitle")}
            body={t("notebook.emptyIndividualsBody")}
          />
        ) : (
          individuals.map((entry) => (
            <PersonRow
              key={entry.person.id}
              notebookId={id}
              person={entry.person}
              txnCount={entry.count}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-20 inset-x-0 z-20 max-w-md mx-auto px-5">
        <div className="flex gap-3">
          <button
            onClick={() => openAddSheet({ notebookId: id, type: "gave" })}
            className="flex-1 rounded-full border-2 border-owe-you text-owe-you font-semibold py-3.5 bg-paper shadow-md"
          >
            {t("notebook.gave")}
          </button>
          <button
            onClick={() => openAddSheet({ notebookId: id, type: "got" })}
            className="flex-1 rounded-full bg-accent text-paper font-semibold py-3.5 shadow-md"
          >
            {t("notebook.got")}
          </button>
        </div>
      </div>

      {/* spacer so list content isn't hidden behind the sticky Gave/Got buttons */}
      <div className="h-20" />
    </div>
  );
}