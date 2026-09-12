"use client";

import { AlertCircle, Check, Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/components/shared/Toast";
import { useSync } from "./SyncProvider";

function formatLastSync(timestamp: number | undefined, locale: "en" | "bn"): string {
  if (!timestamp) return locale === "bn" ? "এখনও সিঙ্ক হয়নি" : "Not synced yet";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-IN", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

export function SyncStatusCard() {
  const { locale } = useI18n();
  const { status, syncNow } = useSync();
  const isBn = locale === "bn";
  if (!status || status.status === "local-only") return null;

  const copy = {
    "needs-link": { title: isBn ? "ক্লাউড লিঙ্ক বাকি" : "Cloud link needs setup", body: isBn ? "ডেটা নিরাপদে মিলিয়ে নেওয়ার পর ক্লাউড সিঙ্ক চালু হবে।" : "Cloud sync starts after your local data is safely reconciled." },
    "needs-reconciliation": { title: isBn ? "ডেটা মিলিয়ে নেওয়া দরকার" : "Data reconciliation needed", body: isBn ? "ক্লাউড সিঙ্কের আগে আপনার ডিভাইস ও ক্লাউডের ডেটা মিলিয়ে নিতে হবে।" : "Your device and cloud data must be reconciled before syncing." },
    offline: { title: isBn ? "অফলাইন" : "Offline", body: isBn ? "নতুন হিসাব ডিভাইসেই থাকবে; অনলাইনে এলে সিঙ্ক হবে।" : "New entries stay on this device and sync when you're online." },
    syncing: { title: isBn ? "সিঙ্ক হচ্ছে…" : "Syncing…", body: isBn ? "আপনার খাতার পরিবর্তনগুলো মিলিয়ে নেওয়া হচ্ছে।" : "Your Khata changes are being synchronized." },
    synced: { title: isBn ? "সিঙ্ক সম্পন্ন" : "Synced", body: isBn ? `সর্বশেষ: ${formatLastSync(status.lastSyncedAt, locale)}` : `Last sync: ${formatLastSync(status.lastSyncedAt, locale)}` },
    error: { title: isBn ? "সিঙ্কে সমস্যা" : "Sync needs attention", body: status.lastError || (isBn ? "কিছু পরিবর্তন সিঙ্ক হয়নি।" : "Some changes could not be synchronized.") },
  } as const;

  const message = copy[status.status];
  const Icon = status.status === "syncing" ? Loader2 : status.status === "synced" ? Check : status.status === "offline" ? CloudOff : status.status === "error" ? AlertCircle : Cloud;
  const canRetry = status.status === "error" || status.status === "synced";

  async function handleSync() {
    try {
      await syncNow();
    } catch {
      showToast(isBn ? "সিঙ্ক করা যায়নি। পরে আবার চেষ্টা করুন।" : "Couldn't sync. Please try again later.");
    }
  }

  return (
    <div className="rounded-2xl border border-rule bg-paper-card p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${status.status === "error" ? "bg-owe-you-soft text-owe-you" : "bg-accent-soft text-accent"}`}>
          <Icon size={17} className={status.status === "syncing" ? "animate-spin" : ""} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{message.title}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-ink-dim">{message.body}</div>
        </div>
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={handleSync}
          disabled={status.status === "syncing"}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-rule px-3 py-2 text-xs font-semibold text-ink-dim transition-colors hover:bg-accent-soft disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={14} />
          {isBn ? "এখনই সিঙ্ক" : "Sync now"}
        </button>
      )}
    </div>
  );
}
