// Hardcoded hero banners — the offline-first fallback for the home screen
// carousel. This file is the ENTIRE data source today (no backend yet).
//
// When Supabase + the admin dashboard exist (see docs/ROADMAP.md Phase 3),
// this array stays exactly where it is and becomes the fallback: the
// carousel will try to fetch dashboard-managed banners first, and silently
// fall back to this array on any failure (offline, fetch error, empty
// result) — never an error state, never a broken-image icon. That's why
// every field here is plain, self-contained data with no external URLs.

export interface Banner {
  id: string;

  title: string;
  titleBn: string;

  subtitle: string;
  subtitleBn: string;

  /** Local image path (right-side card art). Omit to use `icon` instead. */
  imageUrl?: string;

  /** Local white line-art path (kept for the future rotation pool). */
  art?: string;

  /** Lucide icon name, used when there's no photo/illustration for this banner. */
  icon?:
    | "Users"
    | "DatabaseBackup"
    | "Pin"
    | "WifiOff"
    | "Smartphone"
    | "BadgePercent";

  accentColor: string; // hex, matches the notebook color palette

  destinationUrl?: string;

  sponsorLabel?: string;
  sponsorLabelBn?: string;

  cta?: string;
  ctaBn?: string;
}

export const BANNERS: Banner[] = [
  /*
   * ============================================================
   * 01 — MAKER / PERSONAL
   * Keep this banner visually unchanged.
   * ============================================================
   */
  {
    id: "dev-feedback",

    title: "Got feedback?",
    titleBn: "কোনো মতামত আছে?",

    subtitle:
      "Khata is built and maintained by one developer — tell me what to fix or add.",
    subtitleBn:
      "খাতা একজন ডেভেলপার একাই বানাচ্ছেন — কী ঠিক করা বা যোগ করা দরকার, জানান।",

    imageUrl: "/banners/dev-photo.png",

    accentColor: "#2F6B4F",

    destinationUrl: "https://github.com/juyel-dev",

    sponsorLabel: "From the maker",
    sponsorLabelBn: "নির্মাতার পক্ষ থেকে",
  },

  /*
   * ============================================================
   * 02 — PRODUCT PROMO
   * This is intentionally NOT styled like a normal tip.
   * It sells the product/value of Khata itself.
   * ============================================================
   */
  {
    id: "promo-khata",

    title: "Your money. Your Khata.",
    titleBn: "আপনার হিসাব, আপনার খাতা।",

    subtitle:
      "Track দেনা-পাওনা, manage notebooks and stay organized — simple, fast and offline.",
    subtitleBn:
      "দেনা-পাওনা, খাতা আর দৈনন্দিন হিসাব — সবকিছু সহজে, দ্রুত এবং অফলাইনে রাখুন।",

    icon: "Smartphone",

    accentColor: "#075B42",

    destinationUrl: "/",

    sponsorLabel: "Khata",
    sponsorLabelBn: "খাতা",

    cta: "Start using Khata",
    ctaBn: "খাতা ব্যবহার করুন",
  },

  /*
   * ============================================================
   * 03 — AFFILIATE / PARTNER SLOT
   *
   * This is deliberately subtle:
   * - "Partner Pick" instead of loud "ADVERTISEMENT"
   * - commerce-inspired accent
   * - CTA (appears automatically once destinationUrl is set)
   *
   * TODO: paste the real affiliate link into destinationUrl below.
   * Until then the card is intentionally non-clickable with no CTA,
   * so no dead/placeholder link ever ships to users.
   * ============================================================
   */
  {
    id: "partner-pick",

    title: "Small tools. Big difference.",
    titleBn: "ছোট টুল, বড় কাজে লাগে।",

    subtitle:
      "Useful tools for shop owners and small businesses — hand-picked by Khata.",
    subtitleBn:
      "দোকানদার ও ছোট ব্যবসার জন্য দরকারি কিছু টুল — খাতার বাছাই করা।",

    icon: "BadgePercent",

    accentColor: "#8A5A18",

    sponsorLabel: "Partner Pick",
    sponsorLabelBn: "পার্টনার পিক",

    cta: "Explore pick",
    ctaBn: "দেখুন",
  },

  /*
   * ============================================================
   * 04 — PRODUCT TIP
   * ============================================================
   */
  {
    id: "tip-groups",

    title: "Keep things organized",
    titleBn: "গুছিয়ে রাখুন",

    subtitle:
      "Group your notebooks — shop, family, personal — all in one place.",
    subtitleBn:
      "দোকান, পরিবার, ব্যক্তিগত — সব খাতা গ্রুপ করে রাখুন এক জায়গায়।",

    icon: "Users",

    sponsorLabel: "Khata Tips",
    sponsorLabelBn: "খাতা টিপস",

    accentColor: "#2F5E8F",
  },

  /*
   * ============================================================
   * 05 — PRODUCT TIP
   * ============================================================
   */
  {
    id: "tip-backup",

    title: "Don't lose your data",
    titleBn: "ডেটা হারাবেন না",

    subtitle:
      "Export a backup anytime from Settings — takes two seconds.",
    subtitleBn:
      "Settings থেকে যেকোনো সময় ব্যাকআপ নিয়ে রাখুন — মাত্র দুই সেকেন্ড।",

    icon: "DatabaseBackup",

    sponsorLabel: "Khata Tips",
    sponsorLabelBn: "খাতা টিপস",

    accentColor: "#C9942F",
  },

  /*
   * NOTE: "tip-pin" and "tip-offline" retired to the future rotation
   * pool — 5 cards max so the carousel never feels cluttered.
   * Their line-art (public/banners/art-pin.svg, art-offline.svg)
   * stays in the repo for when rotation lands.
   */
];
