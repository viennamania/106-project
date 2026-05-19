import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileText,
  MessageCircleHeart,
  Newspaper,
  PenLine,
  ShieldCheck,
} from "lucide-react";

import { FanletterTabTopBar } from "@/components/fanletter-tab-top-bar";
import {
  createFanletterNewsReportShareHref,
  getFanletterNewsReportById,
} from "@/lib/fanletter-news-report-service";
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
        articleNotice:
          "이 글은 원본 브이로그의 공개 정보와 티저를 바탕으로 생성된 FanLetter AI 팬 리포트입니다. 실제 언론사의 독립 취재 기사로 표시하지 않습니다.",
        byline: "팬 기자",
        contentBadge: {
          nsfw: "성인 팬 전용 표시",
          paid: "팬 전용 유료 브이로그",
          public: "공개 브이로그",
        },
        generated: "AI 생성",
        openCreator: "캐릭터 채널 보기",
        openSource: "원본 브이로그 보기",
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
        articleNotice:
          "This is a FanLetter AI fan report generated from the public source vlog information and teaser. It is not presented as independently reported journalism.",
        byline: "Fan reporter",
        contentBadge: {
          nsfw: "Adult fan-only marker",
          paid: "Fan-only paid vlog",
          public: "Public vlog",
        },
        generated: "AI generated",
        openCreator: "View character channel",
        openSource: "View source vlog",
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
  const accessLabel =
    report.contentMaturityRating === "nsfw"
      ? copy.contentBadge.nsfw
      : report.priceType === "paid"
        ? copy.contentBadge.paid
        : copy.contentBadge.public;
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

          <article className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#07100b] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div
              className={cn(
                "relative min-h-[18rem] overflow-hidden border-b border-white/10 bg-[#0a120d] sm:min-h-[22rem]",
                !report.coverImageUrl && "bg-[radial-gradient(circle_at_20%_20%,rgba(68,242,110,0.18),transparent_32%),linear-gradient(135deg,#07100b,#101912)]",
              )}
            >
              {report.coverImageUrl ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center opacity-75"
                  style={{ backgroundImage: `url(${report.coverImageUrl})` }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,4,0.18),rgba(3,5,4,0.74)_58%,#07100b)]" />
              <div className="relative flex min-h-[18rem] flex-col justify-end p-5 sm:min-h-[22rem] sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-black">
                    <Newspaper className="size-3.5" />
                    {copy.aiReport}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/36 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/76 backdrop-blur">
                    <ShieldCheck className="size-3.5" />
                    {accessLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/36 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/76 backdrop-blur">
                    <BadgeCheck className="size-3.5" />
                    {copy.generated}
                  </span>
                </div>
                <h1 className="mt-5 max-w-4xl break-words text-[2.35rem] font-semibold leading-[1.02] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[4.4rem]">
                  {report.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-white/76 sm:text-xl sm:leading-8">
                  {report.dek}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/62">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5">
                    <PenLine className="size-3.5 text-[#44f26e]" />
                    {copy.byline} · {report.reporterName}
                  </span>
                  {publishedAt ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/28 px-3 py-1.5">
                      <CalendarDays className="size-3.5 text-[#44f26e]" />
                      {publishedAt}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8 lg:p-9">
              <div className="min-w-0">
                <div className="grid gap-2 sm:grid-cols-2">
                  {facts.map((fact) => (
                    <div
                      className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
                      key={fact.label}
                    >
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                        {fact.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white/78">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-lg border border-white/10 bg-black/24 p-5 sm:p-6">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#44f26e]">
                    <FileText className="size-4" />
                    {copy.aiReport}
                  </div>
                  <div className="space-y-4 text-base font-medium leading-8 text-white/76">
                    {articleParagraphs.map((paragraph) => (
                      <p className="[word-break:keep-all]" key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-medium leading-5 text-white/50">
                  {copy.articleNotice}
                </p>
              </div>

              <aside className="space-y-3 lg:sticky lg:top-6">
                <div className="rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4">
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

                <Link
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.05] px-4 text-sm font-semibold !text-white transition hover:border-[#44f26e]/42 hover:bg-white/[0.08]"
                  href={creatorHref}
                >
                  <MessageCircleHeart className="size-4" />
                  {copy.openCreator}
                </Link>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-xs font-medium leading-5 text-white/48">
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
