import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import {
  deriveSyncStatus,
  getRetryDelayMs,
  getSyncStatus,
  setSyncStatus,
  subscribeSyncStatus,
} from "./syncStatus";

describe("sync status", () => {
  beforeEach(async () => {
    await syncDb.syncMeta.clear();
  });

  it("derives local-only when signed out", () => {
    expect(deriveSyncStatus({ signedIn: false, online: true })).toBe("local-only");
  });

  it("prioritizes reconciliation over connectivity", () => {
    expect(
      deriveSyncStatus({
        signedIn: true,
        online: true,
        linkStatus: "reconciliation-required",
      }),
    ).toBe("needs-reconciliation");
  });

  it("reports offline before queue state", () => {
    expect(
      deriveSyncStatus({
        signedIn: true,
        online: false,
        linkStatus: "linked",
        pendingCount: 3,
      }),
    ).toBe("offline");
  });

  it("reports errors before syncing when failed mutations exist", () => {
    expect(
      deriveSyncStatus({
        signedIn: true,
        online: true,
        linkStatus: "linked",
        pendingCount: 2,
        failedCount: 1,
      }),
    ).toBe("error");
  });

  it("reports syncing for an active link or pending queue", () => {
    expect(
      deriveSyncStatus({
        signedIn: true,
        online: true,
        linkStatus: "linking",
      }),
    ).toBe("syncing");

    expect(
      deriveSyncStatus({
        signedIn: true,
        online: true,
        linkStatus: "linked",
        pendingCount: 1,
      }),
    ).toBe("syncing");
  });

  it("reports synced only when a linked account is online and idle", () => {
    expect(
      deriveSyncStatus({
        signedIn: true,
        online: true,
        linkStatus: "linked",
      }),
    ).toBe("synced");
  });

  it("uses capped exponential retry backoff", () => {
    expect(getRetryDelayMs(0)).toBe(1000);
    expect(getRetryDelayMs(1)).toBe(2000);
    expect(getRetryDelayMs(8)).toBe(256000);
    expect(getRetryDelayMs(20)).toBe(300000);
  });

  it("persists and publishes the latest status", async () => {
    const received: string[] = [];
    const unsubscribe = subscribeSyncStatus((snapshot) => received.push(snapshot.status));

    const saved = await setSyncStatus("synced", { lastSyncedAt: 123 });
    const loaded = await getSyncStatus();

    unsubscribe();

    expect(saved).toEqual(loaded);
    expect(saved.lastSyncedAt).toBe(123);
    expect(received).toEqual(["synced"]);
  });
});
