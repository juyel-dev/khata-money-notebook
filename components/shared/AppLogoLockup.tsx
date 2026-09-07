"use client";

import { BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AppLogoLockup({ size = "md" }: { size?: "sm" | "md" }) {
  const { t } = useI18n();
  const iconBox = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? 16 : 20;

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className={`${iconBox} rounded-xl bg-accent text-paper flex items-center justify-center shrink-0`}
      >
        <BookOpen size={iconSize} />
      </span>
      <div className="min-w-0">
        <div className="font-bold text-ink leading-tight truncate">{t("appName")}</div>
        <div className="text-xs text-ink-dim leading-tight truncate">{t("appTagline")}</div>
      </div>
    </div>
  );
}
