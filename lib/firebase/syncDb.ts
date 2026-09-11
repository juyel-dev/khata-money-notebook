import Dexie, { type EntityTable } from "dexie";
import type { SyncMutation } from "./syncTypes";

export class SyncQueueDB extends Dexie {
  syncMutations!: EntityTable<SyncMutation, "id">;

  constructor() {
    super("khata-sync-db");
    this.version(1).stores({
      syncMutations: "id, entity, entityId, operation, changedAt, status, attempts",
    });
  }
}

export const syncDb = new SyncQueueDB();
