"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Send,
  Share2,
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
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type {
  ContentCommentCreateResponse,
  ContentCommentRecord,
  ContentCommentsResponse,
  ContentCoverImageCandidate,
  ContentSocialResponse,
  ContentSocialSummaryRecord,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";
import { cn } from "@/lib/utils";

type FanletterSocialActionsVariant = "compact" | "panel";
type CommentsStatus = "error" | "idle" | "loading" | "ready" | "submitting";

const COMMENTS_PAGE_SIZE = 5;
const REPORTER_COMMENT_MAX_LENGTH = 220;
const REPORT_COVER_CROP_ASPECT_RATIO = 16 / 9;
const REPORT_COVER_CROP_MAX_ZOOM = 3;
const REPORT_COVER_CROP_OUTPUT_HEIGHT = 675;
const REPORT_COVER_CROP_OUTPUT_WIDTH = 1200;
const EMPTY_REPORT_COVER_CANDIDATES: ContentCoverImageCandidate[] = [];

type FanletterSocialActionsProps = {
  className?: string;
  commentsHref?: string;
  contentId: string;
  hasViewerNewsReport?: boolean;
  initialSocial: ContentSocialSummaryRecord;
  initialNewsReports?: FanletterContentNewsReportItem[];
  isOwnContent?: boolean;
  locale: Locale;
  newsReportCount?: number;
  reportCoverImageCandidates?: ContentCoverImageCandidate[];
  reportCoverImageUrl?: string | null;
  shareHref: string;
  summary?: string;
  title: string;
  variant?: FanletterSocialActionsVariant;
};

type FanletterNewsReportStatus = "checking" | "idle" | "missing" | "ready";
type NewsReportsStatus = "error" | "idle" | "loading" | "ready";

export type FanletterContentNewsReportItem = {
  coverImageUrl: string | null;
  createdAt: string;
  dek: string;
  href: string;
  isViewerReport: boolean;
  reporterName: string;
  reportId: string;
  title: string;
};

const EMPTY_NEWS_REPORTS: FanletterContentNewsReportItem[] = [];

type FanletterNewsReportSummary = {
  coverImageUrl: string | null;
  createdAt: string;
  dek: string;
  reporterAvatarImageUrl: string | null;
  reporterCharacterName: string | null;
  reporterName: string;
  reportId: string;
  shareHref: string;
  title: string;
};

type FanletterNewsReportCreateResponse = {
  report: FanletterNewsReportSummary;
};

type FanletterNewsReportLookupResponse = {
  report: FanletterNewsReportSummary | null;
};

type FanletterNewsReportsForContentResponse = {
  reportCount: number;
  reports: FanletterContentNewsReportItem[];
};

type FanletterNewsReportCoverOption = {
  id: string;
  label: string;
  meta: string | null;
  url: string;
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

const DEFAULT_REPORT_COVER_CROP: ReportCoverCropState = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        commentPlaceholder: "이 브이로그에 댓글 남기기...",
        comments: "댓글",
        commentsEyebrow: "팬 반응",
        commentsHelper:
          "좋아요, 저장, 댓글이 캐릭터 브이로그 랭킹과 다음 콘텐츠 신호로 이어집니다.",
        commentsTitle: "브이로그에 반응하기",
        copied: "링크를 복사했습니다.",
        copyFailed: "링크를 복사하지 못했습니다.",
        like: "좋아요",
        liked: "좋아요 완료",
        loadCommentsFailed: "댓글을 불러오지 못했습니다.",
        loadMoreComments: "댓글 더 보기",
        loading: "확인 중",
        loadingComments: "댓글을 불러오는 중",
        noComments: "아직 댓글이 없습니다.",
        ownerActionBlocked: "내 브이로그에는 팬 반응만 집계합니다.",
        ownerCommentsHelper:
          "이 브이로그는 내 콘텐츠입니다. 공유와 댓글 확인은 가능하고 좋아요/저장은 팬 반응만 집계합니다.",
        ownerCommentPlaceholder: "내 브이로그에 고정할 답글이나 공지를 남기기...",
        post: "게시",
        reportCancel: "취소",
        reportCommentHelper:
          "선택 입력입니다. 공개 가능한 팬 기자 관점만 기사 생성에 반영됩니다.",
        reportCommentLabel: "팬 기자 코멘트",
        reportCommentPlaceholder:
          "예: 이 장면에서 팬들이 주목하면 좋을 포인트를 적어주세요.",
        reportCopied: "AI 팬 리포트 링크를 복사했습니다.",
        reportCoverDefault: "기본 커버",
        reportCoverLabel: "기사 대표 이미지",
        reportCoverMeta: (index: number) => `커버 ${index.toLocaleString("ko")}`,
        reportCoverSelected: "선택됨",
        reportCropFailed:
          "와이드 커버를 저장하지 못했습니다. 다른 커버를 선택하거나 원본 이미지 사용으로 전환해 주세요.",
        reportCropHelper:
          "뉴스 홈, 포토 뉴스, 캐릭터 와이어에 맞춘 16:9 파생 커버입니다.",
        reportCropLabel: "와이드 뉴스 커버",
        reportCropOriginal: "원본 이미지 사용",
        reportCropToggle: "와이드 커버 저장",
        reportCropUploading: "와이드 커버 저장 중",
        reportCropZoom: "확대",
        reportFailed: "AI 팬 리포트를 만들지 못했습니다.",
        reportReady: "AI 팬 리포트가 준비되었습니다.",
        reportExistingHelper:
          "이미 이 브이로그로 만든 AI 리포트가 있습니다. 목록에서 내 리포트 표시로 확인할 수 있습니다.",
        reportOnceHelper:
          "아직 만든 리포트가 없다면 지금 생성할 수 있습니다. 회원당 브이로그마다 한 번만 생성됩니다.",
        reportModalBody:
          "대표 이미지와 짧은 코멘트를 정하면 AI가 팬 기자 관점의 뉴스 포맷으로 정리합니다.",
        reportModalTitle: "AI 리포트 만들기",
        reportSubmit: "AI 리포트 생성하기",
        reportShare: "AI 리포트",
        reportView: "리포트 보기",
        reportListFailed: "AI 팬 리포트 목록을 새로고침하지 못했습니다.",
        reportListRefresh: "목록 새로고침",
        reportListRefreshing: "목록 새로고침 중",
        reportsBody:
          "팬 기자 관점의 AI 리포트를 만들고 이 브이로그에서 생성된 리포트를 모아봅니다.",
        reportsCount: "리포트",
        reportsEyebrow: "리포트",
        reportsTitle: "AI 팬 리포트",
        refresh: "새로고침",
        save: "저장",
        saved: "저장됨",
        share: "공유",
        remainingComments: (remaining: number) =>
          `${remaining.toLocaleString("ko")}개 더 볼 수 있음`,
        showingComments: (visible: number, total: number) =>
          `최근 댓글 ${visible.toLocaleString("ko")}개 표시 중 · 전체 ${total.toLocaleString("ko")}개`,
        signInRequired: "계정 연결 후 사용할 수 있습니다.",
        submitCommentFailed: "댓글을 등록하지 못했습니다.",
        submitting: "게시 중",
      }
    : {
        commentPlaceholder: "Add a comment to this vlog...",
        comments: "Comments",
        commentsEyebrow: "Fan reaction",
        commentsHelper:
          "Likes, saves, and comments feed the character vlog ranking and future content signals.",
        commentsTitle: "React to this vlog",
        copied: "Link copied.",
        copyFailed: "Could not copy the link.",
        like: "Like",
        liked: "Liked",
        loadCommentsFailed: "Failed to load comments.",
        loadMoreComments: "Load more comments",
        loading: "Checking",
        loadingComments: "Loading comments",
        noComments: "No comments yet.",
        ownerActionBlocked: "Only fan reactions are counted on my vlogs.",
        ownerCommentsHelper:
          "This is your content. Sharing and comments remain available, while likes and saves count fan reactions only.",
        ownerCommentPlaceholder: "Add a reply or note to your vlog...",
        post: "Post",
        reportCancel: "Cancel",
        reportCommentHelper:
          "Optional. Only public fan reporter context is used for the generated article.",
        reportCommentLabel: "Fan reporter note",
        reportCommentPlaceholder:
          "Example: Add the point fans should notice in this scene.",
        reportCopied: "AI fan report link copied.",
        reportCoverDefault: "Default cover",
        reportCoverLabel: "Article lead image",
        reportCoverMeta: (index: number) => `Cover ${index.toLocaleString("en")}`,
        reportCoverSelected: "Selected",
        reportCropFailed:
          "Could not save the wide cover. Choose another cover or switch back to the original image.",
        reportCropHelper:
          "A 16:9 derivative cover for News home, photo news, and character wire placements.",
        reportCropLabel: "Wide news cover",
        reportCropOriginal: "Use original image",
        reportCropToggle: "Save wide cover",
        reportCropUploading: "Saving wide cover",
        reportCropZoom: "Zoom",
        reportFailed: "Could not create the AI fan report.",
        reportReady: "AI fan report is ready.",
        reportExistingHelper:
          "You already created an AI report for this vlog. Find it in the list by the My report badge.",
        reportOnceHelper:
          "Create one if you do not have a report yet. Each connected member can create one report per vlog.",
        reportModalBody:
          "Pick a lead image and add a short note so AI can frame the story from your fan reporter angle.",
        reportModalTitle: "Create AI report",
        reportSubmit: "Create AI report",
        reportShare: "AI report",
        reportView: "View report",
        reportListFailed: "Could not refresh the AI fan report list.",
        reportListRefresh: "Refresh list",
        reportListRefreshing: "Refreshing list",
        reportsBody:
          "Create a fan-reporter AI report and browse reports generated from this vlog.",
        reportsCount: "Reports",
        reportsEyebrow: "Reports",
        reportsTitle: "AI fan reports",
        refresh: "Refresh",
        save: "Save",
        saved: "Saved",
        share: "Share",
        remainingComments: (remaining: number) =>
          `${remaining.toLocaleString("en")} more available`,
        showingComments: (visible: number, total: number) =>
          `Showing ${visible.toLocaleString("en")} recent comments · ${total.toLocaleString("en")} total`,
        signInRequired: "Connect your account to use this.",
        submitCommentFailed: "Failed to post comment.",
        submitting: "Posting",
      };
}

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatCommentDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatReportDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function FanletterNewsReportsList({
  locale,
  reports,
}: {
  locale: Locale;
  reports: FanletterContentNewsReportItem[];
}) {
  const labels =
    locale === "ko"
      ? {
          dateFallback: "FanLetter News",
          empty:
            "아직 이 브이로그로 생성된 리포트가 없습니다. 첫 리포트를 만들면 목록에 표시됩니다.",
          reporter: "팬 기자",
          viewerReport: "내 리포트",
        }
      : {
          dateFallback: "FanLetter News",
          empty:
            "No reports have been generated from this vlog yet. Create the first report to show it here.",
          reporter: "Fan reporter",
          viewerReport: "My report",
        };

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/12 bg-black/18 px-4 py-7 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-white/[0.055] text-[#44f26e]">
          <Newspaper className="size-5" />
        </span>
        <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-white/45">
          {labels.empty}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reports.map((report) => (
        <Link
          className={cn(
            "group grid min-w-0 grid-cols-[4.6rem_minmax(0,1fr)] gap-3 rounded-lg border bg-black/20 p-2.5 transition hover:border-[#44f26e]/42 hover:bg-black/30",
            report.isViewerReport
              ? "border-[#44f26e]/64 bg-[#44f26e]/10"
              : "border-white/10",
          )}
          href={report.href}
          key={report.reportId}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[#111510]">
            {report.coverImageUrl ? (
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover transition duration-300 group-hover:scale-[1.04]"
                fill
                sizes="92px"
                src={report.coverImageUrl}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#44f26e]">
                <Newspaper className="size-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 py-0.5">
            {report.isViewerReport ? (
              <span className="mb-1.5 inline-flex w-fit rounded-full bg-[#44f26e] px-2 py-0.5 text-[0.62rem] font-semibold text-black">
                {labels.viewerReport}
              </span>
            ) : null}
            <p className="line-clamp-2 break-words text-sm font-semibold leading-5 [word-break:keep-all]">
              {report.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-white/50">
              {report.dek}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-white/38">
              <span>
                {formatReportDate(report.createdAt, locale) ?? labels.dateFallback}
              </span>
              <span>{report.reporterName || labels.reporter}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function getReportCoverOptions({
  candidates,
  defaultCoverImageUrl,
  locale,
}: {
  candidates: ContentCoverImageCandidate[];
  defaultCoverImageUrl?: string | null;
  locale: Locale;
}): FanletterNewsReportCoverOption[] {
  const options: FanletterNewsReportCoverOption[] = [];
  const seenUrls = new Set<string>();

  const appendOption = ({
    id,
    label,
    meta,
    url,
  }: FanletterNewsReportCoverOption) => {
    const normalizedUrl = url.trim();

    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      return;
    }

    seenUrls.add(normalizedUrl);
    options.push({
      id,
      label,
      meta,
      url: normalizedUrl,
    });
  };

  if (defaultCoverImageUrl) {
    appendOption({
      id: "default",
      label: locale === "ko" ? "기본 커버" : "Default cover",
      meta: null,
      url: defaultCoverImageUrl,
    });
  }

  candidates.forEach((candidate, index) => {
    const sourceLabel =
      candidate.source === "manual"
        ? locale === "ko"
          ? "업로드"
          : "Uploaded"
        : candidate.source === "ai"
          ? "AI"
          : locale === "ko"
            ? "프레임"
            : "Frame";
    const timestampLabel =
      typeof candidate.timestampSec === "number" && candidate.timestampSec >= 0
        ? `${Math.round(candidate.timestampSec)}s`
        : null;

    appendOption({
      id: candidate.candidateId || `candidate-${index}`,
      label:
        locale === "ko"
          ? `커버 ${(index + 1).toLocaleString("ko")}`
          : `Cover ${(index + 1).toLocaleString("en")}`,
      meta: [sourceLabel, timestampLabel].filter(Boolean).join(" · ") || null,
      url: candidate.url,
    });
  });

  return options;
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

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function getNextSocial(
  social: ContentSocialSummaryRecord,
  action: "like" | "save",
  value: boolean,
): ContentSocialSummaryRecord {
  if (action === "like") {
    return {
      ...social,
      likedByViewer: value,
      likeCount: Math.max(0, social.likeCount + (value ? 1 : -1)),
    };
  }

  return {
    ...social,
    savedByViewer: value,
    saveCount: Math.max(0, social.saveCount + (value ? 1 : -1)),
  };
}

function CommentAvatar({ comment }: { comment: ContentCommentRecord }) {
  const initial =
    comment.authorDisplayName.trim().charAt(0).toUpperCase() ||
    comment.memberEmail.trim().charAt(0).toUpperCase() ||
    "F";

  if (comment.authorAvatarImageUrl) {
    return (
      <span
        aria-hidden="true"
        className="size-9 shrink-0 rounded-lg bg-cover bg-center"
        style={{ backgroundImage: `url(${comment.authorAvatarImageUrl})` }}
      />
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-sm font-semibold text-black">
      {initial}
    </span>
  );
}

export function FanletterSocialActions({
  className,
  commentsHref,
  contentId,
  hasViewerNewsReport = false,
  initialNewsReports = EMPTY_NEWS_REPORTS,
  initialSocial,
  isOwnContent = false,
  locale,
  newsReportCount = 0,
  reportCoverImageCandidates = EMPTY_REPORT_COVER_CANDIDATES,
  reportCoverImageUrl = null,
  shareHref,
  summary,
  title,
  variant = "panel",
}: FanletterSocialActionsProps) {
  const copy = getCopy(locale);
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: 1800,
    resolveGraceMs: 1800,
    status: connectionStatus,
  });
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [social, setSocial] =
    useState<ContentSocialSummaryRecord>(initialSocial);
  const [toast, setToast] = useState<string | null>(null);
  const [toastScope, setToastScope] = useState<"reaction" | "report">(
    "reaction",
  );
  const [busyAction, setBusyAction] =
    useState<"like" | "report" | "save" | "share" | null>(null);
  const [newsReportHref, setNewsReportHref] = useState<string | null>(null);
  const [newsReport, setNewsReport] =
    useState<FanletterNewsReportSummary | null>(null);
  const [newsReportStatus, setNewsReportStatus] =
    useState<FanletterNewsReportStatus>("idle");
  const [newsReports, setNewsReports] =
    useState<FanletterContentNewsReportItem[]>(initialNewsReports);
  const [newsReportsStatus, setNewsReportsStatus] =
    useState<NewsReportsStatus>("idle");
  const [newsReportsError, setNewsReportsError] = useState<string | null>(null);
  const [newsReportsTotalCount, setNewsReportsTotalCount] =
    useState(newsReportCount);
  const [isReportComposerOpen, setIsReportComposerOpen] = useState(false);
  const [selectedReportCoverUrl, setSelectedReportCoverUrl] =
    useState<string | null>(null);
  const [isWideReportCoverEnabled, setIsWideReportCoverEnabled] =
    useState(true);
  const [reportCoverCrop, setReportCoverCrop] =
    useState<ReportCoverCropState>(DEFAULT_REPORT_COVER_CROP);
  const [reportCoverCropError, setReportCoverCropError] =
    useState<string | null>(null);
  const [reportCoverNaturalSize, setReportCoverNaturalSize] =
    useState<ReportCoverNaturalSize | null>(null);
  const [reporterComment, setReporterComment] = useState("");
  const reportCoverCropFrameRef = useRef<HTMLDivElement | null>(null);
  const reportCoverCropDragRef = useRef<{
    initialCrop: ReportCoverCropState;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [comments, setComments] = useState<ContentCommentRecord[]>([]);
  const [commentsPageInfo, setCommentsPageInfo] =
    useState<ContentCommentsResponse["pageInfo"] | null>(null);
  const [commentsStatus, setCommentsStatus] =
    useState<CommentsStatus>("idle");
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const isPanel = variant === "panel";
  const isOwnerPanel = isPanel && isOwnContent;
  const reportCoverOptions = useMemo(
    () =>
      getReportCoverOptions({
        candidates: reportCoverImageCandidates,
        defaultCoverImageUrl: reportCoverImageUrl,
        locale,
      }),
    [locale, reportCoverImageCandidates, reportCoverImageUrl],
  );
  const hasReportCoverPreview = reportCoverOptions.length > 0;
  const hasSelectableReportCovers = reportCoverOptions.length > 1;
  const reportCoverCropRect = useMemo(
    () =>
      getReportCoverCropRect({
        crop: reportCoverCrop,
        naturalSize: reportCoverNaturalSize,
      }),
    [reportCoverCrop, reportCoverNaturalSize],
  );
  const reportCoverPreviewImageStyle =
    reportCoverCropRect && reportCoverNaturalSize
      ? getReportCoverPreviewImageStyle({
          cropRect: reportCoverCropRect,
          naturalSize: reportCoverNaturalSize,
        })
      : null;
  const shouldShowReportCoverCropEditor =
    hasReportCoverPreview && Boolean(selectedReportCoverUrl);

  useEffect(() => {
    setSocial(initialSocial);
  }, [initialSocial]);

  useEffect(() => {
    setNewsReports(initialNewsReports);
  }, [initialNewsReports]);

  useEffect(() => {
    setNewsReportsTotalCount(newsReportCount);
  }, [newsReportCount]);

  useEffect(() => {
    if (memberSession.email) {
      setEmail(memberSession.email);
    }
  }, [memberSession.email]);

  useEffect(() => {
    setSelectedReportCoverUrl((current) => {
      if (
        current &&
        reportCoverOptions.some((option) => option.url === current)
      ) {
        return current;
      }

      return reportCoverOptions[0]?.url ?? null;
    });
  }, [reportCoverOptions]);

  useEffect(() => {
    setReportCoverCrop(DEFAULT_REPORT_COVER_CROP);
    setReportCoverCropError(null);
    setReportCoverNaturalSize(null);
  }, [selectedReportCoverUrl]);

  const resolveEmail = useCallback(async () => {
    if (email) {
      return email;
    }

    const resolvedEmail =
      memberSession.email ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    setEmail(resolvedEmail ?? null);

    return resolvedEmail ?? null;
  }, [email, memberSession.email]);

  const loadViewerSocial = useCallback(async () => {
    if (!connection.isConnected || !accountAddress) {
      return;
    }

    const resolvedEmail = await resolveEmail();

    if (!resolvedEmail) {
      return;
    }

    const params = new URLSearchParams({
      email: resolvedEmail,
      walletAddress: accountAddress,
    });
    const response = await fetch(
      `/api/content/posts/${encodeURIComponent(contentId)}/social?${params.toString()}`,
      { cache: "no-store" },
    );
    const data = (await response.json().catch(() => null)) as
      | ContentSocialResponse
      | { error?: string }
      | null;

    if (response.ok && data && "social" in data) {
      setSocial(data.social);
    }
  }, [accountAddress, connection.isConnected, contentId, resolveEmail]);

  const loadExistingNewsReport = useCallback(async () => {
    if (!isPanel || !connection.isConnected || !accountAddress) {
      setNewsReport(null);
      setNewsReportHref(null);
      setNewsReportStatus("idle");
      return;
    }

    setNewsReportStatus("checking");
    setNewsReport(null);

    try {
      const resolvedEmail = await resolveEmail();

      if (!resolvedEmail) {
        setNewsReportStatus("idle");
        return;
      }

      const params = new URLSearchParams({
        contentId,
        email: resolvedEmail,
        locale,
        walletAddress: accountAddress,
      });
      const response = await fetch(
        `/api/fanletter/news-reports?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as
        | FanletterNewsReportLookupResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("report" in data)) {
        setNewsReportStatus("idle");
        return;
      }

      setNewsReport(data.report);
      setNewsReportHref(data.report?.shareHref ?? null);
      setNewsReportStatus(data.report ? "ready" : "missing");
    } catch {
      setNewsReportStatus("idle");
    }
  }, [
    accountAddress,
    connection.isConnected,
    contentId,
    isPanel,
    locale,
    resolveEmail,
  ]);

  const refreshNewsReports = useCallback(async ({
    silent = false,
  }: {
    silent?: boolean;
  } = {}) => {
    if (!isPanel) {
      return;
    }

    if (!silent) {
      setNewsReportsStatus("loading");
      setNewsReportsError(null);
    }

    try {
      const params = new URLSearchParams({
        contentId,
        limit: "4",
        locale,
        scope: "content",
      });

      if (connection.isConnected && accountAddress) {
        const resolvedEmail = await resolveEmail();

        if (resolvedEmail) {
          params.set("email", resolvedEmail);
          params.set("walletAddress", accountAddress);
        }
      }

      const response = await fetch(
        `/api/fanletter/news-reports?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as
        | FanletterNewsReportsForContentResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("reports" in data)) {
        throw new Error(
          data && "error" in data && data.error
            ? data.error
            : copy.reportListFailed,
        );
      }

      setNewsReports(data.reports);
      setNewsReportsTotalCount(data.reportCount);
      setNewsReportsError(null);
      setNewsReportsStatus("ready");
    } catch (error) {
      if (!silent) {
        setNewsReportsError(
          error instanceof Error ? error.message : copy.reportListFailed,
        );
        setNewsReportsStatus("error");
      }
    }
  }, [
    accountAddress,
    connection.isConnected,
    contentId,
    copy.reportListFailed,
    isPanel,
    locale,
    resolveEmail,
  ]);

  const loadComments = useCallback(async ({
    append = false,
    offset = 0,
  }: {
    append?: boolean;
    offset?: number;
  } = {}) => {
    setCommentsError(null);
    setCommentsStatus("loading");

    try {
      const params = new URLSearchParams({
        offset: String(offset),
        pageSize: String(COMMENTS_PAGE_SIZE),
      });

      if (connection.isConnected && accountAddress) {
        const resolvedEmail = await resolveEmail();

        if (resolvedEmail) {
          params.set("email", resolvedEmail);
          params.set("walletAddress", accountAddress);
        }
      }

      const query = params.toString();
      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}/comments${query ? `?${query}` : ""}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as
        | ContentCommentsResponse
        | { error?: string };

      if (!response.ok || !("comments" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.loadCommentsFailed,
        );
      }

      setComments((current) => {
        if (!append) {
          return data.comments;
        }

        const existingIds = new Set(
          current.map((comment) => comment.commentId),
        );

        return [
          ...current,
          ...data.comments.filter(
            (comment) => !existingIds.has(comment.commentId),
          ),
        ];
      });
      setCommentsPageInfo(data.pageInfo);
      setSocial(data.social);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : copy.loadCommentsFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    connection.isConnected,
    contentId,
    copy.loadCommentsFailed,
    resolveEmail,
  ]);

  useEffect(() => {
    if (!isPanel) {
      return;
    }

    void loadComments();
  }, [isPanel, loadComments]);

  useEffect(() => {
    if (!connection.isConnected || !accountAddress) {
      return;
    }

    void loadViewerSocial();
  }, [accountAddress, connection.isConnected, loadViewerSocial]);

  useEffect(() => {
    void loadExistingNewsReport();
  }, [loadExistingNewsReport]);

  useEffect(() => {
    if (!connection.isConnected || !accountAddress) {
      return;
    }

    void refreshNewsReports({ silent: true });
  }, [accountAddress, connection.isConnected, refreshNewsReports]);

  const updateSocialAction = useCallback(
    async (action: "like" | "save", value: boolean) => {
      const previous = social;

      if (isOwnContent) {
        setToastScope("reaction");
        setToast(copy.ownerActionBlocked);
        return;
      }

      setToastScope("reaction");
      setToast(null);
      setBusyAction(action);
      setSocial(getNextSocial(previous, action, value));

      if (!connection.isConnected || !accountAddress) {
        setSocial(previous);
        setToast(connection.isResolving ? copy.loading : copy.signInRequired);
        setBusyAction(null);
        return;
      }

      try {
        const resolvedEmail = await resolveEmail();

        if (!resolvedEmail) {
          throw new Error(copy.signInRequired);
        }

        const response = await fetch(
          `/api/content/posts/${encodeURIComponent(contentId)}/social`,
          {
            body: JSON.stringify({
              action,
              email: resolvedEmail,
              value,
              walletAddress: accountAddress,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          },
        );
        const data = (await response.json()) as
          | ContentSocialResponse
          | { error?: string };

        if (!response.ok || !("social" in data)) {
          throw new Error(
            "error" in data && data.error ? data.error : copy.signInRequired,
          );
        }

        setSocial(data.social);
      } catch (error) {
        setSocial(previous);
        setToast(error instanceof Error ? error.message : copy.signInRequired);
      } finally {
        setBusyAction(null);
      }
    },
    [
      accountAddress,
      connection.isConnected,
      connection.isResolving,
      contentId,
      copy.loading,
      copy.ownerActionBlocked,
      copy.signInRequired,
      isOwnContent,
      resolveEmail,
      social,
    ],
  );

  const submitComment = useCallback(async () => {
    const body = commentBody.trim();

    if (!body) {
      return;
    }

    if (!connection.isConnected || !accountAddress) {
      setCommentsError(
        connection.isResolving ? copy.loading : copy.signInRequired,
      );
      return;
    }

    setCommentsStatus("submitting");
    setCommentsError(null);

    try {
      const resolvedEmail = await resolveEmail();

      if (!resolvedEmail) {
        throw new Error(copy.signInRequired);
      }

      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}/comments`,
        {
          body: JSON.stringify({
            body,
            email: resolvedEmail,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const data = (await response.json()) as
        | ContentCommentCreateResponse
        | { error?: string };

      if (!response.ok || !("comment" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.submitCommentFailed,
        );
      }

      setComments((current) => [
        data.comment,
        ...current.filter((comment) => comment.commentId !== data.comment.commentId),
      ]);
      setCommentsPageInfo((current) =>
        current
          ? {
              ...current,
              nextOffset:
                current.nextOffset === null ? null : current.nextOffset + 1,
            }
          : current,
      );
      setSocial(data.social);
      setCommentBody("");
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : copy.submitCommentFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    commentBody,
    connection.isConnected,
    connection.isResolving,
    contentId,
    copy.loading,
    copy.signInRequired,
    copy.submitCommentFailed,
    resolveEmail,
  ]);

  const shareContent = useCallback(async () => {
    setToastScope("reaction");
    setToast(null);
    setBusyAction("share");

    try {
      const shareUrl = new URL(shareHref, window.location.origin).toString();

      if (navigator.share) {
        try {
          await navigator.share({
            text: summary ?? "",
            title,
            url: shareUrl,
          });
          setBusyAction(null);
          return;
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            setBusyAction(null);
            return;
          }
        }
      }

      await copyToClipboard(shareUrl);
      setToast(copy.copied);
    } catch {
      setToast(copy.copyFailed);
    } finally {
      setBusyAction(null);
    }
  }, [copy.copied, copy.copyFailed, shareHref, summary, title]);

  const createNewsReport = useCallback(async ({
    croppedCoverCrop,
    croppedCoverImageUrl,
    croppedCoverSourceImageUrl,
    selectedCoverImageUrl,
    reporterComment,
  }: {
    croppedCoverCrop?: ReportCoverCropPayload | null;
    croppedCoverImageUrl?: string | null;
    croppedCoverSourceImageUrl?: string | null;
    selectedCoverImageUrl?: string | null;
    reporterComment?: string | null;
  } = {}) => {
    setToastScope("report");
    setToast(null);
    setNewsReportHref(null);
    setBusyAction("report");

    try {
      if (!connection.isConnected || !accountAddress) {
        setToast(connection.isResolving ? copy.loading : copy.signInRequired);
        return;
      }

      const resolvedEmail = await resolveEmail();

      if (!resolvedEmail) {
        throw new Error(copy.signInRequired);
      }

      const response = await fetch("/api/fanletter/news-reports", {
        body: JSON.stringify({
          contentId,
          croppedCoverCrop,
          croppedCoverImageUrl,
          croppedCoverSourceImageUrl,
          email: resolvedEmail,
          locale,
          reporterComment,
          selectedCoverImageUrl,
          walletAddress: accountAddress,
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
          data && "error" in data && data.error
            ? data.error
            : copy.reportFailed,
        );
      }

      const reportUrl = new URL(
        data.report.shareHref,
        window.location.origin,
      ).toString();

      setNewsReport(data.report);
      setNewsReportHref(data.report.shareHref);
      setNewsReportStatus("ready");
      setIsReportComposerOpen(false);
      setReporterComment("");
      const createdReportItem: FanletterContentNewsReportItem = {
        coverImageUrl: data.report.coverImageUrl,
        createdAt: data.report.createdAt,
        dek: data.report.dek,
        href: data.report.shareHref,
        isViewerReport: true,
        reporterName: data.report.reporterName,
        reportId: data.report.reportId,
        title: data.report.title,
      };
      const reportAlreadyInList = newsReports.some(
        (report) => report.reportId === data.report.reportId,
      );

      setNewsReports((current) => [
        createdReportItem,
        ...current.filter((report) => report.reportId !== data.report.reportId),
      ].slice(0, 4));
      setNewsReportsTotalCount((current) =>
        reportAlreadyInList ? current : Math.max(current + 1, 1),
      );
      void refreshNewsReports({ silent: true });

      if (navigator.share) {
        try {
          await navigator.share({
            text: data.report.dek,
            title: data.report.title,
            url: reportUrl,
          });
          setToast(copy.reportReady);
          return;
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            setToast(copy.reportReady);
            return;
          }
        }
      }

      await copyToClipboard(reportUrl);
      setToast(copy.reportCopied);
    } catch (error) {
      setToast(error instanceof Error ? error.message : copy.reportFailed);
    } finally {
      setBusyAction(null);
    }
  }, [
    accountAddress,
    connection.isConnected,
    connection.isResolving,
    contentId,
    copy.loading,
    copy.reportCopied,
    copy.reportFailed,
    copy.reportReady,
    copy.signInRequired,
    locale,
    newsReports,
    refreshNewsReports,
    resolveEmail,
  ]);

  const openReportComposer = useCallback(() => {
    setToastScope("report");
    setToast(null);
    setReportCoverCropError(null);

    if (!connection.isConnected || !accountAddress) {
      setToast(connection.isResolving ? copy.loading : copy.signInRequired);
      return;
    }

    setSelectedReportCoverUrl((current) => current ?? reportCoverOptions[0]?.url ?? null);
    setIsWideReportCoverEnabled(true);
    setIsReportComposerOpen(true);
  }, [
    accountAddress,
    connection.isConnected,
    connection.isResolving,
    copy.loading,
    copy.signInRequired,
    reportCoverOptions,
  ]);

  const uploadCroppedReportCover = useCallback(async ({
    sourceImageUrl,
  }: {
    sourceImageUrl: string;
  }) => {
    if (!accountAddress) {
      throw new Error(copy.signInRequired);
    }

    const resolvedEmail = await resolveEmail();

    if (!resolvedEmail) {
      throw new Error(copy.signInRequired);
    }

    const { blob, cropRect } = await createCroppedReportCoverBlob({
      crop: reportCoverCrop,
      sourceImageUrl,
    });
    const file = new File(
      [blob],
      `fanletter-news-cover-${contentId}.jpg`,
      { type: "image/jpeg" },
    );
    const formData = new FormData();

    formData.set("contentId", contentId);
    formData.set("email", resolvedEmail);
    formData.set("file", file);
    formData.set("sourceImageUrl", sourceImageUrl);
    formData.set("walletAddress", accountAddress);

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
        data && "error" in data && data.error
          ? data.error
          : copy.reportCropFailed,
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
  }, [
    accountAddress,
    contentId,
    copy.reportCropFailed,
    copy.signInRequired,
    reportCoverCrop,
    resolveEmail,
  ]);

  const handleReportCoverCropPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!reportCoverCropRect || !reportCoverNaturalSize) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      reportCoverCropDragRef.current = {
        initialCrop: reportCoverCrop,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [reportCoverCrop, reportCoverCropRect, reportCoverNaturalSize],
  );

  const handleReportCoverCropPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = reportCoverCropDragRef.current;
      const frame = reportCoverCropFrameRef.current;

      if (
        !drag ||
        drag.pointerId !== event.pointerId ||
        !frame ||
        !reportCoverCropRect ||
        !reportCoverNaturalSize
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
        (reportCoverCropRect.width / reportCoverNaturalSize.width);
      const cropDeltaY =
        (deltaY / frameRect.height) *
        (reportCoverCropRect.height / reportCoverNaturalSize.height);

      setReportCoverCrop((current) => ({
        ...current,
        centerX: drag.initialCrop.centerX - cropDeltaX,
        centerY: drag.initialCrop.centerY - cropDeltaY,
      }));
    },
    [reportCoverCropRect, reportCoverNaturalSize],
  );

  const handleReportCoverCropPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (reportCoverCropDragRef.current?.pointerId === event.pointerId) {
        reportCoverCropDragRef.current = null;
      }
    },
    [],
  );

  const submitNewsReportComposer = useCallback(async () => {
    const trimmedComment = reporterComment.trim();
    let croppedCoverImageUrl: string | null = null;
    let croppedCoverCrop: ReportCoverCropPayload | null = null;
    const shouldUploadWideCover =
      isWideReportCoverEnabled &&
      hasReportCoverPreview &&
      Boolean(selectedReportCoverUrl);

    setReportCoverCropError(null);

    if (shouldUploadWideCover && selectedReportCoverUrl) {
      setToastScope("report");
      setBusyAction("report");
      setToast(copy.reportCropUploading);

      try {
        const croppedCover = await uploadCroppedReportCover({
          sourceImageUrl: selectedReportCoverUrl,
        });

        croppedCoverImageUrl = croppedCover.url;
        croppedCoverCrop = croppedCover.crop;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : copy.reportCropFailed;

        setReportCoverCropError(message);
        setToast(message);
        setBusyAction(null);
        return;
      }
    }

    await createNewsReport({
      croppedCoverCrop,
      croppedCoverImageUrl,
      croppedCoverSourceImageUrl:
        croppedCoverImageUrl && selectedReportCoverUrl
          ? selectedReportCoverUrl
          : null,
      reporterComment: trimmedComment || null,
      selectedCoverImageUrl:
        hasReportCoverPreview ? selectedReportCoverUrl : null,
    });
  }, [
    copy.reportCropFailed,
    copy.reportCropUploading,
    createNewsReport,
    hasReportCoverPreview,
    isWideReportCoverEnabled,
    reporterComment,
    selectedReportCoverUrl,
    uploadCroppedReportCover,
  ]);

  const compactButtonClassName =
    "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-[#f6f8f4] px-2.5 py-2 text-xs font-semibold text-black/64 transition hover:border-[#29d85f]/60 hover:bg-[#effff3] hover:text-black disabled:cursor-not-allowed disabled:opacity-60";
  const panelButtonClassName =
    "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-semibold text-white/72 transition hover:border-[#44f26e]/46 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

  const actionButtonClassName = isPanel
    ? panelButtonClassName
    : compactButtonClassName;
  const activeClassName = isPanel
    ? "border-[#44f26e]/54 bg-[#44f26e]/14 text-[#b9ffc8]"
    : "border-[#29d85f]/70 bg-[#e9ffef] text-black";
  const actionIconClassName = isPanel ? "size-4" : "size-3.5";
  const likeLabel = social.likedByViewer ? copy.liked : copy.like;
  const saveLabel = social.savedByViewer ? copy.saved : copy.save;
  const hasViewerReportInList = newsReports.some((report) => report.isViewerReport);
  const hasCurrentViewerNewsReport =
    hasViewerNewsReport || hasViewerReportInList || Boolean(newsReport);
  const reportHelper = hasCurrentViewerNewsReport
    ? copy.reportExistingHelper
    : copy.reportOnceHelper;
  const displayedNewsReportCount = hasCurrentViewerNewsReport
    ? Math.max(newsReportsTotalCount, 1)
    : newsReportsTotalCount;
  const commentsHelper = isOwnContent
    ? copy.ownerCommentsHelper
    : copy.commentsHelper;
  const commentPlaceholder = isOwnContent
    ? copy.ownerCommentPlaceholder
    : copy.commentPlaceholder;

  if (!isPanel) {
    return (
      <div className={cn("mt-4", className)}>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            aria-label={likeLabel}
            className={cn(
              actionButtonClassName,
              social.likedByViewer && activeClassName,
              isOwnContent && "opacity-70",
            )}
            disabled={busyAction === "like"}
            onClick={() => {
              void updateSocialAction("like", !social.likedByViewer);
            }}
            type="button"
          >
            {busyAction === "like" ? (
              <Loader2 className={`${actionIconClassName} animate-spin`} />
            ) : (
              <Heart
                className={actionIconClassName}
                fill={social.likedByViewer ? "currentColor" : "none"}
              />
            )}
            <span>{formatCount(social.likeCount, locale)}</span>
          </button>
          <Link
            aria-label={copy.comments}
            className={actionButtonClassName}
            href={commentsHref ?? shareHref}
          >
            <MessageCircle className={actionIconClassName} />
            <span>{formatCount(social.commentCount, locale)}</span>
          </Link>
          <button
            aria-label={saveLabel}
            className={cn(
              actionButtonClassName,
              social.savedByViewer && activeClassName,
              isOwnContent && "opacity-70",
            )}
            disabled={busyAction === "save"}
            onClick={() => {
              void updateSocialAction("save", !social.savedByViewer);
            }}
            type="button"
          >
            {busyAction === "save" ? (
              <Loader2 className={`${actionIconClassName} animate-spin`} />
            ) : (
              <Bookmark
                className={actionIconClassName}
                fill={social.savedByViewer ? "currentColor" : "none"}
              />
            )}
            <span>{formatCount(social.saveCount, locale)}</span>
          </button>
          <button
            aria-label={copy.share}
            className={actionButtonClassName}
            disabled={busyAction === "share"}
            onClick={() => {
              void shareContent();
            }}
            type="button"
          >
            {busyAction === "share" ? (
              <Loader2 className={`${actionIconClassName} animate-spin`} />
            ) : (
              <Share2 className={actionIconClassName} />
            )}
            <span className="sr-only">{copy.share}</span>
          </button>
        </div>
        {toast ? (
          <p
            aria-live="polite"
            className="mt-2 rounded-lg border border-black/10 bg-black px-3 py-2 text-xs font-semibold text-white"
          >
            {toast}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
    <section
      className={cn(
        "mt-6 rounded-lg border border-[#44f26e]/22 bg-[#07100b] text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)]",
        isOwnerPanel ? "p-4 sm:p-5" : "p-5 sm:p-6",
        className,
      )}
      id="fanletter-comments"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
            {copy.commentsEyebrow}
          </p>
          <h2
            className={cn(
              "mt-3 font-semibold leading-[1.05] tracking-normal [word-break:keep-all]",
              isOwnerPanel
                ? "text-2xl sm:text-[2rem]"
                : "text-[1.65rem] sm:text-[2.45rem]",
            )}
          >
            {copy.commentsTitle}
          </h2>
          <p
            className={cn(
              "mt-3 font-medium text-white/62",
              isOwnerPanel
                ? "text-sm leading-6"
                : "text-sm leading-6 sm:text-base sm:leading-7",
            )}
          >
            {commentsHelper}
          </p>
        </div>
        <button
          className="inline-flex h-10 shrink-0 self-start items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.045] px-3 text-xs font-semibold text-white/72 transition hover:border-[#44f26e]/42 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
          disabled={commentsStatus === "loading"}
          onClick={() => {
            void loadComments();
          }}
          type="button"
        >
          <RefreshCw
            className={`size-4 ${commentsStatus === "loading" ? "animate-spin" : ""}`}
          />
          {copy.refresh}
        </button>
      </div>

      <div
        className={cn(
          isOwnerPanel
            ? "mt-4 grid grid-cols-2 gap-2"
            : "mt-5 grid grid-cols-3 gap-2 sm:mt-6",
        )}
      >
        <button
          className={cn(
            actionButtonClassName,
            social.likedByViewer && activeClassName,
            isOwnContent && "opacity-70",
          )}
          disabled={busyAction === "like"}
          onClick={() => {
            void updateSocialAction("like", !social.likedByViewer);
          }}
          type="button"
        >
          {busyAction === "like" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Heart className="size-4" fill={social.likedByViewer ? "currentColor" : "none"} />
          )}
          <span>{likeLabel}</span>
          <span className="text-current/56">{formatCount(social.likeCount, locale)}</span>
        </button>
        <a className={actionButtonClassName} href="#fanletter-comments">
          <MessageCircle className="size-4" />
          <span>{copy.comments}</span>
          <span className="text-current/56">
            {formatCount(social.commentCount, locale)}
          </span>
        </a>
        <button
          className={cn(
            actionButtonClassName,
            social.savedByViewer && activeClassName,
            isOwnContent && "opacity-70",
          )}
          disabled={busyAction === "save"}
          onClick={() => {
            void updateSocialAction("save", !social.savedByViewer);
          }}
          type="button"
        >
          {busyAction === "save" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bookmark className="size-4" fill={social.savedByViewer ? "currentColor" : "none"} />
          )}
          <span>{saveLabel}</span>
          <span className="text-current/56">{formatCount(social.saveCount, locale)}</span>
        </button>
      </div>

      {toast && toastScope === "reaction" ? (
        <div
          aria-live="polite"
          className="mt-3 flex flex-col gap-2 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-2 text-sm font-semibold text-[#b9ffc8] sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{toast}</span>
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-lg border border-white/10 bg-black/22 p-3 sm:p-4",
          isOwnerPanel ? "mt-4" : "mt-5",
        )}
      >
        {social.commentCount > 0 ? (
          <div className="mb-3 flex flex-col gap-1 text-xs font-semibold text-white/42 sm:flex-row sm:items-center sm:justify-between">
            <p>{copy.showingComments(comments.length, social.commentCount)}</p>
            {commentsPageInfo?.hasMore ? (
              <p>
                {copy.remainingComments(
                  Math.max(social.commentCount - comments.length, 0),
                )}
              </p>
            ) : null}
          </div>
        ) : null}
        {commentsStatus === "loading" && comments.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-9 text-sm font-semibold text-white/52">
            <Loader2 className="size-4 animate-spin" />
            {copy.loadingComments}
          </div>
        ) : commentsError && comments.length === 0 ? (
          <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
            {commentsError}
          </div>
        ) : comments.length === 0 ? (
          <div
            className={cn(
              "rounded-lg border border-dashed border-white/12 bg-white/[0.035] px-4 text-center text-sm font-medium text-white/48",
              isOwnerPanel ? "py-5" : "py-6 sm:py-8",
            )}
          >
            {copy.noComments}
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div className="flex gap-3" key={comment.commentId}>
                <CommentAvatar comment={comment} />
                <div className="min-w-0 flex-1 rounded-lg border border-white/8 bg-white/[0.055] px-3.5 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-white">
                      {comment.authorDisplayName}
                    </p>
                    <p className="text-xs font-medium text-white/38">
                      {formatCommentDate(comment.createdAt, locale)}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-white/68">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {comments.length > 0 && commentsPageInfo?.hasMore ? (
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#44f26e]/28 bg-[#44f26e]/10 px-4 text-sm font-semibold text-[#b9ffc8] transition hover:border-[#44f26e]/50 hover:bg-[#44f26e]/16 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={commentsStatus === "loading"}
            onClick={() => {
              void loadComments({
                append: true,
                offset: commentsPageInfo.nextOffset ?? comments.length,
              });
            }}
            type="button"
          >
            {commentsStatus === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            {copy.loadMoreComments}
          </button>
        ) : null}

        {commentsError && comments.length > 0 ? (
          <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm leading-5 text-rose-100">
            {commentsError}
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.055] p-2">
        <div className="flex items-end gap-2">
          <textarea
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium leading-5 text-white outline-none placeholder:text-white/32"
            maxLength={500}
            onChange={(event) => {
              setCommentBody(event.target.value);
            }}
            placeholder={commentPlaceholder}
            rows={1}
            value={commentBody}
          />
          <button
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!commentBody.trim() || commentsStatus === "submitting"}
            onClick={() => {
              void submitComment();
            }}
            type="button"
          >
            {commentsStatus === "submitting" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="sr-only">
              {commentsStatus === "submitting" ? copy.submitting : copy.post}
            </span>
          </button>
        </div>
      </div>
    </section>

    <section
      className={cn(
        "mt-6 rounded-lg border border-[#44f26e]/22 bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:p-6",
        className,
      )}
      id="fanletter-reports"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
            {copy.reportsEyebrow}
          </p>
          <h2 className="mt-3 text-[1.65rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.45rem]">
            {copy.reportsTitle}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
            {copy.reportsBody}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 text-sm font-semibold text-white/72">
            <Newspaper className="size-4 text-[#44f26e]" />
            <span>{copy.reportsCount}</span>
            <span className="text-[#b9ffc8]">
              {formatCount(displayedNewsReportCount, locale)}
            </span>
          </div>
          <button
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 text-xs font-semibold text-white/68 transition hover:border-[#44f26e]/46 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={newsReportsStatus === "loading"}
            onClick={() => {
              void refreshNewsReports();
            }}
            type="button"
          >
            <RefreshCw
              className={`size-4 ${newsReportsStatus === "loading" ? "animate-spin" : ""}`}
            />
            {newsReportsStatus === "loading"
              ? copy.reportListRefreshing
              : copy.reportListRefresh}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="text-xs font-medium leading-5 text-white/45">
          {reportHelper}
        </p>
        {!hasCurrentViewerNewsReport ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-white/72 transition hover:border-[#44f26e]/46 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyAction === "report" || newsReportStatus === "checking"}
            onClick={() => {
              openReportComposer();
            }}
            type="button"
          >
            {busyAction === "report" || newsReportStatus === "checking" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Newspaper className="size-4" />
            )}
            <span>{copy.reportShare}</span>
          </button>
        ) : null}
      </div>

      {toast && toastScope === "report" ? (
        <div
          aria-live="polite"
          className="mt-3 flex flex-col gap-2 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-2 text-sm font-semibold text-[#b9ffc8] sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{toast}</span>
          {newsReportHref ? (
            <Link
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[#44f26e]/32 px-3 text-xs font-semibold !text-[#b9ffc8] transition hover:bg-[#44f26e]/12"
              href={newsReportHref}
            >
              {copy.reportView}
            </Link>
          ) : null}
        </div>
      ) : null}

      {newsReportsError ? (
        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm leading-5 text-rose-100">
          {newsReportsError}
        </p>
      ) : null}

      <div className="mt-4">
        <FanletterNewsReportsList locale={locale} reports={newsReports} />
      </div>
    </section>

    {isReportComposerOpen ? (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6">
        <div
          aria-modal="true"
          className="max-h-[min(48rem,calc(100vh-2rem))] w-full max-w-5xl overflow-y-auto rounded-lg border border-[#44f26e]/24 bg-[#07100b] p-4 text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:p-5"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                {copy.reportShare}
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-normal">
                {copy.reportModalTitle}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-white/58">
                {copy.reportModalBody}
              </p>
            </div>
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-white/72 transition hover:border-white/28 hover:bg-white/[0.09] hover:text-white"
              onClick={() => {
                setIsReportComposerOpen(false);
              }}
              type="button"
            >
              <X className="size-4" />
              <span className="sr-only">{copy.reportCancel}</span>
            </button>
          </div>

          {hasReportCoverPreview ? (
            <div className="mt-5">
              <p className="text-sm font-semibold text-white">
                {copy.reportCoverLabel}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {reportCoverOptions.map((option) => {
                  const isSelected = option.url === selectedReportCoverUrl;
                  const coverOptionContent = (
                    <>
                      <span
                        aria-hidden="true"
                        className="block aspect-[4/5] rounded-md bg-white/[0.06] bg-cover bg-center"
                        style={{ backgroundImage: `url(${option.url})` }}
                      />
                      <span className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-white/82">
                            {option.label}
                          </span>
                          {option.meta ? (
                            <span className="block truncate text-[0.68rem] font-medium text-white/42">
                              {option.meta}
                            </span>
                          ) : null}
                        </span>
                        {isSelected ? (
                          <span className="shrink-0 rounded-full bg-[#44f26e] px-2 py-0.5 text-[0.62rem] font-semibold text-black">
                            {copy.reportCoverSelected}
                          </span>
                        ) : null}
                      </span>
                    </>
                  );

                  return hasSelectableReportCovers ? (
                    <button
                      className={cn(
                        "group min-w-0 overflow-hidden rounded-lg border bg-black/28 p-1 text-left transition",
                        isSelected
                          ? "border-[#44f26e] shadow-[0_0_0_1px_rgba(68,242,110,0.42)]"
                          : "border-white/10 hover:border-[#44f26e]/45",
                      )}
                      key={option.id}
                      onClick={() => {
                        setSelectedReportCoverUrl(option.url);
                      }}
                      type="button"
                    >
                      {coverOptionContent}
                    </button>
                  ) : (
                    <div
                      className="min-w-0 overflow-hidden rounded-lg border border-[#44f26e] bg-black/28 p-1 text-left shadow-[0_0_0_1px_rgba(68,242,110,0.42)]"
                      key={option.id}
                    >
                      {coverOptionContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {shouldShowReportCoverCropEditor ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {copy.reportCropLabel}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/44">
                    {copy.reportCropHelper}
                  </p>
                </div>
                <label className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-black/24 px-3 text-xs font-semibold text-white/68">
                  <input
                    checked={isWideReportCoverEnabled}
                    className="size-4 accent-[#44f26e]"
                    onChange={(event) => {
                      setIsWideReportCoverEnabled(event.target.checked);
                      setReportCoverCropError(null);
                    }}
                    type="checkbox"
                  />
                  {copy.reportCropToggle}
                </label>
              </div>

              {isWideReportCoverEnabled && selectedReportCoverUrl ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
                  <div
                    className="relative aspect-video min-h-[12rem] cursor-grab touch-none overflow-hidden rounded-lg border border-white/12 bg-black/40 active:cursor-grabbing"
                    onPointerCancel={handleReportCoverCropPointerEnd}
                    onPointerDown={handleReportCoverCropPointerDown}
                    onPointerMove={handleReportCoverCropPointerMove}
                    onPointerUp={handleReportCoverCropPointerEnd}
                    ref={reportCoverCropFrameRef}
                  >
                    {/* The crop editor needs the raw image element so canvas export uses the selected source URL. */}
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
                          setReportCoverNaturalSize({
                            height: image.naturalHeight,
                            width: image.naturalWidth,
                          });
                        }
                      }}
                      src={selectedReportCoverUrl}
                      style={
                        reportCoverPreviewImageStyle ?? {
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

                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-white/62">
                        {copy.reportCropZoom}
                      </span>
                      <span className="text-xs font-semibold text-[#44f26e]">
                        {reportCoverCrop.zoom.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      aria-label={copy.reportCropZoom}
                      className="mt-3 w-full accent-[#44f26e]"
                      max={REPORT_COVER_CROP_MAX_ZOOM}
                      min={1}
                      onChange={(event) => {
                        setReportCoverCrop((current) => ({
                          ...current,
                          zoom: Number(event.target.value),
                        }));
                      }}
                      step={0.01}
                      type="range"
                      value={reportCoverCrop.zoom}
                    />
                    <button
                      className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/12 text-xs font-semibold text-white/62 transition hover:border-white/24 hover:bg-white/[0.06] hover:text-white"
                      onClick={() => {
                        setReportCoverCrop(DEFAULT_REPORT_COVER_CROP);
                      }}
                      type="button"
                    >
                      <RefreshCw className="mr-1.5 size-3.5" />
                      {copy.refresh}
                    </button>
                    {reportCoverCropError ? (
                      <p className="mt-3 text-xs font-medium leading-5 text-rose-200">
                        {reportCoverCropError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-white/48">
                  {copy.reportCropOriginal}
                </p>
              )}
            </div>
          ) : null}

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-white">
              {copy.reportCommentLabel}
            </span>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-lg border border-white/12 bg-white/[0.055] px-3 py-3 text-sm font-medium leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-[#44f26e]/60 focus:bg-white/[0.08]"
              maxLength={REPORTER_COMMENT_MAX_LENGTH}
              onChange={(event) => {
                setReporterComment(event.target.value);
              }}
              placeholder={copy.reportCommentPlaceholder}
              value={reporterComment}
            />
          </label>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs font-medium text-white/42">
            <p>{copy.reportCommentHelper}</p>
            <p>
              {reporterComment.length.toLocaleString(locale)}/
              {REPORTER_COMMENT_MAX_LENGTH.toLocaleString(locale)}
            </p>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/12 px-4 text-sm font-semibold text-white/68 transition hover:border-white/24 hover:bg-white/[0.06] hover:text-white"
              onClick={() => {
                setIsReportComposerOpen(false);
              }}
              type="button"
            >
              {copy.reportCancel}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyAction === "report"}
              onClick={submitNewsReportComposer}
              type="button"
            >
              {busyAction === "report" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Newspaper className="size-4" />
              )}
              {copy.reportSubmit}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
