import Dexie, { type Table } from "dexie";
import type { Banner } from "@/lib/banners";

// Small dedicated Dexie database, same reasoning as
// lib/shared/shareViewCache.ts: this is display content, not sync state,
// and doesn't belong in khata-db/khata-sync-db. Lets the home screen show
// the last-fetched banners while offline instead of nothing, without
// keeping any explicit expiry — stale ad content going unrefreshed for a
// while isn't a correctness or privacy problem the way a stale shared
// ledger snapshot would be.
class BannerCacheDB extends Dexie {
  banners!: Table<Banner, string>;

  constructor() {
    super("khata-banner-cache");
    this.version(1).stores({
      banners: "id, order",
    });
  }
}

const cacheDb = new BannerCacheDB();

export async function cacheBanners(banners: Banner[]): Promise<void> {
  await cacheDb.transaction("rw", cacheDb.banners, async () => {
    await cacheDb.banners.clear();
    await cacheDb.banners.bulkAdd(banners);
  });
}

export async function getCachedBanners(): Promise<Banner[]> {
  try {
    return await cacheDb.banners.orderBy("order").toArray();
  } catch {
    return [];
  }
}
