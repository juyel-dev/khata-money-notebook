import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import { getEntityVersion } from "./syncState";
import { captureDelete } from "./syncCapture";

describe("sync capture", () => {
  beforeEach(async () => {
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
});
