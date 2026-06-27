import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clapperboard,
  Crown,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { FanletterPrimaryHeader } from "@/components/fanletter-primary-header";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import type { FanletterCreatorPageData } from "@/lib/fanletter-content-service";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterAIStarChannelPageProps = {
  data: FanletterCreatorPageData;
  isAuthenticated: boolean;
  locale: Locale;
  referralCode: string | null;
};

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        account: "계정",
        aiStar: "AI STAR",
        back: "발견으로 돌아가기",
        fanClub: "팬클럽",
        founder: "참여",
        latest: "최신 브이로그",
        noLatest: "아직 공개된 브이로그가 없습니다.",
        publicVlogs: "공개 브이로그",
        reputation: "활동 기록",
        reputationValue: "스타 발견 신호",
        selected: "선택한 AI 스타",
        selectedBody: "브이로그와 팬 반응을 확인하고 다음 행동을 선택하세요.",
        titleSuffix: "AI 스타 채널",
        universe: "AI 스타 유니버스 보기",
        universeHint: "다음 행동",
      }
    : {
        account: "Account",
        aiStar: "AI STAR",
        back: "Back to discovery",
        fanClub: "Fan club",
        founder: "Join",
        latest: "Latest vlog",
        noLatest: "No public vlog has been published yet.",
        publicVlogs: "Public vlogs",
        reputation: "Activity record",
        reputationValue: "Star discovery signal",
        selected: "Selected AI Star",
        selectedBody: "Review vlogs and fan signals, then choose the next action.",
        titleSuffix: "AI Star channel",
        universe: "View AI Star Universe",
        universeHint: "Next action",
      };
}

export function FanletterAIStarChannelPage({
  data,
  locale,
  referralCode,
}: FanletterAIStarChannelPageProps) {
  const copy = getCopy(locale);
  const profile = data.profile;
  const character = profile.character;
  const starName = character?.name ?? profile.displayName;
  const avatarUrl =
    character?.avatarImageSet[0]?.url ?? profile.avatarImageUrl ?? null;
  const latestItem = data.items[0] ?? null;
  const heroImageUrl = latestItem?.coverImageUrl ?? avatarUrl;
  const effectiveReferralCode = referralCode ?? profile.referralCode;
  const universeHref = buildPathWithReferral(
    `/${locale}/fanletter/${profile.referralCode}`,
    effectiveReferralCode,
  );
  const founderHref = setPathSearchParams(`/${locale}/fanletter/onboarding`, {
    ref: effectiveReferralCode,
    returnTo: `/${locale}/fanletter/channel/${profile.referralCode}`,
    star: profile.referralCode,
  });
  const metrics = [
    {
      Icon: Clapperboard,
      label: copy.publicVlogs,
      value: formatNumber(data.publicContentCount, locale),
    },
    {
      Icon: UsersRound,
      label: copy.fanClub,
      value: formatNumber(data.communityStats.fanClubMemberCount, locale),
    },
    {
      Icon: Crown,
      label: "Lv.",
      value: String(character?.growth.level ?? 1),
    },
  ];

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-hidden bg-white pb-[calc(5.6rem+env(safe-area-inset-bottom))] text-zinc-950 sm:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <FanletterPrimaryHeader
          current="discovery"
          locale={locale}
          referralCode={effectiveReferralCode}
        />
      </div>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-stretch lg:px-8">
        <div className="relative min-h-[25rem] overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-[linear-gradient(150deg,#0c1f14_0%,#0a1510_100%)] shadow-[0_24px_72px_rgba(15,23,42,0.16)]">
          {heroImageUrl ? (
            <Image
              alt={starName}
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 44vw"
              src={heroImageUrl}
            />
          ) : (
            <div className="flex h-full min-h-[25rem] flex-col items-center justify-center gap-4 bg-[linear-gradient(150deg,#0c1f14_0%,#17331f_55%,#0a1510_100%)] text-[#44f26e]">
              <span className="text-6xl font-bold leading-none text-[#8df3ad]">
                {starName.trim().slice(0, 1) || "AI"}
              </span>
              <Sparkles className="size-12 opacity-70" />
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.84)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
              <BadgeCheck className="size-3.5" />
              {copy.aiStar}
            </span>
            <h1 className="mt-3 text-[2.5rem] font-semibold leading-none tracking-normal [word-break:keep-all] sm:text-[3.2rem]">
              {starName}
            </h1>
            <p className="mt-2 line-clamp-2 max-w-xl text-sm font-medium leading-6 text-white/72">
              {character?.summary ?? profile.intro}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4 shadow-[0_18px_58px_rgba(15,23,42,0.07)] sm:p-5">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {copy.selected}
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
              <span className="relative flex size-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                {avatarUrl ? (
                  <Image
                    alt={starName}
                    className="object-cover"
                    fill
                    sizes="4rem"
                    src={avatarUrl}
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-xl font-semibold">
                    {starName.slice(0, 1)}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold tracking-normal">
                  {starName}
                </h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  {copy.titleSuffix}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {metrics.map(({ Icon, label, value }) => (
                <div
                  className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3"
                  key={label}
                >
                  <Icon className="size-4 text-zinc-500" />
                  <p className="mt-3 text-xl font-semibold leading-none">{value}</p>
                  <p className="mt-1 truncate text-[0.64rem] font-semibold text-zinc-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {copy.latest}
              </p>
              <p className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">
                {latestItem?.title ?? copy.noLatest}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-70">
                {copy.reputation}
              </p>
              <p className="mt-1 text-sm font-semibold">{copy.reputationValue}</p>
            </div>
            <p className="px-1 text-sm font-medium leading-6 text-zinc-500">
              {copy.selectedBody}
            </p>
            <FanletterTrackedLink
              agentRank={{
                eventType: "ai_star_discovered",
                intent: "open_ai_star_universe_from_channel",
                source: "fanletter_content",
                starId: profile.referralCode,
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-zinc-800"
              eventName="signup_cta_click"
              href={universeHref}
              metadata={{
                location: "fanletter_ai_star_channel_primary",
                starId: profile.referralCode,
              }}
              referralCode={effectiveReferralCode}
            >
              {copy.universe}
              <ArrowRight className="size-4" />
            </FanletterTrackedLink>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
              href={founderHref}
            >
              {copy.founder}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
