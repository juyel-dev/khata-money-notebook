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

  it("keeps a local clock ahead when the observed remote sequence is older", async () => {
    expect(await nextLogicalClock()).toBe(1);
    expect(await nextLogicalClock()).toBe(2);
    expect(await observeLogicalClock(1)).toBe(3);
    expect(await nextLogicalClock()).toBe(4);
  });

  it("rejects invalid remote sequences", async () => {
    await expect(observeLogicalClock(-1)).rejects.toThrow(RangeError);
    await expect(observeLogicalClock(Number.NaN)).rejects.toThrow(RangeError);
    await expect(observeLogicalClock(Number.POSITIVE_INFINITY)).rejects.toThrow(RangeError);
  });

  it("rejects a corrupt stored logical clock", async () => {
    await syncDb.syncMeta.put({ key: "logicalClock", value: "not-a-number" });
    await expect(nextLogicalClock()).rejects.toThrow("stored logical clock is invalid");
  });

  it("rejects an exhausted stored logical clock", async () => {
    await syncDb.syncMeta.put({ key: "logicalClock", value: String(Number.MAX_SAFE_INTEGER) });
    await expect(nextLogicalClock()).rejects.toThrow("logical clock overflow");
  });

  it("rejects an observed sequence that would overflow the clock", async () => {
    await syncDb.syncMeta.put({ key: "logicalClock", value: String(Number.MAX_SAFE_INTEGER - 1) });
    await expect(observeLogicalClock(Number.MAX_SAFE_INTEGER)).rejects.toThrow("logical clock overflow");
  });
});
