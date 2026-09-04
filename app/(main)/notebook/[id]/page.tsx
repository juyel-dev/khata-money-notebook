"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, MoreVertical, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "@/lib/db/schema";
import { getPeopleWithTotals } from "@/lib/db/people";
import { BalanceHeader } from "@/components/notebook/BalanceHeader";
import { PersonRow } from "@/components/person/PersonRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";
import { archiveNotebook } from "@/lib/db/notebooks";

export default function NotebookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const [menuOpen, setMenuOpen] = useState(false);

  const notebook = useLiveQuery(() => db.notebooks.get(id), [id]);
  const people = useLiveQuery(() => getPeopleWithTotals(id), [id]);

  if (!notebook) return null;

  return (
    <div>
      <div className="flex items-center justify-between px-3 pt-4 pb-1 relative">
        <button onClick={() => router.push("/")} className="p-2 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-semibold text-ink truncate">{notebook.name}</span>
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
                className="absolute right-3 top-12 z-40 bg-paper border border-rule rounded-xl shadow-lg overflow-hidden w-48"
              >
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

      <div className="px-5">
        {people && people.length > 0 && (
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1 mt-2">
            {t("notebook.peopleSection")}
          </div>
        )}

        {people && people.length === 0 ? (
          <EmptyState icon={Users} title={t("notebook.emptyTitle")} body={t("notebook.emptyBody")} />
        ) : (
          people?.map((p) => <PersonRow key={p.id} notebookId={id} person={p} totals={p.totals} />)
        )}
      </div>

      <div className="fixed bottom-20 inset-x-0 max-w-md mx-auto px-5">
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
