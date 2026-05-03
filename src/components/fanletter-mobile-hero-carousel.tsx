"use client";

import { useEffect, useMemo, useState } from "react";

type FanletterMobileHeroSlide = {
  authorName: string;
  coverImageUrl: string | null;
  title: string;
  videoUrl: string;
};

const SLIDE_INTERVAL_MS = 7000;

export function FanletterMobileHeroCarousel({
  slides,
}: {
  slides: FanletterMobileHeroSlide[];
}) {
  const playableSlides = useMemo(
    () => slides.filter((slide) => slide.videoUrl.trim().length > 0).slice(0, 3),
    [slides],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [canAutoAdvance, setCanAutoAdvance] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      setCanAutoAdvance(!mediaQuery.matches);
    };

    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);

    return () => {
      mediaQuery.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!canAutoAdvance || playableSlides.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % playableSlides.length);
    }, SLIDE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [canAutoAdvance, playableSlides.length]);

  if (playableSlides.length === 0) {
    return null;
  }

  const activeSlide = playableSlides[activeIndex] ?? playableSlides[0];

  return (
    <div className="absolute inset-0 lg:hidden">
      <video
        aria-hidden="true"
        autoPlay
        className="absolute inset-0 h-full w-full scale-[1.04] object-cover object-center opacity-100 saturate-[1.12]"
        key={activeSlide.videoUrl}
        loop
        muted
        playsInline
        poster={activeSlide.coverImageUrl ?? undefined}
        preload="metadata"
        src={activeSlide.videoUrl}
      />
    </div>
  );
}
