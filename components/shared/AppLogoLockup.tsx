"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n";

export function AppLogoLockup({ size = "md" }: { size?: "sm" | "md" }) {
  const { t } = useI18n();
  const iconBox = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconPx = size === "sm" ? 32 : 40;

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Image
        src="/icons/icon.svg"
        alt="Khata logo"
        width={iconPx}
        height={iconPx}
        className={`${iconBox} rounded-xl shrink-0 shadow-sm`}
      />
      <div className="min-w-0">
        <div className="font-bold text-ink leading-tight truncate">{t("appName")}</div>
        <div className="text-xs text-ink-dim leading-tight truncate">{t("appTagline")}</div>
      </div>
    </div>
  );
}
