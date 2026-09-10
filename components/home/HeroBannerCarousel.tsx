"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import {
  ArrowUpRight,
  BadgePercent,
  DatabaseBackup,
  ExternalLink,
  Pin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  WifiOff,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { BANNERS, type Banner } from "@/lib/banners";
import { useI18n } from "@/lib/i18n";

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

  const banners = BANNERS;

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

  if (!banners.length) return null; // no configured banners — render nothing (per docs/SCREENS.md)

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
        {banners.map((banner, index) => (
          <BannerCard
            key={banner.id}
            banner={banner}
            locale={locale}
            refCallback={(element) => {
              cardRefs.current[index] = element;
            }}
          />
        ))}
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
  const cta = locale === "bn" ? banner.ctaBn : banner.cta;

  /*
   * ------------------------------------------------------------
   * FIRST BANNER — photo banner keeps its own visual language.
   * ------------------------------------------------------------
   */
  if (banner.imageUrl) {
    return (
      <PhotoBanner
        banner={banner}
        title={title}
        subtitle={subtitle}
        sponsorLabel={sponsorLabel}
        refCallback={refCallback}
      />
    );
  }

  /*
   * ------------------------------------------------------------
   * SECOND BANNER — PRODUCT PROMO
   * ------------------------------------------------------------
   */
  if (banner.id === "promo-khata") {
    return (
      <ProductPromoBanner
        banner={banner}
        title={title}
        subtitle={subtitle}
        sponsorLabel={sponsorLabel}
        cta={cta}
        locale={locale}
        refCallback={refCallback}
      />
    );
  }

  /*
   * ------------------------------------------------------------
   * THIRD BANNER — AFFILIATE / PARTNER
   * ------------------------------------------------------------
   */
  if (banner.id === "partner-pick") {
    return (
      <PartnerBanner
        banner={banner}
        title={title}
        subtitle={subtitle}
        sponsorLabel={sponsorLabel}
        cta={cta}
        locale={locale}
        refCallback={refCallback}
      />
    );
  }

  /*
   * ------------------------------------------------------------
   * NORMAL PRODUCT TIP BANNERS
   * ------------------------------------------------------------
   */
  return (
    <TipBanner
      banner={banner}
      title={title}
      subtitle={subtitle}
      sponsorLabel={sponsorLabel}
      refCallback={refCallback}
      locale={locale}
    />
  );
}

/* ================================================================
 * FIRST — PHOTO BANNER (legacy look, intentionally unchanged)
 * ================================================================ */

function PhotoBanner({
  banner,
  title,
  subtitle,
  sponsorLabel,
  refCallback,
}: {
  banner: Banner;
  title: string;
  subtitle: string;
  sponsorLabel?: string;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  const open = () => {
    if (!banner.destinationUrl) return;
    window.open(banner.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      ref={refCallback}
      onClick={banner.destinationUrl ? open : undefined}
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
        <Image
          src={banner.imageUrl!}
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

/* ================================================================
 * SECOND — KHATA PRODUCT PROMO
 * ================================================================ */

function ProductPromoBanner({
  banner,
  title,
  subtitle,
  sponsorLabel,
  cta,
  locale,
  refCallback,
}: {
  banner: Banner;
  title: string;
  subtitle: string;
  sponsorLabel?: string;
  cta?: string;
  locale: "en" | "bn";
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  const Icon = banner.icon ? ICON_MAP[banner.icon] : Smartphone;

  const open = () => {
    if (!banner.destinationUrl) return;

    if (banner.destinationUrl.startsWith("/")) {
      window.location.href = banner.destinationUrl;
      return;
    }

    window.open(banner.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      ref={refCallback}
      onClick={open}
      role="button"
      className="
        group
        relative
        snap-center
        shrink-0
        w-[93%]
        overflow-hidden
        rounded-[22px]
        border
        border-[#0B6A4C]/20
        cursor-pointer
        active:scale-[0.99]
        transition-transform
        shadow-[0_11px_28px_rgba(7,91,66,0.16)]
      "
      style={{
        aspectRatio: "2.86 / 1",
        background: "linear-gradient(118deg,#063F30 0%,#075B42 48%,#0C7656 100%)",
      }}
    >
      {/* background glow */}
      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          -right-16
          -top-16
          h-48
          w-48
          rounded-full
          bg-white/[0.07]
        "
      />

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          right-12
          -bottom-20
          h-40
          w-40
          rounded-full
          border
          border-white/10
        "
      />

      {/* Gold accent line */}
      <div
        aria-hidden
        className="
          absolute
          bottom-0
          left-0
          right-0
          h-[4px]
          bg-gradient-to-r
          from-transparent
          via-[#E0B84F]
          to-white/50
        "
      />

      <div className="relative flex h-full">
        <div className="min-w-0 flex-1 flex flex-col justify-center px-4 py-2.5">
          {sponsorLabel && (
            <span
              className={`
                mb-1.5
                inline-flex
                w-fit
                items-center
                gap-1
                rounded-full
                border
                border-white/10
                bg-white/[0.12]
                px-2.5
                py-1
                text-[9px]
                font-bold
                uppercase
                text-white
                ${locale === "bn" ? "" : "tracking-[0.08em]"}
              `}
            >
              <Sparkles size={9} />
              {sponsorLabel}
            </span>
          )}

          <div className="
            max-w-[88%]
            line-clamp-2
            text-[16px]
            font-extrabold
            leading-[1.2]
            tracking-[-0.02em]
            text-white
          ">
            {title}
          </div>

          <div className="
            mt-1
            max-w-[90%]
            line-clamp-2
            text-[11px]
            leading-[1.35]
            text-white/75
          ">
            {subtitle}
          </div>

          {cta && (
            <span className="
              mt-2
              inline-flex
              w-fit
              items-center
              gap-1
              text-[10px]
              font-bold
              text-[#E6C56A]
            ">
              {cta}
              <ArrowUpRight size={11} />
            </span>
          )}
        </div>

        <div className="relative w-[116px] shrink-0 flex items-center justify-center">
          <div
            aria-hidden
            className="
              absolute
              h-[91px]
              w-[91px]
              rounded-full
              border
              border-white/10
              bg-white/[0.05]
            "
          />

          <div
            aria-hidden
            className="
              absolute
              h-[70px]
              w-[70px]
              rounded-full
              border
              border-white/10
            "
          />

          <div className="
            relative
            flex
            h-[60px]
            w-[60px]
            items-center
            justify-center
            rounded-[20px]
            border
            border-white/10
            bg-white/[0.14]
            text-white
            backdrop-blur-sm
            shadow-[0_10px_24px_rgba(0,0,0,0.12)]
            transition-transform
            duration-300
            group-hover:scale-105
          ">
            <Icon size={31} strokeWidth={1.7} />
          </div>

          <span
            aria-hidden
            className="
              absolute
              right-[14px]
              top-[16px]
              h-2
              w-2
              rounded-full
              bg-[#E6C56A]
              shadow-[0_0_10px_rgba(230,197,106,0.75)]
            "
          />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 * THIRD — PARTNER / AFFILIATE
 * ================================================================ */

function PartnerBanner({
  banner,
  title,
  subtitle,
  sponsorLabel,
  cta,
  locale,
  refCallback,
}: {
  banner: Banner;
  title: string;
  subtitle: string;
  sponsorLabel?: string;
  cta?: string;
  locale: "en" | "bn";
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  const Icon = banner.icon ? ICON_MAP[banner.icon] : BadgePercent;
  const clickable = !!banner.destinationUrl;

  const open = () => {
    if (!banner.destinationUrl) return;
    window.open(banner.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      ref={refCallback}
      onClick={clickable ? open : undefined}
      role={clickable ? "button" : undefined}
      className={`
        group
        relative
        snap-center
        shrink-0
        w-[93%]
        overflow-hidden
        rounded-[22px]
        transition-transform
        border
        border-[#C99A32]/25
        bg-[#F7F0DF]
        shadow-[0_9px_22px_rgba(94,69,25,0.10)]
        ${clickable ? "cursor-pointer active:scale-[0.99]" : ""}
      `}
      style={{
        aspectRatio: "2.86 / 1",
      }}
    >
      {/* faint pattern */}
      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          right-[-35px]
          top-[-35px]
          h-[135px]
          w-[135px]
          rounded-full
          border
          border-[#C99A32]/15
        "
      />

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          right-[-8px]
          bottom-[-42px]
          h-[110px]
          w-[110px]
          rounded-full
          border
          border-[#C99A32]/10
        "
      />

      <div
        aria-hidden
        className="
          absolute
          left-0
          top-0
          bottom-0
          w-[5px]
          bg-gradient-to-b
          from-[#B57C1D]
          via-[#D4A541]
          to-[#8A5A18]
        "
      />

      <div className="relative flex h-full">
        <div className="min-w-0 flex-1 flex flex-col justify-center pl-5 pr-2.5 py-2.5">
          {sponsorLabel && (
            <div className="
              mb-1.5
              flex
              items-center
              gap-1.5
            ">
              <span className={`
                rounded-full
                bg-[#8A5A18]/10
                px-2.5
                py-1
                text-[9px]
                font-bold
                uppercase
                text-[#7A5115]
                ${locale === "bn" ? "" : "tracking-[0.08em]"}
              `}>
                {sponsorLabel}
              </span>

              <ExternalLink
                size={10}
                className="text-[#8A5A18]/60"
              />
            </div>
          )}

          <div className="
            max-w-[88%]
            line-clamp-2
            text-[15px]
            font-extrabold
            leading-[1.2]
            tracking-[-0.015em]
            text-[#3F3019]
          ">
            {title}
          </div>

          <div className="
            mt-1
            max-w-[90%]
            line-clamp-2
            text-[11px]
            leading-[1.35]
            text-[#75664D]
          ">
            {subtitle}
          </div>

          {cta && clickable && (
            <span className="
              mt-2
              inline-flex
              w-fit
              items-center
              gap-1
              text-[10px]
              font-bold
              text-[#8A5A18]
            ">
              {cta}
              <ArrowUpRight size={11} />
            </span>
          )}
        </div>

        <div className="relative w-[116px] shrink-0 flex items-center justify-center">
          <div className="
            absolute
            h-[83px]
            w-[83px]
            rounded-[28px]
            rotate-[8deg]
            border
            border-[#C99A32]/20
            bg-[#C99A32]/10
          " />

          <div className="
            relative
            flex
            h-[57px]
            w-[57px]
            items-center
            justify-center
            rounded-[18px]
            bg-[#8A5A18]
            text-[#FFF8E8]
            shadow-[0_9px_18px_rgba(138,90,24,0.22)]
            transition-transform
            duration-300
            group-hover:scale-105
          ">
            <Icon size={29} strokeWidth={1.8} />
          </div>

          <span className="
            absolute
            right-[18px]
            top-[18px]
            h-2
            w-2
            rounded-full
            bg-[#C99A32]
          " />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 * FOURTH + FIFTH — PRODUCT TIPS
 * ================================================================ */

function TipBanner({
  banner,
  title,
  subtitle,
  sponsorLabel,
  refCallback,
  locale,
}: {
  banner: Banner;
  title: string;
  subtitle: string;
  sponsorLabel?: string;
  refCallback: (el: HTMLDivElement | null) => void;
  locale: "en" | "bn";
}) {
  const Icon = banner.icon ? ICON_MAP[banner.icon] : Users;

  const gradientTo = shade(banner.accentColor, -52);

  return (
    <div
      ref={refCallback}
      className="
        relative
        snap-center
        shrink-0
        w-[93%]
        overflow-hidden
        rounded-[22px]
        shadow-[0_9px_24px_rgba(36,31,22,0.10)]
      "
      style={{
        aspectRatio: "2.86 / 1",
        background: `linear-gradient(115deg, ${banner.accentColor} 0%, ${gradientTo} 100%)`,
      }}
    >
      {/* decorative glow */}
      <div
        aria-hidden
        className="
          absolute
          -right-14
          -top-16
          h-44
          w-44
          rounded-full
          bg-white/[0.08]
        "
      />

      <div
        aria-hidden
        className="
          absolute
          right-24
          -bottom-20
          h-36
          w-36
          rounded-full
          bg-white/[0.06]
        "
      />

      <div className="relative flex h-full">
        <div className="min-w-0 flex-1 flex flex-col justify-center px-4 py-2.5">
          {sponsorLabel && (
            <span className="
              mb-1.5
              w-fit
              rounded-full
              border
              border-white/10
              bg-white/[0.13]
              px-2.5
              py-1
              text-[9px]
              font-bold
              uppercase
              text-white
            ">
              {sponsorLabel}
            </span>
          )}

          <div className="
            max-w-[90%]
            line-clamp-2
            text-[15px]
            font-extrabold
            leading-[1.2]
            text-white
          ">
            {title}
          </div>

          <div className="
            mt-1
            max-w-[91%]
            line-clamp-2
            text-[11px]
            leading-[1.35]
            text-white/78
          ">
            {subtitle}
          </div>

          <span className="
            mt-2
            inline-flex
            w-fit
            items-center
            gap-1
            text-[10px]
            font-semibold
            text-white/90
          ">
            {banner.id === "tip-backup" ? (
              <>
                <ShieldCheck size={11} />
                {locale === "bn" ? "নিরাপদ রাখুন" : "Safe & secure"}
              </>
            ) : (
              <>
                <Sparkles size={11} />
                {locale === "bn" ? "সহজভাবে ব্যবহার করুন" : "Keep it simple"}
              </>
            )}
          </span>
        </div>

        <div className="relative w-[112px] shrink-0 flex items-center justify-center">
          <div className="
            absolute
            h-[88px]
            w-[88px]
            rounded-full
            border
            border-white/10
            bg-white/[0.06]
          " />

          <div className="
            absolute
            h-[65px]
            w-[65px]
            rounded-full
            border
            border-white/10
          " />

          <div className="
            relative
            flex
            h-[58px]
            w-[58px]
            items-center
            justify-center
            rounded-[19px]
            bg-white/[0.15]
            text-white
            backdrop-blur-sm
          ">
            <Icon size={29} strokeWidth={1.75} />
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="
          absolute
          bottom-0
          left-0
          right-0
          h-[4px]
          bg-gradient-to-r
          from-transparent
          via-white/40
          to-white/75
        "
      />
    </div>
  );
}

/* ================================================================
 * COLOR HELPER
 * ================================================================ */

function shade(hex: string, amt: number): string {
  const n = hex.replace("#", "");

  const full =
    n.length === 3
      ? n
          .split("")
          .map((c) => c + c)
          .join("")
      : n;

  const num = parseInt(full, 16);

  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (num & 255) + amt));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
