"use client";

import Link from "next/link";
import type { Person } from "@/lib/db/schema";
import { avatarColorFor } from "@/lib/shared/notebookStyle";
import { useI18n } from "@/lib/i18n";

export function PersonRow({
  notebookId,
  person,
  txnCount,
}: {
  notebookId: string;
  person: Person;
  /** Optional transaction count shown in the Individuals tab. */
  txnCount?: number;
}) {
  const { t, locale } = useI18n();
  const bg = avatarColorFor(person.name);
  const initial = person.name.trim().charAt(0).toUpperCase();

  const activityLine = txnCount != null
    ? t(txnCount === 1 ? "notebook.txnCountOne" : "notebook.txnCount", {
        count: txnCount,
      })
    : "";

  return (
    <Link
      href={`/notebook/${notebookId}/person/${person.id}`}
      className="flex items-center gap-3 p-3.5 mb-2.5 bg-paper-card border border-rule rounded-2xl shadow-sm active:opacity-80"
    >
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[#241F16] shrink-0"
        style={{ backgroundColor: bg }}
      >
        {initial}
      </span>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink truncate">{person.name}</div>
        {activityLine && (
          <div className="text-xs text-ink-dim truncate">{activityLine}</div>
        )}
      </div>
    </Link>
  );
}
