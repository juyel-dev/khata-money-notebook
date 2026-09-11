import { v4 as uuid } from "uuid";
import { db, type Person, type Transaction } from "./schema";
import { capturePerson, captureDelete } from "../firebase/syncCapture";

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
  await capturePerson(person);
  return person;
}

export async function renamePerson(id: string, name: string) {
  await db.people.update(id, { name: name.trim() });
  const updated = await db.people.get(id);
  if (updated) await capturePerson(updated);
}

export async function deletePersonIfEmpty(id: string): Promise<boolean> {
  const count = await db.transactions.where("personId").equals(id).count();
  if (count > 0) return false;
  const existing = await db.people.get(id);
  if (!existing) return false;
  await db.people.delete(id);
  await captureDelete("person", id);
  return true;
}

export interface PersonTotals {
  totalGiven: number; // paise
  totalTaken: number; // paise
  net: number; // paise, positive = they owe you, negative = you owe them
  lastTransactionAt: number | null;
}

export interface IndividualEntry {
  person: Person;
  /** Number of transactions this person has in the khata. */
  count: number;
  totals: PersonTotals;
}

// Derives the Individuals view from transactions — transactions are the
// source of truth, so a person appears here if and only if they have at
// least one transaction. Pure single-pass over already-fetched arrays:
// no per-person queries (no N+1).
export function deriveIndividuals(
  transactions: Transaction[],
  people: Person[]
): IndividualEntry[] {
  const personById = new Map(people.map((p) => [p.id, p]));
  const acc = new Map<string, { count: number; given: number; taken: number; last: number | null }>();
  for (const txn of transactions) {
    if (!personById.has(txn.personId)) continue;
    const entry = acc.get(txn.personId) ?? { count: 0, given: 0, taken: 0, last: null };
    entry.count += 1;
    if (txn.type === "gave") entry.given += txn.amount;
    else entry.taken += txn.amount;
    entry.last = entry.last == null ? txn.occurredAt : Math.max(entry.last, txn.occurredAt);
    acc.set(txn.personId, entry);
  }
  const result: IndividualEntry[] = [];
  for (const [personId, entry] of acc) {
    const person = personById.get(personId);
    if (!person) continue;
    result.push({
      person,
      count: entry.count,
      totals: {
        totalGiven: entry.given,
        totalTaken: entry.taken,
        net: entry.given - entry.taken,
        lastTransactionAt: entry.last,
      },
    });
  }
  // Most recent activity first — same convention as people lists elsewhere.
  return result.sort((a, b) => (b.totals.lastTransactionAt ?? 0) - (a.totals.lastTransactionAt ?? 0));
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
