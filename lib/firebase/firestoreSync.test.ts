import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  collection: vi.fn((firestore: unknown, path: string) => ({ firestore, path })),
  doc: vi.fn((firestore: unknown, path: string) => ({ firestore, path })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn((value: number) => ({ type: "limit", value })),
  orderBy: vi.fn((field: string) => ({ type: "orderBy", field })),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => ({ serverTimestamp: true })),
  startAfter: vi.fn((value: number) => ({ type: "startAfter", value })),
  Timestamp: { fromMillis: vi.fn((value: number) => ({ millis: value })) },
}));

vi.mock("firebase/firestore", () => mocks);

import {
  FIRESTORE_SYNC_INTERNAL_COLLECTIONS,
  isCursorComplete,
  pushMutation,
} from "./firestoreSync";

describe("Firestore sync transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the server-side mutation order journal and internal collections", () => {
    expect(FIRESTORE_SYNC_INTERNAL_COLLECTIONS).toEqual({
      journal: "_syncMutations",
      tombstones: "_syncTombstones",
      meta: "_syncMeta",
    });
  });

  it("treats an identical cursor as complete", () => {
    expect(isCursorComplete({ receivedOrder: 12 }, { receivedOrder: 12 })).toBe(true);
    expect(isCursorComplete({ receivedOrder: 12 }, { receivedOrder: 13 })).toBe(false);
    expect(isCursorComplete(null, { receivedOrder: 12 })).toBe(false);
  });

  it("records every accepted mutation but only materializes the winning version", async () => {
    const writes: Array<{ kind: string; path: string; data?: unknown }> = [];
    const journalExists = { exists: () => false };
    const entityExists = { exists: () => true, data: () => ({
      version: { changedAt: 999, deviceId: "device-b", sequence: 20 },
    }) };
    const tombstoneExists = { exists: () => false };
    const orderSnapshot = { data: () => ({ value: 7 }) };

    const transaction = {
      get: vi.fn(async (ref: { path: string }) => {
        if (ref.path.includes("_syncMutations")) return journalExists;
        if (ref.path.includes("_syncTombstones")) return tombstoneExists;
        if (ref.path.includes("_syncMeta")) return orderSnapshot;
        return entityExists;
      }),
      set: vi.fn((ref: { path: string }, data: unknown) => writes.push({ kind: "set", path: ref.path, data })),
      delete: vi.fn((ref: { path: string }) => writes.push({ kind: "delete", path: ref.path })),
    };

    mocks.runTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));

    await pushMutation({} as never, "user-1", {
      id: "transaction:tx-1:1:device-a:21",
      entity: "transaction",
      entityId: "tx-1",
      operation: "upsert",
      payload: {
        id: "tx-1",
        notebookId: "nb-1",
        personId: "person-1",
        type: "gave",
        amount: 50000,
        occurredAt: 1,
        createdAt: 1,
      },
      changedAt: 1,
      version: { changedAt: 1, deviceId: "device-a", sequence: 21 },
      status: "pending",
      attempts: 0,
    });

    expect(writes.some((write) => write.path.includes("_syncMutations/"))).toBe(true);
    expect(writes.some((write) => write.path.includes("transactions/tx-1"))).toBe(false);
  });

  it("does not duplicate an already-journaled mutation", async () => {
    const journalExists = { exists: () => true };
    const transaction = {
      get: vi.fn(async (ref: { path: string }) => {
        if (ref.path.includes("_syncMutations")) return journalExists;
        throw new Error("no further reads expected");
      }),
      set: vi.fn(),
      delete: vi.fn(),
    };

    mocks.runTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));

    await pushMutation({} as never, "user-1", {
      id: "transaction:tx-1:1:device-a:1",
      entity: "transaction",
      entityId: "tx-1",
      operation: "delete",
      changedAt: 1,
      version: { changedAt: 1, deviceId: "device-a", sequence: 1 },
      status: "pending",
      attempts: 0,
    });

    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.delete).not.toHaveBeenCalled();
  });
});
