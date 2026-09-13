import { syncDb } from "./syncDb";
import { getDeviceId, nextLogicalClock } from "./syncIdentity";
import { getRetryDelayMs } from "./syncStatus";
import { serializeFirestoreRecord } from "./firestoreSerialization";
import { compareSyncVersions, createMutationId, type SyncEntityPayload, type SyncEntityType, type SyncMutation, type SyncOperation, type SyncVersion } from "./syncTypes";

export interface EnqueueMutationInput {
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: SyncEntityPayload;
  changedAt: number;
  /** Stable ID for a locally durable capture intent. */
  mutationId?: string;
}

export const MAX_AUTO_RETRY_ATTEMPTS = 8;

export async function enqueueMutation(input: EnqueueMutationInput): Promise<string> {
  const version: SyncVersion = {
    changedAt: input.changedAt,
    deviceId: await getDeviceId(),
    sequence: await nextLogicalClock(),
  };
  const id = input.mutationId ?? createMutationId(input.entity, input.entityId, version);
  const serialized = input.payload
    ? serializeFirestoreRecord(input.payload as unknown as Record<string, unknown>)
    : null;
  const mutation: SyncMutation = {
    entity: input.entity,
    entityId: input.entityId,
    operation: input.operation,
    changedAt: input.changedAt,
    ...(serialized ? {
      payload: serialized.clean as unknown as SyncEntityPayload,
      ...(serialized.clearedFields.length ? { clearedFields: serialized.clearedFields } : {}),
    } : {}),
    id,
    version,
    status: "pending",
    attempts: 0,
  };

  try {
    // `add` makes a stable intent ID idempotent even if two flushers race or a
    // crash occurs after queue persistence but before the intent is removed.
    await syncDb.syncMutations.add(mutation);
  } catch (error) {
    const existing = await syncDb.syncMutations.get(id);
    if (!existing) throw error;
  }

  return id;
}

export async function getPendingMutations(limit = 50): Promise<SyncMutation[]> {
  const mutations = await syncDb.syncMutations
    .where("status")
    .equals("pending")
    .toArray();

  return mutations
    .sort((left, right) => compareSyncVersions(left.version, right.version))
    .slice(0, limit);
}

export async function getRetryableFailedMutations(
  now = Date.now(),
  limit = 50,
): Promise<SyncMutation[]> {
  const mutations = await syncDb.syncMutations
    .where("status")
    .equals("failed")
    .toArray();

  return mutations
    .filter((mutation) =>
      mutation.attempts < MAX_AUTO_RETRY_ATTEMPTS &&
      (mutation.nextRetryAt === undefined || mutation.nextRetryAt <= now),
    )
    .sort((left, right) => compareSyncVersions(left.version, right.version))
    .slice(0, limit);
}

export async function resetStaleSyncingMutations(): Promise<number> {
  const mutations = await syncDb.syncMutations
    .where("status")
    .equals("syncing")
    .toArray();

  await Promise.all(
    mutations.map((mutation) =>
      syncDb.syncMutations.update(mutation.id, { status: "pending" }),
    ),
  );

  return mutations.length;
}

export async function markMutationSyncing(id: string): Promise<void> {
  await syncDb.syncMutations.update(id, { status: "syncing" });
}

export async function markMutationFailed(id: string, lastError: string): Promise<void> {
  const mutation = await syncDb.syncMutations.get(id);
  if (!mutation) return;

  const attempts = mutation.attempts + 1;
  await syncDb.syncMutations.update(id, {
    status: "failed",
    attempts,
    lastError,
    // The current failure is the `attempts - 1` backoff step: first failure waits 1s.
    nextRetryAt: Date.now() + getRetryDelayMs(mutation.attempts),
  });
}

export async function markMutationPending(id: string): Promise<void> {
  await syncDb.syncMutations.update(id, {
    status: "pending",
    lastError: undefined,
    nextRetryAt: undefined,
  });
}

export async function retryFailedMutations(): Promise<number> {
  const mutations = await syncDb.syncMutations
    .where("status")
    .equals("failed")
    .toArray();

  await Promise.all(
    mutations.map((mutation) =>
      syncDb.syncMutations.update(mutation.id, {
        status: "pending",
        lastError: undefined,
        nextRetryAt: undefined,
      }),
    ),
  );

  return mutations.length;
}

export async function removeMutation(id: string): Promise<void> {
  await syncDb.syncMutations.delete(id);
}
