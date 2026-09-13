import { db } from "../db/schema";
import { getAccountLink, assertAccountLinkTarget } from "./accountLink";
import { readMutationJournal, pushMutation, type RemoteMutation, type SyncCursor } from "./firestoreSync";
import { resolveConflict, type SyncCandidate } from "./syncConflict";
import {
  getPendingMutations,
  getRetryableFailedMutations,
  markMutationFailed,
  markMutationSyncing,
  removeMutation,
  resetStaleSyncingMutations,
} from "./syncQueue";
import { getSyncCursor, getEntityVersion, setEntityVersion, setSyncCursor } from "./syncState";
import { observeLogicalClock } from "./syncIdentity";
import { recordTombstone, clearTombstoneForNewerUpsert, shouldRejectUpsert } from "./syncTombstones";
import { compareSyncVersions, type SyncEntityPayload, type SyncEntityType, type SyncVersion } from "./syncTypes";
import type { Firestore } from "firebase/firestore";

const DEFAULT_PUSH_BATCH = 50;
const DEFAULT_PULL_PAGE = 100;
const DEFAULT_MAX_PAGES = 20;

export const DEFAULT_SYNC_TIMEOUT_MS = 30_000;
const SYNC_TIMEOUT_MESSAGE = "Sync timed out. Check your connection and try again.";

/**
 * Races a promise against a timeout so hung network/storage operations
 * surface as errors instead of spinning forever. The wrapped promise keeps
 * running in the background; only the caller's wait is bounded.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new SyncEngineError(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

let activeSync: Promise<SyncResult> | null = null;

export class SyncEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncEngineError";
  }
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  skipped: number;
  pages: number;
  recoveredSyncing: number;
}

function candidateFromLocalState(
  state: { version: SyncVersion; deleted: boolean } | null,
  entityId: string,
): SyncCandidate | null {
  if (!state) return null;
  return {
    operation: state.deleted ? "delete" : "upsert",
    version: state.version,
    mutationId: `local:${state.version.deviceId}:${state.version.sequence}:${entityId}`,
  };
}

function tableForEntity(entity: SyncEntityType) {
  switch (entity) {
    case "notebook": return db.notebooks;
    case "group": return db.groups;
    case "person": return db.people;
    case "transaction": return db.transactions;
  }
}

async function applyRemoteMutation(mutation: RemoteMutation): Promise<"applied" | "skipped"> {
  await observeLogicalClock(mutation.version.sequence);

  const localState = await getEntityVersion(mutation.entity, mutation.entityId);
  const localCandidate = candidateFromLocalState(localState, mutation.entityId);

  if (mutation.operation === "upsert") {
    if (!mutation.payload || mutation.payload.id !== mutation.entityId) {
      throw new SyncEngineError("invalid remote upsert payload");
    }
    if (await shouldRejectUpsert(mutation.entity, mutation.entityId, mutation.version)) {
      return "skipped";
    }
  }

  const resolution = resolveConflict(localCandidate, {
    operation: mutation.operation,
    version: mutation.version,
    mutationId: mutation.id,
  });

  if (resolution === "current") return "skipped";

  if (mutation.operation === "delete") {
    await tableForEntity(mutation.entity).delete(mutation.entityId);
    await recordTombstone(mutation.entity, mutation.entityId, mutation.version);
    await setEntityVersion({
      entity: mutation.entity,
      entityId: mutation.entityId,
      version: mutation.version,
      deleted: true,
    });
    return "applied";
  }

  const payload = mutation.payload as SyncEntityPayload;
  await tableForEntity(mutation.entity).put(payload as never);
  await clearTombstoneForNewerUpsert(mutation.entity, mutation.entityId, mutation.version);
  await setEntityVersion({
    entity: mutation.entity,
    entityId: mutation.entityId,
    version: mutation.version,
    deleted: false,
  });
  return "applied";
}

async function pushPendingMutations(
  firestore: Firestore,
  uid: string,
  batchSize: number,
): Promise<{ pushed: number; firstError: unknown | null }> {
  const [pending, retryable] = await Promise.all([
    getPendingMutations(batchSize),
    getRetryableFailedMutations(Date.now(), batchSize),
  ]);
  const mutations = [...pending, ...retryable]
    .sort((left, right) => compareSyncVersions(left.version, right.version))
    .slice(0, batchSize);
  let pushed = 0;
  let firstError: unknown | null = null;

  for (const mutation of mutations) {
    await markMutationSyncing(mutation.id);
    try {
      await pushMutation(firestore, uid, mutation);
      await removeMutation(mutation.id);
      pushed += 1;
    } catch (error) {
      await markMutationFailed(
        mutation.id,
        error instanceof Error ? error.message : String(error),
      );
      if (firstError === null) firstError = error;
    }
  }

  return { pushed, firstError };
}

async function pullJournal(
  firestore: Firestore,
  uid: string,
  pageSize: number,
  maxPages: number,
): Promise<{ pulled: number; skipped: number; pages: number }> {
  const cursorOrder = await getSyncCursor(uid);
  let cursor: SyncCursor | null = cursorOrder > 0 ? { receivedOrder: cursorOrder } : null;
  let pulled = 0;
  let skipped = 0;
  let pages = 0;

  while (pages < maxPages) {
    const page = await readMutationJournal(firestore, uid, cursor, pageSize);
    pages += 1;

    if (page.mutations.length === 0) {
      // A page can contain only quarantined rows. Persist their safe cursor and
      // continue so corrupt rows cannot block later journal pages.
      if (page.nextCursor && (!cursor || page.nextCursor.receivedOrder !== cursor.receivedOrder)) {
        await setSyncCursor(uid, page.nextCursor.receivedOrder);
        cursor = page.nextCursor;
        continue;
      }
      // A genuinely empty page is the terminal condition.
      break;
    }

    for (const mutation of page.mutations) {
      const result = await applyRemoteMutation(mutation);
      if (result === "applied") pulled += 1;
      else skipped += 1;
    }

    if (!page.nextCursor) {
      throw new SyncEngineError("sync journal returned mutations without a cursor");
    }

    await setSyncCursor(uid, page.nextCursor.receivedOrder);
    cursor = page.nextCursor;
  }

  return { pulled, skipped, pages };
}

async function runSync(
  firestore: Firestore,
  uid: string,
  options: {
    pushBatchSize?: number;
    pullPageSize?: number;
    maxPullPages?: number;
  } = {},
): Promise<SyncResult> {
  const link = await assertAccountLinkTarget(uid);
  if (!link || (await getAccountLink())?.status !== "linked") {
    throw new SyncEngineError("RECONCILIATION_REQUIRED");
  }

  const recoveredSyncing = await resetStaleSyncingMutations();
  const pushResult = await pushPendingMutations(
    firestore,
    uid,
    options.pushBatchSize ?? DEFAULT_PUSH_BATCH,
  );
  const pulled = await pullJournal(
    firestore,
    uid,
    options.pullPageSize ?? DEFAULT_PULL_PAGE,
    options.maxPullPages ?? DEFAULT_MAX_PAGES,
  );

  if (pushResult.firstError !== null) throw pushResult.firstError;

  return {
    pushed: pushResult.pushed,
    pulled: pulled.pulled,
    skipped: pulled.skipped,
    pages: pulled.pages,
    recoveredSyncing,
  };
}

export function syncOnce(
  firestore: Firestore,
  uid: string,
  options?: {
    pushBatchSize?: number;
    pullPageSize?: number;
    maxPullPages?: number;
    timeoutMs?: number;
  },
): Promise<SyncResult> {
  // Firestore requests can hang indefinitely on a flaky connection while
  // navigator.onLine still reports true. Bound every caller's wait so a
  // hung sync becomes a visible, retryable error instead of an endless
  // "syncing" spinner. The shared in-flight sync keeps running and still
  // clears activeSync when it actually settles.
  const timeoutMs = options?.timeoutMs ?? DEFAULT_SYNC_TIMEOUT_MS;
  if (activeSync) return withTimeout(activeSync, timeoutMs, SYNC_TIMEOUT_MESSAGE);
  activeSync = runSync(firestore, uid, options).finally(() => {
    activeSync = null;
  });
  return withTimeout(activeSync, timeoutMs, SYNC_TIMEOUT_MESSAGE);
}
