"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpenCheck,
  Newspaper,
  PenLine,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { cn } from "@/lib/utils";

type FanletterNewsMobileNavItem = {
  activePath: string;
  exact?: boolean;
  href: string;
  icon: LucideIcon;
  key: "news" | "characters" | "reports" | "purchases" | "connect";
  label: string;
};

const fanletterNewsMobileNavHeightClass =
  "h-[calc(5rem+env(safe-area-inset-bottom))]";
const fanletterNewsTopLevelServiceSegments = new Set([
  "activate",
  "characters",
  "connect",
  "platform",
  "purchases",
  "reporters",
  "reports",
  "vlogs",
  "wallet",
]);

function trimTrailingSlash(pathname: string) {
  if (pathname.length <= 1) {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function buildCurrentReturnTo(pathname: string, searchParams: URLSearchParams) {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.delete("returnTo");

  const search = nextSearchParams.toString();

  return `${pathname}${search ? `?${search}` : ""}`;
}

function isNewsReportDetailPath(pathname: string, basePath: string) {
  if (!pathname.startsWith(`${basePath}/`)) {
    return false;
  }

  const segments = pathname.slice(basePath.length + 1).split("/").filter(Boolean);

  return (
    segments.length === 1 &&
    !fanletterNewsTopLevelServiceSegments.has(segments[0] ?? "")
  );
}

export function FanletterNewsMobileBottomNav({ locale }: { locale: Locale }) {
  const pathname = trimTrailingSlash(usePathname());
  const searchParams = useSearchParams();
  const currentSearchParams = new URLSearchParams(searchParams.toString());
  const basePath = `/${locale}/fanletter/news`;
  const connectPath = `${basePath}/connect`;
  const activatePath = `${basePath}/activate`;
  const purchasesPath = `${basePath}/purchases`;
  const reportsPath = `${basePath}/reports`;
  const walletPath = `${basePath}/wallet`;

  if (
    pathname === basePath ||
    pathname === `${basePath}/platform` ||
    isNewsReportDetailPath(pathname, basePath)
  ) {
    return null;
  }

  const referralCode = normalizeReferralCode(searchParams.get("ref"));
  const buildHref = (path: string) => buildPathWithReferral(path, referralCode);
  const isWalletServicePath =
    pathname === connectPath ||
    pathname === activatePath ||
    pathname === walletPath;
  const currentReturnTo =
    isWalletServicePath
      ? buildHref(basePath)
      : buildCurrentReturnTo(pathname, currentSearchParams);
  const items: FanletterNewsMobileNavItem[] = [
    {
      activePath: basePath,
      exact: true,
      href: buildHref(basePath),
      icon: Newspaper,
      key: "news",
      label: locale === "ko" ? "뉴스 홈" : "News",
    },
    {
      activePath: `${basePath}/characters`,
      href: buildHref(`${basePath}/characters`),
      icon: Sparkles,
      key: "characters",
      label: locale === "ko" ? "AI 캐릭터" : "AI Characters",
    },
    {
      activePath: purchasesPath,
      href: buildHref(purchasesPath),
      icon: BookOpenCheck,
      key: "purchases",
      label: locale === "ko" ? "구매함" : "Purchases",
    },
    {
      activePath: reportsPath,
      href: buildHref(reportsPath),
      icon: PenLine,
      key: "reports",
      label: locale === "ko" ? "리포트" : "Reports",
    },
    {
      activePath: connectPath,
      href: setPathSearchParams(buildHref(connectPath), {
        returnTo: currentReturnTo,
      }),
      icon: WalletCards,
      key: "connect",
      label: locale === "ko" ? "지갑연결" : "Connect",
    },
  ];

  return (
    <>
      <div
        aria-hidden="true"
        className={cn("md:hidden", fanletterNewsMobileNavHeightClass)}
      />
      <nav
        aria-label={
          locale === "ko"
            ? "FanLetter News 모바일 메뉴"
            : "FanLetter News mobile navigation"
        }
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/12 bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 text-[#111510] shadow-[0_-14px_38px_rgba(17,21,16,0.16)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.activePath
              : item.key === "connect"
                ? isWalletServicePath
                : pathname === item.activePath ||
                  pathname.startsWith(`${item.activePath}/`);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-center text-[0.68rem] font-black leading-none !text-black/54 transition hover:!text-[#126c2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b]",
                  active && "!text-[#111510]",
                )}
                href={item.href}
                key={item.key}
              >
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full text-[#16702e] transition",
                    active && "bg-[#ecfff0] text-[#126c2c]",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="block max-w-full truncate">
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
