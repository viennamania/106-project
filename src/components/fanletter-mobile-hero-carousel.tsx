"use client";

import { useEffect, useMemo, useState } from "react";

type FanletterHeroSlide = {
  authorName: string;
  coverImageUrl: string | null;
  title: string;
  videoUrl: string;
};

export type FanletterVlogPreviewSlide = FanletterHeroSlide & {
  authorAvatarImageUrl: string | null;
  badgeLabel: string;
  ctaLabel: string;
  href: string;
  signalLabel: string;
};

type HeroSlidesOptions = {
  maxSlides?: number;
  randomizeOnMount?: boolean;
};

const SLIDE_INTERVAL_MS = 7000;
const DEFAULT_MAX_SLIDES = 3;
const MOBILE_BACKGROUND_MAX_SLIDES = 3;

function getRandomSlideIndex(length: number) {
  if (length < 2) {
    return 0;
  }

  const cryptoApi = globalThis.crypto;

  if (cryptoApi) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);

    return values[0] % length;
  }

  return Math.floor(Math.random() * length);
}

function getAuthorInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "A";
}

function useHeroSlides<T extends FanletterHeroSlide>(
  slides: T[],
  options: HeroSlidesOptions = {},
) {
  const {
    maxSlides = DEFAULT_MAX_SLIDES,
    randomizeOnMount = false,
  } = options;
  const playableSlides = useMemo(
    () =>
      slides
        .filter((slide) => slide.videoUrl.trim().length > 0)
        .slice(0, maxSlides),
    [maxSlides, slides],
  );
  const slideSignature = useMemo(
    () => playableSlides.map((slide) => slide.videoUrl).join("|"),
    [playableSlides],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [canAutoAdvance, setCanAutoAdvance] = useState(false);
  const resolvedActiveIndex =
    playableSlides.length > 0 ? activeIndex % playableSlides.length : 0;

  useEffect(() => {
    if (!randomizeOnMount || playableSlides.length < 2) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveIndex(getRandomSlideIndex(playableSlides.length));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [playableSlides.length, randomizeOnMount, slideSignature]);

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
    activeIndex: resolvedActiveIndex,
    activeSlide:
      playableSlides[resolvedActiveIndex] ?? playableSlides[0] ?? null,
    playableSlides,
    setActiveIndex,
  };
}

function useDesktopViewport() {
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopViewport = () => {
      setIsDesktopViewport(mediaQuery.matches);
    };

    syncDesktopViewport();
    mediaQuery.addEventListener("change", syncDesktopViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncDesktopViewport);
    };
  }, []);

  return isDesktopViewport;
}

export function FanletterHeroBackgroundCarousel({
  mobileLayout = "full",
  randomizeOnMount = false,
  showMobilePreviews = false,
  slides,
}: {
  mobileLayout?: "full" | "immersive" | "lower-panel";
  randomizeOnMount?: boolean;
  showMobilePreviews?: boolean;
  slides: FanletterHeroSlide[];
}) {
  const { activeIndex, activeSlide, playableSlides } = useHeroSlides(slides, {
    maxSlides: MOBILE_BACKGROUND_MAX_SLIDES,
    randomizeOnMount,
  });

  if (playableSlides.length === 0) {
    return null;
  }

  const videoClassName =
    mobileLayout === "lower-panel"
      ? "absolute inset-x-0 bottom-0 h-[54%] w-full object-cover object-center opacity-[0.86] brightness-[0.9] contrast-[1.06] saturate-[1.14] [mask-image:linear-gradient(180deg,transparent_0%,black_22%,black_100%)] sm:inset-0 sm:h-full sm:scale-[1.04] sm:object-cover sm:opacity-[0.94] sm:brightness-[0.96] sm:contrast-[1.06] sm:saturate-[1.16] sm:[mask-image:none] lg:opacity-[0.62] lg:brightness-[0.88]"
      : mobileLayout === "immersive"
        ? "absolute inset-0 h-full w-full object-cover object-[50%_26%] opacity-[0.9] brightness-[0.92] contrast-[1.08] saturate-[1.14] sm:scale-[1.04] sm:object-cover sm:object-center sm:opacity-[0.94] sm:brightness-[0.96] sm:contrast-[1.06] sm:saturate-[1.16] lg:opacity-[0.62] lg:brightness-[0.88]"
      : "absolute inset-0 h-full w-full object-contain object-center opacity-[0.92] brightness-[0.98] contrast-[1.04] saturate-[1.12] sm:scale-[1.04] sm:object-cover sm:opacity-[0.94] sm:brightness-[0.96] sm:contrast-[1.06] sm:saturate-[1.16] lg:opacity-[0.62] lg:brightness-[0.88]";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        aria-hidden="true"
        autoPlay
        className={videoClassName}
        key={activeSlide.videoUrl}
        loop
        muted
        playsInline
        poster={activeSlide.coverImageUrl ?? undefined}
        preload="metadata"
        src={activeSlide.videoUrl}
      />
      {showMobilePreviews && playableSlides.length > 1 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-[calc(env(safe-area-inset-top)+13.25rem)] z-[2] flex flex-col gap-1.5 sm:hidden"
        >
          {playableSlides.slice(0, 4).map((slide, index) => (
            <span
              className={`block size-9 overflow-hidden rounded-lg border bg-white/72 bg-cover bg-center shadow-[0_10px_26px_rgba(88,28,135,0.18)] backdrop-blur transition ${
                index === activeIndex
                  ? "border-white opacity-100 ring-2 ring-violet-400/42"
                  : "border-white/62 opacity-62"
              }`}
              key={`${slide.videoUrl}:${index}`}
              style={
                slide.coverImageUrl
                  ? { backgroundImage: `url(${slide.coverImageUrl})` }
                  : undefined
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FanletterDesktopHeroCardCarousel({
  slides,
}: {
  slides: FanletterHeroSlide[];
}) {
  const isDesktopViewport = useDesktopViewport();

  if (!isDesktopViewport) {
    return null;
  }

  return <FanletterDesktopHeroCardCarouselInner slides={slides} />;
}

function FanletterDesktopHeroCardCarouselInner({
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

export function FanletterVlogPreviewCarousel({
  className,
  slides,
}: {
  className?: string;
  slides: FanletterVlogPreviewSlide[];
}) {
  const { activeIndex, activeSlide, playableSlides, setActiveIndex } =
    useHeroSlides(slides, {
      maxSlides: 3,
    });

  if (!activeSlide || playableSlides.length === 0) {
    return null;
  }

  const activeProfileImageUrl =
    activeSlide.authorAvatarImageUrl ?? activeSlide.coverImageUrl;

  return (
    <div
      className={[
        "group relative min-h-[16rem] min-w-0 max-w-full overflow-hidden rounded-[1.15rem] bg-[#12041f] shadow-[0_22px_54px_rgba(20,4,31,0.18)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <a
        aria-label={`${activeSlide.badgeLabel}: ${activeSlide.authorName}`}
        className="absolute inset-0 z-[1] block min-w-0 max-w-full overflow-hidden"
        href={activeSlide.href}
      >
        <span className="sr-only">
          {activeSlide.badgeLabel}: {activeSlide.authorName}
        </span>
      </a>
        {activeSlide.coverImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45 blur-xl"
            style={{ backgroundImage: `url(${activeSlide.coverImageUrl})` }}
          />
        ) : null}
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 h-full w-full object-cover opacity-95 transition duration-500 group-hover:scale-[1.03]"
          key={activeSlide.videoUrl}
          loop
          muted
          playsInline
          poster={activeSlide.coverImageUrl ?? undefined}
          preload="metadata"
          src={activeSlide.videoUrl}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,4,31,0.04)_0%,rgba(18,4,31,0.16)_38%,rgba(18,4,31,0.9)_100%)]" />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-[0.62rem] font-semibold text-[#6d28d9] shadow-[0_10px_22px_rgba(18,4,31,0.16)]">
          {activeSlide.badgeLabel}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/36 px-2.5 py-1 text-[0.62rem] font-semibold text-white/86 backdrop-blur">
          {activeIndex + 1}/{playableSlides.length}
        </div>
        <div className="absolute left-3 top-12 flex items-center gap-2 rounded-2xl border border-white/24 bg-black/28 p-1.5 pr-3 shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-md">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-[1.05rem] border border-white/54 bg-white/18 bg-cover bg-center text-base font-semibold text-white ring-2 ring-white/18"
            style={
              activeProfileImageUrl
                ? { backgroundImage: `url(${activeProfileImageUrl})` }
                : undefined
            }
          >
            {activeProfileImageUrl
              ? null
              : getAuthorInitial(activeSlide.authorName)}
          </span>
          <span className="min-w-0">
            <span className="block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#44f26e]">
              AI STAR
            </span>
            <span className="block max-w-24 truncate text-xs font-semibold text-white">
              {activeSlide.authorName}
            </span>
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="truncate text-[0.68rem] font-semibold text-white/70">
            {activeSlide.authorName}
          </p>
          <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-white">
            {activeSlide.title}
          </h2>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 text-[0.62rem] font-semibold text-white backdrop-blur">
              {activeSlide.signalLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-semibold text-[#07100b]">
              {activeSlide.ctaLabel}
            </span>
          </div>
        </div>

      {playableSlides.length > 1 ? (
        <div
          aria-label="AI Star preview queue"
          className="absolute right-3 top-12 z-[2] flex flex-col gap-1.5"
        >
          {playableSlides.map((slide, index) => (
            <button
              aria-label={slide.authorName}
              className={`size-9 overflow-hidden rounded-xl border bg-white/16 bg-cover bg-center text-[0.62rem] font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition ${
                index === activeIndex
                  ? "border-white opacity-100 ring-2 ring-[#44f26e]"
                  : "border-white/32 opacity-62 hover:opacity-100"
              }`}
              key={`${slide.videoUrl}:${index}`}
              onClick={() => setActiveIndex(index)}
              style={
                slide.authorAvatarImageUrl
                  ? { backgroundImage: `url(${slide.authorAvatarImageUrl})` }
                  : slide.coverImageUrl
                    ? { backgroundImage: `url(${slide.coverImageUrl})` }
                    : undefined
              }
              type="button"
            >
              {slide.authorAvatarImageUrl || slide.coverImageUrl
                ? null
                : getAuthorInitial(slide.authorName)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
