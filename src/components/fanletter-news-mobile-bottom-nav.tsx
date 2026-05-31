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

import { useMemberSession } from "@/components/member-session-provider";
import type { Locale } from "@/lib/i18n";
import {
  getFanletterNewsVlogManageHref,
  getFanletterNewsVlogNewHref,
} from "@/lib/fanletter-news-vlog-routing";
import {
  FANLETTER_NEWS_REPORTER_PROFILE_CHANGE_EVENT,
  FANLETTER_NEWS_REPORTER_PROFILE_STORAGE_KEY,
  normalizeFanletterNewsReporterNavProfile,
  type FanletterNewsReporterNavProfile,
} from "@/lib/fanletter-news-reporter-nav-profile";
import {
  FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
  FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY,
  normalizeFanletterNewsRolePreference,
} from "@/lib/fanletter-news-role-preference";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode, type MemberRecord } from "@/lib/member";
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
  profileBadge?: string;
  profileFallback?: string | null;
  profileImageUrl?: string | null;
  title?: string;
};

const fanletterNewsMobileNavHeightClass =
  "h-[calc(5.35rem+env(safe-area-inset-bottom))]";
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
let reporterProfileSnapshotRaw: string | null = null;
let reporterProfileSnapshotValue: FanletterNewsReporterNavProfile | null = null;

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

function subscribeToReporterProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(
    FANLETTER_NEWS_REPORTER_PROFILE_CHANGE_EVENT,
    onStoreChange,
  );

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(
      FANLETTER_NEWS_REPORTER_PROFILE_CHANGE_EVENT,
      onStoreChange,
    );
  };
}

function getReporterProfileSnapshot() {
  const raw = window.localStorage.getItem(
    FANLETTER_NEWS_REPORTER_PROFILE_STORAGE_KEY,
  );

  if (raw === reporterProfileSnapshotRaw) {
    return reporterProfileSnapshotValue;
  }

  reporterProfileSnapshotRaw = raw;

  try {
    reporterProfileSnapshotValue = normalizeFanletterNewsReporterNavProfile(
      JSON.parse(raw ?? "null"),
    );
  } catch {
    reporterProfileSnapshotValue = null;
  }

  return reporterProfileSnapshotValue;
}

function getServerReporterProfileSnapshot() {
  return null;
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

function getReporterProfile({
  member,
  storedProfile,
}: {
  member?: MemberRecord | null;
  storedProfile?: FanletterNewsReporterNavProfile | null;
}): FanletterNewsReporterNavProfile {
  if (!member) {
    return {
      avatarImageUrl: storedProfile?.avatarImageUrl ?? null,
      displayName: storedProfile?.displayName ?? storedProfile?.referralCode ?? null,
      referralCode: storedProfile?.referralCode ?? null,
    };
  }

  const matchingStoredProfile =
    storedProfile?.referralCode &&
    member.referralCode &&
    storedProfile.referralCode === member.referralCode
      ? storedProfile
      : null;

  return {
    avatarImageUrl:
      matchingStoredProfile?.avatarImageUrl ??
      member.publicProfile?.avatarImageUrl ??
      null,
    displayName:
      matchingStoredProfile?.displayName ??
      member.publicProfile?.displayName ??
      member.referralCode ??
      member.email.split("@")[0] ??
      null,
    referralCode: member.referralCode ?? matchingStoredProfile?.referralCode ?? null,
  };
}

function getReporterProfileInitial(profile: FanletterNewsReporterNavProfile) {
  return (
    profile.displayName?.trim().charAt(0).toUpperCase() ||
    profile.referralCode?.trim().charAt(0).toUpperCase() ||
    null
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
  const storedReporterProfile = useSyncExternalStore(
    subscribeToReporterProfile,
    getReporterProfileSnapshot,
    getServerReporterProfileSnapshot,
  );
  const memberSession = useMemberSession();
  const basePath = `/${locale}/fanletter/news`;
  const platformPath = `${basePath}/platform`;
  const connectPath = `${basePath}/connect`;
  const activatePath = `${basePath}/activate`;
  const myPath = `${basePath}/my`;
  const purchasesPath = `${basePath}/purchases`;
  const reportsPath = `${basePath}/reports`;
  const walletPath = `${basePath}/wallet`;
  const vlogsManagePath = `${basePath}/vlogs/manage`;
  const vlogsNewPath = `${basePath}/vlogs/new`;
  const shouldHideNav =
    pathname === basePath ||
    pathname === platformPath ||
    isNewsReportDetailPath(pathname, basePath);

  if (shouldHideNav) {
    return null;
  }

  const referralCode = normalizeReferralCode(searchParams.get("ref"));
  const reporterProfile = getReporterProfile({
    member: memberSession.member,
    storedProfile: storedReporterProfile,
  });
  const buildHref = (path: string) => buildPathWithReferral(path, referralCode);
  const isWalletServicePath =
    pathname === connectPath ||
    pathname === activatePath ||
    pathname === walletPath ||
    pathname.startsWith(`${walletPath}/`);
  const myHref = buildHref(myPath);
  const vloggerManageHref = getFanletterNewsVlogManageHref({
    locale,
    referralCode,
  });
  const vloggerActionHref = getFanletterNewsVlogNewHref({
    locale,
    referralCode,
    returnToHref: vloggerManageHref,
  });
  const reporterActionHref = buildHref(`${reportsPath}/new`);
  const actionItem =
    rolePreference === "vlogger"
      ? {
          activePath: vlogsNewPath,
          activePaths: [vlogsNewPath, vlogsManagePath],
          href: vloggerActionHref,
          icon: Video,
          key: "action" as const,
          label: locale === "ko" ? "새 브이로그" : "New Vlog",
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
            profileBadge: locale === "ko" ? "기자" : "REP",
            profileFallback: getReporterProfileInitial(reporterProfile),
            profileImageUrl: reporterProfile.avatarImageUrl,
            title: reporterProfile.displayName
              ? locale === "ko"
                ? `${reporterProfile.displayName} 리포트 작성`
                : `Create report as ${reporterProfile.displayName}`
              : undefined,
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
      activePath: platformPath,
      exact: true,
      href: buildHref(platformPath),
      icon: Newspaper,
      key: "news",
      label: locale === "ko" ? "홈" : "Home",
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
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 text-[#111510] md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-0.5 rounded-lg border border-black/10 bg-white/96 p-1 shadow-[0_-10px_34px_rgba(17,21,16,0.14)] backdrop-blur-xl">
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
                  "relative flex h-[3.65rem] min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[0.64rem] font-black leading-none !text-black/48 transition hover:bg-[#f4f8f2] hover:!text-[#126c2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b]",
                  active && "bg-[#f3fbf4] !text-[#111510]",
                  item.primary &&
                    "h-[4.05rem] -translate-y-1 bg-transparent !text-[#111510] hover:bg-transparent",
                )}
                href={item.href}
                key={item.key}
                title={item.title}
              >
                <span
                  className={cn(
                    "relative inline-flex size-7 items-center justify-center rounded-full text-[#16702e] transition",
                    active && !item.primary && "bg-white text-[#126c2c] shadow-sm",
                    item.primary &&
                      "size-10 bg-[#44f26e] text-black shadow-[0_10px_26px_rgba(25,184,75,0.28)] ring-4 ring-white",
                    active &&
                      item.primary &&
                      "bg-[#35ef61] shadow-[0_12px_30px_rgba(25,184,75,0.34)] ring-[#ecfff0]",
                    )}
                >
                  {item.primary && item.profileImageUrl ? (
                    <span
                      aria-hidden="true"
                      className="block size-full rounded-full bg-cover bg-center bg-no-repeat shadow-[inset_0_0_0_1px_rgba(17,21,16,0.12)]"
                      style={{
                        backgroundImage: `url(${item.profileImageUrl})`,
                      }}
                    />
                  ) : item.primary && item.profileFallback ? (
                    <span className="text-base font-black leading-none">
                      {item.profileFallback}
                    </span>
                  ) : (
                    <Icon className={item.primary ? "size-5" : "size-[1.15rem]"} />
                  )}
                  {item.primary && item.profileBadge ? (
                    <span className="absolute -right-2 -top-1 rounded-full bg-[#111510] px-1.5 py-0.5 text-[0.5rem] font-black leading-none text-[#44f26e] ring-2 ring-white">
                      {item.profileBadge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "block max-w-full truncate text-black/52",
                    active && "text-[#111510]",
                    item.primary && "text-[#111510]",
                  )}
                >
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
