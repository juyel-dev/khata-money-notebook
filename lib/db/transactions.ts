import { v4 as uuid } from "uuid";
import { db, type Transaction, type TransactionType } from "./schema";

function assertValidAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Transaction amount must be a positive safe integer (paise)");
  }
}

function assertValidOccurredAt(occurredAt: number): void {
  if (!Number.isFinite(occurredAt)) {
    throw new Error("Transaction date must be a finite timestamp");
  }
}

function assertValidType(type: TransactionType): void {
  if (type !== "gave" && type !== "got") {
    throw new Error("Transaction type is invalid");
  }
}

async function assertPersonBelongsToNotebook(
  notebookId: string,
  personId: string
): Promise<void> {
  const [notebook, person] = await Promise.all([
    db.notebooks.get(notebookId),
    db.people.get(personId),
  ]);

  if (!notebook) {
    throw new Error("Notebook does not exist");
  }

  if (!person) {
    throw new Error("Person does not exist");
  }

  if (person.notebookId !== notebookId) {
    throw new Error("Person does not belong to notebook");
  }
}

export async function addTransaction(input: {
  notebookId: string;
  personId: string;
  type: TransactionType;
  amount: number; // paise
  note?: string;
  occurredAt: number;
}): Promise<Transaction> {
  assertValidAmount(input.amount);
  assertValidOccurredAt(input.occurredAt);
  assertValidType(input.type);
  await assertPersonBelongsToNotebook(input.notebookId, input.personId);

  const txn: Transaction = {
    id: uuid(),
    notebookId: input.notebookId,
    personId: input.personId,
    type: input.type,
    amount: input.amount,
    note: input.note?.trim() || undefined,
    occurredAt: input.occurredAt,
    createdAt: Date.now(),
  };
  await db.transactions.add(txn);
  return txn;
}

export async function updateTransaction(
  id: string,
  changes: Partial<Pick<Transaction, "type" | "amount" | "note" | "occurredAt" | "personId">>
): Promise<void> {
  const current = await db.transactions.get(id);
  if (!current) {
    throw new Error("Transaction does not exist");
  }

  const nextType = changes.type ?? current.type;
  const nextAmount = changes.amount ?? current.amount;
  const nextOccurredAt = changes.occurredAt ?? current.occurredAt;
  const nextPersonId = changes.personId ?? current.personId;

  assertValidType(nextType);
  assertValidAmount(nextAmount);
  assertValidOccurredAt(nextOccurredAt);

  if (changes.personId !== undefined && changes.personId !== current.personId) {
    await assertPersonBelongsToNotebook(current.notebookId, nextPersonId);
  }

  const normalized: typeof changes = {
    ...changes,
    ...(changes.type !== undefined ? { type: nextType } : {}),
    ...(changes.amount !== undefined ? { amount: nextAmount } : {}),
    ...(changes.occurredAt !== undefined ? { occurredAt: nextOccurredAt } : {}),
    ...(changes.note !== undefined ? { note: changes.note?.trim() || undefined } : {}),
  };

  await db.transactions.update(id, normalized);
}

export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
}

// ID-preserving write for undoing a delete — unlike addTransaction (which
// always mints a fresh id), this restores the exact same row, so balances,
// history order, and any id-based references stay identical.
export async function restoreTransaction(txn: Transaction): Promise<void> {
  await db.transactions.put({ ...txn });
}

export async function getTransaction(id: string) {
  return db.transactions.get(id);
}

// Newest first with deterministic tie-breaking. occurredAt is the user's
// chosen transaction time; createdAt and id make equal timestamps stable.
function newestFirst(a: Transaction, b: Transaction): number {
  return (
    b.occurredAt - a.occurredAt ||
    b.createdAt - a.createdAt ||
    b.id.localeCompare(a.id)
  );
}

export async function getPersonTransactions(personId: string): Promise<Transaction[]> {
  const txns = await db.transactions.where("personId").equals(personId).toArray();
  return txns.sort(newestFirst);
}

export async function getNotebookTransactions(notebookId: string): Promise<Transaction[]> {
  const txns = await db.transactions.where("notebookId").equals(notebookId).toArray();
  return txns.sort(newestFirst);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const txns = await db.transactions.toArray();
  return txns.sort(newestFirst);
}
