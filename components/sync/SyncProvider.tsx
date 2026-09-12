"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccountLink } from "@/lib/firebase/accountLink";
import { getFirebaseServices } from "@/lib/firebase/client";
import { syncOnce } from "@/lib/firebase/syncEngine";
import { retryFailedMutations, getPendingMutations } from "@/lib/firebase/syncQueue";
import { syncDb } from "@/lib/firebase/syncDb";
import { deriveSyncStatus, getSyncStatus, setSyncStatus, type SyncStatusSnapshot } from "@/lib/firebase/syncStatus";
import { useAuth } from "@/lib/firebase/AuthProvider";

interface SyncContextValue {
  status: SyncStatusSnapshot | null;
  syncNow: () => Promise<void>;
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
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [linkStatus, setLinkStatus] = useState<"linked" | "reconciliation-required" | "linking" | undefined>();

  useEffect(() => {
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

  const value = useMemo(() => ({ status, syncNow, refresh }), [refresh, status, syncNow]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
}
