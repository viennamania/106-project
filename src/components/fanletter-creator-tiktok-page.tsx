"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  CheckCircle2,
  ExternalLink,
  Music2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { FanletterAIStarSocialAccountCard } from "@/components/fanletter-ai-star-social-account-card";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { useFanletterAIStarServerSocialAccountState } from "@/components/fanletter-social-account-mock-state";
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
      oauthFailed: "TikTok 승인 실패",
      oauthFailedBody:
        "승인 또는 토큰 교환이 완료되지 않았습니다. Sandbox 테스트 사용자와 client key 설정을 확인한 뒤 다시 시도하세요.",
      oauthSuccess: "TikTok 승인 완료",
      oauthSuccessBody:
        "AI 스타 TikTok 채널 연결이 서버에 저장되고 평판 기록 조건에 반영됩니다.",
      pageTitle: "AI 스타 TikTok 채널",
      recordReady: "평판 기록 생성됨",
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
      oauthFailed: "TikTok認証に失敗",
      oauthFailedBody:
        "認証またはトークン交換が完了していません。Sandboxテストユーザーとclient key設定を確認して再試行してください。",
      oauthSuccess: "TikTok認証完了",
      oauthSuccessBody:
        "AIスターTikTokチャンネル接続がサーバーに保存され、評判記録条件に反映されます。",
      pageTitle: "AIスターTikTokチャンネル",
      recordReady: "評判記録作成済み",
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
    oauthFailed: "TikTok authorization failed",
    oauthFailedBody:
      "Authorization or token exchange did not complete. Check Sandbox target user and client key settings, then retry.",
    oauthSuccess: "TikTok authorization complete",
    oauthSuccessBody:
      "The AI Star TikTok channel connection is saved on the server and reflected in the Reputation Record condition.",
    pageTitle: "AI Star TikTok Channel",
    recordReady: "Reputation Record created",
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

function getOAuthReasonLabel(reason: string | null, locale: Locale) {
  if (!reason) {
    return null;
  }

  const labels: Record<string, Partial<Record<Locale, string>> & { en: string }> = {
    non_sandbox_target: {
      en: "This TikTok account is not a Sandbox target user for the FanLetter app. Use a registered Sandbox username or add this username in the TikTok Developer Portal.",
      ja: "このTikTokアカウントはFanLetterアプリのSandbox対象ユーザーではありません。登録済みSandboxユーザーを使うか、このユーザー名をTikTok Developer Portalに追加してください。",
      ko: "현재 TikTok 계정이 FanLetter 앱의 Sandbox Target User가 아닙니다. 등록된 Sandbox username으로 로그인하거나, 이 username을 TikTok Developer Portal에 추가해야 합니다.",
    },
    tiktok_token_exchange_failed: {
      en: "TikTok token exchange failed. Check redirect URI, client key, and Sandbox target user.",
      ja: "TikTokトークン交換に失敗しました。redirect URI、client key、Sandbox対象ユーザーを確認してください。",
      ko: "TikTok 토큰 교환이 실패했습니다. redirect URI, client key, Sandbox Target User를 확인하세요.",
    },
    unauthorized_client: {
      en: "TikTok rejected the client key. Check whether the request uses the correct Sandbox or Production app.",
      ja: "TikTokがclient keyを拒否しました。SandboxまたはProductionアプリが正しいか確認してください。",
      ko: "TikTok이 client key를 거부했습니다. Sandbox/Production 앱 설정이 맞는지 확인하세요.",
    },
  };
  const label = labels[reason];

  return label?.[locale] ?? label?.en ?? reason;
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
  const serverSocialAccountState = useFanletterAIStarServerSocialAccountState({
    platform: "tiktok",
    starId: selectedStar?.id ?? "__no-star__",
  });
  const connectedAccount = selectedStar ? serverSocialAccountState.account : null;
  const [oauthCallbackStatus] = useState<{
    reason: string | null;
    status: "connected" | "failed";
  } | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const status = params.get("tiktok");

    return status === "connected" || status === "failed"
      ? {
          reason: params.get("tiktokReason"),
          status,
        }
      : null;
  });
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
  const connectionStatusLabel = serverSocialAccountState.loading
    ? locale === "ko"
      ? "서버 확인 중"
      : locale === "ja"
        ? "サーバー確認中"
        : "Checking server"
    : connectedAccount
      ? connectedAccount.handle
      : copy.statusWaiting;
  const nextActionLabel = connectedAccount ? copy.recordReady : copy.mainCta;
  const oauthReasonLabel = getOAuthReasonLabel(
    oauthCallbackStatus?.reason ?? null,
    locale,
  );

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

        {oauthCallbackStatus ? (
          <section
            className={joinClasses(
              "mt-5 rounded-[1.1rem] border p-4",
              oauthCallbackStatus.status === "connected"
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50",
            )}
          >
            <div className="flex items-start gap-3">
              {oauthCallbackStatus.status === "connected" ? (
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-emerald-700" />
              ) : (
                <CircleAlert className="mt-1 size-5 shrink-0 text-rose-700" />
              )}
              <div className="min-w-0">
                <h2
                  className={joinClasses(
                    "text-base font-semibold",
                    oauthCallbackStatus.status === "connected"
                      ? "text-emerald-950"
                      : "text-rose-950",
                  )}
                >
                  {oauthCallbackStatus.status === "connected"
                    ? copy.oauthSuccess
                    : copy.oauthFailed}
                </h2>
                <p
                  className={joinClasses(
                    "mt-1 text-sm font-medium leading-6",
                    oauthCallbackStatus.status === "connected"
                      ? "text-emerald-800"
                      : "text-rose-800",
                  )}
                >
                  {oauthCallbackStatus.status === "connected"
                    ? copy.oauthSuccessBody
                    : copy.oauthFailedBody}
                  {oauthReasonLabel ? (
                    <span className="mt-1 block font-semibold">
                      {oauthReasonLabel}
                    </span>
                  ) : null}
                </p>
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
                    {connectionStatusLabel}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs font-semibold text-zinc-500">
                    {copy.nextAction}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-black">
                    {nextActionLabel}
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
