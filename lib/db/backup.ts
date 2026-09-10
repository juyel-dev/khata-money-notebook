import {
  db,
  type Notebook,
  type NotebookGroup,
  type Person,
  type Transaction,
} from "./schema";
import { NOTEBOOK_COLORS, NOTEBOOK_ICONS } from "../shared/notebookStyle";

// A backup is a versioned envelope — never bare table arrays — so a future
// app version can detect, migrate, or refuse an old file instead of
// silently misreading it. BACKUP_VERSION tracks the Dexie schema version
// whose rows this envelope carries.
export const BACKUP_FORMAT = "khata-backup" as const;
export const BACKUP_VERSION = 2;
const SUPPORTED_BACKUP_VERSIONS: readonly number[] = [BACKUP_VERSION];

export interface KhataBackupData {
  notebooks: Notebook[];
  groups: NotebookGroup[];
  people: Person[];
  transactions: Transaction[];
}

export interface KhataBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  data: KhataBackupData;
}

export type BackupErrorCode =
  | "invalid-json"
  | "invalid-format"
  | "unsupported-version"
  | "invalid-data";

export class BackupError extends Error {
  readonly code: BackupErrorCode;

  constructor(code: BackupErrorCode, message: string) {
    super(message);
    this.name = "BackupError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Small type guards (detail messages stay internal — the UI maps only codes
// to user-facing strings, never raw errors).
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Money is integer paise everywhere (see lib/money.ts) — fractional or
// negative amounts in a file mean corruption, not a rounding choice.
function isPaise(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function fail(message: string): never {
  throw new BackupError("invalid-data", message);
}

function checkId(value: unknown, what: string): asserts value is string {
  if (!isNonEmptyString(value)) fail(`${what} has a bad id`);
}

function checkTimestamp(value: unknown, what: string): asserts value is number {
  if (!isFiniteNumber(value)) fail(`${what} has a bad timestamp`);
}

// ---------------------------------------------------------------------------
// Per-entity structural checks.
// ---------------------------------------------------------------------------

function checkNotebook(value: unknown, index: number): void {
  const what = `notebooks[${index}]`;
  if (!isRecord(value)) fail(`${what} is not an object`);
  checkId(value.id, what);
  if (!isNonEmptyString(value.name)) fail(`${what} has a bad name`);
  if (!isPaise(value.openingBalance)) fail(`${what} has a bad openingBalance`);
  checkTimestamp(value.createdAt, what);
  checkTimestamp(value.updatedAt, what);
  if (typeof value.archived !== "boolean") fail(`${what} has a bad archived flag`);
  if (!NOTEBOOK_COLORS.some((c) => c.value === value.color)) {
    fail(`${what} has an unknown color`);
  }
  if (!NOTEBOOK_ICONS.includes(value.icon as Notebook["icon"])) {
    fail(`${what} has an unknown icon`);
  }
  if (value.pinned !== undefined && typeof value.pinned !== "boolean") {
    fail(`${what} has a bad pinned flag`);
  }
  if (value.groupId !== undefined && value.groupId !== null && !isNonEmptyString(value.groupId)) {
    fail(`${what} has a bad groupId`);
  }
}

function checkGroup(value: unknown, index: number): void {
  const what = `groups[${index}]`;
  if (!isRecord(value)) fail(`${what} is not an object`);
  checkId(value.id, what);
  if (!isNonEmptyString(value.name)) fail(`${what} has a bad name`);
  checkTimestamp(value.createdAt, what);
}

function checkPerson(value: unknown, index: number): void {
  const what = `people[${index}]`;
  if (!isRecord(value)) fail(`${what} is not an object`);
  checkId(value.id, what);
  checkId(value.notebookId, `${what}.notebook`);
  if (!isNonEmptyString(value.name)) fail(`${what} has a bad name`);
  if (!isOptionalString(value.phone)) fail(`${what} has a bad phone`);
  checkTimestamp(value.createdAt, what);
}

function checkTransaction(value: unknown, index: number): void {
  const what = `transactions[${index}]`;
  if (!isRecord(value)) fail(`${what} is not an object`);
  checkId(value.id, what);
  checkId(value.notebookId, `${what}.notebook`);
  checkId(value.personId, `${what}.person`);
  if (value.type !== "gave" && value.type !== "got") fail(`${what} has a bad type`);
  if (!isPaise(value.amount)) fail(`${what} has a bad amount`);
  if (!isOptionalString(value.note)) fail(`${what} has a bad note`);
  checkTimestamp(value.occurredAt, what);
  checkTimestamp(value.createdAt, what);
}

function checkUniqueIds(items: { id: string }[], what: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) fail(`${what} has a duplicate id: ${item.id}`);
    seen.add(item.id);
  }
}

// ---------------------------------------------------------------------------
// Full backup validation — pure, no DB access. Throws BackupError.
// Nothing may mutate the database until this passes.
// ---------------------------------------------------------------------------

export function validateBackup(input: unknown): KhataBackup {
  if (!isRecord(input)) {
    throw new BackupError("invalid-format", "backup is not an object");
  }
  if (input.format !== BACKUP_FORMAT) {
    throw new BackupError("invalid-format", "backup has a bad format marker");
  }
  if (typeof input.version !== "number" || !SUPPORTED_BACKUP_VERSIONS.includes(input.version)) {
    throw new BackupError(
      "unsupported-version",
      `backup version ${String(input.version)} is not supported`
    );
  }
  if (!isFiniteNumber(input.exportedAt)) {
    throw new BackupError("invalid-data", "backup has a bad exportedAt");
  }
  if (!isRecord(input.data)) {
    throw new BackupError("invalid-data", "backup has no data object");
  }
  const { notebooks, groups, people, transactions } = input.data;
  if (!Array.isArray(notebooks) || !Array.isArray(groups) || !Array.isArray(people) || !Array.isArray(transactions)) {
    throw new BackupError("invalid-data", "backup data collections are incomplete");
  }

  notebooks.forEach(checkNotebook);
  groups.forEach(checkGroup);
  people.forEach(checkPerson);
  transactions.forEach(checkTransaction);

  const nb = notebooks as Notebook[];
  const gr = groups as NotebookGroup[];
  const pl = people as Person[];
  const tx = transactions as Transaction[];

  checkUniqueIds(nb, "notebooks");
  checkUniqueIds(gr, "groups");
  checkUniqueIds(pl, "people");
  checkUniqueIds(tx, "transactions");

  const notebookIds = new Set(nb.map((n) => n.id));
  const groupIds = new Set(gr.map((g) => g.id));
  const personById = new Map(pl.map((p) => [p.id, p]));

  for (const n of nb) {
    if (n.groupId != null && !groupIds.has(n.groupId)) {
      throw new BackupError("invalid-data", `notebook ${n.id} references a missing group`);
    }
  }
  for (const p of pl) {
    if (!notebookIds.has(p.notebookId)) {
      throw new BackupError("invalid-data", `person ${p.id} references a missing notebook`);
    }
  }
  for (const t of tx) {
    if (!notebookIds.has(t.notebookId)) {
      throw new BackupError("invalid-data", `transaction ${t.id} references a missing notebook`);
    }
    const person = personById.get(t.personId);
    if (!person) {
      throw new BackupError("invalid-data", `transaction ${t.id} references a missing person`);
    }
    // A transaction must live in the same notebook as its person —
    // otherwise balances would silently attach to the wrong khata.
    if (person.notebookId !== t.notebookId) {
      throw new BackupError(
        "invalid-data",
        `transaction ${t.id} and person ${t.personId} disagree on notebook`
      );
    }
  }

  return {
    format: BACKUP_FORMAT,
    version: input.version,
    exportedAt: input.exportedAt,
    data: { notebooks: nb, groups: gr, people: pl, transactions: tx },
  };
}

export function parseBackupFile(text: string): KhataBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError("invalid-json", "file is not valid JSON");
  }
  return validateBackup(parsed);
}

// ---------------------------------------------------------------------------
// Export / snapshot / restore (these touch IndexedDB).
// ---------------------------------------------------------------------------

export async function exportBackup(): Promise<KhataBackup> {
  const [notebooks, groups, people, transactions] = await Promise.all([
    db.notebooks.toArray(),
    db.groups.toArray(),
    db.people.toArray(),
    db.transactions.toArray(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data: { notebooks, groups, people, transactions },
  };
}

export interface DbSnapshot {
  notebooks: Notebook[];
  groups: NotebookGroup[];
  people: Person[];
  transactions: Transaction[];
}

export async function snapshotDb(): Promise<DbSnapshot> {
  const [notebooks, groups, people, transactions] = await Promise.all([
    db.notebooks.toArray(),
    db.groups.toArray(),
    db.people.toArray(),
    db.transactions.toArray(),
  ]);
  return { notebooks, groups, people, transactions };
}

// RESTORE/REPLACE — never merge. The previous rows are snapshotted first
// (returned for the caller), then everything is swapped inside ONE Dexie
// readwrite transaction: if any step throws, Dexie rolls the whole thing
// back and the current on-device data stays exactly as it was.
export async function restoreBackup(backup: KhataBackup): Promise<DbSnapshot> {
  const previous = await snapshotDb();
  await db.transaction("rw", db.transactions, db.people, db.notebooks, db.groups, async () => {
    await db.transactions.clear();
    await db.people.clear();
    await db.notebooks.clear();
    await db.groups.clear();
    await db.groups.bulkAdd(backup.data.groups);
    await db.notebooks.bulkAdd(backup.data.notebooks);
    await db.people.bulkAdd(backup.data.people);
    await db.transactions.bulkAdd(backup.data.transactions);
  });
  return previous;
}
