"use client";

import { useEffect } from "react";

export function FanletterHashScroller({ offset = 96 }: { offset?: number }) {
  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    let firstFrame = 0;
    let secondFrame = 0;
    let isActive = true;
    const timeoutIds: number[] = [];

    window.history.scrollRestoration = "manual";

    function getScrollOffset() {
      if (window.innerWidth >= 640) {
        return offset;
      }

      const sectionNav = document.querySelector<HTMLElement>(
        'nav[aria-label="캐릭터 채널 섹션"], nav[aria-label="피드 섹션"], nav[aria-label="Character channel sections"], nav[aria-label="Feed sections"]',
      );

      if (!sectionNav) {
        return offset;
      }

      return Math.max(offset, sectionNav.offsetHeight + 16, 88);
    }

    function scrollToHash() {
      const hash = window.location.hash.slice(1);

      if (!hash) {
        return;
      }

      const target = document.getElementById(decodeURIComponent(hash));

      if (!target) {
        return;
      }

      const top =
        target.getBoundingClientRect().top + window.scrollY - getScrollOffset();

      window.scrollTo({
        behavior: "auto",
        top: Math.max(0, top),
      });
    }

    function clearScheduledScrolls() {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      timeoutIds.splice(0).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    }

    function scheduleScrollToHash() {
      clearScheduledScrolls();
      firstFrame = window.requestAnimationFrame(() => {
        scrollToHash();
        secondFrame = window.requestAnimationFrame(scrollToHash);
      });

      [120, 450, 900, 1600].forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          if (isActive) {
            scrollToHash();
          }
        }, delay);

        timeoutIds.push(timeoutId);
      });
    }

    scheduleScrollToHash();

    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (isActive) {
          scheduleScrollToHash();
        }
      });
    }

    window.addEventListener("hashchange", scheduleScrollToHash);
    window.addEventListener("load", scheduleScrollToHash);
    window.addEventListener("resize", scheduleScrollToHash);

    return () => {
      isActive = false;
      clearScheduledScrolls();
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener("hashchange", scheduleScrollToHash);
      window.removeEventListener("load", scheduleScrollToHash);
      window.removeEventListener("resize", scheduleScrollToHash);
    };
  }, [offset]);

  return null;
}
