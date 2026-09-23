"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowUpRight,
  BadgePercent,
  DatabaseBackup,
  Pin,
  Smartphone,
  Users,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useLiveBanners } from "@/lib/shared/useLiveBanners";
import { useI18n } from "@/lib/i18n";
import type { Banner } from "@/lib/banners";

const ICON_MAP: Record<NonNullable<Banner["icon"]>, LucideIcon> = {
  Users,
  DatabaseBackup,
  Pin,
  WifiOff,
  Smartphone,
  BadgePercent,
};

const AUTOPLAY_MS = 4200;
const RESUME_AFTER_INTERACTION_MS = 4500;

export function HeroBannerCarousel() {
  const { locale } = useI18n();

  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const pausedUntilRef = useRef(0);

  const banners = useLiveBanners();

  const scrollToIndex = useCallback((index: number) => {
    const card = cardRefs.current[index];

    if (!card) return;

    card.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  /*
   * ------------------------------------------------------------
   * AUTOPLAY
   * ------------------------------------------------------------
   */
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

  /*
   * ------------------------------------------------------------
   * DETECT CURRENT SLIDE
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const track = trackRef.current;

    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = cardRefs.current.findIndex((el) => el === entry.target);

            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        }
      },
      {
        root: track,
        threshold: [0.6],
      }
    );

    cardRefs.current.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [banners.length]);

  if (!banners.length) return null; // unreachable while BANNERS is non-empty; kept as a safety net

  return (
    <div className="mb-4">
      <div
        ref={trackRef}
        onTouchStart={pauseAutoplay}
        onPointerDown={pauseAutoplay}
        onScroll={pauseAutoplay}
        className="
          flex
          gap-3
          overflow-x-auto
          snap-x
          snap-mandatory
          px-[3.5%]
          no-scrollbar
        "
        style={{
          scrollPaddingLeft: "3.5%",
          scrollPaddingRight: "3.5%",
        }}
      >
        {banners.map((banner, index) => {
          const refCallback = (element: HTMLDivElement | null) => {
            cardRefs.current[index] = element;
          };

          // Admin/live banners are image-only (no title) — full-bleed 3:1.
          // Hardcoded fallback banners carry presentation fields — plain card.
          return banner.title ? (
            <FallbackBanner
              key={banner.id}
              banner={banner}
              locale={locale}
              refCallback={refCallback}
            />
          ) : (
            <ImageBanner key={banner.id} banner={banner} refCallback={refCallback} />
          );
        })}
      </div>

      {banners.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => {
                pauseAutoplay();
                setActiveIndex(index);
                scrollToIndex(index);
              }}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${index === activeIndex ? "w-4 bg-accent" : "w-1.5 bg-rule"}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Admin-supplied banner: just an image, full-bleed 3:1. Copy/branding
// lives inside the image — no overlay text, per the admin data model.
function ImageBanner({
  banner,
  refCallback,
}: {
  banner: Banner;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  if (!banner.imageUrl) return null;

  const open = () => {
    if (!banner.destinationUrl) return;
    window.open(banner.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      ref={refCallback}
      onClick={banner.destinationUrl ? open : undefined}
      role={banner.destinationUrl ? "button" : undefined}
      className={`snap-center shrink-0 w-[93%] rounded-2xl overflow-hidden bg-rule ${
        banner.destinationUrl ? "cursor-pointer active:opacity-90" : ""
      }`}
      style={{ aspectRatio: "3 / 1" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied
          image URLs (Drive, imgbb, any host) can't be pre-allowlisted for
          next/image's domain restriction, and re-hosting them isn't worth
          the complexity for a simple ad banner. */}
      <img
        src={banner.imageUrl}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

// Hardcoded fallback banner — one normal style for all five (no per-id
// fancy variants). Flat accent tint, text left, photo/icon right.
function FallbackBanner({
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
  const cta = locale === "bn" ? banner.ctaBn : banner.cta;
  const accent = banner.accentColor ?? "#2F6B4F";
  const Icon = banner.icon ? ICON_MAP[banner.icon] : null;

  const open = () => {
    if (!banner.destinationUrl) return;

    if (banner.destinationUrl.startsWith("/")) {
      window.location.href = banner.destinationUrl;
      return;
    }

    window.open(banner.destinationUrl, "_blank", "noopener,noreferrer");
  };

  const clickable = !!banner.destinationUrl;

  return (
    <div
      ref={refCallback}
      onClick={clickable ? open : undefined}
      role={clickable ? "button" : undefined}
      className={`snap-center shrink-0 w-[93%] rounded-2xl overflow-hidden flex items-stretch ${
        clickable ? "cursor-pointer active:opacity-90" : ""
      }`}
      style={{ aspectRatio: "3 / 1", backgroundColor: `${accent}17` }}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center pl-4 pr-2 py-2.5">
        {sponsorLabel && (
          <span
            className={`mb-1 w-fit text-[10px] font-semibold uppercase ${
              locale === "en" ? "tracking-wide" : ""
            }`}
            style={{ color: accent }}
          >
            {sponsorLabel}
          </span>
        )}
        <div className="text-sm font-bold text-ink leading-snug line-clamp-2">
          {title}
        </div>
        <div className="text-xs text-ink-dim leading-snug line-clamp-2 mt-0.5">
          {subtitle}
        </div>
        {cta && clickable && (
          <span
            className="mt-1.5 inline-flex w-fit items-center gap-1 text-[10px] font-bold"
            style={{ color: accent }}
          >
            {cta}
            <ArrowUpRight size={11} />
          </span>
        )}
      </div>

      <div className="shrink-0 w-[104px] flex items-center justify-center overflow-hidden">
        {banner.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- local
             fallback asset under /public, no domain config needed */
          <img
            src={banner.imageUrl}
            alt=""
            className="w-full h-full object-contain object-bottom"
            loading="lazy"
          />
        ) : Icon ? (
          <Icon size={36} strokeWidth={1.7} style={{ color: accent }} />
        ) : null}
      </div>
    </div>
  );
}
