import { syncDb } from "./syncDb";
import type { SyncEntityPayload, SyncEntityType, SyncMutation, SyncOperation } from "./syncTypes";

export interface EnqueueMutationInput {
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: SyncEntityPayload;
  changedAt: number;
}

export async function enqueueMutation(input: EnqueueMutationInput): Promise<string> {
  const id = `${input.entity}:${input.entityId}:${input.changedAt}`;
  const mutation: SyncMutation = {
    ...input,
    id,
    status: "pending",
    attempts: 0,
  };

  await syncDb.syncMutations.put(mutation);
  return id;
}

export async function getPendingMutations(limit = 50): Promise<SyncMutation[]> {
  return syncDb.syncMutations
    .where("status")
    .equals("pending")
    .sortBy("changedAt")
    .then((mutations) => mutations.slice(0, limit));
}

export async function markMutationSyncing(id: string): Promise<void> {
  await syncDb.syncMutations.update(id, { status: "syncing" });
}

export async function markMutationFailed(id: string, lastError: string): Promise<void> {
  const mutation = await syncDb.syncMutations.get(id);
  if (!mutation) return;
  await syncDb.syncMutations.update(id, {
    status: "failed",
    attempts: mutation.attempts + 1,
    lastError,
  });
}

export async function markMutationPending(id: string): Promise<void> {
  await syncDb.syncMutations.update(id, { status: "pending" });
}

export async function removeMutation(id: string): Promise<void> {
  await syncDb.syncMutations.delete(id);
}
