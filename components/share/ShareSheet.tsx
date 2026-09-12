"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Share2, X } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { createShareSnapshot, listActiveShares, revokeShare, type ShareRecord, type ShareScope } from "@/lib/firebase/sharing";
import { showToast } from "@/components/shared/Toast";
import { useI18n } from "@/lib/i18n";
import type { Person } from "@/lib/db/schema";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  notebookId: string;
  notebookName: string;
  people: Person[];
}

export function ShareSheet({ open, onClose, notebookId, notebookName, people }: ShareSheetProps) {
  const { locale } = useI18n();
  const isBn = locale === "bn";
  const [scope, setScope] = useState<ShareScope>("khata");
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setScope("khata");
    setPersonId(people[0]?.id ?? "");
    setCreatedUrl(null);
    const services = getFirebaseServices();
    const user = services?.auth.currentUser;
    if (!services || !user) {
      setShares([]);
      return;
    }
    void listActiveShares(services.firestore, user.uid, notebookId)
      .then(setShares)
      .catch(() => setShares([]));
  }, [open, notebookId, people]);

  if (!open) return null;

  async function refreshShares(): Promise<void> {
    const services = getFirebaseServices();
    const user = services?.auth.currentUser;
    if (!services || !user) return;
    const active = await listActiveShares(services.firestore, user.uid, notebookId);
    setShares(active);
  }

  async function handleCreate(): Promise<void> {
    const services = getFirebaseServices();
    const user = services?.auth.currentUser;
    if (!services || !user) {
      showToast(isBn ? "আগে Google দিয়ে সাইন ইন করুন।" : "Sign in with Google before sharing.");
      return;
    }
    if (scope === "individual" && !personId) {
      showToast(isBn ? "একজন ব্যক্তি বেছে নিন।" : "Choose a person first.");
      return;
    }

    setBusy(true);
    try {
      const result = await createShareSnapshot(services.firestore, user.uid, {
        scope,
        notebookId,
        ...(scope === "individual" ? { personId } : {}),
      });
      setCreatedUrl(result.url);
      await refreshShares();
      showToast(isBn ? "শেয়ার লিংক তৈরি হয়েছে।" : "Share link created.");
    } catch (error) {
      const message = error instanceof Error && error.message === "ACCOUNT_LINK_REQUIRED"
        ? isBn ? "আগে ক্লাউড সিঙ্ক সেটআপ করুন।" : "Set up cloud sync before sharing."
        : isBn ? "শেয়ার লিংক তৈরি করা যায়নি।" : "Couldn't create the share link.";
      showToast(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      showToast(isBn ? "লিংক কপি হয়েছে।" : "Link copied.");
    } catch {
      showToast(isBn ? "লিংক কপি করা যায়নি।" : "Couldn't copy the link.");
    }
  }

  async function handleNativeShare(url: string): Promise<void> {
    if (typeof navigator.share !== "function") {
      await handleCopy(url);
      return;
    }
    try {
      await navigator.share({ title: notebookName, url });
    } catch {
      // Cancelled native shares should not surface as an error.
    }
  }

  async function handleRevoke(token: string): Promise<void> {
    const services = getFirebaseServices();
    const user = services?.auth.currentUser;
    if (!services || !user) return;
    setBusy(true);
    try {
      await revokeShare(services.firestore, user.uid, token);
      setCreatedUrl((url) => (url?.endsWith(token) ? null : url));
      await refreshShares();
      showToast(isBn ? "শেয়ার লিংক বাতিল হয়েছে।" : "Share link revoked.");
    } catch {
      showToast(isBn ? "লিংক বাতিল করা যায়নি।" : "Couldn't revoke the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0 sm:items-center sm:px-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-rule bg-paper-card p-5 shadow-xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-ink">
              <Share2 size={18} />
              {isBn ? "শেয়ার করুন" : "Share"}
            </div>
            <div className="mt-0.5 text-xs text-ink-dim">{notebookName}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-dim hover:bg-accent-soft" aria-label={isBn ? "বন্ধ করুন" : "Close"}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-rule bg-paper p-1">
          <div className="grid grid-cols-2 gap-1">
            <button type="button" onClick={() => setScope("khata")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${scope === "khata" ? "bg-accent text-paper" : "text-ink-dim"}`}>
              {isBn ? "পুরো খাতা" : "This Khata"}
            </button>
            <button type="button" onClick={() => setScope("individual")} className={`rounded-xl px-3 py-2 text-xs font-semibold ${scope === "individual" ? "bg-accent text-paper" : "text-ink-dim"}`}>
              {isBn ? "একজন ব্যক্তি" : "An individual"}
            </button>
          </div>
        </div>

        {scope === "individual" && (
          <label className="mt-4 block text-xs font-semibold text-ink">
            {isBn ? "ব্যক্তি" : "Person"}
            <select value={personId} onChange={(event) => setPersonId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-rule bg-paper px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-accent">
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
        )}

        <div className="mt-4 rounded-2xl bg-accent-soft px-3 py-3 text-xs leading-relaxed text-ink-dim">
          {isBn
            ? scope === "khata" ? "শুধু দেখার জন্য পুরো খাতার একটি snapshot তৈরি হবে।" : "শুধু দেখার জন্য এই ব্যক্তির লেনদেনের একটি snapshot তৈরি হবে।"
            : scope === "khata" ? "A read-only snapshot of this Khata will be created." : "A read-only snapshot of this person's transactions will be created."}
        </div>

        {createdUrl && (
          <div className="mt-4 rounded-2xl border border-accent/30 bg-paper px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent"><Check size={15} /> {isBn ? "লিংক প্রস্তুত" : "Link ready"}</div>
            <div className="mt-2 break-all text-[11px] text-ink-dim">{createdUrl}</div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void handleCopy(createdUrl)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-rule px-3 py-2 text-xs font-semibold text-ink"><Copy size={14} /> {isBn ? "কপি" : "Copy"}</button>
              <button type="button" onClick={() => void handleNativeShare(createdUrl)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-paper"><Link2 size={14} /> {isBn ? "শেয়ার" : "Share"}</button>
            </div>
          </div>
        )}

        {shares.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-ink">{isBn ? "সক্রিয় লিংক" : "Active links"}</div>
            <div className="mt-2 space-y-2">
              {shares.map((share) => {
                const url = `${window.location.origin}/share/${share.token}`;
                return (
                  <div key={share.token} className="flex items-center gap-2 rounded-xl border border-rule bg-paper px-3 py-2.5">
                    <div className="min-w-0 flex-1 text-xs text-ink-dim truncate">{share.scope === "khata" ? (isBn ? "পুরো খাতা" : "This Khata") : (isBn ? "একজন ব্যক্তি" : "An individual")}</div>
                    <button type="button" onClick={() => void handleCopy(url)} className="rounded-full p-2 text-ink-dim hover:bg-accent-soft" aria-label={isBn ? "লিংক কপি" : "Copy link"}><Copy size={14} /></button>
                    <button type="button" disabled={busy} onClick={() => void handleRevoke(share.token)} className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-danger hover:bg-owe-you-soft disabled:opacity-50">{isBn ? "বাতিল" : "Revoke"}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button type="button" disabled={busy} onClick={() => void handleCreate()} className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-paper disabled:cursor-wait disabled:opacity-60">
          {busy ? (isBn ? "তৈরি হচ্ছে…" : "Creating…") : (isBn ? "শেয়ার লিংক তৈরি করুন" : "Create share link")}
        </button>
      </div>
    </div>
  );
}
