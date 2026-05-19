import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  Clapperboard,
  FileText,
  LockKeyhole,
  MessageCircleHeart,
  Newspaper,
  PenLine,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import { FanletterResponsiveMediaFrame } from "@/components/fanletter-responsive-media-frame";
import type { FanletterNewsReportDocument } from "@/lib/content";
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
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  getFanletterNsfwCopy,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import {
  defaultLocale,
  hasLocale,
  localeLabels,
  type Locale,
} from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterNewsReportSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        aiReport: "AI 팬 리포트",
        articleEyebrow: "AI Character News",
        articleNotice:
          "이 글은 원본 브이로그의 공개 정보와 티저를 바탕으로 생성된 FanLetter AI 팬 리포트입니다. 실제 언론사의 독립 취재 기사로 표시하지 않습니다.",
        byline: "팬 기자",
        characterStats: {
          level: "성장 단계",
          reactions: "팬 반응",
          vlogs: "브이로그",
        },
        characterTitle: "이 뉴스의 AI 캐릭터",
        contentBadge: {
          nsfw: "성인 팬 전용 표시",
          paid: "팬 전용 유료 브이로그",
          public: "공개 브이로그",
        },
        dateline: "FanLetter 브이로그 뉴스",
        edition: "AI 캐릭터와 팬 참여를 다루는 FanLetter 온라인 뉴스",
        embeddedLocked:
          "잠금 콘텐츠는 공개 티저와 기사 작성 가능한 정보만 뉴스 화면에 표시됩니다.",
        embeddedTitle: "빌트인 원본 브이로그",
        generated: "AI 생성",
        navItems: ["AI 캐릭터", "팬 리포트", "브이로그 뉴스"],
        nsfwBlurNotice:
          "NSFW 보기 동의 전에는 원본 브이로그와 기사 본문 일부가 블러 처리됩니다.",
        nsfwControl: {
          disabledBody:
            "이 뉴스와 관련 NSFW 뉴스는 유지하되 원본 브이로그, 커버, 기사 본문을 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 뉴스 블러 처리",
          enabledBody:
            "NSFW 뉴스가 선명하게 표시됩니다. 끄면 이 뉴스와 관련 NSFW 뉴스가 다시 블러 처리됩니다.",
          enabledTitle: "NSFW 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        openCreator: "캐릭터 채널",
        relatedNews: "같은 캐릭터의 다른 뉴스",
        relatedNewsEmpty: "아직 이 캐릭터의 다른 뉴스가 없습니다.",
        reporterCardBody:
          "이 뉴스는 표시된 FanLetter 팬 기자 코드로 생성된 AI 팬 리포트입니다.",
        reporterCardTitle: "이 뉴스의 팬 기자",
        reporterCode: "기자 코드",
        reporterDesk: "FanLetter 팬 기자",
        reporterEmptyValue: "기록 없음",
        reporterStats: {
          firstReport: "첫 리포트",
          joined: "계정 연결",
          lastConnected: "최근 연결",
          latestReport: "최근 리포트",
          locale: "활동 언어",
          reports: "작성 뉴스",
          status: "계정 상태",
        },
        reporterStatus: {
          completed: "활성 계정",
          pending_payment: "연결 확인 중",
          unknown: "확인 중",
        },
        reporterVerified: "계정 기반 리포트",
        reportUrl: "뉴스 공유 주소",
        sourceContext: "기사 배경",
        sourceTitle: "원본 브이로그",
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
        aiReport: "AI fan report",
        articleEyebrow: "AI Character News",
        articleNotice:
          "This is a FanLetter AI fan report generated from the public source vlog information and teaser. It is not presented as independently reported journalism.",
        byline: "Fan reporter",
        characterStats: {
          level: "Growth level",
          reactions: "Fan reactions",
          vlogs: "Vlogs",
        },
        characterTitle: "AI character in this story",
        contentBadge: {
          nsfw: "Adult fan-only marker",
          paid: "Fan-only paid vlog",
          public: "Public vlog",
        },
        dateline: "FanLetter vlog news",
        edition: "FanLetter online news for AI characters and fan participation",
        embeddedLocked:
          "Locked content is represented with public teaser details available for the news page.",
        embeddedTitle: "Built-in source vlog",
        generated: "AI generated",
        navItems: ["AI characters", "Fan reports", "Vlog news"],
        nsfwBlurNotice:
          "The source vlog and parts of the article stay blurred before NSFW opt-in.",
        nsfwControl: {
          disabledBody:
            "This story and related NSFW stories remain available, with the source vlog, covers, and article body blurred until opt-in.",
          disabledTitle: "NSFW news blurred",
          enabledBody:
            "NSFW news is visible. Turn this off to blur this story and related NSFW stories again.",
          enabledTitle: "NSFW news visible",
          hiddenCountText: (count: string) => `${count} NSFW stories blurred`,
        },
        openCreator: "Character channel",
        relatedNews: "More news from this character",
        relatedNewsEmpty: "No other news from this character yet.",
        reporterCardBody:
          "This AI fan report is attributed to the displayed FanLetter reporter code.",
        reporterCardTitle: "Fan reporter for this story",
        reporterCode: "Reporter code",
        reporterDesk: "FanLetter fan reporter",
        reporterEmptyValue: "No record",
        reporterStats: {
          firstReport: "First report",
          joined: "Account linked",
          lastConnected: "Last connected",
          latestReport: "Latest report",
          locale: "Active language",
          reports: "Published stories",
          status: "Account status",
        },
        reporterStatus: {
          completed: "Active account",
          pending_payment: "Connection pending",
          unknown: "Checking",
        },
        reporterVerified: "Account-based report",
        reportUrl: "News share URL",
        sourceContext: "Story context",
        sourceTitle: "Source vlog",
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

function formatReporterDate(
  value: Date | null | undefined,
  locale: Locale,
  copy: ReturnType<typeof getCopy>,
) {
  return value ? formatDate(value, locale) : copy.reporterEmptyValue;
}

function getReporterLocaleLabel(value: Locale | null | undefined) {
  if (!value) {
    return null;
  }

  return localeLabels[value];
}

function getReporterStatusLabel(
  status: FanletterNewsReporterProfile["status"] | undefined,
  copy: ReturnType<typeof getCopy>,
) {
  if (status === "completed") {
    return copy.reporterStatus.completed;
  }

  if (status === "pending_payment") {
    return copy.reporterStatus.pending_payment;
  }

  return copy.reporterStatus.unknown;
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

function isNsfwReport(report: FanletterNewsReportDocument) {
  return report.contentMaturityRating === "nsfw";
}

function shouldBlurReport(
  report: FanletterNewsReportDocument,
  nsfwOptInEnabled: boolean,
) {
  return isNsfwReport(report) && !nsfwOptInEnabled;
}

function NewsSiteHeader({
  copy,
  homeHref,
}: {
  copy: ReturnType<typeof getCopy>;
  homeHref: string;
}) {
  return (
    <header className="border-b border-black/10 bg-white text-[#111510]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 text-2xl font-black tracking-normal !text-[#111510] sm:text-3xl"
            href={homeHref}
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-[#44f26e] text-black">
              <Newspaper className="size-5" />
            </span>
            {copy.siteName}
          </Link>
          <span className="hidden max-w-md text-right text-xs font-semibold leading-5 text-black/52 sm:block">
            {copy.edition}
          </span>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-2 overflow-x-auto border-t border-black/10 pt-3"
        >
          {copy.navItems.map((item) => (
            <span
              className="shrink-0 rounded-full border border-black/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-black/62"
              key={item}
            >
              {item}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}

function ReporterSpotlight({
  copy,
  locale,
  report,
  reporterProfile,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  report: FanletterNewsReportDocument;
  reporterProfile: FanletterNewsReporterProfile | null;
}) {
  const reporterInitial =
    report.reporterReferralCode.trim().charAt(0).toUpperCase() ||
    report.reporterName.trim().charAt(0).toUpperCase() ||
    "F";
  const reporterStats = [
    {
      label: copy.reporterCode,
      value: report.reporterReferralCode,
    },
    {
      label: copy.reporterStats.reports,
      value: formatNumber(Math.max(reporterProfile?.reportCount ?? 1, 1), locale),
    },
    {
      label: copy.reporterStats.latestReport,
      value: formatReporterDate(reporterProfile?.latestReportAt, locale, copy),
    },
    {
      label: copy.reporterStats.status,
      value: getReporterStatusLabel(reporterProfile?.status, copy),
    },
  ];

  return (
    <section className="mt-6 rounded-lg border border-black/12 bg-[#111510] p-4 text-white shadow-[0_16px_44px_rgba(0,0,0,0.16)] sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-xl font-black text-black">
          {reporterInitial}
        </span>
        <div className="min-w-0">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#44f26e]">
            {copy.reporterCardTitle}
          </p>
          <h2 className="mt-1 break-words text-2xl font-black leading-tight [word-break:keep-all]">
            {report.reporterName}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-white/62">
            {copy.reporterCardBody}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {reporterStats.map((stat) => (
          <div
            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.06] p-3"
            key={stat.label}
          >
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/42">
              {stat.label}
            </p>
            <p className="mt-1 truncate text-sm font-black text-white">
              {stat.value}
            </p>
          </div>
        ))}
        <div className="col-span-2 rounded-lg border border-[#44f26e]/28 bg-[#44f26e]/12 p-3 sm:col-span-4">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#b9ffc8]/70">
            FanLetter
          </p>
          <p className="mt-1 text-sm font-black text-[#b9ffc8]">
            {copy.reporterVerified}
          </p>
        </div>
      </div>
    </section>
  );
}

function ReporterInfoCard({
  copy,
  locale,
  report,
  reporterProfile,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  report: FanletterNewsReportDocument;
  reporterProfile: FanletterNewsReporterProfile | null;
}) {
  const reporterLocaleLabel = getReporterLocaleLabel(reporterProfile?.locale);
  const profileRows = [
    {
      label: copy.reporterStats.reports,
      value: formatNumber(Math.max(reporterProfile?.reportCount ?? 1, 1), locale),
    },
    {
      label: copy.reporterStats.joined,
      value: formatReporterDate(reporterProfile?.joinedAt, locale, copy),
    },
    {
      label: copy.reporterStats.firstReport,
      value: formatReporterDate(reporterProfile?.firstReportAt, locale, copy),
    },
    {
      label: copy.reporterStats.lastConnected,
      value: formatReporterDate(reporterProfile?.lastConnectedAt, locale, copy),
    },
    {
      label: copy.reporterStats.locale,
      value: reporterLocaleLabel ?? copy.reporterEmptyValue,
    },
  ];

  return (
    <section className="rounded-lg border border-black/12 bg-white p-4 text-[#111510]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
          <PenLine className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#16702e]">
            {copy.reporterDesk}
          </p>
          <h2 className="mt-1 break-words text-xl font-black leading-tight [word-break:keep-all]">
            {report.reporterName}
          </h2>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-black/10 bg-[#f5f6f2] p-3">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-black/42">
          {copy.reporterCode}
        </p>
        <p className="mt-1 break-all text-lg font-black text-[#111510]">
          {report.reporterReferralCode}
        </p>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-black/58">
        {copy.reporterCardBody}
      </p>
      <div className="mt-4 rounded-lg border border-black/10 bg-[#f5f6f2] p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-black/42">
            {copy.reporterStats.status}
          </span>
          <span className="rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.68rem] font-black text-black">
            {getReporterStatusLabel(reporterProfile?.status, copy)}
          </span>
        </div>
        <dl className="mt-3 grid gap-2">
          {profileRows.map((row) => (
            <div
              className="flex items-center justify-between gap-3 border-t border-black/10 pt-2"
              key={row.label}
            >
              <dt className="shrink-0 text-xs font-bold text-black/46">
                {row.label}
              </dt>
              <dd className="min-w-0 truncate text-right text-sm font-black text-[#111510]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SourceVlogEmbed({
  accessLabel,
  blurred,
  copy,
  reportCoverImageUrl,
  sourceContent,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  reportCoverImageUrl: string | null;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const sourceVideoUrl =
    sourceContent?.canViewerAccess ? sourceContent.contentVideoUrls[0] ?? null : null;
  const sourceImageUrl =
    sourceContent?.coverImageUrl ??
    sourceContent?.contentImageUrls[0] ??
    reportCoverImageUrl;
  const hasEmbeddedVideo = Boolean(sourceVideoUrl);
  const noticeMessage = blurred ? copy.nsfwBlurNotice : copy.embeddedLocked;

  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-black/12 bg-[#0a0d0a] text-white shadow-[0_18px_54px_rgba(0,0,0,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/80">
          <Clapperboard className="size-4 text-[#44f26e]" />
          {copy.embeddedTitle}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-black">
          <PlayCircle className="size-3.5" />
          {accessLabel}
        </span>
      </div>
      <FanletterResponsiveMediaFrame
        alt={sourceContent?.title ?? copy.embeddedTitle}
        blurred={blurred}
        eager
        imageUrl={sourceImageUrl}
        mediaType={sourceContent?.mediaType ?? "video"}
        title={sourceContent?.title ?? copy.embeddedTitle}
        videoUrl={sourceVideoUrl}
      >
        {blurred || !hasEmbeddedVideo ? (
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
            </div>
          </div>
        ) : null}
      </FanletterResponsiveMediaFrame>
    </section>
  );
}

function CharacterInfoCard({
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
  const characterName = character?.name ?? sourceContent?.authorName ?? "FanLetter";
  const avatarImageUrl =
    character?.avatarImageSet[0]?.url ?? sourceContent?.authorAvatarImageUrl ?? null;
  const reactionCount =
    (sourceContent?.social.likeCount ?? 0) +
    (sourceContent?.social.commentCount ?? 0) +
    (sourceContent?.social.saveCount ?? 0);

  return (
    <section className="overflow-hidden rounded-lg border border-black/12 bg-[#111510] text-white">
      <div className="relative aspect-[4/5] bg-black">
        {avatarImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover object-top"
            fill
            loading="eager"
            sizes="(max-width: 1024px) 100vw, 22rem"
            src={avatarImageUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#18251e)]">
            <UserRound className="size-16 text-[#44f26e]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/12 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#44f26e]">
            {copy.characterTitle}
          </p>
          <h2 className="mt-2 break-words text-3xl font-black leading-tight [word-break:keep-all]">
            {characterName}
          </h2>
        </div>
      </div>
      <div className="p-4">
        <p className="line-clamp-3 text-sm font-medium leading-6 text-white/64">
          {character?.summary ?? sourceContent?.summary}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3">
            <p className="text-lg font-bold">
              {character ? `Lv.${character.growth.level}` : "-"}
            </p>
            <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/42">
              {copy.characterStats.level}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3">
            <p className="text-lg font-bold">
              {sourceContent
                ? formatNumber(sourceContent.authorPublicContentCount, locale)
                : "-"}
            </p>
            <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/42">
              {copy.characterStats.vlogs}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3">
            <p className="text-lg font-bold">
              {sourceContent ? formatNumber(reactionCount, locale) : "-"}
            </p>
            <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/42">
              {copy.characterStats.reactions}
            </p>
          </div>
        </div>
        <Link
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.05] px-4 text-sm font-bold !text-white transition hover:border-[#44f26e]/42 hover:bg-white/[0.08]"
          href={creatorHref}
        >
          <MessageCircleHeart className="size-4 text-[#44f26e]" />
          {copy.openCreator}
        </Link>
      </div>
    </section>
  );
}

function RelatedNewsList({
  copy,
  nsfwOptInEnabled,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  return (
    <section className="border-t-4 border-[#111510] bg-white p-4 text-[#111510] shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:p-7 lg:col-span-2 lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#16702e]">
            Related News
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-normal">
            {copy.relatedNews}
          </h2>
        </div>
        <Sparkles className="size-6 text-[#19b84b]" />
      </div>

      {reports.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {reports.map((report) => {
            const href = buildPathWithReferral(
              `/${report.locale}/fanletter/news/${report.reportId}`,
              referralCode,
            );
            const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
            const nsfwCopy = getFanletterNsfwCopy(report.locale);
            const isNsfw = isNsfwReport(report);
            const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);

            return (
              <Link
                className="group grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b border-black/12 pb-4 transition hover:border-[#19b84b]"
                href={href}
                key={report.reportId}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#111510]">
                  {report.coverImageUrl ? (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={
                        shouldBlur
                          ? "scale-[1.06] object-cover blur-md brightness-[0.68] saturate-[0.86] transition duration-300 group-hover:scale-[1.08]"
                          : "object-cover transition duration-300 group-hover:scale-[1.04]"
                      }
                      fill
                      sizes="6rem"
                      src={report.coverImageUrl}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/68">
                      <Newspaper className="size-7 text-[#44f26e]" />
                    </div>
                  )}
                  {isNsfw ? (
                    <div
                      className={`absolute p-2 text-center ${
                        shouldBlur
                          ? "inset-0 flex items-center justify-center bg-black/34"
                          : "right-0 top-0"
                      }`}
                    >
                      <span className="inline-flex rounded-full bg-rose-500 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                        {nsfwCopy.badge}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p
                    className={`line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] ${
                      shouldBlur ? "select-none blur-[2px]" : ""
                    }`}
                  >
                    {report.title}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 text-sm font-medium leading-5 text-black/58 ${
                      shouldBlur ? "select-none blur-[2px]" : ""
                    }`}
                  >
                    {report.dek}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-black/44">
                    {publishedAt ? <span>{publishedAt}</span> : null}
                    <span>{report.reporterName}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-black/10 bg-[#f5f6f2] px-4 py-4 text-sm font-semibold leading-6 text-black/52">
          {copy.relatedNewsEmpty}
        </p>
      )}
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
  const title = report
    ? `${report.title} | FanLetter News`
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
  const [sourceContent, relatedReports, reporterProfile] = await Promise.all([
    getFanletterPublicContentDetail(report.contentId, locale, null, {
      includeNsfw,
    }).catch(() => null),
    getRelatedFanletterNewsReports({
      creatorReferralCode: report.creatorReferralCode,
      excludeContentId: report.contentId,
      excludeReportId: report.reportId,
      limit: 4,
      locale,
    }),
    getFanletterNewsReporterProfile({
      reporterReferralCode: report.reporterReferralCode,
    }),
  ]);
  const copy = getCopy(locale);
  const referralCode =
    readFanletterReferralCode(query.ref) ?? report.reporterReferralCode;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const fanletterHomeHref = buildPathWithReferral(
    `/${locale}/fanletter`,
    referralCode,
  );
  const reportHref = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const creatorHref = report.creatorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/creator/${report.creatorReferralCode}`,
        referralCode,
      )
    : fanletterHomeHref;
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
  const facts = [
    { label: copy.sixW.who, value: report.who },
    { label: copy.sixW.when, value: report.when },
    { label: copy.sixW.where, value: report.where },
    { label: copy.sixW.what, value: report.what },
    { label: copy.sixW.why, value: report.why },
    { label: copy.sixW.how, value: report.how },
  ];

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#111510]">
      <NewsSiteHeader copy={copy} homeHref={newsHomeHref} />

      <article className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <div className="border-y border-black/14 py-3 text-center text-[0.68rem] font-bold uppercase tracking-[0.22em] text-black/52">
          {copy.articleEyebrow}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:p-7 lg:p-9">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-black">
                <ShieldCheck className="size-3.5" />
                {accessLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-black/[0.04] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-black/62">
                <BadgeCheck className="size-3.5" />
                {copy.generated}
              </span>
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#16702e]">
              {copy.dateline}
            </p>
            <h1
              className={`mt-3 max-w-5xl break-words text-[2.65rem] font-black leading-[0.98] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[4.9rem] ${nsfwTextBlurClass}`}
            >
              {report.title}
            </h1>
            <p
              className={`mt-5 max-w-3xl border-l-4 border-[#44f26e] pl-4 text-base font-semibold leading-7 text-black/70 sm:text-xl sm:leading-8 ${nsfwTextBlurClass}`}
            >
              {report.dek}
            </p>

            <ReporterSpotlight
              copy={copy}
              locale={locale}
              report={report}
              reporterProfile={reporterProfile}
            />

            {shouldShowNsfwControl ? (
              <div className="mt-4">
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

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-bold text-black/54">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1.5">
                <PenLine className="size-3.5 text-[#16702e]" />
                {copy.byline} · {report.reporterName}
              </span>
              {publishedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1.5">
                  <CalendarDays className="size-3.5 text-[#16702e]" />
                  {publishedAt}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1.5">
                <FileText className="size-3.5 text-[#16702e]" />
                {copy.aiReport}
              </span>
            </div>

            <SourceVlogEmbed
              accessLabel={accessLabel}
              blurred={shouldBlurCurrentReport}
              copy={copy}
              reportCoverImageUrl={report.coverImageUrl}
              sourceContent={sourceContent}
            />

            <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 sm:grid-cols-2">
              {facts.map((fact) => (
                <div className="bg-[#f9faf6] p-4" key={fact.label}>
                  <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#16702e]">
                    {fact.label}
                  </p>
                  <p
                    className={`mt-2 text-sm font-semibold leading-6 text-black/72 ${nsfwTextBlurClass}`}
                  >
                    {fact.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="mt-8 border-t border-black/12 pt-6">
              <div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#16702e]">
                <FileText className="size-4" />
                {copy.aiReport}
              </div>
              <div
                className={`max-w-3xl space-y-5 text-[1.08rem] font-medium leading-8 text-black/78 sm:text-[1.18rem] sm:leading-9 ${
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

            <p className="mt-6 rounded-lg border border-black/10 bg-[#f5f6f2] px-4 py-3 text-xs font-medium leading-5 text-black/50">
              {copy.articleNotice}
            </p>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <ReporterInfoCard
              copy={copy}
              locale={locale}
              report={report}
              reporterProfile={reporterProfile}
            />

            <CharacterInfoCard
              copy={copy}
              creatorHref={creatorHref}
              locale={locale}
              sourceContent={sourceContent}
            />

            <section className="rounded-lg border border-black/12 bg-white p-4 text-[#111510]">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#16702e]">
                {copy.sourceContext}
              </p>
              <h2
                className={`mt-3 break-words text-xl font-black leading-tight [word-break:keep-all] ${nsfwTextBlurClass}`}
              >
                {report.sourceTitle}
              </h2>
              <p
                className={`mt-2 text-sm font-medium leading-6 text-black/58 ${nsfwTextBlurClass}`}
              >
                {report.sourceSummary}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-black/58">
                <Clapperboard className="size-3.5 text-[#16702e]" />
                {copy.sourceTitle}
              </span>
            </section>

            <section className="rounded-lg border border-black/12 bg-white p-4 text-xs font-medium leading-5 text-black/48">
              <p className="font-bold text-black/72">{copy.reportUrl}</p>
              <p className="mt-1 break-all">{reportHref}</p>
            </section>
          </aside>

          <RelatedNewsList
            copy={copy}
            nsfwOptInEnabled={includeNsfw}
            referralCode={referralCode}
            reports={relatedReports}
          />
        </div>
      </article>
    </main>
  );
}
