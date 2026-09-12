import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import {
  groupDocPath,
  notebookDocPath,
  personDocPath,
  transactionDocPath,
  userDocPath,
} from "./firestoreSchema";
import { compareSyncVersions, isSyncEntityType, isSyncOperation, type SyncEntityPayload, type SyncEntityType, type SyncMutation, type SyncOperation, type SyncVersion } from "./syncTypes";
import { quarantineJournalRow } from "./syncQuarantine";

const JOURNAL_COLLECTION = "_syncMutations";
const TOMBSTONE_COLLECTION = "_syncTombstones";
const META_COLLECTION = "_syncMeta";
const ORDER_DOC_ID = "mutationOrder";
const PAGE_SIZE = 100;

export interface CloudMutationEnvelope {
  id: string;
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: SyncEntityPayload;
  version: SyncVersion;
  receivedOrder: number;
  receivedAt?: Timestamp;
}

export interface SyncCursor {
  receivedOrder: number;
}

export interface RemoteMutation {
  id: string;
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: SyncEntityPayload;
  version: SyncVersion;
}

function entityDocPath(uid: string, entity: SyncEntityType, entityId: string): string {
  switch (entity) {
    case "notebook": return notebookDocPath(uid, entityId);
    case "group": return groupDocPath(uid, entityId);
    case "person": return personDocPath(uid, entityId);
    case "transaction": return transactionDocPath(uid, entityId);
  }
}

function validateVersion(version: unknown): asserts version is SyncVersion {
  if (!version || typeof version !== "object") {
    throw new Error("invalid mutation version");
  }
  const candidate = version as Record<string, unknown>;
  if (typeof candidate.sequence !== "number" || !Number.isSafeInteger(candidate.sequence) || candidate.sequence < 0) {
    throw new RangeError("mutation version sequence must be a non-negative safe integer");
  }
  if (typeof candidate.changedAt !== "number" || !Number.isFinite(candidate.changedAt)) {
    throw new RangeError("mutation version changedAt must be finite");
  }
  if (typeof candidate.deviceId !== "string" || !candidate.deviceId.trim()) {
    throw new RangeError("mutation version deviceId is required");
  }
}

function journalPath(uid: string, mutationId: string): string {
  return `${userDocPath(uid)}/${JOURNAL_COLLECTION}/${mutationId}`;
}

function tombstonePath(uid: string, entity: SyncEntityType, entityId: string): string {
  return `${userDocPath(uid)}/${TOMBSTONE_COLLECTION}/${entity}:${entityId}`;
}

function orderDocPath(uid: string): string {
  return `${userDocPath(uid)}/${META_COLLECTION}/${ORDER_DOC_ID}`;
}

function parseJournalRow(row: unknown): CloudMutationEnvelope {
  if (!row || typeof row !== "object") {
    throw new Error("corrupt Firestore sync journal row");
  }

  const data = row as Record<string, unknown>;
  if (
    typeof data.id !== "string" ||
    typeof data.entity !== "string" ||
    !isSyncEntityType(data.entity) ||
    typeof data.entityId !== "string" ||
    !data.entityId ||
    typeof data.operation !== "string" ||
    !isSyncOperation(data.operation) ||
    typeof data.receivedOrder !== "number" ||
    !Number.isSafeInteger(data.receivedOrder) ||
    data.receivedOrder < 0
  ) {
    throw new Error("corrupt Firestore sync journal row");
  }

  validateVersion(data.version);

  let payload: SyncEntityPayload | undefined;
  if (data.operation === "upsert") {
    if (!data.payload || typeof data.payload !== "object") {
      throw new Error("corrupt Firestore sync journal payload");
    }
    const candidate = data.payload as { id?: unknown };
    if (candidate.id !== data.entityId) {
      throw new Error("sync journal entity id does not match payload id");
    }
    payload = data.payload as SyncEntityPayload;
  }

  return {
    id: data.id,
    entity: data.entity,
    entityId: data.entityId,
    operation: data.operation,
    ...(payload ? { payload } : {}),
    version: data.version,
    ...(isFirestoreTimestamp(data.receivedAt) ? { receivedAt: data.receivedAt } : {}),
    receivedOrder: data.receivedOrder,
  };
}

function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return typeof (value as { toMillis?: unknown } | null)?.toMillis === "function";
}

function safeReceivedOrder(row: unknown): number | null {
  if (!row || typeof row !== "object") return null;
  const value = (row as Record<string, unknown>).receivedOrder;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export async function pushMutation(
  firestore: Firestore,
  uid: string,
  mutation: SyncMutation,
): Promise<void> {
  validateVersion(mutation.version);

  await runTransaction(firestore, async (transaction) => {
    const journalRef = doc(firestore, journalPath(uid, mutation.id));
    const entityRef = doc(firestore, entityDocPath(uid, mutation.entity, mutation.entityId));
    const tombstoneRef = doc(firestore, tombstonePath(uid, mutation.entity, mutation.entityId));
    const orderRef = doc(firestore, orderDocPath(uid));

    const [journalSnapshot, entitySnapshot, tombstoneSnapshot, orderSnapshot] = await Promise.all([
      transaction.get(journalRef),
      transaction.get(entityRef),
      transaction.get(tombstoneRef),
      transaction.get(orderRef),
    ]);

    if (journalSnapshot.exists()) return;

    const currentVersion = entitySnapshot.exists()
      ? (entitySnapshot.data().version as SyncVersion | undefined)
      : undefined;
    const tombstoneVersion = tombstoneSnapshot.exists()
      ? (tombstoneSnapshot.data().version as SyncVersion | undefined)
      : undefined;
    const currentWinner = [currentVersion, tombstoneVersion]
      .filter((version): version is SyncVersion => Boolean(version))
      .sort(compareSyncVersions)
      .at(-1);
    const order = currentWinner ? compareSyncVersions(mutation.version, currentWinner) : 1;
    const currentOrder = Number(orderSnapshot.data()?.value ?? 0);

    if (!Number.isSafeInteger(currentOrder) || currentOrder < 0 || currentOrder >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError("cloud mutation order overflow");
    }

    const receivedOrder = currentOrder + 1;
    transaction.set(orderRef, { value: receivedOrder }, { merge: true });

    transaction.set(journalRef, {
      id: mutation.id,
      entity: mutation.entity,
      entityId: mutation.entityId,
      operation: mutation.operation,
      ...(mutation.payload ? { payload: mutation.payload } : {}),
      version: mutation.version,
      receivedOrder,
      receivedAt: serverTimestamp(),
    });

    if (order > 0 || (order === 0 && mutation.operation === "delete")) {
      if (mutation.operation === "delete") {
        transaction.delete(entityRef);
        transaction.set(tombstoneRef, {
          entity: mutation.entity,
          entityId: mutation.entityId,
          version: mutation.version,
          deletedAt: mutation.changedAt,
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(entityRef, {
          ...(mutation.payload ?? {}),
          version: mutation.version,
          syncUpdatedAt: serverTimestamp(),
        }, { merge: true });
        if (tombstoneVersion && compareSyncVersions(mutation.version, tombstoneVersion) > 0) {
          transaction.delete(tombstoneRef);
        }
      }
    }
  });
}

export async function readMutationJournal(
  firestore: Firestore,
  uid: string,
  cursor: SyncCursor | null,
  pageSize = PAGE_SIZE,
): Promise<{ mutations: RemoteMutation[]; nextCursor: SyncCursor | null }> {
  const journal = collection(firestore, `${userDocPath(uid)}/${JOURNAL_COLLECTION}`);
  const q = query(
    journal,
    orderBy("receivedOrder"),
    ...(cursor ? [startAfter(cursor.receivedOrder)] : []),
    limit(pageSize),
  );

  const snapshot = await getDocs(q);
  const mutations: RemoteMutation[] = [];
  let nextCursor = cursor;

  for (const row of snapshot.docs) {
    const rawData = row.data();
    try {
      const data = parseJournalRow(rawData);
      mutations.push({
        id: data.id,
        entity: data.entity,
        entityId: data.entityId,
        operation: data.operation,
        payload: data.payload,
        version: data.version,
      });
      nextCursor = { receivedOrder: data.receivedOrder };
    } catch (error) {
      const receivedOrder = safeReceivedOrder(rawData);
      await quarantineJournalRow(
        receivedOrder,
        rawData,
        error instanceof Error ? error.message : String(error),
      );
      if (receivedOrder === null) {
        throw new Error("corrupt Firestore sync journal row has no safe cursor");
      }
      nextCursor = { receivedOrder };
    }
  }

  return { mutations, nextCursor };
}

export async function readCloudEntity(
  firestore: Firestore,
  uid: string,
  entity: SyncEntityType,
  entityId: string,
): Promise<{ payload?: SyncEntityPayload; version?: SyncVersion; deleted: boolean }> {
  const entitySnapshot = await getDoc(doc(firestore, entityDocPath(uid, entity, entityId)));
  if (entitySnapshot.exists()) {
    const data = entitySnapshot.data() as Record<string, unknown> & { version?: SyncVersion };
    const payload = { ...data };
    delete payload.version;
    delete payload.syncUpdatedAt;
    return {
      // Cloud rows carry transport metadata (version, syncUpdatedAt) that is
      // not part of the local entity shape; strip it before handing out.
      payload: payload as unknown as SyncEntityPayload,
      version: data.version,
      deleted: false,
    };
  }

  const tombstoneSnapshot = await getDoc(
    doc(firestore, tombstonePath(uid, entity, entityId)),
  );
  if (tombstoneSnapshot.exists()) {
    return {
      version: tombstoneSnapshot.data().version as SyncVersion,
      deleted: true,
    };
  }

  return { deleted: false };
}

export function isCursorComplete(cursor: SyncCursor | null, nextCursor: SyncCursor | null): boolean {
  return Boolean(cursor && nextCursor && cursor.receivedOrder === nextCursor.receivedOrder);
}

export const FIRESTORE_SYNC_INTERNAL_COLLECTIONS = {
  journal: JOURNAL_COLLECTION,
  tombstones: TOMBSTONE_COLLECTION,
  meta: META_COLLECTION,
} as const;
