"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { Suspense, useMemo, type ComponentType } from "react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { hasThirdwebClientId } from "@/lib/thirdweb";
import { useThirdwebConnectionState } from "@/lib/thirdweb-client";

type AccountStatusTone = "connected" | "muted" | "warning";

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
  className?: string;
  compactOnMobile?: boolean;
  locale: Locale;
  referralCode: string | null;
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

function getToneClassName(tone: AccountStatusTone) {
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
  compactOnMobile = true,
  locale,
  referralCode,
}: FanletterAccountStatusLinkProps) {
  const copy = getCopy(locale);
  const href = buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode);

  return (
    <Link
      className={joinClasses(
        "inline-flex h-10 max-w-[14rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition sm:px-4",
        getToneClassName("muted"),
        className,
      )}
      href={href}
      title={copy.disconnected}
    >
      <Mail className="size-4 shrink-0" />
      <span className={compactOnMobile ? "hidden sm:inline" : "inline"}>
        {copy.disconnected}
      </span>
      {compactOnMobile ? <span className="sm:hidden">{copy.disconnected}</span> : null}
    </Link>
  );
}

function FanletterAccountStatusLinkInner({
  className,
  compactOnMobile = true,
  locale,
  referralCode,
}: FanletterAccountStatusLinkProps) {
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    resolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    status: connectionStatus,
  });
  const copy = getCopy(locale);
  const search = searchParams?.toString() ?? "";
  const fallbackPath = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const currentHref = useMemo(
    () => getCurrentHref({ fallbackPath, pathname, search }),
    [fallbackPath, pathname, search],
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: currentHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: currentHref },
  );
  const identityLabel =
    memberSession.email ?? formatAddressLabel(accountAddress) ?? copy.connected;
  const connectedLabel = `${copy.connected} · ${identityLabel}`;
  const member = memberSession.member;
  const isMemberChecking =
    memberSession.isValidating || memberSession.status === "validating";
  const view: AccountStatusView = !hasThirdwebClientId
    ? {
        Icon: CircleAlert,
        href: connectHref,
        label: copy.setupMissing,
        mobileLabel: copy.issue,
        title: copy.setupMissing,
        tone: "warning",
      }
    : connection.isResolving || isMemberChecking
      ? {
          Icon: Loader2,
          href: connectHref,
          label: copy.checking,
          loading: true,
          mobileLabel: copy.checking,
          title: copy.checking,
          tone: "muted",
        }
      : connection.isDisconnected
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
          : member?.status === "pending_payment"
            ? {
                Icon: ShieldAlert,
                href: activateHref,
                label: copy.payment,
                mobileLabel: copy.payment,
                title: copy.payment,
                tone: "warning",
              }
            : memberSession.status === "error" && !member
              ? {
                  Icon: CircleAlert,
                  href: connectHref,
                  label: copy.issue,
                  mobileLabel: copy.issue,
                  title: memberSession.error ?? copy.issue,
                  tone: "warning",
                }
              : {
                  Icon: CheckCircle2,
                  href: connectHref,
                  label: connectedLabel,
                  mobileLabel: copy.connected,
                  title: connectedLabel,
                  tone: "connected",
                };
  const Icon = view.Icon;

  return (
    <Link
      className={joinClasses(
        "inline-flex h-10 max-w-[14rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition sm:px-4",
        getToneClassName(view.tone),
        className,
      )}
      href={view.href}
      title={view.title}
    >
      <Icon
        className={joinClasses("size-4 shrink-0", view.loading && "animate-spin")}
      />
      <span
        className={joinClasses(
          "min-w-0 truncate",
          compactOnMobile ? "hidden sm:inline" : "inline",
        )}
      >
        {view.label}
      </span>
      {compactOnMobile ? (
        <span className="min-w-0 truncate sm:hidden">{view.mobileLabel}</span>
      ) : null}
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
