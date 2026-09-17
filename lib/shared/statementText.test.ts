import { describe, expect, it } from "vitest";
import { buildPersonStatementText } from "./statementText";
import type { Transaction } from "@/lib/db/schema";

const txn = (overrides: Partial<Transaction>): Transaction => ({
  id: "t1",
  notebookId: "n1",
  personId: "p1",
  type: "gave",
  amount: 50000,
  occurredAt: new Date("2026-09-12T10:00:00Z").getTime(),
  createdAt: 1,
  ...overrides,
});

describe("buildPersonStatementText", () => {
  it("formats gave as − and got as + with the person/notebook header", () => {
    const text = buildPersonStatementText({
      notebookName: "Cloth Shop",
      personName: "Rahim",
      locale: "en",
      transactions: [
        txn({ id: "t1", type: "gave", amount: 50000 }),
        txn({ id: "t2", type: "got", amount: 20000, occurredAt: new Date("2026-09-15T10:00:00Z").getTime() }),
      ],
    });

    expect(text).toContain("Cloth Shop — Rahim");
    expect(text).toMatch(/−₹500/);
    expect(text).toMatch(/\+₹200/);
  });

  it("includes the note in parentheses when present, omits it when absent", () => {
    const text = buildPersonStatementText({
      notebookName: "Cloth Shop",
      personName: "Rahim",
      locale: "en",
      transactions: [txn({ note: "Cloth" }), txn({ id: "t2", note: undefined })],
    });

    expect(text).toContain("(Cloth)");
    const lines = text.split("\n").filter((l) => l.includes("−₹500"));
    expect(lines.some((l) => !l.includes("("))).toBe(true);
  });

  it("produces just the header and rules with no transactions", () => {
    const text = buildPersonStatementText({
      notebookName: "Cloth Shop",
      personName: "Rahim",
      locale: "en",
      transactions: [],
    });

    expect(text.split("\n")).toHaveLength(3);
  });
});
