"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Book, Plus, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";
import { db } from "@/lib/db/schema";
import { useLiveQuery } from "dexie-react-hooks";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const notebooks = useLiveQuery(
    () => db.notebooks.filter((n) => !n.archived).toArray(),
    []
  );

  const handleAdd = () => {
    if (!notebooks || notebooks.length === 0) return; // nothing to add to yet
    if (notebooks.length === 1) {
      openAddSheet({ notebookId: notebooks[0].id });
    } else {
      // Simple path for v1: send them to Home to pick a notebook, then use its own Gave/Got buttons.
      // (A lightweight notebook-picker sheet is a natural Phase 2 refinement.)
      router.push("/");
    }
  };

  const isHome = pathname === "/";
  const isHistory = pathname === "/history";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-paper/95 backdrop-blur border-t border-rule pb-safe">
      <div className="max-w-md mx-auto flex items-end justify-around px-4 pt-2">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs ${
            isHome ? "text-accent font-semibold" : "text-ink-dim"
          }`}
        >
          <Book size={22} strokeWidth={isHome ? 2.4 : 2} />
          {t("nav.home")}
        </Link>

        <button
          onClick={handleAdd}
          className="flex flex-col items-center gap-1 -mt-5"
          aria-label={t("nav.add")}
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-accent text-paper shadow-lg shadow-accent/30">
            <Plus size={26} strokeWidth={2.4} />
          </span>
          <span className="text-xs text-ink-dim">{t("nav.add")}</span>
        </button>

        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs ${
            isHistory ? "text-accent font-semibold" : "text-ink-dim"
          }`}
        >
          <Clock size={22} strokeWidth={isHistory ? 2.4 : 2} />
          {t("nav.history")}
        </Link>
      </div>
    </nav>
  );
}
