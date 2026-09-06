import { v4 as uuid } from "uuid";
import { db, type NotebookGroup } from "./schema";

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
  return group;
}

export async function renameGroup(id: string, name: string) {
  await db.groups.update(id, { name: name.trim() });
}

// Deleting a group never deletes the notebooks in it — they just become ungrouped.
export async function deleteGroup(id: string) {
  await db.transaction("rw", db.groups, db.notebooks, async () => {
    const affected = await db.notebooks.where("groupId").equals(id).toArray();
    await Promise.all(affected.map((n) => db.notebooks.update(n.id, { groupId: null })));
    await db.groups.delete(id);
  });
}
