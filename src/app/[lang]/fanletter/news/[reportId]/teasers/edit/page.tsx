import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck, WalletCards } from "lucide-react";

import {
  FanletterNewsReporterTeaserEditorPage,
  type FanletterNewsReporterTeaserEditorCoverOption,
  type FanletterNewsReporterTeaserEditorReport,
} from "@/components/fanletter-news-reporter-teaser-editor-page";
import {
  getFanletterNewsReportById,
  getFanletterNewsReportCoverOptions,
  getFanletterNewsReporterMemberByEmail,
} from "@/lib/fanletter-news-report-service";
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

type FanletterNewsReporterTeaserEditSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        connectBody:
          "이 뉴스의 팬 리포터 계정으로 로그인하면 리포터 티저 컷을 바로 수정할 수 있습니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "리포터 계정 연결이 필요합니다.",
        forbiddenBody:
          "로그인한 회원의 리포터 코드와 이 뉴스의 작성 리포터 코드가 다릅니다. 본인이 작성한 뉴스에서만 티저 컷을 수정할 수 있습니다.",
        forbiddenTitle: "내가 작성한 뉴스만 수정할 수 있습니다.",
        newsCta: "뉴스로 돌아가기",
        title: "리포터 티저 컷 편집",
      }
    : {
        connectBody:
          "Sign in with the fan reporter account that wrote this news to edit reporter teaser cuts.",
        connectCta: "Connect news account",
        connectTitle: "Reporter account connection required.",
        forbiddenBody:
          "The signed-in reporter code does not match the reporter who wrote this news. Teaser cuts can only be edited on news written by you.",
        forbiddenTitle: "Only your own news can be edited.",
        newsCta: "Back to news",
        title: "Edit reporter teaser cuts",
      };
}

function serializeCoverOption(
  option: Awaited<ReturnType<typeof getFanletterNewsReportCoverOptions>>["options"][number],
): FanletterNewsReporterTeaserEditorCoverOption {
  return {
    candidateId: option.candidateId,
    contentType: option.contentType,
    height: option.height,
    imageUrl: option.imageUrl,
    inputValue: option.inputValue,
    isAuto: option.isAuto,
    isSelected: option.isSelected,
    placements: option.placements,
    source: option.source,
    timestampSec: option.timestampSec,
    width: option.width,
  };
}

function serializeReport(
  report: NonNullable<Awaited<ReturnType<typeof getFanletterNewsReportById>>>,
): FanletterNewsReporterTeaserEditorReport {
  return {
    contentId: report.contentId,
    contentMaturityRating: report.contentMaturityRating,
    coverImageUrl: report.coverImageUrl,
    reporterName: report.reporterName,
    reportId: report.reportId,
    teaserImages:
      report.teaserImages?.map((image) => ({
        crop: image.crop
          ? {
              aspectRatio: image.crop.aspectRatio,
              height: image.crop.height,
              outputHeight: image.crop.outputHeight,
              outputWidth: image.crop.outputWidth,
              sourceImageUrl: image.crop.sourceImageUrl,
              width: image.crop.width,
              x: image.crop.x,
              y: image.crop.y,
            }
          : null,
        imageUrl: image.imageUrl,
        source: image.source,
        sourceImageUrl: image.sourceImageUrl,
      })) ?? [],
    teaserImageUrls: report.teaserImageUrls ?? [],
    title: report.title,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; reportId: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.title} | FanLetter News`,
  };
}

export default async function LocalizedFanletterNewsReporterTeaserEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterNewsReporterTeaserEditSearchParams>;
}) {
  const { lang, reportId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const report = await getFanletterNewsReportById(reportId);

  if (!report) {
    notFound();
  }

  const referralCode =
    readFanletterReferralCode(query.ref) ?? report.reporterReferralCode;
  const newsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const returnHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ?? newsHref;
  const editHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/${report.reportId}/teasers/edit`,
      referralCode,
    ),
    { returnTo: returnHref },
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: editHref },
  );
  const session = await readMemberServerSession();
  const viewerReporterMember = await getFanletterNewsReporterMemberByEmail(
    session?.email ?? null,
    locale,
  );
  const viewerReferralCode = normalizeReferralCode(
    viewerReporterMember?.referralCode,
  );
  const reporterReferralCode = normalizeReferralCode(report.reporterReferralCode);
  const isViewerReporterOwner = Boolean(
    session?.email &&
      viewerReferralCode &&
      reporterReferralCode &&
      viewerReferralCode === reporterReferralCode,
  );

  if (!session || !viewerReporterMember) {
    return (
      <RestrictedTeaserEditState
        body={copy.connectBody}
        connectHref={connectHref}
        connectLabel={copy.connectCta}
        newsHref={returnHref}
        newsLabel={copy.newsCta}
        title={copy.connectTitle}
        tone="connect"
      />
    );
  }

  if (!isViewerReporterOwner) {
    return (
      <RestrictedTeaserEditState
        body={copy.forbiddenBody}
        connectHref={null}
        connectLabel={copy.connectCta}
        newsHref={returnHref}
        newsLabel={copy.newsCta}
        title={copy.forbiddenTitle}
        tone="forbidden"
      />
    );
  }

  const coverEditor = await getFanletterNewsReportCoverOptions({
    reportId: report.reportId,
    reporterReferralCode,
  });

  return (
    <FanletterNewsReporterTeaserEditorPage
      coverOptions={coverEditor.options.map(serializeCoverOption)}
      locale={locale}
      newsHref={newsHref}
      report={serializeReport(report)}
      returnHref={returnHref}
    />
  );
}

function RestrictedTeaserEditState({
  body,
  connectHref,
  connectLabel,
  newsHref,
  newsLabel,
  title,
  tone,
}: {
  body: string;
  connectHref: string | null;
  connectLabel: string;
  newsHref: string;
  newsLabel: string;
  title: string;
  tone: "connect" | "forbidden";
}) {
  return (
    <main className="min-h-screen bg-[#f2f4ef] px-4 pb-28 pt-5 text-[#111510] sm:px-6 sm:py-6 lg:px-8">
      <section className="mx-auto max-w-3xl border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-8">
        <p className="inline-flex size-11 items-center justify-center rounded-full bg-[#111510] text-[#44f26e]">
          {tone === "connect" ? (
            <WalletCards className="size-5" />
          ) : (
            <ShieldCheck className="size-5" />
          )}
        </p>
        <h1 className="mt-4 text-[2rem] font-black leading-tight tracking-normal [word-break:keep-all] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
          {body}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {connectHref ? (
            <Link
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black sm:h-11 sm:w-auto"
              href={connectHref}
            >
              {connectLabel}
              <ArrowRight className="size-4 text-[#44f26e]" />
            </Link>
          ) : null}
          <Link
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f6f8f4] px-5 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:h-11 sm:w-auto"
            href={newsHref}
          >
            <ArrowLeft className="size-4 text-[#16702e]" />
            {newsLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
