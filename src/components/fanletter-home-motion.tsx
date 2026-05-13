"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

import type { Locale } from "@/lib/i18n";

type AnimatedNumberFormat = "compact" | "standard" | "usdt";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      mediaQuery.addEventListener("change", onStoreChange);

      return () => {
        mediaQuery.removeEventListener("change", onStoreChange);
      };
    },
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function revealOnNextFrame(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const animationFrame = window.requestAnimationFrame(callback);

  return () => {
    window.cancelAnimationFrame(animationFrame);
  };
}

function useInView<T extends HTMLElement>({
  rootMargin = "0px 0px -12% 0px",
  threshold = 0.18,
}: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      return revealOnNextFrame(() => {
        setIsInView(true);
      });
    }

    const node = ref.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      return revealOnNextFrame(() => {
        setIsInView(true);
      });
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [prefersReducedMotion, rootMargin, threshold]);

  return { isInView, prefersReducedMotion, ref };
}

function formatAnimatedNumber({
  format,
  locale,
  value,
}: {
  format: AnimatedNumberFormat;
  locale: Locale;
  value: number;
}) {
  if (format === "usdt") {
    if (value <= 0) {
      return "0 USDT";
    }

    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value)} USDT`;
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: format === "compact" && value >= 1000 ? 1 : 0,
    notation: format === "compact" && value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export function AnimatedNumber({
  className,
  delay = 0,
  duration = 1200,
  format = "standard",
  locale,
  value,
}: {
  className?: string;
  delay?: number;
  duration?: number;
  format?: AnimatedNumberFormat;
  locale: Locale;
  value: number;
}) {
  const { isInView, prefersReducedMotion, ref } = useInView<HTMLSpanElement>();
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);
  const shouldRenderFinalValue = isInView && (prefersReducedMotion || duration <= 0);

  useEffect(() => {
    if (!isInView) {
      return;
    }

    if (prefersReducedMotion || duration <= 0) {
      displayValueRef.current = value;
      return;
    }

    let animationFrame = 0;
    let timeout: number | null = null;
    let startedAt: number | null = null;
    const startValue = displayValueRef.current;
    const delta = value - startValue;

    function tick(timestamp: number) {
      if (startedAt === null) {
        startedAt = timestamp;
      }

      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const nextValue = startValue + delta * easeOutCubic(progress);
      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    }

    timeout = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(tick);
    }, delay);

    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }

      window.cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, isInView, prefersReducedMotion, value]);

  return (
    <span ref={ref} className={className}>
      {formatAnimatedNumber({
        format,
        locale,
        value: shouldRenderFinalValue ? value : displayValue,
      })}
    </span>
  );
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const { isInView, prefersReducedMotion, ref } = useInView<HTMLDivElement>();
  const style = {
    "--fanletter-reveal-y": `${y}px`,
    transitionDelay: prefersReducedMotion ? "0ms" : `${delay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={[
        "transform-gpu transition duration-700 ease-out will-change-transform motion-reduce:transition-none",
        isInView
          ? "translate-y-0 opacity-100"
          : "translate-y-[var(--fanletter-reveal-y)] opacity-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}
