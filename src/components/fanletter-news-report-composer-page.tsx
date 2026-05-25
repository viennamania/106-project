"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Crop,
  FileText,
  ImageIcon,
  LockKeyhole,
  Loader2,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";

import type { ContentMaturityRating, ContentPriceType } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CoverOption = {
  candidateId: string;
  contentType: string | null;
  imageUrl: string;
  inputValue: string;
  isAuto: boolean;
  isSelected: boolean;
  placements: string[];
  source: string;
  timestampSec: number | null;
};

export type FanletterNewsReportComposerSource = {
  contentId: string;
  contentMaturityRating: ContentMaturityRating;
  coverImageUrl: string | null;
  coverOptions: CoverOption[];
  creatorName: string;
  creatorProfile: {
    avatarImageUrl: string | null;
    displayName: string;
    name: string;
    referralCode: string | null;
    summary: string;
  };
  creatorReferralCode: string | null;
  existingReport: {
    editHref: string;
    href: string;
    reportId: string;
  } | null;
  exclusiveNews: {
    active: boolean;
    reporterName: string | null;
    reporterReferralCode: string | null;
    until: string | null;
  };
  mediaAccess: {
    canView: boolean;
    isPurchased: boolean;
    purchaseHref: string | null;
    requiresPurchase: boolean;
  };
  priceType: ContentPriceType;
  publishedAt: string | null;
  reportCount: number;
  reports: Array<{
    coverImageUrl: string | null;
    createdAt: string;
    dek: string;
    href: string;
    isViewerReport: boolean;
    reporterAvatarImageUrl: string | null;
    reporterName: string;
    reporterReferralCode: string;
    reportId: string;
    title: string;
  }>;
  summary: string;
  title: string;
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

type FanletterCroppedCoverUploadResponse = {
  contentType: string;
  pathname: string;
  sourceImageUrl: string;
  url: string;
};

type FanletterNewsReportCreateResponse = {
  report: {
    coverImageUrl: string | null;
    createdAt: string;
    dek: string;
    reporterName: string;
    reportId: string;
    shareHref: string;
    title: string;
  };
};

const REPORT_COVER_CROP_ASPECT_RATIO = 16 / 9;
const REPORT_COVER_CROP_MAX_ZOOM = 3;
const REPORT_COVER_CROP_OUTPUT_HEIGHT = 675;
const REPORT_COVER_CROP_OUTPUT_WIDTH = 1200;
const REPORTER_COMMENT_MAX_LENGTH = 220;
const DEFAULT_REPORT_COVER_CROP: ReportCoverCropState = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};

function setRelativeSearchParams(
  path: string,
  params: Record<string, string | null | undefined>,
) {
  const [pathWithSearch, hashFragment = ""] = path.split("#", 2);
  const [pathname, search = ""] = pathWithSearch.split("?", 2);
  const searchParams = new URLSearchParams(search);

  Object.entries(params).forEach(([key, value]) => {
    const normalized = value?.trim();

    if (normalized) {
      searchParams.set(key, normalized);
      return;
    }

    searchParams.delete(key);
  });

  const nextSearch = searchParams.toString();

  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${
    hashFragment ? `#${hashFragment}` : ""
  }`;
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        angleLabel: "리포터 관점",
        angles: [
          "최초 보도 포인트",
          "팬 요청 반응",
          "유료 브이로그 추천",
          "캐릭터 일상 포착",
          "언락 유도",
          "티저 중심",
        ],
        blocked:
          "현재 다른 팬 리포터에게 단독 보도권이 열려 있어 아직 작성할 수 없습니다.",
        chooseCover: "티저 이미지 선택",
        chooseVlog: "브이로그 선택",
        commentHelper:
          "동영상 전체가 아니라 티저 이미지와 공개 메타만 보고 작성하는 팬 기자 코멘트입니다.",
        commentLabel: "팬 기자 코멘트",
        commentPlaceholder:
          "예: 이 티저 컷에서 팬들이 기대할 만한 장면을 짚어주세요.",
        cropHelper:
          "선택한 티저 이미지를 뉴스 홈과 상세 화면에 쓰일 16:9 대표 이미지로 저장합니다.",
        cropTitle: "16:9 뉴스 이미지 크롭",
        emptyBody:
          "아직 리포트로 만들 수 있는 브이로그 후보가 없습니다.",
        emptyTitle: "작성 가능한 브이로그가 없습니다.",
        existingReportsBody:
          "이미 발행된 리포트의 제목, 관점, 대표 이미지를 비교해서 새 리포트의 차별점을 잡으세요.",
        existingReportsTitle: "이미 발행된 리포트",
        myReport: "내 리포트",
        existing: "이미 작성함",
        existingBody:
          "이미 이 브이로그로 작성한 리포트가 있습니다. 새 리포트 대신 기존 리포트를 수정하거나 확인하세요.",
        existingEdit: "기존 리포트 수정",
        existingView: "기존 리포트 보기",
        failed: "리포트를 만들지 못했습니다.",
        firstStep: "1. 브이로그 후보 선택",
        imageOnly:
          "작성실은 원본 동영상 없이 티저 이미지와 공개 메타만 사용합니다.",
        lead:
          "공개 브이로그와 구매한 유료 브이로그를 선택해 티저 이미지, AI 캐릭터 정보, 기존 리포트, 공개 메타를 기준으로 뉴스 리포트를 작성합니다.",
        locked: "단독 보도권",
        mediaAccess: {
          deskBody:
            "작성실에서는 원본 브이로그를 재생하지 않습니다. 공개 메타, AI 캐릭터 정보, 기존 리포트, 티저 이미지만 기준으로 작성하세요.",
          deskTitle: "티저 기반 작성",
          lockedBody:
            "이 유료 브이로그는 아직 구매하지 않았습니다. 구매한 리포터만 티저 이미지와 공개 메타를 확인하고 리포트를 발행할 수 있습니다.",
          lockedTitle: "구매 후 리포트 작성 가능",
          noVideo: "원본 동영상 비공개",
          noVideoBody:
            "브이로그 원본은 작성실에서 열람하지 않습니다. 유료 콘텐츠는 구매 후에도 티저 기반 작성만 허용됩니다.",
          openPurchase: "구매 페이지 보기",
          purchased: "구매함",
          ready: "작성 가능",
          sourceStep: "2. 작성 권한",
          teaserLocked: "티저 이미지 잠금",
          teaserReady: "티저 이미지 사용 가능",
          unpaid: "미구매",
        },
        noCover:
          "이 브이로그에는 아직 리포트에 사용할 티저 이미지가 없습니다.",
        price: {
          free: "공개",
          paid: "1 USDT 유료",
        },
        publishedAt: "게시일",
        readReport: "리포트 보기",
        reportCount: "기존 리포트",
        reporter: "팬 기자",
        reset: "초기화",
        searchActive: "전체 브이로그 검색 결과",
        searchCta: "검색",
        searchEmptyBody:
          "검색어와 일치하는 브이로그가 없습니다. 다른 AI 캐릭터 이름, 제목, 추천코드로 다시 검색하세요.",
        searchEmptyTitle: "검색 결과가 없습니다.",
        searchHelper:
          "전체 공개/유료 브이로그에서 제목, 요약, AI 캐릭터 이름, 추천코드를 검색합니다.",
        searchLabel: "전체 브이로그 검색",
        searchPlaceholder: "제목, AI 캐릭터 이름, 추천코드 검색",
        searchReset: "초기화",
        nsfwFilterLabel: "NSFW 콘텐츠",
        nsfwIncluded: "NSFW 포함",
        nsfwExcluded: "NSFW 제외",
        nsfwIncludedBody:
          "성인 브이로그 후보도 목록에 표시합니다. 작성 시에는 티저와 공개 메타 기준으로만 리포트가 생성됩니다.",
        nsfwExcludedBody:
          "일반 브이로그 후보만 표시합니다. 필요하면 NSFW를 켜서 성인 후보까지 확인할 수 있습니다.",
        nsfwTurnOff: "NSFW 끄기",
        nsfwTurnOn: "NSFW 켜기",
        select: "선택",
        selected: "선택됨",
        sourceMeta: {
          ai: "AI 커버",
          auto: "자동 추천",
          content_image: "이미지",
          frame: "프레임",
          manual: "업로드",
          primary: "대표 커버",
        } as Record<string, string>,
        submit: "뉴스 리포트 발행",
        submitting: "리포트 생성 중",
        title: "새 뉴스 리포트 작성",
        toReports: "리포트 관리로 돌아가기",
        unavailable: "작성 불가",
        zoom: "확대",
        characterProfile: "AI 캐릭터 프로필",
        noExistingReports:
          "아직 이 브이로그로 발행된 리포트가 없습니다. 첫 리포트 관점을 선점할 수 있습니다.",
      }
    : {
        angleLabel: "Reporter angle",
        angles: [
          "First report angle",
          "Fan request reaction",
          "Paid vlog recommendation",
          "Character daily-life moment",
          "Unlock motivation",
          "Teaser-led angle",
        ],
        blocked:
          "Another fan reporter currently has exclusive reporting access for this vlog.",
        chooseCover: "Choose teaser image",
        chooseVlog: "Choose vlog",
        commentHelper:
          "This reporter note is written from teaser images and public metadata, not full video playback.",
        commentLabel: "Fan reporter comment",
        commentPlaceholder:
          "Example: Point out what fans should anticipate from this teaser cut.",
        cropHelper:
          "Save the selected teaser image as a 16:9 lead image for news home and detail pages.",
        cropTitle: "16:9 news image crop",
        emptyBody: "There are no vlog candidates available for reports yet.",
        emptyTitle: "No vlogs available.",
        existingReportsBody:
          "Compare published report titles, angles, and lead images before choosing a distinct angle.",
        existingReportsTitle: "Published reports",
        myReport: "My report",
        existing: "Already reported",
        existingBody:
          "You already created a report for this vlog. Edit or view the existing report instead.",
        existingEdit: "Edit existing report",
        existingView: "View existing report",
        failed: "Could not create the report.",
        firstStep: "1. Choose a vlog candidate",
        imageOnly:
          "The reporter desk uses teaser images and public metadata without source video playback.",
        lead:
          "Choose a public vlog or a paid vlog you purchased, then create a report from teaser images, AI character info, published reports, and public metadata.",
        locked: "Exclusive access",
        mediaAccess: {
          deskBody:
            "Source video playback is not available in this desk. Write from public metadata, the AI character profile, existing reports, and teaser images.",
          deskTitle: "Teaser-based reporting",
          lockedBody:
            "This paid vlog has not been purchased yet. Only reporters who purchased it can inspect teaser images, review public metadata, and publish a report.",
          lockedTitle: "Purchase required to report",
          noVideo: "Source video hidden",
          noVideoBody:
            "The original vlog stays off the reporting desk. Paid content still requires purchase before teaser-based reporting.",
          openPurchase: "Open purchase page",
          purchased: "Purchased",
          ready: "Ready to report",
          sourceStep: "2. Reporting access",
          teaserLocked: "Teaser images locked",
          teaserReady: "Teaser images available",
          unpaid: "Not purchased",
        },
        noCover: "This vlog does not have teaser images for reporting yet.",
        price: {
          free: "Public",
          paid: "1 USDT paid",
        },
        publishedAt: "Published",
        readReport: "View report",
        reportCount: "Existing reports",
        reporter: "Reporter",
        reset: "Reset",
        searchActive: "Full vlog search results",
        searchCta: "Search",
        searchEmptyBody:
          "No vlogs match this query. Try another character name, title, or referral code.",
        searchEmptyTitle: "No search results.",
        searchHelper:
          "Search all public and paid vlogs by title, summary, AI character name, or referral code.",
        searchLabel: "Search all vlogs",
        searchPlaceholder: "Title, AI character name, referral code",
        searchReset: "Clear",
        nsfwFilterLabel: "NSFW content",
        nsfwIncluded: "NSFW included",
        nsfwExcluded: "NSFW excluded",
        nsfwIncludedBody:
          "Adult vlog candidates are visible in the list. Reports are still generated only from teasers and public metadata.",
        nsfwExcludedBody:
          "Only general vlog candidates are visible. Turn NSFW on to review adult candidates too.",
        nsfwTurnOff: "Turn NSFW off",
        nsfwTurnOn: "Turn NSFW on",
        select: "Select",
        selected: "Selected",
        sourceMeta: {
          ai: "AI cover",
          auto: "Auto pick",
          content_image: "Image",
          frame: "Frame",
          manual: "Uploaded",
          primary: "Lead cover",
        } as Record<string, string>,
        submit: "Publish news report",
        submitting: "Creating report",
        title: "Create new news report",
        toReports: "Back to reports",
        unavailable: "Unavailable",
        zoom: "Zoom",
        characterProfile: "AI character profile",
        noExistingReports:
          "No reports have been published for this vlog yet. You can claim the first angle.",
      };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en").format(value);
}

function getCoverLabel(option: CoverOption, index: number, locale: Locale) {
  const copy = getCopy(locale);
  const sourceLabel = copy.sourceMeta[option.source] ?? option.source;

  if (option.timestampSec !== null && option.timestampSec >= 0) {
    return locale === "ko"
      ? `${sourceLabel} ${Math.round(option.timestampSec)}초`
      : `${sourceLabel} ${Math.round(option.timestampSec)}s`;
  }

  return `${sourceLabel} ${formatNumber(index + 1, locale)}`;
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

export function FanletterNewsReportComposerPage({
  includeNsfw,
  locale,
  reportNewHref,
  reporterReferralCode,
  reportsHref,
  searchQuery,
  sources,
}: {
  includeNsfw: boolean;
  locale: Locale;
  reportNewHref: string;
  reporterReferralCode: string;
  reportsHref: string;
  searchQuery: string;
  sources: FanletterNewsReportComposerSource[];
}) {
  const copy = getCopy(locale);
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const firstAvailableSource =
    sources.find(
      (source) =>
        !source.existingReport &&
        source.mediaAccess.canView &&
        source.coverOptions.length > 0 &&
        !(
          source.exclusiveNews.active &&
          source.exclusiveNews.reporterReferralCode !== reporterReferralCode
        ),
    ) ??
    sources[0] ??
    null;
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    firstAvailableSource?.contentId ?? null,
  );
  const selectedSource = useMemo(
    () => sources.find((source) => source.contentId === selectedContentId) ?? null,
    [selectedContentId, sources],
  );
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(
    firstAvailableSource?.coverOptions[0]?.imageUrl ?? null,
  );
  const [angle, setAngle] = useState(copy.angles[0] ?? "");
  const [reporterComment, setReporterComment] = useState("");
  const [crop, setCrop] = useState<ReportCoverCropState>(
    DEFAULT_REPORT_COVER_CROP,
  );
  const [naturalSize, setNaturalSize] = useState<ReportCoverNaturalSize | null>(
    null,
  );
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<{
    initialCrop: ReportCoverCropState;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const cropRect = useMemo(
    () => getReportCoverCropRect({ crop, naturalSize }),
    [crop, naturalSize],
  );
  const previewImageStyle =
    cropRect && naturalSize
      ? getReportCoverPreviewImageStyle({ cropRect, naturalSize })
      : null;
  const isExclusiveBlocked = Boolean(
    selectedSource?.exclusiveNews.active &&
      selectedSource.exclusiveNews.reporterReferralCode !== reporterReferralCode,
  );
  const isSelectedPaidLocked = Boolean(selectedSource?.mediaAccess.requiresPurchase);
  const selectedCoverOption = selectedSource?.coverOptions.find(
    (option) => option.imageUrl === selectedCoverUrl,
  );
  const canSubmit = Boolean(
    selectedSource &&
      selectedSource.mediaAccess.canView &&
      selectedCoverUrl &&
      !selectedSource.existingReport &&
      !isExclusiveBlocked &&
      status !== "submitting",
  );
  const nsfwToggleHref = useMemo(
    () =>
      setRelativeSearchParams(reportNewHref, {
        nsfw: includeNsfw ? "off" : null,
        q: searchQuery || null,
      }),
    [includeNsfw, reportNewHref, searchQuery],
  );

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const nextCoverUrl = selectedSource?.coverOptions[0]?.imageUrl ?? null;

    setSelectedCoverUrl(nextCoverUrl);
    setCrop(DEFAULT_REPORT_COVER_CROP);
    setNaturalSize(null);
    setError(null);
  }, [selectedSource?.contentId, selectedSource?.coverOptions]);

  const handleCropPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!cropRect || !naturalSize) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      cropDragRef.current = {
        initialCrop: crop,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [crop, cropRect, naturalSize],
  );

  const handleCropPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = cropDragRef.current;
      const frame = cropFrameRef.current;

      if (
        !drag ||
        drag.pointerId !== event.pointerId ||
        !frame ||
        !cropRect ||
        !naturalSize
      ) {
        return;
      }

      const frameRect = frame.getBoundingClientRect();
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const cropDeltaX =
        (deltaX / Math.max(frameRect.width, 1)) * (cropRect.width / naturalSize.width);
      const cropDeltaY =
        (deltaY / Math.max(frameRect.height, 1)) *
        (cropRect.height / naturalSize.height);

      setCrop((current) => ({
        ...current,
        centerX: drag.initialCrop.centerX - cropDeltaX,
        centerY: drag.initialCrop.centerY - cropDeltaY,
      }));
    },
    [cropRect, naturalSize],
  );

  const handleCropPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (cropDragRef.current?.pointerId === event.pointerId) {
        cropDragRef.current = null;
      }
    },
    [],
  );

  const uploadCroppedCover = useCallback(
    async ({
      contentId,
      sourceImageUrl,
    }: {
      contentId: string;
      sourceImageUrl: string;
    }) => {
      const { blob, cropRect } = await createCroppedReportCoverBlob({
        crop,
        sourceImageUrl,
      });
      const file = new File([blob], `fanletter-news-cover-${contentId}.jpg`, {
        type: "image/jpeg",
      });
      const formData = new FormData();

      formData.set("contentId", contentId);
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
          data && "error" in data && data.error ? data.error : copy.failed,
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
    [copy.failed, crop],
  );

  const submitReport = useCallback(async () => {
    if (!selectedSource || !selectedCoverUrl || !canSubmit) {
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const croppedCover = await uploadCroppedCover({
        contentId: selectedSource.contentId,
        sourceImageUrl: selectedCoverUrl,
      });
      const normalizedComment = reporterComment.trim();
      const reporterCommentPayload = [angle, normalizedComment]
        .filter(Boolean)
        .join(" · ");
      const response = await fetch("/api/fanletter/news-reports", {
        body: JSON.stringify({
          contentId: selectedSource.contentId,
          croppedCoverCrop: croppedCover.crop,
          croppedCoverImageUrl: croppedCover.url,
          croppedCoverSourceImageUrl: selectedCoverUrl,
          locale,
          reporterComment: reporterCommentPayload,
          selectedCoverImageUrl: selectedCoverUrl,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | FanletterNewsReportCreateResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("report" in data)) {
        throw new Error(
          data && "error" in data && data.error ? data.error : copy.failed,
        );
      }

      router.push(data.report.shareHref);
    } catch (error) {
      setError(error instanceof Error ? error.message : copy.failed);
      setStatus("idle");
    }
  }, [
    angle,
    canSubmit,
    copy.failed,
    locale,
    reporterComment,
    router,
    selectedCoverUrl,
    selectedSource,
    uploadCroppedCover,
  ]);

  const submitSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalizedQuery = searchInput.replace(/\s+/g, " ").trim();
      const url = new URL(reportNewHref, window.location.origin);

      if (normalizedQuery) {
        url.searchParams.set("q", normalizedQuery);
      } else {
        url.searchParams.delete("q");
      }

      if (includeNsfw) {
        url.searchParams.delete("nsfw");
      } else {
        url.searchParams.set("nsfw", "off");
      }

      router.push(`${url.pathname}${url.search}`);
    },
    [includeNsfw, reportNewHref, router, searchInput],
  );

  const searchControls = (
    <form
      className="mb-3 border border-black/10 bg-[#f6f8f4] p-3"
      onSubmit={submitSearch}
      role="search"
    >
      <label
        className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]"
        htmlFor="fanletter-news-report-vlog-search"
      >
        {copy.searchLabel}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row lg:flex-col">
        <div className="flex min-w-0 flex-1 items-center gap-2 border border-black/10 bg-white px-3">
          <Search className="size-4 shrink-0 text-[#16702e]" />
          <input
            className="h-11 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-black/30"
            id="fanletter-news-report-vlog-search"
            maxLength={80}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
            placeholder={copy.searchPlaceholder}
            type="search"
            value={searchInput}
          />
        </div>
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black text-white transition hover:bg-black"
          type="submit"
        >
          <Search className="size-4 text-[#44f26e]" />
          {copy.searchCta}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-black/45">
        <p>
          {searchQuery ? `${copy.searchActive}: ${searchQuery}` : copy.searchHelper}
        </p>
        {searchQuery ? (
          <Link
            className="inline-flex items-center gap-1 font-black !text-[#16702e]"
            href={reportNewHref}
          >
            <X className="size-3.5" />
            {copy.searchReset}
          </Link>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-black/10 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-black text-[#111510]">
            <ShieldAlert
              className={cn(
                "size-4",
                includeNsfw ? "text-rose-600" : "text-black/35",
              )}
            />
            {copy.nsfwFilterLabel}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.62rem]",
                includeNsfw
                  ? "bg-rose-50 text-rose-700"
                  : "bg-[#f1f3ef] text-black/50",
              )}
            >
              {includeNsfw ? copy.nsfwIncluded : copy.nsfwExcluded}
            </span>
          </p>
          <p className="mt-1 text-[0.72rem] font-semibold leading-5 text-black/48">
            {includeNsfw ? copy.nsfwIncludedBody : copy.nsfwExcludedBody}
          </p>
        </div>
        <Link
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-black transition",
            includeNsfw
              ? "border-rose-500/24 bg-rose-50 !text-rose-700 hover:bg-rose-100"
              : "border-black/12 bg-[#f6f8f4] !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]",
          )}
          href={nsfwToggleHref}
        >
          {includeNsfw ? copy.nsfwTurnOff : copy.nsfwTurnOn}
        </Link>
      </div>
    </form>
  );

  if (sources.length === 0) {
    return (
      <main className="min-h-screen bg-[#f2f4ef] px-4 py-6 text-[#111510] sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl border border-dashed border-black/16 bg-white p-8 text-center shadow-[0_18px_46px_rgba(17,21,16,0.06)]">
          <Newspaper className="mx-auto size-10 text-[#16702e]" />
          <h1 className="mt-4 text-3xl font-black tracking-normal">
            {searchQuery ? copy.searchEmptyTitle : copy.emptyTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-black/58">
            {searchQuery ? copy.searchEmptyBody : copy.emptyBody}
          </p>
          <div className="mx-auto mt-6 max-w-xl text-left">{searchControls}</div>
          <Link
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white"
            href={reportsHref}
          >
            <ArrowLeft className="size-4 text-[#44f26e]" />
            {copy.toReports}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f2f4ef] px-4 pb-24 pt-[calc(env(safe-area-inset-top)+1rem)] text-[#111510] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black !text-black/58 transition hover:!text-[#111510]"
          href={reportsHref}
        >
          <ArrowLeft className="size-4 text-[#16702e]" />
          {copy.toReports}
        </Link>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.07)] sm:p-7">
            <p className="inline-flex items-center gap-1.5 border border-[#16702e]/20 bg-[#f6f8f4] px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
              <Newspaper className="size-3.5" />
              FanLetter News Reporter
            </p>
            <h1 className="mt-4 max-w-3xl text-[2.35rem] font-black leading-none tracking-normal [word-break:keep-all] sm:text-[4rem]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-black/60 sm:text-base sm:leading-7">
              {copy.lead}
            </p>
          </div>
          <aside className="border border-[#16702e]/18 bg-[#111510] p-5 text-white shadow-[0_18px_46px_rgba(17,21,16,0.16)]">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              <ImageIcon className="size-3.5" />
              {copy.mediaAccess.teaserReady}
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight">
              {copy.imageOnly}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
              {copy.cropHelper}
            </p>
          </aside>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="border border-black/12 bg-white p-3 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-4">
            {searchControls}
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                  {copy.firstStep}
                </p>
                <h2 className="mt-1 text-xl font-black">{copy.chooseVlog}</h2>
              </div>
              <span className="rounded-full bg-[#111510] px-2.5 py-1 text-xs font-black text-white">
                {formatNumber(sources.length, locale)}
              </span>
            </div>
            <div className="grid max-h-[42rem] gap-2 overflow-y-auto pr-1">
              {sources.map((source) => {
                const isSelected = source.contentId === selectedContentId;
                const isBlocked = Boolean(
                  source.exclusiveNews.active &&
                    source.exclusiveNews.reporterReferralCode !== reporterReferralCode,
                );
                const isPaidLocked = source.mediaAccess.requiresPurchase;

                return (
                  <button
                    className={cn(
                      "group grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 border p-2 text-left transition",
                      isSelected
                        ? "border-[#19b84b] bg-[#ecfff0]"
                        : "border-black/10 bg-[#f6f8f4] hover:border-[#19b84b]/45 hover:bg-white",
                    )}
                    key={source.contentId}
                    onClick={() => {
                      setSelectedContentId(source.contentId);
                    }}
                    type="button"
                  >
                    <span
                      className="relative block aspect-[4/5] overflow-hidden rounded-md bg-[#111510] bg-cover bg-center"
                      style={
                        source.coverImageUrl
                          ? { backgroundImage: `url(${source.coverImageUrl})` }
                          : undefined
                      }
                    >
                      {isPaidLocked ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/48 backdrop-blur-[2px]">
                          <LockKeyhole className="size-5 text-white" />
                        </span>
                      ) : null}
                      {source.contentMaturityRating === "nsfw" ? (
                        <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-black/72 px-1.5 py-0.5 text-[0.55rem] font-black text-white">
                          <ShieldAlert className="size-2.5 text-[#ff6b7d]" />
                          NSFW
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 py-1">
                      <span className="flex flex-wrap gap-1.5 text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/40">
                        <span>{copy.price[source.priceType]}</span>
                        {source.priceType === "paid" ? (
                          <span
                            className={
                              source.mediaAccess.isPurchased
                                ? "text-[#16702e]"
                                : "text-rose-700"
                            }
                          >
                            {source.mediaAccess.isPurchased
                              ? copy.mediaAccess.purchased
                              : copy.mediaAccess.unpaid}
                          </span>
                        ) : null}
                        <span>{source.creatorName}</span>
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm font-black leading-5 [word-break:keep-all]">
                        {source.title}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5 text-[0.62rem] font-black text-black/42">
                        <span>
                          {copy.reportCount} {formatNumber(source.reportCount, locale)}
                        </span>
                        {source.existingReport ? (
                          <span className="text-[#16702e]">{copy.existing}</span>
                        ) : null}
                        {isBlocked ? (
                          <span className="text-amber-700">{copy.locked}</span>
                        ) : null}
                        {isPaidLocked ? (
                          <span className="text-rose-700">
                            {copy.mediaAccess.teaserLocked}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {selectedSource ? (
              <>
                <section className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                        {selectedSource.creatorName}
                      </p>
                      <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-3xl">
                        {selectedSource.title}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-black/58">
                        {selectedSource.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#f6f8f4] px-2.5 py-1 text-xs font-black text-black/56">
                          <Clapperboard className="size-3.5 text-[#16702e]" />
                          {copy.price[selectedSource.priceType]}
                        </span>
                        {selectedSource.priceType === "paid" ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                              selectedSource.mediaAccess.isPurchased
                                ? "border-[#19b84b]/24 bg-[#ecfff0] text-[#16702e]"
                                : "border-rose-500/18 bg-rose-50 text-rose-700",
                            )}
                          >
                            {selectedSource.mediaAccess.isPurchased ? (
                              <CheckCircle2 className="size-3.5" />
                            ) : (
                              <LockKeyhole className="size-3.5" />
                            )}
                            {selectedSource.mediaAccess.isPurchased
                              ? copy.mediaAccess.purchased
                              : copy.mediaAccess.unpaid}
                          </span>
                        ) : null}
                        {selectedSource.mediaAccess.canView ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#19b84b]/24 bg-[#ecfff0] px-2.5 py-1 text-xs font-black text-[#16702e]">
                            <CheckCircle2 className="size-3.5" />
                            {copy.mediaAccess.ready}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-64">
                      <div className="border border-black/10 bg-[#f6f8f4] px-3 py-2">
                        <p className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/36">
                          {copy.publishedAt}
                        </p>
                        <p className="mt-1 text-xs font-black">
                          {formatDate(selectedSource.publishedAt, locale)}
                        </p>
                      </div>
                      <div className="border border-black/10 bg-[#f6f8f4] px-3 py-2">
                        <p className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/36">
                          {copy.reportCount}
                        </p>
                        <p className="mt-1 text-xs font-black">
                          {formatNumber(selectedSource.reportCount, locale)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 border-t border-black/10 pt-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                        <UserRound className="size-3.5" />
                        {copy.characterProfile}
                      </p>
                      <div className="mt-3 flex gap-3">
                        <span
                          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] bg-cover bg-center text-white"
                          style={
                            selectedSource.creatorProfile.avatarImageUrl
                              ? {
                                  backgroundImage: `url(${selectedSource.creatorProfile.avatarImageUrl})`,
                                }
                              : undefined
                          }
                        >
                          {selectedSource.creatorProfile.avatarImageUrl ? null : (
                            <UserRound className="size-7 text-[#44f26e]" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-lg font-black">
                            {selectedSource.creatorProfile.name}
                          </span>
                          <span className="mt-1 block text-xs font-black text-black/40">
                            {selectedSource.creatorProfile.referralCode
                              ? `@${selectedSource.creatorProfile.referralCode}`
                              : selectedSource.creatorProfile.displayName}
                          </span>
                          {selectedSource.creatorProfile.summary ? (
                            <span className="mt-2 line-clamp-3 block text-sm font-semibold leading-6 text-black/56 [word-break:keep-all]">
                              {selectedSource.creatorProfile.summary}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 border-t border-black/10 pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                            <FileText className="size-3.5" />
                            {copy.existingReportsTitle}
                          </p>
                          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-black/45">
                            {copy.existingReportsBody}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-[#111510] px-2.5 py-1 text-xs font-black text-white">
                          {formatNumber(selectedSource.reportCount, locale)}
                        </span>
                      </div>
                      {selectedSource.reports.length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {selectedSource.reports.map((report) => (
                            <Link
                              className={cn(
                                "group grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border p-2 !text-[#111510] transition hover:border-[#19b84b]/45 hover:bg-white sm:grid-cols-[10.5rem_minmax(0,1fr)]",
                                report.isViewerReport
                                  ? "border-[#19b84b]/45 bg-[#ecfff0]"
                                  : "border-black/10 bg-[#f6f8f4]",
                              )}
                              href={report.href}
                              key={report.reportId}
                            >
                              <span
                                className="block aspect-[16/9] overflow-hidden rounded-md bg-[#111510] bg-cover bg-center"
                                style={
                                  report.coverImageUrl
                                    ? {
                                        backgroundImage: `url(${report.coverImageUrl})`,
                                      }
                                    : undefined
                                }
                              />
                              <span className="min-w-0 py-0.5">
                                <span className="flex flex-wrap items-center gap-1.5 text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/36">
                                  {report.isViewerReport ? (
                                    <span className="rounded-full bg-[#111510] px-2 py-0.5 text-[#44f26e]">
                                      {copy.myReport}
                                    </span>
                                  ) : null}
                                  <span>{copy.reporter}</span>
                                  <span>{report.reporterName}</span>
                                  <span>
                                    {formatDate(report.createdAt, locale)}
                                  </span>
                                </span>
                                <span className="mt-1 line-clamp-2 text-sm font-black leading-5 [word-break:keep-all]">
                                  {report.title}
                                </span>
                                {report.dek ? (
                                  <span className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-black/48 [word-break:keep-all]">
                                    {report.dek}
                                  </span>
                                ) : null}
                                <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#16702e]">
                                  {copy.readReport}
                                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                                </span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 border border-dashed border-black/14 bg-[#f6f8f4] px-4 py-5 text-sm font-semibold leading-6 text-black/54">
                          {copy.noExistingReports}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedSource.existingReport ? (
                    <div className="mt-4 border border-[#19b84b]/22 bg-[#ecfff0] p-4">
                      <p className="inline-flex items-center gap-1.5 text-sm font-black text-[#16702e]">
                        <CheckCircle2 className="size-4" />
                        {copy.existing}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                        {copy.existingBody}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white"
                          href={selectedSource.existingReport.editHref}
                        >
                          {copy.existingEdit}
                          <ArrowRight className="size-4 text-[#44f26e]" />
                        </Link>
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 text-sm font-black !text-[#111510]"
                          href={selectedSource.existingReport.href}
                        >
                          {copy.existingView}
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {isExclusiveBlocked ? (
                    <div className="mt-4 border border-amber-300 bg-amber-50 p-4 text-amber-900">
                      <p className="inline-flex items-center gap-1.5 text-sm font-black">
                        <AlertTriangle className="size-4" />
                        {copy.locked}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6">
                        {copy.blocked}
                      </p>
                    </div>
                  ) : null}
                </section>

                <section
                  className={cn(
                    "border p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5",
                    isSelectedPaidLocked
                      ? "border-rose-500/18 bg-rose-50"
                      : "border-black/12 bg-white",
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em]",
                          isSelectedPaidLocked ? "text-rose-700" : "text-[#16702e]",
                        )}
                      >
                        {isSelectedPaidLocked ? (
                          <LockKeyhole className="size-3.5" />
                        ) : (
                          <FileText className="size-3.5" />
                        )}
                        {copy.mediaAccess.sourceStep}
                      </p>
                      <h2 className="mt-1 text-2xl font-black">
                        {isSelectedPaidLocked
                          ? copy.mediaAccess.lockedTitle
                          : copy.mediaAccess.deskTitle}
                      </h2>
                    </div>
                    {selectedSource.mediaAccess.isPurchased ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#111510] px-3 py-1.5 text-xs font-black text-white">
                        <ShoppingBag className="size-3.5 text-[#44f26e]" />
                        {copy.mediaAccess.purchased}
                      </span>
                    ) : null}
                  </div>

                  {isSelectedPaidLocked ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <p className="text-sm font-semibold leading-6 text-rose-900/72">
                        {copy.mediaAccess.lockedBody}
                      </p>
                      {selectedSource.mediaAccess.purchaseHref ? (
                        <Link
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white"
                          href={selectedSource.mediaAccess.purchaseHref}
                        >
                          {copy.mediaAccess.openPurchase}
                          <ArrowRight className="size-4 text-[#44f26e]" />
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="border border-[#19b84b]/18 bg-[#ecfff0] p-4">
                        <FileText className="size-5 text-[#16702e]" />
                        <p className="mt-3 text-sm font-black text-[#111510]">
                          {copy.mediaAccess.ready}
                        </p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-black/56">
                          {copy.mediaAccess.deskBody}
                        </p>
                      </div>
                      <div className="border border-black/10 bg-[#f6f8f4] p-4">
                        <ImageIcon className="size-5 text-[#16702e]" />
                        <p className="mt-3 text-sm font-black text-[#111510]">
                          {copy.mediaAccess.teaserReady}
                        </p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-black/56">
                          {copy.cropHelper}
                        </p>
                      </div>
                      <div className="border border-black/10 bg-[#111510] p-4 text-white">
                        <LockKeyhole className="size-5 text-[#44f26e]" />
                        <p className="mt-3 text-sm font-black">
                          {copy.mediaAccess.noVideo}
                        </p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-white/60">
                          {copy.mediaAccess.noVideoBody}
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                        3. Teaser
                      </p>
                      <h2 className="mt-1 text-2xl font-black">
                        {copy.chooseCover}
                      </h2>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#111510] px-3 py-1.5 text-xs font-black text-white">
                      <Clapperboard className="size-3.5 text-[#44f26e]" />
                      {copy.imageOnly}
                    </span>
                  </div>

                  {isSelectedPaidLocked ? (
                    <div className="mt-4 border border-rose-500/18 bg-rose-50 p-4 text-rose-900">
                      <p className="inline-flex items-center gap-1.5 text-sm font-black">
                        <LockKeyhole className="size-4" />
                        {copy.mediaAccess.teaserLocked}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-rose-900/70">
                        {copy.mediaAccess.lockedBody}
                      </p>
                      {selectedSource.mediaAccess.purchaseHref ? (
                        <Link
                          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white"
                          href={selectedSource.mediaAccess.purchaseHref}
                        >
                          {copy.mediaAccess.openPurchase}
                          <ArrowRight className="size-4 text-[#44f26e]" />
                        </Link>
                      ) : null}
                    </div>
                  ) : selectedSource.coverOptions.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {selectedSource.coverOptions.map((option, index) => {
                        const isSelected = option.imageUrl === selectedCoverUrl;

                        return (
                          <button
                            className={cn(
                              "min-w-0 overflow-hidden border bg-[#f6f8f4] p-1 text-left transition",
                              isSelected
                                ? "border-[#19b84b] bg-[#ecfff0] shadow-[0_0_0_1px_rgba(25,184,75,0.28)]"
                                : "border-black/10 hover:border-[#19b84b]/45 hover:bg-white",
                            )}
                            key={`${option.candidateId}-${option.imageUrl}`}
                            onClick={() => {
                              setSelectedCoverUrl(option.imageUrl);
                              setCrop(DEFAULT_REPORT_COVER_CROP);
                              setNaturalSize(null);
                            }}
                            type="button"
                          >
                            <span
                              className="block aspect-[4/5] rounded-md bg-[#111510] bg-cover bg-center"
                              style={{ backgroundImage: `url(${option.imageUrl})` }}
                            />
                            <span className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                              <span className="min-w-0 truncate text-xs font-black">
                                {getCoverLabel(option, index, locale)}
                              </span>
                              {isSelected ? (
                                <span className="rounded-full bg-[#44f26e] px-2 py-0.5 text-[0.62rem] font-black text-[#111510]">
                                  {copy.selected}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 border border-dashed border-black/14 bg-[#f6f8f4] px-4 py-5 text-sm font-semibold text-black/54">
                      {copy.noCover}
                    </p>
                  )}
                </section>

                {selectedCoverUrl ? (
                  <section className="border border-black/12 bg-[#111510] p-4 text-white shadow-[0_14px_34px_rgba(17,21,16,0.12)] sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                          <Crop className="size-3.5" />
                          4. Crop
                        </p>
                        <h2 className="mt-2 text-2xl font-black">
                          {copy.cropTitle}
                        </h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                          {copy.cropHelper}
                        </p>
                      </div>
                      {selectedCoverOption ? (
                        <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white/62">
                          {selectedCoverOption.source}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
                      <div
                        className="relative aspect-video min-h-[13rem] cursor-grab touch-none overflow-hidden border border-white/12 bg-black/40 active:cursor-grabbing"
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

                            if (image.naturalWidth && image.naturalHeight) {
                              setNaturalSize({
                                height: image.naturalHeight,
                                width: image.naturalWidth,
                              });
                            }
                          }}
                          src={selectedCoverUrl}
                          style={
                            previewImageStyle ?? {
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
                      <div className="border border-white/10 bg-white/[0.045] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black text-white/62">
                            {copy.zoom}
                          </span>
                          <span className="text-xs font-black text-[#44f26e]">
                            {crop.zoom.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          aria-label={copy.zoom}
                          className="mt-3 w-full accent-[#44f26e]"
                          max={REPORT_COVER_CROP_MAX_ZOOM}
                          min={1}
                          onChange={(event) => {
                            setCrop((current) => ({
                              ...current,
                              zoom: Number(event.target.value),
                            }));
                          }}
                          step={0.01}
                          type="range"
                          value={crop.zoom}
                        />
                        <button
                          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/12 text-xs font-black text-white/62 transition hover:border-white/24 hover:bg-white/[0.06] hover:text-white"
                          onClick={() => {
                            setCrop(DEFAULT_REPORT_COVER_CROP);
                          }}
                          type="button"
                        >
                          <RefreshCw className="size-3.5" />
                          {copy.reset}
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                    5. Reporter note
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {copy.angleLabel}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {copy.angles.map((item) => (
                      <button
                        className={cn(
                          "inline-flex h-9 items-center rounded-full border px-3 text-xs font-black transition",
                          item === angle
                            ? "border-[#111510] bg-[#111510] text-white"
                            : "border-black/10 bg-[#f6f8f4] text-black/58 hover:border-[#19b84b] hover:text-[#111510]",
                        )}
                        key={item}
                        onClick={() => {
                          setAngle(item);
                        }}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <label className="mt-4 block">
                    <span className="text-sm font-black">{copy.commentLabel}</span>
                    <textarea
                      className="mt-2 min-h-28 w-full resize-y border border-black/12 bg-[#f6f8f4] px-3 py-3 text-sm font-semibold leading-6 outline-none transition placeholder:text-black/30 focus:border-[#19b84b] focus:bg-white"
                      maxLength={REPORTER_COMMENT_MAX_LENGTH}
                      onChange={(event) => {
                        setReporterComment(event.target.value);
                      }}
                      placeholder={copy.commentPlaceholder}
                      value={reporterComment}
                    />
                  </label>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-black/42">
                    <p>{copy.commentHelper}</p>
                    <p>
                      {formatNumber(reporterComment.length, locale)}/
                      {formatNumber(REPORTER_COMMENT_MAX_LENGTH, locale)}
                    </p>
                  </div>
                  {error ? (
                    <p className="mt-4 border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold leading-6 text-rose-700">
                      {error}
                    </p>
                  ) : null}
                  <button
                    className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black text-[#111510] transition hover:bg-[#65ff86] disabled:cursor-not-allowed disabled:opacity-55 sm:w-fit"
                    disabled={!canSubmit}
                    onClick={() => {
                      void submitReport();
                    }}
                    type="button"
                  >
                    {status === "submitting" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {status === "submitting" ? copy.submitting : copy.submit}
                  </button>
                </section>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
