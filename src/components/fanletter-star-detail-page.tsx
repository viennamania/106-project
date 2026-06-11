import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Crown,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  AIStarCard,
  FounderRoleBadge,
  FounderUniversePreview,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
import { FanletterStarReferralPanel } from "@/components/fanletter-star-referral-panel";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type AIStar,
  type ScoutShareLoopData,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function buildReferralCode(star: AIStar) {
  const starToken =
    star.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ||
    star.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return `${(starToken || "STAR").slice(0, 12)}-A-001`;
}

function buildShareLink({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}) {
  const url = new URL(
    `/${locale}/fanletter/${encodeURIComponent(star.id)}`,
    "https://www.net402.ai",
  );
  url.searchParams.set("ref", referralCode);

  return url.toString();
}

function buildJoinHref({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}) {
  const params = new URLSearchParams({
    ref: referralCode,
    star: star.id,
  });

  return `/${locale}/fanletter/onboarding?${params.toString()}`;
}

function buildMockScoutLoop({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}): ScoutShareLoopData {
  return {
    ...fanletterV2Mock.scoutShareLoop,
    referralCode,
    selectedUniverse: star.universeName,
    shareLink: buildShareLink({
      locale,
      referralCode,
      star,
    }),
    starId: star.id,
    starName: star.name,
  };
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-violet-200 bg-white p-3 shadow-[0_14px_32px_rgba(88,28,135,0.08)]">
      <p className="text-2xl font-semibold leading-none text-[#12041f]">
        {value}
      </p>
      <p className="mt-2 text-[0.68rem] font-semibold uppercase text-black/48">
        {label}
      </p>
    </div>
  );
}

function HumanFounderSlots({
  copy,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  star: AIStar;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Users className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-black/50">
            {copy.roles.founder}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-black">
            {copy.starDetail.founderSlotsTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.starDetail.founderSlotsBody}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {star.founderSlots.map((slot) => (
          <div
            className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
            key={`${slot.name}-${slot.role}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <HumanMemberAvatar member={slot} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {slot.name}
                </p>
                <p className="text-xs font-medium text-zinc-500">
                  {copy.labels.humanMember}
                </p>
              </div>
            </div>
            <FounderRoleBadge copy={copy} role={slot.role} />
          </div>
        ))}
      </div>
    </article>
  );
}

function SpawnedStarsSection({
  copy,
  locale,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  locale: Locale;
  star: AIStar;
}) {
  return (
    <article className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <Bot className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.spawnedStars}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.starDetail.spawnedTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.starDetail.spawnedBody}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {star.spawnedStars.map((spawnedStar) => (
          <Link
            className="rounded-lg border border-fuchsia-200/70 p-3 text-white shadow-[0_16px_34px_rgba(88,28,135,0.16)] transition hover:-translate-y-0.5"
            href={`/${locale}/fanletter/${spawnedStar.id}`}
            key={spawnedStar.id}
            style={{
              background: `linear-gradient(145deg, ${spawnedStar.accentColor}, #21103d 72%)`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex size-12 items-center justify-center rounded-lg border border-white/18 text-sm font-semibold"
                style={{
                  background: `linear-gradient(145deg, ${spawnedStar.accentSecondary}, rgba(255,255,255,0.16))`,
                }}
              >
                {spawnedStar.portraitInitials}
              </span>
              <div className="min-w-0">
                <p className="text-[0.66rem] font-semibold text-fuchsia-100">
                  {copy.labels.aiStarBadge}
                </p>
                <p className="truncate text-lg font-semibold">
                  {spawnedStar.name}
                </p>
                <p className="truncate text-xs font-medium text-white/60">
                  {getFanletterV2LocalizedText(
                    spawnedStar.specialty,
                    locale,
                  )}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-white/70">
              <span>
                {copy.labels.starScore} {spawnedStar.starScore}
              </span>
              <span>
                +{spawnedStar.growthPercent}% {copy.labels.growth}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function FanletterStarDetailPage({
  inboundReferralCode,
  locale,
  relatedStars,
  star,
}: {
  inboundReferralCode?: string | null;
  locale: Locale;
  relatedStars: AIStar[];
  star: AIStar;
}) {
  const copy = getFanletterV2Copy(locale);
  const referralCode = inboundReferralCode ?? buildReferralCode(star);
  const loop = buildMockScoutLoop({
    locale,
    referralCode,
    star,
  });
  const joinHref = buildJoinHref({
    locale,
    referralCode,
    star,
  });

  return (
    <main className="min-h-screen bg-[#fbfaff] pb-28 text-black">
      <section
        className="overflow-hidden border-b border-violet-200 bg-[#fbfaff] px-4 pb-10 pt-6 text-black sm:px-6 sm:pb-16 lg:px-8"
        style={{
          background: `radial-gradient(circle at 12% 8%, ${star.accentColor}1f, transparent 34%), radial-gradient(circle at 84% 10%, ${star.accentSecondary}24, transparent 30%), linear-gradient(180deg, #ffffff 0%, #fbfaff 58%, #f3efff 100%)`,
        }}
      >
        <div className="mx-auto max-w-[92rem]">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-3 text-sm font-semibold text-[#5b21b6] shadow-[0_12px_28px_rgba(88,28,135,0.08)] transition hover:border-violet-300 hover:bg-violet-50"
              href={`/${locale}/fanletter#top-growing-ai-stars`}
            >
              <ArrowLeft className="size-4" />
              {copy.actions.openDiscovery}
            </Link>
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
              <ShieldCheck className="size-4" />
              {copy.starDetail.mockNotice}
            </span>
          </div>

          <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_24rem] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#6d28d9] shadow-[0_10px_24px_rgba(88,28,135,0.08)]">
                <Crown className="size-4" />
                {copy.starDetail.heroEyebrow}
              </div>
              <h1 className="mt-5 max-w-4xl text-[3.2rem] font-semibold leading-[0.98] tracking-normal [word-break:keep-all] sm:text-[5rem]">
                {star.name}
                <span className="block text-[#6d28d9]">
                  {copy.starDetail.universeTitle}
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/64 sm:text-lg">
                {copy.starDetail.heroBody}
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                <MetricTile
                  label={copy.labels.starScore}
                  value={String(star.starScore)}
                />
                <MetricTile
                  label={copy.labels.growth}
                  value={`+${star.growthPercent}%`}
                />
                <MetricTile
                  label={copy.labels.openSlots}
                  value={`${star.openSlots.open}/${star.openSlots.total}`}
                />
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(124,58,237,0.22)] transition hover:bg-[#6d28d9]"
                  href={joinHref}
                >
                  {copy.actions.joinAsFounder}
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-5 text-sm font-semibold text-[#5b21b6] transition hover:border-violet-300 hover:bg-violet-50"
                  href="#referral-builder"
                >
                  {copy.actions.createMockReferral}
                </a>
              </div>
            </div>

            <AIStarCard copy={copy} isSelected locale={locale} star={star} />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-[92rem] gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <FanletterStarReferralPanel
            copy={copy}
            inboundReferralCode={inboundReferralCode}
            joinHref={joinHref}
            loop={loop}
          />
          <div className="grid gap-4">
            <HumanFounderSlots copy={copy} star={star} />
            <SpawnedStarsSection copy={copy} locale={locale} star={star} />
          </div>
        </div>

        <div className="mx-auto max-w-[92rem]">
          <FounderUniversePreview copy={copy} locale={locale} stars={[star]} />
        </div>

        <div className="mx-auto mt-12 max-w-[92rem]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#6d28d9]">
                {copy.labels.aiStarDiscovery}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#12041f]">
                {copy.topGrowingStars.title}
              </h2>
            </div>
            <Link
              className="hidden h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-[#7c3aed]/40 hover:text-[#5b21b6] sm:inline-flex"
              href={`/${locale}/fanletter#top-growing-ai-stars`}
            >
              {copy.actions.openDiscovery}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {relatedStars.map((relatedStar) => (
              <AIStarCard
                copy={copy}
                detailHref={`/${locale}/fanletter/${relatedStar.id}`}
                key={relatedStar.id}
                locale={locale}
                star={relatedStar}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg border border-black/10 bg-white p-3 text-center">
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(star.founderCount, locale)}
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                {copy.labels.founderCount}
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(loop.rewards.cp, locale)}
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                CP
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(fanletterV2Mock.creatorUnlock.createCostUsdt, locale)} USDT
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                {copy.creatorUnlock.title}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
