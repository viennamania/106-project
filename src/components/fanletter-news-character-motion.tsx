"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type FanletterNewsCountUpProps = {
  className?: string;
  durationMs?: number;
  locale: string;
  value: number;
};

export type FanletterNewsCharacterProfileMarqueeItem = {
  href: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  name: string;
  rankLabel: string;
  score: number;
  signalLabel: string;
  unoptimized?: boolean;
  unoptimizedImageUrls?: string[];
};

const PROFILE_IMAGE_SLIDE_INTERVAL_MS = 3400;
const FANLETTER_NEWS_IMAGE_FADE_STYLE_ID =
  "fanletter-news-image-fade-keyframes";
const FANLETTER_NEWS_IMAGE_FADE_KEYFRAMES = `
  @keyframes fanletter-news-image-fade {
    0% {
      opacity: 0;
    }

    5%,
    20% {
      opacity: 1;
    }

    27%,
    100% {
      opacity: 0;
    }
  }
`;

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function FanletterNewsCountUp({
  className,
  durationMs = 900,
  locale,
  value,
}: FanletterNewsCountUpProps) {
  const targetValue = Math.max(0, value);
  const [displayValue, setDisplayValue] = useState(targetValue);
  const frameRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);
  const spanRef = useRef<HTMLSpanElement>(null);
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  useEffect(() => {
    hasStartedRef.current = false;
    const node = spanRef.current;

    const stopFrame = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const start = () => {
      if (hasStartedRef.current) {
        return;
      }

      hasStartedRef.current = true;
      stopFrame();

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion || targetValue <= 0) {
        setDisplayValue(targetValue);
        return;
      }

      const startedAt = window.performance.now();
      const startValue =
        targetValue > 100 ? Math.round(targetValue * 0.82) : 0;
      setDisplayValue(startValue);

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / durationMs, 1);
        const eased = easeOutCubic(progress);
        setDisplayValue(
          Math.round(startValue + (targetValue - startValue) * eased),
        );

        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(tick);
        } else {
          frameRef.current = null;
          setDisplayValue(targetValue);
        }
      };

      frameRef.current = window.requestAnimationFrame(tick);
    };

    if (!node || !("IntersectionObserver" in window)) {
      start();
      return stopFrame;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      stopFrame();
    };
  }, [durationMs, targetValue]);

  return (
    <span
      aria-label={formatter.format(targetValue)}
      className={className}
      ref={spanRef}
    >
      {formatter.format(displayValue)}
    </span>
  );
}

function getNormalizedImageUrls(imageUrls: string[]) {
  const uniqueUrls = new Set<string>();

  return imageUrls
    .map((imageUrl) => imageUrl.trim())
    .filter((imageUrl) => {
      if (!imageUrl || uniqueUrls.has(imageUrl)) {
        return false;
      }

      uniqueUrls.add(imageUrl);
      return true;
    });
}

export function FanletterNewsCharacterProfileImageSlider({
  alt,
  autoRotate = true,
  imageClassName = "h-full w-full object-cover",
  imageUrls,
  intervalMs = PROFILE_IMAGE_SLIDE_INTERVAL_MS,
  loading,
  pauseOnInteraction = true,
  sizes,
  transitionMode = "state",
  unoptimizedImageUrls = [],
}: {
  alt: string;
  autoRotate?: boolean;
  imageClassName?: string;
  imageUrls: string[];
  intervalMs?: number;
  loading?: "eager" | "lazy";
  pauseOnInteraction?: boolean;
  sizes: string;
  transitionMode?: "css" | "state";
  unoptimizedImageUrls?: string[];
}) {
  const normalizedImageUrls = useMemo(
    () => getNormalizedImageUrls(imageUrls),
    [imageUrls],
  );
  const unoptimizedUrlSet = useMemo(
    () => new Set(unoptimizedImageUrls.map((imageUrl) => imageUrl.trim())),
    [unoptimizedImageUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduceMotion = () => setReduceMotion(query.matches);

    syncReduceMotion();
    query.addEventListener("change", syncReduceMotion);

    return () => query.removeEventListener("change", syncReduceMotion);
  }, []);

  useEffect(() => {
    if (transitionMode !== "css") {
      return;
    }

    if (document.getElementById(FANLETTER_NEWS_IMAGE_FADE_STYLE_ID)) {
      return;
    }

    const styleElement = document.createElement("style");
    styleElement.id = FANLETTER_NEWS_IMAGE_FADE_STYLE_ID;
    styleElement.textContent = FANLETTER_NEWS_IMAGE_FADE_KEYFRAMES;
    document.head.appendChild(styleElement);
  }, [transitionMode]);

  useEffect(() => {
    if (
      !autoRotate ||
      transitionMode === "css" ||
      normalizedImageUrls.length <= 1 ||
      paused ||
      reduceMotion
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex(
        (currentIndex) => (currentIndex + 1) % normalizedImageUrls.length,
      );
    }, Math.max(1800, intervalMs));

    return () => window.clearInterval(intervalId);
  }, [
    autoRotate,
    intervalMs,
    normalizedImageUrls.length,
    paused,
    reduceMotion,
    transitionMode,
  ]);

  if (normalizedImageUrls.length === 0) {
    return null;
  }

  const shouldRotate =
    autoRotate && !reduceMotion && normalizedImageUrls.length > 1;
  const shouldUseCssFade = shouldRotate && transitionMode === "css";
  const renderedImageUrls = shouldRotate
    ? normalizedImageUrls
    : normalizedImageUrls.slice(0, 1);
  const safeActiveIndex = activeIndex % normalizedImageUrls.length;
  const visibleActiveIndex = shouldRotate ? safeActiveIndex : 0;
  const safeIntervalMs = Math.max(1800, intervalMs);
  const cssFadeCycleMs = safeIntervalMs * renderedImageUrls.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onBlurCapture={
        pauseOnInteraction ? () => setPaused(false) : undefined
      }
      onFocusCapture={pauseOnInteraction ? () => setPaused(true) : undefined}
      onMouseEnter={pauseOnInteraction ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnInteraction ? () => setPaused(false) : undefined}
    >
      {renderedImageUrls.map((imageUrl, imageIndex) => {
        const isActive = shouldUseCssFade
          ? imageIndex === 0
          : imageIndex === visibleActiveIndex;
        const imageStyle: CSSProperties | undefined = shouldUseCssFade
          ? {
              animationDelay: `${imageIndex * safeIntervalMs - 420}ms`,
              animationDuration: `${cssFadeCycleMs}ms`,
              animationFillMode: "both",
              animationIterationCount: "infinite",
              animationName: "fanletter-news-image-fade",
              animationTimingFunction: "ease-in-out",
              willChange: "opacity",
            }
          : undefined;

        return (
          <Image
            alt={shouldUseCssFade ? "" : isActive ? alt : ""}
            aria-hidden={shouldUseCssFade || !isActive ? true : undefined}
            className={`${imageClassName} absolute inset-0 ${
              shouldUseCssFade
                ? "opacity-0"
                : `transition-[opacity,transform] duration-700 ${
                    isActive ? "opacity-100 scale-100" : "opacity-0 scale-100"
                  }`
            }`}
            fill
            key={imageUrl}
            loading={loading}
            sizes={sizes}
            src={imageUrl}
            style={imageStyle}
            unoptimized={unoptimizedUrlSet.has(imageUrl)}
          />
        );
      })}
    </div>
  );
}

export function FanletterNewsCharacterProfileMarquee({
  ariaLabel,
  items,
  locale,
  scoreLabel,
}: {
  ariaLabel: string;
  items: FanletterNewsCharacterProfileMarqueeItem[];
  locale: string;
  scoreLabel: string;
}) {
  const visibleItems = items.filter((item) => item.name.trim().length > 0);

  if (visibleItems.length === 0) {
    return null;
  }

  const formatter = new Intl.NumberFormat(locale);
  const loopItems = [...visibleItems, ...visibleItems];
  const durationSeconds = Math.max(24, visibleItems.length * 4);
  const marqueeStyle = {
    "--fanletter-character-marquee-duration": `${durationSeconds}s`,
  } as CSSProperties;

  return (
    <div
      aria-label={ariaLabel}
      className="fanletter-news-character-marquee mt-5 max-w-full overflow-hidden border border-white/12 bg-white/[0.045] shadow-[0_14px_36px_rgba(0,0,0,0.16)]"
      role="region"
      style={marqueeStyle}
    >
      <style>{`
        @keyframes fanletter-news-character-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .fanletter-news-character-marquee-track {
          animation: fanletter-news-character-marquee var(--fanletter-character-marquee-duration) linear infinite;
        }
        .fanletter-news-character-marquee:hover .fanletter-news-character-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .fanletter-news-character-marquee-track {
            animation: none;
            flex-wrap: wrap;
            transform: none;
            width: 100%;
          }
        }
      `}</style>
      <div className="fanletter-news-character-marquee-track flex w-max gap-2 px-2 py-2">
        {loopItems.map((item, index) => {
          const isDuplicate = index >= visibleItems.length;
          const initial = item.name.trim().charAt(0).toUpperCase() || "A";
          const imageUrls =
            item.imageUrls && item.imageUrls.length > 0
              ? item.imageUrls
              : item.imageUrl
                ? [item.imageUrl]
                : [];
          const unoptimizedImageUrls =
            item.unoptimizedImageUrls && item.unoptimizedImageUrls.length > 0
              ? item.unoptimizedImageUrls
              : item.unoptimized && item.imageUrl
                ? [item.imageUrl]
                : [];

          return (
            <Link
              aria-hidden={isDuplicate ? "true" : undefined}
              aria-label={
                isDuplicate
                  ? undefined
                  : `${item.rankLabel} ${item.name}, ${scoreLabel} ${formatter.format(
                      item.score,
                    )}, ${item.signalLabel}`
              }
              className="group flex w-[13.5rem] shrink-0 items-center gap-3 border border-white/12 bg-[#07100b] p-2 !text-white transition hover:border-[#44f26e]/70 hover:bg-[#0d1c11]"
              href={item.href}
              key={`${item.href}-${index}`}
              tabIndex={isDuplicate ? -1 : undefined}
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-white/18 bg-[#111510]">
                {imageUrls.length > 0 ? (
                  <FanletterNewsCharacterProfileImageSlider
                    alt={item.name}
                    imageClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    imageUrls={imageUrls}
                    loading={index === 0 ? "eager" : undefined}
                    sizes="3.5rem"
                    unoptimizedImageUrls={unoptimizedImageUrls}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black text-white/70">
                    {initial}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 bg-[#44f26e] px-1.5 py-0.5 text-[0.56rem] font-black text-[#07150b]">
                    {item.rankLabel}
                  </span>
                  <span className="truncate text-[0.56rem] font-black uppercase tracking-[0.08em] text-white/42">
                    {item.signalLabel}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-black leading-tight">
                  {item.name}
                </p>
                <p className="mt-0.5 truncate text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#44f26e]">
                  {scoreLabel} {formatter.format(item.score)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
