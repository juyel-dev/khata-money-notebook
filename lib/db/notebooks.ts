import { v4 as uuid } from "uuid";
import { db, type Notebook, type NotebookColor, type NotebookIcon } from "./schema";

export async function createNotebook(input: {
  name: string;
  openingBalance: number; // paise
  color: NotebookColor;
  icon: NotebookIcon;
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
  };
  await db.notebooks.add(notebook);
  return notebook;
}

export async function updateNotebook(
  id: string,
  changes: Partial<Pick<Notebook, "name" | "openingBalance" | "color" | "icon">>
) {
  await db.notebooks.update(id, { ...changes, updatedAt: Date.now() });
}

export async function archiveNotebook(id: string, archived = true) {
  await db.notebooks.update(id, { archived, updatedAt: Date.now() });
}

export async function deleteNotebookPermanently(id: string) {
  await db.transaction("rw", db.notebooks, db.people, db.transactions, async () => {
    await db.transactions.where("notebookId").equals(id).delete();
    await db.people.where("notebookId").equals(id).delete();
    await db.notebooks.delete(id);
  });
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
