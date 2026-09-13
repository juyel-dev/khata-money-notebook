export interface SerializedFirestoreRecord {
  clean: Record<string, unknown>;
  clearedFields: string[];
}

/**
 * Firestore rejects `undefined` values. Local-first entities intentionally use
 * optional fields, so serialization must be explicit at the transport boundary.
 * Keep this shallow because every current syncable entity is a flat record.
 */
export function serializeFirestoreRecord(value: Record<string, unknown>): SerializedFirestoreRecord {
  const clean: Record<string, unknown> = {};
  const clearedFields: string[] = [];

  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue === undefined) clearedFields.push(key);
    else clean[key] = fieldValue;
  }

  return { clean, clearedFields };
}
