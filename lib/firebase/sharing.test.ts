import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { db } from "../db/schema";
import { createShareSnapshot, listActiveShares, readPublicShare, revokeShare } from "./sharing";

const { accountLinkMock, syncOnceMock, store } = vi.hoisted(() => ({
  accountLinkMock: vi.fn(),
  syncOnceMock: vi.fn(),
  store: new Map<string, Record<string, unknown>>(),
}));

vi.mock("./accountLink", () => ({
  getAccountLink: accountLinkMock,
}));

vi.mock("./syncEngine", () => ({
  syncOnce: syncOnceMock,
}));

vi.mock("firebase/firestore", () => ({
  collection: (_firestore: unknown, ...parts: string[]) => ({ path: parts.join("/") }),
  doc: (_firestore: unknown, ...parts: string[]) => ({ path: parts.join("/") }),
  getDoc: vi.fn(async (ref: { path: string }) => ({
    exists: () => store.has(ref.path),
    data: () => store.get(ref.path),
  })),
  getDocs: vi.fn(async (ref: { path: string }) => ({
    docs: [...store.entries()]
      .filter(([path]) => path.startsWith(`${ref.path}/`) && path.split("/").length === ref.path.split("/").length + 1)
      .map(([path, data]) => ({ id: path.split("/").at(-1), data: () => data })),
  })),
  setDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    store.set(ref.path, data);
  }),
  updateDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    const current = store.get(ref.path);
    if (!current) throw new Error(`missing ${ref.path}`);
    store.set(ref.path, { ...current, ...data });
  }),
  writeBatch: vi.fn(() => {
    const writes: Array<["set" | "update", string, Record<string, unknown>]> = [];
    return {
      set: (ref: { path: string }, data: Record<string, unknown>) => writes.push(["set", ref.path, data]),
      update: (ref: { path: string }, data: Record<string, unknown>) => writes.push(["update", ref.path, data]),
      commit: vi.fn(async () => {
        for (const [operation, path, data] of writes) {
          store.set(path, operation === "set" ? data : { ...(store.get(path) ?? {}), ...data });
        }
      }),
    };
  }),
}));

const firestore = {} as never;
const uid = "uid-a";

const notebook = {
  id: "notebook-a",
  name: "Shop",
  openingBalance: 100,
  createdAt: 100,
  updatedAt: 200,
  archived: false,
  color: "green" as const,
  icon: "shop" as const,
};

const personA = { id: "person-a", notebookId: notebook.id, name: "A", createdAt: 100 };
const personB = { id: "person-b", notebookId: notebook.id, name: "B", createdAt: 101 };
const transactionA = {
  id: "txn-a",
  notebookId: notebook.id,
  personId: personA.id,
  type: "gave" as const,
  amount: 25,
  occurredAt: 300,
  createdAt: 300,
};
const transactionB = {
  id: "txn-b",
  notebookId: notebook.id,
  personId: personB.id,
  type: "got" as const,
  amount: 10,
  occurredAt: 301,
  createdAt: 301,
};

function putShareRecord(token: string, record: Record<string, unknown>) {
  store.set(`shares/${token}`, record);
}

describe("sharing snapshots", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.people.clear();
    await db.notebooks.clear();
    await db.groups.clear();
    await db.syncMeta.clear();
    store.clear();
    accountLinkMock.mockResolvedValue({ uid, status: "linked" });
    syncOnceMock.mockReset();
  });

  it("creates a complete Khata snapshot after syncing the owner first", async () => {
    await db.notebooks.put(notebook);
    await db.people.bulkPut([personA, personB]);
    await db.transactions.bulkPut([transactionA, transactionB]);

    const result = await createShareSnapshot(firestore, uid, { scope: "khata", notebookId: notebook.id });

    expect(syncOnceMock).toHaveBeenCalledWith(firestore, uid);
    expect(result.url).toContain(`/share/${result.token}`);
    expect(store.get(`shares/${result.token}`)).toMatchObject({ active: true, scope: "khata", notebookId: notebook.id });
    expect(store.get(`shares/${result.token}/notebooks/${notebook.id}`)).toEqual(notebook);
    expect(store.get(`shares/${result.token}/people/${personA.id}`)).toEqual(personA);
    expect(store.get(`shares/${result.token}/people/${personB.id}`)).toEqual(personB);
    expect(store.get(`shares/${result.token}/transactions/${transactionA.id}`)).toEqual(transactionA);
    expect(store.get(`shares/${result.token}/transactions/${transactionB.id}`)).toEqual(transactionB);
  });

  it("creates an individual snapshot without leaking another person's rows", async () => {
    await db.notebooks.put(notebook);
    await db.people.bulkPut([personA, personB]);
    await db.transactions.bulkPut([transactionA, transactionB]);

    const result = await createShareSnapshot(firestore, uid, {
      scope: "individual",
      notebookId: notebook.id,
      personId: personA.id,
    });

    expect(store.get(`shares/${result.token}`)).toMatchObject({ active: true, scope: "individual", personId: personA.id });
    expect(store.get(`shares/${result.token}/people/${personA.id}`)).toEqual(personA);
    expect(store.has(`shares/${result.token}/people/${personB.id}`)).toBe(false);
    expect(store.get(`shares/${result.token}/transactions/${transactionA.id}`)).toEqual(transactionA);
    expect(store.has(`shares/${result.token}/transactions/${transactionB.id}`)).toBe(false);
  });

  it("lists only active, non-expired shares for the requested Khata", async () => {
    const base = {
      ownerUid: uid,
      scope: "khata",
      notebookId: notebook.id,
      title: notebook.name,
      createdAt: 1,
      schemaVersion: 1,
    };
    store.set(`users/${uid}/shareRefs/active`, { ...base, token: "active", active: true, expiresAt: null });
    store.set(`users/${uid}/shareRefs/expired`, { ...base, token: "expired", active: true, expiresAt: 1 });
    store.set(`users/${uid}/shareRefs/revoked`, { ...base, token: "revoked", active: false, expiresAt: null });
    store.set(`users/${uid}/shareRefs/other`, { ...base, token: "other", active: true, notebookId: "other-notebook", expiresAt: null });

    await expect(listActiveShares(firestore, uid, notebook.id)).resolves.toEqual([
      expect.objectContaining({ token: "active" }),
    ]);
  });

  it("revokes an active share for the owner", async () => {
    const token = "token-a";
    putShareRecord(token, {
      token,
      ownerUid: uid,
      scope: "khata",
      notebookId: notebook.id,
      title: notebook.name,
      createdAt: 1,
      expiresAt: null,
      active: true,
      schemaVersion: 1,
    });
    store.set(`users/${uid}/shareRefs/${token}`, { token, notebookId: notebook.id, active: true });

    await revokeShare(firestore, uid, token);

    expect(store.get(`shares/${token}`)).toMatchObject({ active: false });
    expect(store.get(`users/${uid}/shareRefs/${token}`)).toMatchObject({ active: false });
  });

  it("only exposes an active, valid public snapshot", async () => {
    const token = "token-public";
    putShareRecord(token, {
      token,
      ownerUid: uid,
      scope: "individual",
      notebookId: notebook.id,
      personId: personA.id,
      title: `${personA.name} — ${notebook.name}`,
      createdAt: 1,
      expiresAt: null,
      active: true,
      schemaVersion: 1,
    });
    store.set(`shares/${token}/notebooks/${notebook.id}`, notebook);
    store.set(`shares/${token}/people/${personA.id}`, personA);
    store.set(`shares/${token}/transactions/${transactionA.id}`, transactionA);
    store.set(`shares/${token}/transactions/${transactionB.id}`, transactionB);

    await expect(readPublicShare(firestore, token)).resolves.toBeNull();
    store.delete(`shares/${token}/transactions/${transactionB.id}`);
    await expect(readPublicShare(firestore, token)).resolves.toMatchObject({
      record: { token, active: true },
      notebook,
      people: [personA],
      transactions: [transactionA],
    });

    store.set(`shares/${token}`, { ...store.get(`shares/${token}`), active: false });
    await expect(readPublicShare(firestore, token)).resolves.toBeNull();
  });
});
