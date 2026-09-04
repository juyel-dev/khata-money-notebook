import { v4 as uuid } from "uuid";
import { db, type Transaction, type TransactionType } from "./schema";

export async function addTransaction(input: {
  notebookId: string;
  personId: string;
  type: TransactionType;
  amount: number; // paise
  note?: string;
  occurredAt: number;
}): Promise<Transaction> {
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
) {
  await db.transactions.update(id, changes);
}

export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
}

export async function getTransaction(id: string) {
  return db.transactions.get(id);
}

export async function getPersonTransactions(personId: string): Promise<Transaction[]> {
  const txns = await db.transactions.where("personId").equals(personId).toArray();
  return txns.sort((a, b) => b.occurredAt - a.occurredAt);
}

export async function getNotebookTransactions(notebookId: string): Promise<Transaction[]> {
  const txns = await db.transactions.where("notebookId").equals(notebookId).toArray();
  return txns.sort((a, b) => b.occurredAt - a.occurredAt);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const txns = await db.transactions.toArray();
  return txns.sort((a, b) => b.occurredAt - a.occurredAt);
}
