import Dexie, { type EntityTable } from "dexie";
import type { SyncJournalQuarantine, SyncMeta, SyncMutation, SyncTombstone } from "./syncTypes";

export class SyncQueueDB extends Dexie {
  syncMutations!: EntityTable<SyncMutation, "id">;
  syncTombstones!: EntityTable<SyncTombstone, "id">;
  syncMeta!: EntityTable<SyncMeta, "key">;
  syncJournalQuarantine!: EntityTable<SyncJournalQuarantine, "id">;

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
    this.version(3).stores({
      syncMutations: "id, entity, entityId, operation, changedAt, status, attempts",
      syncTombstones: "id, entity, entityId, deletedAt",
      syncMeta: "key",
      syncJournalQuarantine: "id, receivedOrder, quarantinedAt",
    });
    this.version(4).stores({
      syncMutations: "id, entity, entityId, operation, changedAt, status, attempts, nextRetryAt",
      syncTombstones: "id, entity, entityId, deletedAt",
      syncMeta: "key",
      syncJournalQuarantine: "id, receivedOrder, quarantinedAt",
    });
  }
}

export const syncDb = new SyncQueueDB();
