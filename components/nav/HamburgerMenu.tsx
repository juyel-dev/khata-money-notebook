"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Globe, Archive, Settings, Info, HelpCircle, DatabaseBackup } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AnimatePresence, motion } from "framer-motion";

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { t, locale, setLocale } = useI18n();

  const items = [
    { href: "/settings/backup", icon: DatabaseBackup, label: t("menu.backup") },
    { href: "/settings/archived", icon: Archive, label: t("menu.archived") },
    { href: "/settings", icon: Settings, label: t("menu.settings") },
    { href: "/about", icon: Info, label: t("menu.about") },
    { href: "/about#help", icon: HelpCircle, label: t("menu.help") },
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
              className="fixed inset-y-0 left-0 z-50 w-72 bg-paper pt-safe shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
                <span className="text-h1 font-bold text-ink text-lg">{t("appName")}</span>
                <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-ink-dim">
                  <X size={22} />
                </button>
              </div>

              <div className="px-5 py-4 border-b border-rule">
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

              <nav className="flex-1 py-2">
                {items.map(({ href, icon: Icon, label }) => (
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
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
