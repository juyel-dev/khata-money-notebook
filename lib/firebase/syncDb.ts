import Dexie, { type EntityTable } from "dexie";
import type { SyncMeta, SyncMutation, SyncTombstone } from "./syncTypes";

export class SyncQueueDB extends Dexie {
  syncMutations!: EntityTable<SyncMutation, "id">;
  syncTombstones!: EntityTable<SyncTombstone, "id">;
  syncMeta!: EntityTable<SyncMeta, "key">;

  constructor() {
    super("khata-sync-db");
    this.version(1).stores({
      syncMutations: "id, entity, entityId, operation, changedAt, status, attempts",
    });
    this.version(2).stores({
      syncMutations: "id, entity, entityId, operation, changedAt, status, attempts",
      syncTombstones: "id, entity, entityId, deletedAt",
      syncMeta: "key",
    });
  }
}

export const syncDb = new SyncQueueDB();
