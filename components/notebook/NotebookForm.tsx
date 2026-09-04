"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { NOTEBOOK_COLORS, NOTEBOOK_ICONS } from "@/lib/shared/notebookStyle";
import { NOTEBOOK_ICON_MAP } from "./icons";
import type { Notebook, NotebookColor, NotebookIcon } from "@/lib/db/schema";
import { createNotebook, updateNotebook, archiveNotebook } from "@/lib/db/notebooks";
import { rupeesToPaise, paiseToRupees } from "@/lib/money";

export function NotebookForm({ existing }: { existing?: Notebook }) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    existing ? String(paiseToRupees(existing.openingBalance)) : ""
  );
  const [color, setColor] = useState<NotebookColor>(existing?.color ?? "green");
  const [icon, setIcon] = useState<NotebookIcon>(existing?.icon ?? "book");
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const balancePaise = rupeesToPaise(Number(openingBalance || 0));
    if (existing) {
      await updateNotebook(existing.id, { name, openingBalance: balancePaise, color, icon });
      router.push(`/notebook/${existing.id}`);
    } else {
      const nb = await createNotebook({ name, openingBalance: balancePaise, color, icon });
      router.push(`/notebook/${nb.id}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-5 pt-4 pb-28">
      <div>
        <label className="block text-sm font-medium text-ink-dim mb-1.5">
          {t("form.notebookName")}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("form.notebookNamePlaceholder")}
          className="w-full rounded-xl border border-rule bg-transparent px-4 py-3 text-base text-ink outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-dim mb-1.5">
          {t("form.openingBalance")}
        </label>
        <div className="flex items-center rounded-xl border border-rule px-4 focus-within:border-accent">
          <span className="text-ink-dim mr-1">₹</span>
          <input
            inputMode="decimal"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            className="w-full bg-transparent py-3 text-base text-ink outline-none tabular-nums"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-dim mb-2">{t("form.color")}</label>
        <div className="flex flex-wrap gap-3">
          {NOTEBOOK_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: c.hex,
                outline: color === c.value ? `2px solid ${c.hex}` : "none",
                outlineOffset: 2,
              }}
              aria-label={c.value}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-dim mb-2">{t("form.icon")}</label>
        <div className="flex flex-wrap gap-3">
          {NOTEBOOK_ICONS.map((iconKey) => {
            const Icon = NOTEBOOK_ICON_MAP[iconKey];
            const selected = icon === iconKey;
            return (
              <button
                key={iconKey}
                onClick={() => setIcon(iconKey)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  selected ? "border-accent bg-accent-soft text-accent" : "border-rule text-ink-dim"
                }`}
              >
                <Icon size={19} />
              </button>
            );
          })}
        </div>
      </div>

      {existing && (
        <button
          onClick={async () => {
            await archiveNotebook(existing.id, true);
            router.push("/");
          }}
          className="text-sm text-danger underline text-center"
        >
          {t("notebook.archiveNotebook")}
        </button>
      )}

      <div className="fixed bottom-0 inset-x-0 max-w-md mx-auto px-5 pb-safe pt-3 bg-paper border-t border-rule">
        <button
          disabled={!canSave}
          onClick={handleSave}
          className="w-full rounded-full bg-accent text-paper font-semibold py-3.5 disabled:opacity-40"
        >
          {t("form.save")}
        </button>
      </div>
    </div>
  );
}
