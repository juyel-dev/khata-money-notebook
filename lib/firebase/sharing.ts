import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { db, type Notebook, type Person, type Transaction } from "../db/schema";
import { getAccountLink } from "./accountLink";
import { syncOnce } from "./syncEngine";

export type ShareScope = "khata" | "individual";

export interface ShareRecord {
  token: string;
  ownerUid: string;
  scope: ShareScope;
  notebookId: string;
  personId?: string;
  title: string;
  createdAt: number;
  expiresAt: number | null;
  active: boolean;
  schemaVersion: 1;
}

export interface ShareSnapshot {
  record: ShareRecord;
  notebook: Notebook;
  people: Person[];
  transactions: Transaction[];
}

export interface CreateShareInput {
  scope: ShareScope;
  notebookId: string;
  personId?: string;
}

const SHARES_COLLECTION = "shares";
type ShareChildCollection = "notebooks" | "people" | "transactions";
const BATCH_SIZE = 450;

function createShareToken(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("SECURE_SHARE_TOKEN_UNAVAILABLE");
  }
  return crypto.randomUUID().replaceAll("-", "");
}

function shareDoc(firestore: Firestore, token: string) {
  return doc(firestore, SHARES_COLLECTION, token);
}

function shareRefDoc(firestore: Firestore, uid: string, token: string) {
  return doc(firestore, "users", uid, "shareRefs", token);
}

function shareChildCollection(
  firestore: Firestore,
  token: string,
  collectionName: ShareChildCollection,
) {
  return collection(firestore, SHARES_COLLECTION, token, collectionName);
}

async function commitChunked<T extends { id: string }>(
  firestore: Firestore,
  token: string,
  collectionName: ShareChildCollection,
  rows: T[],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const row of rows.slice(offset, offset + BATCH_SIZE)) {
      batch.set(doc(shareChildCollection(firestore, token, collectionName), row.id), row);
    }
    await batch.commit();
  }
}

async function setShareActiveState(
  firestore: Firestore,
  uid: string,
  token: string,
  active: boolean,
): Promise<void> {
  const batch = writeBatch(firestore);
  batch.update(shareDoc(firestore, token), { active });
  batch.update(shareRefDoc(firestore, uid, token), { active });
  await batch.commit();
}

export async function createShareSnapshot(
  firestore: Firestore,
  uid: string,
  input: CreateShareInput,
): Promise<{ token: string; url: string }> {
  const link = await getAccountLink();
  if (!link || link.uid !== uid || link.status !== "linked") {
    throw new Error("ACCOUNT_LINK_REQUIRED");
  }

  await syncOnce(firestore, uid);

  const notebook = await db.notebooks.get(input.notebookId);
  if (!notebook) throw new Error("NOTEBOOK_NOT_FOUND");

  let people: Person[];
  let transactions: Transaction[];
  let personId: string | undefined;
  let title = notebook.name;

  if (input.scope === "individual") {
    if (!input.personId) throw new Error("PERSON_REQUIRED");
    const person = await db.people.get(input.personId);
    if (!person || person.notebookId !== notebook.id) throw new Error("PERSON_NOT_FOUND");
    people = [person];
    transactions = (await db.transactions.where("notebookId").equals(notebook.id).toArray()).filter(
      (transaction) => transaction.personId === person.id,
    );
    personId = person.id;
    title = `${person.name} — ${notebook.name}`;
  } else {
    people = await db.people.where("notebookId").equals(notebook.id).toArray();
    transactions = await db.transactions.where("notebookId").equals(notebook.id).toArray();
  }

  const token = createShareToken();
  const createdAt = Date.now();
  const record: ShareRecord = {
    token,
    ownerUid: uid,
    scope: input.scope,
    notebookId: notebook.id,
    ...(personId ? { personId } : {}),
    title,
    createdAt,
    expiresAt: null,
    active: false,
    schemaVersion: 1,
  };

  // Keep both the public share and the owner's private reference inactive until
  // every snapshot document has been written successfully.
  await setDoc(shareDoc(firestore, token), record);
  await setDoc(shareRefDoc(firestore, uid, token), record);
  await commitChunked(firestore, token, "notebooks", [notebook]);
  await commitChunked(firestore, token, "people", people);
  await commitChunked(firestore, token, "transactions", transactions);
  await setShareActiveState(firestore, uid, token, true);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return { token, url: `${origin}/share/${token}` };
}

export async function revokeShare(firestore: Firestore, uid: string, token: string): Promise<void> {
  const link = await getAccountLink();
  if (!link || link.uid !== uid || link.status !== "linked") {
    throw new Error("ACCOUNT_LINK_REQUIRED");
  }

  await setShareActiveState(firestore, uid, token, false);
}

export async function listActiveShares(
  firestore: Firestore,
  uid: string,
  notebookId: string,
): Promise<ShareRecord[]> {
  const link = await getAccountLink();
  if (!link || link.uid !== uid || link.status !== "linked") return [];

  const snapshot = await getDocs(collection(firestore, "users", uid, "shareRefs"));
  return snapshot.docs
    .map((shareSnapshot) => shareSnapshot.data() as ShareRecord)
    .filter(
      (share) =>
        share.active &&
        share.notebookId === notebookId &&
        (share.expiresAt === null || share.expiresAt > Date.now()),
    );
}

export async function readPublicShare(firestore: Firestore, token: string): Promise<ShareSnapshot | null> {
  const snapshot = await getDoc(shareDoc(firestore, token));
  if (!snapshot.exists()) return null;

  const record = snapshot.data() as ShareRecord;
  if (record.schemaVersion !== 1 || !record.active) return null;
  if (record.expiresAt !== null && record.expiresAt <= Date.now()) return null;

  const [notebookSnapshot, peopleSnapshot, transactionsSnapshot] = await Promise.all([
    getDocs(shareChildCollection(firestore, token, "notebooks")),
    getDocs(shareChildCollection(firestore, token, "people")),
    getDocs(shareChildCollection(firestore, token, "transactions")),
  ]);

  const notebook = notebookSnapshot.docs[0]?.data() as Notebook | undefined;
  if (!notebook || notebook.id !== record.notebookId) return null;

  const people = peopleSnapshot.docs.map((docSnapshot) => docSnapshot.data() as Person);
  const transactions = transactionsSnapshot.docs.map((docSnapshot) => docSnapshot.data() as Transaction);

  if (record.scope === "individual") {
    if (!record.personId || people.length !== 1 || people[0]?.id !== record.personId) return null;
    if (transactions.some((transaction) => transaction.personId !== record.personId)) return null;
  } else {
    if (people.some((person) => person.notebookId !== record.notebookId)) return null;
    if (transactions.some((transaction) => transaction.notebookId !== record.notebookId)) return null;
  }

  return { record, notebook, people, transactions };
}
