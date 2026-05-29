"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpenCheck,
  CircleUserRound,
  Newspaper,
  PenLine,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useSyncExternalStore } from "react";

import type { Locale } from "@/lib/i18n";
import {
  FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
  FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY,
  normalizeFanletterNewsRolePreference,
} from "@/lib/fanletter-news-role-preference";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { cn } from "@/lib/utils";

type FanletterNewsMobileNavItem = {
  activePath: string;
  activePaths?: string[];
  exact?: boolean;
  href: string;
  icon: LucideIcon;
  key: "news" | "characters" | "action" | "purchases" | "my";
  label: string;
  primary?: boolean;
};

const fanletterNewsMobileNavHeightClass =
  "h-[calc(5rem+env(safe-area-inset-bottom))]";
const fanletterNewsTopLevelServiceSegments = new Set([
  "activate",
  "characters",
  "connect",
  "my",
  "platform",
  "purchases",
  "reporters",
  "reports",
  "vlogs",
  "wallet",
]);

function subscribeToRolePreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(
    FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
    onStoreChange,
  );

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(
      FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
      onStoreChange,
    );
  };
}

function getRolePreferenceSnapshot() {
  return normalizeFanletterNewsRolePreference(
    window.localStorage.getItem(FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY),
  );
}

function getServerRolePreferenceSnapshot() {
  return "general" as const;
}

function trimTrailingSlash(pathname: string) {
  if (pathname.length <= 1) {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
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
  const rolePreference = useSyncExternalStore(
    subscribeToRolePreference,
    getRolePreferenceSnapshot,
    getServerRolePreferenceSnapshot,
  );
  const basePath = `/${locale}/fanletter/news`;
  const connectPath = `${basePath}/connect`;
  const activatePath = `${basePath}/activate`;
  const myPath = `${basePath}/my`;
  const purchasesPath = `${basePath}/purchases`;
  const reportsPath = `${basePath}/reports`;
  const walletPath = `${basePath}/wallet`;
  const fanletterBasePath = `/${locale}/fanletter`;

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
    pathname === walletPath ||
    pathname.startsWith(`${walletPath}/`);
  const myHref = buildHref(myPath);
  const studioVlogsHref = buildHref(`${fanletterBasePath}/studio/vlogs`);
  const vloggerActionHref = setPathSearchParams(
    buildHref(`${fanletterBasePath}/create`),
    { returnTo: studioVlogsHref },
  );
  const reporterActionHref = buildHref(`${reportsPath}/new`);
  const actionItem =
    rolePreference === "vlogger"
      ? {
          activePath: `${fanletterBasePath}/create`,
          activePaths: [
            `${fanletterBasePath}/create`,
            `${fanletterBasePath}/studio/vlogs`,
          ],
          href: vloggerActionHref,
          icon: Video,
          key: "action" as const,
          label: locale === "ko" ? "브이로그" : "Vlog",
          primary: true,
        }
      : rolePreference === "reporter"
        ? {
            activePath: `${reportsPath}/new`,
            href: reporterActionHref,
            icon: PenLine,
            key: "action" as const,
            label: locale === "ko" ? "리포트 작성" : "Report",
            primary: true,
          }
        : {
            activePath: myPath,
            href: myHref,
            icon: CircleUserRound,
            key: "action" as const,
            label: locale === "ko" ? "내 허브" : "My Hub",
            primary: true,
          };
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
    actionItem,
    {
      activePath: purchasesPath,
      href: buildHref(purchasesPath),
      icon: BookOpenCheck,
      key: "purchases",
      label: locale === "ko" ? "구매함" : "Purchases",
    },
    {
      activePath: myPath,
      activePaths: [myPath, connectPath, activatePath, walletPath],
      href: myHref,
      icon: CircleUserRound,
      key: "my",
      label: locale === "ko" ? "마이" : "My",
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
            const activePaths = item.activePaths ?? [item.activePath];
            const active = item.exact
              ? pathname === item.activePath
              : item.key === "my"
                ? pathname === myPath || isWalletServicePath
                : activePaths.some(
                    (activePath) =>
                      pathname === activePath ||
                      pathname.startsWith(`${activePath}/`),
                  );

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-[0.68rem] font-black leading-none !text-black/54 transition hover:!text-[#126c2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b]",
                  active && "!text-[#111510]",
                  item.primary && "relative -mt-3 !text-[#111510]",
                )}
                href={item.href}
                key={item.key}
              >
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full text-[#16702e] transition",
                    active && "bg-[#ecfff0] text-[#126c2c]",
                    item.primary &&
                      "size-12 bg-[#44f26e] text-black shadow-[0_14px_34px_rgba(25,184,75,0.22)]",
                    active &&
                      item.primary &&
                      "ring-2 ring-[#44f26e]/36 ring-offset-2 ring-offset-white",
                  )}
                >
                  <Icon className={item.primary ? "size-6" : "size-5"} />
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
