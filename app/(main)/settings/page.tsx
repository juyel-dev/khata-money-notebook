"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldCheck, Sun, Moon, Monitor } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { shareApp } from "@/lib/shareApp";

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-rule bg-paper-card overflow-hidden divide-y divide-rule shadow-sm">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-2 -ml-1 text-ink">
          <ChevronLeft size={22} />
        </button>
        <span className="text-lg font-bold text-ink">{t("settings.title")}</span>
      </div>

      <div className="px-5 pb-8 flex flex-col gap-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1.5">
            {t("settings.preferences")}
          </div>
          <SectionCard>
            <div className="px-4 py-3.5 flex items-center justify-between">
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
            <div className="px-4 py-3.5 flex items-center justify-between gap-2">
              <span className="text-sm text-ink shrink-0">{t("settings.theme")}</span>
              <div className="flex gap-1.5">
                {(
                  [
                    { key: "light" as const, label: t("settings.light"), Icon: Sun },
                    { key: "dark" as const, label: t("settings.dark"), Icon: Moon },
                    { key: "system" as const, label: t("settings.system"), Icon: Monitor },
                  ]
                ).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border ${
                      theme === key ? "bg-accent text-paper border-accent" : "border-rule text-ink-dim"
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1.5">
            {t("settings.data")}
          </div>
          <SectionCard>
            <Link href="/settings/backup" className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{t("menu.backup")}</div>
                <div className="text-xs text-ink-dim mt-0.5">{t("settings.backupDesc")}</div>
              </div>
              <ChevronRight size={18} className="text-ink-dim shrink-0" />
            </Link>
            <Link href="/settings/archived" className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{t("menu.archived")}</div>
                <div className="text-xs text-ink-dim mt-0.5">{t("settings.archivedDesc")}</div>
              </div>
              <ChevronRight size={18} className="text-ink-dim shrink-0" />
            </Link>
          </SectionCard>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1.5">
            {t("settings.aboutSection")}
          </div>
          <SectionCard>
            <Link href="/about" className="px-4 py-3.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{t("settings.aboutHelp")}</span>
              <ChevronRight size={18} className="text-ink-dim" />
            </Link>
            <button
              onClick={() => shareApp(t("common.linkCopied"))}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left"
            >
              <span className="text-sm font-semibold text-ink">{t("menu.shareApp")}</span>
              <ChevronRight size={18} className="text-ink-dim" />
            </button>
          </SectionCard>
        </div>

        <div className="rounded-2xl bg-accent-soft px-4 py-3.5 flex gap-3">
          <ShieldCheck size={18} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-ink leading-relaxed">{t("settings.privacyNote")}</p>
        </div>
      </div>
    </div>
  );
}
