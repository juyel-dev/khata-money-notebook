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

function parseStoredLogicalClock(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new RangeError("stored logical clock is invalid");
  }
  return parsed;
}

function nextClockValue(current: number): number {
  if (current >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("logical clock overflow");
  }
  return current + 1;
}

export async function nextLogicalClock(): Promise<number> {
  return syncDb.transaction("rw", syncDb.syncMeta, async () => {
    const current = parseStoredLogicalClock(
      (await syncDb.syncMeta.get(LOGICAL_CLOCK_KEY))?.value,
    );
    const next = nextClockValue(current);
    await syncDb.syncMeta.put({ key: LOGICAL_CLOCK_KEY, value: String(next) });
    return next;
  });
}

/**
 * Advance this device's Lamport clock after observing a remote version.
 * The receive event is max(local, remote) + 1, so future local mutations
 * are causally newer than everything this device has already observed.
 */
export async function observeLogicalClock(remoteSequence: number): Promise<number> {
  if (!Number.isSafeInteger(remoteSequence) || remoteSequence < 0) {
    throw new RangeError("remoteSequence must be a non-negative safe integer");
  }

  return syncDb.transaction("rw", syncDb.syncMeta, async () => {
    const current = parseStoredLogicalClock(
      (await syncDb.syncMeta.get(LOGICAL_CLOCK_KEY))?.value,
    );
    const next = nextClockValue(Math.max(current, remoteSequence));
    await syncDb.syncMeta.put({ key: LOGICAL_CLOCK_KEY, value: String(next) });
    return next;
  });
}
