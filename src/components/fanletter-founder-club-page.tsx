"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Crown,
  Link2,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

import { CopyTextButton } from "@/components/copy-text-button";
import { FanletterPrimaryHeader } from "@/components/fanletter-primary-header";
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
import { trackFunnelEvent } from "@/lib/funnel-client";
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

type FounderClubView = "creator" | "founder";
type FounderClubEntryContext = "default" | "my-ai";

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
      creatorUnlock: "크리에이터 권한 활성화",
      emptyShare:
        "이 AI 스타의 추천 링크는 파운더 상태 확인 후 생성됩니다.",
      heroBody:
        "내가 운영하는 AI 스타와 참여 중인 파운더 네트워크를 분리해서 확인하고 다음 행동을 선택하세요.",
      heroEyebrow: "파운더 클럽",
      heroTitle: "내 FanLetter 포트폴리오",
      liveLabel: "라이브 데이터",
      mockLabel: "예시 데이터",
      mockLaunchBody:
        "크리에이터 여정에서 만든 AI 스타 초안이 이 브라우저 포트폴리오에 반영되었습니다.",
      mockLaunchTitle: "AI 스타 초안 반영됨",
      mockMembershipBody:
        "이 브라우저에서 저장된 파운더 참여 내역입니다. 실제 결제/DB 반영 전까지 v2.0 흐름을 미리 확인합니다.",
      mockMembershipCta: "유니버스 보기",
      mockMembershipTitle: "파운더 참여 미리보기 반영됨",
      myAiEntry: {
        body:
          "하단 내 AI에서 들어온 운영 화면입니다. TikTok, 콘텐츠, 활동 기록 상태를 먼저 확인하세요.",
        pill: "내 AI 진입",
        title: "운영 AI 스타 관리",
      },
      referralCode: "추천 코드",
      relationLinks: {
        creator: "운영 AI 스타 보기",
        founder: "참여 네트워크 보기",
      },
      shareLink: "공유 링크",
      shareSectionBody:
        "AI 스타별 추천 링크를 공유하면 새 파운더 참여가 해당 AI 스타 유니버스에 기록됩니다.",
      shareSectionEyebrow: "추천 관리",
      shareSectionTitle: "AI 스타별 추천 링크",
      terminologyPill: "AI 스타 유니버스 / 파운더 네트워크",
      universeCta: "AI 스타 유니버스 보기",
      metrics: {
        cp: "기여 포인트",
        creatorStars: "운영 AI 스타",
        eligibility: "크리에이터 진행률",
        founderNetworks: "참여 네트워크",
        invites: "성공 초대",
        scout: "초대 점수",
      },
      signpost: {
        currentLabel: "현재 관계",
        currentValue: (creatorCount: number, founderCount: number) =>
          `운영 ${formatNumber(creatorCount, locale)}개 · 참여 ${formatNumber(founderCount, locale)}개`,
        eventLabel: "활동 기록",
        eventValue: (hasRoles: boolean, view: FounderClubView) =>
          view === "creator"
            ? "크리에이터 권한 평가"
            : hasRoles
              ? "추천 공유 기록"
              : "파운더 참여 기록",
        nextLabel: "다음 행동",
        nextValue: (hasRoles: boolean, view: FounderClubView) =>
          view === "creator"
            ? "운영 AI 스타 확인"
            : hasRoles
              ? "추천 링크 공유"
              : "AI 스타 선택",
        primaryCta: (hasRoles: boolean, view: FounderClubView) =>
          view === "creator"
            ? "운영 AI 스타 보기"
            : hasRoles
              ? "추천 링크 공유하기"
              : "참여할 AI 스타 선택",
        secondaryCta: "크리에이터 여정 보기",
      },
      viewTabs: {
        creator: "운영 관계",
        creatorHint: "운영 AI 스타",
        founder: "참여 관계",
        founderHint: "참여 네트워크",
        label: "관계 보기",
      },
    };
  }

  return {
    back: "FanLetter Home",
    creatorUnlock: "Creator Permission",
    emptyShare:
      "This AI Star referral link is created after Founder status is confirmed.",
    heroBody:
      "Separate the AI Stars you operate from the Founder Networks you participate in, then choose the next action.",
    heroEyebrow: "Founder Club",
    heroTitle: "My FanLetter Portfolio",
    liveLabel: "Live data",
    mockLabel: "Mock data",
    mockLaunchBody:
      "Mock AI Star drafts created from Creator Unlock are reflected in this browser portfolio.",
    mockLaunchTitle: "Mock AI Star drafts reflected",
    mockMembershipBody:
        "Founder joins saved in this browser are reflected here while the v2.0 flow remains mock-only before real payment and DB writes.",
      mockMembershipCta: "View Universe",
      mockMembershipTitle: "Mock Founder join reflected",
      myAiEntry: {
        body:
          "You entered from My AI. Review TikTok, content, and activity record status first.",
        pill: "My AI entry",
        title: "Manage operated AI Stars",
      },
      referralCode: "Referral Code",
      relationLinks: {
        creator: "View operated AI Stars",
        founder: "View joined networks",
      },
      shareLink: "Share Link",
    shareSectionBody:
      "Each AI Star referral link records new Founder participation inside that AI Star Universe.",
    shareSectionEyebrow: "Referral Manager",
    shareSectionTitle: "AI Star Referral Links",
    terminologyPill: "AI Star Universe / Founder Network",
    universeCta: "View AI Star Universe",
    metrics: {
      cp: "Contribution Points",
      creatorStars: "Creator AI Stars",
      eligibility: "Creator Progress",
      founderNetworks: "Founder Networks",
      invites: "Successful Invites",
      scout: "Invite Score",
    },
    signpost: {
      currentLabel: "Current relationships",
      currentValue: (creatorCount: number, founderCount: number) =>
        `${formatNumber(creatorCount, locale)} operated · ${formatNumber(founderCount, locale)} joined`,
      eventLabel: "Activity record",
      eventValue: (hasRoles: boolean, view: FounderClubView) =>
        view === "creator"
          ? "Creator unlock review"
          : hasRoles
            ? "Referral shared"
            : "Founder joined",
      nextLabel: "Next action",
      nextValue: (hasRoles: boolean, view: FounderClubView) =>
        view === "creator"
          ? "Review operated AI Stars"
          : hasRoles
            ? "Share referral link"
            : "Choose AI Star",
      primaryCta: (hasRoles: boolean, view: FounderClubView) =>
        view === "creator"
          ? "View operated AI Stars"
          : hasRoles
            ? "Share referral link"
            : "Choose AI Star to join",
      secondaryCta: "View Creator Journey",
    },
    viewTabs: {
      creator: "Creator relationship",
      creatorHint: "Operated AI Stars",
      founder: "Founder relationship",
      founderHint: "Joined networks",
      label: "Relationship view",
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
  const referralCode = loop?.referralCode ?? null;
  const trackReferralShare = ({
    platform,
    targetHref,
  }: {
    platform: string;
    targetHref: string;
  }) => {
    trackFunnelEvent("share_click", {
      agentRank: {
        eventType: "referral_shared",
        intent: "founder_referral_shared",
        source: "fanletter_star_detail",
        starId: roleShare.role.starId,
      },
      metadata: {
        platform,
        source: "founder_club_role_share",
        sourceStarId: roleShare.role.starId,
        starId: roleShare.role.starId,
      },
      referralCode,
      targetHref,
    });
  };

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
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <CopyTextButton
                className="h-10 border-black/10 text-sm font-semibold"
                copiedLabel={isKorean(locale) ? "복사됨" : "Copied"}
                copyLabel={isKorean(locale) ? "링크 복사" : "Copy link"}
                onCopied={() => {
                  trackReferralShare({
                    platform: "copy",
                    targetHref: loop.shareLink,
                  });
                }}
                text={loop.shareLink}
              />
              {platformLinks.map((platformLink) => (
                <a
                  className="inline-flex h-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-[#5b21b6] transition hover:border-violet-300 hover:bg-violet-100"
                  href={platformLink.href}
                  key={platformLink.label}
                  onClick={() => {
                    trackReferralShare({
                      platform: platformLink.label,
                      targetHref: platformLink.href,
                    });
                  }}
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
                  {locale === "ko"
                    ? "기여 포인트 +100 · 영향력 +5 · 크리에이터 +2%"
                    : "Contribution Points +100 · Influence +5 · Creator +2%"}
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
  entryContext = "default",
  initialView = "founder",
  locale,
  portfolio: livePortfolio,
  roleShares: liveRoleShares,
  stars = fanletterV2Mock.aiStars,
}: {
  entryContext?: FounderClubEntryContext;
  initialView?: FounderClubView;
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
      label: copy.metrics.creatorStars,
      value: portfolio.ownedStars.length,
    },
    {
      label: copy.metrics.founderNetworks,
      value: portfolio.roles.length,
    },
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
  const hasFounderRoles = roleShares.length > 0;
  const activeView: FounderClubView =
    initialView === "creator" ? "creator" : "founder";
  const isMyAiEntry = entryContext === "my-ai" || activeView === "creator";
  const primaryActionHref = activeView === "creator"
    ? "#owned-ai-stars"
    : hasFounderRoles
    ? "#referral-manager"
    : `/${locale}/fanletter/discovery`;
  const creatorJourneyHref = `/${locale}/fanletter/creator-unlock`;
  const creatorViewHref = `/${locale}/fanletter/founder-club?view=creator&context=my-ai#owned-ai-stars`;
  const founderViewHref = `/${locale}/fanletter/founder-club?view=founder#joined-founder-networks`;
  const viewTabs = [
    {
      active: activeView === "creator",
      count: portfolio.ownedStars.length,
      href: creatorViewHref,
      label: copy.viewTabs.creator,
      sublabel: copy.viewTabs.creatorHint,
    },
    {
      active: activeView === "founder",
      count: portfolio.roles.length,
      href: founderViewHref,
      label: copy.viewTabs.founder,
      sublabel: copy.viewTabs.founderHint,
    },
  ];

  return (
    <main className="fanletter-v2-surface min-h-screen bg-[#f7f7f4] px-4 py-5 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <FanletterPrimaryHeader locale={locale} referralCode={null} />

        <section className="mt-6 rounded-lg border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <HumanMemberAvatar
                  member={{ initials: memberInitials, name: portfolio.memberName }}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black/52">
                    {isMyAiEntry ? copy.myAiEntry.pill : copy.heroEyebrow}
                  </p>
                  <h1 className="text-[2.35rem] font-semibold leading-none tracking-normal text-black [word-break:keep-all] sm:text-[4rem]">
                    {isMyAiEntry ? copy.myAiEntry.title : copy.heroTitle}
                  </h1>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/58">
                {isMyAiEntry ? copy.myAiEntry.body : copy.heroBody}
              </p>
              <div className="mt-5 rounded-lg border border-black/10 bg-[#f7f7f4] p-2">
                <p className="px-2 pb-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-black/36">
                  {copy.viewTabs.label}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {viewTabs.map((tab) => (
                    <Link
                      aria-current={tab.active ? "page" : undefined}
                      className={[
                        "flex min-h-14 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition",
                        tab.active
                          ? "border-black bg-black !text-white"
                          : "border-black/8 bg-white !text-black hover:border-black/20",
                      ].join(" ")}
                      href={tab.href}
                      key={tab.href}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {tab.label}
                        </span>
                        <span
                          className={[
                            "mt-1 block truncate text-xs font-semibold",
                            tab.active ? "text-white/56" : "text-black/44",
                          ].join(" ")}
                        >
                          {tab.sublabel}
                        </span>
                      </span>
                      <span
                        className={[
                          "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm font-semibold",
                          tab.active
                            ? "bg-white text-black"
                            : "bg-[#f7f7f4] text-black/64",
                        ].join(" ")}
                      >
                        {formatNumber(tab.count, locale)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-2 rounded-lg border border-black/10 bg-[#f7f7f4] p-2 sm:grid-cols-3">
                <div className="rounded-md bg-white px-3 py-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-black/36">
                    {copy.signpost.currentLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-black">
                    {copy.signpost.currentValue(
                      portfolio.ownedStars.length,
                      portfolio.roles.length,
                    )}
                  </p>
                </div>
                <div className="rounded-md bg-white px-3 py-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-black/36">
                    {copy.signpost.nextLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-black">
                    {copy.signpost.nextValue(hasFounderRoles, activeView)}
                  </p>
                </div>
                <div className="rounded-md bg-black px-3 py-3 text-white">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/42">
                    {copy.signpost.eventLabel}
                  </p>
                  <p className="mt-1 truncate font-mono text-sm font-semibold">
                    {copy.signpost.eventValue(hasFounderRoles, activeView)}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-black px-5 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800"
                  href={primaryActionHref}
                >
                  {copy.signpost.primaryCta(hasFounderRoles, activeView)}
                  <ArrowRight className="size-4 shrink-0" />
                </a>
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-semibold !text-black/58 transition hover:!text-black sm:hidden"
                  href={creatorJourneyHref}
                >
                  <Sparkles className="size-4" />
                  {copy.signpost.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metricItems.map((metric) => (
                <div
                  className="rounded-lg border border-black/8 bg-[#f7f7f4] p-3"
                  key={metric.label}
                >
                  <p className="text-2xl font-semibold text-black">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-[0.64rem] font-semibold uppercase text-black/48">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/10 pt-4">
            <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/54">
              {portfolio.isLiveData ? copy.liveLabel : copy.mockLabel}
            </span>
            <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/54">
              {copy.terminologyPill}
            </span>
            {isMyAiEntry ? (
              <span className="inline-flex rounded-full border border-black bg-black px-3 py-1 text-xs font-semibold text-white">
                {copy.myAiEntry.pill}
              </span>
            ) : null}
          </div>
        </section>

        <MockFounderMembershipSummary
          locale={locale}
          memberships={mockMemberships}
          stars={stars}
        />
        <MockCreatorLaunchSummary launches={mockOwnedStars} locale={locale} />

        <section
          className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]"
          id="referral-manager"
        >
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
