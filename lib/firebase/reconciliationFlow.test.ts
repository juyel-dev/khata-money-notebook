import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { syncDb } from "./syncDb";
import { confirmAccountReconciliation } from "./reconciliationFlow";

const firestore = {} as never;

describe("confirmAccountReconciliation", () => {
  beforeEach(async () => {
    await syncDb.syncMeta.clear();
    await syncDb.syncMutations.clear();
    await syncDb.syncTombstones.clear();
  });

  it("rejects confirmation for a mismatched account link", async () => {
    await syncDb.syncMeta.put({
      key: "accountLink",
      value: JSON.stringify({
        key: "accountLink",
        uid: "uid-a",
        provider: "google",
        status: "reconciliation-required",
        linkedAt: 1,
      }),
    });

    await expect(confirmAccountReconciliation(firestore, "uid-b", "preserve-local"))
      .rejects.toThrow("ACCOUNT_LINK_TARGET_MISMATCH");
  });

  it("rejects re-confirming an already linked account", async () => {
    await syncDb.syncMeta.put({
      key: "accountLink",
      value: JSON.stringify({
        key: "accountLink",
        uid: "uid-a",
        provider: "google",
        status: "linked",
        linkedAt: 1,
      }),
    });

    await expect(confirmAccountReconciliation(firestore, "uid-a", "preserve-cloud"))
      .rejects.toThrow("ACCOUNT_LINK_NOT_RECONCILING");
  });
});
