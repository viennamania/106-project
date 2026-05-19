import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
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
  getRelatedFanletterNewsReports,
} from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
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
        openCreator: "캐릭터 채널",
        relatedNews: "같은 캐릭터의 다른 뉴스",
        relatedNewsEmpty: "아직 이 캐릭터의 다른 뉴스가 없습니다.",
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
        openCreator: "Character channel",
        relatedNews: "More news from this character",
        relatedNewsEmpty: "No other news from this character yet.",
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

function SourceVlogEmbed({
  accessLabel,
  copy,
  reportCoverImageUrl,
  sourceContent,
}: {
  accessLabel: string;
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
        eager
        imageUrl={sourceImageUrl}
        mediaType={sourceContent?.mediaType ?? "video"}
        title={sourceContent?.title ?? copy.embeddedTitle}
        videoUrl={sourceVideoUrl}
      >
        {!hasEmbeddedVideo ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/34 p-5 text-center backdrop-blur-[1px]">
            <div className="max-w-sm rounded-lg border border-white/14 bg-black/68 p-4">
              <LockKeyhole className="mx-auto size-7 text-[#44f26e]" />
              <p className="mt-3 text-sm font-semibold leading-6 text-white/82">
                {copy.embeddedLocked}
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
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
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
                      className="object-cover transition duration-300 group-hover:scale-[1.04]"
                      fill
                      sizes="6rem"
                      src={report.coverImageUrl}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/68">
                      <Newspaper className="size-7 text-[#44f26e]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all]">
                    {report.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-black/58">
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
  const [sourceContent, relatedReports] = await Promise.all([
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
  ]);
  const copy = getCopy(locale);
  const referralCode =
    readFanletterReferralCode(query.ref) ?? report.reporterReferralCode;
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const reportHref = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const creatorHref = report.creatorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/creator/${report.creatorReferralCode}`,
        referralCode,
      )
    : homeHref;
  const publishedAt = formatDate(report.sourcePublishedAt, locale);
  const articleParagraphs = splitArticleBody(report.body);
  const accessLabel = getContentAccessLabel(sourceContent ?? report, copy);
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
      <NewsSiteHeader copy={copy} homeHref={homeHref} />

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
            <h1 className="mt-3 max-w-5xl break-words text-[2.65rem] font-black leading-[0.98] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[4.9rem]">
              {report.title}
            </h1>
            <p className="mt-5 max-w-3xl border-l-4 border-[#44f26e] pl-4 text-base font-semibold leading-7 text-black/70 sm:text-xl sm:leading-8">
              {report.dek}
            </p>

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
                  <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
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
              <div className="max-w-3xl space-y-5 text-[1.08rem] font-medium leading-8 text-black/78 sm:text-[1.18rem] sm:leading-9">
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
              <h2 className="mt-3 break-words text-xl font-black leading-tight [word-break:keep-all]">
                {report.sourceTitle}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-black/58">
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
            referralCode={referralCode}
            reports={relatedReports}
          />
        </div>
      </article>
    </main>
  );
}
