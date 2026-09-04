"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { db } from "@/lib/db/schema";
import { showToast } from "@/components/shared/Toast";
import { useState } from "react";

export default function BackupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [lastBackup, setLastBackup] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("khata:lastBackup") : null
  );

  const handleExport = async () => {
    const [notebooks, people, transactions] = await Promise.all([
      db.notebooks.toArray(),
      db.people.toArray(),
      db.transactions.toArray(),
    ]);
    const payload = { version: 1, exportedAt: Date.now(), notebooks, people, transactions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khata-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const now = new Date().toLocaleString();
    localStorage.setItem("khata:lastBackup", now);
    setLastBackup(now);
    showToast("Backup downloaded");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!confirm(t("backup.importWarning"))) return;
        await db.transaction("rw", db.notebooks, db.people, db.transactions, async () => {
          if (Array.isArray(data.notebooks)) await db.notebooks.bulkPut(data.notebooks);
          if (Array.isArray(data.people)) await db.people.bulkPut(data.people);
          if (Array.isArray(data.transactions)) await db.transactions.bulkPut(data.transactions);
        });
        showToast("Import complete");
      } catch {
        showToast("Invalid backup file");
      }
    };
    input.click();
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-1 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">{t("backup.title")}</span>
      </div>

      <div className="px-5 flex flex-col gap-4 mt-2">
        <button
          onClick={handleExport}
          className="w-full rounded-full bg-accent text-paper font-semibold py-3.5"
        >
          {t("backup.export")}
        </button>
        <div className="text-xs text-ink-dim text-center -mt-2">
          {t("backup.lastBackup")}: {lastBackup ?? t("backup.never")}
        </div>

        <button
          onClick={handleImport}
          className="w-full rounded-full border-2 border-accent text-accent font-semibold py-3.5 mt-2"
        >
          {t("backup.import")}
        </button>
        <p className="text-xs text-ink-dim text-center">{t("backup.importWarning")}</p>
      </div>
    </div>
  );
}
