import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, resetTestDb } from "../../tests/test-utils";
import { TransactionSheet } from "./TransactionSheet";
import { useUIStore } from "@/lib/store";
import { db } from "@/lib/db/schema";
import { useToastStore } from "@/components/shared/Toast";
import * as transactionsDb from "@/lib/db/transactions";

const NOTEBOOK_ID = "n1";

beforeEach(async () => {
  await resetTestDb();
  await db.notebooks.add({
    id: NOTEBOOK_ID,
    name: "Cloth Shop",
    openingBalance: 0,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    color: "green",
    icon: "book",
  });
  useToastStore.getState().hide();
  useUIStore.setState({
    sheetOpen: false,
    sheetMode: "add",
    sheetNotebookId: null,
    sheetPersonId: null,
    sheetType: "got",
    sheetTransactionId: null,
    notebookPickerOpen: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function fillValidAddForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Amount"), "100");
  await user.type(screen.getByPlaceholderText("Search or add a name"), "Rahim");
}

describe("TransactionSheet — add", () => {
  it("saves a valid transaction, shows a confirmation, and closes", async () => {
    useUIStore.getState().openAddSheet({ notebookId: NOTEBOOK_ID });
    renderWithProviders(<TransactionSheet />);

    await fillValidAddForm();
    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(useUIStore.getState().sheetOpen).toBe(false));
    const saved = await db.transactions.toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0].amount).toBe(10000); // paise
    expect(useToastStore.getState().message).toContain("Rahim");
  });

  it("rejects an invalid date instead of writing a corrupt transaction", async () => {
    // Regression test: clearing the datetime-local field produces
    // occurredAtMs = NaN. lib/db/transactions.ts's assertValidOccurredAt
    // already rejects this — this test is about the UI actually telling the
    // user, not going silent with an unhandled rejection.
    useUIStore.getState().openAddSheet({ notebookId: NOTEBOOK_ID });
    renderWithProviders(<TransactionSheet />);

    await fillValidAddForm();
    const dateInput = document.querySelector('input[type="datetime-local"]');
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput as Element, { target: { value: "" } });

    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(useToastStore.getState().message).toBe("Couldn't save. Please try again."));
    expect(useUIStore.getState().sheetOpen).toBe(true);
    expect(await db.transactions.toArray()).toHaveLength(0);
  });

  it("re-enables Save and shows a toast instead of getting stuck when the write fails", async () => {
    vi.spyOn(transactionsDb, "addTransaction").mockRejectedValueOnce(new Error("boom"));
    useUIStore.getState().openAddSheet({ notebookId: NOTEBOOK_ID });
    renderWithProviders(<TransactionSheet />);

    await fillValidAddForm();
    const saveButton = screen.getByRole("button", { name: "Save" });
    await userEvent.setup().click(saveButton);

    await waitFor(() => expect(useToastStore.getState().message).toBe("Couldn't save. Please try again."));
    expect(saveButton).not.toBeDisabled();
    expect(useUIStore.getState().sheetOpen).toBe(true);
    expect(await db.transactions.toArray()).toHaveLength(0);
  });

  it("keeps Save disabled until amount and person are both filled", () => {
    useUIStore.getState().openAddSheet({ notebookId: NOTEBOOK_ID });
    renderWithProviders(<TransactionSheet />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});

describe("TransactionSheet — delete", () => {
  async function seedTransaction() {
    await db.people.add({ id: "p1", notebookId: NOTEBOOK_ID, name: "Rahim", createdAt: 1 });
    await db.transactions.add({
      id: "t1",
      notebookId: NOTEBOOK_ID,
      personId: "p1",
      type: "got",
      amount: 10000,
      occurredAt: Date.now(),
      createdAt: Date.now(),
    });
  }

  it("shows a toast instead of silently doing nothing when deleting fails", async () => {
    await seedTransaction();
    vi.spyOn(transactionsDb, "deleteTransaction").mockRejectedValueOnce(new Error("boom"));
    useUIStore.getState().openEditSheet({ notebookId: NOTEBOOK_ID, transactionId: "t1" });
    renderWithProviders(<TransactionSheet />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument());
    await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(useToastStore.getState().message).toBe("Couldn't save. Please try again."));
    expect(useUIStore.getState().sheetOpen).toBe(true);
    expect(await db.transactions.toArray()).toHaveLength(1);
  });
});
