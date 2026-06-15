"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Crown,
  Link2,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

import { CopyTextButton } from "@/components/copy-text-button";
import {
  toMemberOwnedAIStar,
  useFanletterCreatorMockLaunches,
} from "@/components/fanletter-creator-mock-launch-state";
import {
  type FanletterFounderMockMembership,
  useFanletterFounderMockMemberships,
} from "@/components/fanletter-founder-mock-state";
import {
  FounderRoleBadge,
  HumanMemberAvatar,
  MemberPortfolio,
} from "@/components/fanletter-founder-club-v2";
import type { Locale } from "@/lib/i18n";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  type AIStar,
  type MemberOwnedAIStar,
  type MemberPortfolio as MemberPortfolioData,
  type MemberPortfolioRole,
  type ScoutShareLoopData,
} from "@/mock/fanletterV2";

type FounderClubRoleShare = {
  loop: ScoutShareLoopData | null;
  mockMembership?: FanletterFounderMockMembership | null;
  role: MemberPortfolioRole;
};

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function isKorean(locale: Locale) {
  return locale === "ko";
}

function getCopy(locale: Locale) {
  if (isKorean(locale)) {
    return {
      back: "FanLetter 홈",
      creatorUnlock: "크리에이터 열기",
      emptyShare:
        "이 AI 스타의 추천 링크는 파운더 상태 확인 후 생성됩니다.",
      heroBody:
        "내가 파운더로 참여한 AI 스타, 추천 링크, CP, 영향력, 크리에이터 진행률을 한 화면에서 관리합니다.",
      heroEyebrow: "Founder Club 2.0",
      heroTitle: "내 파운더 클럽",
      liveLabel: "라이브 데이터",
      mockLabel: "예시 데이터",
      mockLaunchBody:
        "Creator Unlock에서 만든 mock AI 스타 draft가 이 브라우저 포트폴리오에 반영되었습니다.",
      mockLaunchTitle: "Mock AI 스타 draft 반영됨",
      mockMembershipBody:
        "이 브라우저에서 저장된 Founder 참여 내역입니다. 실제 결제/DB 반영 전까지 v2.0 흐름을 미리 확인합니다.",
      mockMembershipCta: "유니버스 보기",
      mockMembershipTitle: "Mock Founder 참여 반영됨",
      referralCode: "추천 코드",
      shareLink: "공유 링크",
      shareSectionBody:
        "AI 스타별 추천 링크를 공유하면 새 파운더 가입이 해당 유니버스에 귀속됩니다.",
      shareSectionEyebrow: "추천 관리",
      shareSectionTitle: "AI 스타별 추천 링크",
      universeCta: "유니버스 보기",
      metrics: {
        cp: "CP",
        eligibility: "크리에이터 진행률",
        invites: "성공 초대",
        scout: "스카우트 점수",
      },
    };
  }

  return {
    back: "FanLetter Home",
    creatorUnlock: "Creator Unlock",
    emptyShare:
      "This AI Star referral link is created after Founder status is confirmed.",
    heroBody:
      "Manage your AI Star Founder roles, referral links, CP, influence, and Creator progress in one place.",
    heroEyebrow: "Founder Club 2.0",
    heroTitle: "My Founder Club",
    liveLabel: "Live data",
    mockLabel: "Mock data",
    mockLaunchBody:
      "Mock AI Star drafts created from Creator Unlock are reflected in this browser portfolio.",
    mockLaunchTitle: "Mock AI Star drafts reflected",
    mockMembershipBody:
        "Founder joins saved in this browser are reflected here while the v2.0 flow remains mock-only before real payment and DB writes.",
      mockMembershipCta: "View Universe",
      mockMembershipTitle: "Mock Founder join reflected",
      referralCode: "Referral Code",
      shareLink: "Share Link",
    shareSectionBody:
      "Each AI Star referral link attributes the new Founder join to that universe.",
    shareSectionEyebrow: "Referral Manager",
    shareSectionTitle: "AI Star Referral Links",
    universeCta: "View Universe",
    metrics: {
      cp: "CP",
      eligibility: "Creator Progress",
      invites: "Successful Invites",
      scout: "Scout Score",
    },
  };
}

function buildFallbackShareLoop(
  role: MemberPortfolioRole,
): ScoutShareLoopData | null {
  if (role.starId !== "minseo") {
    return null;
  }

  return {
    ...fanletterV2Mock.scoutShareLoop,
    starId: role.starId,
    starName: role.starName,
  };
}

function buildMockReferralCode(starId: string, starName?: string | null) {
  const token = (starName || starId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  return `${(token || "STAR").slice(0, 12)}-A-001`;
}

function buildMockShareLoop({
  locale,
  membership,
  role,
}: {
  locale: Locale;
  membership: FanletterFounderMockMembership;
  role: MemberPortfolioRole;
}): ScoutShareLoopData {
  const referralCode =
    membership.referralCode ?? buildMockReferralCode(role.starId, role.starName);
  const shareLink = `https://www.net402.ai/${locale}/fanletter/${encodeURIComponent(
    role.starId,
  )}?ref=${encodeURIComponent(referralCode)}`;

  return {
    ...fanletterV2Mock.scoutShareLoop,
    referralCode,
    selectedUniverse: role.universeName ?? `${role.starName ?? role.starId} Universe`,
    shareLink,
    starId: role.starId,
    starName: role.starName ?? role.starId,
  };
}

function buildFallbackPlatformHref(platform: string, shareLink: string) {
  if (platform === "X") {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("url", shareLink);

    return url.toString();
  }

  return shareLink;
}

function FounderRoleShareCard({
  locale,
  roleShare,
}: {
  locale: Locale;
  roleShare: FounderClubRoleShare;
}) {
  const copy = getCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const loop = roleShare.mockMembership
    ? buildMockShareLoop({
        locale,
        membership: roleShare.mockMembership,
        role: roleShare.role,
      })
    : roleShare.loop ?? buildFallbackShareLoop(roleShare.role);
  const starName = roleShare.role.starName ?? roleShare.role.starId;
  const universeName = roleShare.role.universeName ?? `${starName} Universe`;
  const universeHref = `/${locale}/fanletter/${roleShare.role.starId}${
    loop?.referralCode ? `?ref=${encodeURIComponent(loop.referralCode)}` : ""
  }`;
  const platformLinks =
    loop?.sharePlatformLinks?.map((platformLink) => ({
      href: platformLink.href,
      label: platformLink.label,
    })) ??
    (loop
      ? loop.sharePlatforms.map((platform) => ({
          href: buildFallbackPlatformHref(platform, loop.shareLink),
          label: platform,
        }))
      : []);

  return (
    <article className="rounded-lg border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[#6d28d9]">
            <Crown className="size-4" />
            AI STAR
          </p>
          <h2 className="mt-2 truncate text-xl font-semibold text-[#12041f]">
            {starName}
          </h2>
          <p className="mt-1 truncate text-sm font-medium text-black/52">
            {universeName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {roleShare.mockMembership ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-semibold text-emerald-800">
              <BadgeCheck className="size-3.5" />
              {isKorean(locale) ? "참여 완료" : "Joined"}
            </span>
          ) : null}
          <FounderRoleBadge copy={v2Copy} role={roleShare.role.role} />
        </div>
      </div>

      {loop ? (
        <div className="mt-4 rounded-lg border border-black/8 bg-[#f6f8f4] p-3">
          <p className="text-xs font-semibold uppercase text-black/48">
            {copy.referralCode}
          </p>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-[#5b21b6]">
            {loop.referralCode}
          </p>
          <div className="mt-3 rounded-lg border border-black/8 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-black/48">
              <Link2 className="size-3.5" />
              {copy.shareLink}
            </div>
            <p className="mt-2 break-all font-mono text-[0.68rem] font-semibold leading-4 text-[#5b21b6]">
              {loop.shareLink}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <CopyTextButton
                className="h-10 border-black/10 text-sm font-semibold"
                copiedLabel={isKorean(locale) ? "복사됨" : "Copied"}
                copyLabel={isKorean(locale) ? "링크 복사" : "Copy link"}
                text={loop.shareLink}
              />
              {platformLinks.map((platformLink) => (
                <a
                  className="inline-flex h-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-[#5b21b6] transition hover:border-violet-300 hover:bg-violet-100"
                  href={platformLink.href}
                  key={platformLink.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  {platformLink.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-black/12 bg-zinc-50 p-3 text-sm font-semibold leading-5 text-black/48">
          {copy.emptyShare}
        </p>
      )}

      <Link
        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800 [word-break:keep-all]"
        href={universeHref}
      >
        <span className="min-w-0 whitespace-normal">{copy.universeCta}</span>
        <ArrowRight className="size-4 shrink-0" />
      </Link>
    </article>
  );
}

function MockFounderMembershipSummary({
  locale,
  memberships,
  stars,
}: {
  locale: Locale;
  memberships: FanletterFounderMockMembership[];
  stars: AIStar[];
}) {
  if (memberships.length === 0) {
    return null;
  }

  const copy = getCopy(locale);
  const starsById = new Map(
    [...stars, ...fanletterV2Mock.aiStars].map((star) => [star.id, star]),
  );

  return (
    <section className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-[0_18px_44px_rgba(16,185,129,0.1)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
          <BadgeCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">
            {copy.mockMembershipTitle}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-emerald-900/72">
            {copy.mockMembershipBody}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {memberships.map((membership) => {
          const star = starsById.get(membership.starId);
          const starName = star?.name ?? membership.starId;
          const referralCode =
            membership.referralCode ??
            buildMockReferralCode(membership.starId, starName);
          const universeHref = `/${locale}/fanletter/${membership.starId}?ref=${encodeURIComponent(
            referralCode,
          )}&founder=joined`;

          return (
            <Link
              className="flex min-h-20 items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white p-3 text-emerald-950 transition hover:border-emerald-300 hover:bg-emerald-50"
              href={universeHref}
              key={membership.starId}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {starName}
                </span>
                <span className="mt-1 block truncate font-mono text-xs font-semibold text-emerald-800">
                  {referralCode}
                </span>
                <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[0.62rem] font-semibold text-emerald-800">
                  CP +100 · Influence +5 · Creator +2%
                </span>
              </span>
              <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-emerald-700 px-3 text-xs font-semibold text-white">
                {copy.mockMembershipCta}
                <ArrowRight className="size-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MockCreatorLaunchSummary({
  launches,
  locale,
}: {
  launches: MemberOwnedAIStar[];
  locale: Locale;
}) {
  if (launches.length === 0) {
    return null;
  }

  const copy = getCopy(locale);

  return (
    <section className="mt-4 rounded-lg border border-fuchsia-200 bg-[#faf5ff] p-4 text-[#3b0764] shadow-[0_18px_44px_rgba(168,85,247,0.1)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#7c3aed]">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">
            {copy.mockLaunchTitle}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#3b0764]/70">
            {copy.mockLaunchBody}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {launches.map((launch) => (
          <div
            className="flex min-h-20 items-center justify-between gap-3 rounded-lg border border-fuchsia-200 bg-white p-3"
            key={launch.id}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {launch.name}
              </span>
              <span className="mt-1 block truncate text-xs font-semibold text-[#7c3aed]">
                {launch.sourceUniverseName}
              </span>
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#7c3aed] px-3 text-xs font-semibold text-white">
              {launch.launchCostUsdt ?? 10} USDT
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FanletterFounderClubPage({
  locale,
  portfolio: livePortfolio,
  roleShares: liveRoleShares,
  stars = fanletterV2Mock.aiStars,
}: {
  locale: Locale;
  portfolio?: MemberPortfolioData | null;
  roleShares?: FounderClubRoleShare[] | null;
  stars?: AIStar[];
}) {
  const copy = getCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const basePortfolio: MemberPortfolioData =
    livePortfolio ?? fanletterV2Mock.memberPortfolio;
  const mockMembershipsByStarId = useFanletterFounderMockMemberships();
  const mockLaunchesById = useFanletterCreatorMockLaunches();
  const mockOwnedStars = useMemo(
    () => Object.values(mockLaunchesById).map(toMemberOwnedAIStar),
    [mockLaunchesById],
  );
  const mockMemberships = useMemo(
    () => Object.values(mockMembershipsByStarId),
    [mockMembershipsByStarId],
  );
  const starsById = useMemo(
    () =>
      new Map(
        [...stars, ...fanletterV2Mock.aiStars].map((star) => [star.id, star]),
      ),
    [stars],
  );
  const portfolio: MemberPortfolioData = useMemo(() => {
    if (mockMemberships.length === 0 && mockOwnedStars.length === 0) {
      return basePortfolio;
    }

    const existingRoleStarIds = new Set(
      basePortfolio.roles.map((role) => role.starId),
    );
    const mockRoles = mockMemberships
      .filter((membership) => !existingRoleStarIds.has(membership.starId))
      .map<MemberPortfolioRole>((membership) => {
        const star = starsById.get(membership.starId);

        return {
          role: "founder",
          starId: membership.starId,
          starName: star?.name ?? membership.starId,
          universeName: star?.universeName ?? `${membership.starId} Universe`,
        };
      });
    const existingOwnedStarIds = new Set(
      basePortfolio.ownedStars.map((star) => star.id),
    );
    const nextOwnedStars = [
      ...mockOwnedStars.filter((star) => !existingOwnedStarIds.has(star.id)),
      ...basePortfolio.ownedStars,
    ];

    return {
      ...basePortfolio,
      cpBalance: basePortfolio.cpBalance + mockMemberships.length * 100,
      creatorEligibilityPercent: Math.min(
        100,
        basePortfolio.creatorEligibilityPercent + mockMemberships.length * 2,
      ),
      isLiveData: basePortfolio.isLiveData,
      ownedStars: nextOwnedStars,
      roles: [...basePortfolio.roles, ...mockRoles],
      scoutScore: Math.min(100, basePortfolio.scoutScore + mockMemberships.length * 5),
      successfulInvites:
        basePortfolio.successfulInvites + mockMemberships.length,
    };
  }, [basePortfolio, mockMemberships, mockOwnedStars, starsById]);
  const memberInitials =
    portfolio.memberInitials ??
    portfolio.memberName
      .replace(/[^a-zA-Z0-9가-힣\s]/g, " ")
      .trim()
      .slice(0, 2)
      .toUpperCase();
  const roleShares = useMemo(() => {
    const baseRoleShares: FounderClubRoleShare[] =
      liveRoleShares && liveRoleShares.length > 0
        ? liveRoleShares
        : portfolio.roles.map((role) => ({
            loop: null,
            role,
          }));
    const baseRoleShareStarIds = new Set(
      baseRoleShares.map((roleShare) => roleShare.role.starId),
    );
    const patchedRoleShares = baseRoleShares.map((roleShare) => ({
      ...roleShare,
      mockMembership:
        mockMembershipsByStarId[roleShare.role.starId] ??
        roleShare.mockMembership ??
        null,
    }));
    const appendedRoleShares = mockMemberships
      .filter((membership) => !baseRoleShareStarIds.has(membership.starId))
      .map<FounderClubRoleShare>((membership) => {
        const star = starsById.get(membership.starId);

        return {
          loop: null,
          mockMembership: membership,
          role: {
            role: "founder",
            starId: membership.starId,
            starName: star?.name ?? membership.starId,
            universeName: star?.universeName ?? `${membership.starId} Universe`,
          },
        };
      });

    return [...patchedRoleShares, ...appendedRoleShares];
  }, [
    liveRoleShares,
    mockMemberships,
    mockMembershipsByStarId,
    portfolio.roles,
    starsById,
  ]);
  const metricItems = [
    {
      label: copy.metrics.scout,
      value: portfolio.scoutScore,
    },
    {
      label: copy.metrics.invites,
      value: portfolio.successfulInvites,
    },
    {
      label: copy.metrics.cp,
      value: formatNumber(portfolio.cpBalance, locale),
    },
    {
      label: copy.metrics.eligibility,
      value: `${portfolio.creatorEligibilityPercent}%`,
    },
  ];

  return (
    <main className="fanletter-v2-surface min-h-screen bg-[#fbfaff] px-4 py-5 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-[#5b21b6] transition hover:bg-violet-50"
            href={`/${locale}/fanletter`}
          >
            <ArrowLeft className="size-4" />
            {copy.back}
          </Link>
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
            href={`/${locale}/fanletter/creator-unlock`}
          >
            <Sparkles className="size-4" />
            {copy.creatorUnlock}
          </Link>
        </div>

        <section className="mt-6 rounded-lg border border-violet-200 bg-white p-4 shadow-[0_24px_70px_rgba(88,28,135,0.1)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <HumanMemberAvatar
                  member={{ initials: memberInitials, name: portfolio.memberName }}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#6d28d9]">
                    {copy.heroEyebrow}
                  </p>
                  <h1 className="text-[2.45rem] font-semibold leading-none tracking-normal text-[#12041f] [word-break:keep-all] sm:text-[4rem]">
                    {copy.heroTitle}
                  </h1>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/62">
                {copy.heroBody}
              </p>
              <span className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {portfolio.isLiveData ? copy.liveLabel : copy.mockLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metricItems.map((metric) => (
                <div
                  className="rounded-lg border border-black/8 bg-[#f8f7ff] p-3"
                  key={metric.label}
                >
                  <p className="text-2xl font-semibold text-[#12041f]">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-[0.64rem] font-semibold uppercase text-black/48">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MockFounderMembershipSummary
          locale={locale}
          memberships={mockMemberships}
          stars={stars}
        />
        <MockCreatorLaunchSummary launches={mockOwnedStars} locale={locale} />

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#6d28d9]">
                  {copy.shareSectionEyebrow}
                </p>
                <h2 className="text-2xl font-semibold text-[#12041f]">
                  {copy.shareSectionTitle}
                </h2>
              </div>
              <p className="text-sm font-medium leading-6 text-black/56 sm:max-w-md sm:text-right">
                {copy.shareSectionBody}
              </p>
            </div>
            <div className="grid gap-3">
              {roleShares.map((roleShare) => (
                <FounderRoleShareCard
                  key={roleShare.role.starId}
                  locale={locale}
                  roleShare={roleShare}
                />
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <MemberPortfolio
              copy={v2Copy}
              locale={locale}
              portfolio={portfolio}
              stars={stars}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
