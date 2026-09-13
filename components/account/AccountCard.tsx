"use client";

import { useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { showToast } from "@/components/shared/Toast";

type FirebaseAuthError = Error & { code?: string };

function getAuthErrorMessage(error: unknown, isBn: boolean): string {
  const code = (error as FirebaseAuthError | null)?.code ?? "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return isBn ? "Google সাইন ইন বাতিল হয়েছে। আবার চেষ্টা করুন।" : "Google sign-in was cancelled. Please try again.";
    case "auth/popup-blocked":
      return isBn ? "ব্রাউজার Google সাইন-ইন উইন্ডোটি ব্লক করেছে। Popup অনুমতি দিন এবং আবার চেষ্টা করুন।" : "Your browser blocked the Google sign-in window. Allow popups and try again.";
    case "auth/unauthorized-domain":
      return isBn ? "এই ডোমেইন থেকে Google সাইন ইন অনুমোদিত নয়। Firebase-এর Authorized domains সেটিংস যাচাই করুন।" : "Google sign-in is not authorized for this domain. Check Firebase Authorized domains.";
    case "auth/operation-not-allowed":
      return isBn ? "Firebase-এ Google সাইন ইন চালু নেই। Google provider-এর সেটিংস যাচাই করুন।" : "Google sign-in is not enabled in Firebase. Check the Google provider settings.";
    case "auth/network-request-failed":
      return isBn ? "ইন্টারনেট সংযোগের কারণে সাইন ইন সম্পন্ন হয়নি। আবার চেষ্টা করুন।" : "Sign-in could not reach Firebase. Check your internet connection and try again.";
    default:
      return isBn ? "Google দিয়ে সাইন ইন করা যায়নি। আবার চেষ্টা করুন।" : "Google sign-in failed. Please try again.";
  }
}

export function AccountCard({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const { user, loading, error: authError, signIn, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const isBn = locale === "bn";

  async function handleSignIn() {
    setBusy(true);
    try {
      await signIn();
    } catch (error) {
      showToast(getAuthErrorMessage(error, isBn));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
    } catch {
      showToast(isBn ? "সাইন আউট করা যায়নি। আবার চেষ্টা করুন।" : "Couldn't sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-rule bg-paper-card p-4 animate-pulse">
        <div className="h-4 w-28 rounded bg-rule" />
        <div className="mt-2 h-3 w-44 rounded bg-rule/70" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={compact ? "p-4" : "rounded-2xl border border-rule bg-paper-card p-4"}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <UserRound size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">
              {isBn ? "আপনার অ্যাকাউন্ট" : "Your account"}
            </div>
            <div className="mt-0.5 text-xs leading-relaxed text-ink-dim">
              {t("menu.cloudSyncDesc")}
            </div>
            {authError ? (
              <div className="mt-2 text-xs leading-relaxed text-red-700 dark:text-red-300">
                {getAuthErrorMessage(authError, isBn)}
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-paper transition-opacity disabled:cursor-wait disabled:opacity-60"
        >
          <LogIn size={16} />
          {busy ? (isBn ? "সাইন ইন হচ্ছে…" : "Signing in…") : t("menu.signInGoogle")}
        </button>
      </div>
    );
  }

  const displayName = user.displayName?.trim() || (isBn ? "Google ব্যবহারকারী" : "Google user");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={compact ? "p-4" : "rounded-2xl border border-rule bg-paper-card p-4"}>
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          // Firebase's Google profile photo is remote user-provided content.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-paper">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{displayName}</div>
          <div className="truncate text-xs text-ink-dim">{user.email ?? ""}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="mt-3 flex items-center justify-center gap-2 rounded-full border border-rule px-4 py-2 text-sm font-semibold text-ink-dim transition-colors hover:bg-accent-soft disabled:cursor-wait disabled:opacity-60"
      >
        <LogOut size={16} />
        {busy ? (isBn ? "সাইন আউট হচ্ছে…" : "Signing out…") : isBn ? "সাইন আউট" : "Sign out"}
      </button>
    </div>
  );
}
