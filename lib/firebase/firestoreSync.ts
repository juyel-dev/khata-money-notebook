import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import {
  groupDocPath,
  notebookDocPath,
  personDocPath,
  transactionDocPath,
  userDocPath,
} from "./firestoreSchema";
import { compareSyncVersions, type SyncEntityPayload, type SyncEntityType, type SyncMutation, type SyncOperation, type SyncVersion } from "./syncTypes";

const JOURNAL_COLLECTION = "_syncMutations";
const TOMBSTONE_COLLECTION = "_syncTombstones";
const PAGE_SIZE = 100;

export interface CloudMutationEnvelope {
  id: string;
  entity: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: SyncEntityPayload;
  version: SyncVersion;
  receivedAt?: Timestamp;
}

export interface SyncCursor {
  receivedAtMillis: number;
  mutationId: string;
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

function validateVersion(version: SyncVersion): void {
  if (!Number.isSafeInteger(version.sequence) || version.sequence < 0) {
    throw new RangeError("mutation version sequence must be a non-negative safe integer");
  }
  if (!Number.isFinite(version.changedAt)) {
    throw new RangeError("mutation version changedAt must be finite");
  }
  if (!version.deviceId.trim()) {
    throw new RangeError("mutation version deviceId is required");
  }
}

function journalPath(uid: string, mutationId: string): string {
  return `${userDocPath(uid)}/${JOURNAL_COLLECTION}/${mutationId}`;
}

function tombstonePath(uid: string, entity: SyncEntityType, entityId: string): string {
  return `${userDocPath(uid)}/${TOMBSTONE_COLLECTION}/${entity}:${entityId}`;
}

export async function pushMutation(
  firestore: Firestore,
  uid: string,
  mutation: SyncMutation,
): Promise<void> {
  validateVersion(mutation.version);

  const journalRef = doc(firestore, journalPath(uid, mutation.id));
  const entityRef = doc(firestore, entityDocPath(uid, mutation.entity, mutation.entityId));
  const batch = writeBatch(firestore);

  batch.set(journalRef, {
    id: mutation.id,
    entity: mutation.entity,
    entityId: mutation.entityId,
    operation: mutation.operation,
    ...(mutation.payload ? { payload: mutation.payload } : {}),
    version: mutation.version,
    receivedAt: serverTimestamp(),
  }, { merge: true });

  const current = await getDoc(entityRef);
  const currentVersion = current.exists() ? (current.data().version as SyncVersion | undefined) : undefined;
  const order = currentVersion ? compareSyncVersions(mutation.version, currentVersion) : 1;

  if (order > 0 || (order === 0 && mutation.operation === "delete")) {
    if (mutation.operation === "delete") {
      batch.delete(entityRef);
      batch.set(doc(firestore, tombstonePath(uid, mutation.entity, mutation.entityId)), {
        entity: mutation.entity,
        entityId: mutation.entityId,
        version: mutation.version,
        deletedAt: mutation.changedAt,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(entityRef, {
        ...(mutation.payload ?? {}),
        version: mutation.version,
        syncUpdatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }

  await batch.commit();
}

export async function readMutationJournal(
  firestore: Firestore,
  uid: string,
  cursor: SyncCursor | null,
  pageSize = PAGE_SIZE,
): Promise<{ mutations: RemoteMutation[]; nextCursor: SyncCursor | null }> {
  const journal = collection(firestore, `${userDocPath(uid)}/${JOURNAL_COLLECTION}`);
  const q = cursor
    ? query(
        journal,
        orderBy("receivedAt"),
        orderBy("id"),
        startAfter(Timestamp.fromMillis(cursor.receivedAtMillis), cursor.mutationId),
        limit(pageSize),
      )
    : query(journal, orderBy("receivedAt"), orderBy("id"), limit(pageSize));

  const snapshot = await getDocs(q);
  const mutations: RemoteMutation[] = [];
  let nextCursor = cursor;

  for (const row of snapshot.docs) {
    const data = row.data() as CloudMutationEnvelope;
    if (!data.receivedAt) continue;
    mutations.push({
      id: data.id,
      entity: data.entity,
      entityId: data.entityId,
      operation: data.operation,
      payload: data.payload,
      version: data.version,
    });
    nextCursor = {
      receivedAtMillis: data.receivedAt.toMillis(),
      mutationId: data.id,
    };
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
      payload: payload as SyncEntityPayload,
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
  return Boolean(
    cursor &&
      nextCursor &&
      cursor.receivedAtMillis === nextCursor.receivedAtMillis &&
      cursor.mutationId === nextCursor.mutationId,
  );
}

export const FIRESTORE_SYNC_INTERNAL_COLLECTIONS = {
  journal: JOURNAL_COLLECTION,
  tombstones: TOMBSTONE_COLLECTION,
} as const;
