import Dexie, { type Table } from "dexie";
import type { ShareSnapshot } from "@/lib/firebase/sharing";

// A separate, tiny Dexie database — deliberately not khata-db/khata-sync-db.
// This runs on the *viewer's* device, which may not even be the app's own
// owner/user (someone opening a shared link has no account, may never
// install the app at all). It only ever caches what a public share
// document already exposes; it is not sync state and has nothing to do
// with the owner's own ledger.
class ShareViewCacheDB extends Dexie {
  viewedShares!: Table<{ token: string; snapshot: ShareSnapshot; cachedAt: number }, string>;

  constructor() {
    super("khata-share-view-cache");
    this.version(1).stores({
      viewedShares: "token",
    });
  }
}

const cacheDb = new ShareViewCacheDB();

export const SHARE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function cacheShareSnapshot(token: string, snapshot: ShareSnapshot): Promise<void> {
  await cacheDb.viewedShares.put({ token, snapshot, cachedAt: Date.now() });
}

// Returns the cached snapshot plus when it was cached, or null if there is
// none or it's older than maxAgeMs. Never throws — a viewer with no IndexedDB
// support (rare, but this page has no account/app-install requirement) just
// gets no cache instead of a broken page.
export async function getCachedShareSnapshot(
  token: string,
  maxAgeMs: number = SHARE_CACHE_MAX_AGE_MS,
): Promise<{ snapshot: ShareSnapshot; cachedAt: number } | null> {
  try {
    const row = await cacheDb.viewedShares.get(token);
    if (!row) return null;
    if (Date.now() - row.cachedAt > maxAgeMs) return null;
    return { snapshot: row.snapshot, cachedAt: row.cachedAt };
  } catch {
    return null;
  }
}

// Called once the server has definitively said a share is unavailable
// (revoked, expired, or never existed) — as opposed to a network failure.
// Without this, a viewer who's back online after a share was revoked could
// still see the old cached copy forever, silently defeating revoke.
export async function clearCachedShareSnapshot(token: string): Promise<void> {
  try {
    await cacheDb.viewedShares.delete(token);
  } catch {
    // best-effort — a failed cache clear shouldn't block showing the
    // "no longer available" state the caller already decided on
  }
}
