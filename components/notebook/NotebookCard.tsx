"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
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

  const resolvedBalance = balance ?? 0;

  const balanceTone =
    balance == null
      ? {
          text: "text-ink-dim",
          bg: "bg-paper/80",
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
      className="
        group relative mb-3 block overflow-hidden
        rounded-[22px]
        border border-rule/80
        bg-paper-card
        shadow-[0_7px_18px_rgba(36,31,22,0.06),0_2px_5px_rgba(36,31,22,0.04)]
        transition-all duration-200
        hover:-translate-y-[2px]
        hover:shadow-[0_12px_28px_rgba(36,31,22,0.10),0_3px_8px_rgba(36,31,22,0.05)]
        active:translate-y-0
        active:scale-[0.99]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-accent
        focus-visible:ring-offset-2
        focus-visible:ring-offset-paper
      "
    >
      {/* Soft decorative glow */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-12 -top-12
          h-28 w-28 rounded-full
          opacity-[0.07] blur-2xl
          transition-opacity duration-200
          group-hover:opacity-[0.11]
        "
        style={{ backgroundColor: hex }}
      />

      <div className="relative flex items-center gap-3.5 p-4">
        {/* Icon */}
        <span
          className="
            relative isolate flex h-[62px] w-[62px] shrink-0
            items-center justify-center
            rounded-[19px]
            text-white
            shadow-[0_7px_14px_rgba(36,31,22,0.12)]
            transition-transform duration-200
            group-hover:scale-[1.025]
          "
          style={{
            background: `linear-gradient(145deg, ${hex} 0%, ${hex}D9 100%)`,
          }}
        >
          {/* Gold offset accent */}
          <span
            aria-hidden="true"
            className="
              absolute inset-[3px] -z-10
              translate-x-[4px] translate-y-[4px]
              rounded-[18px]
              opacity-90
            "
            style={{ backgroundColor: "#C99A32" }}
          />

          <Icon size={27} strokeWidth={1.9} />

          {/* tiny shine */}
          <span
            aria-hidden="true"
            className="
              absolute left-2 top-2
              h-2 w-2 rounded-full
              bg-white/25
            "
          />
        </span>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {notebook.pinned && (
              <Pin
                size={13}
                strokeWidth={2.2}
                className="shrink-0 text-accent"
                fill="currentColor"
              />
            )}

            <h3 className="min-w-0 truncate text-[17px] font-semibold leading-6 text-ink">
              {notebook.name}
            </h3>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-dim">
            <CalendarDays size={14} strokeWidth={1.9} className="shrink-0" />
            <span>
              {peopleCount ?? 0}{" "}
              {peopleCount === 1
                ? t("home.person")
                : t("home.people")}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`
              inline-flex items-center
              rounded-full
              border
              px-3 py-1.5
              text-[15px]
              font-bold
              tracking-[-0.01em]
              tabular-nums
              ${balanceTone.text}
              ${balanceTone.bg}
              ${balanceTone.border}
            `}
          >
            {balance != null ? formatMoney(resolvedBalance) : "…"}
          </span>

          <span
            className="
              flex h-8 w-8 items-center justify-center
              rounded-full
              text-ink-dim
              transition-all duration-200
              group-hover:bg-accent-soft
              group-hover:text-accent
            "
          >
            <ChevronRight size={19} strokeWidth={1.9} />
          </span>
        </div>
      </div>

      {/* Premium bottom accent */}
      <span
        aria-hidden="true"
        className="
          absolute bottom-0 left-0 right-0
          h-[5px]
          origin-left
          scale-x-100
          transition-transform duration-300
          group-hover:scale-x-[1.015]
        "
        style={{
          background: `linear-gradient(90deg, ${hex} 0%, ${hex} 72%, #C99A32 100%)`,
        }}
      />

      {/* Small corner decoration */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -bottom-7 -right-5
          h-16 w-16
          rotate-[-18deg]
          rounded-[18px]
          opacity-[0.06]
        "
        style={{ backgroundColor: hex }}
      />
    </Link>
  );
}
