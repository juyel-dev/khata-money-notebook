import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/test-utils";
import { ShareSheet } from "./ShareSheet";
import * as sharingLib from "@/lib/firebase/sharing";
import * as clientLib from "@/lib/firebase/client";
import type { Person } from "@/lib/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const uid = "alice-uid";

function mockSignedIn() {
  vi.spyOn(clientLib, "getFirebaseServices").mockReturnValue({
    auth: { currentUser: { uid } },
    firestore: {},
  } as unknown as ReturnType<typeof clientLib.getFirebaseServices>);
}

beforeEach(() => {
  vi.spyOn(sharingLib, "listActiveShares").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const people: Person[] = [{ id: "p1", notebookId: "n1", name: "Rahim", createdAt: 1 }];

describe("ShareSheet — expiry", () => {
  it("defaults to Never and creates a share with no expiresInMs", async () => {
    mockSignedIn();
    const createSpy = vi
      .spyOn(sharingLib, "createShareSnapshot")
      .mockResolvedValue({ token: "tok1", url: "https://example.com/share/tok1" });
    const user = userEvent.setup();
    renderWithProviders(
      <ShareSheet open notebookId="n1" notebookName="Cloth Shop" people={people} onClose={() => {}} />,
    );

    await user.click(screen.getByRole("button", { name: "Create share link" }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy).toHaveBeenCalledWith(
      expect.anything(),
      uid,
      expect.objectContaining({ expiresInMs: null }),
    );
  });

  it("passes the selected expiry option to createShareSnapshot", async () => {
    mockSignedIn();
    const createSpy = vi
      .spyOn(sharingLib, "createShareSnapshot")
      .mockResolvedValue({ token: "tok1", url: "https://example.com/share/tok1" });
    const user = userEvent.setup();
    renderWithProviders(
      <ShareSheet open notebookId="n1" notebookName="Cloth Shop" people={people} onClose={() => {}} />,
    );

    await user.click(screen.getByRole("button", { name: "7 days" }));
    await user.click(screen.getByRole("button", { name: "Create share link" }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy).toHaveBeenCalledWith(
      expect.anything(),
      uid,
      expect.objectContaining({ expiresInMs: 7 * DAY_MS }),
    );
  });

  it("shows 'Never expires' and 'Expires in Xd' correctly in the active links list", async () => {
    mockSignedIn();
    vi.spyOn(sharingLib, "listActiveShares").mockResolvedValue([
      {
        token: "never-tok",
        ownerUid: uid,
        scope: "khata",
        notebookId: "n1",
        title: "Cloth Shop",
        createdAt: Date.now(),
        expiresAt: null,
        active: true,
        schemaVersion: 1,
      },
      {
        token: "timed-tok",
        ownerUid: uid,
        scope: "khata",
        notebookId: "n1",
        title: "Cloth Shop",
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * DAY_MS,
        active: true,
        schemaVersion: 1,
      },
    ]);

    renderWithProviders(
      <ShareSheet open notebookId="n1" notebookName="Cloth Shop" people={people} onClose={() => {}} />,
    );

    expect(await screen.findByText("Never expires")).toBeInTheDocument();
    expect(await screen.findByText("Expires in 5d")).toBeInTheDocument();
  });
});
