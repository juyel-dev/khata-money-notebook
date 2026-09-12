import { v4 as uuid } from "uuid";
import { db, type NotebookGroup } from "./schema";
import { captureGroup, captureNotebook, captureDelete } from "../firebase/syncCapture";

export async function getGroups(): Promise<NotebookGroup[]> {
  return db.groups.orderBy("name").toArray();
}

export async function findOrCreateGroup(name: string): Promise<NotebookGroup> {
  const trimmed = name.trim();
  const existing = await db.groups
    .filter((g) => g.name.toLowerCase() === trimmed.toLowerCase())
    .first();
  if (existing) return existing;

  const group: NotebookGroup = { id: uuid(), name: trimmed, createdAt: Date.now() };
  await db.groups.add(group);
  await captureGroup(group);
  return group;
}

export async function renameGroup(id: string, name: string) {
  await db.groups.update(id, { name: name.trim() });
  const updated = await db.groups.get(id);
  if (updated) await captureGroup(updated);
}

export async function deleteGroup(id: string) {
  const affected = await db.notebooks.where("groupId").equals(id).toArray();
  const existing = await db.groups.get(id);
  if (!existing) return;

  const changedAt = Date.now();
  await db.transaction("rw", db.groups, db.notebooks, async () => {
    await Promise.all(affected.map((n) => db.notebooks.update(n.id, { groupId: null, updatedAt: changedAt })));
    await db.groups.delete(id);
  });

  const updatedNotebooks = affected.map((notebook) => ({
    ...notebook,
    groupId: null,
    updatedAt: changedAt,
  }));
  await Promise.all([
    ...updatedNotebooks.map((notebook) => captureNotebook(notebook)),
    captureDelete("group", existing.id, changedAt),
  ]);
}
