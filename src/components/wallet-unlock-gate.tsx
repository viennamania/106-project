"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import type { Locale } from "@/lib/i18n";
import { buildWalletUnlockHref, getWalletUnlockCopy } from "@/lib/wallet-unlock";
import { isWalletUnlockedForSession } from "@/lib/wallet-unlock-session";
import { thirdwebClient } from "@/lib/thirdweb";

function useCurrentReturnTo(fallback: string | null | undefined) {
  const pathname = usePathname();

  return useMemo(() => {
    if (fallback) {
      return fallback;
    }

    const search =
      typeof window === "undefined" ? "" : window.location.search.replace(/^\?/, "");
    return search ? `${pathname}?${search}` : pathname;
  }, [fallback, pathname]);
}

export function useWalletUnlockGate({
  email,
  locale,
  referralCode = null,
  returnTo = null,
  walletAddress,
}: {
  email?: string | null;
  locale: Locale;
  referralCode?: string | null;
  returnTo?: string | null;
  walletAddress?: string | null;
}) {
  const [resolvedEmail, setResolvedEmail] = useState(email ?? null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const effectiveReturnTo = useCurrentReturnTo(returnTo);
  const copy = getWalletUnlockCopy(locale);
  const effectiveEmail = email ?? resolvedEmail;

  useEffect(() => {
    if (email) {
      return;
    }

    if (!walletAddress) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextEmail = await getUserEmail({ client: thirdwebClient });

        if (!cancelled) {
          setResolvedEmail(nextEmail ?? null);
        }
      } catch {
        if (!cancelled) {
          setResolvedEmail(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [email, walletAddress]);

  useEffect(() => {
    function refresh() {
      setIsUnlocked(
        isWalletUnlockedForSession({
          email: effectiveEmail,
          walletAddress,
        }),
      );
    }

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [effectiveEmail, walletAddress]);

  return {
    copy,
    isUnlocked,
    unlockHref: buildWalletUnlockHref({
      locale,
      referralCode,
      returnTo: effectiveReturnTo,
    }),
  };
}

export function WalletUnlockAction({
  className,
  children,
  href,
}: {
  className: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link className={className} href={href}>
      <LockKeyhole className="size-4 shrink-0" />
      {children}
    </Link>
  );
}
