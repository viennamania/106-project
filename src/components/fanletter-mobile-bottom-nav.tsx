"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Clapperboard,
  House,
  LayoutDashboard,
  Plus,
  UserRound,
} from "lucide-react";
import type { ComponentType } from "react";

import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { cn } from "@/lib/utils";

type FanletterNavItem = {
  activePaths: string[];
  href: string;
  icon: ComponentType<{ className?: string }>;
  key: "home" | "feed" | "create" | "studio" | "character";
  label: string;
  primary?: boolean;
};

const fanletterMobileNavHeightClass =
  "h-[calc(5.1rem+env(safe-area-inset-bottom))]";

function trimTrailingSlash(pathname: string) {
  if (pathname.length <= 1) {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function isActivePath(pathname: string, basePath: string, item: FanletterNavItem) {
  if (item.key === "home") {
    return pathname === basePath;
  }

  return item.activePaths.some((path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

export function FanletterMobileBottomNav({ locale }: { locale: Locale }) {
  const pathname = trimTrailingSlash(usePathname());
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const basePath = `/${locale}/fanletter`;
  const copy =
    locale === "ko"
      ? {
          character: "캐릭터",
          create: "만들기",
          feed: "피드",
          home: "홈",
          label: "FanLetter 주요 메뉴",
          studio: "스튜디오",
        }
      : {
          character: "Character",
          create: "Create",
          feed: "Feed",
          home: "Home",
          label: "FanLetter navigation",
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
      activePaths: [
        `${basePath}/feed`,
        `${basePath}/content`,
        `${basePath}/creator`,
        `${basePath}/following`,
      ],
      href: buildHref(`${basePath}/feed`),
      icon: Clapperboard,
      key: "feed",
      label: copy.feed,
    },
    {
      activePaths: [`${basePath}/create`],
      href: buildHref(`${basePath}/create`),
      icon: Plus,
      key: "create",
      label: copy.create,
      primary: true,
    },
    {
      activePaths: [`${basePath}/studio`, `${basePath}/channels`],
      href: buildHref(`${basePath}/studio`),
      icon: LayoutDashboard,
      key: "studio",
      label: copy.studio,
    },
    {
      activePaths: [
        `${basePath}/profile`,
        `${basePath}/connect`,
        `${basePath}/onboarding`,
        `${basePath}/start`,
      ],
      href: buildHref(`${basePath}/profile`),
      icon: UserRound,
      key: "character",
      label: copy.character,
    },
  ];

  return (
    <>
      <div
        aria-hidden="true"
        className={cn("sm:hidden", fanletterMobileNavHeightClass)}
      />
      <nav
        aria-label={copy.label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#030504]/94 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 text-white shadow-[0_-18px_46px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, basePath, item);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-end gap-1 rounded-lg px-1 pb-1 text-[0.64rem] font-semibold text-white/52 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44f26e]",
                  active && "text-white",
                  item.primary && "relative -mt-3 text-white",
                )}
                href={item.href}
                key={item.key}
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition",
                    active && !item.primary && "bg-white/10 text-[#44f26e]",
                    item.primary &&
                      "size-12 bg-[#44f26e] text-black shadow-[0_14px_34px_rgba(68,242,110,0.22)]",
                    active &&
                      item.primary &&
                      "ring-2 ring-[#44f26e]/34 ring-offset-2 ring-offset-[#030504]",
                  )}
                >
                  <Icon className={item.primary ? "size-6" : "size-5"} />
                </span>
                <span className="max-w-full truncate leading-none">
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
