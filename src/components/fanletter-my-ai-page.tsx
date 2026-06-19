import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Crown,
  ExternalLink,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import type { Locale } from "@/lib/i18n";
import {
  getFanletterAIStarSocialAccount,
  getFanletterAIStarSocialStatusLabel,
} from "@/mock/fanletter-social-accounts";
import {
  fanletterV2Mock,
  type AIStar,
  type MemberOwnedAIStar,
  type MemberPortfolio,
} from "@/mock/fanletterV2";

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStar: "AI STAR",
      back: "FanLetter 홈",
      connect: "TikTok 연결하기",
      connected: "TikTok 연결됨",
      content: "콘텐츠",
      contentReady: "콘텐츠 준비",
      creator: "Creator / Owner",
      creatorStatus: "Creator 권한",
      emptyBody:
        "아직 운영 중인 AI 스타가 없습니다. Creator 권한 활성화 조건을 확인하고 새 AI 스타 생성을 준비하세요.",
      emptyCta: "Creator 권한 활성화 보기",
      emptyTitle: "운영 중인 AI 스타가 없습니다",
      eventConnected: "creator_social_connected 평판 기록 생성",
      eventPending: "TikTok 연결 시 평판 기록 생성",
      heroBody:
        "내 AI는 회원 개인 계정이 아니라 AI 스타별 운영 채널입니다. TikTok 연결, 콘텐츠 준비, 평판 기록을 한 화면에서 확인합니다.",
      heroEyebrow: "내 AI",
      heroTitle: "내가 운영하는 AI 스타",
      launch: "출시 의도",
      mockLaunch: "mock 출시",
      nextConnected: "AI 스타 유니버스 보기",
      nextPending: "TikTok 연결 필요",
      open: "AI 스타 보기",
      routeLabel: "FanLetter / 내 AI",
      source: "원천 AI 스타 유니버스",
      status: "상태",
      steps: ["운영 AI", "TikTok", "콘텐츠", "평판 기록"],
      tiktok: "TikTok",
      viewReputation: "평판 기록 보기",
      viewUniverse: "AI 스타 유니버스 보기",
    };
  }

  return {
    aiStar: "AI STAR",
    back: "FanLetter Home",
    connect: "Connect TikTok",
    connected: "TikTok connected",
    content: "Content",
    contentReady: "Content ready",
    creator: "Creator / Owner",
    creatorStatus: "Creator permission",
    emptyBody:
      "No AI Stars are operated yet. Review Creator permission activation conditions and prepare a new AI Star.",
    emptyCta: "View Creator Permission",
    emptyTitle: "No operated AI Stars yet",
    eventConnected: "creator_social_connected reputation record created",
    eventPending: "TikTok connection will create a reputation record",
    heroBody:
      "My AI is not a personal member account. It is the AI Star-specific operating channel for TikTok, content readiness, and reputation records.",
    heroEyebrow: "My AI",
    heroTitle: "AI Stars I operate",
    launch: "Launch intent",
    mockLaunch: "mock launch",
    nextConnected: "View AI Star Universe",
    nextPending: "TikTok connection needed",
    open: "View AI Star",
    routeLabel: "FanLetter / My AI",
    source: "Source AI Star Universe",
    status: "Status",
    steps: ["Operate", "TikTok", "Content", "Reputation"],
    tiktok: "TikTok",
    viewReputation: "View Reputation Records",
    viewUniverse: "View AI Star Universe",
  };
}

function getStarName(star: MemberOwnedAIStar, fallback?: AIStar) {
  return star.name || fallback?.name || star.id;
}

function getUniverseName(star: MemberOwnedAIStar, fallback?: AIStar) {
  return star.universeName || fallback?.universeName || `${getStarName(star, fallback)} Universe`;
}

function resolvePrimaryStar({
  ownedStars,
}: {
  ownedStars: MemberOwnedAIStar[];
}) {
  return (
    ownedStars.find((star) => !getFanletterAIStarSocialAccount(star.id)) ??
    ownedStars[0] ??
    null
  );
}

function AIStarPortrait({
  accentColor,
  accentSecondary,
  initials,
  name,
  portraitUrl,
}: {
  accentColor: string;
  accentSecondary: string;
  initials: string;
  name: string;
  portraitUrl?: string | null;
}) {
  return (
    <span
      className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-950"
      style={{
        background: portraitUrl
          ? undefined
          : `linear-gradient(145deg, ${accentSecondary}, ${accentColor})`,
      }}
    >
      {portraitUrl ? (
        <Image alt={name} className="object-cover" fill sizes="64px" src={portraitUrl} />
      ) : (
        initials
      )}
    </span>
  );
}

export function FanletterMyAIPage({
  isSignedIn,
  locale,
  portfolio: livePortfolio,
  stars = fanletterV2Mock.aiStars,
}: {
  isSignedIn: boolean;
  locale: Locale;
  portfolio?: MemberPortfolio | null;
  stars?: AIStar[];
}) {
  const copy = getCopy(locale);
  const portfolio: MemberPortfolio = livePortfolio ?? fanletterV2Mock.memberPortfolio;
  const ownedStars = portfolio.ownedStars ?? [];
  const starsById = new Map<string, AIStar>(
    [...stars, ...fanletterV2Mock.aiStars].map((star) => [star.id, star]),
  );
  const primaryStar = resolvePrimaryStar({ ownedStars });
  const primaryFallback = primaryStar ? starsById.get(primaryStar.id) : undefined;
  const primaryAccount = primaryStar
    ? getFanletterAIStarSocialAccount(primaryStar.id)
    : null;
  const primaryHref = primaryStar
    ? primaryAccount
      ? `/${locale}/fanletter/${encodeURIComponent(primaryStar.id)}`
      : `/${locale}/fanletter/creator-unlock?starId=${encodeURIComponent(
          primaryStar.id,
        )}#tiktok-channel`
    : `/${locale}/fanletter/creator-unlock`;
  const connectedCount = ownedStars.filter((star) =>
    getFanletterAIStarSocialAccount(star.id),
  ).length;
  const currentLabel = primaryStar
    ? `${getStarName(primaryStar, primaryFallback)} · ${getUniverseName(
        primaryStar,
        primaryFallback,
      )}`
    : copy.routeLabel;

  return (
    <main className="min-h-screen overflow-x-hidden bg-white pb-10 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-black"
          href={`/${locale}/fanletter`}
        >
          <ArrowRight className="size-3.5 rotate-180" />
          {copy.back}
        </Link>

        <FanletterActionGuide
          currentLabel={currentLabel}
          metrics={[
            {
              label: copy.creatorStatus,
              value: `${formatNumber(ownedStars.length, locale)} ${
                locale === "ko" ? "개 운영" : "operated"
              }`,
            },
            {
              label: copy.tiktok,
              value: `${formatNumber(connectedCount, locale)}/${formatNumber(
                ownedStars.length,
                locale,
              )}`,
            },
          ]}
          primaryAction={{
            agentRank: primaryStar
              ? {
                  eventType: primaryAccount
                    ? "ai_star_discovered"
                    : "creator_social_connected",
                  intent: primaryAccount
                    ? "view_my_ai_star_universe"
                    : "connect_ai_star_tiktok",
                  source: "fanletter_home",
                  starId: primaryStar.id,
                }
              : {
                  eventType: "creator_unlock_evaluated",
                  intent: "open_creator_permission_activation",
                  source: "fanletter_home",
                  starId: null,
                },
            href: primaryHref,
            label: primaryStar
              ? primaryAccount
                ? copy.nextConnected
                : copy.connect
              : copy.emptyCta,
            metadata: {
              location: "fanletter_my_ai_action_guide",
              signedIn: isSignedIn,
              starId: primaryStar?.id,
            },
          }}
          reputationEventLabel={
            primaryAccount ? copy.eventConnected : copy.eventPending
          }
          steps={copy.steps.map((step, index) => ({
            label: step,
            status:
              index === 0 ||
              (index === 1 && primaryAccount) ||
              (index === 2 && primaryAccount)
                ? "done"
                : index === (primaryAccount ? 3 : 1)
                  ? "active"
                  : "next",
          }))}
          subtitle={copy.heroBody}
          title={primaryAccount ? copy.nextConnected : copy.nextPending}
        />

        <section className="min-w-0 overflow-hidden rounded-[1.4rem] border border-zinc-200 bg-zinc-950 p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
                <Bot className="size-4" />
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-2 break-words text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/58 [word-break:keep-all]">
                {copy.heroBody}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-80">
              {[
                {
                  label: copy.aiStar,
                  value: formatNumber(ownedStars.length, locale),
                },
                {
                  label: copy.connected,
                  value: formatNumber(connectedCount, locale),
                },
                {
                  label: "CP",
                  value: formatNumber(portfolio.cpBalance, locale),
                },
              ].map((metric) => (
                <div
                  className="min-w-0 rounded-xl border border-white/10 bg-white/8 px-3 py-3"
                  key={metric.label}
                >
                  <p className="truncate text-[0.62rem] font-semibold text-white/42">
                    {metric.label}
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold text-white">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {ownedStars.length > 0 ? (
          <section className="grid min-w-0 gap-3 sm:grid-cols-2">
            {ownedStars.map((ownedStar) => {
              const star = starsById.get(ownedStar.id);
              const account = getFanletterAIStarSocialAccount(ownedStar.id);
              const name = getStarName(ownedStar, star);
              const universeName = getUniverseName(ownedStar, star);
              const portraitUrl =
                ownedStar.portraitImageUrl ?? star?.portraitImageUrl ?? null;
              const initials =
                ownedStar.portraitInitials ??
                star?.portraitInitials ??
                getInitials(name);
              const socialStatus = account
                ? getFanletterAIStarSocialStatusLabel({
                    locale,
                    status: account.status,
                  })
                : null;
              const primaryLabel = account ? copy.viewUniverse : copy.connect;
              const primaryActionHref = account
                ? `/${locale}/fanletter/${encodeURIComponent(ownedStar.id)}/universe`
                : `/${locale}/fanletter/creator-unlock?starId=${encodeURIComponent(
                    ownedStar.id,
                  )}#tiktok-channel`;

              return (
                <article
                  className="min-w-0 rounded-[1.2rem] border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
                  key={ownedStar.id}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <AIStarPortrait
                      accentColor={star?.accentColor ?? "#111827"}
                      accentSecondary={star?.accentSecondary ?? "#71717a"}
                      initials={initials}
                      name={name}
                      portraitUrl={portraitUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-zinc-950 px-2.5 py-1 text-[0.62rem] font-semibold text-white">
                          {copy.aiStar}
                        </span>
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-semibold text-emerald-800">
                          {copy.creator}
                        </span>
                      </div>
                      <h2 className="mt-2 truncate text-xl font-semibold">
                        {name}
                      </h2>
                      <p className="truncate text-sm font-medium text-zinc-500">
                        {universeName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-zinc-500">
                        <Link2 className="size-3.5" />
                        {copy.tiktok}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                        {account ? account.handle : copy.nextPending}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-zinc-500">
                        <ShieldCheck className="size-3.5" />
                        {copy.status}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                        {socialStatus ?? copy.nextPending}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-zinc-500">
                        <Sparkles className="size-3.5" />
                        AgentRank
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                        {account ? copy.eventConnected : copy.eventPending}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                      <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-zinc-500">
                        <Crown className="size-3.5" />
                        {copy.launch}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                        {ownedStar.createdByUnlock
                          ? `${copy.mockLaunch}${
                              ownedStar.launchCostUsdt
                                ? ` · ${ownedStar.launchCostUsdt} USDT`
                                : ""
                            }`
                          : copy.contentReady}
                      </p>
                    </div>
                  </div>

                  {ownedStar.sourceUniverseName ? (
                    <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-500 [word-break:keep-all]">
                      {copy.source}:{" "}
                      <span className="text-zinc-950">
                        {ownedStar.sourceUniverseName}
                      </span>
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    <Link
                      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-zinc-800"
                      href={primaryActionHref}
                    >
                      <span className="min-w-0 truncate">{primaryLabel}</span>
                      <ArrowRight className="size-4 shrink-0" />
                    </Link>
                    {account ? (
                      <Link
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                        href={`/${locale}/fanletter/agentrank/events?starId=${encodeURIComponent(
                          ownedStar.id,
                        )}&limit=40`}
                      >
                        <span className="min-w-0 truncate">
                          {copy.viewReputation}
                        </span>
                        <ExternalLink className="size-4 shrink-0" />
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-[1.2rem] border border-dashed border-zinc-300 bg-zinc-50 p-5">
            <p className="text-lg font-semibold text-zinc-950">
              {copy.emptyTitle}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
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
