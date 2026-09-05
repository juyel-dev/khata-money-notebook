import { create } from "zustand";
import type { TransactionType } from "./db/schema";

interface UIState {
  sheetOpen: boolean;
  sheetMode: "add" | "edit";
  sheetNotebookId: string | null;
  sheetPersonId: string | null; // pre-filled person (e.g. opened from Person Detail)
  sheetType: TransactionType;
  sheetTransactionId: string | null; // set when editing an existing transaction
  openAddSheet: (opts: {
    notebookId: string;
    type?: TransactionType;
    personId?: string;
  }) => void;
  openEditSheet: (opts: { notebookId: string; transactionId: string }) => void;
  closeSheet: () => void;

  // "Which notebook?" picker — shown from the bottom-nav Add button when more
  // than one notebook exists, so Add always leads somewhere instead of being
  // a dead end (see docs/NAVIGATION.md).
  notebookPickerOpen: boolean;
  openNotebookPicker: () => void;
  closeNotebookPicker: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sheetOpen: false,
  sheetMode: "add",
  sheetNotebookId: null,
  sheetPersonId: null,
  sheetType: "got",
  sheetTransactionId: null,
  openAddSheet: ({ notebookId, type = "got", personId }) =>
    set({
      sheetOpen: true,
      sheetMode: "add",
      sheetNotebookId: notebookId,
      sheetType: type,
      sheetPersonId: personId ?? null,
      sheetTransactionId: null,
      notebookPickerOpen: false,
    }),
  openEditSheet: ({ notebookId, transactionId }) =>
    set({
      sheetOpen: true,
      sheetMode: "edit",
      sheetNotebookId: notebookId,
      sheetTransactionId: transactionId,
    }),
  closeSheet: () => set({ sheetOpen: false }),

  notebookPickerOpen: false,
  openNotebookPicker: () => set({ notebookPickerOpen: true }),
  closeNotebookPicker: () => set({ notebookPickerOpen: false }),
}));
