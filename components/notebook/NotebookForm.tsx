"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useI18n } from "@/lib/i18n";
import { NOTEBOOK_COLORS, NOTEBOOK_ICONS } from "@/lib/shared/notebookStyle";
import { NOTEBOOK_ICON_MAP } from "./icons";
import type { Notebook, NotebookColor, NotebookIcon } from "@/lib/db/schema";
import { createNotebook, updateNotebook, archiveNotebook } from "@/lib/db/notebooks";
import { getGroups, findOrCreateGroup } from "@/lib/db/groups";
import { rupeesToPaise, rupeesInputValue, MAX_AMOUNT_RUPEES } from "@/lib/money";

export function NotebookForm({ existing }: { existing?: Notebook }) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    existing ? rupeesInputValue(existing.openingBalance) : ""
  );
  const [color, setColor] = useState<NotebookColor>(existing?.color ?? "green");
  const [icon, setIcon] = useState<NotebookIcon>(existing?.icon ?? "book");
  const [saving, setSaving] = useState(false);

  const groups = useLiveQuery(() => getGroups(), []);
  const [groupQuery, setGroupQuery] = useState("");
  const [groupFocused, setGroupFocused] = useState(false);
  const [groupInitialized, setGroupInitialized] = useState(false);

  // Prefill the group text field once groups have loaded, for edit mode.
  if (!groupInitialized && groups && existing) {
    const current = groups.find((g) => g.id === existing.groupId);
    if (current) setGroupQuery(current.name);
    setGroupInitialized(true);
  } else if (!groupInitialized && groups && !existing) {
    setGroupInitialized(true);
  }

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const q = groupQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupQuery]);
  const exactGroupMatch = filteredGroups.find(
    (g) => g.name.toLowerCase() === groupQuery.trim().toLowerCase()
  );

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const balancePaise = rupeesToPaise(Number(openingBalance || 0));

    let groupId: string | null = null;
    if (groupQuery.trim()) {
      const group = exactGroupMatch ?? (await findOrCreateGroup(groupQuery.trim()));
      groupId = group.id;
    }

    if (existing) {
      await updateNotebook(existing.id, { name, openingBalance: balancePaise, color, icon, groupId });
      router.push(`/notebook/${existing.id}`);
    } else {
      const nb = await createNotebook({ name, openingBalance: balancePaise, color, icon, groupId });
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
            maxLength={12}
            value={openingBalance}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/[^0-9.]/g, "");
              setOpeningBalance(digitsOnly);
            }}
            onBlur={() => {
              const n = Number(openingBalance || 0);
              if (n > MAX_AMOUNT_RUPEES) setOpeningBalance(String(MAX_AMOUNT_RUPEES));
            }}
            placeholder="0"
            className="w-full bg-transparent py-3 text-base text-ink outline-none tabular-nums"
          />
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-ink-dim mb-1.5">{t("form.group")}</label>
        <input
          value={groupQuery}
          onChange={(e) => setGroupQuery(e.target.value)}
          onFocus={() => setGroupFocused(true)}
          onBlur={() => setTimeout(() => setGroupFocused(false), 150)}
          placeholder={t("form.groupPlaceholder")}
          className="w-full rounded-xl border border-rule bg-transparent px-4 py-3 text-base text-ink outline-none focus:border-accent"
        />
        {groupFocused && (
          <div className="absolute z-10 mt-1 w-full bg-paper border border-rule rounded-xl shadow-lg overflow-hidden">
            {groupQuery.trim() && (
              <button
                onMouseDown={() => setGroupQuery("")}
                className="w-full text-left px-4 py-2.5 text-sm text-ink-dim hover:bg-accent-soft"
              >
                {t("form.noGroup")}
              </button>
            )}
            {filteredGroups.map((g) => (
              <button
                key={g.id}
                onMouseDown={() => setGroupQuery(g.name)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent-soft"
              >
                {g.name}
              </button>
            ))}
            {groupQuery.trim() && !exactGroupMatch && (
              <button
                onMouseDown={() => setGroupFocused(false)}
                className="w-full text-left px-4 py-2.5 text-sm text-accent font-medium hover:bg-accent-soft"
              >
                {t("form.addAsNewGroup", { name: groupQuery.trim() })}
              </button>
            )}
          </div>
        )}
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

      <div className="fixed bottom-20 inset-x-0 z-40 max-w-md mx-auto px-5">
        <button
          disabled={!canSave}
          onClick={handleSave}
          className="w-full rounded-full bg-accent text-paper font-semibold py-3.5 shadow-md disabled:opacity-40"
        >
          {t("form.save")}
        </button>
      </div>
    </div>
  );
}
