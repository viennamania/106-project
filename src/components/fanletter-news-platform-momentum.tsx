"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, Radio } from "lucide-react";

import { cn } from "@/lib/utils";

export type FanletterNewsPlatformMomentumStat = {
  hint: string;
  label: string;
  suffix?: string;
  value: number;
};

type FanletterNewsPlatformMomentumProps = {
  className?: string;
  flowItems: string[];
  locale: string;
  stats: FanletterNewsPlatformMomentumStat[];
};

export function FanletterNewsPlatformMomentum({
  className,
  flowItems,
  locale,
  stats,
}: FanletterNewsPlatformMomentumProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const flowSignature = useMemo(() => flowItems.join("|"), [flowItems]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      setReduceMotion(mediaQuery.matches);
    };

    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);

    return () => {
      mediaQuery.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (reduceMotion) {
      return;
    }

    let visibilityFrame: number | null = null;
    const rect = element.getBoundingClientRect();

    if (rect.top < window.innerHeight && rect.bottom > 0) {
      visibilityFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px 18% 0px",
        threshold: 0.01,
      },
    );

    observer.observe(element);

    return () => {
      if (visibilityFrame !== null) {
        window.cancelAnimationFrame(visibilityFrame);
      }

      observer.disconnect();
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !isVisible || flowItems.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveFlowIndex((current) => (current + 1) % flowItems.length);
    }, 1750);

    return () => {
      window.clearInterval(timer);
    };
  }, [flowItems.length, flowSignature, isVisible, reduceMotion]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-white/16 bg-black/34 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-4",
        className,
      )}
      ref={ref}
    >
      <span
        aria-hidden="true"
        className="platform-scan-line pointer-events-none absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(68,242,110,0.86),transparent)]"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex min-w-0 items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#7cff98] sm:text-[0.68rem] sm:tracking-[0.18em]">
          <Radio className="platform-live-indicator size-3.5 shrink-0" />
          <span className="truncate">Live IP Momentum</span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/14 bg-white/10 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/66">
          <Activity className="size-3.5 text-[#ffd76b]" />
          Now
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            className={cn(
              "min-w-0 rounded-lg border p-3",
              index === 0
                ? "border-[#44f26e]/42 bg-[#44f26e]/12"
                : "border-white/12 bg-white/[0.07]",
            )}
            key={stat.label}
          >
            <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/48">
              {stat.label}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <AnimatedMomentumValue
                isVisible={reduceMotion || isVisible}
                locale={locale}
                reduceMotion={reduceMotion}
                value={stat.value}
              />
              {stat.suffix ? (
                <span className="text-xs font-black text-[#7cff98]">
                  {stat.suffix}
                </span>
              ) : null}
            </p>
            <p className="mt-1 line-clamp-2 text-[0.68rem] font-bold leading-4 text-white/55">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      {flowItems.length > 0 ? (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-4">
          {flowItems.map((item, index) => {
            const isActive = reduceMotion
              ? index === 0
              : activeFlowIndex % flowItems.length === index;

            return (
              <div
                className={cn(
                  "relative min-w-0 overflow-hidden rounded-lg border px-2.5 py-2 transition",
                  isActive
                    ? "border-[#44f26e]/70 bg-[#44f26e] text-[#071108]"
                    : "border-white/12 bg-black/22 text-white/70",
                )}
                key={`${item}:${index}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "font-mono text-[0.56rem] font-black",
                      isActive ? "text-[#071108]/62" : "text-[#7cff98]",
                    )}
                  >
                    0{index + 1}
                  </span>
                  {isActive ? <ArrowRight className="size-3.5" /> : null}
                </div>
                <p className="mt-1 truncate text-[0.62rem] font-black sm:text-[0.68rem]">
                  {item}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AnimatedMomentumValue({
  isVisible,
  locale,
  reduceMotion,
  value,
}: {
  isVisible: boolean;
  locale: string;
  reduceMotion: boolean;
  value: number;
}) {
  const frameRef = useRef<number | null>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible || value <= 0 || reduceMotion) {
      return;
    }

    const durationMs = Math.min(1400, 650 + Math.log10(value + 1) * 210);

    const tick = (startedAt: number, timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(value * eased);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame((nextTimestamp) => {
          tick(startedAt, nextTimestamp);
        });
        return;
      }

      setDisplayValue(value);
      frameRef.current = null;
    };

    frameRef.current = window.requestAnimationFrame((startedAt) => {
      tick(startedAt, startedAt);
    });

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isVisible, reduceMotion, value]);

  return (
    <span className="text-2xl font-black tabular-nums text-white sm:text-3xl">
      {new Intl.NumberFormat(locale).format(
        Math.round(reduceMotion ? value : displayValue),
      )}
    </span>
  );
}
