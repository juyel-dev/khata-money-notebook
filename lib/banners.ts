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
  /** Local white line-art path, rendered on the ad-style gradient card. */
  art?: string;
  /** Lucide icon name, used when there's no photo/illustration for this banner. */
  icon?: "Users" | "DatabaseBackup" | "Pin" | "WifiOff";
  accentColor: string; // hex, matches the notebook color palette
  destinationUrl?: string;
  sponsorLabel?: string;
  sponsorLabelBn?: string;
}

export const BANNERS: Banner[] = [
  {
    id: "dev-feedback",
    title: "Got feedback?",
    titleBn: "কোনো মতামত আছে?",
    subtitle: "Khata is built and maintained by one developer — tell me what to fix or add.",
    subtitleBn: "খাতা একজন ডেভেলপার একাই বানাচ্ছেন — কী ঠিক করা বা যোগ করা দরকার, জানান।",
    imageUrl: "/banners/dev-photo.png",
    accentColor: "#2F6B4F",
    destinationUrl: "https://github.com/juyel-dev",
    sponsorLabel: "From the maker",
    sponsorLabelBn: "নির্মাতার পক্ষ থেকে",
  },
  {
    id: "tip-groups",
    title: "Keep things organized",
    titleBn: "গুছিয়ে রাখুন",
    subtitle: "Group your notebooks — shop, family, personal — all in one place.",
    subtitleBn: "দোকান, পরিবার, ব্যক্তিগত — সব খাতা গ্রুপ করে রাখুন এক জায়গায়।",
    art: "/banners/art-groups.svg",
    icon: "Users",
    sponsorLabel: "Khata Tips",
    sponsorLabelBn: "খাতা টিপস",
    accentColor: "#2F5E8F",
  },
  {
    id: "tip-backup",
    title: "Don't lose your data",
    titleBn: "ডেটা হারাবেন না",
    subtitle: "Export a backup anytime from Settings — takes two seconds.",
    subtitleBn: "Settings থেকে যেকোনো সময় ব্যাকআপ নিয়ে রাখুন — মাত্র দুই সেকেন্ড।",
    art: "/banners/art-backup.svg",
    icon: "DatabaseBackup",
    sponsorLabel: "Khata Tips",
    sponsorLabelBn: "খাতা টিপস",
    accentColor: "#C9942F",
  },
  {
    id: "tip-pin",
    title: "Pin your favorite",
    titleBn: "প্রিয় খাতা পিন করুন",
    subtitle: "Keep your most-used notebook right at the top.",
    subtitleBn: "সবচেয়ে বেশি ব্যবহার করা খাতাটা রাখুন একদম উপরে।",
    art: "/banners/art-pin.svg",
    icon: "Pin",
    sponsorLabel: "Khata Tips",
    sponsorLabelBn: "খাতা টিপস",
    accentColor: "#B4491F",
  },
  {
    id: "tip-offline",
    title: "Works without internet",
    titleBn: "ইন্টারনেট ছাড়াই চলে",
    subtitle: "No signal? No problem — Khata works fully offline.",
    subtitleBn: "নেটওয়ার্ক না থাকলেও সমস্যা নেই — খাতা সম্পূর্ণ অফলাইনে কাজ করে।",
    art: "/banners/art-offline.svg",
    icon: "WifiOff",
    sponsorLabel: "Khata Tips",
    sponsorLabelBn: "খাতা টিপস",
    accentColor: "#2F8F82",
  },
];
