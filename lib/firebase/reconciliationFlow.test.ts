import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { db } from "../db/schema";
import { syncDb } from "./syncDb";
import { confirmAccountReconciliation } from "./reconciliationFlow";
import { enqueueMutation } from "./syncQueue";
import { getAccountLink } from "./accountLink";
import { getEntityVersion } from "./syncState";

const { getDocsMock } = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: (_firestore: unknown, path: string) => ({ path }),
  getDocs: getDocsMock,
}));

vi.mock("./syncEngine", () => ({
  syncOnce: vi.fn(),
}));

import { syncOnce } from "./syncEngine";

const firestore = {} as never;
const uid = "uid-a";
const baseNotebook = {
  id: "notebook-local",
  name: "Local",
  openingBalance: 100,
  createdAt: 100,
  updatedAt: 200,
  archived: false,
  color: "green" as const,
  icon: "book" as const,
};
const cloudNotebook = {
  id: "notebook-cloud",
  name: "Cloud",
  openingBalance: 250,
  createdAt: 300,
  updatedAt: 400,
  archived: false,
  color: "blue" as const,
  icon: "shop" as const,
};

function cloudDocsFor(rows: Record<string, unknown>[]) {
  return { docs: rows.map((row) => ({ data: () => row })) };
}

function setCloudSnapshot(input: {
  notebooks?: Record<string, unknown>[];
  tombstones?: Record<string, unknown>[];
}) {
  getDocsMock.mockImplementation(async (ref: { path: string }) => {
    if (ref.path.endsWith("/notebooks")) return cloudDocsFor(input.notebooks ?? []);
    if (ref.path.endsWith("/_syncTombstones")) return cloudDocsFor(input.tombstones ?? []);
    return cloudDocsFor([]);
  });
}

async function setReconciliationRequired() {
  await syncDb.syncMeta.put({
    key: "accountLink",
    value: JSON.stringify({
      key: "accountLink",
      uid,
      provider: "google",
      status: "reconciliation-required",
      linkedAt: 1,
    }),
  });
}

describe("confirmAccountReconciliation", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.people.clear();
    await db.notebooks.clear();
    await db.groups.clear();
    await syncDb.syncMeta.clear();
    await syncDb.syncMutations.clear();
    await syncDb.syncTombstones.clear();
    getDocsMock.mockReset();
    vi.mocked(syncOnce).mockReset();
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

  it("preserves local data through fresh mutations and deletes cloud-only entities", async () => {
    await db.notebooks.put(baseNotebook);
    await setReconciliationRequired();
    setCloudSnapshot({
      notebooks: [{
        ...cloudNotebook,
        version: { changedAt: 400, deviceId: "cloud-device", sequence: 7 },
      }],
    });

    await confirmAccountReconciliation(firestore, uid, "preserve-local");

    const mutations = await syncDb.syncMutations.toArray();
    expect(mutations).toHaveLength(2);
    expect(mutations.map((mutation) => [mutation.operation, mutation.entityId])).toEqual([
      ["delete", cloudNotebook.id],
      ["upsert", baseNotebook.id],
    ]);
    expect(mutations.every((mutation) => mutation.version.sequence > 7)).toBe(true);
    expect(await db.notebooks.get(cloudNotebook.id)).toBeUndefined();
    expect(await db.notebooks.get(baseNotebook.id)).toEqual(baseNotebook);
    expect(await getAccountLink()).toMatchObject({ uid, status: "linked" });
    expect(syncOnce).toHaveBeenCalledTimes(1);
  });

  it("replaces local data with cloud data and restores cloud sync state", async () => {
    await db.notebooks.put(baseNotebook);
    await enqueueMutation({
      entity: "notebook",
      entityId: baseNotebook.id,
      operation: "upsert",
      payload: baseNotebook,
      changedAt: baseNotebook.updatedAt,
    });
    await setReconciliationRequired();
    setCloudSnapshot({
      notebooks: [{
        ...cloudNotebook,
        version: { changedAt: 400, deviceId: "cloud-device", sequence: 5 },
      }],
      tombstones: [{
        id: "transaction:gone",
        entity: "transaction",
        entityId: "transaction-gone",
        version: { changedAt: 500, deviceId: "cloud-device", sequence: 6 },
        deletedAt: 500,
      }],
    });

    await confirmAccountReconciliation(firestore, uid, "preserve-cloud");

    expect(await db.notebooks.get(baseNotebook.id)).toBeUndefined();
    expect(await db.notebooks.get(cloudNotebook.id)).toEqual(cloudNotebook);
    expect(await syncDb.syncMutations.count()).toBe(0);
    expect(await syncDb.syncTombstones.count()).toBe(1);
    expect(await getEntityVersion("notebook", cloudNotebook.id)).toMatchObject({
      entity: "notebook",
      entityId: cloudNotebook.id,
      deleted: false,
      version: { sequence: 5 },
    });
    expect(await getAccountLink()).toMatchObject({ uid, status: "linked" });
    expect(syncOnce).not.toHaveBeenCalled();
  });
});
