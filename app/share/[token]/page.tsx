"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Clock3, Eye, Share2 } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { readPublicShare, type ShareSnapshot } from "@/lib/firebase/sharing";
import { useI18n } from "@/lib/i18n";
import { dayLabel, groupByDay } from "@/lib/shared/grouping";
import { formatMoney } from "@/lib/money";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, locale } = useI18n();
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const services = getFirebaseServices();
    if (!services) {
      setLoading(false);
      return;
    }
    void readPublicShare(services.firestore, token)
      .then((result) => {
        if (!cancelled) setSnapshot(result);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const grouped = useMemo(
    () => groupByDay(snapshot?.transactions ?? [], (timestamp) => dayLabel(timestamp, t, locale)),
    [locale, snapshot?.transactions, t],
  );

  const peopleMap = useMemo(
    () => new Map((snapshot?.people ?? []).map((person) => [person.id, person])),
    [snapshot?.people],
  );

  const copy = {
    loading: locale === "bn" ? "শেয়ার snapshot লোড হচ্ছে…" : "Loading snapshot…",
    sharedSnapshot: locale === "bn" ? "শেয়ার করা snapshot" : "Shared snapshot",
    notAvailable: locale === "bn" ? "এই শেয়ার লিংকটি আর কাজ করছে না।" : "This share link is no longer available.",
    readOnly: locale === "bn" ? "শুধু দেখার জন্য" : "Read only",
    transactions: locale === "bn" ? "লেনদেন" : "Transactions",
    people: locale === "bn" ? "জন" : "People",
    noTransactions: locale === "bn" ? "এই snapshot-এ কোনো লেনদেন নেই।" : "No transactions in this snapshot.",
    sharedAt: (time: string) => locale === "bn" ? `শেয়ার: ${time}` : `Shared ${time}`,
  };

  if (loading) {
    return <main className="mx-auto min-h-screen max-w-md px-5 py-8 text-sm text-ink-dim">{copy.loading}</main>;
  }

  if (!snapshot) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-8">
        <div className="w-full rounded-3xl border border-rule bg-paper-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Share2 size={21} /></div>
          <h1 className="mt-4 text-lg font-semibold text-ink">{copy.sharedSnapshot}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">{copy.notAvailable}</p>
        </div>
      </main>
    );
  }

  const sharedDate = new Intl.DateTimeFormat(
    locale === "bn" ? "bn-BD" : "en-IN",
    { dateStyle: "medium" },
  ).format(snapshot.record.createdAt);

  return (
    <main className="min-h-screen bg-paper pb-8">
      <div className="mx-auto max-w-md px-5 pt-5">
        <div className="flex items-center gap-2 text-xs font-medium text-ink-dim">
          <Eye size={15} />
          {copy.readOnly}
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{snapshot.record.title}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-dim">
              <Clock3 size={13} />
              {copy.sharedAt(sharedDate)}
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-rule bg-paper-card px-3 py-1.5 text-[11px] font-semibold text-accent">
            {copy.sharedSnapshot}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-rule bg-paper-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">{snapshot.notebook.name}</div>
              <div className="mt-0.5 text-xs text-ink-dim">
                {snapshot.transactions.length} {locale === "bn" ? "টি লেনদেন" : snapshot.transactions.length === 1 ? "transaction" : "transactions"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-ink-dim">{copy.people}</div>
              <div className="text-lg font-semibold tabular-nums text-ink">{snapshot.people.length}</div>
            </div>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink">{copy.transactions}</h2>
          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-rule bg-paper-card px-4 py-8 text-center text-sm text-ink-dim">{copy.noTransactions}</div>
          ) : grouped.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="sticky top-0 bg-paper py-2 text-xs font-semibold uppercase tracking-wide text-ink-dim">{group.label}</div>
              <div className="overflow-hidden rounded-2xl border border-rule bg-paper-card">
                {group.items.map((transaction) => {
                  const person = peopleMap.get(transaction.personId);
                  return (
                    <div key={transaction.id} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{person?.name ?? ""}</div>
                        {transaction.note && <div className="mt-0.5 truncate text-xs text-ink-dim">{transaction.note}</div>}
                      </div>
                      <div className={`shrink-0 text-sm font-semibold tabular-nums ${transaction.type === "gave" ? "text-owe-you" : "text-accent"}`}>
                        {transaction.type === "gave" ? t("notebook.gave") : t("notebook.got")} · {formatMoney(transaction.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <div className="mt-8 text-center text-xs text-ink-dim">{copy.readOnly}</div>
      </div>
    </main>
  );
}
