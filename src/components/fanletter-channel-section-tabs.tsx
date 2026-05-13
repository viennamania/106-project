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
  const [navHeight, setNavHeight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
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
        ? Math.max((navRef.current?.offsetHeight ?? 0) + 22, 132)
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
    let frameId = 0;
    const mobileQuery = window.matchMedia("(max-width: 639px)");

    function updateDockState() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;
        const nav = navRef.current;

        if (!wrapper || !nav) {
          setIsMobileDocked(false);
          return;
        }

        const nextHeight = nav.offsetHeight;

        setNavHeight(nextHeight);
        setIsMobileDocked(
          mobileQuery.matches && wrapper.getBoundingClientRect().top <= 0,
        );
      });
    }

    updateDockState();
    window.addEventListener("scroll", updateDockState, { passive: true });
    window.addEventListener("resize", updateDockState);
    mobileQuery.addEventListener("change", updateDockState);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateDockState);
      window.removeEventListener("resize", updateDockState);
      mobileQuery.removeEventListener("change", updateDockState);
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
      ref={wrapperRef}
      style={isMobileDocked ? { height: navHeight } : undefined}
    >
      <nav
        aria-label={ariaLabel}
        className={cn(
          isMobileDocked
            ? "fixed inset-x-0 top-0 z-30 border-b border-black/10 bg-[#f6f8f4]/96 px-3 py-2.5 shadow-[0_12px_28px_rgba(8,18,12,0.1)] backdrop-blur"
            : "sticky top-0 z-20 -mx-4 mb-6 border-b border-black/10 bg-[#f6f8f4]/94 px-3 py-2.5 backdrop-blur",
          "sm:sticky sm:top-0 sm:z-20 sm:-mx-6 sm:mb-8 sm:border-b sm:border-black/10 sm:bg-[#f6f8f4]/94 sm:px-6 sm:py-3 sm:shadow-none lg:-mx-8 lg:px-8",
        )}
        ref={navRef}
      >
        <div className="mx-auto grid max-w-[92rem] grid-cols-3 gap-1.5 rounded-lg border border-black/10 bg-white/80 p-1 shadow-[0_12px_30px_rgba(8,18,12,0.08)] sm:flex sm:gap-2 sm:overflow-x-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:[scrollbar-width:none]">
          {items.map((tab) => {
            const active = tab.id === activeId;

            return (
              <a
                aria-current={active ? "location" : undefined}
                className={cn(
                  "inline-flex h-9 min-w-0 items-center justify-center rounded-full px-2 text-center text-[0.78rem] font-semibold leading-none transition sm:h-10 sm:shrink-0 sm:px-4 sm:text-sm",
                  active
                    ? "bg-black !text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                    : "bg-transparent !text-black/58 hover:bg-black/[0.04] hover:!text-black sm:border sm:border-black/10 sm:bg-white sm:hover:border-[#29d85f]/60",
                )}
                key={tab.id}
                href={tab.href}
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
