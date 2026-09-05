"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import type { Notebook } from "@/lib/db/schema";
import { getNotebookBalance, getLastActivityAt } from "@/lib/db/notebooks";
import { formatMoney } from "@/lib/money";
import { colorHex } from "@/lib/shared/notebookStyle";
import { useI18n } from "@/lib/i18n";

function relativeTime(ts: number | null, locale: string): string {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return locale === "bn" ? "এইমাত্র" : "just now";
  if (mins < 60) return locale === "bn" ? `${mins} মিনিট আগে` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return locale === "bn" ? `${hrs} ঘণ্টা আগে` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return locale === "bn" ? `${days} দিন আগে` : `${days}d ago`;
}

export function BalanceHeader({ notebook }: { notebook: Notebook }) {
  const { t, locale } = useI18n();
  const balance = useLiveQuery(() => getNotebookBalance(notebook.id), [notebook.id]);
  const lastActivity = useLiveQuery(() => getLastActivityAt(notebook.id), [notebook.id]);
  const hex = colorHex(notebook.color);

  return (
    <div
      className="px-6 pt-6 pb-7 text-center"
      style={{ background: `linear-gradient(180deg, ${hex}1A 0%, transparent 100%)` }}
    >
      <div className="text-xs uppercase tracking-wide text-ink-dim mb-2">{notebook.name}</div>
      <motion.div
        key={balance}
        initial={{ scale: 0.97, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="text-4xl font-bold tabular-nums text-ink break-all"
      >
        {balance != null ? formatMoney(balance) : "…"}
      </motion.div>
      <div className="text-xs text-ink-dim mt-2">
        {t("notebook.openingBalance")} {formatMoney(notebook.openingBalance)}
        {lastActivity ? ` · ${t("notebook.updated")} ${relativeTime(lastActivity, locale)}` : ""}
      </div>
    </div>
  );
}
