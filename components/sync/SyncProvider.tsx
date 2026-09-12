"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccountLink } from "@/lib/firebase/accountLink";
import { getFirebaseServices } from "@/lib/firebase/client";
import { syncOnce } from "@/lib/firebase/syncEngine";
import { retryFailedMutations } from "@/lib/firebase/syncQueue";
import { syncDb } from "@/lib/firebase/syncDb";
import { deriveSyncStatus, lastSyncMetaKey, type SyncStatusSnapshot } from "@/lib/firebase/syncStatus";
import { useAuth } from "@/lib/firebase/AuthProvider";

interface SyncContextValue {
  status: SyncStatusSnapshot;
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
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>();
  const [queue, setQueue] = useState({ pending: 0, syncing: 0, failed: 0, lastError: undefined as string | undefined });
  const [linkStatus, setLinkStatus] = useState<"linked" | "other" | "none">("none");

  useEffect(() => {
    setOnline(navigator.onLine);
    setFirebaseAvailable(getFirebaseServices() !== null);
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
      setQueue({ pending: 0, syncing: 0, failed: 0, lastError: undefined });
      setLastSyncedAt(undefined);
      setLinkStatus("none");
      return;
    }

    const [link, nextQueue, meta] = await Promise.all([
      getAccountLink(),
      readQueueState(),
      syncDb.syncMeta.get(lastSyncMetaKey(user.uid)),
    ]);

    setLinkStatus(link?.uid === user.uid && link.status === "linked" ? "linked" : link ? "other" : "none");
    setQueue(nextQueue);
    const parsedLastSync = Number(meta?.value ?? 0);
    setLastSyncedAt(Number.isFinite(parsedLastSync) && parsedLastSync > 0 ? parsedLastSync : undefined);
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    const link = await getAccountLink();
    if (!link || link.uid !== user.uid || link.status !== "linked") return;

    const services = getFirebaseServices();
    if (!services) return;
    setFirebaseAvailable(true);
    setSyncing(true);

    try {
      const failed = await syncDb.syncMutations.where("status").equals("failed").count();
      if (failed > 0) await retryFailedMutations();
      await syncOnce(services.firestore, user.uid);
      const now = Date.now();
      await syncDb.syncMeta.put({ key: lastSyncMetaKey(user.uid), value: String(now) });
      setLastSyncedAt(now);
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

  const status = useMemo(
    () => deriveSyncStatus({
      signedIn: !!user,
      linked: linkStatus === "linked",
      online,
      firebaseAvailable,
      syncing,
      queue,
      lastSyncedAt,
      lastError: queue.lastError,
    }),
    [firebaseAvailable, lastSyncedAt, linkStatus, online, queue, syncing, user],
  );

  const value = useMemo(() => ({ status, syncNow, refresh }), [refresh, status, syncNow]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
}
