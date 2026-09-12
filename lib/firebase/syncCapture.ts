import type {
  Notebook,
  NotebookGroup,
  Person,
  Transaction,
} from "../db/schema";
import { enqueueMutation } from "./syncQueue";
import { setEntityVersion } from "./syncState";
import type { SyncEntityType, SyncEntityPayload, SyncVersion } from "./syncTypes";

async function captureMutation(
  entity: SyncEntityType,
  entityId: string,
  operation: "upsert" | "delete",
  payload: SyncEntityPayload | undefined,
  changedAt: number,
): Promise<string> {
  try {
    const id = await enqueueMutation({ entity, entityId, operation, payload, changedAt });
    return id;
  } catch (error) {
    // A cloud-queue failure must never turn a successful local write into a failed write.
    // The local database remains authoritative; a later reconciliation pass can recover.
    console.warn("Khata sync capture skipped after local write", error);
    return "";
  }
}

async function captureUpsert(
  entity: SyncEntityType,
  payload: SyncEntityPayload,
  changedAt: number,
): Promise<string> {
  return captureMutation(entity, payload.id, "upsert", payload, changedAt);
}

async function captureDelete(
  entity: SyncEntityType,
  entityId: string,
  changedAt = Date.now(),
): Promise<string> {
  return captureMutation(entity, entityId, "delete", undefined, changedAt);
}

async function setCapturedVersion(
  entity: SyncEntityType,
  entityId: string,
  version: SyncVersion,
  deleted: boolean,
): Promise<void> {
  try {
    await setEntityVersion({ entity, entityId, version, deleted });
  } catch (error) {
    console.warn("Khata sync version state skipped after local write", error);
  }
}

async function captureAndRecordUpsert(
  entity: SyncEntityType,
  payload: SyncEntityPayload,
  changedAt: number,
): Promise<string> {
  const id = await captureUpsert(entity, payload, changedAt);
  if (id) {
    const { syncDb } = await import("./syncDb");
    const mutation = await syncDb.syncMutations.get(id);
    if (mutation) await setCapturedVersion(entity, payload.id, mutation.version, false);
  }
  return id;
}

async function captureAndRecordDelete(
  entity: SyncEntityType,
  entityId: string,
  changedAt: number,
): Promise<string> {
  const id = await captureDelete(entity, entityId, changedAt);
  if (id) {
    const { syncDb } = await import("./syncDb");
    const mutation = await syncDb.syncMutations.get(id);
    if (mutation) await setCapturedVersion(entity, entityId, mutation.version, true);
  }
  return id;
}

export async function captureNotebook(notebook: Notebook): Promise<string> {
  return captureAndRecordUpsert("notebook", notebook, notebook.updatedAt);
}

export async function captureGroup(group: NotebookGroup): Promise<string> {
  return captureAndRecordUpsert("group", group, group.createdAt);
}

export async function capturePerson(person: Person, changedAt = Date.now()): Promise<string> {
  return captureAndRecordUpsert("person", person, changedAt);
}

export async function captureTransaction(
  transaction: Transaction,
  changedAt = transaction.createdAt,
): Promise<string> {
  return captureAndRecordUpsert("transaction", transaction, changedAt);
}

export { captureAndRecordDelete as captureDelete };
