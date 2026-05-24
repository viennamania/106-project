import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  Coins,
  FileText,
  LockKeyhole,
  MessageCircleHeart,
  Newspaper,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { FanletterNewsCharacterImageSelector } from "@/components/fanletter-news-character-image-selector";
import { FanletterNewsRelatedList } from "@/components/fanletter-news-related-list";
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
  type FanletterNewsReportDocument,
} from "@/lib/content";
import {
  getFanletterPublicContentDetail,
  type FanletterPublicContentDetail,
  type FanletterPublicContentItem,
} from "@/lib/fanletter-content-service";
import {
  createFanletterNewsReportShareHref,
  getFanletterNewsReportById,
  getFanletterNewsReporterProfile,
  getRelatedFanletterNewsReports,
  type FanletterNewsReporterProfile,
} from "@/lib/fanletter-news-report-service";
import { getFanletterNewsReporterIncentiveStats } from "@/lib/fanletter-news-reporter-incentives";
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
  getFanletterNewsArticleDisplayTitle as getArticleDisplayTitle,
  getFanletterNewsFirstReportBadgeLabel,
  getFanletterNewsReporterDisplayName as getReporterDisplayName,
  isFanletterNewsFirstReportForContent,
  isFanletterNewsReportNsfw as isNsfwReport,
  serializeFanletterRelatedNewsItem,
  shouldBlurFanletterNewsReport as shouldBlurReport,
  type FanletterRelatedNewsItem,
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
import { buildWalletUnlockHref } from "@/lib/wallet-unlock";

type FanletterNewsReportSearchParams = {
  ref?: string | string[];
  relatedLimit?: string | string[];
};

type SourceVlogRevealGateState = FanletterNewsSourceRevealState & {
  connectHref: string;
  reportId: string;
};

type SourceVlogRevealTeaserCopy = {
  eyebrow: string;
  meta: string;
  title: string;
};

const RELATED_NEWS_PAGE_SIZE = 4;
const RELATED_NEWS_LIMIT_PARAM = "relatedLimit";
const RELATED_NEWS_MAX_VISIBLE_COUNT = 24;

function readRelatedNewsVisibleCount(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return RELATED_NEWS_PAGE_SIZE;
  }

  return Math.max(
    RELATED_NEWS_PAGE_SIZE,
    Math.min(RELATED_NEWS_MAX_VISIBLE_COUNT, Math.floor(parsed)),
  );
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
          "이 글은 원본 브이로그의 공개 정보와 티저를 바탕으로 생성된 FanLetter AI 팬 리포트입니다. 실제 언론사의 독립 취재 뉴스로 표시하지 않습니다.",
        articleSection: "연예",
        byline: "팬 기자",
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
            "본문을 읽은 뒤 같은 AI 캐릭터의 최초 팬 리포트와 최신 관련 뉴스를 이어서 확인하세요.",
          characterCta: "캐릭터 뉴스 홈",
          eyebrow: "같은 캐릭터 뉴스",
          leadCta: (name: string | null) =>
            name ? `${name} 관련 뉴스 보기` : "관련 뉴스 보기",
          listEyebrow: "같은 AI 캐릭터",
          listTitle: "최초 우선 관련 뉴스",
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
        edition: "AI 캐릭터와 팬 참여를 다루는 FanLetter 온라인 뉴스",
        embeddedLocked:
          "잠금 콘텐츠는 공개 티저와 뉴스로 공개 가능한 정보만 이 화면에 표시됩니다.",
        embeddedLockedPaid: (amount: string) =>
          `전체 원본 브이로그는 팬 전용 유료 콘텐츠입니다. ${amount} 결제 후 이 뉴스 화면에서 바로 열립니다.`,
        embeddedTitle: "뉴스 속 원본 브이로그",
        embeddedUnlockBody:
          "결제 후 전체 원본 영상, 본문, 추가 미디어를 이 뉴스 화면에서 바로 이어봅니다.",
        embeddedUnlockCta: "결제하고 원본 보기",
        embeddedUnlockMeta: "전체 영상 · 본문 · 추가 미디어",
        embeddedUnlockTitle: "팬 전용 브이로그 잠금 해제",
        embeddedVlogStatus: {
          accessible: "열람 가능",
          free: "무료 공개",
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
          publicBody:
            "무료 공개 원본입니다. 뉴스 화면에서 바로 볼 수 있습니다.",
          purchased: "결제 완료",
          title: "원본 브이로그 상태",
          unpaid: "결제 필요",
        },
        generated: "AI 생성",
        publishedLabel: "작성일",
        navItems: ["AI 캐릭터", "팬 리포트", "브이로그 뉴스", "구매함"],
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
        relatedNews: "이 캐릭터의 다른 뉴스",
        relatedNewsDescription:
          "현재 뉴스와 같은 AI 캐릭터로 작성된 뉴스만 모았습니다. 최초 팬 리포트는 최신순 안에서 우선 노출됩니다.",
        relatedNewsEyebrow: "같은 AI 캐릭터",
        relatedNewsEmpty: "아직 이 캐릭터의 다른 뉴스가 없습니다.",
        relatedNewsError: "다른 뉴스를 불러오지 못했습니다. 다시 시도해 주세요.",
        relatedNewsLoadMore: "이 캐릭터 뉴스 더 보기",
        relatedNewsLoading: "불러오는 중",
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
        sourceContext: "뉴스 배경",
        sourceTitle: "원본 브이로그",
        summaryTitle: "뉴스 요약",
        visualCaption:
          "FanLetter News 대표 이미지. 원본 브이로그와 AI 캐릭터 리포트의 공개 정보를 바탕으로 표시됩니다.",
        visualLead: "뉴스 대표 이미지",
        walletConnect: {
          body:
            "팬 기자 활동이나 팬 전용 결제가 필요할 때만 이어갑니다.",
          eyebrow: "FanLetter Wallet",
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
        siteName: "FanLetter News",
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
          "This is a FanLetter AI fan report generated from the public source vlog information and teaser. It is not presented as independently reported journalism.",
        articleSection: "Entertainment",
        byline: "Fan reporter",
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
            "After this news, keep exploring first fan reports and the latest related news from the same AI character.",
          characterCta: "Character news home",
          eyebrow: "Same character news",
          leadCta: (name: string | null) =>
            name ? `Read related ${name} news` : "Read related news",
          listEyebrow: "Same AI character",
          listTitle: "First reports first",
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
        edition: "FanLetter online news for AI characters and fan participation",
        embeddedLocked:
          "Locked content is represented with public teaser details available for the news page.",
        embeddedLockedPaid: (amount: string) =>
          `The full source vlog is fan-only paid content. Pay ${amount} to open it from this news page.`,
        embeddedTitle: "Source vlog in this news",
        embeddedUnlockBody:
          "Unlock the full source video, news body, and extra media directly on this news page.",
        embeddedUnlockCta: "Pay and watch source",
        embeddedUnlockMeta: "Full video · news body · extra media",
        embeddedUnlockTitle: "Unlock fan-only vlog",
        embeddedVlogStatus: {
          accessible: "Viewable",
          free: "Free public",
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
          publicBody:
            "This is a free public source and can be watched directly on the news page.",
          purchased: "Purchased",
          title: "Source vlog status",
          unpaid: "Payment needed",
        },
        generated: "AI generated",
        publishedLabel: "Published",
        navItems: ["AI characters", "Fan reports", "Vlog news", "Purchases"],
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
        relatedNews: "More from this character",
        relatedNewsDescription:
          "Only news written from the same AI character as this news is shown here. First fan reports are promoted within the latest feed.",
        relatedNewsEyebrow: "Same AI character",
        relatedNewsEmpty: "No other news from this character yet.",
        relatedNewsError: "Could not load more news. Please try again.",
        relatedNewsLoadMore: "Load more character news",
        relatedNewsLoading: "Loading",
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
        sourceContext: "Story context",
        sourceTitle: "Source vlog",
        summaryTitle: "Story summary",
        visualCaption:
          "FanLetter News lead image, shown from the source vlog and AI character report context.",
        visualLead: "Lead image",
        walletConnect: {
          body:
            "Use this only when fan reporter actions or fan-only payment are needed.",
          eyebrow: "FanLetter Wallet",
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
        siteName: "FanLetter News",
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

function getUniqueImageUrls(urls: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      urls
        .map((url) => url?.trim() ?? "")
        .filter((url): url is string => Boolean(url)),
    ),
  );
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
  copy,
  homeHref,
  locale,
  navLinks,
  referralCode,
  walletHref,
}: {
  copy: ReturnType<typeof getCopy>;
  homeHref: string;
  locale: Locale;
  navLinks: Array<{ href: string; label: string }>;
  referralCode: string | null;
  walletHref: string;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());

  return (
    <header className="border-b border-black/14 bg-white text-[#111510] shadow-[0_8px_28px_rgba(17,21,16,0.05)]">
      <div className="border-b border-black/10 bg-[#eef1ec]">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-4 py-1.5 text-[0.68rem] font-bold text-black/52 sm:px-6 sm:py-2 lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[92rem] flex-col px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-2.5 sm:pb-3">
          <Link
            className="inline-flex min-w-0 items-center gap-3 break-words text-2xl font-black leading-none tracking-normal !text-[#111510] sm:text-[4rem]"
            href={homeHref}
          >
            {copy.siteName}
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="hidden border border-black/14 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e] sm:inline-flex">
              {copy.articleEyebrow}
            </span>
            <FanletterNewsWalletConnect
              className="max-w-[7.75rem] sm:max-w-[12rem]"
              locale={locale}
              referralCode={referralCode}
              walletHref={walletHref}
            />
          </div>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-2 overflow-x-auto border-b border-black/10 py-2.5 text-sm font-bold text-black/62 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navLinks.map((item) => (
            <Link
              className="shrink-0 border border-black/10 bg-white px-3 py-1.5 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:text-[#126c2c]"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function ArticleActionLinks({
  copy,
  creatorHref,
  locale,
  newsHomeHref,
  referralCode,
  shareHref,
  shareSummary,
  shareTitle,
  sourceVlogHref,
}: {
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
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
    {
      href: creatorHref,
      icon: <MessageCircleHeart className="size-4 text-[#16702e]" />,
      label: copy.articleActions.character,
      secondaryOnMobile: true,
    },
  ];

  return (
    <nav
      aria-label={copy.articleActions.label}
      className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 lg:grid-cols-4"
    >
      {actions.map((action) => (
        <Link
          className={`min-h-11 items-center justify-center gap-2 border border-black/12 bg-[#f5f7f1] px-2.5 py-2 text-[0.82rem] font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex sm:justify-between sm:px-3 sm:text-sm ${
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
        className="!h-auto min-h-11 !rounded-none !border-black/12 !bg-[#f5f7f1] px-2.5 py-2 text-[0.82rem] font-black !text-[#111510] hover:!border-[#19b84b] hover:!bg-[#ecfff0] sm:px-3 sm:text-sm"
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

function CharacterContinueReadingPanel({
  characterAvatarImageUrl,
  characterName,
  copy,
  creatorHref,
  items,
}: {
  characterAvatarImageUrl: string | null;
  characterName: string | null;
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  items: FanletterRelatedNewsItem[];
}) {
  const leadItem = items[0] ?? null;
  const secondaryItems = items.slice(1, 4);
  const imageUrl = leadItem?.coverImageUrl ?? characterAvatarImageUrl;
  const shouldBlur = leadItem?.shouldBlur ?? false;
  const title = leadItem?.title ?? characterName ?? copy.continueReading.title;
  const dek = leadItem?.dek ?? copy.continueReading.body;
  const shouldBypassImageOptimization = imageUrl
    ? shouldBypassFanletterImageOptimization(imageUrl)
    : false;
  const leadFirstReportBadge =
    leadItem?.isFirstReport && leadItem.firstReportBadge
      ? leadItem.firstReportBadge
      : null;

  return (
    <section className="mt-8 overflow-hidden border border-black/12 bg-white text-[#111510] shadow-[0_12px_34px_rgba(17,21,16,0.045)] sm:mt-10 sm:shadow-[0_16px_44px_rgba(17,21,16,0.06)]">
      <div className="flex flex-col gap-3 border-b-2 border-[#111510] bg-[#f7f9f4] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
            <BadgeCheck className="size-3.5" />
            {copy.continueReading.eyebrow}
          </p>
          <h2 className="mt-1 break-words text-xl font-black leading-tight [word-break:keep-all] sm:text-2xl">
            {copy.continueReading.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-black/58">
            {copy.continueReading.body}
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-black/12 bg-white px-3.5 py-2 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
          href={creatorHref}
        >
          {copy.continueReading.characterCta}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-3 p-3.5 sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.72fr)]">
        {leadItem ? (
          <Link
            className="group grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] overflow-hidden border border-black/10 bg-[#111510] !text-white transition hover:border-[#19b84b] sm:grid-cols-[11rem_minmax(0,1fr)]"
            href={leadItem.href}
          >
            <div className="relative min-h-[7.5rem] overflow-hidden bg-[#07100b] sm:min-h-[11rem]">
              {imageUrl ? (
                <Image
                  alt=""
                  aria-hidden="true"
                  className={`object-cover transition duration-500 group-hover:scale-[1.04] ${
                    shouldBlur ? "blur-md brightness-[0.68] saturate-[0.86]" : ""
                  }`}
                  fill
                  sizes="(max-width: 640px) 6rem, 11rem"
                  src={imageUrl}
                  unoptimized={shouldBypassImageOptimization}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_35%_25%,#1f6e35,#07100b_58%)]">
                  <Newspaper className="size-10 text-[#44f26e]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/48 via-transparent to-black/12" />
              {leadFirstReportBadge ? (
                <span className="absolute left-2 top-2 z-20 inline-flex max-w-[calc(100%-1rem)] rounded-full bg-[#44f26e] px-2 py-1 text-[0.58rem] font-black uppercase leading-none tracking-[0.08em] text-black shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                  <span className="truncate">{leadFirstReportBadge}</span>
                </span>
              ) : null}
              {leadItem.isNsfw ? (
                <span className="absolute bottom-2 right-2 rounded-full bg-rose-500 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.1em] text-white">
                  {leadItem.nsfwBadge}
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col justify-between p-3 sm:p-4">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {leadFirstReportBadge ? (
                    <span className="inline-flex max-w-full rounded-full border border-[#44f26e]/28 bg-[#44f26e]/14 px-2 py-0.5 text-[0.62rem] font-black uppercase leading-none tracking-[0.08em] text-[#44f26e]">
                      <span className="truncate">{leadFirstReportBadge}</span>
                    </span>
                  ) : null}
                  {characterName ? (
                    <span className="line-clamp-1 min-w-0 text-xs font-black text-[#44f26e]">
                      {characterName}
                    </span>
                  ) : null}
                </div>
                <h3
                  className={`mt-1 line-clamp-3 break-words text-base font-black leading-6 [word-break:keep-all] sm:text-xl sm:leading-7 ${
                    shouldBlur ? "select-none blur-[2px]" : ""
                  }`}
                >
                  {title}
                </h3>
                <p
                  className={`mt-1.5 hidden text-sm font-semibold leading-6 text-white/58 sm:line-clamp-2 ${
                    shouldBlur ? "select-none blur-[2px]" : ""
                  }`}
                >
                  {dek}
                </p>
              </div>
              <span className="mt-3 inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-full bg-[#44f26e] px-3 text-xs font-black text-black transition group-hover:bg-[#69ff8c] sm:h-10 sm:px-4 sm:text-sm">
                {copy.continueReading.leadCta(characterName)}
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>
          </Link>
        ) : (
          <p className="border border-black/10 bg-[#f7f9f4] p-3.5 text-sm font-semibold leading-6 text-black/58">
            {copy.relatedNewsEmpty}
          </p>
        )}

        <div className="border border-black/10 bg-[#f7f9f4] p-3.5 sm:p-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
              {copy.continueReading.listEyebrow}
            </p>
            <h3 className="mt-1 text-base font-black text-[#111510]">
              {copy.continueReading.listTitle}
            </h3>
          </div>

          {secondaryItems.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {secondaryItems.map((item) => (
                <Link
                  className="group grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)] gap-3 border border-black/10 bg-white p-2 !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                  href={item.href}
                  key={item.reportId}
                >
                  <div className="relative aspect-square overflow-hidden bg-[#e9ede7]">
                    {item.coverImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className={`object-cover transition duration-300 group-hover:scale-[1.04] ${
                          item.shouldBlur
                            ? "blur-md brightness-[0.68] saturate-[0.86]"
                            : ""
                        }`}
                        fill
                        sizes="4.25rem"
                        src={item.coverImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          item.coverImageUrl,
                        )}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Newspaper className="size-6 text-[#16702e]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    {item.isFirstReport && item.firstReportBadge ? (
                      <span className="mb-1 inline-flex max-w-full rounded-full border border-[#1eb84a]/20 bg-[#eaffef] px-2 py-0.5 text-[0.58rem] font-black uppercase leading-none tracking-[0.08em] text-[#11732d]">
                        <span className="truncate">{item.firstReportBadge}</span>
                      </span>
                    ) : null}
                    <p
                      className={`line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all] ${
                        item.shouldBlur ? "select-none blur-[2px]" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.08em] text-black/42">
                      {item.publishedAt ?? item.reporterName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 border border-black/10 bg-white p-3 text-sm font-semibold leading-6 text-black/54">
              {copy.relatedNewsEmpty}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CharacterIdentityFeature({
  copy,
  creatorHref,
  locale,
  sourceContent,
}: {
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  locale: Locale;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const character = sourceContent?.authorCharacter;
  const characterName = character?.name ?? sourceContent?.authorName ?? null;

  if (!characterName) {
    return null;
  }

  const avatarImages = getUniqueImageUrls([
    ...(character?.avatarImageSet ?? []).map((avatar) => avatar.url),
    sourceContent?.authorAvatarImageUrl,
  ]).slice(0, 4);
  const avatarImageOptions = avatarImages.map((imageUrl) => {
    const avatar = character?.avatarImageSet.find(
      (candidate) => candidate.url === imageUrl,
    );

    return {
      label: avatar?.label ?? avatar?.expression ?? null,
      url: imageUrl,
    };
  });
  const traits = (character?.traits ?? []).slice(0, 4);
  const reactionCount =
    (sourceContent?.social.likeCount ?? 0) +
    (sourceContent?.social.commentCount ?? 0) +
    (sourceContent?.social.saveCount ?? 0);
  const stats = [
    {
      label: copy.characterStats.level,
      value: character ? `Lv.${character.growth.level}` : "-",
    },
    {
      label: copy.characterStats.vlogs,
      value: sourceContent
        ? formatNumber(sourceContent.authorPublicContentCount, locale)
        : "-",
    },
    {
      label: copy.characterStats.reactions,
      value: sourceContent ? formatNumber(reactionCount, locale) : "-",
    },
  ];
  const latestTitle = character?.latestTitle ?? sourceContent?.title ?? null;

  return (
    <section className="mt-5 overflow-hidden border border-black/12 bg-white text-[#111510] shadow-[0_12px_34px_rgba(17,21,16,0.055)] sm:mt-6">
      <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] sm:grid-cols-[10rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)]">
        <FanletterNewsCharacterImageSelector
          avatarAlt={characterName}
          avatarImages={avatarImageOptions}
          compact
          galleryLabel={copy.characterIdentity.galleryLabel}
          generatedLabel={copy.generated}
        />

        <div className="flex min-h-full min-w-0 flex-col p-3.5 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-[#16702e]/20 bg-[#f5f7f1] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
              <BadgeCheck className="size-3.5" />
              {copy.characterIdentity.title}
            </span>
            <span className="hidden border border-black/10 bg-[#111510] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-white/78 sm:inline-flex">
              {copy.characterIdentity.profileLabel}
            </span>
          </div>

          <h2 className="mt-2.5 break-words text-2xl font-black leading-tight [word-break:keep-all] sm:text-[2.25rem]">
            {characterName}
          </h2>
          <p className="mt-2 line-clamp-3 max-w-xl text-sm font-medium leading-6 text-black/62 sm:text-base sm:leading-7">
            {character?.summary ?? sourceContent?.summary}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 border-y border-black/10 py-2.5 sm:mt-4 sm:py-3">
            {stats.map((stat) => (
              <div
                className="min-w-0 border-r border-black/10 px-1.5 first:pl-0 last:border-r-0 last:pr-0 sm:px-2"
                key={stat.label}
              >
                <p className="truncate text-lg font-black text-[#111510] sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 truncate text-[0.58rem] font-black uppercase tracking-[0.06em] text-black/42 sm:text-[0.62rem]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {traits.length > 0 ? (
            <div className="mt-3 sm:mt-4">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
                {copy.characterIdentity.traitLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {traits.map((trait) => (
                  <span
                    className="border border-black/10 bg-[#f7f9f4] px-2 py-1 text-[0.68rem] font-bold leading-4 text-black/62"
                    key={trait}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {latestTitle ? (
            <div className="mt-3 border-l-[3px] border-[#44f26e] bg-[#f7f9f4] px-3 py-2 sm:mt-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-black/42">
                {copy.characterIdentity.latestLabel}
              </p>
              <p className="mt-1 line-clamp-1 break-words text-xs font-bold leading-5 text-black/68 [word-break:keep-all] sm:text-sm">
                {latestTitle}
              </p>
            </div>
          ) : null}

          <div className="mt-auto pt-3 sm:pt-4">
            <Link
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-3 py-2 text-xs font-black !text-white shadow-[0_12px_26px_rgba(17,21,16,0.14)] transition hover:bg-black sm:w-auto sm:text-sm"
              href={creatorHref}
            >
              <MessageCircleHeart className="size-4 text-[#44f26e]" />
              {copy.characterIdentity.channelCta}
              <ArrowUpRight className="size-4 text-white/62" />
            </Link>
          </div>
        </div>
      </div>
    </section>
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
      className="group grid min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-lg border border-black/10 bg-[#f7f9f4] p-2.5 !text-[#111510] shadow-[0_14px_30px_rgba(17,21,16,0.055)] transition hover:border-[#19b84b] hover:bg-[#ecfff0] lg:block lg:p-3"
      href={creatorHref}
    >
      <span className="relative block aspect-square overflow-hidden rounded-lg bg-[#111510] lg:aspect-[4/5] lg:w-full">
        {imageUrl ? (
          <>
            <Image
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg brightness-[0.48] saturate-[0.92]"
              fill
              sizes="(max-width: 1024px) 5.25rem, 13rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
            <Image
              alt={copy.titleCharacter.visualAlt(displayName)}
              className={`relative z-10 object-cover transition duration-300 group-hover:scale-[1.04] ${
                blurred ? "blur-sm brightness-[0.72] saturate-[0.82]" : ""
              }`}
              fill
              sizes="(max-width: 1024px) 5.25rem, 13rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
          </>
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_55%,#203426)]">
            <Newspaper className="size-8 text-[#44f26e]" />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 z-20 h-1 bg-[#44f26e]" />
      </span>
      <span className="flex min-w-0 flex-col justify-center lg:mt-3 lg:block">
        <span className="inline-flex w-fit items-center gap-1.5 border border-[#16702e]/20 bg-white px-2 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
          <BadgeCheck className="size-3" />
          {copy.titleCharacter.eyebrow}
        </span>
        <span className="mt-2 block truncate text-base font-black leading-tight lg:text-lg">
          {displayName}
        </span>
        {creatorReferralCode ? (
          <span className="mt-1 block truncate text-[0.68rem] font-bold text-black/44">
            @{creatorReferralCode}
          </span>
        ) : null}
        <span className="mt-2 inline-flex items-center gap-1.5 text-[0.72rem] font-black text-[#16702e] group-hover:underline">
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
    <section className="mt-4 border-y border-black/10 py-3 sm:mt-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-xs font-black text-[#44f26e] sm:size-10 sm:text-sm">
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
              <span>{copy.generated}</span>
              <span aria-hidden="true" className="text-black/22">
                ·
              </span>
              <span>
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

      <details className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-black/10 bg-[#f7f9f4] px-3 py-2 text-xs font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] [&::-webkit-details-marker]:hidden">
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
            <p className="mt-1.5 text-xs font-semibold leading-5 text-white/58">
              {copy.reporterPartner.body}
            </p>
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

function ArticleVisualLead({
  accessLabel,
  blurred,
  copy,
  report,
  sourceContent,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  report: FanletterNewsReportDocument;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const imageUrl =
    report.coverImageUrl ??
    sourceContent?.coverImageUrl ??
    sourceContent?.authorAvatarImageUrl ??
    null;
  const shouldBypassImageOptimization = imageUrl
    ? shouldBypassFanletterImageOptimization(imageUrl)
    : false;

  return (
    <figure className="mt-5 overflow-hidden border border-black/12 bg-[#111510] text-white shadow-[0_24px_64px_rgba(12,18,14,0.18)] sm:mt-6">
      <div
        className={`relative aspect-[16/10] overflow-hidden bg-[#111510] sm:aspect-[16/9] ${
          imageUrl ? "" : "min-h-[14rem]"
        }`}
      >
        {imageUrl ? (
          <>
            <Image
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-[1.08] object-cover object-center blur-xl brightness-[0.42] saturate-[0.9]"
              fetchPriority="high"
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 64rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
            <Image
              alt={report.title}
              className={
                blurred
                  ? "relative z-10 object-contain blur-md brightness-[0.68] saturate-[0.86]"
                  : "relative z-10 object-contain"
              }
              fetchPriority="high"
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 64rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_50%,#24372a)]">
            <Newspaper className="size-16 text-[#44f26e]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/18" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2 text-[0.66rem] font-black uppercase tracking-[0.12em] sm:left-5 sm:top-5">
          <span className="bg-[#44f26e] px-2.5 py-1.5 text-black">
            {copy.visualLead}
          </span>
          <span className="border border-white/24 bg-white/12 px-2.5 py-1.5 text-white/82 backdrop-blur">
            {accessLabel}
          </span>
        </div>
        {blurred ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/28 p-5 text-center">
            <div className="max-w-sm border border-white/14 bg-black/66 p-4">
              <AlertTriangle className="mx-auto size-7 text-rose-300" />
              <p className="mt-3 text-sm font-semibold leading-6 text-white/82">
                {copy.nsfwBlurNotice}
              </p>
            </div>
          </div>
        ) : null}
      </div>
      <figcaption className="border-t border-white/12 px-4 py-3 text-xs font-semibold leading-5 text-white/54">
        {copy.visualCaption}
      </figcaption>
    </figure>
  );
}

function SourceVlogRevealTeaserOverlay({
  blurred,
  connectHref,
  imageUrls,
  locale,
  reportId,
  sourceReveal,
}: {
  blurred: boolean;
  connectHref: string;
  imageUrls: string[];
  locale: Locale;
  reportId: string;
  sourceReveal: FanletterNewsSourceRevealState;
}) {
  const copy = getSourceVlogRevealTeaserCopy(locale);
  const teaserImages = imageUrls.slice(0, 3);
  const teaserGridClass =
    teaserImages.length >= 3
      ? "grid-cols-3"
      : teaserImages.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.34)_45%,rgba(0,0,0,0.88)_100%)] p-3 text-white sm:p-5">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] sm:items-center">
        {teaserImages.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 sm:h-full sm:justify-center sm:gap-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#9bffad]">
                  {copy.eyebrow}
                </p>
                <h3 className="mt-1 text-lg font-black leading-tight [word-break:keep-all] sm:text-2xl">
                  {copy.title}
                </h3>
              </div>
              <span className="hidden shrink-0 rounded-full border border-white/16 bg-white/12 px-2.5 py-1 text-[0.62rem] font-black text-white/78 sm:inline-flex">
                {copy.meta}
              </span>
            </div>
            <div
              className={`grid min-h-0 flex-1 ${teaserGridClass} gap-1.5 sm:gap-2`}
            >
              {teaserImages.map((imageUrl, index) => {
                const isPrimary = index === 0;

                return (
                  <div
                    className={
                      isPrimary
                        ? "relative h-full min-h-[7rem] overflow-hidden rounded-lg border border-[#44f26e]/60 bg-black shadow-[0_18px_45px_rgba(68,242,110,0.22)]"
                        : "relative h-full min-h-[7rem] overflow-hidden rounded-lg border border-white/16 bg-black shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
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
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <FanletterNewsSourceRevealVote
          className="w-full"
          connectHref={connectHref}
          density="compact"
          initialState={sourceReveal}
          locale={locale}
          reportId={reportId}
        />
      </div>
    </div>
  );
}

function SourceVlogPaidTeaserOverlay({
  blurred,
  copy,
  imageUrls,
  locale,
  paidUnlockHref,
  paidUnlockLabel,
  showPaidUnlockCta,
}: {
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  imageUrls: string[];
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
  const teaserImages = imageUrls.slice(0, 3);
  const teaserGridClass =
    teaserImages.length >= 3
      ? "grid-cols-3"
      : teaserImages.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.34)_45%,rgba(0,0,0,0.9)_100%)] p-3 text-white sm:p-5">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-4xl gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] sm:items-center">
        {teaserImages.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 sm:h-full sm:justify-center sm:gap-3">
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
              className={`grid min-h-0 flex-1 ${teaserGridClass} gap-1.5 sm:gap-2`}
            >
              {teaserImages.map((imageUrl, index) => {
                const isPrimary = index === 0;

                return (
                  <div
                    className={
                      isPrimary
                        ? "relative h-full min-h-[7rem] overflow-hidden rounded-lg border border-[#44f26e]/60 bg-black shadow-[0_18px_45px_rgba(68,242,110,0.22)]"
                        : "relative h-full min-h-[7rem] overflow-hidden rounded-lg border border-white/16 bg-black shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
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
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/14 bg-black/62 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur sm:p-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-black">
              {paidUnlockLabel}
            </span>
            <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/72">
              {copy.embeddedUnlockMeta}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-black leading-tight">
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
      </div>
    </div>
  );
}

function SourceVlogEmbed({
  accessLabel,
  blurred,
  copy,
  isPaidContent,
  locale,
  newsConnectHref,
  paidUnlockHref,
  pinUnlockHref,
  reportCoverImageSource,
  priceUsdt,
  reportCoverImageUrl,
  sourceMaturityRating,
  sourceReveal,
  sourceContent,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  isPaidContent: boolean;
  locale: Locale;
  newsConnectHref: string;
  paidUnlockHref: string | null;
  pinUnlockHref: string;
  reportCoverImageSource?: FanletterNewsReportDocument["coverImageSource"];
  priceUsdt: string | null;
  reportCoverImageUrl: string | null;
  sourceMaturityRating: FanletterNewsReportDocument["contentMaturityRating"];
  sourceReveal: SourceVlogRevealGateState | null;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const sourceRevealLocked = Boolean(sourceReveal && !sourceReveal.unlocked);
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
        sourceContent?.contentImageUrls[0] ??
        null
      : sourceContent?.coverImageUrl ??
        sourceContent?.contentImageUrls[0] ??
        reportCoverImageUrl;
  const sourceTeaserImageUrls = getUniqueImageUrls([
    sourceImageUrl,
    ...(sourceContent?.coverImageCandidates ?? []).map(
      (candidate) => candidate.url,
    ),
    ...(sourceContent?.contentImageUrls ?? []),
    reportCoverImageUrl,
  ]).slice(0, 4);
  const hasEmbeddedVideo = Boolean(sourceVideoUrl);
  const paidUnlockAmount = priceUsdt ?? CONTENT_PAID_USDT_AMOUNT;
  const paidUnlockLabel = `${paidUnlockAmount} USDT`;
  const isSourceNsfw = sourceMaturityRating === "nsfw";
  const shouldRequireNsfwVideoPin = isSourceNsfw && hasEmbeddedVideo;
  const viewerCanAccessSource = sourceContent
    ? sourceContent.canViewerAccess === true
    : !isPaidContent;
  const isViewerSourceOwner = sourceContent?.viewerRelation === "owner";
  const isPurchasedPaidContent =
    isPaidContent && viewerCanAccessSource && !isViewerSourceOwner;
  const statusBadges = [
    {
      className: isPaidContent
        ? "border-[#1eb84a]/22 bg-[#ecfff0] text-[#126c2c]"
        : "border-black/10 bg-white text-black/56",
      icon: isPaidContent ? Coins : PlayCircle,
      label: isPaidContent
        ? copy.embeddedVlogStatus.paid(paidUnlockLabel)
        : copy.embeddedVlogStatus.free,
    },
    {
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
    },
    {
      className: isSourceNsfw
        ? "border-rose-500/18 bg-rose-50 text-rose-700"
        : "border-black/10 bg-white text-black/56",
      icon: isSourceNsfw ? AlertTriangle : CheckCircle2,
      label: isSourceNsfw
        ? copy.embeddedVlogStatus.nsfw
        : copy.embeddedVlogStatus.general,
    },
  ];
  const sourceStatusBody = isPaidContent
    ? viewerCanAccessSource
      ? isViewerSourceOwner
        ? copy.embeddedVlogStatus.paidOwnerBody
        : copy.embeddedVlogStatus.paidPurchasedBody
      : copy.embeddedVlogStatus.paidLockedBody
    : copy.embeddedVlogStatus.publicBody;
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
  const noticeMessage = blurred
    ? copy.nsfwBlurNotice
    : shouldShowPaidUnlockCta
      ? copy.embeddedLockedPaid(paidUnlockLabel)
      : copy.embeddedLocked;

  return (
    <section className="mt-7 border border-black/12 bg-white p-4 shadow-[0_14px_42px_rgba(17,21,16,0.06)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#111510]">
          <Clapperboard className="size-4 text-[#16702e]" />
          {copy.embeddedTitle}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1 text-[0.68rem] font-bold text-black/64">
            <PlayCircle className="size-3.5" />
            {accessLabel}
          </span>
          {statusBadges.map((badge) => {
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
      </div>
      <div className="overflow-hidden border border-black/10 bg-black shadow-[0_20px_46px_rgba(17,21,16,0.1)]">
        {sourceRevealLocked && sourceReveal ? (
          <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-video">
            {sourceImageUrl ? (
              <Image
                alt={sourceContent?.title ?? copy.embeddedTitle}
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
            <SourceVlogRevealTeaserOverlay
              blurred={sourceMediaBlurred}
              connectHref={sourceReveal.connectHref}
              imageUrls={sourceTeaserImageUrls}
              locale={locale}
              reportId={sourceReveal.reportId}
              sourceReveal={sourceReveal}
            />
          </div>
        ) : shouldShowPaidTeaser && paidUnlockHref ? (
          <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-video">
            {sourceImageUrl ? (
              <Image
                alt={sourceContent?.title ?? copy.embeddedTitle}
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
              imageUrls={sourceTeaserImageUrls}
              locale={locale}
              paidUnlockHref={paidUnlockHref}
              paidUnlockLabel={paidUnlockLabel}
              showPaidUnlockCta={shouldShowPaidUnlockCta}
            />
          </div>
        ) : (
          <FanletterResponsiveMediaFrame
            alt={sourceContent?.title ?? copy.embeddedTitle}
            blurred={sourceMediaBlurred}
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
            title={sourceContent?.title ?? copy.embeddedTitle}
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
      </div>
      {sourceReveal?.unlocked ? (
        <FanletterNewsSourceRevealVote
          className="mt-3"
          connectHref={sourceReveal.connectHref}
          initialState={sourceReveal}
          locale={locale}
          reportId={sourceReveal.reportId}
          tone="light"
        />
      ) : null}
      <div className="mt-3 rounded-lg border border-black/10 bg-[#f7f9f4] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
            <BadgeCheck className="size-3.5" />
            {copy.embeddedVlogStatus.title}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {statusBadges.map((badge) => {
              const Icon = badge.icon;

              return (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.66rem] font-black ${badge.className}`}
                  key={`status-${badge.label}`}
                >
                  <Icon className="size-3.5" />
                  {badge.label}
                </span>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-black/58">
          {sourceStatusBody}
        </p>
      </div>
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
      <p className="mt-2 text-xs font-medium leading-5 text-black/46">
        {sourceContent?.title ?? copy.sourceTitle}
      </p>
    </section>
  );
}

function SourceContextCard({
  accessLabel,
  blurred,
  copy,
  report,
  sourceVlogHref,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  report: FanletterNewsReportDocument;
  sourceVlogHref: string;
}) {
  const textBlurClass = blurred ? "select-none blur-[2px]" : "";

  return (
    <section className="border border-black/10 bg-white/80 p-3 text-[#111510] shadow-[0_10px_28px_rgba(17,21,16,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
            {copy.sourceContext}
          </p>
          <h2 className="mt-1 text-base font-black leading-tight">
            {copy.sourceTitle}
          </h2>
          <p
            className={`mt-1 line-clamp-1 text-xs font-semibold text-black/48 ${textBlurClass}`}
          >
            {report.sourceTitle}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 border border-black/10 bg-[#f5f7f1] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/52">
          <PlayCircle className="size-3.5 text-[#16702e]" />
          {accessLabel}
        </span>
      </div>
      <Link
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-3 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
        href={sourceVlogHref}
      >
        <Clapperboard className="size-4 text-[#16702e]" />
        {copy.sourceTitle}
        <ArrowUpRight className="size-4 text-black/42" />
      </Link>
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
    ? `${reportTitle} | FanLetter News`
    : locale === "ko"
      ? "FanLetter AI 팬 리포트"
      : "FanLetter AI fan report";
  const description =
    report?.dek ??
    (locale === "ko"
      ? "FanLetter 브이로그를 팬 기자 관점으로 정리한 AI 팬 리포트입니다."
      : "An AI fan report summarizing a FanLetter vlog from the fan reporter perspective.");
  const url = report
    ? createFanletterNewsReportShareHref(report)
    : `/${locale}/fanletter/news/${reportId}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: report?.coverImageUrl
        ? [
            {
              alt: report.title,
              url: report.coverImageUrl,
            },
          ]
        : undefined,
      siteName: "FanLetter News",
      title,
      type: "article",
      url,
    },
    twitter: {
      card: report?.coverImageUrl ? "summary_large_image" : "summary",
      description,
      images: report?.coverImageUrl ? [report.coverImageUrl] : undefined,
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
  const relatedNewsVisibleCount = readRelatedNewsVisibleCount(
    query.relatedLimit,
  );
  const memberServerSession = await readMemberServerSession();
  const [
    sourceContent,
    relatedReports,
    reporterIncentiveStats,
    reporterReportIncentiveStats,
    reporterProfile,
  ] = await Promise.all([
    getFanletterPublicContentDetail(
      report.contentId,
      locale,
      memberServerSession?.email ?? null,
      {
        includeNsfw,
      },
    ).catch(() => null),
    getRelatedFanletterNewsReports({
      creatorReferralCode: report.creatorReferralCode,
      excludeContentId: report.contentId,
      excludeReportId: report.reportId,
      limit: relatedNewsVisibleCount + 1,
      locale,
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
  ]);
  const copy = getCopy(locale);
  const articleTitle = getArticleDisplayTitle(report.title);
  const isFirstNewsReport = isFanletterNewsFirstReportForContent(report);
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
  const newsConnectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: articleHref },
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
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    referralCode,
  );
  const paidUnlockOnboardingHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, referralCode),
    { returnTo: articleHref },
  );
  const creatorHref = report.creatorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/characters/${report.creatorReferralCode}`,
        referralCode,
      )
    : fanletterHomeHref;
  const visibleRelatedReports = relatedReports.slice(0, relatedNewsVisibleCount);
  const relatedNewsItems = visibleRelatedReports.map((relatedReport) =>
    serializeFanletterRelatedNewsItem({
      nsfwOptInEnabled: includeNsfw,
      referralCode,
      report: relatedReport,
    }),
  );
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
      ? `${characterName}의 다른 뉴스`
      : `More ${characterName} news`
    : copy.relatedNews;
  const relatedNewsApiHref = setPathSearchParams(
    "/api/fanletter/news-reports/related",
    {
      limit: String(RELATED_NEWS_PAGE_SIZE),
      locale,
      ref: referralCode,
      reportId: report.reportId,
    },
  );
  const relatedNewsHasMore = relatedReports.length > relatedNewsVisibleCount;
  const publishedAt = formatDate(report.sourcePublishedAt, locale);
  const articleParagraphs = splitArticleBody(report.body);
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
  const navLinks = [
    {
      href: creatorHref,
      label: copy.navItems[0] ?? copy.articleActions.character,
    },
    { href: reporterNewsHref, label: copy.navItems[1] ?? copy.byline },
    { href: sourceVlogHref, label: copy.navItems[2] ?? copy.sourceTitle },
    { href: purchasesHref, label: copy.navItems[3] ?? "Purchases" },
  ];
  const facts = [
    { label: copy.sixW.who, value: report.who },
    { label: copy.sixW.when, value: report.when },
    { label: copy.sixW.where, value: report.where },
    { label: copy.sixW.what, value: report.what },
    { label: copy.sixW.why, value: report.why },
    { label: copy.sixW.how, value: report.how },
  ];
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
      <NewsSiteHeader
        copy={copy}
        homeHref={newsHomeHref}
        locale={locale}
        navLinks={navLinks}
        referralCode={referralCode}
        walletHref={walletHref}
      />

      <article className="mx-auto max-w-[92rem] px-3 pb-14 pt-4 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <div className="grid gap-5 sm:gap-7 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
          <div className="min-w-0">
            <header className="overflow-hidden border border-black/12 bg-white shadow-[0_14px_40px_rgba(17,21,16,0.07)] sm:shadow-[0_20px_56px_rgba(17,21,16,0.08)]">
              <div className="border-b-2 border-[#111510] bg-[#111510] px-3 py-2.5 sm:px-6 sm:py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/58">
                  <span className="text-[#44f26e]">{copy.articleSection}</span>
                  <span className="h-3 w-px bg-white/18" aria-hidden="true" />
                  <span>{accessLabel}</span>
                  <span className="h-3 w-px bg-white/18" aria-hidden="true" />
                  <span>{copy.aiReport}</span>
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
              <div className="p-3.5 sm:p-6 lg:p-7">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,14rem)] lg:items-start">
                  <div className="min-w-0">
                    <h1
                      className={`max-w-5xl break-words text-[1.72rem] font-black leading-[1.14] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[3.25rem] sm:leading-[1.06] lg:text-[3.75rem] ${nsfwTextBlurClass}`}
                    >
                      {articleTitle}
                    </h1>
                    <p
                      className={`mt-3 max-w-3xl text-[0.98rem] font-medium leading-7 text-black/62 sm:mt-4 sm:text-[1.22rem] sm:leading-9 ${nsfwTextBlurClass}`}
                    >
                      {report.dek}
                    </p>
                  </div>
                  <ArticleTitleCharacterThumbnail
                    blurred={shouldBlurCurrentReport}
                    copy={copy}
                    creatorHref={creatorHref}
                    creatorReferralCode={report.creatorReferralCode}
                    imageUrl={titleCharacterThumbnailUrl}
                    name={characterName ?? report.creatorName}
                  />
                </div>

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

                <ArticleActionLinks
                  copy={copy}
                  creatorHref={creatorHref}
                  locale={locale}
                  newsHomeHref={newsHomeHref}
                  referralCode={referralCode}
                  shareHref={articleHref}
                  shareSummary={report.dek}
                  shareTitle={articleTitle}
                  sourceVlogHref={sourceVlogHref}
                />
              </div>
            </header>

            <ArticleVisualLead
              accessLabel={accessLabel}
              blurred={shouldBlurCurrentReport}
              copy={copy}
              report={report}
              sourceContent={sourceContent}
            />

            {shouldShowNsfwControl ? (
              <div className="mt-5">
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

            <section className="mt-5 overflow-hidden border border-black/12 bg-white shadow-[0_12px_34px_rgba(17,21,16,0.045)] sm:mt-7 sm:shadow-[0_14px_42px_rgba(17,21,16,0.05)]">
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

            <CharacterContinueReadingPanel
              characterAvatarImageUrl={characterAvatarImageUrl}
              characterName={characterName}
              copy={copy}
              creatorHref={creatorHref}
              items={relatedNewsItems}
            />

            <CharacterIdentityFeature
              copy={copy}
              creatorHref={creatorHref}
              locale={locale}
              sourceContent={sourceContent}
            />

            <div className="scroll-mt-6" id={sourceVlogSectionId}>
              <SourceVlogEmbed
                accessLabel={accessLabel}
                blurred={shouldBlurCurrentReport}
                copy={copy}
                isPaidContent={isPaidSourceContent}
                locale={locale}
                newsConnectHref={newsConnectHref}
                paidUnlockHref={paidUnlockHref}
                pinUnlockHref={pinUnlockHref}
                priceUsdt={paidUnlockAmount}
                reportCoverImageSource={report.coverImageSource}
                reportCoverImageUrl={report.coverImageUrl}
                sourceMaturityRating={
                  sourceContent?.contentMaturityRating ??
                  report.contentMaturityRating
                }
                sourceReveal={sourceReveal}
                sourceContent={sourceContent}
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
                    report.dek
                  }
                  initialCoverImageUrl={
                    sourceContent?.coverImageUrl ?? report.coverImageUrl
                  }
                  initialSummary={
                    sourceContent?.summary ??
                    report.sourceSummary ??
                    report.dek
                  }
                  initialTitle={sourceContent?.title ?? report.sourceTitle}
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

          <aside className="space-y-4 xl:sticky xl:top-5">
            <FanletterNewsRelatedList
              characterName={characterName}
              copy={{
                description: copy.relatedNewsDescription,
                empty: copy.relatedNewsEmpty,
                eyebrow: copy.relatedNewsEyebrow,
                error: copy.relatedNewsError,
                loadMore: copy.relatedNewsLoadMore,
                loading: copy.relatedNewsLoading,
                title: relatedNewsTitle,
              }}
              initialHasMore={relatedNewsHasMore}
              initialItems={relatedNewsItems}
              key={relatedNewsApiHref}
              pageSize={RELATED_NEWS_PAGE_SIZE}
              relatedApiHref={relatedNewsApiHref}
              relatedStateParamName={RELATED_NEWS_LIMIT_PARAM}
            />

            <SourceContextCard
              accessLabel={accessLabel}
              blurred={shouldBlurCurrentReport}
              copy={copy}
              report={report}
              sourceVlogHref={sourceVlogHref}
            />

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
      </article>

    </main>
  );
}
