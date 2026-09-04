"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Plus } from "lucide-react";
import { db } from "@/lib/db/schema";
import { HamburgerMenu } from "@/components/nav/HamburgerMenu";
import { NotebookCard } from "@/components/notebook/NotebookCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const notebooks = useLiveQuery(
    () => db.notebooks.filter((n) => !n.archived).toArray(),
    []
  );

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center gap-3 mb-1">
        <HamburgerMenu />
        <span className="text-lg font-bold text-ink">{t("appName")}</span>
      </div>

      {notebooks && notebooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("home.emptyTitle")}
          body={t("home.emptyBody")}
          action={
            <Link
              href="/notebook/new"
              className="mt-2 rounded-full bg-accent text-paper font-semibold px-6 py-3"
            >
              {t("home.emptyCta")}
            </Link>
          }
        />
      ) : (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1">
            {t("home.yourNotebooks")}
          </div>
          {notebooks?.map((nb) => (
            <NotebookCard key={nb.id} notebook={nb} />
          ))}
          <Link
            href="/notebook/new"
            className="flex items-center justify-center gap-2 mt-4 py-4 rounded-xl border-2 border-dashed border-rule text-ink-dim font-medium"
          >
            <Plus size={18} />
            {t("home.newNotebook")}
          </Link>
        </div>
      )}
    </div>
  );
}
