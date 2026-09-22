import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBanner, deleteBanner, fetchActiveBanners, listAllBanners, saveBanner } from "./banners";
import type { Banner } from "@/lib/banners";

const store = new Map<string, Record<string, unknown>>();

vi.mock("uuid", () => ({ v4: () => "generated-id" }));

vi.mock("firebase/firestore", () => ({
  collection: (_firestore: unknown, path: string) => ({ path, wheres: [], orderKey: null }),
  doc: (_firestore: unknown, collectionPath: string, id: string) => ({ path: `${collectionPath}/${id}` }),
  query: (ref: { path: string; wheres: unknown[] }, ...constraints: Array<{ type: string; field?: string; value?: unknown }>) => ({
    ...ref,
    wheres: [...ref.wheres, ...constraints.filter((c) => c.type === "where")],
    orderKey: constraints.find((c) => c.type === "orderBy")?.field ?? null,
  }),
  where: (field: string, _op: string, value: unknown) => ({ type: "where", field, value }),
  orderBy: (field: string) => ({ type: "orderBy", field }),
  getDocs: vi.fn(async (ref: { path: string; wheres: Array<{ field: string; value: unknown }>; orderKey: string | null }) => {
    let rows = [...store.entries()]
      .filter(([path]) => path.startsWith(`${ref.path}/`) && path.split("/").length === ref.path.split("/").length + 1)
      .map(([, data]) => data);
    for (const w of ref.wheres) rows = rows.filter((row) => row[w.field] === w.value);
    if (ref.orderKey) rows = [...rows].sort((a, b) => Number(a[ref.orderKey!]) - Number(b[ref.orderKey!]));
    return { docs: rows.map((data) => ({ data: () => data })) };
  }),
  setDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    store.set(ref.path, data);
  }),
  deleteDoc: vi.fn(async (ref: { path: string }) => {
    store.delete(ref.path);
  }),
}));

const firestore = {} as never;

function seed(banner: Partial<Banner> & { id: string }) {
  store.set(`banners/${banner.id}`, { imageUrl: "", destinationUrl: "", order: 0, active: false, ...banner });
}

beforeEach(() => {
  store.clear();
});

describe("fetchActiveBanners", () => {
  it("returns only active banners, ordered", async () => {
    seed({ id: "b1", active: true, order: 2 });
    seed({ id: "b2", active: false, order: 0 });
    seed({ id: "b3", active: true, order: 1 });

    const result = await fetchActiveBanners(firestore);
    expect(result.map((b) => b.id)).toEqual(["b3", "b1"]);
  });
});

describe("listAllBanners", () => {
  it("returns every banner regardless of active state", async () => {
    seed({ id: "b1", active: true, order: 0 });
    seed({ id: "b2", active: false, order: 1 });

    const result = await listAllBanners(firestore);
    expect(result.map((b) => b.id).sort()).toEqual(["b1", "b2"]);
  });
});

describe("createBanner / saveBanner / deleteBanner", () => {
  it("creates a banner with a generated id", async () => {
    const created = await createBanner(firestore, { imageUrl: "x", destinationUrl: "y", order: 0, active: true });
    expect(created.id).toBe("generated-id");
    expect(await listAllBanners(firestore)).toHaveLength(1);
  });

  it("saves changes to an existing banner", async () => {
    seed({ id: "b1", active: false, order: 0 });
    await saveBanner(firestore, { id: "b1", imageUrl: "z", destinationUrl: "", order: 0, active: true });

    const [saved] = await listAllBanners(firestore);
    expect(saved.active).toBe(true);
    expect(saved.imageUrl).toBe("z");
  });

  it("deletes a banner", async () => {
    seed({ id: "b1" });
    await deleteBanner(firestore, "b1");
    expect(await listAllBanners(firestore)).toHaveLength(0);
  });
});
