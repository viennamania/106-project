import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clapperboard,
  FileText,
  Flame,
  Heart,
  ImageIcon,
  LockKeyhole,
  MessageCircleHeart,
  Newspaper,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";

import { FanletterChannelShareButton } from "@/components/fanletter-channel-share-button";
import { FanletterNewsCharacterImageSelector } from "@/components/fanletter-news-character-image-selector";
import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import type { FanletterNewsReportDocument } from "@/lib/content";
import {
  getFanletterCreatorPageData,
  type FanletterPublicContentItem,
  type FanletterPublicFanRequestPreview,
} from "@/lib/fanletter-content-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsReportsForCharacterChannel,
  type FanletterNewsCharacterReporterStat,
} from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsFirstReportBadgeLabel,
  isFanletterNewsFirstReportForContent,
} from "@/lib/fanletter-news-related";
import { FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD } from "@/lib/fanletter-news-source-reveal";
import {
  getFanletterNewsCharacterVlogsHref,
  getFanletterNewsVlogHref,
} from "@/lib/fanletter-news-vlog-routing";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  getFanletterNsfwCopy,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  FANLETTER_OG_IMAGE_SIZE,
  buildFanletterOgImagePath,
  buildFanletterOgVersionToken,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsCharacterChannelSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        access: {
          fanOnly: "팬 전용",
          nsfw: "성인 팬 전용",
          public: "공개",
        },
        activity: {
          body:
            "공개 브이로그, 팬 전용 브이로그, 팬 요청을 시간순으로 묶어 이 AI 캐릭터의 하루가 어떻게 이어지는지 보여줍니다.",
          empty: "아직 표시할 활동 기록이 없습니다.",
          eyebrow: "AI 캐릭터 활동",
          fanOnlyVlog: "팬 전용 브이로그",
          publicVlog: "공개 브이로그",
          request: "팬 요청",
          title: "최근 일상 기록",
        },
        backToCharacters: "AI 캐릭터 목록",
        returnToNews: "읽던 뉴스로 돌아가기",
        bible: {
          emptyTraits: "캐릭터 고정 키워드가 아직 정리되지 않았습니다.",
          expression: "표정 세트",
          latestMission: "다음 미션",
          level: "성장 레벨",
          title: "캐릭터 바이블",
          traits: "페르소나 키워드",
        },
        cta: {
          dailyVlogs: "일상 브이로그 보기",
          latestNews: "최신 뉴스 읽기",
          publicVlogs: "공개 브이로그 보기",
          request: "팬 요청 남기기",
        },
        empty: {
          body:
            "이 캐릭터의 FanLetter News 리포트가 아직 없습니다. 공개 브이로그에서 AI 팬 리포트가 생성되면 이 채널에 축적됩니다.",
          title: "뉴스 리포트가 아직 없습니다.",
        },
        generated: "AI 캐릭터 이미지",
        growth: {
          fanClub: "팬클럽",
          fanOnly: "팬 전용",
          news: "뉴스",
          publicVlogs: "공개 브이로그",
          reactions: "반응",
          title: "IP 성장 보드",
          unlocks: "유료 열람",
        },
        hero: {
          eyebrow: "FanLetter News Character Channel",
          kicker: "뉴스 전용 캐릭터 IP 채널",
          shareSummary: (name: string) =>
            `${name}의 FanLetter News 캐릭터 채널`,
          shareTitle: (name: string) => `${name} 뉴스 캐릭터 채널`,
        },
        latest: "최신",
        news: {
          body:
            "팬 기자들이 같은 AI 캐릭터의 일상을 각자의 관점으로 빠르게 리포트합니다. 최초 리포트와 팬 요청 기반 뉴스가 캐릭터 IP의 확장 포인트입니다.",
          fanOnly: "팬 전용 뉴스",
          fanRequestBased: "팬 요청 기반",
          firstReport: "최초 팬 리포트",
          public: "공개 뉴스",
          readCta: "뉴스 읽기",
          reporters: "참여 기자",
          title: "뉴스 프랜차이즈",
        },
        purchases: "구매함",
        nsfwControl: {
          disabledBody:
            "성인 팬 전용 캐릭터 뉴스와 브이로그 커버는 블러 처리됩니다.",
          disabledTitle: "NSFW 캐릭터 콘텐츠 블러",
          enabledBody:
            "성인 팬 전용 캐릭터 뉴스와 브이로그 커버가 선명하게 표시됩니다.",
          enabledTitle: "NSFW 캐릭터 콘텐츠 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 콘텐츠 ${count}개`,
        },
        reporter: {
          title: "리포터 커버리지",
          reports: (count: string) => `${count}개 리포트`,
        },
        revenue: {
          body:
            "팬들이 실제로 결제한 유료 브이로그 성과입니다. 뉴스 소비자에게 이 캐릭터가 돈을 벌고 있다는 신호를 전면에 보여줍니다.",
          cta: "팬 전용 브이로그 보기",
          emptyBody:
            "첫 유료 판매가 발생하면 누적 매출, 유료 판매 수, 최근 7일 판매 흐름이 이 영역에 크게 표시됩니다.",
          emptyTitle: "수익 신호 대기 중",
          eyebrow: "Paid Heat",
          cardRevenue: "매출",
          cardSales: "판매",
          hotBadge: "잘 팔림",
          recent: "최근 7일 판매",
          revenue: "누적 매출",
          sales: "유료 판매",
          title: "돈 잘 버는 AI 캐릭터",
          walletOpened: "팬들이 지갑 연 캐릭터",
        },
        requests: {
          body:
            "팬이 남긴 장면 요청은 다음 공개 브이로그나 팬 전용 답장 브이로그의 소재가 됩니다.",
          empty: "최근 팬 요청이 아직 없습니다.",
          quickIdeas: [
            {
              action: "질문 답변",
              label: "카페에서 Q&A 답장",
              location: "카페",
              mood: "일상",
              note: "카페에서 요즘 좋아하는 음악, 음식, 장소를 짧게 답해 주세요.",
            },
            {
              action: "팬 하루 질문",
              label: "오늘의 음악과 음식",
              location: "방",
              mood: "일상",
              note: "오늘 들은 음악과 먹고 싶은 음식을 팬에게 말해 주세요.",
            },
            {
              action: "다음 장면 예고",
              label: "출근 준비 루틴",
              location: "방",
              mood: "응원",
              note: "출근 준비 루틴을 보여주고 팬에게 오늘도 힘내라고 말해 주세요.",
            },
            {
              action: "응원",
              label: "팬에게 짧은 답장",
              location: "스튜디오",
              mood: "위로",
              note: "팬 댓글 하나에 짧게 답장하고 고맙다고 말해 주세요.",
            },
          ],
          quickTitle: "빠른 장면 요청",
          title: "팬 참여 루프",
        },
        siteName: "FanLetter News",
        sourceReveal: {
          bodyLocked: (remaining: string) => `${remaining}명 더 누르면 원본 오픈`,
          bodyReady: "팬들이 열어낸 원본",
          complete: "오픈 완료",
          eyebrow: "팬 오픈 진행",
          label: "원본 오픈",
          remaining: (count: string) => `${count}명 남음`,
          requested: "참여 완료",
        },
        today: {
          body:
            "최근 팬 반응과 브이로그 기록을 따라가며 캐릭터의 일상을 이어서 확인하세요.",
          emptyBody:
            "공개 브이로그나 팬 요청이 올라오면 이곳에서 바로 일상 기록으로 이어집니다.",
          emptyTitle: "아직 오늘의 기록이 준비 중입니다.",
          eyebrow: "오늘의 일상",
        },
        vlog: {
          body:
            "팬이 캐릭터의 일상을 가장 먼저 확인하는 공간입니다. 원본 오픈 진행률과 리포트 수를 함께 보며 다음에 볼 장면을 고를 수 있습니다.",
          emptyFanOnly: "표시 가능한 팬 전용 브이로그가 아직 없습니다.",
          eyebrow: "Daily Vlog Archive",
          fanOnlyTitle: "팬 전용 브이로그",
          publicTitle: "공개 브이로그",
          reports: "리포트",
        },
      }
    : {
        access: {
          fanOnly: "Fan-only",
          nsfw: "Adult fan-only",
          public: "Public",
        },
        activity: {
          body:
            "Public vlogs, fan-only vlogs, and fan requests are grouped by recency so the AI character's day is easy to follow.",
          empty: "No activity records yet.",
          eyebrow: "AI character activity",
          fanOnlyVlog: "Fan-only vlog",
          publicVlog: "Public vlog",
          request: "Fan request",
          title: "Recent daily log",
        },
        backToCharacters: "AI characters",
        returnToNews: "Back to news",
        bible: {
          emptyTraits: "The fixed persona keywords are not set yet.",
          expression: "Expression set",
          latestMission: "Next mission",
          level: "Growth level",
          title: "Character bible",
          traits: "Persona keywords",
        },
        cta: {
          dailyVlogs: "Daily vlogs",
          latestNews: "Read latest news",
          publicVlogs: "Public vlogs",
          request: "Leave a fan request",
        },
        empty: {
          body:
            "FanLetter News reports for this character will collect here after AI fan reports are created from public vlogs.",
          title: "No news reports yet.",
        },
        generated: "AI character image",
        growth: {
          fanClub: "Fan club",
          fanOnly: "Fan-only",
          news: "News",
          publicVlogs: "Public vlogs",
          reactions: "Reactions",
          title: "IP growth board",
          unlocks: "Paid unlocks",
        },
        hero: {
          eyebrow: "FanLetter News Character Channel",
          kicker: "News-only character IP channel",
          shareSummary: (name: string) =>
            `${name}'s FanLetter News character channel`,
          shareTitle: (name: string) => `${name} news character channel`,
        },
        latest: "Latest",
        news: {
          body:
            "Fan reporters expand the same AI character's day from different angles. First reports and fan-request-based stories become the growth points for the character IP.",
          fanOnly: "Fan-only news",
          fanRequestBased: "Fan request",
          firstReport: "First fan report",
          public: "Public news",
          readCta: "Read news",
          reporters: "Reporters",
          title: "News franchise",
        },
        purchases: "Purchases",
        nsfwControl: {
          disabledBody:
            "Adult fan-only character news and vlog covers are blurred.",
          disabledTitle: "NSFW character content blurred",
          enabledBody:
            "Adult fan-only character news and vlog covers are visible.",
          enabledTitle: "NSFW character content visible",
          hiddenCountText: (count: string) => `${count} NSFW items blurred`,
        },
        reporter: {
          title: "Reporter coverage",
          reports: (count: string) => `${count} reports`,
        },
        revenue: {
          body:
            "Confirmed paid vlog sales. This makes the character's earning signal visible to news readers.",
          cta: "View fan-only vlogs",
          emptyBody:
            "Once the first paid sale lands, total revenue, paid sales, and recent 7-day sales will be featured here.",
          emptyTitle: "Revenue signal pending",
          eyebrow: "Paid Heat",
          cardRevenue: "Revenue",
          cardSales: "Sales",
          hotBadge: "Selling",
          recent: "7-day sales",
          revenue: "Revenue",
          sales: "Paid sales",
          title: "Revenue-making AI character",
          walletOpened: "Fans opened their wallets",
        },
        requests: {
          body:
            "Fan scene requests can become the next public vlog or a fan-only reply vlog.",
          empty: "No recent fan requests yet.",
          quickIdeas: [
            {
              action: "Answer questions",
              label: "Cafe Q&A reply",
              location: "Cafe",
              mood: "Daily",
              note: "Answer what music, food, and places you like lately from a cafe.",
            },
            {
              action: "Ask about the fan's day",
              label: "Today's music and food",
              location: "Room",
              mood: "Daily",
              note: "Tell fans what music you listened to and what food you want today.",
            },
            {
              action: "Tease the next scene",
              label: "Getting-ready routine",
              location: "Room",
              mood: "Supportive",
              note: "Show a getting-ready routine and tell fans to have a strong day.",
            },
            {
              action: "Cheer fans on",
              label: "Short fan reply",
              location: "Studio",
              mood: "Comfort",
              note: "Reply briefly to one fan comment and say thank you.",
            },
          ],
          quickTitle: "Quick scene ideas",
          title: "Fan participation loop",
        },
        siteName: "FanLetter News",
        sourceReveal: {
          bodyLocked: (remaining: string) =>
            `${remaining} more fan${remaining === "1" ? "" : "s"} to open`,
          bodyReady: "Source opened by fans",
          complete: "Opened",
          eyebrow: "Fan open progress",
          label: "Source open",
          remaining: (count: string) =>
            `${count} fan${count === "1" ? "" : "s"} left`,
          requested: "Joined",
        },
        today: {
          body:
            "Follow the latest fan reactions and vlog records to keep exploring this character's day.",
          emptyBody:
            "New public vlogs and fan requests will appear here as the character's daily log.",
          emptyTitle: "Today's log is not ready yet.",
          eyebrow: "Today's daily life",
        },
        vlog: {
          body:
            "This is where fans can follow the character's daily life first, with source-open progress and report counts beside each vlog.",
          emptyFanOnly: "No displayable fan-only vlogs yet.",
          eyebrow: "Daily Vlog Archive",
          fanOnlyTitle: "Fan-only vlogs",
          publicTitle: "Public vlogs",
          reports: "reports",
        },
      };
}

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatUsdtAmount(value: string | number | null | undefined, locale: Locale) {
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: safeValue > 0 && safeValue < 1 ? 2 : 0,
  }).format(safeValue)} USDT`;
}

function getPaidRevenueValue(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getArticleDisplayTitle(title: string) {
  return title.replace(/^\[(AI 팬 리포트|AI fan report)\]\s*/i, "");
}

function isFanRequestBasedReport(report: FanletterNewsReportDocument) {
  return /팬 요청|fan request|request/i.test(
    [report.title, report.sourceTitle, report.dek].join(" "),
  );
}

function getReportDate(report: FanletterNewsReportDocument) {
  return report.sourcePublishedAt ?? report.createdAt ?? null;
}

function isNsfwMaturity(value: string | null | undefined) {
  return value === "nsfw";
}

function getAccessLabel(
  value: Pick<FanletterNewsReportDocument | FanletterPublicContentItem, "contentMaturityRating" | "priceType">,
  copy: ReturnType<typeof getCopy>,
) {
  if (isNsfwMaturity(value.contentMaturityRating)) {
    return copy.access.nsfw;
  }

  return value.priceType === "paid" ? copy.access.fanOnly : copy.access.public;
}

function getUniqueImageOptions(
  character: NonNullable<
    Awaited<ReturnType<typeof getFanletterCreatorPageData>>
  >["profile"]["character"],
  avatarImageUrl: string | null,
) {
  const seen = new Set<string>();
  const options = [
    ...(character?.avatarImageSet ?? []).map((avatar) => ({
      label: avatar.label ?? avatar.expression ?? null,
      url: avatar.url,
    })),
    avatarImageUrl ? { label: null, url: avatarImageUrl } : null,
  ].filter((option): option is { label: string | null; url: string } =>
    Boolean(option?.url),
  );

  return options.filter((option) => {
    if (seen.has(option.url)) {
      return false;
    }

    seen.add(option.url);
    return true;
  });
}

function CharacterChannelMasthead({
  charactersHref,
  copy,
  newsHomeHref,
  purchasesHref,
  returnToNewsHref,
}: {
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  newsHomeHref: string;
  purchasesHref: string;
  returnToNewsHref: string | null;
}) {
  return (
    <header className="border-b border-black/14 bg-white text-[#111510]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
          <Link
            className="inline-flex items-center text-[2.1rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.25rem]"
            href={newsHomeHref}
          >
            {copy.siteName}
          </Link>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Link
              className="inline-flex items-center gap-2 border border-black/14 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={returnToNewsHref ?? charactersHref}
            >
              <ArrowLeft className="size-4 text-[#16702e]" />
              {returnToNewsHref ? copy.returnToNews : copy.backToCharacters}
            </Link>
            {returnToNewsHref ? (
              <Link
                className="inline-flex items-center gap-2 border border-black/14 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={charactersHref}
              >
                {copy.backToCharacters}
              </Link>
            ) : null}
            <Link
              className="inline-flex items-center gap-2 border border-black/14 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={purchasesHref}
            >
              <BookOpen className="size-4 text-[#16702e]" />
              {copy.purchases}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function MetricTile({
  label,
  value,
  icon,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border border-black/10 bg-white p-3 shadow-[0_12px_28px_rgba(17,21,16,0.05)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/42">
          {label}
        </p>
        <span className="text-[#16702e]">{icon}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-black leading-none text-[#111510]">
        {value}
      </p>
    </div>
  );
}

function CoverImage({
  alt,
  blurred,
  imageUrl,
  sizes,
}: {
  alt: string;
  blurred: boolean;
  imageUrl: string | null;
  sizes: string;
}) {
  return (
    <div className="relative min-h-[12rem] overflow-hidden bg-[#111510]">
      {imageUrl ? (
        <Image
          alt={alt}
          className={
            blurred
              ? "scale-[1.05] object-cover blur-md brightness-[0.7] saturate-[0.86]"
              : "object-cover"
          }
          fill
          sizes={sizes}
          src={imageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
        />
      ) : (
        <div className="flex h-full min-h-[12rem] items-center justify-center bg-[#111510] text-[#44f26e]">
          <ImageIcon className="size-10" />
        </div>
      )}
      {blurred ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/38 p-3 text-center">
          <span className="inline-flex items-center gap-1.5 border border-white/20 bg-black/64 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white">
            <AlertTriangle className="size-3.5 text-rose-300" />
            NSFW
          </span>
        </div>
      ) : null}
    </div>
  );
}

function getSourceRevealCardState(item: FanletterPublicContentItem) {
  const threshold = FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD;
  const count = Math.max(0, Math.floor(item.social.sourceRevealCount));
  const clampedCount = Math.min(count, threshold);
  const remaining = Math.max(0, threshold - count);

  return {
    clampedCount,
    count,
    percent:
      threshold > 0
        ? Math.min(100, Math.max(0, (clampedCount / threshold) * 100))
        : 100,
    remaining,
    requestedByViewer: item.social.sourceRevealRequestedByViewer,
    threshold,
    unlocked: count >= threshold,
  };
}

function SourceRevealProgressBar({
  className,
  percent,
  unlocked,
}: {
  className?: string;
  percent: number;
  unlocked: boolean;
}) {
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-black/10 ${className ?? ""}`}
    >
      <div
        className={
          unlocked
            ? "h-full rounded-full bg-[#44f26e] transition-[width]"
            : "h-full rounded-full bg-[linear-gradient(90deg,#44f26e,#b5ff4d)] transition-[width]"
        }
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function NewsReportCard({
  copy,
  locale,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const blurred = isNsfwMaturity(report.contentMaturityRating) && !nsfwOptInEnabled;
  const href = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const publishedAt = formatDate(getReportDate(report), locale);
  const firstReport = isFanletterNewsFirstReportForContent(
    report as FanletterNewsReportDocument & {
      firstNewsReportForContent?: boolean;
    },
  );
  const fanRequestBased = isFanRequestBasedReport(report);

  return (
    <article className="grid min-w-0 overflow-hidden border border-black/12 bg-white">
      <Link className="relative block" href={href}>
        <CoverImage
          alt=""
          blurred={blurred}
          imageUrl={report.coverImageUrl}
          sizes="(max-width: 768px) 100vw, 24rem"
        />
        {firstReport ? (
          <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black uppercase leading-none tracking-[0.08em] text-black shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
            <span className="truncate">
              {getFanletterNewsFirstReportBadgeLabel(locale)}
            </span>
          </span>
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.1em]">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {getAccessLabel(report, copy)}
          </span>
          {firstReport ? (
            <span className="border border-[#1eb84a]/20 bg-[#eaffef] px-2 py-1 text-[#11732d]">
              {copy.news.firstReport}
            </span>
          ) : null}
          {fanRequestBased ? (
            <span className="border border-black/10 bg-[#f5f6f2] px-2 py-1 text-black/58">
              {copy.news.fanRequestBased}
            </span>
          ) : null}
          {publishedAt ? <span className="text-black/38">{publishedAt}</span> : null}
        </div>
        <Link
          className={`mt-3 line-clamp-2 break-words text-lg font-black leading-6 [word-break:keep-all] hover:text-[#16702e] ${
            blurred ? "select-none blur-[2px]" : ""
          }`}
          href={href}
        >
          {getArticleDisplayTitle(report.title)}
        </Link>
        <p
          className={`mt-2 line-clamp-3 text-sm font-semibold leading-6 text-black/58 ${
            blurred ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/10 pt-3">
          <span className="truncate text-xs font-bold text-black/42">
            {report.reporterName}
          </span>
          <span className="shrink-0 text-xs font-black text-[#16702e]">
            {copy.news.readCta}
          </span>
        </div>
      </div>
    </article>
  );
}

function ContentCard({
  copy,
  href: hrefInput,
  item,
  locale,
  nsfwOptInEnabled,
  referralCode,
  showSourceReveal = false,
}: {
  copy: ReturnType<typeof getCopy>;
  href?: string;
  item: FanletterPublicContentItem;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  showSourceReveal?: boolean;
}) {
  const blurred = isNsfwMaturity(item.contentMaturityRating) && !nsfwOptInEnabled;
  const href =
    hrefInput ??
    buildPathWithReferral(
      `/${locale}/fanletter/content/${item.contentId}`,
      referralCode,
    );
  const publishedAt = formatDate(item.publishedAt, locale);
  const sourceReveal = getSourceRevealCardState(item);
  const countLabel = formatNumber(sourceReveal.clampedCount, locale);
  const thresholdLabel = formatNumber(sourceReveal.threshold, locale);
  const remainingLabel = formatNumber(sourceReveal.remaining, locale);
  const sourceRevealStatus = sourceReveal.unlocked
    ? copy.sourceReveal.complete
    : sourceReveal.requestedByViewer
      ? copy.sourceReveal.requested
      : copy.sourceReveal.remaining(remainingLabel);
  const shouldShowPaidPerformance = item.priceType === "paid";
  const hasPaidSales = item.social.paidBuyerCount > 0;
  const paidSalesLabel = formatNumber(item.social.paidBuyerCount, locale);
  const paidRevenueLabel = formatUsdtAmount(item.social.paidTotalUsdt, locale);

  return (
    <article className="grid min-w-0 overflow-hidden border border-black/12 bg-white">
      <Link className="relative block" href={href}>
        <CoverImage
          alt=""
          blurred={blurred}
          imageUrl={item.coverImageUrl}
          sizes="(max-width: 768px) 100vw, 22rem"
        />
        {showSourceReveal ? (
          <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/16 bg-black/72 p-3 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ${
                    sourceReveal.unlocked
                      ? "bg-[#44f26e] text-black"
                      : "bg-[#44f26e]/14 text-[#44f26e]"
                  }`}
                >
                  {sourceReveal.unlocked ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <UsersRound className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                    {copy.sourceReveal.eyebrow}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-black text-white">
                    {sourceRevealStatus}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-lg font-black leading-none text-white">
                {countLabel}/{thresholdLabel}
              </span>
            </div>
            <SourceRevealProgressBar
              className="mt-2 bg-white/16"
              percent={sourceReveal.percent}
              unlocked={sourceReveal.unlocked}
            />
          </div>
        ) : null}
        {shouldShowPaidPerformance ? (
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] shadow-[0_12px_28px_rgba(0,0,0,0.2)] ${
                hasPaidSales
                  ? "bg-[#44f26e] text-black"
                  : "bg-black/72 text-[#b9ffc8]"
              }`}
            >
              <Flame className="size-3.5" />
              {hasPaidSales ? copy.revenue.hotBadge : getAccessLabel(item, copy)}
            </span>
          </div>
        ) : null}
      </Link>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 text-[0.66rem] font-black uppercase tracking-[0.1em]">
          <span className="bg-[#111510] px-2 py-1 text-white">
            {getAccessLabel(item, copy)}
          </span>
          {item.newsReportCount > 0 ? (
            <span className="border border-black/10 px-2 py-1 text-black/52">
              {formatNumber(item.newsReportCount, locale)} {copy.vlog.reports}
            </span>
          ) : null}
        </div>
        <Link
          className={`mt-3 line-clamp-2 block break-words text-base font-black leading-6 [word-break:keep-all] hover:text-[#16702e] ${
            blurred ? "select-none blur-[2px]" : ""
          }`}
          href={href}
        >
          {item.title}
        </Link>
        <p
          className={`mt-2 line-clamp-2 text-sm font-semibold leading-6 text-black/56 ${
            blurred ? "select-none blur-[2px]" : ""
          }`}
        >
          {item.summary}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-black/42">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3 text-[#16702e]" />
            {formatNumber(item.social.likeCount, locale)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircleHeart className="size-3 text-[#16702e]" />
            {formatNumber(item.social.commentCount, locale)}
          </span>
        </div>
        {shouldShowPaidPerformance ? (
          <div
            className={`mt-4 grid grid-cols-2 gap-2 border p-2.5 ${
              hasPaidSales
                ? "border-[#19b84b]/28 bg-[#edfff2]"
                : "border-black/10 bg-[#f7f9f4]"
            }`}
          >
            <div className="min-w-0">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                {copy.revenue.cardSales}
              </p>
              <p className="mt-1 truncate text-base font-black text-[#111510]">
                {paidSalesLabel}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                {copy.revenue.cardRevenue}
              </p>
              <p className="mt-1 truncate text-base font-black text-[#111510]">
                {paidRevenueLabel}
              </p>
            </div>
          </div>
        ) : null}
        {showSourceReveal ? (
          <div
            className={`mt-4 rounded-lg border p-3 ${
              sourceReveal.unlocked
                ? "border-[#19b84b]/28 bg-[#edfff2]"
                : "border-black/10 bg-[#f7f9f4]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ${
                    sourceReveal.unlocked
                      ? "bg-[#111510] text-[#44f26e]"
                      : "bg-white text-[#16702e]"
                  }`}
                >
                  {sourceReveal.unlocked ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <LockKeyhole className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                    {copy.sourceReveal.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-black text-black/64">
                    {sourceReveal.unlocked
                      ? copy.sourceReveal.bodyReady
                      : copy.sourceReveal.bodyLocked(remainingLabel)}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-black text-[#111510]">
                {countLabel}/{thresholdLabel}
              </span>
            </div>
            <SourceRevealProgressBar
              className="mt-2"
              percent={sourceReveal.percent}
              unlocked={sourceReveal.unlocked}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ReporterCoverageCard({
  copy,
  locale,
  referralCode,
  reporter,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reporter: FanletterNewsCharacterReporterStat;
}) {
  const initial =
    reporter.reporterName.trim().charAt(0).toUpperCase() ||
    reporter.reporterReferralCode.trim().charAt(0).toUpperCase() ||
    "F";
  const latestReportAt = formatDate(reporter.latestReportAt, locale);
  const reporterHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporters/${encodeURIComponent(
      reporter.reporterReferralCode,
    )}`,
    referralCode,
  );

  return (
    <Link
      className="flex min-w-0 items-center gap-3 border border-black/10 bg-white p-3 !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
      href={reporterHref}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-sm font-black text-[#44f26e]">
        {reporter.reporterAvatarImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover"
            fill
            sizes="3rem"
            src={reporter.reporterAvatarImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              reporter.reporterAvatarImageUrl,
            )}
          />
        ) : (
          initial
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#111510]">
          {reporter.reporterName}
        </p>
        <p className="mt-1 truncate text-xs font-bold text-black/42">
          @{reporter.reporterReferralCode}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-black text-[#16702e]">
          {copy.reporter.reports(formatNumber(reporter.reportCount, locale))}
        </p>
        {latestReportAt ? (
          <p className="mt-1 text-[0.62rem] font-bold text-black/34">
            {latestReportAt}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function FanRequestItem({
  locale,
  request,
}: {
  locale: Locale;
  request: FanletterPublicFanRequestPreview;
}) {
  return (
    <div className="border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="bg-[#ecfff0] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
          {request.requestType}
        </span>
        <span className="text-[0.66rem] font-bold text-black/38">
          {formatDate(request.createdAt, locale)}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-black/64">
        {request.body}
      </p>
      {request.requesterDisplayName ? (
        <p className="mt-3 truncate text-xs font-black text-black/38">
          {request.requesterDisplayName}
        </p>
      ) : null}
    </div>
  );
}

type CharacterActivityRecord = {
  body: string;
  date: Date | string | null;
  href: string | null;
  id: string;
  icon: ReactNode;
  label: string;
  title: string;
};

function CharacterActivityTimeline({
  characterName,
  copy,
  records,
  locale,
}: {
  characterName: string;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  records: CharacterActivityRecord[];
}) {
  return (
    <section className="mt-5 border border-black/12 bg-white p-3.5 shadow-[0_14px_36px_rgba(17,21,16,0.055)] sm:mt-6 sm:p-5">
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#111510] pb-3 sm:pb-4">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
            {copy.activity.eyebrow}
          </p>
          <h2 className="mt-1 break-words text-xl font-black leading-tight [word-break:keep-all] sm:text-2xl">
            {locale === "ko"
              ? `${characterName}의 ${copy.activity.title}`
              : `${characterName} ${copy.activity.title}`}
          </h2>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-black/58 sm:text-sm sm:leading-6">
            {copy.activity.body}
          </p>
        </div>
        <Sparkles className="mt-1 size-5 shrink-0 text-[#16702e]" />
      </div>

      {records.length > 0 ? (
        <ol className="mt-4 grid gap-3 lg:grid-cols-2">
          {records.map((record) => {
            const content = (
              <>
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ecfff0] text-[#16702e] sm:size-8">
                  {record.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
                      {record.label}
                    </span>
                    {record.date ? (
                      <span className="text-[0.66rem] font-bold text-black/36">
                        {formatDate(record.date, locale)}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 line-clamp-1 break-words text-sm font-black leading-5 text-[#111510] [word-break:keep-all]">
                    {record.title}
                  </span>
                  <span className="mt-1 line-clamp-1 text-xs font-semibold leading-5 text-black/52 sm:line-clamp-2">
                    {record.body}
                  </span>
                </span>
                {record.href ? (
                  <ArrowRight className="mt-1 size-4 shrink-0 text-black/32" />
                ) : null}
              </>
            );

            return (
              <li
                className="relative border border-black/10 bg-[#f7f9f4] p-2.5 sm:p-3"
                key={record.id}
              >
                {record.href ? (
                  <Link
                    className="flex min-w-0 gap-3 !text-[#111510] transition hover:text-[#16702e]"
                    href={record.href}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex min-w-0 gap-3">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 border border-black/10 bg-[#f7f9f4] p-4 text-sm font-semibold text-black/54">
          {copy.activity.empty}
        </p>
      )}
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const normalizedReferralCode = normalizeReferralCode(referralCode) ?? referralCode;
  const data = await getFanletterCreatorPageData(locale, normalizedReferralCode);
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const copy = getCopy(locale);
  const title = characterName
    ? `${characterName} | FanLetter News`
    : locale === "ko"
      ? "FanLetter News 캐릭터 채널"
      : "FanLetter News character channel";
  const description =
    data?.profile.character?.summary ??
    data?.profile.intro ??
    (locale === "ko"
      ? "FanLetter News 전용 AI 캐릭터 채널입니다."
      : "A FanLetter News-only AI character channel.");
  const url = `/${locale}/fanletter/news/characters/${normalizedReferralCode}`;
  const image =
    data?.items[0]?.coverImageUrl ??
    data?.profile.character?.avatarImageSet[0]?.url ??
    data?.profile.avatarImageUrl ??
    null;
  const avatarVersionSeed =
    data?.profile.character?.avatarImageSet
      ?.map((avatar) => avatar.url)
      .join("|") ??
    data?.profile.avatarImageUrl ??
    null;
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode: normalizedReferralCode,
    title,
    variant: "creator",
    version: buildFanletterOgVersionToken(
      "fanletter-news-character-channel-og-v1",
      normalizedReferralCode,
      title,
      description,
      image,
      avatarVersionSeed,
    ),
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "creator"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: [ogImage],
      siteName: copy.siteName,
      title,
      type: "profile",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterNewsCharacterChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterNewsCharacterChannelSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const normalizedCharacterReferralCode = normalizeReferralCode(referralCode);
  const safeReturnToHref = normalizeFanletterReturnToPath(
    query.returnTo,
    locale,
  );
  const returnToNewsHref = safeReturnToHref?.startsWith(
    `/${locale}/fanletter/news/`,
  )
    ? safeReturnToHref
    : null;

  if (!normalizedCharacterReferralCode) {
    notFound();
  }

  const referralCodeFromQuery = readFanletterReferralCode(query.ref);
  const memberSession = await readMemberServerSession();
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const [data, newsData] = await Promise.all([
    getFanletterCreatorPageData(
      locale,
      normalizedCharacterReferralCode,
      memberSession?.email ?? null,
      { includeNsfw: nsfwOptInEnabled },
    ),
    getFanletterNewsReportsForCharacterChannel({
      creatorReferralCode: normalizedCharacterReferralCode,
      limit: 24,
      locale,
    }),
  ]);

  if (!data) {
    notFound();
  }

  const character = data.profile.character;
  const characterName = character?.name ?? data.profile.displayName;
  const characterSummary = character?.summary || data.profile.intro;
  const effectiveReferralCode =
    referralCodeFromQuery ?? data.profile.referralCode;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    effectiveReferralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    effectiveReferralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    effectiveReferralCode,
  );
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${data.profile.referralCode}`,
    effectiveReferralCode,
  );
  const publicVlogsHref = getFanletterNewsCharacterVlogsHref({
    creatorReferralCode: data.profile.referralCode,
    locale,
    referralCode: effectiveReferralCode,
  });
  const fanOnlyVlogsAnchorHref = `${channelHref}#fanletter-news-fan-only-vlogs`;
  const requestHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${data.profile.referralCode}/request`,
    effectiveReferralCode,
  );
  const latestNewsHref = newsData.reports[0]
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/${newsData.reports[0].reportId}`,
        effectiveReferralCode,
      )
    : charactersHref;
  const avatarImageOptions = getUniqueImageOptions(
    character,
    data.profile.avatarImageUrl,
  );
  const visibleNewsReports = newsData.reports.slice(0, 9);
  const publicVlogs = data.items.slice(0, 6);
  const displayableFanOnlyItems = data.fanOnlyItems.filter(
    (item) => !isNsfwMaturity(item.contentMaturityRating),
  );
  const fanOnlyVlogs = [...displayableFanOnlyItems]
    .sort((left, right) => {
      const paidBuyerDiff =
        right.social.paidBuyerCount - left.social.paidBuyerCount;

      if (paidBuyerDiff !== 0) {
        return paidBuyerDiff;
      }

      const paidRevenueDiff =
        getPaidRevenueValue(right.social.paidTotalUsdt) -
        getPaidRevenueValue(left.social.paidTotalUsdt);

      if (paidRevenueDiff !== 0) {
        return paidRevenueDiff;
      }

      return toTimestamp(right.publishedAt) - toTimestamp(left.publishedAt);
    })
    .slice(0, 3);
  const nsfwBlurredCount =
    newsData.nsfwCount +
    data.items.filter((item) => isNsfwMaturity(item.contentMaturityRating))
      .length;
  const shouldShowNsfwControl = nsfwBlurredCount > 0 || nsfwOptInEnabled;
  const reactionCount =
    character?.growth.metrics.reactionCount ??
    [...data.items, ...data.fanOnlyItems].reduce(
      (total, item) =>
        total +
        item.social.likeCount +
        item.social.commentCount +
        item.social.saveCount,
      0,
    );
  const paidContentUnlockCount = data.communityStats.paidContentUnlockCount;
  const recentPaidContentUnlockCount =
    data.communityStats.recentPaidContentUnlockCount;
  const paidContentRevenueLabel = formatUsdtAmount(
    data.communityStats.paidContentRevenueUsdt,
    locale,
  );
  const hasPaidRevenueSignal =
    paidContentUnlockCount > 0 ||
    Number(data.communityStats.paidContentRevenueUsdt) > 0;
  const growthStats = [
    {
      icon: <Newspaper className="size-4" />,
      label: copy.growth.news,
      value: formatNumber(newsData.reportCount, locale),
    },
    {
      icon: <Clapperboard className="size-4" />,
      label: copy.growth.publicVlogs,
      value: formatNumber(data.publicContentCount, locale),
    },
    {
      icon: <Flame className="size-4" />,
      label: copy.growth.fanOnly,
      value: formatNumber(data.fanOnlyContentCount, locale),
    },
    {
      icon: <Heart className="size-4" />,
      label: copy.growth.reactions,
      value: formatNumber(reactionCount, locale),
    },
    {
      icon: <UsersRound className="size-4" />,
      label: copy.growth.fanClub,
      value: formatNumber(data.communityStats.fanClubMemberCount, locale),
    },
    {
      icon: <Trophy className="size-4" />,
      label: copy.growth.unlocks,
      value: formatNumber(paidContentUnlockCount, locale),
    },
  ];
  const newsStats = [
    { label: copy.news.public, value: newsData.publicCount },
    { label: copy.news.fanOnly, value: newsData.fanOnlyCount },
    { label: "NSFW", value: newsData.nsfwCount },
    { label: copy.news.reporters, value: newsData.reporters.length },
  ];
  const activityRecords: CharacterActivityRecord[] = [
    ...data.items.slice(0, 8).map((item) => ({
      body: item.summary,
      date: item.publishedAt,
      href: getFanletterNewsVlogHref({
        contentId: item.contentId,
        locale,
        referralCode: effectiveReferralCode,
        returnToHref: channelHref,
      }),
      id: `public-vlog-${item.contentId}`,
      icon: <Clapperboard className="size-4" />,
      label: copy.activity.publicVlog,
      title: item.title,
    })),
    ...displayableFanOnlyItems.slice(0, 6).map((item) => ({
      body: item.summary,
      date: item.publishedAt,
      href: getFanletterNewsVlogHref({
        contentId: item.contentId,
        locale,
        referralCode: effectiveReferralCode,
        returnToHref: channelHref,
      }),
      id: `fan-only-vlog-${item.contentId}`,
      icon: <Flame className="size-4" />,
      label: copy.activity.fanOnlyVlog,
      title: item.title,
    })),
    ...data.fanRequestPreviews.slice(0, 6).map((request) => ({
      body: request.requesterDisplayName
        ? `${request.requestType} · ${request.requesterDisplayName}`
        : request.requestType,
      date: request.createdAt,
      href: requestHref,
      id: [
        "request",
        request.createdAt,
        request.requestType,
        request.body.slice(0, 24),
      ].join("-"),
      icon: <MessageCircleHeart className="size-4" />,
      label: copy.activity.request,
      title: request.body,
    })),
  ]
    .sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date))
    .slice(0, 6);
  const heroMoment = activityRecords[0] ?? null;
  const nsfwCopy = getFanletterNsfwCopy(locale);

  return (
    <main className="min-h-screen bg-[#f5f6f2] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[#111510] md:pb-0">
      <CharacterChannelMasthead
        charactersHref={charactersHref}
        copy={copy}
        newsHomeHref={newsHomeHref}
        purchasesHref={purchasesHref}
        returnToNewsHref={returnToNewsHref}
      />

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 sm:hidden">
          <Link
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] !text-[#16702e]"
            href={returnToNewsHref ?? charactersHref}
          >
            <ArrowLeft className="size-4" />
            {returnToNewsHref ? copy.returnToNews : copy.backToCharacters}
          </Link>
          {returnToNewsHref ? (
            <Link
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] !text-black/48"
              href={charactersHref}
            >
              {copy.backToCharacters}
            </Link>
          ) : null}
        </div>

        <section className="mt-4 overflow-hidden border border-[#111510] bg-[#111510] text-white shadow-[0_20px_54px_rgba(17,21,16,0.16)] sm:mt-0">
          <div className="grid lg:grid-cols-[minmax(16rem,0.52fr)_minmax(0,1fr)]">
            <FanletterNewsCharacterImageSelector
              avatarAlt={characterName}
              avatarImages={avatarImageOptions}
              channelHero
              compact
              galleryLabel={copy.bible.expression}
              generatedLabel={copy.generated}
            />
            <div className="flex min-h-full min-w-0 flex-col p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-2.5 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.1em] text-black">
                  <BadgeCheck className="size-3.5" />
                  {copy.hero.eyebrow}
                </span>
                <span className="inline-flex border border-white/18 px-2.5 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.1em] text-white/72">
                  @{data.profile.referralCode}
                </span>
              </div>
              <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                {copy.hero.kicker}
              </p>
              <h1 className="mt-2 break-words text-[2.45rem] font-black leading-none [word-break:keep-all] sm:text-[3.8rem]">
                {characterName}
              </h1>
              <p className="mt-3 line-clamp-3 max-w-2xl text-sm font-semibold leading-6 text-white/68 sm:text-base sm:leading-7">
                {characterSummary}
              </p>

              <div className="mt-4 border border-white/14 bg-white/[0.06] p-3.5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] sm:p-4">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-black">
                    {heroMoment?.icon ?? <Sparkles className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                        {copy.today.eyebrow}
                      </p>
                      {heroMoment?.date ? (
                        <span className="text-[0.66rem] font-bold text-white/38">
                          {formatDate(heroMoment.date, locale)}
                        </span>
                      ) : null}
                    </div>
                    {heroMoment?.href ? (
                      <Link
                        className="mt-1 line-clamp-2 break-words text-base font-black leading-6 !text-white [word-break:keep-all] hover:!text-[#44f26e]"
                        href={heroMoment.href}
                      >
                        {heroMoment.title}
                      </Link>
                    ) : (
                      <p className="mt-1 line-clamp-2 break-words text-base font-black leading-6 text-white [word-break:keep-all]">
                        {heroMoment?.title ?? copy.today.emptyTitle}
                      </p>
                    )}
                    <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-6 text-white/58">
                      {heroMoment?.body ?? copy.today.emptyBody}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border border-[#44f26e]/34 bg-[#44f26e]/10 p-3.5 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black">
                        <Flame className="size-3.5" />
                        {copy.revenue.eyebrow}
                      </span>
                      <span className="border border-[#44f26e]/26 bg-black/24 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#9bffad]">
                        {copy.revenue.walletOpened}
                      </span>
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-black leading-[1.05] [word-break:keep-all] sm:text-[2rem]">
                      {hasPaidRevenueSignal
                        ? copy.revenue.title
                        : copy.revenue.emptyTitle}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/62">
                      {hasPaidRevenueSignal
                        ? copy.revenue.body
                        : copy.revenue.emptyBody}
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#44f26e]/36 bg-black/28 px-3 py-2 text-xs font-black !text-[#b9ffc8] transition hover:bg-[#44f26e] hover:!text-black"
                    href={fanOnlyVlogsAnchorHref}
                  >
                    {copy.revenue.cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: copy.revenue.revenue,
                      value: paidContentRevenueLabel,
                    },
                    {
                      label: copy.revenue.sales,
                      value: formatNumber(paidContentUnlockCount, locale),
                    },
                    {
                      label: copy.revenue.recent,
                      value: formatNumber(recentPaidContentUnlockCount, locale),
                    },
                  ].map((stat) => (
                    <div
                      className="min-w-0 border border-[#44f26e]/18 bg-black/24 p-2.5"
                      key={stat.label}
                    >
                      <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.08em] text-white/40">
                        {stat.label}
                      </p>
                      <p className="mt-2 truncate text-lg font-black leading-none text-white sm:text-xl">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {growthStats.slice(0, 3).map((stat) => (
                  <div
                    className="border border-white/12 bg-white/[0.06] p-2.5 sm:p-3"
                    key={stat.label}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.08em] text-white/42">
                        {stat.label}
                      </p>
                      <span className="text-[#44f26e]">{stat.icon}</span>
                    </div>
                    <p className="mt-2 text-xl font-black leading-none sm:text-2xl">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#44f26e] px-4 py-2.5 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                  href={latestNewsHref}
                >
                  {copy.cta.latestNews}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/18 bg-white/[0.06] px-4 py-2.5 text-center text-sm font-black !text-white transition hover:border-[#44f26e] hover:bg-[#44f26e]/10"
                  href={publicVlogsHref}
                >
                  <Clapperboard className="size-4 text-[#44f26e]" />
                  {copy.cta.dailyVlogs}
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/18 bg-white/[0.06] px-4 py-2.5 text-center text-sm font-black !text-white transition hover:border-[#44f26e] hover:bg-[#44f26e]/10"
                  href={requestHref}
                >
                  <MessageCircleHeart className="size-4 text-[#44f26e]" />
                  {copy.cta.request}
                </Link>
                <FanletterChannelShareButton
                  className="h-auto min-h-11 rounded-none border-white/18 px-4 py-2.5 font-black"
                  href={channelHref}
                  locale={locale}
                  referralCode={effectiveReferralCode}
                  shareIdScope="news-character"
                  summary={copy.hero.shareSummary(characterName)}
                  title={copy.hero.shareTitle(characterName)}
                  trackingSource="fanletter-news-character-channel"
                />
              </div>
            </div>
          </div>
        </section>

        {shouldShowNsfwControl ? (
          <div className="mt-5">
            <FanletterNsfwOptInControl
              compact
              disabledBody={copy.nsfwControl.disabledBody}
              disabledTitle={copy.nsfwControl.disabledTitle}
              enabled={nsfwOptInEnabled}
              enabledBody={copy.nsfwControl.enabledBody}
              enabledTitle={copy.nsfwControl.enabledTitle}
              hiddenCount={nsfwBlurredCount}
              hiddenCountText={copy.nsfwControl.hiddenCountText(
                formatNumber(nsfwBlurredCount, locale),
              )}
              locale={locale}
              tone={nsfwOptInEnabled ? "dark" : "light"}
            />
          </div>
        ) : null}

        <CharacterActivityTimeline
          characterName={characterName}
          copy={copy}
          locale={locale}
          records={activityRecords}
        />

        <div className="flex flex-col">
        <section className="order-3 mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <div className="border border-black/12 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b-2 border-[#111510] pb-3">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  {copy.growth.title}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {character?.growth.title ?? copy.growth.title}
                </h2>
              </div>
              <Sparkles className="size-5 text-[#16702e]" />
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-black/62">
              {character?.growth.summary ?? characterSummary}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {growthStats.map((stat) => (
                <MetricTile
                  icon={stat.icon}
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                />
              ))}
            </div>
            {character?.growth.nextMission ? (
              <div className="mt-5 border-l-4 border-[#44f26e] bg-[#f5f6f2] p-4">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                  {copy.bible.latestMission}
                </p>
                <h3 className="mt-2 text-lg font-black">
                  {character.growth.nextMission.title}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-black/62">
                  {character.growth.nextMission.description}
                </p>
                <div className="mt-3 h-2 overflow-hidden bg-black/10">
                  <div
                    className="h-full bg-[#44f26e]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          (character.growth.nextMission.progress /
                            Math.max(1, character.growth.nextMission.target)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="border border-black/12 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b-2 border-[#111510] pb-3">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  {copy.bible.title}
                </p>
                <h2 className="mt-1 text-2xl font-black">{characterName}</h2>
              </div>
              <BookOpen className="size-5 text-[#16702e]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MetricTile
                icon={<Trophy className="size-4" />}
                label={copy.bible.level}
                value={character ? `Lv.${character.growth.level}` : "Lv.1"}
              />
              <MetricTile
                icon={<ImageIcon className="size-4" />}
                label={copy.bible.expression}
                value={formatNumber(avatarImageOptions.length, locale)}
              />
            </div>
            <div className="mt-5">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                {copy.bible.traits}
              </p>
              {character?.traits.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {character.traits.slice(0, 8).map((trait) => (
                    <span
                      className="border border-black/10 bg-[#f5f6f2] px-3 py-2 text-xs font-bold leading-5 text-black/64"
                      key={trait}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold leading-6 text-black/48">
                  {copy.bible.emptyTraits}
                </p>
              )}
            </div>
            {character?.growth.skills.length ? (
              <div className="mt-5 space-y-2">
                {character.growth.skills.slice(0, 3).map((skill) => (
                  <div className="border border-black/10 p-3" key={skill.label}>
                    <p className="text-sm font-black">{skill.label}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-black/54">
                      {skill.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="order-2 mt-7 border-t-2 border-[#111510] pt-5">
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                {copy.news.title}
              </p>
              <h2 className="mt-1 break-words text-2xl font-black leading-tight [word-break:keep-all] sm:text-3xl">
                {locale === "ko"
                  ? `${characterName} 뉴스 프랜차이즈`
                  : `${characterName} news franchise`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/58">
                {copy.news.body}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {newsStats.map((stat) => (
                <div
                  className="min-w-0 border border-black/10 bg-white px-3 py-2 text-right"
                  key={stat.label}
                >
                  <p className="text-xl font-black">
                    {formatNumber(stat.value, locale)}
                  </p>
                  <p className="mt-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-black/38">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {visibleNewsReports.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleNewsReports.map((report) => (
                <NewsReportCard
                  copy={copy}
                  key={report.reportId}
                  locale={locale}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={effectiveReferralCode}
                  report={report}
                />
              ))}
            </div>
          ) : (
            <div className="border border-black/12 bg-white p-8 text-center">
              <Newspaper className="mx-auto size-10 text-[#16702e]" />
              <h3 className="mt-4 text-xl font-black">{copy.empty.title}</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-black/56">
                {copy.empty.body}
              </p>
            </div>
          )}
        </section>

        <section className="order-1 mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)]">
          <div>
            <div className="mb-4 grid gap-3 border-b-2 border-[#111510] pb-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="min-w-0">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  {copy.vlog.eyebrow}
                </p>
                <h2 className="mt-1 break-words text-2xl font-black leading-tight [word-break:keep-all] sm:text-3xl">
                  {locale === "ko"
                    ? `${characterName}의 일상 브이로그`
                    : `${characterName} daily vlogs`}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/58">
                  {copy.vlog.body}
                </p>
              </div>
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-2 border border-black/14 px-3 py-2 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={publicVlogsHref}
              >
                {copy.cta.publicVlogs}
                <ArrowRight className="size-4 text-[#16702e]" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {publicVlogs.map((item) => (
                <ContentCard
                  copy={copy}
                  href={getFanletterNewsVlogHref({
                    contentId: item.contentId,
                    locale,
                    referralCode: effectiveReferralCode,
                    returnToHref: publicVlogsHref,
                  })}
                  item={item}
                  key={item.contentId}
                  locale={locale}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={effectiveReferralCode}
                  showSourceReveal
                />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <section id="fanletter-news-fan-only-vlogs">
              <div className="mb-4 flex items-center justify-between border-b-2 border-[#111510] pb-3">
                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                    Premium
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {copy.vlog.fanOnlyTitle}
                  </h2>
                </div>
                <Flame className="size-5 text-[#16702e]" />
              </div>
              <div className="grid gap-4">
                {fanOnlyVlogs.length > 0 ? (
                  fanOnlyVlogs.map((item) => (
                    <ContentCard
                      copy={copy}
                      href={getFanletterNewsVlogHref({
                        contentId: item.contentId,
                        locale,
                        referralCode: effectiveReferralCode,
                        returnToHref: channelHref,
                      })}
                      item={item}
                      key={item.contentId}
                      locale={locale}
                      nsfwOptInEnabled={nsfwOptInEnabled}
                      referralCode={effectiveReferralCode}
                    />
                  ))
                ) : (
                  <p className="border border-black/10 bg-white p-4 text-sm font-semibold leading-6 text-black/54">
                    {copy.vlog.emptyFanOnly}
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between border-b-2 border-[#111510] pb-3">
                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                    Community
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {copy.requests.title}
                  </h2>
                </div>
                <MessageCircleHeart className="size-5 text-[#16702e]" />
              </div>
              <p className="mb-3 text-sm font-semibold leading-6 text-black/58">
                {copy.requests.body}
              </p>
              <div className="mb-3 rounded-lg border border-black/10 bg-white p-3">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                  {copy.requests.quickTitle}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {copy.requests.quickIdeas.map((idea) => {
                    const quickRequestHref = setPathSearchParams(requestHref, {
                      action: idea.action,
                      location: idea.location,
                      mood: idea.mood,
                      note: idea.note,
                    });

                    return (
                      <Link
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-black/10 bg-[#f5f6f2] px-3 py-1.5 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                        href={quickRequestHref}
                        key={idea.label}
                      >
                        {idea.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                {data.fanRequestPreviews.length > 0 ? (
                  data.fanRequestPreviews.slice(0, 3).map((request) => (
                    <FanRequestItem
                      key={`${request.createdAt}-${request.body}`}
                      locale={locale}
                      request={request}
                    />
                  ))
                ) : (
                  <div className="border border-black/10 bg-white p-4 text-sm font-semibold text-black/54">
                    {copy.requests.empty}
                  </div>
                )}
              </div>
              <Link
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#111510] px-4 py-3 text-sm font-black !text-white transition hover:bg-black"
                href={requestHref}
              >
                {copy.cta.request}
                <ArrowRight className="size-4 text-[#44f26e]" />
              </Link>
            </section>
          </div>
        </section>

        {newsData.reporters.length > 0 ? (
          <section className="order-4 mt-7 border-t-2 border-[#111510] pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  Newsroom
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {copy.reporter.title}
                </h2>
              </div>
              <FileText className="size-5 text-[#16702e]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {newsData.reporters.map((reporter) => (
                <ReporterCoverageCard
                  copy={copy}
                  key={reporter.reporterReferralCode}
                  locale={locale}
                  referralCode={referralCode}
                  reporter={reporter}
                />
              ))}
            </div>
          </section>
        ) : null}

        {nsfwBlurredCount > 0 && !nsfwOptInEnabled ? (
          <p className="order-5 mt-5 text-xs font-semibold text-black/42">
            {nsfwCopy.badge}:{" "}
            {copy.nsfwControl.hiddenCountText(
              formatNumber(nsfwBlurredCount, locale),
            )}
          </p>
        ) : null}
        </div>
      </section>
    </main>
  );
}
