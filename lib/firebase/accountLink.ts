import type { SyncMeta } from "./syncTypes";
import { syncDb } from "./syncDb";

const ACCOUNT_LINK_KEY = "accountLink";

export type AccountLinkStatus =
  | "linking"
  | "reconciliation-required"
  | "linked";

export interface AccountLink {
  key: typeof ACCOUNT_LINK_KEY;
  uid: string;
  provider: "google";
  status: AccountLinkStatus;
  linkedAt: number;
}

export class AccountLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountLinkError";
  }
}

export async function getAccountLink(): Promise<AccountLink | null> {
  const meta: SyncMeta | undefined = await syncDb.syncMeta.get(ACCOUNT_LINK_KEY);
  if (!meta) return null;

  try {
    const parsed = JSON.parse(meta.value) as Partial<AccountLink>;
    if (
      parsed.key !== ACCOUNT_LINK_KEY ||
      typeof parsed.uid !== "string" ||
      parsed.provider !== "google" ||
      !["linking", "reconciliation-required", "linked"].includes(parsed.status ?? "") ||
      typeof parsed.linkedAt !== "number"
    ) {
      return null;
    }
    return parsed as AccountLink;
  } catch {
    return null;
  }
}

export async function beginAccountLink(uid: string, linkedAt = Date.now()): Promise<AccountLink> {
  if (!uid.trim()) throw new AccountLinkError("A Firebase user id is required.");

  const existing = await getAccountLink();
  if (existing && existing.uid !== uid) {
    throw new AccountLinkError("ACCOUNT_SWITCH_REQUIRES_RECONCILIATION");
  }

  const link: AccountLink = {
    key: ACCOUNT_LINK_KEY,
    uid,
    provider: "google",
    status: "linking",
    linkedAt: existing?.linkedAt ?? linkedAt,
  };
  await syncDb.syncMeta.put({ key: ACCOUNT_LINK_KEY, value: JSON.stringify(link) });
  return link;
}

export async function markReconciliationRequired(uid: string): Promise<AccountLink> {
  const existing = await getAccountLink();
  if (!existing || existing.uid !== uid) {
    throw new AccountLinkError("ACCOUNT_LINK_TARGET_MISMATCH");
  }

  const updated: AccountLink = {
    ...existing,
    status: "reconciliation-required",
  };
  await syncDb.syncMeta.put({ key: ACCOUNT_LINK_KEY, value: JSON.stringify(updated) });
  return updated;
}

export async function completeAccountLink(uid: string): Promise<AccountLink> {
  const existing = await getAccountLink();
  if (!existing || existing.uid !== uid) {
    throw new AccountLinkError("ACCOUNT_LINK_TARGET_MISMATCH");
  }
  if (existing.status !== "linking" && existing.status !== "reconciliation-required") {
    return existing;
  }

  const linked: AccountLink = {
    ...existing,
    status: "linked",
  };
  await syncDb.syncMeta.put({ key: ACCOUNT_LINK_KEY, value: JSON.stringify(linked) });
  return linked;
}

export async function assertAccountLinkTarget(uid: string): Promise<AccountLink | null> {
  const existing = await getAccountLink();
  if (existing && existing.uid !== uid) {
    throw new AccountLinkError("ACCOUNT_SWITCH_REQUIRES_RECONCILIATION");
  }
  return existing;
}
