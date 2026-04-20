"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Rss } from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { getContentCopy } from "@/lib/content-copy";
import type { Locale } from "@/lib/i18n";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";

type MemberAccessState = {
  error: string | null;
  member: MemberRecord | null;
  status: "error" | "idle" | "loading" | "ready";
};

export function LandingMemberContentEntry({
  activateHref,
  feedHref,
  locale,
}: {
  activateHref: string;
  feedHref: string;
  locale: Locale;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const [state, setState] = useState<MemberAccessState>({
    error: null,
    member: null,
    status: "idle",
  });

  const loadMember = useCallback(async () => {
    if (!accountAddress) {
      setState({
        error: null,
        member: null,
        status: "idle",
      });
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setState({
          error: null,
          member: null,
          status: "idle",
        });
        return;
      }

      const response = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as SyncMemberResponse | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error ? data.error : contentCopy.messages.memberMissing,
        );
      }

      setState({
        error: null,
        member: "member" in data ? data.member : null,
        status: "ready",
      });
    } catch (error) {
      setState({
        error:
          error instanceof Error ? error.message : contentCopy.messages.memberMissing,
        member: null,
        status: "error",
      });
    }
  }, [accountAddress, chain.id, chain.name, contentCopy.messages.memberMissing, locale]);

  useEffect(() => {
    if (connectionStatus !== "connected" || !accountAddress) {
      setState({
        error: null,
        member: null,
        status: "idle",
      });
      return;
    }

    void loadMember();
  }, [accountAddress, connectionStatus, loadMember]);

  const member = state.member;
  const isKorean = locale === "ko";
  const homeActionTitle = isKorean ? "피드 열기" : "Open feed";
  const homeActionDescription = isKorean
    ? "지금 바로 네트워크에서 공유된 콘텐츠를 확인해보세요."
    : "Open the feed now to see content shared by your network.";
  const homePendingDescription = isKorean
    ? "결제를 완료하면 홈에서 네트워크 피드로 바로 이동할 수 있습니다."
    : "Once payment is complete, the network feed will be available from home.";
  const homePendingCta = isKorean ? "가입 완료하러 가기" : "Complete signup";

  if (!accountAddress || !member) {
    return (
      <>
        {hasThirdwebClientId ? (
          <AutoConnect
            accountAbstraction={smartWalletOptions}
            appMetadata={getAppMetadata(contentCopy.meta.feedDescription)}
            chain={smartWalletChain}
            client={thirdwebClient}
            wallets={supportedWallets}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={getAppMetadata(contentCopy.meta.feedDescription)}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <section>
        {member.status === "completed" ? (
          <LandingAccessCard
            description={homeActionDescription}
            href={feedHref}
            icon={<Rss className="size-5" />}
            label={isKorean ? "내 네트워크" : "my network"}
            title={homeActionTitle}
          />
        ) : (
          <div className="glass-card rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,248,232,0.96))] px-5 py-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)] sm:px-6 sm:py-6">
            <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]">
              <CheckCircle2 className="size-5" />
            </div>
            <p className="mt-4 text-[1.1rem] font-semibold tracking-tight text-slate-950">
              {isKorean ? "가입 완료 후 바로 피드 이용" : "Unlock the feed after signup"}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {state.error ?? homePendingDescription}
            </p>
            <Link
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.16)] transition hover:bg-slate-800 sm:w-auto"
              href={activateHref}
            >
              {homePendingCta}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

function LandingAccessCard({
  description,
  href,
  icon,
  label,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <Link
      className="group relative overflow-hidden rounded-[30px] border border-slate-900/85 bg-[linear-gradient(160deg,#081225_0%,#0f172a_50%,#10213f_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 sm:p-6"
      href={href}
    >
      <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.32),transparent_68%)] blur-3xl" />
      <div className="pointer-events-none absolute -left-14 bottom-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_72%)] blur-3xl" />

      <p className="relative text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
      <div className="relative mt-4 flex items-start justify-between gap-4">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-[0_16px_32px_rgba(15,23,42,0.22)] ring-1 ring-white/10">
          {icon}
        </div>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white transition group-hover:bg-white/14">
          <ArrowRight className="size-4" />
        </span>
      </div>
      <p className="relative mt-5 text-xl font-semibold tracking-tight text-white">
        {title}
      </p>
      <p className="relative mt-3 text-sm leading-6 text-white/72">{description}</p>
    </Link>
  );
}
