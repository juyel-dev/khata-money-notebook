import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, resetTestDb, mockRouter } from "@/tests/test-utils";
import { NotebookForm } from "./NotebookForm";
import { db } from "@/lib/db/schema";
import { useToastStore } from "@/components/shared/Toast";
import * as notebooksDb from "@/lib/db/notebooks";
import type { Notebook } from "@/lib/db/schema";

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

beforeEach(async () => {
  await resetTestDb();
  mockRouter.push.mockClear();
  useToastStore.getState().hide();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function existingNotebook(overrides: Partial<Notebook> = {}): Notebook {
  return {
    id: "n1",
    name: "Cloth Shop",
    openingBalance: 0,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    color: "green",
    icon: "book",
    pinned: false,
    groupId: null,
    ...overrides,
  };
}

describe("NotebookForm — create", () => {
  it("creates a notebook and navigates to it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotebookForm />);

    await user.type(screen.getByPlaceholderText("e.g. Cloth Shop"), "Grocery");
    await user.click(screen.getByRole("button", { name: "Save notebook" }));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
    const created = await db.notebooks.toArray();
    expect(created).toHaveLength(1);
    expect(created[0].name).toBe("Grocery");
    expect(mockRouter.push).toHaveBeenCalledWith(`/notebook/${created[0].id}`);
  });

  it("re-enables Save and shows a toast instead of getting stuck when the write fails", async () => {
    // Regression test for the bug fixed alongside common.errSaveFailed:
    // handleSave previously had no try/finally around setSaving(true), so a
    // thrown error left the button permanently disabled.
    vi.spyOn(notebooksDb, "createNotebook").mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderWithProviders(<NotebookForm />);

    const saveButton = screen.getByRole("button", { name: "Save notebook" });
    await user.type(screen.getByPlaceholderText("e.g. Cloth Shop"), "Grocery");
    await user.click(saveButton);

    await waitFor(() => expect(useToastStore.getState().message).toBe("Couldn't save. Please try again."));
    expect(saveButton).not.toBeDisabled();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(await db.notebooks.toArray()).toHaveLength(0);
  });

  it("keeps Save disabled while the name field is empty", () => {
    renderWithProviders(<NotebookForm />);
    expect(screen.getByRole("button", { name: "Save notebook" })).toBeDisabled();
  });
});

describe("NotebookForm — edit", () => {
  it("prefills the form from the existing notebook", () => {
    renderWithProviders(<NotebookForm existing={existingNotebook()} />);
    expect(screen.getByDisplayValue("Cloth Shop")).toBeInTheDocument();
  });

  it("shows a toast instead of silently doing nothing when archiving fails", async () => {
    vi.spyOn(notebooksDb, "archiveNotebook").mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderWithProviders(<NotebookForm existing={existingNotebook()} />);

    await user.click(screen.getByRole("button", { name: "Archive this notebook" }));

    await waitFor(() => expect(useToastStore.getState().message).toBe("Couldn't save. Please try again."));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
