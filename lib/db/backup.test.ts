// TASK 01 verification — backup envelope validation + replace-restore.
// Run with: npm test
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  BackupError,
  exportBackup,
  parseBackupFile,
  restoreBackup,
  snapshotDb,
  validateBackup,
  type BackupErrorCode,
  type KhataBackup,
} from "./backup";
import { db, type Notebook, type NotebookGroup, type Person, type Transaction } from "./schema";
import { restoreTransaction } from "./transactions";

function validBackup(): KhataBackup {
  const group: NotebookGroup = { id: "g1", name: "Shop", createdAt: 1000 };
  const notebook: Notebook = {
    id: "n1",
    name: "Cloth Shop",
    openingBalance: 50000,
    createdAt: 1001,
    updatedAt: 1002,
    archived: false,
    color: "green",
    icon: "shop",
    pinned: false,
    groupId: "g1",
  };
  const person: Person = { id: "p1", notebookId: "n1", name: "Rahim", createdAt: 1003 };
  const gave: Transaction = {
    id: "t1",
    notebookId: "n1",
    personId: "p1",
    type: "gave",
    amount: 25000,
    occurredAt: 1004,
    createdAt: 1005,
  };
  const got: Transaction = {
    id: "t2",
    notebookId: "n1",
    personId: "p1",
    type: "got",
    amount: 10000,
    note: "partial",
    occurredAt: 1006,
    createdAt: 1007,
  };
  return {
    format: "khata-backup",
    version: 2,
    exportedAt: 1008,
    data: { notebooks: [notebook], groups: [group], people: [person], transactions: [gave, got] },
  };
}

function codeOf(fn: () => unknown): BackupErrorCode | "no-throw" {
  try {
    fn();
  } catch (err) {
    if (err instanceof BackupError) return err.code;
    throw err;
  }
  return "no-throw";
}

async function clearAll(): Promise<void> {
  await db.transaction(
    "rw",
    db.transactions,
    db.people,
    db.notebooks,
    db.groups,
    async () => {
      await db.transactions.clear();
      await db.people.clear();
      await db.notebooks.clear();
      await db.groups.clear();
    }
  );
}

describe("validateBackup", () => {
  it("1. valid v2 backup passes", () => {
    expect(validateBackup(validBackup()).version).toBe(2);
  });

  it("2. missing groups fails", () => {
    const b = validBackup() as unknown as Record<string, unknown>;
    const data = { ...(b.data as Record<string, unknown>) };
    delete data.groups;
    expect(codeOf(() => validateBackup({ ...b, data }))).toBe("invalid-data");
  });

  it("3. malformed notebook fails", () => {
    const b = validBackup();
    b.data.notebooks = [{ ...b.data.notebooks[0], color: "neon-pink" } as unknown as Notebook];
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("4. malformed transaction fails", () => {
    const b = validBackup();
    b.data.transactions = [
      { ...b.data.transactions[0], occurredAt: "yesterday" } as unknown as Transaction,
    ];
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("5. orphan person fails", () => {
    const b = validBackup();
    b.data.people[0].notebookId = "missing-notebook";
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("6. orphan transaction fails", () => {
    const b = validBackup();
    b.data.transactions[0].personId = "missing-person";
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("7. invalid type fails", () => {
    const b = validBackup();
    b.data.transactions[0] = { ...b.data.transactions[0], type: "lent" } as unknown as Transaction;
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("8a. non-integer amount fails", () => {
    const b = validBackup();
    b.data.transactions[0].amount = 10.5;
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("8b. negative amount fails", () => {
    const b = validBackup();
    b.data.transactions[0].amount = -100;
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("8c. unsafe integer amount fails", () => {
    const b = validBackup();
    b.data.transactions[0].amount = Number.MAX_SAFE_INTEGER + 1;
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("9a. duplicate person IDs fail", () => {
    const b = validBackup();
    b.data.people = [b.data.people[0], { ...b.data.people[0] }];
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("9b. duplicate transaction IDs fail", () => {
    const b = validBackup();
    b.data.transactions = [b.data.transactions[0], { ...b.data.transactions[0] }];
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });

  it("10. unsupported version fails without touching data rules", () => {
    const b = validBackup();
    expect(codeOf(() => validateBackup({ ...b, version: 99 }))).toBe("unsupported-version");
  });

  it("wrong format marker fails", () => {
    expect(codeOf(() => validateBackup({ ...validBackup(), format: "khata" }))).toBe(
      "invalid-format"
    );
  });

  it("parseBackupFile rejects non-JSON", () => {
    expect(codeOf(() => parseBackupFile("{oops"))).toBe("invalid-json");
  });

  it("transaction/person notebook mismatch fails", () => {
    const b = validBackup();
    b.data.notebooks = [
      ...b.data.notebooks,
      {
        id: "n2",
        name: "Other",
        openingBalance: 0,
        createdAt: 1,
        updatedAt: 1,
        archived: false,
        color: "blue",
        icon: "home",
      },
    ];
    b.data.transactions[0].notebookId = "n2";
    expect(codeOf(() => validateBackup(b))).toBe("invalid-data");
  });
});

describe("restoreBackup (replace, not merge)", () => {
  beforeEach(async () => {
    await clearAll();
  });

  it("round-trips exact IDs and replaces instead of merging", async () => {
    const exported = validBackup();
    await restoreBackup(exported);

    // A leftover row from "current" data must be gone after restore.
    await db.notebooks.add({
      id: "stale",
      name: "Stale",
      openingBalance: 0,
      createdAt: 1,
      updatedAt: 1,
      archived: false,
      color: "slate",
      icon: "book",
    });
    await restoreBackup(exported);

    const snap = await snapshotDb();
    expect(snap.notebooks.map((n) => n.id)).toEqual(["n1"]);
    expect(snap.groups.map((g) => g.id)).toEqual(["g1"]);
    expect(snap.people.map((p) => p.id)).toEqual(["p1"]);
    expect(snap.transactions.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    expect(snap.notebooks[0]).toEqual(exported.data.notebooks[0]);
    expect(snap.transactions.find((t) => t.id === "t2")).toEqual(
      exported.data.transactions[1]
    );
  });

  it("exportBackup preserves IDs exactly", async () => {
    await restoreBackup(validBackup());
    const exported = await exportBackup();
    expect(exported.format).toBe("khata-backup");
    expect(exported.version).toBe(2);
    expect(exported.data.notebooks.map((n) => n.id)).toEqual(["n1"]);
    expect(exported.data.transactions.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    // Export output must itself validate (round-trip through the real path,
    // including JSON serialization like the download file).
    expect(() => parseBackupFile(JSON.stringify(exported))).not.toThrow();
  });
});

describe("restoreTransaction (undo identity)", () => {
  beforeEach(async () => {
    await clearAll();
  });

  it("restores the exact same row, not a copy with a new id", async () => {
    const original: Transaction = {
      id: "keep-me",
      notebookId: "n1",
      personId: "p1",
      type: "gave",
      amount: 777,
      note: "undo me",
      occurredAt: 42,
      createdAt: 43,
    };
    await db.transactions.add({ ...original });
    await db.transactions.delete("keep-me");
    expect(await db.transactions.get("keep-me")).toBeUndefined();

    await restoreTransaction(original);

    expect(await db.transactions.get("keep-me")).toEqual(original);
  });
});
