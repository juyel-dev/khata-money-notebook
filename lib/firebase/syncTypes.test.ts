import { describe, expect, it } from "vitest";
import { createMutationId, isSyncEntityType, isSyncOperation } from "./syncTypes";

describe("sync types", () => {
  it("creates deterministic mutation IDs", () => {
    expect(createMutationId("transaction", "tx-1", 123)).toBe("transaction:tx-1:123");
  });

  it("guards supported sync values", () => {
    expect(isSyncEntityType("person")).toBe(true);
    expect(isSyncEntityType("share")).toBe(false);
    expect(isSyncOperation("upsert")).toBe(true);
    expect(isSyncOperation("merge")).toBe(false);
  });
});
