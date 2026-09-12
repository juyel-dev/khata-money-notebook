"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Languages,
  SunMoon,
  DatabaseBackup,
  Archive,
  HelpCircle,
  Share2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { shareApp } from "@/lib/shareApp";
import { AccountCard } from "@/components/account/AccountCard";
import { SyncStatusCard } from "@/components/sync/SyncStatusCard";

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-rule bg-paper-card divide-y divide-rule/80">
      {children}
    </div>
  );
}

const rowClass =
  "px-4 py-3.5 flex items-center justify-between gap-3 active:bg-accent-soft transition-colors";

export default function SettingsPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="-ml-1 rounded-full p-2 text-ink transition-colors active:scale-90 active:bg-accent-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="text-[18px] font-bold leading-6 text-ink">{t("settings.title")}</span>
      </div>

      <div className="flex flex-col gap-6 px-5 pb-8">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
            {locale === "bn" ? "অ্যাকাউন্ট" : "Account"}
          </div>
          <AccountCard />
          {user && (
            <div className="mt-2 px-1 text-xs text-ink-dim">
              {locale === "bn"
                ? "Google দিয়ে সাইন ইন করা আছে। ক্লাউড সিঙ্ক পরে চালু হবে।"
                : "Signed in with Google. Cloud sync will be enabled next."}
            </div>
          )}
        </div>

        {user && <SyncStatusCard />}

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
            {t("settings.preferences")}
          </div>
          <SectionCard>
            <div className={rowClass}>
              <span className="flex items-center gap-3 text-sm text-ink">
                <Languages size={18} className="shrink-0 text-ink-dim" />
                {t("settings.language")}
              </span>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setLocale("en")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    locale === "en" ? "bg-accent text-paper border-accent" : "border-rule text-ink-dim"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLocale("bn")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    locale === "bn" ? "bg-accent text-paper border-accent" : "border-rule text-ink-dim"
                  }`}
                >
                  বাংলা
                </button>
              </div>
            </div>
            <div className={rowClass}>
              <span className="flex shrink-0 items-center gap-3 text-sm text-ink">
                <SunMoon size={18} className="shrink-0 text-ink-dim" />
                {t("settings.theme")}
              </span>
              <div className="flex gap-1 shrink-0">
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
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      theme === key ? "border-accent bg-accent text-paper" : "border-rule text-ink-dim"
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
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
            {t("settings.data")}
          </div>
          <SectionCard>
            <Link href="/settings/backup" className={rowClass}>
              <span className="flex min-w-0 items-center gap-3">
                <DatabaseBackup size={18} className="shrink-0 text-ink-dim" />
                <span className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{t("menu.backup")}</div>
                  <div className="mt-0.5 text-xs text-ink-dim">{t("settings.backupDesc")}</div>
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-ink-dim" />
            </Link>
            <Link href="/settings/archived" className={rowClass}>
              <span className="flex min-w-0 items-center gap-3">
                <Archive size={18} className="shrink-0 text-ink-dim" />
                <span className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{t("menu.archived")}</div>
                  <div className="mt-0.5 text-xs text-ink-dim">{t("settings.archivedDesc")}</div>
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-ink-dim" />
            </Link>
          </SectionCard>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
            {t("settings.aboutSection")}
          </div>
          <SectionCard>
            <Link href="/about" className={rowClass}>
              <span className="flex items-center gap-3 text-sm font-semibold text-ink">
                <HelpCircle size={18} className="shrink-0 text-ink-dim" />
                {t("settings.aboutHelp")}
              </span>
              <ChevronRight size={18} className="text-ink-dim" />
            </Link>
            <button
              onClick={() => shareApp(t("common.linkCopied"))}
              className={`w-full text-left ${rowClass}`}
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-ink">
                <Share2 size={18} className="shrink-0 text-ink-dim" />
                {t("menu.shareApp")}
              </span>
              <ChevronRight size={18} className="text-ink-dim" />
            </button>
          </SectionCard>
        </div>

        <div className="flex gap-3 rounded-2xl bg-accent-soft px-4 py-3.5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-ink">{t("settings.privacyNote")}</p>
        </div>
      </div>
    </div>
  );
}
