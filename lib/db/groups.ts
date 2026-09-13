import { v4 as uuid } from "uuid";
import { db, type NotebookGroup } from "./schema";
import { flushSyncCaptureIntents, stageSyncCapture } from "../firebase/syncCapture";

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
  await db.transaction("rw", db.groups, db.syncCaptureIntents, async () => {
    await db.groups.add(group);
    await stageSyncCapture({ entity: "group", entityId: group.id, operation: "upsert", payload: group, changedAt: group.createdAt });
  });
  await flushSyncCaptureIntents();
  return group;
}

export async function renameGroup(id: string, name: string) {
  await db.transaction("rw", db.groups, db.syncCaptureIntents, async () => {
    await db.groups.update(id, { name: name.trim() });
    const updated = await db.groups.get(id);
    if (updated) await stageSyncCapture({ entity: "group", entityId: id, operation: "upsert", payload: updated, changedAt: updated.createdAt });
  });
  await flushSyncCaptureIntents();
}

export async function deleteGroup(id: string) {
  const affected = await db.notebooks.where("groupId").equals(id).toArray();
  const existing = await db.groups.get(id);
  if (!existing) return;

  const changedAt = Date.now();
  await db.transaction("rw", db.groups, db.notebooks, db.syncCaptureIntents, async () => {
    await Promise.all(affected.map((n) => db.notebooks.update(n.id, { groupId: null, updatedAt: changedAt })));
    await db.groups.delete(id);
    for (const notebook of affected) {
      await stageSyncCapture({
        entity: "notebook",
        entityId: notebook.id,
        operation: "upsert",
        payload: { ...notebook, groupId: null, updatedAt: changedAt },
        changedAt,
      });
    }
    await stageSyncCapture({ entity: "group", entityId: existing.id, operation: "delete", changedAt });
  });
  await flushSyncCaptureIntents();
}
