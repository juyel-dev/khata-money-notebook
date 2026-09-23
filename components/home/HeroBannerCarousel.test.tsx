import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/test-utils";
import { HeroBannerCarousel } from "./HeroBannerCarousel";
import * as bannersLib from "@/lib/firebase/banners";
import * as clientLib from "@/lib/firebase/client";
import { cacheBanners, getCachedBanners } from "@/lib/shared/bannerCache";
import type { Banner } from "@/lib/banners";

const liveBanner: Banner = { id: "live", imageUrl: "https://example.com/live.png", destinationUrl: "https://example.com", order: 0, active: true };
const cachedBanner: Banner = { id: "cached", imageUrl: "https://example.com/cached.png", order: 0, active: true };

// Every hardcoded fallback list includes the maker banner with this title.
const FALLBACK_TITLE = "Got feedback?";

function mockServicesAvailable() {
  vi.spyOn(clientLib, "getFirebaseServices").mockReturnValue({ firestore: {} } as unknown as ReturnType<
    typeof clientLib.getFirebaseServices
  >);
}

async function expectFallbackVisible(container: HTMLElement) {
  await waitFor(() => {
    expect(container.textContent).toContain(FALLBACK_TITLE);
  });
}

async function expectFallbackHidden(container: HTMLElement) {
  await waitFor(() => {
    expect(container.textContent).not.toContain(FALLBACK_TITLE);
  });
}

beforeEach(async () => {
  await cacheBanners([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HeroBannerCarousel", () => {
  it("renders the hardcoded fallback when Firebase is unavailable and there's no cache", async () => {
    vi.spyOn(clientLib, "getFirebaseServices").mockReturnValue(null);
    const { container } = renderWithProviders(<HeroBannerCarousel />);

    expect(container.firstChild).not.toBeNull();
    await expectFallbackVisible(container);
  });

  it("renders a live banner's image (hiding the hardcoded fallback) and caches the result", async () => {
    mockServicesAvailable();
    vi.spyOn(bannersLib, "fetchActiveBanners").mockResolvedValue([liveBanner]);

    const { container } = renderWithProviders(<HeroBannerCarousel />);

    await waitFor(() =>
      expect(container.querySelector("img")?.getAttribute("src")).toBe(liveBanner.imageUrl),
    );
    await expectFallbackHidden(container);

    await waitFor(async () => {
      expect(await getCachedBanners()).toHaveLength(1);
    });
  });

  it("falls back to the local cache when the live fetch fails", async () => {
    await cacheBanners([cachedBanner]);
    mockServicesAvailable();
    vi.spyOn(bannersLib, "fetchActiveBanners").mockRejectedValue(new Error("offline"));

    const { container } = renderWithProviders(<HeroBannerCarousel />);

    await waitFor(() =>
      expect(container.querySelector("img")?.getAttribute("src")).toBe(cachedBanner.imageUrl),
    );
    await expectFallbackHidden(container);
  });

  it("falls back to hardcoded banners when the live fetch fails and there's no cache", async () => {
    mockServicesAvailable();
    vi.spyOn(bannersLib, "fetchActiveBanners").mockRejectedValue(new Error("offline"));

    const { container } = renderWithProviders(<HeroBannerCarousel />);

    await waitFor(() => expect(bannersLib.fetchActiveBanners).toHaveBeenCalled());
    await expectFallbackVisible(container);
  });

  it("falls back to hardcoded banners when the admin has no active banners (live returns empty)", async () => {
    mockServicesAvailable();
    vi.spyOn(bannersLib, "fetchActiveBanners").mockResolvedValue([]);

    const { container } = renderWithProviders(<HeroBannerCarousel />);

    await waitFor(() => expect(bannersLib.fetchActiveBanners).toHaveBeenCalled());
    await expectFallbackVisible(container);

    // Empty live result must clear any stale admin cache.
    await waitFor(async () => {
      expect(await getCachedBanners()).toHaveLength(0);
    });
  });
});
