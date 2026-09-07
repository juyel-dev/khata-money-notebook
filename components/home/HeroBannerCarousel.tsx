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

  return (
    <div
      ref={refCallback}
      onClick={banner.destinationUrl ? handleClick : undefined}
      role={banner.destinationUrl ? "button" : undefined}
      className={`snap-center shrink-0 w-[93%] rounded-2xl overflow-hidden flex items-stretch ${
        banner.destinationUrl ? "cursor-pointer active:opacity-90" : ""
      }`}
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
        {banner.imageUrl ? (
          <Image
            src={banner.imageUrl}
            alt=""
            width={212}
            height={181}
            className="w-full h-full object-contain object-bottom"
            priority={false}
          />
        ) : Icon ? (
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${banner.accentColor}22`, color: banner.accentColor }}
          >
            <Icon size={34} strokeWidth={1.75} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
