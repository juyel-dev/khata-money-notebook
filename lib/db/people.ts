import { v4 as uuid } from "uuid";
import { db, type Person } from "./schema";

export async function findOrCreatePerson(notebookId: string, name: string): Promise<Person> {
  const trimmed = name.trim();
  const existing = await db.people
    .where("notebookId")
    .equals(notebookId)
    .filter((p) => p.name.toLowerCase() === trimmed.toLowerCase())
    .first();
  if (existing) return existing;

  const person: Person = {
    id: uuid(),
    notebookId,
    name: trimmed,
    createdAt: Date.now(),
  };
  await db.people.add(person);
  return person;
}

export async function renamePerson(id: string, name: string) {
  await db.people.update(id, { name: name.trim() });
}

export async function deletePersonIfEmpty(id: string): Promise<boolean> {
  const count = await db.transactions.where("personId").equals(id).count();
  if (count > 0) return false;
  await db.people.delete(id);
  return true;
}

export interface PersonTotals {
  totalGiven: number; // paise
  totalTaken: number; // paise
  net: number; // paise, positive = they owe you, negative = you owe them
  lastTransactionAt: number | null;
}

export async function getPersonTotals(personId: string): Promise<PersonTotals> {
  const txns = await db.transactions.where("personId").equals(personId).toArray();
  const totalGiven = txns.filter((t) => t.type === "gave").reduce((s, t) => s + t.amount, 0);
  const totalTaken = txns.filter((t) => t.type === "got").reduce((s, t) => s + t.amount, 0);
  const lastTransactionAt = txns.length ? Math.max(...txns.map((t) => t.occurredAt)) : null;
  return { totalGiven, totalTaken, net: totalGiven - totalTaken, lastTransactionAt };
}

export async function getPeopleWithTotals(notebookId: string) {
  const people = await db.people.where("notebookId").equals(notebookId).toArray();
  const withTotals = await Promise.all(
    people.map(async (p) => ({ ...p, totals: await getPersonTotals(p.id) }))
  );
  // most recent activity first; people with no activity yet sink to the bottom
  return withTotals.sort((a, b) => {
    const at = a.totals.lastTransactionAt ?? 0;
    const bt = b.totals.lastTransactionAt ?? 0;
    return bt - at;
  });
}
