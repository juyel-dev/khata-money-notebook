import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  cacheShareSnapshot,
  clearCachedShareSnapshot,
  getCachedShareSnapshot,
} from "./shareViewCache";
import type { ShareSnapshot } from "@/lib/firebase/sharing";

const snapshot: ShareSnapshot = {
  record: {
    token: "tok1",
    ownerUid: "u1",
    scope: "khata",
    notebookId: "n1",
    title: "Cloth Shop",
    createdAt: 1,
    expiresAt: null,
    active: true,
    schemaVersion: 1,
  },
  notebook: {
    id: "n1",
    name: "Cloth Shop",
    openingBalance: 0,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    color: "green",
    icon: "book",
  },
  people: [],
  transactions: [],
};

beforeEach(async () => {
  await clearCachedShareSnapshot("tok1");
});

describe("shareViewCache", () => {
  it("returns null when nothing is cached", async () => {
    expect(await getCachedShareSnapshot("tok1")).toBeNull();
  });

  it("caches and returns a snapshot with its cachedAt timestamp", async () => {
    await cacheShareSnapshot("tok1", snapshot);
    const result = await getCachedShareSnapshot("tok1");
    expect(result?.snapshot).toEqual(snapshot);
    expect(result?.cachedAt).toBeCloseTo(Date.now(), -2);
  });

  it("treats a cache entry older than maxAgeMs as absent", async () => {
    // Real time, tiny maxAgeMs windows — combining vi.useFakeTimers() with
    // fake-indexeddb hangs, since fake-indexeddb's internal transaction
    // completion relies on real timer scheduling.
    await cacheShareSnapshot("tok1", snapshot);
    expect(await getCachedShareSnapshot("tok1", -1)).toBeNull();
    expect(await getCachedShareSnapshot("tok1", 60_000)).not.toBeNull();
  });

  it("removes a cached snapshot on clear", async () => {
    await cacheShareSnapshot("tok1", snapshot);
    await clearCachedShareSnapshot("tok1");
    expect(await getCachedShareSnapshot("tok1")).toBeNull();
  });
});
