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
  quarantineJournalRow: vi.fn(),
}));

vi.mock("firebase/firestore", () => mocks);
vi.mock("./syncQuarantine", () => ({ quarantineJournalRow: mocks.quarantineJournalRow }));

import {
  FIRESTORE_SYNC_INTERNAL_COLLECTIONS,
  isCursorComplete,
  pushMutation,
  readMutationJournal,
} from "./firestoreSync";

describe("Firestore sync transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.quarantineJournalRow.mockResolvedValue(undefined);
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

  it("quarantines a corrupt row and advances the safe journal cursor", async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: "broken",
            entity: "transaction",
            entityId: "tx-1",
            operation: "upsert",
            receivedOrder: 9,
            version: { changedAt: 1, deviceId: "device-a", sequence: 1 },
            payload: { id: "wrong-id" },
          }),
        },
        {
          data: () => ({
            id: "transaction:tx-2:2:device-b:2",
            entity: "transaction",
            entityId: "tx-2",
            operation: "delete",
            receivedOrder: 10,
            version: { changedAt: 2, deviceId: "device-b", sequence: 2 },
          }),
        },
      ],
    });

    const result = await readMutationJournal({} as never, "user-1", null, 100);

    expect(result.mutations).toHaveLength(1);
    expect(result.mutations[0]).toMatchObject({ id: "transaction:tx-2:2:device-b:2", entityId: "tx-2" });
    expect(result.nextCursor).toEqual({ receivedOrder: 10 });
    expect(mocks.quarantineJournalRow).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ id: "broken" }),
      "sync journal entity id does not match payload id",
    );
  });

  it("does not advance past a corrupt row without a safe cursor", async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [{ data: () => ({ id: "broken", entity: "transaction" }) }],
    });

    await expect(readMutationJournal({} as never, "user-1", null, 100)).rejects.toThrow(
      "corrupt Firestore sync journal row has no safe cursor",
    );
    expect(mocks.quarantineJournalRow).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ id: "broken" }),
      "corrupt Firestore sync journal row",
    );
  });

  function setupTransaction({
    entityVersion,
    tombstoneVersion,
    journalExists = false,
    order = 7,
  }: {
    entityVersion?: { changedAt: number; deviceId: string; sequence: number };
    tombstoneVersion?: { changedAt: number; deviceId: string; sequence: number };
    journalExists?: boolean;
    order?: number;
  }) {
    const writes: Array<{ kind: string; path: string; data?: unknown }> = [];
    const transaction = {
      get: vi.fn(async (ref: { path: string }) => {
        if (ref.path.includes("_syncMutations")) {
          return { exists: () => journalExists };
        }
        if (ref.path.includes("_syncTombstones")) {
          return { exists: () => Boolean(tombstoneVersion), data: () => ({ version: tombstoneVersion }) };
        }
        if (ref.path.includes("_syncMeta")) {
          return { data: () => ({ value: order }) };
        }
        return { exists: () => Boolean(entityVersion), data: () => ({ version: entityVersion }) };
      }),
      set: vi.fn((ref: { path: string }, data: unknown) => writes.push({ kind: "set", path: ref.path, data })),
      delete: vi.fn((ref: { path: string }) => writes.push({ kind: "delete", path: ref.path })),
    };
    mocks.runTransaction.mockImplementation(async (_firestore, callback) => callback(transaction));
    return { transaction, writes };
  }

  const upsertMutation = {
    id: "transaction:tx-1:1:device-a:21",
    entity: "transaction" as const,
    entityId: "tx-1",
    operation: "upsert" as const,
    payload: {
      id: "tx-1",
      notebookId: "nb-1",
      personId: "person-1",
      type: "gave" as const,
      amount: 50000,
      occurredAt: 1,
      createdAt: 1,
    },
    changedAt: 1,
    version: { changedAt: 1, deviceId: "device-a", sequence: 21 },
    status: "pending" as const,
    attempts: 0,
  };

  it("records a mutation and materializes it when it wins", async () => {
    const { writes } = setupTransaction({
      entityVersion: { changedAt: 999, deviceId: "device-b", sequence: 20 },
    });

    await pushMutation({} as never, "user-1", upsertMutation);

    expect(writes.some((write) => write.path.includes("_syncMutations/"))).toBe(true);
    expect(writes.some((write) => write.path.includes("transactions/tx-1") && write.kind === "set")).toBe(true);
  });

  it("records stale mutations but does not replace the winner", async () => {
    const { writes } = setupTransaction({
      entityVersion: { changedAt: 999, deviceId: "device-b", sequence: 22 },
    });

    await pushMutation({} as never, "user-1", upsertMutation);

    expect(writes.some((write) => write.path.includes("_syncMutations/"))).toBe(true);
    expect(writes.some((write) => write.path.includes("transactions/tx-1") && write.kind === "set")).toBe(false);
  });

  it("does not resurrect an entity behind a newer tombstone", async () => {
    const { writes } = setupTransaction({
      tombstoneVersion: { changedAt: 1, deviceId: "device-b", sequence: 22 },
    });

    await pushMutation({} as never, "user-1", upsertMutation);

    expect(writes.some((write) => write.path.includes("transactions/tx-1") && write.kind === "set")).toBe(false);
  });

  it("does not duplicate an already-journaled mutation", async () => {
    const { transaction } = setupTransaction({ journalExists: true });

    await pushMutation({} as never, "user-1", {
      ...upsertMutation,
      id: "transaction:tx-1:1:device-a:1",
      operation: "delete",
      payload: undefined,
      version: { changedAt: 1, deviceId: "device-a", sequence: 1 },
    });

    expect(transaction.set).not.toHaveBeenCalled();
    expect(transaction.delete).not.toHaveBeenCalled();
  });
});
