export type SyncStatusKind = "signed-out" | "needs-link" | "offline" | "unavailable" | "syncing" | "synced" | "error";

export interface SyncStatusSnapshot {
  kind: SyncStatusKind;
  pending: number;
  syncing: number;
  failed: number;
  lastError?: string;
  lastSyncedAt?: number;
}

export interface SyncQueueCounts {
  pending: number;
  syncing: number;
  failed: number;
}

export const LAST_SYNC_META_PREFIX = "lastSyncAt:";

export function lastSyncMetaKey(uid: string): string {
  return `${LAST_SYNC_META_PREFIX}${uid}`;
}

export function deriveSyncStatus(input: {
  signedIn: boolean;
  linked: boolean;
  online: boolean;
  firebaseAvailable: boolean;
  syncing: boolean;
  queue: SyncQueueCounts;
  lastSyncedAt?: number;
  lastError?: string;
}): SyncStatusSnapshot {
  const { queue } = input;
  if (!input.signedIn) return { kind: "signed-out", ...queue, lastSyncedAt: input.lastSyncedAt };
  if (!input.linked) return { kind: "needs-link", ...queue, lastSyncedAt: input.lastSyncedAt };
  if (!input.firebaseAvailable) return { kind: "unavailable", ...queue, lastSyncedAt: input.lastSyncedAt };
  if (!input.online) return { kind: "offline", ...queue, lastSyncedAt: input.lastSyncedAt };
  if (input.syncing || queue.syncing > 0) return { kind: "syncing", ...queue, lastSyncedAt: input.lastSyncedAt };
  if (queue.failed > 0) return { kind: "error", ...queue, lastError: input.lastError, lastSyncedAt: input.lastSyncedAt };
  return { kind: "synced", ...queue, lastSyncedAt: input.lastSyncedAt };
}
