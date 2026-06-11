import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Copy,
  Crown,
  Megaphone,
  Rocket,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type AIStar,
  type AIStarStatus,
  type CreatorUnlockData,
  type FanletterV2Copy,
  type FounderRole,
  type HumanFounderSlot,
  type MemberPortfolio as MemberPortfolioData,
  type ScoutShareLoopData,
  type SpawnedAIStar,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function getPortfolioInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

function getRoleTone(role: FounderRole) {
  if (role === "creator") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (role === "mentor") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (role === "partner") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (role === "founder") {
    return "border-zinc-300 bg-zinc-100 text-zinc-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function isKoreanCopy(copy: FanletterV2Copy) {
  return copy.labels.humanMember === "일반 멤버";
}

function formatCopyTemplate(
  template: string,
  values: Record<string, string>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function getDisplayMemberName(name: string, copy: FanletterV2Copy) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const normalized = name.trim();
  const replacements: Record<string, string> = {
    "Member A": "회원 A",
    "Member B": "회원 B",
    "New member": "신규 회원",
  };

  return replacements[normalized] ?? normalized;
}

function getDisplayUniverseName(name: string, copy: FanletterV2Copy) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    "Harin Universe": "하린 유니버스",
    "Minseo Universe": "민서 유니버스",
    "Seoyeon Universe": "서연 유니버스",
    "Yoonseo Universe": "윤서 유니버스",
  };

  return replacements[name] ?? name.replace(/\bUniverse\b/g, "유니버스");
}

function getDisplayStarStatus(
  status: AIStarStatus | null | undefined,
  copy: FanletterV2Copy,
) {
  if (!status) {
    return null;
  }

  if (isKoreanCopy(copy)) {
    const replacements: Record<AIStarStatus, string> = {
      active: "활성",
      archived: "보관",
      draft: "준비 중",
    };

    return replacements[status];
  }

  return status;
}

export function StarScoreBadge({
  copy,
  score,
}: {
  copy: FanletterV2Copy;
  score: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/14 px-3 py-1 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur">
      <Sparkles className="size-3.5 text-fuchsia-100" />
      {copy.labels.starScore} {score}
    </span>
  );
}

export function FounderRoleBadge({
  copy,
  role,
}: {
  copy: FanletterV2Copy;
  role: FounderRole;
}) {
  return (
    <span
      className={joinClasses(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-[0.68rem] font-semibold",
        getRoleTone(role),
      )}
    >
      {copy.roles[role]}
    </span>
  );
}

export function HumanMemberAvatar({
  member,
  size = "md",
}: {
  member: Pick<HumanFounderSlot, "initials" | "name">;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-label={member.name}
      className={joinClasses(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 font-semibold text-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        size === "sm" && "size-8 text-[0.68rem]",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-14 text-base",
      )}
      title={member.name}
    >
      {member.initials}
    </span>
  );
}

function AIStarPortrait({
  badgeLabel,
  star,
}: {
  badgeLabel: string;
  star: Pick<
    AIStar,
    | "accentColor"
    | "accentSecondary"
    | "name"
    | "portraitImageUrl"
    | "portraitInitials"
  >;
}) {
  return (
    <div
      aria-label={`${star.name} portrait`}
      className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_18px_34px_rgba(88,28,135,0.22)] sm:aspect-square"
      role="img"
      style={{
        background: `radial-gradient(circle at 30% 18%, rgba(255,255,255,0.9), transparent 18%), radial-gradient(circle at 70% 22%, ${star.accentSecondary}, transparent 22%), linear-gradient(145deg, ${star.accentColor}, #31105f 68%, #12041f)`,
      }}
    >
      {star.portraitImageUrl ? (
        <>
          <Image
            alt={`${star.name} portrait`}
            className="object-cover"
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 42vw, 92vw"
            src={star.portraitImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              star.portraitImageUrl,
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12041f]/76 via-transparent to-white/10" />
        </>
      ) : (
        <>
          <div className="absolute inset-x-4 bottom-4 top-10 rounded-t-full bg-white/18 backdrop-blur-[2px]" />
          <div className="absolute bottom-5 left-1/2 flex size-20 -translate-x-1/2 items-center justify-center rounded-full border border-white/28 bg-black/28 text-2xl font-semibold text-white shadow-[0_16px_34px_rgba(0,0,0,0.22)]">
            {star.portraitInitials}
          </div>
        </>
      )}
      <div className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[0.62rem] font-semibold text-white backdrop-blur">
        {badgeLabel}
      </div>
    </div>
  );
}

export function AIStarCard({
  copy,
  detailHref,
  isSelected = false,
  locale,
  star,
}: {
  copy: FanletterV2Copy;
  detailHref?: string;
  isSelected?: boolean;
  locale: Locale;
  star: AIStar;
}) {
  return (
    <article
      className={joinClasses(
        "group flex h-full min-w-[82vw] max-w-[22rem] snap-start flex-col overflow-hidden rounded-lg border bg-[#1a082f] p-3 text-white shadow-[0_24px_70px_rgba(88,28,135,0.24)] ring-1 transition hover:-translate-y-0.5 hover:border-fuchsia-200 md:min-w-0 md:max-w-none",
        isSelected
          ? "border-cyan-200 ring-cyan-200/70"
          : "border-fuchsia-300/50 ring-fuchsia-400/22",
      )}
      style={{
        background: `linear-gradient(160deg, ${star.accentColor} 0%, #301052 34%, #12041f 100%)`,
      }}
    >
      <AIStarPortrait badgeLabel={copy.labels.aiStarBadge} star={star} />
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-[#4c1d95]">
            {copy.labels.aiStarBadge}
          </span>
          {isSelected ? (
            <span className="rounded-full border border-cyan-100/70 bg-cyan-100 px-3 py-1 text-[0.68rem] font-semibold text-cyan-950">
              {copy.labels.selectedAiStar}
            </span>
          ) : null}
          <StarScoreBadge copy={copy} score={star.starScore} />
        </div>
        <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-normal">
          {star.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-white/70">
          {getFanletterV2LocalizedText(star.specialty, locale)}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/14 bg-white/10 p-2">
            <p className="text-xl font-semibold leading-none">
              +{star.growthPercent}%
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.growth}
            </p>
          </div>
          <div className="rounded-lg border border-white/14 bg-white/10 p-2">
            <p className="text-xl font-semibold leading-none">
              {star.founderCount}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.founderCount}
            </p>
          </div>
          <div className="rounded-lg border border-white/14 bg-white/10 p-2">
            <p className="text-xl font-semibold leading-none">
              {star.openSlots.open}/{star.openSlots.total}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.openSlots}
            </p>
          </div>
        </div>
        {detailHref ? (
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#4c1d95] transition hover:bg-fuchsia-50"
            href={detailHref}
          >
            {copy.actions.viewUniverse}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function TopGrowingStars({
  copy,
  locale,
  selectedStarId,
  stars,
}: {
  copy: FanletterV2Copy;
  locale: Locale;
  selectedStarId?: string | null;
  stars: AIStar[];
}) {
  return (
    <section aria-labelledby="top-growing-ai-stars" className="mt-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.aiStarDiscovery}
          </p>
          <h2
            className="mt-2 text-[2.1rem] font-semibold leading-tight tracking-normal text-[#12041f] [word-break:keep-all] sm:text-[3.2rem]"
            id="top-growing-ai-stars"
          >
            {copy.topGrowingStars.title}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-black/62 sm:text-base">
            {copy.topGrowingStars.body}
          </p>
        </div>
      </div>

      <div className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4">
        {stars.map((star) => (
          <AIStarCard
            copy={copy}
            detailHref={`/${locale}/fanletter/${star.id}`}
            isSelected={star.id === selectedStarId}
            key={star.id}
            locale={locale}
            star={star}
          />
        ))}
      </div>
    </section>
  );
}

export function GrowthLoopDiagram({
  copy,
}: {
  copy: FanletterV2Copy;
}) {
  return (
    <section className="mt-12 rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <Trophy className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.founderClub}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.growthLoop.title}
          </h2>
        </div>
      </div>

      <div className="-mx-4 mt-6 flex snap-x gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-8">
        {copy.growthLoop.steps.map((step, index) => (
          <div
            className="relative min-h-28 min-w-[10.25rem] snap-start rounded-lg border border-violet-100 bg-[#fbfaff] p-3 md:min-w-0"
            key={step}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#ede9fe] text-xs font-semibold text-[#6d28d9]">
                {String(index + 1).padStart(2, "0")}
              </span>
              {index < copy.growthLoop.steps.length - 1 ? (
                <ArrowRight className="size-4 text-[#7c3aed]" />
              ) : (
                <Rocket className="size-4 text-[#7c3aed]" />
              )}
            </div>
            <p className="mt-4 text-sm font-semibold leading-5 text-[#26113d]">
              {step}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ScoutShareLoop({
  copy,
  loop: liveLoop,
}: {
  copy: FanletterV2Copy;
  loop?: ScoutShareLoopData | null;
}) {
  const loop: ScoutShareLoopData = liveLoop ?? fanletterV2Mock.scoutShareLoop;
  const displaySourceMember = getDisplayMemberName(loop.sourceMember, copy);
  const displayTargetMember = getDisplayMemberName(loop.targetMember, copy);
  const displayUniverse = getDisplayUniverseName(loop.selectedUniverse, copy);
  const selectUniverseText = loop.isLiveData
    ? formatCopyTemplate(copy.scoutShareLoop.selectUniverseTemplate, {
        universe: displayUniverse,
      })
    : copy.scoutShareLoop.selectUniverse;
  const memberJoinsText = formatCopyTemplate(copy.scoutShareLoop.memberJoinsTemplate, {
    member: displayTargetMember,
  });
  const founderJoinText = loop.isLiveData
    ? formatCopyTemplate(copy.scoutShareLoop.memberBecomesFounderTemplate, {
        member: displayTargetMember,
        universe: displayUniverse,
      })
    : copy.scoutShareLoop.memberBBecomesFounder;
  const flowItems = [
    displaySourceMember,
    selectUniverseText,
    `${copy.labels.referralCode}: ${loop.referralCode}`,
    copy.scoutShareLoop.shareToSns,
    memberJoinsText,
    founderJoinText,
  ];
  const platformLinksByName = new Map(
    (loop.sharePlatformLinks ?? []).map((item) => [item.platform, item]),
  );

  return (
    <article
      className="min-w-0 scroll-mt-24 rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5"
      id="scout-share-loop"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <Share2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.scoutShareLoop}
          </p>
          {loop.isLiveData ? (
            <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.64rem] font-semibold text-emerald-800">
              {copy.scoutShareLoop.liveDataLabel}
            </span>
          ) : null}
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.scoutShareLoop.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.scoutShareLoop.body}
          </p>
        </div>
      </div>

      <div className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0">
        {flowItems.map((item, index) => (
          <div
            className="flex min-w-[13.5rem] snap-start flex-col gap-3 rounded-lg border border-black/8 bg-[#f8f7ff] p-3 md:min-w-0 md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0"
            key={`${item}-${index}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-xs font-semibold text-[#6d28d9]">
              {index + 1}
            </span>
            <div className="flex-1 text-sm font-semibold leading-5 text-[#26113d] md:min-h-11 md:rounded-lg md:border md:border-black/8 md:bg-[#f8f7ff] md:px-3 md:py-2">
              {item}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-black/8 bg-[#f6f8f4] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-black/48">
          <Copy className="size-4" />
          {copy.labels.referralCode}
        </div>
        <p className="mt-2 font-mono text-sm font-semibold text-black">
          {loop.referralCode}
        </p>
        <p className="mt-3 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs font-semibold text-[#5b21b6] sm:break-all sm:whitespace-normal">
          {loop.shareLink}
        </p>
        <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {loop.sharePlatforms.map((platform) => {
            const platformLink = platformLinksByName.get(platform);

            if (platformLink) {
              return (
                <a
                  className="shrink-0 rounded-full border border-black/8 bg-white px-3 py-1 text-xs font-semibold text-black/68 transition hover:border-[#7c3aed]/40 hover:text-[#5b21b6]"
                  href={platformLink.href}
                  key={platform}
                  rel="noreferrer"
                  target="_blank"
                >
                  {platformLink.label}
                </a>
              );
            }

            return (
              <span
                className="shrink-0 rounded-full border border-black/8 bg-white px-3 py-1 text-xs font-semibold text-black/68"
                key={platform}
              >
                {platform}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-[#12041f] p-4 text-white">
        <p className="text-sm font-semibold text-fuchsia-100">
          {copy.scoutShareLoop.rewardsTitle}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">+{loop.rewards.cp}</p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              CP
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">
              +{loop.rewards.influenceScore}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.influenceScore}
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">
              +{loop.rewards.creatorProgressPercent}%
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.creatorProgress}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function MemberPortfolio({
  copy,
  locale,
  portfolio: livePortfolio,
  stars = fanletterV2Mock.aiStars,
}: {
  copy: FanletterV2Copy;
  locale: Locale;
  portfolio?: MemberPortfolioData | null;
  stars?: AIStar[];
}) {
  const portfolio: MemberPortfolioData =
    livePortfolio ?? fanletterV2Mock.memberPortfolio;
  const starsById = new Map(
    [...stars, ...fanletterV2Mock.aiStars].map((star) => [star.id, star]),
  );
  const memberInitials =
    portfolio.memberInitials ?? getPortfolioInitials(portfolio.memberName);
  const ownedStars = portfolio.ownedStars ?? [];
  const isDraftPrimaryStar = portfolio.primaryStarStatus === "draft";
  const portfolioCta =
    portfolio.isLiveData && portfolio.primaryStarId
      ? {
          body: isDraftPrimaryStar
            ? copy.memberPortfolio.draftHint
            : copy.memberPortfolio.activeHint,
          href: isDraftPrimaryStar
            ? `/${locale}/fanletter/profile/character`
            : `/${locale}/fanletter/studio`,
          label: isDraftPrimaryStar
            ? copy.memberPortfolio.setupStarCta
            : copy.memberPortfolio.manageStarCta,
        }
      : null;
  const metrics = [
    {
      label: copy.labels.scoutScore,
      value: portfolio.scoutScore,
    },
    {
      label: copy.labels.directInvites,
      value: portfolio.directInvites,
    },
    {
      label: copy.labels.successfulInvites,
      value: portfolio.successfulInvites,
    },
    {
      label: copy.labels.cpBalance,
      value: formatNumber(portfolio.cpBalance, locale),
    },
    {
      label: copy.labels.creatorEligibility,
      value: `${portfolio.creatorEligibilityPercent}%`,
    },
  ];

  return (
    <article className="min-w-0 rounded-lg border border-black/10 bg-[#f6f8f4] p-4 shadow-[0_18px_44px_rgba(8,18,12,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <HumanMemberAvatar
          member={{ initials: memberInitials, name: portfolio.memberName }}
          size="lg"
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-black/50">
              {copy.labels.memberPortfolio}
            </p>
            {portfolio.isLiveData ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.64rem] font-semibold text-emerald-800">
                {copy.memberPortfolio.liveDataLabel}
              </span>
            ) : null}
          </div>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-black">
            {copy.memberPortfolio.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.memberPortfolio.body}
          </p>
        </div>
      </div>

      <div className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0">
        {metrics.map((metric) => (
          <div
            className="min-w-[8.5rem] snap-start rounded-lg border border-black/8 bg-white p-3 sm:min-w-0"
            key={metric.label}
          >
            <p className="text-xl font-semibold leading-none text-black">
              {metric.value}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-black/48">
              {metric.label}
            </p>
          </div>
        ))}
      </div>

      <div className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0">
        {portfolio.roles.length > 0 ? (
          portfolio.roles.map((item) => {
            const star = starsById.get(item.starId);
            const starName = item.starName ?? star?.name ?? item.starId;
            const universeName =
              item.universeName ??
              star?.universeName ??
              `${item.starId} Universe`;
            const displayUniverseName = getDisplayUniverseName(universeName, copy);
            const displayStatus = getDisplayStarStatus(item.starStatus, copy);

            return (
              <div
                className="flex min-h-14 min-w-[14rem] snap-start items-center justify-between gap-3 rounded-lg border border-black/8 bg-white px-3 py-2 sm:min-w-0"
                key={item.starId}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-black">
                    {starName}
                  </p>
                  <p className="truncate text-xs font-medium text-black/48">
                    {displayUniverseName}
                    {displayStatus ? ` · ${displayStatus}` : ""}
                  </p>
                </div>
                <FounderRoleBadge copy={copy} role={item.role} />
              </div>
            );
          })
        ) : (
          <div className="min-w-full rounded-lg border border-dashed border-black/12 bg-white px-3 py-4 text-sm font-semibold text-black/48">
            {copy.memberPortfolio.emptyRoles}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-black/8 bg-white p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6d28d9]">
              {copy.labels.ownedAiStars}
            </p>
            <h3 className="mt-1 text-base font-semibold text-black">
              {copy.memberPortfolio.ownedStarsTitle}
            </h3>
          </div>
          <p className="text-xs font-medium leading-5 text-black/54 sm:max-w-sm sm:text-right">
            {copy.memberPortfolio.ownedStarsBody}
          </p>
        </div>

        <div className="-mx-3 mt-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
          {ownedStars.length > 0 ? (
            ownedStars.map((ownedStar) => {
              const star = starsById.get(ownedStar.id);
              const accentColor = star?.accentColor ?? "#7c3aed";
              const accentSecondary = star?.accentSecondary ?? "#22d3ee";
              const initials =
                star?.portraitInitials ?? getPortfolioInitials(ownedStar.name);
              const displayUniverse = getDisplayUniverseName(
                ownedStar.universeName ?? `${ownedStar.name} Universe`,
                copy,
              );
              const displaySourceUniverse = ownedStar.sourceUniverseName
                ? getDisplayUniverseName(ownedStar.sourceUniverseName, copy)
                : null;
              const displayStatus = getDisplayStarStatus(
                ownedStar.status,
                copy,
              );

              return (
                <div
                  className="min-w-[16rem] snap-start rounded-lg border border-fuchsia-200/70 p-3 text-white shadow-[0_16px_34px_rgba(88,28,135,0.14)] sm:min-w-0"
                  key={ownedStar.id}
                  style={{
                    background: `linear-gradient(145deg, ${accentColor}, #21103d 72%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-white/18 text-sm font-semibold"
                        style={{
                          background: `linear-gradient(145deg, ${accentSecondary}, rgba(255,255,255,0.16))`,
                        }}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.66rem] font-semibold text-fuchsia-100">
                          {copy.labels.aiStarBadge}
                        </p>
                        <p className="truncate text-lg font-semibold">
                          {ownedStar.name}
                        </p>
                        <p className="truncate text-xs font-medium text-white/60">
                          {displayUniverse}
                        </p>
                      </div>
                    </div>
                    {displayStatus ? (
                      <span className="shrink-0 rounded-full bg-white/14 px-2 py-1 text-[0.62rem] font-semibold text-white/82">
                        {displayStatus}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-xs font-semibold text-white/72">
                    {displaySourceUniverse ? (
                      <p className="truncate">
                        {copy.labels.sourceUniverse}: {displaySourceUniverse}
                      </p>
                    ) : null}
                    {ownedStar.createdByUnlock ? (
                      <p className="truncate">
                        {copy.labels.createdByUnlock}
                        {ownedStar.launchCostUsdt
                          ? ` · ${ownedStar.launchCostUsdt} USDT`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="min-w-full rounded-lg border border-dashed border-black/12 bg-zinc-50 px-3 py-4 text-sm font-semibold text-black/48 sm:col-span-2">
              {copy.memberPortfolio.emptyOwnedStars}
            </div>
          )}
        </div>
      </div>

      {portfolioCta ? (
        <div className="mt-5 rounded-lg border border-black/8 bg-white p-3">
          <p className="text-sm font-semibold text-black">
            {portfolio.primaryStarName ?? portfolio.memberName}
          </p>
          <p className="mt-1 text-sm font-medium leading-5 text-black/58">
            {portfolioCta.body}
          </p>
          <Link
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            href={portfolioCta.href}
          >
            {portfolioCta.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function CreatorUnlockCard({
  copy,
  locale,
  unlock: liveUnlock,
}: {
  copy: FanletterV2Copy;
  locale: Locale;
  unlock?: CreatorUnlockData | null;
}) {
  const unlock: CreatorUnlockData =
    liveUnlock ?? fanletterV2Mock.creatorUnlock;
  const labelsById: Record<string, string> = {
    activityMission: copy.creatorUnlock.activityMission,
    cp: copy.creatorUnlock.cp,
    directInvites: copy.creatorUnlock.directInvites,
    scoutScore: copy.creatorUnlock.scoutScore,
  };
  const launchPreview = unlock.launchPreview;
  const launchHref = `/${locale}/fanletter/profile/character?mode=founder-club-launch`;

  return (
    <article
      className="min-w-0 scroll-mt-24 rounded-lg border border-[#7c3aed]/30 bg-[#12041f] p-4 text-white shadow-[0_24px_70px_rgba(88,28,135,0.22)] sm:p-5"
      id="creator-unlock"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-[#5b21b6]">
          <Crown className="size-6" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-fuchsia-100">
              {copy.creatorUnlock.unlockedLabel}
            </p>
            {unlock.isLiveData ? (
              <span className="rounded-full border border-fuchsia-200/30 bg-white/10 px-2.5 py-1 text-[0.64rem] font-semibold text-fuchsia-50">
                {copy.creatorUnlock.liveDataLabel}
              </span>
            ) : null}
          </div>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal">
            {copy.creatorUnlock.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-white/64">
            {copy.creatorUnlock.body}
          </p>
        </div>
      </div>

      <div className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0">
        {unlock.conditions.map((condition) => (
          <div
            className="flex min-w-[14rem] snap-start items-center gap-3 rounded-lg border border-white/12 bg-white/8 p-3 sm:min-w-0"
            key={condition.id}
          >
            <CheckCircle2
              className={joinClasses(
                "size-5 shrink-0",
                condition.met ? "text-[#44f26e]" : "text-white/36",
              )}
            />
            <span className="min-w-0 flex-1 text-sm font-semibold text-white">
              {labelsById[condition.id] ?? condition.id}
            </span>
            <span className="text-xs font-semibold text-white/54">
              {typeof condition.current === "number"
                ? formatNumber(condition.current, locale)
                : isKoreanCopy(copy) && condition.current === "completed"
                  ? "완료"
                : condition.current}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-white p-4 text-black">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#5b21b6]">
              {unlock.unlocked
                ? copy.creatorUnlock.unlockedLabel
                : copy.creatorUnlock.lockedLabel}
            </p>
            <p className="mt-1 text-sm font-medium leading-5 text-black/62">
              {copy.creatorUnlock.mockPaymentNotice}
            </p>
          </div>
          <span className="inline-flex h-10 shrink-0 items-center rounded-full bg-black px-4 text-sm font-semibold text-white">
            {unlock.createCostUsdt} USDT
          </span>
        </div>

        {launchPreview ? (
          <div className="mt-4 rounded-lg border border-violet-100 bg-[#f8f7ff] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#5b21b6]">
                    {copy.creatorUnlock.launchPreviewTitle}
                  </p>
                  <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[0.64rem] font-semibold text-[#5b21b6]">
                    {launchPreview.status === "mock_ready"
                      ? copy.creatorUnlock.mockReadyLabel
                      : copy.creatorUnlock.lockedLabel}
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold leading-tight text-black">
                  {launchPreview.newStarName}
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-black/58">
                  {copy.labels.sourceUniverse}:{" "}
                  {getDisplayUniverseName(
                    launchPreview.sourceUniverseName,
                    copy,
                  )}
                </p>
                <p className="mt-2 text-sm font-medium leading-5 text-black/58">
                  {copy.creatorUnlock.launchPreviewBody}
                </p>
              </div>

              {unlock.unlocked ? (
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  href={launchHref}
                >
                  {copy.creatorUnlock.createAiStarCta}
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 px-4 text-sm font-semibold text-zinc-500">
                  {copy.creatorUnlock.lockedLabel}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SpawnedStarCard({
  copy,
  locale,
  star,
}: {
  copy: FanletterV2Copy;
  locale: Locale;
  star: SpawnedAIStar;
}) {
  const displaySourceUniverse = star.sourceUniverseName
    ? getDisplayUniverseName(star.sourceUniverseName, copy)
    : null;

  return (
    <div
      className="rounded-lg border border-fuchsia-200/70 p-3 text-white shadow-[0_16px_34px_rgba(88,28,135,0.16)]"
      style={{
        background: `linear-gradient(145deg, ${star.accentColor}, #21103d 72%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-11 items-center justify-center rounded-lg border border-white/18 text-sm font-semibold"
          style={{
            background: `linear-gradient(145deg, ${star.accentSecondary}, rgba(255,255,255,0.16))`,
          }}
        >
          {star.portraitInitials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{star.name}</p>
          <p className="truncate text-[0.68rem] font-medium text-white/60">
            {getFanletterV2LocalizedText(star.specialty, locale)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-white/70">
        <span>{copy.labels.aiStarBadge}</span>
        <span>
          {copy.labels.starScore} {star.starScore}
        </span>
      </div>
      {star.createdByUnlock || displaySourceUniverse ? (
        <div className="mt-3 rounded-lg border border-white/12 bg-white/8 p-2 text-[0.68rem] font-semibold leading-4 text-white/72">
          {displaySourceUniverse ? (
            <p className="truncate">
              {copy.labels.sourceUniverse}: {displaySourceUniverse}
            </p>
          ) : null}
          {star.createdByUnlock ? (
            <p className="truncate">
              {copy.labels.createdByUnlock}
              {star.createdByMemberName
                ? ` · ${getDisplayMemberName(star.createdByMemberName, copy)}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UniverseMiniStar({
  copy,
  star,
}: {
  copy: FanletterV2Copy;
  star: AIStar;
}) {
  return (
    <div
      className="rounded-lg border border-fuchsia-200 p-3 text-white shadow-[0_18px_40px_rgba(88,28,135,0.18)]"
      style={{
        background: `linear-gradient(150deg, ${star.accentColor}, #271045 68%, #12041f)`,
      }}
    >
      <div className="relative mx-auto flex size-16 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/14 text-lg font-semibold">
        {star.portraitImageUrl ? (
          <Image
            alt={`${star.name} portrait`}
            className="object-cover"
            fill
            sizes="4rem"
            src={star.portraitImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              star.portraitImageUrl,
            )}
          />
        ) : (
          star.portraitInitials
        )}
      </div>
      <p className="mt-3 text-center text-[0.66rem] font-semibold text-fuchsia-100">
        {copy.labels.aiStarBadge}
      </p>
      <p className="mt-1 text-center text-lg font-semibold leading-tight">
        {star.name}
      </p>
      <p className="mt-1 text-center text-xs font-medium text-white/60">
        {copy.labels.starScore} {star.starScore}
      </p>
    </div>
  );
}

function FounderSlot({
  copy,
  slot,
}: {
  copy: FanletterV2Copy;
  slot: HumanFounderSlot;
}) {
  return (
    <div className="flex min-h-16 items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2">
      <HumanMemberAvatar member={slot} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-zinc-800">
          {getDisplayMemberName(slot.name, copy)}
        </p>
        <FounderRoleBadge copy={copy} role={slot.role} />
      </div>
    </div>
  );
}

export function FounderUniversePreview({
  copy,
  locale,
  stars,
}: {
  copy: FanletterV2Copy;
  locale: Locale;
  stars: AIStar[];
}) {
  return (
    <section className="mt-12">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-[#6d28d9]">
          {copy.labels.founderClub}
        </p>
        <h2 className="mt-2 text-[2.1rem] font-semibold leading-tight tracking-normal text-[#12041f] [word-break:keep-all] sm:text-[3.2rem]">
          {copy.universePreview.title}
        </h2>
        <p className="mt-3 text-sm font-medium leading-6 text-black/62 sm:text-base">
          {copy.universePreview.body}
        </p>
      </div>

      <div className="-mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
        {stars.map((star) => (
          <article
            className="min-w-[86vw] max-w-[24rem] snap-start rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] lg:min-w-0 lg:max-w-none"
            key={star.id}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem_1fr] sm:items-center">
              <div className="grid gap-2">
                {star.founderSlots.slice(0, 2).map((slot) => (
                  <FounderSlot
                    copy={copy}
                    key={`${star.id}-${slot.name}`}
                    slot={slot}
                  />
                ))}
              </div>
              <UniverseMiniStar copy={copy} star={star} />
              <div className="grid gap-2">
                {star.founderSlots.slice(2, 4).map((slot) => (
                  <FounderSlot
                    copy={copy}
                    key={`${star.id}-${slot.name}`}
                    slot={slot}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-black/48">
                {copy.labels.spawnedStars}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {star.spawnedStars.map((spawnedStar) => (
                  <SpawnedStarCard
                    copy={copy}
                    key={spawnedStar.id}
                    locale={locale}
                    star={spawnedStar}
                  />
                ))}
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm font-semibold text-zinc-500">
                  {copy.universePreview.emptySlot}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CreatorPath({
  copy,
}: {
  copy: FanletterV2Copy;
}) {
  return (
    <article
      className="min-w-0 scroll-mt-24 rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.06)] sm:p-5"
      id="creator-path"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <Rocket className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-black/50">
            {copy.creatorPath.title}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-black">
            {copy.creatorPath.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.creatorPath.body}
          </p>
        </div>
      </div>
      <div className="-mx-4 mt-5 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0">
        {copy.creatorPath.steps.map((step, index) => (
          <div
            className="min-w-[15.5rem] snap-start rounded-lg border border-black/8 bg-[#f6f8f4] p-3 sm:min-w-0"
            key={step.title}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-black">
                  {step.title}
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-black/58">
                  {step.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function FounderClubV2HomeSections({
  creatorUnlock,
  locale,
  memberPortfolio,
  scoutShareLoop,
  selectedStarId,
  stars: liveStars,
}: {
  creatorUnlock?: CreatorUnlockData | null;
  locale: Locale;
  memberPortfolio?: MemberPortfolioData | null;
  scoutShareLoop?: ScoutShareLoopData | null;
  selectedStarId?: string | null;
  stars?: AIStar[] | null;
}) {
  const copy = getFanletterV2Copy(locale);
  const stars = [
    ...(liveStars && liveStars.length > 0
      ? liveStars
      : fanletterV2Mock.aiStars),
  ].sort(
    (left, right) =>
      right.growthPercent - left.growthPercent ||
      right.starScore - left.starScore,
  );

  return (
    <section
      className="border-b border-violet-200 bg-[#f8f7ff] px-4 py-10 text-black sm:px-6 sm:py-20 lg:px-8"
      id="founder-club"
    >
      <div className="mx-auto max-w-[92rem]">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#6d28d9]">
              <BadgeCheck className="size-4" />
              {copy.founderClub.eyebrow}
            </div>
            <h2 className="mt-5 max-w-4xl text-[2.45rem] font-semibold leading-[1.02] tracking-normal text-[#12041f] [word-break:keep-all] sm:text-[4rem]">
              {copy.founderClub.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/62 sm:text-lg">
              {copy.founderClub.body}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-violet-200 bg-white p-4">
              <Bot className="size-6 text-[#7c3aed]" />
              <p className="mt-4 text-sm font-semibold text-black">
                {copy.labels.aiStarDiscovery}
              </p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-white p-4">
              <Users className="size-6 text-[#7c3aed]" />
              <p className="mt-4 text-sm font-semibold text-black">
                {copy.labels.scoutShareLoop}
              </p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-white p-4">
              <Crown className="size-6 text-[#7c3aed]" />
              <p className="mt-4 text-sm font-semibold text-black">
                {copy.creatorUnlock.title}
              </p>
            </div>
          </div>
        </div>

        <TopGrowingStars
          copy={copy}
          locale={locale}
          selectedStarId={selectedStarId}
          stars={stars}
        />
        <GrowthLoopDiagram copy={copy} />

        <div className="mt-12 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <ScoutShareLoop copy={copy} loop={scoutShareLoop} />
          <div className="grid min-w-0 gap-4">
            <MemberPortfolio
              copy={copy}
              locale={locale}
              portfolio={memberPortfolio}
              stars={stars}
            />
            <CreatorUnlockCard
              copy={copy}
              locale={locale}
              unlock={creatorUnlock}
            />
            <CreatorPath copy={copy} />
          </div>
        </div>

        <FounderUniversePreview copy={copy} locale={locale} stars={stars} />

        <div className="mt-10 rounded-lg border border-violet-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
                <Megaphone className="size-5" />
              </span>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-black/70">
                {copy.creatorUnlock.mockPaymentNotice}
              </p>
            </div>
            <span className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white">
              {copy.creatorUnlock.unlockedLabel}
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
