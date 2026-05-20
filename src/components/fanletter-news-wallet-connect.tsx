"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  ShieldAlert,
  WalletMinimal,
} from "lucide-react";
import { Suspense, useMemo, type ComponentType } from "react";

import { useFanletterAccountStatus } from "@/lib/fanletter-account-status";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type NewsWalletConnectTone = "connected" | "muted" | "warning";

type NewsWalletConnectView = {
  Icon: ComponentType<{ className?: string }>;
  href: string;
  label: string;
  loading?: boolean;
  title: string;
  tone: NewsWalletConnectTone;
};

type FanletterNewsWalletConnectProps = {
  className?: string;
  locale: Locale;
  referralCode: string | null;
  walletHref: string;
};

const CONNECTION_RESOLVE_GRACE_MS = 3000;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        checking: "지갑 확인 중",
        connected: "지갑 연결됨",
        connect: "뉴스 지갑 연결",
        issue: "지갑 확인 필요",
        payment: "가입 확인 필요",
        setupMissing: "지갑 설정 필요",
        wallet: "뉴스 지갑 상태 보기",
      }
    : {
        checking: "Checking wallet",
        connected: "Wallet connected",
        connect: "Connect news wallet",
        issue: "Check wallet",
        payment: "Verify signup",
        setupMissing: "Wallet setup needed",
        wallet: "View news wallet status",
      };
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

function getToneClassName(tone: NewsWalletConnectTone) {
  if (tone === "connected") {
    return "border-[#44f26e]/76 bg-[#44f26e] !text-black shadow-[0_12px_30px_rgba(68,242,110,0.18)] hover:bg-[#69ff8c]";
  }

  if (tone === "warning") {
    return "border-amber-300/54 bg-amber-100 !text-amber-950 hover:bg-amber-200";
  }

  return "border-black/14 bg-[#111510] !text-white shadow-[0_12px_30px_rgba(12,18,14,0.14)] hover:bg-black";
}

function FanletterNewsWalletConnectFallback({
  className,
  locale,
  walletHref,
}: FanletterNewsWalletConnectProps) {
  const copy = getCopy(locale);

  return (
    <Link
      className={joinClasses(
        "inline-flex h-10 max-w-[12rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black transition sm:h-11 sm:px-4 sm:text-sm",
        getToneClassName("muted"),
        className,
      )}
      href={walletHref}
      title={copy.connect}
    >
      <WalletMinimal className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{copy.connect}</span>
    </Link>
  );
}

function FanletterNewsWalletConnectInner({
  className,
  locale,
  referralCode,
  walletHref,
}: FanletterNewsWalletConnectProps) {
  const accountStatus = useFanletterAccountStatus({
    disconnectedResolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    resolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
  });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const copy = getCopy(locale);
  const search = searchParams?.toString() ?? "";
  const fallbackPath = buildPathWithReferral(`/${locale}/fanletter/news`, referralCode);
  const currentHref = useMemo(
    () => getCurrentHref({ fallbackPath, pathname, search }),
    [fallbackPath, pathname, search],
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: currentHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: currentHref },
  );
  const member = accountStatus.member;
  const shouldShowConnectWhileResolving =
    accountStatus.status === "checking" &&
    !accountStatus.accountAddress &&
    !accountStatus.email &&
    !member;
  const view: NewsWalletConnectView =
    accountStatus.status === "setupMissing"
      ? {
          Icon: CircleAlert,
          href: connectHref,
          label: copy.setupMissing,
          title: copy.setupMissing,
          tone: "warning",
        }
      : accountStatus.status === "checking"
        ? shouldShowConnectWhileResolving
          ? {
              Icon: WalletMinimal,
              href: connectHref,
              label: copy.connect,
              title: copy.connect,
              tone: "muted",
            }
          : {
              Icon: Loader2,
              href: connectHref,
              label: copy.checking,
              loading: true,
              title: copy.checking,
              tone: "muted",
            }
        : accountStatus.status === "disconnected"
          ? {
              Icon: WalletMinimal,
              href: connectHref,
              label: copy.connect,
              title: copy.connect,
              tone: "muted",
            }
          : member?.serviceSuspendedAt
            ? {
                Icon: CircleAlert,
                href: connectHref,
                label: copy.issue,
                title: copy.issue,
                tone: "warning",
              }
            : accountStatus.status === "pendingPayment"
              ? {
                  Icon: ShieldAlert,
                  href: activateHref,
                  label: copy.payment,
                  title: copy.payment,
                  tone: "warning",
                }
              : accountStatus.status === "issue"
                ? {
                    Icon: CircleAlert,
                    href: connectHref,
                    label: copy.issue,
                    title: accountStatus.memberSession.error ?? copy.issue,
                    tone: "warning",
                  }
                : {
                    Icon: CheckCircle2,
                    href: walletHref,
                    label: copy.connected,
                    title: copy.wallet,
                    tone: "connected",
                  };
  const Icon = view.Icon;

  return (
    <Link
      className={joinClasses(
        "inline-flex h-10 max-w-[12rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black transition sm:h-11 sm:px-4 sm:text-sm",
        getToneClassName(view.tone),
        className,
      )}
      href={view.href}
      title={view.title}
    >
      <Icon
        className={joinClasses("size-4 shrink-0", view.loading && "animate-spin")}
      />
      <span className="min-w-0 truncate">{view.label}</span>
    </Link>
  );
}

export function FanletterNewsWalletConnect(
  props: FanletterNewsWalletConnectProps,
) {
  return (
    <Suspense fallback={<FanletterNewsWalletConnectFallback {...props} />}>
      <FanletterNewsWalletConnectInner {...props} />
    </Suspense>
  );
}
