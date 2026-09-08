"use client";

import { Download } from "lucide-react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { useI18n } from "@/lib/i18n";

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const { t } = useI18n();

  if (!canInstall) return null;

  return (
    <button
      onClick={promptInstall}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-accent text-paper text-sm font-semibold active:scale-95 active:opacity-90 transition-all ${className}`}
    >
      <Download size={16} />
      {t("menu.installApp")}
    </button>
  );
}
