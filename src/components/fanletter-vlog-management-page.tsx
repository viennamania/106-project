"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clapperboard,
  Coins,
  Crop,
  Eye,
  Heart,
  ImageIcon,
  LockKeyhole,
  Loader2,
  MessageCircle,
  MessageCircleHeart,
  Newspaper,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  type LucideIcon,
  Video,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { useMemberSession } from "@/components/member-session-provider";
import {
  getContentVideoAssetSource,
  type ContentCoverImageCandidate,
  type ContentMaturityRating,
  type ContentPostMutationResponse,
  type ContentPostStatus,
  type CreatorProfileRecord,
  type CreatorStudioPostRecord,
  type CreatorStudioPostsResponse,
} from "@/lib/content";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { smartWalletChain, thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";
import { captureVideoCoverFramesFromUrl } from "@/lib/video-frame-cover-client";

type VlogStatusFilter = "all" | "archived" | "draft" | "published";
type VlogPriceFilter = "all" | "free" | "paid";
type VlogMaturityFilter = "all" | "general" | "nsfw";

type VlogManagementState = {
  error: string | null;
  member: MemberRecord | null;
  notice: string | null;
  pageInfo: CreatorStudioPostsResponse["pageInfo"] | null;
  posts: CreatorStudioPostRecord[];
  profile: CreatorProfileRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  summary: CreatorStudioPostsResponse["summary"];
};

type VlogCoverOptionSource = ContentCoverImageCandidate["source"] | "current";

type VlogCoverOption = {
  candidateId: string;
  contentType: string | null;
  height: number | null;
  imageUrl: string;
  inputValue: string;
  isSelected: boolean;
  key: string;
  placements: string[];
  source: VlogCoverOptionSource;
  timestampSec: number | null;
  width: number | null;
};

type VlogCoverCropState = {
  centerX: number;
  centerY: number;
  zoom: number;
};

type VlogCoverNaturalSize = {
  height: number;
  width: number;
};

type VlogCoverCropRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type VlogCoverUploadResponse = {
  contentType: string;
  pathname: string;
  url: string;
};

const FANLETTER_VLOG_DISCONNECTED_GRACE_MS = 4500;
const VLOGS_PAGE_SIZE = 18;
const EXCLUSIVE_NEWS_DURATION_OPTIONS = [6, 12, 24] as const;
const VLOG_COVER_CROP_ASPECT_RATIO = 16 / 9;
const VLOG_COVER_CROP_MAX_ZOOM = 3;
const VLOG_COVER_CROP_OUTPUT_HEIGHT = 675;
const VLOG_COVER_CROP_OUTPUT_WIDTH = 1200;
const VLOG_TEASER_IMAGE_LIMIT = 10;
const DEFAULT_VLOG_COVER_CROP: VlogCoverCropState = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};
const EMPTY_SUMMARY: CreatorStudioPostsResponse["summary"] = {
  all: 0,
  archived: 0,
  draft: 0,
  free: 0,
  maturityFilters: {
    all: 0,
    general: 0,
    nsfw: 0,
  },
  paid: 0,
  published: 0,
  statusFilters: {
    all: 0,
    archived: 0,
    draft: 0,
    published: 0,
  },
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          archive: "보관",
          assignExclusive: "단독 지정",
          back: "스튜디오",
          changeCover: "커버 변경",
          channels: "채널 배포",
          connect: "계정 연결",
          create: "새 브이로그 만들기",
          detail: "상세 보기",
          fanRequests: "팬 요청 선택",
          feed: "피드 보기",
          manageTeasers: "프레임 관리",
          markNsfw: "NSFW 표시",
          next: "다음",
          paidUpload: "팬 요청 답장 업로드",
          previous: "이전",
          publish: "공개",
          refresh: "새로고침",
          search: "검색",
          sales: "판매 내역",
          unmarkNsfw: "NSFW 해제",
          clearExclusive: "단독 해제",
          viewAllMaturity: "전체 수위 보기",
          viewNsfw: "NSFW만 보기",
        },
        connectRequired:
          "FanLetter 계정을 연결하면 내 AI 캐릭터 브이로그를 관리할 수 있습니다.",
        cover: {
          cropFailed: "크롭 이미지를 업로드하지 못했습니다.",
          cropHelper:
            "드래그로 위치를 맞추고 확대값을 조정해 목록과 상세에 맞는 대표 커버를 저장합니다.",
          cropLabel: "16:9 커버 크롭",
          cropOriginal: "선택한 원본 그대로 사용",
          cropReset: "초기화",
          cropSave: "크롭 저장",
          cropSaving: "저장 중",
          cropUnavailable: "이 이미지는 크롭할 수 없습니다.",
          cropZoom: "확대",
          deleteCandidate: "후보 삭제",
          deleteFailed: "커버 후보를 삭제하지 못했습니다.",
          deletedNotice: "커버 후보를 삭제했습니다.",
          modalBody:
            "동영상 콘텐츠의 목록, 상세, 공유 화면에 보일 대표 이미지를 선택하고 16:9 비율로 편집합니다.",
          modalClose: "닫기",
          modalEmpty: "저장된 커버 후보가 아직 없습니다.",
          modalEyebrow: "콘텐츠 커버",
          modalTitle: "브이로그 커버 이미지 선택",
          optionCurrent: "현재 사용 중",
          optionSelected: "편집 중",
          optionUse: "이 이미지 선택",
          saveFailed: "커버 이미지를 저장하지 못했습니다.",
          savedNotice: "브이로그 커버 이미지를 변경했습니다.",
          sourceLabels: {
            ai: "AI 생성",
            current: "현재 커버",
            frame: "영상 프레임",
            manual: "직접 업로드",
          },
          unavailable: "커버 이미지 없음",
        },
        teasers: {
          addFailed: "영상 프레임을 추가하지 못했습니다.",
          addNotice: "원본 영상 프레임을 추가했습니다.",
          count: (count: string) => `${count}개 프레임`,
          delete: "삭제",
          deleteFailed: "영상 프레임을 삭제하지 못했습니다.",
          deletedNotice: "영상 프레임을 삭제했습니다.",
          empty:
            "아직 저장된 영상 프레임이 없습니다. 원본 영상에서 프레임을 추가해 뉴스와 구매 화면의 이미지 DB를 채워보세요.",
          generate: "원본 영상에서 프레임 추가",
          generating: "프레임 추출 중",
          helper:
            "뉴스 리포트, 유료 잠금 화면, 구매 전 미리보기에서 활용할 원본 영상 프레임을 관리합니다.",
          limit: (count: string) => `최대 ${count}장까지 저장됩니다.`,
          modalBody:
            "원본 영상에서 장면 프레임을 추출하고, 소비자가 뉴스와 구매 화면에서 먼저 볼 수 있는 컷을 선별합니다.",
          modalClose: "닫기",
          modalEyebrow: "Video Frame DB",
          modalTitle: "브이로그 영상 프레임 관리",
          noVideo: "프레임을 추출할 원본 영상이 없습니다.",
          sectionTitle: "영상 프레임",
        },
        emptyBody:
          "아직 관리할 브이로그가 없습니다. 오늘의 AI 캐릭터 브이로그를 만든 뒤 공개 상태를 관리해보세요.",
        emptyTitle: "첫 브이로그를 만들 시간입니다.",
        emptyFreeBody:
          "피드에서 팬 유입을 만들 무료 공개 브이로그가 아직 없습니다. 먼저 공개용 브이로그를 만들어 팬 요청으로 이어지게 해보세요.",
        emptyFreeTitle: "무료 공개 브이로그를 준비해보세요.",
        emptyPaidBody:
          "유료 팬 전용 브이로그는 팬이 남긴 브이로그 요청에 답장할 때 등록합니다. 팬 요청함에서 답장할 요청을 먼저 선택하세요.",
        emptyPaidTitle: "답장할 팬 요청을 먼저 선택하세요.",
        eyebrow: "FanLetter Vlog Manager",
        exclusiveNews: {
          active: "단독 보도 진행 중",
          body:
            "무료 공개 브이로그에 리포터를 지정하면 해당 시간 동안 지정 리포터만 뉴스 리포트를 발행할 수 있습니다.",
          clearedNotice: "단독 보도권을 해제했습니다.",
          codeLabel: "리포터 ID",
          codePlaceholder: "예: P2PZVJA5",
          durationLabel: "보장 시간",
          helper: "완료 가입된 리포터 ID만 지정할 수 있습니다.",
          inactive: "단독 보도권 없음",
          savedNotice: "단독 보도 리포터를 지정했습니다.",
          title: "단독 보도 리포터",
          unavailable:
            "단독 보도권은 공개 상태의 무료 브이로그에서만 지정할 수 있습니다.",
          until: "만료",
        },
        labels: {
          all: "전체",
          archived: "보관",
          author: "크리에이터",
          comments: "댓글",
          draft: "임시저장",
          free: "무료",
          freePublic: "무료 공개",
          generalContent: "일반",
          likes: "좋아요",
          maturity: "수위",
          nsfw: "NSFW",
          page: "페이지",
          paid: "유료",
          paidFanOnly: "유료 팬 전용",
          published: "공개",
          reports: "리포트",
          results: "브이로그",
          saves: "저장",
          signals: "반응 신호",
          status: "상태",
          updated: "수정일",
        },
        loading: "브이로그 목록을 불러오고 있습니다.",
        noMatching: "조건에 맞는 브이로그가 없습니다.",
        nsfwModeBody:
          "NSFW는 팬 요청에 답장한 직접 업로드 유료 영상에서만 켤 수 있습니다. 무료 공개와 AI 생성 영상은 일반 콘텐츠로 유지됩니다.",
        nsfwNoticeOff: "일반 콘텐츠로 전환했습니다.",
        nsfwNoticeOn: "NSFW 콘텐츠로 표시했습니다.",
        nsfwShortcutActiveBody:
          "NSFW 필터가 적용되어 있습니다. 전체 수위로 돌아가면 일반 콘텐츠와 함께 비교할 수 있습니다.",
        nsfwShortcutBody:
          "현재 페이지에 NSFW 카드가 없어도 NSFW 필터에서 전체 NSFW 콘텐츠를 모아 관리할 수 있습니다.",
        nsfwUnavailable:
          "직접 업로드한 유료 팬 전용 영상만 NSFW로 전환할 수 있습니다.",
        paymentRequired:
          "FanLetter 시작 준비 확인이 끝나면 브이로그 전체 관리를 사용할 수 있습니다.",
        searchPlaceholder: "제목, 요약, 본문으로 검색",
        subtitle:
          "무료 공개 브이로그와 유료 팬 전용 콘텐츠를 분리해 검색하고 공개, 임시저장, 보관 상태를 정리합니다.",
        title: "브이로그 전체 관리",
      }
    : {
        actions: {
          archive: "Archive",
          assignExclusive: "Assign exclusive",
          back: "Studio",
          changeCover: "Change cover",
          channels: "Channel distribution",
          connect: "Connect account",
          create: "Create new vlog",
          detail: "View detail",
          fanRequests: "Choose fan request",
          feed: "View feed",
          manageTeasers: "Manage frames",
          markNsfw: "Mark NSFW",
          next: "Next",
          paidUpload: "Fan request reply upload",
          previous: "Previous",
          publish: "Publish",
          refresh: "Refresh",
          search: "Search",
          sales: "Sales",
          unmarkNsfw: "Clear NSFW",
          clearExclusive: "Clear exclusive",
          viewAllMaturity: "View all maturity",
          viewNsfw: "View NSFW only",
        },
        connectRequired:
          "Connect your FanLetter account to manage your AI character vlogs.",
        cover: {
          cropFailed: "Could not upload the cropped image.",
          cropHelper:
            "Drag to position and adjust zoom, then save a lead cover for lists and detail pages.",
          cropLabel: "16:9 cover crop",
          cropOriginal: "Use selected original",
          cropReset: "Reset",
          cropSave: "Save crop",
          cropSaving: "Saving",
          cropUnavailable: "This image cannot be cropped.",
          cropZoom: "Zoom",
          deleteCandidate: "Delete candidate",
          deleteFailed: "Could not delete the cover candidate.",
          deletedNotice: "The cover candidate has been deleted.",
          modalBody:
            "Choose and edit the lead image shown for this video content in lists, detail pages, and shares.",
          modalClose: "Close",
          modalEmpty: "No saved cover candidates are available yet.",
          modalEyebrow: "Content cover",
          modalTitle: "Select vlog cover image",
          optionCurrent: "Currently used",
          optionSelected: "Editing",
          optionUse: "Choose this image",
          saveFailed: "Could not save the cover image.",
          savedNotice: "The vlog cover image has been changed.",
          sourceLabels: {
            ai: "AI generated",
            current: "Current cover",
            frame: "Video frame",
            manual: "Manual upload",
          },
          unavailable: "No cover image",
        },
        teasers: {
          addFailed: "Could not add video frames.",
          addNotice: "Added source video frames.",
          count: (count: string) => `${count} frames`,
          delete: "Delete",
          deleteFailed: "Could not delete the video frame.",
          deletedNotice: "The video frame has been deleted.",
          empty:
            "No video frames are saved yet. Add frames from the source video to build the image database for news and purchase surfaces.",
          generate: "Add frames from source video",
          generating: "Extracting frames",
          helper:
            "Manage source video frames used by news reports, paid locks, and pre-purchase previews.",
          limit: (count: string) => `Up to ${count} images can be saved.`,
          modalBody:
            "Extract frames from the source video and select cuts viewers can see first in news and purchase screens.",
          modalClose: "Close",
          modalEyebrow: "Video Frame DB",
          modalTitle: "Manage vlog video frames",
          noVideo: "No source video is available for frame extraction.",
          sectionTitle: "Video frames",
        },
        emptyBody:
          "There are no vlogs to manage yet. Create today's AI character vlog, then manage its publishing state here.",
        emptyTitle: "Create your first vlog.",
        emptyFreeBody:
          "No free public vlogs are ready for feed discovery yet. Create a public vlog first, then use it to grow fan requests.",
        emptyFreeTitle: "Prepare a free public vlog.",
        emptyPaidBody:
          "Paid fan-only vlogs are registered when you answer a fan's vlog request. Choose the request from the fan request inbox first.",
        emptyPaidTitle: "Choose a fan request first.",
        eyebrow: "FanLetter Vlog Manager",
        exclusiveNews: {
          active: "Exclusive report window active",
          body:
            "Assign a reporter to a free public vlog so only that reporter can publish the news report during the selected window.",
          clearedNotice: "The exclusive report window has been cleared.",
          codeLabel: "Reporter ID",
          codePlaceholder: "e.g. P2PZVJA5",
          durationLabel: "Window",
          helper: "Only completed reporter IDs can be assigned.",
          inactive: "No exclusive reporter",
          savedNotice: "The exclusive reporter has been assigned.",
          title: "Exclusive reporter",
          unavailable:
            "Exclusive reporting can only be assigned to published free vlogs.",
          until: "Until",
        },
        labels: {
          all: "All",
          archived: "Archived",
          author: "Creator",
          comments: "Comments",
          draft: "Drafts",
          free: "Free",
          freePublic: "Free public",
          generalContent: "General",
          likes: "Likes",
          maturity: "Maturity",
          nsfw: "NSFW",
          page: "Page",
          paid: "Paid",
          paidFanOnly: "Paid fan-only",
          published: "Published",
          reports: "Reports",
          results: "Vlogs",
          saves: "Saves",
          signals: "Fan signals",
          status: "Status",
          updated: "Updated",
        },
        loading: "Loading vlogs.",
        noMatching: "No vlogs match the current filters.",
        nsfwModeBody:
          "NSFW can only be enabled for paid uploaded videos that answer a fan request. Free public and AI-generated videos stay general.",
        nsfwNoticeOff: "The vlog is now marked general.",
        nsfwNoticeOn: "The vlog is now marked NSFW.",
        nsfwShortcutActiveBody:
          "The NSFW filter is active. Return to all maturity levels to compare it with general content.",
        nsfwShortcutBody:
          "Even when this page has no NSFW cards, the NSFW filter keeps every NSFW item available for review.",
        nsfwUnavailable:
          "Only paid fan-only videos uploaded directly can be marked NSFW.",
        paymentRequired:
          "Confirm FanLetter readiness to manage all vlogs.",
        searchPlaceholder: "Search by title, summary, or body",
        subtitle:
          "Separate free public vlogs and paid fan-only content, then manage published, draft, and archived states from one focused page.",
        title: "Manage all vlogs",
      };
}

function isVlogStatusFilter(value: string | null): value is VlogStatusFilter {
  return (
    value === "all" ||
    value === "archived" ||
    value === "draft" ||
    value === "published"
  );
}

function isVlogPriceFilter(value: string | null): value is VlogPriceFilter {
  return value === "all" || value === "free" || value === "paid";
}

function isVlogMaturityFilter(value: string | null): value is VlogMaturityFilter {
  return value === "all" || value === "general" || value === "nsfw";
}

function normalizePageValue(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function formatDateLabel(locale: Locale, value: string | null) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
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

function getPostVideoUrl(post: Pick<CreatorStudioPostRecord, "contentVideoUrls">) {
  return post.contentVideoUrls[0] ?? null;
}

function getUniqueImageUrls(imageUrls: string[]) {
  return Array.from(
    new Set(
      imageUrls
        .map((imageUrl) => imageUrl.trim())
        .filter((imageUrl) => Boolean(imageUrl)),
    ),
  );
}

function buildVlogCoverOptions(
  post: Pick<CreatorStudioPostRecord, "coverImageCandidates" | "coverImageUrl">,
): VlogCoverOption[] {
  const currentCoverUrl = post.coverImageUrl?.trim() ?? "";
  const seenUrls = new Set<string>();
  const options: VlogCoverOption[] = (post.coverImageCandidates ?? []).flatMap(
    (candidate) => {
      const imageUrl = candidate.url?.trim();

      if (!imageUrl || seenUrls.has(imageUrl)) {
        return [];
      }

      seenUrls.add(imageUrl);

      return [
        {
          candidateId: candidate.candidateId,
          contentType: candidate.contentType,
          height: candidate.height,
          imageUrl,
          inputValue: imageUrl,
          isSelected: Boolean(currentCoverUrl && currentCoverUrl === imageUrl),
          key: `${candidate.candidateId}:${imageUrl}`,
          placements: candidate.placements ?? [],
          source: candidate.source,
          timestampSec: candidate.timestampSec,
          width: candidate.width,
        },
      ];
    },
  );

  if (currentCoverUrl && !seenUrls.has(currentCoverUrl)) {
    options.unshift({
      candidateId: "current-cover",
      contentType: null,
      height: null,
      imageUrl: currentCoverUrl,
      inputValue: currentCoverUrl,
      isSelected: true,
      key: `current:${currentCoverUrl}`,
      placements: [],
      source: "current",
      timestampSec: null,
      width: null,
    });
  }

  return options;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getVlogCoverCropRect({
  crop,
  naturalSize,
}: {
  crop: VlogCoverCropState;
  naturalSize: VlogCoverNaturalSize | null;
}): VlogCoverCropRect | null {
  if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
    return null;
  }

  const sourceAspectRatio = naturalSize.width / naturalSize.height;
  const baseWidth =
    sourceAspectRatio >= VLOG_COVER_CROP_ASPECT_RATIO
      ? naturalSize.height * VLOG_COVER_CROP_ASPECT_RATIO
      : naturalSize.width;
  const baseHeight = baseWidth / VLOG_COVER_CROP_ASPECT_RATIO;
  const zoom = clampNumber(crop.zoom, 1, VLOG_COVER_CROP_MAX_ZOOM);
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

function getVlogCoverPreviewImageStyle({
  cropRect,
  naturalSize,
}: {
  cropRect: VlogCoverCropRect;
  naturalSize: VlogCoverNaturalSize;
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

async function createCroppedVlogCoverBlob({
  crop,
  sourceImageUrl,
}: {
  crop: VlogCoverCropState;
  sourceImageUrl: string;
}) {
  const image = await loadImageForCrop(sourceImageUrl);
  const naturalSize = {
    height: image.naturalHeight,
    width: image.naturalWidth,
  };
  const cropRect = getVlogCoverCropRect({ crop, naturalSize });

  if (!cropRect) {
    throw new Error("Could not read the selected cover image size.");
  }

  const canvas = document.createElement("canvas");
  canvas.height = VLOG_COVER_CROP_OUTPUT_HEIGHT;
  canvas.width = VLOG_COVER_CROP_OUTPUT_WIDTH;
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
    VLOG_COVER_CROP_OUTPUT_WIDTH,
    VLOG_COVER_CROP_OUTPUT_HEIGHT,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });

  if (!blob) {
    throw new Error("Could not encode the cover image.");
  }

  return blob;
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  const error =
    payload && typeof payload === "object" && "error" in payload
      ? payload.error
      : null;

  if (!response.ok || !payload) {
    throw new Error(error || fallback);
  }

  return payload as T;
}

function getStatusLabel(
  copy: ReturnType<typeof getCopy>,
  status: ContentPostStatus | "all",
) {
  if (status === "published") {
    return copy.labels.published;
  }

  if (status === "draft") {
    return copy.labels.draft;
  }

  if (status === "archived") {
    return copy.labels.archived;
  }

  return copy.labels.all;
}

function getPostPriceLabel(
  copy: ReturnType<typeof getCopy>,
  post: CreatorStudioPostRecord,
) {
  if (post.priceType === "paid") {
    return `${copy.labels.paid} · ${post.priceUsdt ?? "1"} USDT`;
  }

  return copy.labels.free;
}

function normalizeReporterCodeInput(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase();
}

function getExclusiveNewsReporterLabel(post: CreatorStudioPostRecord) {
  return (
    post.exclusiveNews.reporterName?.trim() ||
    post.exclusiveNews.reporterReferralCode?.trim() ||
    null
  );
}

function canAssignExclusiveNews(post: CreatorStudioPostRecord) {
  return post.priceType === "free" && post.status === "published";
}

function getPriceFilterLabel(
  copy: ReturnType<typeof getCopy>,
  price: VlogPriceFilter,
) {
  if (price === "paid") {
    return copy.labels.paidFanOnly;
  }

  if (price === "free") {
    return copy.labels.freePublic;
  }

  return copy.labels.all;
}

function getMaturityFilterLabel(
  copy: ReturnType<typeof getCopy>,
  maturity: VlogMaturityFilter,
) {
  if (maturity === "nsfw") {
    return copy.labels.nsfw;
  }

  if (maturity === "general") {
    return copy.labels.generalContent;
  }

  return copy.labels.all;
}

function getResultsHeading(
  copy: ReturnType<typeof getCopy>,
  price: VlogPriceFilter,
  status: VlogStatusFilter,
  maturity: VlogMaturityFilter,
) {
  const labels: string[] = [];

  if (price !== "all") {
    labels.push(getPriceFilterLabel(copy, price));
  }

  if (maturity !== "all") {
    labels.push(getMaturityFilterLabel(copy, maturity));
  }

  labels.push(getStatusLabel(copy, status));

  return labels.join(" · ");
}

export function FanletterVlogManagementPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: FANLETTER_VLOG_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_VLOG_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const fanRequestsHref = `${studioHref}#fan-requests`;
  const managerBaseHref = buildPathWithReferral(
    `/${locale}/fanletter/studio/vlogs`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: managerBaseHref },
  );
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const channelsHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/channels`, referralCode),
    { returnTo: managerBaseHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: managerBaseHref },
  );
  const appliedQuery = searchParams.get("q")?.trim() ?? "";
  const appliedStatus = isVlogStatusFilter(searchParams.get("status"))
    ? (searchParams.get("status") as VlogStatusFilter)
    : "all";
  const appliedPrice = isVlogPriceFilter(searchParams.get("price"))
    ? (searchParams.get("price") as VlogPriceFilter)
    : "all";
  const appliedMaturity = isVlogMaturityFilter(searchParams.get("maturity"))
    ? (searchParams.get("maturity") as VlogMaturityFilter)
    : "all";
  const appliedPage = normalizePageValue(searchParams.get("page"));
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [searchInput, setSearchInput] = useState(appliedQuery);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [activeCoverPostId, setActiveCoverPostId] = useState<string | null>(null);
  const [activeTeaserPostId, setActiveTeaserPostId] = useState<string | null>(
    null,
  );
  const [selectedCoverOptionKey, setSelectedCoverOptionKey] =
    useState<string | null>(null);
  const [savingCoverKey, setSavingCoverKey] = useState<string | null>(null);
  const [teaserImageError, setTeaserImageError] = useState<string | null>(null);
  const [generatingTeaserPostId, setGeneratingTeaserPostId] =
    useState<string | null>(null);
  const [deletingTeaserImageKey, setDeletingTeaserImageKey] =
    useState<string | null>(null);
  const [coverCrop, setCoverCrop] = useState<VlogCoverCropState>(
    DEFAULT_VLOG_COVER_CROP,
  );
  const [coverCropError, setCoverCropError] = useState<string | null>(null);
  const [coverNaturalSize, setCoverNaturalSize] =
    useState<VlogCoverNaturalSize | null>(null);
  const coverCropFrameRef = useRef<HTMLDivElement | null>(null);
  const coverCropDragRef = useRef<{
    initialCrop: VlogCoverCropState;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [state, setState] = useState<VlogManagementState>({
    error: null,
    member: memberSession.member,
    notice: null,
    pageInfo: null,
    posts: [],
    profile: null,
    status: "idle",
    summary: EMPTY_SUMMARY,
  });
  const profileCharacterName =
    state.profile?.characterPersona?.name?.trim() ||
    state.profile?.displayName?.trim() ||
    copy.title;
  const activeCoverPost =
    state.posts.find((post) => post.contentId === activeCoverPostId) ?? null;
  const activeTeaserPost =
    state.posts.find((post) => post.contentId === activeTeaserPostId) ?? null;
  const coverOptions = useMemo(
    () => (activeCoverPost ? buildVlogCoverOptions(activeCoverPost) : []),
    [activeCoverPost],
  );
  const selectedCoverOption = useMemo(() => {
    if (coverOptions.length === 0) {
      return null;
    }

    return (
      coverOptions.find((option) => option.key === selectedCoverOptionKey) ??
      coverOptions.find((option) => option.isSelected) ??
      coverOptions[0] ??
      null
    );
  }, [coverOptions, selectedCoverOptionKey]);
  const coverCropRect = useMemo(
    () =>
      getVlogCoverCropRect({
        crop: coverCrop,
        naturalSize: coverNaturalSize,
      }),
    [coverCrop, coverNaturalSize],
  );
  const coverPreviewImageStyle =
    coverCropRect && coverNaturalSize
      ? getVlogCoverPreviewImageStyle({
          cropRect: coverCropRect,
          naturalSize: coverNaturalSize,
        })
      : null;

  useEffect(() => {
    setSearchInput(appliedQuery);
  }, [appliedQuery]);

  useEffect(() => {
    if (!activeCoverPostId && !activeTeaserPostId) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeCoverPostId, activeTeaserPostId]);

  useEffect(() => {
    if (!activeCoverPostId && !activeTeaserPostId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveCoverPostId(null);
        setActiveTeaserPostId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeCoverPostId, activeTeaserPostId]);

  useEffect(() => {
    setCoverCrop(DEFAULT_VLOG_COVER_CROP);
    setCoverCropError(null);
    setCoverNaturalSize(null);
  }, [selectedCoverOptionKey]);

  const buildManagerHref = useCallback(
    (options?: {
      maturity?: VlogMaturityFilter;
      page?: number;
      price?: VlogPriceFilter;
      query?: string;
      status?: VlogStatusFilter;
    }) => {
      const page = options?.page ?? appliedPage;
      const price = options?.price ?? appliedPrice;
      const maturity = options?.maturity ?? appliedMaturity;
      const query = options?.query ?? appliedQuery;
      const status = options?.status ?? appliedStatus;

      return setPathSearchParams(managerBaseHref, {
        maturity: maturity !== "all" ? maturity : null,
        page: page > 1 ? String(page) : null,
        price: price !== "all" ? price : null,
        q: query || null,
        status: status !== "all" ? status : null,
      });
    },
    [
      appliedMaturity,
      appliedPage,
      appliedPrice,
      appliedQuery,
      appliedStatus,
      managerBaseHref,
    ],
  );
  const currentManagerHref = useMemo(() => buildManagerHref(), [buildManagerHref]);
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: currentManagerHref },
  );
  const salesHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/studio/sales`, referralCode),
    { returnTo: currentManagerHref },
  );

  const resolveEmail = useCallback(async () => {
    const resolved =
      email ??
      memberSession.email ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!resolved) {
      throw new Error(copy.connectRequired);
    }

    setEmail(resolved);
    return resolved;
  }, [copy.connectRequired, email, memberSession.email]);

  const loadVlogs = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      notice: null,
      status: "loading",
    }));

    let nextMember: MemberRecord | null = memberSession.member;

    try {
      const resolvedEmail = await resolveEmail();
      const params = new URLSearchParams({
        email: resolvedEmail,
        locale,
        maturity: appliedMaturity,
        media: "video",
        page: String(appliedPage),
        pageSize: String(VLOGS_PAGE_SIZE),
        price: appliedPrice,
        status: appliedStatus,
        walletAddress: accountAddress,
      });

      if (appliedQuery) {
        params.set("q", appliedQuery);
      }

      const postsUrl = `/api/content/posts?${params.toString()}`;
      let response = await fetch(postsUrl, { cache: "no-store" });

      if (response.status === 404) {
        const syncData = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email: resolvedEmail,
          locale,
          referredByCode: referralCode,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!syncData.ok) {
          throw new Error(syncData.error || copy.connectRequired);
        }

        if (syncData.member) {
          nextMember = syncData.member;
          updateMemberSession({
            email: syncData.member.email,
            member: syncData.member,
            walletAddress: accountAddress,
          });
        }

        if (syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        response = await fetch(postsUrl, { cache: "no-store" });
      }

      const data = await readApiJson<CreatorStudioPostsResponse>(
        response,
        copy.loading,
      );
      nextMember = data.member;

      if (
        data.pageInfo.totalCount > 0 &&
        data.pageInfo.totalPages < appliedPage
      ) {
        router.replace(
          buildManagerHref({
            page: data.pageInfo.totalPages,
          }),
        );
        return;
      }

      setState({
        error: null,
        member: data.member,
        notice: null,
        pageInfo: data.pageInfo,
        posts: data.posts,
        profile: data.profile,
        status: "ready",
        summary: data.summary,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : copy.loading;
      setState((current) => ({
        error:
          errorMessage === "Completed signup is required."
            ? copy.paymentRequired
            : errorMessage,
        member: nextMember,
        notice: null,
        pageInfo: null,
        posts: [],
        profile: current.profile,
        status: "error",
        summary: EMPTY_SUMMARY,
      }));
    }
  }, [
    accountAddress,
    appliedMaturity,
    appliedPage,
    appliedPrice,
    appliedQuery,
    appliedStatus,
    buildManagerHref,
    chain.id,
    chain.name,
    copy.connectRequired,
    copy.loading,
    copy.paymentRequired,
    locale,
    referralCode,
    resolveEmail,
    router,
    memberSession.member,
    updateMemberSession,
  ]);

  useEffect(() => {
    if (connection.isResolving) {
      return;
    }

    if (connectionStatus !== "connected" || !accountAddress) {
      setState({
        error: null,
        member: memberSession.member,
        notice: null,
        pageInfo: null,
        posts: [],
        profile: null,
        status: "idle",
        summary: EMPTY_SUMMARY,
      });
      return;
    }

    void loadVlogs();
  }, [
    accountAddress,
    connection.isResolving,
    connectionStatus,
    loadVlogs,
    memberSession.member,
  ]);

  const resolveMemberEmail = useCallback(async () => {
    return resolveEmail();
  }, [resolveEmail]);

  async function updatePostStatus(
    post: CreatorStudioPostRecord,
    nextStatus: "archived" | "published",
  ) {
    if (!accountAddress) {
      return;
    }

    setUpdatingPostId(post.contentId);

    try {
      const resolvedEmail = await resolveMemberEmail();
      const successNotice =
        nextStatus === "published"
          ? locale === "ko"
            ? "브이로그가 공개되었습니다."
            : "The vlog has been published."
          : locale === "ko"
            ? "브이로그가 보관되었습니다."
            : "The vlog has been archived.";
      const response = await fetch(`/api/content/posts/${post.contentId}`, {
        body: JSON.stringify({
          email: resolvedEmail,
          status: nextStatus,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      await readApiJson<ContentPostMutationResponse>(response, copy.loading);
      await loadVlogs();
      setState((current) => ({
        ...current,
        error: null,
        notice: successNotice,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.loading,
        notice: null,
      }));
    } finally {
      setUpdatingPostId(null);
    }
  }

  async function updatePostMaturity(
    post: CreatorStudioPostRecord,
    nextContentMaturityRating: ContentMaturityRating,
  ) {
    if (!accountAddress) {
      return;
    }

    setUpdatingPostId(post.contentId);

    try {
      const resolvedEmail = await resolveMemberEmail();
      const response = await fetch(`/api/content/posts/${post.contentId}`, {
        body: JSON.stringify({
          contentMaturityRating: nextContentMaturityRating,
          email: resolvedEmail,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      await readApiJson<ContentPostMutationResponse>(response, copy.loading);
      await loadVlogs();
      setState((current) => ({
        ...current,
        error: null,
        notice:
          nextContentMaturityRating === "nsfw"
            ? copy.nsfwNoticeOn
            : copy.nsfwNoticeOff,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.loading,
        notice: null,
      }));
    } finally {
      setUpdatingPostId(null);
    }
  }

  async function updatePostExclusiveNews({
    durationHours,
    post,
    reporterReferralCode,
  }: {
    durationHours: number | null;
    post: CreatorStudioPostRecord;
    reporterReferralCode: string | null;
  }) {
    if (!accountAddress) {
      return;
    }

    setUpdatingPostId(post.contentId);

    try {
      const resolvedEmail = await resolveMemberEmail();
      const normalizedReporterCode = reporterReferralCode
        ? normalizeReporterCodeInput(reporterReferralCode)
        : null;
      const response = await fetch(`/api/content/posts/${post.contentId}`, {
        body: JSON.stringify({
          email: resolvedEmail,
          exclusiveNewsDurationHours: normalizedReporterCode ? durationHours : null,
          exclusiveNewsReporterReferralCode: normalizedReporterCode,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = await readApiJson<ContentPostMutationResponse>(
        response,
        copy.loading,
      );

      setState((current) => ({
        ...current,
        error: null,
        notice: normalizedReporterCode
          ? copy.exclusiveNews.savedNotice
          : copy.exclusiveNews.clearedNotice,
        posts: current.posts.map((currentPost) =>
          currentPost.contentId === data.content.contentId
            ? {
                ...currentPost,
                ...data.content,
              }
            : currentPost,
        ),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.loading,
        notice: null,
      }));
    } finally {
      setUpdatingPostId(null);
    }
  }

  const openCoverModal = useCallback((post: CreatorStudioPostRecord) => {
    const options = buildVlogCoverOptions(post);
    const selectedOption =
      options.find((option) => option.isSelected) ?? options[0] ?? null;

    setActiveCoverPostId(post.contentId);
    setSelectedCoverOptionKey(selectedOption?.key ?? null);
    setSavingCoverKey(null);
    setCoverCrop(DEFAULT_VLOG_COVER_CROP);
    setCoverCropError(null);
    setCoverNaturalSize(null);
  }, []);

  const savePostCoverImage = useCallback(
    async ({
      coverImageUrl,
      post,
      resolvedEmail,
      savingKey,
    }: {
      coverImageUrl: string;
      post: CreatorStudioPostRecord;
      resolvedEmail?: string;
      savingKey: string;
    }) => {
      if (!accountAddress) {
        return;
      }

      setSavingCoverKey(savingKey);
      setUpdatingPostId(post.contentId);
      setCoverCropError(null);

      try {
        const emailForRequest = resolvedEmail ?? (await resolveMemberEmail());
        const response = await fetch(`/api/content/posts/${post.contentId}`, {
          body: JSON.stringify({
            coverImageUrl,
            email: emailForRequest,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const data = await readApiJson<ContentPostMutationResponse>(
          response,
          copy.cover.saveFailed,
        );

        setState((current) => ({
          ...current,
          error: null,
          notice: copy.cover.savedNotice,
          posts: current.posts.map((currentPost) =>
            currentPost.contentId === data.content.contentId
              ? {
                  ...currentPost,
                  coverImageCandidates: data.content.coverImageCandidates,
                  coverImageUrl: data.content.coverImageUrl,
                  updatedAt: data.content.updatedAt,
                }
              : currentPost,
          ),
        }));
        setSelectedCoverOptionKey(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : copy.cover.saveFailed;

        setCoverCropError(message);
        setState((current) => ({
          ...current,
          error: message,
          notice: null,
        }));
      } finally {
        setSavingCoverKey(null);
        setUpdatingPostId(null);
      }
    },
    [
      accountAddress,
      copy.cover.saveFailed,
      copy.cover.savedNotice,
      resolveMemberEmail,
    ],
  );

  const selectOriginalCover = useCallback(async () => {
    if (!activeCoverPost || !selectedCoverOption) {
      return;
    }

    await savePostCoverImage({
      coverImageUrl: selectedCoverOption.inputValue,
      post: activeCoverPost,
      savingKey: selectedCoverOption.key,
    });
  }, [activeCoverPost, savePostCoverImage, selectedCoverOption]);

  const deleteSelectedCoverCandidate = useCallback(async () => {
    if (
      !activeCoverPost ||
      !selectedCoverOption ||
      selectedCoverOption.source === "current" ||
      !accountAddress
    ) {
      return;
    }

    const savingKey = `delete:${selectedCoverOption.key}`;
    const remainingCandidates = activeCoverPost.coverImageCandidates.filter(
      (candidate) => candidate.url !== selectedCoverOption.inputValue,
    );
    const deletedCurrentCover =
      activeCoverPost.coverImageUrl === selectedCoverOption.inputValue;
    const nextCoverImageUrl = deletedCurrentCover
      ? remainingCandidates[0]?.url ?? null
      : activeCoverPost.coverImageUrl;

    setSavingCoverKey(savingKey);
    setUpdatingPostId(activeCoverPost.contentId);
    setCoverCropError(null);

    try {
      const emailForRequest = await resolveMemberEmail();
      const response = await fetch(
        `/api/content/posts/${activeCoverPost.contentId}`,
        {
          body: JSON.stringify({
            coverImageCandidates: remainingCandidates,
            coverImageUrl: nextCoverImageUrl,
            email: emailForRequest,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        },
      );
      const data = await readApiJson<ContentPostMutationResponse>(
        response,
        copy.cover.deleteFailed,
      );
      const nextOptions = buildVlogCoverOptions({
        coverImageCandidates: data.content.coverImageCandidates,
        coverImageUrl: data.content.coverImageUrl,
      });

      setState((current) => ({
        ...current,
        error: null,
        notice: copy.cover.deletedNotice,
        posts: current.posts.map((currentPost) =>
          currentPost.contentId === data.content.contentId
            ? {
                ...currentPost,
                coverImageCandidates: data.content.coverImageCandidates,
                coverImageUrl: data.content.coverImageUrl,
                updatedAt: data.content.updatedAt,
              }
            : currentPost,
        ),
      }));
      setSelectedCoverOptionKey(
        nextOptions.find((option) => option.isSelected)?.key ??
          nextOptions[0]?.key ??
          null,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.cover.deleteFailed;

      setCoverCropError(message);
      setState((current) => ({
        ...current,
        error: message,
        notice: null,
      }));
    } finally {
      setSavingCoverKey(null);
      setUpdatingPostId(null);
    }
  }, [
    accountAddress,
    activeCoverPost,
    copy.cover.deleteFailed,
    copy.cover.deletedNotice,
    resolveMemberEmail,
    selectedCoverOption,
  ]);

  const uploadCroppedCover = useCallback(
    async ({
      post,
      resolvedEmail,
      sourceImageUrl,
    }: {
      post: CreatorStudioPostRecord;
      resolvedEmail: string;
      sourceImageUrl: string;
    }) => {
      if (!accountAddress) {
        throw new Error(copy.connectRequired);
      }

      const blob = await createCroppedVlogCoverBlob({
        crop: coverCrop,
        sourceImageUrl,
      });
      const file = new File([blob], `fanletter-vlog-cover-${post.contentId}.jpg`, {
        type: "image/jpeg",
      });
      const formData = new FormData();

      formData.set("email", resolvedEmail);
      formData.set("file", file);
      formData.set("walletAddress", accountAddress);

      const response = await fetch("/api/content/posts/upload", {
        body: formData,
        method: "POST",
      });
      const data = await readApiJson<VlogCoverUploadResponse>(
        response,
        copy.cover.cropFailed,
      );

      return data.url;
    },
    [accountAddress, copy.connectRequired, copy.cover.cropFailed, coverCrop],
  );

  const saveCroppedCover = useCallback(async () => {
    if (!activeCoverPost || !selectedCoverOption) {
      return;
    }

    const savingKey = `crop:${selectedCoverOption.key}`;

    setSavingCoverKey(savingKey);
    setCoverCropError(null);

    try {
      const resolvedEmail = await resolveMemberEmail();
      const croppedCoverUrl = await uploadCroppedCover({
        post: activeCoverPost,
        resolvedEmail,
        sourceImageUrl: selectedCoverOption.inputValue,
      });

      await savePostCoverImage({
        coverImageUrl: croppedCoverUrl,
        post: activeCoverPost,
        resolvedEmail,
        savingKey,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.cover.cropFailed;

      setCoverCropError(message);
      setSavingCoverKey(null);
    }
  }, [
    activeCoverPost,
    copy.cover.cropFailed,
    resolveMemberEmail,
    savePostCoverImage,
    selectedCoverOption,
    uploadCroppedCover,
  ]);

  const openTeaserModal = useCallback(
    (post: CreatorStudioPostRecord) => {
      setActiveTeaserPostId(post.contentId);
      setTeaserImageError(null);
      setDeletingTeaserImageKey(null);
      setGeneratingTeaserPostId(null);
    },
    [],
  );

  const savePostTeaserImages = useCallback(
    async ({
      failureMessage,
      nextContentImageUrls,
      notice,
      post,
    }: {
      failureMessage: string;
      nextContentImageUrls: string[];
      notice: string;
      post: CreatorStudioPostRecord;
    }) => {
      if (!accountAddress) {
        throw new Error(copy.connectRequired);
      }

      const resolvedEmail = await resolveMemberEmail();
      const response = await fetch(`/api/content/posts/${post.contentId}`, {
        body: JSON.stringify({
          contentImageUrls: getUniqueImageUrls(nextContentImageUrls).slice(
            0,
            VLOG_TEASER_IMAGE_LIMIT,
          ),
          email: resolvedEmail,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = await readApiJson<ContentPostMutationResponse>(
        response,
        failureMessage,
      );

      setState((current) => ({
        ...current,
        error: null,
        notice,
        posts: current.posts.map((currentPost) =>
          currentPost.contentId === data.content.contentId
            ? {
                ...currentPost,
                contentImageCount: data.content.contentImageCount,
                contentImageUrls: data.content.contentImageUrls,
                updatedAt: data.content.updatedAt,
              }
            : currentPost,
        ),
      }));
    },
    [accountAddress, copy.connectRequired, resolveMemberEmail],
  );

  const deleteTeaserImage = useCallback(
    async (imageUrl: string) => {
      if (!activeTeaserPost) {
        return;
      }

      const deletingKey = `${activeTeaserPost.contentId}:${imageUrl}`;
      setDeletingTeaserImageKey(deletingKey);
      setTeaserImageError(null);

      try {
        await savePostTeaserImages({
          failureMessage: copy.teasers.deleteFailed,
          nextContentImageUrls: activeTeaserPost.contentImageUrls.filter(
            (currentUrl) => currentUrl !== imageUrl,
          ),
          notice: copy.teasers.deletedNotice,
          post: activeTeaserPost,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : copy.teasers.deleteFailed;

        setTeaserImageError(message);
        setState((current) => ({
          ...current,
          error: message,
          notice: null,
        }));
      } finally {
        setDeletingTeaserImageKey(null);
      }
    },
    [
      activeTeaserPost,
      copy.teasers.deleteFailed,
      copy.teasers.deletedNotice,
      savePostTeaserImages,
    ],
  );

  const addVideoFrames = useCallback(async () => {
    if (!activeTeaserPost || !accountAddress) {
      return;
    }

    try {
      const remainingSlots =
        VLOG_TEASER_IMAGE_LIMIT - activeTeaserPost.contentImageUrls.length;

      if (remainingSlots <= 0) {
        throw new Error(
          copy.teasers.limit(formatNumber(VLOG_TEASER_IMAGE_LIMIT, locale)),
        );
      }

      const videoUrl = getPostVideoUrl(activeTeaserPost);

      if (!videoUrl) {
        throw new Error(copy.teasers.noVideo);
      }

      setGeneratingTeaserPostId(activeTeaserPost.contentId);
      setTeaserImageError(null);

      const frameCount = Math.min(remainingSlots, 6);
      const frames = await captureVideoCoverFramesFromUrl(
        videoUrl,
        activeTeaserPost.title.trim() || activeTeaserPost.contentId,
        { count: frameCount },
      );

      if (frames.length === 0) {
        throw new Error(copy.teasers.addFailed);
      }

      const resolvedEmail = await resolveMemberEmail();
      const uploadedFrameUrls: string[] = [];

      for (const frame of frames.slice(0, remainingSlots)) {
        const formData = new FormData();

        formData.set("email", resolvedEmail);
        formData.set("file", frame.file);
        formData.set("walletAddress", accountAddress);

        const response = await fetch("/api/content/posts/upload", {
          body: formData,
          method: "POST",
        });
        const uploadedFrame = await readApiJson<VlogCoverUploadResponse>(
          response,
          copy.teasers.addFailed,
        );

        uploadedFrameUrls.push(uploadedFrame.url);
      }

      if (uploadedFrameUrls.length === 0) {
        throw new Error(copy.teasers.addFailed);
      }

      await savePostTeaserImages({
        failureMessage: copy.teasers.addFailed,
        nextContentImageUrls: [
          ...uploadedFrameUrls,
          ...activeTeaserPost.contentImageUrls,
        ],
        notice: copy.teasers.addNotice,
        post: activeTeaserPost,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.teasers.addFailed;

      setTeaserImageError(message);
      setState((current) => ({
        ...current,
        error: message,
        notice: null,
      }));
    } finally {
      setGeneratingTeaserPostId(null);
    }
  }, [
    accountAddress,
    activeTeaserPost,
    copy.teasers,
    locale,
    resolveMemberEmail,
    savePostTeaserImages,
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

  const isInitialLoading =
    state.status === "loading" &&
    !state.pageInfo &&
    state.posts.length === 0 &&
    !state.error;
  const filterItems = [
    {
      count: state.summary.statusFilters.all,
      key: "all" as const,
      label: copy.labels.all,
    },
    {
      count: state.summary.statusFilters.published,
      key: "published" as const,
      label: copy.labels.published,
    },
    {
      count: state.summary.statusFilters.draft,
      key: "draft" as const,
      label: copy.labels.draft,
    },
    {
      count: state.summary.statusFilters.archived,
      key: "archived" as const,
      label: copy.labels.archived,
    },
  ];
  const priceFilterItems = [
    {
      count: state.summary.all,
      key: "all" as const,
      label: copy.labels.all,
    },
    {
      count: state.summary.free,
      key: "free" as const,
      label: copy.labels.freePublic,
    },
    {
      count: state.summary.paid,
      key: "paid" as const,
      label: copy.labels.paidFanOnly,
    },
  ];
  const maturityFilterItems = [
    {
      count: state.summary.maturityFilters.all,
      key: "all" as const,
      label: copy.labels.all,
    },
    {
      count: state.summary.maturityFilters.general,
      key: "general" as const,
      label: copy.labels.generalContent,
    },
    {
      count: state.summary.maturityFilters.nsfw,
      key: "nsfw" as const,
      label: copy.labels.nsfw,
    },
  ];
  const heroPrimaryHref =
    appliedPrice === "paid" ? fanRequestsHref : createHref;
  const heroPrimaryIcon = appliedPrice === "paid" ? LockKeyhole : Plus;
  const heroPrimaryLabel =
    appliedPrice === "paid" ? copy.actions.fanRequests : copy.actions.create;
  const heroSecondaryHref =
    appliedPrice === "paid" ? salesHref : feedHref;
  const heroSecondaryIcon = appliedPrice === "paid" ? Coins : Eye;
  const heroSecondaryLabel =
    appliedPrice === "paid" ? copy.actions.sales : copy.actions.feed;
  const HeroPrimaryIcon = heroPrimaryIcon;
  const HeroSecondaryIcon = heroSecondaryIcon;
  const priceModeBody =
    appliedPrice === "paid"
      ? locale === "ko"
        ? "유료 팬 전용 콘텐츠는 팬 요청을 선택한 뒤 답장 업로드로 등록하고, 결제 열람과 판매 내역을 함께 관리합니다."
        : "Paid fan-only content starts from a selected fan request, then connects reply uploads, unlocks, and sales."
      : appliedPrice === "free"
        ? locale === "ko"
          ? "무료 공개 브이로그는 피드 유입과 팬 요청을 만드는 콘텐츠로 관리합니다."
          : "Free public vlogs are managed for feed discovery and fan-request growth."
        : locale === "ko"
          ? "무료 공개와 유료 팬 전용을 분리해서 운영 상태를 빠르게 전환합니다."
          : "Switch between free public and paid fan-only operations without mixing the workflows.";
  const hasResultNarrowing = Boolean(
    appliedQuery || appliedStatus !== "all" || appliedMaturity !== "all",
  );
  const emptyState =
    appliedPrice === "paid"
      ? {
          actionHref: fanRequestsHref,
          actionLabel: copy.actions.fanRequests,
          body: copy.emptyPaidBody,
          Icon: LockKeyhole,
          title: copy.emptyPaidTitle,
        }
      : appliedPrice === "free"
        ? {
            actionHref: createHref,
            actionLabel: copy.actions.create,
            body: copy.emptyFreeBody,
            Icon: Plus,
            title: copy.emptyFreeTitle,
          }
        : {
            actionHref: createHref,
            actionLabel: copy.actions.create,
            body: copy.emptyBody,
            Icon: Plus,
            title: copy.emptyTitle,
          };
  const EmptyStateIcon = emptyState.Icon;
  const nsfwContentCount = state.summary.maturityFilters.nsfw;
  const shouldShowNsfwManagementShortcut =
    state.posts.length > 0 && nsfwContentCount > 0;
  const nsfwManagementHref = buildManagerHref({
    maturity: appliedMaturity === "nsfw" ? "all" : "nsfw",
    page: 1,
  });
  const nsfwManagementLabel =
    appliedMaturity === "nsfw"
      ? copy.actions.viewAllMaturity
      : copy.actions.viewNsfw;
  const nsfwManagementBody =
    appliedMaturity === "nsfw"
      ? copy.nsfwShortcutActiveBody
      : copy.nsfwShortcutBody;
  const activeTeaserImageUrls = activeTeaserPost?.contentImageUrls ?? [];
  const canAddVideoFrames = Boolean(
    activeTeaserPost &&
      activeTeaserImageUrls.length < VLOG_TEASER_IMAGE_LIMIT &&
      getPostVideoUrl(activeTeaserPost) &&
      !generatingTeaserPostId,
  );

  function renderBlockedState() {
    if (connection.isResolving) {
      return <MessagePanel>{copy.loading}</MessagePanel>;
    }

    if (connection.isDisconnected) {
      return (
        <MessagePanel>
          {copy.connectRequired}
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
            href={connectHref}
          >
            <WalletCards className="size-4" />
            {copy.actions.connect}
          </Link>
        </MessagePanel>
      );
    }

    const signupRequired =
      state.error &&
      (state.error === copy.paymentRequired ||
        (state.member ? state.member.status !== "completed" : false));

    if (signupRequired) {
      return (
        <MessagePanel tone="error">
          {state.error || copy.paymentRequired}
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
            href={activateHref}
          >
            <ShieldCheck className="size-4" />
            {locale === "ko" ? "가입 완료하기" : "Complete signup"}
          </Link>
        </MessagePanel>
      );
    }

    return null;
  }

  const blockedState = renderBlockedState();

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="px-4 pb-8 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] transition hover:bg-white/[0.08]"
              href={studioHref}
              title={copy.actions.back}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link
              className="flex min-w-0 items-center gap-2"
              href={buildPathWithReferral(`/${locale}/fanletter`, referralCode)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-sm font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden xl:inline-flex"
                locale={locale}
              />
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
              <button
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] transition hover:bg-white/[0.08] disabled:opacity-50"
                disabled={isInitialLoading}
                onClick={() => {
                  void loadVlogs();
                }}
                title={copy.actions.refresh}
                type="button"
              >
                <RefreshCw
                  className={`size-5 ${isInitialLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </header>

          <div className="mt-4 flex xl:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-end lg:py-14">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/62">
                {copy.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#6cff89]"
                  href={heroPrimaryHref}
                >
                  <HeroPrimaryIcon className="size-4" />
                  {heroPrimaryLabel}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-4 text-sm font-semibold !text-white transition hover:bg-white/[0.08]"
                  href={heroSecondaryHref}
                >
                  <HeroSecondaryIcon className="size-4" />
                  {heroSecondaryLabel}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-4 text-sm font-semibold !text-white transition hover:bg-white/[0.08]"
                  href={channelsHref}
                >
                  <Sparkles className="size-4" />
                  {copy.actions.channels}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric
                label={copy.labels.all}
                loading={isInitialLoading}
                value={formatNumber(state.summary.all, locale)}
              />
              <HeroMetric
                label={copy.labels.freePublic}
                loading={isInitialLoading}
                value={formatNumber(state.summary.free, locale)}
              />
              <HeroMetric
                label={copy.labels.paidFanOnly}
                loading={isInitialLoading}
                value={formatNumber(state.summary.paid, locale)}
              />
              <HeroMetric
                label={copy.labels.published}
                loading={isInitialLoading}
                value={formatNumber(state.summary.published, locale)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-8 text-black sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_42px_rgba(8,18,12,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
                  {copy.labels.status}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                  {profileCharacterName}
                </h2>
              </div>
              <span className="flex size-11 items-center justify-center rounded-lg bg-black text-white">
                <Clapperboard className="size-5" />
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              <SideMetric
                Icon={Video}
                label={copy.labels.results}
                loading={isInitialLoading}
                value={formatNumber(state.summary.all, locale)}
              />
              <SideMetric
                Icon={ShieldCheck}
                label={copy.labels.freePublic}
                loading={isInitialLoading}
                value={formatNumber(state.summary.free, locale)}
              />
              <SideMetric
                Icon={LockKeyhole}
                label={copy.labels.paidFanOnly}
                loading={isInitialLoading}
                value={formatNumber(state.summary.paid, locale)}
              />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
                    {copy.labels.results}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                    {getResultsHeading(
                      copy,
                      appliedPrice,
                      appliedStatus,
                      appliedMaturity,
                    )}
                  </h2>
                </div>
                {state.notice ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#44f26e]/40 bg-[#44f26e]/12 px-3 py-2 text-sm font-semibold text-[#0c5f24]">
                    <Check className="size-4" />
                    <span>{state.notice}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-2 md:grid-cols-3">
                {priceFilterItems.map((item) => (
                  <Link
                    className={`group min-h-20 rounded-lg border p-4 text-left transition ${
                      appliedPrice === item.key
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-[#f6f8f4] text-black hover:border-black/20 hover:bg-white"
                    }`}
                    href={buildManagerHref({
                      page: 1,
                      price: item.key,
                    })}
                    key={item.key}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          appliedPrice === item.key
                            ? "bg-white text-black"
                            : "bg-black/[0.06] text-black/62"
                        }`}
                      >
                        {formatNumber(item.count, locale)}
                      </span>
                    </span>
                    <span
                      className={`mt-2 block text-xs font-medium leading-5 ${
                        appliedPrice === item.key ? "text-white/62" : "text-black/52"
                      }`}
                    >
                      {item.key === "paid"
                        ? locale === "ko"
                          ? "결제와 판매 흐름 관리"
                          : "Payment and sales workflow"
                        : item.key === "free"
                          ? locale === "ko"
                            ? "피드 공개와 유입 관리"
                            : "Feed publishing workflow"
                          : locale === "ko"
                            ? "전체 브이로그 보기"
                            : "View every vlog"}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-black/10 bg-[#f6f8f4] p-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-medium leading-6 text-black/62">
                  {priceModeBody}
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
                    href={heroPrimaryHref}
                  >
                    <HeroPrimaryIcon className="size-4" />
                    {heroPrimaryLabel}
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold !text-black transition hover:bg-black/[0.04]"
                    href={heroSecondaryHref}
                  >
                    <HeroSecondaryIcon className="size-4" />
                    {heroSecondaryLabel}
                  </Link>
                </div>
              </div>

              <form
                className="mt-5 flex flex-col gap-3 md:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  router.replace(
                    buildManagerHref({
                      page: 1,
                      query: searchInput.trim(),
                    }),
                  );
                }}
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{copy.actions.search}</span>
                  <div className="flex h-12 items-center gap-3 rounded-full border border-black/10 bg-[#f6f8f4] px-4">
                    <Search className="size-4 text-black/36" />
                    <input
                      className="w-full min-w-0 border-0 bg-transparent text-sm font-medium text-black outline-none placeholder:text-black/36"
                      onChange={(event) => {
                        setSearchInput(event.target.value);
                      }}
                      placeholder={copy.searchPlaceholder}
                      value={searchInput}
                    />
                  </div>
                </label>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/82"
                  type="submit"
                >
                  <Search className="size-4" />
                  {copy.actions.search}
                </button>
              </form>

              <div className="mt-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                {filterItems.map((item) => (
                  <Link
                    className={`inline-flex min-h-11 items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                      appliedStatus === item.key
                        ? "border-black bg-black !text-white"
                        : "border-black/10 bg-white text-black hover:border-black/20 hover:bg-[#f6f8f4]"
                    }`}
                    href={buildManagerHref({
                      page: 1,
                      status: item.key,
                    })}
                    key={item.key}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[0.72rem] ${
                        appliedStatus === item.key
                          ? "bg-white text-black"
                          : "bg-black/[0.06] text-black/62"
                      }`}
                    >
                      {formatNumber(item.count, locale)}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-black/10 bg-[#f6f8f4] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
                      <ShieldAlert className="size-3.5" />
                      {copy.labels.maturity}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-black/62">
                      {copy.nsfwModeBody}
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-3 gap-2">
                    {maturityFilterItems.map((item) => (
                      <Link
                        className={`inline-flex min-h-10 items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          appliedMaturity === item.key
                            ? "border-black bg-black !text-white"
                            : "border-black/10 bg-white text-black hover:border-black/20"
                        }`}
                        href={buildManagerHref({
                          maturity: item.key,
                          page: 1,
                        })}
                        key={item.key}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[0.72rem] ${
                            appliedMaturity === item.key
                              ? "bg-white text-black"
                              : "bg-black/[0.06] text-black/62"
                          }`}
                        >
                          {formatNumber(item.count, locale)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {blockedState ? (
              <div className="mt-5">{blockedState}</div>
            ) : isInitialLoading ? (
              <VlogsLoadingSkeleton copy={copy} />
            ) : state.error ? (
              <div className="mt-5">
                <MessagePanel tone="error">{state.error}</MessagePanel>
              </div>
            ) : state.posts.length === 0 ? (
              <div className="mt-5">
                <MessagePanel>
                  {hasResultNarrowing ? (
                    copy.noMatching
                  ) : (
                    <>
                      <span className="block text-lg font-semibold">
                        {emptyState.title}
                      </span>
                      <span className="mt-2 block">{emptyState.body}</span>
                      <Link
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
                        href={emptyState.actionHref}
                      >
                        <EmptyStateIcon className="size-4" />
                        {emptyState.actionLabel}
                      </Link>
                    </>
                  )}
                </MessagePanel>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {state.posts.map((post) => (
                  <VlogManagerCard
                    copy={copy}
                    currentManagerHref={currentManagerHref}
                    isUpdating={updatingPostId === post.contentId}
                    key={post.contentId}
                    locale={locale}
                    onArchive={() => {
                      void updatePostStatus(post, "archived");
                    }}
                    onChangeCover={() => openCoverModal(post)}
                    onManageTeasers={() => openTeaserModal(post)}
                    onClearExclusive={() => {
                      void updatePostExclusiveNews({
                        durationHours: null,
                        post,
                        reporterReferralCode: null,
                      });
                    }}
                    onSaveExclusive={(reporterReferralCode, durationHours) => {
                      void updatePostExclusiveNews({
                        durationHours,
                        post,
                        reporterReferralCode,
                      });
                    }}
                    onToggleMaturity={(nextContentMaturityRating) => {
                      void updatePostMaturity(post, nextContentMaturityRating);
                    }}
                    onPublish={() => {
                      void updatePostStatus(post, "published");
                    }}
                    post={post}
                    referralCode={referralCode}
                  />
                ))}

                {shouldShowNsfwManagementShortcut ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-[#e04f72]/20 bg-[#fff5f7] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#2b0d16] text-white">
                        <ShieldAlert className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-black">
                          {copy.labels.nsfw} ·{" "}
                          {formatNumber(nsfwContentCount, locale)}{" "}
                          {copy.labels.results}
                        </p>
                        <p className="mt-1 text-sm font-medium leading-6 text-black/58">
                          {nsfwManagementBody}
                        </p>
                      </div>
                    </div>
                    <Link
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#2b0d16] px-4 text-sm font-semibold !text-white transition hover:bg-[#451322]"
                      href={nsfwManagementHref}
                    >
                      {nsfwManagementLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                ) : null}

                {state.pageInfo ? (
                  <div className="flex flex-col gap-3 border-t border-black/10 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-black/50">
                      {formatNumber(state.pageInfo.totalCount, locale)}{" "}
                      {copy.labels.results} · {copy.labels.page}{" "}
                      {state.pageInfo.page}/{state.pageInfo.totalPages}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {state.pageInfo.hasPreviousPage ? (
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
                          href={buildManagerHref({
                            page: state.pageInfo.page - 1,
                          })}
                        >
                          <ArrowLeft className="size-4" />
                          {copy.actions.previous}
                        </Link>
                      ) : null}
                      {state.pageInfo.hasNextPage ? (
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
                          href={buildManagerHref({
                            page: state.pageInfo.page + 1,
                          })}
                        >
                          {copy.actions.next}
                          <ArrowRight className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
      {activeCoverPost ? (
        <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/66 p-0 backdrop-blur-sm sm:items-center sm:px-6 sm:py-4">
          <div
            aria-labelledby="fanletter-vlog-cover-modal-title"
            aria-modal="true"
            className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-white/12 bg-[#f5f6f1] text-[#111510] shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg"
            role="dialog"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
                  <ImageIcon className="size-4" />
                  {copy.cover.modalEyebrow}
                </p>
                <h2
                  className="mt-1.5 break-words text-xl font-black leading-tight tracking-normal [word-break:keep-all] sm:mt-2 sm:text-2xl"
                  id="fanletter-vlog-cover-modal-title"
                >
                  {copy.cover.modalTitle}
                </h2>
                <p className="mt-1.5 line-clamp-1 max-w-2xl text-sm font-medium leading-5 text-black/58 sm:mt-2 sm:line-clamp-2 sm:leading-6">
                  {activeCoverPost.title}
                </p>
                <p className="mt-1 hidden max-w-2xl text-sm font-medium leading-6 text-black/54 sm:block">
                  {copy.cover.modalBody}
                </p>
              </div>
              <button
                aria-label={copy.cover.modalClose}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-black/12 bg-[#f5f6f1] text-black/56 transition hover:border-black/24 hover:bg-white hover:text-black sm:size-10"
                onClick={() => setActiveCoverPostId(null)}
                type="button"
              >
                <X className="size-[1.125rem] sm:size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5 sm:py-4 sm:pb-4">
              {coverOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/14 bg-white px-4 py-10 text-center">
                  <ImageIcon className="mx-auto size-9 text-[#16702e]" />
                  <p className="mx-auto mt-3 max-w-sm text-sm font-bold leading-6 text-black/48">
                    {copy.cover.modalEmpty}
                  </p>
                </div>
              ) : (
                <>
                  <div className="-mx-3 grid snap-x snap-mandatory auto-cols-[8.25rem] grid-flow-col gap-2 overflow-x-auto px-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
                    {coverOptions.map((option, index) => {
                      const isEditing =
                        selectedCoverOption?.key === option.key ||
                        (!selectedCoverOption && option.isSelected);
                      const isSaving =
                        savingCoverKey === option.key ||
                        savingCoverKey === `crop:${option.key}`;
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
                          disabled={Boolean(savingCoverKey)}
                          key={option.key}
                          onClick={() => setSelectedCoverOptionKey(option.key)}
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
                                <Check className="size-3 shrink-0 text-[#44f26e] sm:size-3.5" />
                              ) : isSaving ? (
                                <Loader2 className="size-3 shrink-0 animate-spin text-[#44f26e] sm:size-3.5" />
                              ) : (
                                <ImageIcon className="size-3 shrink-0 text-[#44f26e] sm:size-3.5" />
                              )}
                              <span className="truncate">
                                {copy.cover.sourceLabels[option.source]}
                              </span>
                            </span>
                          </span>
                          <span className="flex min-h-[4.25rem] w-full flex-col p-2 sm:min-h-[5.4rem] sm:p-3">
                            <span className="line-clamp-2 text-xs font-black leading-4 text-[#111510] sm:line-clamp-1 sm:text-sm">
                              {isSaving
                                ? copy.cover.cropSaving
                                : option.isSelected
                                  ? copy.cover.optionCurrent
                                  : isEditing
                                    ? copy.cover.optionSelected
                                    : copy.cover.optionUse}
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

                  {selectedCoverOption ? (
                    <div className="mt-3 rounded-lg border border-black/10 bg-white p-3 sm:mt-4 sm:p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#111510]">
                            {copy.cover.cropLabel}
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-black/48">
                            {copy.cover.cropHelper}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row lg:shrink-0">
                          <button
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-black/12 px-2 py-2 text-center text-xs font-black leading-4 text-black/62 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:text-[#111510] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-3 sm:py-0"
                            disabled={
                              Boolean(savingCoverKey) ||
                              selectedCoverOption.isSelected
                            }
                            onClick={() => {
                              void selectOriginalCover();
                            }}
                            type="button"
                          >
                            {savingCoverKey === selectedCoverOption.key ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                            {savingCoverKey === selectedCoverOption.key
                              ? copy.cover.cropSaving
                              : copy.cover.cropOriginal}
                          </button>
                          <button
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#111510] px-2 py-2 text-center text-xs font-black leading-4 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-3 sm:py-0"
                            disabled={Boolean(savingCoverKey)}
                            onClick={() => {
                              void saveCroppedCover();
                            }}
                            type="button"
                          >
                            {savingCoverKey === `crop:${selectedCoverOption.key}` ? (
                              <Loader2 className="size-4 animate-spin text-[#44f26e]" />
                            ) : (
                              <Crop className="size-4 text-[#44f26e]" />
                            )}
                            {savingCoverKey === `crop:${selectedCoverOption.key}`
                              ? copy.cover.cropSaving
                              : copy.cover.cropSave}
                          </button>
                          {selectedCoverOption.source !== "current" ? (
                            <button
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2 py-2 text-center text-xs font-black leading-4 text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-3 sm:py-0"
                              disabled={Boolean(savingCoverKey)}
                              onClick={() => {
                                void deleteSelectedCoverCandidate();
                              }}
                              type="button"
                            >
                              {savingCoverKey ===
                              `delete:${selectedCoverOption.key}` ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              {savingCoverKey ===
                              `delete:${selectedCoverOption.key}`
                                ? copy.cover.cropSaving
                                : copy.cover.deleteCandidate}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
                        <div
                          className="relative aspect-video min-h-[10.5rem] cursor-grab touch-none overflow-hidden rounded-lg border border-black/10 bg-[#111510] active:cursor-grabbing sm:min-h-[12rem]"
                          onPointerCancel={handleCoverCropPointerEnd}
                          onPointerDown={handleCoverCropPointerDown}
                          onPointerMove={handleCoverCropPointerMove}
                          onPointerUp={handleCoverCropPointerEnd}
                          ref={coverCropFrameRef}
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
                                setCoverNaturalSize({
                                  height: image.naturalHeight,
                                  width: image.naturalWidth,
                                });
                              }
                            }}
                            src={selectedCoverOption.inputValue}
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
                              {copy.cover.cropZoom}
                            </span>
                            <span className="text-xs font-black text-[#16702e]">
                              {coverCrop.zoom.toFixed(2)}x
                            </span>
                          </div>
                          <input
                            aria-label={copy.cover.cropZoom}
                            className="mt-3 w-full accent-[#19b84b]"
                            max={VLOG_COVER_CROP_MAX_ZOOM}
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
                              setCoverCrop(DEFAULT_VLOG_COVER_CROP);
                            }}
                            type="button"
                          >
                            <RotateCcw className="size-3.5" />
                            {copy.cover.cropReset}
                          </button>
                          {coverCropError ? (
                            <p className="mt-3 text-xs font-bold leading-5 text-rose-700">
                              {coverCropError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {activeTeaserPost ? (
        <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/66 p-0 backdrop-blur-sm sm:items-center sm:px-6 sm:py-4">
          <div
            aria-labelledby="fanletter-vlog-teaser-modal-title"
            aria-modal="true"
            className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-white/12 bg-[#f5f6f1] text-[#111510] shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg"
            role="dialog"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
                  <Clapperboard className="size-4" />
                  {copy.teasers.modalEyebrow}
                </p>
                <h2
                  className="mt-1.5 break-words text-xl font-black leading-tight tracking-normal [word-break:keep-all] sm:mt-2 sm:text-2xl"
                  id="fanletter-vlog-teaser-modal-title"
                >
                  {copy.teasers.modalTitle}
                </h2>
                <p className="mt-1.5 line-clamp-1 max-w-2xl text-sm font-medium leading-5 text-black/58 sm:mt-2 sm:line-clamp-2 sm:leading-6">
                  {activeTeaserPost.title}
                </p>
                <p className="mt-1 hidden max-w-2xl text-sm font-medium leading-6 text-black/54 sm:block">
                  {copy.teasers.modalBody}
                </p>
              </div>
              <button
                aria-label={copy.teasers.modalClose}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-black/12 bg-[#f5f6f1] text-black/56 transition hover:border-black/24 hover:bg-white hover:text-black sm:size-10"
                onClick={() => setActiveTeaserPostId(null)}
                type="button"
              >
                <X className="size-[1.125rem] sm:size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5 sm:py-4 sm:pb-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                <section className="rounded-lg border border-black/10 bg-white p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#111510]">
                        {copy.teasers.sectionTitle}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-black/48">
                        {copy.teasers.helper}
                      </p>
                    </div>
                    <span className="inline-flex h-8 shrink-0 items-center rounded-full border border-[#16702e]/18 bg-[#ecfff0] px-3 text-xs font-black text-[#0c5f24]">
                      {copy.teasers.count(
                        formatNumber(activeTeaserImageUrls.length, locale),
                      )}
                    </span>
                  </div>

                  {activeTeaserImageUrls.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                      {activeTeaserImageUrls.map((imageUrl, index) => {
                        const deletingKey = `${activeTeaserPost.contentId}:${imageUrl}`;
                        const isDeleting =
                          deletingTeaserImageKey === deletingKey;

                        return (
                          <div
                            className="overflow-hidden rounded-lg border border-black/10 bg-[#f6f8f4]"
                            key={`${activeTeaserPost.contentId}:${imageUrl}:${index}`}
                          >
                            <div className="relative aspect-video bg-black">
                              <Image
                                alt=""
                                aria-hidden="true"
                                className="object-cover"
                                fill
                                loading={index === 0 ? "eager" : "lazy"}
                                sizes="(max-width: 640px) 45vw, 16rem"
                                src={imageUrl}
                                unoptimized={shouldBypassFanletterImageOptimization(
                                  imageUrl,
                                )}
                              />
                              <span className="absolute left-2 top-2 rounded-full bg-black/62 px-2 py-1 text-[0.62rem] font-black text-white/82 backdrop-blur">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <div className="p-2">
                              <button
                                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={
                                  Boolean(deletingTeaserImageKey) ||
                                  Boolean(generatingTeaserPostId)
                                }
                                onClick={() => {
                                  void deleteTeaserImage(imageUrl);
                                }}
                                type="button"
                              >
                                {isDeleting ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                                {copy.teasers.delete}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed border-black/14 bg-[#f6f8f4] px-4 py-10 text-center">
                      <ImageIcon className="mx-auto size-9 text-[#16702e]" />
                      <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-black/48">
                        {copy.teasers.empty}
                      </p>
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-black/10 bg-white p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#111510] text-[#44f26e]">
                      <Video className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#111510]">
                        {copy.teasers.generate}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-black/48">
                        {copy.teasers.limit(
                          formatNumber(VLOG_TEASER_IMAGE_LIMIT, locale),
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-black/10 bg-[#f6f8f4] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-black/38">
                      {locale === "ko" ? "원본 영상" : "Source video"}
                    </p>
                    {getPostVideoUrl(activeTeaserPost) ? (
                      <div className="mt-2 overflow-hidden rounded-lg bg-black">
                        <video
                          className="aspect-video w-full object-cover"
                          controls={false}
                          muted
                          playsInline
                          preload="metadata"
                          src={getPostVideoUrl(activeTeaserPost) ?? undefined}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 rounded-lg border border-dashed border-black/12 bg-white px-3 py-4 text-xs font-bold leading-5 text-black/46">
                        {copy.teasers.noVideo}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-bold leading-5 text-black/48">
                      {copy.teasers.modalBody}
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canAddVideoFrames}
                      onClick={() => {
                        void addVideoFrames();
                      }}
                      type="button"
                    >
                      {generatingTeaserPostId === activeTeaserPost.contentId ? (
                        <Loader2 className="size-4 animate-spin text-[#44f26e]" />
                      ) : (
                        <Clapperboard className="size-4 text-[#44f26e]" />
                      )}
                      {generatingTeaserPostId === activeTeaserPost.contentId
                        ? copy.teasers.generating
                        : copy.teasers.generate}
                    </button>
                  </div>
                  {teaserImageError ? (
                    <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">
                      {teaserImageError}
                    </p>
                  ) : null}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function HeroMetric({
  label,
  loading,
  value,
}: {
  label: string;
  loading: boolean;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/42">
        {label}
      </p>
      {loading ? (
        <div className="mt-4 h-8 w-16 rounded-full bg-white/10 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-normal text-white">
          {value}
        </p>
      )}
    </div>
  );
}

function SideMetric({
  Icon,
  label,
  loading,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  loading: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-[#f6f8f4] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#16702e]">
          <Icon className="size-4" />
        </span>
        <p className="truncate text-sm font-semibold text-black/58">{label}</p>
      </div>
      {loading ? (
        <div className="h-6 w-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
      ) : (
        <p className="text-xl font-semibold tracking-normal">{value}</p>
      )}
    </div>
  );
}

function VlogManagerCard({
  copy,
  currentManagerHref,
  isUpdating,
  locale,
  onArchive,
  onChangeCover,
  onClearExclusive,
  onManageTeasers,
  onPublish,
  onSaveExclusive,
  onToggleMaturity,
  post,
  referralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  currentManagerHref: string;
  isUpdating: boolean;
  locale: Locale;
  onArchive: () => void;
  onChangeCover: () => void;
  onClearExclusive: () => void;
  onManageTeasers: () => void;
  onPublish: () => void;
  onSaveExclusive: (reporterReferralCode: string, durationHours: number) => void;
  onToggleMaturity: (nextContentMaturityRating: ContentMaturityRating) => void;
  post: CreatorStudioPostRecord;
  referralCode: string | null;
}) {
  const videoUrl = getPostVideoUrl(post);
  const shouldBypassCoverImageOptimization =
    shouldBypassFanletterImageOptimization(post.coverImageUrl);
  const teaserImageUrls = post.contentImageUrls.slice(0, 5);
  const isNsfw = post.contentMaturityRating === "nsfw";
  const canManageNsfw =
    post.status !== "archived" &&
    post.priceType === "paid" &&
    getContentVideoAssetSource(videoUrl) === "uploaded";
  const nextMaturity = isNsfw ? "general" : "nsfw";
  const exclusiveReporterLabel = getExclusiveNewsReporterLabel(post);
  const hasExclusiveNewsAssignment = Boolean(
    post.exclusiveNews.reporterReferralCode && post.exclusiveNews.until,
  );
  const canEditExclusiveNews = canAssignExclusiveNews(post);
  const [exclusiveReporterCodeInput, setExclusiveReporterCodeInput] = useState(
    post.exclusiveNews.reporterReferralCode ?? "",
  );
  const [exclusiveDurationHours, setExclusiveDurationHours] = useState<
    (typeof EXCLUSIVE_NEWS_DURATION_OPTIONS)[number]
  >(12);
  const detailHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/content/${post.contentId}`,
      referralCode,
    ),
    {
      returnTo: currentManagerHref,
    },
  );
  const signalMetrics = [
    {
      Icon: Heart,
      label: copy.labels.likes,
      value: post.social.likeCount,
    },
    {
      Icon: MessageCircle,
      label: copy.labels.comments,
      value: post.social.commentCount,
    },
    {
      Icon: Bookmark,
      label: copy.labels.saves,
      value: post.social.saveCount,
    },
    {
      Icon: Newspaper,
      label: copy.labels.reports,
      value: post.newsReportCount,
    },
  ];

  return (
    <article className="grid overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_42px_rgba(8,18,12,0.06)] lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
      <div className="relative aspect-[4/5] min-h-[15rem] bg-black sm:aspect-video lg:aspect-[4/5] lg:min-h-0 lg:self-start">
        {post.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 16rem"
            src={post.coverImageUrl}
            unoptimized={shouldBypassCoverImageOptimization}
          />
        ) : videoUrl ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            src={videoUrl}
          />
        ) : (
          <div className="flex h-full min-h-[16rem] items-center justify-center bg-black text-white/40">
            <Video className="size-9" />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-black/74 px-3 text-xs font-semibold text-white backdrop-blur">
          <Clapperboard className="size-3.5" />
          {copy.labels.results}
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/82 via-black/32 to-transparent p-3">
          <p className="min-w-0 truncate text-xs font-semibold text-white/72">
            {post.coverImageUrl ? copy.cover.sourceLabels.current : copy.cover.unavailable}
          </p>
          <button
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-black transition hover:bg-[#ecfff0] disabled:opacity-60"
            disabled={isUpdating}
            onClick={onChangeCover}
            type="button"
          >
            <ImageIcon className="size-3.5 text-[#16702e]" />
            {copy.actions.changeCover}
          </button>
        </div>
      </div>

      <div className="min-w-0 p-4 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={post.status}>
                {getStatusLabel(copy, post.status)}
              </StatusPill>
              <StatusPill status={post.priceType}>{getPostPriceLabel(copy, post)}</StatusPill>
              <StatusPill status={isNsfw ? "nsfw" : "general"}>
                {isNsfw ? copy.labels.nsfw : copy.labels.generalContent}
              </StatusPill>
              {hasExclusiveNewsAssignment ? (
                <StatusPill status="exclusive">
                  <LockKeyhole className="mr-1 size-3.5" />
                  {post.exclusiveNews.active
                    ? copy.exclusiveNews.active
                    : copy.exclusiveNews.inactive}
                </StatusPill>
              ) : null}
            </div>
            <h3 className="mt-3 line-clamp-2 break-words text-lg font-semibold leading-snug tracking-normal text-black [overflow-wrap:anywhere] sm:text-xl">
              {post.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-black/58">
              {post.summary}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-black/42 xl:grid-cols-1">
            <span className="rounded-lg border border-black/10 bg-[#f6f8f4] px-3 py-2">
              <span className="block text-[0.66rem] uppercase tracking-[0.12em]">
                {copy.labels.updated}
              </span>
              <span className="mt-1 block truncate text-sm font-bold normal-case tracking-normal text-black/62">
                {formatDateLabel(locale, post.updatedAt || post.createdAt)}
              </span>
            </span>
            <span className="rounded-lg border border-black/10 bg-[#f6f8f4] px-3 py-2">
              <span className="block text-[0.66rem] uppercase tracking-[0.12em]">
                {post.publishedAt ? copy.labels.published : copy.labels.status}
              </span>
              <span className="mt-1 block truncate text-sm font-bold normal-case tracking-normal text-black/62">
                {post.publishedAt
                  ? formatDateLabel(locale, post.publishedAt)
                  : getStatusLabel(copy, post.status)}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-black/10 bg-[#f6f8f4] p-2 sm:grid-cols-4">
          {signalMetrics.map(({ Icon, label, value }) => (
            <div
              aria-label={`${label} ${formatNumber(value, locale)}`}
              className="flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-lg border border-black/10 bg-white px-3 py-2"
              key={label}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0 text-[#16702e]" />
                <span className="truncate text-[0.72rem] font-semibold text-black/48">
                  {label}
                </span>
              </span>
              <span className="shrink-0 text-lg font-semibold leading-none text-black">
                {formatNumber(value, locale)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-lg border border-[#16702e]/16 bg-[#f6f8f4] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-black">
                  <ImageIcon className="size-4 text-[#16702e]" />
                  {copy.teasers.sectionTitle}
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-black/52">
                  {copy.teasers.count(
                    formatNumber(post.contentImageUrls.length, locale),
                  )}{" "}
                  · {copy.teasers.limit(formatNumber(VLOG_TEASER_IMAGE_LIMIT, locale))}
                </p>
              </div>
              <button
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-white disabled:opacity-50"
                disabled={isUpdating}
                onClick={onManageTeasers}
                type="button"
              >
                <Clapperboard className="size-4 text-[#16702e]" />
                {copy.actions.manageTeasers}
              </button>
            </div>
            {teaserImageUrls.length > 0 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {teaserImageUrls.map((imageUrl, index) => (
                  <span
                    className="relative block aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-black sm:w-32"
                    key={`${post.contentId}:teaser:${imageUrl}:${index}`}
                  >
                    <Image
                      alt=""
                      aria-hidden="true"
                      className="object-cover"
                      fill
                      sizes="8rem"
                      src={imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                    />
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 line-clamp-2 rounded-lg border border-dashed border-black/12 bg-white px-3 py-3 text-xs font-semibold leading-5 text-black/42">
                {copy.teasers.empty}
              </p>
            )}
          </section>
          <section className="rounded-lg border border-[#16702e]/16 bg-[#f6f8f4] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-black">
                  <LockKeyhole className="size-4 text-[#16702e]" />
                  {copy.exclusiveNews.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-black/52">
                  {copy.exclusiveNews.body}
                </p>
                {hasExclusiveNewsAssignment ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-[#16702e]/18 bg-white px-3 py-1 text-[#0c5f24]">
                      {exclusiveReporterLabel}
                      {post.exclusiveNews.reporterReferralCode
                        ? ` · ${post.exclusiveNews.reporterReferralCode}`
                        : ""}
                    </span>
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-black/54">
                      {copy.exclusiveNews.until} ·{" "}
                      {formatDateLabel(locale, post.exclusiveNews.until)}
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-black/42">
                    {copy.exclusiveNews.inactive}
                  </p>
                )}
              </div>
              {hasExclusiveNewsAssignment ? (
                <button
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-white disabled:opacity-50"
                  disabled={isUpdating}
                  onClick={() => {
                    setExclusiveReporterCodeInput("");
                    onClearExclusive();
                  }}
                  type="button"
                >
                  {isUpdating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  {copy.actions.clearExclusive}
                </button>
              ) : null}
            </div>
            {canEditExclusiveNews ? (
              <form
                className="mt-4 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const reporterCode = normalizeReporterCodeInput(
                    exclusiveReporterCodeInput,
                  );

                  if (!reporterCode) {
                    return;
                  }

                  onSaveExclusive(reporterCode, exclusiveDurationHours);
                }}
              >
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <label className="block">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-black/38">
                      {copy.exclusiveNews.codeLabel}
                    </span>
                    <input
                      className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm font-semibold uppercase tracking-[0.08em] text-black outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-black/28 focus:border-[#16702e]"
                      maxLength={12}
                      onChange={(event) => {
                        setExclusiveReporterCodeInput(
                          normalizeReporterCodeInput(event.target.value),
                        );
                      }}
                      placeholder={copy.exclusiveNews.codePlaceholder}
                      value={exclusiveReporterCodeInput}
                    />
                  </label>
                  <div>
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-black/38">
                      {copy.exclusiveNews.durationLabel}
                    </span>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {EXCLUSIVE_NEWS_DURATION_OPTIONS.map((durationHours) => {
                        const isSelected = exclusiveDurationHours === durationHours;

                        return (
                          <button
                            className={`inline-flex h-11 min-w-16 items-center justify-center rounded-full border px-3 text-sm font-semibold transition ${
                              isSelected
                                ? "border-black bg-black text-white"
                                : "border-black/10 bg-white text-black/58 hover:border-black/20"
                            }`}
                            key={durationHours}
                            onClick={() => {
                              setExclusiveDurationHours(durationHours);
                            }}
                            type="button"
                          >
                            {durationHours}h
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    isUpdating ||
                    normalizeReporterCodeInput(exclusiveReporterCodeInput).length === 0
                  }
                  type="submit"
                >
                  {isUpdating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Newspaper className="size-4" />
                  )}
                  {copy.actions.assignExclusive}
                </button>
              </form>
            ) : (
              <p className="mt-3 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold leading-5 text-black/48">
                {copy.exclusiveNews.unavailable}
              </p>
            )}
            <p className="mt-3 text-xs font-medium leading-5 text-black/42">
              {copy.exclusiveNews.helper}
            </p>
          </section>
        </div>
        {!canManageNsfw && post.priceType === "paid" && post.status !== "archived" ? (
          <p className="mt-3 rounded-lg border border-black/10 bg-[#f6f8f4] px-3 py-2 text-xs font-semibold leading-5 text-black/50">
            {copy.nsfwUnavailable}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
            href={detailHref}
          >
            <Eye className="size-4" />
            {copy.actions.detail}
          </Link>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4] disabled:opacity-50"
            disabled={isUpdating}
            onClick={onChangeCover}
            type="button"
          >
            <ImageIcon className="size-4 text-[#16702e]" />
            {copy.actions.changeCover}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4] disabled:opacity-50"
            disabled={isUpdating}
            onClick={onManageTeasers}
            type="button"
          >
            <Clapperboard className="size-4 text-[#16702e]" />
            {copy.actions.manageTeasers}
          </button>
          {post.status !== "published" ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-3 text-sm font-semibold text-white transition hover:bg-black/82 disabled:opacity-50"
              disabled={isUpdating}
              onClick={onPublish}
              type="button"
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {copy.actions.publish}
            </button>
          ) : null}
          {post.status !== "archived" ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4] disabled:opacity-50"
              disabled={isUpdating}
              onClick={onArchive}
              type="button"
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Archive className="size-4" />
              )}
              {copy.actions.archive}
            </button>
          ) : null}
          {canManageNsfw ? (
            <button
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition disabled:opacity-50 ${
                isNsfw
                  ? "border border-black/10 bg-white text-black hover:border-black/20 hover:bg-[#f6f8f4]"
                  : "bg-[#111] text-white hover:bg-black/82"
              }`}
              disabled={isUpdating}
              onClick={() => {
                onToggleMaturity(nextMaturity);
              }}
              type="button"
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldAlert className="size-4" />
              )}
              {isNsfw ? copy.actions.unmarkNsfw : copy.actions.markNsfw}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatusPill({
  children,
  status,
}: {
  children: ReactNode;
  status: string;
}) {
  const className =
    status === "published"
      ? "border-[#44f26e]/40 bg-[#44f26e]/12 text-[#0c5f24]"
      : status === "exclusive"
        ? "border-[#16702e]/24 bg-[#e9f8ec] text-[#0c5f24]"
      : status === "draft"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "archived"
          ? "border-black/10 bg-black/[0.06] text-black/54"
          : status === "nsfw"
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : status === "general"
              ? "border-black/10 bg-white text-black/58"
          : status === "paid"
            ? "border-[#44f26e]/36 bg-black text-white"
            : status === "free"
              ? "border-[#16702e]/18 bg-[#e9f8ec] text-[#0c5f24]"
              : "border-black/10 bg-white text-black/58";

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function VlogsLoadingSkeleton({
  copy,
}: {
  copy: ReturnType<typeof getCopy>;
}) {
  return (
    <div className="mt-5 grid gap-3">
      <MessagePanel>{copy.loading}</MessagePanel>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="grid overflow-hidden rounded-lg border border-black/10 bg-white lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start"
          key={index}
        >
          <div className="aspect-[4/5] min-h-[15rem] bg-black/10 motion-safe:animate-pulse sm:aspect-video lg:aspect-[4/5] lg:min-h-0" />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="h-8 w-24 rounded-full bg-black/10 motion-safe:animate-pulse" />
                  <div className="h-8 w-20 rounded-full bg-black/10 motion-safe:animate-pulse" />
                  <div className="h-8 w-16 rounded-full bg-black/10 motion-safe:animate-pulse" />
                </div>
                <div className="h-7 w-4/5 rounded-full bg-black/10 motion-safe:animate-pulse" />
                <div className="h-4 w-2/3 rounded-full bg-black/10 motion-safe:animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                <div className="h-14 rounded-lg bg-black/10 motion-safe:animate-pulse" />
                <div className="h-14 rounded-lg bg-black/10 motion-safe:animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="h-12 rounded-lg bg-black/10 motion-safe:animate-pulse" />
              <div className="h-12 rounded-lg bg-black/10 motion-safe:animate-pulse" />
              <div className="h-12 rounded-lg bg-black/10 motion-safe:animate-pulse" />
              <div className="h-12 rounded-lg bg-black/10 motion-safe:animate-pulse" />
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="h-24 rounded-lg bg-black/10 motion-safe:animate-pulse" />
              <div className="h-24 rounded-lg bg-black/10 motion-safe:animate-pulse" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <div className="h-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagePanel({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={`rounded-lg border p-5 text-sm font-medium leading-6 ${
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-black/10 bg-white text-black/58"
      }`}
    >
      {children}
    </div>
  );
}
