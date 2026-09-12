import { describe, expect, it } from "vitest";
import { deriveSyncStatus } from "./syncStatus";

const emptyQueue = { pending: 0, syncing: 0, failed: 0 };

describe("deriveSyncStatus", () => {
  it("keeps signed-out users local-only", () => {
    expect(deriveSyncStatus({ signedIn: false, linked: false, online: true, firebaseAvailable: true, syncing: false, queue: emptyQueue }).kind).toBe("signed-out");
  });

  it("does not treat a signed-in but unlinked account as synced", () => {
    expect(deriveSyncStatus({ signedIn: true, linked: false, online: true, firebaseAvailable: true, syncing: false, queue: emptyQueue }).kind).toBe("needs-link");
  });

  it("prefers offline over a normal synced state", () => {
    expect(deriveSyncStatus({ signedIn: true, linked: true, online: false, firebaseAvailable: true, syncing: false, queue: emptyQueue }).kind).toBe("offline");
  });

  it("reports syncing before queue errors", () => {
    expect(deriveSyncStatus({ signedIn: true, linked: true, online: true, firebaseAvailable: true, syncing: true, queue: { pending: 1, syncing: 1, failed: 2 } }).kind).toBe("syncing");
  });

  it("reports failed mutations as an error state", () => {
    const status = deriveSyncStatus({ signedIn: true, linked: true, online: true, firebaseAvailable: true, syncing: false, queue: { pending: 0, syncing: 0, failed: 1 }, lastError: "network" });
    expect(status.kind).toBe("error");
    expect(status.lastError).toBe("network");
  });

  it("reports a clean linked account as synced", () => {
    expect(deriveSyncStatus({ signedIn: true, linked: true, online: true, firebaseAvailable: true, syncing: false, queue: emptyQueue, lastSyncedAt: 123 }).kind).toBe("synced");
  });
});
