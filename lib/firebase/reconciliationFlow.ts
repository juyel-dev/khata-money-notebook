import { collection, getDocs, type Firestore } from "firebase/firestore";
import { db, type Notebook, type NotebookGroup, type Person, type Transaction } from "../db/schema";
import { completeAccountLink, getAccountLink } from "./accountLink";
import { planFirstAccountReconciliation, type ReconciliationPlan } from "./reconciliation";
import { syncOnce } from "./syncEngine";
import { captureAndRecordUpsert } from "./syncCapture";
import { setEntityVersion } from "./syncState";
import type { SyncEntityPayload, SyncEntityType, SyncVersion } from "./syncTypes";
import { userCollectionPath } from "./firestoreSchema";

export interface LocalDataset {
  notebooks: Notebook[];
  groups: NotebookGroup[];
  people: Person[];
  transactions: Transaction[];
}

export interface CloudDataset extends LocalDataset {
  versions: Partial<Record<SyncEntityType, Record<string, SyncVersion>>>;
}

export interface AccountReconciliationInspection {
  local: { summary: LocalDatasetSummary };
  cloud: { summary: LocalDatasetSummary };
  plan: ReconciliationPlan;
}

export interface LocalDatasetSummary {
  notebooks: number;
  groups: number;
  people: number;
  transactions: number;
}

const COLLECTIONS: Record<SyncEntityType, keyof LocalDataset> = {
  notebook: "notebooks",
  group: "groups",
  person: "people",
  transaction: "transactions",
};

function isSyncVersion(value: unknown): value is SyncVersion {
  if (!value || typeof value !== "object") return false;
  const version = value as Record<string, unknown>;
  return (
    typeof version.changedAt === "number" && Number.isFinite(version.changedAt) &&
    typeof version.deviceId === "string" && version.deviceId.trim().length > 0 &&
    typeof version.sequence === "number" && Number.isSafeInteger(version.sequence) && version.sequence >= 0
  );
}

async function readLocalDataset(): Promise<LocalDataset> {
  const [notebooks, groups, people, transactions] = await Promise.all([
    db.notebooks.toArray(),
    db.groups.toArray(),
    db.people.toArray(),
    db.transactions.toArray(),
  ]);
  return { notebooks, groups, people, transactions };
}

async function readCloudDataset(firestore: Firestore, uid: string): Promise<CloudDataset> {
  const rows = await Promise.all(
    (Object.entries(COLLECTIONS) as Array<[SyncEntityType, keyof LocalDataset]>).map(async ([entity, key]) => {
      const snapshot = await getDocs(collection(firestore, userCollectionPath(uid, key)));
      return [entity, snapshot.docs.map((docSnapshot) => docSnapshot.data())] as const;
    }),
  );

  const raw = Object.fromEntries(rows) as Record<SyncEntityType, Record<string, unknown>[]>;
  const versions: CloudDataset["versions"] = {};

  for (const [entity, entityRows] of rows) {
    const entityVersions: Record<string, SyncVersion> = {};
    for (const row of entityRows) {
      if (isSyncVersion(row.version) && typeof row.id === "string") {
        entityVersions[row.id] = row.version;
      }
    }
    versions[entity] = entityVersions;
  }

  const toNotebook = (rows: Record<string, unknown>[]): Notebook[] => rows.map(stripCloudMetadata) as unknown as Notebook[];
  const toGroup = (rows: Record<string, unknown>[]): NotebookGroup[] => rows.map(stripCloudMetadata) as unknown as NotebookGroup[];
  const toPerson = (rows: Record<string, unknown>[]): Person[] => rows.map(stripCloudMetadata) as unknown as Person[];
  const toTransaction = (rows: Record<string, unknown>[]): Transaction[] => rows.map(stripCloudMetadata) as unknown as Transaction[];

  return {
    notebooks: toNotebook(raw.notebook),
    groups: toGroup(raw.group),
    people: toPerson(raw.person),
    transactions: toTransaction(raw.transaction),
    versions,
  };
}

function stripCloudMetadata(row: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...row };
  delete payload.version;
  delete payload.syncUpdatedAt;
  return payload;
}

function summarize(dataset: LocalDataset): LocalDatasetSummary {
  return {
    notebooks: dataset.notebooks.length,
    groups: dataset.groups.length,
    people: dataset.people.length,
    transactions: dataset.transactions.length,
  };
}

export async function inspectFirstAccountLink(
  firestore: Firestore,
  uid: string,
): Promise<AccountReconciliationInspection> {
  const [local, cloud] = await Promise.all([
    readLocalDataset(),
    readCloudDataset(firestore, uid),
  ]);
  const localSummary = summarize(local);
  const cloudSummary = summarize(cloud);
  return {
    local: { summary: localSummary },
    cloud: { summary: cloudSummary },
    plan: planFirstAccountReconciliation(localSummary, cloudSummary),
  };
}

async function migrateLocalToCloud(firestore: Firestore, uid: string): Promise<void> {
  const local = await readLocalDataset();
  const ordered: Array<[SyncEntityType, SyncEntityPayload[]]> = [
    ["group", local.groups],
    ["notebook", local.notebooks],
    ["person", local.people],
    ["transaction", local.transactions],
  ];

  for (const [entity, rows] of ordered) {
    for (const row of rows) {
      await captureAndRecordUpsert(entity, row, getMigrationChangedAt(entity, row));
    }
  }

  await completeAccountLink(uid);
  await syncOnce(firestore, uid);
}

function getMigrationChangedAt(entity: SyncEntityType, payload: SyncEntityPayload): number {
  if (entity === "notebook") return payload.updatedAt;
  if (entity === "transaction") return payload.createdAt;
  return payload.createdAt;
}

async function replaceLocalWithCloud(firestore: Firestore, uid: string): Promise<void> {
  const cloud = await readCloudDataset(firestore, uid);

  await db.transaction("rw", db.notebooks, db.groups, db.people, db.transactions, async () => {
    await db.transactions.clear();
    await db.people.clear();
    await db.notebooks.clear();
    await db.groups.clear();
    if (cloud.groups.length) await db.groups.bulkPut(cloud.groups);
    if (cloud.notebooks.length) await db.notebooks.bulkPut(cloud.notebooks);
    if (cloud.people.length) await db.people.bulkPut(cloud.people);
    if (cloud.transactions.length) await db.transactions.bulkPut(cloud.transactions);
  });

  for (const [entity, key] of Object.entries(COLLECTIONS) as Array<[SyncEntityType, keyof LocalDataset]>) {
    const rows = cloud[key] as SyncEntityPayload[];
    const entityVersions = cloud.versions[entity] ?? {};
    for (const row of rows) {
      const version = entityVersions[row.id];
      if (version) {
        await setEntityVersion({ entity, entityId: row.id, version, deleted: false });
      }
    }
  }

  await completeAccountLink(uid);
}

export async function confirmAccountReconciliation(
  firestore: Firestore,
  uid: string,
  action: "preserve-local" | "preserve-cloud",
): Promise<void> {
  const link = await getAccountLink();
  if (!link || link.uid !== uid) throw new Error("ACCOUNT_LINK_TARGET_MISMATCH");
  if (link.status !== "linking" && link.status !== "reconciliation-required") {
    throw new Error("ACCOUNT_LINK_NOT_RECONCILING");
  }

  if (action === "preserve-local") {
    await migrateLocalToCloud(firestore, uid);
    return;
  }

  await replaceLocalWithCloud(firestore, uid);
}
