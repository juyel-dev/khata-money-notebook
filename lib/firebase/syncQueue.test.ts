import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import {
  enqueueMutation,
  getPendingMutations,
  getRetryableFailedMutations,
  markMutationFailed,
  markMutationPending,
  markMutationSyncing,
  MAX_AUTO_RETRY_ATTEMPTS,
  removeMutation,
  retryFailedMutations,
} from "./syncQueue";

describe("sync queue", () => {
  beforeEach(async () => {
    await syncDb.syncMutations.clear();
    await syncDb.syncTombstones.clear();
    await syncDb.syncMeta.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    vi.spyOn(Date, "now").mockReturnValue(1000);
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
    expect((await syncDb.syncMutations.get(id))?.nextRetryAt).toBe(2000);

    await markMutationPending(id);
    expect((await syncDb.syncMutations.get(id))?.status).toBe("pending");
    expect((await syncDb.syncMutations.get(id))?.lastError).toBeUndefined();
    expect((await syncDb.syncMutations.get(id))?.nextRetryAt).toBeUndefined();
  });

  it("returns only failed mutations whose backoff is due and below the poison cutoff", async () => {
    const id = await enqueueMutation({
      entity: "person",
      entityId: "p1",
      operation: "upsert",
      changedAt: 100,
      payload: { id: "p1", notebookId: "n1", name: "A", createdAt: 100 },
    });
    await markMutationSyncing(id);
    await markMutationFailed(id, "offline");

    const future = (await syncDb.syncMutations.get(id))!.nextRetryAt! + 1;
    expect(await getRetryableFailedMutations(future)).toHaveLength(1);
    expect(await getRetryableFailedMutations(future - 2)).toHaveLength(0);

    await syncDb.syncMutations.update(id, {
      attempts: MAX_AUTO_RETRY_ATTEMPTS,
      nextRetryAt: undefined,
    });
    expect(await getRetryableFailedMutations()).toHaveLength(0);
  });

  it("continues manual recovery for a failed mutation and clears its retry gate", async () => {
    const id = await enqueueMutation({
      entity: "person",
      entityId: "p1",
      operation: "upsert",
      changedAt: 100,
      payload: { id: "p1", notebookId: "n1", name: "A", createdAt: 100 },
    });
    await markMutationSyncing(id);
    await markMutationFailed(id, "offline");

    expect(await retryFailedMutations()).toBe(1);
    expect((await syncDb.syncMutations.get(id))?.status).toBe("pending");
    expect((await syncDb.syncMutations.get(id))?.attempts).toBe(1);
    expect((await syncDb.syncMutations.get(id))?.nextRetryAt).toBeUndefined();
  });

  it("removes a completed mutation", async () => {
    const id = await enqueueMutation({ entity: "group", entityId: "g1", operation: "delete", changedAt: 1 });
    await removeMutation(id);
    expect(await syncDb.syncMutations.get(id)).toBeUndefined();
  });
});
