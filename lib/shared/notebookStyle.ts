import type { NotebookColor, NotebookIcon } from "../db/schema";

export const NOTEBOOK_COLORS: { value: NotebookColor; hex: string }[] = [
  { value: "green", hex: "#2F6B4F" },
  { value: "terracotta", hex: "#B4491F" },
  { value: "mustard", hex: "#C9942F" },
  { value: "blue", hex: "#2F5E8F" },
  { value: "plum", hex: "#7A4B8F" },
  { value: "teal", hex: "#2F8F82" },
  { value: "rose", hex: "#B4487A" },
  { value: "slate", hex: "#5A6270" },
];

export const NOTEBOOK_ICONS: NotebookIcon[] = [
  "shop", "home", "wallet", "users", "cart", "briefcase", "piggy-bank", "book",
];

export function colorHex(color: NotebookColor): string {
  return NOTEBOOK_COLORS.find((c) => c.value === color)?.hex ?? "#2F6B4F";
}

// deterministic pastel avatar color from a name, for person rows
const AVATAR_PALETTE = ["#E4D8C3", "#D9E3D2", "#D9DFE8", "#E8D9DE", "#DCE8E4", "#EAE0D0"];
export function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
