import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccountLink: vi.fn(),
  assertAccountLinkTarget: vi.fn(),
  readMutationJournal: vi.fn(),
  pushMutation: vi.fn(),
  resolveConflict: vi.fn(),
  getPendingMutations: vi.fn(),
  getRetryableFailedMutations: vi.fn(),
  markMutationFailed: vi.fn(),
  markMutationSyncing: vi.fn(),
  removeMutation: vi.fn(),
  resetStaleSyncingMutations: vi.fn(),
  getSyncCursor: vi.fn(),
  getEntityVersion: vi.fn(),
  setEntityVersion: vi.fn(),
  setSyncCursor: vi.fn(),
  observeLogicalClock: vi.fn(),
  recordTombstone: vi.fn(),
  clearTombstoneForNewerUpsert: vi.fn(),
  shouldRejectUpsert: vi.fn(),
  table: { put: vi.fn(), delete: vi.fn() },
}));

vi.mock("../db/schema", () => ({
  db: {
    notebooks: mocks.table,
    groups: mocks.table,
    people: mocks.table,
    transactions: mocks.table,
  },
}));
vi.mock("./accountLink", () => ({
  getAccountLink: mocks.getAccountLink,
  assertAccountLinkTarget: mocks.assertAccountLinkTarget,
}));
vi.mock("./firestoreSync", () => ({
  readMutationJournal: mocks.readMutationJournal,
  pushMutation: mocks.pushMutation,
}));
vi.mock("./syncConflict", () => ({ resolveConflict: mocks.resolveConflict }));
vi.mock("./syncQueue", () => ({
  getPendingMutations: mocks.getPendingMutations,
  getRetryableFailedMutations: mocks.getRetryableFailedMutations,
  markMutationFailed: mocks.markMutationFailed,
  markMutationSyncing: mocks.markMutationSyncing,
  removeMutation: mocks.removeMutation,
  resetStaleSyncingMutations: mocks.resetStaleSyncingMutations,
}));
vi.mock("./syncState", () => ({
  getSyncCursor: mocks.getSyncCursor,
  getEntityVersion: mocks.getEntityVersion,
  setEntityVersion: mocks.setEntityVersion,
  setSyncCursor: mocks.setSyncCursor,
}));
vi.mock("./syncIdentity", () => ({ observeLogicalClock: mocks.observeLogicalClock }));
vi.mock("./syncTombstones", () => ({
  recordTombstone: mocks.recordTombstone,
  clearTombstoneForNewerUpsert: mocks.clearTombstoneForNewerUpsert,
  shouldRejectUpsert: mocks.shouldRejectUpsert,
}));

import { syncOnce } from "./syncEngine";

describe("sync engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccountLink.mockResolvedValue({ status: "linked", uid: "user-1" });
    mocks.assertAccountLinkTarget.mockResolvedValue({ status: "linked", uid: "user-1" });
    mocks.resetStaleSyncingMutations.mockResolvedValue(0);
    mocks.getPendingMutations.mockResolvedValue([]);
    mocks.getRetryableFailedMutations.mockResolvedValue([]);
    mocks.getSyncCursor.mockResolvedValue(0);
    mocks.readMutationJournal.mockResolvedValue({ mutations: [], nextCursor: null });
  });

  it("requires a completed account link before network sync", async () => {
    mocks.assertAccountLinkTarget.mockResolvedValue(null);
    await expect(syncOnce({} as never, "user-1")).rejects.toThrow("RECONCILIATION_REQUIRED");
    expect(mocks.pushMutation).not.toHaveBeenCalled();
  });

  it("pushes pending mutations, then pulls until an empty page", async () => {
    const mutation = {
      id: "transaction:tx-1:1:device-a:1",
      entity: "transaction" as const,
      entityId: "tx-1",
      operation: "upsert" as const,
      payload: {
        id: "tx-1",
        notebookId: "nb-1",
        personId: "p-1",
        type: "gave" as const,
        amount: 50000,
        occurredAt: 1,
        createdAt: 1,
      },
      changedAt: 1,
      version: { changedAt: 1, deviceId: "device-a", sequence: 1 },
      status: "pending" as const,
      attempts: 0,
    };
    mocks.getPendingMutations.mockResolvedValue([mutation]);
    mocks.pushMutation.mockResolvedValue(undefined);
    mocks.readMutationJournal
      .mockResolvedValueOnce({
        mutations: [
          {
            id: "transaction:tx-remote:2:device-b:2",
            entity: "transaction",
            entityId: "tx-remote",
            operation: "upsert",
            payload: { ...mutation.payload, id: "tx-remote" },
            version: { changedAt: 2, deviceId: "device-b", sequence: 2 },
          },
        ],
        nextCursor: { receivedOrder: 4 },
      })
      .mockResolvedValueOnce({ mutations: [], nextCursor: { receivedOrder: 4 } });
    mocks.getEntityVersion.mockResolvedValue(null);
    mocks.resolveConflict.mockReturnValue("incoming");
    mocks.shouldRejectUpsert.mockResolvedValue(false);
    mocks.observeLogicalClock.mockResolvedValue(3);
    mocks.table.put.mockResolvedValue("tx-remote");

    const result = await syncOnce({} as never, "user-1");

    expect(result).toMatchObject({ pushed: 1, pulled: 1, skipped: 0, pages: 2 });
    expect(mocks.pushMutation).toHaveBeenCalledWith(expect.anything(), "user-1", mutation);
    expect(mocks.setSyncCursor).toHaveBeenCalledWith("user-1", 4);
    expect(mocks.observeLogicalClock).toHaveBeenCalledWith(2);
    expect(mocks.table.put).toHaveBeenCalledWith({ ...mutation.payload, id: "tx-remote" });
  });

  it("retries failed mutations only when their retry window is due", async () => {
    const retryable = {
      id: "transaction:tx-retry:1:device-a:1",
      entity: "transaction" as const,
      entityId: "tx-retry",
      operation: "delete" as const,
      changedAt: 1,
      version: { changedAt: 1, deviceId: "device-a", sequence: 1 },
      status: "failed" as const,
      attempts: 1,
      nextRetryAt: 10,
      lastError: "offline",
    };
    mocks.getRetryableFailedMutations.mockResolvedValue([retryable]);
    mocks.pushMutation.mockResolvedValue(undefined);

    await syncOnce({} as never, "user-1");

    expect(mocks.getRetryableFailedMutations).toHaveBeenCalledWith(expect.any(Number), 50);
    expect(mocks.pushMutation).toHaveBeenCalledWith(expect.anything(), "user-1", retryable);
    expect(mocks.removeMutation).toHaveBeenCalledWith(retryable.id);
  });

  it("continues pushing later mutations after one mutation becomes failed", async () => {
    const poison = {
      id: "transaction:tx-poison:1:device-a:1",
      entity: "transaction" as const,
      entityId: "tx-poison",
      operation: "delete" as const,
      changedAt: 1,
      version: { changedAt: 1, deviceId: "device-a", sequence: 1 },
      status: "pending" as const,
      attempts: 0,
    };
    const later = {
      ...poison,
      id: "transaction:tx-later:2:device-a:2",
      entityId: "tx-later",
      version: { changedAt: 2, deviceId: "device-a", sequence: 2 },
    };

    mocks.getPendingMutations.mockResolvedValue([poison, later]);
    mocks.pushMutation.mockRejectedValueOnce(new Error("permanent failure")).mockResolvedValueOnce(undefined);

    await expect(syncOnce({} as never, "user-1")).rejects.toThrow("permanent failure");

    expect(mocks.markMutationFailed).toHaveBeenCalledWith(poison.id, "permanent failure");
    expect(mocks.pushMutation).toHaveBeenNthCalledWith(1, expect.anything(), "user-1", poison);
    expect(mocks.pushMutation).toHaveBeenNthCalledWith(2, expect.anything(), "user-1", later);
    expect(mocks.removeMutation).toHaveBeenCalledWith(later.id);
    expect(mocks.readMutationJournal).toHaveBeenCalled();
  });

  it("persists progress when a page contains only quarantined rows", async () => {
    mocks.readMutationJournal
      .mockResolvedValueOnce({ mutations: [], nextCursor: { receivedOrder: 9 } })
      .mockResolvedValueOnce({ mutations: [], nextCursor: { receivedOrder: 9 } });

    const result = await syncOnce({} as never, "user-1");

    expect(result.pages).toBe(2);
    expect(result.pulled).toBe(0);
    expect(mocks.setSyncCursor).toHaveBeenCalledWith("user-1", 9);
    expect(mocks.readMutationJournal).toHaveBeenNthCalledWith(1, expect.anything(), "user-1", null, 100);
    expect(mocks.readMutationJournal).toHaveBeenNthCalledWith(2, expect.anything(), "user-1", { receivedOrder: 9 }, 100);
  });

  it("does not use cursor equality as the empty-page stop condition", async () => {
    mocks.getSyncCursor.mockResolvedValue(0);
    mocks.readMutationJournal.mockResolvedValue({ mutations: [], nextCursor: null });

    const result = await syncOnce({} as never, "user-1");

    expect(result.pages).toBe(1);
    expect(mocks.readMutationJournal).toHaveBeenCalledTimes(1);
    expect(mocks.setSyncCursor).not.toHaveBeenCalled();
  });
});
