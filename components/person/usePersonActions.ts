import { useI18n } from "@/lib/i18n";
import { db, type Person } from "@/lib/db/schema";
import { getPersonTransactions } from "@/lib/db/transactions";
import { renamePerson, deletePersonIfEmpty } from "@/lib/db/people";
import { showToast } from "@/components/shared/Toast";
import { buildPersonStatementText } from "@/lib/shared/statementText";
import { shareText, shareImageFile } from "@/lib/shared/share";

// Shared async logic behind every person-level action (rename, delete,
// share statement as text/image) — used by both PersonDetailView and
// PersonRow's kebab menu so the two don't drift. Each function handles its
// own try/catch/toast, returning a plain success boolean where the caller
// needs to know (rename/remove change what the caller should do next);
// share actions have no follow-up action so they don't need one.
export function usePersonActions(notebookId: string, person: Person) {
  const { t, locale } = useI18n();

  async function rename(newName: string): Promise<boolean> {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === person.name) return true;
    try {
      await renamePerson(person.id, trimmed);
      return true;
    } catch {
      showToast(t("common.errSaveFailed"));
      return false;
    }
  }

  async function remove(): Promise<boolean> {
    try {
      const deleted = await deletePersonIfEmpty(person.id);
      if (!deleted) {
        showToast(t("person.deleteBlocked"));
        return false;
      }
      showToast(t("person.deleted"));
      return true;
    } catch {
      showToast(t("common.errSaveFailed"));
      return false;
    }
  }

  async function shareStatementText(): Promise<void> {
    const [notebook, transactions] = await Promise.all([
      db.notebooks.get(notebookId),
      getPersonTransactions(person.id),
    ]);
    const text = buildPersonStatementText({
      notebookName: notebook?.name ?? "",
      personName: person.name,
      transactions,
      locale,
    });
    await shareText(text, person.name, t("person.statementCopied"), showToast);
  }

  // Captures an already-rendered node (a PersonStatementCard, off-screen)
  // to an image and shares it. Callers own getting that node into the DOM
  // first — this hook has no opinion on whether it's always-mounted
  // (PersonDetailView) or mounted on demand (PersonRow, to avoid every row
  // in a long list holding its own off-screen card + transactions).
  async function shareStatementImage(node: HTMLElement): Promise<void> {
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, { pixelRatio: 2 });
      if (!blob) throw new Error("toBlob returned null");
      const file = new File([blob], `${person.name}.png`, { type: "image/png" });
      await shareImageFile(file, person.name);
    } catch {
      showToast(t("common.errSaveFailed"));
    }
  }

  return { rename, remove, shareStatementText, shareStatementImage };
}
