import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import { getDeviceId, nextLogicalClock, observeLogicalClock } from "./syncIdentity";

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

  it("advances beyond an observed remote sequence", async () => {
    expect(await nextLogicalClock()).toBe(1);
    expect(await observeLogicalClock(50)).toBe(51);
    expect(await nextLogicalClock()).toBe(52);
  });

  it("ignores an older remote sequence while still advancing on receive", async () => {
    expect(await nextLogicalClock()).toBe(10);
    expect(await observeLogicalClock(4)).toBe(11);
    expect(await nextLogicalClock()).toBe(12);
  });

  it("rejects invalid remote sequences", async () => {
    await expect(observeLogicalClock(-1)).rejects.toThrow(RangeError);
    await expect(observeLogicalClock(Number.NaN)).rejects.toThrow(RangeError);
    await expect(observeLogicalClock(Number.POSITIVE_INFINITY)).rejects.toThrow(RangeError);
  });
});
