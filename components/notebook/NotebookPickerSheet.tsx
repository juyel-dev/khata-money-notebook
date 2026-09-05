"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { useUIStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { colorHex } from "@/lib/shared/notebookStyle";
import { NOTEBOOK_ICON_MAP } from "./icons";

export function NotebookPickerSheet() {
  const { t } = useI18n();
  const notebookPickerOpen = useUIStore((s) => s.notebookPickerOpen);
  const closeNotebookPicker = useUIStore((s) => s.closeNotebookPicker);
  const openAddSheet = useUIStore((s) => s.openAddSheet);

  const notebooks = useLiveQuery(
    () => db.notebooks.filter((n) => !n.archived).toArray(),
    []
  );

  return (
    <AnimatePresence>
      {notebookPickerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 z-40"
            onClick={closeNotebookPicker}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto bg-paper rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="w-10 h-1.5 bg-rule rounded-full mx-auto mt-3" />
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-base font-bold text-ink">{t("sheet.whichNotebook")}</h2>
            </div>
            <div className="px-5 pb-6">
              {notebooks?.map((nb) => {
                const Icon = NOTEBOOK_ICON_MAP[nb.icon];
                const hex = colorHex(nb.color);
                return (
                  <button
                    key={nb.id}
                    onClick={() => openAddSheet({ notebookId: nb.id })}
                    className="w-full flex items-center gap-3 py-3 border-b border-rule text-left active:opacity-70"
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${hex}22`, color: hex }}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="font-semibold text-ink">{nb.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
