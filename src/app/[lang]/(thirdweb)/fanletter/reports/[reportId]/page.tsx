import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Clapperboard,
  ExternalLink,
  FileText,
  ImageIcon,
  Newspaper,
} from "lucide-react";

import { FanletterReportEditSubmitButton } from "@/components/fanletter-report-edit-submit-button";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsReportForMemberById,
  getFanletterNewsReporterMemberByEmail,
  updateFanletterNewsReportContent,
} from "@/lib/fanletter-news-report-service";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterReportEditSearchParams = {
  error?: string | string[];
  ref?: string | string[];
  saved?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        back: "목록으로",
        body: "본문",
        bodyHelp:
          "공개 뉴스 본문에 반영됩니다. 원본 브이로그와 다른 사실로 보이지 않게 유지해 주세요.",
        connectReturn: "리포트 수정으로 돌아가기",
        dek: "요약",
        errorSave: "리포트를 저장하지 못했습니다. 입력값을 확인해 주세요.",
        facts: "육하원칙",
        meta: "리포트 정보",
        openNews: "공개 뉴스 보기",
        reporterComment: "기자 코멘트",
        reporterCommentHelp:
          "AI 생성에 참고한 개인 메모입니다. 비워둘 수 있습니다.",
        saved: "변경사항을 저장했습니다.",
        save: "저장",
        saving: "저장 중",
        source: "원본 브이로그",
        sourceSummary: "원본 요약",
        subtitle:
          "내가 작성한 AI 팬 리포트의 공개 제목, 요약, 본문, 육하원칙을 수정합니다.",
        title: "리포트 내용 수정",
        titleField: "제목",
        fields: {
          how: "어떻게",
          what: "무엇을",
          when: "언제",
          where: "어디서",
          who: "누가",
          why: "왜",
        },
        priceType: {
          paid: "유료 브이로그",
          public: "공개 브이로그",
        },
      }
    : {
        back: "Back to list",
        body: "Body",
        bodyHelp:
          "This appears in the public news story. Keep it aligned with the source vlog context.",
        connectReturn: "Return to report edit",
        dek: "Summary",
        errorSave: "Could not save the report. Check the fields and try again.",
        facts: "Five Ws and one H",
        meta: "Report info",
        openNews: "Open public news",
        reporterComment: "Reporter comment",
        reporterCommentHelp:
          "Private note used for AI generation. This can be left empty.",
        saved: "Changes saved.",
        save: "Save",
        saving: "Saving",
        source: "Source vlog",
        sourceSummary: "Source summary",
        subtitle:
          "Edit the public title, summary, body, and fact fields for your AI fan report.",
        title: "Edit report content",
        titleField: "Title",
        fields: {
          how: "How",
          what: "What",
          when: "When",
          where: "Where",
          who: "Who",
          why: "Why",
        },
        priceType: {
          paid: "Paid vlog",
          public: "Public vlog",
        },
      };
}

function getFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readFirst(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

async function updateFanletterReportContentAction(formData: FormData) {
  "use server";

  const reportId = getFormString(formData.get("reportId"));
  const localeValue = getFormString(formData.get("locale"));
  const referralCode = readFanletterReferralCode(
    getFormString(formData.get("ref")) || undefined,
  );
  const locale = hasLocale(localeValue) ? (localeValue as Locale) : defaultLocale;
  const detailHref = buildPathWithReferral(
    `/${locale}/fanletter/reports/${reportId}`,
    referralCode,
  );
  const session = await readMemberServerSession();

  if (!session) {
    redirect(
      setPathSearchParams(
        buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
        { returnTo: detailHref },
      ),
    );
  }

  const member = await getFanletterNewsReporterMemberByEmail(
    session.email,
    locale,
  );

  if (!member) {
    redirect(
      setPathSearchParams(
        buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
        { returnTo: detailHref },
      ),
    );
  }

  let savedReportId = reportId;

  try {
    const report = await updateFanletterNewsReportContent({
      body: getFormString(formData.get("body")),
      dek: getFormString(formData.get("dek")),
      how: getFormString(formData.get("how")),
      reporterComment: getFormString(formData.get("reporterComment")),
      reporterReferralCode: member.referralCode,
      reportId,
      title: getFormString(formData.get("title")),
      what: getFormString(formData.get("what")),
      when: getFormString(formData.get("when")),
      where: getFormString(formData.get("where")),
      who: getFormString(formData.get("who")),
      why: getFormString(formData.get("why")),
    });

    savedReportId = report.reportId;
    revalidatePath(`/${report.locale}/fanletter/news/${report.reportId}`);
    revalidatePath(`/${report.locale}/fanletter/news`);
    revalidatePath(`/${report.locale}/fanletter/reports`);
    revalidatePath(`/${report.locale}/fanletter/reports/${report.reportId}`);
  } catch {
    redirect(
      setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/fanletter/reports/${savedReportId}`,
          referralCode,
        ),
        { error: "save" },
      ),
    );
  }

  redirect(
    setPathSearchParams(
      buildPathWithReferral(
        `/${locale}/fanletter/reports/${savedReportId}`,
        referralCode,
      ),
      { saved: "1" },
    ),
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: string;
  htmlFor: string;
}) {
  return (
    <label
      className="text-xs font-black uppercase tracking-[0.12em] text-black/48"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  maxLength,
  name,
}: {
  defaultValue: string;
  label: string;
  maxLength: number;
  name: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-black/12 bg-white px-3 text-sm font-bold text-[#111510] outline-none transition focus:border-[#19b84b] focus:ring-2 focus:ring-[#19b84b]/16"
        defaultValue={defaultValue}
        id={name}
        maxLength={maxLength}
        name={name}
        required
      />
    </div>
  );
}

function TextAreaField({
  defaultValue,
  help,
  label,
  maxLength,
  minRows = 3,
  name,
}: {
  defaultValue: string;
  help?: string;
  label: string;
  maxLength: number;
  minRows?: number;
  name: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <textarea
        className="mt-2 w-full rounded-lg border border-black/12 bg-white px-3 py-3 text-sm font-bold leading-6 text-[#111510] outline-none transition focus:border-[#19b84b] focus:ring-2 focus:ring-[#19b84b]/16"
        defaultValue={defaultValue}
        id={name}
        maxLength={maxLength}
        name={name}
        required={name !== "reporterComment"}
        rows={minRows}
      />
      {help ? (
        <p className="mt-1.5 text-xs font-semibold leading-5 text-black/44">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; reportId: string }>;
}): Promise<Metadata> {
  const { lang, reportId } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.title} | FanLetter`,
    description:
      locale === "ko"
        ? `FanLetter AI 팬 리포트 ${reportId} 수정`
        : `Edit FanLetter AI fan report ${reportId}`,
  };
}

export default async function LocalizedFanletterReportEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterReportEditSearchParams>;
}) {
  const { lang, reportId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const rawReferralCode = readFanletterReferralCode(query.ref);
  const saved = readFirst(query.saved) === "1";
  const hasSaveError = readFirst(query.error) === "save";
  const session = await readMemberServerSession();
  const editPath = `/${locale}/fanletter/reports/${reportId}`;
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, rawReferralCode),
    {
      returnTo: buildPathWithReferral(editPath, rawReferralCode),
    },
  );

  if (!session) {
    redirect(connectHref);
  }

  const { member, report } = await getFanletterNewsReportForMemberById({
    email: session.email,
    locale,
    reportId,
  });

  if (!member) {
    redirect(connectHref);
  }

  if (!report) {
    notFound();
  }

  const referralCode = rawReferralCode ?? member.referralCode;
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/reports`,
    referralCode,
  );
  const newsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const sourceHref = buildPathWithReferral(
    `/${locale}/fanletter/content/${report.contentId}`,
    referralCode,
  );
  const updatedAt = formatDate(report.updatedAt, locale);
  const sourcePublishedAt = formatDate(report.sourcePublishedAt, locale);
  const accessLabel =
    report.priceType === "paid" ? copy.priceType.paid : copy.priceType.public;

  return (
    <main className="min-h-screen bg-[#f5f6f1] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
            href={reportsHref}
          >
            <ArrowLeft className="size-4 text-[#16702e]" />
            {copy.back}
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-black"
            href={newsHref}
          >
            {copy.openNews}
            <ExternalLink className="size-4 text-[#44f26e]" />
          </Link>
        </div>

        <header className="mt-4 border-b border-black/12 pb-5">
          <p className="inline-flex items-center gap-1.5 border border-[#16702e]/20 bg-white px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
            <BadgeCheck className="size-3.5" />
            {member.referralCode}
          </p>
          <h1 className="mt-3 max-w-4xl text-[2.2rem] font-black leading-none tracking-normal [word-break:keep-all] sm:text-[3.35rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
            {copy.subtitle}
          </p>
        </header>

        {saved ? (
          <p className="mt-5 border border-[#19b84b]/24 bg-[#ecfff0] px-4 py-3 text-sm font-black text-[#16702e]">
            {copy.saved}
          </p>
        ) : null}
        {hasSaveError ? (
          <p className="mt-5 inline-flex w-full items-start gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black leading-6 text-rose-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {copy.errorSave}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <form
            action={updateFanletterReportContentAction}
            className="border border-black/12 bg-white p-4 shadow-[0_18px_46px_rgba(17,21,16,0.07)] sm:p-6"
          >
            <input name="reportId" type="hidden" value={report.reportId} />
            <input name="locale" type="hidden" value={locale} />
            {referralCode ? (
              <input name="ref" type="hidden" value={referralCode} />
            ) : null}

            <div className="grid gap-4">
              <TextField
                defaultValue={report.title}
                label={copy.titleField}
                maxLength={180}
                name="title"
              />
              <TextAreaField
                defaultValue={report.dek}
                label={copy.dek}
                maxLength={320}
                name="dek"
              />
              <TextAreaField
                defaultValue={report.body}
                help={copy.bodyHelp}
                label={copy.body}
                maxLength={12000}
                minRows={9}
                name="body"
              />
            </div>

            <section className="mt-6 border-t border-black/10 pt-5">
              <h2 className="inline-flex items-center gap-2 text-lg font-black tracking-normal">
                <FileText className="size-5 text-[#16702e]" />
                {copy.facts}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextAreaField
                  defaultValue={report.who}
                  label={copy.fields.who}
                  maxLength={500}
                  name="who"
                />
                <TextAreaField
                  defaultValue={report.when}
                  label={copy.fields.when}
                  maxLength={500}
                  name="when"
                />
                <TextAreaField
                  defaultValue={report.where}
                  label={copy.fields.where}
                  maxLength={500}
                  name="where"
                />
                <TextAreaField
                  defaultValue={report.what}
                  label={copy.fields.what}
                  maxLength={500}
                  name="what"
                />
                <TextAreaField
                  defaultValue={report.why}
                  label={copy.fields.why}
                  maxLength={500}
                  name="why"
                />
                <TextAreaField
                  defaultValue={report.how}
                  label={copy.fields.how}
                  maxLength={500}
                  name="how"
                />
              </div>
            </section>

            <section className="mt-6 border-t border-black/10 pt-5">
              <TextAreaField
                defaultValue={report.reporterComment ?? ""}
                help={copy.reporterCommentHelp}
                label={copy.reporterComment}
                maxLength={220}
                name="reporterComment"
              />
            </section>

            <div className="mt-6 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-5 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={newsHref}
              >
                {copy.openNews}
                <ExternalLink className="size-4 text-[#16702e]" />
              </Link>
              <FanletterReportEditSubmitButton
                idleLabel={copy.save}
                pendingLabel={copy.saving}
              />
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <section className="overflow-hidden border border-black/12 bg-white shadow-[0_18px_46px_rgba(17,21,16,0.07)]">
              <div className="relative aspect-[16/10] bg-[#111510]">
                {report.coverImageUrl ? (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="object-cover"
                    fill
                    sizes="(max-width: 1024px) 100vw, 352px"
                    src={report.coverImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      report.coverImageUrl,
                    )}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Newspaper className="size-10 text-[#44f26e]" />
                  </div>
                )}
                <span className="absolute left-3 top-3 inline-flex border border-white/18 bg-black/50 px-2.5 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.12em] text-white/78 backdrop-blur">
                  {accessLabel}
                </span>
              </div>
              <div className="p-4">
                <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                  <ImageIcon className="size-3.5" />
                  {copy.meta}
                </p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-3 py-2">
                    <dt className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                      ID
                    </dt>
                    <dd className="mt-1 break-all font-black">
                      {report.reportId}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-3 py-2">
                    <dt className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                      {copy.source}
                    </dt>
                    <dd className="mt-1 font-black leading-5">
                      {report.sourceTitle}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-3 py-2">
                    <dt className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                      {copy.sourceSummary}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold leading-5 text-black/58">
                      {report.sourceSummary}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-3 py-2">
                      <dt className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                        Updated
                      </dt>
                      <dd className="mt-1 font-black">{updatedAt}</dd>
                    </div>
                    <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-3 py-2">
                      <dt className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                        Published
                      </dt>
                      <dd className="mt-1 font-black">
                        {sourcePublishedAt ?? "-"}
                      </dd>
                    </div>
                  </div>
                </dl>
                <Link
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-4 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                  href={sourceHref}
                >
                  <Clapperboard className="size-4 text-[#16702e]" />
                  {copy.source}
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
