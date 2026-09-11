import type {
  Notebook,
  NotebookGroup,
  Person,
  Transaction,
} from "../db/schema";

/**
 * Firestore document shape for a user's durable cloud replica.
 *
 * IDs are preserved from Dexie so the future sync layer can upsert by stable
 * entity identity without maintaining a second ID mapping table.
 */
export type CloudNotebook = Notebook;
export type CloudNotebookGroup = NotebookGroup;
export type CloudPerson = Person;
export type CloudTransaction = Transaction;

export interface CloudUserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * All application data is namespaced below the authenticated user's UID.
 * Sharing/snapshot paths are intentionally absent here; they arrive with the
 * sharing phase after the sync foundation is stable.
 */
export const FIRESTORE_COLLECTIONS = {
  users: "users",
  notebooks: "notebooks",
  groups: "groups",
  people: "people",
  transactions: "transactions",
} as const;

export function userDocPath(uid: string): string {
  return `${FIRESTORE_COLLECTIONS.users}/${uid}`;
}

export function userCollectionPath(
  uid: string,
  collection: keyof Omit<typeof FIRESTORE_COLLECTIONS, "users">,
): string {
  return `${userDocPath(uid)}/${FIRESTORE_COLLECTIONS[collection]}`;
}

export function notebookDocPath(uid: string, notebookId: string): string {
  return `${userCollectionPath(uid, "notebooks")}/${notebookId}`;
}

export function groupDocPath(uid: string, groupId: string): string {
  return `${userCollectionPath(uid, "groups")}/${groupId}`;
}

export function personDocPath(uid: string, personId: string): string {
  return `${userCollectionPath(uid, "people")}/${personId}`;
}

export function transactionDocPath(uid: string, transactionId: string): string {
  return `${userCollectionPath(uid, "transactions")}/${transactionId}`;
}
