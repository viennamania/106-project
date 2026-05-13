"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

export type FanletterChannelSectionTabItem = {
  href: string;
  id: string;
  label: string;
  mobileLabel?: string;
};

export function FanletterChannelSectionTabs({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: FanletterChannelSectionTabItem[];
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const sectionKey = useMemo(
    () => items.map((item) => item.id).join("|"),
    [items],
  );

  useEffect(() => {
    const sectionIds = sectionKey.split("|").filter(Boolean);

    if (sectionIds.length === 0) {
      return;
    }

    function updateFromHash() {
      const hashId = window.location.hash.replace(/^#/, "");

      if (sectionIds.includes(hashId)) {
        setActiveId(hashId);
      }
    }

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    window.addEventListener("popstate", updateFromHash);

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        window.removeEventListener("hashchange", updateFromHash);
        window.removeEventListener("popstate", updateFromHash);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          );

        const nextId = visible[0]?.target.id;

        if (nextId) {
          setActiveId(nextId);
        }
      },
      {
        rootMargin: "-24% 0px -62% 0px",
        threshold: 0.01,
      },
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);

      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", updateFromHash);
      window.removeEventListener("popstate", updateFromHash);
    };
  }, [sectionKey]);

  function handleTabClick(
    event: MouseEvent<HTMLAnchorElement>,
    tab: FanletterChannelSectionTabItem,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    const targetUrl = new URL(tab.href, window.location.href);

    if (
      targetUrl.origin !== window.location.origin ||
      targetUrl.pathname !== window.location.pathname
    ) {
      return;
    }

    const targetId = targetUrl.hash.replace(/^#/, "");
    const targetElement = document.getElementById(targetId);

    if (!targetId || !targetElement) {
      return;
    }

    event.preventDefault();
    setActiveId(tab.id);
    window.history.pushState(
      null,
      "",
      `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
    );
    targetElement.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-0 z-20 -mx-4 mb-6 border-b border-black/10 bg-[#f6f8f4]/94 px-3 py-2.5 backdrop-blur sm:-mx-6 sm:mb-8 sm:px-6 sm:py-3 lg:-mx-8 lg:px-8"
    >
      <div className="mx-auto grid max-w-[92rem] grid-cols-3 gap-1.5 rounded-lg border border-black/10 bg-white/80 p-1 shadow-[0_12px_30px_rgba(8,18,12,0.08)] sm:flex sm:gap-2 sm:overflow-x-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:[scrollbar-width:none]">
        {items.map((tab) => {
          const active = tab.id === activeId;

          return (
            <Link
              aria-current={active ? "location" : undefined}
              className={cn(
                "inline-flex h-9 min-w-0 items-center justify-center rounded-full px-2 text-center text-[0.78rem] font-semibold leading-none transition sm:h-10 sm:shrink-0 sm:px-4 sm:text-sm",
                active
                  ? "bg-black !text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                  : "bg-transparent !text-black/58 hover:bg-black/[0.04] hover:!text-black sm:border sm:border-black/10 sm:bg-white sm:hover:border-[#29d85f]/60",
              )}
              href={tab.href}
              key={tab.id}
              onClick={(event) => handleTabClick(event, tab)}
            >
              <span className="truncate sm:hidden">
                {tab.mobileLabel ?? tab.label}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
