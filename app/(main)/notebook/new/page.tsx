"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { NotebookForm } from "@/components/notebook/NotebookForm";
import { useI18n } from "@/lib/i18n";

export default function NewNotebookPage() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">{t("home.newNotebook")}</span>
      </div>
      <NotebookForm />
    </div>
  );
}
