"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Pin } from "lucide-react";
import type { Notebook } from "@/lib/db/schema";
import { getNotebookBalance } from "@/lib/db/notebooks";
import { db } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";
import { colorHex } from "@/lib/shared/notebookStyle";
import { NOTEBOOK_ICON_MAP } from "./icons";
import { useI18n } from "@/lib/i18n";

export function NotebookCard({ notebook }: { notebook: Notebook }) {
  const { t } = useI18n();

  const balance = useLiveQuery(
    () => getNotebookBalance(notebook.id),
    [notebook.id]
  );

  const peopleCount = useLiveQuery(
    () => db.people.where("notebookId").equals(notebook.id).count(),
    [notebook.id]
  );

  const Icon = NOTEBOOK_ICON_MAP[notebook.icon];
  const hex = colorHex(notebook.color);

  const balanceTone =
    balance == null
      ? {
          text: "text-ink-dim",
          bg: "bg-paper/70",
          border: "border-rule",
        }
      : balance > 0
        ? {
            text: "text-you-owe",
            bg: "bg-you-owe-soft",
            border: "border-you-owe/20",
          }
        : balance < 0
          ? {
              text: "text-owe-you",
              bg: "bg-owe-you-soft",
              border: "border-owe-you/20",
            }
          : {
              text: "text-ink-dim",
              bg: "bg-accent-soft",
              border: "border-accent/10",
            };

  return (
    <Link
      href={`/notebook/${notebook.id}`}
      className="group relative mb-2.5 block overflow-hidden rounded-[18px] border border-rule/80 bg-paper-card shadow-[0_3px_10px_rgba(36,31,22,0.045)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(36,31,22,0.07)] active:translate-y-0 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <div className="relative flex items-center gap-3 p-3.5">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] text-white shadow-[0_3px_8px_rgba(36,31,22,0.10)] transition-transform duration-200 group-hover:scale-[1.015]"
          style={{ backgroundColor: hex }}
        >
          <Icon size={23} strokeWidth={1.85} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {notebook.pinned && (
              <Pin
                size={12}
                strokeWidth={2.2}
                className="shrink-0 text-accent"
                fill="currentColor"
              />
            )}
            <h3 className="min-w-0 truncate text-[16px] font-semibold leading-5.5 text-ink">
              {notebook.name}
            </h3>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[13px] leading-5 text-ink-dim">
            <CalendarDays size={13} strokeWidth={1.9} className="shrink-0" />
            <span>
              {peopleCount ?? 0} {peopleCount === 1 ? t("home.person") : t("home.people")}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[14px] font-bold tracking-[-0.01em] tabular-nums ${balanceTone.text} ${balanceTone.bg} ${balanceTone.border}`}
          >
            {balance != null ? formatMoney(balance) : "…"}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-ink-dim transition-colors duration-200 group-hover:text-accent">
            <ChevronRight size={18} strokeWidth={1.9} />
          </span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[3px] w-20 origin-left rounded-r-full opacity-70"
        style={{ backgroundColor: hex }}
      />
    </Link>
  );
}
