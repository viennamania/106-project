"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

export type FanletterChannelSectionTabItem = {
  href: string;
  id: string;
  label: string;
  mobileLabel?: string;
  sectionId?: string | null;
};

export function FanletterChannelSectionTabs({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: FanletterChannelSectionTabItem[];
}) {
  const [activeId, setActiveId] = useState(
    items.find((item) => item.sectionId !== null)?.id ?? items[0]?.id ?? "",
  );
  const [isMobileDocked, setIsMobileDocked] = useState(false);
  const [navPlaceholderHeight, setNavPlaceholderHeight] = useState(0);
  const navRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLSpanElement | null>(null);
  const sectionKey = useMemo(
    () =>
      items
        .map((item) => `${item.id}:${item.sectionId === null ? "" : item.sectionId ?? item.id}`)
        .join("|"),
    [items],
  );
  const sectionTabs = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          sectionId: item.sectionId === null ? null : item.sectionId ?? item.id,
        }))
        .filter(
          (item): item is FanletterChannelSectionTabItem & { sectionId: string } =>
            Boolean(item.sectionId),
        ),
    [items],
  );

  const scrollToTarget = useCallback((targetElement: HTMLElement) => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const offset =
      window.innerWidth < 640
        ? Math.max((navRef.current?.offsetHeight ?? 0) + 16, 88)
        : 0;
    const top = targetElement.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      top: Math.max(0, top),
    });
  }, []);

  useEffect(() => {
    const sectionEntries = sectionTabs.map((tab) => ({
      id: tab.sectionId,
      tabId: tab.id,
    }));
    const sectionIds = sectionEntries.map((entry) => entry.id);

    if (sectionIds.length === 0) {
      return;
    }

    function updateFromHash() {
      const hashId = window.location.hash.replace(/^#/, "");
      const matched = sectionEntries.find((entry) => entry.id === hashId);

      if (matched) {
        setActiveId(matched.tabId);
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
        const matched = sectionEntries.find((entry) => entry.id === nextId);

        if (matched) {
          setActiveId(matched.tabId);
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
  }, [sectionKey, sectionTabs]);

  useEffect(() => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    function updatePlaceholderHeight() {
      const nextNav = navRef.current;

      if (!nextNav) {
        setNavPlaceholderHeight(0);
        return;
      }

      const navStyle = window.getComputedStyle(nextNav);
      const marginBottom = Number.parseFloat(navStyle.marginBottom) || 0;
      const nextHeight = Math.ceil(
        nextNav.getBoundingClientRect().height + marginBottom,
      );

      setNavPlaceholderHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    }

    updatePlaceholderHeight();
    window.addEventListener("resize", updatePlaceholderHeight);

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updatePlaceholderHeight);

    observer?.observe(nav);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePlaceholderHeight);
    };
  }, [sectionKey]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observedSentinel = sentinel;
    let frameId = 0;
    const mobileQuery = window.matchMedia("(max-width: 639px)");

    function updateDockState(sentinelTop?: number) {
      const nextSentinelTop =
        sentinelTop ?? observedSentinel.getBoundingClientRect().top;

      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setIsMobileDocked((current) => {
          const next = mobileQuery.matches && nextSentinelTop <= 0;

          return current === next ? current : next;
        });
      });
    }

    function handleMobileQueryChange() {
      updateDockState();
    }

    function handleScroll() {
      updateDockState();
    }

    updateDockState();

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (!entry) {
                updateDockState();
                return;
              }

              updateDockState(entry.boundingClientRect.top);
            },
            { threshold: 0 },
          );

    observer?.observe(observedSentinel);

    window.addEventListener("scroll", handleScroll, { passive: true });

    window.addEventListener("resize", handleMobileQueryChange);
    mobileQuery.addEventListener("change", handleMobileQueryChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleMobileQueryChange);
      mobileQuery.removeEventListener("change", handleMobileQueryChange);
    };
  }, []);

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

    const targetId =
      items.find((item) => item.id === tab.id)?.sectionId === null
        ? ""
        : targetUrl.hash.replace(/^#/, "");
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
    scrollToTarget(targetElement);
    window.setTimeout(() => scrollToTarget(targetElement), 120);
  }

  return (
    <div
      style={
        isMobileDocked && navPlaceholderHeight > 0
          ? { height: navPlaceholderHeight }
          : undefined
      }
    >
      <span aria-hidden="true" className="block h-px w-px" ref={sentinelRef} />
      <nav
        aria-label={ariaLabel}
        className={cn(
          isMobileDocked
            ? "fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0px)] z-30 mb-5 border-b border-[#44f26e]/18 bg-[#07100b]/94 px-3 py-2 text-white shadow-[0_12px_28px_rgba(8,18,12,0.18)] backdrop-blur"
            : "relative z-20 -mx-4 mb-5 border-y border-[#44f26e]/14 bg-[#07100b]/94 px-3 py-2 text-white backdrop-blur",
          "sm:sticky sm:top-0 sm:z-20 sm:-mx-6 sm:mb-8 sm:border-b sm:border-black/10 sm:bg-[#f6f8f4]/94 sm:px-6 sm:py-3 sm:shadow-none lg:-mx-8 lg:px-8",
        )}
        ref={navRef}
      >
        <div className="mx-auto flex max-w-[92rem] touch-auto gap-2 overflow-x-auto overscroll-x-contain rounded-full border border-white/10 bg-white/[0.06] p-1 shadow-[0_12px_30px_rgba(8,18,12,0.08)] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          {items.map((tab) => {
            const active = tab.id === activeId;

            return (
              <a
                aria-current={active ? "location" : undefined}
                className={cn(
                  "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-3 text-center text-[0.78rem] font-semibold leading-none transition sm:h-10 sm:min-w-0 sm:px-4 sm:text-sm",
                  active
                    ? "bg-[#44f26e] !text-black shadow-[0_8px_18px_rgba(68,242,110,0.2)] sm:bg-black sm:!text-white sm:shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                    : "bg-transparent !text-white/68 hover:bg-white/8 hover:!text-white sm:border sm:border-black/10 sm:bg-white sm:!text-black/58 sm:hover:border-[#29d85f]/60 sm:hover:!text-black",
                )}
                href={tab.href}
                key={tab.id}
                onClick={(event) => handleTabClick(event, tab)}
              >
                <span className="truncate sm:hidden">
                  {tab.mobileLabel ?? tab.label}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
