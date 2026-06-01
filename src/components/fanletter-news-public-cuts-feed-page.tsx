"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HeartHandshake,
  Images,
  Loader2,
  LockKeyhole,
  PenLine,
  Sparkles,
  UserRound,
} from "lucide-react";

import { useMemberSession } from "@/components/member-session-provider";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE,
  type FanletterNewsPublicCutFeedLoadResponse,
  type SerializedFanletterNewsPublicCutFeedItem,
} from "@/lib/fanletter-news-public-cuts-shared";
import {
  getFanletterNewsBareArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
import type { FanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";
import {
  FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
  type FanletterNewsSourceRevealStateChangeDetail,
} from "@/lib/fanletter-news-source-reveal-events";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral, setPathSearchParams } from "@/lib/landing-branding";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        adult: "성인 팬 전용",
        character: "캐릭터",
        emptyBody:
          "아직 공개 피드로 보여줄 리포터 편집 컷이 없습니다. 팬 기자가 티저 컷을 저장하면 이곳에 모입니다.",
        emptyCta: "뉴스 홈으로 돌아가기",
        emptyTitle: "리포터 컷 피드가 준비 중입니다.",
        eyebrow: "Reporter Cut Feed",
        feedTitle: "리포터 컷",
        home: "뉴스 홈",
        instruction: "위아래로 넘겨 팬 기자가 고른 4컷을 확인하세요.",
        loadError: "다음 리포터 컷을 불러오지 못했습니다.",
        loadMore: "더 보기",
        loadingMore: "다음 리포터 컷 불러오는 중",
        nextCut: "다음 컷",
        noMore: "모든 리포터 컷을 확인했습니다.",
        paid: "팬 전용 원본",
        previousCut: "이전 컷",
        reporter: "팬 기자",
        slot: (index: string) => `컷 ${index}`,
        sourceOpen: "팬 오픈 투표",
        sourceOpenDone: "원본 공개 완료",
        sourceOpenStatus: (
          count: string,
          threshold: string,
          remaining: string,
        ) => `${count}/${threshold} 참여 · ${remaining}명 남음`,
        title: "팬 기자가 편집한 4컷 피드",
        voteCta: "보고싶어요",
        voteDone: "참여 완료",
        voteFailed: "참여 실패",
        voteLogin: "로그인",
        voteSaving: "반영 중",
      }
    : {
        adult: "Adult fan-only",
        character: "Character",
        emptyBody:
          "No reporter-edited cuts are ready for the public feed yet. Saved teaser cuts will appear here.",
        emptyCta: "Back to News",
        emptyTitle: "Reporter cut feed is getting ready.",
        eyebrow: "Reporter Cut Feed",
        feedTitle: "Reporter Cuts",
        home: "News Home",
        instruction: "Swipe vertically to review the four cuts chosen by fan reporters.",
        loadError: "Could not load more reporter cuts.",
        loadMore: "Load more",
        loadingMore: "Loading more reporter cuts",
        nextCut: "Next cut",
        noMore: "You have reviewed every reporter cut.",
        paid: "Fan-only source",
        previousCut: "Previous cut",
        reporter: "Fan reporter",
        slot: (index: string) => `Cut ${index}`,
        sourceOpen: "Fan-open vote",
        sourceOpenDone: "Source open",
        sourceOpenStatus: (
          count: string,
          threshold: string,
          remaining: string,
        ) => `${count}/${threshold} joined · ${remaining} left`,
        title: "Four-cut feed edited by fan reporters",
        voteCta: "Want it",
        voteDone: "Joined",
        voteFailed: "Could not join",
        voteLogin: "Log in",
        voteSaving: "Saving",
      };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getCutFeedHref({
  locale,
  referralCode,
  reportId,
}: {
  locale: Locale;
  referralCode: string | null;
  reportId: string;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/cuts/${reportId}`,
    referralCode,
  );
}

function getCharacterHref({
  creatorReferralCode,
  locale,
  referralCode,
}: {
  creatorReferralCode: string | null;
  locale: Locale;
  referralCode: string | null;
}) {
  return buildPathWithReferral(
    creatorReferralCode
      ? `/${locale}/fanletter/news/characters/${creatorReferralCode}`
      : `/${locale}/fanletter/news/characters`,
    referralCode ?? creatorReferralCode,
  );
}

function getReporterHref({
  locale,
  referralCode,
  reporterReferralCode,
}: {
  locale: Locale;
  referralCode: string | null;
  reporterReferralCode: string;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/reporters/${reporterReferralCode}`,
    referralCode,
  );
}

type SourceRevealMiniVoteCopy = Pick<
  ReturnType<typeof getCopy>,
  | "sourceOpen"
  | "sourceOpenDone"
  | "sourceOpenStatus"
  | "voteCta"
  | "voteDone"
  | "voteFailed"
  | "voteLogin"
  | "voteSaving"
>;

type SourceRevealResponse = {
  sourceReveal: FanletterNewsSourceRevealState;
};

function isSourceRevealResponse(value: unknown): value is SourceRevealResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "sourceReveal" in value &&
    typeof (value as SourceRevealResponse).sourceReveal?.count === "number"
  );
}

function SourceRevealMiniVote({
  connectHref,
  copy,
  endpoint,
  initialState,
  locale,
  reportId,
}: {
  connectHref: string;
  copy: SourceRevealMiniVoteCopy;
  endpoint: string;
  initialState: FanletterNewsSourceRevealState;
  locale: Locale;
  reportId: string;
}) {
  const memberSession = useMemberSession();
  const [state, setState] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const remaining = Math.max(0, state.threshold - state.count);
  const progressPercent =
    state.threshold > 0
      ? Math.min(100, Math.max(0, (state.count / state.threshold) * 100))
      : 100;
  const countLabel = formatNumber(state.count, locale);
  const thresholdLabel = formatNumber(state.threshold, locale);
  const remainingLabel = formatNumber(remaining, locale);
  const isLoggedIn = Boolean(memberSession.email) || state.requestedByViewer;
  const statusLabel = state.unlocked
    ? copy.sourceOpenDone
    : copy.sourceOpenStatus(countLabel, thresholdLabel, remainingLabel);
  const ctaLabel = state.unlocked
    ? copy.sourceOpenDone
    : state.requestedByViewer
      ? copy.voteDone
      : isSaving
        ? copy.voteSaving
        : copy.voteCta;

  const updateSourceReveal = useCallback(
    (nextState: FanletterNewsSourceRevealState) => {
      setState(nextState);
      window.dispatchEvent(
        new CustomEvent<FanletterNewsSourceRevealStateChangeDetail>(
          FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
          {
            detail: {
              endpoint,
              reportId,
              state: nextState,
            },
          },
        ),
      );
    },
    [endpoint, reportId],
  );

  const handleVote = useCallback(async () => {
    if (isSaving || state.requestedByViewer || state.unlocked) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as unknown;

      if (!response.ok || !isSourceRevealResponse(data)) {
        throw new Error(copy.voteFailed);
      }

      updateSourceReveal(data.sourceReveal);
    } catch {
      setError(copy.voteFailed);
    } finally {
      setIsSaving(false);
    }
  }, [
    copy.voteFailed,
    endpoint,
    isSaving,
    state.requestedByViewer,
    state.unlocked,
    updateSourceReveal,
  ]);

  const buttonClassName =
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[0.66rem] font-black transition sm:h-9 sm:px-4 sm:text-xs";
  const disabledButtonClassName =
    "bg-white/12 text-white/62 ring-1 ring-white/10";

  return (
    <div className="mt-3 max-w-[30rem] rounded-[1.05rem] border border-white/12 bg-black/30 p-2.5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-md sm:mt-4 sm:p-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/16 text-[#44f26e] ring-1 ring-[#44f26e]/20 sm:size-9">
          {state.unlocked ? (
            <CheckCircle2 className="size-4.5" />
          ) : (
            <LockKeyhole className="size-4.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#9bffad] sm:text-[0.64rem]">
            {copy.sourceOpen}
          </p>
          <p className="truncate text-[0.72rem] font-black text-white/88 sm:text-sm">
            {statusLabel}
          </p>
        </div>
        {state.unlocked || state.requestedByViewer ? (
          <button
            className={`${buttonClassName} ${disabledButtonClassName}`}
            disabled
            type="button"
          >
            <CheckCircle2 className="size-3.5" />
            {ctaLabel}
          </button>
        ) : isLoggedIn ? (
          <button
            className={`${buttonClassName} bg-[#44f26e] text-[#101510] shadow-[0_10px_22px_rgba(0,0,0,0.2)] hover:bg-[#67ff88] disabled:cursor-wait disabled:bg-[#44f26e]/70`}
            disabled={isSaving}
            onClick={() => void handleVote()}
            type="button"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <HeartHandshake className="size-3.5" />
            )}
            {ctaLabel}
          </button>
        ) : (
          <Link
            className={`${buttonClassName} bg-[#44f26e] !text-[#101510] shadow-[0_10px_22px_rgba(0,0,0,0.2)] hover:bg-[#67ff88]`}
            href={connectHref}
          >
            <HeartHandshake className="size-3.5" />
            {copy.voteLogin}
          </Link>
        )}
      </div>
      <div
        aria-label={statusLabel}
        className="mt-2 h-1 overflow-hidden rounded-full bg-white/14"
        role="progressbar"
        aria-valuemax={state.threshold}
        aria-valuemin={0}
        aria-valuenow={Math.min(state.count, state.threshold)}
      >
        <div
          className="h-full rounded-full bg-[#44f26e] transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-[0.64rem] font-bold text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FeedSlide({
  hasMore,
  index,
  item,
  itemCount,
  locale,
  referralCode,
}: {
  hasMore: boolean;
  index: number;
  item: SerializedFanletterNewsPublicCutFeedItem;
  itemCount: number;
  locale: Locale;
  referralCode: string | null;
}) {
  const [activeCutIndex, setActiveCutIndex] = useState(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const copy = getCopy(locale);
  const { report } = item;
  const title = getFanletterNewsBareArticleDisplayTitle(report.title);
  const positionLabel = hasMore
    ? `${formatNumber(index + 1, locale)} / ${formatNumber(itemCount, locale)}+`
    : `${formatNumber(index + 1, locale)} / ${formatNumber(itemCount, locale)}`;
  const publishedAt = formatDate(report.sourcePublishedAt ?? report.createdAt, locale);
  const isNsfw = report.contentMaturityRating === "nsfw";
  const cutFeedHref = getCutFeedHref({
    locale,
    referralCode,
    reportId: report.reportId,
  });
  const sourceRevealEndpoint = `/api/fanletter/news-reports/${encodeURIComponent(report.reportId)}/source-reveal`;
  const sourceRevealConnectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    {
      returnTo: cutFeedHref,
    },
  );
  const characterHref = getCharacterHref({
    creatorReferralCode: report.creatorReferralCode,
    locale,
    referralCode,
  });
  const reporterHref = getReporterHref({
    locale,
    referralCode,
    reporterReferralCode: report.reporterReferralCode,
  });
  const cuts = item.cuts.length > 0 ? item.cuts : [item.leadCut];
  const cutCount = cuts.length;
  const activeCutLabel = `${formatNumber(activeCutIndex + 1, locale)} / ${formatNumber(cutCount, locale)}`;
  const goToPreviousCut = useCallback(() => {
    setActiveCutIndex((currentIndex) =>
      cutCount > 0 ? (currentIndex - 1 + cutCount) % cutCount : currentIndex,
    );
  }, [cutCount]);
  const goToNextCut = useCallback(() => {
    setActiveCutIndex((currentIndex) =>
      cutCount > 0 ? (currentIndex + 1) % cutCount : currentIndex,
    );
  }, [cutCount]);
  const handlePointerEnd = useCallback(
    (clientX: number, clientY: number) => {
      const pointerStart = pointerStartRef.current;

      pointerStartRef.current = null;

      if (!pointerStart) {
        return;
      }

      const deltaX = clientX - pointerStart.x;
      const deltaY = clientY - pointerStart.y;

      if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.1) {
        return;
      }

      if (deltaX > 0) {
        goToPreviousCut();
      } else {
        goToNextCut();
      }
    },
    [goToNextCut, goToPreviousCut],
  );

  return (
    <article
      className="relative min-h-[100dvh] touch-pan-y snap-start snap-always overflow-hidden bg-black text-white"
      id={report.reportId}
      onPointerCancel={() => {
        pointerStartRef.current = null;
      }}
      onPointerDown={(event) => {
        pointerStartRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }}
      onPointerUp={(event) => {
        handlePointerEnd(event.clientX, event.clientY);
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${activeCutIndex * 100}%)`,
          }}
        >
          {cuts.map((cut) => {
            const slotNumber = cut.slotNumber.toString().padStart(2, "0");

            return (
              <div
                className="relative h-full w-full shrink-0 bg-black"
                key={`${report.reportId}-${cut.slotNumber}-${cut.imageUrl}`}
              >
                <Image
                  alt={`${title} ${copy.slot(slotNumber)}`}
                  className={
                    isNsfw
                      ? "scale-[1.02] object-cover blur-2xl brightness-[0.42] saturate-[0.68]"
                      : "object-cover brightness-[1.14] contrast-[1.02] saturate-[1.1]"
                  }
                  fill
                  priority={index < 2 && cut.slotNumber <= 2}
                  sizes="100vw"
                  src={cut.imageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(cut.imageUrl)}
                />
              </div>
            );
          })}
        </div>
        <div className="absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-black/14 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-black/42 via-black/8 to-transparent" />
      </div>

      <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.7rem)] z-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl gap-1.5">
          {cuts.map((cut, cutIndex) => (
            <button
              aria-label={copy.slot(cut.slotNumber.toString().padStart(2, "0"))}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/24"
              key={`${report.reportId}-progress-${cut.slotNumber}`}
              onClick={() => setActiveCutIndex(cutIndex)}
              type="button"
            >
              <span
                className={`block h-full rounded-full transition-all ${
                  cutIndex <= activeCutIndex ? "bg-white" : "bg-transparent"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+5.6rem)] z-20 flex items-center justify-between gap-3 sm:left-6 sm:right-6 lg:left-8 lg:right-8">
        <div className="flex flex-wrap items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.12em]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1.5 text-black shadow-[0_14px_30px_rgba(0,0,0,0.24)]">
            <Images className="size-3.5" />
            {copy.feedTitle}
          </span>
          <span className="rounded-full border border-white/16 bg-black/34 px-3 py-1.5 text-white/78 backdrop-blur">
            {positionLabel}
          </span>
          {isNsfw ? (
            <span className="rounded-full bg-rose-600 px-3 py-1.5 text-white">
              {copy.adult}
            </span>
          ) : report.priceType === "paid" ? (
            <span className="rounded-full border border-white/16 bg-black/34 px-3 py-1.5 text-white/78 backdrop-blur">
              {copy.paid}
            </span>
          ) : null}
        </div>
        <span className="rounded-full border border-white/16 bg-black/44 px-3 py-1.5 text-[0.7rem] font-black text-white backdrop-blur">
          {activeCutLabel}
        </span>
      </div>

      <button
        aria-label={copy.previousCut}
        className="absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/18 text-white/86 backdrop-blur transition hover:bg-white hover:text-black sm:inline-flex"
        onClick={goToPreviousCut}
        type="button"
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        aria-label={copy.nextCut}
        className="absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/18 text-white/86 backdrop-blur transition hover:bg-white hover:text-black sm:inline-flex"
        onClick={goToNextCut}
        type="button"
      >
        <ChevronRight className="size-6" />
      </button>

      <div className="relative z-10 flex min-h-[100dvh] items-end px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-[calc(env(safe-area-inset-top)+7.6rem)] sm:px-6 sm:pb-7 lg:px-8">
        <section className="mx-auto flex w-full max-w-7xl flex-col justify-end">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e] drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
              {report.creatorName}
            </p>
            <h1
              className={`mt-1.5 max-w-4xl break-words text-[1.42rem] font-black leading-[1.08] tracking-normal drop-shadow-[0_3px_18px_rgba(0,0,0,0.82)] [word-break:keep-all] sm:text-[3.4rem] lg:text-[4.4rem] ${
                isNsfw ? "select-none blur-[2px]" : ""
              }`}
            >
              {title}
            </h1>
            <p
              className={`mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/82 drop-shadow-[0_2px_12px_rgba(0,0,0,0.72)] sm:text-base sm:leading-7 ${
                isNsfw ? "select-none blur-[2px]" : ""
              }`}
            >
              {report.dek}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.72rem] font-bold text-white/72 drop-shadow-[0_2px_10px_rgba(0,0,0,0.72)] sm:text-xs">
              <span>{report.reporterName}</span>
              {publishedAt ? <span>{publishedAt}</span> : null}
            </div>
          </div>

          <div className="mt-3 sm:mt-5">
            <SourceRevealMiniVote
              connectHref={sourceRevealConnectHref}
              copy={copy}
              endpoint={sourceRevealEndpoint}
              initialState={item.sourceReveal}
              locale={locale}
              reportId={report.reportId}
            />
            <div className="mt-2 grid max-w-[30rem] grid-cols-2 gap-2 sm:flex">
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/24 px-4 text-[0.72rem] font-black !text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-white hover:!text-[#111510] sm:h-11 sm:text-xs"
                href={characterHref}
              >
                <Sparkles className="size-4 text-[#44f26e]" />
                {copy.character}
              </Link>
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/24 px-4 text-[0.72rem] font-black !text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-white hover:!text-[#111510] sm:h-11 sm:text-xs"
                href={reporterHref}
              >
                <PenLine className="size-4 text-[#44f26e]" />
                {copy.reporter}
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 sm:hidden">
            {cuts.map((cut, cutIndex) => (
              <button
                aria-label={copy.slot(cut.slotNumber.toString().padStart(2, "0"))}
                className={`size-1.5 rounded-full transition ${
                  cutIndex === activeCutIndex ? "bg-white" : "bg-white/34"
                }`}
                key={`${report.reportId}-dot-${cut.slotNumber}`}
                onClick={() => setActiveCutIndex(cutIndex)}
                type="button"
              />
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}

function mergePublicCutItems(
  previousItems: SerializedFanletterNewsPublicCutFeedItem[],
  nextItems: SerializedFanletterNewsPublicCutFeedItem[],
) {
  const seenReportIds = new Set(
    previousItems.map((item) => item.report.reportId),
  );
  const mergedItems = [...previousItems];

  for (const item of nextItems) {
    if (seenReportIds.has(item.report.reportId)) {
      continue;
    }

    seenReportIds.add(item.report.reportId);
    mergedItems.push(item);
  }

  return mergedItems;
}

export function FanletterNewsPublicCutsFeedPage({
  excludeReportId = null,
  hasMore: initialHasMore,
  items: initialItems,
  locale,
  nextOffset: initialNextOffset,
  referralCode,
}: {
  excludeReportId?: string | null;
  hasMore: boolean;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  locale: Locale;
  nextOffset: number;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        limit: String(FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE),
        locale,
        offset: String(nextOffset),
      });

      if (excludeReportId) {
        params.set("excludeReportId", excludeReportId);
      }

      const response = await fetch(`/api/fanletter/news-cuts?${params}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(copy.loadError);
      }

      const data = (await response.json()) as FanletterNewsPublicCutFeedLoadResponse;

      setItems((currentItems) =>
        mergePublicCutItems(currentItems, data.items),
      );
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      setLoadError(copy.loadError);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    copy.loadError,
    excludeReportId,
    hasMore,
    isLoadingMore,
    locale,
    nextOffset,
  ]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const sentinel = loadMoreRef.current;
    const root = scrollContainerRef.current;

    if (!sentinel || !root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        root,
        rootMargin: "1400px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#050706] px-4 text-white">
        <section className="max-w-lg rounded-2xl border border-white/12 bg-white/8 p-6 text-center shadow-2xl backdrop-blur-xl">
          <UserRound className="mx-auto size-10 text-[#44f26e]" />
          <h1 className="mt-4 text-2xl font-black tracking-normal [word-break:keep-all]">
            {copy.emptyTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
            {copy.emptyBody}
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510]"
            href={newsHomeHref}
          >
            <ArrowLeft className="size-4" />
            {copy.emptyCta}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#050706] text-white">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/34 px-3 py-3 text-white backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white hover:text-[#111510]"
            href={newsHomeHref}
            title={copy.home}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.eyebrow}
            </p>
            <h1 className="truncate text-sm font-black sm:text-base">
              {copy.title}
            </h1>
          </div>
          <div className="hidden min-w-40 justify-end text-right text-[0.68rem] font-bold text-white/54 sm:block">
            {copy.instruction}
          </div>
          <div className="size-11 shrink-0 sm:hidden" aria-hidden="true" />
        </div>
      </header>
      <div
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
        ref={scrollContainerRef}
      >
        {items.map((item, index) => (
          <FeedSlide
            hasMore={hasMore}
            index={index}
            item={item}
            itemCount={items.length}
            key={item.report.reportId}
            locale={locale}
            referralCode={referralCode}
          />
        ))}
        <section
          className="flex min-h-[48dvh] snap-start items-center justify-center px-4 py-10 text-center"
          ref={loadMoreRef}
        >
          <div className="max-w-sm rounded-2xl border border-white/12 bg-white/8 p-5 shadow-2xl backdrop-blur-xl">
            <Images className="mx-auto size-8 text-[#44f26e]" />
            <p className="mt-3 text-sm font-black text-white">
              {isLoadingMore
                ? copy.loadingMore
                : loadError
                  ? copy.loadError
                  : hasMore
                    ? copy.loadingMore
                    : copy.noMore}
            </p>
            {loadError ? (
              <button
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#44f26e] px-4 text-xs font-black text-[#111510]"
                onClick={() => void loadMore()}
                type="button"
              >
                {copy.loadMore}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
