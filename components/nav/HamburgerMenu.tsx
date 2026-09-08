"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Globe, Archive, Settings, HelpCircle, DatabaseBackup, Share2, Cloud } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AnimatePresence, motion } from "framer-motion";
import { shareApp } from "@/lib/shareApp";
import { showToast } from "@/components/shared/Toast";
import { AppLogoLockup } from "@/components/shared/AppLogoLockup";
import { InstallAppButton } from "@/components/shared/InstallAppButton";

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { t, locale, setLocale } = useI18n();

  const links = [
    { href: "/settings/backup", icon: DatabaseBackup, label: t("menu.backup") },
    { href: "/settings/archived", icon: Archive, label: t("menu.archived") },
    { href: "/settings", icon: Settings, label: t("menu.settings") },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="p-2 -ml-2 text-ink"
      >
        <Menu size={24} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/40 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-paper-card pt-safe shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
                <AppLogoLockup size="sm" />
                <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-ink-dim">
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Cloud Sync — Phase 3 (Supabase), not built yet. Shown as a
                    clearly-disabled preview so it sets expectations honestly
                    rather than being a dead/misleading button. */}
                <div className="mx-5 mt-4 rounded-2xl border border-rule p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-1">
                    <Cloud size={16} className="text-ink-dim" />
                    {t("menu.cloudSyncTitle")}
                  </div>
                  <p className="text-xs text-ink-dim leading-relaxed mb-3">{t("menu.cloudSyncDesc")}</p>
                  <button
                    disabled
                    onClick={() => showToast(t("menu.comingSoon"))}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-rule text-ink-dim text-sm font-semibold cursor-not-allowed"
                  >
                    {t("menu.signInGoogle")}
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-paper px-1.5 py-0.5 rounded-full border border-rule">
                      {t("menu.comingSoon")}
                    </span>
                  </button>
                </div>

                <div className="mx-5 mt-3">
                  <InstallAppButton />
                </div>

                <div className="px-5 py-4 border-b border-rule mt-4">
                  <div className="flex items-center gap-2 text-sm text-ink-dim mb-2">
                    <Globe size={16} />
                    {t("menu.language")}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocale("en")}
                      className={`flex-1 py-2 rounded-full text-sm font-medium border ${
                        locale === "en"
                          ? "bg-accent text-paper border-accent"
                          : "border-rule text-ink"
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLocale("bn")}
                      className={`flex-1 py-2 rounded-full text-sm font-medium border ${
                        locale === "bn"
                          ? "bg-accent text-paper border-accent"
                          : "border-rule text-ink"
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>
                </div>

                <nav className="py-2">
                  {links.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 text-ink hover:bg-accent-soft"
                    >
                      <Icon size={19} className="text-ink-dim" />
                      <span className="text-sm">{label}</span>
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      setOpen(false);
                      shareApp(t("common.linkCopied"));
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-ink hover:bg-accent-soft text-left"
                  >
                    <Share2 size={19} className="text-ink-dim" />
                    <span className="text-sm">{t("menu.shareApp")}</span>
                  </button>
                  <Link
                    href="/about#help"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-ink hover:bg-accent-soft"
                  >
                    <HelpCircle size={19} className="text-ink-dim" />
                    <span className="text-sm">{t("menu.help")}</span>
                  </Link>
                </nav>
              </div>

              <div className="px-5 py-4 border-t border-rule">
                <div className="text-xs font-semibold text-ink">{t("appName")} • {t("appTagline")}</div>
                <div className="text-xs text-ink-dim mt-0.5">{t("menu.footerTagline")}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
