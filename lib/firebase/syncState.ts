import { syncDb } from "./syncDb";
import type { SyncEntityType, SyncMeta, SyncVersion } from "./syncTypes";

const VERSION_PREFIX = "entityVersion:";
const CURSOR_PREFIX = "cursor:";

export interface SyncEntityState {
  entity: SyncEntityType;
  entityId: string;
  version: SyncVersion;
  deleted: boolean;
}

function versionKey(entity: SyncEntityType, entityId: string): string {
  return `${VERSION_PREFIX}${entity}:${entityId}`;
}

function cursorKey(uid: string): string {
  return `${CURSOR_PREFIX}${uid}`;
}

export async function getEntityVersion(
  entity: SyncEntityType,
  entityId: string,
): Promise<SyncEntityState | null> {
  const row: SyncMeta | undefined = await syncDb.syncMeta.get(versionKey(entity, entityId));
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<SyncEntityState>;
    if (
      parsed.entity !== entity ||
      parsed.entityId !== entityId ||
      !parsed.version ||
      typeof parsed.version.changedAt !== "number" ||
      typeof parsed.version.deviceId !== "string" ||
      typeof parsed.version.sequence !== "number" ||
      typeof parsed.deleted !== "boolean"
    ) {
      return null;
    }
    return parsed as SyncEntityState;
  } catch {
    return null;
  }
}

export async function setEntityVersion(state: SyncEntityState): Promise<void> {
  await syncDb.syncMeta.put({
    key: versionKey(state.entity, state.entityId),
    value: JSON.stringify(state),
  });
}

export async function getSyncCursor(uid: string): Promise<number> {
  const row = await syncDb.syncMeta.get(cursorKey(uid));
  const value = Number(row?.value ?? 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export async function setSyncCursor(uid: string, receivedOrder: number): Promise<void> {
  if (!Number.isSafeInteger(receivedOrder) || receivedOrder < 0) {
    throw new RangeError("sync cursor must be a non-negative safe integer");
  }
  await syncDb.syncMeta.put({ key: cursorKey(uid), value: String(receivedOrder) });
}
