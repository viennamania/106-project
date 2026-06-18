"use client";

import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import { HumanMemberAvatar } from "@/components/fanletter-founder-club-v2";
import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import type { Locale } from "@/lib/i18n";
import {
  getFanletterAIStarSocialStatusLabel,
  type FanletterAIStarSocialAccountViewModel,
} from "@/mock/fanletter-social-accounts";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarBadge: "AI STAR",
      connectedBy: "연결한 Creator",
      connectedTitle: "TikTok 채널 연결됨",
      connectHelper:
        "AI 스타별 Creator 채널 연결은 평판 기록으로 남습니다. 실제 TikTok OAuth는 아직 연결하지 않은 mock 단계입니다.",
      connectRequired: "TikTok 연결 필요",
      connectTitle: "AI 스타별 TikTok 채널",
      creatorOnly: "Creator / Owner 권한 필요",
      eventCreated: "평판 기록 생성됨",
      manualStatus: "manual / mock",
      openTiktok: "TikTok 보기",
      primaryCta: "TikTok 연결하기",
      roleCreator: "Creator",
      roleOwner: "Owner",
      status: "상태",
      subtitle: "회원 개인 계정이 아니라 AI 스타 채널입니다.",
      tiktok: "TikTok",
    };
  }

  if (locale === "ja") {
    return {
      aiStarBadge: "AI STAR",
      connectedBy: "接続したCreator",
      connectedTitle: "TikTokチャンネル接続済み",
      connectHelper:
        "AIスター別Creatorチャンネル接続は評判記録になります。実際のTikTok OAuthはまだ接続しないmock段階です。",
      connectRequired: "TikTok接続が必要",
      connectTitle: "AIスター別TikTokチャンネル",
      creatorOnly: "Creator / Owner権限が必要",
      eventCreated: "評判記録作成済み",
      manualStatus: "manual / mock",
      openTiktok: "TikTokを見る",
      primaryCta: "TikTok接続",
      roleCreator: "Creator",
      roleOwner: "Owner",
      status: "状態",
      subtitle: "個人アカウントではなくAIスターのチャンネルです。",
      tiktok: "TikTok",
    };
  }

  return {
    aiStarBadge: "AI STAR",
    connectedBy: "Connected Creator",
    connectedTitle: "TikTok channel connected",
    connectHelper:
      "AI Star channel connection becomes a Reputation Event. Real TikTok OAuth is still mocked.",
    connectRequired: "TikTok connection required",
    connectTitle: "AI Star TikTok channel",
    creatorOnly: "Creator / Owner permission required",
    eventCreated: "Reputation record created",
    manualStatus: "manual / mock",
    openTiktok: "View TikTok",
    primaryCta: "Connect TikTok",
    roleCreator: "Creator",
    roleOwner: "Owner",
    status: "Status",
    subtitle: "This is the AI Star channel, not a personal member account.",
    tiktok: "TikTok",
  };
}

function formatConnectedAt(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

export function FanletterAIStarSocialAccountCard({
  className,
  connectHref,
  locale,
  social,
  source,
  starId,
  starName,
  starPortraitImageUrl,
  starPortraitInitials,
}: {
  className?: string;
  connectHref?: string;
  locale: Locale;
  social: FanletterAIStarSocialAccountViewModel;
  source: AgentRankInteractionSource;
  starId: string;
  starName: string;
  starPortraitImageUrl?: string | null;
  starPortraitInitials?: string | null;
}) {
  const copy = getCopy(locale);
  const account = social.account;
  const isConnected = Boolean(account);
  const actorMemberId = account?.connectedByMemberId ?? social.creatorMemberId;
  const actorMemberName =
    account?.connectedByMemberName ?? social.creatorMemberName;
  const actorMemberInitials =
    account?.connectedByMemberInitials ?? social.creatorMemberInitials;
  const roleLabel =
    (account?.creatorRoleAtConnection ?? social.creatorRole) === "owner"
      ? copy.roleOwner
      : copy.roleCreator;
  const statusLabel = account
    ? getFanletterAIStarSocialStatusLabel({
        locale,
        status: account.status,
      })
    : social.canConnect
      ? copy.manualStatus
      : copy.creatorOnly;
  const effectiveConnectHref = connectHref ?? "#tiktok-channel";

  return (
    <section
      className={joinClasses(
        "w-full min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white text-black shadow-[0_18px_44px_rgba(15,23,42,0.06)]",
        className,
      )}
      id="tiktok-channel"
    >
      <div className="grid min-w-0 gap-0 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 border-b border-zinc-200 bg-zinc-950 p-4 text-white sm:border-b-0 sm:border-r sm:border-zinc-800">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={joinClasses(
                "relative flex size-16 shrink-0 items-center justify-center overflow-hidden border-2 border-violet-400 bg-[linear-gradient(145deg,#8b5cf6,#111827_56%,#22d3ee)] text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.3)]",
                "[clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)]",
              )}
              style={
                starPortraitImageUrl
                  ? {
                      backgroundImage: `linear-gradient(180deg, rgba(17,24,39,0.05), rgba(17,24,39,0.25)), url(${starPortraitImageUrl})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }
                  : undefined
              }
            >
              {starPortraitImageUrl ? null : (starPortraitInitials ?? "AI")}
            </div>
            <div className="min-w-0">
              <span className="inline-flex h-6 items-center rounded-full bg-white/12 px-2 text-[0.62rem] font-semibold text-white/82">
                {copy.aiStarBadge}
              </span>
              <p className="mt-1 truncate text-lg font-semibold">{starName}</p>
              <p className="truncate text-xs font-semibold text-white/52">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                <AtSign className="size-4" />
                {copy.tiktok}
              </p>
              <h2 className="mt-2 break-words text-xl font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
                {isConnected ? copy.connectedTitle : copy.connectRequired}
              </h2>
            </div>
            <span
              className={joinClasses(
                "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold",
                isConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700",
              )}
            >
              {isConnected ? (
                <BadgeCheck className="size-3.5" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                {copy.connectTitle}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-zinc-950">
                {account?.handle ?? copy.primaryCta}
              </p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                {account ? formatConnectedAt(account.connectedAt, locale) : roleLabel}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                {copy.connectedBy}
              </p>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <HumanMemberAvatar
                  member={{
                    initials: actorMemberInitials,
                    name: actorMemberName,
                  }}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">
                    {actorMemberName}
                  </p>
                  <p className="truncate text-xs font-semibold text-zinc-500">
                    {roleLabel} · ID {actorMemberId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5 text-zinc-600">
                {account ? copy.eventCreated : copy.connectHelper}
              </p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                creator_social_connected · target: ai_star · platform: tiktok
              </p>
            </div>
            <FanletterTrackedLink
              agentRank={{
                eventType: account ? "content_engaged" : "creator_social_connected",
                intent: account
                  ? "creator_tiktok_channel_opened"
                  : "creator_tiktok_channel_mock_connect_requested",
                source,
                starId,
              }}
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800 sm:w-auto"
              eventName={
                account ? "external_browser_click" : "fanletter_creator_social_connected"
              }
              href={account?.profileUrl ?? effectiveConnectHref}
              metadata={{
                actorMemberId,
                actorMemberName,
                actorType: "creator_member",
                creatorRoleAtConnection:
                  account?.creatorRoleAtConnection ?? social.creatorRole,
                mockOnly: true,
                platform: "tiktok",
                socialConnectionStatus: account?.status ?? "pending",
                starId,
                starName,
                targetType: "ai_star",
              }}
              rel={account ? "noreferrer" : undefined}
              target={account ? "_blank" : undefined}
            >
              <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
                {account ? copy.openTiktok : copy.primaryCta}
              </span>
              {account ? (
                <ExternalLink className="size-4 shrink-0" />
              ) : (
                <ArrowRight className="size-4 shrink-0" />
              )}
            </FanletterTrackedLink>
          </div>
        </div>
      </div>
    </section>
  );
}
