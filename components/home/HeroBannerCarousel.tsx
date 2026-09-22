"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLiveBanners } from "@/lib/shared/useLiveBanners";
import type { Banner } from "@/lib/banners";

const AUTOPLAY_MS = 4200;
const RESUME_AFTER_INTERACTION_MS = 4500;

export function HeroBannerCarousel() {
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
          <ImageBanner
            key={banner.id}
            banner={banner}
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

// A banner is just an image, full-bleed, 3:1. All copy/branding lives in
// the image itself (uploaded via /admin) — no title/subtitle/sponsor text
// overlay, deliberately, per the simplified banner design.
function ImageBanner({
  banner,
  refCallback,
}: {
  banner: Banner;
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
