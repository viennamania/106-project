"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Edit3,
  ExternalLink,
  ImageIcon,
  Loader2,
  Newspaper,
  RotateCcw,
  ShieldAlert,
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
import type {
  ContentMaturityRating,
  FanletterNewsReportCoverImageSource,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export type FanletterReportsPageReport = {
  contentId: string;
  contentMaturityRating: ContentMaturityRating;
  creatorName: string;
  coverImageSource: FanletterNewsReportCoverImageSource;
  coverImageUrl: string | null;
  dek: string;
  editHref: string;
  incentiveRewardPoints: number;
  paidUnlockPurchaseCount: number;
  paidUnlockRevenueUsdt: number;
  priceType: "free" | "paid";
  reportHref: string;
  reportId: string;
  sourceHref: string;
  sourceRevealUnlockContributionCount: number;
  sourceRevealVoteCount: number;
  sourcePublishedAt: string | null;
  teaserImageUrls: string[];
  sourceTitle: string;
  title: string;
  updatedAt: string;
};

type FanletterReportCoverOption = {
  candidateId: string;
  contentType: string | null;
  height: number | null;
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
  width: number | null;
};

type CoverOptionsResponse = {
  options: FanletterReportCoverOption[];
  teaserImageUrls: string[];
};

type CoverUpdateResponse = {
  report: {
    coverImageSource: FanletterNewsReportCoverImageSource;
    coverImageUrl: string | null;
    reportId: string;
    teaserImageUrls: string[];
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
const REPORT_TEASER_IMAGE_LIMIT = 4;
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
        modalEyebrow: "커버/티저 변경",
        modalLoading: "커버 후보를 불러오는 중",
        modalSaving: "저장 중",
        modalTitle: "리포트 커버와 공개 티저 컷 선택",
        maturityRating: {
          general: "일반",
          nsfw: "NSFW",
        },
        openReport: "리포트 보기",
        optionCurrent: "현재 사용 중",
        optionSelected: "편집 중",
        optionUse: "이 이미지 사용",
        performance: {
          incentive: "성과",
          paidPurchases: "구매 기여",
          rewardPoints: "보상",
          revenueShare: "기여 매출",
          sourceRevealVotes: "보고싶어요",
          unlockContributions: "언락",
        },
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
        teaserBody:
          "뉴스 상세에서 원본 브이로그가 열리기 전 독자에게 먼저 보여줄 공개 컷입니다.",
        teaserInclude: "공개 컷에 추가",
        teaserIncluded: "공개 컷 포함",
        teaserLimit: (count: string) => `최대 ${count}장`,
        teaserSave: "티저 컷 저장",
        teaserSaving: "티저 저장 중",
        teaserTitle: "리포트 티저 이미지",
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
        modalEyebrow: "Change cover/teasers",
        modalLoading: "Loading cover candidates",
        modalSaving: "Saving",
        modalTitle: "Select report cover and public teaser cuts",
        maturityRating: {
          general: "General",
          nsfw: "NSFW",
        },
        openReport: "Open report",
        optionCurrent: "Currently used",
        optionSelected: "Editing",
        optionUse: "Use this image",
        performance: {
          incentive: "Performance",
          paidPurchases: "Purchases",
          rewardPoints: "Rewards",
          revenueShare: "Revenue basis",
          sourceRevealVotes: "Votes",
          unlockContributions: "Unlocks",
        },
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
        teaserBody:
          "Public cuts readers see before the source vlog opens in the news detail.",
        teaserInclude: "Add public cut",
        teaserIncluded: "Public cut",
        teaserLimit: (count: string) => `Up to ${count}`,
        teaserSave: "Save teaser cuts",
        teaserSaving: "Saving teasers",
        teaserTitle: "Report teaser images",
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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatUsdt(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value > 0 && value < 1 ? 2 : 0,
  }).format(value)} USDT`;
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

function normalizeSelectedTeaserImageUrls({
  imageUrls,
  options,
}: {
  imageUrls: readonly string[];
  options: readonly FanletterReportCoverOption[];
}) {
  const allowedImageUrls = new Set(
    options.map((option) => option.imageUrl.trim()).filter(Boolean),
  );

  return [
    ...new Set(imageUrls.map((url) => url.trim()).filter(Boolean)),
  ]
    .filter((url) => allowedImageUrls.has(url))
    .slice(0, REPORT_TEASER_IMAGE_LIMIT);
}

function getDefaultReportTeaserImageUrls(
  options: readonly FanletterReportCoverOption[],
) {
  return [
    ...new Set(options.map((option) => option.imageUrl.trim()).filter(Boolean)),
  ].slice(0, Math.min(3, REPORT_TEASER_IMAGE_LIMIT));
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
  copy: pageCopy,
  locale,
  reports: initialReports,
}: {
  copy?: {
    coverImage: string;
    editReport: string;
    incentive: string;
    paidPurchases: string;
    openReport: string;
    reportTitle: string;
    rewardPoints: string;
    revenueShare: string;
    source: string;
    sourceRevealVotes: string;
    unlockContributions: string;
    updateCover: string;
    updatedAt: string;
  };
  locale: Locale;
  reports: FanletterReportsPageReport[];
}) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const listCopy = {
    coverImage: pageCopy?.coverImage ?? (locale === "ko" ? "커버" : "Cover"),
    editReport: pageCopy?.editReport ?? (locale === "ko" ? "내용 수정" : "Edit"),
    incentive: pageCopy?.incentive ?? copy.performance.incentive,
    paidPurchases: pageCopy?.paidPurchases ?? copy.performance.paidPurchases,
    openReport: pageCopy?.openReport ?? copy.openReport,
    reportTitle: pageCopy?.reportTitle ?? (locale === "ko" ? "리포트" : "Report"),
    rewardPoints: pageCopy?.rewardPoints ?? copy.performance.rewardPoints,
    revenueShare: pageCopy?.revenueShare ?? copy.performance.revenueShare,
    source: pageCopy?.source ?? copy.source,
    sourceRevealVotes:
      pageCopy?.sourceRevealVotes ?? copy.performance.sourceRevealVotes,
    unlockContributions:
      pageCopy?.unlockContributions ?? copy.performance.unlockContributions,
    updateCover: pageCopy?.updateCover ?? copy.updateCover,
    updatedAt: pageCopy?.updatedAt ?? (locale === "ko" ? "최근 수정" : "Updated"),
  };
  const [reports, setReports] = useState(initialReports);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [coverOptions, setCoverOptions] = useState<FanletterReportCoverOption[]>(
    [],
  );
  const [coverOptionsStatus, setCoverOptionsStatus] =
    useState<CoverOptionsStatus>("idle");
  const [coverOptionsError, setCoverOptionsError] = useState<string | null>(null);
  const [savingOptionKey, setSavingOptionKey] = useState<string | null>(null);
  const [savingTeaserImages, setSavingTeaserImages] = useState(false);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
  const [selectedTeaserUrls, setSelectedTeaserUrls] = useState<string[]>([]);
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
  const activeReportTeaserUrls = useMemo(
    () =>
      normalizeSelectedTeaserImageUrls({
        imageUrls: activeReport?.teaserImageUrls ?? [],
        options: coverOptions,
      }),
    [activeReport?.teaserImageUrls, coverOptions],
  );
  const selectedTeaserUrlSet = useMemo(
    () => new Set(selectedTeaserUrls),
    [selectedTeaserUrls],
  );
  const teaserSelectionChanged =
    selectedTeaserUrls.length !== activeReportTeaserUrls.length ||
    selectedTeaserUrls.some((url, index) => activeReportTeaserUrls[index] !== url);

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
        const nextTeaserImageUrls = normalizeSelectedTeaserImageUrls({
          imageUrls: data.teaserImageUrls ?? [],
          options: data.options,
        });

        setCoverOptions(data.options);
        setSelectedTeaserUrls(
          nextTeaserImageUrls.length > 0
            ? nextTeaserImageUrls
            : getDefaultReportTeaserImageUrls(data.options),
        );
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
      setSelectedTeaserUrls([]);
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
            selectedTeaserImageUrls: selectedTeaserUrls,
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
                  teaserImageUrls: data.report.teaserImageUrls,
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
    [activeReport, copy.errorSave, loadCoverOptions, locale, selectedTeaserUrls],
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

  const toggleTeaserImage = useCallback((imageUrl: string) => {
    setSelectedTeaserUrls((current) => {
      if (current.includes(imageUrl)) {
        return current.filter((url) => url !== imageUrl);
      }

      if (current.length >= REPORT_TEASER_IMAGE_LIMIT) {
        return current;
      }

      return [...current, imageUrl];
    });
  }, []);

  const saveTeaserImageSelection = useCallback(async () => {
    if (!activeReport || savingOptionKey || savingTeaserImages) {
      return;
    }

    setSavingTeaserImages(true);
    setCoverOptionsError(null);

    try {
      const response = await fetch("/api/fanletter/news-reports", {
        body: JSON.stringify({
          locale,
          reportId: activeReport.reportId,
          selectedTeaserImageUrls: selectedTeaserUrls,
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
                teaserImageUrls: data.report.teaserImageUrls,
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
      setSavingTeaserImages(false);
    }
  }, [
    activeReport,
    copy.errorSave,
    loadCoverOptions,
    locale,
    savingOptionKey,
    savingTeaserImages,
    selectedTeaserUrls,
  ]);

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
      !savingOptionKey &&
      !savingTeaserImages,
  );
  const canSaveSelectedCrop = Boolean(
    selectedOption &&
      selectedOptionSourceImageUrl &&
      !savingOptionKey &&
      !savingTeaserImages,
  );
  const canSaveTeaserImages = Boolean(
    activeReport &&
      coverOptions.length > 0 &&
      teaserSelectionChanged &&
      !savingOptionKey &&
      !savingTeaserImages,
  );

  return (
    <>
      <section className="mt-6">
        <div className="hidden overflow-hidden border border-black/12 bg-white shadow-[0_18px_44px_rgba(17,21,16,0.07)] xl:block">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="border-b border-black/12 bg-[#f6f8f4] text-[0.68rem] font-black uppercase tracking-[0.12em] text-black/46">
              <tr>
                <th className="w-28 px-4 py-3">{listCopy.coverImage}</th>
                <th className="px-4 py-3">{listCopy.reportTitle}</th>
                <th className="w-48 px-3 py-3">{listCopy.source}</th>
                <th className="w-60 px-3 py-3">{listCopy.incentive}</th>
                <th className="w-32 px-3 py-3">{listCopy.updatedAt}</th>
                <th className="w-44 px-3 py-3 text-right">{copy.modalEyebrow}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {reports.map((report, index) => {
                const updatedAt = formatDate(report.updatedAt, locale);
                const shouldBypassCoverImageOptimization =
                  shouldBypassFanletterImageOptimization(report.coverImageUrl);

                return (
                  <tr
                    className="align-middle transition hover:bg-[#fbfcf8]"
                    key={report.reportId}
                  >
                    <td className="px-4 py-4">
                      <Link
                        className="group relative block aspect-[16/10] w-24 overflow-hidden rounded-lg bg-[#111510]"
                        href={report.reportHref}
                      >
                        {report.coverImageUrl ? (
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="object-cover transition duration-300 group-hover:scale-[1.04]"
                            fill
                            loading={index === 0 ? "eager" : "lazy"}
                            sizes="96px"
                            src={report.coverImageUrl}
                            unoptimized={shouldBypassCoverImageOptimization}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Newspaper className="size-6 text-[#44f26e]" />
                          </div>
                        )}
                        {report.contentMaturityRating === "nsfw" ? (
                          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/72 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-white backdrop-blur">
                            <ShieldAlert className="size-3 text-[#ff6b7d]" />
                            {copy.maturityRating.nsfw}
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="max-w-[28rem] px-4 py-4">
                      <div className="flex flex-wrap gap-2 text-[0.66rem] font-black uppercase tracking-[0.1em] text-black/42">
                        <span>
                          {report.priceType === "paid"
                            ? copy.priceType.paid
                            : copy.priceType.public}
                        </span>
                        <span
                          className={
                            report.contentMaturityRating === "nsfw"
                              ? "text-rose-600"
                              : undefined
                          }
                        >
                          {copy.maturityRating[report.contentMaturityRating]}
                        </span>
                        <span>{copy.coverSource[report.coverImageSource]}</span>
                      </div>
                      <Link
                        className="mt-1 line-clamp-2 break-words text-base font-black leading-6 !text-[#111510] transition hover:!text-[#16702e] [word-break:keep-all]"
                        href={report.editHref}
                      >
                        {report.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-black/56">
                        {report.dek}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        className="inline-flex min-w-0 items-start gap-2 text-sm font-bold leading-5 !text-black/58 transition hover:!text-[#16702e]"
                        href={report.sourceHref}
                      >
                        <Clapperboard className="mt-0.5 size-4 shrink-0 text-[#16702e]" />
                        <span className="line-clamp-2">{report.sourceTitle}</span>
                      </Link>
                      <p className="mt-1 truncate text-xs font-black uppercase tracking-[0.1em] text-black/36">
                        {report.creatorName}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-2 py-2">
                          <p className="text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/36">
                            {listCopy.sourceRevealVotes}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#111510]">
                            {formatNumber(report.sourceRevealVoteCount, locale)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-2 py-2">
                          <p className="text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/36">
                            {listCopy.unlockContributions}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#111510]">
                            {formatNumber(
                              report.sourceRevealUnlockContributionCount,
                              locale,
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-black/8 bg-[#f6f8f4] px-2 py-2">
                          <p className="text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/36">
                            {listCopy.paidPurchases}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#111510]">
                            {formatNumber(report.paidUnlockPurchaseCount, locale)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#19b84b]/18 bg-[#ecfff0] px-2 py-2">
                          <p className="text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#16702e]/70">
                            {listCopy.revenueShare}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#16702e]">
                            {formatUsdt(report.paidUnlockRevenueUsdt, locale)}
                          </p>
                        </div>
                        <div className="col-span-2 rounded-lg border border-[#19b84b]/18 bg-[#ecfff0] px-2 py-2">
                          <p className="text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#16702e]/70">
                            {listCopy.rewardPoints}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#16702e]">
                            {formatNumber(report.incentiveRewardPoints, locale)}P
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm font-black text-black/58">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4 text-[#16702e]" />
                        {updatedAt}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-1.5">
                        <Link
                          className="inline-flex size-10 items-center justify-center rounded-full border border-black/12 bg-white text-black/58 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:text-[#111510]"
                          href={report.reportHref}
                          title={listCopy.openReport}
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                        <Link
                          className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#111510] px-3 text-sm font-black !text-white transition hover:bg-black"
                          href={report.editHref}
                        >
                          <Edit3 className="size-4 text-[#44f26e]" />
                          <span className="truncate">{listCopy.editReport}</span>
                        </Link>
                        <button
                          className="col-span-2 inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full border border-black/12 bg-[#f5f7f1] px-3 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                          onClick={() => openCoverModal(report)}
                          type="button"
                        >
                          <ImageIcon className="size-4 text-[#16702e]" />
                          <span className="truncate">{listCopy.updateCover}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 xl:hidden">
          {reports.map((report, index) => {
            const updatedAt = formatDate(report.updatedAt, locale);
            const shouldBypassCoverImageOptimization =
              shouldBypassFanletterImageOptimization(report.coverImageUrl);

            return (
              <article
                className="overflow-hidden border border-black/12 bg-white shadow-[0_14px_34px_rgba(17,21,16,0.06)]"
                key={report.reportId}
              >
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 p-3">
                  <Link
                    className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-[#111510]"
                    href={report.editHref}
                  >
                    {report.coverImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover transition duration-300 group-hover:scale-[1.04]"
                        fill
                        loading={index === 0 ? "eager" : "lazy"}
                        sizes="96px"
                        src={report.coverImageUrl}
                        unoptimized={shouldBypassCoverImageOptimization}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Newspaper className="size-7 text-[#44f26e]" />
                      </div>
                    )}
                    {report.contentMaturityRating === "nsfw" ? (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/72 px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-white backdrop-blur">
                        <ShieldAlert className="size-3 text-[#ff6b7d]" />
                        {copy.maturityRating.nsfw}
                      </span>
                    ) : null}
                  </Link>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/40">
                      <span>
                        {report.priceType === "paid"
                          ? copy.priceType.paid
                          : copy.priceType.public}
                      </span>
                      <span
                        className={
                          report.contentMaturityRating === "nsfw"
                            ? "text-rose-600"
                            : undefined
                        }
                      >
                        {copy.maturityRating[report.contentMaturityRating]}
                      </span>
                      <span>{copy.coverSource[report.coverImageSource]}</span>
                    </div>
                    <Link
                      className="mt-1 line-clamp-2 break-words text-base font-black leading-5 !text-[#111510] [word-break:keep-all]"
                      href={report.editHref}
                    >
                      {report.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-black/56">
                      {report.dek}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <div className="rounded-md border border-black/8 bg-[#f6f8f4] px-2 py-1.5">
                        <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.06em] text-black/36">
                          {listCopy.sourceRevealVotes}
                        </p>
                        <p className="mt-0.5 text-xs font-black">
                          {formatNumber(report.sourceRevealVoteCount, locale)}
                        </p>
                      </div>
                      <div className="rounded-md border border-black/8 bg-[#f6f8f4] px-2 py-1.5">
                        <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.06em] text-black/36">
                          {listCopy.unlockContributions}
                        </p>
                        <p className="mt-0.5 text-xs font-black">
                          {formatNumber(
                            report.sourceRevealUnlockContributionCount,
                            locale,
                          )}
                        </p>
                      </div>
                      <div className="rounded-md border border-[#19b84b]/18 bg-[#ecfff0] px-2 py-1.5">
                        <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.06em] text-[#16702e]/70">
                          {listCopy.paidPurchases}
                        </p>
                        <p className="mt-0.5 text-xs font-black text-[#16702e]">
                          {formatNumber(report.paidUnlockPurchaseCount, locale)}
                        </p>
                      </div>
                      <div className="rounded-md border border-[#19b84b]/18 bg-[#ecfff0] px-2 py-1.5">
                        <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.06em] text-[#16702e]/70">
                          {listCopy.revenueShare}
                        </p>
                        <p className="mt-0.5 text-xs font-black text-[#16702e]">
                          {formatUsdt(report.paidUnlockRevenueUsdt, locale)}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-md border border-[#19b84b]/18 bg-[#ecfff0] px-2 py-1.5">
                        <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.06em] text-[#16702e]/70">
                          {listCopy.rewardPoints}
                        </p>
                        <p className="mt-0.5 text-xs font-black text-[#16702e]">
                          {formatNumber(report.incentiveRewardPoints, locale)}P
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-black/36">
                      <CalendarDays className="size-3.5 text-[#16702e]" />
                      {updatedAt}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 border-t border-black/10">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-1.5 border-r border-black/10 text-xs font-black !text-[#111510]"
                    href={report.reportHref}
                  >
                    <ExternalLink className="size-3.5 text-[#16702e]" />
                    {listCopy.openReport}
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-1.5 border-r border-black/10 text-xs font-black !text-[#111510]"
                    href={report.editHref}
                  >
                    <Edit3 className="size-3.5 text-[#16702e]" />
                    {listCopy.editReport}
                  </Link>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-1.5 text-xs font-black text-[#111510]"
                    onClick={() => openCoverModal(report)}
                    type="button"
                  >
                    <ImageIcon className="size-3.5 text-[#16702e]" />
                    {listCopy.updateCover}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {activeReport ? (
        <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/66 p-0 backdrop-blur-sm sm:items-center sm:px-6 sm:py-4">
          <div
            aria-labelledby="fanletter-report-cover-modal-title"
            aria-modal="true"
            className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-white/12 bg-[#f5f6f1] text-[#111510] shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg"
            role="dialog"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
                  <ImageIcon className="size-4" />
                  {copy.modalEyebrow}
                </p>
                <h2
                  className="mt-1.5 break-words text-xl font-black leading-tight tracking-normal [word-break:keep-all] sm:mt-2 sm:text-2xl"
                  id="fanletter-report-cover-modal-title"
                >
                  {copy.modalTitle}
                </h2>
                <p className="mt-1.5 line-clamp-1 max-w-2xl text-sm font-medium leading-5 text-black/58 sm:mt-2 sm:line-clamp-2 sm:leading-6">
                  {activeReport.title}
                </p>
                <p className="mt-1 hidden max-w-2xl text-sm font-medium leading-6 text-black/54 sm:block">
                  {copy.modalBody}
                </p>
              </div>
              <button
                aria-label={copy.modalClose}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-black/12 bg-[#f5f6f1] text-black/56 transition hover:border-black/24 hover:bg-white hover:text-black sm:size-10"
                onClick={() => setActiveReportId(null)}
                type="button"
              >
                <X className="size-[1.125rem] sm:size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5 sm:py-4 sm:pb-4">
              {coverOptionsError ? (
                <p className="mb-4 rounded-lg border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm font-bold leading-5 text-rose-700">
                  {coverOptionsError}
                </p>
              ) : null}

              {coverOptionsStatus === "loading" ? (
                <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-black/14 bg-white sm:min-h-56">
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
                  <div className="-mx-3 grid snap-x snap-mandatory auto-cols-[8.25rem] grid-flow-col gap-2 overflow-x-auto px-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
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
                          className={`group flex h-full min-w-0 snap-start flex-col overflow-hidden rounded-lg border text-left transition ${
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
                          <span className="relative block aspect-square w-full overflow-hidden bg-[#111510] sm:aspect-[5/6]">
                            <Image
                              alt=""
                              aria-hidden="true"
                              className="scale-110 object-cover blur-xl brightness-[0.42] saturate-[0.9]"
                              fill
                              loading={index === 0 ? "eager" : "lazy"}
                              sizes="(max-width: 640px) 132px, 280px"
                              src={option.imageUrl}
                              unoptimized={shouldBypassOptionImageOptimization}
                            />
                            <Image
                              alt=""
                              aria-hidden="true"
                              className="object-contain transition duration-300 group-hover:scale-[1.02]"
                              fill
                              loading={index === 0 ? "eager" : "lazy"}
                              sizes="(max-width: 640px) 132px, 280px"
                              src={option.imageUrl}
                              unoptimized={shouldBypassOptionImageOptimization}
                            />
                            <span className="absolute left-1.5 top-1.5 inline-flex max-w-[calc(100%-0.75rem)] items-center gap-1 border border-white/18 bg-black/46 px-1.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-white/78 backdrop-blur sm:left-2 sm:top-2 sm:gap-1.5 sm:px-2 sm:text-[0.62rem] sm:tracking-[0.1em]">
                              {option.isSelected ? (
                                <CheckCircle2 className="size-3 shrink-0 text-[#44f26e] sm:size-3.5" />
                              ) : isSaving ? (
                                <Loader2 className="size-3 shrink-0 animate-spin text-[#44f26e] sm:size-3.5" />
                              ) : (
                                <RotateCcw className="size-3 shrink-0 text-[#44f26e] sm:size-3.5" />
                              )}
                              <span className="truncate">
                                {copy.sourceLabels[option.source]}
                              </span>
                            </span>
                          </span>
                          <span className="flex min-h-[4.25rem] w-full flex-col p-2 sm:min-h-[5.4rem] sm:p-3">
                            <span className="line-clamp-2 text-xs font-black leading-4 text-[#111510] sm:line-clamp-1 sm:text-sm">
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
                            <span className="mt-1 flex max-h-9 flex-wrap overflow-hidden gap-x-1.5 gap-y-0.5 text-[0.62rem] font-bold leading-4 text-black/46 sm:max-h-none sm:gap-x-2 sm:gap-y-1 sm:text-[0.68rem]">
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

                  <div className="mt-3 rounded-lg border border-[#19b84b]/18 bg-[#ecfff0] p-3 sm:mt-4 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="inline-flex items-center gap-1.5 text-sm font-black text-[#111510]">
                          <ImageIcon className="size-4 text-[#16702e]" />
                          {copy.teaserTitle}
                        </p>
                        <p className="mt-1 text-xs font-bold leading-5 text-black/54">
                          {copy.teaserBody}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex h-9 items-center rounded-full bg-white px-3 text-xs font-black text-[#16702e] ring-1 ring-[#19b84b]/16">
                          {formatNumber(selectedTeaserUrls.length, locale)} /{" "}
                          {formatNumber(REPORT_TEASER_IMAGE_LIMIT, locale)}
                        </span>
                        <button
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#111510] px-3 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!canSaveTeaserImages}
                          onClick={() => {
                            void saveTeaserImageSelection();
                          }}
                          type="button"
                        >
                          {savingTeaserImages ? (
                            <Loader2 className="size-3.5 animate-spin text-[#44f26e]" />
                          ) : (
                            <CheckCircle2 className="size-3.5 text-[#44f26e]" />
                          )}
                          {savingTeaserImages
                            ? copy.teaserSaving
                            : copy.teaserSave}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.08em] text-[#16702e]/72">
                      {copy.teaserLimit(
                        formatNumber(REPORT_TEASER_IMAGE_LIMIT, locale),
                      )}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {coverOptions.map((option, index) => {
                        const optionKey = getOptionKey(option);
                        const isTeaserSelected = selectedTeaserUrlSet.has(
                          option.imageUrl,
                        );
                        const isTeaserLimitReached =
                          !isTeaserSelected &&
                          selectedTeaserUrls.length >= REPORT_TEASER_IMAGE_LIMIT;
                        const timestamp = formatCoverOptionTimestamp(
                          option.timestampSec,
                          locale,
                        );
                        const shouldBypassOptionImageOptimization =
                          shouldBypassFanletterImageOptimization(option.imageUrl);

                        return (
                          <button
                            aria-pressed={isTeaserSelected}
                            className={`group min-w-0 overflow-hidden rounded-lg border bg-white text-left transition ${
                              isTeaserSelected
                                ? "border-[#19b84b] shadow-[0_0_0_1px_rgba(25,184,75,0.22)]"
                                : "border-black/10 hover:border-[#19b84b]/45"
                            } disabled:cursor-not-allowed disabled:opacity-45`}
                            disabled={
                              savingTeaserImages ||
                              Boolean(savingOptionKey) ||
                              isTeaserLimitReached
                            }
                            key={`teaser-${optionKey}`}
                            onClick={() => {
                              toggleTeaserImage(option.imageUrl);
                            }}
                            type="button"
                          >
                            <span className="relative block aspect-video overflow-hidden bg-[#111510]">
                              <Image
                                alt=""
                                aria-hidden="true"
                                className="object-contain transition duration-300 group-hover:scale-[1.02]"
                                fill
                                loading={index === 0 ? "eager" : "lazy"}
                                sizes="(max-width: 640px) 50vw, 220px"
                                src={option.imageUrl}
                                unoptimized={shouldBypassOptionImageOptimization}
                              />
                              {isTeaserSelected ? (
                                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-[#44f26e] px-2 py-1 text-[0.58rem] font-black text-[#111510]">
                                  <CheckCircle2 className="size-3" />
                                  {copy.teaserIncluded}
                                </span>
                              ) : null}
                            </span>
                            <span className="flex min-h-12 flex-col px-2 py-2">
                              <span className="truncate text-xs font-black text-[#111510]">
                                {isTeaserSelected
                                  ? copy.teaserIncluded
                                  : copy.teaserInclude}
                              </span>
                              {timestamp ? (
                                <span className="mt-0.5 truncate text-[0.62rem] font-bold text-black/42">
                                  {timestamp}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedOption ? (
                    <div className="mt-3 rounded-lg border border-black/10 bg-white p-3 sm:mt-4 sm:p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#111510]">
                            {copy.cropLabel}
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-black/48">
                            {copy.cropHelper}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row lg:shrink-0">
                          <button
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-black/12 px-2 py-2 text-center text-xs font-black leading-4 text-black/62 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:text-[#111510] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-3 sm:py-0"
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
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#111510] px-2 py-2 text-center text-xs font-black leading-4 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-3 sm:py-0"
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
                            className="relative aspect-video min-h-[10.5rem] cursor-grab touch-none overflow-hidden rounded-lg border border-black/10 bg-[#111510] active:cursor-grabbing sm:min-h-[12rem]"
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
