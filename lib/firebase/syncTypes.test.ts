import { describe, expect, it } from "vitest";
import { compareSyncVersions, createMutationId, isSyncEntityType, isSyncOperation } from "./syncTypes";

describe("sync types", () => {
  it("creates deterministic mutation IDs from version identity", () => {
    const version = { changedAt: 123, deviceId: "device-a", sequence: 1 };
    expect(createMutationId("transaction", "tx-1", version)).toBe(
      "transaction:tx-1:123:device-a:1",
    );
  });

  it("guards supported sync values", () => {
    expect(isSyncEntityType("person")).toBe(true);
    expect(isSyncEntityType("share")).toBe(false);
    expect(isSyncOperation("upsert")).toBe(true);
    expect(isSyncOperation("merge")).toBe(false);
  });

  it("orders by logical sequence before device and wall-clock metadata", () => {
    expect(
      compareSyncVersions(
        { changedAt: 100, deviceId: "b", sequence: 1 },
        { changedAt: 100, deviceId: "a", sequence: 99 },
      ),
    ).toBeLessThan(0);
    expect(
      compareSyncVersions(
        { changedAt: 100, deviceId: "b", sequence: 2 },
        { changedAt: 100, deviceId: "a", sequence: 2 },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareSyncVersions(
        { changedAt: 100, deviceId: "a", sequence: 2 },
        { changedAt: 101, deviceId: "a", sequence: 2 },
      ),
    ).toBeLessThan(0);
  });
});
