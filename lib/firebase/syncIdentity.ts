import type { SyncMeta } from "./syncTypes";
import { syncDb } from "./syncDb";

const DEVICE_ID_KEY = "deviceId";
const LOGICAL_CLOCK_KEY = "logicalClock";

function createDeviceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function getDeviceId(): Promise<string> {
  const existing: SyncMeta | undefined = await syncDb.syncMeta.get(DEVICE_ID_KEY);
  if (existing?.value) return existing.value;
  const deviceId = createDeviceId();
  await syncDb.syncMeta.put({ key: DEVICE_ID_KEY, value: deviceId });
  return deviceId;
}

export async function nextLogicalClock(): Promise<number> {
  return syncDb.transaction("rw", syncDb.syncMeta, async () => {
    const current = await syncDb.syncMeta.get(LOGICAL_CLOCK_KEY);
    const next = Number(current?.value ?? 0) + 1;
    await syncDb.syncMeta.put({ key: LOGICAL_CLOCK_KEY, value: String(next) });
    return next;
  });
}
