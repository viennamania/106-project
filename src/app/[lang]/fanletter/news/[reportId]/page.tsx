import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clapperboard,
  FileText,
  Heart,
  LockKeyhole,
  MessageCircle,
  MessageCircleHeart,
  Newspaper,
  PenLine,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FanletterResponsiveMediaFrame } from "@/components/fanletter-responsive-media-frame";
import { FanletterTabTopBar } from "@/components/fanletter-tab-top-bar";
import {
  getFanletterPublicContentDetail,
  type FanletterPublicContentDetail,
  type FanletterPublicContentItem,
} from "@/lib/fanletter-content-service";
import {
  createFanletterNewsReportShareHref,
  getFanletterNewsReportById,
} from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { cn } from "@/lib/utils";

type FanletterNewsReportSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        aiReport: "AI 팬 리포트",
        articleEyebrow: "FanLetter News Desk",
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
        embeddedLocked:
          "원본 브이로그는 FanLetter 원문에서 조건을 확인한 뒤 이어서 볼 수 있습니다.",
        embeddedTitle: "원본 브이로그",
        generated: "AI 생성",
        openCreator: "캐릭터 채널 보기",
        openSource: "원본 브이로그 보기",
        relatedCta: "보기",
        relatedVlogs: "같은 캐릭터의 다른 브이로그",
        readSource: "원본 보기",
        relatedTitle: "원본 브이로그",
        sixW: {
          how: "어떻게",
          what: "무엇을",
          when: "언제",
          where: "어디서",
          who: "누가",
          why: "왜",
        },
      }
    : {
        aiReport: "AI fan report",
        articleEyebrow: "FanLetter News Desk",
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
        embeddedLocked:
          "The source vlog can be continued from the FanLetter source page after the required access step.",
        embeddedTitle: "Source vlog",
        generated: "AI generated",
        openCreator: "View character channel",
        openSource: "View source vlog",
        relatedCta: "View",
        relatedVlogs: "More vlogs from this character",
        readSource: "Read source",
        relatedTitle: "Source vlog",
        sixW: {
          how: "How",
          what: "What",
          when: "When",
          where: "Where",
          who: "Who",
          why: "Why",
        },
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

function getContentHref({
  item,
  locale,
  referralCode,
}: {
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/content/${item.contentId}`,
    referralCode,
  );
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

function SourceVlogEmbed({
  accessLabel,
  copy,
  reportCoverImageUrl,
  sourceContent,
  sourceHref,
}: {
  accessLabel: string;
  copy: ReturnType<typeof getCopy>;
  reportCoverImageUrl: string | null;
  sourceContent: FanletterPublicContentDetail | null;
  sourceHref: string;
}) {
  const sourceVideoUrl =
    sourceContent?.canViewerAccess ? sourceContent.contentVideoUrls[0] ?? null : null;
  const sourceImageUrl =
    sourceContent?.coverImageUrl ??
    sourceContent?.contentImageUrls[0] ??
    reportCoverImageUrl;
  const hasEmbeddedVideo = Boolean(sourceVideoUrl);

  return (
    <section className="mt-7 overflow-hidden rounded-lg border border-black/10 bg-[#0a0d0a] text-white shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative bg-black">
          <FanletterResponsiveMediaFrame
            alt={sourceContent?.title ?? copy.embeddedTitle}
            imageUrl={sourceImageUrl}
            mediaType={sourceContent?.mediaType ?? "video"}
            title={sourceContent?.title ?? copy.embeddedTitle}
            videoUrl={sourceVideoUrl}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/62 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
                <Clapperboard className="size-3.5 text-[#44f26e]" />
                {copy.embeddedTitle}
              </span>
              <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-black">
                FanLetter
              </span>
            </div>
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
        </div>
        <div className="flex flex-col justify-between gap-5 border-t border-white/10 p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.relatedTitle}
            </p>
            <h2 className="mt-3 break-words text-2xl font-semibold leading-tight [word-break:keep-all]">
              {sourceContent?.title ?? copy.embeddedTitle}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-white/62">
              {sourceContent?.summary ?? copy.embeddedLocked}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/70">
              <PlayCircle className="size-3.5 text-[#44f26e]" />
              {accessLabel}
            </span>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#65ff84]"
              href={sourceHref}
            >
              {copy.openSource}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
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
    <section className="rounded-lg border border-white/10 bg-[#07100b] p-4">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
        {copy.characterTitle}
      </p>
      <div className="mt-4 flex items-center gap-3">
        {avatarImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="size-14 rounded-lg object-cover"
            height={56}
            src={avatarImageUrl}
            width={56}
          />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            <UserRound className="size-7" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{characterName}</h2>
          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-white/52">
            {character?.summary ?? sourceContent?.summary}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/22 p-3">
          <p className="text-lg font-semibold">
            {character ? `Lv.${character.growth.level}` : "-"}
          </p>
          <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white/42">
            {copy.characterStats.level}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/22 p-3">
          <p className="text-lg font-semibold">
            {sourceContent
              ? formatNumber(sourceContent.authorPublicContentCount, locale)
              : "-"}
          </p>
          <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white/42">
            {copy.characterStats.vlogs}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/22 p-3">
          <p className="text-lg font-semibold">
            {sourceContent ? formatNumber(reactionCount, locale) : "-"}
          </p>
          <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white/42">
            {copy.characterStats.reactions}
          </p>
        </div>
      </div>
      <Link
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.05] px-4 text-sm font-semibold !text-white transition hover:border-[#44f26e]/42 hover:bg-white/[0.08]"
        href={creatorHref}
      >
        <MessageCircleHeart className="size-4" />
        {copy.openCreator}
      </Link>
    </section>
  );
}

function RelatedVlogsList({
  copy,
  items,
  locale,
  nsfwOptInEnabled,
  referralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  items: FanletterPublicContentItem[];
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-7 rounded-lg border border-black/10 bg-white p-5 text-black shadow-[0_18px_50px_rgba(0,0,0,0.1)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
            FanLetter
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            {copy.relatedVlogs}
          </h2>
        </div>
        <Sparkles className="size-6 text-[#19b84b]" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.slice(0, 4).map((item) => {
          const href = getContentHref({ item, locale, referralCode });
          const shouldBlur =
            item.contentMaturityRating === "nsfw" && !nsfwOptInEnabled;
          const socialCount =
            item.social.likeCount + item.social.commentCount + item.social.saveCount;

          return (
            <Link
              className="group grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-black/10 bg-[#f6f8f4] p-2 transition hover:border-[#29d85f]/60 hover:bg-[#effff3]"
              href={href}
              key={item.contentId}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#07100b]">
                {item.coverImageUrl ? (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={cn(
                      "object-cover transition duration-300 group-hover:scale-[1.04]",
                      shouldBlur && "scale-[1.06] blur-md brightness-[0.76]",
                    )}
                    fill
                    sizes="6rem"
                    src={item.coverImageUrl}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/68">
                    <Clapperboard className="size-7 text-[#44f26e]" />
                  </div>
                )}
                {item.priceType === "paid" ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/64 px-2 py-0.5 text-[0.56rem] font-semibold text-white">
                    {copy.contentBadge.paid}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 py-1">
                <p className="line-clamp-2 break-words text-sm font-semibold leading-5 [word-break:keep-all]">
                  {item.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-black/54">
                  {item.summary}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.66rem] font-semibold text-black/46">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3" />
                    {formatNumber(socialCount, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3" />
                    {copy.relatedCta}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
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
    ? `${report.title} | FanLetter`
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
      siteName: "FanLetter",
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
  const sourceContent = await getFanletterPublicContentDetail(
    report.contentId,
    locale,
    null,
    { includeNsfw },
  ).catch(() => null);
  const copy = getCopy(locale);
  const referralCode =
    readFanletterReferralCode(query.ref) ?? report.reporterReferralCode;
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const reportHref = createFanletterNewsReportShareHref(report);
  const sourceHref = buildPathWithReferral(report.sourceHref, referralCode);
  const backHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ?? sourceHref;
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
    <main className="min-h-screen bg-[#030504] pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-white sm:pb-0">
      <section className="px-4 pb-8 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <FanletterTabTopBar
            actionHref={sourceHref}
            actionLabel={copy.readSource}
            backHref={backHref}
            homeHref={homeHref}
            locale={locale}
            referralCode={referralCode}
          />

          <article className="mt-5 overflow-hidden rounded-lg border border-black/10 bg-[#f7f5ef] text-[#111510] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="border-b border-black/10 p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/12 pb-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/58">
                  <Newspaper className="size-4 text-[#16702e]" />
                  {copy.articleEyebrow}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black">
                    <ShieldCheck className="size-3.5" />
                    {accessLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-black/[0.04] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black/62">
                    <BadgeCheck className="size-3.5" />
                    {copy.generated}
                  </span>
                </div>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#16702e]">
                {copy.dateline}
              </p>
              <h1 className="mt-4 max-w-5xl break-words text-[2.45rem] font-semibold leading-[1.02] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[4.6rem]">
                {report.title}
              </h1>
              <p className="mt-5 max-w-3xl border-l-4 border-[#44f26e] pl-4 text-base font-medium leading-7 text-black/68 sm:text-xl sm:leading-8">
                {report.dek}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-black/54">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-white px-3 py-1.5">
                  <PenLine className="size-3.5 text-[#16702e]" />
                  {copy.byline} · {report.reporterName}
                </span>
                {publishedAt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-white px-3 py-1.5">
                    <CalendarDays className="size-3.5 text-[#16702e]" />
                    {publishedAt}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-white px-3 py-1.5">
                  <FileText className="size-3.5 text-[#16702e]" />
                  {copy.aiReport}
                </span>
              </div>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8 lg:p-9">
              <div className="min-w-0">
                <SourceVlogEmbed
                  accessLabel={accessLabel}
                  copy={copy}
                  reportCoverImageUrl={report.coverImageUrl}
                  sourceContent={sourceContent}
                  sourceHref={sourceHref}
                />

                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  {facts.map((fact) => (
                    <div
                      className="rounded-lg border border-black/10 bg-white p-4"
                      key={fact.label}
                    >
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#16702e]">
                        {fact.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 border-t border-black/10 pt-6">
                  <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#16702e]">
                    <FileText className="size-4" />
                    {copy.aiReport}
                  </div>
                  <div className="max-w-3xl space-y-5 text-[1.08rem] font-medium leading-8 text-black/76 sm:text-[1.18rem] sm:leading-9">
                    {articleParagraphs.map((paragraph) => (
                      <p className="[word-break:keep-all]" key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                <RelatedVlogsList
                  copy={copy}
                  items={sourceContent?.authorRecentContent ?? []}
                  locale={locale}
                  nsfwOptInEnabled={sourceContent?.nsfwOptInEnabled ?? includeNsfw}
                  referralCode={referralCode}
                />

                <p className="mt-5 rounded-lg border border-black/10 bg-black/[0.035] px-4 py-3 text-xs font-medium leading-5 text-black/48">
                  {copy.articleNotice}
                </p>
              </div>

              <aside className="space-y-3 text-white lg:sticky lg:top-6">
                <CharacterInfoCard
                  copy={copy}
                  creatorHref={creatorHref}
                  locale={locale}
                  sourceContent={sourceContent}
                />

                <div className="rounded-lg border border-white/10 bg-[#07100b] p-4">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                    {copy.relatedTitle}
                  </p>
                  <h2 className="mt-3 break-words text-xl font-semibold leading-tight [word-break:keep-all]">
                    {report.sourceTitle}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                    {report.sourceSummary}
                  </p>
                  <Link
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#65ff84]"
                    href={sourceHref}
                  >
                    {copy.openSource}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#07100b] p-4 text-xs font-medium leading-5 text-white/48">
                  <p className="font-semibold text-white/72">FanLetter</p>
                  <p className="mt-1 break-all">{reportHref}</p>
                </div>
              </aside>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
