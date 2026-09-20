"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Eye, Share2 } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase/client";
import { readPublicShare, type ShareSnapshot } from "@/lib/firebase/sharing";
import { cacheShareSnapshot, clearCachedShareSnapshot, getCachedShareSnapshot } from "@/lib/shared/shareViewCache";
import { dayLabel, groupByDay } from "@/lib/shared/grouping";
import { formatMoney } from "@/lib/money";

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(timestamp);
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    numberingSystem: "latn",
  }).format(timestamp);
}

function getSnapshotBalance(snapshot: ShareSnapshot): number | null {
  if (snapshot.record.scope !== "khata") return null;

  const got = snapshot.transactions
    .filter((transaction) => transaction.type === "got")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const gave = snapshot.transactions
    .filter((transaction) => transaction.type === "gave")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return snapshot.notebook.openingBalance + got - gave;
}

function LoadingSnapshot() {
  return (
    <main className="min-h-screen bg-paper" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <div className="flex items-center gap-2 text-xs font-medium text-ink-dim">
          <Eye size={15} aria-hidden="true" />
          <span className="h-3 w-16 animate-pulse rounded bg-rule" />
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-7 w-44 animate-pulse rounded-lg bg-rule" />
            <div className="mt-2 h-4 w-52 animate-pulse rounded bg-rule" />
          </div>
          <div className="h-7 w-28 shrink-0 animate-pulse rounded-full bg-rule" />
        </div>

        <div className="mt-6 rounded-3xl border border-rule bg-paper-card p-5 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded bg-rule" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-rule" />
          <div className="mt-5 h-3 w-24 animate-pulse rounded bg-rule" />
          <div className="mt-2 h-9 w-36 animate-pulse rounded-xl bg-rule" />
          <div className="mt-5 h-3 w-44 animate-pulse rounded bg-rule" />
        </div>

        <div className="mt-7">
          <div className="h-4 w-24 animate-pulse rounded bg-rule" />
          <div className="mt-3 overflow-hidden rounded-2xl border border-rule bg-paper-card">
            {["w-32", "w-40", "w-28"].map((width, index) => (
              <div key={index} className="border-b border-rule px-4 py-4 last:border-b-0">
                <div className="flex items-center justify-between gap-4">
                  <div className={`h-4 ${width} animate-pulse rounded bg-rule`} />
                  <div className="h-4 w-20 animate-pulse rounded bg-rule" />
                </div>
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-rule" />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-dim">Preparing your shared khata…</p>
      </div>
    </main>
  );
}

export function PublicShareView({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const services = getFirebaseServices();
      if (!services) {
        setLoading(false);
        return;
      }
      try {
        const result = await readPublicShare(services.firestore, token);
        if (cancelled) return;
        if (result) {
          setSnapshot(result);
          setCachedAt(null);
          void cacheShareSnapshot(token, result);
        } else {
          // The server gave a definitive answer: revoked, expired, or never
          // existed. Clear any local cache too — otherwise a viewer back
          // online after a revoke could keep seeing the stale cached copy
          // forever, silently defeating the revoke.
          setSnapshot(null);
          setCachedAt(null);
          void clearCachedShareSnapshot(token);
        }
      } catch {
        // readPublicShare throwing (vs. returning null) means the request
        // itself didn't complete — most likely no connectivity. Fall back
        // to a cached copy from a previous successful view, if one exists
        // and isn't older than SHARE_CACHE_MAX_AGE_MS.
        if (cancelled) return;
        const cached = await getCachedShareSnapshot(token);
        if (cancelled) return;
        if (cached) {
          setSnapshot(cached.snapshot);
          setCachedAt(cached.cachedAt);
        } else {
          setSnapshot(null);
          setCachedAt(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const orderedTransactions = useMemo(
    () => [...(snapshot?.transactions ?? [])].sort((a, b) => b.occurredAt - a.occurredAt),
    [snapshot?.transactions],
  );

  const grouped = useMemo(
    () =>
      groupByDay(
        orderedTransactions,
        (timestamp) =>
          dayLabel(
            timestamp,
            (key) => (key === "history.today" ? "Today" : key === "history.yesterday" ? "Yesterday" : key),
            "en",
          ),
      ),
    [orderedTransactions],
  );

  const peopleMap = useMemo(
    () => new Map((snapshot?.people ?? []).map((person) => [person.id, person])),
    [snapshot?.people],
  );

  if (loading) return <LoadingSnapshot />;

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-paper">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-8">
          <div className="w-full rounded-3xl border border-rule bg-paper-card p-7 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Share2 size={21} aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-ink">Shared snapshot</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-dim">This share link is no longer available.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-paper shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Open Khata
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const balance = getSnapshotBalance(snapshot);
  const sharedDate = formatDateTime(snapshot.record.createdAt);
  const transactionCount = snapshot.transactions.length;
  const peopleCount = snapshot.people.length;
  const isIndividual = snapshot.record.scope === "individual";

  return (
    <main className="min-h-screen bg-paper pb-safe">
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        {cachedAt !== null && (
          <div className="mb-4 rounded-2xl border border-rule bg-paper-card px-4 py-3 text-xs text-ink-dim">
            You&apos;re offline — showing the copy last viewed on {formatDateTime(cachedAt)}.
          </div>
        )}
        <header className="rounded-3xl border border-rule bg-paper-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/icons/khata-logo.svg"
                alt="Khata logo"
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-xl shadow-sm"
              />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold leading-tight text-ink">Khata</div>
                <div className="truncate text-[11px] leading-tight text-ink-dim">Simple Money Notebook</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-rule bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-dim">
              <Eye size={13} aria-hidden="true" />
              <span>Read only</span>
            </div>
          </div>

          <div className="my-4 border-t border-rule" />

          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight text-ink">{snapshot.record.title}</h1>
            <div className="shrink-0 rounded-full border border-rule bg-paper px-3 py-1.5 text-[11px] font-semibold text-accent">
              {isIndividual ? "Individual snapshot" : "Shared snapshot"}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-dim">
            <Clock3 size={13} aria-hidden="true" />
            <span>Shared {sharedDate}</span>
          </div>
          <div className="mt-0.5 text-xs text-ink-dim">
            {transactionCount} {transactionCount === 1 ? "transaction" : "transactions"}
            <span className="mx-1.5" aria-hidden="true">·</span>
            {peopleCount} {peopleCount === 1 ? "person" : "people"}
          </div>

          {balance !== null && (
            <div className="mt-4 rounded-2xl bg-accent px-4 py-4 text-paper shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Current balance</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(balance)}</div>
            </div>
          )}
        </header>

        <section aria-labelledby="transactions-heading" className="mt-7">
          <h2 id="transactions-heading" className="mb-2 text-sm font-semibold text-ink">Transactions</h2>

          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-rule bg-paper-card px-4 py-9 text-center">
              <p className="text-sm font-medium text-ink">No transactions</p>
              <p className="mt-1 text-xs text-ink-dim">There are no transactions in this snapshot.</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-3 last:mb-0">
                <div className="sticky top-0 z-10 bg-paper py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-dim">
                  {group.label}
                </div>
                <div className="overflow-hidden rounded-2xl border border-rule bg-paper-card">
                  {group.items.map((transaction) => {
                    const person = peopleMap.get(transaction.personId);
                    const isGave = transaction.type === "gave";
                    return (
                      <div key={transaction.id} className="border-b border-rule px-4 py-3 last:border-b-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{person?.name || "Unknown person"}</div>
                          <div className="shrink-0 text-xs tabular-nums text-ink-dim">{formatTime(transaction.occurredAt)}</div>
                          <div className={`shrink-0 text-sm font-semibold tabular-nums ${isGave ? "text-owe-you" : "text-accent"}`}>
                            {isGave ? "−" : "+"} {formatMoney(transaction.amount)}
                          </div>
                        </div>
                        {transaction.note && (
                          <div className="mt-1.5 truncate rounded-md bg-note px-2 py-1 text-xs text-ink">{transaction.note}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="mt-10 rounded-3xl border border-rule bg-paper-card px-5 py-6 text-center shadow-sm">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <CheckCircle2 size={18} aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-ink">That’s the snapshot</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-dim">
            Keep your own money records simple with Khata.
          </p>
          <div className="mt-3 text-[11px] font-medium text-ink-dim">Private · Offline · Simple</div>
          <Link
            href="/"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-paper shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Open Khata
            <ArrowRight size={16} />
          </Link>
        </section>

        <footer className="mt-6 text-center text-xs text-ink-dim">
          <div>Made with Khata</div>
          <div className="mt-1">Read only</div>
        </footer>
      </div>
    </main>
  );
}
