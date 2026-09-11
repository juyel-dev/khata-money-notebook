// TASK 03 verification — transaction-first Khata Details derivations.
// Run with: npm test
//
// Covered here at data/helper level: 2,3,4,5,6,7,8,9,10,12,13,14,15,16,17.
// Cases 1 (default tab) and 11 (tap opens person detail) are navigation/
// component behavior, verified in manual QA (see TASK 03 report).
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, type Notebook, type Person, type Transaction } from "./schema";
import { deriveIndividuals } from "./people";
import {
  addTransaction,
  deleteTransaction,
  getNotebookTransactions,
  updateTransaction,
} from "./transactions";
import { dayLabel, groupByDay } from "../shared/grouping";

const t = (k: string) => k;

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

function notebook(id: string): Notebook {
  return {
    id,
    name: "Test Khata",
    openingBalance: 0,
    createdAt: 1000,
    updatedAt: 1000,
    archived: false,
    color: "green",
    icon: "book",
    pinned: false,
    groupId: null,
  };
}

function person(id: string, name: string): Person {
  return { id, notebookId: "n1", name, createdAt: 1000 };
}

function txn(
  id: string,
  personId: string,
  type: "gave" | "got",
  amount: number,
  occurredAt: number
): Transaction {
  return { id, notebookId: "n1", personId, type, amount, occurredAt, createdAt: occurredAt };
}

// QA-scenario-shaped fixture: Rahim x2 (gave+got), Karim x1, Shuvo x1.
function seedFixture(): { notebook: Notebook; people: Person[]; txns: Transaction[] } {
  const notebookRow = notebook("n1");
  const people = [person("p-rahim", "Rahim"), person("p-karim", "Karim"), person("p-shuvo", "Shuvo")];
  const txns = [
    txn("t1", "p-rahim", "gave", 50000, 3000),
    txn("t2", "p-karim", "got", 20000, 2000),
    txn("t3", "p-rahim", "got", 10000, 1500),
    txn("t4", "p-shuvo", "gave", 5000, 1000),
  ];
  return { notebook: notebookRow, people, txns };
}

describe("notebook transactions query", () => {
  beforeEach(async () => {
    await clearAll();
    const { notebook, people, txns } = seedFixture();
    await db.notebooks.add(notebook);
    await db.people.bulkAdd(people);
    await db.transactions.bulkAdd(txns);
    // A transaction from another khata must never leak in.
    await db.transactions.add({ ...txns[0], id: "tx-other", notebookId: "n2" });
  });

  it("2+3+4. shows transactions from ALL persons, same person multiple times", async () => {
    const list = await getNotebookTransactions("n1");
    expect(list.map((x) => x.id).sort()).toEqual(["t1", "t2", "t3", "t4"]);
    expect(list.filter((x) => x.personId === "p-rahim")).toHaveLength(2);
  });

  it("5. newest-first ordering", async () => {
    const list = await getNotebookTransactions("n1");
    expect(list.map((x) => x.id)).toEqual(["t1", "t2", "t3", "t4"]);
  });

  it("14+16. add appears, delete removes, list stays consistent", async () => {
    const added = await addTransaction({
      notebookId: "n1",
      personId: "p-karim",
      type: "gave",
      amount: 700,
      occurredAt: 4000,
    });
    let list = await getNotebookTransactions("n1");
    expect(list[0].id).toBe(added.id);
    await deleteTransaction(added.id);
    list = await getNotebookTransactions("n1");
    expect(list.find((x) => x.id === added.id)).toBeUndefined();
    expect(list).toHaveLength(4);
  });

  it("15. edit updates in place without a new row", async () => {
    await updateTransaction("t2", { amount: 25000 });
    const list = await getNotebookTransactions("n1");
    expect(list.find((x) => x.id === "t2")?.amount).toBe(25000);
    expect(list).toHaveLength(4);
  });
});

describe("groupByDay + dayLabel", () => {
  it("6. groups consecutive same-day items, preserves order", () => {
    const a = txn("a", "p", "gave", 1, new Date(2026, 4, 10, 12).getTime());
    const b = txn("b", "p", "got", 1, new Date(2026, 4, 10, 9).getTime());
    const c = txn("c", "p", "gave", 1, new Date(2026, 4, 9, 12).getTime());
    const groups = groupByDay([a, b, c], (ts) => dayLabel(ts, t, "en"));
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((x) => x.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((x) => x.id)).toEqual(["c"]);
  });

  it("12. empty list groups to nothing (empty state path)", () => {
    expect(groupByDay([], (ts) => dayLabel(ts, t, "en"))).toEqual([]);
  });
});

describe("deriveIndividuals", () => {
  const { people, txns } = seedFixture();

  it("7. unique persons only once, with counts", () => {
    const entries = deriveIndividuals(txns, people);
    expect(entries.map((e) => e.person.id).sort()).toEqual(["p-karim", "p-rahim", "p-shuvo"]);
    expect(entries.find((e) => e.person.id === "p-rahim")?.count).toBe(2);
    expect(entries.find((e) => e.person.id === "p-karim")?.count).toBe(1);
  });

  it("derives correct totals from transactions", () => {
    const rahim = deriveIndividuals(txns, people).find((e) => e.person.id === "p-rahim");
    expect(rahim?.totals.totalGiven).toBe(50000);
    expect(rahim?.totals.totalTaken).toBe(10000);
    expect(rahim?.totals.net).toBe(40000);
  });

  it("13. empty transactions derive to nobody (empty state path)", () => {
    expect(deriveIndividuals([], people)).toEqual([]);
  });

  it("excludes people with zero transactions", () => {
    const withExtra = [...people, person("p-new", "New")];
    const entries = deriveIndividuals(txns, withExtra);
    expect(entries.find((e) => e.person.id === "p-new")).toBeUndefined();
  });

  it("8+9+10. counts follow adds and deletes", async () => {
    await clearAll();
    const fixture = seedFixture();
    await db.notebooks.add(fixture.notebook);
    await db.people.bulkAdd(people);
    await db.transactions.bulkAdd(txns);
    const read = async () => {
      const [allTx, allPl] = await Promise.all([
        db.transactions.where("notebookId").equals("n1").toArray(),
        db.people.where("notebookId").equals("n1").toArray(),
      ]);
      return deriveIndividuals(allTx, allPl);
    };
    expect(readCount(await read(), "p-karim")).toBe(1);
    const added = await addTransaction({
      notebookId: "n1",
      personId: "p-karim",
      type: "gave",
      amount: 1,
      occurredAt: 9999,
    });
    expect(readCount(await read(), "p-karim")).toBe(2);
    await deleteTransaction(added.id);
    expect(readCount(await read(), "p-karim")).toBe(1);
  });

  it("17. derivation is pure/sync — two collection reads feed both tabs", async () => {
    await clearAll();
    await db.people.bulkAdd(people);
    await db.transactions.bulkAdd(txns);
    // Exactly the two queries the page issues — no per-person calls.
    const [allTx, allPl] = await Promise.all([
      getNotebookTransactions("n1"),
      db.people.where("notebookId").equals("n1").toArray(),
    ]);
    const entries = deriveIndividuals(allTx, allPl);
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.count > 0)).toBe(true);
  });
});

function readCount(entries: { person: Person; count: number }[], personId: string): number {
  return entries.find((e) => e.person.id === personId)?.count ?? 0;
}
