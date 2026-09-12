import { syncDb } from "./syncDb";
import { getDeviceId, nextLogicalClock } from "./syncIdentity";
import { getRetryDelayMs } from "./syncStatus";
import { compareSyncVersions, createMutationId, type SyncEntityPayload, type SyncEntityType, type SyncMutation, type SyncOperation, type SyncVersion } from "./syncTypes";

export interface EnqueueMutationInput {
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: SyncEntityPayload;
  changedAt: number;
}

export const MAX_AUTO_RETRY_ATTEMPTS = 8;

export async function enqueueMutation(input: EnqueueMutationInput): Promise<string> {
  const version: SyncVersion = {
    changedAt: input.changedAt,
    deviceId: await getDeviceId(),
    sequence: await nextLogicalClock(),
  };
  const id = createMutationId(input.entity, input.entityId, version);
  const mutation: SyncMutation = {
    ...input,
    id,
    version,
    status: "pending",
    attempts: 0,
  };

  await syncDb.syncMutations.put(mutation);
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
