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

// Shares a single image file via the Web Share API's file-sharing support
// (Level 2 — not every navigator.share() implementation accepts files, so
// this checks navigator.canShare({ files }) rather than assuming). Falls
// back to a plain browser download only when file sharing isn't supported
// at all — cancelling an actual share sheet is treated as a no-op, same as
// shareText(), not as a reason to force a download.
export async function shareImageFile(file: File, title: string): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ title, files: [file] });
    } catch {
      // user cancelled — no-op, same as shareText
    }
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
