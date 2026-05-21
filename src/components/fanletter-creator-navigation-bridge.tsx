"use client";

import { useEffect } from "react";

function isModifiedClick(event: MouseEvent) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

export function FanletterCreatorNavigationBridge() {
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) {
        return;
      }

      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;

      if (!target || target.hasAttribute("download")) {
        return;
      }

      const linkTarget = target.getAttribute("target");

      if (linkTarget && linkTarget !== "_self") {
        return;
      }

      const rawHref = target.getAttribute("href");

      if (!rawHref || rawHref.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(target.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (nextUrl.pathname === currentUrl.pathname) {
        const isSectionTabLink = Boolean(
          target.closest('[data-fanletter-section-tabs="true"]'),
        );

        if (nextUrl.search === currentUrl.search || (nextUrl.hash && isSectionTabLink)) {
          return;
        }
      }

      // Leave creator pages with a document navigation because this segment can
      // keep App Router soft navigations pending while media-heavy content mounts.
      event.preventDefault();
      window.location.assign(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  return null;
}
