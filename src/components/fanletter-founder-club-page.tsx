import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Link2,
  Sparkles,
} from "lucide-react";

import { CopyTextButton } from "@/components/copy-text-button";
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
  type MemberPortfolio as MemberPortfolioData,
  type MemberPortfolioRole,
  type ScoutShareLoopData,
} from "@/mock/fanletterV2";

type FounderClubRoleShare = {
  loop: ScoutShareLoopData | null;
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
  const loop = roleShare.loop ?? buildFallbackShareLoop(roleShare.role);
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
        <FounderRoleBadge copy={v2Copy} role={roleShare.role.role} />
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
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
        href={universeHref}
      >
        {copy.universeCta}
        <ArrowRight className="size-4" />
      </Link>
    </article>
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
  const portfolio: MemberPortfolioData =
    livePortfolio ?? fanletterV2Mock.memberPortfolio;
  const memberInitials =
    portfolio.memberInitials ??
    portfolio.memberName
      .replace(/[^a-zA-Z0-9가-힣\s]/g, " ")
      .trim()
      .slice(0, 2)
      .toUpperCase();
  const roleShares =
    liveRoleShares && liveRoleShares.length > 0
      ? liveRoleShares
      : portfolio.roles.map((role) => ({
          loop: null,
          role,
        }));
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
    <main className="min-h-screen bg-[#fbfaff] px-4 py-5 text-black sm:px-6 lg:px-8">
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
