"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/components/shared/Toast";
import {
  BackupError,
  exportBackup,
  parseBackupFile,
  restoreBackup,
  type BackupErrorCode,
} from "@/lib/db/backup";

const LAST_BACKUP_KEY = "khata:lastBackup";

const ERROR_MESSAGE_KEY: Record<BackupErrorCode, string> = {
  "invalid-json": "backup.errInvalidJson",
  "invalid-format": "backup.errInvalidFormat",
  "unsupported-version": "backup.errUnsupportedVersion",
  "invalid-data": "backup.errInvalidData",
};

export default function BackupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(LAST_BACKUP_KEY) : null
  );

  const handleExport = async () => {
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khata-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      // Written only after a successful export — never on failure.
      const now = new Date().toLocaleString();
      localStorage.setItem(LAST_BACKUP_KEY, now);
      setLastBackup(now);
      showToast(t("backup.exported"));
    } catch (err) {
      console.error("Backup export failed:", err);
      showToast(t("backup.exportFailed"));
    }
  };

  const handleImportFile = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch (err) {
      console.error("Backup file read failed:", err);
      showToast(t("backup.errInvalidJson"));
      return;
    }

    let parsed;
    try {
      parsed = parseBackupFile(text);
    } catch (err) {
      // Friendly, categorized message — never raw stacks.
      console.warn("Backup rejected:", err);
      const key =
        err instanceof BackupError ? ERROR_MESSAGE_KEY[err.code] : "backup.errInvalidData";
      showToast(t(key));
      return;
    }

    // Strong, explicit replace warning — restore wipes current data.
    if (!confirm(t("backup.replaceWarning"))) return;

    try {
      await restoreBackup(parsed);
      showToast(t("backup.restored"));
    } catch (err) {
      // Dexie rolls the whole swap back on failure, so reaching here
      // means the on-device data is still exactly as it was.
      console.error("Backup restore failed:", err);
      showToast(t("backup.errRestoreFailed"));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-1 text-ink rounded-full active:bg-accent-soft active:scale-90 transition-all">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">{t("backup.title")}</span>
      </div>

      <div className="px-5 flex flex-col gap-4 mt-2">
        <div className="flex justify-center">
          <Image
            src="/illustrations/backup-hero.svg"
            alt=""
            width={200}
            height={114}
          />
        </div>
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
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-full border-2 border-accent text-accent font-semibold py-3.5 mt-2"
        >
          {t("backup.import")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset so picking the same file twice still fires onChange.
            e.target.value = "";
            if (file) void handleImportFile(file);
          }}
        />
        <p className="text-xs text-ink-dim text-center">{t("backup.replaceWarning")}</p>
      </div>
    </div>
  );
}
