"use client";

import { useEffect } from "react";

export function FanletterHashScroller({ offset = 96 }: { offset?: number }) {
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.slice(1);

      if (!hash) {
        return;
      }

      const target = document.getElementById(decodeURIComponent(hash));

      if (!target) {
        return;
      }

      const top = target.getBoundingClientRect().top + window.scrollY - offset;

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
