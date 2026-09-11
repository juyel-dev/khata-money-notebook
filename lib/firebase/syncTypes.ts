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
 * A version is comparable across devices. Wall-clock time provides the
 * primary order; deviceId and sequence make equal timestamps deterministic.
 */
export interface SyncVersion {
  changedAt: number;
  deviceId: string;
  sequence: number;
}

export interface SyncMeta {
  key: string;
  value: string;
}

export interface SyncMutation<TPayload = SyncEntityPayload> {
  id: string;
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: TPayload;
  changedAt: number;
  version: SyncVersion;
  status: SyncQueueStatus;
  attempts: number;
  lastError?: string;
}

export interface SyncTombstone {
  id: string;
  entity: SyncEntityType;
  entityId: string;
  version: SyncVersion;
  deletedAt: number;
}

export type SyncEntityPayload = Notebook | NotebookGroup | Person | Transaction;
export type SyncableEntity = SyncEntityPayload;

export function isSyncEntityType(value: string): value is SyncEntityType {
  return (SYNC_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isSyncOperation(value: string): value is SyncOperation {
  return (SYNC_OPERATIONS as readonly string[]).includes(value);
}

export function createMutationId(
  entity: SyncEntityType,
  entityId: string,
  version: SyncVersion,
): string {
  return `${entity}:${entityId}:${version.changedAt}:${version.deviceId}:${version.sequence}`;
}

export function compareSyncVersions(left: SyncVersion, right: SyncVersion): number {
  if (left.changedAt !== right.changedAt) return left.changedAt - right.changedAt;
  const deviceOrder = left.deviceId.localeCompare(right.deviceId);
  if (deviceOrder !== 0) return deviceOrder;
  return left.sequence - right.sequence;
}
