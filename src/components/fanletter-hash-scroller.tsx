"use client";

import { useEffect } from "react";

export function FanletterHashScroller({ offset = 96 }: { offset?: number }) {
  useEffect(() => {
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

      return Math.max(offset, sectionNav.offsetHeight + 22, 132);
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

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToHash);
    });
    const delayedScroll = window.setTimeout(scrollToHash, 450);

    window.addEventListener("hashchange", scrollToHash);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(delayedScroll);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [offset]);

  return null;
}
