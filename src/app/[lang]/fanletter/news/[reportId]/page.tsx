import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  Coins,
  FileText,
  HeartHandshake,
  LockKeyhole,
  Newspaper,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import { FanletterFollowButton } from "@/components/fanletter-follow-button";
import { FanletterNewsExposureTracker } from "@/components/fanletter-news-exposure-tracker";
import { FanletterNewsLockedPreviewHero } from "@/components/fanletter-news-locked-preview-hero";
import { FanletterNewsRelatedList } from "@/components/fanletter-news-related-list";
import { FanletterNewsMobileActionDock } from "@/components/fanletter-news-mobile-action-dock";
import { FanletterNewsSourceSceneGallery } from "@/components/fanletter-news-source-scene-gallery";
import { FanletterNewsSourceRevealStatusCard } from "@/components/fanletter-news-source-reveal-status-card";
import { FanletterNewsSourceRevealVote } from "@/components/fanletter-news-source-reveal-vote";
import { FanletterNewsWalletConnect } from "@/components/fanletter-news-wallet-connect";
import { FanletterNewsWalletSidebarCard } from "@/components/fanletter-news-wallet-sidebar-card";
import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import { FanletterChannelShareButton } from "@/components/fanletter-channel-share-button";
import {
  FanletterPaidUnlockPanel,
  FanletterPaidUnlockTrigger,
} from "@/components/fanletter-paid-unlock-panel";
import { FanletterResponsiveMediaFrame } from "@/components/fanletter-responsive-media-frame";
import {
  CONTENT_PAID_USDT_AMOUNT,
  FANLETTER_NEWS_REPORT_DEFAULT_SLOT_LIMIT,
  type FanletterNewsReportDocument,
} from "@/lib/content";
import {
  getFanletterPublicContentDetail,
  type FanletterPublicContentDetail,
  type FanletterPublicContentItem,
} from "@/lib/fanletter-content-service";
import {
  countRelatedFanletterNewsReports,
  createFanletterNewsReportShareHref,
  getFanletterNewsReportById,
  getFanletterNewsReportsForContent,
  getFanletterNewsReporterMemberByEmail,
  getFanletterNewsReporterProfile,
  getLatestFanletterNewsReports,
  getRelatedFanletterNewsReports,
  type FanletterNewsReporterProfile,
} from "@/lib/fanletter-news-report-service";
import { getFanletterNewsReporterIncentiveStats } from "@/lib/fanletter-news-reporter-incentives";
import {
  getFanletterNewsCharacterStats,
  hydrateFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import {
  getFanletterNewsReporterTrustProfile,
  type FanletterNewsReporterTrustLevel,
  type FanletterNewsReporterTrustProfile,
} from "@/lib/fanletter-news-reporter-trust";
import {
  createFanletterNewsSourceRevealState,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  DEFAULT_FANLETTER_RELATED_NEWS_SORT,
  FANLETTER_RELATED_NEWS_SORTS,
  getFanletterNewsArticleDisplayTitle as getArticleDisplayTitle,
  getFanletterNewsFirstReportBadgeLabel,
  getFanletterNewsReportPreviewImageUrl,
  getFanletterNewsReporterDisplayName as getReporterDisplayName,
  getFanletterNewsSourceDisplayTitle,
  isFanletterNewsLowSignalSourceTitle,
  isFanletterNewsFirstReportForContent,
  isFanletterNewsReportNsfw as isNsfwReport,
  readFanletterRelatedNewsSort,
  serializeFanletterRelatedNewsItem,
  type FanletterRelatedNewsSort,
  shouldBlurFanletterNewsReport as shouldBlurReport,
} from "@/lib/fanletter-news-related";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import {
  defaultLocale,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeReferralCode } from "@/lib/member";
import { buildWalletUnlockHref } from "@/lib/wallet-unlock";

type FanletterNewsReportSearchParams = {
  ref?: string | string[];
  relatedOffset?: string | string[];
  relatedLimit?: string | string[];
  relatedSort?: string | string[];
};

type SourceVlogRevealGateState = FanletterNewsSourceRevealState & {
  connectHref: string;
  reportId: string;
};

type SourceVlogReportSlotItem = {
  avatarImageUrl: string | null;
  href: string;
  isViewerReport: boolean;
  reporterName: string;
  reporterReferralCode: string;
  reportId: string;
};

type SourceVlogReportSlotState = {
  browseHref: string;
  connectHref: string;
  count: number;
  isViewerReporter: boolean;
  limit: number;
  reports: SourceVlogReportSlotItem[];
  viewerReportHref: string | null;
  writeHref: string;
};

type SourceVlogRevealTeaserCopy = {
  eyebrow: string;
  meta: string;
  title: string;
};

type SourceVlogAccessKind = "free" | "paid";

type NewsHeaderNavLink = {
  emphasized?: boolean;
  href: string;
  icon: ReactNode;
  label: string;
};

type SourceVlogSceneFrame = {
  imageUrl: string;
  timestampSec: number | null;
};

type ViewerOwnershipSignal = {
  key: "character" | "reporter" | "video";
  label: string;
  owned: boolean;
};

const RELATED_NEWS_PAGE_SIZE = 4;
const RELATED_NEWS_LIMIT_PARAM = "relatedLimit";
const RELATED_NEWS_OFFSET_PARAM = "relatedOffset";
const RELATED_NEWS_SORT_PARAM = "relatedSort";

function readRelatedNewsVisibleCount() {
  return RELATED_NEWS_PAGE_SIZE;
}

function readRelatedNewsOffset(
  value: string | string[] | undefined,
  pageSize: number,
) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : 0;

  if (!Number.isFinite(parsed) || parsed < 1 || pageSize < 1) {
    return 0;
  }

  return Math.floor(parsed / pageSize) * pageSize;
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        articleActions: {
          character: "캐릭터 채널",
          label: "뉴스 이동",
          newsHome: "뉴스 홈",
          sourceVlog: "원본 브이로그",
          wallet: "지갑",
        },
        aiReport: "AI 팬 리포트",
        articleEyebrow: "AI Character News",
        articleNotice:
          "이 리포트는 원본 브이로그의 공개 정보와 팬 기자의 관전 포인트를 바탕으로 작성된 AIAVpark AI 팬 리포트입니다. 언론사 보도가 아닌 팬 참여형 콘텐츠입니다.",
        articleSection: "연예",
        mobileActionDock: {
          eyebrow: "원본 공개",
          joined: "참여 완료",
          pay: (amount: string) => `${amount} 원본 보기`,
          read: "기사 요약",
          vote: "보고싶어요",
          voteWithRemaining: (remaining: string) =>
            `보고싶어요 · ${remaining}명 남음`,
          wallet: "가입하고 보고싶어요",
          watch: "원본 보기",
        },
        newsHeader: {
          character: "캐릭터",
          channel: "채널",
          characterNews: "캐릭터 뉴스",
          characterPrefix: "캐릭터",
          home: "뉴스 홈",
          intent: "팬 리포트",
          menuLabel: "뉴스 주요 이동",
          purchases: "구매함",
          reporterPrefix: "팬 기자",
          source: "원본 보기",
          sourceContext: "원본 브이로그 참여형 뉴스",
          summary: "요약",
          wantToWatch: "보고싶어요",
        },
        byline: "팬 기자",
        viewerOwnership: {
          character: "AI 캐릭터",
          reporter: "리포터",
          title: "내 권한 확인",
          verified: "소유 확인",
          video: "동영상",
        },
        titleCharacter: {
          cta: "캐릭터 보기",
          eyebrow: "AI 캐릭터",
          fallback: "AI 캐릭터",
          visualAlt: (name: string) => `${name} AI 캐릭터 썸네일`,
        },
        characterIdentity: {
          channelCta: "캐릭터 채널 보기",
          galleryLabel: "아바타 무드",
          latestLabel: "최근 브이로그",
          profileLabel: "캐릭터 프로필",
          title: "AI 캐릭터 아이덴티티",
          traitLabel: "고정 특징",
        },
        characterStats: {
          level: "성장 단계",
          reactions: "팬 반응",
          vlogs: "브이로그",
        },
        continueReading: {
          body:
            "먼저 같은 AI 캐릭터의 다른 뉴스로 이어보고, 캐릭터 페르소나와 다른 캐릭터 뉴스까지 확장해 보세요.",
          characterCta: "캐릭터 뉴스 홈",
          eyebrow: "같은 캐릭터 뉴스",
          leadCta: (name: string | null) =>
            name ? `${name} 관련 뉴스 보기` : "관련 뉴스 보기",
          listEyebrow: "같은 AI 캐릭터",
          listTitle: "최초 우선 관련 뉴스",
          personaBody: (name: string) =>
            `${name}의 얼굴과 페르소나를 캐릭터 채널에서 확인하세요.`,
          personaCta: "캐릭터 페르소나 보기",
          personaEyebrow: "다음 호기심",
          title: "같은 캐릭터의 다른 뉴스",
        },
        contentBadge: {
          nsfw: "성인 팬 전용 표시",
          paid: "팬 전용 유료 브이로그",
          public: "공개 브이로그",
        },
        coverPicker: {
          autoSource: "자동 추천",
          body:
            "원본 브이로그에서 저장된 커버 후보 중 이 리포트에 사용할 대표 이미지를 선택합니다.",
          chooseLabel: "이 이미지 사용",
          currentLabel: "현재 사용 중",
          noAlternatives:
            "저장된 후보가 1개라 변경 가능한 다른 커버가 아직 없습니다.",
          sourceLabels: {
            ai: "AI 생성",
            auto: "자동 추천",
            content_image: "본문 이미지",
            frame: "영상 프레임",
            manual: "직접 업로드",
            primary: "원본 대표",
            reporter_cropped: "와이드 크롭",
          },
          title: "리포트 커버 이미지",
        },
        edition: "AI 캐릭터와 팬 참여를 다루는 AIAVpark 온라인 뉴스",
        embeddedLocked:
          "잠금 콘텐츠는 공개 티저와 뉴스로 공개 가능한 정보만 이 화면에 표시됩니다.",
        embeddedLockedPaid: (amount: string) =>
          `전체 원본 브이로그는 팬 전용 유료 콘텐츠입니다. ${amount} 결제 후 이 뉴스 화면에서 바로 열립니다.`,
        embeddedPreviewBadge: "잠금 프리뷰",
        embeddedPreviewMeta: "가입 전 맛보기 재생",
        embeddedPlayFullVideoCta: "전체 원본 재생",
        embeddedReportSlot: {
          body: (remaining: string) =>
            `내 리포트로 들어온 팬의 보고싶어요가 원본 공개 참여와 리포터 인센티브 기회로 이어집니다. ${remaining}자리 남음.`,
          browseCta: "다른 리포트 기회 찾기",
          connectCta: "팬 리포터로 활동하기",
          countLabel: (count: string, limit: string) =>
            `${count}/${limit}개 발행`,
          emptyBody:
            "아직 이 브이로그를 선점한 팬 기자가 없습니다. 먼저 발행하면 내 리포트 유입이 원본 공개 참여로 연결됩니다.",
          eyebrow: "팬 리포트 경쟁",
          firstOpportunity: "첫 리포터 기회",
          full: "리포터 슬롯 마감",
          fullBody:
            "이 원본 브이로그의 리포트 슬롯이 모두 채워졌습니다. 다른 브이로그에서 새 리포트 기회를 찾아보세요.",
          growthLoopLabel: "리포터 인센티브 루프",
          growthLoopSteps: ["내 리포트 유입", "보고싶어요", "인센티브"],
          leadReporter: "대표 리포터",
          publishedBadge: "발행",
          readerBody:
            "팬 기자들이 만든 리포트 현황입니다. 원본 공개 참여는 위의 보고싶어요에서 바로 진행할 수 있습니다.",
          readerDetailsSummary: "리포터 경쟁 정보 보기",
          remainingShort: (remaining: string) => `${remaining}자리 남음`,
          reporterLabel: "발행 리포터",
          reporterDetailsSummary: "리포터용 인센티브 정보",
          revealMomentum: {
            closingBody: (remaining: string) =>
              `원본 공개가 가까워질수록 리포트 유입 경쟁도 더 선명해집니다. 내 리포트 링크로 팬을 모아 ${remaining}명의 참여를 완성하면 인센티브 신호가 강해집니다.`,
            closingLabel: "공개 임박",
            earlyBody: (remaining: string) =>
              `참여율이 낮을수록 리포터 선점 가치가 큽니다. 지금 리포트를 작성하고 카톡·SNS로 배포해 ${remaining}명의 참여를 먼저 모으세요.`,
            earlyLabel: "초기 선점",
            label: "원본 공개 연동",
            remainingPeople: (remaining: string) => `${remaining}명`,
            risingBody: (remaining: string) =>
              `팬들이 내 리포트에서 보고싶어요를 누르면 원본 공개와 리포터 인센티브 기회가 같이 커집니다. 공개까지 ${remaining}명 남았습니다.`,
            risingLabel: "확산 가속",
            statParticipation: "원본 공개 참여",
            statRemaining: "공개까지",
            statReportSlots: "리포트 잔여",
            title: (count: string, threshold: string) =>
              `${count}/${threshold}명 원본 공개 참여 중`,
            unlockedBody:
              "원본 공개를 만든 팬 유입은 리포터의 검증 신호로 남습니다. 다음 브이로그도 빠르게 선점해 리포트 유입을 만드세요.",
            unlockedLabel: "공개 완료",
            unlockedTitle: "원본 공개 완료",
          },
          rising: "인기 브이로그 경쟁 중",
          title: (count: string, limit: string) =>
            `${count}/${limit}개 리포트 발행 중`,
          viewerReportNotice: "나도 이 브이로그로 리포트를 발행했습니다",
          writeCta: "이 브이로그 리포트 작성",
          early: "초기 선점 구간",
        },
        embeddedTitle: "뉴스 속 원본 브이로그",
        embeddedUnlockBody:
          "결제 후 전체 원본 영상, 본문, 추가 미디어를 이 뉴스 화면에서 바로 이어봅니다.",
        embeddedUnlockCta: "결제하고 원본 보기",
        embeddedUnlockMeta: "전체 영상 · 본문 · 추가 미디어",
        embeddedUnlockTitle: "팬 전용 브이로그 잠금 해제",
        embeddedVlogStatus: {
          accessible: "열람 가능",
          free: "공개",
          general: "일반",
          nsfw: "NSFW",
          ownerAccess: "작성자 열람",
          paid: (amount: string) => `${amount} 유료`,
          paidLockedBody:
            "팬 전용 유료 원본입니다. 결제 전에는 티저와 뉴스로 공개 가능한 정보만 표시됩니다.",
          paidOwnerBody:
            "작성자 권한으로 열람 가능한 팬 전용 원본입니다. 뉴스 화면에서 원본 상태를 함께 표시합니다.",
          paidPurchasedBody:
            "로그인한 회원이 결제한 팬 전용 원본이라 이 뉴스 화면에서 바로 볼 수 있습니다.",
          publicBody: "이 뉴스 화면에서 바로 재생할 수 있습니다.",
          purchased: "결제 완료",
          title: "열람 안내",
          unpaid: "결제 필요",
        },
        sourceTeaserGallery: {
          body:
            "원본 브이로그에서 저장한 장면 프레임만 모아, 실제 영상 흐름을 빠르게 훑어볼 수 있습니다.",
          close: "장면 보기 닫기",
          eyebrow: "원본 장면 컷",
          itemLabel: (index: string) => `컷 ${index}`,
          next: "다음 장면",
          openViewer: "전체 화면으로 보기",
          pinProtectedBody:
            "NSFW 원본의 장면 컷도 로그인한 회원의 지갑 PIN 확인 후 선명하게 볼 수 있습니다.",
          pinProtectedTitle: "장면 컷 PIN 보호",
          previous: "이전 장면",
          title: "원본 브이로그 장면 컷",
        },
        reportTeaserGallery: {
          body:
            "팬 기자가 직접 크롭해 편집한 티저 컷을 기사 안에서 보여줍니다.",
          editBody:
            "이 뉴스는 로그인한 리포터 계정이 작성했습니다. 일반 사용자 화면에서 바로 티저 컷을 다시 편집할 수 있습니다.",
          editCta: "리포터 티저 컷 편집",
          editEyebrow: "내가 작성한 뉴스",
          eyebrow: "리포터 티저 컷",
          fallbackBody:
            "팬 기자가 따로 고른 공개 장면이 없을 때는 뉴스 대표 이미지를 먼저 보여줍니다.",
          fallbackTitle: "뉴스 대표 이미지",
          itemLabel: (index: string) => `편집 컷 ${index}`,
          leadBody:
            "뉴스 대표 이미지와 팬 기자가 고른 티저 컷을 바로 비교할 수 있습니다.",
          selectedBody:
            "편집 컷이 없을 때는 팬 기자가 선택한 공개 프레임을 기사 안에서 먼저 보여줍니다.",
          selectedItemLabel: (index: string) => `공개 장면 ${index}`,
          selectedTitle: "팬 기자가 선택한 공개 장면",
          title: "팬 기자가 편집한 티저 컷",
        },
        generated: "AI 생성",
        publishedLabel: "작성일",
        navItems: ["AI 캐릭터", "팬 리포트", "원본 브이로그", "구매함"],
        nsfwBlurNotice:
          "NSFW 보기 동의 전에는 원본 브이로그와 뉴스 본문 일부가 블러 처리됩니다.",
        nsfwControl: {
          disabledBody:
            "이 뉴스와 관련 NSFW 뉴스는 유지하되 원본 브이로그, 커버, 뉴스 본문을 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 뉴스 블러 처리",
          enabledBody:
            "NSFW 뉴스가 선명하게 표시됩니다. 끄면 이 뉴스와 관련 NSFW 뉴스가 다시 블러 처리됩니다.",
          enabledTitle: "NSFW 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        relatedNews: "캐릭터 이어보기",
        relatedNewsClearSearch: "검색 지우기",
        relatedNewsControlsSummary: "검색·정렬",
        relatedNewsCurrent: "현재 읽는 뉴스",
        relatedNewsDescription:
          "같은 캐릭터의 뉴스를 빠르게 이어 읽을 수 있습니다.",
        relatedNewsEyebrow: "캐릭터 이어보기",
        relatedNewsEmpty: "아직 이 캐릭터의 다른 뉴스가 없습니다.",
        relatedNewsError: "다른 뉴스를 불러오지 못했습니다. 다시 시도해 주세요.",
        relatedNewsLoading: "불러오는 중",
        relatedNewsNext: "다음 뉴스",
        relatedNewsPage: "페이지",
        relatedNewsPrevious: "이전",
        relatedNewsSearchEmptyPrefix: "\"",
        relatedNewsSearchEmptySuffix: "\"와 일치하는 캐릭터 뉴스가 없습니다.",
        relatedNewsSearchLabel: "캐릭터 뉴스 검색",
        relatedNewsSearchPlaceholder: "제목·요약·팬 기자 검색",
        relatedNewsSortLabel: "캐릭터 뉴스 보기 방식",
        relatedNewsSortOptions: {
          first: "최초 우선",
          latest: "최신순",
          recommended: "추천순",
          unlock: "오픈 진행순",
        },
        otherCharacterNews: {
          characterCount: (count: string) => `${count}명`,
          eyebrow: "다른 캐릭터",
          fanOnly: "팬전용",
          news: "뉴스",
          newsCount: (count: string) => `뉴스 ${count}개`,
          public: "공개",
          publicVideo: "공개 원본",
          sourceOpen: "오픈 완료",
          teaserCuts: "티저 컷",
          title: "다른 캐릭터 뉴스",
        },
        reporterNewsCta: "팬 기자 뉴스",
        reporterTrust: {
          basis: "작성·반응·언락·유료 구매 기여 기준",
          label: "활동 신뢰도",
          max: "최고 등급",
          next: (level: string, points: string) =>
            `${level}까지 ${points}점`,
          score: (score: string) => `${score}점`,
          summaryCta: "팬 기자 성과 보기",
          stats: {
            paidPurchases: "구매",
            reports: "리포트",
            unlocks: "언락",
            votes: "보고싶어요",
          },
          levels: {
            active: "활동 팬 기자",
            leading: "대표 팬 기자",
            starter: "신규 팬 기자",
            trusted: "신뢰 팬 기자",
          },
        },
        reporterPartner: {
          attributedRevenue: "기여 매출",
          body:
            "독자가 이 리포트에서 보고싶어요, 언락, 유료 구매를 하면 팬 기자 성과로 기록되어 캐릭터 성장과 수익 공유 기준이 누적됩니다.",
          eyebrow: "Fan Reporter Partner",
          paidPurchases: "구매 기여",
          rewardPoints: "보상 포인트",
          title: "팬 기자가 AI 캐릭터의 팬 파트너가 됩니다",
        },
        sourceTitle: "원본 브이로그",
        summaryTitle: "뉴스 요약",
        visualLead: "대표 뉴스 이미지",
        walletConnect: {
          body:
            "팬 기자 활동이나 팬 전용 결제가 필요할 때만 이어갑니다.",
          eyebrow: "AIAVpark Wallet",
          title: "필요할 때 뉴스 지갑 연결",
        },
        sixW: {
          how: "어떻게",
          what: "무엇을",
          when: "언제",
          where: "어디서",
          who: "누가",
          why: "왜",
        },
        siteName: "AIAVpark News",
      }
    : {
        articleActions: {
          character: "Character channel",
          label: "News navigation",
          newsHome: "News home",
          sourceVlog: "Source vlog",
          wallet: "Wallet",
        },
        aiReport: "AI fan report",
        articleEyebrow: "AI Character News",
        articleNotice:
          "This report is an AIAVpark AI fan report based on public source-vlog context and the fan reporter's angle. It is fan-participation content, not newsroom coverage.",
        articleSection: "Entertainment",
        mobileActionDock: {
          eyebrow: "Source access",
          joined: "Joined",
          pay: (amount: string) => `Watch for ${amount}`,
          read: "Story summary",
          vote: "Want to watch",
          voteWithRemaining: (remaining: string) =>
            `Want it · ${remaining} left`,
          wallet: "Join and want-to-watch",
          watch: "Watch source",
        },
        newsHeader: {
          character: "Character",
          channel: "Channel",
          characterNews: "Character news",
          characterPrefix: "Character",
          home: "News home",
          intent: "Fan report",
          menuLabel: "Primary news navigation",
          purchases: "Purchases",
          reporterPrefix: "Reporter",
          source: "Watch source",
          sourceContext: "Source-vlog participation news",
          summary: "Summary",
          wantToWatch: "Want it",
        },
        byline: "Fan reporter",
        viewerOwnership: {
          character: "AI character",
          reporter: "Reporter",
          title: "My ownership",
          verified: "Owner verified",
          video: "Video",
        },
        titleCharacter: {
          cta: "View character",
          eyebrow: "AI character",
          fallback: "AI character",
          visualAlt: (name: string) => `${name} AI character thumbnail`,
        },
        characterIdentity: {
          channelCta: "Open character channel",
          galleryLabel: "Avatar mood",
          latestLabel: "Latest vlog",
          profileLabel: "Character profile",
          title: "AI character identity",
          traitLabel: "Fixed traits",
        },
        characterStats: {
          level: "Growth level",
          reactions: "Fan reactions",
          vlogs: "Vlogs",
        },
        continueReading: {
          body:
            "Continue with this AI character first, then open the character persona and discover other character news.",
          characterCta: "Character news home",
          eyebrow: "Same character news",
          leadCta: (name: string | null) =>
            name ? `Read related ${name} news` : "Read related news",
          listEyebrow: "Same AI character",
          listTitle: "First reports first",
          personaBody: (name: string) =>
            `Open ${name}'s face and persona in the character channel.`,
          personaCta: "View character persona",
          personaEyebrow: "Next curiosity",
          title: "More from this character",
        },
        contentBadge: {
          nsfw: "Adult fan-only marker",
          paid: "Fan-only paid vlog",
          public: "Public vlog",
        },
        coverPicker: {
          autoSource: "Auto recommendation",
          body:
            "Choose the lead image this report should use from saved source-vlog cover candidates.",
          chooseLabel: "Use this image",
          currentLabel: "Currently used",
          noAlternatives:
            "Only one saved candidate is available, so there is no alternate cover yet.",
          sourceLabels: {
            ai: "AI generated",
            auto: "Auto recommendation",
            content_image: "Body image",
            frame: "Video frame",
            manual: "Manual upload",
            primary: "Source cover",
            reporter_cropped: "Wide crop",
          },
          title: "Report cover image",
        },
        edition: "AIAVpark online news for AI characters and fan participation",
        embeddedLocked:
          "Locked content is represented with public teaser details available for the news page.",
        embeddedLockedPaid: (amount: string) =>
          `The full source vlog is fan-only paid content. Pay ${amount} to open it from this news page.`,
        embeddedPreviewBadge: "Locked preview",
        embeddedPreviewMeta: "Autoplay before unlock",
        embeddedPlayFullVideoCta: "Play full source",
        embeddedReportSlot: {
          body: (remaining: string) =>
            `Fans coming through your report can join want-to-watch, helping source access and reporter incentive opportunities. ${remaining} slots remain.`,
          browseCta: "Find another report opportunity",
          connectCta: "Become a fan reporter",
          countLabel: (count: string, limit: string) =>
            `${count}/${limit} reports`,
          emptyBody:
            "No fan reporter has claimed this vlog yet. Publish first to turn your report traffic into source access participation.",
          eyebrow: "Fan report race",
          firstOpportunity: "First reporter opportunity",
          full: "Reporter slots full",
          fullBody:
            "All report slots for this source vlog are filled. Find another vlog with open report opportunities.",
          growthLoopLabel: "Reporter incentive loop",
          growthLoopSteps: ["Report traffic", "Want-to-watch", "Incentive"],
          leadReporter: "Lead reporter",
          publishedBadge: "Published",
          readerBody:
            "This is the fan reporter activity around this vlog. Use the want-to-watch action above to join source opening.",
          readerDetailsSummary: "View reporter competition details",
          remainingShort: (remaining: string) => `${remaining} left`,
          reporterLabel: "Published reporters",
          reporterDetailsSummary: "Reporter incentive details",
          revealMomentum: {
            closingBody: (remaining: string) =>
              `As source access gets close, report traffic competition becomes more visible. Bring fans through your report link and finish the final ${remaining} wants to strengthen your incentive signal.`,
            closingLabel: "Almost open",
            earlyBody: (remaining: string) =>
              `Low source-open participation is the best claim window. Publish now and share through chat or social channels to gather the first ${remaining} wants.`,
            earlyLabel: "Early claim",
            label: "Source-open link",
            remainingPeople: (remaining: string) => `${remaining}`,
            risingBody: (remaining: string) =>
              `When fans tap want-to-watch from your report, source access and reporter incentive opportunities grow together. ${remaining} more to open.`,
            risingLabel: "Traffic push",
            statParticipation: "Source wants",
            statRemaining: "To open",
            statReportSlots: "Report slots",
            title: (count: string, threshold: string) =>
              `${count}/${threshold} fans want source access`,
            unlockedBody:
              "Fan traffic that helped open the source remains a reporter proof signal. Claim the next vlog early and build traffic again.",
            unlockedLabel: "Open",
            unlockedTitle: "Source access opened",
          },
          rising: "Popular vlog competition",
          title: (count: string, limit: string) =>
            `${count}/${limit} reports published`,
          viewerReportNotice: "You also published a report from this vlog",
          writeCta: "Write a report for this vlog",
          early: "Early claim zone",
        },
        embeddedTitle: "Source vlog in this news",
        embeddedUnlockBody:
          "Unlock the full source video, news body, and extra media directly on this news page.",
        embeddedUnlockCta: "Pay and watch source",
        embeddedUnlockMeta: "Full video · news body · extra media",
        embeddedUnlockTitle: "Unlock fan-only vlog",
        embeddedVlogStatus: {
          accessible: "Viewable",
          free: "Public",
          general: "General",
          nsfw: "NSFW",
          ownerAccess: "Creator access",
          paid: (amount: string) => `${amount} paid`,
          paidLockedBody:
            "This is a fan-only paid source. Before payment, only teaser and reportable context are shown.",
          paidOwnerBody:
            "This fan-only source is viewable with creator access, with the source status shown on the news page.",
          paidPurchasedBody:
            "This fan-only source has been purchased by the signed-in member and can be watched on this news page.",
          publicBody: "You can watch it directly on this news page.",
          purchased: "Purchased",
          title: "Viewing note",
          unpaid: "Payment needed",
        },
        sourceTeaserGallery: {
          body:
            "Only saved scene frames from the source vlog are shown, so readers can scan the actual video flow before replaying it.",
          close: "Close scene viewer",
          eyebrow: "Source scene cuts",
          itemLabel: (index: string) => `Cut ${index}`,
          next: "Next scene",
          openViewer: "Open fullscreen",
          pinProtectedBody:
            "Scene cuts from an adult source open clearly after the signed-in member's wallet PIN is confirmed.",
          pinProtectedTitle: "Scene cuts protected by PIN",
          previous: "Previous scene",
          title: "Source vlog scene cuts",
        },
        reportTeaserGallery: {
          body:
            "The article shows teaser cuts cropped and edited by the fan reporter.",
          editBody:
            "This news was written by the signed-in reporter account. You can edit teaser cuts directly from the public news view.",
          editCta: "Edit reporter teaser cuts",
          editEyebrow: "News written by you",
          eyebrow: "Reporter teaser cuts",
          fallbackBody:
            "When the reporter did not choose public scenes, the news lead image is shown first.",
          fallbackTitle: "News lead image",
          itemLabel: (index: string) => `Edited cut ${index}`,
          leadBody:
            "Compare the news lead image with teaser cuts selected by the fan reporter.",
          selectedBody:
            "When edited cuts are not available, public frames selected by the fan reporter are shown first.",
          selectedItemLabel: (index: string) => `Public scene ${index}`,
          selectedTitle: "Public scenes selected by the fan reporter",
          title: "Teaser cuts edited by the fan reporter",
        },
        generated: "AI generated",
        publishedLabel: "Published",
        navItems: ["AI characters", "Fan reports", "Source vlogs", "Purchases"],
        nsfwBlurNotice:
          "The source vlog and parts of the news body stay blurred before NSFW opt-in.",
        nsfwControl: {
          disabledBody:
            "This news and related NSFW news remain available, with the source vlog, covers, and news body blurred until opt-in.",
          disabledTitle: "NSFW news blurred",
          enabledBody:
            "NSFW news is visible. Turn this off to blur this news and related NSFW news again.",
          enabledTitle: "NSFW news visible",
          hiddenCountText: (count: string) => `${count} NSFW news items blurred`,
        },
        relatedNews: "Continue this character",
        relatedNewsClearSearch: "Clear search",
        relatedNewsControlsSummary: "Search and sort",
        relatedNewsCurrent: "Now reading",
        relatedNewsDescription:
          "Quickly continue with more news from the same character.",
        relatedNewsEyebrow: "Character follow-up",
        relatedNewsEmpty: "No other news from this character yet.",
        relatedNewsError: "Could not load more news. Please try again.",
        relatedNewsLoading: "Loading",
        relatedNewsNext: "Next news",
        relatedNewsPage: "Page",
        relatedNewsPrevious: "Previous",
        relatedNewsSearchEmptyPrefix: "No character news matches \"",
        relatedNewsSearchEmptySuffix: "\".",
        relatedNewsSearchLabel: "Search character news",
        relatedNewsSearchPlaceholder: "Search title, summary, reporter",
        relatedNewsSortLabel: "Character news order",
        relatedNewsSortOptions: {
          first: "First reports",
          latest: "Latest",
          recommended: "Recommended",
          unlock: "Open progress",
        },
        otherCharacterNews: {
          characterCount: (count: string) =>
            `${count} character${count === "1" ? "" : "s"}`,
          eyebrow: "Other characters",
          fanOnly: "Fan-only",
          news: "News",
          newsCount: (count: string) =>
            `${count} news item${count === "1" ? "" : "s"}`,
          public: "Public",
          publicVideo: "Public source",
          sourceOpen: "Source opened",
          teaserCuts: "Teaser cuts",
          title: "Other character news",
        },
        reporterNewsCta: "Fan reporter news",
        reporterTrust: {
          basis:
            "Based on reports, reactions, unlocks, and paid purchase contribution",
          label: "Activity trust",
          max: "Top level",
          next: (level: string, points: string) =>
            `${points} points to ${level}`,
          score: (score: string) => `${score} pts`,
          summaryCta: "View reporter performance",
          stats: {
            paidPurchases: "Purchases",
            reports: "Reports",
            unlocks: "Unlocks",
            votes: "Want-to-watch",
          },
          levels: {
            active: "Active fan reporter",
            leading: "Leading fan reporter",
            starter: "New fan reporter",
            trusted: "Trusted fan reporter",
          },
        },
        reporterPartner: {
          attributedRevenue: "Attributed revenue",
          body:
            "When readers want-to-watch, unlock, or buy from this report, that contribution is recorded toward character growth and revenue-sharing basis.",
          eyebrow: "Fan Reporter Partner",
          paidPurchases: "Purchase contribution",
          rewardPoints: "Reward points",
          title: "Fan reporters become AI character fan partners",
        },
        sourceTitle: "Source vlog",
        summaryTitle: "Story summary",
        visualLead: "Representative news image",
        walletConnect: {
          body:
            "Use this only when fan reporter actions or fan-only payment are needed.",
          eyebrow: "AIAVpark Wallet",
          title: "News wallet when needed",
        },
        sixW: {
          how: "How",
          what: "What",
          when: "When",
          where: "Where",
          who: "Who",
          why: "Why",
        },
        siteName: "AIAVpark News",
      };
}

function formatDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function splitArticleBody(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function hasHangulFinalConsonant(value: string) {
  const lastChar = value.trim().at(-1);

  if (!lastChar) {
    return false;
  }

  const codePoint = lastChar.codePointAt(0);

  if (!codePoint) {
    return false;
  }

  const hangulStart = 0xac00;
  const hangulEnd = 0xd7a3;

  if (codePoint < hangulStart || codePoint > hangulEnd) {
    return false;
  }

  return (codePoint - hangulStart) % 28 !== 0;
}

function isFormulaicFanletterNewsDek(value: string, locale: Locale) {
  return locale === "ko"
    ? /브이로그를\s*팬 기자 관점(?:에서|으로)\s*육하원칙으로\s*정리했습니다\.?$/.test(
        value.trim(),
      )
    : /fan-reporter summary.+five Ws and one H/i.test(value.trim());
}

function normalizeLowSignalSourceTitleText(value: string, locale: Locale) {
  if (locale !== "ko") {
    return value
      .replace(
        /^(.+?)'s source vlog "([^"]+)" was presented on AIAVpark as a (.+?)\.$/i,
        (matchedText: string, creatorName: string, sourceTitle: string, accessLabel: string) =>
          isFanletterNewsLowSignalSourceTitle(sourceTitle)
            ? `${creatorName}'s new source vlog was presented on AIAVpark as a ${accessLabel}.`
            : matchedText,
      )
      .replace(
        /^"([^"]+)" was shared on AIAVpark as a (.+?)\.?$/i,
        (matchedText: string, sourceTitle: string, accessLabel: string) =>
          isFanletterNewsLowSignalSourceTitle(sourceTitle)
            ? `A new source vlog was shared on AIAVpark as a ${accessLabel}.`
            : matchedText,
      );
  }

  return value
    .replace(
      /^(.+?)의 원본 브이로그 '([^']+)'가 AIAVpark에서 (.+?)로 게시됐다\.?$/,
      (matchedText: string, creatorName: string, sourceTitle: string, accessLabel: string) =>
        isFanletterNewsLowSignalSourceTitle(sourceTitle)
          ? `${creatorName}의 새 원본 브이로그가 AIAVpark에서 ${accessLabel}로 게시됐다.`
          : matchedText,
    )
    .replace(
      /^원본 브이로그 '([^']+)'가 AIAVpark에서 (.+?)로 공유됐습니다\.?$/,
      (matchedText: string, sourceTitle: string, accessLabel: string) =>
        isFanletterNewsLowSignalSourceTitle(sourceTitle)
          ? `새 원본 브이로그가 AIAVpark에서 ${accessLabel}로 공유됐습니다.`
          : matchedText,
    );
}

function normalizeFanletterNewsDisplayText(value: string, locale: Locale) {
  const normalized = normalizeLowSignalSourceTitleText(value, locale)
    .replace(
      /^A fan-reporter summary of (.+?)'s vlog using the five Ws and one H\.$/i,
      "Follow the source vlog, fan reactions, and next action from this report.",
    )
    .replace(
      /^AI restructured the public title, summary, and teaser details into a fan report format$/i,
      "The news page connects the source vlog, public context, and fan participation flow.",
    )
    .replace(
      /^Follow (.+?)'s source vlog and fan participation from one news page\.$/i,
      "Follow the moments fans are reacting to in $1's source vlog.",
    );

  if (locale !== "ko") {
    return normalized;
  }

  return normalized
    .replace(/([가-힣])와 AIAVpark 팬/g, (_match: string, nameEnd: string) =>
      `${nameEnd}${hasHangulFinalConsonant(nameEnd) ? "과" : "와"} AIAVpark 팬`,
    )
    .replace(/'([^']+)'이 AIAVpark/g, "'$1'가 AIAVpark")
    .replace(
      /^(.+?)의 브이로그 '([^']+)'가 AIAVpark에서 (.+?)로 소개됐다\. \2$/,
      "$1의 원본 브이로그 '$2'가 AIAVpark에서 $3로 게시됐다.",
    )
    .replace(
      /^'([^']+)' 브이로그가 AIAVpark에서 (.+?)로 공유됨$/,
      "원본 브이로그 '$1'가 AIAVpark에서 $2로 공유됐습니다.",
    )
    .replace(
      /^원본 브이로그 '([^']+)'가 AIAVpark에서 (.+?)로 공유됨$/,
      "원본 브이로그 '$1'가 AIAVpark에서 $2로 공유됐습니다.",
    )
    .replace(
      /^(.+?)의 브이로그를 팬 기자 관점(?:에서|으로) 육하원칙으로 정리했습니다\.?$/,
      "$1의 원본 브이로그에서 팬들이 반응한 장면을 이어봅니다.",
    )
    .replace(
      /^(.+?)의 원본 브이로그와 팬 참여 흐름을 한 화면에서 확인하세요\.?$/,
      "$1의 원본 브이로그에서 팬들이 반응할 장면을 짚었습니다.",
    )
    .replace(
      /^원본 브이로그의 공개 제목, 요약, 티저 정보를 바탕으로 AI가 팬 리포트 형식으로 재구성$/,
      "원본 브이로그의 핵심 장면과 팬 참여 흐름을 이 뉴스 화면에서 이어볼 수 있게 연결",
    )
    .replace(
      /([^.\n]+?)는 이번 장면을 팬들이 다음 반응과 후속 요청을 남길 수 있는 팬 참여형 소식으로 정리했다\./g,
      "$1 팬 기자는 이번 장면에서 팬들이 남길 반응과 후속 요청 포인트를 전했다.",
    )
    .replace(
      /팬 기자 코멘트:\s*(.+?)\s+(성인 팬 전용 표시가 적용된 콘텐츠로, 리포트는 공개 가능한 티저 정보만 다룹니다\.)/g,
      (_match: string, comment: string, notice: string) =>
        `팬 기자가 남긴 관전 포인트는 '${comment.trim()}'다. ${notice}`,
    )
    .replace(
      /팬 기자 코멘트:\s*([^.\n]+)\.?/g,
      (_match: string, comment: string) =>
        `팬 기자가 남긴 관전 포인트는 '${comment.trim()}'다.`,
    );
}

function createFanletterNewsReaderDek({
  canViewerOpenSourceContent,
  creatorName,
  isPaidSourceContent,
  locale,
  rawDek,
  sourceReveal,
}: {
  canViewerOpenSourceContent: boolean;
  creatorName: string;
  isPaidSourceContent: boolean;
  locale: Locale;
  rawDek: string;
  sourceReveal: SourceVlogRevealGateState | null;
}) {
  const normalizedDek = normalizeFanletterNewsDisplayText(rawDek, locale);

  if (!isFormulaicFanletterNewsDek(rawDek, locale)) {
    return normalizedDek;
  }

  if (locale !== "ko") {
    if (sourceReveal?.unlocked === false) {
      return `Fans are opening ${creatorName}'s source vlog together from this report.`;
    }

    if (isPaidSourceContent && !canViewerOpenSourceContent) {
      return `Fans opened access. Pay to watch ${creatorName}'s full source vlog.`;
    }

    return `Watch ${creatorName}'s source vlog and fan participation from this report.`;
  }

  if (sourceReveal?.unlocked === false) {
    return `${creatorName}의 원본 브이로그를 팬들이 함께 열어가는 리포트입니다.`;
  }

  if (isPaidSourceContent && !canViewerOpenSourceContent) {
    return `팬들이 오픈 조건을 채웠습니다. 결제 후 ${creatorName}의 전체 원본 브이로그를 볼 수 있습니다.`;
  }

  if (isPaidSourceContent) {
    return `${creatorName}의 팬 전용 원본 브이로그와 리포트 요약을 함께 확인하세요.`;
  }

  return `팬들이 보고싶어요를 채워 ${creatorName}의 원본 브이로그를 열어낸 리포트입니다.`;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatUsdt(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value > 0 && value < 1 ? 2 : 0,
  }).format(value)} USDT`;
}

function getContentAccessLabel(
  item: Pick<FanletterPublicContentItem, "contentMaturityRating" | "priceType">,
  copy: ReturnType<typeof getCopy>,
) {
  if (item.contentMaturityRating === "nsfw") {
    return copy.contentBadge.nsfw;
  }

  return item.priceType === "paid"
    ? copy.contentBadge.paid
    : copy.contentBadge.public;
}

function getReporterTrustLevelLabel(
  copy: ReturnType<typeof getCopy>,
  level: FanletterNewsReporterTrustLevel,
) {
  return copy.reporterTrust.levels[level];
}

function isFrameTimestamp(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatSourceVlogFrameTime(
  timestampSec: number | null,
  locale: Locale,
) {
  if (!isFrameTimestamp(timestampSec)) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.round(timestampSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (locale === "ko") {
    return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
  }

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function buildSourceVlogSceneFrames(
  sourceContent: FanletterPublicContentDetail | null,
): SourceVlogSceneFrame[] {
  if (!sourceContent) {
    return [];
  }

  const frameCandidateByUrl = new Map<string, number>();

  for (const candidate of sourceContent.coverImageCandidates ?? []) {
    const imageUrl = candidate.url?.trim();

    if (
      candidate.source !== "frame" ||
      !imageUrl ||
      frameCandidateByUrl.has(imageUrl) ||
      !isFrameTimestamp(candidate.timestampSec)
    ) {
      continue;
    }

    frameCandidateByUrl.set(imageUrl, candidate.timestampSec);
  }

  const seenUrls = new Set<string>();
  const frames = (sourceContent.contentImageUrls ?? []).flatMap(
    (rawImageUrl, originalIndex) => {
      const imageUrl = rawImageUrl.trim();

      if (!imageUrl || seenUrls.has(imageUrl)) {
        return [];
      }

      seenUrls.add(imageUrl);

      return [
        {
          imageUrl,
          originalIndex,
          timestampSec: frameCandidateByUrl.get(imageUrl) ?? null,
        },
      ];
    },
  );

  return frames
    .sort((left, right) => {
      const leftTimestamp = left.timestampSec;
      const rightTimestamp = right.timestampSec;
      const leftHasTime = isFrameTimestamp(leftTimestamp);
      const rightHasTime = isFrameTimestamp(rightTimestamp);

      if (leftHasTime && rightHasTime) {
        return leftTimestamp - rightTimestamp;
      }

      if (leftHasTime) {
        return -1;
      }

      if (rightHasTime) {
        return 1;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ imageUrl, timestampSec }) => ({
      imageUrl,
      timestampSec,
    }));
}

function pickTimelinePreviewFrames(
  frames: SourceVlogSceneFrame[],
  limit = 3,
): SourceVlogSceneFrame[] {
  if (frames.length <= limit) {
    return frames;
  }

  const maxIndex = frames.length - 1;
  const selectedIndexes = new Set<number>();

  for (let index = 0; index < limit; index += 1) {
    selectedIndexes.add(Math.round((maxIndex * index) / (limit - 1)));
  }

  return Array.from(selectedIndexes)
    .sort((left, right) => left - right)
    .map((index) => frames[index])
    .filter((frame): frame is SourceVlogSceneFrame => Boolean(frame));
}

function getSourceVlogRevealTeaserCopy(
  locale: Locale,
): SourceVlogRevealTeaserCopy {
  return locale === "ko"
    ? {
        eyebrow: "원본 티저 컷",
        meta: "짧은 장면만 먼저 공개",
        title: "팬들이 열기 전, 분위기만 먼저 확인하세요",
      }
    : {
        eyebrow: "Source teaser cuts",
        meta: "Short scenes previewed first",
        title: "Preview the mood before fans open the full source",
      };
}

function NewsSiteHeader({
  characterHref,
  characterImageUrl,
  characterName,
  copy,
  homeHref,
  locale,
  mobileNavLinks,
  navLinks,
  referralCode,
  reporterName,
  sourceAccessLabel,
  walletHref,
}: {
  characterHref: string;
  characterImageUrl: string | null;
  characterName: string | null;
  copy: ReturnType<typeof getCopy>;
  homeHref: string;
  locale: Locale;
  mobileNavLinks: NewsHeaderNavLink[];
  navLinks: NewsHeaderNavLink[];
  referralCode: string | null;
  reporterName: string;
  sourceAccessLabel: string;
  walletHref: string;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());
  const characterDisplayName =
    characterName?.trim() || copy.titleCharacter.fallback;
  const reporterDisplayName = reporterName.trim() || copy.byline;
  const shouldBypassCharacterImageOptimization = characterImageUrl
    ? shouldBypassFanletterImageOptimization(characterImageUrl)
    : false;
  const contextItems = [
    {
      icon: <Newspaper className="size-3.5 shrink-0 text-[#16702e]" />,
      label: copy.newsHeader.sourceContext,
    },
    {
      icon: <Users className="size-3.5 shrink-0 text-[#16702e]" />,
      label: `${copy.newsHeader.characterPrefix} ${characterDisplayName}`,
    },
    {
      icon: <FileText className="size-3.5 shrink-0 text-[#16702e]" />,
      label: `${copy.newsHeader.reporterPrefix} ${reporterDisplayName}`,
    },
    {
      icon: <Clapperboard className="size-3.5 shrink-0 text-[#16702e]" />,
      label: sourceAccessLabel,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/12 bg-white/95 text-[#111510] shadow-[0_10px_34px_rgba(17,21,16,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[92rem] flex-col px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-[3.25rem] items-center justify-between gap-2 py-1.5 sm:min-h-[4.5rem] sm:gap-4 sm:py-3">
          <Link
            className="inline-flex min-h-11 min-w-0 items-center gap-2 !text-[#111510] sm:gap-3"
            href={homeHref}
          >
            <FanletterBrandMark className="size-7 shrink-0 sm:size-10" />
            <span className="min-w-0">
              <span className="block truncate text-[0.96rem] font-black leading-tight sm:text-xl">
                {copy.siteName}
              </span>
              <span className="block truncate text-[0.66rem] font-black leading-tight text-[#16702e] sm:text-xs">
                {copy.newsHeader.intent}
                <span className="hidden sm:inline">
                  {" "}
                  · {copy.newsHeader.sourceContext}
                </span>
              </span>
            </span>
          </Link>
          <Link
            className="inline-flex min-h-11 max-w-[9.5rem] shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-[#f5f7f1] px-2 py-1 !text-[#111510] sm:hidden"
            href={characterHref}
          >
            <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-black/8">
              {characterImageUrl ? (
                <Image
                  alt={copy.titleCharacter.visualAlt(characterDisplayName)}
                  className="h-full w-full object-cover"
                  height={56}
                  src={characterImageUrl}
                  unoptimized={shouldBypassCharacterImageOptimization}
                  width={56}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[#16702e]">
                  <Users className="size-4" />
                </span>
              )}
            </span>
            <span className="min-w-0 truncate text-[0.78rem] font-black">
              {characterDisplayName}
            </span>
            <ArrowUpRight className="size-3.5 shrink-0 text-black/46" />
          </Link>
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 lg:flex">
            {contextItems.map((item) => (
              <span
                className="inline-flex min-w-0 max-w-[13rem] items-center gap-1.5 rounded-full border border-black/10 bg-[#f5f7f1] px-3 py-1.5 text-xs font-black text-black/64"
                key={item.label}
              >
                {item.icon}
                <span className="min-w-0 truncate">{item.label}</span>
              </span>
            ))}
            <span className="hidden shrink-0 text-xs font-bold text-black/42 xl:inline">
              {today}
            </span>
          </div>
          <div className="hidden shrink-0 sm:block">
            <FanletterNewsWalletConnect
              className="sm:max-w-[12rem]"
              locale={locale}
              referralCode={referralCode}
              walletHref={walletHref}
            />
          </div>
        </div>
        <nav
          aria-label={copy.newsHeader.menuLabel}
          className="grid grid-cols-3 gap-1.5 border-t border-black/8 py-1.5 text-[0.7rem] font-black text-black/62 sm:hidden"
        >
          {mobileNavLinks.map((item) => (
            <Link
              className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full border px-2 py-2 text-center transition ${
                item.emphasized
                  ? "border-[#19b84b] bg-[#ecfff0] !text-[#126c2c] shadow-[inset_0_0_0_1px_rgba(25,184,75,0.14)]"
                  : "border-black/10 bg-white !text-black/62 hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#126c2c]"
              }`}
              href={item.href}
              key={item.label}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
        <nav
          aria-label={copy.newsHeader.menuLabel}
          className="hidden border-t border-black/8 py-2.5 text-sm font-black text-black/62 sm:flex sm:gap-2 sm:overflow-x-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
        >
          {navLinks.map((item) => (
            <Link
              className={`inline-flex min-h-11 min-w-32 shrink-0 items-center justify-between gap-1 rounded-full border px-3 py-2 text-center transition ${
                item.emphasized
                  ? "border-[#19b84b] bg-[#ecfff0] !text-[#126c2c] shadow-[inset_0_0_0_1px_rgba(25,184,75,0.14)]"
                  : "border-black/10 bg-white !text-black/62 hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#126c2c]"
              }`}
              href={item.href}
              key={item.label}
            >
              <span className="inline-flex min-w-0 items-center justify-center gap-1 sm:gap-2">
                <span className="shrink-0">{item.icon}</span>
                <span className="min-w-0 truncate">{item.label}</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-current" />
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function getNewsLandingHeroCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accessibleBody:
          "뉴스와 원본 브이로그를 이 화면에서 바로 이어볼 수 있습니다.",
        articleCta: "기사 요약 보기",
        characterCta: "캐릭터 채널",
        freeLockedBody:
          "팬들이 보고싶어요를 모으면 원본 브이로그가 모두에게 무료 공개됩니다.",
        freeUnlocked: "무료 원본 공개 완료",
        paidLockedBody:
          "팬들이 공개 조건을 채우면 원본 접근이 열리고, 이후 1 USDT 결제로 전체 브이로그를 볼 수 있습니다.",
        paidReady: (amount: string) => `${amount} 원본 보기 가능`,
        paidReadyBody: (amount: string) =>
          `공개 조건이 완료됐습니다. ${amount} 결제로 전체 원본을 바로 볼 수 있습니다.`,
        paidUnlocked: "원본 열람 가능",
        payCta: (amount: string) => `${amount}로 원본 보기`,
        progress: (count: string, threshold: string, remaining: string) =>
          `${count}/${threshold}명 참여 중 · ${remaining}명 더 필요`,
        sourceCta: "원본 브이로그 보기",
        voteCta: "보고싶어요 참여",
        walletCta: "가입하고 보고싶어요",
      }
    : {
        accessibleBody:
          "Read the report and continue to the source vlog from this page.",
        articleCta: "Read summary",
        characterCta: "Character channel",
        freeLockedBody:
          "When enough fans tap want-to-watch, the source vlog opens free for everyone.",
        freeUnlocked: "Free source opened",
        paidLockedBody:
          "Fans open source access first, then the full vlog is available with a 1 USDT payment.",
        paidReady: (amount: string) => `${amount} source ready`,
        paidReadyBody: (amount: string) =>
          `The open condition is complete. Pay ${amount} to watch the full source now.`,
        paidUnlocked: "Source viewable",
        payCta: (amount: string) => `Watch source for ${amount}`,
        progress: (count: string, threshold: string, remaining: string) =>
          `${count}/${threshold} fans joined · ${remaining} more needed`,
        sourceCta: "Watch source vlog",
        voteCta: "Join want-to-watch",
        walletCta: "Join and want-to-watch",
      };
}

function FanletterNewsShareLandingHero({
  accessLabel,
  articleTitle,
  blurBackgroundVideo,
  blurred,
  characterName,
  copy,
  creatorHref,
  dek,
  isPaidContent,
  isViewerLoggedIn,
  locale,
  paidUnlockHref,
  paidUnlockLabel,
  previewVideoUrl,
  referralCode,
  reporterName,
  heroTeaserImageUrls,
  heroTeaserUsesReporterCuts,
  shareHref,
  sourceImageUrl,
  sourceReveal,
  sourceVlogHref,
  titleCharacterImageUrl,
  viewerCanAccessSource,
  walletConnectHref,
}: {
  accessLabel: string;
  articleTitle: string;
  blurBackgroundVideo: boolean;
  blurred: boolean;
  characterName: string | null;
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  dek: string;
  isPaidContent: boolean;
  isViewerLoggedIn: boolean;
  locale: Locale;
  paidUnlockHref: string | null;
  paidUnlockLabel: string;
  previewVideoUrl: string | null;
  referralCode: string | null;
  reporterName: string;
  heroTeaserImageUrls: string[];
  heroTeaserUsesReporterCuts: boolean;
  shareHref: string;
  sourceImageUrl: string | null;
  sourceReveal: SourceVlogRevealGateState | null;
  sourceVlogHref: string;
  titleCharacterImageUrl: string | null;
  viewerCanAccessSource: boolean;
  walletConnectHref: string;
}) {
  const heroCopy = getNewsLandingHeroCopy(locale);
  const sourceRevealLocked = Boolean(sourceReveal && !sourceReveal.unlocked);
  const revealRemainingCount = sourceReveal
    ? Math.max(sourceReveal.threshold - sourceReveal.count, 0)
    : 0;
  const sourceCanBeWatched = !sourceRevealLocked && viewerCanAccessSource;
  const shouldShowPaidUnlockCta =
    !sourceRevealLocked &&
    isPaidContent &&
    !viewerCanAccessSource &&
    Boolean(paidUnlockHref);
  const statusLabel = sourceReveal
    ? sourceReveal.unlocked
      ? isPaidContent
        ? viewerCanAccessSource
          ? heroCopy.paidUnlocked
          : heroCopy.paidReady(paidUnlockLabel)
        : heroCopy.freeUnlocked
      : heroCopy.progress(
          formatNumber(sourceReveal.count, locale),
          formatNumber(sourceReveal.threshold, locale),
          formatNumber(revealRemainingCount, locale),
        )
    : accessLabel;
  const statusBody = sourceRevealLocked
    ? isPaidContent
      ? heroCopy.paidLockedBody
      : heroCopy.freeLockedBody
    : isPaidContent && !viewerCanAccessSource
      ? heroCopy.paidReadyBody(paidUnlockLabel)
      : heroCopy.accessibleBody;
  const primaryCta = sourceRevealLocked
    ? {
        href: isViewerLoggedIn ? sourceVlogHref : walletConnectHref,
        icon: <HeartHandshake className="size-4" />,
        label: isViewerLoggedIn ? heroCopy.voteCta : heroCopy.walletCta,
      }
    : {
        href: sourceVlogHref,
        icon: <PlayCircle className="size-4" />,
        label: sourceCanBeWatched ? heroCopy.sourceCta : heroCopy.articleCta,
      };
  const canUsePreviewVideo = Boolean(previewVideoUrl && !blurred && !sourceImageUrl);
  const characterDisplayName = characterName ?? copy.titleCharacter.fallback;
  const shouldBypassHeroImageOptimization = sourceImageUrl
    ? shouldBypassFanletterImageOptimization(sourceImageUrl)
    : false;
  const shouldBypassCharacterImageOptimization = titleCharacterImageUrl
    ? shouldBypassFanletterImageOptimization(titleCharacterImageUrl)
    : false;
  const visibleHeroTeaserImageUrls = getUniqueTrimmedImageUrls([
    ...heroTeaserImageUrls,
    sourceImageUrl,
  ]).slice(0, 4);
  const showHeroVideoPreview =
    visibleHeroTeaserImageUrls.length === 0 && Boolean(previewVideoUrl);
  const showHeroTeaserPreview =
    visibleHeroTeaserImageUrls.length > 0 || showHeroVideoPreview;
  const showMobileHeroVisual = Boolean(sourceImageUrl || previewVideoUrl);
  const shouldBlurHeroVisual = blurred || blurBackgroundVideo;
  const heroTeaserGridClass =
    visibleHeroTeaserImageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2";
  const heroTeaserImageClass =
    visibleHeroTeaserImageUrls.length === 1 ? "aspect-[16/10]" : "aspect-[4/5]";
  const heroTeaserEyebrow = heroTeaserUsesReporterCuts
    ? copy.reportTeaserGallery.eyebrow
    : visibleHeroTeaserImageUrls.length > 0
      ? copy.sourceTeaserGallery.eyebrow
      : accessLabel;
  const heroTeaserTitle = heroTeaserUsesReporterCuts
    ? copy.reportTeaserGallery.title
    : visibleHeroTeaserImageUrls.length > 0
      ? copy.reportTeaserGallery.selectedTitle
      : copy.embeddedTitle;
  const heroTeaserItemLabel = heroTeaserUsesReporterCuts
    ? copy.reportTeaserGallery.itemLabel
    : copy.reportTeaserGallery.selectedItemLabel;

  return (
    <section className="relative isolate mb-5 overflow-hidden border border-black/12 bg-[#07100b] text-white shadow-[0_18px_50px_rgba(17,21,16,0.12)] sm:mb-7">
      <div className="absolute inset-0 hidden sm:block">
        {canUsePreviewVideo && previewVideoUrl ? (
          <FanletterAutoplayVideo
            ariaHidden
            className={`h-full w-full object-cover object-[center_58%] opacity-[0.86] ${
              blurBackgroundVideo
                ? "scale-[1.04] blur-sm brightness-[0.74]"
                : ""
            }`}
            poster={sourceImageUrl ?? undefined}
            src={previewVideoUrl}
            title={articleTitle}
          />
        ) : sourceImageUrl ? (
          <>
            <Image
              alt=""
              aria-hidden="true"
              className="scale-[1.1] object-cover object-[center_44%] opacity-60 blur-2xl brightness-[0.48] saturate-[1.08]"
              fill
              loading="eager"
              sizes="100vw"
              src={sourceImageUrl}
              unoptimized={shouldBypassHeroImageOptimization}
            />
            <Image
              alt=""
              aria-hidden="true"
              className={`origin-bottom scale-[1.13] object-cover object-[center_44%] opacity-[0.72] sm:origin-center sm:scale-100 sm:object-contain sm:object-right sm:opacity-[0.88] ${
                blurred ? "blur-sm brightness-[0.74]" : ""
              }`}
              fill
              loading="eager"
              sizes="100vw"
              src={sourceImageUrl}
              unoptimized={shouldBypassHeroImageOptimization}
            />
          </>
        ) : (
          <div className="h-full w-full bg-[linear-gradient(145deg,#07100b,#121812_54%,#203426)]" />
        )}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(68,242,110,0.14),rgba(68,242,110,0)_34%),linear-gradient(145deg,#07100b,#121812_58%,#1a2a1f)] sm:bg-[linear-gradient(90deg,rgba(5,8,6,0.94)_0%,rgba(5,8,6,0.76)_43%,rgba(5,8,6,0.3)_70%,rgba(5,8,6,0.74)_100%)]" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(5,8,6,0.14)_0%,rgba(5,8,6,0.16)_48%,rgba(5,8,6,0.88)_100%)] sm:block" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(238,241,236,0)_0%,rgba(238,241,236,0.12)_100%)] sm:block" />
      <div className="relative z-10 grid gap-5 p-4 sm:min-h-[29rem] sm:content-end sm:gap-6 sm:p-6 lg:min-h-[31rem] lg:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] xl:items-end">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-black text-white/82 sm:text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#44f26e]/34 bg-[#44f26e]/14 px-3 py-1.5 text-[#9bffad]">
              <Newspaper className="size-3.5" />
              {copy.siteName}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/10 px-3 py-1.5">
              {accessLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/10 px-3 py-1.5">
              {reporterName}
            </span>
          </div>

          {showMobileHeroVisual ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-white/14 bg-black/44 shadow-[0_18px_42px_rgba(0,0,0,0.28)] sm:hidden">
              <div className="relative aspect-[16/10] bg-[#111510]">
                {sourceImageUrl ? (
                  <>
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="scale-110 object-cover object-center opacity-[0.58] blur-xl brightness-[0.52] saturate-[0.96]"
                      fill
                      loading="eager"
                      sizes="100vw"
                      src={sourceImageUrl}
                      unoptimized={shouldBypassHeroImageOptimization}
                    />
                    <Image
                      alt={copy.visualLead}
                      className={`object-contain object-center ${
                        shouldBlurHeroVisual ? "blur-sm brightness-[0.74]" : ""
                      }`}
                      fill
                      fetchPriority="high"
                      loading="eager"
                      sizes="100vw"
                      src={sourceImageUrl}
                      unoptimized={shouldBypassHeroImageOptimization}
                    />
                  </>
                ) : previewVideoUrl ? (
                  <FanletterAutoplayVideo
                    ariaHidden
                    className={`h-full w-full object-cover object-center ${
                      shouldBlurHeroVisual ? "blur-sm brightness-[0.74]" : ""
                    }`}
                    src={previewVideoUrl}
                    title={articleTitle}
                  />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.74)_100%)] px-3 pb-3 pt-12">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/72 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#b9ffc8] shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                    <Newspaper className="size-3.5" />
                    {copy.visualLead}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <h1
            className={`mt-4 max-w-4xl break-words text-[1.86rem] font-black leading-[1.1] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[3rem] sm:leading-[1.08] lg:text-[3.25rem] ${
              blurred ? "select-none blur-[2px]" : ""
            }`}
          >
            {articleTitle}
          </h1>
          <p
            className={`mt-2.5 max-w-2xl text-[0.92rem] font-semibold leading-6 text-white/78 sm:mt-3 sm:text-lg sm:leading-8 ${
              blurred ? "select-none blur-[2px]" : ""
            }`}
          >
            {dek}
          </p>

          <div className="mt-5 grid gap-3 rounded-lg border border-white/14 bg-black/44 p-3 backdrop-blur sm:max-w-3xl sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-black text-[#9bffad]">
                {sourceRevealLocked ? (
                  <LockKeyhole className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {statusLabel}
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-white/66">
                {statusBody}
              </p>
            </div>
            <Link
              className="group grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/16 bg-white/10 px-3 py-2.5 text-left !text-white transition hover:border-[#44f26e]/44 hover:bg-white/16 sm:min-w-64"
              href={creatorHref}
            >
              {titleCharacterImageUrl ? (
                <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-white/20 bg-black shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={`object-cover object-center transition duration-300 group-hover:scale-[1.04] ${
                      blurred ? "blur-sm brightness-[0.78]" : ""
                    }`}
                    fill
                    sizes="3rem"
                    src={titleCharacterImageUrl}
                    unoptimized={shouldBypassCharacterImageOptimization}
                  />
                </span>
              ) : (
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/44 text-[#9bffad]">
                  <BadgeCheck className="size-5" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-[0.64rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
                  {heroCopy.characterCta}
                </span>
                <span className="mt-0.5 block truncate text-base font-black leading-tight">
                  {characterDisplayName}
                </span>
              </span>
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white/68 transition group-hover:bg-[#44f26e] group-hover:text-black">
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {shouldShowPaidUnlockCta && paidUnlockHref ? (
              <FanletterPaidUnlockTrigger
                className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-black transition hover:bg-[#69ff8c] sm:min-w-48"
                href={paidUnlockHref}
              >
                <Coins className="size-4" />
                <span>{heroCopy.payCta(paidUnlockLabel)}</span>
              </FanletterPaidUnlockTrigger>
            ) : (
              <Link
                className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-black transition hover:bg-[#69ff8c] sm:min-w-48"
                href={primaryCta.href}
              >
                {primaryCta.icon}
                <span>{primaryCta.label}</span>
              </Link>
            )}
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 text-sm font-black !text-white transition hover:bg-white/16 sm:px-5"
              href="#fanletter-news-story-summary"
            >
              <FileText className="size-4 text-[#9bffad]" />
              <span>{heroCopy.articleCta}</span>
            </Link>
            <FanletterChannelShareButton
              className="!h-auto min-h-12 !rounded-full !border-white/16 !bg-white/10 px-4 text-sm font-black !text-white hover:!bg-white/16 sm:px-5"
              href={shareHref}
              locale={locale}
              referralCode={referralCode}
              shareIdScope="newsreport"
              summary={dek}
              title={articleTitle}
              trackingSource="fanletter-news-landing-hero"
            />
          </div>

        </div>
        {showHeroTeaserPreview ? (
          <aside className="hidden overflow-hidden rounded-lg border border-white/14 bg-black/44 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:block">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
                  <Clapperboard className="size-3.5" />
                  {heroTeaserEyebrow}
                </p>
                <h2 className="mt-1.5 text-xl font-black leading-tight tracking-normal [word-break:keep-all]">
                  {heroTeaserTitle}
                </h2>
              </div>
              <span className="shrink-0 rounded-full border border-[#44f26e]/28 bg-[#44f26e]/12 px-2.5 py-1 text-[0.62rem] font-black text-[#b9ffc8]">
                {showHeroVideoPreview
                  ? copy.embeddedPreviewBadge
                  : formatNumber(visibleHeroTeaserImageUrls.length, locale)}
              </span>
            </div>
            {visibleHeroTeaserImageUrls.length > 0 ? (
              <div className={`mt-3 grid ${heroTeaserGridClass} gap-2`}>
                {visibleHeroTeaserImageUrls.map((imageUrl, index) => (
                  <div
                    className={`group relative overflow-hidden rounded-md border border-white/10 bg-[#111510] ${heroTeaserImageClass}`}
                    key={`${imageUrl}-${index}`}
                  >
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={`object-cover transition duration-500 group-hover:scale-[1.04] ${
                        blurred ? "blur-sm brightness-[0.74]" : ""
                      }`}
                      fill
                      sizes="12rem"
                      src={imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.48)_100%)]" />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/72 px-2.5 py-1 text-[0.58rem] font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                      {heroTeaserItemLabel(formatNumber(index + 1, locale))}
                    </span>
                  </div>
                ))}
              </div>
            ) : previewVideoUrl ? (
              <div className="relative mt-3 aspect-[16/10] overflow-hidden rounded-md border border-white/10 bg-[#111510]">
                <FanletterAutoplayVideo
                  ariaHidden
                  className={`h-full w-full object-cover ${
                    blurred ? "blur-sm brightness-[0.74]" : ""
                  }`}
                  src={previewVideoUrl}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.5)_100%)]" />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/72 px-2.5 py-1 text-[0.58rem] font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                  {copy.embeddedPreviewMeta}
                </span>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function FanletterNewsOtherCharacterNews({
  characters,
  copy,
  locale,
  referralCode,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
}) {
  if (characters.length === 0) {
    return null;
  }

  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const characterCountLabel = copy.otherCharacterNews.characterCount(
    formatNumber(characters.length, locale),
  );
  const hasReportTeaserCutSignal = (report: FanletterNewsReportDocument) =>
    (report.teaserImages ?? []).some(
      (image) =>
        image.imageUrl.trim() &&
        (image.source === "reporter_cropped" || Boolean(image.crop)),
    ) || (report.teaserImageUrls ?? []).some((imageUrl) => imageUrl.trim());

  return (
    <section className="overflow-hidden border border-black/12 bg-white text-[#111510] shadow-[0_16px_44px_rgba(17,21,16,0.06)]">
      <div className="border-b border-black/12 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.13em] text-[#16702e] sm:text-[0.68rem]">
              <Newspaper className="size-3.5" />
              {copy.otherCharacterNews.eyebrow}
            </p>
            <h2 className="mt-1.5 break-words text-xl font-black leading-tight tracking-normal [word-break:keep-all] sm:mt-2 sm:text-2xl">
              {copy.otherCharacterNews.title}
            </h2>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-[#16702e]/18 bg-[#ecfff0] px-2.5 py-1 text-[0.62rem] font-black text-[#16702e] sm:px-3 sm:text-[0.68rem]">
            {characterCountLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-3 bg-[#f7f9f4] p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-1 xl:p-3">
        {characters.map((character) => {
          const otherReport = character.representativeReport;
          const reportHref = buildPathWithReferral(
            `/${locale}/fanletter/news/${otherReport.reportId}`,
            referralCode,
          );
          const characterReferralCode = normalizeReferralCode(
            otherReport.creatorReferralCode,
          );
          const characterHref = characterReferralCode
            ? buildPathWithReferral(
                `/${locale}/fanletter/news/characters/${characterReferralCode}`,
                referralCode ?? characterReferralCode,
              )
            : newsHomeHref;
          const publishedAt = formatDate(
            otherReport.sourcePublishedAt ?? otherReport.createdAt ?? null,
            locale,
          );
          const accessLabel = getContentAccessLabel(otherReport, copy);
          const characterAvatarImageUrl =
            character.avatarImageUrl ?? otherReport.coverImageUrl;
          const characterNewsCountLabel = copy.otherCharacterNews.newsCount(
            formatNumber(character.newsCount, locale),
          );
          const discoveryReasonLabels = [
            character.publicVideoCount > 0
              ? copy.otherCharacterNews.publicVideo
              : null,
            character.sourceRevealUnlockedCount > 0
              ? copy.otherCharacterNews.sourceOpen
              : null,
            hasReportTeaserCutSignal(otherReport)
              ? copy.otherCharacterNews.teaserCuts
              : null,
          ].filter((label): label is string => Boolean(label));
          const shouldBypassCoverImageOptimization = otherReport.coverImageUrl
            ? shouldBypassFanletterImageOptimization(otherReport.coverImageUrl)
            : false;
          const shouldBypassAvatarImageOptimization = characterAvatarImageUrl
            ? shouldBypassFanletterImageOptimization(characterAvatarImageUrl)
            : false;

          return (
            <article
              className="group overflow-hidden border border-black/10 bg-white shadow-[0_12px_30px_rgba(17,21,16,0.05)] transition hover:border-[#19b84b]/42 hover:bg-[#fbfff8]"
              key={character.referralCode}
            >
              <Link
                aria-label={getArticleDisplayTitle(otherReport.title)}
                className="relative block aspect-[16/10] overflow-hidden bg-[#111510]"
                href={reportHref}
              >
                {otherReport.coverImageUrl ? (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    fill
                    sizes="(max-width: 640px) 8rem, 8.75rem"
                    src={otherReport.coverImageUrl}
                    unoptimized={shouldBypassCoverImageOptimization}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/70">
                    <Newspaper className="size-7 text-[#44f26e]" />
                  </div>
                )}
                <span className="absolute left-2 top-2 inline-flex items-center rounded-full border border-white/16 bg-black/58 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-white backdrop-blur">
                  {accessLabel}
                </span>
              </Link>

              <div className="min-w-0 p-3 sm:p-3.5">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <Link
                    className="relative z-10 inline-flex min-w-0 items-center gap-2 !text-[#111510] transition hover:text-[#16702e]"
                    href={characterHref}
                  >
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-black/10 bg-[#111510]">
                      {characterAvatarImageUrl ? (
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="object-cover"
                          fill
                          sizes="2.5rem"
                          src={characterAvatarImageUrl}
                          unoptimized={shouldBypassAvatarImageOptimization}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-white/70">
                          <Users className="size-5" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black leading-5">
                        {character.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
                        {characterNewsCountLabel}
                        <ArrowUpRight className="size-3" />
                      </span>
                    </span>
                  </Link>
                </div>
                <Link className="block" href={reportHref}>
                  <p className="mt-2 line-clamp-2 break-words text-[0.92rem] font-black leading-5 text-[#111510] [word-break:keep-all] group-hover:text-[#16702e] sm:text-base sm:leading-6">
                    {getArticleDisplayTitle(otherReport.title)}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold leading-5 text-black/52">
                    {normalizeFanletterNewsDisplayText(otherReport.dek, locale)}
                  </p>
                </Link>
                {discoveryReasonLabels.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {discoveryReasonLabels.slice(0, 3).map((label) => (
                      <span
                        className="inline-flex items-center rounded-full border border-[#16702e]/16 bg-[#ecfff0] px-2 py-0.5 text-[0.58rem] font-black text-[#126c2c]"
                        key={label}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/38">
                  <span className="text-[#16702e]">
                    {otherReport.reporterName}
                  </span>
                  {publishedAt ? <span>{publishedAt}</span> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CharacterPersonaBridge({
  blurred,
  className,
  copy,
  creatorHref,
  creatorReferralCode,
  followFallbackHref,
  imageUrl,
  locale,
  name,
}: {
  blurred: boolean;
  className?: string;
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  creatorReferralCode: string | null;
  followFallbackHref: string;
  imageUrl: string | null;
  locale: Locale;
  name: string | null;
}) {
  const displayName = name?.trim() || copy.titleCharacter.fallback;
  const shouldBypassImageOptimization = imageUrl
    ? shouldBypassFanletterImageOptimization(imageUrl)
    : false;

  return (
    <section
      className={`border border-black/12 bg-[#111510] p-3 text-white shadow-[0_16px_38px_rgba(17,21,16,0.13)] sm:p-4 ${className ?? ""}`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Link
          className="group grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 !text-white sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:gap-4"
          href={creatorHref}
        >
          <span className="relative block aspect-square overflow-hidden rounded-xl border border-white/12 bg-black">
            {imageUrl ? (
              <Image
                alt={copy.titleCharacter.visualAlt(displayName)}
                className={`object-cover object-center transition duration-300 group-hover:scale-[1.04] ${
                  blurred ? "blur-sm brightness-[0.78] saturate-[0.88]" : ""
                }`}
                fill
                sizes="(max-width: 640px) 4.75rem, 5.5rem"
                src={imageUrl}
                unoptimized={shouldBypassImageOptimization}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_55%,#203426)]">
                <BadgeCheck className="size-7 text-[#44f26e]" />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[0.62rem] font-black uppercase tracking-[0.13em] text-[#44f26e]">
              {copy.continueReading.personaEyebrow}
            </span>
            <span className="mt-1 block truncate text-lg font-black leading-tight">
              {displayName}
            </span>
            <span className="mt-1 block text-xs font-semibold leading-5 text-white/58 [word-break:keep-all]">
              {copy.continueReading.personaBody(displayName)}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-1 text-[#44f26e]">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#44f26e] text-black transition group-hover:bg-[#69ff8c]">
              <ArrowUpRight className="size-4" />
            </span>
            <span className="hidden text-[0.6rem] font-black uppercase tracking-[0.08em] text-white/48 sm:block">
              {copy.continueReading.personaCta}
            </span>
          </span>
        </Link>
        {creatorReferralCode ? (
          <FanletterFollowButton
            className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-[#44f26e]/34 bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c] sm:w-auto sm:min-w-48"
            creatorReferralCode={creatorReferralCode}
            fallbackHref={followFallbackHref}
            locale={locale}
          />
        ) : null}
      </div>
    </section>
  );
}

function ArticleActionLinks({
  copy,
  locale,
  newsHomeHref,
  referralCode,
  shareHref,
  shareSummary,
  shareTitle,
  sourceVlogHref,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  newsHomeHref: string;
  referralCode: string | null;
  shareHref: string;
  shareSummary: string;
  shareTitle: string;
  sourceVlogHref: string;
}) {
  const actions = [
    {
      href: newsHomeHref,
      icon: <Newspaper className="size-4 text-[#16702e]" />,
      label: copy.articleActions.newsHome,
      secondaryOnMobile: true,
    },
    {
      href: sourceVlogHref,
      icon: <Clapperboard className="size-4 text-[#16702e]" />,
      label: copy.articleActions.sourceVlog,
      secondaryOnMobile: false,
    },
  ];

  return (
    <nav
      aria-label={copy.articleActions.label}
      className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 lg:mt-3 lg:gap-2"
    >
      {actions.map((action) => (
        <Link
          className={`min-h-11 items-center justify-center gap-2 border border-black/12 bg-[#f5f7f1] px-2.5 py-2 text-[0.82rem] font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex sm:justify-between sm:px-3 sm:text-sm lg:min-h-10 lg:py-1.5 ${
            action.secondaryOnMobile ? "hidden" : "inline-flex"
          }`}
          href={action.href}
          key={action.label}
        >
          <span className="inline-flex min-w-0 items-center justify-center gap-2 sm:justify-start">
            {action.icon}
            <span className="truncate">{action.label}</span>
          </span>
          <ArrowUpRight className="hidden size-4 shrink-0 text-black/42 sm:block" />
        </Link>
      ))}
      <FanletterChannelShareButton
        className="!h-auto min-h-11 !rounded-none !border-black/12 !bg-[#f5f7f1] px-2.5 py-2 text-[0.82rem] font-black !text-[#111510] hover:!border-[#19b84b] hover:!bg-[#ecfff0] sm:px-3 sm:text-sm lg:min-h-10 lg:py-1.5"
        href={shareHref}
        locale={locale}
        referralCode={referralCode}
        shareIdScope="newsreport"
        summary={shareSummary}
        title={shareTitle}
        trackingSource="fanletter-news-detail"
      />
    </nav>
  );
}

function ArticleTitleCharacterThumbnail({
  blurred,
  copy,
  creatorHref,
  creatorReferralCode,
  imageUrl,
  name,
}: {
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  creatorReferralCode: string | null;
  imageUrl: string | null;
  name: string | null;
}) {
  const displayName =
    name?.trim() || creatorReferralCode?.trim() || copy.titleCharacter.fallback;
  const shouldBypassImageOptimization = imageUrl
    ? shouldBypassFanletterImageOptimization(imageUrl)
    : false;

  return (
    <Link
      className="group grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] gap-2 rounded-md border border-black/10 bg-[#f7f9f4] p-2 !text-[#111510] shadow-none transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:grid-cols-[5.25rem_minmax(0,1fr)] sm:gap-3 sm:rounded-lg sm:p-2.5 sm:shadow-[0_14px_30px_rgba(17,21,16,0.055)] lg:grid-cols-[5.5rem_minmax(0,1fr)] lg:gap-3 lg:p-2.5"
      href={creatorHref}
    >
      <span className="relative block aspect-square overflow-hidden rounded-md bg-[#111510] sm:rounded-lg lg:w-full">
        {imageUrl ? (
          <>
            <Image
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg brightness-[0.48] saturate-[0.92]"
              fill
              sizes="(max-width: 640px) 3.75rem, (max-width: 1024px) 5.25rem, 13rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
            <Image
              alt={copy.titleCharacter.visualAlt(displayName)}
              className={`relative z-10 object-cover transition duration-300 group-hover:scale-[1.04] ${
                blurred ? "blur-sm brightness-[0.72] saturate-[0.82]" : ""
              }`}
              fill
              sizes="(max-width: 640px) 3.75rem, (max-width: 1024px) 5.25rem, 13rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
          </>
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_55%,#203426)]">
            <Newspaper className="size-6 text-[#44f26e] sm:size-8" />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 z-20 h-1 bg-[#44f26e]" />
      </span>
      <span className="flex min-w-0 flex-col justify-center">
        <span className="inline-flex w-fit items-center gap-1.5 border border-[#16702e]/20 bg-white px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#16702e] sm:text-[0.6rem] sm:tracking-[0.1em]">
          <BadgeCheck className="size-3" />
          {copy.titleCharacter.eyebrow}
        </span>
        <span className="mt-1.5 block truncate text-sm font-black leading-tight sm:mt-2 sm:text-base lg:text-base">
          {displayName}
        </span>
        {creatorReferralCode ? (
          <span className="mt-1 hidden truncate text-[0.68rem] font-bold text-black/44 sm:block">
            @{creatorReferralCode}
          </span>
        ) : null}
        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[0.68rem] font-black text-[#16702e] group-hover:underline sm:mt-2 sm:text-[0.72rem]">
          {copy.titleCharacter.cta}
          <ArrowUpRight className="size-3.5" />
        </span>
      </span>
    </Link>
  );
}

function ReporterByline({
  copy,
  publishedAt,
  report,
  reporterProfile,
  reporterNewsHref,
  reporterReportStats,
  reporterTrust,
  reporterTrustStats,
}: {
  copy: ReturnType<typeof getCopy>;
  publishedAt: string | null;
  report: FanletterNewsReportDocument;
  reporterProfile: FanletterNewsReporterProfile | null;
  reporterNewsHref: string;
  reporterReportStats: {
    paidUnlockPurchaseCount: number;
    paidUnlockRevenueUsdt: number;
    rewardPoints: number;
    sourceRevealUnlockContributionCount: number;
    sourceRevealVoteCount: number;
  };
  reporterTrust: FanletterNewsReporterTrustProfile;
  reporterTrustStats: {
    paidUnlockPurchaseCount: number;
    reportCount: number;
    sourceRevealUnlockContributionCount: number;
    sourceRevealVoteCount: number;
  };
}) {
  const reporterDisplayName =
    reporterProfile?.displayName ?? getReporterDisplayName(report);
  const reporterAvatarImageUrl =
    reporterProfile?.avatarImageUrl ?? report.reporterAvatarImageUrl ?? null;
  const reporterInitial =
    reporterDisplayName.trim().charAt(0).toUpperCase() ||
    report.reporterReferralCode.trim().charAt(0).toUpperCase() ||
    report.reporterName.trim().charAt(0).toUpperCase() ||
    "F";
  const trustLevelLabel = getReporterTrustLevelLabel(copy, reporterTrust.level);
  const nextTrustLabel = reporterTrust.nextLevel
    ? copy.reporterTrust.next(
        getReporterTrustLevelLabel(copy, reporterTrust.nextLevel),
        formatNumber(reporterTrust.pointsToNextLevel, report.locale),
      )
    : copy.reporterTrust.max;
  const trustStats = [
    {
      label: copy.reporterTrust.stats.reports,
      value: reporterTrustStats.reportCount,
    },
    {
      label: copy.reporterTrust.stats.votes,
      value: reporterTrustStats.sourceRevealVoteCount,
    },
    {
      label: copy.reporterTrust.stats.unlocks,
      value: reporterTrustStats.sourceRevealUnlockContributionCount,
    },
    {
      label: copy.reporterTrust.stats.paidPurchases,
      value: reporterTrustStats.paidUnlockPurchaseCount,
    },
  ];
  const partnerStats = [
    {
      label: copy.reporterTrust.stats.votes,
      value: formatNumber(reporterReportStats.sourceRevealVoteCount, report.locale),
    },
    {
      label: copy.reporterTrust.stats.unlocks,
      value: formatNumber(
        reporterReportStats.sourceRevealUnlockContributionCount,
        report.locale,
      ),
    },
    {
      label: copy.reporterPartner.paidPurchases,
      value: formatNumber(reporterReportStats.paidUnlockPurchaseCount, report.locale),
    },
    {
      label: copy.reporterPartner.attributedRevenue,
      value: formatUsdt(reporterReportStats.paidUnlockRevenueUsdt, report.locale),
    },
    {
      label: copy.reporterPartner.rewardPoints,
      value: formatNumber(reporterReportStats.rewardPoints, report.locale),
    },
  ];

  return (
    <section className="border-y border-black/10 py-2.5 sm:py-3 lg:py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-xs font-black text-[#44f26e] sm:size-10 sm:text-sm">
            {reporterAvatarImageUrl ? (
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover"
                fill
                sizes="(max-width: 640px) 2.5rem, 2.75rem"
                src={reporterAvatarImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(
                  reporterAvatarImageUrl,
                )}
              />
            ) : (
              reporterInitial
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="shrink-0 text-[0.68rem] font-bold text-black/42">
                {copy.byline}
              </p>
              <p className="truncate text-sm font-black text-[#111510]">
                {reporterDisplayName}
              </p>
              <span className="hidden text-[0.68rem] font-bold text-[#16702e] sm:inline">
                {trustLevelLabel}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] font-semibold text-black/46">
              {publishedAt ? (
                <span>
                  {copy.publishedLabel} {publishedAt}
                </span>
              ) : null}
              <span aria-hidden="true" className="text-black/22">
                ·
              </span>
              <span className="hidden sm:inline">{copy.generated}</span>
              <span aria-hidden="true" className="hidden text-black/22 sm:inline">
                ·
              </span>
              <span className="hidden sm:inline">
                {copy.reporterTrust.label}{" "}
                {copy.reporterTrust.score(
                  formatNumber(reporterTrust.score, report.locale),
                )}
              </span>
            </div>
          </div>
        </div>
        <Link
          className="hidden h-9 shrink-0 items-center justify-center border border-black/14 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex"
          href={reporterNewsHref}
        >
          {copy.reporterNewsCta}
        </Link>
      </div>

      <details className="group mt-2 hidden sm:block lg:mt-1.5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-black/10 bg-[#f7f9f4] px-3 py-2 text-xs font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] lg:py-1.5 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex min-w-0 items-center gap-2">
            <ShieldCheck className="size-3.5 shrink-0 text-[#16702e]" />
            <span className="truncate">{copy.reporterTrust.summaryCta}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-black/42 transition group-open:rotate-180" />
        </summary>

        <div className="mt-2 grid gap-2 rounded-lg border border-[#16702e]/16 bg-[#f6f8f4] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.74fr)] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#111510] px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-white">
                <ShieldCheck className="size-3.5 text-[#44f26e]" />
                {trustLevelLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#16702e]">
                <TrendingUp className="size-3.5" />
                {copy.reporterTrust.label}{" "}
                {copy.reporterTrust.score(
                  formatNumber(reporterTrust.score, report.locale),
                )}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/8">
              <div
                className="h-full rounded-full bg-[#19b84b]"
                style={{ width: `${reporterTrust.progressPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.72rem] font-semibold leading-5 text-black/48">
              {copy.reporterTrust.basis} · {nextTrustLabel}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {trustStats.map((stat) => (
              <div
                className="rounded-md border border-black/8 bg-white px-2 py-1.5"
                key={stat.label}
              >
                <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.06em] text-black/36">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-sm font-black text-[#111510]">
                  {formatNumber(stat.value, report.locale)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 grid gap-2 rounded-lg border border-[#44f26e]/18 bg-[#111510] p-3 text-white sm:grid-cols-[minmax(0,1fr)_minmax(17rem,0.82fr)] sm:items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              <Coins className="size-3.5" />
              {copy.reporterPartner.eyebrow}
            </p>
            <h3 className="mt-1.5 text-base font-black leading-tight [word-break:keep-all]">
              {copy.reporterPartner.title}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {partnerStats.map((stat, index) => (
              <div
                className={`rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-2 ${
                  index === partnerStats.length - 1 ? "col-span-2" : ""
                }`}
                key={stat.label}
              >
                <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.06em] text-white/38">
                  {stat.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-black text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function ViewerOwnershipStatus({
  copy,
  signals,
}: {
  copy: ReturnType<typeof getCopy>;
  signals: ViewerOwnershipSignal[];
}) {
  const ownedSignals = signals.filter((signal) => signal.owned);

  if (ownedSignals.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#44f26e]/22 bg-[#ecfff0] px-3 py-2 text-xs font-black text-[#111510]">
      <span className="inline-flex items-center gap-1.5 text-[#16702e]">
        <ShieldCheck className="size-3.5" />
        {copy.viewerOwnership.title}
      </span>
      {ownedSignals.map((signal) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-[#19b84b]/28 bg-white px-2.5 py-1 text-[0.68rem] text-[#16702e]"
          key={signal.key}
        >
          <CheckCircle2 className="size-3.5" />
          {signal.label} {copy.viewerOwnership.verified}
        </span>
      ))}
    </section>
  );
}

function SourceVlogRevealTeaserOverlay({
  blurred,
  connectHref,
  contentId,
  frames,
  layout = "overlay",
  locale,
  paidAmountLabel,
  presentation = "fill",
  referralCode,
  reportId,
  sourceAccessKind,
  sourceReveal,
}: {
  blurred: boolean;
  connectHref: string;
  contentId: string | null;
  frames: SourceVlogSceneFrame[];
  layout?: "overlay" | "sideRail";
  locale: Locale;
  paidAmountLabel: string;
  presentation?: "fill" | "flow";
  referralCode: string | null;
  reportId: string;
  sourceAccessKind: SourceVlogAccessKind;
  sourceReveal: FanletterNewsSourceRevealState;
}) {
  const copy = getSourceVlogRevealTeaserCopy(locale);
  const teaserFrames = frames.slice(0, 3);
  const hasTeaserFrames = teaserFrames.length > 0;
  const isSideRail = layout === "sideRail";
  const isFlow = presentation === "flow";
  const teaserGridClass =
    teaserFrames.length >= 3
      ? "grid-cols-3"
      : teaserFrames.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";
  const rootClassName = isSideRail
    ? "absolute inset-0 overflow-y-auto bg-[#07100b] p-3 text-white sm:p-4"
    : isFlow
      ? "relative bg-[#07100b] p-3 text-white shadow-[inset_0_16px_28px_rgba(0,0,0,0.28)] sm:p-5"
    : hasTeaserFrames
      ? "absolute inset-0 isolate overflow-y-auto bg-[#07100b] p-3 text-white shadow-[inset_0_16px_28px_rgba(0,0,0,0.28)] sm:overflow-hidden sm:p-5"
      : "absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.34)_45%,rgba(0,0,0,0.88)_100%)] p-3 text-white sm:p-5";
  const contentClassName = hasTeaserFrames
    ? isSideRail
      ? "mx-auto flex min-h-full w-full max-w-[24rem] flex-col justify-center gap-3"
      : isFlow
        ? "mx-auto flex w-full max-w-4xl flex-col gap-4"
      : "mx-auto flex min-h-full w-full max-w-4xl flex-col gap-3 sm:grid sm:h-full sm:min-h-0 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] sm:items-center"
    : isSideRail
      ? "flex min-h-full w-full items-center justify-center"
      : isFlow
        ? "flex w-full justify-center"
      : "flex h-full min-h-0 w-full items-center justify-center";
  const teaserColumnClassName = isSideRail
    ? "flex min-h-0 flex-col gap-2"
    : "flex flex-col gap-2 sm:h-full sm:min-h-0 sm:justify-center sm:gap-3";
  const teaserHeaderClassName = isSideRail
    ? "flex flex-col gap-1"
    : "mb-2 flex items-center justify-between gap-2";
  const teaserTitleClassName = isSideRail
    ? "mt-0.5 text-base font-black leading-tight [word-break:keep-all]"
    : "mt-1 text-lg font-black leading-tight [word-break:keep-all] sm:text-2xl";
  const teaserMetaClassName = isSideRail
    ? "inline-flex w-fit rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-[0.58rem] font-black text-white/72"
    : "hidden shrink-0 rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-[0.62rem] font-black text-white/78 sm:inline-flex";
  const teaserFramesClassName = isSideRail
    ? `grid ${teaserGridClass} gap-1.5`
    : `grid ${teaserGridClass} gap-1.5 sm:min-h-0 sm:flex-1 sm:gap-2`;
  const voteClassName = isSideRail
    ? "w-full border-white/10 bg-white/[0.05] shadow-none"
    : hasTeaserFrames
      ? "w-full"
      : "w-full max-w-[31rem]";

  return (
    <div className={rootClassName}>
      <div className={contentClassName}>
        {hasTeaserFrames ? (
          <div className={teaserColumnClassName}>
            <div className={teaserHeaderClassName}>
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
                  {copy.eyebrow}
                </p>
                <h3 className={teaserTitleClassName}>
                  {copy.title}
                </h3>
              </div>
              <span className={teaserMetaClassName}>
                {copy.meta}
              </span>
            </div>
            <div className={teaserFramesClassName}>
              {teaserFrames.map((frame, index) => {
                const imageUrl = frame.imageUrl;
                const isPrimary = index === 0;
                const timeLabel = formatSourceVlogFrameTime(
                  frame.timestampSec,
                  locale,
                );
                const frameClassName = isSideRail
                  ? isPrimary
                    ? "relative h-20 overflow-hidden rounded-md border border-[#44f26e]/60 bg-black shadow-[0_12px_24px_rgba(68,242,110,0.18)] sm:h-24"
                    : "relative h-20 overflow-hidden rounded-md border border-white/16 bg-black shadow-[0_10px_20px_rgba(0,0,0,0.18)] sm:h-24"
                  : isPrimary
                    ? "relative aspect-[9/16] min-h-0 overflow-hidden rounded-lg border border-[#44f26e]/60 bg-black shadow-[0_18px_45px_rgba(68,242,110,0.22)] sm:h-full sm:min-h-[7rem] sm:aspect-auto"
                    : "relative aspect-[9/16] min-h-0 overflow-hidden rounded-lg border border-white/16 bg-black shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:h-full sm:min-h-[7rem] sm:aspect-auto";

                return (
                  <div
                    className={frameClassName}
                    key={`${imageUrl}-${index}`}
                  >
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={
                        blurred
                          ? "scale-[1.04] object-cover blur-sm brightness-[0.74] saturate-[0.9]"
                          : "object-cover"
                      }
                      fill
                      sizes={
                        isSideRail
                          ? "(max-width: 1024px) 8rem, 9rem"
                          : isPrimary
                          ? "(max-width: 640px) 54vw, 28rem"
                          : "(max-width: 640px) 38vw, 14rem"
                      }
                      src={imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-transparent to-black/10" />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/62 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/82">
                      {timeLabel
                        ? `${String(index + 1).padStart(2, "0")} · ${timeLabel}`
                        : String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <FanletterNewsSourceRevealVote
          className={voteClassName}
          connectHref={connectHref}
          contentId={contentId}
          density="compact"
          initialState={sourceReveal}
          locale={locale}
          paidAmountLabel={paidAmountLabel}
          referralCode={referralCode}
          reportId={reportId}
          sourceAccessKind={sourceAccessKind}
          trackingSource="fanletter-news-detail-source-teaser"
        />
      </div>
    </div>
  );
}

function SourceVlogPaidTeaserOverlay({
  blurred,
  copy,
  frames,
  locale,
  paidUnlockHref,
  paidUnlockLabel,
  showPaidUnlockCta,
}: {
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  frames: SourceVlogSceneFrame[];
  locale: Locale;
  paidUnlockHref: string;
  paidUnlockLabel: string;
  showPaidUnlockCta: boolean;
}) {
  const paidTeaserCopy =
    locale === "ko"
      ? {
          eyebrow: "원본 티저 컷",
          meta: "팬 전용 티저",
          title: "결제 전, 분위기를 먼저 확인하세요",
        }
      : {
          eyebrow: "Source teaser cuts",
          meta: "Fan-only teaser",
          title: "Preview the mood before unlocking",
        };
  const teaserFrames = frames.slice(0, 3);
  const teaserGridClass =
    teaserFrames.length >= 3
      ? "grid-cols-3"
      : teaserFrames.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";
  const hasTeaserFrames = teaserFrames.length > 0;
  const unlockCard = (
    <div className="rounded-xl border border-white/14 bg-black/68 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur sm:p-4 lg:p-5">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-black">
          {paidUnlockLabel}
        </span>
        <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/72">
          {copy.embeddedUnlockMeta}
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-black leading-tight lg:text-[1.85rem]">
        {copy.embeddedUnlockTitle}
      </h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
        {copy.embeddedUnlockBody}
      </p>
      {showPaidUnlockCta ? (
        <FanletterPaidUnlockTrigger
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
          href={paidUnlockHref}
        >
          <Coins className="size-4" />
          <span>
            {paidUnlockLabel} {copy.embeddedUnlockCta}
          </span>
        </FanletterPaidUnlockTrigger>
      ) : (
        <p className="mt-4 rounded-lg border border-white/14 bg-white/10 px-3 py-2 text-sm font-semibold leading-6 text-white/72">
          {copy.nsfwBlurNotice}
        </p>
      )}
    </div>
  );

  return (
    <div
      className={
        hasTeaserFrames
          ? "absolute inset-0 isolate overflow-y-auto bg-[#07100b] p-3 text-white sm:overflow-hidden sm:p-5"
          : "absolute inset-0 flex items-end justify-center bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.2)_48%,rgba(0,0,0,0.86)_100%)] p-3 text-white sm:p-5 lg:p-8"
      }
    >
      {hasTeaserFrames ? (
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-3 sm:grid sm:h-full sm:min-h-0 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] sm:items-center">
          <div className="flex flex-col gap-2 sm:h-full sm:min-h-0 sm:justify-center sm:gap-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
                  {paidTeaserCopy.eyebrow}
                </p>
                <h3 className="mt-1 text-lg font-black leading-tight [word-break:keep-all] sm:text-2xl">
                  {paidTeaserCopy.title}
                </h3>
              </div>
              <span className="hidden shrink-0 rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-[0.62rem] font-black text-white/78 sm:inline-flex">
                {paidTeaserCopy.meta}
              </span>
            </div>
            <div
              className={`grid ${teaserGridClass} gap-1.5 sm:min-h-0 sm:flex-1 sm:gap-2`}
            >
              {teaserFrames.map((frame, index) => {
                const imageUrl = frame.imageUrl;
                const isPrimary = index === 0;
                const timeLabel = formatSourceVlogFrameTime(
                  frame.timestampSec,
                  locale,
                );

                return (
                  <div
                    className={
                      isPrimary
                        ? "relative aspect-[9/16] min-h-0 overflow-hidden rounded-lg border border-[#44f26e]/60 bg-black shadow-[0_18px_45px_rgba(68,242,110,0.22)] sm:h-full sm:min-h-[7rem] sm:aspect-auto"
                        : "relative aspect-[9/16] min-h-0 overflow-hidden rounded-lg border border-white/16 bg-black shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:h-full sm:min-h-[7rem] sm:aspect-auto"
                    }
                    key={`${imageUrl}-${index}`}
                  >
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={
                        blurred
                          ? "scale-[1.04] object-cover blur-sm brightness-[0.74] saturate-[0.9]"
                          : "object-cover"
                      }
                      fill
                      sizes={
                        isPrimary
                          ? "(max-width: 640px) 54vw, 28rem"
                          : "(max-width: 640px) 38vw, 14rem"
                      }
                      src={imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-transparent to-black/10" />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/62 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/82">
                      {timeLabel
                        ? `${String(index + 1).padStart(2, "0")} · ${timeLabel}`
                        : String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {unlockCard}
        </div>
      ) : (
        <div className="mb-2 w-full max-w-[39rem] sm:mb-4 lg:mb-6">
          {unlockCard}
        </div>
      )}
    </div>
  );
}

function SourceVlogUnlockedTeaserGallery({
  blurred,
  copy,
  frames,
  locale,
  nsfwPinGate,
}: {
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  frames: SourceVlogSceneFrame[];
  locale: Locale;
  nsfwPinGate?: {
    connectHref?: string | null;
    enabled: boolean;
    managePinHref: string;
    title: string;
  };
}) {
  if (frames.length < 2) {
    return null;
  }

  const items = frames.map((frame, index) => {
    const itemNumber = formatNumber(index + 1, locale);

    return {
      imageUrl: frame.imageUrl,
      label: copy.sourceTeaserGallery.itemLabel(itemNumber),
      timeLabel: formatSourceVlogFrameTime(frame.timestampSec, locale),
    };
  });

  return (
    <FanletterNewsSourceSceneGallery
      blurred={blurred}
      copy={{
        body: copy.sourceTeaserGallery.body,
        close: copy.sourceTeaserGallery.close,
        eyebrow: copy.sourceTeaserGallery.eyebrow,
        next: copy.sourceTeaserGallery.next,
        openViewer: copy.sourceTeaserGallery.openViewer,
        pinProtectedBody: copy.sourceTeaserGallery.pinProtectedBody,
        pinProtectedTitle: copy.sourceTeaserGallery.pinProtectedTitle,
        previous: copy.sourceTeaserGallery.previous,
        title: copy.sourceTeaserGallery.title,
      }}
      items={items}
      locale={locale}
      nsfwPinGate={nsfwPinGate}
    />
  );
}

function getUniqueTrimmedImageUrls(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter(Boolean),
    ),
  ];
}

function getReporterEditedTeaserImageUrls(report: FanletterNewsReportDocument) {
  return getUniqueTrimmedImageUrls(
    (report.teaserImages ?? [])
      .filter(
        (image) =>
          image.source === "reporter_cropped" &&
          image.crop &&
          image.imageUrl.trim() &&
          image.imageUrl.trim() !== image.sourceImageUrl.trim(),
      )
      .map((image) => image.imageUrl),
  );
}

function getPublicTeaserImageUrls(report: FanletterNewsReportDocument) {
  return getUniqueTrimmedImageUrls([
    ...(report.teaserImages ?? [])
      .filter((image) => image.source !== "reporter_cropped")
      .map((image) => image.imageUrl),
    ...(report.teaserImageUrls ?? []),
    report.coverImageUrl,
  ]);
}

function ReporterTeaserCutGallery({
  accessLabel,
  blurred,
  copy,
  editHref,
  locale,
  publishedAt,
  report,
  reporterProfile,
  shouldShowTeaserCuts,
  sourceContent,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  editHref: string | null;
  locale: Locale;
  publishedAt: string | null;
  report: FanletterNewsReportDocument;
  reporterProfile: FanletterNewsReporterProfile | null;
  shouldShowTeaserCuts: boolean;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const reporterDisplayName =
    reporterProfile?.displayName ?? getReporterDisplayName(report);
  const reporterAvatarImageUrl =
    reporterProfile?.avatarImageUrl ?? report.reporterAvatarImageUrl ?? null;
  const reporterInitial =
    reporterDisplayName.trim().charAt(0).toUpperCase() ||
    report.reporterReferralCode.trim().charAt(0).toUpperCase() ||
    report.reporterName.trim().charAt(0).toUpperCase() ||
    "F";
  const reporterEditedImageUrls = getReporterEditedTeaserImageUrls(report);
  const selectedPublicImageUrls = getPublicTeaserImageUrls(report);
  const featuredImageUrl =
    report.coverImageUrl ??
    selectedPublicImageUrls[0] ??
    sourceContent?.coverImageUrl ??
    sourceContent?.authorAvatarImageUrl ??
    null;
  const fallbackCutImageUrls = selectedPublicImageUrls.filter(
    (imageUrl) => imageUrl !== featuredImageUrl,
  );
  const shouldUseEditedCuts = reporterEditedImageUrls.length > 0;
  const visibleCutImageUrls = (
    shouldUseEditedCuts
      ? reporterEditedImageUrls
      : shouldShowTeaserCuts
        ? fallbackCutImageUrls
        : []
  ).slice(0, 4);
  const hasSelectedFallback =
    shouldShowTeaserCuts &&
    !shouldUseEditedCuts &&
    selectedPublicImageUrls.length > 0;
  const galleryTitle = shouldUseEditedCuts
    ? copy.reportTeaserGallery.title
    : hasSelectedFallback
      ? copy.reportTeaserGallery.selectedTitle
      : copy.reportTeaserGallery.fallbackTitle;
  const galleryBody = shouldUseEditedCuts
    ? copy.reportTeaserGallery.body
    : hasSelectedFallback
      ? copy.reportTeaserGallery.selectedBody
      : copy.reportTeaserGallery.fallbackBody;
  const itemLabel = shouldUseEditedCuts
    ? copy.reportTeaserGallery.itemLabel
    : copy.reportTeaserGallery.selectedItemLabel;
  const teaserItems = visibleCutImageUrls.map((imageUrl, index) => {
    const itemNumber = formatNumber(index + 1, locale);

    return {
      imageUrl,
      label: itemLabel(itemNumber),
      timeLabel: null,
    };
  });

  if (!featuredImageUrl && teaserItems.length === 0 && !editHref) {
    return null;
  }

  return (
    <>
      {editHref ? (
        <section className="mt-3 border border-[#19b84b]/22 bg-[#ecfff0] p-3 shadow-[0_14px_34px_rgba(25,184,75,0.08)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#111510] px-3 py-1.5 text-xs font-black text-[#44f26e]">
                <ShieldCheck className="size-3.5" />
                {copy.reportTeaserGallery.editEyebrow}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-black/62">
                {copy.reportTeaserGallery.editBody}
              </p>
            </div>
            <Link
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black sm:w-auto"
              href={editHref}
            >
              {copy.reportTeaserGallery.editCta}
              <ArrowUpRight className="size-4 text-[#44f26e]" />
            </Link>
          </div>
        </section>
      ) : null}

      {featuredImageUrl || teaserItems.length > 0 ? (
        <FanletterNewsSourceSceneGallery
          key={`${featuredImageUrl ?? "no-lead"}|${teaserItems
            .map((item) => item.imageUrl)
            .join("|")}`}
          blurred={blurred}
          copy={{
            body:
              !shouldUseEditedCuts &&
              (featuredImageUrl || teaserItems.length === 0)
                ? copy.reportTeaserGallery.leadBody
                : galleryBody,
            close: copy.sourceTeaserGallery.close,
            eyebrow: copy.reportTeaserGallery.eyebrow,
            next: copy.sourceTeaserGallery.next,
            openViewer: copy.sourceTeaserGallery.openViewer,
            pinProtectedBody: copy.sourceTeaserGallery.pinProtectedBody,
            pinProtectedTitle: copy.sourceTeaserGallery.pinProtectedTitle,
            previous: copy.sourceTeaserGallery.previous,
            title: galleryTitle,
          }}
          density="compact"
          featuredItem={
            !shouldUseEditedCuts && featuredImageUrl
              ? {
                  alt: report.title,
                  badges: [copy.visualLead, accessLabel],
                  blurNotice: copy.nsfwBlurNotice,
                  imageUrl: featuredImageUrl,
                }
              : null
          }
          items={teaserItems}
          layout="grid"
          locale={locale}
          presentation={shouldUseEditedCuts ? "reporterTeaser" : "default"}
          reporterMeta={{
            avatarImageUrl: reporterAvatarImageUrl,
            initial: reporterInitial,
            name: reporterDisplayName,
            publishedAt,
            publishedLabel: copy.publishedLabel,
            roleLabel: copy.byline,
          }}
        />
      ) : null}
    </>
  );
}

function normalizeOptionalVideoUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function resolveSourceVlogPreviewVideoUrl(
  sourceContent: FanletterPublicContentDetail | null,
  fallbackVideoUrl: string | null,
) {
  return (
    normalizeOptionalVideoUrl(sourceContent?.sourcePreviewVideoUrl) ??
    normalizeOptionalVideoUrl(fallbackVideoUrl)
  );
}

function SourceVlogReportSlotStatusCard({
  copy,
  locale,
  reportSlot,
  sourceReveal,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  reportSlot: SourceVlogReportSlotState;
  sourceReveal: SourceVlogRevealGateState | null;
}) {
  const normalizedLimit = Math.max(1, reportSlot.limit);
  const clampedCount = Math.min(Math.max(0, reportSlot.count), normalizedLimit);
  const remainingCount = Math.max(0, normalizedLimit - reportSlot.count);
  const countLabel = formatNumber(clampedCount, locale);
  const totalCountLabel = formatNumber(reportSlot.count, locale);
  const limitLabel = formatNumber(normalizedLimit, locale);
  const remainingLabel = formatNumber(remainingCount, locale);
  const reportSlotFull = reportSlot.count >= normalizedLimit;
  const progressPercent = Math.min(
    100,
    Math.max(0, (clampedCount / normalizedLimit) * 100),
  );
  const stageLabel =
    reportSlot.count <= 0
      ? copy.embeddedReportSlot.firstOpportunity
      : reportSlotFull
        ? copy.embeddedReportSlot.full
        : reportSlot.count <= 2
          ? copy.embeddedReportSlot.early
          : copy.embeddedReportSlot.rising;
  const viewerHasReport = Boolean(reportSlot.viewerReportHref);
  const isReporterContext = Boolean(reportSlot.isViewerReporter || viewerHasReport);
  const body =
    !viewerHasReport
      ? copy.embeddedReportSlot.readerBody
      : reportSlot.count <= 0
        ? copy.embeddedReportSlot.emptyBody
        : reportSlotFull
          ? copy.embeddedReportSlot.fullBody
          : copy.embeddedReportSlot.body(remainingLabel);
  const detailsSummary = isReporterContext
    ? copy.embeddedReportSlot.reporterDetailsSummary
    : copy.embeddedReportSlot.readerDetailsSummary;
  const cta = viewerHasReport
    ? null
    : reportSlot.isViewerReporter
      ? reportSlotFull
        ? {
            href: reportSlot.browseHref,
            icon: Newspaper,
            label: copy.embeddedReportSlot.browseCta,
          }
        : {
            href: reportSlot.writeHref,
            icon: FileText,
            label: copy.embeddedReportSlot.writeCta,
          }
      : {
          href: reportSlot.connectHref,
          icon: Users,
          label: copy.embeddedReportSlot.connectCta,
        };
  const CtaIcon = cta?.icon;
  const visibleReports = reportSlot.reports.slice(0, normalizedLimit);
  const hiddenReportCount = Math.max(0, reportSlot.count - visibleReports.length);
  const revealThreshold = sourceReveal ? Math.max(1, sourceReveal.threshold) : 0;
  const revealCount = sourceReveal
    ? Math.min(Math.max(0, sourceReveal.count), revealThreshold)
    : 0;
  const revealRemainingCount = sourceReveal
    ? Math.max(0, revealThreshold - sourceReveal.count)
    : 0;
  const revealProgressPercent = sourceReveal
    ? Math.min(100, Math.max(0, (revealCount / revealThreshold) * 100))
    : 0;
  const revealCountLabel = formatNumber(revealCount, locale);
  const revealThresholdLabel = formatNumber(revealThreshold, locale);
  const revealRemainingLabel = formatNumber(revealRemainingCount, locale);
  const revealMomentumStage = sourceReveal?.unlocked
    ? {
        body: copy.embeddedReportSlot.revealMomentum.unlockedBody,
        label: copy.embeddedReportSlot.revealMomentum.unlockedLabel,
        title: copy.embeddedReportSlot.revealMomentum.unlockedTitle,
      }
    : revealProgressPercent >= 72
      ? {
          body: copy.embeddedReportSlot.revealMomentum.closingBody(
            revealRemainingLabel,
          ),
          label: copy.embeddedReportSlot.revealMomentum.closingLabel,
          title: copy.embeddedReportSlot.revealMomentum.title(
            revealCountLabel,
            revealThresholdLabel,
          ),
        }
      : revealProgressPercent >= 34
        ? {
            body: copy.embeddedReportSlot.revealMomentum.risingBody(
              revealRemainingLabel,
            ),
            label: copy.embeddedReportSlot.revealMomentum.risingLabel,
            title: copy.embeddedReportSlot.revealMomentum.title(
              revealCountLabel,
              revealThresholdLabel,
            ),
          }
        : {
            body: copy.embeddedReportSlot.revealMomentum.earlyBody(
              revealRemainingLabel,
            ),
            label: copy.embeddedReportSlot.revealMomentum.earlyLabel,
            title: copy.embeddedReportSlot.revealMomentum.title(
              revealCountLabel,
              revealThresholdLabel,
            ),
          };
  const revealMomentumPanelClass =
    sourceReveal?.unlocked || revealProgressPercent >= 72
      ? "border-[#44f26e]/44 bg-[#07150b] text-white shadow-[0_18px_34px_rgba(7,21,11,0.2)]"
      : "border-[#16702e]/18 bg-white text-[#111510] shadow-[0_12px_28px_rgba(22,112,46,0.08)]";

  return (
    <div className="mb-4 rounded-lg border border-[#19b84b]/30 bg-[linear-gradient(180deg,#f7fff8_0%,#eefbf1_100%)] p-4 shadow-[0_16px_38px_rgba(22,112,46,0.12)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#07150b] text-[#44f26e]">
          {reportSlotFull ? (
            <CheckCircle2 className="size-4.5" />
          ) : (
            <Newspaper className="size-4.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.7rem] font-black text-[#16702e]">
              {copy.embeddedReportSlot.eyebrow}
            </p>
            <span className="inline-flex rounded-full border border-[#16702e]/16 bg-white px-2 py-0.5 text-[0.62rem] font-black text-[#16702e]">
              {stageLabel}
            </span>
          </div>
          <h3 className="mt-1 text-xl font-black leading-tight text-[#111510] [word-break:keep-all] sm:text-2xl">
            {copy.embeddedReportSlot.title(totalCountLabel, limitLabel)}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/62 [word-break:keep-all] sm:text-base">
            {body}
          </p>
        </div>
      </div>

      <details className="group mt-4 border-t border-[#16702e]/14 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-[#16702e]/12 bg-white/72 px-3 py-3 text-sm font-black text-[#111510] transition hover:bg-white [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 [word-break:keep-all]">
            {detailsSummary}
          </span>
          <ChevronDown className="size-4 shrink-0 text-[#16702e] transition-transform group-open:rotate-180" />
        </summary>

      {sourceReveal ? (
        <div
          className={`mt-4 rounded-lg border p-3 ${revealMomentumPanelClass}`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                sourceReveal.unlocked || revealProgressPercent >= 72
                  ? "bg-[#44f26e] text-[#07150b]"
                  : "bg-[#07150b] text-[#44f26e]"
              }`}
            >
              <HeartHandshake className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`text-[0.66rem] font-black uppercase tracking-[0.08em] ${
                    sourceReveal.unlocked || revealProgressPercent >= 72
                      ? "text-[#9dffb2]"
                      : "text-[#16702e]"
                  }`}
                >
                  {copy.embeddedReportSlot.revealMomentum.label}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-black ${
                    sourceReveal.unlocked || revealProgressPercent >= 72
                      ? "border-white/16 bg-white/[0.08] text-white"
                      : "border-[#16702e]/14 bg-[#ecfff0] text-[#16702e]"
                  }`}
                >
                  {revealMomentumStage.label}
                </span>
              </div>
              <h4 className="mt-1 text-lg font-black leading-tight [word-break:keep-all]">
                {revealMomentumStage.title}
              </h4>
              <p
                className={`mt-2 text-sm font-semibold leading-6 [word-break:keep-all] ${
                  sourceReveal.unlocked || revealProgressPercent >= 72
                    ? "text-white/70"
                    : "text-black/62"
                }`}
              >
                {revealMomentumStage.body}
              </p>
            </div>
          </div>
          <div
            aria-label={copy.embeddedReportSlot.revealMomentum.title(
              revealCountLabel,
              revealThresholdLabel,
            )}
            aria-valuemax={revealThreshold}
            aria-valuemin={0}
            aria-valuenow={revealCount}
            className={`mt-3 h-2 overflow-hidden rounded-full ${
              sourceReveal.unlocked || revealProgressPercent >= 72
                ? "bg-white/14"
                : "bg-[#dfeee2]"
            }`}
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[#44f26e] transition-[width]"
              style={{ width: `${revealProgressPercent}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              {
                label: copy.embeddedReportSlot.revealMomentum.statParticipation,
                value: `${revealCountLabel}/${revealThresholdLabel}`,
              },
              {
                label: copy.embeddedReportSlot.revealMomentum.statRemaining,
                value: sourceReveal.unlocked
                  ? copy.embeddedReportSlot.revealMomentum.unlockedLabel
                  : copy.embeddedReportSlot.revealMomentum.remainingPeople(
                      revealRemainingLabel,
                    ),
              },
              {
                label: copy.embeddedReportSlot.revealMomentum.statReportSlots,
                value: copy.embeddedReportSlot.remainingShort(remainingLabel),
              },
            ].map((stat) => (
              <div
                className={`min-w-0 rounded-md border px-2 py-2 text-center ${
                  sourceReveal.unlocked || revealProgressPercent >= 72
                    ? "border-white/10 bg-white/[0.06]"
                    : "border-[#16702e]/10 bg-[#f8fff9]"
                }`}
                key={stat.label}
              >
                <p
                  className={`truncate text-[0.56rem] font-black uppercase tracking-[0.06em] ${
                    sourceReveal.unlocked || revealProgressPercent >= 72
                      ? "text-[#9dffb2]"
                      : "text-[#16702e]"
                  }`}
                >
                  {stat.label}
                </p>
                <p className="mt-0.5 truncate text-[0.72rem] font-black sm:text-xs">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div
          aria-label={copy.embeddedReportSlot.countLabel(
            countLabel,
            limitLabel,
          )}
          aria-valuemax={normalizedLimit}
          aria-valuemin={0}
          aria-valuenow={clampedCount}
          className="h-2 overflow-hidden rounded-full bg-[#dfeee2]"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-[#44f26e] transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-black text-black/46">
          <span>
            {copy.embeddedReportSlot.countLabel(countLabel, limitLabel)}
          </span>
          <span className={reportSlotFull ? "text-[#16702e]" : ""}>
            {reportSlotFull
              ? copy.embeddedReportSlot.full
              : copy.embeddedReportSlot.remainingShort(remainingLabel)}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#07150b]/10 bg-[#07150b] p-3 text-white shadow-[0_14px_28px_rgba(7,21,11,0.18)]">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#07150b]">
            <TrendingUp className="size-3.5" />
          </span>
          <p className="text-[0.72rem] font-black uppercase tracking-[0.1em] text-[#9dffb2]">
            {copy.embeddedReportSlot.growthLoopLabel}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {copy.embeddedReportSlot.growthLoopSteps.map((step, index) => (
            <div
              className="min-w-0 rounded-md border border-white/10 bg-white/[0.06] px-2 py-2 text-center"
              key={step}
            >
              <p className="text-[0.56rem] font-black text-[#44f26e]">
                0{index + 1}
              </p>
              <p className="mt-0.5 truncate text-[0.68rem] font-black sm:text-xs">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-[#16702e]/12 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
            {copy.embeddedReportSlot.reporterLabel}
          </p>
          {visibleReports.length > 0 ? (
            <div className="mt-2 flex min-w-0 items-center gap-3">
              <div className="flex shrink-0 -space-x-2">
                {visibleReports.map((slotReport) => {
                  const initial =
                    slotReport.reporterName.trim().charAt(0).toUpperCase() ||
                    slotReport.reporterReferralCode
                      .trim()
                      .charAt(0)
                      .toUpperCase() ||
                    "R";

                  return (
                    <Link
                      aria-label={slotReport.reporterName}
                      className={`relative inline-flex size-9 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-black shadow-[0_8px_18px_rgba(17,21,16,0.12)] ${
                        slotReport.isViewerReport
                          ? "border-[#44f26e] bg-[#111510] text-[#44f26e]"
                          : "border-white bg-[#111510] text-white"
                      }`}
                      href={slotReport.href}
                      key={slotReport.reportId}
                    >
                      {slotReport.avatarImageUrl ? (
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="object-cover"
                          fill
                          sizes="2.25rem"
                          src={slotReport.avatarImageUrl}
                          unoptimized={shouldBypassFanletterImageOptimization(
                            slotReport.avatarImageUrl,
                          )}
                        />
                      ) : (
                        initial
                      )}
                    </Link>
                  );
                })}
                {hiddenReportCount > 0 ? (
                  <span className="inline-flex size-9 items-center justify-center rounded-full border-2 border-white bg-[#ecfff0] text-xs font-black text-[#16702e] shadow-[0_8px_18px_rgba(17,21,16,0.1)]">
                    +{formatNumber(hiddenReportCount, locale)}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#111510]">
                  {visibleReports[0]?.reporterName ??
                    copy.embeddedReportSlot.leadReporter}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-black/46">
                  {copy.embeddedReportSlot.publishedBadge}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-black/52">
              {copy.embeddedReportSlot.firstOpportunity}
            </p>
          )}
        </div>
        {viewerHasReport ? (
          <div className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#16702e]/16 bg-[#ecfff0] px-4 text-center text-sm font-black text-[#16702e] sm:w-auto">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="[word-break:keep-all]">
              {copy.embeddedReportSlot.viewerReportNotice}
            </span>
          </div>
        ) : cta && CtaIcon ? (
          <Link
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-[#243026] sm:w-auto"
            href={cta.href}
          >
            <CtaIcon className="size-4 text-[#44f26e]" />
            {cta.label}
          </Link>
        ) : null}
      </div>
      </details>
    </div>
  );
}

function SourceVlogEmbed({
  accessLabel,
  blurred,
  copy,
  isPaidContent,
  isViewerLoggedIn,
  locale,
  newsConnectHref,
  paidUnlockHref,
  pinUnlockHref,
  referralCode,
  reportSlot,
  reportCoverImageSource,
  priceUsdt,
  reportCoverImageUrl,
  sourceMaturityRating,
  sourceReveal,
  sourceRevealEndpoint,
  sourceContent,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  isPaidContent: boolean;
  isViewerLoggedIn: boolean;
  locale: Locale;
  newsConnectHref: string;
  paidUnlockHref: string | null;
  pinUnlockHref: string;
  referralCode: string | null;
  reportSlot: SourceVlogReportSlotState;
  reportCoverImageSource?: FanletterNewsReportDocument["coverImageSource"];
  priceUsdt: string | null;
  reportCoverImageUrl: string | null;
  sourceMaturityRating: FanletterNewsReportDocument["contentMaturityRating"];
  sourceReveal: SourceVlogRevealGateState | null;
  sourceRevealEndpoint: string | null;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const sourceRevealLocked = Boolean(sourceReveal && !sourceReveal.unlocked);
  const canShowLockedSourceFrames = !sourceRevealLocked || isViewerLoggedIn;
  const mediaBlurred = blurred;
  const lockedNsfwSourceTeaserBlurred =
    sourceContent?.contentMaturityRating === "nsfw" &&
    (sourceRevealLocked || sourceContent.canViewerAccess !== true);
  const sourceMediaBlurred = mediaBlurred || lockedNsfwSourceTeaserBlurred;
  const sourceVideoUrl =
    !sourceRevealLocked && sourceContent?.canViewerAccess && !sourceMediaBlurred
      ? sourceContent.contentVideoUrls[0] ?? null
      : null;
  const shouldUseReportCoverImage =
    reportCoverImageSource === "reporter_selected" ||
    reportCoverImageSource === "reporter_cropped";
  const sourceImageUrl =
    shouldUseReportCoverImage
      ? reportCoverImageUrl ??
        sourceContent?.coverImageUrl ??
        (canShowLockedSourceFrames ? sourceContent?.contentImageUrls[0] : null) ??
        null
      : sourceContent?.coverImageUrl ??
        (canShowLockedSourceFrames ? sourceContent?.contentImageUrls[0] : null) ??
        reportCoverImageUrl;
  const sourceSceneFrames = buildSourceVlogSceneFrames(sourceContent);
  const sourceOverlaySceneFrames = canShowLockedSourceFrames
    ? pickTimelinePreviewFrames(sourceSceneFrames)
    : [];
  const hasEmbeddedVideo = Boolean(sourceVideoUrl);
  const sourceStandalonePreviewVideoUrl = normalizeOptionalVideoUrl(
    sourceContent?.sourcePreviewVideoUrl,
  );
  const sourceDisplayTitle = getFanletterNewsSourceDisplayTitle(
    sourceContent?.title ?? accessLabel,
    locale,
  );
  const shouldShowSourceDisplayTitle =
    sourceDisplayTitle !== copy.sourceTitle &&
    sourceDisplayTitle !== copy.embeddedTitle &&
    !isFanletterNewsLowSignalSourceTitle(sourceDisplayTitle);
  const sourcePreviewVideoUrl = resolveSourceVlogPreviewVideoUrl(
    sourceContent,
    sourceVideoUrl,
  );
  const paidUnlockAmount = priceUsdt ?? CONTENT_PAID_USDT_AMOUNT;
  const paidUnlockLabel = `${paidUnlockAmount} USDT`;
  const sourceAccessKind: SourceVlogAccessKind = isPaidContent ? "paid" : "free";
  const isSourceNsfw = sourceMaturityRating === "nsfw";
  const shouldRequireNsfwVideoPin = isSourceNsfw && hasEmbeddedVideo;
  const viewerCanAccessSource = sourceContent
    ? sourceContent.canViewerAccess === true
    : !isPaidContent;
  const isViewerSourceOwner = sourceContent?.viewerRelation === "owner";
  const isPurchasedPaidContent =
    isPaidContent && viewerCanAccessSource && !isViewerSourceOwner;
  const sourceTypeBadge = {
    className: isPaidContent
      ? "border-[#1eb84a]/22 bg-[#ecfff0] text-[#126c2c]"
      : "border-black/10 bg-white text-black/56",
    icon: isPaidContent ? Coins : PlayCircle,
    label: isPaidContent
      ? copy.embeddedVlogStatus.paid(paidUnlockLabel)
      : copy.embeddedVlogStatus.free,
  };
  const sourceAccessBadge = {
    className: isPurchasedPaidContent
      ? "border-[#1eb84a]/22 bg-[#ecfff0] text-[#126c2c]"
      : viewerCanAccessSource
        ? "border-black/10 bg-white text-black/56"
        : "border-rose-500/18 bg-rose-50 text-rose-700",
    icon: viewerCanAccessSource ? CheckCircle2 : LockKeyhole,
    label: isPurchasedPaidContent
      ? copy.embeddedVlogStatus.purchased
      : isViewerSourceOwner
        ? copy.embeddedVlogStatus.ownerAccess
        : viewerCanAccessSource
          ? copy.embeddedVlogStatus.accessible
          : copy.embeddedVlogStatus.unpaid,
  };
  const sourceMaturityBadge = {
    className: "border-rose-500/18 bg-rose-50 text-rose-700",
    icon: AlertTriangle,
    label: copy.embeddedVlogStatus.nsfw,
  };
  const headerBadges = [
    ...(isPaidContent ? [sourceTypeBadge, sourceAccessBadge] : []),
    ...(isSourceNsfw ? [sourceMaturityBadge] : []),
  ];
  const shouldShowPaidTeaser =
    !sourceRevealLocked &&
    isPaidContent &&
    !sourceContent?.canViewerAccess &&
    Boolean(paidUnlockHref);
  const shouldShowPaidUnlockPrompt =
    !shouldShowPaidTeaser &&
    !sourceRevealLocked &&
    isPaidContent &&
    !sourceContent?.canViewerAccess &&
    Boolean(paidUnlockHref);
  const shouldShowPaidUnlockCta =
    !sourceRevealLocked &&
    isPaidContent &&
    !sourceContent?.canViewerAccess &&
    !blurred;
  const canShowSourceSceneGallery =
    viewerCanAccessSource || (!isPaidContent && sourceReveal?.unlocked);
  const shouldShowSourceTeaserGallery =
    !sourceRevealLocked &&
    sourceSceneFrames.length > 1 &&
    canShowSourceSceneGallery;
  const shouldRequireNsfwScenePin =
    isSourceNsfw && shouldShowSourceTeaserGallery;
  const shouldShowLockedPreviewHero = Boolean(
    (sourceRevealLocked || !viewerCanAccessSource) &&
      sourcePreviewVideoUrl,
  );
  const shouldShowDesktopSourceRevealDock = Boolean(
    sourceRevealLocked &&
      sourceReveal &&
      sourceOverlaySceneFrames.length === 0 &&
      !shouldShowLockedPreviewHero,
  );
  const noticeMessage = blurred
    ? copy.nsfwBlurNotice
    : shouldShowPaidUnlockCta
      ? copy.embeddedLockedPaid(paidUnlockLabel)
      : copy.embeddedLocked;

  return (
    <section className="mt-7 rounded-lg border border-black/12 bg-white p-4 shadow-[0_14px_42px_rgba(17,21,16,0.06)]">
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#111510]">
            <Clapperboard className="size-4 text-[#16702e]" />
            {copy.embeddedTitle}
          </span>
          {shouldShowSourceDisplayTitle ? (
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-black/42">
              {sourceDisplayTitle}
            </p>
          ) : null}
        </div>
        {headerBadges.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {headerBadges.map((badge) => {
              const Icon = badge.icon;

              return (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] font-black ${badge.className}`}
                  key={badge.label}
                >
                  <Icon className="size-3.5" />
                  {badge.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      {sourceContent ? (
        <FanletterNewsSourceRevealStatusCard
          initialSourceReveal={sourceReveal}
          isPaidContent={isPaidContent}
          locale={locale}
          paidAmountLabel={paidUnlockLabel}
          paidUnlockHref={paidUnlockHref}
          sourceRevealEndpoint={sourceRevealEndpoint}
          sourceRevealReportId={sourceReveal?.reportId ?? null}
          viewerCanAccessSource={viewerCanAccessSource}
        />
      ) : null}
      <SourceVlogReportSlotStatusCard
        copy={copy}
        locale={locale}
        reportSlot={reportSlot}
        sourceReveal={sourceReveal}
      />
      <div className="-mx-4 overflow-hidden border-y border-black/10 bg-black shadow-[0_20px_46px_rgba(17,21,16,0.1)] sm:mx-0 sm:border">
        {sourceRevealLocked && sourceReveal ? (
          shouldShowLockedPreviewHero && sourcePreviewVideoUrl ? (
            <FanletterNewsLockedPreviewHero
              blurred={sourceMediaBlurred}
              posterImageUrl={sourceImageUrl}
              previewBadge={copy.embeddedPreviewBadge}
              previewMeta={copy.embeddedPreviewMeta}
              previewVideoUrl={sourcePreviewVideoUrl}
              title={sourceDisplayTitle}
            >
              <div className="lg:hidden">
                <SourceVlogRevealTeaserOverlay
                  blurred={sourceMediaBlurred}
                  connectHref={sourceReveal.connectHref}
                  contentId={sourceContent?.contentId ?? null}
                  frames={sourceOverlaySceneFrames}
                  locale={locale}
                  paidAmountLabel={paidUnlockLabel}
                  presentation="flow"
                  referralCode={referralCode}
                  reportId={sourceReveal.reportId}
                  sourceAccessKind={sourceAccessKind}
                  sourceReveal={sourceReveal}
                />
              </div>
              <div className="absolute inset-0 hidden lg:block">
                <SourceVlogRevealTeaserOverlay
                  blurred={sourceMediaBlurred}
                  connectHref={sourceReveal.connectHref}
                  contentId={sourceContent?.contentId ?? null}
                  frames={[]}
                  layout="sideRail"
                  locale={locale}
                  paidAmountLabel={paidUnlockLabel}
                  referralCode={referralCode}
                  reportId={sourceReveal.reportId}
                  sourceAccessKind={sourceAccessKind}
                  sourceReveal={sourceReveal}
                />
              </div>
            </FanletterNewsLockedPreviewHero>
          ) : (
            <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-video">
              {sourceImageUrl ? (
                <Image
                  alt={sourceDisplayTitle}
                  className={
                    sourceMediaBlurred
                      ? "scale-[1.04] object-cover blur-sm brightness-[0.74] saturate-[0.9]"
                      : "object-cover"
                  }
                  fill
                  loading="eager"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  src={sourceImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    sourceImageUrl,
                  )}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#07100b,#101820_54%,#1b2b20)] text-white/74">
                  <Clapperboard className="size-14 text-[#44f26e]" />
                </div>
              )}
              {sourceMediaBlurred ? (
                <div className="pointer-events-none absolute inset-0 bg-black/10" />
              ) : null}
              <div
                className={
                  shouldShowDesktopSourceRevealDock
                    ? "absolute inset-0 lg:hidden"
                    : "absolute inset-0"
                }
              >
                <SourceVlogRevealTeaserOverlay
                  blurred={sourceMediaBlurred}
                  connectHref={sourceReveal.connectHref}
                  contentId={sourceContent?.contentId ?? null}
                  frames={sourceOverlaySceneFrames}
                  locale={locale}
                  paidAmountLabel={paidUnlockLabel}
                  referralCode={referralCode}
                  reportId={sourceReveal.reportId}
                  sourceAccessKind={sourceAccessKind}
                  sourceReveal={sourceReveal}
                />
              </div>
            </div>
          )
        ) : shouldShowPaidTeaser && paidUnlockHref ? (
          shouldShowLockedPreviewHero && sourcePreviewVideoUrl ? (
            <FanletterNewsLockedPreviewHero
              blurred={sourceMediaBlurred}
              posterImageUrl={sourceImageUrl}
              previewBadge={copy.embeddedPreviewBadge}
              previewMeta={copy.embeddedPreviewMeta}
              previewVideoUrl={sourcePreviewVideoUrl}
              title={sourceDisplayTitle}
            >
              <SourceVlogPaidTeaserOverlay
                blurred={sourceMediaBlurred}
                copy={copy}
                frames={sourceOverlaySceneFrames}
                locale={locale}
                paidUnlockHref={paidUnlockHref}
                paidUnlockLabel={paidUnlockLabel}
                showPaidUnlockCta={shouldShowPaidUnlockCta}
              />
            </FanletterNewsLockedPreviewHero>
          ) : (
            <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-video">
              {sourceImageUrl ? (
                <Image
                  alt={sourceDisplayTitle}
                  className={
                    sourceMediaBlurred
                      ? "scale-[1.04] object-cover blur-sm brightness-[0.74] saturate-[0.9]"
                      : "object-cover"
                  }
                  fill
                  loading="eager"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  src={sourceImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    sourceImageUrl,
                  )}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#07100b,#101820_54%,#1b2b20)] text-white/74">
                  <Clapperboard className="size-14 text-[#44f26e]" />
                </div>
              )}
              {sourceMediaBlurred ? (
                <div className="pointer-events-none absolute inset-0 bg-black/8" />
              ) : null}
              <SourceVlogPaidTeaserOverlay
                blurred={sourceMediaBlurred}
                copy={copy}
                frames={sourceOverlaySceneFrames}
                locale={locale}
                paidUnlockHref={paidUnlockHref}
                paidUnlockLabel={paidUnlockLabel}
                showPaidUnlockCta={shouldShowPaidUnlockCta}
              />
            </div>
          )
        ) : (
          <FanletterResponsiveMediaFrame
            alt={sourceDisplayTitle}
            blurred={sourceMediaBlurred}
            deferVideoUntilInteraction={Boolean(
              sourceStandalonePreviewVideoUrl && sourceVideoUrl,
            )}
            eager
            imageUrl={sourceImageUrl}
            mediaType={sourceContent?.mediaType ?? "video"}
            nsfwPinGate={
              shouldRequireNsfwVideoPin
                ? {
                    connectHref: newsConnectHref,
                    enabled: true,
                    locale,
                    managePinHref: pinUnlockHref,
                  }
                : undefined
            }
            playButtonLabel={copy.embeddedPlayFullVideoCta}
            previewVideoUrl={sourceStandalonePreviewVideoUrl}
            title={sourceDisplayTitle}
            videoUrl={sourceVideoUrl}
          >
            {mediaBlurred || !hasEmbeddedVideo ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/34 p-5 text-center backdrop-blur-[1px]">
                <div className="max-w-sm rounded-lg border border-white/14 bg-black/68 p-4">
                  {blurred ? (
                    <AlertTriangle className="mx-auto size-7 text-rose-300" />
                  ) : (
                    <LockKeyhole className="mx-auto size-7 text-[#44f26e]" />
                  )}
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/82">
                    {noticeMessage}
                  </p>
                  {shouldShowPaidUnlockCta && paidUnlockHref ? (
                    <FanletterPaidUnlockTrigger
                      className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                      href={paidUnlockHref}
                    >
                      <Coins className="size-4" />
                      <span>
                        {paidUnlockLabel} {copy.embeddedUnlockCta}
                      </span>
                    </FanletterPaidUnlockTrigger>
                  ) : null}
                </div>
              </div>
            ) : null}
          </FanletterResponsiveMediaFrame>
        )}
        {shouldShowDesktopSourceRevealDock && sourceReveal ? (
          <div className="hidden border-t border-white/10 bg-[#07100b] p-4 lg:block">
            <FanletterNewsSourceRevealVote
              className="mx-auto w-full max-w-3xl border-white/10 bg-white/[0.05] shadow-none"
              connectHref={sourceReveal.connectHref}
              contentId={sourceContent?.contentId ?? null}
              density="dock"
              initialState={sourceReveal}
              locale={locale}
              paidAmountLabel={paidUnlockLabel}
              referralCode={referralCode}
              reportId={sourceReveal.reportId}
              sourceAccessKind={sourceAccessKind}
              trackingSource="fanletter-news-detail-source-dock"
            />
          </div>
        ) : null}
      </div>
      {shouldShowSourceTeaserGallery ? (
        <SourceVlogUnlockedTeaserGallery
          blurred={sourceMediaBlurred}
          copy={copy}
          frames={sourceSceneFrames}
          locale={locale}
          nsfwPinGate={
            shouldRequireNsfwScenePin
              ? {
                  connectHref: newsConnectHref,
                  enabled: true,
                  managePinHref: pinUnlockHref,
                  title: sourceDisplayTitle,
                }
              : undefined
          }
        />
      ) : null}
      {sourceReveal?.unlocked ? (
        <FanletterNewsSourceRevealVote
          className="mt-3"
          connectHref={sourceReveal.connectHref}
          contentId={sourceContent?.contentId ?? null}
          density="compact"
          initialState={sourceReveal}
          locale={locale}
          paidAmountLabel={paidUnlockLabel}
          referralCode={referralCode}
          reportId={sourceReveal.reportId}
          sourceAccessKind={sourceAccessKind}
          tone="light"
          trackingSource="fanletter-news-detail-source-status"
        />
      ) : null}
      {shouldShowPaidUnlockPrompt && paidUnlockHref ? (
        <div className="mt-3 grid gap-3 rounded-lg border border-[#1eb84a]/22 bg-[#f2fff5] p-3 shadow-[0_12px_30px_rgba(22,112,46,0.08)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#07150b] text-[#44f26e]">
              <LockKeyhole className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#111510]">
                {copy.embeddedUnlockTitle}
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-black/58">
                {copy.embeddedUnlockBody}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1eb84a]/20 bg-white px-2.5 py-1 text-[0.68rem] font-black text-[#126c2c]">
                  <Coins className="size-3.5" />
                  {paidUnlockLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[0.68rem] font-bold text-black/56">
                  <CheckCircle2 className="size-3.5 text-[#16702e]" />
                  {copy.embeddedUnlockMeta}
                </span>
              </div>
            </div>
          </div>
          <FanletterPaidUnlockTrigger
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-[#243026] sm:w-auto"
            href={paidUnlockHref}
          >
            <Coins className="size-4 text-[#44f26e]" />
            <span>{copy.embeddedUnlockCta}</span>
          </FanletterPaidUnlockTrigger>
        </div>
      ) : null}
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; reportId: string }>;
}): Promise<Metadata> {
  const { lang, reportId } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const report = await getFanletterNewsReportById(reportId);
  const reportTitle = report ? getArticleDisplayTitle(report.title) : null;
  const title = report
    ? `${reportTitle} | AIAVpark News`
    : locale === "ko"
      ? "AIAVpark AI 팬 리포트"
      : "AIAVpark AI fan report";
  const description =
    report?.dek ??
    (locale === "ko"
      ? "AIAVpark 원본 브이로그와 팬 참여 흐름을 함께 보여주는 AI 팬 리포트입니다."
      : "An AI fan report connecting an AIAVpark source vlog with fan participation.");
  const url = report
    ? createFanletterNewsReportShareHref(report)
    : `/${locale}/fanletter/news/${reportId}`;
  const previewImageUrl = report
    ? getFanletterNewsReportPreviewImageUrl(report)
    : null;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: previewImageUrl
        ? [
            {
              alt: report?.title ?? title,
              url: previewImageUrl,
            },
          ]
        : undefined,
      siteName: "AIAVpark News",
      title,
      type: "article",
      url,
    },
    twitter: {
      card: previewImageUrl ? "summary_large_image" : "summary",
      description,
      images: previewImageUrl ? [previewImageUrl] : undefined,
      title,
    },
  };
}

export default async function LocalizedFanletterNewsReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterNewsReportSearchParams>;
}) {
  const { lang, reportId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const report = await getFanletterNewsReportById(reportId);

  if (!report) {
    notFound();
  }

  const cookieStore = await cookies();
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const relatedNewsVisibleCount = readRelatedNewsVisibleCount();
  const relatedNewsSort = readFanletterRelatedNewsSort(query.relatedSort);
  const relatedReportVisibleCount = Math.max(1, relatedNewsVisibleCount - 1);
  const relatedNewsOffset = readRelatedNewsOffset(
    query.relatedOffset,
    relatedReportVisibleCount,
  );
  const relatedNewsInitialPageIndex = Math.floor(
    relatedNewsOffset / relatedReportVisibleCount,
  );
  const memberServerSession = await readMemberServerSession();
  const [
    sourceContent,
    relatedReports,
    relatedReportTotalCount,
    characterDiscoveryReports,
    reporterIncentiveStats,
    reporterReportIncentiveStats,
    reporterProfile,
    viewerReporterMember,
  ] = await Promise.all([
    getFanletterPublicContentDetail(
      report.contentId,
      locale,
      memberServerSession?.email ?? null,
      {
        includeNsfw,
        includeLockedPreviewVideo: true,
      },
    ).catch(() => null),
    getRelatedFanletterNewsReports({
      creatorReferralCode: report.creatorReferralCode,
      excludeContentId: report.contentId,
      excludeReportId: report.reportId,
      limit: relatedReportVisibleCount + 1,
      locale,
      offset: relatedNewsOffset,
      sort: relatedNewsSort,
    }),
    countRelatedFanletterNewsReports({
      creatorReferralCode: report.creatorReferralCode,
      excludeContentId: report.contentId,
      excludeReportId: report.reportId,
      locale,
    }),
    getLatestFanletterNewsReports({
      contentMaturityRating: "general",
      excludeCreatorReferralCode: report.creatorReferralCode,
      limit: 48,
      locale,
      promoteFirstReports: true,
    }),
    getFanletterNewsReporterIncentiveStats({
      reporterReferralCode: report.reporterReferralCode,
    }),
    getFanletterNewsReporterIncentiveStats({
      reporterReferralCode: report.reporterReferralCode,
      reportIds: [report.reportId],
    }),
    getFanletterNewsReporterProfile({
      reporterReferralCode: report.reporterReferralCode,
    }),
    getFanletterNewsReporterMemberByEmail(
      memberServerSession?.email ?? null,
      locale,
    ),
  ]);
  const copy = getCopy(locale);
  const articleTitle = getArticleDisplayTitle(report.title);
  const isFirstNewsReport = isFanletterNewsFirstReportForContent(report);
  const isViewerLoggedIn = Boolean(memberServerSession?.email);
  const viewerReferralCode = normalizeReferralCode(
    viewerReporterMember?.referralCode,
  );
  const reporterReferralCode = normalizeReferralCode(report.reporterReferralCode);
  const creatorReferralCode = normalizeReferralCode(
    sourceContent?.authorReferralCode ?? report.creatorReferralCode,
  );
  const isViewerReporterOwner = Boolean(
    isViewerLoggedIn &&
      viewerReferralCode &&
      reporterReferralCode &&
      viewerReferralCode === reporterReferralCode,
  );
  const isViewerVideoOwner = Boolean(
    isViewerLoggedIn && sourceContent?.viewerRelation === "owner",
  );
  const isViewerCharacterOwner = Boolean(
    isViewerLoggedIn &&
      creatorReferralCode &&
      ((viewerReferralCode && viewerReferralCode === creatorReferralCode) ||
        isViewerVideoOwner),
  );
  const viewerOwnershipSignals: ViewerOwnershipSignal[] = isViewerLoggedIn
    ? [
        {
          key: "reporter",
          label: copy.viewerOwnership.reporter,
          owned: isViewerReporterOwner,
        },
        {
          key: "character",
          label: copy.viewerOwnership.character,
          owned: isViewerCharacterOwner,
        },
        {
          key: "video",
          label: copy.viewerOwnership.video,
          owned: isViewerVideoOwner,
        },
      ]
    : [];
  const referralCode =
    readFanletterReferralCode(query.ref) ?? report.reporterReferralCode;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reporterNewsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporters/${encodeURIComponent(
      report.reporterReferralCode,
    )}`,
    referralCode,
  );
  const fanletterHomeHref = buildPathWithReferral(
    `/${locale}/fanletter`,
    referralCode,
  );
  const articleHref = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const relatedNewsSortParam = Array.isArray(query.relatedSort)
    ? query.relatedSort[0]
    : query.relatedSort;
  const articleReturnHref = setPathSearchParams(articleHref, {
    [RELATED_NEWS_OFFSET_PARAM]:
      relatedNewsOffset > 0 ? String(relatedNewsOffset) : null,
    [RELATED_NEWS_SORT_PARAM]: relatedNewsSortParam ? relatedNewsSort : null,
  });
  const reporterTeaserEditHref = isViewerReporterOwner
    ? setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/fanletter/news/${report.reportId}/teasers/edit`,
          referralCode,
        ),
        { returnTo: articleReturnHref },
      )
    : null;
  const newsConnectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: articleHref },
  );
  const reportWriteHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/reports/new`, referralCode),
    {
      contentId: report.contentId,
      reportStatus: "all",
      sourceReveal: "all",
      sourceSort: "recommended",
    },
  );
  const reportOpportunityHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/reports/new`, referralCode),
    {
      reportStatus: "unreported",
      sourceReveal: "opportunity",
      sourceSort: "recommended",
    },
  );
  const reporterSlotConnectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: reportWriteHref },
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/wallet`, referralCode),
    { returnTo: articleHref },
  );
  const pinUnlockHref = buildWalletUnlockHref({
    locale,
    referralCode,
    returnTo: articleHref,
  });
  const purchasesHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/purchases`, referralCode),
    { returnTo: articleReturnHref },
  );
  const paidUnlockOnboardingHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, referralCode),
    { returnTo: articleHref },
  );
  const creatorHref = report.creatorReferralCode
    ? setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/fanletter/news/characters/${report.creatorReferralCode}`,
          referralCode,
        ),
        { returnTo: articleReturnHref },
      )
    : fanletterHomeHref;
  const otherCharacterCandidateReports = characterDiscoveryReports.filter(
    (candidateReport) => {
      const candidateCreatorReferralCode = normalizeReferralCode(
        candidateReport.creatorReferralCode,
      );

      return (
        candidateReport.reportId !== report.reportId &&
        !isNsfwReport(candidateReport) &&
        Boolean(candidateCreatorReferralCode) &&
        candidateCreatorReferralCode !== creatorReferralCode
      );
    },
  );
  const reportSlotLimit =
    sourceContent?.fanReportLimit ?? FANLETTER_NEWS_REPORT_DEFAULT_SLOT_LIMIT;
  const [selectedOtherCharacterNewsCharacters, contentReportSlot] =
    await Promise.all([
      hydrateFanletterNewsCharacterStats(
        getFanletterNewsCharacterStats(
          otherCharacterCandidateReports,
          Math.max(4, otherCharacterCandidateReports.length),
          { sort: "discovery" },
        ),
        { limit: 4, sort: "discovery" },
      ),
      getFanletterNewsReportsForContent({
        contentId: report.contentId,
        limit: reportSlotLimit,
        locale,
        viewerReporterReferralCode: viewerReferralCode,
      }),
    ]);
  const contentReportSlotReports: SourceVlogReportSlotItem[] =
    contentReportSlot.reports.map((slotReport) => {
      const slotReporterReferralCode = normalizeReferralCode(
        slotReport.reporterReferralCode,
      );
      const isViewerReport = Boolean(
        viewerReferralCode &&
          slotReporterReferralCode &&
          viewerReferralCode === slotReporterReferralCode,
      );

      return {
        avatarImageUrl: slotReport.reporterAvatarImageUrl ?? null,
        href: buildPathWithReferral(
          `/${locale}/fanletter/news/${slotReport.reportId}`,
          referralCode,
        ),
        isViewerReport,
        reporterName: getReporterDisplayName(slotReport),
        reporterReferralCode: slotReport.reporterReferralCode,
        reportId: slotReport.reportId,
      };
    });
  const viewerContentReportHref =
    contentReportSlotReports.find((slotReport) => slotReport.isViewerReport)
      ?.href ?? null;
  const sourceReportSlot: SourceVlogReportSlotState = {
    browseHref: reportOpportunityHref,
    connectHref: reporterSlotConnectHref,
    count: contentReportSlot.reportCount,
    isViewerReporter: Boolean(viewerReporterMember),
    limit: reportSlotLimit,
    reports: contentReportSlotReports,
    viewerReportHref: viewerContentReportHref,
    writeHref: reportWriteHref,
  };
  const visibleRelatedReports = relatedReports.slice(0, relatedReportVisibleCount);
  const currentRelatedNewsItem = serializeFanletterRelatedNewsItem({
    nsfwOptInEnabled: includeNsfw,
    referralCode,
    report: {
      ...report,
      relatedSourceRevealCount: sourceContent?.social.sourceRevealCount ?? 0,
      relatedSourceVlogAvailable: (sourceContent?.contentVideoCount ?? 0) > 0,
    },
  });
  const relatedNewsItems = [
    currentRelatedNewsItem,
    ...visibleRelatedReports.map((relatedReport) =>
      serializeFanletterRelatedNewsItem({
        nsfwOptInEnabled: includeNsfw,
        referralCode,
        report: relatedReport,
      }),
    ),
  ];
  const characterName =
    sourceContent?.authorCharacter?.name ?? sourceContent?.authorName ?? null;
  const characterAvatarImageUrl =
    sourceContent?.authorCharacter?.avatarImageSet[0]?.url ??
    sourceContent?.authorAvatarImageUrl ??
    null;
  const titleCharacterThumbnailUrl =
    characterAvatarImageUrl ??
    report.coverImageUrl ??
    sourceContent?.coverImageUrl ??
    null;
  const relatedNewsTitle = characterName
    ? locale === "ko"
      ? `${characterName} 뉴스 이어보기`
      : `Continue ${characterName} news`
    : copy.relatedNews;
  const relatedNewsTotalCount = Math.max(1, relatedReportTotalCount + 1);
  const relatedNewsApiHref = setPathSearchParams(
    "/api/fanletter/news-reports/related",
    {
      limit: String(relatedReportVisibleCount),
      locale,
      ref: referralCode,
      reportId: report.reportId,
      sort: relatedNewsSort,
    },
  );
  const relatedNewsSortOptions = FANLETTER_RELATED_NEWS_SORTS.map(
    (sortValue: FanletterRelatedNewsSort) => ({
      active: sortValue === relatedNewsSort,
      href: setPathSearchParams(articleHref, {
        [RELATED_NEWS_LIMIT_PARAM]: null,
        [RELATED_NEWS_OFFSET_PARAM]: null,
        [RELATED_NEWS_SORT_PARAM]:
          sortValue === DEFAULT_FANLETTER_RELATED_NEWS_SORT ? null : sortValue,
      }),
      label: copy.relatedNewsSortOptions[sortValue],
      value: sortValue,
    }),
  );
  const relatedNewsHasMore = relatedReports.length > relatedReportVisibleCount;
  const relatedNewsListProps = {
    characterAvatarImageUrl,
    characterName,
    copy: {
      clearSearch: copy.relatedNewsClearSearch,
      controlsSummary: copy.relatedNewsControlsSummary,
      current: copy.relatedNewsCurrent,
      description: copy.relatedNewsDescription,
      empty: copy.relatedNewsEmpty,
      eyebrow: copy.relatedNewsEyebrow,
      error: copy.relatedNewsError,
      loading: copy.relatedNewsLoading,
      next: copy.relatedNewsNext,
      page: copy.relatedNewsPage,
      previous: copy.relatedNewsPrevious,
      searchEmptyPrefix: copy.relatedNewsSearchEmptyPrefix,
      searchEmptySuffix: copy.relatedNewsSearchEmptySuffix,
      searchLabel: copy.relatedNewsSearchLabel,
      searchPlaceholder: copy.relatedNewsSearchPlaceholder,
      title: relatedNewsTitle,
    },
    currentReportId: report.reportId,
    initialHasMore: relatedNewsHasMore,
    initialItems: relatedNewsItems,
    initialPageIndex: relatedNewsInitialPageIndex,
    initialTotalCount: relatedNewsTotalCount,
    locale,
    pageSize: RELATED_NEWS_PAGE_SIZE,
    relatedApiHref: relatedNewsApiHref,
    relatedOffsetParamName: RELATED_NEWS_OFFSET_PARAM,
    relatedSortParamName: RELATED_NEWS_SORT_PARAM,
    sortLabel: copy.relatedNewsSortLabel,
    sortOptions: relatedNewsSortOptions,
    sortValue: relatedNewsSort,
  };
  const shouldShowOtherCharacterNews =
    selectedOtherCharacterNewsCharacters.length > 0;
  const publishedAt = formatDate(report.sourcePublishedAt, locale);
  const articleParagraphs = splitArticleBody(report.body).map((paragraph) =>
    normalizeFanletterNewsDisplayText(paragraph, locale),
  );
  const accessLabel = getContentAccessLabel(sourceContent ?? report, copy);
  const isCurrentNsfwReport = isNsfwReport(report);
  const shouldBlurCurrentReport = shouldBlurReport(report, includeNsfw);
  const relatedNsfwReportCount = relatedReports.filter(isNsfwReport).length;
  const nsfwNewsCount = relatedNsfwReportCount + (isCurrentNsfwReport ? 1 : 0);
  const shouldShowNsfwControl = nsfwNewsCount > 0 || includeNsfw;
  const nsfwTextBlurClass = shouldBlurCurrentReport
    ? "select-none blur-[2px]"
    : "";
  const isPaidSourceContent =
    (sourceContent?.priceType ?? report.priceType) === "paid";
  const shouldShowPaidUnlockPanel =
    isPaidSourceContent && sourceContent?.canViewerAccess !== true;
  const canViewerOpenSourceContent =
    !isPaidSourceContent || sourceContent?.canViewerAccess === true;
  const paidUnlockSectionId = "fanletter-news-paid-unlock";
  const sourceVlogSectionId = "fanletter-news-source-vlog";
  const sourceVlogHref = `${articleHref}#${sourceVlogSectionId}`;
  const paidUnlockAmount =
    sourceContent?.priceUsdt ??
    (shouldShowPaidUnlockPanel ? CONTENT_PAID_USDT_AMOUNT : null);
  const paidUnlockHref = shouldShowPaidUnlockPanel
    ? `${articleHref}#${paidUnlockSectionId}`
    : null;
  const shouldUseSourceRevealGate = Boolean(
    sourceContent && sourceContent.contentVideoCount > 0,
  );
  const sourceReveal = sourceContent && shouldUseSourceRevealGate
    ? {
        ...createFanletterNewsSourceRevealState(sourceContent.social),
        connectHref: newsConnectHref,
        reportId: report.reportId,
      }
    : null;
  const sourceRevealEndpoint = sourceReveal
    ? `/api/fanletter/news-reports/${encodeURIComponent(report.reportId)}/source-reveal`
    : null;
  const articleDek = createFanletterNewsReaderDek({
    canViewerOpenSourceContent,
    creatorName: characterName ?? report.creatorName,
    isPaidSourceContent,
    locale,
    rawDek: report.dek,
    sourceReveal,
  });
  const landingHeroSourceVideoFallbackUrl =
    canViewerOpenSourceContent && sourceReveal?.unlocked !== false
      ? sourceContent?.contentVideoUrls[0] ?? null
      : null;
  const landingHeroPreviewVideoUrl = resolveSourceVlogPreviewVideoUrl(
    sourceContent,
    landingHeroSourceVideoFallbackUrl,
  );
  const shouldBlurLandingHeroBackgroundVideo =
    Boolean(landingHeroPreviewVideoUrl) &&
    (sourceContent?.contentMaturityRating ?? report.contentMaturityRating) === "nsfw";
  const landingHeroPublicImageUrls = getUniqueTrimmedImageUrls([
    ...(report.teaserImages ?? [])
      .filter((image) => image.source !== "reporter_cropped")
      .map((image) => image.imageUrl),
    ...(report.teaserImageUrls ?? []),
  ]);
  const reportPreviewImageUrl = getFanletterNewsReportPreviewImageUrl(report);
  const landingHeroImageUrl =
    reportPreviewImageUrl ??
    landingHeroPublicImageUrls[0] ??
    sourceContent?.coverImageUrl ??
    characterAvatarImageUrl ??
    null;
  const paidUnlockLabel = `${paidUnlockAmount ?? CONTENT_PAID_USDT_AMOUNT} USDT`;
  const heroCopy = getNewsLandingHeroCopy(locale);
  const isSourceRevealLocked = sourceReveal?.unlocked === false;
  const mobileSourceRevealRemainingLabel = sourceReveal
    ? formatNumber(Math.max(0, sourceReveal.threshold - sourceReveal.count), locale)
    : null;
  const mobileDockPrimary = isSourceRevealLocked
    ? {
        href: isViewerLoggedIn ? sourceVlogHref : newsConnectHref,
        kind: isViewerLoggedIn ? ("vote" as const) : ("wallet" as const),
        label: isViewerLoggedIn
          ? mobileSourceRevealRemainingLabel
            ? copy.mobileActionDock.voteWithRemaining(
                mobileSourceRevealRemainingLabel,
              )
            : copy.mobileActionDock.vote
          : copy.mobileActionDock.wallet,
      }
    : shouldShowPaidUnlockPanel && paidUnlockHref
      ? {
          href: paidUnlockHref,
          kind: "pay" as const,
          label: copy.mobileActionDock.pay(paidUnlockLabel),
        }
      : canViewerOpenSourceContent
        ? {
            href: sourceVlogHref,
            kind: "watch" as const,
            label: copy.mobileActionDock.watch,
          }
        : {
            href: "#fanletter-news-story-summary",
            kind: "read" as const,
            label: copy.mobileActionDock.read,
          };
  const mobileDockStatusLabel = isSourceRevealLocked && sourceReveal
    ? heroCopy.progress(
        formatNumber(sourceReveal.count, locale),
        formatNumber(sourceReveal.threshold, locale),
        formatNumber(
          Math.max(0, sourceReveal.threshold - sourceReveal.count),
          locale,
        ),
      )
    : shouldShowPaidUnlockPanel
      ? heroCopy.paidReady(paidUnlockLabel)
      : accessLabel;
  const mobileDockUnlockedPrimary =
    shouldShowPaidUnlockPanel && paidUnlockHref
      ? {
          href: paidUnlockHref,
          kind: "pay" as const,
          label: copy.mobileActionDock.pay(paidUnlockLabel),
        }
      : {
          href: sourceVlogHref,
          kind: "watch" as const,
          label: copy.mobileActionDock.watch,
        };
  const reporterDisplayName =
    reporterProfile?.displayName ?? getReporterDisplayName(report);
  const shouldShowReporterTeaserCutGallery =
    sourceReveal?.unlocked !== true || !canViewerOpenSourceContent;
  const reporterEditedTeaserImageUrls = getReporterEditedTeaserImageUrls(report);
  const heroTeaserImageUrls =
    reporterEditedTeaserImageUrls.length > 0
      ? reporterEditedTeaserImageUrls
      : getPublicTeaserImageUrls(report);
  const mobileCharacterFollowupSectionId =
    "fanletter-news-character-followup";
  const headerCharacterName = characterName ?? report.creatorName;
  const headerCharacterDisplayName =
    headerCharacterName?.trim() || copy.titleCharacter.fallback;
  const mobileHeaderPrimaryLabel = isSourceRevealLocked
    ? copy.newsHeader.wantToWatch
    : shouldShowPaidUnlockPanel
      ? paidUnlockLabel
      : canViewerOpenSourceContent
        ? copy.newsHeader.source
        : copy.newsHeader.summary;
  const mobileHeaderPrimaryIcon =
    mobileDockPrimary.kind === "pay" ? (
      <Coins className="size-4" />
    ) : mobileDockPrimary.kind === "read" ? (
      <FileText className="size-4" />
    ) : isSourceRevealLocked ? (
      <HeartHandshake className="size-4" />
    ) : (
      <Clapperboard className="size-4" />
    );
  const mobileCharacterNewsLabel =
    locale === "ko"
      ? `${headerCharacterDisplayName} 뉴스`
      : `${headerCharacterDisplayName} news`;
  const mobileNavLinks: NewsHeaderNavLink[] = [
    {
      emphasized: true,
      href: mobileDockPrimary.href,
      icon: mobileHeaderPrimaryIcon,
      label: mobileHeaderPrimaryLabel,
    },
    {
      href: `#${mobileCharacterFollowupSectionId}`,
      icon: <Newspaper className="size-4" />,
      label: mobileCharacterNewsLabel,
    },
    {
      href: creatorHref,
      icon: <Users className="size-4" />,
      label: copy.newsHeader.channel,
    },
  ];
  const navLinks = [
    {
      href: newsHomeHref,
      icon: <Newspaper className="size-4" />,
      label: copy.newsHeader.home,
    },
    {
      emphasized: true,
      href: sourceVlogHref,
      icon: <Clapperboard className="size-4" />,
      label: copy.newsHeader.source,
    },
    {
      href: creatorHref,
      icon: <Users className="size-4" />,
      label: copy.newsHeader.character,
    },
    {
      href: purchasesHref,
      icon: <Coins className="size-4" />,
      label: copy.newsHeader.purchases,
    },
  ];
  const facts = [
    { label: copy.sixW.who, value: report.who },
    { label: copy.sixW.when, value: report.when },
    { label: copy.sixW.where, value: report.where },
    { label: copy.sixW.what, value: report.what },
    { label: copy.sixW.why, value: report.why },
    { label: copy.sixW.how, value: report.how },
  ].map((fact) => ({
    ...fact,
    value: normalizeFanletterNewsDisplayText(fact.value, locale),
  }));
  const reporterTrustStats = {
    paidUnlockPurchaseCount:
      reporterIncentiveStats.overview.paidUnlockPurchaseCount,
    reportCount: reporterProfile?.reportCount ?? 1,
    sourceRevealUnlockContributionCount:
      reporterIncentiveStats.overview.sourceRevealUnlockContributionCount,
    sourceRevealVoteCount:
      reporterIncentiveStats.overview.sourceRevealVoteCount,
  };
  const reporterReportStats = reporterReportIncentiveStats.reports.get(
    report.reportId,
  ) ?? {
    paidUnlockPurchaseCount: 0,
    paidUnlockRevenueUsdt: 0,
    rewardPoints: 0,
    sourceRevealUnlockContributionCount: 0,
    sourceRevealVoteCount: 0,
  };
  const reporterTrust = getFanletterNewsReporterTrustProfile({
    latestReportAt:
      reporterProfile?.latestReportAt ?? report.sourcePublishedAt ?? report.createdAt,
    paidUnlockPurchaseCount: reporterTrustStats.paidUnlockPurchaseCount,
    reportCount: reporterTrustStats.reportCount,
    rewardPoints: reporterIncentiveStats.overview.rewardPoints,
    sourceRevealUnlockContributionCount:
      reporterTrustStats.sourceRevealUnlockContributionCount,
    sourceRevealVoteCount: reporterTrustStats.sourceRevealVoteCount,
    status: reporterProfile?.status ?? null,
  });

  return (
    <main className="min-h-screen bg-[#eef1ec] text-[#111510]">
      <FanletterNewsExposureTracker
        contentId={report.contentId}
        eventName="fanletter_news_report_view"
        metadata={{
          creatorReferralCode,
          priceType: sourceContent?.priceType ?? report.priceType,
          reportId: report.reportId,
          reporterReferralCode: report.reporterReferralCode,
          source: "fanletter-news-detail",
          sourceRevealUnlocked: sourceReveal?.unlocked ?? null,
          viewerCanAccessSource: sourceContent?.canViewerAccess ?? null,
        }}
        referralCode={referralCode}
        targetHref={articleHref}
      />
      <NewsSiteHeader
        characterHref={creatorHref}
        characterImageUrl={titleCharacterThumbnailUrl}
        characterName={headerCharacterName}
        copy={copy}
        homeHref={newsHomeHref}
        locale={locale}
        mobileNavLinks={mobileNavLinks}
        navLinks={navLinks}
        referralCode={referralCode}
        reporterName={reporterDisplayName}
        sourceAccessLabel={accessLabel}
        walletHref={walletHref}
      />

      <article className="mx-auto max-w-[92rem] px-3 pb-28 pt-4 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <FanletterNewsShareLandingHero
          accessLabel={accessLabel}
          articleTitle={articleTitle}
          blurBackgroundVideo={shouldBlurLandingHeroBackgroundVideo}
          blurred={shouldBlurCurrentReport}
          characterName={characterName ?? report.creatorName}
          copy={copy}
          creatorHref={creatorHref}
          dek={articleDek}
          isPaidContent={isPaidSourceContent}
          isViewerLoggedIn={isViewerLoggedIn}
          locale={locale}
          paidUnlockHref={paidUnlockHref}
          paidUnlockLabel={paidUnlockLabel}
          previewVideoUrl={landingHeroPreviewVideoUrl}
          referralCode={referralCode}
          reporterName={reporterDisplayName}
          heroTeaserImageUrls={heroTeaserImageUrls}
          heroTeaserUsesReporterCuts={reporterEditedTeaserImageUrls.length > 0}
          shareHref={articleHref}
          sourceImageUrl={landingHeroImageUrl}
          sourceReveal={sourceReveal}
          sourceVlogHref={sourceVlogHref}
          titleCharacterImageUrl={titleCharacterThumbnailUrl}
          viewerCanAccessSource={canViewerOpenSourceContent}
          walletConnectHref={newsConnectHref}
        />

        <div className="grid gap-5 sm:gap-7 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
          <div className="min-w-0">
            <div
              className="mb-5 hidden max-w-[68rem] scroll-mt-24 space-y-3 sm:mb-7 md:block"
              id="fanletter-news-discovery"
            >
              <FanletterNewsRelatedList
                key={`feature-${relatedNewsApiHref}-${relatedNewsOffset}`}
                {...relatedNewsListProps}
                variant="feature"
              />
              <CharacterPersonaBridge
                blurred={shouldBlurCurrentReport}
                copy={copy}
                creatorHref={creatorHref}
                creatorReferralCode={creatorReferralCode}
                followFallbackHref={paidUnlockOnboardingHref}
                imageUrl={titleCharacterThumbnailUrl}
                locale={locale}
                name={characterName}
              />
            </div>

            <header className="hidden overflow-hidden border border-black/12 bg-white shadow-none sm:block sm:shadow-[0_20px_56px_rgba(17,21,16,0.08)]">
              <div className="border-b-2 border-[#111510] bg-[#111510] px-3 py-2 sm:px-6 sm:py-3 lg:px-5 lg:py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-white/58 sm:gap-y-2 sm:text-[0.68rem] sm:tracking-[0.12em]">
                  <span className="text-[#44f26e]">{copy.articleSection}</span>
                  <span
                    className="hidden h-3 w-px bg-white/18 sm:inline-block"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">{accessLabel}</span>
                  <span
                    className="hidden h-3 w-px bg-white/18 sm:inline-block"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">{copy.aiReport}</span>
                  {isFirstNewsReport ? (
                    <>
                      <span
                        className="h-3 w-px bg-white/18"
                        aria-hidden="true"
                      />
                      <span className="text-[#44f26e]">
                        {getFanletterNewsFirstReportBadgeLabel(report.locale)}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] lg:items-start">
                <div className="min-w-0">
                  <ReporterByline
                    copy={copy}
                    publishedAt={publishedAt}
                    report={report}
                    reporterProfile={reporterProfile}
                    reporterNewsHref={reporterNewsHref}
                    reporterReportStats={reporterReportStats}
                    reporterTrust={reporterTrust}
                    reporterTrustStats={reporterTrustStats}
                  />

                  <ViewerOwnershipStatus
                    copy={copy}
                    signals={viewerOwnershipSignals}
                  />

                  <ArticleActionLinks
                    copy={copy}
                    locale={locale}
                    newsHomeHref={newsHomeHref}
                    referralCode={referralCode}
                    shareHref={articleHref}
                    shareSummary={articleDek}
                    shareTitle={articleTitle}
                    sourceVlogHref={sourceVlogHref}
                  />
                </div>
                <div className="hidden lg:block">
                  <div className={nsfwTextBlurClass}>
                    <ArticleTitleCharacterThumbnail
                      blurred={shouldBlurCurrentReport}
                      copy={copy}
                      creatorHref={creatorHref}
                      creatorReferralCode={report.creatorReferralCode}
                      imageUrl={titleCharacterThumbnailUrl}
                      name={characterName ?? report.creatorName}
                    />
                  </div>
                </div>
              </div>
            </header>

            {shouldShowNsfwControl ? (
              <div className="mt-3 sm:hidden">
                <FanletterNsfwOptInControl
                  compact
                  disabledBody={copy.nsfwControl.disabledBody}
                  disabledTitle={copy.nsfwControl.disabledTitle}
                  enabled={includeNsfw}
                  enabledBody={copy.nsfwControl.enabledBody}
                  enabledTitle={copy.nsfwControl.enabledTitle}
                  hiddenCount={nsfwNewsCount}
                  hiddenCountText={copy.nsfwControl.hiddenCountText(
                    formatNumber(nsfwNewsCount, locale),
                  )}
                  locale={locale}
                  tone={includeNsfw ? "dark" : "light"}
                />
              </div>
            ) : null}

            <ReporterTeaserCutGallery
              accessLabel={accessLabel}
              blurred={shouldBlurCurrentReport}
              copy={copy}
              editHref={reporterTeaserEditHref}
              locale={locale}
              publishedAt={publishedAt}
              report={report}
              reporterProfile={reporterProfile}
              shouldShowTeaserCuts={shouldShowReporterTeaserCutGallery}
              sourceContent={sourceContent}
            />

            {shouldShowNsfwControl ? (
              <div className="mt-5 hidden sm:block">
                <FanletterNsfwOptInControl
                  disabledBody={copy.nsfwControl.disabledBody}
                  disabledTitle={copy.nsfwControl.disabledTitle}
                  enabled={includeNsfw}
                  enabledBody={copy.nsfwControl.enabledBody}
                  enabledTitle={copy.nsfwControl.enabledTitle}
                  hiddenCount={nsfwNewsCount}
                  hiddenCountText={copy.nsfwControl.hiddenCountText(
                    formatNumber(nsfwNewsCount, locale),
                  )}
                  locale={locale}
                  tone={includeNsfw ? "dark" : "light"}
                />
              </div>
            ) : null}

            <section
              className="mt-5 scroll-mt-20 overflow-hidden border border-black/12 bg-white shadow-[0_12px_34px_rgba(17,21,16,0.045)] sm:mt-7 sm:shadow-[0_14px_42px_rgba(17,21,16,0.05)]"
              id="fanletter-news-story-summary"
            >
              <div className="flex items-center gap-2 border-b-2 border-[#111510] bg-[#f7f9f4] px-3.5 py-2.5 text-sm font-black text-[#111510] sm:px-5 sm:py-3">
                <FileText className="size-4 text-[#16702e]" />
                {copy.summaryTitle}
              </div>
              <dl className="grid gap-x-5 gap-y-3 p-3.5 sm:grid-cols-2 sm:gap-y-4 sm:p-5">
                {facts.map((fact) => (
                  <div
                    className="min-w-0 border-l-2 border-[#19b84b]/34 pl-3"
                    key={fact.label}
                  >
                    <dt className="text-xs font-bold text-[#16702e]">
                      {fact.label}
                    </dt>
                    <dd
                      className={`mt-1 text-sm font-medium leading-6 text-black/72 ${nsfwTextBlurClass}`}
                    >
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-6 sm:mt-8">
              <div
                className={`max-w-[44rem] space-y-5 text-[1.02rem] font-normal leading-8 text-black/84 sm:space-y-6 sm:text-[1.14rem] sm:leading-9 ${
                  nsfwTextBlurClass
                }`}
              >
                {articleParagraphs.map((paragraph) => (
                  <p className="[word-break:keep-all]" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <p className="mt-8 border-t border-black/10 pt-4 text-xs font-medium leading-5 text-black/46">
              {copy.articleNotice}
            </p>

            <div className="scroll-mt-6" id={sourceVlogSectionId}>
              <SourceVlogEmbed
                accessLabel={accessLabel}
                blurred={shouldBlurCurrentReport}
                copy={copy}
                isPaidContent={isPaidSourceContent}
                isViewerLoggedIn={isViewerLoggedIn}
                locale={locale}
                newsConnectHref={newsConnectHref}
                paidUnlockHref={paidUnlockHref}
                pinUnlockHref={pinUnlockHref}
                priceUsdt={paidUnlockAmount}
                reportSlot={sourceReportSlot}
                reportCoverImageSource={report.coverImageSource}
                reportCoverImageUrl={report.coverImageUrl}
                sourceMaturityRating={
                  sourceContent?.contentMaturityRating ??
                  report.contentMaturityRating
                }
                sourceReveal={sourceReveal}
                sourceRevealEndpoint={sourceRevealEndpoint}
                sourceContent={sourceContent}
                referralCode={referralCode}
              />
            </div>

            <div
              className="mt-5 scroll-mt-24 md:hidden"
              id={mobileCharacterFollowupSectionId}
            >
              <FanletterNewsRelatedList
                key={`mobile-${relatedNewsApiHref}-${relatedNewsOffset}`}
                {...relatedNewsListProps}
                variant="feature"
              />
              <CharacterPersonaBridge
                blurred={shouldBlurCurrentReport}
                className="mt-3"
                copy={copy}
                creatorHref={creatorHref}
                creatorReferralCode={creatorReferralCode}
                followFallbackHref={paidUnlockOnboardingHref}
                imageUrl={titleCharacterThumbnailUrl}
                locale={locale}
                name={characterName}
              />
            </div>

            {shouldShowPaidUnlockPanel ? (
              <div className="scroll-mt-6" id={paidUnlockSectionId}>
                <FanletterPaidUnlockPanel
                  autoOpenHash={`#${paidUnlockSectionId}`}
                  connectHref={newsConnectHref}
                  contentId={report.contentId}
                  contentImageCount={sourceContent?.contentImageCount ?? 0}
                  contentMaturityRating={
                    sourceContent?.contentMaturityRating ??
                    report.contentMaturityRating
                  }
                  contentVideoCount={sourceContent?.contentVideoCount ?? 1}
                  creatorHref={creatorHref}
                  currentHref={articleHref}
                  initialBody={
                    sourceContent?.body ??
                    report.sourceSummary ??
                    articleDek
                  }
                  initialCoverImageUrl={
                    sourceContent?.coverImageUrl ?? report.coverImageUrl
                  }
                  initialSummary={
                    sourceContent?.summary ??
                    report.sourceSummary ??
                    articleDek
                  }
                  initialTitle={getFanletterNewsSourceDisplayTitle(
                    sourceContent?.title ?? report.sourceTitle,
                    locale,
                  )}
                  hideInlinePanel
                  locale={locale}
                  onboardingHref={paidUnlockOnboardingHref}
                  priceUsdt={paidUnlockAmount}
                  referralCode={referralCode}
                  showTeaserPreview={false}
                  sourceReportId={report.reportId}
                  sourceReporterReferralCode={report.reporterReferralCode}
                  trackingSource="fanletter-news-detail"
                />
              </div>
            ) : null}

          </div>

          <aside className="hidden space-y-4 xl:block">
            {shouldShowOtherCharacterNews ? (
              <FanletterNewsOtherCharacterNews
                characters={selectedOtherCharacterNewsCharacters}
                copy={copy}
                locale={locale}
                referralCode={referralCode}
              />
            ) : null}
            <FanletterNewsWalletSidebarCard
              body={copy.walletConnect.body}
              eyebrow={copy.walletConnect.eyebrow}
              forceVisible={shouldShowPaidUnlockPanel}
              locale={locale}
              referralCode={referralCode}
              title={copy.walletConnect.title}
              walletHref={walletHref}
            />
          </aside>
        </div>

        {shouldShowOtherCharacterNews ? (
          <div className="mt-5 sm:mt-7 xl:hidden">
            <FanletterNewsOtherCharacterNews
              characters={selectedOtherCharacterNewsCharacters}
              copy={copy}
              locale={locale}
              referralCode={referralCode}
            />
          </div>
        ) : null}
      </article>

      <FanletterNewsMobileActionDock
        eyebrow={copy.mobileActionDock.eyebrow}
        initialSourceRevealState={sourceReveal}
        joinedLabel={copy.mobileActionDock.joined}
        locale={locale}
        primaryHref={mobileDockPrimary.href}
        primaryKind={mobileDockPrimary.kind}
        primaryLabel={mobileDockPrimary.label}
        referralCode={referralCode}
        shareHref={articleHref}
        shareSummary={articleDek}
        shareTitle={articleTitle}
        sourceRevealEndpoint={sourceRevealEndpoint}
        sourceUnlockedHref={mobileDockUnlockedPrimary.href}
        sourceUnlockedKind={mobileDockUnlockedPrimary.kind}
        sourceUnlockedLabel={mobileDockUnlockedPrimary.label}
        statusLabel={mobileDockStatusLabel}
      />
    </main>
  );
}
