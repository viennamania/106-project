"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Music2,
  ShieldCheck,
} from "lucide-react";

import { FanletterAIStarSocialAccountCard } from "@/components/fanletter-ai-star-social-account-card";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { Locale } from "@/lib/i18n";
import {
  type MemberOwnedAIStar,
  type MemberPortfolio as MemberPortfolioData,
} from "@/mock/fanletterV2";
import { buildFanletterAIStarSocialAccountViewModel } from "@/mock/fanletter-social-accounts";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarUniverse: "AI 스타 유니버스",
      back: "Creator Journey",
      connectAccount: "계정 연결하기",
      connectedEvent: "creator_social_connected 평판 기록",
      creatorOnly: "Creator / Owner 권한",
      emptyBody:
        "TikTok 채널은 내가 운영하는 AI 스타에 연결됩니다. 먼저 Creator 권한 활성화 흐름에서 운영할 AI 스타를 준비하세요.",
      emptyCta: "Creator Journey로 돌아가기",
      emptyTitle: "연결할 AI 스타가 없습니다",
      eyebrow: "Creator Journey",
      flowChannel: "채널 연결",
      flowEvent: "평판 기록",
      flowSync: "콘텐츠 동기화",
      intro:
        "회원 개인 TikTok이 아니라 선택한 AI 스타의 공식 채널을 연결합니다.",
      ledger: "평판 기록 보기",
      mainCta: "TikTok 연결하기",
      nextAction: "다음 행동",
      pageTitle: "AI 스타 TikTok 채널",
      selected: "선택됨",
      signInBody:
        "TikTok 채널 연결은 로그인한 Creator/Owner 권한에서만 실행됩니다.",
      signInTitle: "계정 연결 필요",
      starList: "연결 대상 AI 스타",
      status: "현재 상태",
      statusReady: "실제 OAuth 테스트 준비",
      statusWaiting: "TikTok 연결 필요",
    };
  }

  if (locale === "ja") {
    return {
      aiStarUniverse: "AI Star Universe",
      back: "Creator Journey",
      connectAccount: "アカウント接続",
      connectedEvent: "creator_social_connected評判記録",
      creatorOnly: "Creator / Owner権限",
      emptyBody:
        "TikTokチャンネルは運営中のAIスターに接続されます。まずCreator Journeyで運営するAIスターを準備してください。",
      emptyCta: "Creator Journeyに戻る",
      emptyTitle: "接続するAIスターがありません",
      eyebrow: "Creator Journey",
      flowChannel: "チャンネル接続",
      flowEvent: "評判記録",
      flowSync: "コンテンツ同期",
      intro:
        "個人TikTokではなく、選択したAIスターの公式チャンネルを接続します。",
      ledger: "評判記録を見る",
      mainCta: "TikTok接続",
      nextAction: "次のアクション",
      pageTitle: "AIスターTikTokチャンネル",
      selected: "選択中",
      signInBody:
        "TikTokチャンネル接続はログインしたCreator/Owner権限でのみ実行できます。",
      signInTitle: "アカウント接続が必要",
      starList: "接続対象AIスター",
      status: "現在の状態",
      statusReady: "実OAuthテスト準備完了",
      statusWaiting: "TikTok接続が必要",
    };
  }

  return {
    aiStarUniverse: "AI Star Universe",
    back: "Creator Journey",
    connectAccount: "Connect account",
    connectedEvent: "creator_social_connected Reputation Record",
    creatorOnly: "Creator / Owner permission",
    emptyBody:
      "TikTok channels connect to AI Stars you operate. Prepare an AI Star in Creator Journey first.",
    emptyCta: "Back to Creator Journey",
    emptyTitle: "No AI Star available",
    eyebrow: "Creator Journey",
    flowChannel: "Channel connection",
    flowEvent: "Reputation record",
    flowSync: "Content sync",
    intro:
      "Connect the selected AI Star's official channel, not a personal member TikTok.",
    ledger: "View Reputation Records",
    mainCta: "Connect TikTok",
    nextAction: "Next action",
    pageTitle: "AI Star TikTok Channel",
    selected: "Selected",
    signInBody:
      "TikTok channel connection requires a signed-in Creator/Owner account.",
    signInTitle: "Account connection required",
    starList: "AI Star to connect",
    status: "Current state",
    statusReady: "Real OAuth test ready",
    statusWaiting: "TikTok connection required",
  };
}

function StarPortrait({ star }: { star: MemberOwnedAIStar }) {
  const initials = star.portraitInitials ?? getInitials(star.name);

  return (
    <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-700">
      {star.portraitImageUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="64px"
          src={star.portraitImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(
            star.portraitImageUrl,
          )}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export function FanletterCreatorTikTokPage({
  isSignedIn,
  locale,
  memberPortfolio,
  selectedStarId,
}: {
  isSignedIn: boolean;
  locale: Locale;
  memberPortfolio: MemberPortfolioData | null;
  selectedStarId?: string | null;
}) {
  const copy = getCopy(locale);
  const ownedStars = memberPortfolio?.ownedStars ?? [];
  const selectedStar =
    ownedStars.find((star) => star.id === selectedStarId) ??
    ownedStars[0] ??
    null;
  const memberName = memberPortfolio?.memberName ?? "Creator";
  const memberInitials =
    memberPortfolio?.memberInitials ?? getInitials(memberName);
  const social = selectedStar
    ? buildFanletterAIStarSocialAccountViewModel({
        canConnect: isSignedIn,
        creatorMemberId: `creator:${memberName}`,
        creatorMemberInitials: memberInitials,
        creatorMemberName: memberName,
        creatorRole: "owner",
        starId: selectedStar.id,
      })
    : null;
  const ledgerHref = selectedStar
    ? `/${locale}/fanletter/agentrank/events?${new URLSearchParams({
        coverageAction: "creator_social_connected",
        limit: "40",
        sort: "latest",
        starId: selectedStar.id,
        type: "creator_social_connected",
      }).toString()}`
    : `/${locale}/fanletter/agentrank/events?type=creator_social_connected`;
  const connectHref = `/${locale}/fanletter/connect?returnTo=${encodeURIComponent(
    `/${locale}/fanletter/creator-unlock/tiktok${
      selectedStar ? `?starId=${selectedStar.id}` : ""
    }`,
  )}`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-white px-4 py-5 text-black sm:px-6 lg:px-8">
      {selectedStar ? (
        <FanletterReputationTracker
          agentRank={{
            eventType: "creator_unlock_evaluated",
            intent: "creator_tiktok_page_viewed",
            source: "fanletter_creator_unlock",
            starId: selectedStar.id,
          }}
          eventName="fanletter_creator_unlock_evaluated"
          metadata={{
            page: "fanletter_creator_tiktok",
            selectedStarId: selectedStar.id,
            tiktokChannelStep: true,
          }}
        />
      ) : null}

      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900"
            href={`/${locale}/fanletter/creator-unlock`}
          >
            <ArrowLeft className="size-4" />
            <span className="truncate">{copy.back}</span>
          </Link>
          <Link
            className="hidden min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 sm:inline-flex"
            href={ledgerHref}
          >
            {copy.ledger}
            <ExternalLink className="size-4" />
          </Link>
        </div>

        <section className="mt-6 rounded-[1.4rem] border border-zinc-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-end">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                <Music2 className="size-3.5" />
                {copy.eyebrow}
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-normal text-black sm:text-5xl">
                {copy.pageTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-zinc-600">
                {copy.intro}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2">
              {[
                copy.flowChannel,
                copy.flowEvent,
                copy.flowSync,
              ].map((label, index) => (
                <div
                  className="rounded-xl bg-white px-2 py-3 text-center"
                  key={label}
                >
                  <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-4 text-zinc-700">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!isSignedIn ? (
          <section className="mt-5 rounded-[1.2rem] border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-5 text-zinc-500" />
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-black">
                  {copy.signInTitle}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                  {copy.signInBody}
                </p>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white"
                  href={connectHref}
                >
                  {copy.connectAccount}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {selectedStar ? (
          <section className="mt-5 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="min-w-0 rounded-[1.2rem] border border-zinc-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.045)] sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {copy.starList}
              </p>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
                <StarPortrait star={selectedStar} />
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 text-[0.68rem] font-semibold text-white">
                    <BadgeCheck className="size-3.5" />
                    AI STAR
                  </div>
                  <h2 className="mt-2 truncate text-2xl font-semibold text-black">
                    {selectedStar.name}
                  </h2>
                  <p className="truncate text-sm font-medium text-zinc-500">
                    {selectedStar.universeName ?? copy.aiStarUniverse}
                  </p>
                </div>
              </div>

              {ownedStars.length > 1 ? (
                <div className="mt-4 grid gap-2">
                  {ownedStars.map((star) => {
                    const isSelected = star.id === selectedStar.id;

                    return (
                      <Link
                        className={joinClasses(
                          "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-sm font-semibold transition",
                          isSelected
                            ? "border-black bg-black text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                        )}
                        href={`/${locale}/fanletter/creator-unlock/tiktok?starId=${encodeURIComponent(star.id)}`}
                        key={star.id}
                      >
                        <span className="truncate">{star.name}</span>
                        <span className="shrink-0 text-xs opacity-70">
                          {isSelected ? copy.selected : copy.creatorOnly}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs font-semibold text-zinc-500">
                    {copy.status}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-black">
                    {copy.statusWaiting}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs font-semibold text-zinc-500">
                    {copy.nextAction}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-black">
                    {copy.mainCta}
                  </p>
                </div>
              </div>
            </div>

            {social ? (
              <FanletterAIStarSocialAccountCard
                className="mt-0"
                connectHref={isSignedIn ? undefined : connectHref}
                locale={locale}
                social={social}
                source="fanletter_creator_unlock"
                starId={selectedStar.id}
                starName={selectedStar.name}
                starPortraitImageUrl={selectedStar.portraitImageUrl}
                starPortraitInitials={selectedStar.portraitInitials}
              />
            ) : null}
          </section>
        ) : (
          <section className="mt-5 rounded-[1.2rem] border border-zinc-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.045)]">
            <CheckCircle2 className="size-8 text-zinc-400" />
            <h2 className="mt-4 text-2xl font-semibold text-black">
              {copy.emptyTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white"
              href={`/${locale}/fanletter/creator-unlock`}
            >
              {copy.emptyCta}
              <ArrowRight className="size-4" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
