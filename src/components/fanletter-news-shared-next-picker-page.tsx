"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  appendFanletterNewsPublicCutJourneyReportId,
  encodeFanletterNewsPublicCutJourneyReportIds,
  FANLETTER_NEWS_PUBLIC_CUT_JOURNEY_PARAM,
  FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM,
  type SerializedFanletterNewsPublicCutFeedItem,
  type SerializedFanletterNewsPublicCutFeedItemBase,
} from "@/lib/fanletter-news-public-cuts-shared";
import { getFanletterNewsBareArticleDisplayTitle } from "@/lib/fanletter-news-related";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterNewsSharedNextPickerPageProps = {
  completedItem: SerializedFanletterNewsPublicCutFeedItem;
  initialCutSlotNumber: number | null;
  journeyReportIds: string[];
  journeyStep: number;
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
  shareId: string | null;
  targetItem: SerializedFanletterNewsPublicCutFeedItem | null;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        back: "방금 본 4컷으로",
        emptyBody:
          "이 캐릭터의 다음 브이로그 후보를 준비하지 못했습니다. 캐릭터 피드에서 이어서 볼 수 있어요.",
        emptyCta: "캐릭터 피드 보기",
        emptyTitle: "다음 팬 리포트 준비 중",
        eyebrow: "AI CHARACTER IP",
        introBody: (name: string) =>
          `${name}의 다음 4컷으로 이어집니다.`,
        introTitle: (name: string) => `${name} 타임라인`,
        loading: "다음 리포트로 이동 중",
        optionBadge: "6/6",
        optionCta: "이 리포트 보기",
        optionCount: (count: string) => `후보 ${count}개`,
        recommended: "추천",
        singleCount: "추천 1개",
        singleCta: "이어보기",
        singleTitle: "다음 4컷",
        sourceUnlocked: "원본 언락됨",
        step: (step: string) => `${step}번째 흐름`,
        title: "다음 4컷 선택",
        viewed: "방금 본 캐릭터",
      }
    : {
        back: "Back to the 4 cuts",
        emptyBody:
          "The next vlog candidates for this character are not ready yet. Continue from the character feed.",
        emptyCta: "Open character feed",
        emptyTitle: "Preparing next fan reports",
        eyebrow: "AI CHARACTER IP",
        introBody: (name: string) =>
          `Continue to ${name}'s next 4 cuts.`,
        introTitle: (name: string) => `${name}'s timeline`,
        loading: "Opening next report",
        optionBadge: "6/6",
        optionCta: "View this report",
        optionCount: (count: string) => `${count} options`,
        recommended: "Recommended",
        singleCount: "1 pick",
        singleCta: "Continue",
        singleTitle: "Next 4 cuts",
        sourceUnlocked: "Source unlocked",
        step: (step: string) => `Flow ${step}`,
        title: "Choose next 4 cuts",
        viewed: "Current character",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function getPublicCutItemCutCount(
  item: SerializedFanletterNewsPublicCutFeedItemBase,
) {
  return Math.max(item.cuts.length, item.leadCut ? 1 : 0);
}

function getNextReportOptions(
  item: SerializedFanletterNewsPublicCutFeedItem | null,
) {
  if (!item) {
    return [];
  }

  const candidates: SerializedFanletterNewsPublicCutFeedItemBase[] =
    item.vlogReportOptions?.length ? item.vlogReportOptions : [item];
  const seenReportIds = new Set<string>();
  const options = candidates.filter((option) => {
    const reportId = option.report.reportId.trim();

    if (!reportId || seenReportIds.has(reportId)) {
      return false;
    }

    seenReportIds.add(reportId);
    return true;
  });

  if (!seenReportIds.has(item.report.reportId)) {
    options.unshift(item);
  }

  const defaultOptionIndex = options.findIndex(
    (option) => option.report.reportId === item.report.reportId,
  );

  if (defaultOptionIndex > 0) {
    const [defaultOption] = options.splice(defaultOptionIndex, 1);

    options.unshift(defaultOption);
  }

  const [defaultOption, ...remainingOptions] = options;
  const rankedRemainingOptions = remainingOptions.sort((left, right) => {
    const getOptionScore = (
      option: SerializedFanletterNewsPublicCutFeedItemBase,
    ) => {
      const publishedAtTime = option.report.sourcePublishedAt
        ? Date.parse(option.report.sourcePublishedAt)
        : Date.parse(option.report.createdAt);

      return (
        (option.sourceReveal.unlocked ? 1_000_000 : 0) +
        option.sourceReveal.count * 1_000 +
        (Number.isFinite(publishedAtTime) ? publishedAtTime / 1_000_000 : 0)
      );
    };

    return getOptionScore(right) - getOptionScore(left);
  });

  return (defaultOption
    ? [defaultOption, ...rankedRemainingOptions]
    : rankedRemainingOptions
  ).slice(0, 6);
}

function getCharacterHref({
  completedItem,
  locale,
  referralCode,
  returnToHref,
}: {
  completedItem: SerializedFanletterNewsPublicCutFeedItem;
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
}) {
  const characterReferralCode = completedItem.report.creatorReferralCode;
  const path = characterReferralCode
    ? `/${locale}/fanletter/news/cuts/characters/${characterReferralCode}`
    : `/${locale}/fanletter/news/cuts/characters`;

  return setPathSearchParams(buildPathWithReferral(path, referralCode), {
    returnTo: returnToHref,
    sourceReportId: completedItem.report.reportId,
  });
}

function getReportHref({
  journeyStep,
  journeyReportIds,
  locale,
  option,
  referralCode,
  returnToHref,
  shareId,
}: {
  journeyStep: number;
  journeyReportIds: string[];
  locale: Locale;
  option: SerializedFanletterNewsPublicCutFeedItemBase;
  referralCode: string | null;
  returnToHref: string;
  shareId: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${option.report.reportId}`,
      referralCode,
    ),
    {
      [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(
        option.leadCut.slotNumber,
      ),
      [FANLETTER_NEWS_PUBLIC_CUT_JOURNEY_PARAM]:
        encodeFanletterNewsPublicCutJourneyReportIds(
          appendFanletterNewsPublicCutJourneyReportId(
            journeyReportIds,
            option.report.reportId,
          ),
        ),
      returnTo: returnToHref,
      shareId,
      step: String(journeyStep + 1),
    },
  );
}

export function FanletterNewsSharedNextPickerPage({
  completedItem,
  initialCutSlotNumber,
  journeyReportIds,
  journeyStep,
  locale,
  referralCode,
  returnToHref,
  shareId,
  targetItem,
}: FanletterNewsSharedNextPickerPageProps) {
  const copy = getCopy(locale);
  const router = useRouter();
  const options = useMemo(() => getNextReportOptions(targetItem), [targetItem]);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isSingleOption = options.length === 1;
  const characterName = completedItem.report.creatorName;
  const backgroundImageUrl =
    completedItem.report.coverImageUrl || completedItem.leadCut.imageUrl;
  const characterImageUrl =
    completedItem.report.creatorAvatarImageUrl ||
    completedItem.report.coverImageUrl ||
    completedItem.leadCut.imageUrl;
  const optionCountLabel = formatNumber(options.length, locale);
  const stepLabel = copy.step(formatNumber(journeyStep, locale));
  const currentReportHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${completedItem.report.reportId}`,
      referralCode,
    ),
    {
      [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(
        initialCutSlotNumber ?? completedItem.leadCut.slotNumber,
      ),
      shareId,
      [FANLETTER_NEWS_PUBLIC_CUT_JOURNEY_PARAM]:
        encodeFanletterNewsPublicCutJourneyReportIds(journeyReportIds),
      step: String(journeyStep),
    },
  );
  const nextPickerReturnHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${completedItem.report.reportId}/next`,
      referralCode,
    ),
    {
      [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(
        initialCutSlotNumber ?? completedItem.leadCut.slotNumber,
      ),
      returnTo: returnToHref,
      shareId,
      [FANLETTER_NEWS_PUBLIC_CUT_JOURNEY_PARAM]:
        encodeFanletterNewsPublicCutJourneyReportIds(journeyReportIds),
      step: String(journeyStep),
    },
  );
  const characterHref = getCharacterHref({
    completedItem,
    locale,
    referralCode,
    returnToHref: nextPickerReturnHref,
  });

  useEffect(() => {
    router.prefetch(currentReportHref);
    router.prefetch(characterHref);

    for (const option of options) {
      router.prefetch(
        getReportHref({
          journeyStep,
          journeyReportIds,
          locale,
          option,
          referralCode,
          returnToHref: nextPickerReturnHref,
          shareId,
        }),
      );
    }
  }, [
    characterHref,
    currentReportHref,
    journeyReportIds,
    journeyStep,
    locale,
    options,
    referralCode,
    nextPickerReturnHref,
    router,
    shareId,
  ]);

  return (
    <main className="fanletter-v2-surface min-h-dvh bg-[#050706] text-white">
      <div className="fixed inset-0">
        <Image
          alt=""
          className="object-cover opacity-34 blur-[2px] saturate-[1.08]"
          fill
          priority
          sizes="100vw"
          src={backgroundImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(backgroundImageUrl)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,4,0.54),rgba(3,6,4,0.86)_42%,rgba(3,6,4,0.98))]" />
      </div>
      {pendingHref ? (
        <div
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-40 mx-auto max-w-[430px] px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
          role="status"
        >
          <div className="rounded-full border border-[#44f26e]/24 bg-black/74 px-4 py-3 text-xs font-black text-white shadow-[0_18px_52px_rgba(0,0,0,0.36)] backdrop-blur-xl">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-[#44f26e]" />
              {copy.loading}
            </span>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/12">
              <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#44f26e]" />
            </span>
          </div>
        </div>
      ) : null}
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <header className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-black/46 px-3 text-[0.72rem] font-black !text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-[#44f26e]/40"
            href={currentReportHref}
          >
            <ArrowLeft className="size-4" />
            {copy.back}
          </Link>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#44f26e]/20 bg-[#44f26e]/12 px-3 text-[0.72rem] font-black text-[#9bffad]">
            <CheckCircle2 className="size-4" />
            {stepLabel}
          </span>
        </header>

        <section className="mt-5">
          <div className="flex items-center gap-3">
            <span className="relative block size-[3.25rem] shrink-0 overflow-hidden rounded-[0.95rem] border border-[#44f26e]/42 bg-white/8">
              <Image
                alt={characterName}
                className="object-cover"
                fill
                sizes="52px"
                src={characterImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(
                  characterImageUrl,
                )}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-0.5 break-words text-[1.5rem] font-black leading-[1.02] tracking-normal [word-break:keep-all]">
                {copy.introTitle(characterName)}
              </h1>
            </div>
          </div>
          {!isSingleOption ? (
            <p className="mt-2 line-clamp-1 break-words text-[0.74rem] font-bold leading-5 text-white/56 [word-break:keep-all]">
              {copy.introBody(characterName)}
            </p>
          ) : null}
        </section>

        {options.length > 0 ? (
          <section className="mt-4 min-h-0 flex-1">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[#9bffad]">
                  {isSingleOption
                    ? copy.singleCount
                    : copy.optionCount(optionCountLabel)}
                </p>
                <h2 className="mt-0.5 break-words text-[1.32rem] font-black leading-[1.05] tracking-normal [word-break:keep-all]">
                  {isSingleOption ? copy.singleTitle : copy.title}
                </h2>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510] shadow-[0_18px_44px_rgba(68,242,110,0.18)]">
                <Video className="size-[1.125rem]" />
              </span>
            </div>
            <div
              className={
                isSingleOption
                  ? "grid gap-3"
                  : "grid grid-cols-3 gap-2"
              }
            >
              {options.map((option, optionIndex) => {
                const href = getReportHref({
                  journeyStep,
                  journeyReportIds,
                  locale,
                  option,
                  referralCode,
                  returnToHref: nextPickerReturnHref,
                  shareId,
                });
                const title = getFanletterNewsBareArticleDisplayTitle(
                  option.report.title,
                );
                const cutCount = getPublicCutItemCutCount(option);
                const isRecommended = optionIndex === 0;

                return (
                  <Link
                    aria-label={`${title} ${copy.optionCta}`}
                    className={
                      isSingleOption
                        ? "group grid min-h-[12.75rem] grid-cols-[8.9rem_minmax(0,1fr)] overflow-hidden rounded-[1.15rem] border border-[#44f26e]/24 bg-black/66 text-left shadow-[0_22px_62px_rgba(0,0,0,0.34)] transition hover:border-[#44f26e]/48 focus:outline-none focus:ring-4 focus:ring-[#44f26e]/22"
                        : "group relative min-h-[13.35rem] overflow-hidden rounded-[0.9rem] border border-white/12 bg-black/66 text-left shadow-[0_20px_52px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:border-[#44f26e]/44 focus:outline-none focus:ring-4 focus:ring-[#44f26e]/22"
                    }
                    href={href}
                    key={option.report.reportId}
                    onClick={() => setPendingHref(href)}
                  >
                    <span
                      className={
                        isSingleOption
                          ? "relative block min-h-[12.75rem] overflow-hidden bg-white/8"
                          : "absolute inset-x-0 top-0 block h-[10.25rem] overflow-hidden rounded-t-[0.9rem] bg-white/8"
                      }
                    >
                      <Image
                        alt={title}
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        fill
                        sizes="(min-width: 640px) 138px, 31vw"
                        src={option.leadCut.imageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          option.leadCut.imageUrl,
                        )}
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
                      {isRecommended ? (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-[#44f26e] px-1.5 py-0.5 text-[0.54rem] font-black text-[#111510]">
                          {copy.recommended}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        isSingleOption
                          ? "flex min-w-0 flex-col justify-between p-3"
                          : "absolute inset-x-0 bottom-0 block p-2"
                      }
                    >
                      <span className="min-w-0">
                      <span className="block truncate text-[0.56rem] font-black uppercase tracking-[0.1em] text-[#9bffad]">
                        {option.report.reporterName}
                      </span>
                      <span
                        className={
                          isSingleOption
                            ? "mt-1 line-clamp-3 break-words text-[0.92rem] font-black leading-tight text-white [word-break:keep-all]"
                            : "mt-0.5 line-clamp-1 break-words text-[0.68rem] font-black leading-tight text-white [word-break:keep-all]"
                        }
                      >
                        {title}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2 text-[0.62rem] font-black text-white/54">
                        <span className="inline-flex items-center gap-1 text-[#9bffad]">
                          <HeartHandshake className="size-3" />
                          {Math.min(cutCount, 6)}/6
                        </span>
                        <span className="max-w-[3.25rem] truncate">
                          {option.sourceReveal.unlocked
                            ? copy.sourceUnlocked
                            : copy.optionBadge}
                        </span>
                      </span>
                      </span>
                      {isSingleOption ? (
                        <span className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#44f26e] px-3 text-[0.72rem] font-black text-[#111510]">
                          {copy.singleCta}
                          <ArrowRight className="size-3.5" />
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-[1.5rem] border border-white/12 bg-black/62 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl">
            <span className="flex size-12 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
              <Sparkles className="size-5" />
            </span>
            <h2 className="mt-4 break-words text-[1.6rem] font-black leading-tight [word-break:keep-all]">
              {copy.emptyTitle}
            </h2>
            <p className="mt-3 break-words text-sm font-bold leading-6 text-white/66 [word-break:keep-all]">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510] transition hover:bg-[#65ff86]"
              href={characterHref}
              onClick={() => setPendingHref(characterHref)}
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
