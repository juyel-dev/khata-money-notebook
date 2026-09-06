import { v4 as uuid } from "uuid";
import { db, type Notebook, type NotebookColor, type NotebookIcon, type NotebookGroup } from "./schema";

export async function createNotebook(input: {
  name: string;
  openingBalance: number; // paise
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
  return notebook;
}

export async function updateNotebook(
  id: string,
  changes: Partial<Pick<Notebook, "name" | "openingBalance" | "color" | "icon" | "groupId">>
) {
  await db.notebooks.update(id, { ...changes, updatedAt: Date.now() });
}

export async function setNotebookPinned(id: string, pinned: boolean) {
  await db.notebooks.update(id, { pinned, updatedAt: Date.now() });
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

export interface HomeGroupSection {
  group: NotebookGroup | null; // null = "ungrouped" bucket
  notebooks: Notebook[];
}

export interface HomeListResult {
  pinned: Notebook[];
  /** true once the person has created at least one group — controls whether
   *  the Home screen shows group section headers at all, so the simple
   *  flat list stays exactly as before for anyone who never uses groups. */
  hasGroups: boolean;
  sections: HomeGroupSection[];
}

// Most-recently-active notebooks first: activity means either a metadata
// edit (updatedAt) or its most recent transaction, whichever is later.
async function sortByRecency(notebooks: Notebook[]): Promise<Notebook[]> {
  const withTs = await Promise.all(
    notebooks.map(async (n) => ({
      notebook: n,
      ts: Math.max(n.updatedAt, (await getLastActivityAt(n.id)) ?? 0),
    }))
  );
  withTs.sort((a, b) => b.ts - a.ts);
  return withTs.map((w) => w.notebook);
}

export async function getHomeList(): Promise<HomeListResult> {
  const [notebooks, groups] = await Promise.all([
    db.notebooks.filter((n) => !n.archived).toArray(),
    db.groups.toArray(),
  ]);

  const sorted = await sortByRecency(notebooks);
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

  // byGroup's key order follows `rest`'s order (already most-recent-first),
  // so the group containing the most recently active notebook appears first.
  const sections: HomeGroupSection[] = Array.from(byGroup.entries()).map(([gid, nbs]) => ({
    group: groupMap.get(gid)!,
    notebooks: nbs,
  }));
  if (ungrouped.length > 0) sections.push({ group: null, notebooks: ungrouped });

  return { pinned, hasGroups: true, sections };
}
