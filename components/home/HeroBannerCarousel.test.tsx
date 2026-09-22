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

function mockServicesAvailable() {
  vi.spyOn(clientLib, "getFirebaseServices").mockReturnValue({ firestore: {} } as unknown as ReturnType<
    typeof clientLib.getFirebaseServices
  >);
}

beforeEach(async () => {
  await cacheBanners([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HeroBannerCarousel", () => {
  it("renders nothing when there are no banners anywhere", () => {
    vi.spyOn(clientLib, "getFirebaseServices").mockReturnValue(null);
    const { container } = renderWithProviders(<HeroBannerCarousel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a live banner's image and caches the result", async () => {
    mockServicesAvailable();
    vi.spyOn(bannersLib, "fetchActiveBanners").mockResolvedValue([liveBanner]);

    const { container } = renderWithProviders(<HeroBannerCarousel />);

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    expect(container.querySelector("img")?.getAttribute("src")).toBe(liveBanner.imageUrl);

    await waitFor(async () => {
      expect(await getCachedBanners()).toHaveLength(1);
    });
  });

  it("falls back to the local cache when the live fetch fails", async () => {
    await cacheBanners([cachedBanner]);
    mockServicesAvailable();
    vi.spyOn(bannersLib, "fetchActiveBanners").mockRejectedValue(new Error("offline"));

    const { container } = renderWithProviders(<HeroBannerCarousel />);

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    expect(container.querySelector("img")?.getAttribute("src")).toBe(cachedBanner.imageUrl);
  });

  it("renders nothing (not an error) when the live fetch fails and there's no cache", async () => {
    mockServicesAvailable();
    vi.spyOn(bannersLib, "fetchActiveBanners").mockRejectedValue(new Error("offline"));

    const { container } = renderWithProviders(<HeroBannerCarousel />);

    await waitFor(() => expect(bannersLib.fetchActiveBanners).toHaveBeenCalled());
    expect(container.querySelector("img")).toBeNull();
  });
});
