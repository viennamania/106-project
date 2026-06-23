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
  "h-[calc(4.55rem+env(safe-area-inset-bottom))]";

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
    "channel",
    "characters",
    "channels",
    "connect",
    "content",
    "discovery",
    "creator",
    "creator-unlock",
    "feed",
    "founder-club",
    "founder-universe",
    "growth",
    "my-ai",
    "news",
    "onboarding",
    "scout",
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
    return (
      pathname === `${basePath}/discovery` ||
      pathname === `${basePath}/characters` ||
      isStarDetailPath
    );
  }

  if (item.key === "founder") {
    return (
      pathname === `${basePath}/founder-club` ||
      pathname === `${basePath}/creator-unlock` ||
      isStarUniversePath
    );
  }

  if (item.key === "scout") {
    return (
      pathname === `${basePath}/scout` ||
      pathname === `${basePath}/onboarding` ||
      pathname === `${basePath}/connect`
    );
  }

  return false;
}

function resolveFanletterNavActive({
  basePath,
  item,
  pathname,
  view,
}: {
  basePath: string;
  item: FanletterNavItem;
  pathname: string;
  view: string | null;
}) {
  const founderClubPath = `${basePath}/founder-club`;

  if (pathname === founderClubPath && item.key === "founder") {
    return view !== "creator";
  }

  if (pathname === founderClubPath && item.key === "studio") {
    return view === "creator";
  }

  return isActivePath(pathname, basePath, item);
}

function readCreatorReferralCodeFromPathname(pathname: string, basePath: string) {
  const creatorPrefix = `${basePath}/creator/`;
  const channelPrefix = `${basePath}/channel/`;

  const matchedPrefix = pathname.startsWith(creatorPrefix)
    ? creatorPrefix
    : pathname.startsWith(channelPrefix)
      ? channelPrefix
      : null;

  if (!matchedPrefix) {
    return null;
  }

  const [segment] = pathname.slice(matchedPrefix.length).split("/");

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
  const isInvestorInfographicFlow = pathname === `${basePath}/founder-universe`;

  if (
    isInvestorInfographicFlow ||
    isStandaloneNewsFlow ||
    (hasHydrated && (isFocusedStudioFlow || isPromotionalShareFlow))
  ) {
    return null;
  }

  const referralCode =
    normalizeReferralCode(searchParams.get("ref")) ??
    readCreatorReferralCodeFromPathname(pathname, basePath);
  // i18n pilot: the bottom nav now sources its labels per supported locale
  // instead of the previous ko/en-only ternary, so ja/zh/vi/id render natively
  // rather than falling back to English. (Draft translations — pending review.)
  const navCopy: Record<
    Locale,
    {
      discover: string;
      founder: string;
      home: string;
      label: string;
      scout: string;
      studio: string;
    }
  > = {
    ko: {
      discover: "발견",
      founder: "성장",
      home: "홈",
      label: "AIAVpark 주요 메뉴",
      scout: "스카우트",
      studio: "내 AI",
    },
    en: {
      discover: "Discover",
      founder: "Growth",
      home: "Home",
      label: "AIAVpark navigation",
      scout: "Scout",
      studio: "My AI",
    },
    ja: {
      discover: "発見",
      founder: "成長",
      home: "ホーム",
      label: "AIAVparkナビゲーション",
      scout: "スカウト",
      studio: "My AI",
    },
    zh: {
      discover: "发现",
      founder: "成长",
      home: "首页",
      label: "AIAVpark 导航",
      scout: "星探",
      studio: "我的 AI",
    },
    vi: {
      discover: "Khám phá",
      founder: "Tăng trưởng",
      home: "Trang chủ",
      label: "Điều hướng AIAVpark",
      scout: "Tuyển trạch",
      studio: "AI của tôi",
    },
    id: {
      discover: "Jelajahi",
      founder: "Growth",
      home: "Beranda",
      label: "Navigasi AIAVpark",
      scout: "Pencari",
      studio: "AI Saya",
    },
  };
  const copy = navCopy[locale];
  const buildHref = (path: string) => buildPathWithReferral(path, referralCode);
  const myAIHref = buildHref(`${basePath}/my-ai`);
  const currentView = searchParams.get("view");
  const items: FanletterNavItem[] = [
    {
      activePaths: [basePath],
      href: buildHref(basePath),
      icon: House,
      key: "home",
      label: copy.home,
    },
    {
      activePaths: [
        `${basePath}/discovery`,
        `${basePath}/characters`,
        `${basePath}/channel`,
      ],
      href: buildHref(`${basePath}/discovery`),
      icon: Bot,
      key: "discover",
      label: copy.discover,
    },
    {
      activePaths: [
        `${basePath}/agentrank`,
        `${basePath}/ai-star-genealogy`,
        `${basePath}/founder-club`,
        `${basePath}/creator-unlock`,
        `${basePath}/growth`,
      ],
      href: buildHref(`${basePath}/growth`),
      icon: Crown,
      key: "founder",
      label: copy.founder,
      primary: true,
    },
    {
      activePaths: [
        `${basePath}/scout`,
        `${basePath}/onboarding`,
        `${basePath}/connect`,
      ],
      href: buildHref(`${basePath}/scout`),
      icon: Share2,
      key: "scout",
      label: copy.scout,
    },
    {
      activePaths: [
        `${basePath}/my-ai`,
        `${basePath}/studio`,
        `${basePath}/channels`,
      ],
      href: myAIHref,
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.42rem)] pt-2 text-zinc-950 shadow-[0_-14px_34px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-stretch gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = resolveFanletterNavActive({
              basePath,
              item,
              pathname,
              view: currentView,
            });

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-[3.45rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[0.64rem] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
                  active &&
                    "bg-zinc-950 text-white shadow-[0_12px_26px_rgba(15,23,42,0.18)] hover:bg-zinc-900 hover:text-white",
                )}
                href={item.href}
                key={item.key}
              >
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full transition",
                    active ? "text-white" : "text-zinc-700 group-hover:text-black",
                  )}
                >
                  <Icon className="size-5" />
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
