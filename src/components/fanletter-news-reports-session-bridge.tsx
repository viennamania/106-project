"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useMemberSession } from "@/components/member-session-provider";
import type { Locale } from "@/lib/i18n";

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        checking: "브라우저에 연결된 뉴스 지갑 상태를 확인 중입니다.",
        ready:
          "연결된 뉴스 지갑을 확인했습니다. 리포트 목록을 다시 불러옵니다.",
        retry:
          "지갑 연결 상태를 확인하지 못했습니다. 뉴스 계정 연결을 다시 진행하세요.",
      }
    : {
        checking: "Checking the news wallet connected in this browser.",
        ready: "News wallet detected. Reloading the report desk.",
        retry: "Could not verify the wallet connection. Connect the news account again.",
      };
}

export function FanletterNewsReportsSessionBridge({
  hasServerSession,
  locale,
  serverSessionEmail,
  serverSessionWalletAddress,
}: {
  hasServerSession: boolean;
  locale: Locale;
  serverSessionEmail?: string | null;
  serverSessionWalletAddress?: string | null;
}) {
  const router = useRouter();
  const memberSession = useMemberSession();
  const refreshKeyRef = useRef<string | null>(null);
  const copy = getCopy(locale);
  const clientEmail = normalizeValue(memberSession.email ?? memberSession.member?.email);
  const clientWalletAddress = normalizeValue(memberSession.accountAddress);
  const serverEmail = normalizeValue(serverSessionEmail);
  const serverWalletAddress = normalizeValue(serverSessionWalletAddress);
  const isChecking =
    memberSession.isValidating || memberSession.status === "validating";
  const hasReadyClientSession = Boolean(
    memberSession.status === "ready" &&
      memberSession.member &&
      clientEmail &&
      clientWalletAddress,
  );

  useEffect(() => {
    if (isChecking) {
      return;
    }

    let refreshKey: string | null = null;

    if (!hasServerSession && hasReadyClientSession) {
      refreshKey = `client-ready:${clientEmail}:${clientWalletAddress}`;
    }

    if (
      hasServerSession &&
      hasReadyClientSession &&
      serverEmail &&
      serverWalletAddress &&
      (serverEmail !== clientEmail || serverWalletAddress !== clientWalletAddress)
    ) {
      refreshKey = `server-mismatch:${clientEmail}:${clientWalletAddress}`;
    }

    if (!refreshKey || refreshKeyRef.current === refreshKey) {
      return;
    }

    refreshKeyRef.current = refreshKey;
    const timeoutId = window.setTimeout(() => {
      router.refresh();
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    clientEmail,
    clientWalletAddress,
    hasReadyClientSession,
    hasServerSession,
    isChecking,
    router,
    serverEmail,
    serverWalletAddress,
  ]);

  if (hasServerSession) {
    return null;
  }

  if (!isChecking && !hasReadyClientSession && memberSession.status !== "error") {
    return null;
  }

  return (
    <div className="mx-auto mb-3 max-w-6xl border border-[#19b84b]/20 bg-[#ecfff0] px-4 py-3 text-sm font-bold leading-6 text-[#126c2c]">
      {hasReadyClientSession
        ? copy.ready
        : isChecking
          ? copy.checking
          : copy.retry}
    </div>
  );
}
