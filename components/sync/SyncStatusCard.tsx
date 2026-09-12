"use client";

import { AlertCircle, Check, Cloud, CloudOff, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/components/shared/Toast";
import { useSync } from "./SyncProvider";

function formatLastSync(timestamp: number | undefined, locale: "en" | "bn"): string {
  if (!timestamp) return locale === "bn" ? "এখনও সিঙ্ক হয়নি" : "Not synced yet";
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-IN", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function summaryText(
  summary: { notebooks: number; groups: number; people: number; transactions: number },
  isBn: boolean,
): string {
  if (isBn) {
    return `${summary.notebooks} খাতা · ${summary.people} জন · ${summary.transactions} লেনদেন`;
  }
  return `${summary.notebooks} notebook${summary.notebooks === 1 ? "" : "s"} · ${summary.people} people · ${summary.transactions} transaction${summary.transactions === 1 ? "" : "s"}`;
}

export function SyncStatusCard() {
  const { locale } = useI18n();
  const { status, reconciliation, linking, startAccountLink, confirmReconciliation, syncNow } = useSync();
  const isBn = locale === "bn";
  if (!status || status.status === "local-only") return null;

  const copy = {
    "needs-link": {
      title: isBn ? "ক্লাউড সিঙ্ক সেটআপ করুন" : "Set up cloud sync",
      body: isBn ? "আগে আপনার ডিভাইসের খাতা ও ক্লাউডের অবস্থা দেখে নিরাপদভাবে সংযোগ করা হবে।" : "We'll first check your device and cloud data, then connect them safely.",
    },
    "needs-reconciliation": {
      title: isBn ? "ডেটা মিলিয়ে নেওয়া দরকার" : "Data reconciliation needed",
      body: isBn ? "দুই জায়গার ডেটা চুপচাপ বদলে দেওয়া হবে না। নিচের একটি পথ বেছে নিন।" : "Nothing will be overwritten silently. Choose which copy to keep below.",
    },
    offline: { title: isBn ? "অফলাইন" : "Offline", body: isBn ? "নতুন হিসাব ডিভাইসেই থাকবে; অনলাইনে এলে সিঙ্ক হবে।" : "New entries stay on this device and sync when you're online." },
    syncing: { title: isBn ? "সিঙ্ক হচ্ছে…" : "Syncing…", body: isBn ? "আপনার খাতার পরিবর্তনগুলো মিলিয়ে নেওয়া হচ্ছে।" : "Your Khata changes are being synchronized." },
    synced: { title: isBn ? "সিঙ্ক সম্পন্ন" : "Synced", body: isBn ? `সর্বশেষ: ${formatLastSync(status.lastSyncedAt, locale)}` : `Last sync: ${formatLastSync(status.lastSyncedAt, locale)}` },
    error: { title: isBn ? "সিঙ্কে সমস্যা" : "Sync needs attention", body: status.lastError || (isBn ? "কিছু পরিবর্তন সিঙ্ক হয়নি।" : "Some changes could not be synchronized.") },
  } as const;

  const message = copy[status.status];
  const Icon = status.status === "syncing" ? Loader2 : status.status === "synced" ? Check : status.status === "offline" ? CloudOff : status.status === "error" ? AlertCircle : Cloud;

  async function handleSync() {
    try {
      await syncNow();
    } catch {
      showToast(isBn ? "সিঙ্ক করা যায়নি। পরে আবার চেষ্টা করুন।" : "Couldn't sync. Please try again later.");
    }
  }

  async function handleStart() {
    try {
      await startAccountLink();
    } catch (error) {
      showToast(error instanceof Error ? error.message : isBn ? "ক্লাউড সিঙ্ক সেটআপ করা যায়নি।" : "Couldn't set up cloud sync.");
    }
  }

  async function handleChoice(action: "preserve-local" | "preserve-cloud") {
    try {
      await confirmReconciliation(action);
    } catch {
      showToast(isBn ? "ডেটা মিলিয়ে নেওয়া যায়নি। আবার চেষ্টা করুন।" : "Couldn't finish reconciliation. Please try again.");
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

      {status.status === "needs-link" && (
        <button
          type="button"
          onClick={handleStart}
          disabled={linking}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-paper disabled:cursor-wait disabled:opacity-60"
        >
          {linking ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
          {linking ? (isBn ? "সেটআপ হচ্ছে…" : "Setting up…") : isBn ? "সেটআপ শুরু করুন" : "Set up cloud sync"}
        </button>
      )}

      {status.status === "needs-reconciliation" && reconciliation && (
        <div className="mt-3 rounded-xl border border-rule bg-paper px-3 py-3">
          <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-dim">
            <div>
              <div className="font-semibold text-ink">{isBn ? "এই ডিভাইস" : "This device"}</div>
              <div className="mt-0.5">{summaryText(reconciliation.local.summary, isBn)}</div>
            </div>
            <div>
              <div className="font-semibold text-ink">{isBn ? "ক্লাউড" : "Cloud"}</div>
              <div className="mt-0.5">{summaryText(reconciliation.cloud.summary, isBn)}</div>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 border-t border-rule pt-3 text-[11px] leading-relaxed text-ink-dim">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
            <span>{isBn ? "আপনার অনুমতি ছাড়া কোনো কপি মুছে বা প্রতিস্থাপন করা হবে না।" : "Nothing will be removed or replaced without your confirmation."}</span>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void handleChoice("preserve-local")}
              disabled={linking}
              className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-paper disabled:cursor-wait disabled:opacity-60"
            >
              {isBn ? "এই ডিভাইসের ডেটা রাখুন" : "Keep this device's data"}
            </button>
            <button
              type="button"
              onClick={() => void handleChoice("preserve-cloud")}
              disabled={linking}
              className="rounded-full border border-rule px-3 py-2 text-xs font-semibold text-ink-dim disabled:cursor-wait disabled:opacity-60"
            >
              {isBn ? "ক্লাউডের ডেটা ব্যবহার করুন" : "Use cloud data"}
            </button>
          </div>
        </div>
      )}

      {(status.status === "error" || status.status === "synced") && (
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
