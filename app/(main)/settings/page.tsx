"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-1 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">{t("settings.title")}</span>
      </div>

      <div className="px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mt-3 mb-1">
          {t("settings.preferences")}
        </div>
        <div className="py-3 border-b border-rule flex items-center justify-between">
          <span className="text-sm text-ink">{t("settings.language")}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setLocale("en")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                locale === "en" ? "bg-accent text-paper border-accent" : "border-rule text-ink-dim"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLocale("bn")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                locale === "bn" ? "bg-accent text-paper border-accent" : "border-rule text-ink-dim"
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mt-5 mb-1">
          {t("settings.data")}
        </div>
        <Link href="/settings/backup" className="py-3 border-b border-rule flex items-center justify-between">
          <span className="text-sm text-ink">{t("menu.backup")}</span>
          <ChevronRight size={18} className="text-ink-dim" />
        </Link>
        <Link href="/settings/archived" className="py-3 border-b border-rule flex items-center justify-between">
          <span className="text-sm text-ink">{t("menu.archived")}</span>
          <ChevronRight size={18} className="text-ink-dim" />
        </Link>

        <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mt-5 mb-1">
          {t("settings.about")}
        </div>
        <Link href="/about" className="py-3 border-b border-rule flex items-center justify-between">
          <span className="text-sm text-ink">{t("menu.about")}</span>
          <ChevronRight size={18} className="text-ink-dim" />
        </Link>
      </div>
    </div>
  );
}
