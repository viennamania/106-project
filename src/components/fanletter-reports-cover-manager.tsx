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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { FanletterNewsReportCoverImageSource } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export type FanletterReportsPageReport = {
  contentId: string;
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

type ReportCoverCropState = {
  centerX: number;
  centerY: number;
  zoom: number;
};

type ReportCoverNaturalSize = {
  height: number;
  width: number;
};

type ReportCoverCropRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type ReportCoverCropPayload = {
  aspectRatio: number;
  height: number;
  outputHeight: number;
  outputWidth: number;
  sourceImageUrl: string;
  width: number;
  x: number;
  y: number;
};

type FanletterCroppedCoverUploadResponse = {
  contentType: string;
  pathname: string;
  sourceImageUrl: string;
  url: string;
};

const REPORT_COVER_CROP_ASPECT_RATIO = 16 / 9;
const REPORT_COVER_CROP_MAX_ZOOM = 3;
const REPORT_COVER_CROP_OUTPUT_HEIGHT = 675;
const REPORT_COVER_CROP_OUTPUT_WIDTH = 1200;
const DEFAULT_REPORT_COVER_CROP: ReportCoverCropState = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        coverSource: {
          auto: "자동 커버",
          reporter_cropped: "와이드 크롭",
          reporter_selected: "직접 선택",
        },
        cropFailed: "와이드 커버를 저장하지 못했습니다.",
        cropHelper: "대표 커버를 뉴스 홈과 공유 카드에 맞는 16:9 비율로 저장합니다.",
        cropLabel: "와이드 크롭",
        cropOriginal: "선택한 원본 그대로 사용",
        cropReset: "초기화",
        cropSave: "크롭 저장",
        cropSaving: "크롭 저장 중",
        cropUnavailable: "이 커버는 다시 크롭할 수 있는 원본 후보가 없습니다.",
        cropZoom: "확대",
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
        optionSelected: "편집 중",
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
        cropFailed: "Could not save the wide cover.",
        cropHelper:
          "Save the lead cover in a 16:9 crop for news home and shared cards.",
        cropLabel: "Wide crop",
        cropOriginal: "Use selected original",
        cropReset: "Reset",
        cropSave: "Save crop",
        cropSaving: "Saving crop",
        cropUnavailable: "This cover does not have an original candidate to crop.",
        cropZoom: "Zoom",
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
        optionSelected: "Editing",
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

function getCroppableCoverSourceUrl(option: FanletterReportCoverOption | null) {
  if (!option || option.source === "reporter_cropped") {
    return null;
  }

  return (option.inputValue || option.imageUrl).trim() || null;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getReportCoverCropRect({
  crop,
  naturalSize,
}: {
  crop: ReportCoverCropState;
  naturalSize: ReportCoverNaturalSize | null;
}): ReportCoverCropRect | null {
  if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
    return null;
  }

  const sourceAspectRatio = naturalSize.width / naturalSize.height;
  const baseWidth =
    sourceAspectRatio >= REPORT_COVER_CROP_ASPECT_RATIO
      ? naturalSize.height * REPORT_COVER_CROP_ASPECT_RATIO
      : naturalSize.width;
  const baseHeight = baseWidth / REPORT_COVER_CROP_ASPECT_RATIO;
  const zoom = clampNumber(crop.zoom, 1, REPORT_COVER_CROP_MAX_ZOOM);
  const width = baseWidth / zoom;
  const height = baseHeight / zoom;
  const minCenterX = width / (2 * naturalSize.width);
  const maxCenterX = 1 - minCenterX;
  const minCenterY = height / (2 * naturalSize.height);
  const maxCenterY = 1 - minCenterY;
  const centerX = clampNumber(crop.centerX, minCenterX, maxCenterX);
  const centerY = clampNumber(crop.centerY, minCenterY, maxCenterY);

  return {
    height,
    width,
    x: centerX * naturalSize.width - width / 2,
    y: centerY * naturalSize.height - height / 2,
  };
}

function getReportCoverPreviewImageStyle({
  cropRect,
  naturalSize,
}: {
  cropRect: ReportCoverCropRect;
  naturalSize: ReportCoverNaturalSize;
}) {
  return {
    height: `${(naturalSize.height / cropRect.height) * 100}%`,
    left: `${-(cropRect.x / cropRect.width) * 100}%`,
    top: `${-(cropRect.y / cropRect.height) * 100}%`,
    width: `${(naturalSize.width / cropRect.width) * 100}%`,
  };
}

function loadImageForCrop(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Could not load the selected cover image."));
    };
    image.src = src;
  });
}

async function createCroppedReportCoverBlob({
  crop,
  sourceImageUrl,
}: {
  crop: ReportCoverCropState;
  sourceImageUrl: string;
}) {
  const image = await loadImageForCrop(sourceImageUrl);
  const naturalSize = {
    height: image.naturalHeight,
    width: image.naturalWidth,
  };
  const cropRect = getReportCoverCropRect({ crop, naturalSize });

  if (!cropRect) {
    throw new Error("Could not read the selected cover image size.");
  }

  const canvas = document.createElement("canvas");
  canvas.height = REPORT_COVER_CROP_OUTPUT_HEIGHT;
  canvas.width = REPORT_COVER_CROP_OUTPUT_WIDTH;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the cover crop.");
  }

  context.drawImage(
    image,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    REPORT_COVER_CROP_OUTPUT_WIDTH,
    REPORT_COVER_CROP_OUTPUT_HEIGHT,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });

  if (!blob) {
    throw new Error("Could not encode the wide cover image.");
  }

  return {
    blob,
    cropRect,
  };
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
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
  const [coverCrop, setCoverCrop] = useState<ReportCoverCropState>(
    DEFAULT_REPORT_COVER_CROP,
  );
  const [coverCropError, setCoverCropError] = useState<string | null>(null);
  const [coverNaturalSize, setCoverNaturalSize] =
    useState<ReportCoverNaturalSize | null>(null);
  const coverCropFrameRef = useRef<HTMLDivElement | null>(null);
  const coverCropDragRef = useRef<{
    initialCrop: ReportCoverCropState;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const activeReport =
    reports.find((report) => report.reportId === activeReportId) ?? null;
  const selectedOption = useMemo(() => {
    if (coverOptions.length === 0) {
      return null;
    }

    return (
      coverOptions.find((option) => getOptionKey(option) === selectedOptionKey) ??
      coverOptions.find((option) => option.isSelected) ??
      coverOptions[0] ??
      null
    );
  }, [coverOptions, selectedOptionKey]);
  const selectedOptionSourceImageUrl = useMemo(
    () => getCroppableCoverSourceUrl(selectedOption),
    [selectedOption],
  );
  const coverCropRect = useMemo(
    () =>
      getReportCoverCropRect({
        crop: coverCrop,
        naturalSize: coverNaturalSize,
      }),
    [coverCrop, coverNaturalSize],
  );
  const coverPreviewImageStyle =
    coverCropRect && coverNaturalSize
      ? getReportCoverPreviewImageStyle({
          cropRect: coverCropRect,
          naturalSize: coverNaturalSize,
        })
      : null;

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

        const nextSelectedOption =
          data.options.find((option) => option.isSelected) ??
          data.options[0] ??
          null;

        setCoverOptions(data.options);
        setSelectedOptionKey(
          nextSelectedOption ? getOptionKey(nextSelectedOption) : null,
        );
        setCoverCrop(DEFAULT_REPORT_COVER_CROP);
        setCoverCropError(null);
        setCoverNaturalSize(null);
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
      setSelectedOptionKey(null);
      setCoverCrop(DEFAULT_REPORT_COVER_CROP);
      setCoverCropError(null);
      setCoverNaturalSize(null);
      void loadCoverOptions(report.reportId);
    },
    [loadCoverOptions],
  );

  useEffect(() => {
    setCoverCrop(DEFAULT_REPORT_COVER_CROP);
    setCoverCropError(null);
    setCoverNaturalSize(null);
  }, [selectedOptionKey]);

  const saveCoverImageSelection = useCallback(
    async ({
      croppedCoverCrop = null,
      croppedCoverImageUrl = null,
      croppedCoverSourceImageUrl = null,
      savingKey,
      selectedCoverImageUrl,
    }: {
      croppedCoverCrop?: ReportCoverCropPayload | null;
      croppedCoverImageUrl?: string | null;
      croppedCoverSourceImageUrl?: string | null;
      savingKey: string;
      selectedCoverImageUrl: string;
    }) => {
      if (!activeReport) {
        return;
      }

      setSavingOptionKey(savingKey);
      setCoverOptionsError(null);

      try {
        const response = await fetch("/api/fanletter/news-reports", {
          body: JSON.stringify({
            croppedCoverCrop,
            croppedCoverImageUrl,
            croppedCoverSourceImageUrl,
            locale,
            reportId: activeReport.reportId,
            selectedCoverImageUrl,
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
        await loadCoverOptions(data.report.reportId);
      } catch (error) {
        setCoverOptionsError(
          error instanceof Error ? error.message : copy.errorSave,
        );
      } finally {
        setSavingOptionKey(null);
      }
    },
    [activeReport, copy.errorSave, loadCoverOptions, locale],
  );

  const updateCoverImage = useCallback(
    async (option: FanletterReportCoverOption) => {
      await saveCoverImageSelection({
        savingKey: getOptionKey(option),
        selectedCoverImageUrl: option.inputValue,
      });
    },
    [saveCoverImageSelection],
  );

  const uploadCroppedCover = useCallback(
    async ({
      report,
      sourceImageUrl,
    }: {
      report: FanletterReportsPageReport;
      sourceImageUrl: string;
    }) => {
      const { blob, cropRect } = await createCroppedReportCoverBlob({
        crop: coverCrop,
        sourceImageUrl,
      });
      const file = new File([blob], `fanletter-news-cover-${report.contentId}.jpg`, {
        type: "image/jpeg",
      });
      const formData = new FormData();

      formData.set("contentId", report.contentId);
      formData.set("file", file);
      formData.set("sourceImageUrl", sourceImageUrl);

      const response = await fetch("/api/fanletter/news-reports/cropped-cover", {
        body: formData,
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | FanletterCroppedCoverUploadResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("url" in data)) {
        throw new Error(
          data && "error" in data && data.error ? data.error : copy.cropFailed,
        );
      }

      return {
        crop: {
          aspectRatio: REPORT_COVER_CROP_ASPECT_RATIO,
          height: cropRect.height,
          outputHeight: REPORT_COVER_CROP_OUTPUT_HEIGHT,
          outputWidth: REPORT_COVER_CROP_OUTPUT_WIDTH,
          sourceImageUrl,
          width: cropRect.width,
          x: cropRect.x,
          y: cropRect.y,
        },
        url: data.url,
      };
    },
    [copy.cropFailed, coverCrop],
  );

  const updateCroppedCoverImage = useCallback(async () => {
    if (!activeReport || !selectedOption || !selectedOptionSourceImageUrl) {
      return;
    }

    const savingKey = `crop:${getOptionKey(selectedOption)}`;

    setSavingOptionKey(savingKey);
    setCoverOptionsError(null);
    setCoverCropError(null);

    try {
      const croppedCover = await uploadCroppedCover({
        report: activeReport,
        sourceImageUrl: selectedOptionSourceImageUrl,
      });

      await saveCoverImageSelection({
        croppedCoverCrop: croppedCover.crop,
        croppedCoverImageUrl: croppedCover.url,
        croppedCoverSourceImageUrl: selectedOptionSourceImageUrl,
        savingKey,
        selectedCoverImageUrl: selectedOptionSourceImageUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.cropFailed;

      setCoverCropError(message);
      setCoverOptionsError(message);
      setSavingOptionKey(null);
    }
  }, [
    activeReport,
    copy.cropFailed,
    saveCoverImageSelection,
    selectedOption,
    selectedOptionSourceImageUrl,
    uploadCroppedCover,
  ]);

  const handleCoverCropPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!coverCropRect || !coverNaturalSize) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      coverCropDragRef.current = {
        initialCrop: coverCrop,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [coverCrop, coverCropRect, coverNaturalSize],
  );

  const handleCoverCropPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = coverCropDragRef.current;
      const frame = coverCropFrameRef.current;

      if (
        !drag ||
        drag.pointerId !== event.pointerId ||
        !frame ||
        !coverCropRect ||
        !coverNaturalSize
      ) {
        return;
      }

      const frameRect = frame.getBoundingClientRect();

      if (frameRect.width <= 0 || frameRect.height <= 0) {
        return;
      }

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const cropDeltaX =
        (deltaX / frameRect.width) *
        (coverCropRect.width / coverNaturalSize.width);
      const cropDeltaY =
        (deltaY / frameRect.height) *
        (coverCropRect.height / coverNaturalSize.height);

      setCoverCrop((current) => ({
        ...current,
        centerX: drag.initialCrop.centerX - cropDeltaX,
        centerY: drag.initialCrop.centerY - cropDeltaY,
      }));
    },
    [coverCropRect, coverNaturalSize],
  );

  const handleCoverCropPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (coverCropDragRef.current?.pointerId === event.pointerId) {
        coverCropDragRef.current = null;
      }
    },
    [],
  );
  const selectedOptionActionKey = selectedOption
    ? getOptionKey(selectedOption)
    : null;
  const isSavingSelectedOriginal = Boolean(
    selectedOptionActionKey && savingOptionKey === selectedOptionActionKey,
  );
  const isSavingSelectedCrop = Boolean(
    selectedOptionActionKey &&
      savingOptionKey === `crop:${selectedOptionActionKey}`,
  );
  const canUseSelectedOriginal = Boolean(
    selectedOption &&
      selectedOption.source !== "reporter_cropped" &&
      !selectedOption.isSelected &&
      !savingOptionKey,
  );
  const canSaveSelectedCrop = Boolean(
    selectedOption && selectedOptionSourceImageUrl && !savingOptionKey,
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
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {coverOptions.map((option, index) => {
                      const optionKey = getOptionKey(option);
                      const isEditing =
                        selectedOptionKey === optionKey ||
                        (!selectedOptionKey && option.isSelected);
                      const isSaving =
                        savingOptionKey === optionKey ||
                        savingOptionKey === `crop:${optionKey}`;
                      const timestamp = formatCoverOptionTimestamp(
                        option.timestampSec,
                        locale,
                      );
                      const shouldBypassOptionImageOptimization =
                        shouldBypassFanletterImageOptimization(option.imageUrl);

                      return (
                        <button
                          className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border text-left transition ${
                            isEditing
                              ? "border-[#19b84b] bg-[#ecfff0] shadow-[0_12px_30px_rgba(25,184,75,0.14)]"
                              : "border-black/10 bg-white hover:border-[#19b84b] hover:bg-white"
                          } disabled:cursor-not-allowed disabled:opacity-72`}
                          disabled={Boolean(savingOptionKey)}
                          key={optionKey}
                          onClick={() => {
                            setSelectedOptionKey(optionKey);
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
                                ? optionKey === savingOptionKey
                                  ? copy.modalSaving
                                  : copy.cropSaving
                                : option.isSelected
                                  ? copy.optionCurrent
                                  : isEditing
                                    ? copy.optionSelected
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

                  {selectedOption ? (
                    <div className="mt-4 rounded-lg border border-black/10 bg-white p-3 sm:p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#111510]">
                            {copy.cropLabel}
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-black/48">
                            {copy.cropHelper}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                          <button
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-black/12 px-3 text-xs font-black text-black/62 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:text-[#111510] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canUseSelectedOriginal}
                            onClick={() => {
                              void updateCoverImage(selectedOption);
                            }}
                            type="button"
                          >
                            {isSavingSelectedOriginal ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                            {isSavingSelectedOriginal
                              ? copy.modalSaving
                              : copy.cropOriginal}
                          </button>
                          <button
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#111510] px-3 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canSaveSelectedCrop}
                            onClick={() => {
                              void updateCroppedCoverImage();
                            }}
                            type="button"
                          >
                            {isSavingSelectedCrop ? (
                              <Loader2 className="size-4 animate-spin text-[#44f26e]" />
                            ) : (
                              <ImageIcon className="size-4 text-[#44f26e]" />
                            )}
                            {isSavingSelectedCrop
                              ? copy.cropSaving
                              : copy.cropSave}
                          </button>
                        </div>
                      </div>

                      {selectedOptionSourceImageUrl ? (
                        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
                          <div
                            className="relative aspect-video min-h-[12rem] cursor-grab touch-none overflow-hidden rounded-lg border border-black/10 bg-[#111510] active:cursor-grabbing"
                            onPointerCancel={handleCoverCropPointerEnd}
                            onPointerDown={handleCoverCropPointerDown}
                            onPointerMove={handleCoverCropPointerMove}
                            onPointerUp={handleCoverCropPointerEnd}
                            ref={coverCropFrameRef}
                          >
                            {/* The crop editor needs a raw image element so canvas export uses the selected source URL. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt=""
                              aria-hidden="true"
                              className="absolute max-w-none select-none object-cover"
                              crossOrigin="anonymous"
                              draggable={false}
                              onLoad={(event) => {
                                const image = event.currentTarget;

                                if (image.naturalWidth && image.naturalHeight) {
                                  setCoverNaturalSize({
                                    height: image.naturalHeight,
                                    width: image.naturalWidth,
                                  });
                                }
                              }}
                              src={selectedOptionSourceImageUrl}
                              style={
                                coverPreviewImageStyle ?? {
                                  height: "100%",
                                  left: 0,
                                  top: 0,
                                  width: "100%",
                                }
                              }
                            />
                            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/28" />
                            <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/18" />
                            <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/18" />
                            <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/18" />
                            <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/18" />
                          </div>

                          <div className="rounded-lg border border-black/10 bg-[#f5f6f1] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-black text-black/56">
                                {copy.cropZoom}
                              </span>
                              <span className="text-xs font-black text-[#16702e]">
                                {coverCrop.zoom.toFixed(2)}x
                              </span>
                            </div>
                            <input
                              aria-label={copy.cropZoom}
                              className="mt-3 w-full accent-[#19b84b]"
                              max={REPORT_COVER_CROP_MAX_ZOOM}
                              min={1}
                              onChange={(event) => {
                                setCoverCrop((current) => ({
                                  ...current,
                                  zoom: Number(event.target.value),
                                }));
                              }}
                              step={0.01}
                              type="range"
                              value={coverCrop.zoom}
                            />
                            <button
                              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-black/12 text-xs font-black text-black/56 transition hover:border-[#19b84b] hover:bg-white hover:text-[#111510]"
                              onClick={() => {
                                setCoverCrop(DEFAULT_REPORT_COVER_CROP);
                              }}
                              type="button"
                            >
                              <RotateCcw className="size-3.5" />
                              {copy.cropReset}
                            </button>
                            {coverCropError ? (
                              <p className="mt-3 text-xs font-bold leading-5 text-rose-700">
                                {coverCropError}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg border border-black/10 bg-[#f5f6f1] px-3 py-2 text-xs font-bold leading-5 text-black/46">
                          {copy.cropUnavailable}
                        </p>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
