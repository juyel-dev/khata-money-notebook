import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { cacheBanners, getCachedBanners } from "./bannerCache";
import type { Banner } from "@/lib/banners";

const banner = (overrides: Partial<Banner> = {}): Banner => ({
  id: "b1",
  imageUrl: "https://example.com/b1.png",
  destinationUrl: "https://example.com",
  order: 0,
  active: true,
  ...overrides,
});

beforeEach(async () => {
  await cacheBanners([]);
});

describe("bannerCache", () => {
  it("returns an empty array when nothing is cached", async () => {
    expect(await getCachedBanners()).toEqual([]);
  });

  it("caches and returns banners ordered by their order field", async () => {
    await cacheBanners([banner({ id: "b2", order: 2 }), banner({ id: "b1", order: 1 })]);
    const result = await getCachedBanners();
    expect(result.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("replaces the previous cache on each call rather than merging", async () => {
    await cacheBanners([banner({ id: "b1" })]);
    await cacheBanners([banner({ id: "b2" })]);
    expect((await getCachedBanners()).map((b) => b.id)).toEqual(["b2"]);
  });
});
