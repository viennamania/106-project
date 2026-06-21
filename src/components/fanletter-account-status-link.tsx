"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
} from "lucide-react";
import { Suspense, useMemo, type ComponentType } from "react";

import { useFanletterAccountStatus } from "@/lib/fanletter-account-status";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type AccountStatusTone = "connected" | "muted" | "warning";
type AccountStatusSurface = "dark" | "light";

type AccountStatusView = {
  Icon: ComponentType<{ className?: string }>;
  href: string;
  label: string;
  mobileLabel: string;
  title: string;
  tone: AccountStatusTone;
  loading?: boolean;
};

type FanletterAccountStatusLinkProps = {
  accountActivateHref?: string;
  accountConnectHref?: string;
  accountFallbackHref?: string;
  className?: string;
  compactOnMobile?: boolean;
  hideIdentity?: boolean;
  locale: Locale;
  referralCode: string | null;
  surface?: AccountStatusSurface;
};

const CONNECTION_RESOLVE_GRACE_MS = 3000;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        checking: "계정 확인 중",
        connected: "연결됨",
        disconnected: "계정 연결",
        issue: "계정 확인 필요",
        payment: "가입 확인 필요",
        serviceSuspended: "서비스 중단",
        setupMissing: "계정 설정 필요",
      }
    : {
        checking: "Checking account",
        connected: "Connected",
        disconnected: "Connect account",
        issue: "Check account",
        payment: "Verify signup",
        serviceSuspended: "Suspended",
        setupMissing: "Account setup needed",
      };
}

function formatAddressLabel(address: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function getCurrentHref({
  fallbackPath,
  pathname,
  search,
}: {
  fallbackPath: string;
  pathname: string | null;
  search: string;
}) {
  const currentPathname = pathname || fallbackPath;

  return `${currentPathname}${search ? `?${search}` : ""}`;
}

function getToneClassName(
  tone: AccountStatusTone,
  surface: AccountStatusSurface = "dark",
) {
  if (surface === "light") {
    if (tone === "connected") {
      return "border-emerald-200 bg-emerald-50 !text-emerald-800 shadow-[0_12px_28px_rgba(16,185,129,0.1)] hover:border-emerald-300 hover:bg-emerald-100";
    }

    if (tone === "warning") {
      return "border-amber-200 bg-amber-50 !text-amber-800 hover:border-amber-300 hover:bg-amber-100";
    }

    return "border-zinc-200 bg-white/90 !text-zinc-950 shadow-[0_12px_28px_rgba(15,23,42,0.08)] hover:border-zinc-300 hover:bg-zinc-50";
  }

  if (tone === "connected") {
    return "border-[#44f26e]/70 bg-[#44f26e] !text-black shadow-[0_12px_28px_rgba(68,242,110,0.16)] hover:bg-[#67ff88]";
  }

  if (tone === "warning") {
    return "border-amber-300/34 bg-amber-300/14 !text-amber-50 hover:border-amber-200/60 hover:bg-amber-300/20";
  }

  return "border-white/16 bg-white/[0.06] !text-white hover:border-white/36 hover:bg-white/[0.1]";
}

function FanletterAccountStatusLinkFallback({
  className,
  accountConnectHref,
  locale,
  referralCode,
  surface = "dark",
}: FanletterAccountStatusLinkProps) {
  const copy = getCopy(locale);
  const href =
    accountConnectHref ??
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode);

  return (
    <Link
      className={joinClasses(
        "inline-flex h-11 max-w-[14rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition sm:h-10 sm:px-4",
        getToneClassName("muted", surface),
        className,
      )}
      href={href}
      title={copy.disconnected}
    >
      <Mail className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{copy.disconnected}</span>
    </Link>
  );
}

function FanletterAccountStatusLinkInner({
  className,
  accountConnectHref,
  accountFallbackHref,
  compactOnMobile = true,
  hideIdentity = false,
  locale,
  referralCode,
  surface = "dark",
}: FanletterAccountStatusLinkProps) {
  const accountStatus = useFanletterAccountStatus({
    disconnectedResolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    resolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
  });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const copy = getCopy(locale);
  const search = searchParams?.toString() ?? "";
  const fallbackPath =
    accountFallbackHref ??
    buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const currentHref = useMemo(
    () => getCurrentHref({ fallbackPath, pathname, search }),
    [fallbackPath, pathname, search],
  );
  const connectHref = setPathSearchParams(
    accountConnectHref ??
      buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: currentHref },
  );
  const identityLabel =
    accountStatus.email ??
    formatAddressLabel(accountStatus.accountAddress) ??
    copy.connected;
  const connectedLabel = hideIdentity
    ? copy.connected
    : `${copy.connected} · ${identityLabel}`;
  const connectedTitle = `${copy.connected} · ${identityLabel}`;
  const member = accountStatus.member;
  const shouldShowConnectWhileResolving =
    accountStatus.status === "checking" &&
    !accountStatus.accountAddress &&
    !accountStatus.email &&
    !member;
  const view: AccountStatusView = accountStatus.status === "setupMissing"
    ? {
        Icon: CircleAlert,
        href: connectHref,
        label: copy.setupMissing,
        mobileLabel: copy.issue,
        title: copy.setupMissing,
        tone: "warning",
      }
    : accountStatus.status === "checking"
      ? shouldShowConnectWhileResolving
        ? {
            Icon: Mail,
            href: connectHref,
            label: copy.disconnected,
            mobileLabel: copy.disconnected,
            title: copy.disconnected,
            tone: "muted",
          }
        : {
            Icon: Loader2,
            href: connectHref,
            label: copy.checking,
            loading: true,
            mobileLabel: copy.checking,
            title: copy.checking,
            tone: "muted",
          }
      : accountStatus.status === "disconnected"
        ? {
            Icon: Mail,
            href: connectHref,
            label: copy.disconnected,
            mobileLabel: copy.disconnected,
            title: copy.disconnected,
            tone: "muted",
          }
        : member?.serviceSuspendedAt
          ? {
              Icon: CircleAlert,
              href: connectHref,
              label: copy.serviceSuspended,
              mobileLabel: copy.issue,
              title: copy.serviceSuspended,
              tone: "warning",
            }
          : accountStatus.status === "issue"
            ? {
                Icon: CircleAlert,
                href: connectHref,
                label: copy.issue,
                mobileLabel: copy.issue,
                title: accountStatus.memberSession.error ?? copy.issue,
                tone: "warning",
              }
            : {
                Icon: CheckCircle2,
                href: connectHref,
                label: connectedLabel,
                mobileLabel: copy.connected,
                title: connectedTitle,
                tone: "connected",
              };
  const Icon = view.Icon;
  const shouldUseCompactLabels =
    compactOnMobile && view.mobileLabel !== view.label;

  return (
    <Link
      className={joinClasses(
        "inline-flex h-11 max-w-[14rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition sm:h-10 sm:px-4",
        getToneClassName(view.tone, surface),
        className,
      )}
      href={view.href}
      title={view.title}
    >
      <Icon
        className={joinClasses("size-4 shrink-0", view.loading && "animate-spin")}
      />
      {shouldUseCompactLabels ? (
        <>
          <span className="hidden min-w-0 truncate sm:inline">{view.label}</span>
          <span className="min-w-0 truncate sm:hidden">{view.mobileLabel}</span>
        </>
      ) : (
        <span className="min-w-0 truncate">{view.label}</span>
      )}
    </Link>
  );
}

export function FanletterAccountStatusLink(
  props: FanletterAccountStatusLinkProps,
) {
  return (
    <Suspense fallback={<FanletterAccountStatusLinkFallback {...props} />}>
      <FanletterAccountStatusLinkInner {...props} />
    </Suspense>
  );
}
