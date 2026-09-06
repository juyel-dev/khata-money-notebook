"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Plus, Pin } from "lucide-react";
import { getHomeList } from "@/lib/db/notebooks";
import { HamburgerMenu } from "@/components/nav/HamburgerMenu";
import { NotebookCard } from "@/components/notebook/NotebookCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const homeList = useLiveQuery(() => getHomeList(), []);
  const isEmpty = homeList
    ? homeList.pinned.length === 0 && homeList.sections.every((s) => s.notebooks.length === 0)
    : false;

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center gap-3 mb-1">
        <HamburgerMenu />
        <span className="text-lg font-bold text-ink">{t("appName")}</span>
      </div>

      {homeList && isEmpty ? (
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
          {homeList && homeList.pinned.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1">
                <Pin size={12} />
                {t("home.pinnedSection")}
              </div>
              {homeList.pinned.map((nb) => (
                <NotebookCard key={nb.id} notebook={nb} />
              ))}
            </div>
          )}

          {homeList?.hasGroups ? (
            homeList.sections.map((section) => (
              <div key={section.group?.id ?? "ungrouped"} className="mb-2">
                {section.notebooks.length > 0 && (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1 mt-2">
                      {section.group?.name ?? t("home.ungroupedSection")}
                    </div>
                    {section.notebooks.map((nb) => (
                      <NotebookCard key={nb.id} notebook={nb} />
                    ))}
                  </>
                )}
              </div>
            ))
          ) : (
            <>
              {homeList && homeList.sections[0]?.notebooks.length > 0 && (
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-dim mb-1">
                  {t("home.yourNotebooks")}
                </div>
              )}
              {homeList?.sections[0]?.notebooks.map((nb) => (
                <NotebookCard key={nb.id} notebook={nb} />
              ))}
            </>
          )}

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
