import { Store, Home, Wallet, Users, ShoppingCart, Briefcase, PiggyBank, BookOpen } from "lucide-react";
import type { NotebookIcon } from "@/lib/db/schema";
import type { LucideIcon } from "lucide-react";

export const NOTEBOOK_ICON_MAP: Record<NotebookIcon, LucideIcon> = {
  shop: Store,
  home: Home,
  wallet: Wallet,
  users: Users,
  cart: ShoppingCart,
  briefcase: Briefcase,
  "piggy-bank": PiggyBank,
  book: BookOpen,
};
