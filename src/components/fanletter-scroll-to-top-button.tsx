"use client";

import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

const minScrollY = 760;
const minScrollableDistance = 720;
const fanletterNewsTopLevelServiceSegments = new Set([
  "activate",
  "characters",
  "connect",
  "platform",
  "purchases",
  "reporters",
  "reports",
  "vlogs",
  "wallet",
]);

const copyByLocale: Record<
  Locale,
  {
    label: string;
    shortLabel: string;
  }
> = {
  ko: {
    label: "페이지 맨 위로 이동",
    shortLabel: "TOP",
  },
  en: {
    label: "Back to top",
    shortLabel: "TOP",
  },
  ja: {
    label: "Back to top",
    shortLabel: "TOP",
  },
  zh: {
    label: "Back to top",
    shortLabel: "TOP",
  },
  vi: {
    label: "Back to top",
    shortLabel: "TOP",
  },
  id: {
    label: "Back to top",
    shortLabel: "TOP",
  },
};

function shouldShowScrollToTop() {
  const documentElement = document.documentElement;
  const scrollableDistance =
    documentElement.scrollHeight - window.innerHeight;

  return (
    scrollableDistance >= minScrollableDistance &&
    window.scrollY >= minScrollY
  );
}

function isFanletterNewsReportDetailPath(pathname: string, locale: Locale) {
  const basePath = `/${locale}/fanletter/news`;

  if (!pathname.startsWith(`${basePath}/`)) {
    return false;
  }

  const segments = pathname.slice(basePath.length + 1).split("/").filter(Boolean);

  return (
    segments.length === 1 &&
    !fanletterNewsTopLevelServiceSegments.has(segments[0] ?? "")
  );
}

export function FanletterScrollToTopButton({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const copy = copyByLocale[locale] ?? copyByLocale.ko;
  const basePath = `/${locale}/fanletter`;
  const isPromotionalShareFlow =
    pathname === `${basePath}/share` || pathname.startsWith(`${basePath}/share/`);
  const isNewsReportDetail = isFanletterNewsReportDetailPath(pathname, locale);

  useEffect(() => {
    let frameId = 0;

    const updateVisibility = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setIsVisible(shouldShowScrollToTop());
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [pathname]);

  if (!isVisible || isPromotionalShareFlow) {
    return null;
  }

  return (
    <button
      aria-label={copy.label}
      className={`fixed right-3 z-50 inline-flex items-center justify-center rounded-full border border-[#44f26e]/42 bg-[#44f26e]/95 text-xs font-semibold text-black shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition hover:bg-[#67ff88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44f26e] sm:bottom-6 sm:right-6 sm:size-11 sm:w-auto sm:gap-2 sm:px-4 ${
        isNewsReportDetail
          ? "bottom-[calc(1rem+env(safe-area-inset-bottom))] size-10"
          : "bottom-[calc(5.9rem+env(safe-area-inset-bottom))] size-11"
      }`}
      onClick={() => {
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        window.scrollTo({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          top: 0,
        });
      }}
      type="button"
    >
      <ArrowUp className="size-4" />
      <span className="sr-only sm:not-sr-only">{copy.shortLabel}</span>
    </button>
  );
}
