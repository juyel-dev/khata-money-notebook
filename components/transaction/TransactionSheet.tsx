"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { useUIStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { db } from "@/lib/db/schema";
import type { TransactionType } from "@/lib/db/schema";
import { findOrCreatePerson } from "@/lib/db/people";
import { addTransaction, updateTransaction, deleteTransaction, getTransaction } from "@/lib/db/transactions";
import { rupeesToPaise, rupeesInputValue, formatMoney, MAX_AMOUNT_RUPEES } from "@/lib/money";
import { colorHex } from "@/lib/shared/notebookStyle";
import { showToast } from "@/components/shared/Toast";

// A note is a short annotation, not a second transaction log — this keeps it
// that way and, just as importantly, keeps it a bounded string so it can
// never grow long enough to overflow the row it's displayed in elsewhere.
const NOTE_MAX_LENGTH = 200;

// Top edge of the Gave/Got card — a smooth downward notch cradles the
// khata pill (flat variant when no notebook is set).
const NOTCH_TOP_PATH =
  "M0 24 L0 9 Q0 3 6 3 L16 3 C24 3 26 15 34 17 L66 17 C74 15 76 3 84 3 L94 3 Q100 3 100 9 L100 24";
const FLAT_TOP_PATH = "M0 24 L0 9 Q0 3 6 3 L94 3 Q100 3 100 9 L100 24";

function toLocalInputValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function TransactionSheet() {
  const { t } = useI18n();
  const {
    sheetOpen,
    sheetMode,
    sheetNotebookId,
    sheetPersonId,
    sheetType,
    sheetTransactionId,
    closeSheet,
  } = useUIStore();

  const [type, setType] = useState<TransactionType>("got");
  const [amount, setAmount] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState<string>(() => toLocalInputValue(Date.now()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [personFocused, setPersonFocused] = useState(false);
  const dragControls = useDragControls();

  // Lock the page behind the sheet — no scroll or pull-to-refresh leaks out.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const people = useLiveQuery(
    () => (sheetNotebookId ? db.people.where("notebookId").equals(sheetNotebookId).toArray() : []),
    [sheetNotebookId]
  );

  const notebook = useLiveQuery(
    () => (sheetNotebookId ? db.notebooks.get(sheetNotebookId) : undefined),
    [sheetNotebookId]
  );

  // Load state whenever the sheet opens
  useEffect(() => {
    if (!sheetOpen) return;
    (async () => {
      if (sheetMode === "edit" && sheetTransactionId) {
        const txn = await getTransaction(sheetTransactionId);
        if (txn) {
          setType(txn.type);
          setAmount(rupeesInputValue(txn.amount));
          setSelectedPersonId(txn.personId);
          const person = await db.people.get(txn.personId);
          setPersonQuery(person?.name ?? "");
          setOccurredAt(toLocalInputValue(txn.occurredAt));
          setNote(txn.note ?? "");
        }
      } else {
        setType(sheetType);
        setAmount("");
        setOccurredAt(toLocalInputValue(Date.now()));
        setNote("");
        if (sheetPersonId) {
          const person = await db.people.get(sheetPersonId);
          setSelectedPersonId(sheetPersonId);
          setPersonQuery(person?.name ?? "");
        } else {
          setSelectedPersonId(null);
          setPersonQuery("");
        }
      }
    })();
  }, [sheetOpen, sheetMode, sheetTransactionId, sheetType, sheetPersonId]);

  const filteredPeople = useMemo(() => {
    if (!people) return [];
    const q = personQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, personQuery]);

  const exactMatch = filteredPeople.find((p) => p.name.toLowerCase() === personQuery.trim().toLowerCase());

  const amountPaise = rupeesToPaise(Number(amount || 0));
  const canSave = amountPaise > 0 && personQuery.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave || !sheetNotebookId) return;
    setSaving(true);
    try {
      let personId = selectedPersonId;
      if (!personId || !exactMatch) {
        const person = await findOrCreatePerson(sheetNotebookId, personQuery.trim());
        personId = person.id;
      }
      const occurredAtMs = new Date(occurredAt).getTime();

      if (sheetMode === "edit" && sheetTransactionId) {
        await updateTransaction(sheetTransactionId, {
          type,
          amount: amountPaise,
          note,
          occurredAt: occurredAtMs,
          personId,
        });
      } else {
        await addTransaction({
          notebookId: sheetNotebookId,
          personId,
          type,
          amount: amountPaise,
          note,
          occurredAt: occurredAtMs,
        });
      }

      const direction = type === "gave" ? t("sheet.to") : t("sheet.from");
      showToast(
        t("sheet.savedToast", { amount: formatMoney(amountPaise), direction, person: personQuery.trim() })
      );
      closeSheet();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sheetTransactionId) return;
    const txnId = sheetTransactionId;
    const snapshot = await getTransaction(txnId);
    await deleteTransaction(txnId);
    closeSheet();
    showToast(t("common.deleted"), {
      actionLabel: t("common.undo"),
      onAction: () => {
        if (snapshot) addTransaction(snapshot);
      },
    });
  };

  return (
    <AnimatePresence>
      {sheetOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 z-40 touch-none"
            onClick={closeSheet}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 550) closeSheet();
            }}
            style={{ touchAction: "pan-y" }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto bg-paper-card rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto overscroll-none"
          >
            {/* Grabber — the only region that starts a dismiss drag */}
            <div
              className="pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1.5 bg-rule rounded-full mx-auto" />
            </div>

            <div className="px-5 pt-1 pb-6 flex flex-col gap-5">
              {/* Gave/Got card — top border dips into a smooth notch that
                  cradles the khata pill, half above the line, half inside */}
              <div className="relative">
                <svg
                  className="block w-full h-6 text-rule"
                  viewBox="0 0 100 24"
                  preserveAspectRatio="none"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d={notebook ? NOTCH_TOP_PATH : FLAT_TOP_PATH}
                    stroke="currentColor"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                  />
                </svg>
                {notebook && (
                  <div className="absolute left-1/2 top-[17px] -translate-x-1/2 -translate-y-1/2 z-10 max-w-[150px]">
                    <div className="flex items-center gap-1.5 rounded-full border border-rule bg-paper-card shadow-md pl-2.5 pr-3 py-1 whitespace-nowrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: colorHex(notebook.color) }}
                      />
                      <span className="text-xs font-semibold text-ink truncate">
                        {notebook.name}
                      </span>
                    </div>
                  </div>
                )}
                <div className="border border-t-0 border-rule rounded-b-2xl px-3 pt-4 pb-3">
                  {/* Type toggle */}
                  <div className="flex rounded-full border border-rule p-1">
                    <button
                      onClick={() => setType("gave")}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                        type === "gave" ? "bg-owe-you text-paper" : "text-ink-dim"
                      }`}
                    >
                      {t("notebook.gave")}
                    </button>
                    <button
                      onClick={() => setType("got")}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                        type === "got" ? "bg-accent text-paper" : "text-ink-dim"
                      }`}
                    >
                      {t("notebook.got")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-ink-dim mb-1">{t("sheet.amount")}</label>
                <div className="flex items-center border-b-2 border-rule focus-within:border-accent pb-1">
                  <span className="text-3xl font-bold text-ink-dim mr-1">₹</span>
                  <input
                    autoFocus={sheetMode === "add"}
                    inputMode="decimal"
                    maxLength={12}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    onBlur={() => {
                      const n = Number(amount || 0);
                      if (n > MAX_AMOUNT_RUPEES) setAmount(String(MAX_AMOUNT_RUPEES));
                    }}
                    placeholder="0"
                    className="w-full bg-transparent text-3xl font-bold text-ink outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Person */}
              <div className="relative">
                <label className="block text-xs font-medium text-ink-dim mb-1">{t("sheet.person")}</label>
                <input
                  value={personQuery}
                  onChange={(e) => {
                    setPersonQuery(e.target.value);
                    setSelectedPersonId(null);
                  }}
                  onFocus={() => setPersonFocused(true)}
                  onBlur={() => setTimeout(() => setPersonFocused(false), 150)}
                  placeholder={t("sheet.personPlaceholder")}
                  className="w-full rounded-xl border border-rule px-4 py-3 text-base text-ink outline-none focus:border-accent"
                />
                {personFocused && personQuery.trim() && (
                  <div className="absolute z-10 mt-1 w-full bg-paper-card border border-rule rounded-xl shadow-lg overflow-hidden">
                    {filteredPeople.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => {
                          setSelectedPersonId(p.id);
                          setPersonQuery(p.name);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent-soft"
                      >
                        {p.name}
                      </button>
                    ))}
                    {!exactMatch && (
                      <button
                        onMouseDown={() => setSelectedPersonId(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-accent font-medium hover:bg-accent-soft"
                      >
                        {t("sheet.addAsNewPerson", { name: personQuery.trim() })}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Date & time */}
              <div>
                <label className="block text-xs font-medium text-ink-dim mb-1">{t("sheet.dateTime")}</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full rounded-xl border border-rule px-4 py-3 text-base text-ink outline-none focus:border-accent"
                />
              </div>

              {/* Note */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="block text-xs font-medium text-ink-dim">{t("sheet.note")}</label>
                  <span className="text-xs text-ink-dim tabular-nums">
                    {note.length}/{NOTE_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                  maxLength={NOTE_MAX_LENGTH}
                  placeholder={t("sheet.notePlaceholder")}
                  rows={2}
                  className="w-full rounded-xl border border-rule px-4 py-3 text-base text-ink outline-none focus:border-accent resize-none"
                />
              </div>

              <button
                disabled={!canSave}
                onClick={handleSave}
                className="w-full rounded-full bg-accent text-paper font-semibold py-3.5 disabled:opacity-40 mt-1"
              >
                {sheetMode === "edit" ? t("sheet.update") : t("sheet.save")}
              </button>

              {sheetMode === "edit" && (
                <button onClick={handleDelete} className="text-sm text-danger underline text-center">
                  {t("sheet.delete")}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
