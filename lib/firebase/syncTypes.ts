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
 * A version is comparable across devices without trusting wall clocks.
 * `sequence` is a Lamport clock; deviceId is the deterministic tie-breaker.
 * changedAt is retained as the real-world time for audit/display purposes.
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
  nextRetryAt?: number;
}

export interface SyncTombstone {
  id: string;
  entity: SyncEntityType;
  entityId: string;
  version: SyncVersion;
  deletedAt: number;
}

export interface SyncJournalQuarantine {
  id: string;
  receivedOrder: number | null;
  quarantinedAt: number;
  reason: string;
  rawData: unknown;
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
  if (left.sequence !== right.sequence) return left.sequence - right.sequence;
  const deviceOrder = left.deviceId.localeCompare(right.deviceId);
  if (deviceOrder !== 0) return deviceOrder;
  return left.changedAt - right.changedAt;
}
