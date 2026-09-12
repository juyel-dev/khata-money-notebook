import { v4 as uuid } from "uuid";
import { db, type Notebook, type NotebookColor, type NotebookIcon, type NotebookGroup } from "./schema";
import { captureNotebook, captureDelete } from "../firebase/syncCapture";

export async function createNotebook(input: {
  name: string;
  openingBalance: number;
  color: NotebookColor;
  icon: NotebookIcon;
  groupId?: string | null;
}): Promise<Notebook> {
  const now = Date.now();
  const notebook: Notebook = {
    id: uuid(),
    name: input.name.trim(),
    openingBalance: input.openingBalance,
    createdAt: now,
    updatedAt: now,
    archived: false,
    color: input.color,
    icon: input.icon,
    pinned: false,
    groupId: input.groupId ?? null,
  };
  await db.notebooks.add(notebook);
  await captureNotebook(notebook);
  return notebook;
}

export async function updateNotebook(
  id: string,
  changes: Partial<Pick<Notebook, "name" | "openingBalance" | "color" | "icon" | "groupId">>
) {
  const updatedAt = Date.now();
  await db.notebooks.update(id, { ...changes, updatedAt });
  const updated = await db.notebooks.get(id);
  if (updated) await captureNotebook(updated);
}

export async function setNotebookPinned(id: string, pinned: boolean) {
  const updatedAt = Date.now();
  await db.notebooks.update(id, { pinned, updatedAt });
  const updated = await db.notebooks.get(id);
  if (updated) await captureNotebook(updated);
}

export async function archiveNotebook(id: string, archived = true) {
  const updatedAt = Date.now();
  await db.notebooks.update(id, { archived, updatedAt });
  const updated = await db.notebooks.get(id);
  if (updated) await captureNotebook(updated);
}

export async function deleteNotebookPermanently(id: string) {
  const [notebook, people, transactions] = await Promise.all([
    db.notebooks.get(id),
    db.people.where("notebookId").equals(id).toArray(),
    db.transactions.where("notebookId").equals(id).toArray(),
  ]);
  if (!notebook) return;

  await db.transaction("rw", db.notebooks, db.people, db.transactions, async () => {
    await db.transactions.where("notebookId").equals(id).delete();
    await db.people.where("notebookId").equals(id).delete();
    await db.notebooks.delete(id);
  });

  const changedAt = Date.now();
  await Promise.all([
    ...transactions.map((txn) => captureDelete("transaction", txn.id, changedAt)),
    ...people.map((person) => captureDelete("person", person.id, changedAt)),
    captureDelete("notebook", notebook.id, changedAt),
  ]);
}

export async function getNotebookBalance(notebookId: string): Promise<number> {
  const notebook = await db.notebooks.get(notebookId);
  if (!notebook) return 0;
  const txns = await db.transactions.where("notebookId").equals(notebookId).toArray();
  const got = txns.filter((t) => t.type === "got").reduce((s, t) => s + t.amount, 0);
  const gave = txns.filter((t) => t.type === "gave").reduce((s, t) => s + t.amount, 0);
  return notebook.openingBalance + got - gave;
}

export async function getLastActivityAt(notebookId: string): Promise<number | null> {
  const txns = await db.transactions.where("notebookId").equals(notebookId).toArray();
  if (!txns.length) return null;
  return Math.max(...txns.map((t) => t.occurredAt));
}

export interface HomeGroupSection {
  group: NotebookGroup | null;
  notebooks: Notebook[];
}

export interface HomeListResult {
  pinned: Notebook[];
  hasGroups: boolean;
  sections: HomeGroupSection[];
}

function sortByRecency(
  notebooks: Notebook[],
  lastActivityByNotebook: Map<string, number>
): Notebook[] {
  const withTs = notebooks.map((notebook) => ({
    notebook,
    ts: Math.max(notebook.updatedAt, lastActivityByNotebook.get(notebook.id) ?? 0),
  }));

  withTs.sort((a, b) => {
    return (
      b.ts - a.ts ||
      b.notebook.createdAt - a.notebook.createdAt ||
      b.notebook.id.localeCompare(a.notebook.id)
    );
  });

  return withTs.map((w) => w.notebook);
}

export async function getHomeList(): Promise<HomeListResult> {
  const [notebooks, groups, transactions] = await Promise.all([
    db.notebooks.filter((n) => !n.archived).toArray(),
    db.groups.toArray(),
    db.transactions.toArray(),
  ]);

  const lastActivityByNotebook = new Map<string, number>();
  for (const txn of transactions) {
    const current = lastActivityByNotebook.get(txn.notebookId) ?? 0;
    if (txn.occurredAt > current) {
      lastActivityByNotebook.set(txn.notebookId, txn.occurredAt);
    }
  }

  const sorted = sortByRecency(notebooks, lastActivityByNotebook);
  const pinned = sorted.filter((n) => n.pinned);
  const rest = sorted.filter((n) => !n.pinned);

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const byGroup = new Map<string, Notebook[]>();
  const ungrouped: Notebook[] = [];
  for (const n of rest) {
    if (n.groupId && groupMap.has(n.groupId)) {
      const arr = byGroup.get(n.groupId) ?? [];
      arr.push(n);
      byGroup.set(n.groupId, arr);
    } else {
      ungrouped.push(n);
    }
  }

  const hasGroups = byGroup.size > 0;
  if (!hasGroups) {
    return { pinned, hasGroups: false, sections: [{ group: null, notebooks: rest }] };
  }

  const sections: HomeGroupSection[] = Array.from(byGroup.entries()).map(([gid, nbs]) => ({
    group: groupMap.get(gid)!,
    notebooks: nbs,
  }));
  if (ungrouped.length > 0) sections.push({ group: null, notebooks: ungrouped });

  return { pinned, hasGroups: true, sections };
}
