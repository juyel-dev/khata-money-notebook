import { describe, expect, it } from "vitest";
import {
  planFirstAccountReconciliation,
  type ReconciliationDatasetSummary,
} from "./reconciliation";

const empty: ReconciliationDatasetSummary = {
  notebooks: 0,
  groups: 0,
  people: 0,
  transactions: 0,
};

const localData: ReconciliationDatasetSummary = {
  ...empty,
  notebooks: 1,
  transactions: 3,
};

const cloudData: ReconciliationDatasetSummary = {
  ...empty,
  notebooks: 2,
  transactions: 5,
};

describe("planFirstAccountReconciliation", () => {
  it("links directly when both sides are empty", () => {
    expect(planFirstAccountReconciliation(empty, empty)).toEqual({
      action: "link-only",
      requiresConfirmation: false,
      reason: "both-empty",
    });
  });

  it("requires explicit confirmation before preserving local data", () => {
    expect(planFirstAccountReconciliation(localData, empty)).toEqual({
      action: "preserve-local",
      requiresConfirmation: true,
      reason: "local-only",
    });
  });

  it("requires explicit confirmation before preserving cloud data", () => {
    expect(planFirstAccountReconciliation(empty, cloudData)).toEqual({
      action: "preserve-cloud",
      requiresConfirmation: true,
      reason: "cloud-only",
    });
  });

  it("requires reconciliation when both sides contain data", () => {
    expect(planFirstAccountReconciliation(localData, cloudData)).toEqual({
      action: "merge-required",
      requiresConfirmation: true,
      reason: "both-have-data",
    });
  });
});
