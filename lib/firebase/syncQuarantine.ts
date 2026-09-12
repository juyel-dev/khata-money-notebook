import { syncDb } from "./syncDb";
import type { SyncJournalQuarantine } from "./syncTypes";

export async function quarantineJournalRow(
  receivedOrder: number | null,
  rawData: unknown,
  reason: string,
): Promise<void> {
  const id = `journal:${receivedOrder ?? "unknown"}:${Date.now()}:${crypto.randomUUID()}`;
  await syncDb.syncJournalQuarantine.put({
    id,
    receivedOrder,
    quarantinedAt: Date.now(),
    reason,
    rawData,
  });
}

export async function listQuarantinedJournalRows(): Promise<SyncJournalQuarantine[]> {
  return syncDb.syncJournalQuarantine.orderBy("quarantinedAt").reverse().toArray();
}

export async function clearQuarantinedJournalRow(id: string): Promise<void> {
  await syncDb.syncJournalQuarantine.delete(id);
}
