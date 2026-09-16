"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, MoreVertical, Phone, MessageCircle } from "lucide-react";
import { db } from "@/lib/db/schema";
import { getPersonTransactions } from "@/lib/db/transactions";
import { renamePerson, updatePersonPhone, deletePersonIfEmpty } from "@/lib/db/people";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";
import { showToast } from "@/components/shared/Toast";
import { avatarColorFor } from "@/lib/shared/notebookStyle";
import { waLink, telLink } from "@/lib/shared/contact";

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
  const { t } = useI18n();
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const transactions = useLiveQuery(() => getPersonTransactions(personId), [personId]);

  if (!person) return null;

  const bg = avatarColorFor(person.name);
  const initial = person.name.trim().charAt(0).toUpperCase();

  function startRename() {
    setNameDraft(person!.name);
    setRenaming(true);
    setMenuOpen(false);
  }

  async function saveRename() {
    const next = nameDraft.trim();
    if (!next || next === person!.name) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    try {
      await renamePerson(personId, next);
      setRenaming(false);
    } catch {
      showToast(t("common.errSaveFailed"));
    } finally {
      setBusy(false);
    }
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
    setMenuOpen(false);
    try {
      const deleted = await deletePersonIfEmpty(personId);
      if (!deleted) {
        showToast(t("person.deleteBlocked"));
        return;
      }
      showToast(t("person.deleted"));
      router.back();
    } catch {
      showToast(t("common.errSaveFailed"));
    }
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
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 text-ink rounded-full active:bg-accent-soft active:scale-90 transition-all"
          aria-label={t("person.actions")}
        >
          <MoreVertical size={20} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-3 top-12 z-40 bg-paper-card border border-rule rounded-xl shadow-lg overflow-hidden w-48"
              >
                <button
                  onClick={startRename}
                  className="block w-full text-left px-4 py-3 text-sm text-ink hover:bg-accent-soft"
                >
                  {t("person.rename")}
                </button>
                <button
                  onClick={() => void handleDelete()}
                  className="block w-full text-left px-4 py-3 text-sm text-danger hover:bg-accent-soft"
                >
                  {t("person.delete")}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
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
    </div>
  );
}
