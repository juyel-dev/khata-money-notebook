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

export class KhataDB extends Dexie {
  notebooks!: EntityTable<Notebook, "id">;
  people!: EntityTable<Person, "id">;
  transactions!: EntityTable<Transaction, "id">;
  settings!: EntityTable<Settings, "key">;

  constructor() {
    super("khata-db");
    this.version(1).stores({
      notebooks: "id, archived, createdAt, updatedAt",
      people: "id, notebookId, name",
      transactions: "id, notebookId, personId, occurredAt, type",
      settings: "key",
    });
  }
}

export const db = new KhataDB();
