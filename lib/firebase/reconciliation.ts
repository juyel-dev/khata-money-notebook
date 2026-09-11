export interface ReconciliationDatasetSummary {
  notebooks: number;
  groups: number;
  people: number;
  transactions: number;
}

export type ReconciliationAction =
  | "link-only"
  | "preserve-local"
  | "preserve-cloud"
  | "merge-required";

export interface ReconciliationPlan {
  action: ReconciliationAction;
  requiresConfirmation: boolean;
  reason:
    | "both-empty"
    | "local-only"
    | "cloud-only"
    | "both-have-data";
}

export function hasAnyData(summary: ReconciliationDatasetSummary): boolean {
  return summary.notebooks + summary.groups + summary.people + summary.transactions > 0;
}

/**
 * First-account linking must never silently overwrite either side.
 * This planner only describes the safe next step; it does not move data.
 */
export function planFirstAccountReconciliation(
  local: ReconciliationDatasetSummary,
  cloud: ReconciliationDatasetSummary,
): ReconciliationPlan {
  const hasLocal = hasAnyData(local);
  const hasCloud = hasAnyData(cloud);

  if (!hasLocal && !hasCloud) {
    return {
      action: "link-only",
      requiresConfirmation: false,
      reason: "both-empty",
    };
  }

  if (hasLocal && !hasCloud) {
    return {
      action: "preserve-local",
      requiresConfirmation: true,
      reason: "local-only",
    };
  }

  if (!hasLocal && hasCloud) {
    return {
      action: "preserve-cloud",
      requiresConfirmation: true,
      reason: "cloud-only",
    };
  }

  return {
    action: "merge-required",
    requiresConfirmation: true,
    reason: "both-have-data",
  };
}
