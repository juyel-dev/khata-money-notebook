/**
 * Internal sync/account-link error codes (thrown as plain Error messages by
 * accountLink.ts, syncEngine.ts, reconciliationFlow.ts) are identifiers, not
 * user-facing text. This maps the known ones to bilingual copy, mirroring
 * the getAuthErrorMessage convention in AccountCard.tsx. Anything
 * unrecognized falls back to a generic message instead of leaking the raw
 * code or a technical SDK error string to the user.
 */
export function getSyncErrorMessage(error: unknown, isBn: boolean): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  switch (raw) {
    case "ACCOUNT_SWITCH_REQUIRES_RECONCILIATION":
      return isBn
        ? "এই ডিভাইসে অন্য একটি Google অ্যাকাউন্ট আগে থেকে যুক্ত আছে।"
        : "A different Google account is already linked on this device.";
    case "ACCOUNT_LINK_TARGET_MISMATCH":
      return isBn
        ? "অ্যাকাউন্ট লিংকের তথ্য মিলছে না। পেজ রিলোড করে আবার চেষ্টা করুন।"
        : "Account link information didn't match. Reload the page and try again.";
    case "RECONCILIATION_REQUIRED":
      return isBn
        ? "সিঙ্কের আগে ডেটা মিলিয়ে নেওয়া দরকার। সেটআপ ধাপটি আবার সম্পন্ন করুন।"
        : "Data needs to be reconciled before syncing. Please complete the setup step again.";
    case "ACCOUNT_LINK_NOT_RECONCILING":
      return isBn
        ? "এই মুহূর্তে কোনো মিলিয়ে নেওয়ার প্রক্রিয়া চালু নেই। পেজ রিলোড করে আবার চেষ্টা করুন।"
        : "There's no reconciliation in progress right now. Reload the page and try again.";
    default:
      // A timeout message from withTimeout() is already human-readable —
      // pass it through rather than replacing it with something vaguer.
      if (raw.toLowerCase().includes("timed out")) return raw;
      return isBn ? "একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Something went wrong. Please try again.";
  }
}
