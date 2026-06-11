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

import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type AIStar,
  type FanletterV2Copy,
  type FounderRole,
  type HumanFounderSlot,
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
  star,
}: {
  star: Pick<
    AIStar,
    "accentColor" | "accentSecondary" | "name" | "portraitInitials"
  >;
}) {
  return (
    <div
      aria-label={`${star.name} portrait`}
      className="relative aspect-square overflow-hidden rounded-lg border border-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_18px_34px_rgba(88,28,135,0.22)]"
      role="img"
      style={{
        background: `radial-gradient(circle at 30% 18%, rgba(255,255,255,0.9), transparent 18%), radial-gradient(circle at 70% 22%, ${star.accentSecondary}, transparent 22%), linear-gradient(145deg, ${star.accentColor}, #31105f 68%, #12041f)`,
      }}
    >
      <div className="absolute inset-x-4 bottom-4 top-10 rounded-t-full bg-white/18 backdrop-blur-[2px]" />
      <div className="absolute bottom-5 left-1/2 flex size-20 -translate-x-1/2 items-center justify-center rounded-full border border-white/28 bg-black/28 text-2xl font-semibold text-white shadow-[0_16px_34px_rgba(0,0,0,0.22)]">
        {star.portraitInitials}
      </div>
      <div className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[0.62rem] font-semibold text-white backdrop-blur">
        AI STAR
      </div>
    </div>
  );
}

export function AIStarCard({
  copy,
  locale,
  star,
}: {
  copy: FanletterV2Copy;
  locale: Locale;
  star: AIStar;
}) {
  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-fuchsia-300/50 bg-[#1a082f] p-3 text-white shadow-[0_24px_70px_rgba(88,28,135,0.24)] ring-1 ring-fuchsia-400/22 transition hover:-translate-y-0.5 hover:border-fuchsia-200"
      style={{
        background: `linear-gradient(160deg, ${star.accentColor} 0%, #301052 34%, #12041f 100%)`,
      }}
    >
      <AIStarPortrait star={star} />
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-[#4c1d95]">
            {copy.labels.aiStarBadge}
          </span>
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
      </div>
    </article>
  );
}

export function TopGrowingStars({
  copy,
  locale,
  stars,
}: {
  copy: FanletterV2Copy;
  locale: Locale;
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

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stars.map((star) => (
          <AIStarCard copy={copy} key={star.id} locale={locale} star={star} />
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

      <div className="mt-6 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
        {copy.growthLoop.steps.map((step, index) => (
          <div
            className="relative min-h-28 rounded-lg border border-violet-100 bg-[#fbfaff] p-3"
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
}: {
  copy: FanletterV2Copy;
}) {
  const loop = fanletterV2Mock.scoutShareLoop;
  const flowItems = [
    loop.sourceMember,
    copy.scoutShareLoop.selectUniverse,
    `${copy.labels.referralCode}: ${loop.referralCode}`,
    copy.scoutShareLoop.shareToSns,
    `${loop.targetMember} joins`,
    copy.scoutShareLoop.memberBBecomesFounder,
  ];

  return (
    <article className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <Share2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.scoutShareLoop}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.scoutShareLoop.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.scoutShareLoop.body}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {flowItems.map((item, index) => (
          <div className="flex items-center gap-2" key={`${item}-${index}`}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-xs font-semibold text-[#6d28d9]">
              {index + 1}
            </span>
            <div className="min-h-11 flex-1 rounded-lg border border-black/8 bg-[#f8f7ff] px-3 py-2 text-sm font-semibold text-[#26113d]">
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
        <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs font-semibold text-[#5b21b6]">
          {loop.shareLink}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {loop.sharePlatforms.map((platform) => (
            <span
              className="rounded-full border border-black/8 bg-white px-3 py-1 text-xs font-semibold text-black/68"
              key={platform}
            >
              {platform}
            </span>
          ))}
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
              Creator
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
}: {
  copy: FanletterV2Copy;
  locale: Locale;
}) {
  const portfolio = fanletterV2Mock.memberPortfolio;
  const starsById = new Map(
    fanletterV2Mock.aiStars.map((star) => [star.id, star]),
  );
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
    <article className="rounded-lg border border-black/10 bg-[#f6f8f4] p-4 shadow-[0_18px_44px_rgba(8,18,12,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <HumanMemberAvatar
          member={{ initials: "A", name: portfolio.memberName }}
          size="lg"
        />
        <div>
          <p className="text-sm font-semibold text-black/50">
            {copy.labels.memberPortfolio}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-black">
            {copy.memberPortfolio.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.memberPortfolio.body}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {metrics.map((metric) => (
          <div className="rounded-lg border border-black/8 bg-white p-3" key={metric.label}>
            <p className="text-xl font-semibold leading-none text-black">
              {metric.value}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-black/48">
              {metric.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        {portfolio.roles.map((item) => {
          const star = starsById.get(item.starId);

          if (!star) {
            return null;
          }

          return (
            <div
              className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-black/8 bg-white px-3 py-2"
              key={item.starId}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-black">
                  {star.name}
                </p>
                <p className="text-xs font-medium text-black/48">
                  {star.universeName}
                </p>
              </div>
              <FounderRoleBadge copy={copy} role={item.role} />
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function CreatorUnlockCard({
  copy,
}: {
  copy: FanletterV2Copy;
}) {
  const unlock = fanletterV2Mock.creatorUnlock;
  const labelsById: Record<string, string> = {
    activityMission: copy.creatorUnlock.activityMission,
    cp: copy.creatorUnlock.cp,
    directInvites: copy.creatorUnlock.directInvites,
    scoutScore: copy.creatorUnlock.scoutScore,
  };

  return (
    <article className="rounded-lg border border-[#7c3aed]/30 bg-[#12041f] p-4 text-white shadow-[0_24px_70px_rgba(88,28,135,0.22)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-[#5b21b6]">
          <Crown className="size-6" />
        </span>
        <div>
          <p className="text-sm font-semibold text-fuchsia-100">
            {copy.creatorUnlock.unlockedLabel}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal">
            {copy.creatorUnlock.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-white/64">
            {copy.creatorUnlock.body}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {unlock.conditions.map((condition) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-white/12 bg-white/8 p-3"
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
              {String(condition.current)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-white p-4 text-black">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#5b21b6]">
              {unlock.unlocked ? copy.creatorUnlock.unlockedLabel : "Locked"}
            </p>
            <p className="mt-1 text-sm font-medium leading-5 text-black/62">
              {copy.creatorUnlock.mockPaymentNotice}
            </p>
          </div>
          <span className="inline-flex h-10 shrink-0 items-center rounded-full bg-black px-4 text-sm font-semibold text-white">
            {unlock.createCostUsdt} USDT
          </span>
        </div>
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
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/14 text-lg font-semibold">
        {star.portraitInitials}
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
          {slot.name}
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {stars.map((star) => (
          <article
            className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)]"
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
    <article className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.06)] sm:p-5">
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
      <div className="mt-5 grid gap-2">
        {copy.creatorPath.steps.map((step, index) => (
          <div
            className="rounded-lg border border-black/8 bg-[#f6f8f4] p-3"
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

export function FounderClubV2HomeSections({ locale }: { locale: Locale }) {
  const copy = getFanletterV2Copy(locale);
  const stars = [...fanletterV2Mock.aiStars].sort(
    (left, right) => right.growthPercent - left.growthPercent,
  );

  return (
    <section
      className="border-b border-violet-200 bg-[#f8f7ff] px-4 py-16 text-black sm:px-6 sm:py-20 lg:px-8"
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

        <TopGrowingStars copy={copy} locale={locale} stars={stars} />
        <GrowthLoopDiagram copy={copy} />

        <div className="mt-12 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <ScoutShareLoop copy={copy} />
          <div className="grid gap-4">
            <MemberPortfolio copy={copy} locale={locale} />
            <CreatorUnlockCard copy={copy} />
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
