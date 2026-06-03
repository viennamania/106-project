"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Compass,
  ExternalLink,
  HeartHandshake,
  Home,
  Images,
  Loader2,
  LockKeyhole,
  Menu,
  Newspaper,
  PenLine,
  PlayCircle,
  Plus,
  Share2,
  Sparkles,
  UserRound,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { FanletterResponsiveMediaFrame } from "@/components/fanletter-responsive-media-frame";
import { useMemberSession } from "@/components/member-session-provider";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM,
  FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE,
  normalizeFanletterNewsPublicCutSlotNumber,
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
import type { Dictionary, Locale } from "@/lib/i18n";
import { buildPathWithReferral, setPathSearchParams } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { createShareId, setShareIdOnHref } from "@/lib/share-tracking";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

const DOUBLE_TAP_DELAY_MS = 320;
const DOUBLE_TAP_MOVE_TOLERANCE_PX = 14;
const DOUBLE_TAP_DISTANCE_TOLERANCE_PX = 48;
const DOUBLE_TAP_FEEDBACK_MS = 920;
const CUT_SWIPE_GUIDE_DISMISS_SCROLL_RATIO = 0.45;
const CUT_FEED_HEADER_VISIBLE_MS = 2200;
const CUT_FEED_ENTRY_HEADER_VISIBLE_MS = 2800;
const CUT_FEED_LOGIN_SYNC_GRACE_MS = 4500;
const CUT_FEED_RENDER_WINDOW_RADIUS = 0;

type CutFeedViewportStyle = CSSProperties & {
  "--fanletter-cut-feed-vh"?: string;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        adult: "성인 팬 전용",
        character: "캐릭터",
        characterChannelCta: "채널 보기",
        characterCutMetric: "편집 컷",
        characterPanelClose: "캐릭터 닫기",
        characterPanelEyebrow: "AI Character IP",
        characterPanelTitle: "캐릭터 채널",
        characterSourceMetric: "원본 오픈",
        doubleTapDone: "참여 완료",
        doubleTapLogin: "로그인 필요",
        doubleTapOpen: "원본 공개 완료",
        doubleTapWant: "보고싶어요",
        emptyBody:
          "아직 공개 피드로 보여줄 리포터 편집 컷이 없습니다. 팬 기자가 티저 컷을 저장하면 이곳에 모입니다.",
        emptyCta: "뉴스룸 보기",
        emptyTitle: "리포터 컷 피드가 준비 중입니다.",
        eyebrow: "Reporter Cut Feed",
        eyebrowShort: "Cut Feed",
        feedTitle: "리포터 컷",
        home: "홈 피드",
        instruction: "위아래로 넘겨 팬 기자가 고른 4컷을 확인하세요.",
        loadError: "다음 리포터 컷을 불러오지 못했습니다.",
        loadMore: "더 보기",
        loadingMore: "다음 리포터 컷 불러오는 중",
        loginSyncFailed: "로그인 확인에 실패했습니다. 다시 시도하세요.",
        loginSyncing: "로그인 확인 중",
        loginTitle: "원본 열기 참여 로그인",
        loginUnavailable:
          "현재 브라우저에서 이메일 로그인을 시작할 수 없습니다. 잠시 후 다시 시도하세요.",
        myCharacterBadge: "내 캐릭터",
        myReportBadge: "내 리포트",
        nextCut: "다음 컷",
        noMore: "모든 리포터 컷을 확인했습니다.",
        openPaidSource: "구매하고 원본 보기",
        openSourceDetail: "원본 상세",
        paid: "팬 전용 원본",
        paidSourceBody:
          "이 원본은 유료 팬 전용입니다. 구매 단계는 안전하게 상세 화면에서 이어집니다.",
        paidSourceTitle: "구매 후 원본을 볼 수 있습니다.",
        previousCut: "이전 컷",
        reporter: "팬 기자",
        reporterChannelCta: "팬 기자 채널 보기",
        reporterCutMetric: "편집 컷",
        reporterPanelClose: "팬 기자 닫기",
        reporterPanelEyebrow: "Fan Reporter",
        reporterPanelTitle: "편집 리포터",
        reporterPublishedMetric: "발행일",
        reporterSourceMetric: "원본 오픈",
        retry: "다시 시도",
        serviceCharacters: "AI 캐릭터",
        serviceCharactersHint: "IP 채널",
        serviceHome: "홈 피드",
        serviceHomeHint: "4컷 피드",
        serviceMenu: "탐색",
        serviceMenuClose: "탐색 닫기",
        serviceMenuTitle: "FanLetter News",
        serviceMy: "마이",
        serviceMyHint: "활동·보상",
        serviceNewsroom: "뉴스룸",
        serviceNewsroomHint: "리포트 편집판",
        servicePurchases: "구매함",
        servicePurchasesHint: "팬 전용",
        serviceReportNew: "리포트 작성",
        serviceReportNewHint: "팬 기자",
        serviceReporters: "팬 기자",
        serviceReportersHint: "리포터 채널",
        serviceVlogNew: "새 브이로그",
        serviceVlogNewHint: "브이로거",
        serviceVlogs: "원본 브이로그",
        serviceVlogsHint: "공개 영상",
        share: "공유하기",
        shareCopied: "링크가 복사되었습니다",
        shareError: "공유할 수 없습니다",
        shareSharing: "공유 중",
        shareSummary: (headline: string, reporterName: string) =>
          `팬 기자 ${reporterName}가 고른 ${headline} 4컷을 확인해보세요.`,
        shareTitle: (headline: string) => `팬 기자가 편집한 4컷: ${headline}`,
        slot: (index: string) => `컷 ${index}`,
        sourceOpen: "팬 오픈 투표",
        sourceOpenCta: "원본 열기",
        sourceOpenCompleteSummary: (count: string, threshold: string) =>
          `${count}/${threshold}명 참여 완료`,
        sourceOpenDone: "원본 공개 완료",
        sourceOpenSponsors: "오픈 스폰서",
        sourceOpenSponsorsAnonymous: "익명 오픈 스폰서",
        sourceOpenSponsorsClose: "오픈 스폰서 닫기",
        sourceOpenSponsorsCompletedA11y: (count: string) =>
          `오픈 스폰서 ${count}명`,
        sourceOpenSponsorsCompletedBody:
          "이 팬들이 원본 브이로그를 공개했습니다.",
        sourceOpenSponsorsCompletedStatus: "오픈 완료",
        sourceOpenSponsorsCompletedTitle: "오픈 스폰서 6명",
        sourceOpenSponsorsEmptySlot: (position: string) =>
          `빈 오픈 스폰서 슬롯 ${position}`,
        sourceOpenSponsorsIntro:
          "6명의 오픈 스폰서가 모이면 원본 브이로그가 공개됩니다. 참여하면 선공개와 영구 크레딧을 받습니다.",
        sourceOpenSponsorsJoined: (count: string, remaining: string) =>
          `오픈 스폰서 ${count}명 참여, ${remaining}명 남음`,
        sourceOpenSponsorsListTitle: "오픈 스폰서 슬롯",
        sourceOpenSponsorsOpenA11y: (count: string, remaining: string) =>
          `오픈 스폰서 ${count}명 참여, ${remaining}명 남음`,
        sourceOpenSponsorsParticipant: (name: string) =>
          `오픈 스폰서 ${name}`,
        sourceOpenSponsorsRemaining: (remaining: string) =>
          `${remaining}명 남음`,
        sourceOpenStatus: (
          count: string,
          threshold: string,
          remaining: string,
        ) => `${count}/${threshold} 참여 · ${remaining}명 남음`,
        sourceOverlayClose: "원본 닫기",
        sourceOverlayError: "원본을 불러오지 못했습니다.",
        sourceOverlayLoading: "원본 불러오는 중",
        sourceOverlayPlay: "재생하기",
        sourceOverlayTitle: "원본 브이로그",
        sourcePreviewBody:
          "6명의 오픈 스폰서가 모이면 전체 원본 브이로그가 공개됩니다.",
        sourcePreviewEyebrow: "원본 프리뷰",
        sourcePreviewJoinCta: "오픈 스폰서로 참여",
        sourcePreviewLoginCta: "로그인하고 참여",
        sourcePreviewTitle: "프리뷰를 보고 원본 열기에 참여하세요",
        sourceRevealLockedBody: (
          count: string,
          threshold: string,
          remaining: string,
        ) =>
          `${count}/${threshold}명이 참여했습니다. ${remaining}명이 더 보고싶어요를 누르면 피드에서 바로 열립니다.`,
        sourceRevealLockedTitle: "아직 원본 공개 전입니다.",
        sourceView: "원본 보기",
        sourceViewGuideBody:
          "초록 원본 보기 버튼을 누르면 공개된 브이로그가 바로 열립니다.",
        sourceViewGuideEyebrow: "원본 공개 완료",
        sourceViewGuideTitle: "여기서 원본 보기",
        swipeGuide: (cutCount: string) => `좌우로 넘겨 ${cutCount}컷 보기`,
        unavailableSourceBody:
          "이 원본은 현재 피드 안에서 바로 재생할 수 없습니다. 상세 화면에서 상태를 확인하세요.",
        unavailableSourceTitle: "원본을 바로 열 수 없습니다.",
        unlockNsfwBody:
          "NSFW 원본은 보기 설정 또는 지갑 PIN 확인 후 재생됩니다.",
        unlockNsfwTitle: "NSFW 원본 보호 중",
        title: "팬 기자가 편집한 4컷 피드",
        titleShort: "4컷 피드",
        voteCta: "보고싶어요",
        voteDone: "참여 완료",
        voteFailed: "참여 실패",
        voteLogin: "로그인",
        voteSaving: "반영 중",
      }
    : {
        adult: "Adult fan-only",
        character: "Character",
        characterChannelCta: "Open channel",
        characterCutMetric: "Edited cuts",
        characterPanelClose: "Close character",
        characterPanelEyebrow: "AI Character IP",
        characterPanelTitle: "Character channel",
        characterSourceMetric: "Source open",
        doubleTapDone: "Joined",
        doubleTapLogin: "Log in required",
        doubleTapOpen: "Source open",
        doubleTapWant: "Want it",
        emptyBody:
          "No reporter-edited cuts are ready for the public feed yet. Saved teaser cuts will appear here.",
        emptyCta: "Back to News",
        emptyTitle: "Reporter cut feed is getting ready.",
        eyebrow: "Reporter Cut Feed",
        eyebrowShort: "Cut Feed",
        feedTitle: "Reporter Cuts",
        home: "News Home",
        instruction: "Swipe vertically to review the four cuts chosen by fan reporters.",
        loadError: "Could not load more reporter cuts.",
        loadMore: "Load more",
        loadingMore: "Loading more reporter cuts",
        loginSyncFailed: "Could not confirm the login. Please try again.",
        loginSyncing: "Checking login",
        loginTitle: "Sign in to open source",
        loginUnavailable:
          "Email login cannot start in this browser right now. Please try again shortly.",
        myCharacterBadge: "My character",
        myReportBadge: "My report",
        nextCut: "Next cut",
        noMore: "You have reviewed every reporter cut.",
        openPaidSource: "Purchase to watch",
        openSourceDetail: "Source detail",
        paid: "Fan-only source",
        paidSourceBody:
          "This source is fan-only paid content. Continue securely on the detail screen.",
        paidSourceTitle: "Unlock purchase to watch the source.",
        previousCut: "Previous cut",
        reporter: "Fan reporter",
        reporterChannelCta: "View reporter channel",
        reporterCutMetric: "Edited cuts",
        reporterPanelClose: "Close reporter",
        reporterPanelEyebrow: "Fan Reporter",
        reporterPanelTitle: "Edit reporter",
        reporterPublishedMetric: "Published",
        reporterSourceMetric: "Source open",
        retry: "Retry",
        serviceCharacters: "AI Characters",
        serviceCharactersHint: "IP channels",
        serviceHome: "Home Feed",
        serviceHomeHint: "4-cut feed",
        serviceMenu: "Explore",
        serviceMenuClose: "Close explore",
        serviceMenuTitle: "FanLetter News",
        serviceMy: "My",
        serviceMyHint: "Activity",
        serviceNewsroom: "Newsroom",
        serviceNewsroomHint: "Report edit",
        servicePurchases: "Purchases",
        servicePurchasesHint: "Fan-only",
        serviceReportNew: "Write Report",
        serviceReportNewHint: "Reporter",
        serviceReporters: "Fan Reporters",
        serviceReportersHint: "Reporter channels",
        serviceVlogNew: "New Vlog",
        serviceVlogNewHint: "Vlogger",
        serviceVlogs: "Source Vlogs",
        serviceVlogsHint: "Public videos",
        share: "Share",
        shareCopied: "Link copied to clipboard",
        shareError: "Could not share",
        shareSharing: "Sharing",
        shareSummary: (headline: string, reporterName: string) =>
          `See the four cuts ${reporterName} selected for ${headline}.`,
        shareTitle: (headline: string) => `Four cuts edited by a fan reporter: ${headline}`,
        slot: (index: string) => `Cut ${index}`,
        sourceOpen: "Fan-open vote",
        sourceOpenCta: "Open source",
        sourceOpenCompleteSummary: (count: string, threshold: string) =>
          `${count}/${threshold} joined`,
        sourceOpenDone: "Source open",
        sourceOpenSponsors: "Open sponsors",
        sourceOpenSponsorsAnonymous: "Anonymous open sponsor",
        sourceOpenSponsorsClose: "Close open sponsors",
        sourceOpenSponsorsCompletedA11y: (count: string) =>
          `${count} open sponsors`,
        sourceOpenSponsorsCompletedBody:
          "These fans opened the source vlog.",
        sourceOpenSponsorsCompletedStatus: "Open complete",
        sourceOpenSponsorsCompletedTitle: "6 open sponsors",
        sourceOpenSponsorsEmptySlot: (position: string) =>
          `Empty open sponsor slot ${position}`,
        sourceOpenSponsorsIntro:
          "When 6 open sponsors join, the source vlog opens. Join to get early access and permanent credit.",
        sourceOpenSponsorsJoined: (count: string, remaining: string) =>
          `${count} open sponsors joined, ${remaining} left`,
        sourceOpenSponsorsListTitle: "Open sponsor slots",
        sourceOpenSponsorsOpenA11y: (count: string, remaining: string) =>
          `${count} open sponsors joined, ${remaining} left`,
        sourceOpenSponsorsParticipant: (name: string) =>
          `Open sponsor ${name}`,
        sourceOpenSponsorsRemaining: (remaining: string) =>
          `${remaining} left`,
        sourceOpenStatus: (
          count: string,
          threshold: string,
          remaining: string,
        ) => `${count}/${threshold} joined · ${remaining} left`,
        sourceOverlayClose: "Close source",
        sourceOverlayError: "Could not load the source.",
        sourceOverlayLoading: "Loading source",
        sourceOverlayPlay: "Play video",
        sourceOverlayTitle: "Source vlog",
        sourcePreviewBody:
          "When 6 open sponsors join, the full source vlog opens.",
        sourcePreviewEyebrow: "Source preview",
        sourcePreviewJoinCta: "Join as open sponsor",
        sourcePreviewLoginCta: "Sign in to join",
        sourcePreviewTitle: "Preview it, then help open the source",
        sourceRevealLockedBody: (
          count: string,
          threshold: string,
          remaining: string,
        ) =>
          `${count}/${threshold} fans joined. ${remaining} more want-it votes open the source in this feed.`,
        sourceRevealLockedTitle: "The source is not open yet.",
        sourceView: "View source",
        sourceViewGuideBody:
          "Tap the green source button to open the unlocked vlog in this feed.",
        sourceViewGuideEyebrow: "Source unlocked",
        sourceViewGuideTitle: "Watch the source here",
        swipeGuide: (cutCount: string) =>
          `Swipe sideways for ${cutCount} cuts`,
        unavailableSourceBody:
          "This source cannot play directly in the feed right now. Check the detail screen for status.",
        unavailableSourceTitle: "Source cannot open here.",
        unlockNsfwBody:
          "NSFW sources play after enabling viewing or confirming the wallet PIN.",
        unlockNsfwTitle: "NSFW source protected",
        title: "Four-cut feed edited by fan reporters",
        titleShort: "4-cut feed",
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

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
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

function getCutFeedReturnHref({
  cutSlotNumber,
  locale,
  referralCode,
  reportId,
  shareId,
}: {
  cutSlotNumber: number;
  locale: Locale;
  referralCode: string | null;
  reportId: string;
  shareId: string | null;
}) {
  return setPathSearchParams(
    getCutFeedHref({
      locale,
      referralCode,
      reportId,
    }),
    {
      [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(cutSlotNumber),
      shareId,
    },
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

function getCharacterHref({
  characterReferralCode,
  cutSlotNumber,
  locale,
  referralCode,
  reportId,
  returnToHref,
}: {
  characterReferralCode: string | null;
  cutSlotNumber: number;
  locale: Locale;
  referralCode: string | null;
  reportId: string;
  returnToHref: string;
}) {
  const characterPath = characterReferralCode
    ? `/${locale}/fanletter/news/cuts/characters/${characterReferralCode}`
    : `/${locale}/fanletter/news/characters`;

  return characterReferralCode
    ? setPathSearchParams(buildPathWithReferral(characterPath, referralCode), {
        [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(cutSlotNumber),
        returnTo: returnToHref,
        sourceReportId: reportId,
      })
    : buildPathWithReferral(characterPath, referralCode);
}

type SourceRevealParticipantRailCopy = Pick<
  ReturnType<typeof getCopy>,
  | "loginSyncing"
  | "sourceOpen"
  | "sourceOpenCta"
  | "sourceOpenDone"
  | "sourceOpenSponsors"
  | "sourceOpenSponsorsAnonymous"
  | "sourceOpenSponsorsClose"
  | "sourceOpenSponsorsCompletedA11y"
  | "sourceOpenSponsorsCompletedBody"
  | "sourceOpenSponsorsCompletedStatus"
  | "sourceOpenSponsorsCompletedTitle"
  | "sourceOpenSponsorsEmptySlot"
  | "sourceOpenSponsorsIntro"
  | "sourceOpenSponsorsJoined"
  | "sourceOpenSponsorsListTitle"
  | "sourceOpenSponsorsOpenA11y"
  | "sourceOpenSponsorsParticipant"
  | "sourceOpenSponsorsRemaining"
  | "sourceView"
  | "voteCta"
  | "voteDone"
  | "voteLogin"
  | "voteSaving"
>;

type SourceRevealParticipantSlot =
  | {
      avatarImageUrl: string | null;
      displayName: string;
      kind: "participant" | "viewer";
      position: number;
      referralCode: string | null;
    }
  | {
      avatarImageUrl: null;
      displayName: string;
      kind: "complete" | "empty";
      position: number;
      referralCode: null;
    };

type SourceRevealResponse = {
  sourceReveal: FanletterNewsSourceRevealState;
};

type ShareState = "copied" | "error" | "idle" | "sharing";

type SourceRevealTapFeedback = {
  id: number;
  label: string;
};

type CutFeedServiceMenuCopy = Pick<
  ReturnType<typeof getCopy>,
  | "serviceMenu"
  | "serviceMenuClose"
  | "serviceMenuTitle"
>;

type CutFeedServiceMenuItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  secondaryLabel: string;
  primary?: boolean;
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
      return true;
    } catch {
      // Fall through to the textarea copy path for browsers that expose
      // clipboard.writeText but reject it without a direct user gesture.
    }
  }

  const textarea = document.createElement("textarea");

  try {
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function isShareAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function CutFeedShareButton({
  activeCutSlotNumber,
  contentId,
  copy,
  creatorReferralCode,
  href,
  previewImageKind,
  referralCode,
  reporterReferralCode,
  reportId,
  shareSummary,
  shareTitle,
  variant = "compact",
}: {
  activeCutSlotNumber: number;
  contentId: string | null;
  copy: Pick<
    ReturnType<typeof getCopy>,
    "share" | "shareCopied" | "shareError" | "shareSharing"
  >;
  creatorReferralCode: string | null;
  href: string;
  previewImageKind: "activeCut" | "cover" | "leadCut";
  referralCode: string | null;
  reporterReferralCode: string | null;
  reportId: string;
  shareSummary: string;
  shareTitle: string;
  variant?: "compact" | "reel";
}) {
  const [state, setState] = useState<ShareState>("idle");
  const feedbackTimeoutRef = useRef<number | null>(null);
  const isSharingRef = useRef(false);

  const showShareFeedback = useCallback((nextState: Exclude<ShareState, "sharing">) => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }

    setState(nextState);

    if (nextState === "copied" || nextState === "error") {
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setState("idle");
        feedbackTimeoutRef.current = null;
      }, 2200);
    }
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    },
    [],
  );

  const handleShare = useCallback(async () => {
    if (isSharingRef.current) {
      return;
    }

    isSharingRef.current = true;
    setState("sharing");

    let nextState: Exclude<ShareState, "sharing"> = "idle";

    try {
      const nextShareId = createShareId("newscut");
      const absoluteHref = new URL(href, window.location.origin).toString();
      const shareUrl = setPathSearchParams(
        setShareIdOnHref(absoluteHref, nextShareId),
        {
          [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(activeCutSlotNumber),
        },
      );

      trackFunnelEvent("share_click", {
        contentId,
        metadata: {
          creatorReferralCode,
          cutSlotNumber: activeCutSlotNumber,
          previewImageKind,
          reporterReferralCode,
          reportId,
          source: "fanletter-news-cut-feed",
        },
        referralCode,
        shareId: nextShareId,
        targetHref: shareUrl,
      });

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            text: shareSummary,
            title: shareTitle,
            url: shareUrl,
          });
        } catch (error) {
          if (isShareAbortError(error)) {
            nextState = "idle";
            return;
          }

          nextState = (await copyToClipboard(shareUrl)) ? "copied" : "error";
        }

        return;
      }

      nextState = (await copyToClipboard(shareUrl)) ? "copied" : "error";
    } catch {
      nextState = "error";
    } finally {
      isSharingRef.current = false;
      showShareFeedback(nextState);
    }
  }, [
    activeCutSlotNumber,
    contentId,
    creatorReferralCode,
    href,
    previewImageKind,
    referralCode,
    reporterReferralCode,
    reportId,
    shareSummary,
    shareTitle,
    showShareFeedback,
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
  const feedbackMessage = state === "copied" || state === "error" ? label : "";
  const feedbackClassName =
    variant === "reel"
      ? `pointer-events-none absolute right-[calc(100%+0.55rem)] top-1/2 z-40 max-w-[11rem] -translate-y-1/2 rounded-full border px-3 py-1.5 text-center text-[0.68rem] font-black leading-tight text-white shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl transition duration-200 ${
          feedbackMessage
            ? "translate-x-0 opacity-100"
            : "translate-x-1 opacity-0"
        } ${
          state === "error"
            ? "border-rose-300/28 bg-rose-950/78"
            : "border-[#44f26e]/28 bg-black/72"
        }`
      : `pointer-events-none absolute left-1/2 top-[calc(100%+0.45rem)] z-40 w-max max-w-[12rem] -translate-x-1/2 rounded-full border px-3 py-1.5 text-center text-[0.68rem] font-black leading-tight text-white shadow-[0_14px_34px_rgba(0,0,0,0.26)] backdrop-blur-xl transition duration-200 ${
          feedbackMessage
            ? "translate-y-0 opacity-100"
            : "-translate-y-1 opacity-0"
        } ${
          state === "error"
            ? "border-rose-300/28 bg-rose-950/78"
            : "border-[#44f26e]/28 bg-black/72"
        }`;
  const buttonClassName =
    variant === "reel"
      ? `inline-flex size-11 shrink-0 items-center justify-center rounded-full border text-white shadow-[0_14px_30px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:bg-white hover:text-[#111510] disabled:cursor-wait disabled:opacity-80 ${
          isCopied
            ? "border-[#44f26e]/60 bg-[#44f26e] !text-[#101510]"
            : "border-white/16 bg-black/46"
        }`
      : `inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur transition hover:bg-white hover:text-[#111510] disabled:cursor-wait disabled:opacity-80 ${
          isCopied
            ? "border-[#44f26e]/50 bg-[#44f26e] !text-[#101510]"
            : "border-white/16 bg-black/44"
        }`;
  const iconClassName = variant === "reel" ? "size-5" : "size-4";

  return (
    <span className="relative inline-flex">
      <button
        aria-busy={state === "sharing"}
        aria-label={label}
        className={buttonClassName}
        disabled={state === "sharing"}
        onClick={() => {
          void handleShare();
        }}
        title={label}
        type="button"
      >
        {state === "sharing" ? (
          <Loader2 className={`${iconClassName} animate-spin`} />
        ) : isCopied ? (
          <Check className={iconClassName} />
        ) : (
          <Share2 className={iconClassName} />
        )}
      </button>
      <span
        aria-live="polite"
        className={feedbackClassName}
        data-share-feedback
        role="status"
      >
        {feedbackMessage}
      </span>
    </span>
  );
}

function CutFeedServiceMenuSheet({
  copy,
  items,
  onClose,
}: {
  copy: CutFeedServiceMenuCopy;
  items: CutFeedServiceMenuItem[];
  onClose: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/42 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] text-white backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <section
        aria-label={copy.serviceMenuTitle}
        className="max-h-[calc(var(--fanletter-cut-feed-vh,100dvh)_-_env(safe-area-inset-top)_-_1rem)] w-full max-w-[430px] overflow-hidden rounded-t-[1.35rem] border border-white/12 bg-[#060907]/96 shadow-[0_-22px_70px_rgba(0,0,0,0.42)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/14 text-[#44f26e] ring-1 ring-[#44f26e]/22">
            <Compass className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.serviceMenuTitle}
            </p>
            <h2 className="mt-0.5 truncate text-lg font-black leading-tight">
              {copy.serviceMenu}
            </h2>
          </div>
          <button
            aria-label={copy.serviceMenuClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white transition hover:bg-white hover:text-[#111510]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="grid max-h-[calc(var(--fanletter-cut-feed-vh,100dvh)_-_env(safe-area-inset-top)_-_6.5rem)] grid-cols-2 gap-2 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className={`group flex min-h-[4.15rem] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  item.primary
                    ? "border-[#44f26e]/34 bg-[#44f26e]/14 hover:bg-[#44f26e]"
                    : "border-white/10 bg-white/7 hover:border-[#44f26e]/34 hover:bg-white/12"
                }`}
                href={item.href}
                key={`${item.href}-${item.label}`}
              >
                <span
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full transition ${
                    item.primary
                      ? "bg-[#44f26e] text-[#111510] group-hover:bg-[#111510] group-hover:text-[#44f26e]"
                      : "bg-white/8 text-[#44f26e] group-hover:bg-[#44f26e] group-hover:text-[#111510]"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block truncate text-sm font-black ${
                      item.primary
                        ? "text-white group-hover:text-[#111510]"
                        : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[0.62rem] font-black uppercase tracking-[0.08em] ${
                      item.primary
                        ? "text-[#9bffad] group-hover:text-[#0b3518]"
                        : "text-white/42"
                    }`}
                  >
                    {item.secondaryLabel}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CutFeedProfileActionButton({
  fallbackIcon: FallbackIcon,
  href,
  imageUrl,
  isViewerOwned = false,
  label,
  name,
  onClick,
  viewerOwnedLabel,
}: {
  fallbackIcon: LucideIcon;
  href: string;
  imageUrl: string | null;
  isViewerOwned?: boolean;
  label: string;
  name: string;
  onClick?: () => void;
  viewerOwnedLabel?: string;
}) {
  const accessibilityLabel =
    isViewerOwned && viewerOwnedLabel
      ? `${label} ${name} ${viewerOwnedLabel}`
      : `${label} ${name}`;

  return (
    <Link
      aria-label={accessibilityLabel}
      className={`group inline-flex h-10 max-w-[14rem] items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-white hover:text-[#111510] ${
        isViewerOwned
          ? "border-[#44f26e]/80 bg-[#44f26e]/18 ring-2 ring-[#44f26e]/24"
          : "border-white/14 bg-black/28"
      }`}
      href={href}
      onClick={onClick}
      title={accessibilityLabel}
    >
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/18 bg-black/36 text-[#44f26e]">
        {imageUrl ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="32px"
            src={imageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
          />
        ) : (
          <FallbackIcon className="size-4" />
        )}
        {isViewerOwned ? (
          <span className="absolute bottom-0 right-0 inline-flex size-3.5 items-center justify-center rounded-full border border-black/50 bg-[#44f26e] text-[#07110a] shadow-[0_4px_10px_rgba(0,0,0,0.28)]">
            <Check className="size-2.5 stroke-[3]" />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-[0.54rem] font-black uppercase tracking-[0.1em] text-[#9bffad] transition group-hover:text-[#0b3518]">
          {label}
        </span>
        <span className="block truncate text-[0.72rem] font-black leading-tight text-white/92 transition group-hover:text-[#111510]">
          {name}
        </span>
      </span>
    </Link>
  );
}

function CutFeedHeaderReporterChip({
  active = false,
  avatarImageUrl,
  isViewerReport = false,
  label,
  name,
  viewerReportLabel,
  onClick,
}: {
  active?: boolean;
  avatarImageUrl: string | null;
  isViewerReport?: boolean;
  label: string;
  name: string;
  viewerReportLabel: string;
  onClick: () => void;
}) {
  const accessibilityLabel = isViewerReport
    ? `${label} ${name} ${viewerReportLabel}`
    : `${label} ${name}`;

  return (
    <button
      aria-label={accessibilityLabel}
      aria-pressed={active}
      className={`group relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border text-white shadow-[0_12px_34px_rgba(0,0,0,0.2)] backdrop-blur transition hover:bg-white hover:text-[#111510] ${
        isViewerReport
          ? "border-[#44f26e] bg-[#44f26e]/18 ring-2 ring-[#44f26e]/34"
          : active
          ? "border-[#44f26e]/78 bg-[#44f26e]/18 ring-2 ring-[#44f26e]/22"
          : "border-[#44f26e]/30 bg-black/32"
      }`}
      onClick={onClick}
      title={accessibilityLabel}
      type="button"
    >
      {avatarImageUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="44px"
          src={avatarImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(avatarImageUrl)}
        />
      ) : (
        <span className="text-sm font-black uppercase text-[#44f26e] transition group-hover:text-[#111510]">
          {name.slice(0, 1)}
        </span>
      )}
      {isViewerReport ? (
        <span className="absolute bottom-0 right-0 inline-flex size-4 items-center justify-center rounded-full border border-black/50 bg-[#44f26e] text-[#07110a] shadow-[0_4px_10px_rgba(0,0,0,0.28)]">
          <Check className="size-2.5 stroke-[3]" />
        </span>
      ) : null}
    </button>
  );
}

type CutFeedReporterPanelCopy = Pick<
  ReturnType<typeof getCopy>,
  | "myReportBadge"
  | "reporterChannelCta"
  | "reporterCutMetric"
  | "reporterPanelClose"
  | "reporterPanelEyebrow"
  | "reporterPanelTitle"
  | "reporterPublishedMetric"
  | "reporterSourceMetric"
>;

function CutFeedReporterInlinePanel({
  avatarImageUrl,
  channelHref,
  copy,
  cutCountLabel,
  isViewerReport = false,
  name,
  onClose,
  publishedAtLabel,
  referralCode,
  sourceRevealLabel,
}: {
  avatarImageUrl: string | null;
  channelHref: string;
  copy: CutFeedReporterPanelCopy;
  cutCountLabel: string;
  isViewerReport?: boolean;
  name: string;
  onClose: () => void;
  publishedAtLabel: string;
  referralCode: string;
  sourceRevealLabel: string;
}) {
  return (
    <div
      aria-labelledby="cut-feed-reporter-panel-title"
      aria-modal="false"
      className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] z-40"
      role="dialog"
    >
      <div className="rounded-2xl border border-white/14 bg-black/68 p-3 text-white shadow-[0_26px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <span className="relative inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#44f26e]/42 bg-[#44f26e]/12 text-[#44f26e] shadow-[0_16px_34px_rgba(0,0,0,0.28)]">
            {avatarImageUrl ? (
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="64px"
                src={avatarImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(avatarImageUrl)}
              />
            ) : (
              <PenLine className="size-7" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.reporterPanelEyebrow}
            </p>
            <h2
              className="mt-1 truncate text-xl font-black leading-tight"
              id="cut-feed-reporter-panel-title"
            >
              {name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-white/12 bg-white/8 px-2 py-1 text-[0.58rem] font-black text-white/74">
                @{referralCode}
              </span>
              <span className="rounded-full border border-[#44f26e]/22 bg-[#44f26e]/12 px-2 py-1 text-[0.58rem] font-black text-[#9bffad]">
                {copy.reporterPanelTitle}
              </span>
              {isViewerReport ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#44f26e]/40 bg-[#44f26e] px-2 py-1 text-[0.58rem] font-black text-[#07110a]">
                  <Check className="size-3 stroke-[3]" />
                  {copy.myReportBadge}
                </span>
              ) : null}
            </div>
          </div>
          <button
            aria-label={copy.reporterPanelClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/72 transition hover:bg-white hover:text-[#111510]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            [copy.reporterCutMetric, cutCountLabel],
            [copy.reporterSourceMetric, sourceRevealLabel],
            [copy.reporterPublishedMetric, publishedAtLabel],
          ].map(([label, value]) => (
            <div
              className="min-w-0 rounded-xl border border-white/10 bg-white/[0.07] px-2 py-2"
              key={label}
            >
              <p className="truncate text-[0.54rem] font-black uppercase tracking-[0.08em] text-[#9bffad]">
                {label}
              </p>
              <p className="mt-1 truncate text-[0.72rem] font-black text-white">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <Link
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#44f26e]/24 bg-[#44f26e]/14 px-3 text-[0.78rem] font-black !text-[#9bffad] transition hover:bg-[#44f26e] hover:!text-[#111510]"
            href={channelHref}
          >
            {copy.reporterChannelCta}
          </Link>
        </div>
      </div>
    </div>
  );
}

function getSourceRevealViewerDisplayName({
  email,
  referralCode,
  publicDisplayName,
}: {
  email: string | null;
  publicDisplayName?: string | null;
  referralCode?: string | null;
}) {
  const displayName = publicDisplayName?.trim();

  if (displayName) {
    return displayName;
  }

  const normalizedReferralCode = referralCode?.trim();

  if (normalizedReferralCode) {
    return normalizedReferralCode;
  }

  return email?.split("@")[0]?.trim() || "Fan";
}

function getSourceRevealParticipantSlots({
  canShowViewerSlot,
  isLoggedIn,
  state,
  viewerAvatarImageUrl,
  viewerDisplayName,
  viewerReferralCode,
}: {
  canShowViewerSlot: boolean;
  isLoggedIn: boolean;
  state: FanletterNewsSourceRevealState;
  viewerAvatarImageUrl: string | null;
  viewerDisplayName: string;
  viewerReferralCode: string | null;
}): SourceRevealParticipantSlot[] {
  const threshold = Math.max(1, state.threshold);
  const participants = state.participants.slice(0, threshold);
  const slots: SourceRevealParticipantSlot[] = participants.map(
    (participant, index) => ({
      avatarImageUrl: participant.avatarImageUrl,
      displayName: participant.displayName,
      kind: "participant",
      position: index + 1,
      referralCode: participant.referralCode,
    }),
  );
  const hasViewerParticipant =
    Boolean(viewerReferralCode) &&
    participants.some(
      (participant) => participant.referralCode === viewerReferralCode,
    );
  const shouldShowViewerSlot =
    canShowViewerSlot &&
    isLoggedIn &&
    !hasViewerParticipant &&
    !state.unlocked &&
    (!state.requestedByViewer || slots.length < threshold);

  if (shouldShowViewerSlot && slots.length < threshold) {
    slots.push({
      avatarImageUrl: viewerAvatarImageUrl,
      displayName: viewerDisplayName,
      kind: state.requestedByViewer ? "participant" : "viewer",
      position: slots.length + 1,
      referralCode: viewerReferralCode,
    });
  }

  while (slots.length < threshold) {
    slots.push({
      avatarImageUrl: null,
      displayName: state.unlocked ? "Open complete" : "Open slot",
      kind: state.unlocked ? "complete" : "empty",
      position: slots.length + 1,
      referralCode: null,
    });
  }

  return slots.slice(0, threshold);
}

function SourceRevealParticipantRail({
  authNudge,
  copy,
  error,
  highlightSourceView = false,
  isLoggedIn,
  isLoginBusy,
  isSaving,
  locale,
  loginError,
  onActivate,
  progressPercent,
  state,
  viewerAvatarImageUrl,
  viewerDisplayName,
  viewerReferralCode,
}: {
  authNudge: boolean;
  copy: SourceRevealParticipantRailCopy;
  error: string | null;
  highlightSourceView?: boolean;
  isLoggedIn: boolean;
  isLoginBusy: boolean;
  isSaving: boolean;
  locale: Locale;
  loginError: string | null;
  onActivate: () => void;
  progressPercent: number;
  state: FanletterNewsSourceRevealState;
  viewerAvatarImageUrl: string | null;
  viewerDisplayName: string;
  viewerReferralCode: string | null;
}) {
  const [isSponsorSheetOpen, setIsSponsorSheetOpen] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const boundedCount = Math.min(state.count, state.threshold);
  const remainingCount = Math.max(0, state.threshold - boundedCount);
  const joinedLabel = formatNumber(boundedCount, locale);
  const remainingLabel = formatNumber(remainingCount, locale);
  const thresholdLabel = formatNumber(state.threshold, locale);
  const countLabel = `${joinedLabel}/${thresholdLabel}`;
  const statusError = loginError ?? error;
  const slots = getSourceRevealParticipantSlots({
    canShowViewerSlot: isClientReady,
    isLoggedIn,
    state,
    viewerAvatarImageUrl,
    viewerDisplayName,
    viewerReferralCode,
  });
  const ctaLabel = state.unlocked ? copy.sourceView : copy.sourceOpenCta;
  const buttonA11yLabel = isLoginBusy
    ? `${copy.loginSyncing} ${countLabel}`
    : isSaving
      ? `${copy.voteSaving} ${countLabel}`
      : `${ctaLabel} ${countLabel}`;
  const sponsorStatusLabel = state.unlocked
    ? copy.sourceOpenSponsorsCompletedStatus
    : copy.sourceOpenSponsorsRemaining(remainingLabel);
  const sponsorsStackLabel = state.unlocked
    ? copy.sourceOpenSponsorsCompletedA11y(thresholdLabel)
    : copy.sourceOpenSponsorsOpenA11y(joinedLabel, remainingLabel);
  const sponsorSheetTitle = state.unlocked
    ? copy.sourceOpenSponsorsCompletedTitle
    : copy.sourceOpenSponsorsListTitle;
  const sponsorSheetBody = state.unlocked
    ? copy.sourceOpenSponsorsCompletedBody
    : copy.sourceOpenSponsorsIntro;

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsClientReady(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (!isSponsorSheetOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSponsorSheetOpen]);

  const RailIcon: LucideIcon = state.unlocked
    ? PlayCircle
    : state.requestedByViewer
      ? CheckCircle2
      : HeartHandshake;
  const buttonClassName = `inline-flex size-11 items-center justify-center rounded-full border shadow-[0_16px_34px_rgba(0,0,0,0.3)] backdrop-blur-xl transition disabled:cursor-wait disabled:opacity-70 ${
    state.unlocked
      ? "border-[#44f26e]/70 bg-[#44f26e] text-[#101510] hover:bg-[#67ff88]"
      : state.requestedByViewer
        ? "border-white/28 bg-white/88 text-[#101510] hover:bg-white"
        : "border-white/18 bg-black/52 text-white hover:bg-[#44f26e] hover:text-[#101510]"
  } ${
    highlightSourceView && state.unlocked
      ? "ring-4 ring-[#44f26e]/28 shadow-[0_0_0_1px_rgba(68,242,110,0.38),0_18px_42px_rgba(68,242,110,0.34)]"
      : ""
  }`;
  const isDisabled = isSaving || isLoginBusy;

  return (
    <>
      <div
        className={`flex flex-col items-center gap-1.5 transition ${
          authNudge ? "scale-[1.035]" : ""
        }`}
      >
        <span
          className="inline-flex rounded-full p-[2px] shadow-[0_12px_34px_rgba(0,0,0,0.26)]"
          style={{
            background: `conic-gradient(#44f26e ${progressPercent}%, rgba(255,255,255,0.18) 0)`,
          }}
        >
          <button
            aria-label={buttonA11yLabel}
            className={buttonClassName}
            disabled={isDisabled}
            onClick={onActivate}
            title={buttonA11yLabel}
            type="button"
          >
            {isSaving || isLoginBusy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <RailIcon className="size-5" />
            )}
          </button>
        </span>
        <span className="max-w-14 text-center text-[0.58rem] font-black leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.82)]">
          {ctaLabel}
        </span>
        <span className="rounded-full bg-black/38 px-1.5 py-0.5 text-[0.56rem] font-black leading-none text-white/84 shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur">
          {countLabel}
        </span>
        <span className="max-w-[4.25rem] rounded-full border border-[#44f26e]/18 bg-black/34 px-1.5 py-1 text-center text-[0.58rem] font-black leading-none text-[#9bffad] shadow-[0_8px_18px_rgba(0,0,0,0.18)] backdrop-blur drop-shadow-[0_2px_8px_rgba(0,0,0,0.82)]">
          {sponsorStatusLabel}
        </span>
        <div
          aria-label={sponsorsStackLabel}
          className="mt-1 flex flex-col items-center pb-1"
          role="group"
        >
          {slots.map((slot, slotIndex) => {
            const isParticipant = slot.kind === "participant";
            const isViewerSlot = slot.kind === "viewer";
            const isAnonymousComplete = slot.kind === "complete";
            const sponsorName =
              isAnonymousComplete || slot.kind === "empty"
                ? copy.sourceOpenSponsorsAnonymous
                : slot.displayName;
            const slotLabel =
              slot.kind === "empty"
                ? copy.sourceOpenSponsorsEmptySlot(
                    formatNumber(slot.position, locale),
                  )
                : copy.sourceOpenSponsorsParticipant(sponsorName);
            const slotContent = slot.avatarImageUrl ? (
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="30px"
                src={slot.avatarImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(
                  slot.avatarImageUrl,
                )}
              />
            ) : isAnonymousComplete || isViewerSlot ? (
              <UserRound className="size-3.5" />
            ) : (
              <Plus className="size-3.5" />
            );
            const className = `relative inline-flex size-[1.88rem] items-center justify-center overflow-hidden rounded-full border text-[0.58rem] font-black shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition first:mt-0 focus:outline-none focus:ring-2 focus:ring-[#44f26e]/60 ${
              isParticipant
                ? "-mt-2 border-white/72 bg-black/48 text-white"
                : isViewerSlot
                  ? "-mt-2 border-[#44f26e] bg-[#44f26e]/20 text-[#44f26e] ring-2 ring-[#44f26e]/36"
                  : isAnonymousComplete
                    ? "-mt-2 border-[#44f26e]/60 bg-[#44f26e]/18 text-[#9bffad]"
                    : "-mt-2 border-white/16 bg-black/24 text-white/42"
            }`;
            const slotStyle = {
              zIndex: slots.length - slotIndex,
            };

            return (
              <button
                aria-label={slotLabel}
                className={className}
                key={`${slot.kind}-${slot.position}-${slot.referralCode ?? slot.displayName}`}
                onClick={() => setIsSponsorSheetOpen(true)}
                style={slotStyle}
                title={slotLabel}
                type="button"
              >
                {slotContent}
              </button>
            );
          })}
        </div>
        {statusError ? (
          <span className="max-w-16 text-center text-[0.54rem] font-black leading-[1.1] text-rose-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            {statusError}
          </span>
        ) : null}
      </div>

      {isSponsorSheetOpen && isClientReady
        ? createPortal(
            <div
              aria-modal="true"
              className="fixed inset-0 z-[80] flex items-end justify-center bg-black/46 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] text-white backdrop-blur-sm"
              onClick={() => setIsSponsorSheetOpen(false)}
              role="dialog"
            >
              <section
                aria-label={sponsorSheetTitle}
                className="flex max-h-[calc(100svh-0.75rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#070b08]/96 p-4 shadow-[0_-24px_80px_rgba(0,0,0,0.48)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/14 text-[#44f26e] ring-1 ring-[#44f26e]/24">
                    <UsersRound className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
                      {copy.sourceOpenSponsors}
                    </p>
                    <h2 className="mt-1 text-xl font-black leading-tight">
                      {sponsorSheetTitle}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-5 text-white/68 [word-break:keep-all]">
                      {sponsorSheetBody}
                    </p>
                  </div>
                  <button
                    aria-label={copy.sourceOpenSponsorsClose}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/72 transition hover:bg-white hover:text-black"
                    onClick={() => setIsSponsorSheetOpen(false)}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-4 grid max-h-[46svh] grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isEmpty = slot.kind === "empty";
                    const isAnonymousComplete = slot.kind === "complete";
                    const displayName = isEmpty
                      ? copy.sourceOpenSponsorsEmptySlot(
                          formatNumber(slot.position, locale),
                        )
                      : isAnonymousComplete
                        ? copy.sourceOpenSponsorsAnonymous
                        : slot.displayName || copy.sourceOpenSponsorsAnonymous;

                    return (
                      <div
                        className={`flex min-w-0 items-center gap-2 rounded-2xl border px-2 py-2 ${
                          isEmpty
                            ? "border-white/10 bg-white/[0.04] text-white/48"
                            : "border-[#44f26e]/20 bg-[#44f26e]/10 text-white"
                        }`}
                        key={`sheet-${slot.kind}-${slot.position}-${slot.referralCode ?? slot.displayName}`}
                      >
                        <span className="relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/14 bg-black/34 text-[#44f26e]">
                          {slot.avatarImageUrl ? (
                            <Image
                              alt=""
                              className="object-cover"
                              fill
                              sizes="36px"
                              src={slot.avatarImageUrl}
                              unoptimized={shouldBypassFanletterImageOptimization(
                                slot.avatarImageUrl,
                              )}
                            />
                          ) : isEmpty ? (
                            <Plus className="size-4" />
                          ) : (
                            <UserRound className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#9bffad]">
                            {isEmpty
                              ? formatNumber(slot.position, locale)
                              : copy.sourceOpenSponsors}
                          </span>
                          <span className="block truncate text-xs font-black">
                            {displayName}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

type SourceOverlayCopy = Pick<
  ReturnType<typeof getCopy>,
  | "adult"
  | "openPaidSource"
  | "openSourceDetail"
  | "paidSourceBody"
  | "paidSourceTitle"
  | "retry"
  | "sourceOverlayClose"
  | "sourceOverlayError"
  | "sourceOverlayLoading"
  | "sourceOverlayPlay"
  | "sourceOverlayTitle"
  | "sourceOpenSponsorsRemaining"
  | "sourcePreviewBody"
  | "sourcePreviewEyebrow"
  | "sourcePreviewJoinCta"
  | "sourcePreviewLoginCta"
  | "sourcePreviewTitle"
  | "sourceRevealLockedBody"
  | "sourceRevealLockedTitle"
  | "unavailableSourceBody"
  | "unavailableSourceTitle"
  | "unlockNsfwBody"
  | "unlockNsfwTitle"
  | "voteDone"
  | "voteSaving"
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
  isSourceRevealActionBusy,
  isSourceRevealLoggedIn,
  isLoading,
  locale,
  onClose,
  onRetry,
  onSourceRevealActivate,
  source,
}: {
  copy: SourceOverlayCopy;
  error: string | null;
  isSourceRevealActionBusy: boolean;
  isSourceRevealLoggedIn: boolean;
  isLoading: boolean;
  locale: Locale;
  onClose: () => void;
  onRetry: () => void;
  onSourceRevealActivate: () => void;
  source: FanletterNewsPublicCutSource | null;
}) {
  const isPlayable = source?.accessState === "playable" && Boolean(source.videoUrl);
  const canShowLockedPreviewVideo = Boolean(
    source?.accessState === "source_reveal_locked" &&
      source.previewVideoUrl &&
      source.contentMaturityRating !== "nsfw",
  );
  const mediaFrameVideoUrl = canShowLockedPreviewVideo
    ? source?.previewVideoUrl ?? null
    : source?.videoUrl ?? null;
  const mediaFramePreviewVideoUrl = canShowLockedPreviewVideo
    ? null
    : source?.previewVideoUrl ?? null;
  const shouldUsePinGate =
    isPlayable &&
    source?.contentMaturityRating === "nsfw";
  const lockedCopy = source
    ? getSourceOverlayLockedCopy({ copy, locale, source })
    : null;
  const paidUnlockHref =
    source?.accessState === "paid_locked" ? source.paidUnlockHref : null;
  const sourceRevealCountLabel = source
    ? formatNumber(
        Math.min(source.sourceReveal.count, source.sourceReveal.threshold),
        locale,
      )
    : "0";
  const sourceRevealThresholdLabel = source
    ? formatNumber(source.sourceReveal.threshold, locale)
    : "0";
  const sourceRevealRemainingLabel = source
    ? formatNumber(
        Math.max(0, source.sourceReveal.threshold - source.sourceReveal.count),
        locale,
      )
    : "0";
  const sourceRevealProgressPercent =
    source && source.sourceReveal.threshold > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (source.sourceReveal.count / source.sourceReveal.threshold) * 100,
          ),
        )
      : 0;
  const sourceRevealCountText = `${sourceRevealCountLabel}/${sourceRevealThresholdLabel}`;
  const sourceRevealCtaLabel = source?.sourceReveal.requestedByViewer
    ? copy.voteDone
    : isSourceRevealActionBusy
      ? copy.voteSaving
      : isSourceRevealLoggedIn
        ? copy.sourcePreviewJoinCta
        : copy.sourcePreviewLoginCta;
  const sourceRevealCtaDisabled =
    Boolean(source?.sourceReveal.requestedByViewer) || isSourceRevealActionBusy;
  const sourceRevealAction = source?.sourceReveal.unlocked ? null : (
    <button
      aria-label={`${sourceRevealCtaLabel} ${sourceRevealCountText}`}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black text-[#111510] shadow-[0_18px_42px_rgba(68,242,110,0.22)] transition hover:bg-[#69ff8c] disabled:cursor-default disabled:bg-white/18 disabled:text-white/58"
      disabled={sourceRevealCtaDisabled}
      onClick={onSourceRevealActivate}
      type="button"
    >
      {isSourceRevealActionBusy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : source?.sourceReveal.requestedByViewer ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <HeartHandshake className="size-4" />
      )}
      {sourceRevealCtaLabel}
    </button>
  );

  return (
    <div
      aria-modal="true"
      className="absolute inset-0 z-50 overflow-hidden bg-black text-white"
      role="dialog"
    >
      <div className="absolute inset-x-0 top-0 z-30 bg-[linear-gradient(180deg,rgba(0,0,0,0.82),rgba(0,0,0,0.5)_62%,rgba(0,0,0,0))] px-3 pb-5 pt-[calc(env(safe-area-inset-top)+0.7rem)]">
        <div className="flex items-center gap-2.5">
          <button
            aria-label={copy.sourceOverlayClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/56 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white hover:text-[#111510]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
          <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#44f26e]/24 bg-[#44f26e]/14 text-[#44f26e] shadow-[0_12px_30px_rgba(68,242,110,0.12)] backdrop-blur-xl">
            <PlayCircle className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
                {source?.authorName
                  ? `${canShowLockedPreviewVideo ? copy.sourcePreviewEyebrow : copy.sourceOverlayTitle} · ${source.authorName}`
                  : canShowLockedPreviewVideo
                    ? copy.sourcePreviewEyebrow
                    : copy.sourceOverlayTitle}
              </p>
              {source?.contentMaturityRating === "nsfw" ? (
                <span className="shrink-0 rounded-full bg-rose-500/90 px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-[0.1em] text-white">
                  {copy.adult}
                </span>
              ) : null}
            </div>
            <h2 className="mt-0.5 truncate text-[1.02rem] font-black leading-tight tracking-normal">
              {source?.title ?? copy.sourceOverlayLoading}
            </h2>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-black">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+4.2rem)] text-center">
            <Loader2 className="size-8 animate-spin text-[#44f26e]" />
            <p className="text-sm font-black text-white/78">
              {copy.sourceOverlayLoading}
            </p>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-5 pt-[calc(env(safe-area-inset-top)+4.2rem)] text-center">
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
          <div className="relative h-full bg-black">
            <div className="absolute inset-0 flex items-start justify-center bg-black px-0 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-[calc(env(safe-area-inset-top)+4.45rem)]">
              <FanletterResponsiveMediaFrame
                alt={source.title}
                blurred={source.accessState === "nsfw_opt_in_required"}
                deferVideoUntilInteraction={
                  !canShowLockedPreviewVideo && Boolean(source.previewVideoUrl)
                }
                deferredVideoCtaPlacement="center"
                eager
                fitWithinViewport
                fitWithinViewportHeightRatio={0.92}
                imageUrl={source.coverImageUrl}
                mediaType={canShowLockedPreviewVideo ? "video" : source.mediaType}
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
                playButtonLabel={copy.sourceOverlayPlay}
                previewVideoUrl={mediaFramePreviewVideoUrl}
                title={source.title}
                videoUrl={mediaFrameVideoUrl}
              >
                {canShowLockedPreviewVideo ? (
                  <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 rounded-2xl border border-white/14 bg-black/62 p-3 text-white shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/16 text-[#44f26e] ring-1 ring-[#44f26e]/22">
                        <PlayCircle className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
                            {copy.sourcePreviewEyebrow}
                          </p>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[0.62rem] font-black text-white/86">
                            {sourceRevealCountText}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-black leading-tight [word-break:keep-all]">
                          {copy.sourcePreviewTitle}
                        </h3>
                        <p className="mt-1 text-[0.68rem] font-bold leading-snug text-white/70 [word-break:keep-all]">
                          {copy.sourceOpenSponsorsRemaining(
                            sourceRevealRemainingLabel,
                          )}{" "}
                          · {copy.sourcePreviewBody}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/16">
                      <span
                        className="block h-full rounded-full bg-[#44f26e]"
                        style={{ width: `${sourceRevealProgressPercent}%` }}
                      />
                    </div>
                    <div className="mt-3">{sourceRevealAction}</div>
                  </div>
                ) : !isPlayable && lockedCopy ? (
                  <div className="absolute inset-0 flex items-center bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.42)_42%,rgba(0,0,0,0.66))] px-4 py-4 sm:p-5">
                    <div className="w-full rounded-2xl border border-white/14 bg-black/68 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
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
                        {source.accessState === "source_reveal_locked" &&
                        sourceRevealAction ? (
                          sourceRevealAction
                        ) : null}
                        {paidUnlockHref ? (
                          <Link
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-[#111510]"
                            href={paidUnlockHref}
                          >
                            <LockKeyhole className="size-4" />
                            {copy.openPaidSource}
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

          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeedSlide({
  dictionary,
  hasMore,
  index,
  initialCutSlotNumber = null,
  initialSourceContentId = null,
  isActive,
  item,
  itemCount,
  locale,
  onDismissSwipeGuide,
  reporterPanelRequestId = 0,
  onSourceViewSlideVisible,
  referralCode,
  shareId,
  showSwipeGuide = false,
}: {
  dictionary: Dictionary;
  hasMore: boolean;
  index: number;
  initialCutSlotNumber?: number | null;
  initialSourceContentId?: string | null;
  isActive: boolean;
  item: SerializedFanletterNewsPublicCutFeedItem;
  itemCount: number;
  locale: Locale;
  onDismissSwipeGuide?: () => void;
  reporterPanelRequestId?: number;
  onSourceViewSlideVisible?: (index: number) => void;
  referralCode: string | null;
  shareId: string | null;
  showSwipeGuide?: boolean;
}) {
  const [activeCutIndex, setActiveCutIndex] = useState(() => {
    const normalizedInitialCutSlotNumber =
      normalizeFanletterNewsPublicCutSlotNumber(
        initialCutSlotNumber ? String(initialCutSlotNumber) : null,
      );
    const initialCuts = item.cuts.length > 0 ? item.cuts : [item.leadCut];
    const initialCutIndex = normalizedInitialCutSlotNumber
      ? initialCuts.findIndex(
          (cut) => cut.slotNumber === normalizedInitialCutSlotNumber,
        )
      : -1;

    return initialCutIndex >= 0 ? initialCutIndex : 0;
  });
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
  const [isReporterPanelOpen, setIsReporterPanelOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLoginSyncing, setIsLoginSyncing] = useState(false);
  const [loginSyncError, setLoginSyncError] = useState<string | null>(null);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: CUT_FEED_LOGIN_SYNC_GRACE_MS,
    resolveGraceMs: CUT_FEED_LOGIN_SYNC_GRACE_MS,
    status: connectionStatus,
  });
  const pointerStartRef = useRef<{
    target: EventTarget | null;
    x: number;
    y: number;
  } | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const tapFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const authNudgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSourceOverlayOpenedRef = useRef(false);
  const pendingVoteAfterLoginRef = useRef(false);
  const loginSyncKeyRef = useRef<string | null>(null);
  const sourceOverlayHistoryPushedRef = useRef(false);
  const handledReporterPanelRequestIdRef = useRef(0);
  const copy = getCopy(locale);
  const { report } = item;
  const normalizedViewerReferralCode = normalizeReferralCode(
    memberSession.member?.referralCode,
  );
  const normalizedReportReporterReferralCode = normalizeReferralCode(
    report.reporterReferralCode,
  );
  const normalizedCreatorReferralCode = normalizeReferralCode(
    report.creatorReferralCode,
  );
  const isViewerReport = Boolean(
    normalizedViewerReferralCode &&
      normalizedReportReporterReferralCode &&
      normalizedViewerReferralCode === normalizedReportReporterReferralCode,
  );
  const isViewerCharacter = Boolean(
    normalizedViewerReferralCode &&
      normalizedCreatorReferralCode &&
      normalizedViewerReferralCode === normalizedCreatorReferralCode,
  );
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
  const sourceContentId =
    typeof report.contentId === "string" ? report.contentId.trim() : "";
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
  const characterCutCountLabel = formatNumber(cutCount, locale);
  const characterSourceRevealLabel = `${formatNumber(
    Math.min(sourceRevealState.count, sourceRevealState.threshold),
    locale,
  )}/${formatNumber(sourceRevealState.threshold, locale)}`;
  const reporterPublishedAtLabel = publishedAt ?? "-";
  const activeCutSlotNumber = cuts[activeCutIndex]?.slotNumber ?? 1;
  const cutFeedReturnHref = getCutFeedReturnHref({
    cutSlotNumber: activeCutSlotNumber,
    locale,
    referralCode,
    reportId: report.reportId,
    shareId,
  });
  const characterHref = getCharacterHref({
    characterReferralCode: report.creatorReferralCode,
    cutSlotNumber: activeCutSlotNumber,
    locale,
    referralCode,
    reportId: report.reportId,
    returnToHref: cutFeedReturnHref,
  });
  const sharePreviewImageKind = "activeCut";
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
    const url = new URL(window.location.href);

    if (url.searchParams.get("source") === sourceContentId) {
      url.searchParams.delete("source");
      window.history.replaceState(
        typeof window.history.state === "object" && window.history.state !== null
          ? window.history.state
          : {},
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, [sourceContentId]);

  useEffect(() => {
    const normalizedInitialSourceContentId = initialSourceContentId?.trim();

    if (
      initialSourceOverlayOpenedRef.current ||
      !normalizedInitialSourceContentId ||
      normalizedInitialSourceContentId !== sourceContentId
    ) {
      return;
    }

    initialSourceOverlayOpenedRef.current = true;
    setSourceOverlayOpen(true);

    if (!sourceOverlaySource && !isSourceOverlayLoading) {
      void loadSourceOverlay();
    }
  }, [
    initialSourceContentId,
    isSourceOverlayLoading,
    loadSourceOverlay,
    sourceContentId,
    sourceOverlaySource,
  ]);

  useEffect(() => {
    setSourceRevealState(item.sourceReveal);
    setSourceRevealError(null);
    setLoginSyncError(null);
    pendingVoteAfterLoginRef.current = false;
    loginSyncKeyRef.current = null;
  }, [item.sourceReveal]);

  useEffect(() => {
    if (
      reporterPanelRequestId <= 0 ||
      handledReporterPanelRequestIdRef.current === reporterPanelRequestId
    ) {
      return;
    }

    handledReporterPanelRequestIdRef.current = reporterPanelRequestId;
    onDismissSwipeGuide?.();
    setIsReporterPanelOpen((current) => !current);
  }, [onDismissSwipeGuide, reporterPanelRequestId]);

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

  const submitSourceRevealVote = useCallback(async ({
    skipLoginCheck = false,
  }: { skipLoginCheck?: boolean } = {}) => {
    if (
      isSourceRevealSaving ||
      sourceRevealState.requestedByViewer ||
      sourceRevealState.unlocked
    ) {
      return false;
    }

    if (!skipLoginCheck && !isSourceRevealLoggedIn) {
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

  const openInlineLoginForVote = useCallback(() => {
    if (
      isSourceRevealSaving ||
      sourceRevealState.requestedByViewer ||
      sourceRevealState.unlocked
    ) {
      return;
    }

    pendingVoteAfterLoginRef.current = true;
    setLoginSyncError(null);

    if (isSourceRevealLoggedIn) {
      void submitSourceRevealVote();
      return;
    }

    if (!hasThirdwebClientId) {
      setLoginSyncError(copy.loginUnavailable);
      nudgeLoginVote();
      return;
    }

    nudgeLoginVote();
    setIsLoginDialogOpen(true);
  }, [
    copy.loginUnavailable,
    isSourceRevealLoggedIn,
    isSourceRevealSaving,
    nudgeLoginVote,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    submitSourceRevealVote,
  ]);

  useEffect(() => {
    if (
      !pendingVoteAfterLoginRef.current ||
      !connection.isConnected ||
      !accountAddress ||
      isLoginSyncing ||
      sourceRevealState.requestedByViewer ||
      sourceRevealState.unlocked
    ) {
      return;
    }

    const syncKey = `${accountAddress}:${sourceRevealEndpoint}`;

    if (loginSyncKeyRef.current === syncKey) {
      return;
    }

    loginSyncKeyRef.current = syncKey;
    let isCancelled = false;

    async function syncLoginAndVote() {
      if (!accountAddress) {
        return;
      }

      setIsLoginDialogOpen(false);
      setIsLoginSyncing(true);
      setLoginSyncError(null);

      try {
        const email =
          memberSession.email ??
          (await getThirdwebUserEmail({ client: thirdwebClient }));

        if (!email) {
          throw new Error(dictionary.member.errors.missingEmail);
        }

        const result = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          referredByCode: referralCode,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!result.ok) {
          throw new Error(result.error || copy.loginSyncFailed);
        }

        if (!result.member) {
          throw new Error(copy.loginSyncFailed);
        }

        if (isCancelled) {
          return;
        }

        updateMemberSession({
          email: result.member.email,
          member: result.member,
          walletAddress: accountAddress,
        });
        pendingVoteAfterLoginRef.current = false;
        showTapFeedback(copy.doubleTapWant);
        void submitSourceRevealVote({ skipLoginCheck: true });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        pendingVoteAfterLoginRef.current = false;
        loginSyncKeyRef.current = null;
        setLoginSyncError(
          error instanceof Error ? error.message : copy.loginSyncFailed,
        );
        nudgeLoginVote();
      } finally {
        if (!isCancelled) {
          setIsLoginSyncing(false);
        }
      }
    }

    void syncLoginAndVote();

    return () => {
      isCancelled = true;
    };
  }, [
    accountAddress,
    chain.id,
    chain.name,
    connection.isConnected,
    copy.doubleTapWant,
    copy.loginSyncFailed,
    dictionary.member.errors.missingEmail,
    isLoginSyncing,
    locale,
    memberSession.email,
    nudgeLoginVote,
    referralCode,
    showTapFeedback,
    sourceRevealEndpoint,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    submitSourceRevealVote,
    updateMemberSession,
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
      openInlineLoginForVote();
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
    openInlineLoginForVote,
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
    [
      goToNextCut,
      goToPreviousCut,
      handleSourceRevealDoubleTap,
      onDismissSwipeGuide,
    ],
  );
  const handleSourceRevealParticipation = useCallback(() => {
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
      openInlineLoginForVote();
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
    openInlineLoginForVote,
    showTapFeedback,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    submitSourceRevealVote,
  ]);
  const handleSourceRailClick = useCallback(() => {
    if (sourceContentId) {
      openSourceOverlay();
      return;
    }

    handleSourceRevealParticipation();
  }, [
    handleSourceRevealParticipation,
    openSourceOverlay,
    sourceContentId,
  ]);
  const sourceRailProgressPercent =
    sourceRevealState.threshold > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (sourceRevealState.count / sourceRevealState.threshold) * 100,
          ),
        )
      : 100;
  const viewerPublicProfile = memberSession.member?.publicProfile;
  const viewerAvatarImageUrl =
    viewerPublicProfile?.avatarImageUrl?.trim() || null;
  const viewerDisplayName = getSourceRevealViewerDisplayName({
    email: memberSession.email,
    publicDisplayName: viewerPublicProfile?.displayName,
    referralCode: memberSession.member?.referralCode,
  });
  const viewerReferralCode = memberSession.member?.referralCode?.trim() || null;
  const cutCountLabel = formatNumber(cutCount, locale);
  const showSourceViewGuide =
    isActive && showSwipeGuide && sourceRevealState.unlocked && cutCount > 1;
  const showCutSwipeGuide = isActive && showSwipeGuide && cutCount > 1;
  const cutSwipeGuideClassName = `pointer-events-none absolute left-[44%] z-30 w-[17rem] max-w-[calc(100%_-_6.8rem)] -translate-x-1/2 rounded-2xl border border-white/14 bg-black/58 px-4 py-3 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl ${
    showSourceViewGuide ? "top-[54%]" : "top-[39%]"
  }`;
  const inactiveArticleAttributes = isActive
    ? {}
    : {
        "aria-hidden": true,
        inert: true,
        tabIndex: -1,
      };

  useEffect(() => {
    const article = articleRef.current;

    if (!article) {
      return;
    }

    article.dataset.cutCount = String(cutCount);

    if (sourceRevealState.unlocked) {
      article.dataset.sourceView = "true";
    } else {
      delete article.dataset.sourceView;
    }
  }, [cutCount, sourceRevealState.unlocked]);

  useEffect(() => {
    if (
      !onSourceViewSlideVisible ||
      !sourceRevealState.unlocked ||
      cutCount <= 1
    ) {
      return;
    }

    const article = articleRef.current;
    const root = article?.parentElement ?? null;

    if (!article || !root || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.68) {
          onSourceViewSlideVisible(index);
        }
      },
      {
        root,
        threshold: [0.68],
      },
    );

    observer.observe(article);

    return () => {
      observer.disconnect();
    };
  }, [
    cutCount,
    index,
    onSourceViewSlideVisible,
    sourceRevealState.unlocked,
  ]);

  return (
    <article
      {...inactiveArticleAttributes}
      className="relative min-h-[var(--fanletter-cut-feed-vh,100dvh)] touch-pan-y snap-start snap-always overflow-hidden bg-black text-white"
      id={report.reportId}
      ref={articleRef}
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
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
          if (
            connectionStatus === "disconnected" ||
            connectionStatus === "unknown"
          ) {
            pendingVoteAfterLoginRef.current = false;
            loginSyncKeyRef.current = null;
          }
        }}
        open={isLoginDialogOpen}
        title={copy.loginTitle}
        variant="fanletter"
      />
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${activeCutIndex * 100}%)`,
          }}
        >
          {cuts.map((cut, cutIndex) => {
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
                  priority={isActive && cutIndex === activeCutIndex}
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
        </div>
      </div>

      <div className="absolute right-3 top-[48%] z-30 flex -translate-y-1/2 flex-col items-center gap-4 text-white">
        {showSourceViewGuide ? (
          <div
            aria-live="polite"
            className="pointer-events-none absolute right-[3.75rem] top-0 z-40 w-[12.5rem] max-w-[calc(100vw_-_6.2rem)] rounded-2xl border border-[#44f26e]/34 bg-black/72 px-3.5 py-3 text-left text-white shadow-[0_24px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl"
            role="status"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e]/16 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
              <PlayCircle className="size-3" />
              {copy.sourceViewGuideEyebrow}
            </span>
            <p className="mt-2 text-sm font-black leading-tight tracking-normal [word-break:keep-all]">
              {copy.sourceViewGuideTitle}
            </p>
            <p className="mt-1 text-[0.68rem] font-bold leading-snug text-white/74 [word-break:keep-all]">
              {copy.sourceViewGuideBody}
            </p>
            <span className="absolute -right-1.5 top-[1.35rem] size-3 rotate-45 border-r border-t border-[#44f26e]/34 bg-black/72" />
          </div>
        ) : null}
        <SourceRevealParticipantRail
          authNudge={authNudge}
          copy={copy}
          error={sourceRevealError}
          highlightSourceView={showSourceViewGuide}
          isLoggedIn={isSourceRevealLoggedIn}
          isLoginBusy={isLoginSyncing}
          isSaving={isSourceRevealSaving}
          locale={locale}
          loginError={loginSyncError}
          onActivate={handleSourceRailClick}
          progressPercent={sourceRailProgressPercent}
          state={sourceRevealState}
          viewerAvatarImageUrl={viewerAvatarImageUrl}
          viewerDisplayName={viewerDisplayName}
          viewerReferralCode={viewerReferralCode}
        />
        <div className="flex flex-col items-center gap-1.5">
          <CutFeedShareButton
            activeCutSlotNumber={activeCutSlotNumber}
            contentId={sourceContentId || null}
            copy={copy}
            creatorReferralCode={report.creatorReferralCode}
            href={cutFeedHref}
            previewImageKind={sharePreviewImageKind}
            referralCode={referralCode}
            reporterReferralCode={report.reporterReferralCode}
            reportId={report.reportId}
            shareSummary={shareSummary}
            shareTitle={shareTitle}
            variant="reel"
          />
          <span className="max-w-14 text-center text-[0.58rem] font-black leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.82)]">
            {copy.share}
          </span>
        </div>
      </div>

      {showCutSwipeGuide ? (
        <div
          aria-live="polite"
          className={cutSwipeGuideClassName}
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
            {copy.swipeGuide(cutCountLabel)}
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

      {isReporterPanelOpen ? (
        <CutFeedReporterInlinePanel
          avatarImageUrl={report.reporterAvatarImageUrl}
          channelHref={reporterHref}
          copy={copy}
          cutCountLabel={characterCutCountLabel}
          isViewerReport={isViewerReport}
          name={report.reporterName}
          onClose={() => setIsReporterPanelOpen(false)}
          publishedAtLabel={reporterPublishedAtLabel}
          referralCode={report.reporterReferralCode}
          sourceRevealLabel={characterSourceRevealLabel}
        />
      ) : null}

      <div className="relative z-10 flex min-h-[var(--fanletter-cut-feed-vh,100dvh)] items-end px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-[calc(env(safe-area-inset-top)+7.6rem)]">
        <section className="mx-auto flex w-full flex-col justify-end">
          <div className="max-w-3xl">
            <CutFeedProfileActionButton
              fallbackIcon={Sparkles}
              href={characterHref}
              imageUrl={report.creatorAvatarImageUrl}
              isViewerOwned={isViewerCharacter}
              label={copy.character}
              name={report.creatorName}
              onClick={() => {
                onDismissSwipeGuide?.();
              }}
              viewerOwnedLabel={copy.myCharacterBadge}
            />
            <h2
              className={`mt-2 max-w-4xl break-words text-[1.42rem] font-black leading-[1.08] tracking-normal drop-shadow-[0_3px_18px_rgba(0,0,0,0.82)] [word-break:keep-all] ${
                isNsfw ? "select-none blur-[2px]" : ""
              }`}
            >
              {title}
            </h2>
            <p
              className={`mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/82 drop-shadow-[0_2px_12px_rgba(0,0,0,0.72)] ${
                isNsfw ? "select-none blur-[2px]" : ""
              }`}
            >
              {report.dek}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.72rem] font-bold text-white/72 drop-shadow-[0_2px_10px_rgba(0,0,0,0.72)]">
              <span>{report.reporterName}</span>
              {isViewerReport ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#44f26e]/34 bg-[#44f26e]/18 px-2 py-0.5 text-[0.62rem] font-black text-[#9bffad]">
                  <Check className="size-3 stroke-[3]" />
                  {copy.myReportBadge}
                </span>
              ) : null}
              {publishedAt ? <span>{publishedAt}</span> : null}
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
          isSourceRevealActionBusy={isSourceRevealSaving || isLoginSyncing}
          isSourceRevealLoggedIn={isSourceRevealLoggedIn}
          isLoading={isSourceOverlayLoading}
          locale={locale}
          onClose={closeSourceOverlay}
          onRetry={() => void loadSourceOverlay()}
          onSourceRevealActivate={handleSourceRevealParticipation}
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

type CutFeedSwipeGuideTarget = {
  index: number;
  reason: "entry" | "sourceView";
};

function getPublicCutItemCutCount(item: SerializedFanletterNewsPublicCutFeedItem) {
  return Math.max(item.cuts.length, 1);
}

function canShowSourceViewSwipeGuide(
  item: SerializedFanletterNewsPublicCutFeedItem | undefined,
) {
  return Boolean(
    item && item.sourceReveal.unlocked && getPublicCutItemCutCount(item) > 1,
  );
}

function canShowSourceViewSwipeGuideForSlide(slide: Element | null | undefined) {
  if (!(slide instanceof HTMLElement)) {
    return false;
  }

  const cutCount = Number(slide.dataset.cutCount);

  return slide.dataset.sourceView === "true" && cutCount > 1;
}

function canShowSourceViewSwipeGuideAtIndex({
  index,
  items,
  root,
}: {
  index: number;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  root: HTMLDivElement | null;
}) {
  const slide = root?.querySelectorAll("article").item(index);

  if (slide) {
    return canShowSourceViewSwipeGuideForSlide(slide);
  }

  return canShowSourceViewSwipeGuide(items[index]);
}

function getVisibleFeedIndex({
  itemCount,
  root,
}: {
  itemCount: number;
  root: HTMLDivElement;
}) {
  if (itemCount <= 0 || root.clientHeight <= 0) {
    return 0;
  }

  return Math.min(
    itemCount - 1,
    Math.max(0, Math.round(root.scrollTop / root.clientHeight)),
  );
}

export function FanletterNewsPublicCutsFeedPage({
  dictionary,
  excludeReportId = null,
  hasMore: initialHasMore,
  initialCutSlotNumber = null,
  items: initialItems,
  locale,
  nextOffset: initialNextOffset,
  referralCode,
  shareId,
  sourceContentId = null,
}: {
  dictionary: Dictionary;
  excludeReportId?: string | null;
  hasMore: boolean;
  initialCutSlotNumber?: number | null;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  locale: Locale;
  nextOffset: number;
  referralCode: string | null;
  shareId: string | null;
  sourceContentId?: string | null;
}) {
  const copy = getCopy(locale);
  const memberSession = useMemberSession();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [swipeGuideTarget, setSwipeGuideTarget] =
    useState<CutFeedSwipeGuideTarget | null>(null);
  const [entrySwipeGuideDismissed, setEntrySwipeGuideDismissed] =
    useState(false);
  const [sourceViewSwipeGuideDismissed, setSourceViewSwipeGuideDismissed] =
    useState(false);
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [isCutFeedHeaderVisible, setIsCutFeedHeaderVisible] = useState(true);
  const [visibleFeedIndex, setVisibleFeedIndex] = useState(0);
  const [reporterPanelRequest, setReporterPanelRequest] = useState<{
    id: number;
    index: number;
  } | null>(null);
  const [visibleViewportHeight, setVisibleViewportHeight] = useState<
    string | null
  >(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const headerRevealTimerRef = useRef<number | null>(null);
  const cutFeedHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    referralCode,
  );
  const newsroomHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  const reportersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporters`,
    referralCode,
  );
  const vlogsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/vlogs`,
    referralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    referralCode,
  );
  const myHref = buildPathWithReferral(
    `/${locale}/fanletter/news/my`,
    referralCode,
  );
  const reportsNewHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/reports/new`, referralCode),
    {
      returnTo: cutFeedHomeHref,
    },
  );
  const vlogsManageHref = buildPathWithReferral(
    `/${locale}/fanletter/news/vlogs/manage`,
    referralCode,
  );
  const vlogsNewHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/vlogs/new`, referralCode),
    {
      returnTo: vlogsManageHref,
    },
  );
  const serviceMenuItems: CutFeedServiceMenuItem[] = [
    {
      href: cutFeedHomeHref,
      icon: Home,
      label: copy.serviceHome,
      secondaryLabel: copy.serviceHomeHint,
      primary: true,
    },
    {
      href: charactersHref,
      icon: Sparkles,
      label: copy.serviceCharacters,
      secondaryLabel: copy.serviceCharactersHint,
    },
    {
      href: reportersHref,
      icon: PenLine,
      label: copy.serviceReporters,
      secondaryLabel: copy.serviceReportersHint,
    },
    {
      href: vlogsHref,
      icon: Video,
      label: copy.serviceVlogs,
      secondaryLabel: copy.serviceVlogsHint,
    },
    {
      href: purchasesHref,
      icon: BookOpenCheck,
      label: copy.servicePurchases,
      secondaryLabel: copy.servicePurchasesHint,
    },
    {
      href: myHref,
      icon: UserRound,
      label: copy.serviceMy,
      secondaryLabel: copy.serviceMyHint,
    },
    {
      href: reportsNewHref,
      icon: Plus,
      label: copy.serviceReportNew,
      secondaryLabel: copy.serviceReportNewHint,
    },
    {
      href: vlogsNewHref,
      icon: Video,
      label: copy.serviceVlogNew,
      secondaryLabel: copy.serviceVlogNewHint,
    },
    {
      href: newsroomHref,
      icon: Newspaper,
      label: copy.serviceNewsroom,
      secondaryLabel: copy.serviceNewsroomHint,
    },
  ];
  const headerCountLabel = hasMore
    ? `${formatNumber(items.length, locale)}+`
    : formatNumber(items.length, locale);
  const visibleItem =
    items[
      Math.min(Math.max(visibleFeedIndex, 0), Math.max(items.length - 1, 0))
    ] ?? items[0];
  const viewerReporterReferralCode = normalizeReferralCode(
    memberSession.member?.referralCode,
  );
  const visibleItemReporterReferralCode = normalizeReferralCode(
    visibleItem?.report.reporterReferralCode,
  );
  const isVisibleItemViewerReport = Boolean(
    viewerReporterReferralCode &&
      visibleItemReporterReferralCode &&
      viewerReporterReferralCode === visibleItemReporterReferralCode,
  );
  const firstSlideCutCount = items[0] ? getPublicCutItemCutCount(items[0]) : 0;
  const shouldOfferEntrySwipeGuide = Boolean(
    (shareId || excludeReportId) && firstSlideCutCount > 1,
  );
  const viewportStyle: CutFeedViewportStyle | undefined = visibleViewportHeight
    ? {
        "--fanletter-cut-feed-vh": visibleViewportHeight,
      }
    : undefined;
  const dismissSwipeGuide = useCallback(() => {
    if (swipeGuideTarget?.reason === "entry") {
      setEntrySwipeGuideDismissed(true);

      if (
        canShowSourceViewSwipeGuideAtIndex({
          index: swipeGuideTarget.index,
          items,
          root: scrollContainerRef.current,
        })
      ) {
        setSourceViewSwipeGuideDismissed(true);
      }
    }

    if (swipeGuideTarget?.reason === "sourceView") {
      setSourceViewSwipeGuideDismissed(true);
    }

    setSwipeGuideTarget(null);
  }, [items, swipeGuideTarget]);
  const handleSourceViewSlideVisible = useCallback(
    (index: number) => {
      if (sourceViewSwipeGuideDismissed || swipeGuideTarget) {
        return;
      }

      if (
        index === 0 &&
        shouldOfferEntrySwipeGuide &&
        !entrySwipeGuideDismissed
      ) {
        return;
      }

      setSourceViewSwipeGuideDismissed(true);
      setSwipeGuideTarget({
        index,
        reason: "sourceView",
      });
    },
    [
      entrySwipeGuideDismissed,
      shouldOfferEntrySwipeGuide,
      sourceViewSwipeGuideDismissed,
      swipeGuideTarget,
    ],
  );
  const handleFeedScroll = useCallback(() => {
    const root = scrollContainerRef.current;

    if (!root) {
      return;
    }

    const visibleIndex = getVisibleFeedIndex({
      itemCount: items.length,
      root,
    });

    setVisibleFeedIndex((currentIndex) => {
      if (currentIndex === visibleIndex) {
        return currentIndex;
      }

      setIsCutFeedHeaderVisible(true);

      return visibleIndex;
    });

    if (swipeGuideTarget) {
      const guideScrollTop = root.clientHeight * swipeGuideTarget.index;
      const dismissDistance =
        root.clientHeight * CUT_SWIPE_GUIDE_DISMISS_SCROLL_RATIO;

      if (Math.abs(root.scrollTop - guideScrollTop) >= dismissDistance) {
        dismissSwipeGuide();
      }

      return;
    }

    if (sourceViewSwipeGuideDismissed) {
      return;
    }

    if (
      canShowSourceViewSwipeGuideAtIndex({
        index: visibleIndex,
        items,
        root,
      })
    ) {
      setSourceViewSwipeGuideDismissed(true);
      setSwipeGuideTarget({
        index: visibleIndex,
        reason: "sourceView",
      });
    }
  }, [
    dismissSwipeGuide,
    items,
    sourceViewSwipeGuideDismissed,
    swipeGuideTarget,
  ]);
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
    let animationFrameId: number | null = null;

    const updateVisibleViewportHeight = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        const nextHeight =
          window.visualViewport?.height && window.visualViewport.height > 0
            ? window.visualViewport.height
            : window.innerHeight;
        const nextValue = `${Math.round(nextHeight)}px`;

        setVisibleViewportHeight((currentValue) =>
          currentValue === nextValue ? currentValue : nextValue,
        );
        animationFrameId = null;
      });
    };
    const visualViewport = window.visualViewport;

    updateVisibleViewportHeight();
    window.addEventListener("orientationchange", updateVisibleViewportHeight);
    window.addEventListener("resize", updateVisibleViewportHeight);
    visualViewport?.addEventListener("resize", updateVisibleViewportHeight);
    visualViewport?.addEventListener("scroll", updateVisibleViewportHeight);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener(
        "orientationchange",
        updateVisibleViewportHeight,
      );
      window.removeEventListener("resize", updateVisibleViewportHeight);
      visualViewport?.removeEventListener("resize", updateVisibleViewportHeight);
      visualViewport?.removeEventListener("scroll", updateVisibleViewportHeight);
    };
  }, []);

  useEffect(() => {
    const handleSourceRevealStateChange = (event: Event) => {
      const detail = (event as CustomEvent<FanletterNewsSourceRevealStateChangeDetail>)
        .detail;

      if (!detail?.reportId) {
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.report.reportId === detail.reportId
            ? {
                ...item,
                sourceReveal: detail.state,
              }
            : item,
        ),
      );
    };

    window.addEventListener(
      FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
      handleSourceRevealStateChange,
    );

    return () => {
      window.removeEventListener(
        FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
        handleSourceRevealStateChange,
      );
    };
  }, []);

  useEffect(() => {
    if (swipeGuideTarget) {
      return;
    }

    if (shouldOfferEntrySwipeGuide && !entrySwipeGuideDismissed) {
      setSwipeGuideTarget({
        index: 0,
        reason: "entry",
      });
      return;
    }

    if (sourceViewSwipeGuideDismissed) {
      return;
    }

    const root = scrollContainerRef.current;
    const visibleIndex = root
      ? getVisibleFeedIndex({
          itemCount: items.length,
          root,
        })
      : 0;

    if (
      canShowSourceViewSwipeGuideAtIndex({
        index: visibleIndex,
        items,
        root,
      })
    ) {
      setSourceViewSwipeGuideDismissed(true);
      setSwipeGuideTarget({
        index: visibleIndex,
        reason: "sourceView",
      });
    }
  }, [
    entrySwipeGuideDismissed,
    items,
    shouldOfferEntrySwipeGuide,
    sourceViewSwipeGuideDismissed,
    swipeGuideTarget,
  ]);

  useEffect(() => {
    if (!serviceMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServiceMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [serviceMenuOpen]);

  useEffect(() => {
    if (headerRevealTimerRef.current) {
      window.clearTimeout(headerRevealTimerRef.current);
      headerRevealTimerRef.current = null;
    }

    setIsCutFeedHeaderVisible(true);

    if (serviceMenuOpen) {
      return;
    }

    const visibleDuration =
      visibleFeedIndex === 0 && (shareId || excludeReportId)
        ? CUT_FEED_ENTRY_HEADER_VISIBLE_MS
        : CUT_FEED_HEADER_VISIBLE_MS;

    headerRevealTimerRef.current = window.setTimeout(() => {
      setIsCutFeedHeaderVisible(false);
      headerRevealTimerRef.current = null;
    }, visibleDuration);

    return () => {
      if (headerRevealTimerRef.current) {
        window.clearTimeout(headerRevealTimerRef.current);
        headerRevealTimerRef.current = null;
      }
    };
  }, [excludeReportId, serviceMenuOpen, shareId, visibleFeedIndex]);

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
      <main
        className="flex min-h-[var(--fanletter-cut-feed-vh,100dvh)] items-center justify-center bg-[#050706] px-4 text-white"
        style={viewportStyle}
      >
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
            href={newsroomHref}
          >
            <ArrowLeft className="size-4" />
            {copy.emptyCta}
          </Link>
        </section>
      </main>
    );
  }

  const isCutFeedHeaderExpanded = serviceMenuOpen || isCutFeedHeaderVisible;
  const headerClassName = `pointer-events-none fixed left-1/2 top-0 z-30 w-full max-w-[430px] -translate-x-1/2 text-white transition-[background-color,border-color,padding,box-shadow] duration-500 ease-out ${
    isCutFeedHeaderExpanded
      ? "border-b border-white/10 bg-black/30 px-3 py-3 shadow-[0_18px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl"
      : "border-b border-transparent bg-transparent px-3 py-2 shadow-none backdrop-blur-none"
  }`;
  const headerReporterClassName = `pointer-events-auto shrink-0 overflow-hidden transition-[width,opacity,transform] duration-500 ease-out ${
    isCutFeedHeaderExpanded
      ? "w-11 opacity-100 translate-y-0 scale-100 min-[430px]:w-12"
      : "w-0 -translate-y-2 scale-90 opacity-0"
  }`;
  const headerTitleClassName = `min-w-0 flex-1 overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-out ${
    isCutFeedHeaderExpanded
      ? "max-h-14 translate-y-0 opacity-100"
      : "max-h-0 -translate-y-2 opacity-0"
  }`;
  const serviceMenuButtonClassName = `pointer-events-auto group inline-flex h-10 shrink-0 items-center rounded-full border text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-[background-color,border-color,color,gap,padding,transform] duration-500 ease-out hover:bg-[#44f26e] hover:text-[#111510] ${
    isCutFeedHeaderExpanded
      ? "gap-2 border-[#44f26e]/28 bg-[#44f26e]/14 px-3"
      : "gap-1.5 border-white/16 bg-black/42 px-3"
  }`;
  const activeFeedIndex = Math.min(
    Math.max(visibleFeedIndex, 0),
    Math.max(items.length - 1, 0),
  );
  const renderWindowStart = Math.max(
    0,
    activeFeedIndex - CUT_FEED_RENDER_WINDOW_RADIUS,
  );
  const renderWindowEnd = Math.min(
    items.length - 1,
    activeFeedIndex + CUT_FEED_RENDER_WINDOW_RADIUS,
  );

  return (
    <main
      className="h-[var(--fanletter-cut-feed-vh,100dvh)] overflow-hidden bg-[#050706] text-white"
      style={viewportStyle}
    >
      <header className={headerClassName}>
        <div className="mx-auto flex items-center gap-2">
          {visibleItem ? (
            <div className={headerReporterClassName}>
              <CutFeedHeaderReporterChip
                avatarImageUrl={visibleItem.report.reporterAvatarImageUrl}
                isViewerReport={isVisibleItemViewerReport}
                label={copy.reporter}
                name={visibleItem.report.reporterName}
                onClick={() => {
                  setServiceMenuOpen(false);
                  setReporterPanelRequest((currentRequest) => ({
                    id: (currentRequest?.id ?? 0) + 1,
                    index: visibleFeedIndex,
                  }));
                }}
                viewerReportLabel={copy.myReportBadge}
              />
            </div>
          ) : null}
          <div className={headerTitleClassName}>
            <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              <span className="min-[430px]:hidden">{copy.eyebrowShort}</span>
              <span className="hidden min-[430px]:inline">{copy.eyebrow}</span>
            </p>
            <h1 className="truncate text-[1.02rem] font-black leading-tight tracking-normal">
              <span className="min-[430px]:hidden">{copy.titleShort}</span>
              <span className="hidden min-[430px]:inline">{copy.title}</span>
            </h1>
          </div>
          <button
            aria-expanded={serviceMenuOpen}
            aria-label={copy.serviceMenu}
            className={serviceMenuButtonClassName}
            onClick={() => setServiceMenuOpen(true)}
            type="button"
          >
            <Menu className="size-4" />
            <span
              className={`hidden text-[0.72rem] font-black transition-opacity duration-300 min-[430px]:inline ${
                isCutFeedHeaderExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              {copy.serviceMenu}
            </span>
            <span className="rounded-full bg-white/12 px-2 py-1 text-xs font-black leading-none text-white transition group-hover:text-[#111510]">
              {headerCountLabel}
            </span>
          </button>
        </div>
      </header>
      {serviceMenuOpen ? (
        <CutFeedServiceMenuSheet
          copy={copy}
          items={serviceMenuItems}
          onClose={() => setServiceMenuOpen(false)}
        />
      ) : null}
      <div
        className="mx-auto h-full w-full max-w-[430px] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black shadow-[0_0_56px_rgba(0,0,0,0.38)] scroll-smooth sm:border-x sm:border-white/10"
        onScroll={handleFeedScroll}
        ref={scrollContainerRef}
      >
        {items.map((item, index) => {
          const isRenderedSlide =
            index >= renderWindowStart && index <= renderWindowEnd;

          if (!isRenderedSlide) {
            return (
              <div
                aria-hidden="true"
                className="min-h-[var(--fanletter-cut-feed-vh,100dvh)] snap-start snap-always bg-black"
                data-cut-feed-placeholder={index}
                key={item.report.reportId}
              />
            );
          }

          return (
            <FeedSlide
              dictionary={dictionary}
              hasMore={hasMore}
              index={index}
              initialCutSlotNumber={index === 0 ? initialCutSlotNumber : null}
              initialSourceContentId={index === 0 ? sourceContentId : null}
              isActive={index === activeFeedIndex}
              item={item}
              itemCount={items.length}
              key={item.report.reportId}
              locale={locale}
              onDismissSwipeGuide={dismissSwipeGuide}
              onSourceViewSlideVisible={handleSourceViewSlideVisible}
              reporterPanelRequestId={
                reporterPanelRequest?.index === index
                  ? reporterPanelRequest.id
                  : 0
              }
              referralCode={referralCode}
              shareId={shareId}
              showSwipeGuide={swipeGuideTarget?.index === index}
            />
          );
        })}
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
