// TASK 02 verification — transaction creation UX guards.
// Run with: npm test
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateAmountInput } from "../money";
import { createMutationGuard } from "../mutationGuard";
import { db } from "./schema";
import { addTransaction, updateTransaction } from "./transactions";

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

describe("validateAmountInput", () => {
  it("accepts a valid amount as integer paise", () => {
    expect(validateAmountInput("250")).toEqual({ ok: true, paise: 25000 });
    expect(validateAmountInput("10.50")).toEqual({ ok: true, paise: 1050 });
  });

  it("rejects empty amount", () => {
    expect(validateAmountInput("")).toEqual({ ok: false, error: "empty" });
    expect(validateAmountInput("   ")).toEqual({ ok: false, error: "empty" });
  });

  it("rejects zero amount", () => {
    expect(validateAmountInput("0")).toEqual({ ok: false, error: "zero" });
    expect(validateAmountInput("0.00")).toEqual({ ok: false, error: "zero" });
  });

  it("rejects invalid amount", () => {
    expect(validateAmountInput("abc")).toEqual({ ok: false, error: "invalid" });
    expect(validateAmountInput("1.2.3")).toEqual({ ok: false, error: "invalid" });
    expect(validateAmountInput("10.999")).toEqual({ ok: false, error: "invalid" });
    expect(validateAmountInput("-50")).toEqual({ ok: false, error: "invalid" });
  });

  it("rejects too-large amount", () => {
    expect(validateAmountInput("1000000000")).toEqual({ ok: false, error: "too-large" });
  });
});

describe("createMutationGuard (duplicate submit protection)", () => {
  it("runs concurrent second call zero times — no duplicate transaction", async () => {
    const guard = createMutationGuard();
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return "done";
    });
    const [first, second] = await Promise.all([guard.run(fn), guard.run(fn)]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(first).toBe("done");
    expect(second).toBeNull();
  });

  it("allows running again after settle, and releases on failure", async () => {
    const guard = createMutationGuard();
    await expect(guard.run(async () => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom"
    );
    expect(guard.isBusy).toBe(false);
    const fn = vi.fn(async () => "ok");
    await expect(guard.run(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("addTransaction / updateTransaction", () => {
  beforeEach(async () => {
    await clearAll();
  });

  it("saves a valid gave transaction with correct direction", async () => {
    const txn = await addTransaction({
      notebookId: "n1",
      personId: "p1",
      type: "gave",
      amount: 25000,
      occurredAt: 1000,
    });
    expect(txn.type).toBe("gave");
    expect(txn.amount).toBe(25000);
    expect(await db.transactions.count()).toBe(1);
  });

  it("saves a valid got transaction with correct direction", async () => {
    const txn = await addTransaction({
      notebookId: "n1",
      personId: "p1",
      type: "got",
      amount: 1050,
      occurredAt: 1000,
    });
    expect(txn.type).toBe("got");
    expect(await db.transactions.get(txn.id)).toEqual(txn);
  });

  it("edit preserves the transaction ID and updates values", async () => {
    const txn = await addTransaction({
      notebookId: "n1",
      personId: "p1",
      type: "gave",
      amount: 1000,
      occurredAt: 1000,
    });
    await updateTransaction(txn.id, { type: "got", amount: 2000 });
    const updated = await db.transactions.get(txn.id);
    expect(updated?.id).toBe(txn.id);
    expect(updated?.type).toBe("got");
    expect(updated?.amount).toBe(2000);
    expect(await db.transactions.count()).toBe(1);
  });
});
