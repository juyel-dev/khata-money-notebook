import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { db } from "../db/schema";
import { syncDb } from "./syncDb";
import { getEntityVersion } from "./syncState";
import { captureDelete, flushSyncCaptureIntents, stageSyncCapture } from "./syncCapture";

describe("sync capture", () => {
  beforeEach(async () => {
    await db.syncCaptureIntents.clear();
    await syncDb.syncMutations.clear();
    await syncDb.syncTombstones.clear();
    await syncDb.syncMeta.clear();
  });

  it("records a deleted entity version after a local delete", async () => {
    const id = await captureDelete("transaction", "tx-1", 123);

    expect(id).toBeTruthy();
    const state = await getEntityVersion("transaction", "tx-1");
    expect(state).toMatchObject({
      entity: "transaction",
      entityId: "tx-1",
      deleted: true,
      version: {
        changedAt: 123,
        sequence: 1,
      },
    });
  });

  it("keeps a durable local intent when the separate sync queue is unavailable", async () => {
    const id = await stageSyncCapture({
      entity: "transaction",
      entityId: "tx-1",
      operation: "delete",
      changedAt: 123,
    });

    syncDb.close();
    try {
      expect(await flushSyncCaptureIntents()).toBe(0);
      expect(await db.syncCaptureIntents.get(id)).toMatchObject({
        id,
        entity: "transaction",
        entityId: "tx-1",
        operation: "delete",
      });
    } finally {
      await syncDb.open();
    }
  });

  it("replays a deferred intent once the sync queue is available again", async () => {
    const id = await stageSyncCapture({
      entity: "person",
      entityId: "p-1",
      operation: "upsert",
      changedAt: 456,
      payload: {
        id: "p-1",
        notebookId: "n-1",
        name: "A",
        createdAt: 456,
      },
    });

    syncDb.close();
    try {
      await flushSyncCaptureIntents();
    } finally {
      await syncDb.open();
    }

    expect(await db.syncCaptureIntents.get(id)).toBeTruthy();
    expect(await flushSyncCaptureIntents()).toBe(1);
    expect(await db.syncCaptureIntents.get(id)).toBeUndefined();
    const queued = await syncDb.syncMutations.get(id);
    expect(queued).toMatchObject({ entity: "person", entityId: "p-1", status: "pending" });
  });

  it("does not duplicate a mutation when an intent is replayed after queue persistence", async () => {
    const id = await stageSyncCapture({
      entity: "group",
      entityId: "g-1",
      operation: "delete",
      changedAt: 789,
    });
    const intent = await db.syncCaptureIntents.get(id);
    if (!intent) throw new Error("expected capture intent");

    expect(await flushSyncCaptureIntents()).toBe(1);
    await db.syncCaptureIntents.put(intent);
    expect(await flushSyncCaptureIntents()).toBe(1);

    const queued = await syncDb.syncMutations.toArray();
    expect(queued.filter((mutation) => mutation.id === id)).toHaveLength(1);
  });
});
