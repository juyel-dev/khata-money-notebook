// Same navigator.share()-with-clipboard-fallback pattern as lib/shareApp.ts
// and ShareSheet's handleNativeShare, generalized for arbitrary text instead
// of a URL.
export async function shareText(text: string, title: string, copiedLabel: string, showToast: (msg: string) => void): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
    } catch {
      // user cancelled — no-op
    }
    return;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    showToast(copiedLabel);
  }
}
