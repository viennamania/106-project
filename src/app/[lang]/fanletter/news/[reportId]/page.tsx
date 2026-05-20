import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Clapperboard,
  FileText,
  LockKeyhole,
  MessageCircleHeart,
  Newspaper,
  PlayCircle,
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
        articleSection: "연예",
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
        edition: "AI 캐릭터와 팬 참여를 다루는 FanLetter 온라인 뉴스",
        embeddedLocked:
          "잠금 콘텐츠는 공개 티저와 기사 작성 가능한 정보만 뉴스 화면에 표시됩니다.",
        embeddedTitle: "빌트인 원본 브이로그",
        generated: "AI 생성",
        publishedLabel: "기사입력",
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
        sourceContext: "기사 배경",
        sourceTitle: "원본 브이로그",
        summaryTitle: "기사 요약",
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
        articleSection: "Entertainment",
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
        edition: "FanLetter online news for AI characters and fan participation",
        embeddedLocked:
          "Locked content is represented with public teaser details available for the news page.",
        embeddedTitle: "Built-in source vlog",
        generated: "AI generated",
        publishedLabel: "Published",
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
        sourceContext: "Story context",
        sourceTitle: "Source vlog",
        summaryTitle: "Story summary",
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

function getArticleDisplayTitle(title: string) {
  return title.replace(/^\[(AI 팬 리포트|AI fan report)\]\s*/i, "");
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
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
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  homeHref: string;
  locale: Locale;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());

  return (
    <header className="border-b border-black/14 bg-white text-[#111510]">
      <div className="border-b border-black/10 bg-[#f7f7f4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-[0.72rem] font-semibold text-black/52 sm:px-6 lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
          <Link
            className="inline-flex items-center gap-3 text-[2rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[3.3rem]"
            href={homeHref}
          >
            {copy.siteName}
          </Link>
          <span className="hidden border border-black/14 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e] sm:inline-flex">
            {copy.articleEyebrow}
          </span>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-5 overflow-x-auto border-b border-black/10 py-2.5 text-sm font-bold text-black/62"
        >
          {copy.navItems.map((item) => (
            <span
              className="shrink-0"
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

function ReporterByline({
  copy,
  publishedAt,
  report,
  reporterProfile,
}: {
  copy: ReturnType<typeof getCopy>;
  publishedAt: string | null;
  report: FanletterNewsReportDocument;
  reporterProfile: FanletterNewsReporterProfile | null;
}) {
  const reporterDisplayName =
    reporterProfile?.displayName.trim() ||
    report.reporterCharacterName?.trim() ||
    report.reporterName;
  const reporterAvatarImageUrl =
    reporterProfile?.avatarImageUrl ?? report.reporterAvatarImageUrl ?? null;
  const reporterInitial =
    reporterDisplayName.trim().charAt(0).toUpperCase() ||
    report.reporterReferralCode.trim().charAt(0).toUpperCase() ||
    report.reporterName.trim().charAt(0).toUpperCase() ||
    "F";

  return (
    <section className="mt-5 flex min-w-0 flex-col gap-3 border-y border-black/12 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-sm font-black text-[#44f26e]">
          {reporterAvatarImageUrl ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover"
              fill
              sizes="2.75rem"
              src={reporterAvatarImageUrl}
            />
          ) : (
            reporterInitial
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[0.72rem] font-bold text-black/46">
            {copy.byline}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-[#111510]">
            {reporterDisplayName}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-black/48">
        {publishedAt ? (
          <span>
            {copy.publishedLabel} {publishedAt}
          </span>
        ) : null}
        <span>{copy.generated}</span>
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
    <section className="mt-7 border-y border-black/12 py-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#111510]">
          <Clapperboard className="size-4 text-[#16702e]" />
          {copy.embeddedTitle}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1 text-[0.68rem] font-bold text-black/64">
          <PlayCircle className="size-3.5" />
          {accessLabel}
        </span>
      </div>
      <div className="overflow-hidden border border-black/10 bg-black">
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
      </div>
      <p className="mt-2 text-xs font-medium leading-5 text-black/46">
        {sourceContent?.title ?? copy.sourceTitle}
      </p>
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
    <section className="border border-black/12 bg-white p-4 text-[#111510]">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-[#111510]">
          {avatarImageUrl ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover object-top"
              fill
              loading="eager"
              sizes="5rem"
              src={avatarImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#18251e)]">
              <UserRound className="size-8 text-[#44f26e]" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#16702e]">
            {copy.characterTitle}
          </p>
          <h2 className="mt-1 break-words text-xl font-black leading-tight [word-break:keep-all]">
            {characterName}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm font-medium leading-5 text-black/58">
            {character?.summary ?? sourceContent?.summary}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-3 gap-2 border-y border-black/10 py-3">
          <div>
            <p className="text-lg font-bold">
              {character ? `Lv.${character.growth.level}` : "-"}
            </p>
            <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-black/42">
              {copy.characterStats.level}
            </p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {sourceContent
                ? formatNumber(sourceContent.authorPublicContentCount, locale)
                : "-"}
            </p>
            <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-black/42">
              {copy.characterStats.vlogs}
            </p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {sourceContent ? formatNumber(reactionCount, locale) : "-"}
            </p>
            <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-black/42">
              {copy.characterStats.reactions}
            </p>
          </div>
        </div>
        <Link
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-black/14 bg-[#111510] px-4 text-sm font-bold !text-white transition hover:bg-black"
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
    <section className="border border-black/12 bg-white p-4 text-[#111510]">
      <div className="border-b border-black/12 pb-3">
        <div>
          <p className="text-xs font-bold text-[#16702e]">FanLetter News</p>
          <h2 className="mt-1 text-lg font-black tracking-normal">
            {copy.relatedNews}
          </h2>
        </div>
      </div>

      {reports.length > 0 ? (
        <div className="mt-4 grid gap-4">
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
                className="group grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 transition last:border-b-0 last:pb-0 hover:border-[#19b84b]"
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
                    className={`line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all] ${
                      shouldBlur ? "select-none blur-[2px]" : ""
                    }`}
                  >
                    {getArticleDisplayTitle(report.title)}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 text-xs font-medium leading-5 text-black/58 ${
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
        <p className="mt-4 border border-black/10 bg-[#f5f6f2] px-4 py-4 text-sm font-semibold leading-6 text-black/52">
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
  const articleTitle = getArticleDisplayTitle(report.title);
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
    <main className="min-h-screen bg-white text-[#111510]">
      <NewsSiteHeader copy={copy} homeHref={newsHomeHref} locale={locale} />

      <article className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
          <div className="min-w-0">
            <header className="border-b border-black/14 pb-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold text-black/54">
                <span className="text-[#16702e]">{copy.articleSection}</span>
                <span className="h-3 w-px bg-black/18" aria-hidden="true" />
                <span>{accessLabel}</span>
                <span className="h-3 w-px bg-black/18" aria-hidden="true" />
                <span>{copy.aiReport}</span>
              </div>

              <h1
                className={`mt-4 max-w-4xl break-words text-[2.05rem] font-black leading-[1.16] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[2.9rem] sm:leading-[1.12] ${nsfwTextBlurClass}`}
              >
                {articleTitle}
              </h1>
              <p
                className={`mt-4 max-w-3xl text-[1.05rem] font-medium leading-8 text-black/62 sm:text-[1.22rem] sm:leading-9 ${nsfwTextBlurClass}`}
              >
                {report.dek}
              </p>

              <ReporterByline
                copy={copy}
                publishedAt={publishedAt}
                report={report}
                reporterProfile={reporterProfile}
              />
            </header>

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

            <SourceVlogEmbed
              accessLabel={accessLabel}
              blurred={shouldBlurCurrentReport}
              copy={copy}
              reportCoverImageUrl={report.coverImageUrl}
              sourceContent={sourceContent}
            />

            <section className="mt-7 border-y border-black/12 bg-[#f7f7f4] px-4 py-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#111510]">
                <FileText className="size-4 text-[#16702e]" />
                {copy.summaryTitle}
              </div>
              <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div className="min-w-0" key={fact.label}>
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

            <section className="mt-8">
              <div
                className={`max-w-[42rem] space-y-6 text-[1.08rem] font-normal leading-8 text-black/84 sm:text-[1.14rem] sm:leading-9 ${
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
          </div>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <RelatedNewsList
              copy={copy}
              nsfwOptInEnabled={includeNsfw}
              referralCode={referralCode}
              reports={relatedReports}
            />

            <CharacterInfoCard
              copy={copy}
              creatorHref={creatorHref}
              locale={locale}
              sourceContent={sourceContent}
            />

            <section className="border border-black/12 bg-white p-4 text-[#111510]">
              <p className="text-xs font-bold text-[#16702e]">
                {copy.sourceContext}
              </p>
              <h2
                className={`mt-3 break-words text-lg font-black leading-tight [word-break:keep-all] ${nsfwTextBlurClass}`}
              >
                {report.sourceTitle}
              </h2>
              <p
                className={`mt-2 text-sm font-medium leading-6 text-black/58 ${nsfwTextBlurClass}`}
              >
                {report.sourceSummary}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1 text-[0.68rem] font-bold text-black/58">
                <Clapperboard className="size-3.5 text-[#16702e]" />
                {copy.sourceTitle}
              </span>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}
