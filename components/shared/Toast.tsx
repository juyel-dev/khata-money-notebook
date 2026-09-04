"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

interface ToastState {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void }) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message, opts) =>
    set({ message, actionLabel: opts?.actionLabel, onAction: opts?.onAction }),
  hide: () => set({ message: null, actionLabel: undefined, onAction: undefined }),
}));

let dismissTimer: ReturnType<typeof setTimeout> | null = null;
export function showToast(message: string, opts?: { actionLabel?: string; onAction?: () => void }) {
  useToastStore.getState().show(message, opts);
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => useToastStore.getState().hide(), 5000);
}

export function ToastHost() {
  const { message, actionLabel, onAction, hide } = useToastStore();
  const { t } = useI18n();

  return (
    <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto max-w-md w-full bg-ink text-paper rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg"
          >
            <span className="text-sm">{message}</span>
            {actionLabel && (
              <button
                onClick={() => {
                  onAction?.();
                  hide();
                }}
                className="text-sm font-semibold underline shrink-0"
              >
                {actionLabel ?? t("common.undo")}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
