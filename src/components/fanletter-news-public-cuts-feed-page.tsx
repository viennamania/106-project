"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Images,
  Loader2,
  LockKeyhole,
  PenLine,
  PlayCircle,
  Share2,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { FanletterResponsiveMediaFrame } from "@/components/fanletter-responsive-media-frame";
import { useMemberSession } from "@/components/member-session-provider";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE,
  type FanletterNewsPublicCutFeedLoadResponse,
  type FanletterNewsPublicCutSource,
  type FanletterNewsPublicCutSourceLoadResponse,
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
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral, setPathSearchParams } from "@/lib/landing-branding";
import { createShareId, setShareIdOnHref } from "@/lib/share-tracking";

const DOUBLE_TAP_DELAY_MS = 320;
const DOUBLE_TAP_MOVE_TOLERANCE_PX = 14;
const DOUBLE_TAP_DISTANCE_TOLERANCE_PX = 48;
const DOUBLE_TAP_FEEDBACK_MS = 920;
const CUT_SWIPE_GUIDE_DISMISS_SCROLL_RATIO = 0.45;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        adult: "성인 팬 전용",
        character: "캐릭터",
        doubleTapDone: "참여 완료",
        doubleTapLogin: "로그인 필요",
        doubleTapOpen: "원본 공개 완료",
        doubleTapWant: "보고싶어요",
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
        openSourceDetail: "원본 상세",
        paid: "팬 전용 원본",
        paidSourceBody:
          "이 원본은 유료 팬 전용입니다. 구매 단계는 안전하게 상세 화면에서 이어집니다.",
        paidSourceTitle: "구매 후 원본을 볼 수 있습니다.",
        previousCut: "이전 컷",
        reporter: "팬 기자",
        retry: "다시 시도",
        share: "공유하기",
        shareCopied: "링크 복사됨",
        shareError: "공유 실패",
        shareSharing: "공유 중",
        shareSummary: (headline: string, reporterName: string) =>
          `팬 기자 ${reporterName}가 고른 ${headline} 4컷을 확인해보세요.`,
        shareTitle: (headline: string) => `팬 기자가 편집한 4컷: ${headline}`,
        slot: (index: string) => `컷 ${index}`,
        sourceOpen: "팬 오픈 투표",
        sourceOpenCompleteSummary: (count: string, threshold: string) =>
          `${count}/${threshold}명 참여 완료`,
        sourceOpenDone: "원본 공개 완료",
        sourceOpenStatus: (
          count: string,
          threshold: string,
          remaining: string,
        ) => `${count}/${threshold} 참여 · ${remaining}명 남음`,
        sourceOverlayClose: "원본 닫기",
        sourceOverlayError: "원본을 불러오지 못했습니다.",
        sourceOverlayLoading: "원본 불러오는 중",
        sourceOverlayTitle: "원본 브이로그",
        sourceRevealLockedBody: (
          count: string,
          threshold: string,
          remaining: string,
        ) =>
          `${count}/${threshold}명이 참여했습니다. ${remaining}명이 더 보고싶어요를 누르면 피드에서 바로 열립니다.`,
        sourceRevealLockedTitle: "아직 원본 공개 전입니다.",
        sourceView: "원본 보기",
        swipeGuide: "좌우로 넘겨 4컷 보기",
        unavailableSourceBody:
          "이 원본은 현재 피드 안에서 바로 재생할 수 없습니다. 상세 화면에서 상태를 확인하세요.",
        unavailableSourceTitle: "원본을 바로 열 수 없습니다.",
        unlockNsfwBody:
          "NSFW 원본은 보기 설정 또는 지갑 PIN 확인 후 재생됩니다.",
        unlockNsfwTitle: "NSFW 원본 보호 중",
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
        doubleTapDone: "Joined",
        doubleTapLogin: "Log in required",
        doubleTapOpen: "Source open",
        doubleTapWant: "Want it",
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
        openSourceDetail: "Source detail",
        paid: "Fan-only source",
        paidSourceBody:
          "This source is fan-only paid content. Continue securely on the detail screen.",
        paidSourceTitle: "Unlock purchase to watch the source.",
        previousCut: "Previous cut",
        reporter: "Fan reporter",
        retry: "Retry",
        share: "Share",
        shareCopied: "Link copied",
        shareError: "Share failed",
        shareSharing: "Sharing",
        shareSummary: (headline: string, reporterName: string) =>
          `See the four cuts ${reporterName} selected for ${headline}.`,
        shareTitle: (headline: string) => `Four cuts edited by a fan reporter: ${headline}`,
        slot: (index: string) => `Cut ${index}`,
        sourceOpen: "Fan-open vote",
        sourceOpenCompleteSummary: (count: string, threshold: string) =>
          `${count}/${threshold} joined`,
        sourceOpenDone: "Source open",
        sourceOpenStatus: (
          count: string,
          threshold: string,
          remaining: string,
        ) => `${count}/${threshold} joined · ${remaining} left`,
        sourceOverlayClose: "Close source",
        sourceOverlayError: "Could not load the source.",
        sourceOverlayLoading: "Loading source",
        sourceOverlayTitle: "Source vlog",
        sourceRevealLockedBody: (
          count: string,
          threshold: string,
          remaining: string,
        ) =>
          `${count}/${threshold} fans joined. ${remaining} more want-it votes open the source in this feed.`,
        sourceRevealLockedTitle: "The source is not open yet.",
        sourceView: "View source",
        swipeGuide: "Swipe sideways for 4 cuts",
        unavailableSourceBody:
          "This source cannot play directly in the feed right now. Check the detail screen for status.",
        unavailableSourceTitle: "Source cannot open here.",
        unlockNsfwBody:
          "NSFW sources play after enabling viewing or confirming the wallet PIN.",
        unlockNsfwTitle: "NSFW source protected",
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

function getDistance({
  endX,
  endY,
  startX,
  startY,
}: {
  endX: number;
  endY: number;
  startX: number;
  startY: number;
}) {
  return Math.hypot(endX - startX, endY - startY);
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a,button,input,textarea,select,label,[role='button'],[role='link']",
      ),
    )
  );
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
  | "sourceOpenCompleteSummary"
  | "sourceOpenDone"
  | "sourceOpenStatus"
  | "sourceView"
  | "voteCta"
  | "voteDone"
  | "voteFailed"
  | "voteLogin"
  | "voteSaving"
>;

type SourceRevealResponse = {
  sourceReveal: FanletterNewsSourceRevealState;
};

type ShareState = "copied" | "error" | "idle" | "sharing";

type SourceRevealTapFeedback = {
  id: number;
  label: string;
};

function isSourceRevealResponse(value: unknown): value is SourceRevealResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "sourceReveal" in value &&
    typeof (value as SourceRevealResponse).sourceReveal?.count === "number"
  );
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {}
  }

  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function CutFeedShareButton({
  copy,
  href,
  previewImageKind,
  referralCode,
  reportId,
  shareSummary,
  shareTitle,
}: {
  copy: Pick<
    ReturnType<typeof getCopy>,
    "share" | "shareCopied" | "shareError" | "shareSharing"
  >;
  href: string;
  previewImageKind: "cover" | "leadCut";
  referralCode: string | null;
  reportId: string;
  shareSummary: string;
  shareTitle: string;
}) {
  const [state, setState] = useState<ShareState>("idle");

  useEffect(() => {
    if (state !== "copied" && state !== "error") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setState("idle");
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [state]);

  const handleShare = useCallback(async () => {
    const nextShareId = createShareId("newscut");
    const absoluteHref = new URL(href, window.location.origin).toString();
    const shareUrl = setShareIdOnHref(absoluteHref, nextShareId);

    trackFunnelEvent("share_click", {
      metadata: {
        previewImageKind,
        reportId,
        source: "fanletter-news-cut-feed",
      },
      referralCode,
      shareId: nextShareId,
      targetHref: shareUrl,
    });

    if (typeof navigator.share === "function") {
      setState("sharing");

      try {
        await navigator.share({
          text: shareSummary,
          title: shareTitle,
          url: shareUrl,
        });
        setState("idle");
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          setState("idle");
          return;
        }
      }
    }

    try {
      await copyToClipboard(shareUrl);
      setState("copied");
    } catch {
      setState("error");
    }
  }, [
    href,
    previewImageKind,
    referralCode,
    reportId,
    shareSummary,
    shareTitle,
  ]);

  const label =
    state === "copied"
      ? copy.shareCopied
      : state === "error"
        ? copy.shareError
        : state === "sharing"
          ? copy.shareSharing
          : copy.share;
  const isCopied = state === "copied";

  return (
    <button
      aria-label={label}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur transition hover:bg-white hover:text-[#111510] disabled:cursor-wait disabled:opacity-80 ${
        isCopied
          ? "border-[#44f26e]/50 bg-[#44f26e] !text-[#101510]"
          : "border-white/16 bg-black/44"
      }`}
      disabled={state === "sharing"}
      onClick={() => {
        void handleShare();
      }}
      title={label}
      type="button"
    >
      {state === "sharing" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isCopied ? (
        <Check className="size-4" />
      ) : (
        <Share2 className="size-4" />
      )}
    </button>
  );
}

function SourceRevealMiniVote({
  authNudge,
  connectHref,
  copy,
  error,
  isLoggedIn,
  isSaving,
  locale,
  onOpenSource,
  onVote,
  sourceVlogHref,
  state,
}: {
  authNudge: boolean;
  connectHref: string;
  copy: SourceRevealMiniVoteCopy;
  error: string | null;
  isLoggedIn: boolean;
  isSaving: boolean;
  locale: Locale;
  onOpenSource?: () => void;
  onVote: () => void;
  sourceVlogHref: string | null;
  state: FanletterNewsSourceRevealState;
}) {
  const remaining = Math.max(0, state.threshold - state.count);
  const progressPercent =
    state.threshold > 0
      ? Math.min(100, Math.max(0, (state.count / state.threshold) * 100))
      : 100;
  const countLabel = formatNumber(state.count, locale);
  const thresholdLabel = formatNumber(state.threshold, locale);
  const remainingLabel = formatNumber(remaining, locale);
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
  const buttonClassName =
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[0.66rem] font-black transition";
  const disabledButtonClassName =
    "bg-white/12 text-white/62 ring-1 ring-white/10";

  if (state.unlocked) {
    const content = (
      <>
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/18 text-[#44f26e] ring-1 ring-[#44f26e]/22 transition group-hover:bg-[#101510] group-hover:text-[#44f26e]">
          <CheckCircle2 className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#9bffad] transition group-hover:text-[#0b3518]">
            {copy.sourceOpenDone}
          </span>
          <span className="block truncate text-[0.72rem] font-black text-white/86 transition group-hover:text-[#101510]">
            {copy.sourceOpenCompleteSummary(countLabel, thresholdLabel)}
          </span>
        </span>
        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 text-[0.68rem] font-black text-white transition group-hover:bg-[#101510] group-hover:text-white">
          <PlayCircle className="size-3.5" />
          {copy.sourceView}
        </span>
      </>
    );

    return (
      <div className="mt-2 max-w-[30rem]">
        {sourceVlogHref && onOpenSource ? (
          <button
            className="group inline-flex h-11 w-full items-center gap-2.5 rounded-full border border-[#44f26e]/28 bg-black/34 px-3 text-white shadow-[0_10px_26px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:border-[#44f26e]/60 hover:bg-[#44f26e] hover:!text-[#101510]"
            onClick={onOpenSource}
            type="button"
          >
            {content}
          </button>
        ) : sourceVlogHref ? (
          <Link
            className="group inline-flex h-11 w-full items-center gap-2.5 rounded-full border border-[#44f26e]/28 bg-black/34 px-3 text-white shadow-[0_10px_26px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:border-[#44f26e]/60 hover:bg-[#44f26e] hover:!text-[#101510]"
            href={sourceVlogHref}
          >
            {content}
          </Link>
        ) : (
          <div className="inline-flex h-11 w-full items-center gap-2.5 rounded-full border border-[#44f26e]/18 bg-black/24 px-3 text-white/74 shadow-[0_10px_26px_rgba(0,0,0,0.14)] backdrop-blur-md">
            {content}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`mt-3 max-w-[30rem] rounded-[1.05rem] border border-white/12 bg-black/30 p-2.5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition ${
        authNudge
          ? "scale-[1.015] border-[#44f26e]/55 ring-2 ring-[#44f26e]/28"
          : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/16 text-[#44f26e] ring-1 ring-[#44f26e]/20">
          {state.unlocked ? (
            <CheckCircle2 className="size-4.5" />
          ) : (
            <LockKeyhole className="size-4.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
            {copy.sourceOpen}
          </p>
          <p className="truncate text-[0.72rem] font-black text-white/88">
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
            onClick={onVote}
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

type SourceOverlayCopy = Pick<
  ReturnType<typeof getCopy>,
  | "adult"
  | "openSourceDetail"
  | "paidSourceBody"
  | "paidSourceTitle"
  | "retry"
  | "sourceOverlayClose"
  | "sourceOverlayError"
  | "sourceOverlayLoading"
  | "sourceOverlayTitle"
  | "sourceRevealLockedBody"
  | "sourceRevealLockedTitle"
  | "unavailableSourceBody"
  | "unavailableSourceTitle"
  | "unlockNsfwBody"
  | "unlockNsfwTitle"
>;

function isFanletterNewsPublicCutSourceLoadResponse(
  value: unknown,
): value is FanletterNewsPublicCutSourceLoadResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "source" in value &&
    typeof (value as FanletterNewsPublicCutSourceLoadResponse).source
      ?.contentId === "string"
  );
}

function getSourceOverlayLockedCopy({
  copy,
  locale,
  source,
}: {
  copy: SourceOverlayCopy;
  locale: Locale;
  source: FanletterNewsPublicCutSource;
}) {
  if (source.accessState === "source_reveal_locked") {
    const countLabel = formatNumber(source.sourceReveal.count, locale);
    const thresholdLabel = formatNumber(source.sourceReveal.threshold, locale);
    const remainingLabel = formatNumber(
      Math.max(0, source.sourceReveal.threshold - source.sourceReveal.count),
      locale,
    );

    return {
      body: copy.sourceRevealLockedBody(
        countLabel,
        thresholdLabel,
        remainingLabel,
      ),
      title: copy.sourceRevealLockedTitle,
    };
  }

  if (source.accessState === "paid_locked") {
    return {
      body: copy.paidSourceBody,
      title: copy.paidSourceTitle,
    };
  }

  if (source.accessState === "nsfw_opt_in_required") {
    return {
      body: copy.unlockNsfwBody,
      title: copy.unlockNsfwTitle,
    };
  }

  return {
    body: copy.unavailableSourceBody,
    title: copy.unavailableSourceTitle,
  };
}

function SourceVlogFeedOverlay({
  copy,
  error,
  isLoading,
  locale,
  onClose,
  onRetry,
  source,
}: {
  copy: SourceOverlayCopy;
  error: string | null;
  isLoading: boolean;
  locale: Locale;
  onClose: () => void;
  onRetry: () => void;
  source: FanletterNewsPublicCutSource | null;
}) {
  const isPlayable = source?.accessState === "playable" && Boolean(source.videoUrl);
  const shouldUsePinGate =
    isPlayable &&
    source?.contentMaturityRating === "nsfw";
  const lockedCopy = source
    ? getSourceOverlayLockedCopy({ copy, locale, source })
    : null;
  const paidUnlockHref =
    source?.accessState === "paid_locked" ? source.paidUnlockHref : null;

  return (
    <div
      aria-modal="true"
      className="absolute inset-0 z-50 flex flex-col bg-[#050706] text-white"
      role="dialog"
    >
      <div className="flex h-[4.35rem] shrink-0 items-center gap-3 border-b border-white/10 bg-[linear-gradient(90deg,rgba(5,7,6,0.96),rgba(13,24,16,0.92)_58%,rgba(5,7,6,0.96))] px-3 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <button
          aria-label={copy.sourceOverlayClose}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition hover:bg-white hover:text-[#111510]"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#44f26e]/24 bg-[#44f26e]/14 text-[#44f26e] shadow-[0_12px_30px_rgba(68,242,110,0.12)]">
          <PlayCircle className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.sourceOverlayTitle}
            </p>
            {source?.contentMaturityRating === "nsfw" ? (
              <span className="shrink-0 rounded-full bg-rose-500/90 px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-[0.1em] text-white">
                {copy.adult}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 truncate text-base font-black leading-tight tracking-normal">
            {source?.title ?? copy.sourceOverlayLoading}
          </h2>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {isLoading ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 px-5 text-center">
            <Loader2 className="size-8 animate-spin text-[#44f26e]" />
            <p className="text-sm font-black text-white/78">
              {copy.sourceOverlayLoading}
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-full items-center justify-center px-5 text-center">
            <div className="max-w-xs rounded-2xl border border-white/12 bg-white/8 p-5 shadow-2xl backdrop-blur-xl">
              <AlertTriangle className="mx-auto size-8 text-rose-300" />
              <p className="mt-3 text-base font-black">
                {copy.sourceOverlayError}
              </p>
              <button
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#44f26e] px-4 text-xs font-black text-[#111510]"
                onClick={onRetry}
                type="button"
              >
                {copy.retry}
              </button>
            </div>
          </div>
        ) : source ? (
          <div className="flex min-h-full flex-col">
            <div className="relative flex min-h-0 flex-1 items-center bg-black">
              <FanletterResponsiveMediaFrame
                alt={source.title}
                blurred={source.accessState === "nsfw_opt_in_required"}
                className="!max-w-full"
                deferVideoUntilInteraction={Boolean(source.previewVideoUrl)}
                eager
                imageUrl={source.coverImageUrl}
                mediaType={source.mediaType}
                nsfwPinGate={
                  shouldUsePinGate
                    ? {
                        connectHref: source.connectHref,
                        enabled: true,
                        locale,
                        managePinHref: source.pinUnlockHref,
                        teaserBlurred: true,
                      }
                    : undefined
                }
                playButtonLabel={copy.sourceOverlayTitle}
                previewVideoUrl={source.previewVideoUrl}
                title={source.title}
                videoUrl={source.videoUrl}
              >
                {!isPlayable && lockedCopy ? (
                  <div className="absolute inset-0 flex items-end bg-[linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.46)_42%,rgba(0,0,0,0.88))] px-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-4 sm:p-4">
                    <div className="w-full rounded-2xl border border-white/14 bg-black/62 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/16 text-[#44f26e] ring-1 ring-[#44f26e]/20">
                          {source.accessState === "paid_locked" ? (
                            <LockKeyhole className="size-5" />
                          ) : source.accessState === "nsfw_opt_in_required" ? (
                            <AlertTriangle className="size-5" />
                          ) : (
                            <HeartHandshake className="size-5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black leading-tight [word-break:keep-all]">
                            {lockedCopy.title}
                          </h3>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/68 [word-break:keep-all]">
                            {lockedCopy.body}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {paidUnlockHref ? (
                          <Link
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-[#111510]"
                            href={paidUnlockHref}
                          >
                            <LockKeyhole className="size-4" />
                            {copy.openSourceDetail}
                          </Link>
                        ) : null}
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 text-xs font-black !text-white"
                          href={source.detailHref}
                        >
                          <ExternalLink className="size-3.5" />
                          {copy.openSourceDetail}
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
              </FanletterResponsiveMediaFrame>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#080c09] px-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-4 sm:p-4">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
                {source.authorName}
              </p>
              <h3 className="mt-1 line-clamp-2 text-xl font-black leading-tight [word-break:keep-all]">
                {source.title}
              </h3>
              {source.summary ? (
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/58 [word-break:keep-all]">
                  {source.summary}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeedSlide({
  hasMore,
  index,
  item,
  itemCount,
  locale,
  onDismissSwipeGuide,
  referralCode,
  showSwipeGuide = false,
}: {
  hasMore: boolean;
  index: number;
  item: SerializedFanletterNewsPublicCutFeedItem;
  itemCount: number;
  locale: Locale;
  onDismissSwipeGuide?: () => void;
  referralCode: string | null;
  showSwipeGuide?: boolean;
}) {
  const [activeCutIndex, setActiveCutIndex] = useState(0);
  const [sourceRevealState, setSourceRevealState] = useState(item.sourceReveal);
  const [isSourceRevealSaving, setIsSourceRevealSaving] = useState(false);
  const [sourceRevealError, setSourceRevealError] = useState<string | null>(null);
  const [tapFeedback, setTapFeedback] =
    useState<SourceRevealTapFeedback | null>(null);
  const [authNudge, setAuthNudge] = useState(false);
  const [sourceOverlayOpen, setSourceOverlayOpen] = useState(false);
  const [sourceOverlaySource, setSourceOverlaySource] =
    useState<FanletterNewsPublicCutSource | null>(null);
  const [sourceOverlayError, setSourceOverlayError] = useState<string | null>(
    null,
  );
  const [isSourceOverlayLoading, setIsSourceOverlayLoading] = useState(false);
  const memberSession = useMemberSession();
  const pointerStartRef = useRef<{
    target: EventTarget | null;
    x: number;
    y: number;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const tapFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const authNudgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceOverlayHistoryPushedRef = useRef(false);
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
  const sourceContentId =
    typeof report.contentId === "string" ? report.contentId.trim() : "";
  const sourceVlogHref = sourceContentId
    ? setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/fanletter/news/vlogs/${sourceContentId}`,
          referralCode,
        ),
        {
          returnTo: cutFeedHref,
        },
      )
    : null;
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
  const isSourceRevealLoggedIn =
    Boolean(memberSession.email) || sourceRevealState.requestedByViewer;
  const cuts = item.cuts.length > 0 ? item.cuts : [item.leadCut];
  const cutCount = cuts.length;
  const activeCutLabel = `${formatNumber(activeCutIndex + 1, locale)} / ${formatNumber(cutCount, locale)}`;
  const sharePreviewImageKind = report.coverImageUrl ? "cover" : "leadCut";
  const shareTitle = copy.shareTitle(title);
  const shareSummary = copy.shareSummary(title, report.reporterName);

  const loadSourceOverlay = useCallback(async () => {
    if (!sourceContentId) {
      setSourceOverlayError(copy.sourceOverlayError);
      return;
    }

    setIsSourceOverlayLoading(true);
    setSourceOverlayError(null);

    try {
      const params = new URLSearchParams({
        contentId: sourceContentId,
        locale,
        returnTo: cutFeedHref,
      });

      if (referralCode) {
        params.set("ref", referralCode);
      }

      const response = await fetch(`/api/fanletter/news-cuts/source?${params}`, {
        headers: {
          Accept: "application/json",
        },
      });
      const data = (await response.json()) as unknown;

      if (!response.ok || !isFanletterNewsPublicCutSourceLoadResponse(data)) {
        throw new Error(copy.sourceOverlayError);
      }

      setSourceOverlaySource(data.source);
    } catch {
      setSourceOverlayError(copy.sourceOverlayError);
    } finally {
      setIsSourceOverlayLoading(false);
    }
  }, [copy.sourceOverlayError, cutFeedHref, locale, referralCode, sourceContentId]);

  const openSourceOverlay = useCallback(() => {
    if (!sourceContentId) {
      return;
    }

    setSourceOverlayOpen(true);

    if (!sourceOverlayHistoryPushedRef.current) {
      const url = new URL(window.location.href);

      url.searchParams.set("source", sourceContentId);
      window.history.pushState(
        {
          ...(typeof window.history.state === "object" &&
          window.history.state !== null
            ? window.history.state
            : {}),
          fanletterNewsCutSource: report.reportId,
        },
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      sourceOverlayHistoryPushedRef.current = true;
    }

    if (!sourceOverlaySource && !isSourceOverlayLoading) {
      void loadSourceOverlay();
    }
  }, [
    isSourceOverlayLoading,
    loadSourceOverlay,
    report.reportId,
    sourceContentId,
    sourceOverlaySource,
  ]);

  const closeSourceOverlay = useCallback(() => {
    if (sourceOverlayHistoryPushedRef.current) {
      window.history.back();
      return;
    }

    setSourceOverlayOpen(false);
  }, []);

  useEffect(() => {
    setSourceRevealState(item.sourceReveal);
    setSourceRevealError(null);
  }, [item.sourceReveal]);

  useEffect(() => {
    return () => {
      if (tapFeedbackTimeoutRef.current) {
        clearTimeout(tapFeedbackTimeoutRef.current);
      }

      if (authNudgeTimeoutRef.current) {
        clearTimeout(authNudgeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sourceOverlayOpen) {
      return;
    }

    const handlePopState = () => {
      sourceOverlayHistoryPushedRef.current = false;
      setSourceOverlayOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [sourceOverlayOpen]);

  const showTapFeedback = useCallback((label: string) => {
    const id = Date.now();

    if (tapFeedbackTimeoutRef.current) {
      clearTimeout(tapFeedbackTimeoutRef.current);
    }

    setTapFeedback({ id, label });
    tapFeedbackTimeoutRef.current = setTimeout(() => {
      setTapFeedback((currentFeedback) =>
        currentFeedback?.id === id ? null : currentFeedback,
      );
    }, DOUBLE_TAP_FEEDBACK_MS);
  }, []);

  const nudgeLoginVote = useCallback(() => {
    if (authNudgeTimeoutRef.current) {
      clearTimeout(authNudgeTimeoutRef.current);
    }

    setAuthNudge(true);
    authNudgeTimeoutRef.current = setTimeout(() => {
      setAuthNudge(false);
    }, DOUBLE_TAP_FEEDBACK_MS);
  }, []);

  const updateSourceReveal = useCallback(
    (nextState: FanletterNewsSourceRevealState) => {
      setSourceRevealState(nextState);
      window.dispatchEvent(
        new CustomEvent<FanletterNewsSourceRevealStateChangeDetail>(
          FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
          {
            detail: {
              endpoint: sourceRevealEndpoint,
              reportId: report.reportId,
              state: nextState,
            },
          },
        ),
      );
    },
    [report.reportId, sourceRevealEndpoint],
  );

  const submitSourceRevealVote = useCallback(async () => {
    if (
      isSourceRevealSaving ||
      sourceRevealState.requestedByViewer ||
      sourceRevealState.unlocked
    ) {
      return false;
    }

    if (!isSourceRevealLoggedIn) {
      nudgeLoginVote();
      return false;
    }

    setIsSourceRevealSaving(true);
    setSourceRevealError(null);

    try {
      const response = await fetch(sourceRevealEndpoint, {
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
      return true;
    } catch {
      setSourceRevealError(copy.voteFailed);
      return false;
    } finally {
      setIsSourceRevealSaving(false);
    }
  }, [
    copy.voteFailed,
    isSourceRevealLoggedIn,
    isSourceRevealSaving,
    nudgeLoginVote,
    sourceRevealEndpoint,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    updateSourceReveal,
  ]);

  const handleSourceRevealDoubleTap = useCallback(() => {
    if (sourceRevealState.unlocked) {
      showTapFeedback(copy.doubleTapOpen);
      return;
    }

    if (sourceRevealState.requestedByViewer) {
      showTapFeedback(copy.doubleTapDone);
      return;
    }

    if (!isSourceRevealLoggedIn) {
      showTapFeedback(copy.doubleTapLogin);
      nudgeLoginVote();
      return;
    }

    showTapFeedback(copy.doubleTapWant);
    void submitSourceRevealVote();
  }, [
    copy.doubleTapDone,
    copy.doubleTapLogin,
    copy.doubleTapOpen,
    copy.doubleTapWant,
    isSourceRevealLoggedIn,
    nudgeLoginVote,
    showTapFeedback,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    submitSourceRevealVote,
  ]);
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
    (event: ReactPointerEvent<HTMLElement>) => {
      const pointerStart = pointerStartRef.current;

      pointerStartRef.current = null;

      if (!pointerStart) {
        return;
      }

      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      const travelDistance = getDistance({
        endX: event.clientX,
        endY: event.clientY,
        startX: pointerStart.x,
        startY: pointerStart.y,
      });

      if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) >= Math.abs(deltaY) * 1.1) {
        lastTapRef.current = null;
        onDismissSwipeGuide?.();

        if (deltaX > 0) {
          goToPreviousCut();
        } else {
          goToNextCut();
        }

        return;
      }

      if (
        travelDistance > DOUBLE_TAP_MOVE_TOLERANCE_PX ||
        event.pointerType === "mouse" ||
        isInteractiveTarget(pointerStart.target) ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      const now = window.performance.now();
      const previousTap = lastTapRef.current;

      if (
        previousTap &&
        now - previousTap.time <= DOUBLE_TAP_DELAY_MS &&
        getDistance({
          endX: event.clientX,
          endY: event.clientY,
          startX: previousTap.x,
          startY: previousTap.y,
        }) <= DOUBLE_TAP_DISTANCE_TOLERANCE_PX
      ) {
        lastTapRef.current = null;
        handleSourceRevealDoubleTap();
        return;
      }

      lastTapRef.current = {
        time: now,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [goToNextCut, goToPreviousCut, handleSourceRevealDoubleTap, onDismissSwipeGuide],
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
          target: event.target,
          x: event.clientX,
          y: event.clientY,
        };
      }}
      onPointerUp={(event) => {
        handlePointerEnd(event);
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
                  sizes="(min-width: 640px) 430px, 100vw"
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

      <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.7rem)] z-20 px-4">
        <div className="mx-auto flex w-full gap-1.5">
          {cuts.map((cut, cutIndex) => (
            <button
              aria-label={copy.slot(cut.slotNumber.toString().padStart(2, "0"))}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/24"
              key={`${report.reportId}-progress-${cut.slotNumber}`}
              onClick={() => {
                onDismissSwipeGuide?.();
                setActiveCutIndex(cutIndex);
              }}
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

      <div className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+5.6rem)] z-20 flex items-center justify-between gap-3">
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
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-white/16 bg-black/44 px-3 py-1.5 text-[0.7rem] font-black text-white backdrop-blur">
            {activeCutLabel}
          </span>
          <CutFeedShareButton
            copy={copy}
            href={cutFeedHref}
            previewImageKind={sharePreviewImageKind}
            referralCode={referralCode}
            reportId={report.reportId}
            shareSummary={shareSummary}
            shareTitle={shareTitle}
          />
        </div>
      </div>

      {showSwipeGuide && cutCount > 1 ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-[39%] z-30 w-[18.5rem] max-w-[calc(100%_-_2rem)] -translate-x-1/2 rounded-2xl border border-white/14 bg-black/58 px-4 py-3 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl"
          role="status"
        >
          <div className="mx-auto flex items-center justify-center gap-2 text-[#9bffad]">
            <ChevronLeft className="size-4" />
            <span className="relative h-9 w-20 rounded-full border border-[#44f26e]/28 bg-[#44f26e]/10">
              <span className="fanletter-cut-swipe-guide-thumb absolute left-1/2 top-1/2 inline-flex size-9 items-center justify-center rounded-full bg-[#44f26e] text-black shadow-[0_12px_28px_rgba(68,242,110,0.26)]">
                <Images className="size-4" />
              </span>
            </span>
            <ChevronRight className="size-4" />
          </div>
          <p className="mt-2 text-sm font-black tracking-normal [word-break:keep-all]">
            {copy.swipeGuide}
          </p>
        </div>
      ) : null}

      <button
        aria-label={copy.previousCut}
        className="absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/18 text-white/86 backdrop-blur transition hover:bg-white hover:text-black"
        onClick={goToPreviousCut}
        type="button"
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        aria-label={copy.nextCut}
        className="absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/18 text-white/86 backdrop-blur transition hover:bg-white hover:text-black"
        onClick={goToNextCut}
        type="button"
      >
        <ChevronRight className="size-6" />
      </button>

      {tapFeedback ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
          key={tapFeedback.id}
        >
          <div className="relative flex flex-col items-center justify-center">
            <span className="absolute size-28 rounded-full bg-[#44f26e]/22 animate-ping" />
            <div className="relative flex size-24 animate-[bounce_760ms_ease-out_1] flex-col items-center justify-center rounded-full bg-black/58 text-[#44f26e] shadow-[0_24px_64px_rgba(0,0,0,0.36)] ring-2 ring-[#44f26e]/45 backdrop-blur-xl">
              <HeartHandshake className="size-9" />
              <span className="mt-1 text-[0.68rem] font-black">
                {tapFeedback.label}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-[100dvh] items-end px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-[calc(env(safe-area-inset-top)+7.6rem)]">
        <section className="mx-auto flex w-full flex-col justify-end">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e] drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
              {report.creatorName}
            </p>
            <h1
              className={`mt-1.5 max-w-4xl break-words text-[1.42rem] font-black leading-[1.08] tracking-normal drop-shadow-[0_3px_18px_rgba(0,0,0,0.82)] [word-break:keep-all] ${
                isNsfw ? "select-none blur-[2px]" : ""
              }`}
            >
              {title}
            </h1>
            <p
              className={`mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/82 drop-shadow-[0_2px_12px_rgba(0,0,0,0.72)] ${
                isNsfw ? "select-none blur-[2px]" : ""
              }`}
            >
              {report.dek}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.72rem] font-bold text-white/72 drop-shadow-[0_2px_10px_rgba(0,0,0,0.72)]">
              <span>{report.reporterName}</span>
              {publishedAt ? <span>{publishedAt}</span> : null}
            </div>
          </div>

          <div className="mt-3">
            <SourceRevealMiniVote
              authNudge={authNudge}
              connectHref={sourceRevealConnectHref}
              copy={copy}
              error={sourceRevealError}
              isLoggedIn={isSourceRevealLoggedIn}
              isSaving={isSourceRevealSaving}
              locale={locale}
              onOpenSource={sourceContentId ? openSourceOverlay : undefined}
              onVote={() => void submitSourceRevealVote()}
              sourceVlogHref={sourceVlogHref}
              state={sourceRevealState}
            />
            <div className="mt-2 grid max-w-[30rem] grid-cols-2 gap-2">
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/24 px-4 text-[0.72rem] font-black !text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-white hover:!text-[#111510]"
                href={characterHref}
              >
                <Sparkles className="size-4 text-[#44f26e]" />
                {copy.character}
              </Link>
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/24 px-4 text-[0.72rem] font-black !text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-white hover:!text-[#111510]"
                href={reporterHref}
              >
                <PenLine className="size-4 text-[#44f26e]" />
                {copy.reporter}
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5">
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
      {sourceOverlayOpen ? (
        <SourceVlogFeedOverlay
          copy={copy}
          error={sourceOverlayError}
          isLoading={isSourceOverlayLoading}
          locale={locale}
          onClose={closeSourceOverlay}
          onRetry={() => void loadSourceOverlay()}
          source={sourceOverlaySource}
        />
      ) : null}
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
  shareId,
}: {
  excludeReportId?: string | null;
  hasMore: boolean;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  locale: Locale;
  nextOffset: number;
  referralCode: string | null;
  shareId: string | null;
}) {
  const copy = getCopy(locale);
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSwipeGuide, setShowSwipeGuide] = useState(false);
  const [swipeGuideDismissed, setSwipeGuideDismissed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const headerCountLabel = hasMore
    ? `${formatNumber(items.length, locale)}+`
    : formatNumber(items.length, locale);
  const firstSlideCutCount = items[0]
    ? Math.max(items[0].cuts.length, 1)
    : 0;
  const shouldOfferSwipeGuide = Boolean(
    (shareId || excludeReportId) && firstSlideCutCount > 1,
  );
  const dismissSwipeGuide = useCallback(() => {
    setSwipeGuideDismissed(true);
    setShowSwipeGuide(false);
  }, []);
  const handleFeedScroll = useCallback(() => {
    const root = scrollContainerRef.current;

    if (!root || !showSwipeGuide) {
      return;
    }

    const dismissScrollTop = root.clientHeight * CUT_SWIPE_GUIDE_DISMISS_SCROLL_RATIO;

    if (root.scrollTop >= dismissScrollTop) {
      dismissSwipeGuide();
    }
  }, [dismissSwipeGuide, showSwipeGuide]);
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

      if (referralCode) {
        params.set("ref", referralCode);
      }

      if (shareId) {
        params.set("shareId", shareId);
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
    referralCode,
    shareId,
  ]);

  useEffect(() => {
    if (!shouldOfferSwipeGuide || swipeGuideDismissed) {
      setShowSwipeGuide(false);
      return;
    }

    setShowSwipeGuide(true);
  }, [shouldOfferSwipeGuide, swipeGuideDismissed]);

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
      <header className="fixed left-1/2 top-0 z-30 w-full max-w-[430px] -translate-x-1/2 border-b border-white/10 bg-black/30 px-3 py-3 text-white backdrop-blur-xl">
        <div className="mx-auto flex items-center gap-3">
          <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#44f26e]/24 bg-[#44f26e]/14 text-[#44f26e] shadow-[0_12px_34px_rgba(68,242,110,0.14)]">
            <Images className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.eyebrow}
            </p>
            <h1 className="truncate text-[1.02rem] font-black leading-tight tracking-normal">
              {copy.title}
            </h1>
          </div>
          <div className="shrink-0 rounded-full border border-[#44f26e]/24 bg-[#44f26e]/12 px-3 py-1.5 text-right shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-black leading-none text-white">
              {headerCountLabel}
            </p>
            <p className="mt-1 text-[0.56rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
              {copy.feedTitle}
            </p>
          </div>
        </div>
      </header>
      <div
        className="mx-auto h-full w-full max-w-[430px] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black shadow-[0_0_56px_rgba(0,0,0,0.38)] scroll-smooth sm:border-x sm:border-white/10"
        onScroll={handleFeedScroll}
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
            onDismissSwipeGuide={dismissSwipeGuide}
            referralCode={referralCode}
            showSwipeGuide={index === 0 && showSwipeGuide}
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
