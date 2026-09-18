"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Phone, MessageCircle } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db/schema";
import { getPersonTransactions } from "@/lib/db/transactions";
import { updatePersonPhone } from "@/lib/db/people";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";
import { showToast } from "@/components/shared/Toast";
import { avatarColorFor } from "@/lib/shared/notebookStyle";
import { waLink, telLink } from "@/lib/shared/contact";
import { PersonStatementCard } from "@/components/person/PersonStatementCard";
import { PersonKebabMenu } from "@/components/person/PersonKebabMenu";
import { usePersonActions } from "@/components/person/usePersonActions";

// The actual UI/logic for the person detail page, kept separate from
// app/(main)/notebook/[id]/person/[personId]/page.tsx (which just unwraps
// Next's async `params` via use() and renders this). Two reasons: it keeps
// Next-specific plumbing out of the component that does real work, and it's
// directly testable with plain props — the Promise-based `params` pattern
// doesn't reliably resolve synchronously under plain RTL rendering (needs
// Next's own Suspense/streaming machinery).
export function PersonDetailView({
  notebookId,
  personId,
}: {
  notebookId: string;
  personId: string;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const statementCardRef = useRef<HTMLDivElement>(null);

  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const notebook = useLiveQuery(() => db.notebooks.get(notebookId), [notebookId]);
  const transactions = useLiveQuery(() => getPersonTransactions(personId), [personId]);

  const actions = usePersonActions(notebookId, person ?? { id: personId, notebookId, name: "", createdAt: 0 });

  if (!person) return null;

  const bg = avatarColorFor(person.name);
  const initial = person.name.trim().charAt(0).toUpperCase();

  function startRename() {
    setNameDraft(person!.name);
    setRenaming(true);
  }

  async function saveRename() {
    setBusy(true);
    const ok = await actions.rename(nameDraft);
    setBusy(false);
    if (ok) setRenaming(false);
  }

  function startEditPhone() {
    setPhoneDraft(person!.phone ?? "");
    setEditingPhone(true);
  }

  async function savePhone() {
    setBusy(true);
    try {
      await updatePersonPhone(personId, phoneDraft.trim() || null);
      setEditingPhone(false);
    } catch {
      showToast(t("common.errSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = await actions.remove();
    if (ok) router.back();
  }

  return (
    <div>
      <div className="flex items-center justify-between px-3 pt-4 pb-1 relative">
        <button
          onClick={() => router.back()}
          className="p-2 text-ink rounded-full active:bg-accent-soft active:scale-90 transition-all"
        >
          <ChevronLeft size={22} />
        </button>
        {renaming ? (
          <input
            autoFocus
            value={nameDraft}
            placeholder={t("person.renamePlaceholder")}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setRenaming(false);
            }}
            disabled={busy}
            className="min-w-0 flex-1 mx-2 text-[17px] font-semibold leading-6 text-ink bg-transparent border-b border-accent outline-none text-center"
          />
        ) : (
          <span className="min-w-0 truncate text-[17px] font-semibold leading-6 text-ink">
            {person.name}
          </span>
        )}
        <PersonKebabMenu
          ariaLabel={t("person.actions")}
          actions={[
            { label: t("person.rename"), onClick: startRename },
            { label: t("person.shareStatement"), onClick: () => void actions.shareStatementText() },
            {
              label: t("person.shareStatementImage"),
              onClick: () => {
                if (statementCardRef.current) void actions.shareStatementImage(statementCardRef.current);
              },
            },
            { label: t("person.delete"), onClick: () => void handleDelete(), danger: true },
          ]}
        />
      </div>

      <div className="flex flex-col items-center gap-2 px-6 pt-3 pb-4 text-center">
        <span
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-[#241F16]"
          style={{ backgroundColor: bg }}
        >
          {initial}
        </span>

        {editingPhone ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              type="tel"
              inputMode="tel"
              value={phoneDraft}
              placeholder={t("person.phonePlaceholder")}
              onChange={(e) => setPhoneDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void savePhone();
                if (e.key === "Escape") setEditingPhone(false);
              }}
              disabled={busy}
              className="text-sm text-ink bg-transparent border-b border-accent outline-none text-center px-1"
            />
            <button
              onClick={() => void savePhone()}
              disabled={busy}
              className="text-xs font-semibold text-accent px-2 py-1"
            >
              {t("common.save")}
            </button>
            <button
              onClick={() => setEditingPhone(false)}
              className="text-xs text-ink-dim px-2 py-1"
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : person.phone ? (
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={startEditPhone}
              className="text-sm text-ink-dim underline decoration-dotted"
            >
              {person.phone}
            </button>
            <a
              href={telLink(person.phone)}
              className="flex items-center gap-1 rounded-full border border-rule px-2.5 py-1 text-xs text-ink active:bg-accent-soft"
            >
              <Phone size={12} /> {t("person.call")}
            </a>
            <a
              href={waLink(person.phone)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-full border border-rule px-2.5 py-1 text-xs text-ink active:bg-accent-soft"
            >
              <MessageCircle size={12} /> {t("person.whatsapp")}
            </a>
          </div>
        ) : (
          <button onClick={startEditPhone} className="text-sm text-accent mt-1">
            + {t("person.addPhone")}
          </button>
        )}
      </div>

      <div className="px-5 pt-1">
        {transactions?.map((txn) => (
          <TransactionRow key={txn.id} txn={txn} primaryLabel={txn.note || person.name} />
        ))}
      </div>

      <div className="fixed bottom-20 inset-x-0 z-20 max-w-md mx-auto px-5">
        <div className="flex gap-3">
          <button
            onClick={() => openAddSheet({ notebookId, type: "gave", personId })}
            className="flex-1 rounded-full border-2 border-owe-you bg-paper py-3.5 font-semibold text-owe-you shadow-md transition-transform active:scale-[0.99]"
          >
            {t("notebook.gave")}
          </button>
          <button
            onClick={() => openAddSheet({ notebookId, type: "got", personId })}
            className="flex-1 rounded-full bg-accent py-3.5 font-semibold text-paper shadow-md transition-transform active:scale-[0.99]"
          >
            {t("notebook.got")}
          </button>
        </div>
      </div>
      <div className="h-20" />

      {/* Off-screen — never shown, only captured to an image by
          shareStatementImage(). Needs real layout (not display:none) for
          html-to-image to measure/rasterize it correctly. */}
      <div style={{ position: "fixed", top: 0, left: -9999, pointerEvents: "none" }} aria-hidden>
        <PersonStatementCard
          ref={statementCardRef}
          notebookName={notebook?.name ?? ""}
          personName={person.name}
          transactions={transactions ?? []}
          locale={locale}
        />
      </div>
    </div>
  );
}
