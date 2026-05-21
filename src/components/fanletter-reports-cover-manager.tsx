"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  ImageIcon,
  Loader2,
  Newspaper,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { FanletterNewsReportCoverImageSource } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export type FanletterReportsPageReport = {
  coverImageSource: FanletterNewsReportCoverImageSource;
  coverImageUrl: string | null;
  dek: string;
  priceType: "free" | "paid";
  reportHref: string;
  reportId: string;
  sourceHref: string;
  sourcePublishedAt: string | null;
  title: string;
};

type FanletterReportCoverOption = {
  candidateId: string;
  contentType: string | null;
  imageUrl: string;
  inputValue: string;
  isAuto: boolean;
  isSelected: boolean;
  placements: string[];
  source:
    | "ai"
    | "auto"
    | "content_image"
    | "frame"
    | "manual"
    | "primary"
    | "reporter_cropped";
  timestampSec: number | null;
};

type CoverOptionsResponse = {
  options: FanletterReportCoverOption[];
};

type CoverUpdateResponse = {
  report: {
    coverImageSource: FanletterNewsReportCoverImageSource;
    coverImageUrl: string | null;
    reportId: string;
  };
};

type CoverOptionsStatus = "error" | "idle" | "loading" | "ready";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        coverSource: {
          auto: "자동 커버",
          reporter_cropped: "와이드 크롭",
          reporter_selected: "직접 선택",
        },
        errorLoad: "커버 후보를 불러오지 못했습니다.",
        errorSave: "커버 이미지를 변경하지 못했습니다.",
        modalBody:
          "원본 브이로그에서 저장된 커버 후보 중 이 리포트에 사용할 대표 이미지를 바로 변경합니다.",
        modalClose: "닫기",
        modalEmpty: "변경 가능한 커버 후보가 아직 없습니다.",
        modalEyebrow: "커버 변경",
        modalLoading: "커버 후보를 불러오는 중",
        modalSaving: "저장 중",
        modalTitle: "리포트 커버 이미지 선택",
        openReport: "리포트 보기",
        optionCurrent: "현재 사용 중",
        optionUse: "이 이미지 사용",
        priceType: {
          paid: "유료",
          public: "공개",
        },
        source: "원본 브이로그",
        sourceLabels: {
          ai: "AI 생성",
          auto: "자동 추천",
          content_image: "본문 이미지",
          frame: "영상 프레임",
          manual: "직접 업로드",
          primary: "원본 대표",
          reporter_cropped: "와이드 크롭",
        },
        updateCover: "커버 변경",
      }
    : {
        coverSource: {
          auto: "Auto cover",
          reporter_cropped: "Wide crop",
          reporter_selected: "Manually selected",
        },
        errorLoad: "Could not load cover candidates.",
        errorSave: "Could not update the cover image.",
        modalBody:
          "Choose the lead image for this report directly from the saved source-vlog cover candidates.",
        modalClose: "Close",
        modalEmpty: "No alternate cover candidates are available yet.",
        modalEyebrow: "Change cover",
        modalLoading: "Loading cover candidates",
        modalSaving: "Saving",
        modalTitle: "Select report cover image",
        openReport: "Open report",
        optionCurrent: "Currently used",
        optionUse: "Use this image",
        priceType: {
          paid: "Paid",
          public: "Public",
        },
        source: "Source vlog",
        sourceLabels: {
          ai: "AI generated",
          auto: "Auto recommendation",
          content_image: "Content image",
          frame: "Video frame",
          manual: "Manual upload",
          primary: "Source lead",
          reporter_cropped: "Wide crop",
        },
        updateCover: "Change cover",
      };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatCoverOptionTimestamp(timestampSec: number | null, locale: Locale) {
  if (timestampSec === null || !Number.isFinite(timestampSec)) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor(timestampSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return locale === "ko"
    ? `${minutes}분 ${seconds.toString().padStart(2, "0")}초`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getOptionKey(option: FanletterReportCoverOption) {
  return `${option.candidateId}:${option.imageUrl}`;
}

export function FanletterReportsCoverManager({
  locale,
  reports: initialReports,
}: {
  locale: Locale;
  reports: FanletterReportsPageReport[];
}) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [reports, setReports] = useState(initialReports);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [coverOptions, setCoverOptions] = useState<FanletterReportCoverOption[]>(
    [],
  );
  const [coverOptionsStatus, setCoverOptionsStatus] =
    useState<CoverOptionsStatus>("idle");
  const [coverOptionsError, setCoverOptionsError] = useState<string | null>(null);
  const [savingOptionKey, setSavingOptionKey] = useState<string | null>(null);
  const activeReport =
    reports.find((report) => report.reportId === activeReportId) ?? null;

  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  useEffect(() => {
    if (!activeReportId) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeReportId]);

  useEffect(() => {
    if (!activeReportId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveReportId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeReportId]);

  const loadCoverOptions = useCallback(
    async (reportId: string) => {
      setCoverOptions([]);
      setCoverOptionsError(null);
      setCoverOptionsStatus("loading");

      try {
        const params = new URLSearchParams({
          reportId,
          scope: "cover-options",
        });
        const response = await fetch(
          `/api/fanletter/news-reports?${params.toString()}`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(() => null)) as
          | CoverOptionsResponse
          | { error?: string }
          | null;

        if (!response.ok || !data || !("options" in data)) {
          throw new Error(
            data && "error" in data && data.error ? data.error : copy.errorLoad,
          );
        }

        setCoverOptions(data.options);
        setCoverOptionsStatus("ready");
      } catch (error) {
        setCoverOptionsError(
          error instanceof Error ? error.message : copy.errorLoad,
        );
        setCoverOptionsStatus("error");
      }
    },
    [copy.errorLoad],
  );

  const openCoverModal = useCallback(
    (report: FanletterReportsPageReport) => {
      setActiveReportId(report.reportId);
      void loadCoverOptions(report.reportId);
    },
    [loadCoverOptions],
  );

  const updateCoverImage = useCallback(
    async (option: FanletterReportCoverOption) => {
      if (!activeReport) {
        return;
      }

      const optionKey = getOptionKey(option);
      setSavingOptionKey(optionKey);
      setCoverOptionsError(null);

      try {
        const response = await fetch("/api/fanletter/news-reports", {
          body: JSON.stringify({
            locale,
            reportId: activeReport.reportId,
            selectedCoverImageUrl: option.inputValue,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const data = (await response.json().catch(() => null)) as
          | CoverUpdateResponse
          | { error?: string }
          | null;

        if (!response.ok || !data || !("report" in data)) {
          throw new Error(
            data && "error" in data && data.error ? data.error : copy.errorSave,
          );
        }

        setReports((current) =>
          current.map((report) =>
            report.reportId === data.report.reportId
              ? {
                  ...report,
                  coverImageSource: data.report.coverImageSource,
                  coverImageUrl: data.report.coverImageUrl,
                }
              : report,
          ),
        );
        setCoverOptions((current) =>
          current.map((currentOption) => ({
            ...currentOption,
            isSelected: getOptionKey(currentOption) === optionKey,
          })),
        );
      } catch (error) {
        setCoverOptionsError(
          error instanceof Error ? error.message : copy.errorSave,
        );
      } finally {
        setSavingOptionKey(null);
      }
    },
    [activeReport, copy.errorSave, locale],
  );

  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report, index) => {
          const publishedAt = formatDate(report.sourcePublishedAt, locale);
          const shouldBypassCoverImageOptimization =
            shouldBypassFanletterImageOptimization(report.coverImageUrl);

          return (
            <article
              className="overflow-hidden border border-black/12 bg-white shadow-[0_18px_44px_rgba(17,21,16,0.07)]"
              key={report.reportId}
            >
              <Link className="group block" href={report.reportHref}>
                <div className="relative aspect-[4/5] overflow-hidden bg-[#111510] sm:aspect-[5/6]">
                  {report.coverImageUrl ? (
                    <>
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="scale-110 object-cover blur-xl brightness-[0.42] saturate-[0.9]"
                        fill
                        loading={index === 0 ? "eager" : "lazy"}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        src={report.coverImageUrl}
                        unoptimized={shouldBypassCoverImageOptimization}
                      />
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-contain transition duration-300 group-hover:scale-[1.02]"
                        fill
                        loading={index === 0 ? "eager" : "lazy"}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        src={report.coverImageUrl}
                        unoptimized={shouldBypassCoverImageOptimization}
                      />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Newspaper className="size-10 text-[#44f26e]" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 inline-flex border border-white/18 bg-black/44 px-2.5 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.12em] text-white/78 backdrop-blur">
                    {copy.coverSource[report.coverImageSource]}
                  </div>
                </div>
              </Link>
              <div className="p-4">
                <div className="flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.1em] text-black/42">
                  {publishedAt ? <span>{publishedAt}</span> : null}
                  <span>
                    {report.priceType === "paid"
                      ? copy.priceType.paid
                      : copy.priceType.public}
                  </span>
                </div>
                <h2 className="mt-2 line-clamp-2 break-words text-xl font-black leading-tight [word-break:keep-all]">
                  {report.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-black/58">
                  {report.dek}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-black"
                    href={report.reportHref}
                  >
                    {copy.openReport}
                    <ArrowRight className="size-4 text-[#44f26e]" />
                  </Link>
                  <button
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-4 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    onClick={() => openCoverModal(report)}
                    type="button"
                  >
                    <ImageIcon className="size-4 text-[#16702e]" />
                    {copy.updateCover}
                  </button>
                </div>
                <Link
                  className="mt-3 inline-flex min-w-0 items-center gap-2 text-xs font-bold !text-black/48 transition hover:!text-[#16702e]"
                  href={report.sourceHref}
                >
                  <Clapperboard className="size-3.5 shrink-0" />
                  <span className="truncate">{copy.source}</span>
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      {activeReport ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/66 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6">
          <div
            aria-labelledby="fanletter-report-cover-modal-title"
            aria-modal="true"
            className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden rounded-lg border border-white/12 bg-[#f5f6f1] text-[#111510] shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
                  <ImageIcon className="size-4" />
                  {copy.modalEyebrow}
                </p>
                <h2
                  className="mt-2 break-words text-2xl font-black leading-tight tracking-normal [word-break:keep-all]"
                  id="fanletter-report-cover-modal-title"
                >
                  {copy.modalTitle}
                </h2>
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm font-medium leading-6 text-black/58">
                  {activeReport.title}
                </p>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-black/54">
                  {copy.modalBody}
                </p>
              </div>
              <button
                aria-label={copy.modalClose}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-black/12 bg-[#f5f6f1] text-black/56 transition hover:border-black/24 hover:bg-white hover:text-black"
                onClick={() => setActiveReportId(null)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-4 py-4 sm:px-5">
              {coverOptionsError ? (
                <p className="mb-4 rounded-lg border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm font-bold leading-5 text-rose-700">
                  {coverOptionsError}
                </p>
              ) : null}

              {coverOptionsStatus === "loading" ? (
                <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-black/14 bg-white">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-black/46">
                    <Loader2 className="size-4 animate-spin text-[#16702e]" />
                    {copy.modalLoading}
                  </span>
                </div>
              ) : coverOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/14 bg-white px-4 py-10 text-center">
                  <ImageIcon className="mx-auto size-9 text-[#16702e]" />
                  <p className="mx-auto mt-3 max-w-sm text-sm font-bold leading-6 text-black/48">
                    {copy.modalEmpty}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {coverOptions.map((option, index) => {
                    const optionKey = getOptionKey(option);
                    const isSaving = savingOptionKey === optionKey;
                    const timestamp = formatCoverOptionTimestamp(
                      option.timestampSec,
                      locale,
                    );
                    const shouldBypassOptionImageOptimization =
                      shouldBypassFanletterImageOptimization(option.imageUrl);

                    return (
                      <button
                        className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border text-left transition ${
                          option.isSelected
                            ? "border-[#19b84b] bg-[#ecfff0] shadow-[0_12px_30px_rgba(25,184,75,0.14)]"
                            : "border-black/10 bg-white hover:border-[#19b84b] hover:bg-white"
                        } disabled:cursor-not-allowed disabled:opacity-72`}
                        disabled={option.isSelected || Boolean(savingOptionKey)}
                        key={optionKey}
                        onClick={() => {
                          void updateCoverImage(option);
                        }}
                        type="button"
                      >
                        <span className="relative block aspect-[4/5] w-full overflow-hidden bg-[#111510] sm:aspect-[5/6]">
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="scale-110 object-cover blur-xl brightness-[0.42] saturate-[0.9]"
                            fill
                            loading={index === 0 ? "eager" : "lazy"}
                            sizes="(max-width: 640px) 100vw, 280px"
                            src={option.imageUrl}
                            unoptimized={shouldBypassOptionImageOptimization}
                          />
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="object-contain transition duration-300 group-hover:scale-[1.02]"
                            fill
                            loading={index === 0 ? "eager" : "lazy"}
                            sizes="(max-width: 640px) 100vw, 280px"
                            src={option.imageUrl}
                            unoptimized={shouldBypassOptionImageOptimization}
                          />
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 border border-white/18 bg-black/46 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-white/78 backdrop-blur">
                            {option.isSelected ? (
                              <CheckCircle2 className="size-3.5 text-[#44f26e]" />
                            ) : isSaving ? (
                              <Loader2 className="size-3.5 animate-spin text-[#44f26e]" />
                            ) : (
                              <RotateCcw className="size-3.5 text-[#44f26e]" />
                            )}
                            {copy.sourceLabels[option.source]}
                          </span>
                        </span>
                        <span className="flex min-h-[5.4rem] w-full flex-col p-3">
                          <span className="line-clamp-1 text-sm font-black text-[#111510]">
                            {isSaving
                              ? copy.modalSaving
                              : option.isSelected
                                ? copy.optionCurrent
                                : copy.optionUse}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[0.68rem] font-bold text-black/46">
                            {timestamp ? <span>{timestamp}</span> : null}
                            {option.contentType ? (
                              <span>{option.contentType}</span>
                            ) : null}
                            {option.placements.length > 0 ? (
                              <span>{option.placements.join(", ")}</span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
