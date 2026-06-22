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
      back: "크리에이터 여정",
      connectAccount: "계정 연결하기",
      continueJourney: "크리에이터 여정 계속",
      connectedEvent: "TikTok 채널 연결 기록",
      contentSyncReady: "콘텐츠 동기화 준비",
      creatorOnly: "크리에이터 / 운영자 권한",
      emptyBody:
        "TikTok 채널은 내가 운영하는 AI 스타에 연결됩니다. 먼저 크리에이터 권한 활성화 흐름에서 운영할 AI 스타를 준비하세요.",
      emptyCta: "크리에이터 여정으로 돌아가기",
      emptyTitle: "연결할 AI 스타가 없습니다",
      eyebrow: "크리에이터 여정",
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
        "승인 또는 토큰 교환이 완료되지 않았습니다. Sandbox 테스트 사용자, 요청 client key, redirect URI가 같은 TikTok 앱 기준인지 확인한 뒤 다시 시도하세요.",
      oauthFailureChecks: ["Sandbox Target User", "client key", "redirect URI"],
      oauthSuccess: "TikTok 승인 완료",
      oauthSuccessBody:
        "AI 스타 TikTok 채널 연결이 서버에 저장되고 평판 기록 조건에 반영됩니다.",
      pageTitle: "AI 스타 TikTok 채널",
      recordReady: "평판 기록 생성됨",
      selected: "선택됨",
      successNextBody:
        "이제 TikTok 채널 연결 기록을 확인하고, 새 AI 스타 생성 미리보기 또는 콘텐츠 동기화 준비로 이어갈 수 있습니다.",
      successNextTitle: "다음 단계",
      signInBody:
        "TikTok 채널 연결은 로그인한 크리에이터/운영자 권한에서만 실행됩니다.",
      signInTitle: "계정 연결 필요",
      starList: "연결 대상 AI 스타",
      status: "현재 상태",
      statusReady: "TikTok 승인 테스트 준비",
      statusWaiting: "TikTok 연결 필요",
    };
  }

  if (locale === "ja") {
    return {
      aiStarUniverse: "AI Star Universe",
      back: "Creator Journey",
      connectAccount: "アカウント接続",
      continueJourney: "Creator Journeyを続ける",
      connectedEvent: "creator_social_connected評判記録",
      contentSyncReady: "コンテンツ同期準備",
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
      oauthFailureChecks: ["Sandbox Target User", "client key", "redirect URI"],
      oauthSuccess: "TikTok認証完了",
      oauthSuccessBody:
        "AIスターTikTokチャンネル接続がサーバーに保存され、評判記録条件に反映されます。",
      pageTitle: "AIスターTikTokチャンネル",
      recordReady: "評判記録作成済み",
      selected: "選択中",
      successNextBody:
        "TikTokチャンネル接続記録を確認し、新しいAIスター作成プレビューまたはコンテンツ同期準備に進めます。",
      successNextTitle: "次のステップ",
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
    continueJourney: "Continue Creator Journey",
    connectedEvent: "creator_social_connected Reputation Record",
    contentSyncReady: "Content sync ready",
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
    oauthFailureChecks: ["Sandbox Target User", "client key", "redirect URI"],
    oauthSuccess: "TikTok authorization complete",
    oauthSuccessBody:
      "The AI Star TikTok channel connection is saved on the server and reflected in the Reputation Record condition.",
    pageTitle: "AI Star TikTok Channel",
    recordReady: "Reputation Record created",
    selected: "Selected",
    successNextBody:
      "Review the TikTok channel connection record, then continue to AI Star launch preview or content sync preparation.",
    successNextTitle: "Next step",
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
  const hexClip = {
    clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)",
  };

  return (
    <div
      className="relative size-[4.35rem] shrink-0 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 p-[2px] shadow-[0_14px_28px_rgba(124,58,237,0.18)]"
      style={hexClip}
    >
      <div
        className="relative flex size-full items-center justify-center overflow-hidden bg-zinc-100 text-lg font-semibold text-zinc-700"
        style={hexClip}
      >
        {star.portraitImageUrl ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="70px"
            src={star.portraitImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              star.portraitImageUrl,
            )}
          />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}

function getOAuthReasonLabel(reason: string | null, locale: Locale) {
  if (!reason) {
    return null;
  }

  const labels: Record<string, Partial<Record<Locale, string>> & { en: string }> = {
    non_sandbox_target: {
      en: "TikTok did not recognize this account as a Sandbox target user for the app used by this OAuth request. Confirm the logged-in username and the TikTok client key match the same Developer Portal Sandbox app.",
      ja: "このOAuthリクエストで使われているアプリのSandbox対象ユーザーとして、TikTokがこのアカウントを認識していません。ログイン中のusernameとTikTok client keyが同じDeveloper Portal Sandboxアプリを指しているか確認してください。",
      ko: "TikTok이 이 OAuth 요청에 사용된 앱의 Sandbox Target User로 현재 계정을 인식하지 못했습니다. 로그인 username과 요청 client key가 같은 Developer Portal Sandbox 앱 기준인지 확인하세요.",
    },
    tiktok_token_exchange_failed: {
      en: "TikTok token exchange failed. Check redirect URI, client key, and Sandbox target user.",
      ja: "TikTokトークン交換に失敗しました。redirect URI、client key、Sandbox対象ユーザーを確認してください。",
      ko: "TikTok 토큰 교환이 실패했습니다. redirect URI, client key, Sandbox Target User를 확인하세요.",
    },
    tiktok_oauth_failed: {
      en: "TikTok authorization failed. In Sandbox mode, confirm the logged-in username, client key, and redirect URI all belong to the same FanLetter Developer Portal app.",
      ja: "TikTok認証に失敗しました。Sandboxモードでは、ログイン中のusername、client key、redirect URIが同じFanLetter Developer Portalアプリに属しているか確認してください。",
      ko: "TikTok 승인이 실패했습니다. Sandbox 모드에서는 로그인 username, client key, redirect URI가 모두 같은 FanLetter Developer Portal 앱 기준인지 확인하세요.",
    },
    tiktok_scope_not_authorized: {
      en: "TikTok returned an authorization code, but the approved scope was not enough to read the AI Star channel profile. The app now requests only user.info.basic fields; retry the approval.",
      ja: "TikTokから認証codeは返りましたが、承認済みscopeではAIスターチャンネルプロフィールを取得できませんでした。現在はuser.info.basicフィールドのみを要求するため、もう一度承認してください。",
      ko: "TikTok 승인 code는 돌아왔지만 AI 스타 채널 프로필을 읽을 scope가 부족했습니다. 이제 user.info.basic 필드만 요청하도록 조정했으니 다시 승인해보세요.",
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
  oauthCallbackStatus = null,
  selectedStarId,
}: {
  isSignedIn: boolean;
  locale: Locale;
  memberPortfolio: MemberPortfolioData | null;
  oauthCallbackStatus?: {
    reason: string | null;
    status: "connected" | "failed";
  } | null;
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
    starId: selectedStar?.id ?? null,
  });
  const connectedAccount = selectedStar ? serverSocialAccountState.account : null;
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
  const launchHref = selectedStar
    ? `/${locale}/fanletter/creator-unlock/launch?starId=${encodeURIComponent(
        selectedStar.id,
      )}`
    : `/${locale}/fanletter/creator-unlock/launch`;
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
  const flowItems = connectedAccount
    ? [
        { active: false, done: true, label: copy.flowChannel },
        { active: false, done: true, label: copy.flowEvent },
        { active: true, done: false, label: copy.flowSync },
      ]
    : [
        { active: true, done: false, label: copy.flowChannel },
        { active: false, done: false, label: copy.flowEvent },
        { active: false, done: false, label: copy.flowSync },
      ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white px-4 pb-28 pt-5 text-black sm:px-6 sm:pb-8 lg:px-8">
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
              {flowItems.map((item, index) => (
                <div
                  className={joinClasses(
                    "rounded-xl px-2 py-3 text-center transition",
                    item.active
                      ? "bg-black text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
                      : item.done
                        ? "bg-emerald-50 text-emerald-950"
                        : "bg-white text-zinc-600",
                  )}
                  key={item.label}
                >
                  <div
                    className={joinClasses(
                      "mx-auto flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                      item.active
                        ? "bg-white text-black"
                        : item.done
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 text-zinc-500",
                    )}
                  >
                    {item.done ? <CheckCircle2 className="size-4" /> : index + 1}
                  </div>
                  <p
                    className={joinClasses(
                      "mt-2 text-xs font-semibold leading-4 [word-break:keep-all]",
                      item.active
                        ? "text-white"
                        : item.done
                          ? "text-emerald-900"
                          : "text-zinc-600",
                    )}
                  >
                    {item.label}
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
                {oauthCallbackStatus.status === "failed" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {copy.oauthFailureChecks.map((item) => (
                      <span
                        className="inline-flex min-h-8 items-center rounded-full border border-rose-200 bg-white/65 px-3 text-xs font-semibold text-rose-900"
                        key={item}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {connectedAccount ? (
          <section className="mt-5 rounded-[1.15rem] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  {copy.successNextTitle}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-emerald-950">
                  {connectedAccount.handle}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-emerald-800 [word-break:keep-all]">
                  {copy.successNextBody}
                </p>
              </div>
              <div className="grid shrink-0 gap-2 sm:w-64">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-950 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900"
                  href={ledgerHref}
                >
                  {copy.ledger}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 text-xs font-semibold text-emerald-900"
                  href={launchHref}
                >
                  {copy.continueJourney}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                [copy.flowChannel, connectedAccount.handle],
                [copy.flowEvent, copy.recordReady],
                [copy.flowSync, copy.contentSyncReady],
              ].map(([label, value]) => (
                <div
                  className="min-w-0 rounded-xl border border-emerald-200 bg-white/72 px-3 py-2.5"
                  key={label}
                >
                  <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-emerald-700/70">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-emerald-950">
                    {value}
                  </p>
                </div>
              ))}
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
        ) : isSignedIn ? (
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
        ) : null}
      </div>
    </main>
  );
}
