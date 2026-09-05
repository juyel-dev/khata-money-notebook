"use client";

import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ArchiveRestore, Trash2 } from "lucide-react";
import { db } from "@/lib/db/schema";
import { archiveNotebook, deleteNotebookPermanently } from "@/lib/db/notebooks";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/shared/EmptyState";
import { Archive } from "lucide-react";

export default function ArchivedNotebooksPage() {
  const router = useRouter();
  const { t } = useI18n();
  const archived = useLiveQuery(() => db.notebooks.filter((n) => n.archived).toArray(), []);

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-1 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">{t("menu.archived")}</span>
      </div>

      <div className="px-5">
        {archived && archived.length === 0 && (
          <EmptyState icon={Archive} title={t("menu.archived")} body={t("menu.archivedEmpty")} />
        )}
        {archived?.map((nb) => (
          <div key={nb.id} className="flex items-center justify-between py-3 border-b border-rule">
            <span className="text-sm text-ink">{nb.name}</span>
            <div className="flex gap-3">
              <button onClick={() => archiveNotebook(nb.id, false)} className="text-accent" aria-label="restore">
                <ArchiveRestore size={18} />
              </button>
              <button
                onClick={() => {
                  if (confirm(t("notebook.deletePermanently") + "?")) deleteNotebookPermanently(nb.id);
                }}
                className="text-danger"
                aria-label="delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
