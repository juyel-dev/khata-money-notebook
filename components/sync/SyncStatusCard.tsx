"use client";

import { AlertCircle, Check, Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/components/shared/Toast";
import { useSync } from "./SyncProvider";

function formatLastSync(timestamp: number | undefined, locale: "en" | "bn"): string {
  if (!timestamp) return locale === "bn" ? "এখনও সিঙ্ক হয়নি" : "Not synced yet";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function SyncStatusCard() {
  const { locale } = useI18n();
  const { status, syncNow } = useSync();
  const isBn = locale === "bn";

  if (status.kind === "signed-out") return null;

  const copy = {
    "needs-link": { title: isBn ? "ক্লাউড লিঙ্ক বাকি" : "Cloud link needs setup", body: isBn ? "ডেটা নিরাপদে মিলিয়ে নেওয়ার পর ক্লাউড সিঙ্ক চালু হবে।" : "Cloud sync starts after your local data is safely reconciled." },
    offline: { title: isBn ? "অফলাইন" : "Offline", body: isBn ? "নতুন হিসাব ডিভাইসেই থাকবে; অনলাইনে এলে সিঙ্ক হবে।" : "New entries stay on this device and sync when you're online." },
    unavailable: { title: isBn ? "ক্লাউড উপলভ্য নয়" : "Cloud unavailable", body: isBn ? "এই মুহূর্তে Firebase কনফিগারেশন পাওয়া যাচ্ছে না।" : "Firebase configuration is not available right now." },
    syncing: { title: isBn ? "সিঙ্ক হচ্ছে…" : "Syncing…", body: isBn ? "আপনার খাতার পরিবর্তনগুলো মিলিয়ে নেওয়া হচ্ছে।" : "Your Khata changes are being synchronized." },
    synced: { title: isBn ? "সিঙ্ক সম্পন্ন" : "Synced", body: isBn ? `সর্বশেষ: ${formatLastSync(status.lastSyncedAt, locale)}` : `Last sync: ${formatLastSync(status.lastSyncedAt, locale)}` },
    error: { title: isBn ? "সিঙ্কে সমস্যা" : "Sync needs attention", body: status.lastError || (isBn ? "কিছু পরিবর্তন সিঙ্ক হয়নি।" : "Some changes could not be synchronized.") },
    "signed-out": { title: "", body: "" },
  } as const;

  const message = copy[status.kind];
  const Icon = status.kind === "syncing" ? Loader2 : status.kind === "synced" ? Check : status.kind === "offline" ? CloudOff : status.kind === "error" ? AlertCircle : Cloud;
  const canRetry = status.kind === "error" || status.kind === "synced";

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
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${status.kind === "error" ? "bg-owe-you-soft text-owe-you" : "bg-accent-soft text-accent"}`}>
          <Icon size={17} className={status.kind === "syncing" ? "animate-spin" : ""} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{message.title}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-ink-dim">{message.body}</div>
          {status.pending > 0 && status.kind !== "needs-link" && (
            <div className="mt-2 text-[11px] font-medium text-ink-dim">
              {isBn ? `${status.pending}টি পরিবর্তন অপেক্ষায়` : `${status.pending} change${status.pending === 1 ? "" : "s"} waiting`}
            </div>
          )}
        </div>
      </div>
      {canRetry && status.kind !== "needs-link" && (
        <button
          type="button"
          onClick={handleSync}
          disabled={status.kind === "syncing"}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-rule px-3 py-2 text-xs font-semibold text-ink-dim transition-colors hover:bg-accent-soft disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={14} />
          {isBn ? "এখনই সিঙ্ক" : "Sync now"}
        </button>
      )}
    </div>
  );
}
