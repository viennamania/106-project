"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "default" | "hero" | "soft";
};

export function LandingReveal({
  children,
  className,
  delay = 0,
  variant = "default",
}: LandingRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
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
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={[
        "landing-reveal",
        variant !== "default" ? `landing-reveal--${variant}` : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-visible={isVisible ? "true" : "false"}
      ref={ref}
      style={
        {
          "--reveal-delay": `${delay}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
