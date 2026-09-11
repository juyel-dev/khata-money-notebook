import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { addTransaction, deleteTransaction, updateTransaction } from "./transactions";
import { createNotebook } from "./notebooks";
import { findOrCreatePerson } from "./people";
import { db } from "./schema";
import { syncDb } from "../firebase/syncDb";
import { getPendingMutations } from "../firebase/syncQueue";

describe("local database mutation capture", () => {
  beforeEach(async () => {
    await Promise.all([
      db.notebooks.clear(),
      db.groups.clear(),
      db.people.clear(),
      db.transactions.clear(),
      syncDb.syncMutations.clear(),
      syncDb.syncTombstones.clear(),
      syncDb.syncMeta.clear(),
    ]);
  });

  it("captures a new transaction after the local write succeeds", async () => {
    const notebook = await createNotebook({
      name: "Test",
      openingBalance: 1000,
      color: "green",
      icon: "book",
    });
    const person = await findOrCreatePerson(notebook.id, "A");

    const transaction = await addTransaction({
      notebookId: notebook.id,
      personId: person.id,
      type: "gave",
      amount: 100,
      occurredAt: 10,
    });

    const pending = await getPendingMutations();
    const captured = pending.find((mutation) => mutation.entityId === transaction.id);

    expect(captured?.entity).toBe("transaction");
    expect(captured?.operation).toBe("upsert");
    expect(captured?.payload).toEqual(transaction);
  });

  it("captures updates and deletes without changing the local API contract", async () => {
    const notebook = await createNotebook({
      name: "Test",
      openingBalance: 1000,
      color: "green",
      icon: "book",
    });
    const person = await findOrCreatePerson(notebook.id, "A");
    const transaction = await addTransaction({
      notebookId: notebook.id,
      personId: person.id,
      type: "gave",
      amount: 100,
      occurredAt: 10,
    });

    await updateTransaction(transaction.id, { amount: 200 });
    expect((await db.transactions.get(transaction.id))?.amount).toBe(200);

    await deleteTransaction(transaction.id);
    expect(await db.transactions.get(transaction.id)).toBeUndefined();

    const pending = await getPendingMutations();
    const transactionMutations = pending.filter((mutation) => mutation.entityId === transaction.id);
    expect(transactionMutations.map((mutation) => mutation.operation)).toEqual(["upsert", "upsert", "delete"]);
  });
});
