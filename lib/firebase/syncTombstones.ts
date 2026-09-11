import { syncDb } from "./syncDb";
import { compareSyncVersions, type SyncEntityType, type SyncTombstone, type SyncVersion } from "./syncTypes";

export function tombstoneId(entity: SyncEntityType, entityId: string): string {
  return `${entity}:${entityId}`;
}

export async function recordTombstone(
  entity: SyncEntityType,
  entityId: string,
  version: SyncVersion,
): Promise<void> {
  const id = tombstoneId(entity, entityId);
  const existing = await syncDb.syncTombstones.get(id);

  if (existing && compareSyncVersions(version, existing.version) < 0) return;

  const tombstone: SyncTombstone = {
    id,
    entity,
    entityId,
    version,
    deletedAt: version.changedAt,
  };
  await syncDb.syncTombstones.put(tombstone);
}

export async function getTombstone(
  entity: SyncEntityType,
  entityId: string,
): Promise<SyncTombstone | undefined> {
  return syncDb.syncTombstones.get(tombstoneId(entity, entityId));
}

export async function shouldRejectUpsert(
  entity: SyncEntityType,
  entityId: string,
  version: SyncVersion,
): Promise<boolean> {
  const tombstone = await getTombstone(entity, entityId);
  return tombstone ? compareSyncVersions(version, tombstone.version) <= 0 : false;
}

export async function clearTombstoneForNewerUpsert(
  entity: SyncEntityType,
  entityId: string,
  version: SyncVersion,
): Promise<void> {
  const tombstone = await getTombstone(entity, entityId);
  if (!tombstone || compareSyncVersions(version, tombstone.version) > 0) {
    await syncDb.syncTombstones.delete(tombstoneId(entity, entityId));
  }
}
