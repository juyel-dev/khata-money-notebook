"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { useUIStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { db } from "@/lib/db/schema";
import type { TransactionType } from "@/lib/db/schema";
import { findOrCreatePerson } from "@/lib/db/people";
import { addTransaction, updateTransaction, deleteTransaction, getTransaction } from "@/lib/db/transactions";
import { rupeesToPaise, paiseToRupees, formatMoney } from "@/lib/money";
import { showToast } from "@/components/shared/Toast";

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

  const people = useLiveQuery(
    () => (sheetNotebookId ? db.people.where("notebookId").equals(sheetNotebookId).toArray() : []),
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
          setAmount(String(paiseToRupees(txn.amount)));
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
            className="fixed inset-0 bg-ink/40 z-40"
            onClick={closeSheet}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto bg-paper rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="w-10 h-1.5 bg-rule rounded-full mx-auto mt-3" />

            <div className="px-5 pt-4 pb-6 flex flex-col gap-5">
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

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-ink-dim mb-1">{t("sheet.amount")}</label>
                <div className="flex items-center border-b-2 border-rule focus-within:border-accent pb-1">
                  <span className="text-3xl font-bold text-ink-dim mr-1">₹</span>
                  <input
                    autoFocus={sheetMode === "add"}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
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
                  <div className="absolute z-10 mt-1 w-full bg-paper border border-rule rounded-xl shadow-lg overflow-hidden">
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
                <label className="block text-xs font-medium text-ink-dim mb-1">{t("sheet.note")}</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("sheet.notePlaceholder")}
                  className="w-full rounded-xl border border-rule px-4 py-3 text-base text-ink outline-none focus:border-accent"
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
