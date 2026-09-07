import { showToast } from "@/components/shared/Toast";

export async function shareApp(linkCopiedLabel: string) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Khata — Simple Money Notebook", url });
    } catch {
      // user cancelled — no-op
    }
  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    showToast(linkCopiedLabel);
  }
}
