import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import { getDeviceId, nextLogicalClock } from "./syncIdentity";

describe("sync identity", () => {
  beforeEach(async () => {
    await syncDb.syncMeta.clear();
  });

  it("persists one stable device ID", async () => {
    const first = await getDeviceId();
    const second = await getDeviceId();
    expect(first).toBe(second);
    expect(first).toBeTruthy();
  });

  it("increments a durable logical clock", async () => {
    expect(await nextLogicalClock()).toBe(1);
    expect(await nextLogicalClock()).toBe(2);
    expect(await nextLogicalClock()).toBe(3);
  });
});
