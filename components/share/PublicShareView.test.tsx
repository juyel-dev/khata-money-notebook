import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/test-utils";
import { PublicShareView } from "./PublicShareView";
import * as sharingLib from "@/lib/firebase/sharing";
import * as clientLib from "@/lib/firebase/client";
import { cacheShareSnapshot, getCachedShareSnapshot } from "@/lib/shared/shareViewCache";
import type { ShareSnapshot } from "@/lib/firebase/sharing";

const TOKEN = "tok1";

const snapshot: ShareSnapshot = {
  record: {
    token: TOKEN,
    ownerUid: "u1",
    scope: "khata",
    notebookId: "n1",
    title: "Cloth Shop",
    createdAt: Date.now(),
    expiresAt: null,
    active: true,
    schemaVersion: 1,
  },
  notebook: {
    id: "n1",
    name: "Cloth Shop",
    openingBalance: 0,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    color: "green",
    icon: "book",
  },
  people: [{ id: "p1", notebookId: "n1", name: "Rahim", createdAt: 1 }],
  transactions: [
    { id: "t1", notebookId: "n1", personId: "p1", type: "got", amount: 20000, occurredAt: Date.now(), createdAt: Date.now() },
  ],
};

function mockServicesAvailable() {
  vi.spyOn(clientLib, "getFirebaseServices").mockReturnValue({ firestore: {} } as unknown as ReturnType<
    typeof clientLib.getFirebaseServices
  >);
}

beforeEach(async () => {
  // Clear any cache left by a previous test.
  const { clearCachedShareSnapshot } = await import("@/lib/shared/shareViewCache");
  await clearCachedShareSnapshot(TOKEN);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PublicShareView — live success", () => {
  it("renders the snapshot and caches it for offline fallback", async () => {
    mockServicesAvailable();
    vi.spyOn(sharingLib, "readPublicShare").mockResolvedValue(snapshot);

    renderWithProviders(<PublicShareView token={TOKEN} />);

    expect(await screen.findByText("Cloth Shop")).toBeInTheDocument();
    expect(screen.queryByText(/showing the copy last viewed/i)).not.toBeInTheDocument();

    await waitFor(async () => {
      expect(await getCachedShareSnapshot(TOKEN)).not.toBeNull();
    });
  });
});

describe("PublicShareView — server says unavailable", () => {
  it("shows the unavailable state and clears any existing cache", async () => {
    await cacheShareSnapshot(TOKEN, snapshot);
    mockServicesAvailable();
    vi.spyOn(sharingLib, "readPublicShare").mockResolvedValue(null);

    renderWithProviders(<PublicShareView token={TOKEN} />);

    expect(await screen.findByText("This share link is no longer available.")).toBeInTheDocument();
    await waitFor(async () => {
      expect(await getCachedShareSnapshot(TOKEN)).toBeNull();
    });
  });
});

describe("PublicShareView — network failure", () => {
  it("falls back to a cached snapshot and shows the offline banner", async () => {
    await cacheShareSnapshot(TOKEN, snapshot);
    mockServicesAvailable();
    vi.spyOn(sharingLib, "readPublicShare").mockRejectedValue(new Error("offline"));

    renderWithProviders(<PublicShareView token={TOKEN} />);

    expect(await screen.findByText("Cloth Shop")).toBeInTheDocument();
    expect(await screen.findByText(/showing the copy last viewed/i)).toBeInTheDocument();
  });

  it("shows the unavailable state when there is no cache to fall back to", async () => {
    mockServicesAvailable();
    vi.spyOn(sharingLib, "readPublicShare").mockRejectedValue(new Error("offline"));

    renderWithProviders(<PublicShareView token={TOKEN} />);

    expect(await screen.findByText("This share link is no longer available.")).toBeInTheDocument();
  });
});
