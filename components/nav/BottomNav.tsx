"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Book, Plus, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";
import { db } from "@/lib/db/schema";
import { useLiveQuery } from "dexie-react-hooks";
import { showToast } from "@/components/shared/Toast";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const openNotebookPicker = useUIStore((s) => s.openNotebookPicker);
  const notebooks = useLiveQuery(
    () => db.notebooks.filter((n) => !n.archived).toArray(),
    []
  );

  const handleAdd = () => {
    if (!notebooks || notebooks.length === 0) {
      showToast(t("sheet.createNotebookFirst"));
      router.push("/");
      return;
    }
    if (notebooks.length === 1) {
      openAddSheet({ notebookId: notebooks[0].id });
    } else {
      openNotebookPicker();
    }
  };

  const isHome = pathname === "/";
  const isHistory = pathname === "/history";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-rule/70 bg-paper/92 backdrop-blur-md pb-safe">
      <div className="max-w-md mx-auto flex items-end justify-around px-5 pt-1.5">
        <Link
          href="/"
          className={`flex min-w-16 flex-col items-center gap-1 py-1.5 text-[11px] transition-colors ${
            isHome ? "font-semibold text-accent" : "text-ink-dim"
          }`}
        >
          <Book size={21} strokeWidth={isHome ? 2.25 : 1.9} />
          {t("nav.home")}
        </Link>

        <button
          onClick={handleAdd}
          className="-mt-5 flex min-w-16 flex-col items-center gap-1.5"
          aria-label={t("nav.add")}
        >
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-paper shadow-[0_6px_16px_rgba(47,107,79,0.22)] transition-transform active:scale-95">
            <Plus size={25} strokeWidth={2.25} />
          </span>
          <span className="text-[11px] text-ink-dim">{t("nav.add")}</span>
        </button>

        <Link
          href="/history"
          className={`flex min-w-16 flex-col items-center gap-1 py-1.5 text-[11px] transition-colors ${
            isHistory ? "font-semibold text-accent" : "text-ink-dim"
          }`}
        >
          <Clock size={21} strokeWidth={isHistory ? 2.25 : 1.9} />
          {t("nav.history")}
        </Link>
      </div>
    </nav>
  );
}
