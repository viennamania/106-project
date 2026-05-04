"use client";

import { useEffect, useMemo, useState } from "react";

type FanletterHeroSlide = {
  authorName: string;
  coverImageUrl: string | null;
  title: string;
  videoUrl: string;
};

const SLIDE_INTERVAL_MS = 7000;

function useHeroSlides(slides: FanletterHeroSlide[]) {
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

  return {
    activeIndex,
    activeSlide: playableSlides[activeIndex] ?? playableSlides[0] ?? null,
    playableSlides,
  };
}

export function FanletterMobileHeroCarousel({
  slides,
}: {
  slides: FanletterHeroSlide[];
}) {
  const { activeSlide, playableSlides } = useHeroSlides(slides);

  if (playableSlides.length === 0) {
    return null;
  }

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

export function FanletterDesktopHeroCardCarousel({
  slides,
}: {
  slides: FanletterHeroSlide[];
}) {
  const { activeIndex, activeSlide, playableSlides } = useHeroSlides(slides);

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[22rem] overflow-hidden rounded-lg border border-white/14 bg-[#07100b] shadow-[0_34px_90px_rgba(0,0,0,0.42)]">
      {activeSlide ? (
        <>
          <video
            aria-hidden="true"
            autoPlay
            className="absolute inset-0 h-full w-full object-cover object-center"
            key={activeSlide.videoUrl}
            loop
            muted
            playsInline
            poster={activeSlide.coverImageUrl ?? undefined}
            preload="metadata"
            src={activeSlide.videoUrl}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.06)_48%,rgba(0,0,0,0.62)_100%)]" />
          {playableSlides.length > 1 ? (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/16 bg-black/42 px-2.5 py-2 backdrop-blur-md">
              <span className="text-[0.62rem] font-semibold tabular-nums text-white/72">
                {activeIndex + 1}/{playableSlides.length}
              </span>
              <div className="flex items-center gap-1.5">
                {playableSlides.map((slide, index) => (
                  <span
                    aria-hidden="true"
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeIndex ? "w-5 bg-[#44f26e]" : "w-1.5 bg-white/36"
                    }`}
                    key={`${slide.videoUrl}:${index}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="truncate text-sm font-semibold text-white">
              {activeSlide.authorName}
            </p>
            <p className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-white">
              {activeSlide.title}
            </p>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(68,242,110,0.22),transparent_34%),linear-gradient(160deg,#07100b,#030504)]" />
      )}
    </div>
  );
}
