import type { Notebook, NotebookGroup, Person, Transaction } from "../db/schema";

export const SYNC_OPERATIONS = ["upsert", "delete"] as const;
export type SyncOperation = (typeof SYNC_OPERATIONS)[number];

export const SYNC_ENTITY_TYPES = [
  "notebook",
  "group",
  "person",
  "transaction",
] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export type SyncQueueStatus = "pending" | "syncing" | "failed";

/**
 * Durable local mutation envelope. The payload is the exact local entity
 * snapshot needed by the cloud adapter; deletes retain only identity and the
 * mutation timestamp so a removed entity cannot be resurrected by retry logic.
 */
export interface SyncMutation<TPayload = SyncEntityPayload> {
  id: string;
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: TPayload;
  changedAt: number;
  status: SyncQueueStatus;
  attempts: number;
  lastError?: string;
}

export type SyncEntityPayload =
  | Notebook
  | NotebookGroup
  | Person
  | Transaction;

export type SyncableEntity = SyncEntityPayload;

export function isSyncEntityType(value: string): value is SyncEntityType {
  return (SYNC_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isSyncOperation(value: string): value is SyncOperation {
  return (SYNC_OPERATIONS as readonly string[]).includes(value);
}

export function createMutationId(entity: SyncEntityType, entityId: string, changedAt: number): string {
  return `${entity}:${entityId}:${changedAt}`;
}
