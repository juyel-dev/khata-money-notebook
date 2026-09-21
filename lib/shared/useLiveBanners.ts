import { useEffect, useState } from "react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { fetchActiveBanners } from "@/lib/firebase/banners";
import { cacheBanners, getCachedBanners } from "@/lib/shared/bannerCache";
import { BANNERS, type Banner } from "@/lib/banners";

// Same resilience shape as the share-view cache: try live, fall back to
// the local cache on failure (offline, Firebase not configured, etc.),
// fall back to the hardcoded BANNERS array (empty by default) only if
// there's no cache either. Never an error state — worst case is showing
// nothing, which HeroBannerCarousel already handles.
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
        setBanners(live);
        void cacheBanners(live);
      } catch {
        if (cancelled) return;
        const cached = await getCachedBanners();
        if (!cancelled && cached.length) setBanners(cached);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return banners;
}
