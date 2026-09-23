import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { fetchActiveBanners } from "@/lib/firebase/banners";
import { cacheBanners, getCachedBanners } from "@/lib/shared/bannerCache";
import { BANNERS, type Banner } from "@/lib/banners";

// Priority (matches docs/ADMIN.md):
//   1. Live active admin banners — when any exist they replace the
//      hardcoded list entirely (admin content wins, fallback hidden).
//   2. Live returns empty (admin hasn't configured anything yet) —
//      hardcoded BANNERS fallback, and the cache is cleared so a later
//      offline load can't resurrect deleted admin banners.
//   3. Live fetch fails (offline, Firebase not configured) — last-fetched
//      cache if present, else hardcoded BANNERS.
// Never an error state — worst case is the hardcoded fallback, which
// HeroBannerCarousel always has something to render.
export function useLiveBanners(): Banner[] {
  const [banners, setBanners] = useState<Banner[]>(BANNERS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const services = getFirebaseServices();
      if (!services) {
        const cached = await getCachedBanners();
        if (!cancelled && cached.length) setBanners(cached);
        return;
      }
      try {
        const live = await fetchActiveBanners(services.firestore);
        if (cancelled) return;
        if (live.length) {
          setBanners(live);
          void cacheBanners(live);
        } else {
          setBanners(BANNERS);
          void cacheBanners([]);
        }
      } catch {
        if (cancelled) return;
        const cached = await getCachedBanners();
        if (!cancelled) setBanners(cached.length ? cached : BANNERS);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return banners;
}
