import { compareSyncVersions, type SyncMutation, type SyncOperation, type SyncVersion } from "./syncTypes";

export interface SyncCandidate {
  operation: SyncOperation;
  version: SyncVersion;
  mutationId: string;
}

export type SyncResolution = "incoming" | "current";

/**
 * Last-write-wins with a deterministic tie-breaker. A delete wins an exact
 * version tie so a removed record cannot be resurrected by a duplicate upsert.
 */
export function resolveConflict(
  current: SyncCandidate | null,
  incoming: SyncCandidate,
): SyncResolution {
  if (!current) return "incoming";

  const versionOrder = compareSyncVersions(incoming.version, current.version);
  if (versionOrder > 0) return "incoming";
  if (versionOrder < 0) return "current";

  if (incoming.operation !== current.operation) {
    return incoming.operation === "delete" ? "incoming" : "current";
  }

  return incoming.mutationId.localeCompare(current.mutationId) > 0 ? "incoming" : "current";
}

export function candidateFromMutation(mutation: SyncMutation): SyncCandidate {
  return {
    operation: mutation.operation,
    version: mutation.version,
    mutationId: mutation.id,
  };
}
