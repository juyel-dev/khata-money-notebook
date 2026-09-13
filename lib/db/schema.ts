import Dexie, { type EntityTable } from "dexie";

export type NotebookColor =
  | "green" | "terracotta" | "mustard" | "blue" | "plum" | "teal" | "rose" | "slate";

export type NotebookIcon =
  | "shop" | "home" | "wallet" | "users" | "cart" | "briefcase" | "piggy-bank" | "book";

export interface Notebook {
  id: string;
  name: string;
  openingBalance: number; // paise
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  color: NotebookColor;
  icon: NotebookIcon;
  pinned?: boolean; // v2
  groupId?: string | null; // v2 — null/absent means ungrouped
}

export interface NotebookGroup {
  id: string;
  name: string;
  createdAt: number;
}

export interface Person {
  id: string;
  notebookId: string;
  name: string;
  phone?: string;
  createdAt: number;
}

export type TransactionType = "gave" | "got";

export interface Transaction {
  id: string;
  notebookId: string;
  personId: string;
  type: TransactionType;
  amount: number; // paise
  note?: string;
  occurredAt: number;
  createdAt: number;
}

export interface Settings {
  key: string;
  value: string;
}

export type LocalSyncEntityType = "notebook" | "group" | "person" | "transaction";
export type LocalSyncOperation = "upsert" | "delete";

export interface SyncCaptureIntent {
  id: string;
  entity: LocalSyncEntityType;
  entityId: string;
  operation: LocalSyncOperation;
  payload?: Notebook | NotebookGroup | Person | Transaction;
  changedAt: number;
  createdAt: number;
}

export class KhataDB extends Dexie {
  notebooks!: EntityTable<Notebook, "id">;
  people!: EntityTable<Person, "id">;
  transactions!: EntityTable<Transaction, "id">;
  settings!: EntityTable<Settings, "key">;
  groups!: EntityTable<NotebookGroup, "id">;
  syncCaptureIntents!: EntityTable<SyncCaptureIntent, "id">;

  constructor() {
    super("khata-db");
    this.version(1).stores({
      notebooks: "id, archived, createdAt, updatedAt",
      people: "id, notebookId, name",
      transactions: "id, notebookId, personId, occurredAt, type",
      settings: "key",
    });
    // v2: pin + group support. Existing notebooks simply have no `pinned`/`groupId`
    // value yet (treated as unpinned/ungrouped) — no data migration needed since
    // both are optional fields.
    this.version(2).stores({
      notebooks: "id, archived, createdAt, updatedAt, pinned, groupId",
      people: "id, notebookId, name",
      transactions: "id, notebookId, personId, occurredAt, type",
      settings: "key",
      groups: "id, name, createdAt",
    });
    // v3: local sync-capture intents make a source-of-truth write and its
    // corresponding sync intent atomic inside the same Dexie database. The
    // intent is drained into the separate sync queue after the local commit.
    this.version(3).stores({
      notebooks: "id, archived, createdAt, updatedAt, pinned, groupId",
      people: "id, notebookId, name",
      transactions: "id, notebookId, personId, occurredAt, type",
      settings: "key",
      groups: "id, name, createdAt",
      syncCaptureIntents: "id, entity, entityId, operation, changedAt, createdAt",
    });
  }
}

export const db = new KhataDB();
