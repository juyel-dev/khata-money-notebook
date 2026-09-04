"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db/schema";
import { NotebookForm } from "@/components/notebook/NotebookForm";
import { useI18n } from "@/lib/i18n";

export default function EditNotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const notebook = useLiveQuery(() => db.notebooks.get(id), [id]);

  if (!notebook) return null;

  return (
    <div>
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">{t("notebook.editNotebook")}</span>
      </div>
      <NotebookForm existing={notebook} />
    </div>
  );
}
