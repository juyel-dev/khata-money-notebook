"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { beginAccountLink, getAccountLink, markReconciliationRequired } from "@/lib/firebase/accountLink";
import { getFirebaseServices } from "@/lib/firebase/client";
import { syncOnce } from "@/lib/firebase/syncEngine";
import { inspectFirstAccountLink, confirmAccountReconciliation, type AccountReconciliationInspection } from "@/lib/firebase/reconciliationFlow";
import { retryFailedMutations } from "@/lib/firebase/syncQueue";
import { syncDb } from "@/lib/firebase/syncDb";
import { deriveSyncStatus, getSyncStatus, setSyncStatus, type SyncStatusSnapshot } from "@/lib/firebase/syncStatus";
import { useAuth } from "@/lib/firebase/AuthProvider";

interface SyncContextValue {
  status: SyncStatusSnapshot | null;
  reconciliation: AccountReconciliationInspection | null;
  linking: boolean;
  syncNow: () => Promise<void>;
  startAccountLink: () => Promise<void>;
  confirmReconciliation: (action: "preserve-local" | "preserve-cloud") => Promise<void>;
  refresh: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

async function readQueueState() {
  const [pending, syncing, failed] = await Promise.all([
    syncDb.syncMutations.where("status").equals("pending").count(),
    syncDb.syncMutations.where("status").equals("syncing").count(),
    syncDb.syncMutations.where("status").equals("failed").count(),
  ]);
  const failedRows = failed > 0
    ? await syncDb.syncMutations.where("status").equals("failed").toArray()
    : [];
  const latestFailed = failedRows.sort((a, b) => b.attempts - a.attempts)[0];
  return { pending, syncing, failed, lastError: latestFailed?.lastError };
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [reconciliation, setReconciliation] = useState<AccountReconciliationInspection | null>(null);
  const [linkStatus, setLinkStatus] = useState<"linked" | "reconciliation-required" | "linking" | undefined>();

  useEffect(() => {
    // navigator.onLine is an external browser read during effect setup; keep the
    // state sync localized to the subscription boundary rather than restructuring it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setLinkStatus(undefined);
      setStatus(null);
      setReconciliation(null);
      return;
    }

    const [link, queue, persisted] = await Promise.all([
      getAccountLink(),
      readQueueState(),
      getSyncStatus(),
    ]);

    const nextLinkStatus = link?.uid === user.uid ? link.status : undefined;
    setLinkStatus(nextLinkStatus);

    const nextStatus = syncing
      ? "syncing"
      : deriveSyncStatus({
          signedIn: true,
          online,
          linkStatus: nextLinkStatus,
          pendingCount: queue.pending + queue.syncing,
          failedCount: queue.failed,
        });

    const snapshot: SyncStatusSnapshot = {
      key: "syncStatus",
      status: nextStatus,
      updatedAt: persisted?.updatedAt ?? Date.now(),
      ...(persisted?.lastSyncedAt !== undefined ? { lastSyncedAt: persisted.lastSyncedAt } : {}),
      ...(queue.lastError ? { lastError: queue.lastError } : persisted?.lastError ? { lastError: persisted.lastError } : {}),
    };
    setStatus(snapshot);
  }, [online, syncing, user]);

  const startAccountLink = useCallback(async () => {
    if (!user || !navigator.onLine || linking) return;
    const services = getFirebaseServices();
    if (!services) return;

    setLinking(true);
    setReconciliation(null);
    try {
      const existing = await getAccountLink();
      if (existing && existing.uid !== user.uid) throw new Error("ACCOUNT_SWITCH_REQUIRES_RECONCILIATION");
      if (!existing) await beginAccountLink(user.uid);

      const inspection = await inspectFirstAccountLink(services.firestore, user.uid);
      if (inspection.plan.action === "link-only") {
        const { completeAccountLink } = await import("@/lib/firebase/accountLink");
        await completeAccountLink(user.uid);
        await syncOnce(services.firestore, user.uid);
        await setSyncStatus("synced", { lastSyncedAt: Date.now(), lastError: undefined });
        await refresh();
        return;
      }

      await markReconciliationRequired(user.uid);
      setReconciliation(inspection);
      await refresh();
    } finally {
      setLinking(false);
    }
  }, [linking, refresh, user]);

  const confirmReconciliation = useCallback(async (action: "preserve-local" | "preserve-cloud") => {
    if (!user || !navigator.onLine || linking) return;
    const services = getFirebaseServices();
    if (!services) return;

    setLinking(true);
    try {
      await confirmAccountReconciliation(services.firestore, user.uid, action);
      setReconciliation(null);
      await setSyncStatus("synced", { lastSyncedAt: Date.now(), lastError: undefined });
      await refresh();
    } finally {
      setLinking(false);
    }
  }, [linking, refresh, user]);

  const syncNow = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    const link = await getAccountLink();
    if (!link || link.uid !== user.uid || link.status !== "linked") return;

    const services = getFirebaseServices();
    if (!services) return;

    setSyncing(true);
    setStatus((current) => ({
      key: "syncStatus",
      status: "syncing",
      updatedAt: Date.now(),
      ...(current?.lastSyncedAt !== undefined ? { lastSyncedAt: current.lastSyncedAt } : {}),
    }));

    try {
      const failed = await syncDb.syncMutations.where("status").equals("failed").count();
      if (failed > 0) await retryFailedMutations();
      await syncOnce(services.firestore, user.uid);
      const saved = await setSyncStatus("synced", { lastSyncedAt: Date.now(), lastError: undefined });
      setStatus(saved);
    } catch (error) {
      const saved = await setSyncStatus(
        "error",
        { lastError: error instanceof Error ? error.message : String(error) },
      );
      setStatus(saved);
      throw error;
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh, user]);

  useEffect(() => {
    if (authLoading) return;
    // Auth has settled; refresh the local sync metadata snapshot once per effect run.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (authLoading || !user || linkStatus !== "linked") return;

    const syncIfOnline = () => {
      if (navigator.onLine) void syncNow().catch(() => undefined);
      else void refresh();
    };

    syncIfOnline();
    const interval = window.setInterval(syncIfOnline, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") syncIfOnline();
    };

    window.addEventListener("online", syncIfOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", syncIfOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authLoading, linkStatus, refresh, syncNow, user]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(interval);
  }, [refresh, user]);

  const value = useMemo(
    () => ({ status, reconciliation, linking, syncNow, startAccountLink, confirmReconciliation, refresh }),
    [confirmReconciliation, linking, reconciliation, refresh, startAccountLink, status, syncNow],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
}
