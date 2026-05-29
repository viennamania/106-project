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

import {
  FanletterPaidUnlockPanel,
  FanletterPaidUnlockTrigger,
} from "@/components/fanletter-paid-unlock-panel";
import {
  CONTENT_PAID_USDT_AMOUNT,
  type ContentMaturityRating,
  type ContentPriceType,
} from "@/lib/content";
import type { FanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CoverOption = {
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
    body: string;
    dek: string;
    editHref: string;
    how: string;
    href: string;
    reporterComment: string | null;
    reportId: string;
    title: string;
    updatedAt: string;
    what: string;
    when: string;
    where: string;
    who: string;
    why: string;
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
  previewClipVideoUrl: string | null;
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
  sourceReveal: FanletterNewsSourceRevealState;
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

type FanletterNewsReportContentUpdateResponse = {
  report: {
    body: string;
    dek: string;
    how: string;
    reporterComment: string | null;
    reportId: string;
    shareHref: string;
    title: string;
    updatedAt: string;
    what: string;
    when: string;
    where: string;
    who: string;
    why: string;
  };
};

type EditableNewsReportForm = {
  body: string;
  dek: string;
  how: string;
  reporterComment: string;
  title: string;
  what: string;
  when: string;
  where: string;
  who: string;
  why: string;
};

export type FanletterNewsReportComposerReportStatusFilter =
  | "all"
  | "reported"
  | "unreported";

export type FanletterNewsReportComposerSourceRevealFilter =
  | "all"
  | "early"
  | "locked"
  | "near"
  | "opportunity"
  | "unlocked";
export type FanletterNewsReportComposerSourceSort = "latest" | "recommended";

const REPORT_COVER_CROP_ASPECT_RATIO = 16 / 9;
const REPORT_COVER_CROP_MAX_ZOOM = 3;
const REPORT_COVER_CROP_OUTPUT_HEIGHT = 675;
const REPORT_COVER_CROP_OUTPUT_WIDTH = 1200;
const REPORT_TEASER_CROP_ASPECT_RATIO = 9 / 16;
const REPORT_TEASER_CROP_OUTPUT_HEIGHT = 1280;
const REPORT_TEASER_CROP_OUTPUT_WIDTH = 720;
const REPORT_TEASER_IMAGE_LIMIT = 4;
const REPORT_BODY_MAX_LENGTH = 12_000;
const REPORT_DEK_MAX_LENGTH = 320;
const REPORT_FACT_MAX_LENGTH = 500;
const REPORT_TITLE_MAX_LENGTH = 180;
const REPORTER_COMMENT_MAX_LENGTH = 220;
const SOURCE_RESULT_PAGE_SIZE = 6;
const DEFAULT_REPORT_COVER_CROP: ReportCoverCropState = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: 1,
};
const EMPTY_COVER_OPTIONS: CoverOption[] = [];
const EMPTY_EDITABLE_REPORT_FORM: EditableNewsReportForm = {
  body: "",
  dek: "",
  how: "",
  reporterComment: "",
  title: "",
  what: "",
  when: "",
  where: "",
  who: "",
  why: "",
};

function getEditableReportForm(
  report: FanletterNewsReportComposerSource["existingReport"],
): EditableNewsReportForm {
  if (!report) {
    return EMPTY_EDITABLE_REPORT_FORM;
  }

  return {
    body: report.body,
    dek: report.dek,
    how: report.how,
    reporterComment: report.reporterComment ?? "",
    title: report.title,
    what: report.what,
    when: report.when,
    where: report.where,
    who: report.who,
    why: report.why,
  };
}

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
        chooseCover: "대표 뉴스 이미지 선택",
        chooseTeasers: "공개 티저 컷 선택",
        coverOrder: "프레임 시간순",
        chooseVlog: "브이로그 선택",
        teaserStep: "3. 대표 이미지와 공개 컷",
        commentHelper:
          "동영상 전체가 아니라 티저 이미지와 공개 메타만 보고 작성하는 팬 기자 코멘트입니다.",
        commentLabel: "팬 기자 코멘트",
        commentPlaceholder:
          "예: 이 티저 컷에서 팬들이 기대할 만한 장면을 짚어주세요.",
        cropHelper:
          "대표 뉴스 이미지는 16:9로, 공개 티저 컷은 필요할 때 9:16 세로 이미지로 따로 저장합니다.",
        cropStep: "4. 이미지 크롭",
        cropTitle: "대표 이미지와 9:16 티저 크롭",
        emptyBody:
          "아직 리포트로 만들 수 있는 브이로그 후보가 없습니다.",
        emptyTitle: "작성 가능한 브이로그가 없습니다.",
        existingReportsBody:
          "이미 발행된 리포트의 제목, 관점, 대표 이미지를 비교해서 새 리포트의 차별점을 잡으세요.",
        existingReportsTitle: "이미 발행된 리포트",
        firstReportOpportunity: "첫 리포트",
        myReport: "내 리포트",
        myReportFilterAll: "전체",
        myReportFilterBody:
          "로그인한 회원이 리포트를 작성했는지 기준으로 브이로그 후보를 좁힙니다.",
        myReportFilterLabel: "내 리포트 상태",
        myReportFilterReported: "내가 작성함",
        myReportFilterUnreported: "미작성",
        myReportUnwritten: "미작성",
        myReportWritten: "내가 작성함",
        existing: "이미 작성함",
        existingBody:
          "이미 이 브이로그로 작성한 리포트가 있습니다. 이 화면에서 바로 수정하고 저장할 수 있습니다.",
        existingEdit: "편집 화면 열기",
        existingView: "기존 리포트 보기",
        editInline: {
          body: "본문",
          bodyHelp:
            "공개 뉴스 본문에 반영됩니다. 원본 브이로그 맥락과 다르게 보이지 않게 유지해 주세요.",
          dek: "요약",
          error: "리포트를 저장하지 못했습니다. 입력값을 확인해 주세요.",
          facts: "육하원칙",
          reporterComment: "기자 코멘트",
          reporterCommentHelp: "AI 생성에 참고한 개인 메모입니다. 비워둘 수 있습니다.",
          openInline: "이 화면에서 수정",
          save: "변경 저장",
          saved: "변경사항을 저장했습니다.",
          saving: "저장 중",
          title: "내 리포트 바로 수정",
          titleField: "제목",
          viewUpdated: "공개 뉴스 확인",
          fields: {
            how: "어떻게",
            what: "무엇을",
            when: "언제",
            where: "어디서",
            who: "누가",
            why: "왜",
          },
        },
        failed: "리포트를 만들지 못했습니다.",
        filterEmptyBody:
          "검색어, NSFW 포함 여부, 내 리포트 상태 조건을 바꿔 다시 확인하세요.",
        filterEmptyTitle: "조건에 맞는 브이로그가 없습니다.",
        firstStep: "1. 브이로그 후보 선택",
        imageOnly:
          "작성실은 원본 동영상 없이 티저 이미지와 공개 메타만 사용합니다.",
        imageSize: "이미지 크기",
        lead:
          "공개 브이로그와 구매한 유료 브이로그를 선택해 티저 이미지, AI 캐릭터 정보, 기존 리포트, 공개 메타를 기준으로 뉴스 리포트를 작성합니다.",
        locked: "단독 보도권",
        mediaAccess: {
          deskBody:
            "작성실에서는 원본 브이로그를 재생하지 않습니다. 공개 메타, AI 캐릭터 정보, 기존 리포트, 티저 이미지만 기준으로 작성하세요.",
          deskTitle: "티저 기반 작성",
          lockedBody:
            "이 유료 브이로그는 구매해야 리포트를 발행할 수 있습니다. 구매 전에는 저장된 프레임과 공개 메타를 확인해 리포트 작성 여부를 판단하세요.",
          lockedTitle: "구매 후 리포트 작성 가능",
          noVideo: "원본 동영상 비공개",
          noVideoBody:
            "브이로그 원본은 작성실에서 재생하지 않습니다. 유료 콘텐츠는 구매 후에도 티저 기반 작성만 허용됩니다.",
          openPurchase: "1 USDT 결제하기",
          previewVideo: {
            body:
              "저장된 짧은 프리뷰가 있는 브이로그는 리포트 작성 전에 흐름을 확인할 수 있습니다. 원본 전체 영상은 계속 보호됩니다.",
            badge: "프리뷰",
            hiddenBody:
              "NSFW 블러 상태에서는 프리뷰 동영상을 불러오지 않습니다. NSFW를 켜면 저장된 프리뷰를 확인할 수 있습니다.",
            hiddenTitle: "NSFW 프리뷰 숨김",
            title: "블로그 동영상 프리뷰",
          },
          purchaseOnceBody:
            "결제는 이 작성 권한 영역에서 한 번만 진행합니다. 결제 후 선택한 브이로그가 유지되고 티저 선택, 크롭, 리포트 발행 도구가 열립니다.",
          previewBadge: "미리보기",
          previewBeforePurchase: "구매 전 프레임 미리보기",
          previewBeforePurchaseBody:
            "리포터가 구매할지 결정할 수 있도록 저장된 동영상 프레임은 먼저 보여줍니다. 크롭, 코멘트 작성, 리포트 발행은 결제 후 열립니다.",
          previewOnlyBody:
            "아래 프레임은 구매 판단용 미리보기입니다. 공개 컷 선택과 뉴스 이미지 크롭은 결제 완료 후 가능합니다.",
          purchased: "구매함",
          ready: "작성 가능",
          reportUnlockBody:
            "구매가 완료되면 이 자리에서 리포터 관점 입력과 뉴스 리포트 발행 버튼이 순서대로 표시됩니다.",
          reportUnlockTitle: "결제 후 작성 도구 열림",
          reportLocked: "구매 후 작성",
          sourceStep: "2. 작성 권한",
          teaserLocked: "구매 후 작성",
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
        publishReadiness: {
          access: "작성 권한",
          angle: "리포터 관점",
          body:
            "뉴스 이미지, 공개 컷, 관점, 권한을 확인하고 바로 발행하세요.",
          cover: "뉴스 이미지",
          statusReady: "발행 가능",
          statusWaiting: "준비 필요",
          teasers: (count: string) => `공개 컷 ${count}장`,
          title: "발행 준비",
        },
        readReport: "리포트 보기",
        reportCount: "기존 리포트",
        reporter: "팬 기자",
        recommendedAngle: "추천 관점",
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
        pagination: {
          label: "브이로그 후보 페이지",
          next: "다음",
          previous: "이전",
          range: (start: string, end: string, total: string) =>
            `${start}-${end} / ${total}`,
        },
        nsfwFilterLabel: "NSFW 콘텐츠",
        nsfwIncluded: "NSFW 포함",
        nsfwExcluded: "NSFW 블러",
        nsfwIncludedBody:
          "성인 브이로그 후보와 티저 이미지를 그대로 표시합니다. 작성 시에는 티저와 공개 메타 기준으로만 리포트가 생성됩니다.",
        nsfwExcludedBody:
          "브이로그 후보는 그대로 유지하고 성인 티저 이미지만 흐림 처리합니다.",
        nsfwTurnOff: "NSFW 끄기",
        nsfwTurnOn: "NSFW 켜기",
        select: "선택",
        selected: "선택됨",
        sourceSort: {
          label: "보기 방식",
          latest: "최신 업로드",
          recommended: "추천 우선",
        },
        teaserSelection: {
          body:
            "뉴스 독자가 회원가입 전에 볼 수 있는 공개 컷입니다. 선택만 하면 원본 비율을 유지하고, 필요한 컷은 9:16 세로 티저로 저장할 수 있습니다.",
          include: "공개 컷에 추가",
          included: "공개 컷 포함",
          limit: (count: string) => `최대 ${count}장`,
          ratio: "선택 저장 9:16",
        },
        teaserCrop: {
          coverBody: "뉴스 카드와 공유 썸네일에 쓰이는 대표 이미지입니다.",
          coverTitle: "대표 뉴스 이미지",
          previewTitle: "9:16 저장 미리보기",
          remove: "원본 컷으로 되돌리기",
          save: "9:16 티저 컷으로 저장",
          saved: "9:16 티저 저장됨",
          saving: "9:16 티저 저장 중",
          teaserBody:
            "모바일 뉴스 상세에서 공개 티저 컷을 세로 화면에 맞게 보여줄 때 사용합니다.",
          teaserTitle: "공개 티저 컷",
        },
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
        sourceReveal: {
          early: "선점 후보",
          filterAll: "전체",
          filterBody:
            "미작성·락 상태 후보를 먼저 보여줘 팬 오픈 보상을 노릴 브이로그를 빠르게 고르게 합니다.",
          filterLabel: "팬 오픈 우선순위",
          fanOpenMetric: "팬 오픈",
          lockedFilter: "락",
          locked: "락",
          lowCompetition: "경쟁 낮음",
          opportunityAlreadyReported: "이미 작성함",
          opportunityExclusive: "단독 보도권 대기",
          opportunityPaidLocked: "구매 후 작성",
          opportunityReady: "작성 후보",
          opportunitySummaryBody:
            "작성실에서는 팬 오픈 상태만 확인합니다. 독자 참여는 발행된 뉴스에서 진행될 때 해당 리포터 보상으로 연결됩니다.",
          opportunitySummaryLabel: "리포터 기회 요약",
          remainingMetric: "남은 팬",
          near: "마감 임박",
          opportunity: "추천 후보",
          remaining: (count: string) => `${count}명 남음`,
          reportableNow: "바로 작성 가능",
          rewardAvailable: "오픈 보상 가능",
          rewardClosed: "오픈 보상 종료",
          recommended: "추천",
          teaserMissingShort: "티저 없음",
          teaserReadyShort: "티저 있음",
          unlocked: "언락",
          unlockedFilter: "언락",
          writeStateMetric: "작성 상태",
        },
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
        chooseCover: "Choose lead news image",
        chooseTeasers: "Choose public teaser cuts",
        coverOrder: "Frame time order",
        chooseVlog: "Choose vlog",
        teaserStep: "3. Lead image and public cuts",
        commentHelper:
          "This reporter note is written from teaser images and public metadata, not full video playback.",
        commentLabel: "Fan reporter comment",
        commentPlaceholder:
          "Example: Point out what fans should anticipate from this teaser cut.",
        cropHelper:
          "Save the lead news image at 16:9, and optionally save public teaser cuts as separate 9:16 portrait images.",
        cropStep: "4. Image crop",
        cropTitle: "Lead image and 9:16 teaser crop",
        emptyBody: "There are no vlog candidates available for reports yet.",
        emptyTitle: "No vlogs available.",
        existingReportsBody:
          "Compare published report titles, angles, and lead images before choosing a distinct angle.",
        existingReportsTitle: "Published reports",
        firstReportOpportunity: "First report",
        myReport: "My report",
        myReportFilterAll: "All",
        myReportFilterBody:
          "Filter vlog candidates by whether the signed-in member already created a report.",
        myReportFilterLabel: "My report status",
        myReportFilterReported: "Reported by me",
        myReportFilterUnreported: "Not reported",
        myReportUnwritten: "Not reported",
        myReportWritten: "Reported by me",
        existing: "Already reported",
        existingBody:
          "You already created a report for this vlog. You can edit and save it on this screen.",
        existingEdit: "Open edit page",
        existingView: "View existing report",
        editInline: {
          body: "Body",
          bodyHelp:
            "This appears in the public news story. Keep it aligned with the source vlog context.",
          dek: "Summary",
          error: "Could not save the report. Check the fields and try again.",
          facts: "Five Ws and one H",
          reporterComment: "Reporter comment",
          reporterCommentHelp:
            "Private note used for AI generation. This can be left empty.",
          openInline: "Edit here",
          save: "Save changes",
          saved: "Changes saved.",
          saving: "Saving",
          title: "Edit my report here",
          titleField: "Title",
          viewUpdated: "Open public news",
          fields: {
            how: "How",
            what: "What",
            when: "When",
            where: "Where",
            who: "Who",
            why: "Why",
          },
        },
        failed: "Could not create the report.",
        filterEmptyBody:
          "Adjust the query, NSFW setting, or my-report status filter and try again.",
        filterEmptyTitle: "No vlogs match these filters.",
        firstStep: "1. Choose a vlog candidate",
        imageOnly:
          "The reporter desk uses teaser images and public metadata without source video playback.",
        imageSize: "Image size",
        lead:
          "Choose a public vlog or a paid vlog you purchased, then create a report from teaser images, AI character info, published reports, and public metadata.",
        locked: "Exclusive access",
        mediaAccess: {
          deskBody:
            "Source video playback is not available in this desk. Write from public metadata, the AI character profile, existing reports, and teaser images.",
          deskTitle: "Teaser-based reporting",
          lockedBody:
            "This paid vlog requires purchase before publishing a report. Before buying, inspect saved frames and public metadata to decide whether it is worth reporting.",
          lockedTitle: "Purchase required to report",
          noVideo: "Source video hidden",
          noVideoBody:
            "The original vlog stays off the reporting desk. Paid content still requires purchase before teaser-based reporting.",
          openPurchase: "Pay 1 USDT",
          previewVideo: {
            body:
              "When a saved short preview exists, reporters can review the vlog flow before writing. The full source video remains protected.",
            badge: "Preview",
            hiddenBody:
              "The preview video is not loaded while NSFW blur is enabled. Turn on NSFW visibility to review the saved preview.",
            hiddenTitle: "NSFW preview hidden",
            title: "Blog video preview",
          },
          purchaseOnceBody:
            "Payment is handled once in this reporting-access block. After purchase, the selected vlog stays active and teaser selection, cropping, and publishing tools open.",
          previewBadge: "Preview",
          previewBeforePurchase: "Frame preview before purchase",
          previewBeforePurchaseBody:
            "Saved video frames are visible first so reporters can decide whether to buy. Cropping, notes, and publishing unlock after payment.",
          previewOnlyBody:
            "The frames below are decision previews. Public cut selection and news-image cropping unlock after payment.",
          purchased: "Purchased",
          ready: "Ready to report",
          reportUnlockBody:
            "After purchase, the reporter angle field and news report publish button appear here in sequence.",
          reportUnlockTitle: "Authoring tools unlock after payment",
          reportLocked: "Report after purchase",
          sourceStep: "2. Reporting access",
          teaserLocked: "Report after purchase",
          teaserReady: "Teaser images available",
          unpaid: "Not purchased",
        },
        noCover: "This vlog does not have teaser images for reporting yet.",
        price: {
          free: "Public",
          paid: "1 USDT paid",
        },
        publishedAt: "Published",
        publishReadiness: {
          access: "Report access",
          angle: "Reporter angle",
          body:
            "Check the news image, public cuts, angle, and access before publishing.",
          cover: "News image",
          statusReady: "Ready",
          statusWaiting: "Needs setup",
          teasers: (count: string) => `${count} public cuts`,
          title: "Publish readiness",
        },
        readReport: "View report",
        reportCount: "Existing reports",
        reporter: "Reporter",
        recommendedAngle: "Recommended angle",
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
        pagination: {
          label: "Vlog candidate pages",
          next: "Next",
          previous: "Previous",
          range: (start: string, end: string, total: string) =>
            `${start}-${end} / ${total}`,
        },
        nsfwFilterLabel: "NSFW content",
        nsfwIncluded: "NSFW included",
        nsfwExcluded: "NSFW blurred",
        nsfwIncludedBody:
          "Adult vlog candidates and teaser images are shown as-is. Reports are still generated only from teasers and public metadata.",
        nsfwExcludedBody:
          "Vlog candidates stay visible while adult teaser images are blurred.",
        nsfwTurnOff: "Turn NSFW off",
        nsfwTurnOn: "Turn NSFW on",
        select: "Select",
        selected: "Selected",
        sourceSort: {
          label: "View mode",
          latest: "Newest uploads",
          recommended: "Recommended",
        },
        teaserSelection: {
          body:
            "These are public cuts readers can see before signing in. Selected cuts keep the source ratio by default, and important cuts can be saved as 9:16 portrait teasers.",
          include: "Add public cut",
          included: "Public cut",
          limit: (count: string) => `Up to ${count}`,
          ratio: "Optional 9:16 save",
        },
        teaserCrop: {
          coverBody: "Used for news cards and share thumbnails.",
          coverTitle: "Lead news image",
          previewTitle: "9:16 save preview",
          remove: "Revert to source cut",
          save: "Save 9:16 teaser cut",
          saved: "9:16 teaser saved",
          saving: "Saving 9:16 teaser",
          teaserBody:
            "Used to present the public teaser cut in a mobile-first portrait layout.",
          teaserTitle: "Public teaser cut",
        },
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
        sourceReveal: {
          early: "Early claim",
          filterAll: "All",
          filterBody:
            "Prioritize unreported locked vlogs so reporters can find fan-open reward opportunities faster.",
          filterLabel: "Fan open priority",
          fanOpenMetric: "Fan open",
          lockedFilter: "Locked",
          locked: "Locked",
          lowCompetition: "Low competition",
          opportunityAlreadyReported: "Already reported",
          opportunityExclusive: "Exclusive pending",
          opportunityPaidLocked: "Purchase to report",
          opportunityReady: "Report candidate",
          opportunitySummaryBody:
            "The composer only shows fan-open status. Reader actions are attributed to the reporter from the published news page.",
          opportunitySummaryLabel: "Reporter opportunity",
          remainingMetric: "Fans left",
          near: "Near unlock",
          opportunity: "Recommended",
          remaining: (count: string) => `${count} left`,
          reportableNow: "Ready now",
          rewardAvailable: "Open reward available",
          rewardClosed: "Open reward closed",
          recommended: "Recommended",
          teaserMissingShort: "No teaser",
          teaserReadyShort: "Teaser ready",
          unlocked: "Unlocked",
          unlockedFilter: "Unlocked",
          writeStateMetric: "Report status",
        },
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

function getPaginationPages(currentPage: number, pageCount: number) {
  const pages = new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((left, right) => left - right);
}

function getSourceRevealCount(source: FanletterNewsReportComposerSource) {
  return Math.min(source.sourceReveal.count, source.sourceReveal.threshold);
}

function getSourceRevealRemaining(source: FanletterNewsReportComposerSource) {
  return Math.max(0, source.sourceReveal.threshold - source.sourceReveal.count);
}

function isSourceRevealLocked(source: FanletterNewsReportComposerSource) {
  return !source.sourceReveal.unlocked;
}

function isNearSourceRevealUnlock(source: FanletterNewsReportComposerSource) {
  const remaining = getSourceRevealRemaining(source);

  return isSourceRevealLocked(source) && remaining > 0 && remaining <= 2;
}

function isEarlySourceRevealClaim(source: FanletterNewsReportComposerSource) {
  return isSourceRevealLocked(source) && getSourceRevealCount(source) <= 2;
}

function isSourceExclusiveBlockedForReporter({
  reporterReferralCode,
  source,
}: {
  reporterReferralCode: string;
  source: FanletterNewsReportComposerSource;
}) {
  return Boolean(
    source.exclusiveNews.active &&
      source.exclusiveNews.reporterReferralCode !== reporterReferralCode,
  );
}

function canReporterCreateFromSource({
  reporterReferralCode,
  source,
}: {
  reporterReferralCode: string;
  source: FanletterNewsReportComposerSource;
}) {
  return Boolean(
    !source.existingReport &&
      source.mediaAccess.canView &&
      source.coverOptions.length > 0 &&
      !isSourceExclusiveBlockedForReporter({ reporterReferralCode, source }),
  );
}

function isSourceRevealOpportunitySource({
  reporterReferralCode,
  source,
}: {
  reporterReferralCode: string;
  source: FanletterNewsReportComposerSource;
}) {
  return (
    canReporterCreateFromSource({ reporterReferralCode, source }) &&
    isSourceRevealLocked(source)
  );
}

function isFirstReportOpportunitySource(
  source: FanletterNewsReportComposerSource,
) {
  return source.reportCount === 0;
}

function isLowCompetitionSource(source: FanletterNewsReportComposerSource) {
  return source.reportCount <= 1;
}

function matchesSourceRevealFilter({
  filter,
  reporterReferralCode,
  source,
}: {
  filter: FanletterNewsReportComposerSourceRevealFilter;
  reporterReferralCode: string;
  source: FanletterNewsReportComposerSource;
}) {
  if (filter === "all") {
    return true;
  }

  if (filter === "opportunity") {
    return isSourceRevealOpportunitySource({ reporterReferralCode, source });
  }

  if (filter === "locked") {
    return isSourceRevealLocked(source);
  }

  if (filter === "near") {
    return isNearSourceRevealUnlock(source);
  }

  if (filter === "early") {
    return isEarlySourceRevealClaim(source);
  }

  return source.sourceReveal.unlocked;
}

function getSourceOpportunityScore({
  reporterReferralCode,
  source,
}: {
  reporterReferralCode: string;
  source: FanletterNewsReportComposerSource;
}) {
  let score = 0;
  const canCreate = canReporterCreateFromSource({ reporterReferralCode, source });
  const count = getSourceRevealCount(source);

  if (canCreate) {
    score += 120;
  }

  if (!source.existingReport) {
    score += 90;
  }

  if (isFirstReportOpportunitySource(source)) {
    score += 34;
  } else if (isLowCompetitionSource(source)) {
    score += 14;
  } else if (source.reportCount >= 3) {
    score -= 16;
  }

  if (isSourceRevealLocked(source)) {
    score += 80;
    score += count >= 1 && count <= 3 ? 35 : 0;
    score += count >= 4 && count < source.sourceReveal.threshold ? 24 : 0;
    score += count === 0 ? 16 : 0;
  } else {
    score -= 80;
  }

  if (source.coverOptions.length > 0) {
    score += 20;
  }

  if (source.mediaAccess.requiresPurchase) {
    score -= 45;
  }

  return score;
}

function getRecommendedReportAngle(
  source: FanletterNewsReportComposerSource | null,
  copy: ReturnType<typeof getCopy>,
) {
  const [
    firstReportAngle,
    fanRequestAngle,
    paidVlogAngle,
    characterDailyAngle,
    unlockAngle,
    teaserAngle,
  ] = copy.angles;

  if (!source) {
    return firstReportAngle ?? "";
  }

  if (source.priceType === "paid") {
    return paidVlogAngle ?? firstReportAngle ?? "";
  }

  if (isFirstReportOpportunitySource(source)) {
    return firstReportAngle ?? "";
  }

  if (isNearSourceRevealUnlock(source)) {
    return fanRequestAngle ?? unlockAngle ?? firstReportAngle ?? "";
  }

  if (isSourceRevealLocked(source)) {
    return unlockAngle ?? fanRequestAngle ?? firstReportAngle ?? "";
  }

  if (source.coverOptions.length > 0) {
    return teaserAngle ?? firstReportAngle ?? "";
  }

  return characterDailyAngle ?? firstReportAngle ?? "";
}

function getPublishedAtTime(source: FanletterNewsReportComposerSource) {
  const timestamp = source.publishedAt ? new Date(source.publishedAt).getTime() : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareSourcesByLatestUpload(
  left: FanletterNewsReportComposerSource,
  right: FanletterNewsReportComposerSource,
) {
  return getPublishedAtTime(right) - getPublishedAtTime(left);
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

function formatCoverOptionImageSize(option: CoverOption, locale: Locale) {
  if (
    !option.width ||
    !option.height ||
    !Number.isFinite(option.width) ||
    !Number.isFinite(option.height) ||
    option.width <= 0 ||
    option.height <= 0
  ) {
    return null;
  }

  return `${formatNumber(option.width, locale)}x${formatNumber(
    option.height,
    locale,
  )}`;
}

function getCoverOptionPreviewStyle(option: CoverOption) {
  if (
    option.width &&
    option.height &&
    Number.isFinite(option.width) &&
    Number.isFinite(option.height) &&
    option.width > 0 &&
    option.height > 0
  ) {
    return {
      aspectRatio: `${option.width} / ${option.height}`,
      backgroundImage: `url(${option.imageUrl})`,
    };
  }

  return {
    aspectRatio: "16 / 10",
    backgroundImage: `url(${option.imageUrl})`,
  };
}

function getDefaultReportTeaserImageUrls(
  source: FanletterNewsReportComposerSource | null,
) {
  return [
    ...new Set(
      (source?.coverOptions ?? [])
        .map((option) => option.imageUrl.trim())
        .filter(Boolean),
    ),
  ].slice(0, REPORT_TEASER_IMAGE_LIMIT);
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

function getReportCoverCropRect({
  crop,
  naturalSize,
}: {
  crop: ReportCoverCropState;
  naturalSize: ReportCoverNaturalSize | null;
}): ReportCoverCropRect | null {
  return getReportImageCropRect({
    aspectRatio: REPORT_COVER_CROP_ASPECT_RATIO,
    crop,
    naturalSize,
  });
}

function getReportTeaserCropRect({
  crop,
  naturalSize,
}: {
  crop: ReportCoverCropState;
  naturalSize: ReportCoverNaturalSize | null;
}): ReportCoverCropRect | null {
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

export function FanletterNewsReportComposerPage({
  connectHref,
  currentHref,
  defaultReportStatusFilter,
  defaultSourceRevealFilter,
  includeNsfw,
  initialSelectedContentId,
  locale,
  onboardingHref,
  reportNewHref,
  reportStatusFilter,
  reporterReferralCode,
  reportsHref,
  searchQuery,
  sourcePage,
  sourceRevealFilter,
  sourceSort,
  sources,
}: {
  connectHref: string;
  currentHref: string;
  defaultReportStatusFilter: FanletterNewsReportComposerReportStatusFilter;
  defaultSourceRevealFilter: FanletterNewsReportComposerSourceRevealFilter;
  includeNsfw: boolean;
  initialSelectedContentId: string;
  locale: Locale;
  onboardingHref: string;
  reportNewHref: string;
  reportStatusFilter: FanletterNewsReportComposerReportStatusFilter;
  reporterReferralCode: string;
  reportsHref: string;
  searchQuery: string;
  sourcePage: number;
  sourceRevealFilter: FanletterNewsReportComposerSourceRevealFilter;
  sourceSort: FanletterNewsReportComposerSourceSort;
  sources: FanletterNewsReportComposerSource[];
}) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const reportSources = sources;
  const sourceRevealSummary = useMemo(() => {
    const opportunity = reportSources.filter((source) =>
      isSourceRevealOpportunitySource({ reporterReferralCode, source }),
    ).length;

    return {
      early: reportSources.filter(isEarlySourceRevealClaim).length,
      locked: reportSources.filter(isSourceRevealLocked).length,
      near: reportSources.filter(isNearSourceRevealUnlock).length,
      opportunity,
      unlocked: reportSources.filter((source) => source.sourceReveal.unlocked)
        .length,
    };
  }, [reporterReferralCode, reportSources]);
  const displayedSources = useMemo(
    () =>
      reportSources
        .filter((source) =>
          matchesSourceRevealFilter({
            filter: sourceRevealFilter,
            reporterReferralCode,
            source,
          }),
        )
        .sort((left, right) => {
          if (sourceSort === "latest") {
            return compareSourcesByLatestUpload(left, right);
          }

          const rightScore = getSourceOpportunityScore({
            reporterReferralCode,
            source: right,
          });
          const leftScore = getSourceOpportunityScore({
            reporterReferralCode,
            source: left,
          });

          return (
            rightScore - leftScore ||
            compareSourcesByLatestUpload(left, right)
          );
        }),
    [reporterReferralCode, reportSources, sourceRevealFilter, sourceSort],
  );
  const sourcePageCount = Math.max(
    1,
    Math.ceil(displayedSources.length / SOURCE_RESULT_PAGE_SIZE),
  );
  const currentSourcePage = clampNumber(sourcePage, 1, sourcePageCount);
  const currentSourcePageStart =
    displayedSources.length === 0
      ? 0
      : (currentSourcePage - 1) * SOURCE_RESULT_PAGE_SIZE;
  const currentSourcePageEnd = Math.min(
    currentSourcePageStart + SOURCE_RESULT_PAGE_SIZE,
    displayedSources.length,
  );
  const paginatedSources = displayedSources.slice(
    currentSourcePageStart,
    currentSourcePageEnd,
  );
  const paginationPages = getPaginationPages(currentSourcePage, sourcePageCount);
  const shouldShowSourcePagination = displayedSources.length > SOURCE_RESULT_PAGE_SIZE;
  const firstAvailableSource =
    paginatedSources.find(
      (source) =>
        canReporterCreateFromSource({ reporterReferralCode, source }),
    ) ??
    paginatedSources[0] ??
    displayedSources[0] ??
    null;
  const initialSelectedSource =
    displayedSources.find(
      (source) => source.contentId === initialSelectedContentId,
    ) ??
    reportSources.find((source) => source.contentId === initialSelectedContentId) ??
    firstAvailableSource;
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    initialSelectedSource?.contentId ?? null,
  );
  const selectedSource = useMemo(
    () =>
      reportSources.find((source) => source.contentId === selectedContentId) ??
      null,
    [reportSources, selectedContentId],
  );
  const selectedSourceContentId = selectedSource?.contentId ?? null;
  const selectedSourceCoverOptions =
    selectedSource?.coverOptions ?? EMPTY_COVER_OPTIONS;
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(
    initialSelectedSource?.coverOptions[0]?.imageUrl ?? null,
  );
  const [selectedTeaserUrls, setSelectedTeaserUrls] = useState<string[]>(
    getDefaultReportTeaserImageUrls(initialSelectedSource),
  );
  const [croppedTeaserBySourceUrl, setCroppedTeaserBySourceUrl] = useState<
    Record<string, CroppedTeaserImage>
  >({});
  const [angle, setAngle] = useState(
    getRecommendedReportAngle(initialSelectedSource, copy),
  );
  const [reporterComment, setReporterComment] = useState("");
  const [crop, setCrop] = useState<ReportCoverCropState>(
    DEFAULT_REPORT_COVER_CROP,
  );
  const [teaserCrop, setTeaserCrop] = useState<ReportCoverCropState>(
    DEFAULT_REPORT_COVER_CROP,
  );
  const [naturalSize, setNaturalSize] = useState<ReportCoverNaturalSize | null>(
    null,
  );
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [teaserCropStatus, setTeaserCropStatus] = useState<"idle" | "saving">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [editReportForm, setEditReportForm] = useState<EditableNewsReportForm>(
    () => getEditableReportForm(initialSelectedSource?.existingReport ?? null),
  );
  const [editReportStatus, setEditReportStatus] = useState<"idle" | "saving">(
    "idle",
  );
  const [editReportMessage, setEditReportMessage] = useState<string | null>(null);
  const [editReportHref, setEditReportHref] = useState<string | null>(
    initialSelectedSource?.existingReport?.href ?? null,
  );
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const teaserCropFrameRef = useRef<HTMLDivElement | null>(null);
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);
  const editReportFormRef = useRef<HTMLFormElement | null>(null);
  const previousSelectedContentIdRef = useRef<string | null>(
    initialSelectedSource?.contentId ?? null,
  );
  const cropDragRef = useRef<{
    cropKind: "cover" | "teaser";
    initialCrop: ReportCoverCropState;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const coverCropRect = useMemo(
    () => getReportCoverCropRect({ crop, naturalSize }),
    [crop, naturalSize],
  );
  const teaserCropRect = useMemo(
    () => getReportTeaserCropRect({ crop: teaserCrop, naturalSize }),
    [naturalSize, teaserCrop],
  );
  const previewImageStyle =
    coverCropRect && naturalSize
      ? getReportCropPreviewImageStyle({ cropRect: coverCropRect, naturalSize })
      : null;
  const teaserPreviewImageStyle =
    teaserCropRect && naturalSize
      ? getReportCropPreviewImageStyle({ cropRect: teaserCropRect, naturalSize })
      : null;
  const isExclusiveBlocked = Boolean(
    selectedSource?.exclusiveNews.active &&
      selectedSource.exclusiveNews.reporterReferralCode !== reporterReferralCode,
  );
  const isSelectedPaidLocked = Boolean(selectedSource?.mediaAccess.requiresPurchase);
  const shouldBlurNsfwMedia = !includeNsfw;
  const shouldBlurSelectedNsfwMedia = Boolean(
    shouldBlurNsfwMedia && selectedSource?.contentMaturityRating === "nsfw",
  );
  const selectedPreviewClipVideoUrl =
    selectedSource?.previewClipVideoUrl?.trim() || null;
  const selectedCoverOption = selectedSourceCoverOptions.find(
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
  const selectedExistingReport = selectedSource?.existingReport ?? null;
  const canSaveExistingReport = Boolean(
    selectedExistingReport &&
      editReportStatus !== "saving" &&
      editReportForm.title.trim() &&
      editReportForm.dek.trim() &&
      editReportForm.body.trim() &&
      editReportForm.who.trim() &&
      editReportForm.when.trim() &&
      editReportForm.where.trim() &&
      editReportForm.what.trim() &&
      editReportForm.why.trim() &&
      editReportForm.how.trim(),
  );
  const selectedSourceRevealCount = selectedSource
    ? getSourceRevealCount(selectedSource)
    : 0;
  const selectedSourceRevealRemaining = selectedSource
    ? getSourceRevealRemaining(selectedSource)
    : 0;
  const isSelectedSourceRevealLocked = Boolean(
    selectedSource && isSourceRevealLocked(selectedSource),
  );
  const isSelectedSourceRevealNear = Boolean(
    selectedSource && isNearSourceRevealUnlock(selectedSource),
  );
  const isSelectedSourceRevealEarly = Boolean(
    selectedSource && isEarlySourceRevealClaim(selectedSource),
  );
  const isSelectedOpportunitySource = Boolean(
    selectedSource &&
      isSourceRevealOpportunitySource({ reporterReferralCode, source: selectedSource }),
  );
  const canCreateSelectedSource = Boolean(
    selectedSource &&
      canReporterCreateFromSource({ reporterReferralCode, source: selectedSource }),
  );
  const selectedRecommendedAngle = getRecommendedReportAngle(selectedSource, copy);
  const publishReadinessItems = [
    {
      label: copy.publishReadiness.cover,
      ready: Boolean(selectedCoverUrl),
    },
    {
      label: copy.publishReadiness.teasers(
        formatNumber(selectedTeaserUrls.length, locale),
      ),
      ready: selectedTeaserUrls.length > 0,
    },
    {
      label: copy.publishReadiness.angle,
      ready: Boolean(angle.trim()),
    },
    {
      label: copy.publishReadiness.access,
      ready: canCreateSelectedSource,
    },
  ] as const;
  const selectedOpportunityStatusLabel = selectedSource
    ? isSelectedOpportunitySource
      ? copy.sourceReveal.opportunity
      : selectedSource.existingReport
        ? copy.sourceReveal.opportunityAlreadyReported
        : !isSelectedSourceRevealLocked
          ? copy.sourceReveal.unlocked
          : isSelectedPaidLocked
            ? copy.sourceReveal.opportunityPaidLocked
            : isExclusiveBlocked
              ? copy.sourceReveal.opportunityExclusive
              : copy.sourceReveal.opportunityReady
    : "";
  const nsfwToggleHref = useMemo(
    () =>
      setRelativeSearchParams(reportNewHref, {
        nsfw: includeNsfw ? "off" : null,
        q: searchQuery || null,
        sourceReveal:
          sourceRevealFilter === defaultSourceRevealFilter
            ? null
            : sourceRevealFilter,
      }),
    [
      defaultSourceRevealFilter,
      includeNsfw,
      reportNewHref,
      searchQuery,
      sourceRevealFilter,
    ],
  );
  const reportStatusFilterOptions = [
    {
      label: copy.myReportFilterAll,
      value: "all",
    },
    {
      label: copy.myReportFilterReported,
      value: "reported",
    },
    {
      label: copy.myReportFilterUnreported,
      value: "unreported",
    },
  ] as const;
  const sourceRevealFilterOptions = [
    {
      count: sourceRevealSummary.opportunity,
      label: copy.sourceReveal.opportunity,
      value: "opportunity",
    },
    {
      count: sourceRevealSummary.locked,
      label: copy.sourceReveal.lockedFilter,
      value: "locked",
    },
    {
      count: sourceRevealSummary.near,
      label: copy.sourceReveal.near,
      value: "near",
    },
    {
      count: sourceRevealSummary.early,
      label: copy.sourceReveal.early,
      value: "early",
    },
    {
      count: sourceRevealSummary.unlocked,
      label: copy.sourceReveal.unlockedFilter,
      value: "unlocked",
    },
    {
      count: reportSources.length,
      label: copy.sourceReveal.filterAll,
      value: "all",
    },
  ] as const;
  const sourceSortOptions = [
    {
      label: copy.sourceSort.recommended,
      value: "recommended",
    },
    {
      label: copy.sourceSort.latest,
      value: "latest",
    },
  ] as const;
  const editReportFactFields = [
    {
      field: "who",
      label: copy.editInline.fields.who,
    },
    {
      field: "when",
      label: copy.editInline.fields.when,
    },
    {
      field: "where",
      label: copy.editInline.fields.where,
    },
    {
      field: "what",
      label: copy.editInline.fields.what,
    },
    {
      field: "why",
      label: copy.editInline.fields.why,
    },
    {
      field: "how",
      label: copy.editInline.fields.how,
    },
  ] as const satisfies ReadonlyArray<{
    field: keyof Pick<
      EditableNewsReportForm,
      "how" | "what" | "when" | "where" | "who" | "why"
    >;
    label: string;
  }>;
  const getReportStatusFilterHref = useCallback(
    (nextReportStatusFilter: FanletterNewsReportComposerReportStatusFilter) =>
      setRelativeSearchParams(reportNewHref, {
        nsfw: includeNsfw ? null : "off",
        q: searchQuery || null,
        reportStatus:
          nextReportStatusFilter === defaultReportStatusFilter
            ? null
            : nextReportStatusFilter,
        sourceReveal:
          sourceRevealFilter === defaultSourceRevealFilter
            ? null
            : sourceRevealFilter,
        sourcePage: null,
        sourceSort: sourceSort === "recommended" ? null : sourceSort,
      }),
    [
      defaultReportStatusFilter,
      defaultSourceRevealFilter,
      includeNsfw,
      reportNewHref,
      searchQuery,
      sourceRevealFilter,
      sourceSort,
    ],
  );
  const getSourceRevealFilterHref = useCallback(
    (nextSourceRevealFilter: FanletterNewsReportComposerSourceRevealFilter) =>
      setRelativeSearchParams(reportNewHref, {
        nsfw: includeNsfw ? null : "off",
        q: searchQuery || null,
        reportStatus:
          reportStatusFilter === defaultReportStatusFilter
            ? null
            : reportStatusFilter,
        sourceReveal:
          nextSourceRevealFilter === defaultSourceRevealFilter
            ? null
            : nextSourceRevealFilter,
        sourcePage: null,
        sourceSort: sourceSort === "recommended" ? null : sourceSort,
      }),
    [
      defaultReportStatusFilter,
      defaultSourceRevealFilter,
      includeNsfw,
      reportNewHref,
      reportStatusFilter,
      searchQuery,
      sourceSort,
    ],
  );
  const getSourceSortHref = useCallback(
    (nextSourceSort: FanletterNewsReportComposerSourceSort) =>
      setRelativeSearchParams(reportNewHref, {
        nsfw: includeNsfw ? null : "off",
        q: searchQuery || null,
        reportStatus:
          reportStatusFilter === defaultReportStatusFilter
            ? null
            : reportStatusFilter,
        sourcePage: null,
        sourceReveal:
          sourceRevealFilter === defaultSourceRevealFilter
            ? null
            : sourceRevealFilter,
        sourceSort: nextSourceSort === "recommended" ? null : nextSourceSort,
      }),
    [
      defaultReportStatusFilter,
      defaultSourceRevealFilter,
      includeNsfw,
      reportNewHref,
      reportStatusFilter,
      searchQuery,
      sourceRevealFilter,
    ],
  );
  const paidUnlockSectionId = selectedSource
    ? `fanletter-report-composer-paid-unlock-${selectedSource.contentId}`
    : "fanletter-report-composer-paid-unlock";
  const selectedCurrentHref = useMemo(
    () =>
      setRelativeSearchParams(currentHref, {
        contentId: selectedSource?.contentId ?? selectedContentId ?? null,
      }),
    [currentHref, selectedContentId, selectedSource?.contentId],
  );
  const selectedConnectHref = useMemo(
    () => setRelativeSearchParams(connectHref, { returnTo: selectedCurrentHref }),
    [connectHref, selectedCurrentHref],
  );
  const selectedOnboardingHref = useMemo(
    () => setRelativeSearchParams(onboardingHref, { returnTo: selectedCurrentHref }),
    [onboardingHref, selectedCurrentHref],
  );
  const paidUnlockHref = `${selectedCurrentHref}#${paidUnlockSectionId}`;
  const selectedCreatorHref = selectedSource?.creatorReferralCode
    ? setRelativeSearchParams(
        `/${locale}/fanletter/news/characters/${selectedSource.creatorReferralCode}`,
        { ref: reporterReferralCode },
      )
    : reportsHref;
  const routeSelectionKey = [
    initialSelectedContentId,
    reportStatusFilter,
    searchQuery,
    sourcePage,
    sourceRevealFilter,
    sourceSort,
  ].join("\u0000");
  const previousRouteSelectionKeyRef = useRef(routeSelectionKey);
  const getSourcePageHref = useCallback(
    (nextSourcePage: number) =>
      setRelativeSearchParams(reportNewHref, {
        nsfw: includeNsfw ? null : "off",
        q: searchQuery || null,
        sourcePage: nextSourcePage > 1 ? String(nextSourcePage) : null,
      }),
    [includeNsfw, reportNewHref, searchQuery],
  );

  const selectSource = useCallback(
    (contentId: string) => {
      setSelectedContentId(contentId);

      if (typeof window === "undefined") {
        return;
      }

      window.history.replaceState(
        window.history.state,
        "",
        setRelativeSearchParams(currentHref, { contentId }),
      );

      if (!window.matchMedia("(max-width: 1023px)").matches) {
        return;
      }

      window.requestAnimationFrame(() => {
        selectedDetailRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      });
    },
    [currentHref],
  );
  const scrollToExistingReportEditor = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      editReportFormRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }, []);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (previousRouteSelectionKeyRef.current === routeSelectionKey) {
      return;
    }

    previousRouteSelectionKeyRef.current = routeSelectionKey;
    setSelectedContentId(initialSelectedSource?.contentId ?? null);
  }, [initialSelectedSource?.contentId, routeSelectionKey]);

  useEffect(() => {
    if (previousSelectedContentIdRef.current === selectedSourceContentId) {
      return;
    }

    previousSelectedContentIdRef.current = selectedSourceContentId;
    setAngle(getRecommendedReportAngle(selectedSource, copy));
    setReporterComment("");
    setEditReportForm(getEditableReportForm(selectedSource?.existingReport ?? null));
    setEditReportHref(selectedSource?.existingReport?.href ?? null);
    setEditReportMessage(null);
    setEditReportStatus("idle");
  }, [copy, selectedSource, selectedSourceContentId]);

  useEffect(() => {
    if (selectedSource || !firstAvailableSource?.contentId) {
      return;
    }

    setSelectedContentId(firstAvailableSource.contentId);
  }, [firstAvailableSource?.contentId, selectedSource]);

  useEffect(() => {
    const nextCoverUrl = selectedSourceCoverOptions[0]?.imageUrl ?? null;

    setSelectedCoverUrl(nextCoverUrl);
    setSelectedTeaserUrls(
      [
        ...new Set(
          selectedSourceCoverOptions
            .map((option) => option.imageUrl.trim())
            .filter(Boolean),
        ),
      ].slice(0, REPORT_TEASER_IMAGE_LIMIT),
    );
    setCroppedTeaserBySourceUrl({});
    setCrop(DEFAULT_REPORT_COVER_CROP);
    setTeaserCrop(DEFAULT_REPORT_COVER_CROP);
    setNaturalSize(null);
    setError(null);
  }, [selectedSourceContentId, selectedSourceCoverOptions]);

  const selectCoverImage = useCallback(
    (imageUrl: string) => {
      setSelectedCoverUrl(imageUrl);
      setCrop(DEFAULT_REPORT_COVER_CROP);
      setTeaserCrop(DEFAULT_REPORT_COVER_CROP);
      setNaturalSize(null);

      if (isSelectedPaidLocked) {
        return;
      }

      setSelectedTeaserUrls((current) => {
        if (current.includes(imageUrl)) {
          return current;
        }

        return [imageUrl, ...current].slice(0, REPORT_TEASER_IMAGE_LIMIT);
      });
    },
    [isSelectedPaidLocked],
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

  const handleCropPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!coverCropRect || !naturalSize) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      cropDragRef.current = {
        cropKind: "cover",
        initialCrop: crop,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [coverCropRect, crop, naturalSize],
  );

  const handleTeaserCropPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!teaserCropRect || !naturalSize) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      cropDragRef.current = {
        cropKind: "teaser",
        initialCrop: teaserCrop,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [naturalSize, teaserCrop, teaserCropRect],
  );

  const handleCropPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = cropDragRef.current;
      const frame =
        drag?.cropKind === "teaser"
          ? teaserCropFrameRef.current
          : cropFrameRef.current;
      const activeCropRect =
        drag?.cropKind === "teaser" ? teaserCropRect : coverCropRect;

      if (
        !drag ||
        drag.pointerId !== event.pointerId ||
        !frame ||
        !activeCropRect ||
        !naturalSize
      ) {
        return;
      }

      const frameRect = frame.getBoundingClientRect();
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const cropDeltaX =
        (deltaX / Math.max(frameRect.width, 1)) *
        (activeCropRect.width / naturalSize.width);
      const cropDeltaY =
        (deltaY / Math.max(frameRect.height, 1)) *
        (activeCropRect.height / naturalSize.height);
      const nextCrop = {
        centerX: drag.initialCrop.centerX - cropDeltaX,
        centerY: drag.initialCrop.centerY - cropDeltaY,
      };

      if (drag.cropKind === "teaser") {
        setTeaserCrop((current) => ({
          ...current,
          ...nextCrop,
        }));
        return;
      }

      setCrop((current) => ({
        ...current,
        ...nextCrop,
      }));
    },
    [coverCropRect, naturalSize, teaserCropRect],
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
    async ({
      aspectRatio,
      contentId,
      cropState,
      outputHeight,
      outputWidth,
      purpose = "cover",
      sourceImageUrl,
    }: {
      aspectRatio: number;
      contentId: string;
      cropState: ReportCoverCropState;
      outputHeight: number;
      outputWidth: number;
      purpose?: "cover" | "teaser";
      sourceImageUrl: string;
    }) => {
      const { blob, cropRect } = await createCroppedReportImageBlob({
        aspectRatio,
        crop: cropState,
        outputHeight,
        outputWidth,
        sourceImageUrl,
      });
      const file = new File(
        [blob],
        `fanletter-news-${purpose}-${contentId}.jpg`,
        {
          type: "image/jpeg",
        },
      );
      const formData = new FormData();

      formData.set("contentId", contentId);
      formData.set("file", file);
      formData.set("purpose", purpose);
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
          aspectRatio,
          height: cropRect.height,
          outputHeight,
          outputWidth,
          sourceImageUrl,
          width: cropRect.width,
          x: cropRect.x,
          y: cropRect.y,
        } satisfies ReportCoverCropPayload,
        url: data.url,
      };
    },
    [copy.failed],
  );

  const saveCroppedTeaserImage = useCallback(async () => {
    if (!selectedSource || !selectedCoverUrl || teaserCropStatus === "saving") {
      return;
    }

    setTeaserCropStatus("saving");
    setError(null);

    try {
      const croppedTeaser = await uploadCroppedReportImage({
        aspectRatio: REPORT_TEASER_CROP_ASPECT_RATIO,
        contentId: selectedSource.contentId,
        cropState: teaserCrop,
        outputHeight: REPORT_TEASER_CROP_OUTPUT_HEIGHT,
        outputWidth: REPORT_TEASER_CROP_OUTPUT_WIDTH,
        purpose: "teaser",
        sourceImageUrl: selectedCoverUrl,
      });

      setCroppedTeaserBySourceUrl((current) => ({
        ...current,
        [selectedCoverUrl]: {
          crop: croppedTeaser.crop,
          imageUrl: croppedTeaser.url,
          sourceImageUrl: selectedCoverUrl,
        },
      }));
      setSelectedTeaserUrls((current) => {
        if (current.includes(selectedCoverUrl)) {
          return current;
        }

        return [selectedCoverUrl, ...current].slice(0, REPORT_TEASER_IMAGE_LIMIT);
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : copy.failed);
    } finally {
      setTeaserCropStatus("idle");
    }
  }, [
    copy.failed,
    selectedCoverUrl,
    selectedSource,
    teaserCrop,
    teaserCropStatus,
    uploadCroppedReportImage,
  ]);

  const removeCroppedTeaserImage = useCallback((sourceImageUrl: string) => {
    setCroppedTeaserBySourceUrl((current) => {
      if (!current[sourceImageUrl]) {
        return current;
      }

      const next = { ...current };
      delete next[sourceImageUrl];

      return next;
    });
  }, []);

  const submitReport = useCallback(async () => {
    if (!selectedSource || !selectedCoverUrl || !canSubmit) {
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const croppedCover = await uploadCroppedReportImage({
        aspectRatio: REPORT_COVER_CROP_ASPECT_RATIO,
        contentId: selectedSource.contentId,
        cropState: crop,
        outputHeight: REPORT_COVER_CROP_OUTPUT_HEIGHT,
        outputWidth: REPORT_COVER_CROP_OUTPUT_WIDTH,
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
          selectedTeaserImages: selectedTeaserUrls.map((imageUrl) => {
            const croppedTeaser = croppedTeaserBySourceUrl[imageUrl];

            return croppedTeaser
              ? {
                  crop: croppedTeaser.crop,
                  imageUrl: croppedTeaser.imageUrl,
                  sourceImageUrl: croppedTeaser.sourceImageUrl,
                }
              : {
                  crop: null,
                  imageUrl,
                  sourceImageUrl: imageUrl,
                };
          }),
          selectedTeaserImageUrls: selectedTeaserUrls,
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
    crop,
    croppedTeaserBySourceUrl,
    locale,
    reporterComment,
    router,
    selectedCoverUrl,
    selectedTeaserUrls,
    selectedSource,
    uploadCroppedReportImage,
  ]);

  const updateEditReportField = useCallback(
    (field: keyof EditableNewsReportForm, value: string) => {
      setEditReportForm((current) => ({
        ...current,
        [field]: value,
      }));
      setEditReportMessage(null);
    },
    [],
  );

  const submitExistingReportEdit = useCallback(async () => {
    if (!selectedExistingReport || !canSaveExistingReport) {
      return;
    }

    setEditReportStatus("saving");
    setEditReportMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/fanletter/news-reports", {
        body: JSON.stringify({
          body: editReportForm.body,
          dek: editReportForm.dek,
          how: editReportForm.how,
          locale,
          reporterComment: editReportForm.reporterComment,
          reportId: selectedExistingReport.reportId,
          title: editReportForm.title,
          updateKind: "content",
          what: editReportForm.what,
          when: editReportForm.when,
          where: editReportForm.where,
          who: editReportForm.who,
          why: editReportForm.why,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = (await response.json().catch(() => null)) as
        | FanletterNewsReportContentUpdateResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("report" in data)) {
        throw new Error(
          data && "error" in data && data.error
            ? data.error
            : copy.editInline.error,
        );
      }

      setEditReportForm({
        body: data.report.body,
        dek: data.report.dek,
        how: data.report.how,
        reporterComment: data.report.reporterComment ?? "",
        title: data.report.title,
        what: data.report.what,
        when: data.report.when,
        where: data.report.where,
        who: data.report.who,
        why: data.report.why,
      });
      setEditReportHref(data.report.shareHref || selectedExistingReport.href);
      setEditReportMessage(copy.editInline.saved);
    } catch (error) {
      setEditReportMessage(
        error instanceof Error ? error.message : copy.editInline.error,
      );
    } finally {
      setEditReportStatus("idle");
    }
  }, [
    canSaveExistingReport,
    copy.editInline.error,
    copy.editInline.saved,
    editReportForm,
    locale,
    selectedExistingReport,
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
  const isFilteringSources = Boolean(
    searchQuery ||
      reportStatusFilter !== defaultReportStatusFilter ||
      sourceRevealFilter !== defaultSourceRevealFilter ||
      sourceSort !== "recommended",
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
      <div className="mt-3 rounded-xl border border-black/10 bg-white px-3 py-3">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-black text-[#111510]">
              <FileText className="size-4 text-[#16702e]" />
              {copy.myReportFilterLabel}
            </p>
            <p className="mt-1 text-[0.72rem] font-semibold leading-5 text-black/48">
              {copy.myReportFilterBody}
            </p>
          </div>
          <div
            aria-label={copy.myReportFilterLabel}
            className="grid w-full grid-cols-3 gap-1 rounded-full bg-[#f1f3ef] p-1"
            role="group"
          >
            {reportStatusFilterOptions.map((option) => {
              const isActive = option.value === reportStatusFilter;

              return (
                <Link
                  className={cn(
                    "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-2 text-[0.64rem] font-black transition sm:px-3",
                    isActive
                      ? "bg-[#111510] !text-white shadow-[0_6px_14px_rgba(17,21,16,0.12)]"
                      : "!text-black/48 hover:bg-white hover:!text-[#111510]",
                  )}
                  href={getReportStatusFilterHref(option.value)}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-[#19b84b]/18 bg-[#ecfff0] px-3 py-3">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-black text-[#111510]">
              <Sparkles className="size-4 text-[#16702e]" />
              {copy.sourceReveal.filterLabel}
            </p>
            <p className="mt-1 text-[0.72rem] font-semibold leading-5 text-black/52">
              {copy.sourceReveal.filterBody}
            </p>
          </div>
          <div
            aria-label={copy.sourceReveal.filterLabel}
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
            role="group"
          >
            {sourceRevealFilterOptions.map((option) => {
              const isActive = option.value === sourceRevealFilter;

              return (
                <Link
                  className={cn(
                    "inline-flex min-h-9 items-center justify-between gap-2 rounded-full border px-2.5 text-[0.64rem] font-black transition",
                    isActive
                      ? "border-[#111510] bg-[#111510] !text-white shadow-[0_6px_14px_rgba(17,21,16,0.12)]"
                      : "border-[#19b84b]/16 bg-white !text-black/54 hover:border-[#19b84b]/40 hover:!text-[#111510]",
                  )}
                  href={getSourceRevealFilterHref(option.value)}
                  key={option.value}
                >
                  <span className="truncate">{option.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[0.58rem]",
                      isActive ? "bg-white/12" : "bg-[#f1f3ef] text-black/42",
                    )}
                  >
                    {formatNumber(option.count, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-black/10 bg-white px-3 py-3">
        <div className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-black text-[#111510]">
            <RefreshCw className="size-4 text-[#16702e]" />
            {copy.sourceSort.label}
          </p>
          <div
            aria-label={copy.sourceSort.label}
            className="grid w-full grid-cols-2 gap-1 rounded-full bg-[#f1f3ef] p-1"
            role="group"
          >
            {sourceSortOptions.map((option) => {
              const isActive = option.value === sourceSort;

              return (
                <Link
                  className={cn(
                    "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-3 text-[0.64rem] font-black transition",
                    isActive
                      ? "bg-[#111510] !text-white shadow-[0_6px_14px_rgba(17,21,16,0.12)]"
                      : "!text-black/48 hover:bg-white hover:!text-[#111510]",
                  )}
                  href={getSourceSortHref(option.value)}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </form>
  );

  if (displayedSources.length === 0) {
    return (
      <main className="min-h-screen bg-[#f2f4ef] px-4 py-6 text-[#111510] sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl border border-dashed border-black/16 bg-white p-8 text-center shadow-[0_18px_46px_rgba(17,21,16,0.06)]">
          <Newspaper className="mx-auto size-10 text-[#16702e]" />
          <h1 className="mt-4 text-3xl font-black tracking-normal">
            {isFilteringSources ? copy.filterEmptyTitle : copy.emptyTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-black/58">
            {isFilteringSources ? copy.filterEmptyBody : copy.emptyBody}
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
            <h1 className="mt-4 max-w-3xl text-[2rem] font-black leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[3rem] lg:text-[3.25rem]">
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
                {shouldShowSourcePagination
                  ? copy.pagination.range(
                      formatNumber(currentSourcePageStart + 1, locale),
                      formatNumber(currentSourcePageEnd, locale),
                      formatNumber(displayedSources.length, locale),
                    )
                  : formatNumber(displayedSources.length, locale)}
              </span>
            </div>
            <div className="grid max-h-[42rem] gap-2 overflow-y-auto pr-1">
              {paginatedSources.map((source) => {
                const isSelected = source.contentId === selectedContentId;
                const isBlocked = isSourceExclusiveBlockedForReporter({
                  reporterReferralCode,
                  source,
                });
                const isPaidLocked = source.mediaAccess.requiresPurchase;
                const hasViewerReport = Boolean(source.existingReport);
                const shouldBlurSourceMedia =
                  shouldBlurNsfwMedia && source.contentMaturityRating === "nsfw";
                const sourceRevealCount = getSourceRevealCount(source);
                const sourceRevealRemaining = getSourceRevealRemaining(source);
                const isOpportunitySource = isSourceRevealOpportunitySource({
                  reporterReferralCode,
                  source,
                });
                const isFirstReportSource = isFirstReportOpportunitySource(source);
                const isLowCompetition = isLowCompetitionSource(source);

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
                      selectSource(source.contentId);
                    }}
                    type="button"
                  >
                    <span
                      className="relative block aspect-[4/5] overflow-hidden rounded-md bg-[#111510]"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-0 bg-cover bg-center transition",
                          shouldBlurSourceMedia && "scale-110 blur-md brightness-75",
                        )}
                        style={
                          source.coverImageUrl
                            ? { backgroundImage: `url(${source.coverImageUrl})` }
                            : undefined
                        }
                      />
                      {isPaidLocked ? (
                        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/72 px-1.5 py-0.5 text-[0.55rem] font-black text-white">
                          <LockKeyhole className="size-2.5 text-[#44f26e]" />
                          {copy.mediaAccess.reportLocked}
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
                        {isOpportunitySource ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#16702e] px-1.5 py-0.5 text-white">
                            <Sparkles className="size-2.5" />
                            {copy.sourceReveal.recommended}
                          </span>
                        ) : null}
                        {isFirstReportSource ? (
                          <span className="text-[#16702e]">
                            {copy.firstReportOpportunity}
                          </span>
                        ) : isLowCompetition ? (
                          <span className="text-[#16702e]">
                            {copy.sourceReveal.lowCompetition}
                          </span>
                        ) : null}
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
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            source.sourceReveal.unlocked
                              ? "text-[#16702e]"
                              : "text-black/42",
                          )}
                        >
                          {source.sourceReveal.unlocked ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <LockKeyhole className="size-3" />
                          )}
                          {source.sourceReveal.unlocked
                            ? copy.sourceReveal.unlocked
                            : copy.sourceReveal.locked}
                          <span>
                            {formatNumber(sourceRevealCount, locale)}/
                            {formatNumber(source.sourceReveal.threshold, locale)}
                          </span>
                        </span>
                        <span
                          className={
                            source.sourceReveal.unlocked
                              ? "text-black/36"
                              : "text-[#16702e]"
                          }
                        >
                          {source.sourceReveal.unlocked
                            ? copy.sourceReveal.rewardClosed
                            : copy.sourceReveal.remaining(
                                formatNumber(sourceRevealRemaining, locale),
                              )}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            hasViewerReport ? "text-[#16702e]" : "text-black/42",
                          )}
                        >
                          {hasViewerReport ? (
                            <CheckCircle2 className="size-3" />
                          ) : null}
                          {hasViewerReport
                            ? copy.myReportWritten
                            : copy.myReportUnwritten}
                        </span>
                        {isBlocked ? (
                          <span className="text-amber-700">{copy.locked}</span>
                        ) : null}
                        {isPaidLocked ? (
                          <span className="text-rose-700">
                            {copy.mediaAccess.reportLocked}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {shouldShowSourcePagination ? (
              <nav
                aria-label={copy.pagination.label}
                className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3"
              >
                <Link
                  aria-disabled={currentSourcePage <= 1}
                  className={cn(
                    "inline-flex h-10 min-w-20 items-center justify-center gap-1 rounded-full border px-3 text-xs font-black transition",
                    currentSourcePage <= 1
                      ? "pointer-events-none border-black/8 bg-[#f6f8f4] !text-black/24"
                      : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]",
                  )}
                  href={getSourcePageHref(currentSourcePage - 1)}
                  tabIndex={currentSourcePage <= 1 ? -1 : undefined}
                >
                  <ArrowLeft className="size-3.5" />
                  {copy.pagination.previous}
                </Link>
                <div className="flex min-w-0 flex-1 justify-center gap-1">
                  {paginationPages.map((pageNumber, index) => {
                    const previousPageNumber = paginationPages[index - 1];
                    const hasGap =
                      previousPageNumber !== undefined &&
                      pageNumber - previousPageNumber > 1;
                    const isActive = pageNumber === currentSourcePage;

                    return (
                      <span className="inline-flex items-center gap-1" key={pageNumber}>
                        {hasGap ? (
                          <span className="px-1 text-xs font-black text-black/30">
                            ...
                          </span>
                        ) : null}
                        <Link
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "inline-flex size-10 items-center justify-center rounded-full border text-xs font-black transition",
                            isActive
                              ? "border-[#19b84b] bg-[#111510] !text-white"
                              : "border-black/10 bg-white !text-black/56 hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#126c2c]",
                          )}
                          href={getSourcePageHref(pageNumber)}
                        >
                          {formatNumber(pageNumber, locale)}
                        </Link>
                      </span>
                    );
                  })}
                </div>
                <Link
                  aria-disabled={currentSourcePage >= sourcePageCount}
                  className={cn(
                    "inline-flex h-10 min-w-20 items-center justify-center gap-1 rounded-full border px-3 text-xs font-black transition",
                    currentSourcePage >= sourcePageCount
                      ? "pointer-events-none border-black/8 bg-[#f6f8f4] !text-black/24"
                      : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]",
                  )}
                  href={getSourcePageHref(currentSourcePage + 1)}
                  tabIndex={
                    currentSourcePage >= sourcePageCount ? -1 : undefined
                  }
                >
                  {copy.pagination.next}
                  <ArrowRight className="size-3.5" />
                </Link>
              </nav>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4" ref={selectedDetailRef}>
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

                  <div className="mt-4 border border-[#19b84b]/18 bg-[#ecfff0] px-4 py-3">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)] lg:items-center">
                      <div className="min-w-0">
                        <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                          <Sparkles className="size-3.5" />
                          {copy.sourceReveal.opportunitySummaryLabel}
                        </p>
                        <p className="mt-2 text-lg font-black leading-6 tracking-normal [word-break:keep-all]">
                          {selectedOpportunityStatusLabel}
                        </p>
                        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-black/58 [word-break:keep-all]">
                          {copy.sourceReveal.opportunitySummaryBody}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="min-w-0 border border-black/10 bg-white/78 px-3 py-2">
                          <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/36">
                            {copy.sourceReveal.fanOpenMetric}
                          </p>
                          <p className="mt-1 truncate text-sm font-black">
                            {formatNumber(selectedSourceRevealCount, locale)}/
                            {formatNumber(
                              selectedSource.sourceReveal.threshold,
                              locale,
                            )}
                          </p>
                        </div>
                        <div className="min-w-0 border border-black/10 bg-white/78 px-3 py-2">
                          <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/36">
                            {copy.sourceReveal.remainingMetric}
                          </p>
                          <p className="mt-1 truncate text-sm font-black">
                            {formatNumber(selectedSourceRevealRemaining, locale)}
                          </p>
                        </div>
                        <div className="min-w-0 border border-black/10 bg-white/78 px-3 py-2">
                          <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/36">
                            {copy.sourceReveal.writeStateMetric}
                          </p>
                          <p className="mt-1 truncate text-sm font-black">
                            {selectedSource.existingReport
                              ? copy.myReportWritten
                              : copy.myReportUnwritten}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                          selectedSource.existingReport
                            ? "border-black/10 bg-white text-black/54"
                            : "border-[#19b84b]/24 bg-white text-[#16702e]",
                        )}
                      >
                        {selectedSource.existingReport ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <FileText className="size-3.5" />
                        )}
                        {selectedSource.existingReport
                          ? copy.myReportWritten
                          : copy.myReportUnwritten}
                      </span>
                      <span
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                          isSelectedSourceRevealLocked
                            ? "border-[#19b84b]/24 bg-white text-[#16702e]"
                            : "border-black/10 bg-white text-black/54",
                        )}
                      >
                        {isSelectedSourceRevealLocked ? (
                          <LockKeyhole className="size-3.5" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        {isSelectedSourceRevealLocked
                          ? copy.sourceReveal.locked
                          : copy.sourceReveal.unlocked}{" "}
                        {formatNumber(selectedSourceRevealCount, locale)}/
                        {formatNumber(selectedSource.sourceReveal.threshold, locale)}
                      </span>
                      <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-black text-black/54">
                        {isSelectedSourceRevealLocked
                          ? copy.sourceReveal.remaining(
                              formatNumber(selectedSourceRevealRemaining, locale),
                            )
                          : copy.sourceReveal.rewardClosed}
                      </span>
                      <span
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                          canCreateSelectedSource
                            ? "border-[#19b84b]/24 bg-white text-[#16702e]"
                            : "border-amber-300 bg-white text-amber-800",
                        )}
                      >
                        {canCreateSelectedSource ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <AlertTriangle className="size-3.5" />
                        )}
                        {canCreateSelectedSource
                          ? copy.sourceReveal.reportableNow
                          : isSelectedPaidLocked
                            ? copy.sourceReveal.opportunityPaidLocked
                            : isExclusiveBlocked
                              ? copy.locked
                              : copy.unavailable}
                      </span>
                      {isFirstReportOpportunitySource(selectedSource) ? (
                        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[#19b84b]/24 bg-white px-2.5 py-1 text-xs font-black text-[#16702e]">
                          <Sparkles className="size-3.5" />
                          {copy.firstReportOpportunity}
                        </span>
                      ) : isLowCompetitionSource(selectedSource) ? (
                        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[#19b84b]/24 bg-white px-2.5 py-1 text-xs font-black text-[#16702e]">
                          {copy.sourceReveal.lowCompetition}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                          selectedSource.coverOptions.length > 0
                            ? "border-[#19b84b]/24 bg-white text-[#16702e]"
                            : "border-rose-500/18 bg-white text-rose-700",
                        )}
                      >
                        <ImageIcon className="size-3.5" />
                        {selectedSource.coverOptions.length > 0
                          ? copy.sourceReveal.teaserReadyShort
                          : copy.sourceReveal.teaserMissingShort}
                      </span>
                      {isSelectedSourceRevealNear ? (
                        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[#19b84b]/24 bg-white px-2.5 py-1 text-xs font-black text-[#16702e]">
                          <Sparkles className="size-3.5" />
                          {copy.sourceReveal.near}
                        </span>
                      ) : null}
                      {isSelectedSourceRevealEarly ? (
                        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-black text-black/54">
                          {copy.sourceReveal.early}
                        </span>
                      ) : null}
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
                          {selectedSource.reports.map((report) => {
                            const reportItemClassName = cn(
                                "group grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border p-2 !text-[#111510] transition hover:border-[#19b84b]/45 hover:bg-white sm:grid-cols-[10.5rem_minmax(0,1fr)]",
                                report.isViewerReport
                                  ? "border-[#19b84b]/45 bg-[#ecfff0]"
                                  : "border-black/10 bg-[#f6f8f4]",
                            );
                            const reportItemContent = (
                              <>
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
                                  {report.isViewerReport
                                    ? copy.editInline.openInline
                                    : copy.readReport}
                                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                                </span>
                              </span>
                              </>
                            );

                            if (report.isViewerReport) {
                              return (
                                <button
                                  className={cn(
                                    reportItemClassName,
                                    "text-left",
                                  )}
                                  key={report.reportId}
                                  onClick={scrollToExistingReportEditor}
                                  type="button"
                                >
                                  {reportItemContent}
                                </button>
                              );
                            }

                            return (
                              <Link
                                className={reportItemClassName}
                                href={report.href}
                                key={report.reportId}
                              >
                                {reportItemContent}
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 border border-dashed border-black/14 bg-[#f6f8f4] px-4 py-5 text-sm font-semibold leading-6 text-black/54">
                          {copy.noExistingReports}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedExistingReport ? (
                    <form
                      className="mt-4 border border-[#19b84b]/22 bg-[#ecfff0] p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitExistingReportEdit();
                      }}
                      ref={editReportFormRef}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="inline-flex items-center gap-1.5 text-sm font-black text-[#16702e]">
                            <CheckCircle2 className="size-4" />
                            {copy.existing}
                          </p>
                          <h2 className="mt-2 text-xl font-black tracking-normal">
                            {copy.editInline.title}
                          </h2>
                          <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                            {copy.existingBody}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 text-sm font-black !text-[#111510]"
                            href={editReportHref ?? selectedExistingReport.href}
                          >
                            {copy.editInline.viewUpdated}
                          </Link>
                          <Link
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#19b84b]/20 bg-white px-4 text-sm font-black !text-[#16702e]"
                            href={selectedExistingReport.editHref}
                          >
                            {copy.existingEdit}
                            <ArrowRight className="size-4" />
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-[0.08em] text-[#16702e]">
                            {copy.editInline.titleField}
                          </span>
                          <input
                            className="mt-1 h-11 w-full border border-[#19b84b]/18 bg-white px-3 text-sm font-bold outline-none transition focus:border-[#19b84b]"
                            maxLength={REPORT_TITLE_MAX_LENGTH}
                            onChange={(event) => {
                              updateEditReportField("title", event.target.value);
                            }}
                            required
                            type="text"
                            value={editReportForm.title}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-[0.08em] text-[#16702e]">
                            {copy.editInline.dek}
                          </span>
                          <textarea
                            className="mt-1 min-h-20 w-full resize-y border border-[#19b84b]/18 bg-white px-3 py-2 text-sm font-semibold leading-6 outline-none transition focus:border-[#19b84b]"
                            maxLength={REPORT_DEK_MAX_LENGTH}
                            onChange={(event) => {
                              updateEditReportField("dek", event.target.value);
                            }}
                            required
                            value={editReportForm.dek}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-[0.08em] text-[#16702e]">
                            {copy.editInline.body}
                          </span>
                          <textarea
                            className="mt-1 min-h-44 w-full resize-y border border-[#19b84b]/18 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#19b84b]"
                            maxLength={REPORT_BODY_MAX_LENGTH}
                            onChange={(event) => {
                              updateEditReportField("body", event.target.value);
                            }}
                            required
                            value={editReportForm.body}
                          />
                          <span className="mt-1 block text-xs font-semibold leading-5 text-black/50">
                            {copy.editInline.bodyHelp}
                          </span>
                        </label>
                      </div>

                      <section className="mt-5 border-t border-[#19b84b]/18 pt-4">
                        <h3 className="inline-flex items-center gap-2 text-sm font-black text-[#111510]">
                          <FileText className="size-4 text-[#16702e]" />
                          {copy.editInline.facts}
                        </h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {editReportFactFields.map((field) => (
                            <label className="block" key={field.field}>
                              <span className="text-xs font-black uppercase tracking-[0.08em] text-[#16702e]">
                                {field.label}
                              </span>
                              <textarea
                                className="mt-1 min-h-20 w-full resize-y border border-[#19b84b]/18 bg-white px-3 py-2 text-sm font-semibold leading-6 outline-none transition focus:border-[#19b84b]"
                                maxLength={REPORT_FACT_MAX_LENGTH}
                                onChange={(event) => {
                                  updateEditReportField(
                                    field.field,
                                    event.target.value,
                                  );
                                }}
                                required
                                value={editReportForm[field.field]}
                              />
                            </label>
                          ))}
                        </div>
                      </section>

                      <label className="mt-5 block border-t border-[#19b84b]/18 pt-4">
                        <span className="text-xs font-black uppercase tracking-[0.08em] text-[#16702e]">
                          {copy.editInline.reporterComment}
                        </span>
                        <textarea
                          className="mt-1 min-h-24 w-full resize-y border border-[#19b84b]/18 bg-white px-3 py-2 text-sm font-semibold leading-6 outline-none transition focus:border-[#19b84b]"
                          maxLength={REPORTER_COMMENT_MAX_LENGTH}
                          onChange={(event) => {
                            updateEditReportField(
                              "reporterComment",
                              event.target.value,
                            );
                          }}
                          value={editReportForm.reporterComment}
                        />
                        <span className="mt-1 block text-xs font-semibold leading-5 text-black/50">
                          {copy.editInline.reporterCommentHelp}
                        </span>
                      </label>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {editReportMessage ? (
                          <p
                            className={cn(
                              "text-sm font-black leading-6",
                              editReportMessage === copy.editInline.saved
                                ? "text-[#16702e]"
                                : "text-rose-700",
                            )}
                          >
                            {editReportMessage}
                          </p>
                        ) : (
                          <span />
                        )}
                        <button
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
                          disabled={!canSaveExistingReport}
                          type="submit"
                        >
                          {editReportStatus === "saving" ? (
                            <Loader2 className="size-4 animate-spin text-[#44f26e]" />
                          ) : (
                            <CheckCircle2 className="size-4 text-[#44f26e]" />
                          )}
                          {editReportStatus === "saving"
                            ? copy.editInline.saving
                            : copy.editInline.save}
                        </button>
                      </div>
                    </form>
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

                {!selectedExistingReport ? (
                  <>
                    <section
                      id={isSelectedPaidLocked ? paidUnlockSectionId : undefined}
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
                    <div className="mt-4 grid gap-3 rounded-lg border border-rose-500/16 bg-white/72 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-6 text-rose-900/72">
                          {copy.mediaAccess.lockedBody}
                        </p>
                        <p className="mt-2 text-xs font-bold leading-5 text-rose-900/50">
                          {copy.mediaAccess.purchaseOnceBody}
                        </p>
                      </div>
                      <FanletterPaidUnlockTrigger
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white shadow-[0_10px_24px_rgba(17,21,16,0.16)]"
                        href={paidUnlockHref}
                      >
                        {copy.mediaAccess.openPurchase}
                        <ArrowRight className="size-4 text-[#44f26e]" />
                      </FanletterPaidUnlockTrigger>
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

                {selectedPreviewClipVideoUrl ? (
                  <section className="border border-black/12 bg-[#111510] p-4 text-white shadow-[0_14px_34px_rgba(17,21,16,0.12)] sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.54fr)] lg:items-center">
                      <div className="min-w-0">
                        <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                          <Clapperboard className="size-3.5" />
                          {copy.mediaAccess.previewVideo.badge}
                        </p>
                        <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal [word-break:keep-all]">
                          {copy.mediaAccess.previewVideo.title}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/62 [word-break:keep-all]">
                          {copy.mediaAccess.previewVideo.body}
                        </p>
                      </div>
                      <div className="overflow-hidden border border-white/12 bg-black">
                        {shouldBlurSelectedNsfwMedia ? (
                          <div className="flex aspect-video min-h-[12rem] flex-col items-center justify-center p-5 text-center">
                            <ShieldAlert className="size-7 text-[#44f26e]" />
                            <p className="mt-3 text-sm font-black">
                              {copy.mediaAccess.previewVideo.hiddenTitle}
                            </p>
                            <p className="mt-2 max-w-sm text-xs font-semibold leading-5 text-white/58">
                              {copy.mediaAccess.previewVideo.hiddenBody}
                            </p>
                          </div>
                        ) : (
                          <video
                            className="aspect-video min-h-[12rem] w-full bg-black object-contain"
                            controls
                            muted
                            playsInline
                            poster={
                              selectedSource.coverImageUrl ??
                              selectedCoverUrl ??
                              undefined
                            }
                            preload="metadata"
                            src={selectedPreviewClipVideoUrl}
                          />
                        )}
                      </div>
                    </div>
                  </section>
                ) : null}

                {isSelectedPaidLocked ? (
                  <FanletterPaidUnlockPanel
                    autoOpenHash={`#${paidUnlockSectionId}`}
                    connectHref={selectedConnectHref}
                    contentId={selectedSource.contentId}
                    contentImageCount={selectedSource.coverOptions.length}
                    contentMaturityRating={selectedSource.contentMaturityRating}
                    contentVideoCount={1}
                    creatorHref={selectedCreatorHref}
                    currentHref={selectedCurrentHref}
                    hideInlinePanel
                    initialBody={selectedSource.summary}
                    initialCoverImageUrl={selectedSource.coverImageUrl}
                    initialSummary={selectedSource.summary}
                    initialTitle={selectedSource.title}
                    locale={locale}
                    onboardingHref={selectedOnboardingHref}
                    priceUsdt={CONTENT_PAID_USDT_AMOUNT}
                    referralCode={reporterReferralCode}
                    showTeaserPreview={false}
                    trackingSource="fanletter-news-report-composer"
                  />
                ) : null}

                <section className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                        {copy.teaserStep}
                      </p>
                      <h2 className="mt-1 text-2xl font-black">
                        {isSelectedPaidLocked
                          ? copy.mediaAccess.previewBeforePurchase
                          : copy.chooseCover}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#111510] px-3 py-1.5 text-xs font-black text-white">
                        <Clapperboard className="size-3.5 text-[#44f26e]" />
                        {copy.imageOnly}
                      </span>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#19b84b]/20 bg-[#ecfff0] px-3 py-1.5 text-xs font-black text-[#16702e]">
                        <RefreshCw className="size-3.5" />
                        {copy.coverOrder}
                      </span>
                    </div>
                  </div>

                  {!isSelectedPaidLocked ? (
                    <div className="mt-4 border border-[#19b84b]/18 bg-[#ecfff0] px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-[#111510]">
                            {copy.chooseTeasers}
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-black/58">
                            {copy.teaserSelection.body}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#16702e] ring-1 ring-[#19b84b]/18">
                            <ImageIcon className="size-3.5" />
                            {copy.teaserSelection.limit(
                              formatNumber(REPORT_TEASER_IMAGE_LIMIT, locale),
                            )}
                          </span>
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#111510] px-3 py-1.5 text-xs font-black text-white">
                            <Crop className="size-3.5 text-[#44f26e]" />
                            {copy.teaserSelection.ratio}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isSelectedPaidLocked ? (
                    <div className="mt-4 border border-rose-500/18 bg-rose-50 p-4 text-rose-900">
                      <p className="inline-flex items-center gap-1.5 text-sm font-black">
                        <LockKeyhole className="size-4" />
                        {copy.mediaAccess.previewBeforePurchase}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-rose-900/70">
                        {copy.mediaAccess.previewOnlyBody}
                      </p>
                    </div>
                  ) : null}

                  {selectedSource.coverOptions.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-3">
                      {selectedSource.coverOptions.map((option, index) => {
                        const isSelected = option.imageUrl === selectedCoverUrl;
                        const isTeaserSelected = selectedTeaserUrls.includes(
                          option.imageUrl,
                        );
                        const croppedTeaser =
                          croppedTeaserBySourceUrl[option.imageUrl];
                        const isTeaserLimitReached =
                          !isTeaserSelected &&
                          selectedTeaserUrls.length >= REPORT_TEASER_IMAGE_LIMIT;
                        const imageSizeLabel = formatCoverOptionImageSize(
                          option,
                          locale,
                        );
                        const previewStyle = getCoverOptionPreviewStyle(option);

                        return (
                          <div
                            className={cn(
                              "min-w-0 overflow-hidden border bg-[#f6f8f4] p-1 text-left transition",
                              isSelected
                                ? "border-[#19b84b] bg-[#ecfff0] shadow-[0_0_0_1px_rgba(25,184,75,0.28)]"
                                : "border-black/10 hover:border-[#19b84b]/45 hover:bg-white",
                            )}
                            key={`${option.candidateId}-${option.imageUrl}`}
                          >
                            <button
                              className="block w-full text-left"
                              onClick={() => {
                                selectCoverImage(option.imageUrl);
                              }}
                              type="button"
                            >
                              <span className="block overflow-hidden rounded-md bg-[#111510]">
                                <span
                                  className={cn(
                                    "block min-h-[10rem] bg-contain bg-center bg-no-repeat transition",
                                    shouldBlurSelectedNsfwMedia &&
                                      "scale-[1.03] blur-md brightness-75",
                                  )}
                                  style={previewStyle}
                                />
                              </span>
                              <span className="mt-2 flex items-start justify-between gap-2 px-1 pb-1">
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-black">
                                    {getCoverLabel(option, index, locale)}
                                  </span>
                                  {imageSizeLabel ? (
                                    <span className="mt-0.5 block truncate text-[0.64rem] font-black uppercase tracking-[0.06em] text-black/42">
                                      {copy.imageSize} · {imageSizeLabel}
                                    </span>
                                  ) : null}
                                </span>
                                {isSelected ? (
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-black",
                                      isSelectedPaidLocked
                                        ? "bg-[#111510] text-white"
                                        : "bg-[#44f26e] text-[#111510]",
                                    )}
                                  >
                                    {isSelectedPaidLocked
                                      ? copy.mediaAccess.previewBadge
                                      : copy.selected}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                            {!isSelectedPaidLocked ? (
                              <button
                                className={cn(
                                  "mt-1 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border text-[0.7rem] font-black transition",
                                  isTeaserSelected
                                    ? "border-[#19b84b]/35 bg-[#111510] text-white"
                                    : "border-black/10 bg-white text-black/56 hover:border-[#19b84b]/35 hover:text-[#111510]",
                                  isTeaserLimitReached &&
                                    "cursor-not-allowed opacity-45 hover:border-black/10 hover:text-black/56",
                                )}
                                disabled={isTeaserLimitReached}
                                onClick={() => {
                                  toggleTeaserImage(option.imageUrl);
                                }}
                                type="button"
                              >
                                {isTeaserSelected ? (
                                  <CheckCircle2 className="size-3.5 text-[#44f26e]" />
                                ) : (
                                  <ImageIcon className="size-3.5 text-[#16702e]" />
                                )}
                                {isTeaserSelected
                                  ? copy.teaserSelection.included
                                  : copy.teaserSelection.include}
                              </button>
                            ) : null}
                            {croppedTeaser && isTeaserSelected ? (
                              <div className="mt-2 rounded-md border border-[#19b84b]/22 bg-white p-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="block aspect-[9/16] h-16 shrink-0 rounded bg-[#111510] bg-cover bg-center"
                                    style={{
                                      backgroundImage: `url(${croppedTeaser.imageUrl})`,
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[0.68rem] font-black text-[#16702e]">
                                      {copy.teaserCrop.saved}
                                    </p>
                                    <button
                                      className="mt-1 text-[0.66rem] font-black text-black/48 underline underline-offset-2 transition hover:text-[#111510]"
                                      onClick={() => {
                                        removeCroppedTeaserImage(option.imageUrl);
                                      }}
                                      type="button"
                                    >
                                      {copy.teaserCrop.remove}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 border border-dashed border-black/14 bg-[#f6f8f4] px-4 py-5 text-sm font-semibold text-black/54">
                      {copy.noCover}
                    </p>
                  )}
                </section>

                {!isSelectedPaidLocked && selectedCoverUrl ? (
                  <section className="border border-black/12 bg-[#111510] p-4 text-white shadow-[0_14px_34px_rgba(17,21,16,0.12)] sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                          <Crop className="size-3.5" />
                          {copy.cropStep}
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
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.58fr)]">
                      <div className="min-w-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black">
                              {copy.teaserCrop.coverTitle}
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-white/52">
                              {copy.teaserCrop.coverBody}
                            </p>
                          </div>
                          <span className="inline-flex w-fit items-center rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-[#44f26e]">
                            16:9
                          </span>
                        </div>
                        <div
                          className="relative mt-3 aspect-video min-h-[13rem] cursor-grab touch-none overflow-hidden border border-white/12 bg-black/40 active:cursor-grabbing"
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
                            className={cn(
                              "absolute max-w-none select-none object-cover",
                              shouldBlurSelectedNsfwMedia && "blur-md",
                            )}
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
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
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
                            aria-label={`${copy.teaserCrop.coverTitle} ${copy.zoom}`}
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

                        <div className="border border-[#44f26e]/22 bg-[#44f26e]/[0.07] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black">
                                {copy.teaserCrop.teaserTitle}
                              </p>
                              <p className="mt-1 text-xs font-semibold leading-5 text-white/58">
                                {copy.teaserCrop.teaserBody}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#44f26e] px-2.5 py-1 text-xs font-black text-black">
                              9:16
                            </span>
                          </div>
                          <div
                            className="relative mx-auto mt-3 aspect-[9/16] w-full max-w-[12.5rem] cursor-grab touch-none overflow-hidden border border-white/12 bg-black/40 active:cursor-grabbing"
                            onPointerCancel={handleCropPointerEnd}
                            onPointerDown={handleTeaserCropPointerDown}
                            onPointerMove={handleCropPointerMove}
                            onPointerUp={handleCropPointerEnd}
                            ref={teaserCropFrameRef}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt=""
                              aria-hidden="true"
                              className={cn(
                                "absolute max-w-none select-none object-cover",
                                shouldBlurSelectedNsfwMedia && "blur-md",
                              )}
                              crossOrigin="anonymous"
                              draggable={false}
                              src={selectedCoverUrl}
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
                          <p className="mt-2 text-center text-[0.68rem] font-black text-[#44f26e]">
                            {copy.teaserCrop.previewTitle}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-black text-white/62">
                              {copy.zoom}
                            </span>
                            <span className="text-xs font-black text-[#44f26e]">
                              {teaserCrop.zoom.toFixed(2)}x
                            </span>
                          </div>
                          <input
                            aria-label={`${copy.teaserCrop.teaserTitle} ${copy.zoom}`}
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
                            disabled={teaserCropStatus === "saving"}
                            onClick={saveCroppedTeaserImage}
                            type="button"
                          >
                            {teaserCropStatus === "saving" ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ImageIcon className="size-3.5" />
                            )}
                            {teaserCropStatus === "saving"
                              ? copy.teaserCrop.saving
                              : copy.teaserCrop.save}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                {!isSelectedPaidLocked ? (
                  <section className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                      5. Reporter note
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {copy.angleLabel}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {copy.angles.map((item) => {
                        const isRecommendedAngle =
                          item === selectedRecommendedAngle;

                        return (
                          <button
                            className={cn(
                              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition",
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
                            <span>{item}</span>
                            {isRecommendedAngle ? (
                              <span
                                className={cn(
                                  "rounded-full px-1.5 py-0.5 text-[0.56rem]",
                                  item === angle
                                    ? "bg-[#44f26e] text-[#111510]"
                                    : "bg-white text-[#16702e] ring-1 ring-[#19b84b]/20",
                                )}
                              >
                                {copy.recommendedAngle}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-4 block">
                      <span className="text-sm font-black">
                        {copy.commentLabel}
                      </span>
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
                    <div className="mt-5 border border-[#19b84b]/18 bg-[#ecfff0] px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="inline-flex items-center gap-1.5 text-sm font-black text-[#16702e]">
                            <CheckCircle2 className="size-4" />
                            {copy.publishReadiness.title}
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-black/58">
                            {copy.publishReadiness.body}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-black",
                            canSubmit
                              ? "bg-[#111510] text-white"
                              : "bg-white text-black/46 ring-1 ring-black/10",
                          )}
                        >
                          {canSubmit
                            ? copy.publishReadiness.statusReady
                            : copy.publishReadiness.statusWaiting}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {publishReadinessItems.map((item) => (
                          <span
                            className={cn(
                              "inline-flex min-h-9 items-center gap-2 border px-2.5 py-2 text-xs font-black",
                              item.ready
                                ? "border-[#19b84b]/24 bg-white text-[#16702e]"
                                : "border-black/10 bg-white/70 text-black/38",
                            )}
                            key={item.label}
                          >
                            {item.ready ? (
                              <CheckCircle2 className="size-3.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="size-3.5 shrink-0" />
                            )}
                            <span className="min-w-0 truncate">{item.label}</span>
                          </span>
                        ))}
                      </div>
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
                ) : (
                  <section className="border border-rose-500/18 bg-rose-50 p-4 text-rose-900 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
                    <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-rose-700">
                      <LockKeyhole className="size-3.5" />
                      {copy.mediaAccess.reportLocked}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {copy.mediaAccess.reportUnlockTitle}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-rose-900/70">
                      {copy.mediaAccess.reportUnlockBody}
                    </p>
                  </section>
                )}
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
