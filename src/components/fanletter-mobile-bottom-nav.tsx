"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  Crown,
  House,
  LayoutDashboard,
  Share2,
} from "lucide-react";
import { useSyncExternalStore, type ComponentType } from "react";

import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { cn } from "@/lib/utils";

type FanletterNavItem = {
  activePaths: string[];
  href: string;
  icon: ComponentType<{ className?: string }>;
  key: "home" | "discover" | "founder" | "scout" | "studio";
  label: string;
  primary?: boolean;
};

const fanletterMobileNavHeightClass =
  "h-[calc(4.85rem+env(safe-area-inset-bottom))]";

function subscribeToHydration() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

function trimTrailingSlash(pathname: string) {
  if (pathname.length <= 1) {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function isActivePath(pathname: string, basePath: string, item: FanletterNavItem) {
  const activeByPath = item.activePaths.some((path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  });

  if (item.key === "home") {
    return pathname === basePath;
  }

  if (activeByPath) {
    return true;
  }

  const segments = pathname
    .slice(basePath.length)
    .split("/")
    .filter(Boolean);
  const firstSegment = segments[0];
  const reservedSections = new Set([
    "agentrank",
    "ai-star-genealogy",
    "campaigns",
    "characters",
    "channels",
    "connect",
    "content",
    "creator",
    "creator-unlock",
    "feed",
    "founder-club",
    "founder-universe",
    "news",
    "onboarding",
    "share",
    "start",
    "studio",
  ]);
  const isStarDetailPath =
    segments.length === 1 &&
    Boolean(firstSegment) &&
    !reservedSections.has(firstSegment);
  const isStarUniversePath =
    segments.length === 2 &&
    Boolean(firstSegment) &&
    !reservedSections.has(firstSegment) &&
    segments[1] === "universe";

  if (item.key === "discover") {
    return pathname === `${basePath}/characters` || isStarDetailPath;
  }

  if (item.key === "founder") {
    return (
      pathname === `${basePath}/founder-club` ||
      pathname === `${basePath}/founder-universe` ||
      pathname === `${basePath}/creator-unlock` ||
      isStarUniversePath
    );
  }

  if (item.key === "scout") {
    return pathname === `${basePath}/onboarding` || pathname === `${basePath}/connect`;
  }

  return false;
}

function readCreatorReferralCodeFromPathname(pathname: string, basePath: string) {
  const creatorPrefix = `${basePath}/creator/`;

  if (!pathname.startsWith(creatorPrefix)) {
    return null;
  }

  const [segment] = pathname.slice(creatorPrefix.length).split("/");

  try {
    return normalizeReferralCode(decodeURIComponent(segment));
  } catch {
    return normalizeReferralCode(segment);
  }
}

export function FanletterMobileBottomNav({ locale }: { locale: Locale }) {
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const pathname = trimTrailingSlash(usePathname());
  const searchParams = useSearchParams();
  const basePath = `/${locale}/fanletter`;
  const isFocusedStudioFlow =
    pathname === `${basePath}/studio/paid-upload` ||
    pathname.startsWith(`${basePath}/studio/paid-upload/`);
  const isPromotionalShareFlow =
    pathname === `${basePath}/share` || pathname.startsWith(`${basePath}/share/`);
  const isStandaloneNewsFlow =
    pathname === `${basePath}/news` || pathname.startsWith(`${basePath}/news/`);

  if (
    isStandaloneNewsFlow ||
    (hasHydrated && (isFocusedStudioFlow || isPromotionalShareFlow))
  ) {
    return null;
  }

  const referralCode =
    normalizeReferralCode(searchParams.get("ref")) ??
    readCreatorReferralCodeFromPathname(pathname, basePath);
  const copy =
    locale === "ko"
      ? {
          discover: "발견",
          founder: "파운더",
          home: "홈",
          label: "AIAVpark 주요 메뉴",
          scout: "스카우트",
          studio: "스튜디오",
        }
      : {
          discover: "Discover",
          founder: "Founder",
          home: "Home",
          label: "AIAVpark navigation",
          scout: "Scout",
          studio: "Studio",
        };
  const buildHref = (path: string) => buildPathWithReferral(path, referralCode);
  const items: FanletterNavItem[] = [
    {
      activePaths: [basePath],
      href: buildHref(basePath),
      icon: House,
      key: "home",
      label: copy.home,
    },
    {
      activePaths: [],
      href: buildHref(`${basePath}#top-growing-ai-stars`),
      icon: Bot,
      key: "discover",
      label: copy.discover,
    },
    {
      activePaths: [],
      href: buildHref(`${basePath}#founder-club`),
      icon: Crown,
      key: "founder",
      label: copy.founder,
      primary: true,
    },
    {
      activePaths: [],
      href: buildHref(`${basePath}#scout-share-loop`),
      icon: Share2,
      key: "scout",
      label: copy.scout,
    },
    {
      activePaths: [`${basePath}/studio`, `${basePath}/channels`],
      href: buildHref(`${basePath}/studio`),
      icon: LayoutDashboard,
      key: "studio",
      label: copy.studio,
    },
  ];

  return (
    <>
      <div
        aria-hidden="true"
        className={cn("bg-white sm:hidden", fanletterMobileNavHeightClass)}
      />
      <nav
        aria-label={copy.label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 text-zinc-950 shadow-[0_-16px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, basePath, item);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-end gap-1 rounded-lg px-1 pb-1 text-[0.64rem] font-semibold text-zinc-400 transition hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
                  active && "text-black",
                  item.primary && "relative -mt-3 text-black",
                )}
                href={item.href}
                key={item.key}
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition",
                    active && !item.primary && "bg-zinc-100 text-black",
                    item.primary &&
                      "size-12 bg-black text-white shadow-[0_14px_34px_rgba(15,23,42,0.2)]",
                    active &&
                      item.primary &&
                      "ring-2 ring-zinc-300 ring-offset-2 ring-offset-white",
                  )}
                >
                  <Icon className={item.primary ? "size-6" : "size-5"} />
                </span>
                <span className="max-w-full whitespace-normal text-center leading-tight [word-break:keep-all]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
