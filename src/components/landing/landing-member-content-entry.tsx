"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Rss } from "lucide-react";
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

      <section className="grid gap-4">
        <div className="glass-card rounded-[28px] border border-white/75 bg-white/86 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <p className="eyebrow">{contentCopy.entry.title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {member.status === "completed"
                ? contentCopy.labels.published
                : locale === "ko"
                  ? "가입 진행 중"
                  : "Signup pending"}
            </span>
            {member.referralCode ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {member.referralCode}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {member.status === "completed"
              ? contentCopy.entry.viewerDescription
              : locale === "ko"
                ? "가입 완료 후 홈에서 네트워크 피드를 바로 열 수 있습니다."
                : "Complete signup to open the network feed directly from home."}
          </p>
        </div>

        {member.status === "completed" ? (
          <div className="grid gap-4">
            <LandingAccessCard
              description={contentCopy.entry.viewerDescription}
              href={feedHref}
              icon={<Rss className="size-5" />}
              label={contentCopy.page.feedEyebrow}
              title={contentCopy.entry.viewerTitle}
            />
          </div>
        ) : (
          <div className="glass-card rounded-[28px] border border-white/75 bg-white/86 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <p className="text-sm leading-6 text-slate-600">
              {state.error ??
                (locale === "ko"
                  ? "결제 완료 후 홈에서 네트워크 피드로 바로 이동할 수 있습니다."
                  : "Once payment is complete, the network feed will be available from home.")}
            </p>
            <Link
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              href={activateHref}
            >
              {locale === "ko" ? "가입 완료하러 가기" : "Complete signup"}
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
      className="group glass-card rounded-[30px] border border-white/75 bg-white/86 p-5 shadow-[0_22px_55px_rgba(15,23,42,0.1)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
      href={href}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition group-hover:border-slate-300 group-hover:bg-slate-50">
          <ArrowRight className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
