"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type AnimatedNumberTextProps = {
  className?: string;
  durationMs?: number;
  locale: string;
  value: string;
};

type ParsedAnimatedValue = {
  fractionDigits: number;
  prefix: string;
  suffix: string;
  value: number;
};

export function AnimatedNumberText({
  className,
  durationMs,
  locale,
  value,
}: AnimatedNumberTextProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const canAnimateRef = useRef(false);
  const hasAnimatedRef = useRef(false);
  const parsed = useMemo(() => parseAnimatedValue(value), [value]);
  const [animationState, setAnimationState] = useState<{
    currentValue: number;
    sourceValue: string;
  } | null>(null);

  useEffect(() => {
    const element = ref.current;

    canAnimateRef.current = false;
    hasAnimatedRef.current = false;

    if (!element || !parsed) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const animate = () => {
      if (hasAnimatedRef.current) {
        return;
      }

      hasAnimatedRef.current = true;

      const startedAt = performance.now();
      const totalDuration = durationMs ?? getAnimationDuration(parsed.value);

      const tick = (timestamp: number) => {
        const progress = Math.min((timestamp - startedAt) / totalDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextValue = parsed.value * eased;

        setAnimationState({
          currentValue: nextValue,
          sourceValue: value,
        });

        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        setAnimationState({
          currentValue: parsed.value,
          sourceValue: value,
        });
        frameRef.current = null;
      };

      frameRef.current = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        if (!entry.isIntersecting) {
          canAnimateRef.current = true;
          return;
        }

        if (!canAnimateRef.current) {
          return;
        }

        animate();
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.18,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [durationMs, locale, parsed, value]);

  const displayValue =
    parsed && animationState?.sourceValue === value
      ? formatAnimatedValue(parsed, animationState.currentValue, locale)
      : value;

  return (
    <span className={cn("tabular-nums", className)} ref={ref}>
      {displayValue}
    </span>
  );
}

function parseAnimatedValue(rawValue: string): ParsedAnimatedValue | null {
  const trimmed = rawValue.trim();
  const match = trimmed.match(/^([^0-9]*)([+-]?\d[\d,]*(?:\.\d+)?)([^0-9]*)$/u);

  if (!match) {
    return null;
  }

  const [, prefix, numericPart, suffix] = match;
  const parsedValue = Number(numericPart.replaceAll(",", ""));

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    fractionDigits: numericPart.includes(".")
      ? numericPart.split(".")[1]?.length ?? 0
      : 0,
    prefix,
    suffix,
    value: parsedValue,
  };
}

function formatAnimatedValue(
  parsed: ParsedAnimatedValue,
  numericValue: number,
  locale: string,
) {
  const roundedValue =
    parsed.fractionDigits === 0
      ? Math.round(numericValue)
      : Number(numericValue.toFixed(parsed.fractionDigits));

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: parsed.fractionDigits,
    minimumFractionDigits: parsed.fractionDigits,
  }).format(roundedValue);

  return `${parsed.prefix}${formatted}${parsed.suffix}`;
}

function getAnimationDuration(value: number) {
  const boundedValue = Math.max(1, value);

  return Math.min(1600, 720 + Math.log10(boundedValue + 1) * 220);
}
