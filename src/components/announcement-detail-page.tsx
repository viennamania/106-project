"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Megaphone,
  RefreshCcw,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import type {
  MemberAnnouncementDetailRecord,
  MemberAnnouncementDetailResponse,
} from "@/lib/announcements";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type AnnouncementDetailState = {
  announcement: MemberAnnouncementDetailRecord | null;
  error: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

type MemberSyncState = {
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  status: "idle" | "syncing" | "ready" | "error";
};

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : "border-slate-200 bg-white/90 text-slate-600",
      )}
    >
      {children}
    </div>
  );
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AnnouncementDetailPage({
  announcementId,
  dictionary,
  locale,
  returnToHref,
}: {
  announcementId: string;
  dictionary: Dictionary;
  locale: Locale;
  returnToHref: string;
}) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const copy = dictionary.announcementsPage;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const [memberSync, setMemberSync] = useState<MemberSyncState>({
    email: null,
    error: null,
    member: null,
    status: "idle",
  });
  const [detailState, setDetailState] = useState<AnnouncementDetailState>({
    announcement: null,
    error: null,
    status: "idle",
  });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const isMemberReady = memberSync.status === "ready" && Boolean(memberSync.member);
  const isDisconnected = status !== "connected" || !accountAddress;

  const runMemberSync = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setMemberSync((current) => ({
      ...current,
      error: null,
      status: "syncing",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setMemberSync({
          email: null,
          error: copy.errors.missingEmail,
          member: null,
          status: "error",
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
      const data = (await response.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!response.ok || !("member" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errors.loadFailed,
        );
      }

      setMemberSync({
        email,
        error: null,
        member: data.member,
        status: "ready",
      });
    } catch (error) {
      setMemberSync({
        email: null,
        error: error instanceof Error ? error.message : copy.errors.loadFailed,
        member: null,
        status: "error",
      });
    }
  }, [accountAddress, chain.id, chain.name, copy.errors.loadFailed, copy.errors.missingEmail, locale]);

  const loadAnnouncementDetail = useCallback(
    async (memberEmail: string) => {
      if (!accountAddress) {
        return;
      }

      setDetailState((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));

      try {
        const searchParams = new URLSearchParams({
          email: memberEmail,
          walletAddress: accountAddress,
        });
        const response = await fetch(
          `/api/announcements/${encodeURIComponent(announcementId)}?${searchParams.toString()}`,
        );
        const data = (await response.json()) as
          | MemberAnnouncementDetailResponse
          | { error?: string };

        if (!response.ok || !("announcement" in data)) {
          throw new Error(
            "error" in data && data.error ? data.error : copy.errors.loadFailed,
          );
        }

        setDetailState({
          announcement: data.announcement,
          error: null,
          status: "ready",
        });
      } catch (error) {
        setDetailState({
          announcement: null,
          error: error instanceof Error ? error.message : copy.errors.loadFailed,
          status: "error",
        });
      }
    },
    [accountAddress, announcementId, copy.errors.loadFailed],
  );

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setMemberSync({
      email: null,
      error: null,
      member: null,
      status: "idle",
    });
    setDetailState({
      announcement: null,
      error: null,
      status: "idle",
    });
  }, [status]);

  useEffect(() => {
    if (
      status !== "connected" ||
      !accountAddress ||
      !hasThirdwebClientId
    ) {
      return;
    }

    void runMemberSync();
  }, [accountAddress, runMemberSync, status]);

  useEffect(() => {
    if (!memberSync.member?.email || memberSync.status !== "ready") {
      return;
    }

    void loadAnnouncementDetail(memberSync.member.email);
  }, [loadAnnouncementDetail, memberSync.member?.email, memberSync.status]);

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,161,58,0.16),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.12),transparent_24%),linear-gradient(180deg,#f6efe3_0%,#fbf7ef_38%,#f7f1e8_100%)]" />

      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={dictionary.common.connectModalTitle}
      />

      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={returnToHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="eyebrow">{copy.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {copy.title}
                </h1>
                <p className="hidden text-sm text-slate-600 sm:block">
                  {copy.description}
                </p>
              </div>
            </div>
          </div>

          {isMemberReady ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => {
                if (!memberSync.member?.email) {
                  return;
                }

                void loadAnnouncementDetail(memberSync.member.email);
              }}
              type="button"
            >
              <RefreshCcw
                className={cn(
                  "size-4",
                  detailState.status === "loading" ? "animate-spin" : "",
                )}
              />
              {copy.actions.refresh}
            </button>
          ) : null}
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard>{dictionary.env.description}</MessageCard>
        ) : isDisconnected ? (
          <section className="glass-card rounded-[28px] p-5">
            <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-600">
                  {copy.disconnected}
                </p>
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                  onClick={() => {
                    setIsLoginDialogOpen(true);
                  }}
                  type="button"
                >
                  {dictionary.common.connectWallet}
                </button>
              </div>
            </div>
          </section>
        ) : memberSync.status === "syncing" || detailState.status === "loading" ? (
          <MessageCard>{copy.loading}</MessageCard>
        ) : memberSync.error ? (
          <MessageCard tone="error">{memberSync.error}</MessageCard>
        ) : detailState.error ? (
          <MessageCard tone="error">{detailState.error}</MessageCard>
        ) : detailState.announcement ? (
          <section className="glass-card rounded-[30px] p-5 sm:p-6">
            <article className="relative overflow-hidden rounded-[28px] border border-slate-900/90 bg-[linear-gradient(145deg,#0f172a_0%,#1e293b_52%,#13213b_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_30%)]" />
              <div className="relative space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/86">
                    <Megaphone className="size-3.5" />
                    {copy.labels.viewAnnouncement}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/68">
                    {formatDateTime(detailState.announcement.createdAt, locale)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                    {detailState.announcement.title}
                  </h2>
                  <p className="text-sm text-white/60">
                    {detailState.announcement.senderEmail}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 text-[0.98rem] leading-8 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
                  <p className="whitespace-pre-wrap break-words">
                    {detailState.announcement.body}
                  </p>
                </div>

                {detailState.announcement.actionHref ? (
                  <a
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(255,255,255,0.14)] transition hover:bg-slate-100"
                    href={detailState.announcement.actionHref}
                  >
                    {copy.labels.sendLink}
                    <ArrowUpRight className="size-4" />
                  </a>
                ) : null}
              </div>
            </article>
          </section>
        ) : (
          <MessageCard tone="error">{copy.errors.loadFailed}</MessageCard>
        )}
      </main>
    </div>
  );
}
