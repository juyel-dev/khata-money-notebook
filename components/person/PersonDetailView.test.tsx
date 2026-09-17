import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, resetTestDb, mockRouter } from "@/tests/test-utils";
import { PersonDetailView } from "./PersonDetailView";
import { db } from "@/lib/db/schema";
import { useToastStore } from "@/components/shared/Toast";
import * as peopleDb from "@/lib/db/people";

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const NOTEBOOK_ID = "n1";
const PERSON_ID = "p1";

function renderView() {
  return renderWithProviders(<PersonDetailView notebookId={NOTEBOOK_ID} personId={PERSON_ID} />);
}

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
  await db.people.add({ id: PERSON_ID, notebookId: NOTEBOOK_ID, name: "Rahim", createdAt: 1 });
  mockRouter.back.mockClear();
  useToastStore.getState().hide();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PersonDetailView — header", () => {
  it("shows the person's name and avatar initial", async () => {
    renderView();
    expect(await screen.findByText("Rahim")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("renames the person via the kebab menu", async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Rahim");

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const input = screen.getByPlaceholderText("Person name");
    await user.clear(input);
    await user.type(input, "Rahim Uddin{Enter}");

    await waitFor(async () => {
      const updated = await db.people.get(PERSON_ID);
      expect(updated?.name).toBe("Rahim Uddin");
    });
  });

  it("blocks deletion and shows a toast when the person has transactions", async () => {
    await db.transactions.add({
      id: "t1",
      notebookId: NOTEBOOK_ID,
      personId: PERSON_ID,
      type: "got",
      amount: 100,
      note: "Test transaction",
      occurredAt: Date.now(),
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Rahim");

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Delete person" }));

    await waitFor(() =>
      expect(useToastStore.getState().message).toBe("Can't delete — this person has transactions"),
    );
    expect(await db.people.get(PERSON_ID)).toBeDefined();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("deletes an empty person and navigates back", async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Rahim");

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Delete person" }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await db.people.get(PERSON_ID)).toBeUndefined();
  });

  it("shows a toast instead of getting stuck when rename fails", async () => {
    vi.spyOn(peopleDb, "renamePerson").mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Rahim");

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Rename" }));
    const input = screen.getByPlaceholderText("Person name");
    await user.type(input, " Uddin{Enter}");

    await waitFor(() => expect(useToastStore.getState().message).toBe("Couldn't save. Please try again."));
  });

  it("shares a plain-text statement via the kebab menu", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });
    await db.transactions.add({
      id: "t1",
      notebookId: NOTEBOOK_ID,
      personId: PERSON_ID,
      type: "gave",
      amount: 50000,
      note: "Cloth",
      occurredAt: Date.now(),
      createdAt: Date.now(),
    });
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Rahim");

    await user.click(screen.getByRole("button", { name: "Person actions" }));
    await user.click(screen.getByRole("button", { name: "Share statement" }));

    await waitFor(() => expect(shareMock).toHaveBeenCalled());
    const call = shareMock.mock.calls[0][0];
    expect(call.title).toBe("Rahim");
    expect(call.text).toContain("Cloth Shop — Rahim");
    expect(call.text).toMatch(/−₹500/);

    Reflect.deleteProperty(navigator, "share");
  });
});

describe("PersonDetailView — phone/WhatsApp", () => {
  it("prompts to add a phone number when none is set", async () => {
    renderView();
    expect(await screen.findByText("+ Add phone number")).toBeInTheDocument();
  });

  it("saves a phone number and shows Call/WhatsApp actions with correct links", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByText("+ Add phone number"));

    const input = screen.getByPlaceholderText("Phone number");
    await user.type(input, "9876543210");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () => {
      const updated = await db.people.get(PERSON_ID);
      expect(updated?.phone).toBe("9876543210");
    });
    expect(await screen.findByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:9876543210");
    expect(await screen.findByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      "https://wa.me/9876543210",
    );
  });

  it("shows a toast instead of getting stuck when saving the phone number fails", async () => {
    vi.spyOn(peopleDb, "updatePersonPhone").mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByText("+ Add phone number"));
    await user.type(screen.getByPlaceholderText("Phone number"), "9876543210");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(useToastStore.getState().message).toBe("Couldn't save. Please try again."));
  });
});
