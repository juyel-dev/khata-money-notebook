// Shared day-grouping for transaction lists (History + Khata Details).
// Kept in one place so every ledger surface groups dates identically.

export function dayLabel(ts: number, t: (k: string) => string, locale: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return t("history.today");
  if (sameDay(d, yesterday)) return t("history.yesterday");
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
  });
}

export interface DayGroup<T> {
  label: string;
  items: T[];
}

// Groups an already-ordered list into consecutive same-day buckets,
// preserving the input order (callers pass newest-first).
export function groupByDay<T extends { occurredAt: number }>(
  items: T[],
  labelFor: (ts: number) => string
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const label = labelFor(item.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
