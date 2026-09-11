import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import {
  clearTombstoneForNewerUpsert,
  getTombstone,
  recordTombstone,
  shouldRejectUpsert,
} from "./syncTombstones";

describe("sync tombstones", () => {
  beforeEach(async () => {
    await syncDb.syncTombstones.clear();
  });

  it("retains the newest tombstone and rejects stale upserts", async () => {
    const newer = { changedAt: 200, deviceId: "device-a", sequence: 2 };
    const older = { changedAt: 100, deviceId: "device-b", sequence: 1 };

    await recordTombstone("transaction", "tx-1", newer);
    await recordTombstone("transaction", "tx-1", older);

    const tombstone = await getTombstone("transaction", "tx-1");
    expect(tombstone?.version).toEqual(newer);
    expect(await shouldRejectUpsert("transaction", "tx-1", older)).toBe(true);
    expect(await shouldRejectUpsert("transaction", "tx-1", newer)).toBe(true);
  });

  it("allows a strictly newer upsert to clear a tombstone", async () => {
    const deleted = { changedAt: 200, deviceId: "device-a", sequence: 2 };
    const recreated = { changedAt: 201, deviceId: "device-a", sequence: 3 };

    await recordTombstone("person", "p-1", deleted);
    expect(await shouldRejectUpsert("person", "p-1", recreated)).toBe(false);

    await clearTombstoneForNewerUpsert("person", "p-1", recreated);
    expect(await getTombstone("person", "p-1")).toBeUndefined();
  });
});
