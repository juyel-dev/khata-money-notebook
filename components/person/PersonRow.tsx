"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Person, Transaction } from "@/lib/db/schema";
import { avatarColorFor } from "@/lib/shared/notebookStyle";
import { useI18n } from "@/lib/i18n";
import { db } from "@/lib/db/schema";
import { getPersonTransactions } from "@/lib/db/transactions";
import { PersonKebabMenu } from "@/components/person/PersonKebabMenu";
import { PersonStatementCard } from "@/components/person/PersonStatementCard";
import { usePersonActions } from "@/components/person/usePersonActions";

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
  const actions = usePersonActions(notebookId, person);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(person.name);
  const [busy, setBusy] = useState(false);

  // Rendered (and its transactions fetched) only while an image share is
  // actually in progress — every row always-mounting its own off-screen
  // card would mean fetching every person's transactions on every list
  // render, which doesn't scale to a notebook with many people.
  const [imageShareData, setImageShareData] = useState<{ notebookName: string; transactions: Transaction[] } | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageShareData) return;
    const node = captureRef.current;
    if (!node) return;
    void actions.shareStatementImage(node).finally(() => setImageShareData(null));
    // actions is recreated each render (useI18n/useLiveQuery deps), so it's
    // deliberately excluded — this effect should only re-run when the data
    // to capture actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageShareData]);

  async function startImageShare() {
    const [notebook, transactions] = await Promise.all([
      db.notebooks.get(notebookId),
      getPersonTransactions(person.id),
    ]);
    setImageShareData({ notebookName: notebook?.name ?? "", transactions });
  }

  async function saveRename() {
    setBusy(true);
    const ok = await actions.rename(nameDraft);
    setBusy(false);
    if (ok) setRenaming(false);
  }

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
        {renaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setNameDraft(person.name);
                setRenaming(false);
              }
            }}
            disabled={busy}
            className="w-full font-semibold text-ink bg-transparent border-b border-accent outline-none"
          />
        ) : (
          <div className="font-semibold text-ink truncate">{person.name}</div>
        )}
        {activityLine && (
          <div className="text-xs text-ink-dim truncate">{activityLine}</div>
        )}
      </div>

      <PersonKebabMenu
        ariaLabel={t("person.actions")}
        actions={[
          {
            label: t("person.rename"),
            onClick: () => {
              setNameDraft(person.name);
              setRenaming(true);
            },
          },
          { label: t("person.shareStatement"), onClick: () => void actions.shareStatementText() },
          { label: t("person.shareStatementImage"), onClick: () => void startImageShare() },
        ]}
      />

      {imageShareData && (
        <div style={{ position: "fixed", top: 0, left: -9999, pointerEvents: "none" }} aria-hidden>
          <PersonStatementCard
            ref={captureRef}
            notebookName={imageShareData.notebookName}
            personName={person.name}
            transactions={imageShareData.transactions}
            locale={locale}
          />
        </div>
      )}
    </Link>
  );
}
