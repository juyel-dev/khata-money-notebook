import { v4 as uuid } from "uuid";
import type { Notebook, NotebookGroup, Person, Transaction, SyncCaptureIntent } from "../db/schema";
import { db } from "../db/schema";
import { enqueueMutation } from "./syncQueue";
import { setEntityVersion } from "./syncState";
import type { SyncEntityType, SyncEntityPayload, SyncVersion } from "./syncTypes";

export type LocalSyncCapture = {
  entity: SyncEntityType;
  entityId: string;
  operation: "upsert" | "delete";
  payload?: SyncEntityPayload;
  changedAt: number;
};

/**
 * Stage a sync intent in the same Dexie database as the source-of-truth write.
 * Call this only inside the caller's `db.transaction(...)` so a successful
 * local write can never commit without a durable recovery trail.
 */
export async function stageSyncCapture(input: LocalSyncCapture): Promise<string> {
  const intent: SyncCaptureIntent = {
    id: uuid(),
    entity: input.entity,
    entityId: input.entityId,
    operation: input.operation,
    ...(input.payload ? { payload: input.payload } : {}),
    changedAt: input.changedAt,
    createdAt: Date.now(),
  };
  await db.syncCaptureIntents.add(intent);
  return intent.id;
}

async function setCapturedVersion(
  entity: SyncEntityType,
  entityId: string,
  version: SyncVersion,
  deleted: boolean,
): Promise<void> {
  await setEntityVersion({ entity, entityId, version, deleted });
}

/**
 * Drain locally durable capture intents into the separate sync queue. If the
 * queue/database is unavailable, intents remain in the local source DB and can
 * be retried later without losing the mutation.
 */
export async function flushSyncCaptureIntents(): Promise<number> {
  let intents: SyncCaptureIntent[];
  try {
    intents = await db.syncCaptureIntents.orderBy("createdAt").toArray();
  } catch (error) {
    console.warn("Khata sync capture drain deferred", error);
    return 0;
  }

  let flushed = 0;

  for (const intent of intents) {
    try {
      const mutationId = await enqueueMutation({
        entity: intent.entity,
        entityId: intent.entityId,
        operation: intent.operation,
        payload: intent.payload,
        changedAt: intent.changedAt,
        mutationId: intent.id,
      });
      const { syncDb } = await import("./syncDb");
      const mutation = await syncDb.syncMutations.get(mutationId);
      if (!mutation) throw new Error("sync queue mutation was not persisted");

      await setCapturedVersion(
        intent.entity,
        intent.entityId,
        mutation.version,
        intent.operation === "delete",
      );
      await db.syncCaptureIntents.delete(intent.id);
      flushed += 1;
    } catch (error) {
      // Preserve the intent. A later auto-sync/manual retry can drain it.
      console.warn("Khata sync capture deferred", error);
    }
  }

  return flushed;
}

/**
 * Compatibility helper for callers that already committed the local write.
 * New source-of-truth mutations should use stageSyncCapture inside their DB
 * transaction and then flushSyncCaptureIntents after commit.
 */
export async function captureAndRecordUpsert(
  entity: SyncEntityType,
  payload: SyncEntityPayload,
  changedAt: number,
): Promise<string> {
  const id = await stageSyncCapture({ entity, entityId: payload.id, operation: "upsert", payload, changedAt });
  await flushSyncCaptureIntents();
  return id;
}

export async function captureDelete(
  entity: SyncEntityType,
  entityId: string,
  changedAt = Date.now(),
): Promise<string> {
  const id = await stageSyncCapture({ entity, entityId, operation: "delete", changedAt });
  await flushSyncCaptureIntents();
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
