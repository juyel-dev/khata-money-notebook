import type {
  Notebook,
  NotebookGroup,
  Person,
  Transaction,
} from "../db/schema";
import { enqueueMutation } from "./syncQueue";
import type { SyncEntityType, SyncEntityPayload } from "./syncTypes";

export async function captureUpsert(
  entity: SyncEntityType,
  payload: SyncEntityPayload,
  changedAt: number,
): Promise<string> {
  return enqueueMutation({
    entity,
    entityId: payload.id,
    operation: "upsert",
    payload,
    changedAt,
  });
}

export async function captureDelete(
  entity: SyncEntityType,
  entityId: string,
  changedAt = Date.now(),
): Promise<string> {
  return enqueueMutation({
    entity,
    entityId,
    operation: "delete",
    changedAt,
  });
}

export async function captureNotebook(notebook: Notebook): Promise<string> {
  return captureUpsert("notebook", notebook, notebook.updatedAt);
}

export async function captureGroup(group: NotebookGroup): Promise<string> {
  return captureUpsert("group", group, group.createdAt);
}

export async function capturePerson(person: Person, changedAt = Date.now()): Promise<string> {
  return captureUpsert("person", person, changedAt);
}

export async function captureTransaction(
  transaction: Transaction,
  changedAt = transaction.createdAt,
): Promise<string> {
  return captureUpsert("transaction", transaction, changedAt);
}
