// Hardcoded fallback banners — used only when the app has never
// successfully fetched live banners from Firestore (first launch, fully
// offline, or nothing configured yet in the admin panel). Empty by
// default: HeroBannerCarousel already renders nothing when there are no
// banners (see docs/SCREENS.md), which is the right default here — an ad
// slot showing stale placeholder content forever is worse than showing
// nothing until the admin actually configures something.
export interface Banner {
  id: string;
  imageUrl: string;
  destinationUrl?: string;
  order: number;
  active: boolean;
}

export const BANNERS: Banner[] = [];
