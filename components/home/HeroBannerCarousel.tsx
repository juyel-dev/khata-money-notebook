"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Users, DatabaseBackup, Pin, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BANNERS, type Banner } from "@/lib/banners";
import { useI18n } from "@/lib/i18n";

const ICON_MAP: Record<NonNullable<Banner["icon"]>, LucideIcon> = {
  Users,
  DatabaseBackup,
  Pin,
  WifiOff,
};

const AUTOPLAY_MS = 3800;
const RESUME_AFTER_INTERACTION_MS = 4500;

export function HeroBannerCarousel() {
  const { locale } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedUntilRef = useRef(0);

  const banners = BANNERS;

  const scrollToIndex = useCallback((index: number) => {
    const card = cardRefs.current[index];
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  // Autoplay, looping back to the first card after the last.
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [banners.length, scrollToIndex]);

  const pauseAutoplay = () => {
    pausedUntilRef.current = Date.now() + RESUME_AFTER_INTERACTION_MS;
  };

  // Track which card is actually centered (from user swipes) so autoplay
  // resumes from the right place and the dots stay accurate.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = cardRefs.current.findIndex((el) => el === entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { root: track, threshold: [0.6] }
    );
    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [banners.length]);

  if (banners.length === 0) return null; // no configured banners — render nothing (per docs/SCREENS.md)

  return (
    <div className="mb-4">
      <div
        ref={trackRef}
        onTouchStart={pauseAutoplay}
        onPointerDown={pauseAutoplay}
        onScroll={pauseAutoplay}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-[3.5%] no-scrollbar"
        style={{ scrollPaddingLeft: "3.5%", scrollPaddingRight: "3.5%" }}
      >
        {banners.map((banner, i) => (
          <BannerCard
            key={banner.id}
            banner={banner}
            locale={locale}
            refCallback={(el) => {
              cardRefs.current[i] = el;
            }}
          />
        ))}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                pauseAutoplay();
                setActiveIndex(i);
                scrollToIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? "w-4 bg-accent" : "w-1.5 bg-rule"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerCard({
  banner,
  locale,
  refCallback,
}: {
  banner: Banner;
  locale: "en" | "bn";
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  const title = locale === "bn" ? banner.titleBn : banner.title;
  const subtitle = locale === "bn" ? banner.subtitleBn : banner.subtitle;
  const sponsorLabel = locale === "bn" ? banner.sponsorLabelBn : banner.sponsorLabel;
  const Icon = banner.icon ? ICON_MAP[banner.icon] : null;

  const handleClick = () => {
    if (banner.destinationUrl) {
      window.open(banner.destinationUrl, "_blank", "noopener,noreferrer");
    }
  };

  const clickable = banner.destinationUrl
    ? "cursor-pointer active:opacity-90"
    : "";

  // Photo banners (e.g. the maker's own banner) keep the legacy light look.
  if (banner.imageUrl) {
    return (
      <div
        ref={refCallback}
        onClick={banner.destinationUrl ? handleClick : undefined}
        role={banner.destinationUrl ? "button" : undefined}
        className={`snap-center shrink-0 w-[93%] rounded-2xl overflow-hidden flex items-stretch ${clickable}`}
        style={{ aspectRatio: "2.86 / 1", backgroundColor: `${banner.accentColor}17` }}
      >
        <div className="flex-1 min-w-0 flex flex-col justify-center pl-4 pr-2 py-2.5">
          {sponsorLabel && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wide mb-1 w-fit"
              style={{ color: banner.accentColor }}
            >
              {sponsorLabel}
            </span>
          )}
          <div className="text-sm font-bold text-ink leading-snug line-clamp-2">{title}</div>
          <div className="text-xs text-ink-dim leading-snug line-clamp-2 mt-0.5">{subtitle}</div>
        </div>

        <div className="shrink-0 w-[112px] flex items-center justify-center overflow-hidden">
          <Image
            src={banner.imageUrl}
            alt=""
            width={212}
            height={181}
            className="w-full h-full object-contain object-bottom"
            priority={false}
          />
        </div>
      </div>
    );
  }

  // Tip banners — ad-style gradient card with line-art.
  const gradientTo = shade(banner.accentColor, -48);

  return (
    <div
      ref={refCallback}
      onClick={banner.destinationUrl ? handleClick : undefined}
      role={banner.destinationUrl ? "button" : undefined}
      className={`snap-center shrink-0 w-[93%] rounded-2xl overflow-hidden relative flex items-stretch shadow-md ${clickable}`}
      style={{
        aspectRatio: "2.86 / 1",
        background: `linear-gradient(115deg, ${banner.accentColor} 0%, ${gradientTo} 100%)`,
      }}
    >
      {/* Decorative glow circles */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-44 h-44 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute right-24 -bottom-20 w-36 h-36 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 w-24 h-24 rounded-full bg-white/5" />

      <div className="relative flex-1 min-w-0 flex flex-col justify-center pl-4 pr-2 py-2.5">
        {sponsorLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest mb-1.5 w-fit px-2 py-0.5 rounded-full bg-white/20 text-white">
            {sponsorLabel}
          </span>
        )}
        <div className="text-[15px] font-extrabold text-white leading-snug line-clamp-2 drop-shadow-sm">{title}</div>
        <div className="text-xs text-white/85 leading-snug line-clamp-2 mt-1">{subtitle}</div>
      </div>

      <div className="relative shrink-0 w-[112px] flex items-center justify-center overflow-hidden">
        {banner.art ? (
          <Image
            src={banner.art}
            alt=""
            width={96}
            height={96}
            className="w-24 h-24 object-contain drop-shadow-lg"
            priority={false}
          />
        ) : Icon ? (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white/20 text-white">
            <Icon size={34} strokeWidth={1.75} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Darken a #rrggbb hex color by `amt` (0-255) for gradient end-stops. */
function shade(hex: string, amt: number): string {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (num & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
