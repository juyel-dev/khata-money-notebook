import { describe, expect, it } from "vitest";
import { resolveConflict } from "./syncConflict";

describe("sync conflict resolution", () => {
  const base = {
    operation: "upsert" as const,
    version: { changedAt: 100, deviceId: "device-a", sequence: 1 },
    mutationId: "upsert-a",
  };

  it("prefers the higher logical sequence even when its wall clock is older", () => {
    expect(
      resolveConflict(base, {
        ...base,
        version: { changedAt: 1, deviceId: "device-z", sequence: 2 },
        mutationId: "upsert-z",
      }),
    ).toBe("incoming");
  });

  it("uses device identity as the deterministic tie-breaker", () => {
    expect(
      resolveConflict(base, {
        ...base,
        version: { changedAt: 100, deviceId: "device-b", sequence: 1 },
        mutationId: "upsert-b",
      }),
    ).toBe("incoming");
  });

  it("uses wall-clock time only after logical sequence and device identity tie", () => {
    expect(
      resolveConflict(base, {
        ...base,
        version: { changedAt: 101, deviceId: "device-a", sequence: 1 },
        mutationId: "upsert-z",
      }),
    ).toBe("incoming");
  });

  it("lets delete win an otherwise exact version tie", () => {
    expect(
      resolveConflict(base, {
        operation: "delete",
        version: base.version,
        mutationId: "delete-a",
      }),
    ).toBe("incoming");
  });

  it("keeps an older incoming logical change from replacing the current winner", () => {
    expect(
      resolveConflict(base, {
        ...base,
        version: { changedAt: 999999, deviceId: "device-z", sequence: 0 },
        mutationId: "upsert-old",
      }),
    ).toBe("current");
  });
});
