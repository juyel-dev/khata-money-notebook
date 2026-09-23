// Banner data has two sources, in priority order:
//
// 1. Live Firestore — active admin banners from /admin (image + optional
//    link only; see docs/ADMIN.md). When any exist, they replace this
//    list entirely on the home screen.
// 2. This hardcoded array — offline / first-launch / empty-admin fallback.
//    Rendered with the plain FallbackBanner card in HeroBannerCarousel
//    (flat accent tint, text left, photo/icon right — no fancy variants).
//
// Fallback-only fields (title, icon, accentColor, …) never reach Firestore:
// firestore.rules validBanner() rejects any write with extra keys, so the
// admin data model stays image-only regardless of what lives here.
export interface Banner {
  id: string;

  /** Live/admin banners always set this (Firestore requires it). Icon-only fallbacks omit it. */
  imageUrl?: string;
  destinationUrl?: string;
  order: number;
  active: boolean;

  // —— fallback-only presentation fields (local, never written) ——
  title?: string;
  titleBn?: string;
  subtitle?: string;
  subtitleBn?: string;
  icon?:
    | "Users"
    | "DatabaseBackup"
    | "Pin"
    | "WifiOff"
    | "Smartphone"
    | "BadgePercent";
  accentColor?: string;
  sponsorLabel?: string;
  sponsorLabelBn?: string;
  cta?: string;
  ctaBn?: string;
}

export const BANNERS: Banner[] = [
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
    order: 0,
    active: true,
  },
  {
    id: "promo-khata",
    title: "Your money. Your Khata.",
    titleBn: "আপনার হিসাব, আপনার খাতা।",
    subtitle:
      "Keep transactions, notebooks and everyday money records organized — simple, fast and offline.",
    subtitleBn:
      "লেনদেন, খাতা আর দৈনন্দিন হিসাব — সবকিছু সহজে, দ্রুত এবং অফলাইনে গুছিয়ে রাখুন।",
    icon: "Smartphone",
    accentColor: "#075B42",
    destinationUrl: "/about",
    sponsorLabel: "Khata",
    sponsorLabelBn: "খাতা",
    cta: "Learn about Khata",
    ctaBn: "খাতা সম্পর্কে",
    order: 10,
    active: true,
  },
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
    order: 20,
    active: true,
  },
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
    order: 30,
    active: true,
  },
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
    order: 40,
    active: true,
  },
];
