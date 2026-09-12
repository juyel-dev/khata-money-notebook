import { describe, expect, it, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import {
  enqueueMutation,
  getPendingMutations,
  markMutationFailed,
  markMutationPending,
  markMutationSyncing,
  removeMutation,
} from "./syncQueue";

describe("sync queue", () => {
  beforeEach(async () => {
    await syncDb.syncMutations.clear();
    await syncDb.syncTombstones.clear();
    await syncDb.syncMeta.clear();
  });

  it("persists a pending mutation and returns logical-version order", async () => {
    await enqueueMutation({
      entity: "transaction",
      entityId: "tx-2",
      operation: "upsert",
      changedAt: 200,
      payload: {
        id: "tx-2",
        notebookId: "n1",
        personId: "p1",
        type: "gave",
        amount: 100,
        occurredAt: 200,
        createdAt: 200,
      },
    });
    await enqueueMutation({
      entity: "transaction",
      entityId: "tx-1",
      operation: "delete",
      changedAt: 100,
    });

    const pending = await getPendingMutations();
    expect(pending.map((m) => m.entityId)).toEqual(["tx-2", "tx-1"]);
    expect(pending[0].version.deviceId).toBeTruthy();
    expect(pending[0].version.sequence).toBeGreaterThan(0);
  });

  it("tracks retry metadata and allows a failed mutation back to pending", async () => {
    const id = await enqueueMutation({
      entity: "person",
      entityId: "p1",
      operation: "upsert",
      changedAt: 100,
      payload: { id: "p1", notebookId: "n1", name: "A", createdAt: 100 },
    });

    await markMutationSyncing(id);
    await markMutationFailed(id, "offline");
    expect((await syncDb.syncMutations.get(id))?.attempts).toBe(1);
    expect((await syncDb.syncMutations.get(id))?.status).toBe("failed");

    await markMutationPending(id);
    expect((await syncDb.syncMutations.get(id))?.status).toBe("pending");
    expect((await syncDb.syncMutations.get(id))?.lastError).toBeUndefined();
  });

  it("removes a completed mutation", async () => {
    const id = await enqueueMutation({ entity: "group", entityId: "g1", operation: "delete", changedAt: 1 });
    await removeMutation(id);
    expect(await syncDb.syncMutations.get(id)).toBeUndefined();
  });
});
