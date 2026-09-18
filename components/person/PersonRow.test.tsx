import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, resetTestDb } from "@/tests/test-utils";
import { PersonRow } from "./PersonRow";
import { db } from "@/lib/db/schema";
import { useToastStore } from "@/components/shared/Toast";

const toBlobMock = vi.fn();
vi.mock("html-to-image", () => ({ toBlob: (...args: unknown[]) => toBlobMock(...args) }));

const NOTEBOOK_ID = "n1";
const PERSON = { id: "p1", notebookId: NOTEBOOK_ID, name: "Rahim", createdAt: 1 };

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
  await db.people.add(PERSON);
  useToastStore.getState().hide();
  toBlobMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PersonRow — kebab menu", () => {
  it("renames the person inline without navigating", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PersonRow notebookId={NOTEBOOK_ID} person={PERSON} txnCount={2} />);

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const input = screen.getByDisplayValue("Rahim");
    await user.clear(input);
    await user.type(input, "Rahim Uddin{Enter}");

    await waitFor(async () => {
      const updated = await db.people.get(PERSON.id);
      expect(updated?.name).toBe("Rahim Uddin");
    });
  });

  it("shares a plain-text statement without navigating", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });
    await db.transactions.add({
      id: "t1",
      notebookId: NOTEBOOK_ID,
      personId: PERSON.id,
      type: "got",
      amount: 20000,
      occurredAt: Date.now(),
      createdAt: Date.now(),
    });

    const user = userEvent.setup();
    renderWithProviders(<PersonRow notebookId={NOTEBOOK_ID} person={PERSON} />);

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Share statement" }));

    await waitFor(() => expect(shareMock).toHaveBeenCalled());
    expect(shareMock.mock.calls[0][0].text).toContain("Cloth Shop — Rahim");

    Reflect.deleteProperty(navigator, "share");
  });

  it("fetches transactions on demand and shares an image, without every row pre-loading them", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });
    toBlobMock.mockResolvedValue(blob);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue("blob:x"), revokeObjectURL: vi.fn() });

    const user = userEvent.setup();
    renderWithProviders(<PersonRow notebookId={NOTEBOOK_ID} person={PERSON} />);

    // Nothing fetched/rendered for image sharing until the action is used.
    expect(toBlobMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Share as image" }));

    await waitFor(() => expect(toBlobMock).toHaveBeenCalled());
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("does not offer a Delete action here — every listed person always has a transaction", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PersonRow notebookId={NOTEBOOK_ID} person={PERSON} />);

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    expect(screen.queryByRole("button", { name: "Delete person" })).not.toBeInTheDocument();
  });
});
