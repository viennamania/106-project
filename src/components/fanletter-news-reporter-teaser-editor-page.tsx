"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Crop,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
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

import type { ContentMaturityRating } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type FanletterNewsReporterTeaserEditorCoverOption = {
  candidateId: string;
  contentType: string | null;
  height: number | null;
  imageUrl: string;
  inputValue: string;
  isAuto: boolean;
  isSelected: boolean;
  placements: string[];
  source: string;
  timestampSec: number | null;
  width: number | null;
};

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

type CroppedTeaserImage = {
  crop: ReportCoverCropPayload;
  imageUrl: string;
  sourceImageUrl: string;
};

type SelectedTeaserCut = {
  id: string;
  sourceImageUrl: string;
};

type SavedTeaserItem = {
  crop: ReportCoverCropPayload | null;
  id: string;
  imageUrl: string;
  isCropped: boolean;
  sourceImageUrl: string;
};

type ReportTeaserImagePayload = {
  crop: ReportCoverCropPayload | null;
  imageUrl: string;
  sourceImageUrl: string;
};

type FanletterCroppedCoverUploadResponse = {
  contentType: string;
  pathname: string;
  sourceImageUrl: string;
  url: string;
};

export type FanletterNewsReporterTeaserEditorReport = {
  contentId: string;
  contentMaturityRating: ContentMaturityRating;
  coverImageUrl: string | null;
  reporterName: string;
  reportId: string;
  teaserImages: Array<{
    crop?: ReportCoverCropPayload | null;
    imageUrl: string;
    source: "reporter_cropped" | "source_frame";
    sourceImageUrl: string;
  }>;
  teaserImageUrls: string[];
  title: string;
};

const REPORT_TEASER_CROP_ASPECT_RATIO = 9 / 16;
const REPORT_TEASER_CROP_OUTPUT_HEIGHT = 1280;
const REPORT_TEASER_CROP_OUTPUT_WIDTH = 720;
const REPORT_TEASER_IMAGE_LIMIT = 4;
const REPORT_COVER_CROP_MAX_ZOOM = 3;
const DEFAULT_REPORT_COVER_CROP: ReportCoverCropState = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        activeCut: "편집 중",
        add: "추가",
        addAndCrop: "추가 후 크롭",
        backToNews: "뉴스로 돌아가기",
        candidateEmpty:
          "이 뉴스의 원본 브이로그에서 저장된 프레임을 찾을 수 없습니다.",
        candidateTitle: "크롭할 프레임 선택",
        close: "닫기",
        cropBody:
          "선택한 슬롯을 9:16으로 맞춘 뒤 컷 저장을 누르세요. 같은 프레임도 슬롯마다 다르게 크롭할 수 있습니다.",
        cropSaved:
          "컷을 저장했습니다. 전체 저장을 눌러 뉴스에 반영하세요.",
        cropSave: "이 컷 저장",
        cropSaving: "컷 저장 중",
        cropTitle: "선택 슬롯 크롭",
        currentBadge: "현재 적용",
        currentEmpty: "아직 저장된 리포터 티저 컷이 없습니다.",
        currentTitle: "현재 뉴스에 적용된 티저 컷",
        duplicateHint:
          "같은 프레임을 여러 번 추가해서 서로 다른 장면처럼 크롭할 수 있습니다.",
        editCurrent: "이 컷 수정",
        eyebrow: "내가 작성한 뉴스",
        failed: "티저 컷을 저장하지 못했습니다.",
        frame: (index: string) => `프레임 ${index}`,
        frameTime: (seconds: string) => `${seconds}초`,
        imageSize: "이미지 크기",
        lead:
          "일반 사용자 뉴스 화면에서 바로 이어 들어온 리포터 전용 티저 컷 편집실입니다.",
        limitReached: "최대 4개까지 선택할 수 있습니다.",
        modalBody:
          "공개 티저 컷 슬롯에 넣을 프레임을 고르세요. 동일한 프레임도 다시 추가할 수 있습니다.",
        modalDone: "선택 완료",
        modalSelected: "선택한 슬롯",
        openPicker: "공개 티저 컷 슬롯 고르기",
        remove: "삭제",
        reset: "초기화",
        saved: "저장됨",
        saveAll: "리포터 티저 컷 전체 저장",
        saveAllBody:
          "저장하면 뉴스 상세의 리포터 티저 컷 영역에 바로 반영됩니다.",
        saveAllDone: "리포터 티저 컷을 뉴스에 반영했습니다.",
        saveAllSaving: "전체 저장 중",
        selectedEmpty: "아직 선택한 슬롯이 없습니다.",
        selectedTitle: "이번에 적용할 공개 티저 컷 슬롯",
        slot: (index: string) => `슬롯 ${index}`,
        sourceUseCount: (count: string) => `${count}회 사용`,
        title: "리포터 티저 컷 편집",
        zoom: "확대",
      }
    : {
        activeCut: "Editing",
        add: "Add",
        addAndCrop: "Add and crop",
        backToNews: "Back to news",
        candidateEmpty:
          "No saved source frames were found for this news source.",
        candidateTitle: "Choose a frame to crop",
        close: "Close",
        cropBody:
          "Frame the selected slot as 9:16, then save the cut. The same frame can be cropped differently in multiple slots.",
        cropSaved:
          "Cut saved. Save all changes to apply it to the news page.",
        cropSave: "Save this cut",
        cropSaving: "Saving cut",
        cropTitle: "Crop selected slot",
        currentBadge: "Currently applied",
        currentEmpty: "No reporter teaser cuts have been saved yet.",
        currentTitle: "Teaser cuts currently applied",
        duplicateHint:
          "You can add the same frame multiple times and crop each slot differently.",
        editCurrent: "Edit this cut",
        eyebrow: "News written by you",
        failed: "Could not save teaser cuts.",
        frame: (index: string) => `Frame ${index}`,
        frameTime: (seconds: string) => `${seconds}s`,
        imageSize: "Image size",
        lead:
          "A reporter-only teaser cut editor opened from the public news page.",
        limitReached: "You can choose up to 4 cuts.",
        modalBody:
          "Choose a frame for a public teaser slot. The same frame can be added again.",
        modalDone: "Done",
        modalSelected: "Selected slots",
        openPicker: "Choose teaser slots",
        remove: "Remove",
        reset: "Reset",
        saved: "Saved",
        saveAll: "Save reporter teaser cuts",
        saveAllBody:
          "Saved cuts appear immediately in the reporter teaser cut area on the news page.",
        saveAllDone: "Reporter teaser cuts were applied to the news.",
        saveAllSaving: "Saving",
        selectedEmpty: "No slots selected yet.",
        selectedTitle: "Public teaser cut slots to apply",
        slot: (index: string) => `Slot ${index}`,
        sourceUseCount: (count: string) => `Used ${count} times`,
        title: "Edit reporter teaser cuts",
        zoom: "Zoom",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashTeaserCutValue(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function createStableTeaserCutId({
  imageUrl,
  index,
  sourceImageUrl,
}: {
  imageUrl?: string | null;
  index: number;
  sourceImageUrl: string;
}) {
  return `cut-${index + 1}-${hashTeaserCutValue(
    `${sourceImageUrl}|${imageUrl ?? ""}`,
  )}`;
}

function createRuntimeTeaserCut(sourceImageUrl: string): SelectedTeaserCut {
  return {
    id: `cut-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    sourceImageUrl,
  };
}

function getUniqueImageUrls(values: Array<string | null | undefined>) {
  return [
    ...new Set(values.map((value) => value?.trim() ?? "").filter(Boolean)),
  ];
}

function getSelectableCoverOptions(
  coverOptions: FanletterNewsReporterTeaserEditorCoverOption[],
) {
  return coverOptions.filter(
    (option) => option.imageUrl.trim() && option.source !== "reporter_cropped",
  );
}

function getDefaultTeaserCuts({
  coverOptions,
  report,
}: {
  coverOptions: FanletterNewsReporterTeaserEditorCoverOption[];
  report: FanletterNewsReporterTeaserEditorReport;
}) {
  const existingCuts = report.teaserImages
    .map((image, index) => {
      const imageUrl = image.imageUrl.trim();
      const sourceImageUrl = image.sourceImageUrl.trim() || imageUrl;

      if (!sourceImageUrl) {
        return null;
      }

      return {
        id: createStableTeaserCutId({ imageUrl, index, sourceImageUrl }),
        sourceImageUrl,
      } satisfies SelectedTeaserCut;
    })
    .filter((cut): cut is SelectedTeaserCut => Boolean(cut))
    .slice(0, REPORT_TEASER_IMAGE_LIMIT);

  if (existingCuts.length > 0) {
    return existingCuts;
  }

  const teaserImageCuts = report.teaserImageUrls
    .map((imageUrl, index) => {
      const sourceImageUrl = imageUrl.trim();

      if (!sourceImageUrl) {
        return null;
      }

      return {
        id: createStableTeaserCutId({
          imageUrl: sourceImageUrl,
          index,
          sourceImageUrl,
        }),
        sourceImageUrl,
      } satisfies SelectedTeaserCut;
    })
    .filter((cut): cut is SelectedTeaserCut => Boolean(cut))
    .slice(0, REPORT_TEASER_IMAGE_LIMIT);

  if (teaserImageCuts.length > 0) {
    return teaserImageCuts;
  }

  return getUniqueImageUrls(coverOptions.map((option) => option.imageUrl))
    .slice(0, REPORT_TEASER_IMAGE_LIMIT)
    .map((sourceImageUrl, index) => ({
      id: createStableTeaserCutId({
        imageUrl: sourceImageUrl,
        index,
        sourceImageUrl,
      }),
      sourceImageUrl,
    }));
}

function getInitialCroppedTeaserByCutId(
  report: FanletterNewsReporterTeaserEditorReport,
) {
  const croppedTeaserByCutId: Record<string, CroppedTeaserImage> = {};

  for (const [index, image] of report.teaserImages.entries()) {
    const sourceImageUrl = image.sourceImageUrl.trim() || image.imageUrl.trim();
    const imageUrl = image.imageUrl.trim();

    if (
      !sourceImageUrl ||
      !imageUrl ||
      imageUrl === sourceImageUrl ||
      image.source !== "reporter_cropped" ||
      !image.crop
    ) {
      continue;
    }

    croppedTeaserByCutId[
      createStableTeaserCutId({ imageUrl, index, sourceImageUrl })
    ] = {
      crop: image.crop,
      imageUrl,
      sourceImageUrl,
    };
  }

  return croppedTeaserByCutId;
}

function getSavedTeaserItemsFromReport(
  report: FanletterNewsReporterTeaserEditorReport,
): SavedTeaserItem[] {
  const savedItems: SavedTeaserItem[] = [];

  for (const [index, image] of report.teaserImages.entries()) {
    const imageUrl = image.imageUrl.trim();
    const sourceImageUrl = image.sourceImageUrl.trim() || imageUrl;

    if (!imageUrl) {
      continue;
    }

    savedItems.push({
      crop: image.crop ?? null,
      id: createStableTeaserCutId({ imageUrl, index, sourceImageUrl }),
      imageUrl,
      isCropped: Boolean(
        image.source === "reporter_cropped" &&
          image.crop &&
          sourceImageUrl &&
          imageUrl !== sourceImageUrl,
      ),
      sourceImageUrl,
    });
  }

  if (savedItems.length > 0) {
    return savedItems.slice(0, REPORT_TEASER_IMAGE_LIMIT);
  }

  for (const [index, imageUrl] of report.teaserImageUrls.entries()) {
    const normalizedImageUrl = imageUrl.trim();

    if (!normalizedImageUrl) {
      continue;
    }

    savedItems.push({
      crop: null,
      id: createStableTeaserCutId({
        imageUrl: normalizedImageUrl,
        index,
        sourceImageUrl: normalizedImageUrl,
      }),
      imageUrl: normalizedImageUrl,
      isCropped: false,
      sourceImageUrl: normalizedImageUrl,
    });
  }

  return savedItems.slice(0, REPORT_TEASER_IMAGE_LIMIT);
}

function getSavedTeaserItemsFromPayload(
  selectedTeaserImages: ReportTeaserImagePayload[],
) {
  return selectedTeaserImages
    .map((image, index) => {
      const imageUrl = image.imageUrl.trim();
      const sourceImageUrl = image.sourceImageUrl.trim() || imageUrl;

      if (!imageUrl) {
        return null;
      }

      return {
        crop: image.crop,
        id: createStableTeaserCutId({ imageUrl, index, sourceImageUrl }),
        imageUrl,
        isCropped: Boolean(
          image.crop && sourceImageUrl && imageUrl !== sourceImageUrl,
        ),
        sourceImageUrl,
      } satisfies SavedTeaserItem;
    })
    .filter((item): item is SavedTeaserItem => Boolean(item))
    .slice(0, REPORT_TEASER_IMAGE_LIMIT);
}

function getReportImageCropRect({
  aspectRatio,
  crop,
  naturalSize,
}: {
  aspectRatio: number;
  crop: ReportCoverCropState;
  naturalSize: ReportCoverNaturalSize | null;
}): ReportCoverCropRect | null {
  if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
    return null;
  }

  const sourceAspectRatio = naturalSize.width / naturalSize.height;
  const baseWidth =
    sourceAspectRatio >= aspectRatio
      ? naturalSize.height * aspectRatio
      : naturalSize.width;
  const baseHeight = baseWidth / aspectRatio;
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

function getReportTeaserCropRect({
  crop,
  naturalSize,
}: {
  crop: ReportCoverCropState;
  naturalSize: ReportCoverNaturalSize | null;
}) {
  return getReportImageCropRect({
    aspectRatio: REPORT_TEASER_CROP_ASPECT_RATIO,
    crop,
    naturalSize,
  });
}

function getReportCropPreviewImageStyle({
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

function getCropStateFromPayload({
  crop,
  naturalSize,
}: {
  crop: ReportCoverCropPayload;
  naturalSize: ReportCoverNaturalSize;
}): ReportCoverCropState | null {
  if (
    crop.width <= 0 ||
    crop.height <= 0 ||
    naturalSize.width <= 0 ||
    naturalSize.height <= 0
  ) {
    return null;
  }

  const sourceAspectRatio = naturalSize.width / naturalSize.height;
  const baseWidth =
    sourceAspectRatio >= REPORT_TEASER_CROP_ASPECT_RATIO
      ? naturalSize.height * REPORT_TEASER_CROP_ASPECT_RATIO
      : naturalSize.width;

  return {
    centerX: clampNumber((crop.x + crop.width / 2) / naturalSize.width, 0, 1),
    centerY: clampNumber((crop.y + crop.height / 2) / naturalSize.height, 0, 1),
    zoom: clampNumber(baseWidth / crop.width, 1, REPORT_COVER_CROP_MAX_ZOOM),
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
      reject(new Error("Could not load the selected image."));
    };
    image.src = src;
  });
}

async function createCroppedReportImageBlob({
  aspectRatio,
  crop,
  outputHeight,
  outputWidth,
  sourceImageUrl,
}: {
  aspectRatio: number;
  crop: ReportCoverCropState;
  outputHeight: number;
  outputWidth: number;
  sourceImageUrl: string;
}) {
  const image = await loadImageForCrop(sourceImageUrl);
  const naturalSize = {
    height: image.naturalHeight,
    width: image.naturalWidth,
  };
  const cropRect = getReportImageCropRect({
    aspectRatio,
    crop,
    naturalSize,
  });

  if (!cropRect) {
    throw new Error("Could not read the selected image size.");
  }

  const canvas = document.createElement("canvas");
  canvas.height = outputHeight;
  canvas.width = outputWidth;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the image crop.");
  }

  context.drawImage(
    image,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });

  if (!blob) {
    throw new Error("Could not encode the cropped image.");
  }

  return {
    blob,
    cropRect,
  };
}

function getCoverLabel({
  index,
  locale,
  option,
}: {
  index: number;
  locale: Locale;
  option: FanletterNewsReporterTeaserEditorCoverOption;
}) {
  if (option.timestampSec !== null) {
    return `${formatNumber(index + 1, locale)} · ${formatNumber(
      Math.round(option.timestampSec),
      locale,
    )}s`;
  }

  return locale === "ko"
    ? `프레임 ${formatNumber(index + 1, locale)}`
    : `Frame ${formatNumber(index + 1, locale)}`;
}

function formatImageSize(
  option: FanletterNewsReporterTeaserEditorCoverOption,
  locale: Locale,
) {
  if (!option.width || !option.height) {
    return null;
  }

  return `${formatNumber(option.width, locale)} x ${formatNumber(
    option.height,
    locale,
  )}`;
}

export function FanletterNewsReporterTeaserEditorPage({
  coverOptions,
  locale,
  newsHref,
  report,
  returnHref,
  returnLabel,
}: {
  coverOptions: FanletterNewsReporterTeaserEditorCoverOption[];
  locale: Locale;
  newsHref: string;
  report: FanletterNewsReporterTeaserEditorReport;
  returnHref: string;
  returnLabel?: string;
}) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const router = useRouter();
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const cropEditorRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<{
    initialCrop: ReportCoverCropState;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const selectableCoverOptions = useMemo(
    () => getSelectableCoverOptions(coverOptions),
    [coverOptions],
  );
  const [selectedTeaserCuts, setSelectedTeaserCuts] = useState<
    SelectedTeaserCut[]
  >(() => getDefaultTeaserCuts({ coverOptions: selectableCoverOptions, report }));
  const [selectedTeaserCropCutId, setSelectedTeaserCropCutId] =
    useState<string | null>(() =>
      getDefaultTeaserCuts({ coverOptions: selectableCoverOptions, report })[0]
        ?.id ?? null,
    );
  const [croppedTeaserByCutId, setCroppedTeaserByCutId] = useState<
    Record<string, CroppedTeaserImage>
  >(() => getInitialCroppedTeaserByCutId(report));
  const [savedTeaserItems, setSavedTeaserItems] = useState<SavedTeaserItem[]>(
    () => getSavedTeaserItemsFromReport(report),
  );
  const [teaserCrop, setTeaserCrop] = useState<ReportCoverCropState>(
    DEFAULT_REPORT_COVER_CROP,
  );
  const [teaserNaturalSize, setTeaserNaturalSize] =
    useState<ReportCoverNaturalSize | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [cropStatus, setCropStatus] = useState<"idle" | "saving">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTeaserCropCut =
    selectedTeaserCuts.find((cut) => cut.id === selectedTeaserCropCutId) ??
    selectedTeaserCuts[0] ??
    null;
  const activeTeaserCropSourceUrl = activeTeaserCropCut?.sourceImageUrl ?? null;
  const activeCroppedTeaser = activeTeaserCropCut
    ? croppedTeaserByCutId[activeTeaserCropCut.id] ?? null
    : null;
  const teaserCropRect = getReportTeaserCropRect({
    crop: teaserCrop,
    naturalSize: teaserNaturalSize,
  });
  const teaserPreviewImageStyle =
    teaserCropRect && teaserNaturalSize
      ? getReportCropPreviewImageStyle({
          cropRect: teaserCropRect,
          naturalSize: teaserNaturalSize,
        })
      : null;
  const selectedItems = selectedTeaserCuts.map((cut, index) => {
    const croppedTeaser = croppedTeaserByCutId[cut.id] ?? null;
    const sourceUseCount = selectedTeaserCuts.filter(
      (candidateCut) => candidateCut.sourceImageUrl === cut.sourceImageUrl,
    ).length;

    return {
      croppedTeaser,
      id: cut.id,
      index,
      isActive: cut.id === activeTeaserCropCut?.id,
      previewUrl: croppedTeaser?.imageUrl ?? cut.sourceImageUrl,
      sourceImageUrl: cut.sourceImageUrl,
      sourceUseCount,
    };
  });
  const canAddMore = selectedTeaserCuts.length < REPORT_TEASER_IMAGE_LIMIT;
  const canSaveAll =
    selectedTeaserCuts.length > 0 && saveStatus !== "saving" && cropStatus !== "saving";

  useEffect(() => {
    setTeaserNaturalSize(null);
  }, [activeTeaserCropCut?.id]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPickerOpen]);

  const focusCropEditor = useCallback((cutId: string) => {
    setSelectedTeaserCropCutId(cutId);
    setTeaserCrop(DEFAULT_REPORT_COVER_CROP);
    setTeaserNaturalSize(null);

    window.setTimeout(() => {
      cropEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }, []);

  const addTeaserCutFromSource = useCallback(
    (sourceImageUrl: string, shouldFocusEditor = false) => {
      if (!canAddMore) {
        return;
      }

      const nextCut = createRuntimeTeaserCut(sourceImageUrl);

      setSelectedTeaserCuts((current) =>
        current.length >= REPORT_TEASER_IMAGE_LIMIT
          ? current
          : [...current, nextCut],
      );
      setSelectedTeaserCropCutId(nextCut.id);
      setTeaserCrop(DEFAULT_REPORT_COVER_CROP);
      setTeaserNaturalSize(null);
      setMessage(null);
      setError(null);

      if (shouldFocusEditor) {
        window.setTimeout(() => {
          cropEditorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      }
    },
    [canAddMore],
  );

  const removeTeaserCut = useCallback((cutId: string) => {
    setSelectedTeaserCuts((current) => {
      const removeIndex = current.findIndex((cut) => cut.id === cutId);

      if (removeIndex < 0) {
        return current;
      }

      const next = current.filter((cut) => cut.id !== cutId);

      setSelectedTeaserCropCutId((currentCutId) =>
        currentCutId === cutId
          ? next[Math.min(removeIndex, next.length - 1)]?.id ?? null
          : currentCutId,
      );
      setCroppedTeaserByCutId((currentCrops) => {
        if (!currentCrops[cutId]) {
          return currentCrops;
        }

        const nextCrops = { ...currentCrops };
        delete nextCrops[cutId];

        return nextCrops;
      });

      return next;
    });
  }, []);

  const focusSavedTeaserItem = useCallback(
    (item: SavedTeaserItem) => {
      const sourceImageUrl = item.sourceImageUrl || item.imageUrl;

      if (!sourceImageUrl) {
        return;
      }

      const existingCut = selectedTeaserCuts.find((cut) => cut.id === item.id);
      const nextCut = existingCut ?? {
        id: item.id,
        sourceImageUrl,
      };

      if (!existingCut && selectedTeaserCuts.length >= REPORT_TEASER_IMAGE_LIMIT) {
        return;
      }

      setSelectedTeaserCuts((current) =>
        current.some((cut) => cut.id === nextCut.id)
          ? current
          : [nextCut, ...current].slice(0, REPORT_TEASER_IMAGE_LIMIT),
      );

      if (item.isCropped && item.crop) {
        setCroppedTeaserByCutId((current) => ({
          ...current,
          [nextCut.id]: {
            crop: item.crop as ReportCoverCropPayload,
            imageUrl: item.imageUrl,
            sourceImageUrl,
          },
        }));
      }

      focusCropEditor(nextCut.id);
    },
    [focusCropEditor, selectedTeaserCuts],
  );

  const handleCropPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!teaserCropRect || !teaserNaturalSize) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      cropDragRef.current = {
        initialCrop: teaserCrop,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [teaserCrop, teaserCropRect, teaserNaturalSize],
  );

  const handleCropPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = cropDragRef.current;
      const frame = cropFrameRef.current;

      if (
        !drag ||
        drag.pointerId !== event.pointerId ||
        !frame ||
        !teaserCropRect ||
        !teaserNaturalSize
      ) {
        return;
      }

      const frameRect = frame.getBoundingClientRect();
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const cropDeltaX =
        (deltaX / Math.max(frameRect.width, 1)) *
        (teaserCropRect.width / teaserNaturalSize.width);
      const cropDeltaY =
        (deltaY / Math.max(frameRect.height, 1)) *
        (teaserCropRect.height / teaserNaturalSize.height);

      setTeaserCrop((current) => ({
        ...current,
        centerX: drag.initialCrop.centerX - cropDeltaX,
        centerY: drag.initialCrop.centerY - cropDeltaY,
      }));
    },
    [teaserCropRect, teaserNaturalSize],
  );

  const handleCropPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (cropDragRef.current?.pointerId === event.pointerId) {
        cropDragRef.current = null;
      }
    },
    [],
  );

  const uploadCroppedReportImage = useCallback(
    async (sourceImageUrl: string) => {
      const { blob, cropRect } = await createCroppedReportImageBlob({
        aspectRatio: REPORT_TEASER_CROP_ASPECT_RATIO,
        crop: teaserCrop,
        outputHeight: REPORT_TEASER_CROP_OUTPUT_HEIGHT,
        outputWidth: REPORT_TEASER_CROP_OUTPUT_WIDTH,
        sourceImageUrl,
      });
      const file = new File([blob], `fanletter-news-teaser-${report.contentId}.jpg`, {
        type: "image/jpeg",
      });
      const formData = new FormData();

      formData.set("contentId", report.contentId);
      formData.set("file", file);
      formData.set("purpose", "teaser");
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
          data && "error" in data && data.error ? data.error : copy.failed,
        );
      }

      return {
        crop: {
          aspectRatio: REPORT_TEASER_CROP_ASPECT_RATIO,
          height: cropRect.height,
          outputHeight: REPORT_TEASER_CROP_OUTPUT_HEIGHT,
          outputWidth: REPORT_TEASER_CROP_OUTPUT_WIDTH,
          sourceImageUrl,
          width: cropRect.width,
          x: cropRect.x,
          y: cropRect.y,
        } satisfies ReportCoverCropPayload,
        url: data.url,
      };
    },
    [copy.failed, report.contentId, teaserCrop],
  );

  const saveCroppedTeaserImage = useCallback(async () => {
    if (!activeTeaserCropCut || !activeTeaserCropSourceUrl || cropStatus === "saving") {
      return;
    }

    setCropStatus("saving");
    setMessage(null);
    setError(null);

    try {
      const croppedTeaser = await uploadCroppedReportImage(
        activeTeaserCropSourceUrl,
      );

      setCroppedTeaserByCutId((current) => ({
        ...current,
        [activeTeaserCropCut.id]: {
          crop: croppedTeaser.crop,
          imageUrl: croppedTeaser.url,
          sourceImageUrl: activeTeaserCropSourceUrl,
        },
      }));
      setMessage(copy.cropSaved);
    } catch (error) {
      setError(error instanceof Error ? error.message : copy.failed);
    } finally {
      setCropStatus("idle");
    }
  }, [
    activeTeaserCropCut,
    activeTeaserCropSourceUrl,
    copy.cropSaved,
    copy.failed,
    cropStatus,
    uploadCroppedReportImage,
  ]);

  const getSelectedTeaserImages = useCallback(
    (): ReportTeaserImagePayload[] =>
      selectedTeaserCuts.map((cut) => {
        const croppedTeaser = croppedTeaserByCutId[cut.id];

        return croppedTeaser
          ? {
              crop: croppedTeaser.crop,
              imageUrl: croppedTeaser.imageUrl,
              sourceImageUrl: croppedTeaser.sourceImageUrl,
            }
          : {
              crop: null,
              imageUrl: cut.sourceImageUrl,
              sourceImageUrl: cut.sourceImageUrl,
            };
      }),
    [croppedTeaserByCutId, selectedTeaserCuts],
  );

  const saveTeaserCuts = useCallback(async () => {
    if (!canSaveAll) {
      return;
    }

    setSaveStatus("saving");
    setMessage(null);
    setError(null);

    try {
      const selectedTeaserImages = getSelectedTeaserImages();
      const response = await fetch("/api/fanletter/news-reports", {
        body: JSON.stringify({
          locale,
          reportId: report.reportId,
          selectedTeaserImages,
          selectedTeaserImageUrls: selectedTeaserCuts.map(
            (cut) => cut.sourceImageUrl,
          ),
          updateKind: "teasers",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = (await response.json().catch(() => null)) as
        | { report?: { teaserImageUrls?: string[] } }
        | { error?: string }
        | null;

      if (!response.ok || !data || !("report" in data)) {
        throw new Error(
          data && "error" in data && data.error ? data.error : copy.failed,
        );
      }

      const nextSavedItems = getSavedTeaserItemsFromPayload(selectedTeaserImages);
      const nextCuts = nextSavedItems.map((item) => ({
        id: item.id,
        sourceImageUrl: item.sourceImageUrl,
      }));

      setSavedTeaserItems(nextSavedItems);
      setSelectedTeaserCuts(nextCuts);
      setSelectedTeaserCropCutId(nextCuts[0]?.id ?? null);
      setCroppedTeaserByCutId(
        nextSavedItems.reduce<Record<string, CroppedTeaserImage>>(
          (next, item) => {
            if (item.isCropped && item.crop) {
              next[item.id] = {
                crop: item.crop,
                imageUrl: item.imageUrl,
                sourceImageUrl: item.sourceImageUrl,
              };
            }

            return next;
          },
          {},
        ),
      );
      setMessage(copy.saveAllDone);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : copy.failed);
    } finally {
      setSaveStatus("idle");
    }
  }, [
    canSaveAll,
    copy.failed,
    copy.saveAllDone,
    getSelectedTeaserImages,
    locale,
    report.reportId,
    router,
    selectedTeaserCuts,
  ]);

  const pickerModal = isPickerOpen ? (
    <div
      className="fixed inset-0 z-[180] flex items-end justify-center bg-black/64 p-0 backdrop-blur-sm sm:items-center sm:px-5 sm:py-5"
      onClick={() => {
        setIsPickerOpen(false);
      }}
    >
      <div
        aria-labelledby="fanletter-news-reporter-teaser-picker-title"
        aria-modal="true"
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-white/12 bg-[#f5f6f1] text-[#111510] shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg"
        onClick={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 bg-white px-3 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
              <ImageIcon className="size-4" />
              {copy.candidateTitle}
            </p>
            <h2
              className="mt-1.5 break-words text-xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-2xl"
              id="fanletter-news-reporter-teaser-picker-title"
            >
              {copy.openPicker}
            </h2>
            <p className="mt-1.5 text-sm font-semibold leading-5 text-black/56 sm:max-w-2xl sm:leading-6">
              {copy.modalBody}
            </p>
          </div>
          <button
            aria-label={copy.close}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-black/12 bg-[#f5f6f1] text-black/56 transition hover:border-black/24 hover:bg-white hover:text-black"
            onClick={() => {
              setIsPickerOpen(false);
            }}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 pb-4 sm:px-5 sm:py-4">
          <div className="rounded-xl border border-[#19b84b]/20 bg-white p-2.5 shadow-[0_10px_24px_rgba(25,184,75,0.08)] sm:p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex min-w-0 items-center gap-1.5 text-sm font-black text-[#111510]">
                <CheckCircle2 className="size-4 shrink-0 text-[#16702e]" />
                <span className="truncate">{copy.modalSelected}</span>
              </p>
              <span className="inline-flex shrink-0 rounded-full bg-[#111510] px-3 py-1.5 text-xs font-black text-[#44f26e]">
                {formatNumber(selectedTeaserCuts.length, locale)} /{" "}
                {formatNumber(REPORT_TEASER_IMAGE_LIMIT, locale)}
              </span>
            </div>
            {selectedItems.length > 0 ? (
              <div className="-mx-1 mt-3 grid grid-flow-col auto-cols-[5.25rem] gap-2 overflow-x-auto px-1 pb-1 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-4 sm:overflow-visible sm:pb-0 lg:grid-cols-6">
                {selectedItems.map((item) => (
                  <button
                    className={cn(
                      "group min-w-0 overflow-hidden rounded-lg border bg-[#f7f9f4] p-1 text-left transition",
                      item.isActive
                        ? "border-[#19b84b] shadow-[0_0_0_1px_rgba(25,184,75,0.22)]"
                        : "border-black/10 hover:border-[#19b84b]/45",
                    )}
                    key={item.id}
                    onClick={() => {
                      setIsPickerOpen(false);
                      focusCropEditor(item.id);
                    }}
                    type="button"
                  >
                    <span
                      className="relative block aspect-[9/16] overflow-hidden rounded-md bg-[#111510] bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.previewUrl})` }}
                    >
                      <span className="absolute left-1 top-1 rounded-full bg-black/72 px-1.5 py-0.5 text-[0.58rem] font-black text-[#44f26e]">
                        {formatNumber(item.index + 1, locale)}
                      </span>
                    </span>
                    <span className="mt-1.5 block truncate text-[0.62rem] font-black text-[#111510]">
                      {copy.slot(formatNumber(item.index + 1, locale))}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-[#19b84b]/22 bg-[#f6fff7] px-3 py-4 text-sm font-semibold leading-6 text-black/50">
                {copy.selectedEmpty}
              </p>
            )}
          </div>

          {selectableCoverOptions.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {selectableCoverOptions.map((option, index) => {
                const sourceUseCount = selectedTeaserCuts.filter(
                  (cut) => cut.sourceImageUrl === option.imageUrl,
                ).length;
                const imageSizeLabel = formatImageSize(option, locale);

                return (
                  <div
                    className="min-w-0 overflow-hidden rounded-lg border border-black/10 bg-white p-1.5 shadow-[0_8px_20px_rgba(17,21,16,0.055)]"
                    key={`${option.candidateId}-${option.imageUrl}-${index}`}
                  >
                    <span
                      className="relative block min-h-[8.5rem] overflow-hidden rounded-md bg-[#111510] bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${option.imageUrl})` }}
                    >
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/72 px-1.5 py-0.5 text-[0.58rem] font-black text-[#44f26e]">
                        {formatNumber(index + 1, locale)}
                      </span>
                      {sourceUseCount > 0 ? (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-white px-1.5 py-0.5 text-[0.58rem] font-black text-[#16702e]">
                          {copy.sourceUseCount(formatNumber(sourceUseCount, locale))}
                        </span>
                      ) : null}
                    </span>
                    <div className="min-w-0 px-1 pb-1 pt-2">
                      <p className="truncate text-[0.72rem] font-black text-[#111510]">
                        {getCoverLabel({ index, locale, option })}
                      </p>
                      {imageSizeLabel ? (
                        <p className="mt-0.5 truncate text-[0.62rem] font-black uppercase tracking-[0.06em] text-black/42">
                          {copy.imageSize} · {imageSizeLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <button
                        className={cn(
                          "flex h-11 min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 text-[0.68rem] font-black transition",
                          sourceUseCount > 0
                            ? "border-[#19b84b]/35 bg-[#111510] text-white"
                            : "border-black/10 bg-[#f6f8f4] text-black/58 hover:border-[#19b84b]/35 hover:text-[#111510]",
                          !canAddMore &&
                            "cursor-not-allowed opacity-45 hover:border-black/10 hover:text-black/58",
                        )}
                        disabled={!canAddMore}
                        onClick={() => {
                          addTeaserCutFromSource(option.imageUrl);
                        }}
                        type="button"
                      >
                        <Plus className="size-3.5 shrink-0 text-[#16702e]" />
                        <span className="truncate">{copy.add}</span>
                      </button>
                      <button
                        className={cn(
                          "flex h-11 min-w-0 items-center justify-center gap-1 rounded-md border border-black/10 bg-[#f6f8f4] px-1.5 text-[0.68rem] font-black text-black/58 transition hover:border-[#19b84b]/35 hover:text-[#111510]",
                          !canAddMore &&
                            "cursor-not-allowed opacity-45 hover:border-black/10 hover:text-black/58",
                        )}
                        disabled={!canAddMore}
                        onClick={() => {
                          setIsPickerOpen(false);
                          addTeaserCutFromSource(option.imageUrl, true);
                        }}
                        type="button"
                      >
                        <Crop className="size-3.5 shrink-0 text-[#16702e]" />
                        <span className="truncate">{copy.addAndCrop}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-black/14 bg-white px-4 py-10 text-center text-sm font-semibold leading-6 text-black/50">
              {copy.candidateEmpty}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-black/10 bg-white px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5 sm:pb-3">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-black text-black/48">
              {canAddMore ? copy.duplicateHint : copy.limitReached}
            </span>
            <button
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e] px-5 text-sm font-black text-[#111510] transition hover:bg-[#65ff87]"
              onClick={() => {
                setIsPickerOpen(false);
              }}
              type="button"
            >
              {copy.modalDone}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {pickerModal}
      <main className="fanletter-v2-surface min-h-screen bg-[#f2f4ef] px-2 pb-[calc(11.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-[#111510] sm:px-5 sm:pb-[calc(11.25rem+env(safe-area-inset-bottom))] sm:pt-6 md:pb-28 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-6xl">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black !text-black/58 transition hover:!text-[#111510]"
            href={returnHref || newsHref}
          >
            <ArrowLeft className="size-4 text-[#16702e]" />
            {returnLabel ?? copy.backToNews}
          </Link>

          <section className="mt-3 overflow-hidden border border-black/12 bg-white shadow-[0_18px_46px_rgba(17,21,16,0.07)]">
            <div className="border-b border-black/10 bg-[#111510] px-3 py-4 text-white sm:px-5 sm:py-5">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1.5 text-xs font-black text-[#111510]">
                <ShieldCheck className="size-3.5" />
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 text-[1.85rem] font-black leading-[1.08] tracking-normal [word-break:keep-all] sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/62">
                {copy.lead}
              </p>
              <p className="mt-3 line-clamp-2 text-sm font-black text-white">
                {report.title}
              </p>
            </div>

            <div className="grid gap-3 p-2.5 sm:p-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(22rem,0.48fr)] lg:items-start">
              <div className="min-w-0">
                <section className="rounded-xl border border-[#19b84b]/20 bg-[#ecfff0] p-3 shadow-[0_10px_24px_rgba(25,184,75,0.08)] sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-sm font-black text-[#111510]">
                        <ImageIcon className="size-4 text-[#16702e]" />
                        {copy.selectedTitle}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-black/54">
                        {copy.duplicateHint}
                      </p>
                    </div>
                    <button
                      className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black text-[#111510] transition hover:bg-[#65ff87] disabled:cursor-not-allowed disabled:opacity-55 sm:w-fit"
                      disabled={selectableCoverOptions.length === 0}
                      onClick={() => {
                        setIsPickerOpen(true);
                      }}
                      type="button"
                    >
                      <ImageIcon className="size-4" />
                      {copy.openPicker}
                    </button>
                  </div>

                  {selectedItems.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {selectedItems.map((item) => (
                        <div
                          className={cn(
                            "min-w-0 overflow-hidden rounded-lg border bg-[#f7f9f4] p-2",
                            item.isActive
                              ? "border-[#19b84b] shadow-[0_0_0_1px_rgba(25,184,75,0.22)]"
                              : "border-black/10",
                          )}
                          key={item.id}
                        >
                          <button
                            className="group relative block aspect-[9/16] w-full overflow-hidden rounded-md bg-[#111510] bg-cover bg-center"
                            onClick={() => {
                              focusCropEditor(item.id);
                            }}
                            style={{ backgroundImage: `url(${item.previewUrl})` }}
                            type="button"
                          >
                            <span className="absolute left-1 top-1 rounded-full bg-black/72 px-1.5 py-0.5 text-[0.58rem] font-black text-[#44f26e]">
                              {formatNumber(item.index + 1, locale)}
                            </span>
                            {item.isActive ? (
                              <span className="absolute right-1 top-1 rounded-full bg-[#44f26e] px-1.5 py-0.5 text-[0.58rem] font-black text-black">
                                {copy.activeCut}
                              </span>
                            ) : null}
                          </button>
                          <div className="mt-2 min-w-0">
                            <p className="truncate text-[0.72rem] font-black text-[#111510]">
                              {copy.slot(formatNumber(item.index + 1, locale))}
                            </p>
                            {item.sourceUseCount > 1 ? (
                              <p className="mt-1 inline-flex rounded-full bg-[#ecfff0] px-2 py-0.5 text-[0.58rem] font-black text-[#16702e]">
                                {copy.sourceUseCount(
                                  formatNumber(item.sourceUseCount, locale),
                                )}
                              </p>
                            ) : null}
                          </div>
                          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                            <button
                              className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-md bg-[#111510] px-2 text-[0.7rem] font-black text-white transition hover:bg-black"
                              onClick={() => {
                                focusCropEditor(item.id);
                              }}
                              type="button"
                            >
                              <Crop className="size-3 text-[#44f26e]" />
                              <span className="truncate">{copy.cropTitle}</span>
                            </button>
                            <button
                              aria-label={`${copy.remove} ${copy.slot(
                                formatNumber(item.index + 1, locale),
                              )}`}
                              className="inline-flex size-10 items-center justify-center rounded-md border border-black/10 bg-white text-black/42 transition hover:border-rose-500/30 hover:text-rose-700"
                              onClick={() => {
                                removeTeaserCut(item.id);
                              }}
                              type="button"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          {item.croppedTeaser ? (
                            <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.06em] text-[#16702e]">
                              {copy.saved}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-dashed border-[#19b84b]/22 bg-[#f6fff7] px-3 py-4 text-sm font-semibold leading-6 text-black/50">
                      {copy.selectedEmpty}
                    </p>
                  )}
                </section>

                <section
                  className="mt-3 scroll-mt-5 rounded-xl border border-[#111510] bg-[#111510] p-3 text-white shadow-[0_16px_40px_rgba(17,21,16,0.18)] sm:p-4"
                  ref={cropEditorRef}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#44f26e]">
                        <Crop className="size-4" />
                        9:16
                      </p>
                      <h2 className="mt-1 text-xl font-black tracking-normal">
                        {copy.cropTitle}
                      </h2>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/58">
                        {copy.cropBody}
                      </p>
                    </div>
                    {activeCroppedTeaser ? (
                      <span className="inline-flex w-fit shrink-0 rounded-full bg-[#44f26e] px-3 py-1.5 text-xs font-black text-[#111510]">
                        {copy.saved}
                      </span>
                    ) : null}
                  </div>

                  {activeTeaserCropSourceUrl ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                      <div className="min-w-0">
                        <div
                          className="relative mx-auto aspect-[9/16] max-h-[64vh] w-full max-w-[22rem] cursor-grab touch-none overflow-hidden rounded-lg border border-white/12 bg-black/40 active:cursor-grabbing"
                          onPointerCancel={handleCropPointerEnd}
                          onPointerDown={handleCropPointerDown}
                          onPointerMove={handleCropPointerMove}
                          onPointerUp={handleCropPointerEnd}
                          ref={cropFrameRef}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt=""
                            aria-hidden="true"
                            className="absolute max-w-none select-none object-cover"
                            crossOrigin="anonymous"
                            draggable={false}
                            onLoad={(event) => {
                              const image = event.currentTarget;
                              const naturalSize = {
                                height: image.naturalHeight,
                                width: image.naturalWidth,
                              };

                              setTeaserNaturalSize(naturalSize);

                              if (activeCroppedTeaser?.crop) {
                                setTeaserCrop(
                                  getCropStateFromPayload({
                                    crop: activeCroppedTeaser.crop,
                                    naturalSize,
                                  }) ?? DEFAULT_REPORT_COVER_CROP,
                                );
                              }
                            }}
                            src={activeTeaserCropSourceUrl}
                            style={
                              teaserPreviewImageStyle ?? {
                                height: "100%",
                                left: 0,
                                top: 0,
                                width: "100%",
                              }
                            }
                          />
                          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/26" />
                          <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/16" />
                          <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/16" />
                          <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/16" />
                          <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/16" />
                        </div>
                      </div>
                      <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.045] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black text-white/62">
                            {copy.zoom}
                          </span>
                          <span className="text-xs font-black text-[#44f26e]">
                            {teaserCrop.zoom.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          aria-label={`${copy.cropTitle} ${copy.zoom}`}
                          className="mt-3 w-full accent-[#44f26e]"
                          max={REPORT_COVER_CROP_MAX_ZOOM}
                          min={1}
                          onChange={(event) => {
                            setTeaserCrop((current) => ({
                              ...current,
                              zoom: Number(event.target.value),
                            }));
                          }}
                          step={0.01}
                          type="range"
                          value={teaserCrop.zoom}
                        />
                        <button
                          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/12 text-xs font-black text-white/62 transition hover:border-white/24 hover:bg-white/[0.06] hover:text-white"
                          onClick={() => {
                            setTeaserCrop(DEFAULT_REPORT_COVER_CROP);
                          }}
                          type="button"
                        >
                          <RefreshCw className="size-3.5" />
                          {copy.reset}
                        </button>
                        <button
                          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#44f26e] px-3 text-xs font-black text-black transition hover:bg-[#65ff87] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={cropStatus === "saving"}
                          onClick={() => {
                            void saveCroppedTeaserImage();
                          }}
                          type="button"
                        >
                          {cropStatus === "saving" ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ImageIcon className="size-3.5" />
                          )}
                          {cropStatus === "saving" ? copy.cropSaving : copy.cropSave}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-6 text-sm font-semibold leading-6 text-white/56">
                      {copy.selectedEmpty}
                    </p>
                  )}
                </section>
              </div>

              <aside className="min-w-0">
                <section className="rounded-xl border border-black/10 bg-[#f6fff7] p-3 shadow-[0_10px_24px_rgba(25,184,75,0.07)] sm:p-4">
                  <p className="inline-flex items-center gap-1.5 text-sm font-black text-[#111510]">
                    <CheckCircle2 className="size-4 text-[#16702e]" />
                    {copy.currentTitle}
                  </p>
                  {savedTeaserItems.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {savedTeaserItems.map((item, index) => (
                        <button
                          className="group min-w-0 overflow-hidden rounded-lg border border-black/10 bg-white p-1 text-left transition hover:border-[#19b84b]/45"
                          key={`${item.imageUrl}-${index}`}
                          onClick={() => {
                            focusSavedTeaserItem(item);
                          }}
                          type="button"
                        >
                          <span
                            className="relative block aspect-[9/16] overflow-hidden rounded-md bg-[#111510] bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.imageUrl})` }}
                          >
                            <span className="absolute left-1 top-1 rounded-full bg-black/72 px-1.5 py-0.5 text-[0.58rem] font-black text-[#44f26e]">
                              {formatNumber(index + 1, locale)}
                            </span>
                            <span className="absolute right-1 top-1 rounded-full bg-white px-1.5 py-0.5 text-[0.58rem] font-black text-[#16702e]">
                              {copy.currentBadge}
                            </span>
                          </span>
                          <span className="mt-2 block truncate text-[0.66rem] font-black text-[#111510]">
                            {copy.editCurrent}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.6rem] font-black uppercase tracking-[0.05em] text-black/42">
                            {item.isCropped ? copy.saved : copy.frame(formatNumber(index + 1, locale))}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-dashed border-[#19b84b]/20 bg-white px-3 py-5 text-sm font-semibold leading-6 text-black/48">
                      {copy.currentEmpty}
                    </p>
                  )}
                </section>

                <section className="mt-3 rounded-xl border border-black/10 bg-white p-3 shadow-[0_10px_24px_rgba(17,21,16,0.055)] sm:p-4">
                  <p className="text-sm font-black text-[#111510]">
                    {copy.saveAll}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-black/54">
                    {copy.saveAllBody}
                  </p>
                  {message ? (
                    <p className="mt-3 rounded-lg border border-[#19b84b]/18 bg-[#ecfff0] px-3 py-2 text-sm font-black leading-6 text-[#16702e]">
                      {message}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="mt-3 rounded-lg border border-rose-500/18 bg-rose-50 px-3 py-2 text-sm font-black leading-6 text-rose-700">
                      {error}
                    </p>
                  ) : null}
                  <button
                    className="mt-3 hidden h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55 lg:inline-flex"
                    disabled={!canSaveAll}
                    onClick={() => {
                      void saveTeaserCuts();
                    }}
                    type="button"
                  >
                    {saveStatus === "saving" ? (
                      <Loader2 className="size-4 animate-spin text-[#44f26e]" />
                    ) : (
                      <Save className="size-4 text-[#44f26e]" />
                    )}
                    {saveStatus === "saving" ? copy.saveAllSaving : copy.saveAll}
                  </button>
                </section>
              </aside>
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-[calc(5.35rem+env(safe-area-inset-bottom))] z-50 border-t border-black/10 bg-white/96 px-3 py-3 pb-3 shadow-[0_-16px_44px_rgba(17,21,16,0.14)] backdrop-blur md:bottom-0 md:pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canSaveAll}
            onClick={() => {
              void saveTeaserCuts();
            }}
            type="button"
          >
            {saveStatus === "saving" ? (
              <Loader2 className="size-4 animate-spin text-[#44f26e]" />
            ) : (
              <Save className="size-4 text-[#44f26e]" />
            )}
            {saveStatus === "saving" ? copy.saveAllSaving : copy.saveAll}
          </button>
        </div>
      </main>
    </>
  );
}
