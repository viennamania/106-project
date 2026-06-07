"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Compass,
  ExternalLink,
  HeartHandshake,
  Home,
  Images,
  Loader2,
  LockKeyhole,
  Menu,
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
  FANLETTER_NEWS_PUBLIC_CUT_SHARED_PAGE_SIZE,
  normalizeFanletterNewsPublicCutSlotNumber,
  type FanletterNewsPublicCutFeedLoadResponse,
  type FanletterNewsPublicCutSource,
  type FanletterNewsPublicCutSourceLoadResponse,
  type SerializedFanletterNewsPublicCutFeedItem,
  type SerializedFanletterNewsPublicCutFeedItemBase,
  type SerializedFanletterNewsPublicCutShareRecap,
} from "@/lib/fanletter-news-public-cuts-shared";
import {
  FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
  FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY,
  normalizeFanletterNewsRolePreference,
  type FanletterNewsRolePreference,
} from "@/lib/fanletter-news-role-preference";
import {
  getFanletterNewsBareArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
import { getFanletterNewsVlogStartHref } from "@/lib/fanletter-news-vlog-routing";
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
const CUT_FEED_CHROME_VISIBLE_MS = 4200;
const CUT_FEED_LOGIN_SYNC_GRACE_MS = 4500;
const CUT_FEED_RENDER_WINDOW_RADIUS = 0;
const CUT_FEED_SHARED_JOURNEY_MAX_REPORTS = 3;
const CUT_FEED_SHARED_DISCOVERY_LIMIT = 3;
const CUT_FEED_SHARED_TIMELINE_CANDIDATE_LOAD_LIMIT = 6;
const CUT_FEED_CHROME_HIDE_EVENT = "fanletter-news-cut-feed-chrome-hide";
const CUT_FEED_VISIBLE_INDEX_CHANGE_EVENT =
  "fanletter-news-cut-feed-visible-index-change";
const CUT_DWELL_MIN_TRACK_MS = 800;
const CUT_DWELL_MAX_TRACK_MS = 60000;
const CUT_FEED_LOCKED_SCROLL_BLOCK_THRESHOLD_PX = 6;
const CUT_FEED_SHARED_CONSUMED_STORAGE_PREFIX =
  "fanletter-news-cut-feed-shared-consumed";
const CUT_FEED_SHARED_VIEWED_STORAGE_PREFIX =
  "fanletter-news-cut-feed-shared-viewed";

type CutFeedViewportStyle = CSSProperties & {
  "--fanletter-cut-feed-vh"?: string;
};

type CutDwellExitReason =
  | "cut_select"
  | "horizontal_swipe"
  | "page_hide"
  | "slide_unmount"
  | "source_open"
  | "vertical_next"
  | "vertical_previous";

type CutDwellSnapshot = {
  contentId: string;
  key: string;
  metadata: Record<string, boolean | null | number | string>;
  referralCode: string | null;
  shareId: string | null;
  startedAt: number;
  targetHref: string;
};

type CutFeedVisibleIndexChangeDetail = {
  nextIndex: number;
  previousIndex: number;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        adult: "성인 팬 전용",
        character: "캐릭터",
        characterChannelCta: "채널 보기",
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
        navigationPending: {
          body: "새 화면을 불러오고 있습니다. 이전 흐름으로 돌아올 수 있는 화면이 열립니다.",
          character: (name: string) => `${name} 캐릭터 채널로 이동 중`,
          destination: (label: string) => `${label} 화면으로 이동 중`,
          report: "리포트 작성 화면으로 이동 중",
          reporter: (name: string) => `${name} 팬 기자 채널로 이동 중`,
          source: "원본 화면으로 이동 중",
          title: "이동 중",
        },
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
        reporterQuickDesk: {
          compactSummary: (count: string) => `공개 전 원본 ${count}개`,
          currentCta: "공개 원본으로 4컷 리포트 작성",
          currentLockedCta: "공개 전 4컷 선점 리포트 작성",
          jumpCta: "공개 전 원본 찾기",
          jumpShortCta: "찾기",
          nextCta: "다음 미작성 소재 작성",
          slotFullCta: (used: string, limit: string) =>
            `리포터 슬롯 마감 ${used}/${limit}`,
          summary: (count: string) =>
            `아직 원본이 열리지 않은 소재 ${count}개를 빠르게 찾아 4컷 편집으로 이어갈 수 있습니다.`,
          title: "리포터 빠른 작성",
          viewerCurrentCta: "이미 작성한 리포트",
        },
        reporterSourceMetric: "원본 오픈",
        returnToBrief: "브리프",
        returnToBriefA11y: "플랫폼 브리프로 돌아가기",
        returnToBriefFull: "플랫폼 브리프로 돌아가기",
        retry: "다시 시도",
        serviceCharacters: "AI 캐릭터",
        serviceCharactersHint: "캐릭터 채널",
        serviceHome: "4컷 피드",
        serviceHomeHint: "홈",
        serviceMenu: "탐색",
        serviceMenuClose: "탐색 닫기",
        serviceMenuTitle: "AIAVpark News",
        serviceMy: "마이",
        serviceMyHint: "활동·계정",
        servicePlatform: "플랫폼 소개",
        servicePlatformHint: "서비스 구조",
        servicePurchases: "구매함",
        servicePurchasesHint: "구매 콘텐츠",
        serviceReportNew: "리포트 작성",
        serviceReportNewHint: "작성 시작",
        serviceReporters: "팬 기자",
        serviceReportersHint: "기자 채널",
        serviceShareLinks: "공유 링크",
        serviceShareLinksHint: "유입 분석",
        serviceSectionCreate: "만들기",
        serviceSectionExplore: "탐색",
        serviceSectionMine: "내 활동",
        serviceVlogNew: "브이로그 등록",
        serviceVlogNewHint: "등록 시작",
        vloggerDesk: {
          characterCta: "이 캐릭터 원본 보기",
          characterShortCta: "원본",
          manageCta: "내 브이로그 관리",
          manageShortCta: "관리",
          newCta: "새 브이로그 만들기",
          newShortCta: "만들기",
          summary:
            "컷 피드 반응을 보면서 다음 원본을 만들거나 업로드하세요. 브이로거도 먼저 팬처럼 소비한 뒤 제작으로 이어집니다.",
          compactSummary: "컷 반응 보고 다음 원본 제작",
          title: "브이로거 제작 바로가기",
        },
        serviceVlogs: "원본 브이로그",
        serviceVlogsHint: "공개·팬 전용",
        share: "공유하기",
        shareCopied: "링크가 복사되었습니다",
        shareError: "공유할 수 없습니다",
        shareMemoBody:
          "이 링크가 어디에 공유됐는지 나중에 구분할 수 있도록 짧게 메모하세요.",
        shareMemoCancel: "취소",
        shareMemoPlaceholder: "예: 인스타 스토리, X 테스트, 친구방 공유",
        shareMemoSubmit: "공유 링크 만들기",
        shareMemoTitle: "공유 메모",
        shareSharing: "공유 중",
        shareSummary: (headline: string, reporterName: string) =>
          `팬 기자 ${reporterName}가 고른 ${headline} 4컷을 확인해보세요.`,
        shareTitle: (headline: string) => `팬 기자가 편집한 4컷: ${headline}`,
        sharedSourceCtaBody:
          "팬 기자가 고른 장면의 전체 흐름을 원본 브이로그로 이어서 확인하세요.",
        sharedSourceCtaEyebrow: "4컷 확인 완료",
        sharedSourceCtaTitle: "이제 원본 브이로그로 이어보기",
        sharedSourcePreviewContinueCta: "돌아가기",
        sharedPaidSourceBody:
          "팬 전용 원본이라 여기서는 분위기만 확인할 수 있어요. 리포트 컷 흐름으로 돌아가 이어서 살펴보세요.",
        sharedPaidSourceTitle: "팬 전용 원본입니다.",
        sharedSourcePreviewCtaBody:
          "원본 프리뷰까지 확인하면, 같은 캐릭터의 다음 컷으로 이어집니다.",
        sharedSourcePreviewCtaTitle: "원본 프리뷰 먼저 보기",
        sharedSourcePreviewPanelBody:
          "프리뷰를 본 뒤 돌아가면, 같은 캐릭터의 다음 컷으로 이어집니다.",
        sharedSourcePreviewPanelTitle: "원본 프리뷰 확인 중",
        sharedScrollGuideBody:
          "지금부터 아래로 스크롤할 수 있어요. AI 캐릭터 IP를 먼저 소개한 뒤, 같은 캐릭터의 다른 컷으로 이어집니다.",
        sharedScrollGuideTitle: (name: string) =>
          `아래로 넘겨 ${name} 타임라인 보기`,
        sharedTimelineBadge: (name: string) => `${name} 타임라인`,
        sharedTimelineNext: "다음 브이로그",
        sharedCutRecapBody: (name: string) =>
          `${name} 흐름에서 사람들이 어느 컷에 오래 머물렀는지 전체 여정으로 정리했어요.`,
        sharedCutRecapCollectingBody: (name: string) =>
          `${name} 공유 반응이 쌓이는 중입니다. 지금 확인된 컷 반응을 전체 여정으로 정리했어요.`,
        sharedCutRecapCollectingMetric: "수집 중",
        sharedCutRecapCollectingTitle: "반응 수집 중",
        sharedCutRecapDwellEvents: (count: string) => `${count}회`,
        sharedCutRecapDwellTitle: "컷별 체류",
        sharedCutRecapEntryBadge: "진입 컷",
        sharedCutRecapEyebrow: "공유 반응",
        sharedCutRecapHeadline: "사람들이 오래 본 컷",
        sharedCutRecapNextGuide:
          "오늘 본 컷 반응을 확인했어요.",
        sharedCutRecapTitle: (count: string) => `${count}컷 확인 완료`,
        sharedCutRecapTopCutTitle: "가장 오래 본 컷",
        sharedCutRecapTotalActions: "전체 행동",
        sharedVlogPickerBody:
          "사진을 보고 팬 리포트 하나를 골라 이어보세요.",
        sharedVlogPickerCta: "이 리포트 보기",
        sharedVlogPickerDefaultBadge: "추천",
        sharedVlogPickerViewedBadge: "보는 중",
        sharedVlogPickerCompletedBadge: "시청 완료",
        sharedVlogPickerEyebrow: "다음 브이로그",
        sharedVlogPickerReportCount: (count: string) => `팬 리포트 ${count}개`,
        sharedVlogPickerReports: "팬 리포트",
        sharedVlogPickerSkip: "선택하지 않고 아래로",
        sharedVlogPickerSingleBody:
          "사진을 보고 추천 리포트로 이어보세요.",
        sharedVlogPickerSingleTitle: "추천 팬 리포트로 이어보기",
        sharedVlogPickerTitle: "다음 브이로그의 팬 리포트 선택",
        sharedEndBody: (name: string) =>
          `${name}의 오늘 컷 흐름을 확인했어요. 계속 보거나, 새 리포트 알림을 받고 다른 AI 캐릭터도 둘러보세요.`,
        sharedEndContinue: (name: string) => `${name} 계속 보기`,
        sharedEndCutsMetric: "본 컷",
        sharedEndEyebrow: "오늘의 공유 흐름",
        sharedEndNotify: "새 리포트 알림 받기",
        sharedEndOtherBody:
          "공유 링크 밖에도 새 브이로그와 팬 리포트가 이어집니다.",
        sharedEndOtherEmpty: "곧 다른 캐릭터도 소개할게요",
        sharedEndOtherLoading: "다른 캐릭터 불러오는 중",
        sharedEndOtherTitle: "다른 AI 캐릭터도 활동 중이에요",
        sharedEndReportsMetric: "본 리포트",
        sharedEndShare: "이 흐름 공유하기",
        sharedEndTitle: (name: string) => `${name} 리포트는 여기까지`,
        sharedTimelineSourceGateBody: (
          viewed: string,
          total: string,
          action: string,
        ) =>
          `${total}컷 중 ${viewed}컷을 확인했습니다. 남은 컷을 모두 보면 ${action} 버튼이 열립니다.`,
        sharedTimelineSourceGateTitle: "새 4컷 확인 중",
        characterIntroBody: (name: string) =>
          `방금 본 컷과 원본은 ${name} 캐릭터 IP에서 이어집니다. 팬 리포트와 원본 브이로그를 같은 흐름으로 더 살펴보세요.`,
        characterIntroCta: "캐릭터 채널 보기",
        characterIntroEyebrow: "AI Character IP",
        characterIntroNextGuide:
          "한 번 더 아래로 넘기면 이 캐릭터의 다른 컷을 볼 수 있어요.",
        characterIntroTitle: (name: string) => `${name} 캐릭터 IP`,
        slot: (index: string) => `컷 ${index}`,
        sourceOpen: "보고싶어요",
        sourceOpenCta: "보고싶어요",
        sourceOpenCompleteSummary: (count: string, threshold: string) =>
          `${count}/${threshold}명 참여 완료`,
        sourceOpenDone: "원본 공개 완료",
        sourceOpenSignupCta: "가입 완료",
        sourceOpenSponsors: "보고싶어요 참여자",
        sourceOpenSponsorsAnonymous: "익명 참여자",
        sourceOpenSponsorsClose: "참여자 닫기",
        sourceOpenSponsorsCompletedA11y: (count: string) =>
          `보고싶어요 참여자 ${count}명`,
        sourceOpenSponsorsCompletedBody:
          "이 팬들의 보고싶어요로 원본 브이로그가 공개됐습니다.",
        sourceOpenSponsorsCompletedStatus: "공개 완료",
        sourceOpenSponsorsCompletedTitle: "6명이 보고싶어요",
        sourceOpenSponsorsEmptySlot: (position: string) =>
          `보고싶어요 대기 슬롯 ${position}`,
        sourceOpenSponsorsIntro:
          "6명이 보고싶어요를 누르면 원본 브이로그가 공개됩니다. 참여하면 선공개와 영구 크레딧을 받습니다.",
        sourceOpenSponsorsJoined: (count: string, remaining: string) =>
          `보고싶어요 ${count}명 참여, ${remaining}명 남음`,
        sourceOpenSponsorsListTitle: "보고싶어요 참여 현황",
        sourceOpenSponsorsOpenA11y: (count: string, remaining: string) =>
          `보고싶어요 ${count}명 참여, ${remaining}명 남음`,
        sourceOpenSponsorsParticipant: (name: string) =>
          `보고싶어요 참여자 ${name}`,
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
          "6명이 보고싶어요를 누르면 전체 원본 브이로그가 공개됩니다.",
        sourcePreviewEyebrow: "원본 프리뷰",
        sourcePreviewJoinedBody: (remaining: string) =>
          `참여가 반영되었습니다. ${remaining}명만 더 참여하면 원본이 열리고, 내 참여 기록도 남습니다.`,
        sourcePreviewJoinedTitle: "참여 완료 · 공개까지 이어집니다",
        sourcePreviewJoinCta: "보고싶어요 참여",
        sourcePreviewLoginCta: "로그인하고 참여",
        sourcePreviewSignupCta: "가입 완료 후 참여",
        sourcePreviewNextCta: "다음 보고싶어요 찾기",
        sourcePreviewTitle: "프리뷰를 보고 보고싶어요에 참여하세요",
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
        verticalSwipeGuide: "위아래로 넘겨 다음 피드 보기",
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
        navigationPending: {
          body: "Loading the next screen. It will keep a return path back to this flow.",
          character: (name: string) => `Opening ${name}'s character channel`,
          destination: (label: string) => `Opening ${label}`,
          report: "Opening report composer",
          reporter: (name: string) => `Opening ${name}'s reporter channel`,
          source: "Opening source screen",
          title: "Moving",
        },
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
        reporterQuickDesk: {
          compactSummary: (count: string) => `${count} unopened sources`,
          currentCta: "Write a 4-cut report from this open source",
          currentLockedCta: "Claim 4 cuts before source opens",
          jumpCta: "Find unopened source",
          jumpShortCta: "Find",
          nextCta: "Write next unreported source",
          slotFullCta: (used: string, limit: string) =>
            `Reporter slots full ${used}/${limit}`,
          summary: (count: string) =>
            `${count} unopened source candidates can be found quickly and turned into a four-cut report.`,
          title: "Reporter quick desk",
          viewerCurrentCta: "Already your report",
        },
        reporterSourceMetric: "Source open",
        returnToBrief: "Brief",
        returnToBriefA11y: "Back to platform brief",
        returnToBriefFull: "Back to brief",
        retry: "Retry",
        serviceCharacters: "AI Characters",
        serviceCharactersHint: "Character channels",
        serviceHome: "4-Cut Feed",
        serviceHomeHint: "Home",
        serviceMenu: "Explore",
        serviceMenuClose: "Close explore",
        serviceMenuTitle: "AIAVpark News",
        serviceMy: "My",
        serviceMyHint: "Activity · account",
        servicePlatform: "Platform",
        servicePlatformHint: "Service model",
        servicePurchases: "Purchases",
        servicePurchasesHint: "Paid content",
        serviceReportNew: "Write Report",
        serviceReportNewHint: "Start writing",
        serviceReporters: "Fan Reporters",
        serviceReportersHint: "Reporter channels",
        serviceShareLinks: "Share Links",
        serviceShareLinksHint: "Traffic analytics",
        serviceSectionCreate: "Create",
        serviceSectionExplore: "Explore",
        serviceSectionMine: "My Activity",
        serviceVlogNew: "Upload Vlog",
        serviceVlogNewHint: "Start upload",
        vloggerDesk: {
          characterCta: "View this character's sources",
          characterShortCta: "Sources",
          manageCta: "Manage my vlogs",
          manageShortCta: "Manage",
          newCta: "Create new vlog",
          newShortCta: "Create",
          summary:
            "Watch cut-feed reactions, then create or upload the next source. Vloggers stay consumers first, then move into production.",
          compactSummary: "Create from cut-feed reactions",
          title: "Vlogger production shortcut",
        },
        serviceVlogs: "Source Vlogs",
        serviceVlogsHint: "Public & fan-only",
        share: "Share",
        shareCopied: "Link copied to clipboard",
        shareError: "Could not share",
        shareMemoBody:
          "Add a short note so you can identify where this link was shared later.",
        shareMemoCancel: "Cancel",
        shareMemoPlaceholder: "Ex. Instagram story, X test, group chat",
        shareMemoSubmit: "Create share link",
        shareMemoTitle: "Share note",
        shareSharing: "Sharing",
        shareSummary: (headline: string, reporterName: string) =>
          `See the four cuts ${reporterName} selected for ${headline}.`,
        shareTitle: (headline: string) => `Four cuts edited by a fan reporter: ${headline}`,
        sharedSourceCtaBody:
          "Continue from the moments the fan reporter picked into the full source vlog.",
        sharedSourceCtaEyebrow: "All cuts viewed",
        sharedSourceCtaTitle: "Continue to the source vlog",
        sharedSourcePreviewContinueCta: "Back",
        sharedPaidSourceBody:
          "This is fan-only source content. Preview the mood here, then return to the report flow.",
        sharedPaidSourceTitle: "Fan-only source content.",
        sharedSourcePreviewCtaBody:
          "After the source preview, continue into the next cuts from this character.",
        sharedSourcePreviewCtaTitle: "Preview the source first",
        sharedSourcePreviewPanelBody:
          "After this preview, go back to continue into the next cuts from this character.",
        sharedSourcePreviewPanelTitle: "Source preview in progress",
        sharedScrollGuideBody:
          "You can scroll down now. The next screen introduces the AI character IP behind this vlog, then keeps the feed focused on that character.",
        sharedScrollGuideTitle: (name: string) =>
          `Swipe down for ${name}'s timeline`,
        sharedTimelineBadge: (name: string) => `${name}'s timeline`,
        sharedTimelineNext: "Next vlog",
        sharedCutRecapBody: (name: string) =>
          `See which ${name} cuts held people's attention across this shared journey.`,
        sharedCutRecapCollectingBody: (name: string) =>
          `${name}'s share signals are still collecting. The confirmed cut reactions are summarized across this journey.`,
        sharedCutRecapCollectingMetric: "Collecting",
        sharedCutRecapCollectingTitle: "Collecting signals",
        sharedCutRecapDwellEvents: (count: string) => `${count} views`,
        sharedCutRecapDwellTitle: "Dwell by cut",
        sharedCutRecapEntryBadge: "Entry cut",
        sharedCutRecapEyebrow: "Share Cut Signals",
        sharedCutRecapHeadline: "Cuts people stayed on",
        sharedCutRecapNextGuide:
          "You reviewed the cut reactions from this flow.",
        sharedCutRecapTitle: (count: string) => `${count} cuts viewed`,
        sharedCutRecapTopCutTitle: "Most watched cut",
        sharedCutRecapTotalActions: "All actions",
        sharedVlogPickerBody:
          "Choose one fan report from the cut images to continue.",
        sharedVlogPickerCta: "View this report",
        sharedVlogPickerDefaultBadge: "Recommended",
        sharedVlogPickerViewedBadge: "Watching",
        sharedVlogPickerCompletedBadge: "Viewed",
        sharedVlogPickerEyebrow: "Next vlog",
        sharedVlogPickerReportCount: (count: string) => `${count} fan reports`,
        sharedVlogPickerReports: "Fan reports",
        sharedVlogPickerSkip: "Skip and swipe down",
        sharedVlogPickerSingleBody:
          "Use the cut image to continue with the recommended report.",
        sharedVlogPickerSingleTitle: "Continue with the recommended report",
        sharedVlogPickerTitle: "Choose a fan report for the next vlog",
        sharedEndBody: (name: string) =>
          `You finished today's ${name} cut flow. Keep watching, get notified about new reports, or discover other AI characters.`,
        sharedEndContinue: (name: string) => `Keep watching ${name}`,
        sharedEndCutsMetric: "Cuts viewed",
        sharedEndEyebrow: "Today's shared flow",
        sharedEndNotify: "Get new report alerts",
        sharedEndOtherBody:
          "More source vlogs and fan reports continue beyond this shared link.",
        sharedEndOtherEmpty: "More characters will be introduced soon",
        sharedEndOtherLoading: "Loading other characters",
        sharedEndOtherTitle: "Other AI characters are active too",
        sharedEndReportsMetric: "Reports viewed",
        sharedEndShare: "Share this flow",
        sharedEndTitle: (name: string) => `${name}'s reports end here`,
        sharedTimelineSourceGateBody: (
          viewed: string,
          total: string,
          action: string,
        ) =>
          `${viewed} of ${total} cuts viewed in this new set. Finish the remaining cuts to open the ${action} button.`,
        sharedTimelineSourceGateTitle: "New 4-cut set in progress",
        characterIntroBody: (name: string) =>
          `The cuts and source you just watched come from ${name}'s AI character IP. Keep exploring related fan reports and source vlogs in the same flow.`,
        characterIntroCta: "Open character channel",
        characterIntroEyebrow: "AI Character IP",
        characterIntroNextGuide:
          "Swipe down once more to see more cuts from this character.",
        characterIntroTitle: (name: string) => `${name} character IP`,
        slot: (index: string) => `Cut ${index}`,
        sourceOpen: "Fan-open vote",
        sourceOpenCta: "Want it",
        sourceOpenCompleteSummary: (count: string, threshold: string) =>
          `${count}/${threshold} joined`,
        sourceOpenDone: "Source open",
        sourceOpenSignupCta: "Sign up",
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
        sourcePreviewJoinedBody: (remaining: string) =>
          `Your join was saved. ${remaining} more sponsor slots open the source, and your credit stays attached.`,
        sourcePreviewJoinedTitle: "Joined · helping open the source",
        sourcePreviewJoinCta: "Join Want It",
        sourcePreviewLoginCta: "Sign in to join",
        sourcePreviewSignupCta: "Complete signup to join",
        sourcePreviewNextCta: "Find next Want It",
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
        verticalSwipeGuide: "Swipe up/down for next feed",
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

function formatDuration(valueMs: number, locale: Locale) {
  if (!Number.isFinite(valueMs) || valueMs <= 0) {
    return "-";
  }

  const seconds = valueMs / 1000;

  if (seconds < 60) {
    const formattedSeconds = new Intl.NumberFormat(
      locale === "ko" ? "ko-KR" : "en-US",
      {
        maximumFractionDigits: seconds < 10 ? 1 : 0,
      },
    ).format(seconds);

    return locale === "ko" ? `${formattedSeconds}초` : `${formattedSeconds}s`;
  }

  const minutes = seconds / 60;
  const formattedMinutes = new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : "en-US",
    {
      maximumFractionDigits: minutes < 10 ? 1 : 0,
    },
  ).format(minutes);

  return locale === "ko" ? `${formattedMinutes}분` : `${formattedMinutes}m`;
}

function getCutDwellBucket(durationMs: number) {
  if (durationMs >= 6000) {
    return "strong_6s";
  }

  if (durationMs >= 3000) {
    return "strong_3s";
  }

  if (durationMs >= 1500) {
    return "interested";
  }

  return "glance";
}

function hashStringToPositiveInt(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function getStableRandomInitialCutSlotNumber({
  feedRotationSeed,
  index,
  item,
  referralCode,
  shareId,
}: {
  feedRotationSeed: string;
  index: number;
  item: SerializedFanletterNewsPublicCutFeedItem;
  referralCode: string | null;
  shareId: string | null;
}) {
  const cuts = item.cuts.length > 0 ? item.cuts : [item.leadCut];

  if (cuts.length <= 1) {
    return null;
  }

  const seed = [
    feedRotationSeed,
    shareId?.trim() || referralCode?.trim() || "direct",
    item.report.reportId,
    item.report.contentId,
    String(index),
  ].join(":");
  const cutIndex = hashStringToPositiveInt(seed) % cuts.length;

  return cuts[cutIndex]?.slotNumber ?? null;
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

function getInitialPublicCutIndex(
  item: SerializedFanletterNewsPublicCutFeedItem,
  initialCutSlotNumber?: number | null,
) {
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
}

function getSharedReportIdsStorageKey(prefix: string, shareId: string | null) {
  const normalizedShareId = shareId?.trim();

  return normalizedShareId ? `${prefix}:${normalizedShareId}` : null;
}

function getSharedConsumedStorageKey(shareId: string | null) {
  return getSharedReportIdsStorageKey(
    CUT_FEED_SHARED_CONSUMED_STORAGE_PREFIX,
    shareId,
  );
}

function getSharedViewedStorageKey(shareId: string | null) {
  return getSharedReportIdsStorageKey(
    CUT_FEED_SHARED_VIEWED_STORAGE_PREFIX,
    shareId,
  );
}

function readSharedStoredReportIds(storageKey: string | null) {
  if (!storageKey || typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsedValue = JSON.parse(
      window.sessionStorage.getItem(storageKey) ?? "[]",
    ) as unknown;

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(
      parsedValue.filter((value): value is string => typeof value === "string"),
    );
  } catch {
    return new Set<string>();
  }
}

function writeSharedStoredReportIds(
  storageKey: string | null,
  reportIds: Set<string>,
) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(reportIds)),
    );
  } catch {
    // Session persistence is a convenience; the in-memory gate state still works.
  }
}

function readSharedConsumedReportIds(storageKey: string | null) {
  return readSharedStoredReportIds(storageKey);
}

function writeSharedConsumedReportIds(
  storageKey: string | null,
  reportIds: Set<string>,
) {
  writeSharedStoredReportIds(storageKey, reportIds);
}

function readSharedViewedReportIds(storageKey: string | null) {
  return readSharedStoredReportIds(storageKey);
}

function writeSharedViewedReportIds(
  storageKey: string | null,
  reportIds: Set<string>,
) {
  writeSharedStoredReportIds(storageKey, reportIds);
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
  cutSlotNumber,
  locale,
  referralCode,
  reporterReferralCode,
  reportId,
  returnToHref,
}: {
  cutSlotNumber: number;
  locale: Locale;
  referralCode: string | null;
  reporterReferralCode: string;
  reportId: string;
  returnToHref: string;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/reporters/${encodeURIComponent(
        reporterReferralCode,
      )}`,
      referralCode,
    ),
    {
      [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(cutSlotNumber),
      returnTo: returnToHref,
      sourceReportId: reportId,
    },
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
    : `/${locale}/fanletter/news/cuts/characters`;

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
  | "sourceOpenSignupCta"
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

type CutFeedNavigationPending = {
  href: string;
  label: string;
};

type CutFeedNavigationStart = (pending: CutFeedNavigationPending) => void;

type CutFeedServiceMenuCopy = Pick<
  ReturnType<typeof getCopy>,
  | "navigationPending"
  | "serviceMenu"
  | "serviceMenuClose"
  | "serviceMenuTitle"
  | "serviceSectionCreate"
  | "serviceSectionExplore"
  | "serviceSectionMine"
>;

type CutFeedServiceMenuItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  secondaryLabel: string;
  primary?: boolean;
};

type CutFeedServiceMenuGroup = {
  items: CutFeedServiceMenuItem[];
  label: string;
};

function CutFeedNavigationPendingOverlay({
  copy,
  pending,
}: {
  copy: Pick<ReturnType<typeof getCopy>, "navigationPending">;
  pending: CutFeedNavigationPending | null;
}) {
  if (!pending || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/42 px-5 text-white backdrop-blur-[6px]"
      data-cut-feed-navigation-pending
      role="status"
    >
      <div className="w-full max-w-[20rem] rounded-[1.35rem] border border-[#44f26e]/24 bg-[#061008]/94 p-5 text-center shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[#44f26e] text-[#07110a] shadow-[0_18px_44px_rgba(68,242,110,0.24)]">
          <Loader2 className="size-6 animate-spin" />
        </span>
        <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
          {copy.navigationPending.title}
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight tracking-normal [word-break:keep-all]">
          {pending.label}
        </h2>
        <p className="mt-2 text-xs font-bold leading-5 text-white/58 [word-break:keep-all]">
          {copy.navigationPending.body}
        </p>
      </div>
    </div>,
    document.body,
  );
}

function isSourceRevealResponse(value: unknown): value is SourceRevealResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "sourceReveal" in value &&
    typeof (value as SourceRevealResponse).sourceReveal?.count === "number"
  );
}

function subscribeToRolePreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(
    FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
    onStoreChange,
  );

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(
      FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT,
      onStoreChange,
    );
  };
}

function getRolePreferenceSnapshot() {
  if (typeof window === "undefined") {
    return "general";
  }

  return normalizeFanletterNewsRolePreference(
    window.localStorage.getItem(FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY),
  );
}

function getServerRolePreferenceSnapshot(): FanletterNewsRolePreference {
  return "general";
}

function getReportComposerHref({
  contentId,
  locale,
  referralCode,
  returnToHref,
  sourceReveal,
}: {
  contentId: string | null;
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
  sourceReveal?: "locked" | "opportunity" | "unlocked" | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/reports/quick`,
      referralCode,
    ),
    {
      contentId,
      reportStatus: "unreported",
      returnTo: returnToHref,
      sourceMode: contentId ? "direct" : null,
      sourceReveal: contentId ? (sourceReveal ?? "locked") : "opportunity",
    },
  );
}

function getCutFeedJoinHref({
  locale,
  referralCode,
  returnToHref,
}: {
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/cuts/join`, referralCode),
    {
      returnTo: returnToHref,
    },
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
  viewerEmail = null,
}: {
  activeCutSlotNumber: number;
  contentId: string | null;
  copy: Pick<
    ReturnType<typeof getCopy>,
    | "share"
    | "shareCopied"
    | "shareError"
    | "shareMemoBody"
    | "shareMemoCancel"
    | "shareMemoPlaceholder"
    | "shareMemoSubmit"
    | "shareMemoTitle"
    | "shareSharing"
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
  viewerEmail?: string | null;
}) {
  const [state, setState] = useState<ShareState>("idle");
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [shareMemo, setShareMemo] = useState("");
  const feedbackTimeoutRef = useRef<number | null>(null);
  const isSharingRef = useRef(false);
  const memberSession = useMemberSession();
  const managedShareEmail = memberSession.email ?? viewerEmail;

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

  const handleShare = useCallback(async (memo = "") => {
    if (isSharingRef.current) {
      return;
    }

    isSharingRef.current = true;
    setState("sharing");

    let nextState: Exclude<ShareState, "sharing"> = "idle";

    try {
      const absoluteHref = new URL(href, window.location.origin).toString();
      let nextShareId = createShareId("newscut");
      let shareUrl = setPathSearchParams(
          setShareIdOnHref(absoluteHref, nextShareId),
          {
            [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: String(activeCutSlotNumber),
          },
        );

      if (managedShareEmail) {
        const response = await fetch("/api/fanletter/news-cuts/shares", {
          body: JSON.stringify({
            cutSlotNumber: activeCutSlotNumber,
            href: absoluteHref,
            memo,
            reportId,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Could not create share link.");
        }

        const data = (await response.json()) as {
          shareId?: string;
          shareUrl?: string;
        };

        if (!data.shareId || !data.shareUrl) {
          throw new Error("Invalid share link response.");
        }

        nextShareId = data.shareId;
        shareUrl = data.shareUrl;
      }

      trackFunnelEvent("share_click", {
        contentId,
        metadata: {
          creatorReferralCode,
          cutSlotNumber: activeCutSlotNumber,
          managedShareLink: Boolean(managedShareEmail),
          memoProvided: Boolean(memo.trim()),
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
      setIsMemoOpen(false);
      showShareFeedback(nextState);
    }
  }, [
    activeCutSlotNumber,
    contentId,
    creatorReferralCode,
    href,
    managedShareEmail,
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

  const handleShareButtonClick = useCallback(() => {
    if (managedShareEmail) {
      setShareMemo("");
      setIsMemoOpen(true);
      return;
    }

    void handleShare();
  }, [handleShare, managedShareEmail]);

  return (
    <>
    <span className="relative inline-flex">
      <button
        aria-busy={state === "sharing"}
        aria-label={label}
        className={buttonClassName}
        disabled={state === "sharing"}
        onClick={() => {
          handleShareButtonClick();
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
    {isMemoOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-modal="true"
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/52 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] text-white backdrop-blur-sm"
            onClick={() => {
              if (state !== "sharing") {
                setIsMemoOpen(false);
              }
            }}
            role="dialog"
          >
            <form
              className="w-full max-w-[430px] rounded-[1.25rem] border border-white/12 bg-[#070a08]/96 p-4 shadow-[0_-24px_70px_rgba(0,0,0,0.44)]"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                void handleShare(shareMemo);
              }}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
                  <Share2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black leading-tight">
                    {copy.shareMemoTitle}
                  </h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-white/62 [word-break:keep-all]">
                    {copy.shareMemoBody}
                  </p>
                </div>
              </div>
              <textarea
                className="mt-4 min-h-24 w-full resize-none rounded-[1rem] border border-white/12 bg-white/8 px-3.5 py-3 text-sm font-bold leading-5 text-white outline-none transition placeholder:text-white/34 focus:border-[#44f26e]/50 focus:ring-4 focus:ring-[#44f26e]/14"
                maxLength={120}
                onChange={(event) => setShareMemo(event.target.value)}
                placeholder={copy.shareMemoPlaceholder}
                value={shareMemo}
              />
              <div className="mt-3 flex gap-2">
                <button
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/12 bg-white/8 px-4 text-sm font-black text-white transition hover:bg-white/14 disabled:opacity-55"
                  disabled={state === "sharing"}
                  onClick={() => setIsMemoOpen(false)}
                  type="button"
                >
                  {copy.shareMemoCancel}
                </button>
                <button
                  className="inline-flex h-12 flex-[1.45] items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black text-[#111510] transition hover:bg-[#65ff87] disabled:cursor-wait disabled:opacity-70"
                  disabled={state === "sharing"}
                  type="submit"
                >
                  {state === "sharing" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {copy.shareMemoSubmit}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}

function CutFeedServiceMenuSheet({
  copy,
  groups,
  onClose,
  onNavigate,
}: {
  copy: CutFeedServiceMenuCopy;
  groups: CutFeedServiceMenuGroup[];
  onClose: () => void;
  onNavigate?: CutFeedNavigationStart;
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
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white transition hover:bg-white hover:text-[#111510]"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(var(--fanletter-cut-feed-vh,100dvh)_-_env(safe-area-inset-top)_-_6.75rem)] space-y-4 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group) => (
            <section aria-label={group.label} key={group.label}>
              <h3 className="px-1 pb-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-white/45">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
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
                      onClick={() => {
                        onNavigate?.({
                          href: item.href,
                          label: copy.navigationPending.destination(item.label),
                        });
                      }}
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
          ))}
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
  onNavigate,
  publishedAtLabel,
  referralCode,
  navigationPendingLabel,
  sourceRevealLabel,
}: {
  avatarImageUrl: string | null;
  channelHref: string;
  copy: CutFeedReporterPanelCopy;
  cutCountLabel: string;
  isViewerReport?: boolean;
  name: string;
  onClose: () => void;
  onNavigate?: CutFeedNavigationStart;
  publishedAtLabel: string;
  referralCode: string;
  navigationPendingLabel: string;
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
            onClick={() => {
              onNavigate?.({
                href: channelHref,
                label: navigationPendingLabel,
              });
            }}
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
    state.requestedByViewer &&
    !hasViewerParticipant &&
    !state.unlocked &&
    slots.length < threshold;

  if (shouldShowViewerSlot && slots.length < threshold) {
    slots.push({
      avatarImageUrl: viewerAvatarImageUrl,
      displayName: viewerDisplayName,
      kind: "participant",
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
  ctaIconOverride = null,
  ctaLabelOverride = null,
  error,
  highlightSourceView = false,
  isLoggedIn,
  isLoginBusy,
  needsCutFeedJoin,
  isSaving,
  locale,
  loginError,
  onActivate,
  progressPercent,
  showMeta = true,
  state,
  viewerAvatarImageUrl,
  viewerDisplayName,
  viewerReferralCode,
}: {
  authNudge: boolean;
  copy: SourceRevealParticipantRailCopy;
  ctaIconOverride?: LucideIcon | null;
  ctaLabelOverride?: string | null;
  error: string | null;
  highlightSourceView?: boolean;
  isLoggedIn: boolean;
  isLoginBusy: boolean;
  needsCutFeedJoin: boolean;
  isSaving: boolean;
  locale: Locale;
  loginError: string | null;
  onActivate: () => void;
  progressPercent: number;
  showMeta?: boolean;
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
  const ctaLabel =
    ctaLabelOverride ??
    (state.unlocked
      ? copy.sourceView
      : needsCutFeedJoin
        ? copy.sourceOpenSignupCta
        : copy.sourceOpenCta);
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

  const RailIcon: LucideIcon =
    ctaIconOverride ??
    (state.unlocked
      ? PlayCircle
      : state.requestedByViewer
        ? CheckCircle2
        : HeartHandshake);
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
        {showMeta ? (
          <>
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
          </>
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
  | "navigationPending"
  | "openPaidSource"
  | "openSourceDetail"
  | "paidSourceBody"
  | "paidSourceTitle"
  | "retry"
  | "sharedPaidSourceBody"
  | "sharedPaidSourceTitle"
  | "sharedSourcePreviewContinueCta"
  | "sharedSourcePreviewCtaBody"
  | "sharedSourcePreviewCtaTitle"
  | "sharedSourcePreviewPanelBody"
  | "sharedSourcePreviewPanelTitle"
  | "sourceOverlayClose"
  | "sourceOverlayError"
  | "sourceOverlayLoading"
  | "sourceOverlayPlay"
  | "sourceOverlayTitle"
  | "sourceOpenSponsors"
  | "sourceOpenSponsorsAnonymous"
  | "sourceOpenSponsorsEmptySlot"
  | "sourceOpenSponsorsJoined"
  | "sourceOpenSponsorsListTitle"
  | "sourceOpenSponsorsParticipant"
  | "sourceOpenSponsorsRemaining"
  | "sourcePreviewBody"
  | "sourcePreviewEyebrow"
  | "sourcePreviewJoinedBody"
  | "sourcePreviewJoinedTitle"
  | "sourcePreviewJoinCta"
  | "sourcePreviewLoginCta"
  | "sourcePreviewSignupCta"
  | "sourcePreviewNextCta"
  | "sourcePreviewTitle"
  | "sourceRevealLockedBody"
  | "sourceRevealLockedTitle"
  | "unavailableSourceBody"
  | "unavailableSourceTitle"
  | "unlockNsfwBody"
  | "unlockNsfwTitle"
  | "voteDone"
  | "voteSaving"
  | "returnToBriefA11y"
  | "returnToBriefFull"
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
  isSharedSourceOverlay = false,
  locale,
  source,
}: {
  copy: SourceOverlayCopy;
  isSharedSourceOverlay?: boolean;
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
      body: isSharedSourceOverlay
        ? copy.sharedPaidSourceBody
        : copy.paidSourceBody,
      title: isSharedSourceOverlay
        ? copy.sharedPaidSourceTitle
        : copy.paidSourceTitle,
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
  isSharedEntryPreview = false,
  isSharedSourceOverlay = false,
  isSourceRevealActionBusy,
  isSourceRevealLoggedIn,
  isLoading,
  locale,
  needsCutFeedJoin = false,
  onClose,
  onFindNextSourceRevealCandidate,
  onNavigate,
  onRetry,
  onSourceRevealActivate,
  returnToHref = null,
  source,
}: {
  copy: SourceOverlayCopy;
  error: string | null;
  isSharedEntryPreview?: boolean;
  isSharedSourceOverlay?: boolean;
  isSourceRevealActionBusy: boolean;
  isSourceRevealLoggedIn: boolean;
  isLoading: boolean;
  locale: Locale;
  needsCutFeedJoin?: boolean;
  onClose: () => void;
  onFindNextSourceRevealCandidate?: () => void;
  onNavigate?: CutFeedNavigationStart;
  onRetry: () => void;
  onSourceRevealActivate: () => void;
  returnToHref?: string | null;
  source: FanletterNewsPublicCutSource | null;
}) {
  const isPlayable = source?.accessState === "playable" && Boolean(source.videoUrl);
  const canPlayLockedPreviewVideo = Boolean(
    (source?.accessState === "source_reveal_locked" ||
      source?.accessState === "paid_locked") &&
      source.previewVideoUrl &&
      source.contentMaturityRating !== "nsfw",
  );
  const shouldShowSourceRevealPreviewPanel = Boolean(
    source?.accessState === "source_reveal_locked" &&
      canPlayLockedPreviewVideo,
  );
  const mediaFrameVideoUrl = canPlayLockedPreviewVideo
    ? source?.previewVideoUrl ?? null
    : source?.videoUrl ?? null;
  const mediaFramePreviewVideoUrl = canPlayLockedPreviewVideo
    ? null
    : source?.previewVideoUrl ?? null;
  const shouldUsePinGate =
    isPlayable &&
    source?.contentMaturityRating === "nsfw";
  const shouldUseSharedEntryPreviewCopy = Boolean(
    isSharedEntryPreview && shouldShowSourceRevealPreviewPanel,
  );
  const lockedCopy = source
    ? getSourceOverlayLockedCopy({
        copy,
        isSharedSourceOverlay,
        locale,
        source,
      })
    : null;
  const paidUnlockHref =
    source?.accessState === "paid_locked" ? source.paidUnlockHref : null;
  const shouldHidePaidSourceActions = Boolean(
    isSharedSourceOverlay && source?.accessState === "paid_locked",
  );
  const shouldShowSourceOverlayCloseButton = true;
  const sourceOverlayCloseLabel = isSharedSourceOverlay
    ? copy.sharedSourcePreviewContinueCta
    : copy.sourceOverlayClose;
  const shouldUseSharedPaidPreviewOverlay = Boolean(
    shouldHidePaidSourceActions && canPlayLockedPreviewVideo,
  );
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
  const sharedSourceRevealParticipantSlots =
    shouldUseSharedEntryPreviewCopy && source
      ? getSourceRevealParticipantSlots({
          canShowViewerSlot: false,
          isLoggedIn: false,
          state: source.sourceReveal,
          viewerAvatarImageUrl: null,
          viewerDisplayName: "",
          viewerReferralCode: null,
        })
      : [];
  const sourcePreviewPanelTitle = shouldUseSharedEntryPreviewCopy
    ? copy.sourceOpenSponsorsListTitle
    : copy.sourcePreviewTitle;
  const sourcePreviewPanelBody = shouldUseSharedEntryPreviewCopy
    ? copy.sourcePreviewBody
    : copy.sourcePreviewBody;
  const sourceRevealCtaLabel = source?.sourceReveal.requestedByViewer
    ? copy.voteDone
    : isSourceRevealActionBusy
      ? copy.voteSaving
      : needsCutFeedJoin
        ? copy.sourcePreviewSignupCta
        : isSourceRevealLoggedIn
          ? copy.sourcePreviewJoinCta
          : copy.sourcePreviewLoginCta;
  const sourceRevealCtaDisabled =
    Boolean(source?.sourceReveal.requestedByViewer) || isSourceRevealActionBusy;
  const sourceRevealDoneFeedback =
    source?.sourceReveal.requestedByViewer && !source.sourceReveal.unlocked ? (
      <div className="rounded-2xl border border-[#44f26e]/22 bg-[#44f26e]/10 p-2.5 text-[#d9ffdf]">
        <div className="px-0.5">
          <p className="inline-flex items-center gap-1.5 text-xs font-black">
            <CheckCircle2 className="size-3.5" />
            {copy.sourcePreviewJoinedTitle}
          </p>
          <p className="mt-1 text-[0.68rem] font-bold leading-snug text-white/72 [word-break:keep-all]">
            {copy.sourcePreviewJoinedBody(sourceRevealRemainingLabel)}
          </p>
        </div>
        {onFindNextSourceRevealCandidate ? (
          <button
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#44f26e]/28 bg-black/34 px-3 text-xs font-black text-[#9bffad] transition hover:border-[#44f26e]/60 hover:bg-[#44f26e] hover:text-[#111510]"
            onClick={onFindNextSourceRevealCandidate}
            type="button"
          >
            <ArrowRight className="size-3.5" />
            {copy.sourcePreviewNextCta}
          </button>
        ) : null}
      </div>
    ) : null;
  const sourceRevealAction = source?.sourceReveal.unlocked ? null : (
    <button
      aria-label={`${sourceRevealCtaLabel} ${sourceRevealCountText}`}
      className={
        shouldUseSharedEntryPreviewCopy
          ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 text-sm font-black text-white/78 transition hover:border-white/32 hover:bg-white/14 disabled:cursor-default disabled:bg-white/8 disabled:text-white/42"
          : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black text-[#111510] shadow-[0_18px_42px_rgba(68,242,110,0.22)] transition hover:bg-[#69ff8c] disabled:cursor-default disabled:bg-white/18 disabled:text-white/58"
      }
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
  const sharedPreviewContinueAction = shouldUseSharedEntryPreviewCopy ? (
    <button
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black text-[#111510] shadow-[0_18px_42px_rgba(68,242,110,0.22)] transition hover:bg-[#69ff8c]"
      onClick={onClose}
      type="button"
    >
      <ChevronDown className="size-4" />
      {copy.sharedSourcePreviewContinueCta}
    </button>
  ) : null;

  return (
    <div
      aria-modal="true"
      className="absolute inset-0 z-50 overflow-hidden bg-black text-white"
      role="dialog"
    >
      <div className="absolute inset-x-0 top-0 z-30 bg-[linear-gradient(180deg,rgba(0,0,0,0.82),rgba(0,0,0,0.5)_62%,rgba(0,0,0,0))] px-3 pb-5 pt-[calc(env(safe-area-inset-top)+0.7rem)]">
        <div className="flex items-center gap-2.5">
          {shouldShowSourceOverlayCloseButton ? (
            <button
              aria-label={sourceOverlayCloseLabel}
              className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/56 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white hover:text-[#111510] ${
                isSharedSourceOverlay ? "gap-1.5 px-3" : "w-10"
              }`}
              onClick={onClose}
              type="button"
            >
              {isSharedSourceOverlay ? (
                <>
                  <ArrowLeft className="size-4" />
                  <span className="text-[0.72rem] font-black">
                    {sourceOverlayCloseLabel}
                  </span>
                </>
              ) : (
                <X className="size-5" />
              )}
            </button>
          ) : null}
          {returnToHref ? (
            <Link
              aria-label={copy.returnToBriefA11y}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 text-[0.68rem] font-black !text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white hover:!text-[#111510]"
              href={returnToHref}
              onClick={() => {
                onNavigate?.({
                  href: returnToHref,
                  label: copy.navigationPending.destination(
                    copy.returnToBriefFull,
                  ),
                });
              }}
            >
              <ArrowLeft className="size-3.5" />
              <span className="max-w-[6.2rem] truncate">
                {copy.returnToBriefFull}
              </span>
            </Link>
          ) : null}
          <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#44f26e]/24 bg-[#44f26e]/14 text-[#44f26e] shadow-[0_12px_30px_rgba(68,242,110,0.12)] backdrop-blur-xl">
            <PlayCircle className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
                {source?.authorName
                  ? `${shouldShowSourceRevealPreviewPanel ? copy.sourcePreviewEyebrow : copy.sourceOverlayTitle} · ${source.authorName}`
                  : shouldShowSourceRevealPreviewPanel
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
                  !canPlayLockedPreviewVideo && Boolean(source.previewVideoUrl)
                }
                deferredVideoCtaPlacement="center"
                eager
                fitWithinViewport
                fitWithinViewportHeightRatio={0.92}
                imageUrl={source.coverImageUrl}
                mediaType={canPlayLockedPreviewVideo ? "video" : source.mediaType}
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
                {shouldShowSourceRevealPreviewPanel ? (
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
                          {sourcePreviewPanelTitle}
                        </h3>
                        <p className="mt-1 text-[0.68rem] font-bold leading-snug text-white/70 [word-break:keep-all]">
                          {shouldUseSharedEntryPreviewCopy
                            ? sourcePreviewPanelBody
                            : `${copy.sourceOpenSponsorsRemaining(
                                sourceRevealRemainingLabel,
                              )} · ${sourcePreviewPanelBody}`}
                        </p>
                      </div>
                    </div>
                    {shouldUseSharedEntryPreviewCopy ? (
                      <div className="mt-3 rounded-2xl border border-[#44f26e]/18 bg-[#44f26e]/10 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 text-[0.66rem] font-black leading-snug text-[#d9ffdf] [word-break:keep-all]">
                            {copy.sourceOpenSponsorsJoined(
                              sourceRevealCountLabel,
                              sourceRevealRemainingLabel,
                            )}
                          </p>
                          <span className="shrink-0 rounded-full border border-white/12 bg-black/24 px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.1em] text-white/62">
                            {copy.sourceOpenSponsors}
                          </span>
                        </div>
                        <div
                          aria-label={copy.sourceOpenSponsorsJoined(
                            sourceRevealCountLabel,
                            sourceRevealRemainingLabel,
                          )}
                          className="mt-2 flex flex-wrap items-center gap-1"
                          role="list"
                        >
                          {sharedSourceRevealParticipantSlots.map((slot) => {
                            const isEmpty = slot.kind === "empty";
                            const isAnonymousComplete =
                              slot.kind === "complete";
                            const sponsorName =
                              isEmpty || isAnonymousComplete
                                ? copy.sourceOpenSponsorsAnonymous
                                : slot.displayName ||
                                  copy.sourceOpenSponsorsAnonymous;
                            const slotLabel = isEmpty
                              ? copy.sourceOpenSponsorsEmptySlot(
                                  formatNumber(slot.position, locale),
                                )
                              : copy.sourceOpenSponsorsParticipant(sponsorName);
                            const slotIcon = slot.avatarImageUrl ? (
                              <span className="relative inline-flex size-5 shrink-0 overflow-hidden rounded-full bg-black/24">
                                <Image
                                  alt=""
                                  className="object-cover"
                                  fill
                                  sizes="20px"
                                  src={slot.avatarImageUrl}
                                  unoptimized={shouldBypassFanletterImageOptimization(
                                    slot.avatarImageUrl,
                                  )}
                                />
                              </span>
                            ) : (
                              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-black/24">
                                {isEmpty ? (
                                  <Plus className="size-3" />
                                ) : (
                                  <UserRound className="size-3" />
                                )}
                              </span>
                            );

                            return (
                              <span
                                aria-label={slotLabel}
                                className={`inline-flex h-7 min-w-0 items-center rounded-full border text-[0.56rem] font-black ${
                                  isEmpty
                                    ? "w-7 justify-center border-white/14 bg-black/22 text-white/42"
                                    : "max-w-[6.75rem] gap-1 border-white/40 bg-black/34 py-0.5 pl-0.5 pr-1.5 text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)]"
                                }`}
                                key={`source-preview-slot-${slot.kind}-${slot.position}-${slot.referralCode ?? slot.displayName}`}
                                role="listitem"
                                title={slotLabel}
                              >
                                {slotIcon}
                                {isEmpty ? null : (
                                  <span className="truncate text-[0.58rem] leading-none">
                                    {sponsorName}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/16">
                      <span
                        className="block h-full rounded-full bg-[#44f26e]"
                        style={{ width: `${sourceRevealProgressPercent}%` }}
                      />
                    </div>
                    <div className="mt-3 grid gap-2">
                      {sharedPreviewContinueAction}
                      {shouldUseSharedEntryPreviewCopy ? null : sourceRevealAction}
                      {shouldUseSharedEntryPreviewCopy ? null : sourceRevealDoneFeedback}
                    </div>
                  </div>
                ) : !isPlayable && lockedCopy ? (
                  <div
                    className={`absolute inset-0 flex bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.18)_46%,rgba(0,0,0,0.72))] px-4 py-4 sm:p-5 ${
                      shouldUseSharedPaidPreviewOverlay
                        ? "items-end"
                        : "items-center"
                    }`}
                  >
                    <div
                      className={`w-full rounded-2xl border shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl ${
                        shouldUseSharedPaidPreviewOverlay
                          ? "mb-[calc(env(safe-area-inset-bottom)+0.6rem)] border-white/12 bg-black/58 p-3"
                          : "border-white/14 bg-black/68 p-4"
                      }`}
                    >
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
                          <>
                            {sourceRevealAction}
                            {sourceRevealDoneFeedback}
                          </>
                        ) : null}
                        {shouldHidePaidSourceActions ? (
                          <button
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 text-sm font-black text-white/78 transition hover:border-white/28 hover:bg-white/12"
                            onClick={onClose}
                            type="button"
                          >
                            <ChevronDown className="size-4 text-[#44f26e]" />
                            {copy.sharedSourcePreviewContinueCta}
                          </button>
                        ) : null}
                        {paidUnlockHref && !shouldHidePaidSourceActions ? (
                          <Link
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-[#111510]"
                            href={paidUnlockHref}
                            onClick={() => {
                              onNavigate?.({
                                href: paidUnlockHref,
                                label: copy.navigationPending.destination(
                                  copy.openPaidSource,
                                ),
                              });
                            }}
                          >
                            <LockKeyhole className="size-4" />
                            {copy.openPaidSource}
                          </Link>
                        ) : null}
                        {!shouldHidePaidSourceActions ? (
                          <Link
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 text-xs font-black !text-white"
                            href={source.detailHref}
                            onClick={() => {
                              onNavigate?.({
                                href: source.detailHref,
                                label: copy.navigationPending.source,
                              });
                            }}
                          >
                            <ExternalLink className="size-3.5" />
                            {copy.openSourceDetail}
                          </Link>
                        ) : null}
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
  isSharedConsumptionGateActive = false,
  isReporterComposerCtaVisible,
  item,
  itemCount,
  locale,
  onDismissSwipeGuide,
  onFindNextSourceRevealCandidate,
  onHideFeedChrome,
  onRevealFeedChrome,
  onNavigationStart,
  onSharedEntryConsumptionComplete,
  onSourceOverlayOpenChange,
  reporterPanelRequestId = 0,
  onSourceViewSlideVisible,
  referralCode,
  returnToHref = null,
  shareId,
  showSwipeGuide = false,
  viewerEmail = null,
}: {
  dictionary: Dictionary;
  hasMore: boolean;
  index: number;
  initialCutSlotNumber?: number | null;
  initialSourceContentId?: string | null;
  isActive: boolean;
  isSharedConsumptionGateActive?: boolean;
  isReporterComposerCtaVisible: boolean;
  item: SerializedFanletterNewsPublicCutFeedItem;
  itemCount: number;
  locale: Locale;
  onDismissSwipeGuide?: () => void;
  onFindNextSourceRevealCandidate?: (currentIndex: number, currentContentId: string) => void;
  onHideFeedChrome?: () => void;
  onRevealFeedChrome?: () => void;
  onNavigationStart?: CutFeedNavigationStart;
  onSharedEntryConsumptionComplete?: () => void;
  onSourceOverlayOpenChange?: (
    index: number,
    isOpen: boolean,
    activeCutSlotNumber?: number,
  ) => void;
  reporterPanelRequestId?: number;
  onSourceViewSlideVisible?: (index: number) => void;
  referralCode: string | null;
  returnToHref?: string | null;
  shareId: string | null;
  showSwipeGuide?: boolean;
  viewerEmail?: string | null;
}) {
  const initialCutCount = item.cuts.length > 0 ? item.cuts.length : 1;
  const initialActiveCutIndex = getInitialPublicCutIndex(
    item,
    initialCutSlotNumber,
  );
  const shouldStartSharedInitialCutWithoutTransition = Boolean(
    shareId && index === 0 && initialCutCount > 1 && initialActiveCutIndex > 0,
  );
  const [activeCutIndex, setActiveCutIndex] = useState(initialActiveCutIndex);
  const [viewedCutIndexes, setViewedCutIndexes] = useState<Set<number>>(
    () => new Set([initialActiveCutIndex]),
  );
  const [trackCutIndex, setTrackCutIndex] = useState(() =>
    initialCutCount > 1 ? initialActiveCutIndex + 1 : initialActiveCutIndex,
  );
  const [isCutTrackTransitionEnabled, setIsCutTrackTransitionEnabled] =
    useState(!shouldStartSharedInitialCutWithoutTransition);
  const [sourceRevealState, setSourceRevealState] = useState(item.sourceReveal);
  const [isSourceRevealSaving, setIsSourceRevealSaving] = useState(false);
  const [sourceRevealError, setSourceRevealError] = useState<string | null>(null);
  const [tapFeedback, setTapFeedback] =
    useState<SourceRevealTapFeedback | null>(null);
  const [authNudge, setAuthNudge] = useState(false);
  const [areBottomDetailsVisible, setAreBottomDetailsVisible] = useState(false);
  const [areSideActionsVisible, setAreSideActionsVisible] = useState(false);
  const [areTopOverlaysVisible, setAreTopOverlaysVisible] = useState(false);
  const [sourceOverlayOpen, setSourceOverlayOpen] = useState(false);
  const [sourceOverlaySource, setSourceOverlaySource] =
    useState<FanletterNewsPublicCutSource | null>(null);
  const [sourceOverlayError, setSourceOverlayError] = useState<string | null>(
    null,
  );
  const [isSourceOverlayLoading, setIsSourceOverlayLoading] = useState(false);
  const [hasEnteredSourceOverlay, setHasEnteredSourceOverlay] = useState(false);
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
  const bottomDetailsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sideActionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const topOverlaysTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const initialSourceOverlayOpenedRef = useRef(false);
  const pendingVoteAfterLoginRef = useRef(false);
  const loginSyncKeyRef = useRef<string | null>(null);
  const sourceOverlayHistoryPushedRef = useRef(false);
  const sourceOverlayReturnCutIndexRef = useRef<number | null>(null);
  const handledReporterPanelRequestIdRef = useRef(0);
  const trackedCutViewKeyRef = useRef<string | null>(null);
  const cutDwellSnapshotRef = useRef<CutDwellSnapshot | null>(null);
  const pendingCutDwellExitReasonRef = useRef<CutDwellExitReason | null>(null);
  const sharedConsumptionCompletedRef = useRef(false);
  const sharedEntryChromeRevealedRef = useRef(false);
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
  const connectedMember = memberSession.member ?? null;
  const isCompletedNewsMember =
    connectedMember?.status === "completed" && !connectedMember.serviceSuspendedAt;
  const needsCutFeedJoin =
    Boolean(memberSession.email) &&
    Boolean(connectedMember) &&
    !isCompletedNewsMember &&
    !sourceRevealState.requestedByViewer;
  const isSourceRevealLoggedIn =
    isCompletedNewsMember || sourceRevealState.requestedByViewer;
  const cuts = useMemo(
    () => (item.cuts.length > 0 ? item.cuts : [item.leadCut]),
    [item.cuts, item.leadCut],
  );
  const cutCount = cuts.length;
  const carouselCuts =
    cutCount > 1
      ? [
          {
            cut: cuts[cutCount - 1],
            key: `clone-start-${cuts[cutCount - 1]?.slotNumber ?? 0}`,
            realIndex: cutCount - 1,
          },
          ...cuts.map((cut, cutIndex) => ({
            cut,
            key: `real-${cut.slotNumber}-${cut.imageUrl}`,
            realIndex: cutIndex,
          })),
          {
            cut: cuts[0],
            key: `clone-end-${cuts[0]?.slotNumber ?? 0}`,
            realIndex: 0,
          },
        ]
      : cuts.map((cut, cutIndex) => ({
          cut,
          key: `real-${cut.slotNumber}-${cut.imageUrl}`,
          realIndex: cutIndex,
        }));
  const cutProgressOrder = useMemo(() => {
    const baseOrder = Array.from({ length: cutCount }, (_, cutIndex) => cutIndex);

    if (
      !shareId ||
      index !== 0 ||
      cutCount <= 1
    ) {
      return baseOrder;
    }

    return baseOrder.map(
      (_, progressIndex) => (initialActiveCutIndex + progressIndex) % cutCount,
    );
  }, [
    cutCount,
    index,
    initialActiveCutIndex,
    shareId,
  ]);
  const activeCutProgressIndex = Math.max(
    0,
    cutProgressOrder.indexOf(activeCutIndex),
  );
  const getCutIndexForProgressIndex = useCallback(
    (progressIndex: number) => {
      if (cutCount <= 0) {
        return 0;
      }

      const normalizedProgressIndex =
        ((progressIndex % cutCount) + cutCount) % cutCount;
      return cutProgressOrder[normalizedProgressIndex] ?? normalizedProgressIndex;
    },
    [cutCount, cutProgressOrder],
  );
  const activeCutLabel = `${formatNumber(activeCutProgressIndex + 1, locale)} / ${formatNumber(cutCount, locale)}`;
  const viewedCutCountLabel = formatNumber(
    Math.min(viewedCutIndexes.size, cutCount),
    locale,
  );
  const characterCutCountLabel = formatNumber(cutCount, locale);
  const characterSourceRevealLabel = `${formatNumber(
    Math.min(sourceRevealState.count, sourceRevealState.threshold),
    locale,
  )}/${formatNumber(sourceRevealState.threshold, locale)}`;
  const reporterPublishedAtLabel = publishedAt ?? "-";
  const activeCutSlotNumber = cuts[activeCutIndex]?.slotNumber ?? 1;
  const hasViewedAllCuts = cutCount <= 1 || viewedCutIndexes.size >= cutCount;
  const hasReachedSharedSourceGate = hasViewedAllCuts;
  const requiresSharedSourceConsumption = Boolean(shareId && index === 0);
  const hasCompletedSharedConsumptionGate =
    hasReachedSharedSourceGate &&
    (!requiresSharedSourceConsumption || hasEnteredSourceOverlay);
  const isSharedSourceActionGateActive = Boolean(
    isSharedConsumptionGateActive && cutCount > 1,
  );
  const showSharedSourceCompletionCta = Boolean(
    isActive &&
      isSharedSourceActionGateActive &&
      requiresSharedSourceConsumption &&
      hasReachedSharedSourceGate &&
      !hasEnteredSourceOverlay,
  );
  const showSharedScrollGuide = Boolean(
    isActive &&
      shareId &&
      hasCompletedSharedConsumptionGate &&
      !sourceOverlayOpen,
  );
  const showSharedTimelineSourceGateHint = Boolean(
    isActive &&
      shareId &&
      index > 0 &&
      isSharedSourceActionGateActive &&
      !hasReachedSharedSourceGate &&
      !sourceOverlayOpen,
  );
  const isSharedTimelineSlide = Boolean(shareId && index > 0);
  const shouldShowCharacterProfileButton = Boolean(
    !isSharedTimelineSlide && !(shareId && index === 0),
  );
  const shouldShowTopCutProgress = !shareId;
  const shouldShowCutStatusChips = !shareId;
  const shouldShowShareAction = !shareId;
  const shouldUseSharedSourceRail = Boolean(
    shareId &&
      sourceContentId &&
      (!isSharedSourceActionGateActive || hasReachedSharedSourceGate),
  );
  const shouldSuppressSharedSourceRailAfterPreview = Boolean(
    shareId &&
      index === 0 &&
      hasReachedSharedSourceGate &&
      hasEnteredSourceOverlay &&
      !sourceOverlayOpen,
  );
  const shouldShowSourceRail =
    (shouldUseSharedSourceRail &&
      !showSharedSourceCompletionCta &&
      !showSharedScrollGuide &&
      !shouldSuppressSharedSourceRailAfterPreview) ||
    (!shareId && !isSharedSourceActionGateActive);
  const cutFeedReturnHref = getCutFeedReturnHref({
    cutSlotNumber: activeCutSlotNumber,
    locale,
    referralCode,
    reportId: report.reportId,
    shareId,
  });
  const cutFeedJoinHref = getCutFeedJoinHref({
    locale,
    referralCode,
    returnToHref: cutFeedReturnHref,
  });
  const reporterHref = getReporterHref({
    cutSlotNumber: activeCutSlotNumber,
    locale,
    referralCode,
    reporterReferralCode: report.reporterReferralCode,
    reportId: report.reportId,
    returnToHref: cutFeedReturnHref,
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
  const reportComposerHref = getReportComposerHref({
    contentId: sourceContentId || null,
    locale,
    referralCode,
    returnToHref: cutFeedReturnHref,
    sourceReveal: sourceRevealState.unlocked ? "unlocked" : "locked",
  });
  const reportSlotUsedLabel = formatNumber(item.reportSlot.used, locale);
  const reportSlotLimitLabel = formatNumber(item.reportSlot.limit, locale);
  const reportComposerCtaLabel = item.reportSlot.full
    ? copy.reporterQuickDesk.slotFullCta(
        reportSlotUsedLabel,
        reportSlotLimitLabel,
      )
    : sourceRevealState.unlocked
      ? copy.reporterQuickDesk.currentCta
      : copy.reporterQuickDesk.currentLockedCta;
  const nextReportComposerHref = getReportComposerHref({
    contentId: null,
    locale,
    referralCode,
    returnToHref: cutFeedReturnHref,
  });
  const startNavigation = useCallback(
    (pending: CutFeedNavigationPending) => {
      onDismissSwipeGuide?.();
      onNavigationStart?.(pending);
    },
    [onDismissSwipeGuide, onNavigationStart],
  );
  const openCutFeedJoin = useCallback(() => {
    startNavigation({
      href: cutFeedJoinHref,
      label: copy.navigationPending.destination(copy.sourcePreviewSignupCta),
    });

    window.setTimeout(() => {
      window.location.assign(cutFeedJoinHref);
    }, 120);
  }, [
    copy.navigationPending,
    copy.sourcePreviewSignupCta,
    cutFeedJoinHref,
    startNavigation,
  ]);

  useEffect(() => {
    if (!shouldStartSharedInitialCutWithoutTransition) {
      return;
    }

    const transitionTimerId = window.setTimeout(() => {
      setIsCutTrackTransitionEnabled(true);
    }, 80);

    return () => {
      window.clearTimeout(transitionTimerId);
    };
  }, [shouldStartSharedInitialCutWithoutTransition]);

  useEffect(() => {
    setViewedCutIndexes((currentIndexes) => {
      if (currentIndexes.has(activeCutIndex)) {
        return currentIndexes;
      }

      const nextIndexes = new Set(currentIndexes);
      nextIndexes.add(activeCutIndex);
      return nextIndexes;
    });
  }, [activeCutIndex]);

  useEffect(() => {
    if (
      !isActive ||
      !onSharedEntryConsumptionComplete ||
      sharedConsumptionCompletedRef.current ||
      !hasCompletedSharedConsumptionGate ||
      sourceOverlayOpen
    ) {
      return;
    }

    sharedConsumptionCompletedRef.current = true;
    onSharedEntryConsumptionComplete();
  }, [
    hasCompletedSharedConsumptionGate,
    isActive,
    onSharedEntryConsumptionComplete,
    sourceOverlayOpen,
  ]);

  const clearSideActionsTimer = useCallback(() => {
    if (sideActionsTimeoutRef.current) {
      clearTimeout(sideActionsTimeoutRef.current);
      sideActionsTimeoutRef.current = null;
    }
  }, []);
  const clearBottomDetailsTimer = useCallback(() => {
    if (bottomDetailsTimeoutRef.current) {
      clearTimeout(bottomDetailsTimeoutRef.current);
      bottomDetailsTimeoutRef.current = null;
    }
  }, []);
  const clearTopOverlaysTimer = useCallback(() => {
    if (topOverlaysTimeoutRef.current) {
      clearTimeout(topOverlaysTimeoutRef.current);
      topOverlaysTimeoutRef.current = null;
    }
  }, []);
  const revealBottomDetails = useCallback(
    (options?: { persist?: boolean }) => {
      clearBottomDetailsTimer();
      setAreBottomDetailsVisible(true);

      if (!isActive || options?.persist) {
        return;
      }

      bottomDetailsTimeoutRef.current = setTimeout(() => {
        setAreBottomDetailsVisible(false);
        bottomDetailsTimeoutRef.current = null;
      }, CUT_FEED_CHROME_VISIBLE_MS);
    },
    [clearBottomDetailsTimer, isActive],
  );
  const revealTopOverlays = useCallback(
    (options?: { persist?: boolean }) => {
      clearTopOverlaysTimer();
      setAreTopOverlaysVisible(true);

      if (!isActive || options?.persist) {
        return;
      }

      topOverlaysTimeoutRef.current = setTimeout(() => {
        setAreTopOverlaysVisible(false);
        topOverlaysTimeoutRef.current = null;
      }, CUT_FEED_CHROME_VISIBLE_MS);
    },
    [clearTopOverlaysTimer, isActive],
  );
  const revealSideActions = useCallback(
    (options?: { persist?: boolean }) => {
      clearSideActionsTimer();
      setAreSideActionsVisible(true);

      if (!isActive || options?.persist) {
        return;
      }

      sideActionsTimeoutRef.current = setTimeout(() => {
        setAreSideActionsVisible(false);
        sideActionsTimeoutRef.current = null;
      }, CUT_FEED_CHROME_VISIBLE_MS);
    },
    [clearSideActionsTimer, isActive],
  );
  const revealCutOverlays = useCallback(
    (options?: { persist?: boolean }) => {
      onRevealFeedChrome?.();
      revealTopOverlays(options);
      revealSideActions(options);
      revealBottomDetails(options);
    },
    [
      onRevealFeedChrome,
      revealBottomDetails,
      revealSideActions,
      revealTopOverlays,
    ],
  );
  const hideCutOverlays = useCallback(() => {
    onHideFeedChrome?.();
    clearBottomDetailsTimer();
    clearSideActionsTimer();
    clearTopOverlaysTimer();
    setAreBottomDetailsVisible(false);
    setAreSideActionsVisible(false);
    setAreTopOverlaysVisible(false);
  }, [
    clearBottomDetailsTimer,
    clearSideActionsTimer,
    clearTopOverlaysTimer,
    onHideFeedChrome,
  ]);

  useEffect(() => {
    if (!isActive || !shareId || sharedEntryChromeRevealedRef.current) {
      return;
    }

    sharedEntryChromeRevealedRef.current = true;
    revealBottomDetails();
  }, [isActive, revealBottomDetails, shareId]);

  const flushCutDwell = useCallback((exitReason: CutDwellExitReason) => {
    const snapshot = cutDwellSnapshotRef.current;

    if (!snapshot) {
      return;
    }

    cutDwellSnapshotRef.current = null;

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Math.max(
      0,
      Math.min(
        CUT_DWELL_MAX_TRACK_MS,
        Math.round(now - snapshot.startedAt),
      ),
    );

    if (durationMs < CUT_DWELL_MIN_TRACK_MS) {
      return;
    }

    trackFunnelEvent("fanletter_news_cut_dwell", {
      contentId: snapshot.contentId,
      metadata: {
        ...snapshot.metadata,
        durationMs,
        exitReason,
        interestBucket: getCutDwellBucket(durationMs),
      },
      referralCode: snapshot.referralCode,
      shareId: snapshot.shareId,
      targetHref: snapshot.targetHref,
    });
  }, []);

  useEffect(() => {
    if (isActive) {
      return;
    }

    clearBottomDetailsTimer();
    clearSideActionsTimer();
    clearTopOverlaysTimer();
    setAreBottomDetailsVisible(false);
    setAreSideActionsVisible(false);
    setAreTopOverlaysVisible(false);
  }, [
    clearBottomDetailsTimer,
    clearSideActionsTimer,
    clearTopOverlaysTimer,
    isActive,
  ]);

  useEffect(() => {
    if (
      !isActive ||
      (!authNudge && !isLoginSyncing && !isSourceRevealSaving && !tapFeedback)
    ) {
      return;
    }

    revealCutOverlays({
      persist: authNudge || isLoginSyncing || isSourceRevealSaving,
    });
  }, [
    authNudge,
    isActive,
    isLoginSyncing,
    isSourceRevealSaving,
    revealCutOverlays,
    tapFeedback,
  ]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const dwellKey = [
      report.reportId,
      activeCutSlotNumber,
      index,
      shareId ?? "",
    ].join(":");

    cutDwellSnapshotRef.current = {
      contentId: report.contentId,
      key: dwellKey,
      metadata: {
        creatorReferralCode: report.creatorReferralCode,
        cutCount,
        cutSlotNumber: activeCutSlotNumber,
        feedIndex: index,
        priceType: report.priceType,
        reportId: report.reportId,
        reporterReferralCode: report.reporterReferralCode,
        source: "fanletter-news-cut-feed",
        sourceRevealCount: sourceRevealState.count,
        sourceRevealThreshold: sourceRevealState.threshold,
        sourceRevealUnlocked: sourceRevealState.unlocked,
      },
      referralCode,
      shareId,
      startedAt,
      targetHref: cutFeedReturnHref,
    };

    return () => {
      flushCutDwell(
        pendingCutDwellExitReasonRef.current ?? "slide_unmount",
      );
      pendingCutDwellExitReasonRef.current = null;
    };
  }, [
    activeCutSlotNumber,
    cutCount,
    cutFeedReturnHref,
    flushCutDwell,
    index,
    isActive,
    referralCode,
    report.contentId,
    report.creatorReferralCode,
    report.priceType,
    report.reportId,
    report.reporterReferralCode,
    shareId,
    sourceRevealState.count,
    sourceRevealState.threshold,
    sourceRevealState.unlocked,
  ]);

  useEffect(() => {
    const handlePageHide = () => {
      flushCutDwell("page_hide");
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCutDwell("page_hide");
      }
    };
    const handleVisibleIndexChange = (event: Event) => {
      const detail = (
        event as CustomEvent<CutFeedVisibleIndexChangeDetail>
      ).detail;

      if (detail?.previousIndex !== index) {
        return;
      }

      flushCutDwell(
        detail.nextIndex > detail.previousIndex
          ? "vertical_next"
          : "vertical_previous",
      );
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      CUT_FEED_VISIBLE_INDEX_CHANGE_EVENT,
      handleVisibleIndexChange,
    );

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener(
        CUT_FEED_VISIBLE_INDEX_CHANGE_EVENT,
        handleVisibleIndexChange,
      );
    };
  }, [flushCutDwell, index]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const viewKey = `${report.reportId}:${activeCutSlotNumber}:${shareId ?? ""}`;

    if (trackedCutViewKeyRef.current === viewKey) {
      return;
    }

    trackedCutViewKeyRef.current = viewKey;
    trackFunnelEvent("fanletter_news_cut_view", {
      contentId: report.contentId,
      metadata: {
        creatorReferralCode: report.creatorReferralCode,
        cutCount,
        cutSlotNumber: activeCutSlotNumber,
        feedIndex: index,
        priceType: report.priceType,
        reportId: report.reportId,
        reporterReferralCode: report.reporterReferralCode,
        source: "fanletter-news-cut-feed",
        sourceRevealCount: sourceRevealState.count,
        sourceRevealThreshold: sourceRevealState.threshold,
        sourceRevealUnlocked: sourceRevealState.unlocked,
      },
      referralCode,
      shareId,
      targetHref: cutFeedReturnHref,
    });
  }, [
    activeCutSlotNumber,
    cutCount,
    cutFeedReturnHref,
    index,
    isActive,
    referralCode,
    report.contentId,
    report.creatorReferralCode,
    report.priceType,
    report.reportId,
    report.reporterReferralCode,
    shareId,
    sourceRevealState.count,
    sourceRevealState.threshold,
    sourceRevealState.unlocked,
  ]);

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
      setHasEnteredSourceOverlay(true);
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

    flushCutDwell("source_open");
    pendingCutDwellExitReasonRef.current = "source_open";
    sourceOverlayReturnCutIndexRef.current = activeCutIndex;
    setSourceOverlayOpen(true);

    if (!sourceOverlayHistoryPushedRef.current) {
      const url = new URL(window.location.href);
      const currentHistoryState =
        typeof window.history.state === "object" && window.history.state !== null
          ? window.history.state
          : {};
      const returnHistoryState = {
        ...currentHistoryState,
        fanletterNewsCutReturnReport: report.reportId,
        fanletterNewsCutReturnSlot: activeCutSlotNumber,
      };

      url.searchParams.set(
        FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM,
        String(activeCutSlotNumber),
      );
      window.history.replaceState(
        returnHistoryState,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      url.searchParams.set("source", sourceContentId);
      window.history.pushState(
        {
          ...returnHistoryState,
          fanletterNewsCutSource: report.reportId,
        },
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      sourceOverlayHistoryPushedRef.current = true;
    }

    if (!sourceOverlaySource && !isSourceOverlayLoading) {
      void loadSourceOverlay();
    } else if (sourceOverlaySource) {
      setHasEnteredSourceOverlay(true);
    }
  }, [
    activeCutIndex,
    activeCutSlotNumber,
    isSourceOverlayLoading,
    flushCutDwell,
    loadSourceOverlay,
    report.reportId,
    sourceContentId,
    sourceOverlaySource,
  ]);

  const closeSourceOverlay = useCallback(() => {
    if (sourceOverlayHistoryPushedRef.current && !shareId) {
      window.history.back();
      return;
    }

    sourceOverlayHistoryPushedRef.current = false;
    sourceOverlayReturnCutIndexRef.current = null;
    setSourceOverlayOpen(false);
    const url = new URL(window.location.href);
    const nextHistoryState =
      typeof window.history.state === "object" && window.history.state !== null
        ? { ...(window.history.state as Record<string, unknown>) }
        : {};

    if (url.searchParams.get("source") === sourceContentId) {
      url.searchParams.delete("source");
      url.searchParams.set(
        FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM,
        String(activeCutSlotNumber),
      );
      delete nextHistoryState.fanletterNewsCutSource;
      delete nextHistoryState.fanletterNewsCutReturnReport;
      delete nextHistoryState.fanletterNewsCutReturnSlot;
      window.history.replaceState(
        nextHistoryState,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, [activeCutSlotNumber, shareId, sourceContentId]);

  const findNextSourceRevealCandidate = useCallback(() => {
    setSourceOverlayOpen(false);
    sourceOverlayHistoryPushedRef.current = false;

    if (typeof window !== "undefined") {
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
    }

    if (sourceContentId) {
      onFindNextSourceRevealCandidate?.(index, sourceContentId);
    }
  }, [index, onFindNextSourceRevealCandidate, sourceContentId]);

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
    setSourceOverlaySource((currentSource) =>
      currentSource
        ? {
            ...currentSource,
            sourceReveal: item.sourceReveal,
          }
        : currentSource,
    );
    setSourceRevealError(null);
    setLoginSyncError(null);
    pendingVoteAfterLoginRef.current = false;
    loginSyncKeyRef.current = null;
  }, [item.sourceReveal]);

  useEffect(() => {
    if (
      !sourceOverlayOpen ||
      sourceOverlaySource?.accessState !== "source_reveal_locked" ||
      !sourceRevealState.unlocked
    ) {
      return;
    }

    void loadSourceOverlay();
  }, [
    loadSourceOverlay,
    sourceOverlayOpen,
    sourceOverlaySource?.accessState,
    sourceRevealState.unlocked,
  ]);

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

      clearBottomDetailsTimer();
      clearSideActionsTimer();
      clearTopOverlaysTimer();
    };
  }, [clearBottomDetailsTimer, clearSideActionsTimer, clearTopOverlaysTimer]);

  useEffect(() => {
    onSourceOverlayOpenChange?.(
      index,
      isActive && sourceOverlayOpen,
      activeCutSlotNumber,
    );

    return () => {
      onSourceOverlayOpenChange?.(index, false, activeCutSlotNumber);
    };
  }, [
    activeCutSlotNumber,
    index,
    isActive,
    onSourceOverlayOpenChange,
    sourceOverlayOpen,
  ]);

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

  useEffect(() => {
    if (!isActive) {
      return;
    }

    window.addEventListener(CUT_FEED_CHROME_HIDE_EVENT, hideCutOverlays);

    return () => {
      window.removeEventListener(CUT_FEED_CHROME_HIDE_EVENT, hideCutOverlays);
    };
  }, [hideCutOverlays, isActive]);

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

  const trackSourceOpenIntent = useCallback(
    (action: "double_tap" | "source_button") => {
      trackFunnelEvent("fanletter_news_source_open_click", {
        contentId: report.contentId,
        metadata: {
          action,
          authState: isSourceRevealLoggedIn ? "authenticated" : "guest",
          count: sourceRevealState.count,
          creatorReferralCode: report.creatorReferralCode,
          cutSlotNumber: activeCutSlotNumber,
          priceType: report.priceType,
          reportId: report.reportId,
          reporterReferralCode: report.reporterReferralCode,
          source: "fanletter-news-cut-feed",
          sourceAccessKind: report.priceType === "paid" ? "paid" : "free",
          threshold: sourceRevealState.threshold,
        },
        referralCode,
        shareId,
        targetHref: cutFeedReturnHref,
      });
    },
    [
      activeCutSlotNumber,
      cutFeedReturnHref,
      isSourceRevealLoggedIn,
      referralCode,
      report.contentId,
      report.creatorReferralCode,
      report.priceType,
      report.reportId,
      report.reporterReferralCode,
      shareId,
      sourceRevealState.count,
      sourceRevealState.threshold,
    ],
  );

  const updateSourceReveal = useCallback(
    (nextState: FanletterNewsSourceRevealState) => {
      setSourceRevealState(nextState);
      setSourceOverlaySource((currentSource) =>
        currentSource
          ? {
              ...currentSource,
              sourceReveal: nextState,
            }
          : currentSource,
      );

      if (nextState.unlocked && sourceOverlayOpen) {
        void loadSourceOverlay();
      }

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
    [loadSourceOverlay, report.reportId, sourceOverlayOpen, sourceRevealEndpoint],
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

    if (needsCutFeedJoin) {
      openCutFeedJoin();
      return;
    }

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
    needsCutFeedJoin,
    nudgeLoginVote,
    openCutFeedJoin,
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

        if (
          result.member.status !== "completed" ||
          result.member.serviceSuspendedAt
        ) {
          pendingVoteAfterLoginRef.current = false;
          loginSyncKeyRef.current = null;
          openCutFeedJoin();
          return;
        }

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
    openCutFeedJoin,
    referralCode,
    showTapFeedback,
    sourceRevealEndpoint,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    submitSourceRevealVote,
    updateMemberSession,
  ]);

  const handleSourceRevealDoubleTap = useCallback(() => {
    if (isSharedSourceActionGateActive && !hasReachedSharedSourceGate) {
      return;
    }

    if (sourceRevealState.unlocked) {
      showTapFeedback(copy.doubleTapOpen);
      return;
    }

    if (sourceRevealState.requestedByViewer) {
      showTapFeedback(copy.doubleTapDone);
      return;
    }

    trackSourceOpenIntent("double_tap");

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
    hasReachedSharedSourceGate,
    isSharedSourceActionGateActive,
    isSourceRevealLoggedIn,
    openInlineLoginForVote,
    showTapFeedback,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    submitSourceRevealVote,
    trackSourceOpenIntent,
  ]);
  const enableCutTrackTransitionOnNextFrame = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsCutTrackTransitionEnabled(true);
      });
    });
  }, []);
  const handleCutTrackTransitionEnd = useCallback(() => {
    if (cutCount <= 1) {
      return;
    }

    if (trackCutIndex === 0) {
      setIsCutTrackTransitionEnabled(false);
      setTrackCutIndex(cutCount);
      enableCutTrackTransitionOnNextFrame();
      return;
    }

    if (trackCutIndex === cutCount + 1) {
      setIsCutTrackTransitionEnabled(false);
      setTrackCutIndex(1);
      enableCutTrackTransitionOnNextFrame();
    }
  }, [cutCount, enableCutTrackTransitionOnNextFrame, trackCutIndex]);
  const selectCutIndex = useCallback(
    (nextIndex: number) => {
      const normalizedNextIndex = Math.max(
        0,
        Math.min(nextIndex, Math.max(cutCount - 1, 0)),
      );
      const shouldAnimateAdjacent =
        cutCount > 1 && Math.abs(normalizedNextIndex - activeCutIndex) <= 1;

      setIsCutTrackTransitionEnabled(shouldAnimateAdjacent);
      setActiveCutIndex(normalizedNextIndex);
      setTrackCutIndex(
        cutCount > 1 ? normalizedNextIndex + 1 : normalizedNextIndex,
      );

      if (!shouldAnimateAdjacent) {
        enableCutTrackTransitionOnNextFrame();
      }
    },
    [activeCutIndex, cutCount, enableCutTrackTransitionOnNextFrame],
  );
  useEffect(() => {
    if (sourceOverlayOpen) {
      return;
    }

    const returnCutIndex = sourceOverlayReturnCutIndexRef.current;

    if (returnCutIndex === null) {
      return;
    }

    sourceOverlayReturnCutIndexRef.current = null;

    if (returnCutIndex !== activeCutIndex) {
      selectCutIndex(returnCutIndex);
    }
  }, [activeCutIndex, selectCutIndex, sourceOverlayOpen]);
  useEffect(() => {
    if (sourceOverlayOpen || typeof window === "undefined") {
      return;
    }

    const currentHistoryState =
      typeof window.history.state === "object" && window.history.state !== null
        ? (window.history.state as Record<string, unknown>)
        : null;

    if (
      !currentHistoryState ||
      currentHistoryState.fanletterNewsCutReturnReport !== report.reportId
    ) {
      return;
    }

    const returnSlotNumber = normalizeFanletterNewsPublicCutSlotNumber(
      String(currentHistoryState.fanletterNewsCutReturnSlot ?? ""),
    );
    const returnCutIndex = returnSlotNumber
      ? cuts.findIndex((cut) => cut.slotNumber === returnSlotNumber)
      : -1;
    const nextHistoryState = { ...currentHistoryState };

    delete nextHistoryState.fanletterNewsCutReturnReport;
    delete nextHistoryState.fanletterNewsCutReturnSlot;

    window.history.replaceState(
      nextHistoryState,
      "",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );

    if (returnCutIndex >= 0 && returnCutIndex !== activeCutIndex) {
      selectCutIndex(returnCutIndex);
    }
  }, [activeCutIndex, cuts, report.reportId, selectCutIndex, sourceOverlayOpen]);
  const goToPreviousCut = useCallback(() => {
    pendingCutDwellExitReasonRef.current = "horizontal_swipe";
    if (cutCount <= 1) {
      setTrackCutIndex(activeCutIndex);
      return;
    }

    const nextIndex = getCutIndexForProgressIndex(activeCutProgressIndex - 1);

    setIsCutTrackTransitionEnabled(true);
    setActiveCutIndex(nextIndex);
    setTrackCutIndex(
      activeCutIndex === 0 && nextIndex === cutCount - 1
        ? 0
        : nextIndex + 1,
    );
  }, [
    activeCutIndex,
    activeCutProgressIndex,
    cutCount,
    getCutIndexForProgressIndex,
  ]);
  const goToNextCut = useCallback(() => {
    pendingCutDwellExitReasonRef.current = "horizontal_swipe";
    if (cutCount <= 1) {
      setTrackCutIndex(activeCutIndex);
      return;
    }

    const nextIndex = getCutIndexForProgressIndex(activeCutProgressIndex + 1);

    setIsCutTrackTransitionEnabled(true);
    setActiveCutIndex(nextIndex);
    setTrackCutIndex(
      activeCutIndex === cutCount - 1 && nextIndex === 0
        ? cutCount + 1
        : nextIndex + 1,
    );
  }, [
    activeCutIndex,
    activeCutProgressIndex,
    cutCount,
    getCutIndexForProgressIndex,
  ]);
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
        hideCutOverlays();

        if (deltaX > 0) {
          goToPreviousCut();
        } else {
          goToNextCut();
        }

        return;
      }

      if (
        travelDistance > DOUBLE_TAP_MOVE_TOLERANCE_PX ||
        isInteractiveTarget(pointerStart.target) ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      revealCutOverlays();

      if (event.pointerType === "mouse") {
        lastTapRef.current = null;
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
      hideCutOverlays,
      onDismissSwipeGuide,
      revealCutOverlays,
    ],
  );
  const handleSourceRevealParticipation = useCallback(() => {
    if (isSharedSourceActionGateActive && !hasReachedSharedSourceGate) {
      return;
    }

    if (sourceRevealState.unlocked) {
      showTapFeedback(copy.doubleTapOpen);
      return;
    }

    if (sourceRevealState.requestedByViewer) {
      showTapFeedback(copy.doubleTapDone);
      return;
    }

    trackSourceOpenIntent("source_button");

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
    hasReachedSharedSourceGate,
    isSharedSourceActionGateActive,
    isSourceRevealLoggedIn,
    openInlineLoginForVote,
    showTapFeedback,
    sourceRevealState.requestedByViewer,
    sourceRevealState.unlocked,
    submitSourceRevealVote,
    trackSourceOpenIntent,
  ]);
  const handleSourceRailClick = useCallback(() => {
    if (sourceContentId) {
      if (isSharedSourceActionGateActive) {
        setHasEnteredSourceOverlay(true);
      }

      openSourceOverlay();
      return;
    }

    if (isSharedSourceActionGateActive) {
      setHasEnteredSourceOverlay(true);
    }

    handleSourceRevealParticipation();
  }, [
    handleSourceRevealParticipation,
    isSharedSourceActionGateActive,
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
    shouldShowSourceRail &&
    isActive &&
    showSwipeGuide &&
    sourceRevealState.unlocked &&
    cutCount > 1;
  const showCutSwipeGuide = isActive && showSwipeGuide && cutCount > 1;
  const areSideActionDetailsVisible =
    areSideActionsVisible ||
    authNudge ||
    isLoginSyncing ||
    isSourceRevealSaving ||
    Boolean(sourceRevealError || loginSyncError);
  const cutSwipeGuideClassName =
    "pointer-events-none absolute left-1/2 top-1/2 z-30 flex w-fit max-w-[calc(100%_-_1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center text-white";
  const cutSwipeGuidePillClassName =
    "inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border border-white/14 bg-black/54 px-3 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl";
  const sharedSourceCompletionCtaTitle = sourceRevealState.unlocked
    ? copy.sharedSourceCtaTitle
    : copy.sharedSourcePreviewCtaTitle;
  const sharedSourceCompletionCtaBody = sourceRevealState.unlocked
    ? copy.sharedSourceCtaBody
    : copy.sharedSourcePreviewCtaBody;
  const sharedSourceCompletionCtaBadge = sourceRevealState.unlocked
    ? `${cutCountLabel}/${cutCountLabel}`
    : copy.sourcePreviewEyebrow;
  const SharedSourceCompletionCtaIcon = sourceRevealState.unlocked
    ? PlayCircle
    : PlayCircle;
  const sharedTimelineSourceGateAction = sourceRevealState.unlocked
    ? copy.sourceView
    : copy.sourcePreviewEyebrow;
  const sharedTimelineSourceGateProgressPercent =
    cutCount > 0
      ? Math.min(
          100,
          Math.max(0, (viewedCutIndexes.size / cutCount) * 100),
        )
      : 100;
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
    article.dataset.activeCutSlot = String(activeCutSlotNumber);
    article.dataset.activeCutProgress = String(activeCutProgressIndex + 1);

    if (sourceRevealState.unlocked) {
      article.dataset.sourceView = "true";
    } else {
      delete article.dataset.sourceView;
    }
  }, [
    activeCutProgressIndex,
    activeCutSlotNumber,
    cutCount,
    sourceRevealState.unlocked,
  ]);

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
          className={`flex h-full ${
            isCutTrackTransitionEnabled
              ? "transition-transform duration-300 ease-out"
              : ""
          }`}
          onTransitionEnd={handleCutTrackTransitionEnd}
          style={{
            transform: `translateX(-${trackCutIndex * 100}%)`,
          }}
        >
          {carouselCuts.map(({ cut, key, realIndex }) => {
            const slotNumber = cut.slotNumber.toString().padStart(2, "0");

            return (
              <div
                className="relative h-full w-full shrink-0 bg-black"
                key={`${report.reportId}-${key}`}
              >
                <Image
                  alt={`${title} ${copy.slot(slotNumber)}`}
                  className={
                    isNsfw
                      ? "scale-[1.02] object-cover blur-2xl brightness-[0.42] saturate-[0.68]"
                      : "object-cover brightness-[1.14] contrast-[1.02] saturate-[1.1]"
                  }
                  fill
                  priority={isActive && realIndex === activeCutIndex}
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

      {shouldShowTopCutProgress ? (
        <div
          className={`absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4.7rem)] z-20 px-4 transition-[opacity,transform,filter,visibility] duration-500 ease-out ${
            areTopOverlaysVisible
              ? "visible translate-y-0 opacity-100 blur-0"
              : "invisible -translate-y-2 opacity-0 blur-[1px]"
          }`}
        >
          <div className="mx-auto flex w-full gap-1.5">
            {cutProgressOrder.map((orderedCutIndex, progressIndex) => {
              const cut = cuts[orderedCutIndex] ?? cuts[progressIndex];

              return (
                <button
                  aria-label={copy.slot(cut.slotNumber.toString().padStart(2, "0"))}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/24"
                  key={`${report.reportId}-progress-${progressIndex}-${cut.slotNumber}`}
                  onClick={() => {
                    onDismissSwipeGuide?.();
                    pendingCutDwellExitReasonRef.current = "cut_select";
                    selectCutIndex(orderedCutIndex);
                  }}
                  type="button"
                >
                  <span
                    className={`block h-full rounded-full transition-all ${
                      progressIndex <= activeCutProgressIndex
                        ? "bg-white"
                        : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {shouldShowCutStatusChips ? (
        <div
          className={`absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+5.6rem)] z-20 flex items-center justify-between gap-3 transition-[opacity,transform,filter,visibility] duration-500 ease-out ${
            areTopOverlaysVisible
              ? "visible translate-y-0 opacity-100 blur-0"
              : "invisible -translate-y-2 opacity-0 blur-[1px]"
          }`}
        >
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
      ) : null}

      <div
        className="absolute right-3 top-[48%] z-30 flex -translate-y-1/2 flex-col items-center gap-4 text-white"
      >
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
        {shouldShowSourceRail ? (
          <SourceRevealParticipantRail
            authNudge={authNudge}
            copy={copy}
            ctaIconOverride={shouldUseSharedSourceRail ? PlayCircle : null}
            ctaLabelOverride={shouldUseSharedSourceRail ? copy.sourceView : null}
            error={sourceRevealError}
            highlightSourceView={showSourceViewGuide || shouldUseSharedSourceRail}
            isLoggedIn={isSourceRevealLoggedIn}
            isLoginBusy={isLoginSyncing}
            needsCutFeedJoin={needsCutFeedJoin}
            isSaving={isSourceRevealSaving}
            locale={locale}
            loginError={loginSyncError}
            onActivate={handleSourceRailClick}
            progressPercent={sourceRailProgressPercent}
            showMeta={areSideActionDetailsVisible}
            state={sourceRevealState}
            viewerAvatarImageUrl={viewerAvatarImageUrl}
            viewerDisplayName={viewerDisplayName}
            viewerReferralCode={viewerReferralCode}
          />
        ) : null}
        {shouldShowShareAction ? (
          <div
            className={`flex flex-col items-center gap-1.5 transition-[opacity,transform,filter,visibility] duration-500 ease-out ${
              areSideActionsVisible
                ? "visible pointer-events-auto translate-x-0 opacity-100 blur-0"
                : "invisible pointer-events-none translate-x-3 opacity-0 blur-[1px]"
            }`}
          >
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
              viewerEmail={viewerEmail}
            />
            <span className="max-w-14 text-center text-[0.58rem] font-black leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.82)]">
              {copy.share}
            </span>
          </div>
        ) : null}
      </div>

      {showCutSwipeGuide ? (
        <div
          aria-live="polite"
          className={cutSwipeGuideClassName}
          role="status"
        >
          <div className={`${cutSwipeGuidePillClassName} text-[#9bffad]`}>
            <ChevronLeft className="size-4" />
            <span className="relative h-7 w-14 rounded-full border border-[#44f26e]/28 bg-[#44f26e]/10">
              <span className="fanletter-cut-swipe-guide-thumb absolute left-1/2 top-1/2 inline-flex size-7 items-center justify-center rounded-full bg-[#44f26e] text-black shadow-[0_12px_28px_rgba(68,242,110,0.26)]">
                <Images className="size-4" />
              </span>
            </span>
            <ChevronRight className="size-4" />
            <span className="whitespace-nowrap text-xs font-black tracking-normal [word-break:keep-all]">
              {copy.swipeGuide(cutCountLabel)}
            </span>
          </div>
          <div className="inline-flex max-w-full flex-col items-center justify-center gap-1.5 rounded-[1.65rem] border border-white/14 bg-black/54 px-5 py-2.5 text-white/88 shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <span className="flex flex-col items-center justify-center gap-1 text-[#9bffad]">
              <ChevronUp className="size-4" />
              <span className="relative h-14 w-7 rounded-full border border-[#44f26e]/28 bg-[#44f26e]/10">
                <span className="fanletter-cut-vertical-swipe-guide-thumb absolute left-1/2 top-1/2 inline-flex size-7 items-center justify-center rounded-full bg-[#44f26e] text-black shadow-[0_12px_28px_rgba(68,242,110,0.26)]">
                  <ChevronDown className="size-3.5" />
                </span>
              </span>
              <ChevronDown className="size-4" />
            </span>
            <span className="whitespace-nowrap text-center text-xs font-black tracking-normal [word-break:keep-all]">
              {copy.verticalSwipeGuide}
            </span>
          </div>
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
          navigationPendingLabel={copy.navigationPending.reporter(
            report.reporterName,
          )}
          onClose={() => setIsReporterPanelOpen(false)}
          onNavigate={onNavigationStart}
          publishedAtLabel={reporterPublishedAtLabel}
          referralCode={report.reporterReferralCode}
          sourceRevealLabel={characterSourceRevealLabel}
        />
      ) : null}

      <div className="relative z-10 flex min-h-[var(--fanletter-cut-feed-vh,100dvh)] items-end px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-[calc(env(safe-area-inset-top)+7.6rem)]">
        <section className="relative mx-auto flex w-full flex-col justify-end">
          <div
            className={`max-w-3xl transition-[opacity,transform,filter,visibility] duration-500 ease-out ${
              areBottomDetailsVisible
                ? "visible translate-y-0 opacity-100 blur-0"
                : "invisible translate-y-5 opacity-0 blur-[1px]"
            }`}
          >
            {shouldShowCharacterProfileButton ? (
              <CutFeedProfileActionButton
                fallbackIcon={Sparkles}
                href={characterHref}
                imageUrl={report.creatorAvatarImageUrl}
                isViewerOwned={isViewerCharacter}
                label={copy.character}
                name={report.creatorName}
                onClick={() => {
                  startNavigation({
                    href: characterHref,
                    label: copy.navigationPending.character(report.creatorName),
                  });
                }}
                viewerOwnedLabel={copy.myCharacterBadge}
              />
            ) : (
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#44f26e]/24 bg-black/46 px-3 py-1.5 text-[0.66rem] font-black tracking-normal text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <Sparkles className="size-3.5 shrink-0" />
                <span className="shrink-0 text-[#9bffad]">
                  {copy.sharedTimelineNext}
                </span>
                <span className="shrink-0 text-white/46">·</span>
                <span className="truncate">
                  {report.creatorName}
                </span>
              </div>
            )}
            <h2
              className={`mt-2 break-words font-black tracking-normal drop-shadow-[0_3px_18px_rgba(0,0,0,0.82)] [word-break:keep-all] ${
                isSharedTimelineSlide
                  ? "line-clamp-2 max-w-[22rem] text-[1.28rem] leading-[1.12]"
                  : "max-w-4xl text-[1.42rem] leading-[1.08]"
              } ${
                isNsfw ? "select-none blur-[2px]" : ""
              }`}
            >
              {title}
            </h2>
            {!isSharedTimelineSlide ? (
              <p
                className={`mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/82 drop-shadow-[0_2px_12px_rgba(0,0,0,0.72)] ${
                  isNsfw ? "select-none blur-[2px]" : ""
                }`}
              >
                {report.dek}
              </p>
            ) : null}
            <div
              className={`mt-2 flex flex-wrap items-center gap-2 font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.72)] ${
                isSharedTimelineSlide
                  ? "text-[0.68rem] text-white/66"
                  : "text-[0.72rem] text-white/72"
              }`}
            >
              <Link
                className={`inline-flex items-center rounded-full border border-white/14 bg-black/28 !text-white/82 transition hover:border-[#44f26e]/42 hover:bg-[#44f26e]/16 hover:!text-[#9bffad] ${
                  isSharedTimelineSlide ? "px-2.5 py-1" : "px-2 py-0.5"
                }`}
                href={reporterHref}
                onClick={() => {
                  startNavigation({
                    href: reporterHref,
                    label: copy.navigationPending.reporter(report.reporterName),
                  });
                }}
              >
                {report.reporterName}
              </Link>
              {!isSharedTimelineSlide && isViewerReport ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#44f26e]/34 bg-[#44f26e]/18 px-2 py-0.5 text-[0.62rem] font-black text-[#9bffad]">
                  <Check className="size-3 stroke-[3]" />
                  {copy.myReportBadge}
                </span>
              ) : null}
              {!isSharedTimelineSlide && publishedAt ? <span>{publishedAt}</span> : null}
            </div>
            {isReporterComposerCtaVisible && sourceContentId ? (
              <div className="mt-3 flex max-w-full flex-wrap gap-2">
                {isViewerReport ? (
                  <>
                    <span className="inline-flex min-h-11 max-w-full flex-1 items-center justify-center gap-2 rounded-full border border-[#44f26e]/24 bg-black/48 px-4 py-2 text-sm font-black text-[#9bffad] shadow-[0_16px_34px_rgba(0,0,0,0.28)] backdrop-blur sm:flex-none">
                      <Check className="size-4 shrink-0 stroke-[3]" />
                      <span className="truncate">
                        {copy.reporterQuickDesk.viewerCurrentCta}
                      </span>
                    </span>
                    <Link
                      className="inline-flex min-h-11 max-w-full flex-1 items-center justify-center gap-2 rounded-full border border-[#44f26e]/34 bg-[#44f26e] px-4 py-2 text-sm font-black !text-[#111510] shadow-[0_16px_34px_rgba(0,0,0,0.28)] transition hover:bg-[#65ff87] sm:flex-none"
                      href={nextReportComposerHref}
                      onClick={() => {
                        startNavigation({
                          href: nextReportComposerHref,
                          label: copy.navigationPending.report,
                        });
                      }}
                    >
                      <ArrowRight className="size-4 shrink-0" />
                      <span className="truncate">
                        {copy.reporterQuickDesk.nextCta}
                      </span>
                    </Link>
                  </>
                ) : item.reportSlot.full ? (
                  <span className="inline-flex min-h-11 max-w-full flex-1 items-center justify-center gap-2 rounded-full border border-white/18 bg-black/50 px-4 py-2 text-sm font-black text-white/76 shadow-[0_16px_34px_rgba(0,0,0,0.28)] backdrop-blur sm:flex-none">
                    <PenLine className="size-4 shrink-0 text-[#44f26e]" />
                    <span className="truncate">{reportComposerCtaLabel}</span>
                  </span>
                ) : (
                  <Link
                    className="inline-flex min-h-11 max-w-full flex-1 items-center justify-center gap-2 rounded-full border border-[#44f26e]/34 bg-[#44f26e] px-4 py-2 text-sm font-black !text-[#111510] shadow-[0_16px_34px_rgba(0,0,0,0.28)] transition hover:bg-[#65ff87] sm:flex-none"
                    href={reportComposerHref}
                    onClick={() => {
                      startNavigation({
                        href: reportComposerHref,
                        label: copy.navigationPending.report,
                      });
                    }}
                  >
                    <PenLine className="size-4 shrink-0" />
                    <span className="truncate">{reportComposerCtaLabel}</span>
                  </Link>
                )}
              </div>
            ) : null}
          </div>
          {showSharedTimelineSourceGateHint ? (
            <div
              aria-live="polite"
              className="mt-3 w-full rounded-[1.35rem] border border-white/14 bg-black/62 px-3.5 py-3 text-white shadow-[0_18px_52px_rgba(0,0,0,0.36)] backdrop-blur-xl"
              data-shared-timeline-source-gate
              role="status"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/16 text-[#44f26e] ring-1 ring-[#44f26e]/24">
                  <Images className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-[0.62rem] font-black uppercase leading-tight tracking-[0.12em] text-[#9bffad]">
                    <span>{copy.sharedTimelineNext}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/72">
                      {viewedCutCountLabel}/{cutCountLabel}
                    </span>
                  </span>
                  <span className="mt-1 block break-words text-sm font-black leading-tight [word-break:keep-all]">
                    {copy.sharedTimelineSourceGateTitle}
                  </span>
                  <span className="mt-1 block break-words text-[0.7rem] font-bold leading-snug text-white/68 [word-break:keep-all]">
                    {copy.sharedTimelineSourceGateBody(
                      viewedCutCountLabel,
                      cutCountLabel,
                      sharedTimelineSourceGateAction,
                    )}
                  </span>
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/16">
                <span
                  className="block h-full rounded-full bg-[#44f26e]"
                  style={{
                    width: `${sharedTimelineSourceGateProgressPercent}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          {showSharedSourceCompletionCta ? (
            <div aria-live="polite" className="mt-3 w-full">
              <button
                aria-label={sharedSourceCompletionCtaTitle}
                className="group flex min-h-[4.7rem] w-full items-center gap-3 rounded-[1.2rem] border border-[#44f26e]/34 bg-black/72 px-3.5 py-3 text-left text-white shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:border-[#44f26e]/62 hover:bg-black/82 focus:outline-none focus:ring-4 focus:ring-[#44f26e]/26"
                data-shared-source-cta="ready"
                onClick={handleSourceRailClick}
                type="button"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#101510] shadow-[0_10px_24px_rgba(68,242,110,0.18)]">
                  <SharedSourceCompletionCtaIcon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-[0.6rem] font-black uppercase leading-tight tracking-[0.12em] text-[#9bffad]">
                    <span>{copy.sharedSourceCtaEyebrow}</span>
                    <span className="rounded-full bg-[#44f26e]/14 px-2 py-0.5 text-white/72">
                      {sharedSourceCompletionCtaBadge}
                    </span>
                  </span>
                  <span className="mt-1 block break-words text-[0.94rem] font-black leading-tight tracking-normal [word-break:keep-all]">
                    {sharedSourceCompletionCtaTitle}
                  </span>
                  <span className="mt-1 block break-words text-[0.68rem] font-bold leading-snug text-white/62 [word-break:keep-all]">
                    {sharedSourceCompletionCtaBody}
                  </span>
                </span>
                <ArrowRight className="size-4.5 shrink-0 text-[#44f26e] transition group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : null}
          {showSharedScrollGuide ? (
            <div
              aria-live="polite"
              className="pointer-events-none mx-auto mt-3 flex min-h-11 w-full max-w-[21rem] items-center justify-center gap-2 rounded-full border border-white/14 bg-black/52 px-4 text-center text-white shadow-[0_14px_38px_rgba(0,0,0,0.26)] backdrop-blur-xl"
              data-shared-scroll-guide
              role="status"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/14 text-[#44f26e]">
                <ChevronDown className="size-4" />
              </span>
              <span className="min-w-0 break-words text-[0.78rem] font-black leading-tight [word-break:keep-all]">
                {copy.sharedScrollGuideTitle(report.creatorName)}
              </span>
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-center gap-0">
            {cutProgressOrder.map((orderedCutIndex, progressIndex) => {
              const cut = cuts[orderedCutIndex] ?? cuts[progressIndex];
              const isActiveProgressDot =
                progressIndex === activeCutProgressIndex;

              return (
                <button
                  aria-label={copy.slot(cut.slotNumber.toString().padStart(2, "0"))}
                  className="-mx-2 grid h-8 w-8 min-w-8 place-items-center rounded-full transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                  key={`${report.reportId}-dot-${progressIndex}-${cut.slotNumber}`}
                  onClick={() => {
                    pendingCutDwellExitReasonRef.current = "cut_select";
                    selectCutIndex(orderedCutIndex);
                  }}
                  type="button"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition ${
                      isActiveProgressDot ? "bg-white" : "bg-white/34"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>
      </div>
      {sourceOverlayOpen ? (
        <SourceVlogFeedOverlay
          copy={copy}
          error={sourceOverlayError}
          isSharedEntryPreview={
            Boolean(shareId && !sourceRevealState.unlocked)
          }
          isSharedSourceOverlay={Boolean(shareId)}
          isSourceRevealActionBusy={isSourceRevealSaving || isLoginSyncing}
          isSourceRevealLoggedIn={isSourceRevealLoggedIn}
          isLoading={isSourceOverlayLoading}
          locale={locale}
          needsCutFeedJoin={needsCutFeedJoin}
          onClose={closeSourceOverlay}
          onFindNextSourceRevealCandidate={findNextSourceRevealCandidate}
          onNavigate={onNavigationStart}
          onRetry={() => void loadSourceOverlay()}
          onSourceRevealActivate={handleSourceRevealParticipation}
          returnToHref={returnToHref}
          source={sourceOverlaySource}
        />
      ) : null}
    </article>
  );
}

function SharedCutDwellRecapSlide({
  completedItems,
  entryCutSlotNumber = null,
  locale,
  sharedCutRecap = null,
}: {
  completedItems: SerializedFanletterNewsPublicCutFeedItem[];
  entryCutSlotNumber?: number | null;
  locale: Locale;
  sharedCutRecap?: SerializedFanletterNewsPublicCutShareRecap | null;
}) {
  const copy = getCopy(locale);
  const primaryItem = completedItems[0];
  const lastItem = completedItems[completedItems.length - 1] ?? primaryItem;
  const { report } = primaryItem;
  const characterName = report.creatorName;
  const backgroundImageUrl =
    lastItem.report.coverImageUrl || lastItem.leadCut.imageUrl;
  const recapCutCount = completedItems.reduce(
    (count, item) => count + Math.min(getPublicCutItemCutCount(item), 4),
    0,
  );
  const recapCutCountLabel = formatNumber(recapCutCount, locale);
  const normalizedEntryCutSlotNumber =
    normalizeFanletterNewsPublicCutSlotNumber(
      entryCutSlotNumber ? String(entryCutSlotNumber) : null,
    ) ?? primaryItem.leadCut.slotNumber;
  const recapDwellBySlot = new Map(
    (sharedCutRecap?.cuts ?? []).map((cutMetric) => [
      cutMetric.cutSlotNumber,
      cutMetric,
    ]),
  );
  const recapDwellRows = completedItems.flatMap((item, itemIndex) => {
    const itemCuts = item.cuts.length > 0 ? item.cuts : [item.leadCut];

    return itemCuts.slice(0, 4).map((cut) => {
      const cutMetric = recapDwellBySlot.get(cut.slotNumber);

      return {
        averageDwellMs: cutMetric?.averageDwellMs ?? 0,
        count: cutMetric?.dwellEvents || cutMetric?.cutViews || 0,
        cutSlotNumber: cut.slotNumber,
        imageUrl: cut.imageUrl,
        isEntryCut:
          itemIndex === 0 && cut.slotNumber === normalizedEntryCutSlotNumber,
        reportIndex: itemIndex + 1,
        reportTitle: item.report.title,
      };
    });
  });
  const measuredRecapDwellRows = recapDwellRows.filter(
    (row) => row.averageDwellMs > 0 || row.count > 0,
  );
  const isCollectingSharedRecapSignals = measuredRecapDwellRows.length < 2;
  const displayedRecapDwellRows = recapDwellRows;
  const topRecapDwellCandidates =
    measuredRecapDwellRows.length > 0
      ? measuredRecapDwellRows
      : displayedRecapDwellRows;
  const maxRecapAverageDwellMs = displayedRecapDwellRows.reduce(
    (maxValue, row) => Math.max(maxValue, row.averageDwellMs),
    0,
  );
  const topRecapDwellRow = topRecapDwellCandidates.reduce<
    (typeof recapDwellRows)[number] | null
  >((selectedRow, row) => {
    if (!selectedRow) {
      return row;
    }

    if (row.averageDwellMs > selectedRow.averageDwellMs) {
      return row;
    }

    if (
      row.averageDwellMs === selectedRow.averageDwellMs &&
      row.count > selectedRow.count
    ) {
      return row;
    }

    return selectedRow;
  }, null);
  const topRecapDwellSlotLabel = topRecapDwellRow
    ? copy.slot(topRecapDwellRow.cutSlotNumber.toString().padStart(2, "0"))
    : "";
  const topRecapDwellCountLabel = topRecapDwellRow
    ? formatNumber(topRecapDwellRow.count, locale)
    : "0";
  const topRecapDwellHasMetric = Boolean(
    topRecapDwellRow &&
      (topRecapDwellRow.averageDwellMs > 0 || topRecapDwellRow.count > 0),
  );
  const topRecapDwellMetricLabel =
    topRecapDwellRow && topRecapDwellHasMetric
      ? formatDuration(topRecapDwellRow.averageDwellMs, locale)
      : copy.sharedCutRecapCollectingMetric;
  const sharedRecapEventCountLabel = formatNumber(
    sharedCutRecap?.eventCount ?? 0,
    locale,
  );

  return (
    <section
      aria-label={copy.sharedCutRecapHeadline}
      className="relative min-h-[var(--fanletter-cut-feed-vh,100dvh)] snap-start snap-always overflow-hidden bg-[#050706] px-4 pb-[calc(env(safe-area-inset-bottom)+1.05rem)] pt-[calc(env(safe-area-inset-top)+1.35rem)] text-white"
      data-shared-cut-recap
      data-shared-character-intro
    >
      <div className="absolute inset-0">
        <Image
          alt=""
          className="scale-[1.04] object-cover opacity-42 blur-[1px] saturate-[1.08]"
          fill
          sizes="(min-width: 640px) 430px, 100vw"
          src={backgroundImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(backgroundImageUrl)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,4,0.56),rgba(3,6,4,0.74)_34%,rgba(3,6,4,0.96))]" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[calc(var(--fanletter-cut-feed-vh,100dvh)_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_2.4rem)] w-full max-w-[430px] flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510] shadow-[0_16px_38px_rgba(68,242,110,0.22)]">
              <Images className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
                {copy.sharedCutRecapEyebrow}
              </p>
              <p className="mt-0.5 truncate text-xs font-black text-white/62">
                {copy.sharedTimelineBadge(characterName)}
              </p>
            </div>
          </div>
          <div className="mt-7 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                {copy.sharedCutRecapTitle(recapCutCountLabel)}
              </p>
              <h2 className="mt-1 break-words text-[1.65rem] font-black leading-[1.03] tracking-normal [word-break:keep-all]">
                {isCollectingSharedRecapSignals
                  ? copy.sharedCutRecapCollectingTitle
                  : copy.sharedCutRecapHeadline}
              </h2>
            </div>
            <span className="shrink-0 rounded-full border border-[#44f26e]/26 bg-[#44f26e]/12 px-2.5 py-1.5 text-right text-[0.62rem] font-black text-[#9bffad] backdrop-blur">
              <span className="block text-white/42">
                {copy.sharedCutRecapTotalActions}
              </span>
              <span className="mt-0.5 block text-sm text-white/78">
                {sharedRecapEventCountLabel}
              </span>
            </span>
          </div>
          <p className="mt-2 break-words text-sm font-bold leading-6 text-white/68 [word-break:keep-all]">
            {isCollectingSharedRecapSignals
              ? copy.sharedCutRecapCollectingBody(characterName)
              : copy.sharedCutRecapBody(characterName)}
          </p>
          {topRecapDwellRow ? (
            <div className="mt-4 grid grid-cols-[4.35rem_minmax(0,1fr)] gap-3 rounded-[1.1rem] border border-[#44f26e]/24 bg-[#44f26e]/10 p-2.5 shadow-[0_22px_58px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <span className="relative block h-[5.25rem] overflow-hidden rounded-[0.8rem] bg-white/8 ring-1 ring-[#44f26e]/22">
                <Image
                  alt={topRecapDwellSlotLabel}
                  className="object-cover"
                  fill
                  sizes="72px"
                  src={topRecapDwellRow.imageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    topRecapDwellRow.imageUrl,
                  )}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/66 via-transparent to-black/8" />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-[#44f26e] px-2 py-0.5 text-[0.54rem] font-black text-[#111510]">
                  {topRecapDwellRow.isEntryCut
                    ? copy.sharedCutRecapEntryBadge
                    : topRecapDwellSlotLabel}
                </span>
              </span>
              <div className="min-w-0 self-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e]/16 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
                  <Sparkles className="size-3" />
                  {isCollectingSharedRecapSignals
                    ? copy.sharedCutRecapCollectingTitle
                    : copy.sharedCutRecapTopCutTitle}
                </span>
                <p className="mt-2 break-words text-[1.05rem] font-black leading-tight text-white [word-break:keep-all]">
                  {topRecapDwellMetricLabel}
                </p>
                <p className="mt-1 text-[0.68rem] font-bold leading-snug text-white/62 [word-break:keep-all]">
                  {topRecapDwellSlotLabel} ·{" "}
                  {topRecapDwellHasMetric
                    ? copy.sharedCutRecapDwellEvents(topRecapDwellCountLabel)
                    : copy.sharedCutRecapCollectingMetric}
                </p>
              </div>
            </div>
          ) : null}
          <div className="mt-4 rounded-[1.25rem] border border-white/12 bg-black/58 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                {isCollectingSharedRecapSignals
                  ? copy.sharedCutRecapCollectingTitle
                  : copy.sharedCutRecapDwellTitle}
              </p>
              <p className="text-[0.62rem] font-black text-white/40">
                {copy.sharedCutRecapTotalActions} {sharedRecapEventCountLabel}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {displayedRecapDwellRows.map((row) => {
                const slotLabel = copy.slot(
                  row.cutSlotNumber.toString().padStart(2, "0"),
                );
                const hasRowMetric = row.averageDwellMs > 0 || row.count > 0;
                const progress =
                  maxRecapAverageDwellMs > 0
                    ? Math.max(
                        row.averageDwellMs > 0 ? 8 : 0,
                        Math.round(
                          (row.averageDwellMs / maxRecapAverageDwellMs) * 100,
                        ),
                      )
                    : isCollectingSharedRecapSignals
                      ? 18
                      : 0;
                const countLabel = formatNumber(row.count, locale);

                return (
                  <div
                    className="min-w-0 rounded-[0.8rem] border border-white/8 bg-white/5 p-1.5"
                    key={`shared-journey-dwell:${row.reportIndex}:${row.cutSlotNumber}`}
                  >
                    <span className="relative block aspect-[3/4] overflow-hidden rounded-[0.62rem] bg-white/8 ring-1 ring-white/10">
                      <Image
                        alt={slotLabel}
                        className="object-cover"
                        fill
                        sizes="120px"
                        src={row.imageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          row.imageUrl,
                        )}
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
                      <span
                        className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[0.5rem] font-black ${
                          row.isEntryCut
                            ? "bg-[#44f26e] text-[#111510]"
                            : "bg-black/52 text-white/76"
                        }`}
                      >
                        {row.isEntryCut
                          ? copy.sharedCutRecapEntryBadge
                          : slotLabel}
                      </span>
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-[0.5rem] font-black text-white/70">
                        {row.reportIndex}
                      </span>
                    </span>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/12">
                      <div
                        className="h-full rounded-full bg-[#44f26e] shadow-[0_0_18px_rgba(68,242,110,0.22)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <p className="truncate text-[0.58rem] font-black text-white/78">
                        {hasRowMetric
                          ? formatDuration(row.averageDwellMs, locale)
                          : copy.sharedCutRecapCollectingMetric}
                      </p>
                      <p className="shrink-0 text-[0.5rem] font-black text-white/34">
                        {hasRowMetric
                          ? copy.sharedCutRecapDwellEvents(countLabel)
                          : copy.sharedCutRecapCollectingMetric}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-5 flex min-h-14 w-full max-w-[22rem] items-center justify-center gap-2 rounded-full border border-white/16 bg-black/54 px-5 text-center text-sm font-black text-white shadow-[0_16px_44px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <CheckCircle2 className="size-5 shrink-0 text-[#44f26e]" />
          <span className="min-w-0 [word-break:keep-all]">
            {copy.sharedCutRecapNextGuide}
          </span>
        </div>
      </div>
    </section>
  );
}

function SharedCharacterVlogPickerSlide({
  compactPickerOnly = false,
  completedReportIds,
  completedItem,
  defaultItem,
  entryCutSlotNumber = null,
  locale,
  onSelect,
  options,
  sharedCutRecap = null,
  showCutRecap = false,
  viewedReportIds,
}: {
  compactPickerOnly?: boolean;
  completedReportIds: Set<string>;
  completedItem: SerializedFanletterNewsPublicCutFeedItem;
  defaultItem: SerializedFanletterNewsPublicCutFeedItem;
  entryCutSlotNumber?: number | null;
  locale: Locale;
  onSelect: (item: SerializedFanletterNewsPublicCutFeedItemBase) => void;
  options: SerializedFanletterNewsPublicCutFeedItemBase[];
  sharedCutRecap?: SerializedFanletterNewsPublicCutShareRecap | null;
  showCutRecap?: boolean;
  viewedReportIds: Set<string>;
}) {
  const copy = getCopy(locale);
  const { report } = completedItem;
  const characterName = report.creatorName;
  const characterImageUrl =
    report.creatorAvatarImageUrl ||
    report.coverImageUrl ||
    completedItem.leadCut.imageUrl;
  const defaultReportId = defaultItem.report.reportId;
  const displayedOptions = options.slice(0, 6);
  const isSingleOption = displayedOptions.length === 1;
  const optionCountLabel = formatNumber(displayedOptions.length, locale);
  const backgroundImageUrl =
    completedItem.report.coverImageUrl || completedItem.leadCut.imageUrl;
  const completedCuts =
    completedItem.cuts.length > 0 ? completedItem.cuts : [completedItem.leadCut];
  const recapCuts = completedCuts.slice(0, 4);
  const recapCutCountLabel = formatNumber(recapCuts.length, locale);
  const normalizedEntryCutSlotNumber =
    normalizeFanletterNewsPublicCutSlotNumber(
      entryCutSlotNumber ? String(entryCutSlotNumber) : null,
    ) ?? completedItem.leadCut.slotNumber;
  const recapDwellBySlot = new Map(
    (sharedCutRecap?.cuts ?? []).map((cutMetric) => [
      cutMetric.cutSlotNumber,
      cutMetric,
    ]),
  );
  const recapDwellRows = recapCuts.map((cut) => {
    const cutMetric = recapDwellBySlot.get(cut.slotNumber);

    return {
      averageDwellMs: cutMetric?.averageDwellMs ?? 0,
      count: cutMetric?.dwellEvents || cutMetric?.cutViews || 0,
      cutSlotNumber: cut.slotNumber,
      imageUrl: cut.imageUrl,
      isEntryCut: cut.slotNumber === normalizedEntryCutSlotNumber,
    };
  });
  const measuredRecapDwellRows = recapDwellRows.filter(
    (row) => row.averageDwellMs > 0 || row.count > 0,
  );
  const isCollectingSharedRecapSignals = measuredRecapDwellRows.length < 2;
  const collectingFallbackDwellRows =
    measuredRecapDwellRows.length > 0
      ? measuredRecapDwellRows
      : recapDwellRows.filter((row) => row.isEntryCut).slice(0, 1);
  const displayedRecapDwellRows = isCollectingSharedRecapSignals
    ? collectingFallbackDwellRows.length > 0
      ? collectingFallbackDwellRows
      : recapDwellRows.slice(0, 1)
    : recapDwellRows;
  const maxRecapAverageDwellMs = displayedRecapDwellRows.reduce(
    (maxValue, row) => Math.max(maxValue, row.averageDwellMs),
    0,
  );
  const sharedRecapEventCountLabel = formatNumber(
    sharedCutRecap?.eventCount ?? 0,
    locale,
  );

  return (
    <section
      aria-label={copy.sharedVlogPickerTitle}
      className="relative h-[var(--fanletter-cut-feed-vh,100dvh)] snap-start snap-always overflow-hidden bg-[#050706] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.8rem)] text-white"
      data-shared-character-intro
      data-shared-vlog-picker
    >
      <div className="absolute inset-0">
        <Image
          alt=""
          className="scale-[1.04] object-cover opacity-42 blur-[1px] saturate-[1.08]"
          fill
          sizes="(min-width: 640px) 430px, 100vw"
          src={backgroundImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(backgroundImageUrl)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,4,0.56),rgba(3,6,4,0.74)_34%,rgba(3,6,4,0.96))]" />
      </div>
      <div className="relative z-10 mx-auto flex h-[calc(var(--fanletter-cut-feed-vh,100dvh)_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_1.55rem)] w-full max-w-[430px] flex-col">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510] shadow-[0_14px_30px_rgba(68,242,110,0.18)]">
            {showCutRecap ? (
              <Images className="size-3.5" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.5rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
              {showCutRecap
                ? copy.sharedCutRecapEyebrow
                : compactPickerOnly
                  ? copy.sharedVlogPickerEyebrow
                  : copy.characterIntroEyebrow}
            </p>
            <p className="truncate text-[0.62rem] font-black text-white/58">
              {showCutRecap
                ? copy.sharedTimelineBadge(characterName)
                : compactPickerOnly
                  ? characterName
                  : copy.sharedSourceCtaEyebrow}
            </p>
          </div>
        </div>
        <div
	          className={`flex min-h-0 flex-1 flex-col ${
	            compactPickerOnly
	              ? "justify-center gap-5 py-5"
	              : showCutRecap
	                ? "justify-between gap-3 py-3"
                : "justify-start gap-2 py-2"
	          }`}
        >
          {showCutRecap ? (
            <div data-shared-cut-recap>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                    {copy.sharedCutRecapTitle(recapCutCountLabel)}
                  </p>
                  <h2 className="mt-1 break-words text-[1.5rem] font-black leading-[1.03] tracking-normal [word-break:keep-all]">
                    {isCollectingSharedRecapSignals
                      ? copy.sharedCutRecapCollectingTitle
                      : copy.sharedCutRecapHeadline}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full border border-[#44f26e]/26 bg-[#44f26e]/12 px-2.5 py-1.5 text-right text-[0.62rem] font-black text-[#9bffad] backdrop-blur">
                  <span className="block text-white/42">
                    {copy.sharedCutRecapTotalActions}
                  </span>
                  <span className="mt-0.5 block text-sm text-white/78">
                    {sharedRecapEventCountLabel}
                  </span>
                </span>
              </div>
              <p className="mt-2 line-clamp-2 break-words text-xs font-bold leading-5 text-white/68 [word-break:keep-all]">
                {isCollectingSharedRecapSignals
                  ? copy.sharedCutRecapCollectingBody(characterName)
                  : copy.sharedCutRecapBody(characterName)}
              </p>
              <div className="mt-3 rounded-[1.25rem] border border-white/12 bg-black/58 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                    {isCollectingSharedRecapSignals
                      ? copy.sharedCutRecapCollectingTitle
                      : copy.sharedCutRecapDwellTitle}
                  </p>
                  <p className="text-[0.62rem] font-black text-white/40">
                    {copy.sharedCutRecapTotalActions} {sharedRecapEventCountLabel}
                  </p>
                </div>
                <div className="mt-3 space-y-3">
                  {displayedRecapDwellRows.map((row) => {
                    const slotLabel = copy.slot(
                      row.cutSlotNumber.toString().padStart(2, "0"),
                    );
                    const hasRowMetric = row.averageDwellMs > 0 || row.count > 0;
                    const progress =
                      maxRecapAverageDwellMs > 0
                        ? Math.max(
                            row.averageDwellMs > 0 ? 8 : 0,
                            Math.round(
                              (row.averageDwellMs / maxRecapAverageDwellMs) *
                                100,
                            ),
                          )
                        : isCollectingSharedRecapSignals
                          ? 18
                          : 0;
                    const countLabel = formatNumber(row.count, locale);

                    return (
                      <div
                        className="grid grid-cols-[2.8rem_minmax(0,1fr)_4.35rem] items-center gap-2.5"
                        key={`${completedItem.report.reportId}:dwell-recap:${row.cutSlotNumber}`}
                      >
                        <span className="relative block h-[3.55rem] overflow-hidden rounded-[0.62rem] bg-white/8 ring-1 ring-white/10">
                          <Image
                            alt={slotLabel}
                            className="object-cover"
                            fill
                            sizes="46px"
                            src={row.imageUrl}
                            unoptimized={shouldBypassFanletterImageOptimization(
                              row.imageUrl,
                            )}
                          />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/62 via-transparent to-black/10" />
                        </span>
                        <div className="min-w-0">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span
                              className={`inline-flex h-5 items-center rounded-full px-2 text-[0.56rem] font-black ${
                                row.isEntryCut
                                  ? "bg-[#44f26e] text-[#111510]"
                                  : "bg-white/8 text-white/60"
                              }`}
                            >
                              {row.isEntryCut
                                ? copy.sharedCutRecapEntryBadge
                                : slotLabel}
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-white/13">
                            <div
                              className="h-full rounded-full bg-[#44f26e] shadow-[0_0_24px_rgba(68,242,110,0.26)]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-white/78">
                            {hasRowMetric
                              ? formatDuration(row.averageDwellMs, locale)
                              : copy.sharedCutRecapCollectingMetric}
                          </p>
                          <p className="mt-0.5 text-[0.58rem] font-black text-white/34">
                            {hasRowMetric
                              ? copy.sharedCutRecapDwellEvents(countLabel)
                              : copy.sharedCutRecapCollectingMetric}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : compactPickerOnly ? (
            <div className="mx-auto w-full max-w-[22.5rem] rounded-[1.25rem] border border-[#44f26e]/18 bg-black/48 p-3.5 shadow-[0_20px_58px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="relative size-[4.75rem] shrink-0 overflow-hidden rounded-[1rem] border border-[#44f26e]/38 bg-black/38">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="76px"
                    src={characterImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      characterImageUrl,
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
                    {copy.characterIntroEyebrow}
                  </p>
                  <h2 className="mt-0.5 break-words text-xl font-black leading-tight [word-break:keep-all]">
                    {copy.characterIntroTitle(characterName)}
                  </h2>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 break-words text-[0.74rem] font-bold leading-5 text-white/62 [word-break:keep-all]">
                {copy.characterIntroBody(characterName)}
              </p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[24rem] items-center gap-2 rounded-[0.85rem] border border-white/10 bg-black/38 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-[0.65rem] border border-[#44f26e]/28 bg-black/38">
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="40px"
                  src={characterImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    characterImageUrl,
                  )}
	                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[0.82rem] font-black leading-tight tracking-normal">
                  {copy.characterIntroTitle(characterName)}
                </h2>
                <p className="mt-0.5 line-clamp-1 text-[0.58rem] font-bold leading-3 text-white/50 [word-break:keep-all]">
                  {copy.characterIntroBody(characterName)}
                </p>
              </div>
            </div>
          )}
          <div className="min-h-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.52rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
                  {copy.sharedVlogPickerReportCount(optionCountLabel)}
                </p>
                <h3
                  className={`mt-0.5 break-words font-black leading-[1.04] tracking-normal [word-break:keep-all] ${
                    showCutRecap ? "text-[1.2rem]" : "text-[1.05rem]"
                  }`}
                >
                  {isSingleOption
                    ? copy.sharedVlogPickerSingleTitle
                    : copy.sharedVlogPickerTitle}
                </h3>
              </div>
	              <span
	                className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510] shadow-[0_16px_38px_rgba(68,242,110,0.2)] ${
	                  showCutRecap ? "size-9" : "size-8"
	                }`}
	              >
	                <Video className={showCutRecap ? "size-5" : "size-4"} />
	              </span>
	            </div>
            <p
              className={`max-w-[22rem] break-words font-bold text-white/66 [word-break:keep-all] ${
                  showCutRecap
                    ? "mt-1 line-clamp-2 text-[0.7rem] leading-4"
                    : "mt-0.5 line-clamp-1 text-[0.62rem] leading-3"
              }`}
            >
              {isSingleOption
                ? copy.sharedVlogPickerSingleBody
                : copy.sharedVlogPickerBody}
            </p>
          </div>
          <div
            aria-label={copy.sharedVlogPickerReports}
            className={`grid min-h-0 flex-1 content-start gap-1.5 ${
              isSingleOption ? "grid-cols-1" : "grid-cols-3"
            }`}
          >
            {displayedOptions.map((option) => {
              const optionReportId = option.report.reportId;
              const isDefault = optionReportId === defaultReportId;
              const isCompleted = completedReportIds.has(optionReportId);
              const isViewed = viewedReportIds.has(optionReportId);
              const statusLabel = isCompleted
                ? copy.sharedVlogPickerCompletedBadge
                : isViewed
                  ? copy.sharedVlogPickerViewedBadge
                  : isDefault
                    ? copy.sharedVlogPickerDefaultBadge
                    : null;
              const statusClassName = isCompleted
                ? "bg-white text-[#111510]"
                : isViewed
                  ? "border border-[#44f26e]/48 bg-[#44f26e]/16 text-[#9bffad]"
                  : "bg-[#44f26e] text-[#111510]";
              const cardStateClassName = isCompleted
                ? "border-[#44f26e]/62 bg-[#102014]/76"
                : isViewed
                  ? "border-[#44f26e]/42 bg-black/68"
                  : "border-white/14 bg-black/56";
              const participantCountLabel = formatNumber(
                option.sourceReveal.count,
                locale,
              );

              return (
                <button
                  aria-label={`${option.report.reporterName} ${option.report.title} ${copy.sharedVlogPickerCta}`}
                  className={`group flex min-h-0 flex-col rounded-[0.72rem] border p-1 text-left shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-[#44f26e]/60 hover:bg-black/70 focus:outline-none focus:ring-4 focus:ring-[#44f26e]/28 ${cardStateClassName}`}
                  key={`${optionReportId}:vlog-option`}
                  onClick={() => onSelect(option)}
                  type="button"
                >
                  <span className="relative block aspect-[9/16] w-full overflow-hidden rounded-[0.58rem] bg-white/10">
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="(min-width: 640px) 130px, 31vw"
                      src={option.leadCut.imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(
                        option.leadCut.imageUrl,
                      )}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/66 via-black/6 to-black/8" />
                    {statusLabel ? (
                      <span
                        className={`absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[0.44rem] font-black leading-none ${statusClassName}`}
                      >
                        {statusLabel}
                      </span>
                    ) : null}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/44 to-transparent px-1.5 pb-1.5 pt-5">
                      <span className="block truncate text-[0.5rem] font-black uppercase tracking-[0.06em] text-[#9bffad]">
                        {option.report.reporterName}
                      </span>
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[0.5rem] font-black text-white/72">
                        <HeartHandshake className="size-2.5 text-[#44f26e]" />
                        {participantCountLabel}/{option.sourceReveal.threshold}
                      </span>
                    </span>
                  </span>
                  <span className="sr-only">
                      {option.report.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SharedJourneyEndSlide({
  characterHref,
  connectHref,
  discoveryItems,
  isDiscoveryLoading,
  journeyItems,
  locale,
  onNavigationStart,
  referralCode,
  returnToHref,
  shareId,
}: {
  characterHref: string;
  connectHref: string;
  discoveryItems: SerializedFanletterNewsPublicCutFeedItemBase[];
  isDiscoveryLoading: boolean;
  journeyItems: SerializedFanletterNewsPublicCutFeedItem[];
  locale: Locale;
  onNavigationStart: (pending: CutFeedNavigationPending) => void;
  referralCode: string | null;
  returnToHref: string;
  shareId: string | null;
}) {
  const copy = getCopy(locale);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const shareFeedbackTimeoutRef = useRef<number | null>(null);
  const shareInFlightRef = useRef(false);
  const primaryItem = journeyItems[0] ?? null;
  const characterName = primaryItem?.report.creatorName ?? copy.serviceCharacters;
  const backgroundImageUrl =
    primaryItem?.report.coverImageUrl ||
    primaryItem?.leadCut.imageUrl ||
    discoveryItems[0]?.leadCut.imageUrl ||
    "";
  const characterImageUrl =
    primaryItem?.report.creatorAvatarImageUrl ||
    primaryItem?.report.coverImageUrl ||
    primaryItem?.leadCut.imageUrl ||
    discoveryItems[0]?.report.creatorAvatarImageUrl ||
    discoveryItems[0]?.leadCut.imageUrl ||
    "";
  const reportCountLabel = formatNumber(journeyItems.length, locale);
  const cutCountLabel = formatNumber(
    journeyItems.reduce(
      (totalCount, item) =>
        totalCount + Math.min(getPublicCutItemCutCount(item), 4),
      0,
    ),
    locale,
  );
  const shareLabel =
    shareState === "copied"
      ? copy.shareCopied
      : shareState === "error"
        ? copy.shareError
        : shareState === "sharing"
          ? copy.shareSharing
          : copy.sharedEndShare;

  useEffect(
    () => () => {
      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(shareFeedbackTimeoutRef.current);
      }
    },
    [],
  );

  const showShareFeedback = useCallback(
    (nextState: Exclude<ShareState, "sharing">) => {
      if (shareFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(shareFeedbackTimeoutRef.current);
        shareFeedbackTimeoutRef.current = null;
      }

      setShareState(nextState);

      if (nextState === "copied" || nextState === "error") {
        shareFeedbackTimeoutRef.current = window.setTimeout(() => {
          setShareState("idle");
          shareFeedbackTimeoutRef.current = null;
        }, 2200);
      }
    },
    [],
  );

  const handleShare = useCallback(async () => {
    if (shareInFlightRef.current || !primaryItem) {
      return;
    }

    shareInFlightRef.current = true;
    setShareState("sharing");

    let nextState: Exclude<ShareState, "sharing"> = "idle";

    try {
      const shareUrl = window.location.href;
      const shareTitle = copy.shareTitle(primaryItem.report.title);
      const shareSummary = copy.shareSummary(
        primaryItem.report.title,
        primaryItem.report.reporterName,
      );

      trackFunnelEvent("share_click", {
        contentId: primaryItem.report.contentId,
        metadata: {
          creatorReferralCode: primaryItem.report.creatorReferralCode,
          journeyReportCount: journeyItems.length,
          reportId: primaryItem.report.reportId,
          reporterReferralCode: primaryItem.report.reporterReferralCode,
          source: "fanletter-news-cut-shared-end",
        },
        referralCode,
        shareId,
        targetHref: shareUrl,
      });

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            text: shareSummary,
            title: shareTitle,
            url: shareUrl,
          });
          nextState = "idle";
          return;
        } catch (error) {
          if (isShareAbortError(error)) {
            nextState = "idle";
            return;
          }
        }
      }

      nextState = (await copyToClipboard(shareUrl)) ? "copied" : "error";
    } catch {
      nextState = "error";
    } finally {
      shareInFlightRef.current = false;
      showShareFeedback(nextState);
    }
  }, [
    copy,
    journeyItems.length,
    primaryItem,
    referralCode,
    shareId,
    showShareFeedback,
  ]);

  return (
    <section
      aria-label={copy.sharedEndTitle(characterName)}
      className="relative flex min-h-[var(--fanletter-cut-feed-vh,100dvh)] snap-start snap-always overflow-hidden bg-[#050706] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.2rem)] text-white"
      data-shared-journey-end
    >
      {backgroundImageUrl ? (
        <div className="absolute inset-0">
          <Image
            alt=""
            className="scale-[1.05] object-cover opacity-38 blur-[1.5px] saturate-[1.08]"
            fill
            sizes="(min-width: 640px) 430px, 100vw"
            src={backgroundImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(backgroundImageUrl)}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(68,242,110,0.2),transparent_32%),linear-gradient(180deg,rgba(3,6,4,0.48),rgba(3,6,4,0.82)_42%,rgba(3,6,4,0.98))]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(68,242,110,0.18),transparent_30%),linear-gradient(180deg,#0d1710,#050706)]" />
      )}
      <div className="relative z-10 mx-auto flex min-h-[calc(var(--fanletter-cut-feed-vh,100dvh)_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_2.2rem)] w-full max-w-[430px] flex-col">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510] shadow-[0_18px_42px_rgba(68,242,110,0.24)]">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
              {copy.sharedEndEyebrow}
            </p>
            <p className="mt-0.5 truncate text-xs font-black text-white/62">
              {characterName}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center py-5">
          <div className="mx-auto w-full max-w-[24rem]">
            <div className="flex items-center gap-3">
              {characterImageUrl ? (
                <span className="relative block size-[4.65rem] shrink-0 overflow-hidden rounded-[1.05rem] border border-[#44f26e]/34 bg-black/36 shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="76px"
                    src={characterImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      characterImageUrl,
                    )}
                  />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
                  {copy.characterIntroEyebrow}
                </p>
                <h2 className="mt-1 break-words text-[1.78rem] font-black leading-[1.02] tracking-normal [word-break:keep-all]">
                  {copy.sharedEndTitle(characterName)}
                </h2>
              </div>
            </div>
            <p className="mt-4 max-w-[22rem] break-words text-sm font-bold leading-6 text-white/70 [word-break:keep-all]">
              {copy.sharedEndBody(characterName)}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-[1rem] border border-white/10 bg-black/42 p-3 backdrop-blur-xl">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-white/38">
                  {copy.sharedEndReportsMetric}
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {reportCountLabel}
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/42 p-3 backdrop-blur-xl">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-white/38">
                  {copy.sharedEndCutsMetric}
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {cutCountLabel}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-[#111510] shadow-[0_18px_44px_rgba(68,242,110,0.2)] transition hover:bg-[#65ff86] focus:outline-none focus:ring-4 focus:ring-[#44f26e]/28"
                href={characterHref}
                onClick={() => {
                  onNavigationStart({
                    href: characterHref,
                    label: copy.navigationPending.character(characterName),
                  });
                }}
              >
                <Sparkles className="size-4" />
                {copy.sharedEndContinue(characterName)}
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 text-xs font-black !text-white/82 backdrop-blur-xl transition hover:border-[#44f26e]/40 hover:!text-[#9bffad] focus:outline-none focus:ring-4 focus:ring-[#44f26e]/20"
                  href={connectHref}
                  onClick={() => {
                    onNavigationStart({
                      href: connectHref,
                      label: copy.navigationPending.destination(
                        copy.sharedEndNotify,
                      ),
                    });
                  }}
                >
                  <Check className="size-4 text-[#44f26e]" />
                  {copy.sharedEndNotify}
                </Link>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 text-xs font-black text-white/82 backdrop-blur-xl transition hover:border-[#44f26e]/40 hover:text-[#9bffad] focus:outline-none focus:ring-4 focus:ring-[#44f26e]/20"
                  disabled={shareState === "sharing"}
                  onClick={() => void handleShare()}
                  type="button"
                >
                  <Share2 className="size-4 text-[#44f26e]" />
                  <span className="truncate">{shareLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-white/10 bg-black/46 p-3 shadow-[0_20px_58px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[#9bffad]">
                {copy.serviceCharacters}
              </p>
              <h3 className="mt-1 break-words text-sm font-black leading-tight [word-break:keep-all]">
                {copy.sharedEndOtherTitle}
              </h3>
              <p className="mt-1 line-clamp-2 text-[0.68rem] font-bold leading-4 text-white/50 [word-break:keep-all]">
                {copy.sharedEndOtherBody}
              </p>
            </div>
            <Sparkles className="mt-1 size-5 shrink-0 text-[#44f26e]" />
          </div>
          {discoveryItems.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {discoveryItems.map((item) => {
                const discoveryHref = getCharacterHref({
                  characterReferralCode: item.report.creatorReferralCode,
                  cutSlotNumber: item.leadCut.slotNumber,
                  locale,
                  referralCode,
                  reportId: item.report.reportId,
                  returnToHref,
                });
                const discoveryImageUrl =
                  item.report.creatorAvatarImageUrl ||
                  item.report.coverImageUrl ||
                  item.leadCut.imageUrl;

                return (
                  <Link
                    className="group min-w-0 rounded-[0.95rem] border border-white/10 bg-white/6 p-1.5 transition hover:border-[#44f26e]/42 hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-[#44f26e]/18"
                    href={discoveryHref}
                    key={`${item.report.creatorReferralCode ?? item.report.reportId}:shared-discovery`}
                    onClick={() => {
                      onNavigationStart({
                        href: discoveryHref,
                        label: copy.navigationPending.character(
                          item.report.creatorName,
                        ),
                      });
                    }}
                  >
                    <span className="relative block aspect-square overflow-hidden rounded-[0.72rem] bg-white/10">
                      <Image
                        alt=""
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        fill
                        sizes="96px"
                        src={discoveryImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          discoveryImageUrl,
                        )}
                      />
                    </span>
                    <span className="mt-1.5 block truncate text-[0.64rem] font-black text-white">
                      {item.report.creatorName}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.56rem] font-bold text-white/42">
                      {item.report.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-[0.9rem] border border-white/8 bg-white/5 px-3 py-2 text-xs font-bold text-white/48">
              {isDiscoveryLoading
                ? copy.sharedEndOtherLoading
                : copy.sharedEndOtherEmpty}
            </p>
          )}
        </div>
      </div>
    </section>
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

function getSharedVlogReportOptions(
  item?: SerializedFanletterNewsPublicCutFeedItem | null,
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

  const rankedOptions = defaultOption
    ? [defaultOption, ...rankedRemainingOptions]
    : rankedRemainingOptions;

  return rankedOptions.slice(0, 6);
}

function getSharedTimelineItemScore(
  item: SerializedFanletterNewsPublicCutFeedItem,
) {
  const publishedAtTime = item.report.sourcePublishedAt
    ? Date.parse(item.report.sourcePublishedAt)
    : Date.parse(item.report.createdAt);

  return (
    getSharedVlogReportOptions(item).length * 1_000_000 +
    (item.sourceReveal.unlocked ? 100_000 : 0) +
    item.sourceReveal.count * 1_000 +
    (Number.isFinite(publishedAtTime) ? publishedAtTime / 1_000_000 : 0)
  );
}

function rankSharedTimelineItems(
  items: SerializedFanletterNewsPublicCutFeedItem[],
) {
  return [...items].sort(
    (left, right) =>
      getSharedTimelineItemScore(right) - getSharedTimelineItemScore(left),
  );
}

type SharedVlogTransition = {
  afterItemIndex: number;
  options: SerializedFanletterNewsPublicCutFeedItemBase[];
  targetItem: SerializedFanletterNewsPublicCutFeedItem;
  targetItemIndex: number;
};

function getSharedVlogTransitionSlideCount() {
  return 1;
}

function getPublicCutFeedPreloadImageUrls(
  items: SerializedFanletterNewsPublicCutFeedItemBase[],
) {
  const urls = new Set<string>();

  for (const item of items) {
    [
      item.leadCut.imageUrl,
      item.report.coverImageUrl,
      item.report.creatorAvatarImageUrl,
      item.report.reporterAvatarImageUrl,
      ...item.cuts.map((cut) => cut.imageUrl),
    ].forEach((url) => {
      const normalizedUrl = url?.trim();

      if (normalizedUrl) {
        urls.add(normalizedUrl);
      }
    });
  }

  return [...urls];
}

type CutFeedSwipeGuideTarget = {
  index: number;
  reason: "entry" | "sourceView";
};

function getPublicCutItemCutCount(item: SerializedFanletterNewsPublicCutFeedItem) {
  return Math.max(item.cuts.length, 1);
}

type LockedReporterCandidate = {
  contentId: string;
  index: number;
};

type SourceRevealCandidate = {
  contentId: string;
  index: number;
};

function getLockedReporterCandidates(
  items: SerializedFanletterNewsPublicCutFeedItem[],
) {
  const seenContentIds = new Set<string>();
  const candidates: LockedReporterCandidate[] = [];

  items.forEach((item, index) => {
    const contentId = item.report.contentId.trim();

    if (
      !contentId ||
      item.reportSlot.full ||
      item.sourceReveal.unlocked ||
      seenContentIds.has(contentId)
    ) {
      return;
    }

    seenContentIds.add(contentId);
    candidates.push({ contentId, index });
  });

  return candidates;
}

function getNextSourceRevealCandidateIndex({
  currentContentId,
  currentIndex,
  items,
}: {
  currentContentId: string;
  currentIndex: number;
  items: SerializedFanletterNewsPublicCutFeedItem[];
}) {
  const normalizedCurrentContentId = currentContentId.trim();
  const candidates: SourceRevealCandidate[] = [];
  const seenContentIds = new Set<string>();

  items.forEach((item, index) => {
    const contentId = item.report.contentId.trim();

    if (
      !contentId ||
      contentId === normalizedCurrentContentId ||
      item.sourceReveal.unlocked ||
      item.sourceReveal.requestedByViewer ||
      seenContentIds.has(contentId)
    ) {
      return;
    }

    seenContentIds.add(contentId);
    candidates.push({ contentId, index });
  });

  if (candidates.length <= 0) {
    return -1;
  }

  return (
    candidates.find((candidate) => candidate.index > currentIndex)?.index ??
    candidates[0]?.index ??
    -1
  );
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
  feedRotationSeed,
  hasMore: initialHasMore,
  initialCutSlotNumber = null,
  items: initialItems,
  locale,
  nextOffset: initialNextOffset,
  referralCode,
  returnToHref = null,
  shareId,
  sharedCutRecap = null,
  sourceContentId = null,
  viewerEmail = null,
}: {
  dictionary: Dictionary;
  excludeReportId?: string | null;
  feedRotationSeed: string;
  hasMore: boolean;
  initialCutSlotNumber?: number | null;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  locale: Locale;
  nextOffset: number;
  referralCode: string | null;
  returnToHref?: string | null;
  shareId: string | null;
  sharedCutRecap?: SerializedFanletterNewsPublicCutShareRecap | null;
  sourceContentId?: string | null;
  viewerEmail?: string | null;
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
    useState(() => Boolean(shareId || excludeReportId));
  const [sourceViewSwipeGuideDismissed, setSourceViewSwipeGuideDismissed] =
    useState(() => Boolean(shareId || excludeReportId));
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [navigationPending, setNavigationPending] =
    useState<CutFeedNavigationPending | null>(null);
  const [isCutFeedHeaderVisible, setIsCutFeedHeaderVisible] = useState(false);
  const [isRoleShortcutVisible, setIsRoleShortcutVisible] = useState(false);
  const [isPublishedReturnEntry, setIsPublishedReturnEntry] = useState(false);
  const [visibleSlideIndex, setVisibleSlideIndex] = useState(0);
  const [sourceOverlayOpenSlideIndex, setSourceOverlayOpenSlideIndex] =
    useState<number | null>(null);
  const [sharedCutSlotOverrides, setSharedCutSlotOverrides] = useState<
    Record<number, number>
  >({});
  const [sharedConsumedReportIds, setSharedConsumedReportIds] = useState<
    Set<string>
  >(
    () => new Set(),
  );
  const [sharedViewedReportIds, setSharedViewedReportIds] = useState<
    Set<string>
  >(
    () => new Set(),
  );
  const [sharedMinimumSlideIndex, setSharedMinimumSlideIndex] = useState(0);
  const [sharedDiscoveryItems, setSharedDiscoveryItems] = useState<
    SerializedFanletterNewsPublicCutFeedItemBase[]
  >([]);
  const [isSharedDiscoveryLoading, setIsSharedDiscoveryLoading] =
    useState(false);
  const [reporterPanelRequest, setReporterPanelRequest] = useState<{
    id: number;
    index: number;
  } | null>(null);
  const [visibleViewportHeight, setVisibleViewportHeight] = useState<
    string | null
  >(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lockedTouchStartYRef = useRef<number | null>(null);
  const lockedTouchNavigationHandledRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const headerRevealTimerRef = useRef<number | null>(null);
  const roleShortcutRevealTimerRef = useRef<number | null>(null);
  const loadMoreIntersectionArmedRef = useRef(true);
  const preloadedImageUrlsRef = useRef<Set<string>>(new Set());
  const preloadedImagesRef = useRef<HTMLImageElement[]>([]);
  const sharedDiscoveryLoadedForRef = useRef<string | null>(null);
  const sharedResolvedTransitionSlideIndexesRef = useRef<Set<number>>(
    new Set(),
  );
  const cutFeedHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    referralCode,
  );
  const newsroomHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const platformHref = buildPathWithReferral(
    `/${locale}/fanletter/news/platform`,
    referralCode,
  );
  const returnablePlatformHref = setPathSearchParams(platformHref, {
    returnTo: cutFeedHomeHref,
  });
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts/characters`,
    referralCode,
  );
  const returnableCharactersHref = setPathSearchParams(charactersHref, {
    returnTo: cutFeedHomeHref,
  });
  const reportersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts/reporters`,
    referralCode,
  );
  const returnableReportersHref = setPathSearchParams(reportersHref, {
    returnTo: cutFeedHomeHref,
  });
  const vlogsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/vlogs`,
    referralCode,
  );
  const sourceVlogsHref = setPathSearchParams(vlogsHref, {
    returnTo: cutFeedHomeHref,
  });
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts/purchases`,
    referralCode,
  );
  const returnablePurchasesHref = setPathSearchParams(purchasesHref, {
    returnTo: cutFeedHomeHref,
  });
  const shareLinksHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts/shares`,
    referralCode,
  );
  const returnableShareLinksHref = setPathSearchParams(shareLinksHref, {
    returnTo: cutFeedHomeHref,
  });
  const myHref = buildPathWithReferral(
    `/${locale}/fanletter/news/me`,
    referralCode,
  );
  const returnableMyHref = setPathSearchParams(myHref, {
    returnTo: cutFeedHomeHref,
  });
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
  const vlogsNewHref = getFanletterNewsVlogStartHref({
    locale,
    referralCode,
    returnToHref: cutFeedHomeHref,
  });
  const serviceMenuGroups: CutFeedServiceMenuGroup[] = [
    {
      items: [
        {
          href: cutFeedHomeHref,
          icon: Home,
          label: copy.serviceHome,
          secondaryLabel: copy.serviceHomeHint,
          primary: true,
        },
        {
          href: returnablePlatformHref,
          icon: Compass,
          label: copy.servicePlatform,
          secondaryLabel: copy.servicePlatformHint,
        },
        {
          href: returnableCharactersHref,
          icon: Sparkles,
          label: copy.serviceCharacters,
          secondaryLabel: copy.serviceCharactersHint,
        },
        {
          href: returnableReportersHref,
          icon: PenLine,
          label: copy.serviceReporters,
          secondaryLabel: copy.serviceReportersHint,
        },
        {
          href: sourceVlogsHref,
          icon: Video,
          label: copy.serviceVlogs,
          secondaryLabel: copy.serviceVlogsHint,
        },
      ],
      label: copy.serviceSectionExplore,
    },
    {
      items: [
        {
          href: returnablePurchasesHref,
          icon: BookOpenCheck,
          label: copy.servicePurchases,
          secondaryLabel: copy.servicePurchasesHint,
        },
        {
          href: returnableShareLinksHref,
          icon: Share2,
          label: copy.serviceShareLinks,
          secondaryLabel: copy.serviceShareLinksHint,
        },
        {
          href: returnableMyHref,
          icon: UserRound,
          label: copy.serviceMy,
          secondaryLabel: copy.serviceMyHint,
        },
      ],
      label: copy.serviceSectionMine,
    },
    {
      items: [
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
      ],
      label: copy.serviceSectionCreate,
    },
  ];
  const headerCountLabel = hasMore
    ? `${formatNumber(items.length, locale)}+`
    : formatNumber(items.length, locale);
  const selectedRolePreference = useSyncExternalStore(
    subscribeToRolePreference,
    getRolePreferenceSnapshot,
    getServerRolePreferenceSnapshot,
  );
  const isSharedConsumptionEntry = Boolean(shareId || excludeReportId);
  const feedItems = useMemo(
    () =>
      shareId
        ? items.slice(0, CUT_FEED_SHARED_JOURNEY_MAX_REPORTS)
        : items,
    [items, shareId],
  );
  const shouldShowSharedJourneyEndSlide = Boolean(
    shareId &&
      feedItems.length > 0 &&
      (feedItems.length >= CUT_FEED_SHARED_JOURNEY_MAX_REPORTS || !hasMore),
  );
  const shouldShowSharedTimelineTransitions = Boolean(
    shareId && feedItems[0]?.report.creatorReferralCode,
  );
  const sharedVlogTransitions = useMemo<SharedVlogTransition[]>(() => {
    if (!shouldShowSharedTimelineTransitions) {
      return [];
    }

    return feedItems.flatMap((item, index) => {
      if (index <= 0) {
        return [];
      }

      const options = getSharedVlogReportOptions(item);

      if (options.length <= 0) {
        return [];
      }

      return [
        {
          afterItemIndex: index - 1,
          options,
          targetItem: item,
          targetItemIndex: index,
        },
      ];
    });
  }, [feedItems, shouldShowSharedTimelineTransitions]);
  const getSharedTransitionCountBeforeItemIndex = useCallback(
    (itemIndex: number) =>
      sharedVlogTransitions.reduce(
        (count, transition) =>
          transition.targetItemIndex <= itemIndex
            ? count + getSharedVlogTransitionSlideCount()
            : count,
        0,
      ),
    [sharedVlogTransitions],
  );
  const getItemSlideIndex = useCallback(
    (itemIndex: number) =>
      itemIndex + getSharedTransitionCountBeforeItemIndex(itemIndex),
    [getSharedTransitionCountBeforeItemIndex],
  );
  const getSharedTransitionSlideIndex = useCallback(
    (transition: SharedVlogTransition) =>
      getItemSlideIndex(transition.afterItemIndex) + 1,
    [getItemSlideIndex],
  );
  const getSharedTransitionForSlideIndex = useCallback(
    (slideIndex: number) =>
      sharedVlogTransitions.find(
        (transition) => {
          const transitionSlideIndex = getSharedTransitionSlideIndex(transition);

          return (
            slideIndex >= transitionSlideIndex &&
            slideIndex <
              transitionSlideIndex + getSharedVlogTransitionSlideCount()
          );
        },
      ) ?? null,
    [getSharedTransitionSlideIndex, sharedVlogTransitions],
  );
  const getSkippedSharedTransitionSlideIndex = useCallback(
    (previousSlideIndex: number, nextSlideIndex: number) => {
      if (!shareId || nextSlideIndex <= previousSlideIndex) {
        return null;
      }

      let skippedSlideIndex: number | null = null;

      for (const transition of sharedVlogTransitions) {
        const transitionSlideIndex = getSharedTransitionSlideIndex(transition);
        const transitionSlideCount = getSharedVlogTransitionSlideCount();

        for (
          let transitionSlideOffset = 0;
          transitionSlideOffset < transitionSlideCount;
          transitionSlideOffset += 1
        ) {
          const candidateSlideIndex =
            transitionSlideIndex + transitionSlideOffset;

          if (
            candidateSlideIndex > previousSlideIndex &&
            candidateSlideIndex < nextSlideIndex &&
            (skippedSlideIndex === null ||
              candidateSlideIndex < skippedSlideIndex)
          ) {
            skippedSlideIndex = candidateSlideIndex;
          }
        }
      }

      return skippedSlideIndex;
    },
    [getSharedTransitionSlideIndex, shareId, sharedVlogTransitions],
  );
  const sharedVlogPreloadItems = useMemo(
    () => sharedVlogTransitions.flatMap((transition) => transition.options),
    [sharedVlogTransitions],
  );
  const isSharedEntrySlideVisible = Boolean(shareId && visibleSlideIndex === 0);
  const isSharedTransitionSlideVisible = Boolean(
    shareId && getSharedTransitionForSlideIndex(visibleSlideIndex),
  );
  const isSharedTransitionSelectionPending = Boolean(
    shareId &&
      getSharedTransitionForSlideIndex(visibleSlideIndex) &&
      !sharedResolvedTransitionSlideIndexesRef.current.has(visibleSlideIndex),
  );
  const sharedVlogTransitionSlideCount = sharedVlogTransitions.reduce(
    (count) => count + getSharedVlogTransitionSlideCount(),
    0,
  );
  const sharedJourneyEndSlideCount = shouldShowSharedJourneyEndSlide ? 2 : 0;
  const virtualSlideCount =
    feedItems.length +
    sharedVlogTransitionSlideCount +
    sharedJourneyEndSlideCount;
  const getFeedIndexForSlide = useCallback(
    (slideIndex: number) => {
      if (!shouldShowSharedTimelineTransitions) {
        return Math.min(slideIndex, Math.max(feedItems.length - 1, 0));
      }

      for (let itemIndex = 0; itemIndex < feedItems.length; itemIndex += 1) {
        if (getItemSlideIndex(itemIndex) === slideIndex) {
          return itemIndex;
        }
      }

      const transition = getSharedTransitionForSlideIndex(slideIndex);

      if (transition) {
        return transition.afterItemIndex;
      }

      let nearestItemIndex = 0;

      for (let itemIndex = 0; itemIndex < feedItems.length; itemIndex += 1) {
        if (getItemSlideIndex(itemIndex) <= slideIndex) {
          nearestItemIndex = itemIndex;
        }
      }

      return nearestItemIndex;
    },
    [
      feedItems.length,
      getItemSlideIndex,
      getSharedTransitionForSlideIndex,
      shouldShowSharedTimelineTransitions,
    ],
  );
  const activeFeedIndex = Math.min(
    Math.max(getFeedIndexForSlide(visibleSlideIndex), 0),
    Math.max(feedItems.length - 1, 0),
  );
  const isSharedTimelineFeedSlideVisible = Boolean(
    shareId &&
      shouldShowSharedTimelineTransitions &&
      activeFeedIndex > 0 &&
      !isSharedTransitionSlideVisible,
  );
  const shouldGateSharedItemAtIndex = useCallback(
    (item: SerializedFanletterNewsPublicCutFeedItem) =>
      Boolean(
        shareId &&
          getPublicCutItemCutCount(item) > 1 &&
          !sharedConsumedReportIds.has(item.report.reportId),
      ),
    [shareId, sharedConsumedReportIds],
  );
  const activeSharedLockedItemIndex = shareId
    ? feedItems.findIndex(
        (item, index) =>
          visibleSlideIndex === getItemSlideIndex(index) &&
          shouldGateSharedItemAtIndex(item),
      )
    : -1;
  const activeSharedLockedSlideIndex =
    activeSharedLockedItemIndex >= 0
      ? getItemSlideIndex(activeSharedLockedItemIndex)
      : null;
  const isSharedEntryScrollLocked = activeSharedLockedSlideIndex !== null;
  const isSourceOverlayScrollLocked = sourceOverlayOpenSlideIndex !== null;
  const isCutFeedScrollLocked =
    isSharedEntryScrollLocked || isSourceOverlayScrollLocked;
  const shouldFreezeSharedLockedScroll = Boolean(
    isSharedEntryScrollLocked && activeSharedLockedSlideIndex === 0,
  );
  const shouldShowHeaderCount = !isSharedConsumptionEntry;
  const shouldShowServiceMenuButton =
    !isCutFeedScrollLocked &&
    !isSharedEntrySlideVisible &&
    !isSharedTransitionSlideVisible &&
    !shouldShowSharedJourneyEndSlide &&
    (!isSharedTimelineFeedSlideVisible ||
      isCutFeedHeaderVisible ||
      serviceMenuOpen);
  const visibleItem =
    feedItems[
      activeFeedIndex
    ] ?? feedItems[0];
  const sharedFocusCreatorReferralCode = shareId
    ? feedItems[0]?.report.creatorReferralCode?.trim() || null
    : null;
  const sharedTimelineAnchorReportId = shareId
    ? feedItems[0]?.report.reportId.trim() || null
    : null;
  const sharedConsumedStorageKey = getSharedConsumedStorageKey(shareId);
  const sharedViewedStorageKey = getSharedViewedStorageKey(shareId);
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
  const isPublishedViewerReportEntry = Boolean(
    isPublishedReturnEntry && isVisibleItemViewerReport,
  );
  const isReporterComposerCtaVisible = Boolean(
    viewerReporterReferralCode && !isSharedConsumptionEntry,
  );
  const isReporterQuickDeskVisible = Boolean(
    viewerReporterReferralCode &&
      (selectedRolePreference === "reporter" || isPublishedViewerReportEntry) &&
      !isSharedConsumptionEntry,
  );
  const isVloggerDeskVisible =
    selectedRolePreference === "vlogger" && !isSharedConsumptionEntry;
  const visibleCharacterVlogsHref = visibleItem?.report.creatorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/characters/${visibleItem.report.creatorReferralCode}/vlogs`,
        referralCode,
      )
    : vlogsHref;
  const sharedEntryItem = feedItems[0] ?? null;
  const sharedEntryCharacterHref = sharedEntryItem
    ? getCharacterHref({
        characterReferralCode: sharedEntryItem.report.creatorReferralCode,
        cutSlotNumber: sharedEntryItem.leadCut.slotNumber,
        locale,
        referralCode,
        reportId: sharedEntryItem.report.reportId,
        returnToHref: cutFeedHomeHref,
      })
    : returnableCharactersHref;
  const sharedEndConnectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    {
      returnTo: sharedEntryCharacterHref,
    },
  );
  const publishedReturnNextReportHref = getReportComposerHref({
    contentId: null,
    locale,
    referralCode,
    returnToHref: buildPathWithReferral(`/${locale}/fanletter/news/cuts`, referralCode),
  });
  const startNavigation = useCallback((pending: CutFeedNavigationPending) => {
    setNavigationPending(pending);
    setServiceMenuOpen(false);
  }, []);
  const handleSourceOverlayOpenChange = useCallback(
    (index: number, isOpen: boolean, activeCutSlotNumber?: number) => {
      setSourceOverlayOpenSlideIndex((currentIndex) => {
        if (isOpen) {
          return index;
        }

        return currentIndex === index ? null : currentIndex;
      });

      if (isOpen) {
        setServiceMenuOpen(false);
        setIsCutFeedHeaderVisible(false);

        if (shareId && activeCutSlotNumber) {
          setSharedCutSlotOverrides((currentOverrides) => {
            if (currentOverrides[index] === activeCutSlotNumber) {
              return currentOverrides;
            }

            return {
              ...currentOverrides,
              [index]: activeCutSlotNumber,
            };
          });
        }
      }
    },
    [shareId],
  );
  const markSharedConsumptionComplete = useCallback(
    (reportId: string) => {
      setSharedConsumedReportIds((currentReportIds) => {
        if (currentReportIds.has(reportId)) {
          return currentReportIds;
        }

        const nextReportIds = new Set(currentReportIds);

        nextReportIds.add(reportId);
        writeSharedConsumedReportIds(sharedConsumedStorageKey, nextReportIds);
        return nextReportIds;
      });
    },
    [sharedConsumedStorageKey],
  );
  const markSharedReportViewed = useCallback(
    (reportId: string) => {
      setSharedViewedReportIds((currentReportIds) => {
        if (currentReportIds.has(reportId)) {
          return currentReportIds;
        }

        const nextReportIds = new Set(currentReportIds);

        nextReportIds.add(reportId);
        writeSharedViewedReportIds(sharedViewedStorageKey, nextReportIds);
        return nextReportIds;
      });
    },
    [sharedViewedStorageKey],
  );
  const completeSharedConsumption = useCallback(
    (reportId: string, itemIndex: number) => {
      const slideIndex = getItemSlideIndex(itemIndex);

      markSharedReportViewed(reportId);
      markSharedConsumptionComplete(reportId);
      setVisibleSlideIndex(slideIndex);

      window.requestAnimationFrame(() => {
        const root = scrollContainerRef.current;

        if (!root) {
          return;
        }

        root.scrollTo({
          behavior: "smooth",
          top: root.clientHeight * slideIndex,
        });
      });
    },
    [getItemSlideIndex, markSharedConsumptionComplete, markSharedReportViewed],
  );
  const scrollToFeedItemIndex = useCallback(
    (itemIndex: number, behavior: ScrollBehavior = "smooth") => {
      const root = scrollContainerRef.current;
      const slideIndex = getItemSlideIndex(itemIndex);

      setVisibleSlideIndex(slideIndex);

      if (!root) {
        return;
      }

      root.scrollTo({
        behavior,
        top: root.clientHeight * slideIndex,
      });
    },
    [getItemSlideIndex],
  );
  const lockSharedBackwardScrollAtItemIndex = useCallback(
    (itemIndex: number) => {
      const slideIndex = getItemSlideIndex(itemIndex);

      setSharedMinimumSlideIndex((currentSlideIndex) =>
        Math.max(currentSlideIndex, slideIndex),
      );
    },
    [getItemSlideIndex],
  );
  const keepSharedMinimumSlideInPlace = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const root = scrollContainerRef.current;

      if (!shareId || !root || sharedMinimumSlideIndex <= 0) {
        return false;
      }

      const minimumScrollTop = root.clientHeight * sharedMinimumSlideIndex;

      if (root.scrollTop >= minimumScrollTop - 1) {
        return false;
      }

      root.scrollTo({
        behavior,
        top: minimumScrollTop,
      });
      setVisibleSlideIndex(sharedMinimumSlideIndex);
      return true;
    },
    [shareId, sharedMinimumSlideIndex],
  );
  const getIsSharedTransitionSelectionRequired = useCallback(
    (slideIndex: number) =>
      Boolean(
        shareId &&
          getSharedTransitionForSlideIndex(slideIndex) &&
          !sharedResolvedTransitionSlideIndexesRef.current.has(slideIndex),
      ),
    [getSharedTransitionForSlideIndex, shareId],
  );
  const handleSharedVlogReportSelect = useCallback(
    (
      option: SerializedFanletterNewsPublicCutFeedItemBase,
      transitionSlideIndex: number,
      targetItemIndex: number,
      options: SerializedFanletterNewsPublicCutFeedItemBase[],
    ) => {
      const selectedReportId = option.report.reportId;
      const existingIndex = items.findIndex(
        (item) => item.report.reportId === selectedReportId,
      );

      markSharedReportViewed(selectedReportId);
      sharedResolvedTransitionSlideIndexesRef.current.add(transitionSlideIndex);

      if (existingIndex >= 0) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            lockSharedBackwardScrollAtItemIndex(existingIndex);
            scrollToFeedItemIndex(existingIndex);
          });
        });
        return;
      }

      const selectedItem: SerializedFanletterNewsPublicCutFeedItem = {
        ...option,
        vlogReportOptions: options,
      };

      setItems((currentItems) => {
        if (
          currentItems.some(
            (item) => item.report.reportId === selectedItem.report.reportId,
          )
        ) {
          return currentItems;
        }

        if (targetItemIndex >= currentItems.length) {
          return [...currentItems, selectedItem];
        }

        return currentItems.map((item, index) =>
          index === targetItemIndex ? selectedItem : item,
        );
      });

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          lockSharedBackwardScrollAtItemIndex(targetItemIndex);
          scrollToFeedItemIndex(targetItemIndex);
        });
      });
    },
    [
      items,
      lockSharedBackwardScrollAtItemIndex,
      markSharedReportViewed,
      scrollToFeedItemIndex,
    ],
  );
  const lockedReporterCandidateCount = useMemo(
    () => getLockedReporterCandidates(items).length,
    [items],
  );
  const isRoleShortcutEnabled =
    isVloggerDeskVisible ||
    (isReporterQuickDeskVisible && lockedReporterCandidateCount > 0);
  const lockedReporterCandidates = useMemo(
    () => getLockedReporterCandidates(items),
    [items],
  );
  const nextLockedReporterCandidateIndex = useMemo(() => {
    if (lockedReporterCandidates.length <= 0) {
      return -1;
    }

    return (
      lockedReporterCandidates.find(
        (candidate) => candidate.index > activeFeedIndex,
      )?.index ?? lockedReporterCandidates[0]?.index ?? -1
    );
  }, [activeFeedIndex, lockedReporterCandidates]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsPublishedReturnEntry(
      new URLSearchParams(window.location.search).get("published") === "1",
    );
  }, []);
  useEffect(() => {
    setSharedConsumedReportIds(
      readSharedConsumedReportIds(sharedConsumedStorageKey),
    );
    setSharedViewedReportIds(readSharedViewedReportIds(sharedViewedStorageKey));

    if (shareId) {
      setVisibleSlideIndex(0);
      setSharedMinimumSlideIndex(0);
      sharedResolvedTransitionSlideIndexesRef.current = new Set();
    }
  }, [shareId, sharedConsumedStorageKey, sharedViewedStorageKey]);
  useEffect(() => {
    if (!isSharedEntryScrollLocked) {
      return;
    }

    setServiceMenuOpen(false);
    setIsCutFeedHeaderVisible(false);
  }, [isSharedEntryScrollLocked]);
  useEffect(() => {
    if (!isSharedEntryScrollLocked) {
      return;
    }

    const root = scrollContainerRef.current;
    const lockedScrollTop =
      root && activeSharedLockedSlideIndex !== null
        ? root.clientHeight * activeSharedLockedSlideIndex
        : 0;

    if (root && root.scrollTop > lockedScrollTop + 1) {
      root.scrollTop = lockedScrollTop;
    }

    if (root && activeSharedLockedSlideIndex !== null) {
      const visibleIndex = getVisibleFeedIndex({
        itemCount: virtualSlideCount,
        root,
      });

      setVisibleSlideIndex(
        visibleIndex <= activeSharedLockedSlideIndex
          ? visibleIndex
          : activeSharedLockedSlideIndex,
      );
    } else if (activeSharedLockedSlideIndex !== null) {
      setVisibleSlideIndex(activeSharedLockedSlideIndex);
    }
  }, [
    activeSharedLockedSlideIndex,
    isSharedEntryScrollLocked,
    virtualSlideCount,
  ]);
  useEffect(() => {
    if (!navigationPending) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNavigationPending(null);
    }, 9000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigationPending]);
  useEffect(() => {
    const clearNavigationPending = () => {
      setNavigationPending(null);
    };

    window.addEventListener("pageshow", clearNavigationPending);

    return () => {
      window.removeEventListener("pageshow", clearNavigationPending);
    };
  }, []);
  const firstSlideCutCount = feedItems[0]
    ? getPublicCutItemCutCount(feedItems[0])
    : 0;
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
          items: feedItems,
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
  }, [feedItems, swipeGuideTarget]);
  const clearRoleShortcutRevealTimer = useCallback(() => {
    if (roleShortcutRevealTimerRef.current) {
      window.clearTimeout(roleShortcutRevealTimerRef.current);
      roleShortcutRevealTimerRef.current = null;
    }
  }, []);
  const revealRoleShortcutTemporarily = useCallback(() => {
    clearRoleShortcutRevealTimer();

    setIsRoleShortcutVisible(true);

    roleShortcutRevealTimerRef.current = window.setTimeout(() => {
      setIsRoleShortcutVisible(false);
      roleShortcutRevealTimerRef.current = null;
    }, CUT_FEED_CHROME_VISIBLE_MS);
  }, [clearRoleShortcutRevealTimer]);
  const clearHeaderRevealTimer = useCallback(() => {
    if (headerRevealTimerRef.current) {
      window.clearTimeout(headerRevealTimerRef.current);
      headerRevealTimerRef.current = null;
    }
  }, []);
  const hideFeedChromeImmediately = useCallback(() => {
    clearHeaderRevealTimer();
    clearRoleShortcutRevealTimer();
    setIsCutFeedHeaderVisible(false);
    setIsRoleShortcutVisible(false);
  }, [clearHeaderRevealTimer, clearRoleShortcutRevealTimer]);
  const revealCutFeedHeaderTemporarily = useCallback(() => {
    if (isSharedEntryScrollLocked) {
      return;
    }

    clearHeaderRevealTimer();
    setIsCutFeedHeaderVisible(true);

    if (serviceMenuOpen) {
      return;
    }

    headerRevealTimerRef.current = window.setTimeout(() => {
      setIsCutFeedHeaderVisible(false);
      headerRevealTimerRef.current = null;
    }, CUT_FEED_CHROME_VISIBLE_MS);
  }, [clearHeaderRevealTimer, isSharedEntryScrollLocked, serviceMenuOpen]);
  const revealFeedChromeTemporarily = useCallback(() => {
    revealCutFeedHeaderTemporarily();

    if (isRoleShortcutEnabled) {
      revealRoleShortcutTemporarily();
    }
  }, [
    isRoleShortcutEnabled,
    revealCutFeedHeaderTemporarily,
    revealRoleShortcutTemporarily,
  ]);
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
  const keepSharedLockedSlideInPlace = useCallback(() => {
    const root = scrollContainerRef.current;

    if (
      !root ||
      !isSharedEntryScrollLocked ||
      activeSharedLockedSlideIndex === null
    ) {
      return false;
    }

    const lockedScrollTop = root.clientHeight * activeSharedLockedSlideIndex;

    if (root.scrollTop > lockedScrollTop + 1) {
      root.scrollTop = lockedScrollTop;
    }

    setVisibleSlideIndex(activeSharedLockedSlideIndex);
    return true;
  }, [activeSharedLockedSlideIndex, isSharedEntryScrollLocked]);
  const moveToPreviousSharedLockedSlide = useCallback(() => {
    const root = scrollContainerRef.current;

    if (
      !root ||
      !isSharedEntryScrollLocked ||
      activeSharedLockedSlideIndex === null ||
      activeSharedLockedSlideIndex <= 0
    ) {
      return false;
    }

    const previousSlideIndex = activeSharedLockedSlideIndex - 1;

    setVisibleSlideIndex((currentIndex) => {
      if (currentIndex === previousSlideIndex) {
        return currentIndex;
      }

      window.dispatchEvent(
        new CustomEvent<CutFeedVisibleIndexChangeDetail>(
          CUT_FEED_VISIBLE_INDEX_CHANGE_EVENT,
          {
            detail: {
              nextIndex: previousSlideIndex,
              previousIndex: currentIndex,
            },
          },
        ),
      );
      return previousSlideIndex;
    });

    root.scrollTo({
      behavior: "smooth",
      top: root.clientHeight * previousSlideIndex,
    });
    return true;
  }, [activeSharedLockedSlideIndex, isSharedEntryScrollLocked]);
  const handleFeedWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      const root = scrollContainerRef.current;

      if (
        root &&
        shareId &&
        sharedMinimumSlideIndex > 0 &&
        event.deltaY < -CUT_FEED_LOCKED_SCROLL_BLOCK_THRESHOLD_PX &&
        root.scrollTop <= root.clientHeight * sharedMinimumSlideIndex + 1
      ) {
        event.preventDefault();
        keepSharedMinimumSlideInPlace();
        return;
      }

	      if (
	        Math.abs(event.deltaY) > CUT_FEED_LOCKED_SCROLL_BLOCK_THRESHOLD_PX &&
	        getIsSharedTransitionSelectionRequired(visibleSlideIndex)
	      ) {
	        event.preventDefault();
	        if (root) {
	          root.scrollTo({
            behavior: "auto",
            top: root.clientHeight * visibleSlideIndex,
          });
        }
        return;
      }

      if (!isSharedEntryScrollLocked) {
        return;
      }

      const lockedScrollTop =
        root && activeSharedLockedSlideIndex !== null
          ? root.clientHeight * activeSharedLockedSlideIndex
          : null;

      if (
        root &&
        lockedScrollTop !== null &&
        root.scrollTop < lockedScrollTop - 1
      ) {
        return;
      }

      if (event.deltaY < -CUT_FEED_LOCKED_SCROLL_BLOCK_THRESHOLD_PX) {
        if (
          activeSharedLockedSlideIndex !== null &&
          activeSharedLockedSlideIndex > 0
        ) {
          return;
        }

        event.preventDefault();

        if (!moveToPreviousSharedLockedSlide()) {
          keepSharedLockedSlideInPlace();
        }
        return;
      }

      if (event.deltaY > CUT_FEED_LOCKED_SCROLL_BLOCK_THRESHOLD_PX) {
        event.preventDefault();
        keepSharedLockedSlideInPlace();
      }
    },
    [
      activeSharedLockedSlideIndex,
      getIsSharedTransitionSelectionRequired,
      isSharedEntryScrollLocked,
      keepSharedLockedSlideInPlace,
      keepSharedMinimumSlideInPlace,
      moveToPreviousSharedLockedSlide,
      shareId,
      sharedMinimumSlideIndex,
      visibleSlideIndex,
    ],
  );
  const handleFeedTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      lockedTouchStartYRef.current = event.touches[0]?.clientY ?? null;
      lockedTouchNavigationHandledRef.current = false;
    },
    [],
  );
  const handleFeedTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const currentTouchY = event.touches[0]?.clientY ?? null;
      const startTouchY = lockedTouchStartYRef.current;

      if (currentTouchY === null || startTouchY === null) {
        lockedTouchStartYRef.current = currentTouchY;
        return;
      }

      const root = scrollContainerRef.current;
      const deltaY = startTouchY - currentTouchY;

      if (Math.abs(deltaY) <= CUT_FEED_LOCKED_SCROLL_BLOCK_THRESHOLD_PX) {
        return;
      }

      if (
        root &&
        shareId &&
        sharedMinimumSlideIndex > 0 &&
        deltaY < 0 &&
        root.scrollTop <= root.clientHeight * sharedMinimumSlideIndex + 1
      ) {
        event.preventDefault();
        lockedTouchNavigationHandledRef.current = true;
        keepSharedMinimumSlideInPlace();
        return;
      }

	      if (
	        getIsSharedTransitionSelectionRequired(visibleSlideIndex)
	      ) {
	        event.preventDefault();
	        lockedTouchNavigationHandledRef.current = true;
	        if (root) {
          root.scrollTo({
            behavior: "auto",
            top: root.clientHeight * visibleSlideIndex,
          });
        }
        return;
      }

      if (!isSharedEntryScrollLocked) {
        return;
      }

      const lockedScrollTop =
        root && activeSharedLockedSlideIndex !== null
          ? root.clientHeight * activeSharedLockedSlideIndex
          : null;

      if (
        root &&
        lockedScrollTop !== null &&
        root.scrollTop < lockedScrollTop - 1
      ) {
        return;
      }

      if (deltaY < 0 && !lockedTouchNavigationHandledRef.current) {
        if (
          activeSharedLockedSlideIndex !== null &&
          activeSharedLockedSlideIndex > 0
        ) {
          return;
        }

        event.preventDefault();
        lockedTouchNavigationHandledRef.current = true;

        if (!moveToPreviousSharedLockedSlide()) {
          keepSharedLockedSlideInPlace();
        }
        return;
      }

      if (deltaY > 0) {
        event.preventDefault();
        keepSharedLockedSlideInPlace();
      }
    },
    [
      getIsSharedTransitionSelectionRequired,
      isSharedEntryScrollLocked,
      keepSharedLockedSlideInPlace,
      keepSharedMinimumSlideInPlace,
      moveToPreviousSharedLockedSlide,
      activeSharedLockedSlideIndex,
      shareId,
      sharedMinimumSlideIndex,
      visibleSlideIndex,
    ],
  );
  const handleFeedTouchEnd = useCallback(() => {
    lockedTouchStartYRef.current = null;
    lockedTouchNavigationHandledRef.current = false;
  }, []);
  const handleFeedScroll = useCallback(() => {
    const root = scrollContainerRef.current;

    if (!root) {
      return;
    }

    if (keepSharedMinimumSlideInPlace()) {
      return;
    }

	    if (isSharedEntryScrollLocked) {
      const lockedScrollTop =
        activeSharedLockedSlideIndex !== null
          ? root.clientHeight * activeSharedLockedSlideIndex
          : 0;

      if (root.scrollTop > lockedScrollTop + 1) {
        root.scrollTop = lockedScrollTop;
        setVisibleSlideIndex(activeSharedLockedSlideIndex);
        return;
      }

      const visibleIndex = getVisibleFeedIndex({
        itemCount: virtualSlideCount,
        root,
      });

      setVisibleSlideIndex((currentIndex) => {
        if (currentIndex === visibleIndex) {
          return currentIndex;
        }

        window.dispatchEvent(
          new CustomEvent<CutFeedVisibleIndexChangeDetail>(
            CUT_FEED_VISIBLE_INDEX_CHANGE_EVENT,
            {
              detail: {
                nextIndex: visibleIndex,
                previousIndex: currentIndex,
              },
            },
          ),
        );
        return visibleIndex;
      });
      return;
    }

    const visibleIndex = getVisibleFeedIndex({
      itemCount: virtualSlideCount,
      root,
    });
    if (getIsSharedTransitionSelectionRequired(visibleSlideIndex)) {
      const currentTransitionScrollTop = root.clientHeight * visibleSlideIndex;

      if (Math.abs(root.scrollTop - currentTransitionScrollTop) <= 1) {
        return;
      }

      root.scrollTo({
        behavior: "auto",
        top: currentTransitionScrollTop,
      });
      setVisibleSlideIndex(visibleSlideIndex);
      return;
    }
    const skippedSharedTransitionSlideIndex =
      getSkippedSharedTransitionSlideIndex(visibleSlideIndex, visibleIndex);

    hideFeedChromeImmediately();
    window.dispatchEvent(new Event(CUT_FEED_CHROME_HIDE_EVENT));

    if (skippedSharedTransitionSlideIndex !== null) {
      root.scrollTo({
        behavior: "smooth",
        top: root.clientHeight * skippedSharedTransitionSlideIndex,
      });
      setVisibleSlideIndex((currentIndex) => {
        if (currentIndex === skippedSharedTransitionSlideIndex) {
          return currentIndex;
        }

        window.dispatchEvent(
          new CustomEvent<CutFeedVisibleIndexChangeDetail>(
            CUT_FEED_VISIBLE_INDEX_CHANGE_EVENT,
            {
              detail: {
                nextIndex: skippedSharedTransitionSlideIndex,
                previousIndex: currentIndex,
              },
            },
          ),
        );
        return skippedSharedTransitionSlideIndex;
      });
      return;
    }

    setVisibleSlideIndex((currentIndex) => {
      if (currentIndex === visibleIndex) {
        return currentIndex;
      }

      window.dispatchEvent(
        new CustomEvent<CutFeedVisibleIndexChangeDetail>(
          CUT_FEED_VISIBLE_INDEX_CHANGE_EVENT,
          {
            detail: {
              nextIndex: visibleIndex,
              previousIndex: currentIndex,
            },
          },
        ),
      );
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
        items: feedItems,
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
    activeSharedLockedSlideIndex,
    getIsSharedTransitionSelectionRequired,
    getSkippedSharedTransitionSlideIndex,
    hideFeedChromeImmediately,
    isSharedEntryScrollLocked,
    feedItems,
    keepSharedMinimumSlideInPlace,
    sourceViewSwipeGuideDismissed,
    swipeGuideTarget,
    visibleSlideIndex,
    virtualSlideCount,
  ]);
  const loadMore = useCallback(async () => {
    if (
      isLoadingMore ||
      !hasMore ||
      (shareId && items.length >= CUT_FEED_SHARED_JOURNEY_MAX_REPORTS)
    ) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        rotationSeed: feedRotationSeed,
        limit: String(
          shareId && sharedTimelineAnchorReportId
            ? CUT_FEED_SHARED_TIMELINE_CANDIDATE_LOAD_LIMIT
            : isSharedConsumptionEntry
            ? FANLETTER_NEWS_PUBLIC_CUT_SHARED_PAGE_SIZE
            : FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE,
        ),
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

      if (sharedFocusCreatorReferralCode) {
        params.set("focusCreatorReferralCode", sharedFocusCreatorReferralCode);
      }

      if (shareId && sharedTimelineAnchorReportId) {
        params.set("timeline", "creator");
        params.set("timelineAnchorReportId", sharedTimelineAnchorReportId);
      }

      if (selectedRolePreference === "reporter") {
        params.set("mode", "reporter_locked");
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
      const currentItem =
        feedItems[
          activeFeedIndex
        ] ?? null;

      if (shareId && currentItem) {
        trackFunnelEvent("fanletter_news_cut_feed_load_more", {
          contentId: currentItem.report.contentId,
          metadata: {
            currentContentId: currentItem.report.contentId,
            currentCreatorReferralCode: currentItem.report.creatorReferralCode,
            currentReportId: currentItem.report.reportId,
            currentReporterReferralCode: currentItem.report.reporterReferralCode,
            hasMoreAfterLoad: data.hasMore,
            loadedCount: data.items.length,
            nextOffsetBeforeLoad: nextOffset,
            previousItemCount: items.length,
            source: "fanletter-news-cut-feed",
          },
          referralCode,
          shareId,
          targetHref: `${window.location.pathname}${window.location.search}`,
        });
      }

      const nextItems =
        shareId && sharedTimelineAnchorReportId
          ? rankSharedTimelineItems(data.items)
          : data.items;

      setItems((currentItems) =>
        mergePublicCutItems(currentItems, nextItems),
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
    feedRotationSeed,
    feedItems,
    hasMore,
    isSharedConsumptionEntry,
    isLoadingMore,
    items,
    locale,
    nextOffset,
    referralCode,
    selectedRolePreference,
    sharedFocusCreatorReferralCode,
    sharedTimelineAnchorReportId,
    shareId,
    activeFeedIndex,
  ]);
  useEffect(() => {
    const activeSharedTimelineItem = feedItems[activeFeedIndex] ?? null;

    if (
      !isSharedConsumptionEntry ||
      !shareId ||
      isSharedEntryScrollLocked ||
      shouldShowSharedJourneyEndSlide ||
      !hasMore ||
      isLoadingMore ||
      activeFeedIndex < feedItems.length - 1 ||
      !activeSharedTimelineItem ||
      shouldGateSharedItemAtIndex(activeSharedTimelineItem)
    ) {
      return;
    }

    void loadMore();
  }, [
    activeFeedIndex,
    feedItems,
    hasMore,
    isLoadingMore,
    isSharedConsumptionEntry,
    isSharedEntryScrollLocked,
    loadMore,
    shareId,
    shouldShowSharedJourneyEndSlide,
    shouldGateSharedItemAtIndex,
  ]);
  useEffect(() => {
    if (!shareId || typeof window === "undefined") {
      return;
    }

    const urls = getPublicCutFeedPreloadImageUrls([
      ...feedItems.slice(0, 4),
      ...sharedVlogPreloadItems,
    ])
      .filter((url) => !preloadedImageUrlsRef.current.has(url))
      .slice(0, 32);

    if (urls.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const images = urls.map((url) => {
        const image = new window.Image();

        image.decoding = "async";
        image.src = url;
        preloadedImageUrlsRef.current.add(url);
        return image;
      });

      preloadedImagesRef.current = [
        ...preloadedImagesRef.current,
        ...images,
      ].slice(-64);
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedItems, shareId, sharedVlogPreloadItems]);
  useEffect(() => {
    const normalizedFocusCreatorReferralCode =
      sharedFocusCreatorReferralCode?.toLowerCase() ?? "";

    if (!shareId || !normalizedFocusCreatorReferralCode) {
      setSharedDiscoveryItems([]);
      setIsSharedDiscoveryLoading(false);
      sharedDiscoveryLoadedForRef.current = null;
      return;
    }

    const discoveryKey = [
      locale,
      feedRotationSeed,
      normalizedFocusCreatorReferralCode,
    ].join(":");

    if (sharedDiscoveryLoadedForRef.current === discoveryKey) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    sharedDiscoveryLoadedForRef.current = discoveryKey;
    setSharedDiscoveryItems([]);
    setIsSharedDiscoveryLoading(true);

    const params = new URLSearchParams({
      limit: "12",
      locale,
      offset: "0",
      rotationSeed: `${feedRotationSeed}:shared-discovery`,
    });

    if (referralCode) {
      params.set("ref", referralCode);
    }

    const firstReportId = feedItems[0]?.report.reportId.trim();

    if (firstReportId) {
      params.set("excludeReportId", firstReportId);
    }

    fetch(`/api/fanletter/news-cuts?${params}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load shared discovery items.");
        }

        return (await response.json()) as FanletterNewsPublicCutFeedLoadResponse;
      })
      .then((data) => {
        if (!isActive) {
          return;
        }

        const seenCreatorKeys = new Set<string>();
        const nextDiscoveryItems: SerializedFanletterNewsPublicCutFeedItemBase[] =
          [];

        for (const item of data.items) {
          const creatorKey =
            item.report.creatorReferralCode?.trim().toLowerCase() ?? "";

          if (
            !creatorKey ||
            creatorKey === normalizedFocusCreatorReferralCode ||
            seenCreatorKeys.has(creatorKey)
          ) {
            continue;
          }

          seenCreatorKeys.add(creatorKey);
          nextDiscoveryItems.push(item);

          if (nextDiscoveryItems.length >= CUT_FEED_SHARED_DISCOVERY_LIMIT) {
            break;
          }
        }

        setSharedDiscoveryItems(nextDiscoveryItems);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setSharedDiscoveryItems([]);
      })
      .finally(() => {
        if (isActive) {
          setIsSharedDiscoveryLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    feedItems,
    feedRotationSeed,
    locale,
    referralCode,
    shareId,
    sharedFocusCreatorReferralCode,
  ]);
  const handleFindNextSourceRevealCandidate = useCallback(
    (currentIndex: number, currentContentId: string) => {
      const root = scrollContainerRef.current;

      if (!root) {
        return;
      }

      const nextIndex = getNextSourceRevealCandidateIndex({
        currentContentId,
        currentIndex,
        items: shareId ? feedItems : items,
      });

      if (nextIndex >= 0) {
        root.scrollTo({
          behavior: "smooth",
          top: root.clientHeight * getItemSlideIndex(nextIndex),
        });
        return;
      }

      root.scrollTo({
        behavior: "smooth",
        top: Math.max(0, root.scrollHeight - root.clientHeight),
      });

      if (hasMore) {
        void loadMore();
      }
    },
    [feedItems, getItemSlideIndex, hasMore, items, loadMore, shareId],
  );

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
    if (swipeGuideTarget || shouldShowSharedJourneyEndSlide) {
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
    const visibleSlide = root
      ? getVisibleFeedIndex({
          itemCount: virtualSlideCount,
          root,
        })
      : 0;
    const visibleIndex = getFeedIndexForSlide(visibleSlide);

    if (
      canShowSourceViewSwipeGuideAtIndex({
        index: visibleIndex,
        items: feedItems,
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
    feedItems,
    getFeedIndexForSlide,
    shouldOfferEntrySwipeGuide,
    shouldShowSharedJourneyEndSlide,
    sourceViewSwipeGuideDismissed,
    swipeGuideTarget,
    virtualSlideCount,
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
    if (serviceMenuOpen) {
      clearHeaderRevealTimer();
    }

    return () => {
      clearHeaderRevealTimer();
    };
  }, [clearHeaderRevealTimer, serviceMenuOpen]);

  useEffect(() => {
    if (!isRoleShortcutEnabled) {
      clearRoleShortcutRevealTimer();
      setIsRoleShortcutVisible(false);
      return;
    }

    return () => {
      clearRoleShortcutRevealTimer();
    };
  }, [clearRoleShortcutRevealTimer, isRoleShortcutEnabled]);

  useEffect(() => {
    if (!hasMore || isSharedEntryScrollLocked || shouldShowSharedJourneyEndSlide) {
      return;
    }

    const sentinel = loadMoreRef.current;
    const root = scrollContainerRef.current;

    if (!sentinel || !root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          loadMoreIntersectionArmedRef.current = true;
          return;
        }

        if (!loadMoreIntersectionArmedRef.current) {
          return;
        }

        loadMoreIntersectionArmedRef.current = false;
        void loadMore();
      },
      {
        root,
        rootMargin: isSharedConsumptionEntry ? "0px" : "1400px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    hasMore,
    isSharedConsumptionEntry,
    isSharedEntryScrollLocked,
    loadMore,
    shouldShowSharedJourneyEndSlide,
  ]);

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
            onClick={() => {
              startNavigation({
                href: newsroomHref,
                label: copy.navigationPending.destination(copy.emptyCta),
              });
            }}
          >
            <ArrowLeft className="size-4" />
            {copy.emptyCta}
          </Link>
        </section>
        <CutFeedNavigationPendingOverlay
          copy={copy}
          pending={navigationPending}
        />
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
  const serviceMenuButtonClassName = shouldShowHeaderCount
    ? `pointer-events-auto group inline-flex h-11 shrink-0 items-center rounded-full border text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-[background-color,border-color,color,gap,padding,transform] duration-500 ease-out hover:bg-[#44f26e] hover:text-[#111510] ${
        isCutFeedHeaderExpanded
          ? "gap-2 border-[#44f26e]/28 bg-[#44f26e]/14 px-3"
          : "gap-1.5 border-white/16 bg-black/42 px-3"
      }`
    : `pointer-events-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full border text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-[background-color,border-color,color,transform] duration-500 ease-out hover:bg-[#44f26e] hover:text-[#111510] ${
        isCutFeedHeaderExpanded
          ? "border-[#44f26e]/28 bg-[#44f26e]/14"
          : "border-white/16 bg-black/42"
      }`;
  const returnToButtonClassName = `pointer-events-auto inline-flex h-11 shrink-0 items-center rounded-full border text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-[background-color,border-color,color,gap,padding,transform] duration-500 ease-out hover:bg-white hover:text-[#111510] ${
    isCutFeedHeaderExpanded
      ? "gap-2 border-white/18 bg-white/12 px-3"
      : "gap-1.5 border-white/16 bg-black/42 px-3"
  }`;
  const roleShortcutSectionClassName = `pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+4.25rem)] z-30 w-full max-w-[430px] -translate-x-1/2 px-3 transition-[opacity,transform,visibility] duration-500 ease-out ${
    isRoleShortcutVisible
      ? "visible translate-y-0 opacity-100"
      : "invisible -translate-y-3 opacity-0"
  }`;
  const roleShortcutSurfaceClassName = `${
    isRoleShortcutVisible ? "pointer-events-auto" : "pointer-events-none"
  } rounded-full border border-[#44f26e]/22 bg-black/66 px-2.5 py-2 text-white shadow-[0_16px_42px_rgba(0,0,0,0.3)] backdrop-blur-xl`;
  const activeSlideIndex = Math.min(
    Math.max(visibleSlideIndex, 0),
    Math.max(virtualSlideCount - 1, 0),
  );
  const renderWindowStart = Math.max(
    0,
    activeSlideIndex - CUT_FEED_RENDER_WINDOW_RADIUS,
  );
  const renderWindowEnd = Math.min(
    Math.max(virtualSlideCount - 1, 0),
    activeSlideIndex + CUT_FEED_RENDER_WINDOW_RADIUS,
  );
  const scrollContainerClassName = `mx-auto h-full w-full max-w-[430px] snap-y snap-mandatory overscroll-contain bg-black shadow-[0_0_56px_rgba(0,0,0,0.38)] sm:border-x sm:border-white/10 ${
    isCutFeedScrollLocked ? "scroll-auto" : "scroll-smooth"
  } ${
    isSourceOverlayScrollLocked ||
    shouldFreezeSharedLockedScroll ||
    isSharedTransitionSelectionPending
      ? "overflow-y-hidden"
      : "overflow-y-auto"
  }`;

  return (
    <main
      className="h-[var(--fanletter-cut-feed-vh,100dvh)] overflow-hidden bg-[#050706] text-white"
      style={viewportStyle}
    >
      <header className={headerClassName}>
        <div className="mx-auto flex items-center gap-2">
          {returnToHref ? (
            <Link
              aria-label={copy.returnToBriefA11y}
              className={returnToButtonClassName}
              href={returnToHref}
              onClick={() => {
                startNavigation({
                  href: returnToHref,
                  label: copy.navigationPending.destination(copy.returnToBriefFull),
                });
              }}
            >
              <ArrowLeft className="size-4" />
              <span
                className={`hidden text-[0.72rem] font-black transition-opacity duration-300 min-[430px]:inline ${
                  isCutFeedHeaderExpanded ? "opacity-100" : "opacity-0"
                }`}
              >
                {copy.returnToBrief}
              </span>
            </Link>
          ) : visibleItem ? (
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
                    index: activeFeedIndex,
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
          {shouldShowServiceMenuButton ? (
            <button
              aria-expanded={serviceMenuOpen}
              aria-label={copy.serviceMenu}
              className={serviceMenuButtonClassName}
              onClick={() => setServiceMenuOpen(true)}
              type="button"
            >
              <Menu className="size-4" />
              {shouldShowHeaderCount ? (
                <span
                  className={`hidden text-[0.72rem] font-black transition-opacity duration-300 min-[430px]:inline ${
                    isCutFeedHeaderExpanded ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {copy.serviceMenu}
                </span>
              ) : null}
              {shouldShowHeaderCount ? (
                <span className="rounded-full bg-white/12 px-2 py-1 text-xs font-black leading-none text-white transition group-hover:text-[#111510]">
                  {headerCountLabel}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </header>
      {shouldShowServiceMenuButton && serviceMenuOpen ? (
        <CutFeedServiceMenuSheet
          copy={copy}
          groups={serviceMenuGroups}
          onClose={() => {
            setServiceMenuOpen(false);
            setIsCutFeedHeaderVisible(false);
          }}
          onNavigate={startNavigation}
        />
      ) : null}
      {isReporterQuickDeskVisible && lockedReporterCandidateCount > 0 ? (
        <section className={roleShortcutSectionClassName}>
          <div className={roleShortcutSurfaceClassName}>
            <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
                  <PenLine className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black leading-tight">
                    {copy.reporterQuickDesk.title}
                  </p>
                  <p className="mt-0.5 truncate text-[0.68rem] font-bold leading-tight text-white/62">
                    {copy.reporterQuickDesk.compactSummary(
                      formatNumber(lockedReporterCandidateCount, locale),
                    )}
                  </p>
                </div>
              </div>
              {isPublishedViewerReportEntry ? (
                <Link
                  aria-label={copy.reporterQuickDesk.nextCta}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-white px-4 text-xs font-black !text-[#111510] transition hover:bg-[#44f26e]"
                  href={publishedReturnNextReportHref}
                  onClick={() => {
                    startNavigation({
                      href: publishedReturnNextReportHref,
                      label: copy.navigationPending.report,
                    });
                  }}
                >
                  {copy.reporterQuickDesk.nextCta}
                </Link>
              ) : (
                <button
                  aria-label={copy.reporterQuickDesk.jumpCta}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-white px-4 text-xs font-black text-[#111510] transition hover:bg-[#44f26e]"
                  onClick={() => {
                    const root = scrollContainerRef.current;

                    if (!root || nextLockedReporterCandidateIndex < 0) {
                      return;
                    }

                    root.scrollTo({
                      behavior: "smooth",
                      top:
                        root.clientHeight *
                        getItemSlideIndex(nextLockedReporterCandidateIndex),
                    });
                  }}
                  type="button"
                >
                  {copy.reporterQuickDesk.jumpShortCta}
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}
      {isVloggerDeskVisible ? (
        <section className={roleShortcutSectionClassName}>
          <div className={roleShortcutSurfaceClassName}>
            <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
                  <Video className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black leading-tight">
                    {copy.vloggerDesk.title}
                  </p>
                  <p className="mt-0.5 truncate text-[0.68rem] font-bold leading-tight text-white/62">
                    {copy.vloggerDesk.compactSummary}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  aria-label={copy.vloggerDesk.newCta}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#44f26e] px-3 text-xs font-black !text-[#111510] transition hover:bg-[#65ff86]"
                  href={vlogsNewHref}
                  onClick={() => {
                    startNavigation({
                      href: vlogsNewHref,
                      label: copy.navigationPending.destination(
                        copy.vloggerDesk.newCta,
                      ),
                    });
                  }}
                >
                  {copy.vloggerDesk.newShortCta}
                </Link>
                <Link
                  aria-label={copy.vloggerDesk.manageCta}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-white px-3 text-xs font-black !text-[#111510] transition hover:bg-[#44f26e]"
                  href={vlogsManageHref}
                  onClick={() => {
                    startNavigation({
                      href: vlogsManageHref,
                      label: copy.navigationPending.destination(
                        copy.vloggerDesk.manageCta,
                      ),
                    });
                  }}
                >
                  {copy.vloggerDesk.manageShortCta}
                </Link>
                <Link
                  aria-label={copy.vloggerDesk.characterCta}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/14 bg-white/10 px-3 text-xs font-black !text-white transition hover:border-[#44f26e]/50 hover:!text-[#44f26e]"
                  href={visibleCharacterVlogsHref}
                  onClick={() => {
                    startNavigation({
                      href: visibleCharacterVlogsHref,
                      label: copy.navigationPending.destination(
                        copy.vloggerDesk.characterCta,
                      ),
                    });
                  }}
                >
                  {copy.vloggerDesk.characterShortCta}
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <div
        className={scrollContainerClassName}
        data-cut-feed-scroll-container
        onTouchCancel={handleFeedTouchEnd}
        onTouchEnd={handleFeedTouchEnd}
        onTouchMove={handleFeedTouchMove}
        onTouchStart={handleFeedTouchStart}
        onWheel={handleFeedWheel}
        onScroll={handleFeedScroll}
        ref={scrollContainerRef}
      >
        {feedItems.map((item, index) => {
          const itemSlideIndex = getItemSlideIndex(index);
          const isSharedConsumptionGateActive = shouldGateSharedItemAtIndex(
            item,
          );
          const sharedCutSlotOverride = sharedCutSlotOverrides[index] ?? null;
          const isRenderedSlide =
            itemSlideIndex >= renderWindowStart &&
            itemSlideIndex <= renderWindowEnd;

          const feedSlide = !isRenderedSlide ? (
              <div
                aria-hidden="true"
                className="min-h-[var(--fanletter-cut-feed-vh,100dvh)] snap-start snap-always bg-black"
                data-cut-feed-placeholder={itemSlideIndex}
              />
          ) : (
            <FeedSlide
              dictionary={dictionary}
              hasMore={hasMore}
              index={index}
              initialCutSlotNumber={
                sharedCutSlotOverride ??
                (index === 0
                  ? initialCutSlotNumber
                  : shareId
                    ? item.cuts[0]?.slotNumber ?? item.leadCut.slotNumber
                    : getStableRandomInitialCutSlotNumber({
                        feedRotationSeed,
                        index,
                        item,
                        referralCode,
                        shareId,
                      }))
              }
              initialSourceContentId={index === 0 ? sourceContentId : null}
              isActive={itemSlideIndex === activeSlideIndex}
              isSharedConsumptionGateActive={isSharedConsumptionGateActive}
              isReporterComposerCtaVisible={isReporterComposerCtaVisible}
              item={item}
              itemCount={feedItems.length}
              locale={locale}
              onDismissSwipeGuide={dismissSwipeGuide}
              onFindNextSourceRevealCandidate={
                handleFindNextSourceRevealCandidate
              }
              onHideFeedChrome={hideFeedChromeImmediately}
              onNavigationStart={startNavigation}
              onRevealFeedChrome={revealFeedChromeTemporarily}
              onSharedEntryConsumptionComplete={
                isSharedConsumptionGateActive
                  ? () =>
                      completeSharedConsumption(item.report.reportId, index)
                  : undefined
              }
              onSourceOverlayOpenChange={handleSourceOverlayOpenChange}
              onSourceViewSlideVisible={handleSourceViewSlideVisible}
              reporterPanelRequestId={
                reporterPanelRequest?.index === index
                  ? reporterPanelRequest.id
                  : 0
              }
              referralCode={referralCode}
              returnToHref={returnToHref}
              shareId={shareId}
              showSwipeGuide={swipeGuideTarget?.index === index}
              viewerEmail={viewerEmail}
            />
          );

          const sharedTransitionAfterItem =
            sharedVlogTransitions.find(
              (transition) => transition.afterItemIndex === index,
            ) ?? null;

          if (sharedTransitionAfterItem) {
            const sharedTransitionEntryCutSlotNumber =
              sharedTransitionAfterItem.afterItemIndex === 0
                ? initialCutSlotNumber
                : sharedCutSlotOverrides[index] ?? item.leadCut.slotNumber;
            const sharedTransitionSlideIndex = getSharedTransitionSlideIndex(
              sharedTransitionAfterItem,
            );

            return (
              <Fragment key={`${item.report.reportId}:shared-vlog-transition`}>
                {feedSlide}
                <SharedCharacterVlogPickerSlide
                  compactPickerOnly={false}
                  completedReportIds={sharedConsumedReportIds}
                  completedItem={item}
                  defaultItem={sharedTransitionAfterItem.targetItem}
                  entryCutSlotNumber={sharedTransitionEntryCutSlotNumber}
                  locale={locale}
                  onSelect={(option) =>
                    handleSharedVlogReportSelect(
                      option,
                      sharedTransitionSlideIndex,
                      sharedTransitionAfterItem.targetItemIndex,
                      sharedTransitionAfterItem.options,
                    )
                  }
                  options={sharedTransitionAfterItem.options}
                  sharedCutRecap={null}
                  showCutRecap={false}
                  viewedReportIds={sharedViewedReportIds}
                />
              </Fragment>
            );
          }

          return <Fragment key={item.report.reportId}>{feedSlide}</Fragment>;
        })}
        {shouldShowSharedJourneyEndSlide ? (
          <>
            <SharedCutDwellRecapSlide
              completedItems={feedItems}
              entryCutSlotNumber={initialCutSlotNumber}
              locale={locale}
              sharedCutRecap={sharedCutRecap}
            />
            <SharedJourneyEndSlide
              characterHref={sharedEntryCharacterHref}
              connectHref={sharedEndConnectHref}
              discoveryItems={sharedDiscoveryItems}
              isDiscoveryLoading={isSharedDiscoveryLoading}
              journeyItems={feedItems}
              locale={locale}
              onNavigationStart={startNavigation}
              referralCode={referralCode}
              returnToHref={cutFeedHomeHref}
              shareId={shareId}
            />
          </>
        ) : (
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
        )}
      </div>
      <CutFeedNavigationPendingOverlay
        copy={copy}
        pending={navigationPending}
      />
    </main>
  );
}
