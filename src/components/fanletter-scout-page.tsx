import Link from "next/link";
import { Share2, UserRoundCheck } from "lucide-react";

import { FanletterAIStarIdentity } from "@/components/fanletter-ai-star-identity";
import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterPrimaryHeader } from "@/components/fanletter-primary-header";
import { FanletterStarReferralPanel } from "@/components/fanletter-star-referral-panel";
import type { Locale } from "@/lib/i18n";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  type AIStar,
  type MemberPortfolio,
  type MemberPortfolioRole,
  type ScoutShareLoopData,
} from "@/mock/fanletterV2";

type FanletterScoutPageProps = {
  inboundReferralCode?: string | null;
  isAuthenticated: boolean;
  locale: Locale;
  portfolio?: MemberPortfolio | null;
  selectedStar: AIStar;
  stars: AIStar[];
  viewerScoutShareLoop?: ScoutShareLoopData | null;
};

function isKorean(locale: Locale) {
  return locale === "ko";
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function buildMockReferralCode(star: AIStar) {
  const token =
    star.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ||
    star.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return `${(token || "STAR").slice(0, 12)}-A-001`;
}

function formatUniverseName(name: string, locale: Locale) {
  if (!isKorean(locale)) {
    return name;
  }

  return name.replaceAll("Universe", "유니버스");
}

function buildMockScoutShareLoop({
  inboundReferralCode,
  locale,
  star,
}: {
  inboundReferralCode?: string | null;
  locale: Locale;
  star: AIStar;
}): ScoutShareLoopData {
  const referralCode = inboundReferralCode ?? buildMockReferralCode(star);
  const shareLink = `https://www.net402.ai/${locale}/fanletter/${encodeURIComponent(
    star.id,
  )}?ref=${encodeURIComponent(referralCode)}`;

  return {
    ...fanletterV2Mock.scoutShareLoop,
    referralCode,
    selectedUniverse: formatUniverseName(star.universeName, locale),
    shareLink,
    starId: star.id,
    starName: star.name,
  };
}

function getRoleLabel(role?: MemberPortfolioRole["role"] | null, locale?: Locale) {
  const isKo = locale === "ko";

  if (!role) {
    return isKo ? "참여 전" : "Not joined";
  }

  const labels: Record<MemberPortfolioRole["role"], string> = {
    creator: isKo ? "크리에이터" : "Creator",
    founder: isKo ? "파운더" : "Founder",
    genesis_founder: isKo ? "제네시스 파운더" : "Genesis Founder",
    legend: isKo ? "레전드" : "Legend",
    mentor: isKo ? "멘토" : "Mentor",
    partner: isKo ? "파트너" : "Partner",
    producer: isKo ? "프로듀서" : "Producer",
  };

  return labels[role];
}

function getScoutPageCopy(locale: Locale) {
  if (isKorean(locale)) {
    return {
      back: "FanLetter 홈",
      connected: "추천 링크 준비됨",
      connectFirst: "계정 연결 필요",
      eventFlow: "활동 기록",
      heroBody: "AI 스타를 선택하고 추천 링크를 공유하세요. 참여와 보상은 같은 AI 스타 유니버스에 기록됩니다.",
      heroEyebrow: "친구 초대 센터",
      heroTitle: "추천 링크를 공유하세요",
      liveData: "라이브 데이터",
      mockData: "미리보기 데이터",
      pendingEvent: "참여 후 기록",
      nextAction: "다음 행동",
      noRole:
        "아직 이 AI 스타의 파운더 네트워크에 참여하지 않았습니다. 참여 후 추천 링크를 공유할 수 있습니다.",
      primaryConnect: "계정 연결하기",
      primaryJoin: "파운더 참여 후 공유",
      primaryShare: "추천 링크 공유하기",
      reputationEvent: "활동 기록",
      reputationEventValue: "추천 공유 기록",
      role: "내 역할",
      scoutSummary: "친구 초대 상태",
      selectedStar: "선택 AI 스타",
      starSelector: "AI 스타 선택",
      starCandidate: "AI 스타",
      universe: "AI 스타 유니버스",
      viewFounderClub: "파운더 클럽 보기",
      viewUniverse: "AI 스타 유니버스 보기",
      metrics: {
        cp: "기여 포인트",
        invites: "성공 초대",
        progress: "크리에이터 진행",
        scout: "친구 초대 점수",
      },
      signpostSubtitle:
        "추천 링크 공유는 AI 스타 유니버스의 파운더 네트워크 성장과 활동 기록으로 이어집니다.",
      steps: ["추천 링크 생성", "SNS 공유", "파운더 참여", "활동 기록"],
    };
  }

  return {
    back: "FanLetter Home",
    connected: "Referral link ready",
    connectFirst: "Connect account first",
    eventFlow: "Activity record flow",
    heroBody:
      "Choose an AI Star and share its referral link. Joins and rewards stay attached to that AI Star Universe.",
    heroEyebrow: "Scout Center",
    heroTitle: "Share a referral link",
    liveData: "Live data",
    mockData: "Mock preview",
    pendingEvent: "Recorded after join",
    nextAction: "Next action",
    noRole:
      "You have not joined this AI Star's Founder Network yet. Join before sharing a referral link.",
    primaryConnect: "Connect account",
    primaryJoin: "Join Founder, then share",
    primaryShare: "Share referral link",
    reputationEvent: "Activity record",
    reputationEventValue: "Referral share record",
    role: "My role",
    scoutSummary: "Scout status",
    selectedStar: "Selected AI Star",
    starSelector: "Select AI Star",
    starCandidate: "AI Star",
    universe: "AI Star Universe",
    viewFounderClub: "View Founder Club",
    viewUniverse: "View AI Star Universe",
    metrics: {
      cp: "Contribution Points",
      invites: "Successful invites",
      progress: "Creator progress",
      scout: "Scout score",
    },
    signpostSubtitle:
      "Referral sharing grows the selected AI Star Universe's Founder Network and creates activity records.",
    steps: [
      "Create referral link",
      "Share to SNS",
      "Founder joins",
      "Activity record",
    ],
  };
}

function buildScoutHref(locale: Locale, starId: string) {
  return `/${locale}/fanletter/scout?starId=${encodeURIComponent(starId)}`;
}

export function FanletterScoutPage({
  inboundReferralCode,
  isAuthenticated,
  locale,
  portfolio,
  selectedStar,
  stars,
  viewerScoutShareLoop,
}: FanletterScoutPageProps) {
  const copy = getScoutPageCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const selectedRole =
    portfolio?.roles.find((role) => role.starId === selectedStar.id) ?? null;
  const scoutLoop =
    viewerScoutShareLoop ??
    buildMockScoutShareLoop({
      inboundReferralCode,
      locale,
      star: selectedStar,
    });
  const connectReturnTo = buildScoutHref(locale, selectedStar.id);
  const connectHref = `/${locale}/fanletter/connect?starId=${encodeURIComponent(
    selectedStar.id,
  )}&returnTo=${encodeURIComponent(connectReturnTo)}`;
  const joinHref = `/${locale}/fanletter/onboarding?star=${encodeURIComponent(
    selectedStar.id,
  )}&returnTo=${encodeURIComponent(connectReturnTo)}`;
  const universeHref = `/${locale}/fanletter/${encodeURIComponent(
    selectedStar.id,
  )}?ref=${encodeURIComponent(scoutLoop.referralCode)}`;
  const hasShareLoop = Boolean(viewerScoutShareLoop);
  const primaryHref = hasShareLoop
    ? "#referral-builder"
    : isAuthenticated
      ? joinHref
      : connectHref;
  const primaryLabel = hasShareLoop
    ? copy.primaryShare
    : isAuthenticated
      ? copy.primaryJoin
      : copy.primaryConnect;
  const primaryVariant = hasShareLoop ? "share" : isAuthenticated ? "join" : "connect";
  const progressSteps = copy.steps.map((step, index) => ({
    label: step,
    status:
      hasShareLoop && index === 0
        ? ("done" as const)
        : index === (hasShareLoop ? 1 : 0)
          ? ("active" as const)
          : ("next" as const),
  }));
  const selectableRoles =
    portfolio?.roles.length
      ? portfolio.roles.map((role) => ({
          id: role.starId,
          meta: getRoleLabel(role.role, locale),
          name: role.starName ?? role.starId,
          universe: formatUniverseName(
            role.universeName ?? `${role.starName ?? role.starId} Universe`,
            locale,
          ),
        }))
      : stars.slice(0, 6).map((star) => ({
          id: star.id,
          meta: copy.starCandidate,
          name: star.name,
          universe: formatUniverseName(star.universeName, locale),
        }));

  const pageTitle = copy.heroTitle;

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-950">
      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <h1 className="sr-only">{pageTitle}</h1>
        <FanletterPrimaryHeader
          locale={locale}
          referralCode={scoutLoop.referralCode}
        />

        <FanletterActionGuide
          className="mt-5"
          currentLabel={`${selectedStar.name} · ${formatUniverseName(
            selectedStar.universeName,
            locale,
          )}`}
          metrics={[
            {
              label: copy.role,
              value: getRoleLabel(selectedRole?.role, locale),
            },
            {
              label: copy.metrics.invites,
              value: formatNumber(portfolio?.successfulInvites ?? 0, locale),
            },
          ]}
          primaryAction={{
            agentRank: {
              eventType: hasShareLoop
                ? "referral_shared"
                : isAuthenticated
                  ? "founder_joined"
                  : "founder_joined",
              intent: hasShareLoop
                ? "share_scout_referral"
                : isAuthenticated
                  ? "join_founder_before_share"
                  : "connect_account_before_scout",
              source: "fanletter_home",
              starId: selectedStar.id,
            },
            href: primaryHref,
            label: primaryLabel,
            metadata: {
              location: "fanletter_scout_signpost",
              primaryAction: primaryVariant,
              starId: selectedStar.id,
            },
          }}
          reputationEventLabel={
            hasShareLoop ? copy.reputationEventValue : copy.pendingEvent
          }
          secondaryActions={[
            {
              href: universeHref,
              label: copy.viewUniverse,
              metadata: {
                location: "fanletter_scout_signpost",
                starId: selectedStar.id,
              },
            },
          ]}
          steps={progressSteps}
          subtitle={copy.signpostSubtitle}
          title={primaryLabel}
        />

        <FanletterAIStarIdentity
          accentColor={selectedStar.accentColor}
          accentSecondary={selectedStar.accentSecondary}
          className="mt-4"
          compact
          meta={`${copy.role}: ${getRoleLabel(selectedRole?.role, locale)}`}
          name={selectedStar.name}
          portraitImageUrl={selectedStar.portraitImageUrl}
          portraitInitials={selectedStar.portraitInitials}
          statusLabel={hasShareLoop ? copy.connected : copy.nextAction}
          universeName={formatUniverseName(selectedStar.universeName, locale)}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <div className="grid min-h-full gap-0 sm:grid-cols-[0.86fr_1fr]">
              <div className="relative min-h-72 bg-zinc-900">
                {selectedStar.portraitImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- AI Star portraits may come from mock or uploaded remote URLs outside fixed Next image domains.
                  <img
                    alt={`${selectedStar.name} AI Star`}
                    className="absolute inset-0 size-full object-cover"
                    src={selectedStar.portraitImageUrl}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-5xl font-semibold">
                    {selectedStar.portraitInitials}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/8 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                  AI STAR
                </span>
              </div>

              <div className="flex min-w-0 flex-col justify-between p-5 sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/54">
                    {copy.heroEyebrow}
                  </p>
                  <p className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl">
                    {copy.heroTitle}
                  </p>
                  <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-white/66">
                    {copy.heroBody}
                  </p>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                      {copy.selectedStar}
                    </p>
                    <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-semibold">
                          {selectedStar.name}
                        </h2>
                        <p className="truncate text-sm font-medium text-white/56">
                          {copy.starCandidate}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/14 bg-white/10 px-3 py-1 text-xs font-semibold">
                        {copy.universe}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                      <p className="text-xs font-semibold text-white/45">
                        {copy.role}
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {getRoleLabel(selectedRole?.role, locale)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                      <p className="text-xs font-semibold text-white/45">
                        {copy.nextAction}
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {primaryLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white p-4 text-black">
                      <p className="text-xs font-semibold text-black/45">
                        {copy.reputationEvent}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold">
                        {copy.reputationEventValue}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {copy.scoutSummary}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                {
                  label: copy.metrics.scout,
                  value: portfolio?.scoutScore ?? 0,
                },
                {
                  label: copy.metrics.invites,
                  value: portfolio?.successfulInvites ?? 0,
                },
                {
                  label: copy.metrics.cp,
                  value: formatNumber(portfolio?.cpBalance ?? 0, locale),
                },
                {
                  label: copy.metrics.progress,
                  value: `${portfolio?.creatorEligibilityPercent ?? 0}%`,
                },
              ].map((metric) => (
                <div
                  className="rounded-2xl border border-zinc-200 bg-white p-3"
                  key={metric.label}
                >
                  <p className="text-xl font-semibold text-black">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-4 text-zinc-500">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>

            {!selectedRole ? (
              <p className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3 text-sm font-semibold leading-5 text-zinc-600">
                {copy.noRole}
              </p>
            ) : null}

            <a
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-center text-sm font-semibold leading-tight text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800"
              href={primaryHref}
            >
              <Share2 className="size-4 shrink-0" />
              <span className="min-w-0 whitespace-normal [word-break:keep-all]">
                {primaryLabel}
              </span>
            </a>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-600 transition hover:text-black"
                href={`/${locale}/fanletter/founder-club`}
              >
                {copy.viewFounderClub}
              </Link>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-600 transition hover:text-black"
                href={universeHref}
              >
                {copy.viewUniverse}
              </Link>
            </div>
          </aside>
        </div>

        <section className="mt-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 shadow-[0_18px_54px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black">
              <UserRoundCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {copy.starSelector}
              </p>
              <h2 className="text-xl font-semibold text-black">
                {copy.universe}
              </h2>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {selectableRoles.map((role) => {
              const isSelected = role.id === selectedStar.id;

              return (
                <Link
                  aria-current={isSelected ? "page" : undefined}
                  className={`min-h-24 rounded-2xl border p-4 transition ${
                    isSelected
                      ? "border-black bg-black text-white shadow-[0_16px_34px_rgba(15,23,42,0.14)]"
                      : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300"
                  }`}
                  href={buildScoutHref(locale, role.id)}
                  key={role.id}
                >
                  <p
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white/52" : "text-zinc-500"
                    }`}
                  >
                    {role.meta}
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold">
                    {role.name}
                  </p>
                  <p
                    className={`mt-1 truncate text-sm font-medium ${
                      isSelected ? "text-white/56" : "text-zinc-500"
                    }`}
                  >
                    {role.universe}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-4">
          <FanletterStarReferralPanel
            copy={v2Copy}
            inboundReferralCode={inboundReferralCode}
            joinHref={joinHref}
            joinReferralCode={inboundReferralCode}
            locale={locale}
            loop={scoutLoop}
            primaryActionHref={primaryHref}
            primaryActionLabel={primaryLabel}
            primaryActionVariant={primaryVariant}
            starId={selectedStar.id}
          />
        </section>
      </section>
    </main>
  );
}
