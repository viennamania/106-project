"use client";

import { FanletterNewsWalletConnect } from "@/components/fanletter-news-wallet-connect";
import { useFanletterAccountStatus } from "@/lib/fanletter-account-status";
import type { Locale } from "@/lib/i18n";

const CONNECTION_RESOLVE_GRACE_MS = 3000;

export function FanletterNewsWalletSidebarCard({
  body,
  eyebrow,
  forceVisible = false,
  locale,
  referralCode,
  title,
  walletHref,
}: {
  body: string;
  eyebrow: string;
  forceVisible?: boolean;
  locale: Locale;
  referralCode: string | null;
  title: string;
  walletHref: string;
}) {
  const accountStatus = useFanletterAccountStatus({
    disconnectedResolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    resolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
  });

  if (
    !forceVisible &&
    (accountStatus.status === "connected" ||
      accountStatus.status === "pendingPayment")
  ) {
    return null;
  }

  return (
    <section className="border border-black/12 bg-[#111510] p-3 text-white shadow-[0_14px_34px_rgba(12,18,14,0.12)]">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 break-words text-base font-black leading-tight [word-break:keep-all]">
        {title}
      </h2>
      <p className="mt-1.5 text-xs font-semibold leading-5 text-white/58">
        {body}
      </p>
      <FanletterNewsWalletConnect
        className="mt-3 w-full max-w-none"
        locale={locale}
        referralCode={referralCode}
        walletHref={walletHref}
      />
    </section>
  );
}
