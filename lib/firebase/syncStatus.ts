import { syncDb } from "./syncDb";
import type { SyncQueueStatus } from "./syncTypes";

const SYNC_STATUS_KEY = "syncStatus";

export type SyncStatus =
  | "local-only"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "needs-link"
  | "needs-reconciliation";

export interface SyncStatusSnapshot {
  key: typeof SYNC_STATUS_KEY;
  status: SyncStatus;
  updatedAt: number;
  lastSyncedAt?: number;
  lastError?: string;
}

export interface SyncStatusInputs {
  signedIn: boolean;
  online: boolean;
  linkStatus?: "linking" | "reconciliation-required" | "linked";
  pendingCount?: number;
  failedCount?: number;
  queueStatuses?: SyncQueueStatus[];
  /**
   * Whether an account-link attempt is currently in flight in this tab.
   * Defaults to true for backward compatibility. Callers that track the
   * attempt (SyncProvider) pass their live state so a stale stored
   * "linking" row — left behind by a failed or hung attempt — falls back
   * to needs-link instead of reporting syncing forever.
   */
  linkingInProgress?: boolean;
}

const listeners = new Set<(snapshot: SyncStatusSnapshot) => void>();

function isValidStatus(value: unknown): value is SyncStatus {
  return (
    value === "local-only" ||
    value === "syncing" ||
    value === "synced" ||
    value === "offline" ||
    value === "error" ||
    value === "needs-link" ||
    value === "needs-reconciliation"
  );
}

export function deriveSyncStatus({
  signedIn,
  online,
  linkStatus,
  pendingCount = 0,
  failedCount = 0,
  linkingInProgress = true,
}: SyncStatusInputs): SyncStatus {
  if (!signedIn) return "local-only";
  // A stored "linking" row with no attempt running is stale: a previous
  // attempt died or hung before completing. Surface needs-link so the user
  // gets the setup action back instead of an endless syncing spinner.
  const effectiveLinkStatus = linkStatus === "linking" && !linkingInProgress ? undefined : linkStatus;
  if (effectiveLinkStatus === "reconciliation-required") return "needs-reconciliation";
  if (!effectiveLinkStatus) return "needs-link";
  if (!online) return "offline";
  if (failedCount > 0) return "error";
  if (pendingCount > 0 || effectiveLinkStatus === "linking") return "syncing";
  if (effectiveLinkStatus === "linked") return "synced";
  return "syncing";
}

export function getRetryDelayMs(attempts: number): number {
  const safeAttempts = Number.isFinite(attempts) ? Math.max(0, Math.floor(attempts)) : 0;
  const base = 1000;
  const max = 5 * 60 * 1000;
  return Math.min(max, base * 2 ** safeAttempts);
}

export async function getSyncStatus(): Promise<SyncStatusSnapshot | null> {
  const meta = await syncDb.syncMeta.get(SYNC_STATUS_KEY);
  if (!meta) return null;

  try {
    const parsed = JSON.parse(meta.value) as Partial<SyncStatusSnapshot>;
    if (
      parsed.key !== SYNC_STATUS_KEY ||
      !isValidStatus(parsed.status) ||
      typeof parsed.updatedAt !== "number" ||
      (parsed.lastSyncedAt !== undefined && typeof parsed.lastSyncedAt !== "number") ||
      (parsed.lastError !== undefined && typeof parsed.lastError !== "string")
    ) {
      return null;
    }
    return parsed as SyncStatusSnapshot;
  } catch {
    return null;
  }
}

export async function setSyncStatus(
  status: SyncStatus,
  patch: Pick<SyncStatusSnapshot, "lastSyncedAt" | "lastError"> = {},
  updatedAt = Date.now(),
): Promise<SyncStatusSnapshot> {
  const current = await getSyncStatus();
  const snapshot: SyncStatusSnapshot = {
    key: SYNC_STATUS_KEY,
    status,
    updatedAt,
    ...(current?.lastSyncedAt !== undefined ? { lastSyncedAt: current.lastSyncedAt } : {}),
    ...(current?.lastError !== undefined ? { lastError: current.lastError } : {}),
    ...patch,
  };

  await syncDb.syncMeta.put({ key: SYNC_STATUS_KEY, value: JSON.stringify(snapshot) });
  for (const listener of listeners) listener(snapshot);
  return snapshot;
}

export function subscribeSyncStatus(listener: (snapshot: SyncStatusSnapshot) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
