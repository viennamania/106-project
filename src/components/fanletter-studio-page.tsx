"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Clapperboard,
  FileText,
  ImageIcon,
  Loader2,
  MessageCircleHeart,
  PenLine,
  Play,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { useMemberSession } from "@/components/member-session-provider";
import type {
  ContentPostRecord,
  ContentSalesDashboardResponse,
  ContentSalesSummaryRecord,
  CreatorProfileRecord,
  CreatorProfileResponse,
  CreatorStudioPostsResponse,
  FanletterFanRequestRecord,
  FanletterFanRequestStatusUpdateResponse,
  FanletterFanRequestsResponse,
  FanletterVlogPlanItem,
  FanletterVlogPlanStatus,
  FanletterVlogPlannerResponse,
} from "@/lib/content";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { smartWalletChain, thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type StudioStatus = "error" | "idle" | "loading" | "ready";

type StudioState = {
  error: string | null;
  fanRequests: FanletterFanRequestRecord[];
  fanRequestsError: string | null;
  member: MemberRecord | null;
  posts: ContentPostRecord[];
  postsSummary: CreatorStudioPostsResponse["summary"];
  profile: CreatorProfileRecord | null;
  profileConfigured: boolean;
  salesError: string | null;
  salesSummary: ContentSalesSummaryRecord | null;
  status: StudioStatus;
};

type PlannerStatus = "error" | "idle" | "loading" | "ready";

type PlannerState = {
  error: string | null;
  generatedAt: string | null;
  plans: FanletterVlogPlanItem[];
  status: PlannerStatus;
};

type FanRequestInboxFilter =
  | "all"
  | Extract<FanletterFanRequestRecord["status"], "new" | "reviewed" | "used">;

type PlannerPatchResponse = {
  plan: FanletterVlogPlanItem;
};

const FANLETTER_STUDIO_DISCONNECTED_GRACE_MS = 4500;
const FAN_REQUESTS_PAGE_SIZE = 24;
const STUDIO_POSTS_PAGE_SIZE = 6;
const EMPTY_POSTS_SUMMARY: CreatorStudioPostsResponse["summary"] = {
  all: 0,
  archived: 0,
  draft: 0,
  published: 0,
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          connect: "계정 연결하기",
          channels: "채널 배포 관리",
          create: "오늘의 브이로그 만들기",
          feed: "브이로그 피드 보기",
          fanRequests: "팬 요청함",
          managePosts: "브이로그 전체 관리",
          paidUpload: "유료 콘텐츠 직접 업로드",
          profileCreate: "캐릭터 만들기",
          profileManage: "캐릭터 확인/변경",
          refresh: "다시 확인",
          sales: "판매 내역 보기",
        },
        connectRequired:
          "나의 AI 캐릭터 브이로그 스튜디오는 FanLetter 계정 연결 후 사용할 수 있습니다.",
        connectTitle: "계정 연결이 필요합니다.",
        draft: "임시저장",
        emptyBody:
          "아직 브이로그가 없습니다. 첫 AI 캐릭터 브이로그를 만들고 FanLetter 피드에 게시해보세요.",
        emptyTitle: "첫 AI 캐릭터 브이로그를 만들 시간입니다.",
        eyebrow: "FanLetter AI 캐릭터 브이로그 스튜디오",
        labels: {
          allPosts: "전체 브이로그",
          availableBalance: "출금 가능",
          completedMember: "시작 준비 완료",
          draftPosts: "임시저장",
          fanRequests: "팬 요청",
          memberStatus: "시작 상태",
          paid: "유료",
          persona: "캐릭터 페르소나",
          profile: "프로필",
          publishedPosts: "공개 영상",
          sales: "확정 판매",
          totalSales: "누적 판매",
          videos: "브이로그",
          wallet: "연결 ID",
        },
        loading: "FanLetter 스튜디오 상태를 확인하고 있습니다.",
        noPersona: "페르소나 미설정",
        paidUploadBody:
          "NSFW 가능성이 있는 직접 업로드 동영상은 1 USDT 유료 콘텐츠로 등록합니다.",
        paymentRequired:
          "FanLetter 시작 준비 확인이 끝나면 AI 캐릭터 브이로그 스튜디오를 사용할 수 있습니다.",
        paymentTitle: "시작 준비 확인이 필요합니다.",
        priceFree: "무료",
        pricePaid: "유료",
        profileIncomplete:
          "표시 이름과 분위기만 정해 캐릭터를 한 번 만들면 이후 브이로그에 자동 적용됩니다.",
        profileReady: "프로필이 준비되었습니다.",
        profileTitle: "캐릭터 프로필",
        published: "공개",
        recentTitle: "최근 브이로그",
        salesFallback: "판매 요약을 불러오지 못했습니다.",
        fanRequests: {
          body: "팬이 남긴 메시지를 오늘 만들 브이로그 소재로 바로 넘길 수 있게 모아봅니다.",
          create: "이 요청으로 만들기",
          createdContent: "만든 브이로그 보기",
          empty:
            "아직 팬 요청이 없습니다. 캐릭터 채널을 공유하면 이곳에 요청이 쌓입니다.",
          errorFallback: "팬 요청을 불러오지 못했습니다.",
          filteredEmpty: "이 상태의 팬 요청은 없습니다.",
          focus: {
            allBody: "신규 요청을 먼저 보여주고, 확인한 요청과 제작 반영 요청은 뒤로 정리합니다.",
            allTitle: "처리할 요청을 위에서부터 확인하세요.",
            newBody: "아직 확인하지 않은 요청입니다. 빠르게 훑고 바로 만들거나 확인 처리하세요.",
            newTitle: "새로 들어온 요청만 모았습니다.",
            reviewedBody: "내용은 확인했고 아직 제작에 쓰지 않은 요청입니다.",
            reviewedTitle: "제작 대기 소재를 고르세요.",
            usedBody: "이미 브이로그로 반영된 요청입니다. 만든 브이로그와 연결 상태를 확인하세요.",
            usedTitle: "제작 반영된 요청입니다.",
          },
          hide: "숨김",
          categoryLabel: "자동 분류",
          candidateQueueBody:
            "신규/확인함 요청 중 제작 점수가 높은 요청을 자동 정렬해 바로 만들 후보로 묶었습니다.",
          candidateQueueEyebrow: "제작 후보 큐",
          candidateQueueRank: "후보",
          candidateQueueTitle: "오늘 만들기 좋은 요청 3개",
          candidateQueueTop: "최우선",
          recommendedBody:
            "신규/확인함 요청 중 바로 브이로그 소재로 옮기기 좋은 요청을 먼저 띄웁니다.",
          recommendedCta: "이 요청으로 바로 만들기",
          recommendedEyebrow: "오늘의 추천 요청",
          recommendedTitle: "지금 만들기 좋은 팬 요청",
          markReviewed: "확인",
          openCount: "제작 대기",
          requester: "보낸 사람",
          source: "요청 위치 보기",
          sourceVlog: "브이로그 기반",
          statuses: {
            hidden: "숨김",
            new: "신규",
            reviewed: "확인함",
            used: "제작 반영",
          },
          title: "팬 요청함",
          totalCount: "전체",
          tabs: {
            all: "전체",
            new: "신규",
            reviewed: "확인함",
            used: "제작 반영",
          },
          types: {
            message: "응원 메시지",
            vlog_request: "브이로그 요청",
          },
          categories: {
            look: "룩/스타일",
            place: "장소",
            question: "질문/답장",
            routine: "루틴",
            story: "스토리",
            support: "응원",
          },
          usedNotice: "게시된 브이로그와 연결된 요청입니다.",
          workflow: ["요청 확인", "소재 자동 반영", "게시 후 자동 정리"],
        },
        channelDistribution:
          "Instagram Reels, YouTube Shorts, TikTok에 올릴 수 있도록 캡션, 해시태그, FanLetter 링크를 한 번에 준비합니다.",
        planner: {
          body: "캐릭터 페르소나와 최근 브이로그를 OpenAI가 분석해서 오늘부터 바로 만들 수 있는 7일치 소재를 제안합니다.",
          checklist: "체크",
          empty: "버튼을 누르면 제목, 요약, 생성 프롬프트, 캡션 훅까지 한 번에 준비합니다.",
          errorFallback: "브이로그 플랜을 생성하지 못했습니다.",
          eyebrow: "OpenAI Vlog Planner",
          generate: "AI가 7일 플랜 추천",
          generating: "플랜 생성 중...",
          image: "이미지",
          markDistributed: "배포 완료",
          platform: "배포 포인트",
          skip: "건너뛰기",
          statuses: {
            created: "생성 완료",
            distributed: "배포 완료",
            planned: "예정",
            published: "공개 완료",
            skipped: "건너뜀",
          },
          title: "오늘 무엇을 만들지 고민하지 않게 합니다.",
          usePlan: "이 플랜으로 만들기",
          video: "동영상",
        },
        steps: [
          {
            body: "표시 이름과 분위기만 정하면 페르소나와 아바타를 자동으로 준비합니다.",
            title: "AI 캐릭터 준비",
          },
          {
            body: "오늘의 셀피, 외출, 루틴, 대화 장면을 세로형 브이로그로 만듭니다.",
            title: "숏폼 브이로그 생성",
          },
          {
            body: "FanLetter 브이로그 피드로 팬에게 보여주고 유료 커뮤니티와 판매 흐름으로 연결합니다.",
            title: "게시와 수익화",
          },
        ],
        subtitle:
          "AI 캐릭터 프로필, 숏폼 브이로그 생성, 게시물 관리, 판매 요약을 FanLetter 흐름 안에서 한 번에 확인합니다.",
        title: "나의 AI 캐릭터 브이로그 스튜디오",
        unknown: "확인 전",
      }
    : {
        actions: {
          connect: "Connect account",
          channels: "Manage channels",
          create: "Create today's vlog",
          feed: "View vlog feed",
          fanRequests: "Fan requests",
          managePosts: "Manage all vlogs",
          paidUpload: "Upload paid content",
          profileCreate: "Create character",
          profileManage: "Review/change character",
          refresh: "Check again",
          sales: "View sales",
        },
        connectRequired:
          "My AI character vlog studio is available after connecting your FanLetter account.",
        connectTitle: "Account connection is required.",
        draft: "Draft",
        emptyBody:
          "No vlogs yet. Create your first AI character vlog and publish it to FanLetter.",
        emptyTitle: "Create your first AI character vlog.",
        eyebrow: "FanLetter AI Character Vlog Studio",
        labels: {
          allPosts: "All vlogs",
          availableBalance: "Available",
          completedMember: "Ready",
          draftPosts: "Drafts",
          fanRequests: "Fan requests",
          memberStatus: "Readiness",
          paid: "Paid",
          persona: "Character persona",
          profile: "Profile",
          publishedPosts: "Published videos",
          sales: "Confirmed sales",
          totalSales: "Total sales",
          videos: "Vlogs",
          wallet: "Connection ID",
        },
        loading: "Checking FanLetter studio state.",
        noPersona: "No persona",
        paidUploadBody:
          "Directly uploaded videos that may be NSFW are registered as 1 USDT paid content.",
        paymentRequired:
          "Confirm FanLetter readiness to use the AI character vlog studio.",
        paymentTitle: "Readiness confirmation is required.",
        priceFree: "Free",
        pricePaid: "Paid",
        profileIncomplete:
          "Create a character once with a display name and mood, then it will be applied to future vlogs automatically.",
        profileReady: "Profile is ready.",
        profileTitle: "Character profile",
        published: "Published",
        recentTitle: "Recent vlogs",
        salesFallback: "Could not load sales summary.",
        fanRequests: {
          body: "Turn fan messages into the next vlog idea without leaving the studio.",
          create: "Create from request",
          createdContent: "View created vlog",
          empty:
            "No fan requests yet. Share the character channel to collect them here.",
          errorFallback: "Could not load fan requests.",
          filteredEmpty: "No fan requests in this status.",
          focus: {
            allBody:
              "New requests appear first, with reviewed and used requests organised behind them.",
            allTitle: "Work through requests from the top.",
            newBody:
              "These have not been reviewed yet. Scan them, create from them, or mark them reviewed.",
            newTitle: "New fan requests only.",
            reviewedBody:
              "These requests were reviewed but have not been used in a vlog yet.",
            reviewedTitle: "Choose the next idea to create.",
            usedBody:
              "These requests are already linked to created vlogs. Check the result and connection.",
            usedTitle: "Requests already reflected in vlogs.",
          },
          hide: "Hide",
          categoryLabel: "Auto category",
          candidateQueueBody:
            "New and reviewed requests are scored and sorted into a short create-now queue.",
          candidateQueueEyebrow: "Production queue",
          candidateQueueRank: "Candidate",
          candidateQueueTitle: "Three requests ready to create",
          candidateQueueTop: "Top pick",
          recommendedBody:
            "Among new and reviewed requests, this one is ready to move into a vlog.",
          recommendedCta: "Create this now",
          recommendedEyebrow: "Today's request pick",
          recommendedTitle: "A fan request ready to create",
          markReviewed: "Reviewed",
          openCount: "Ready to create",
          requester: "From",
          source: "View source",
          sourceVlog: "Source vlog",
          statuses: {
            hidden: "Hidden",
            new: "New",
            reviewed: "Reviewed",
            used: "Used",
          },
          title: "Fan request inbox",
          totalCount: "Total",
          tabs: {
            all: "All",
            new: "New",
            reviewed: "Reviewed",
            used: "Used",
          },
          types: {
            message: "Support message",
            vlog_request: "Vlog request",
          },
          categories: {
            look: "Look/style",
            place: "Place",
            question: "Question/reply",
            routine: "Routine",
            story: "Story",
            support: "Support",
          },
          usedNotice: "This request is linked to a published vlog.",
          workflow: ["Review request", "Apply as an idea", "Auto-organise after publish"],
        },
        channelDistribution:
          "Prepare captions, hashtags, and FanLetter links for Instagram Reels, YouTube Shorts, and TikTok.",
        planner: {
          body: "OpenAI reads the character persona and recent vlogs, then suggests seven ready-to-create ideas.",
          checklist: "Checks",
          empty: "Generate titles, summaries, creation prompts, and caption hooks in one step.",
          errorFallback: "Could not generate vlog plans.",
          eyebrow: "OpenAI Vlog Planner",
          generate: "Suggest 7-day plan",
          generating: "Generating plans...",
          image: "Image",
          markDistributed: "Distributed",
          platform: "Distribution angle",
          skip: "Skip",
          statuses: {
            created: "Created",
            distributed: "Distributed",
            planned: "Planned",
            published: "Published",
            skipped: "Skipped",
          },
          title: "Remove the daily question of what to make next.",
          usePlan: "Create with this plan",
          video: "Video",
        },
        steps: [
          {
            body: "Choose a display name and mood to prepare persona and avatar automatically.",
            title: "AI character setup",
          },
          {
            body: "Create today's selfie, routine, outing, or dialogue scene as a vertical vlog.",
            title: "Short-form vlog creation",
          },
          {
            body: "Publish to the FanLetter vlog feed and connect fans to paid community and sales flows.",
            title: "Publish and monetise",
          },
        ],
        subtitle:
          "Review AI character profile, short-form vlog creation, post management, and sales summary inside FanLetter.",
        title: "My AI Character Vlog Studio",
        unknown: "Not checked",
      };
}

function formatAddressLabel(address?: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return "-";
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatUsdt(value?: string | null, locale?: Locale) {
  const amount = Number(value ?? "0");

  if (!Number.isFinite(amount) || amount <= 0) {
    return "0 USDT";
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount)} USDT`;
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function resolvePostImage(post: ContentPostRecord) {
  return post.coverImageUrl ?? post.contentImageUrls[0] ?? null;
}

function resolvePostVideo(post: ContentPostRecord) {
  return post.contentVideoUrls[0] ?? null;
}

function getMemberStatusLabel(member: MemberRecord | null, locale: Locale) {
  if (!member) {
    return locale === "ko" ? "확인 전" : "Not checked";
  }

  if (member.serviceSuspendedAt) {
    return locale === "ko" ? "서비스 중단" : "Suspended";
  }

  return member.status === "completed"
    ? locale === "ko"
      ? "시작 준비 완료"
      : "Ready"
    : locale === "ko"
      ? "확인 필요"
      : "Needs confirmation";
}

async function readApiJson<T>(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    const errorMessage =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : fallback;

    throw new Error(errorMessage);
  }

  return data as T;
}

function buildFanRequestCreateHref({
  createHref,
  locale,
  request,
}: {
  createHref: string;
  locale: Locale;
  request: FanletterFanRequestRecord;
}) {
  const normalizedBody = request.body.trim().replace(/\s+/g, " ");
  const titleSeed = normalizedBody.slice(0, 52);
  const requestTypeLabel =
    locale === "ko"
      ? request.requestType === "message"
        ? "팬 응원 메시지"
        : "다음 브이로그 요청"
      : request.requestType === "message"
        ? "fan support message"
        : "next vlog request";
  const title =
    locale === "ko"
      ? request.requestType === "message"
        ? `팬 메시지 답장: ${titleSeed}`
        : `팬 요청: ${titleSeed}`
      : request.requestType === "message"
        ? `Fan message reply: ${titleSeed}`
        : `Fan request: ${titleSeed}`;
  const summary =
    locale === "ko"
      ? `${request.characterName}에게 들어온 ${requestTypeLabel}을 바탕으로 만든 브이로그입니다.`
      : `A vlog based on a ${requestTypeLabel} for ${request.characterName}.`;
  const body =
    locale === "ko"
      ? `${request.characterName}가 팬 요청에 답하는 브이로그입니다. 팬이 남긴 말: ${normalizedBody}`
      : `${request.characterName} responds to a fan request in this vlog. Fan note: ${normalizedBody}`;
  const prompt =
    locale === "ko"
      ? `${request.characterName}가 팬이 남긴 ${requestTypeLabel}에 직접 답하듯 자연스럽게 반영한 세로형 숏폼 브이로그. 팬 요청 원문: ${normalizedBody}`
      : `${request.characterName} naturally responds to this ${requestTypeLabel} in a vertical short-form vlog. Original fan request: ${normalizedBody}`;
  const fanOnlyIntent = shouldTreatFanRequestAsFanOnly(request);

  return setPathSearchParams(createHref, {
    fanRequestBody: request.body,
    fanRequestCharacterName: request.characterName,
    fanRequestId: request.requestId,
    fanRequestType: request.requestType,
    ...(fanOnlyIntent
      ? {
          planAudience: "fan-only",
          planPriceType: "paid",
        }
      : {}),
    planBody: body,
    planMode: "video",
    planPrompt: prompt,
    planSummary: summary,
    planTitle: title,
  });
}

function shouldTreatFanRequestAsFanOnly(request: FanletterFanRequestRecord) {
  const normalized = request.body.toLowerCase();

  return (
    request.requestType === "vlog_request" &&
    /팬\s*전용|비공개|잠금|유료|선공개|구독|fan[-\s]?only|private|locked|paid|early access|subscriber/.test(
      normalized,
    )
  );
}

type FanRequestCategory =
  | "look"
  | "place"
  | "question"
  | "routine"
  | "story"
  | "support";

function getFanRequestCategory(request: FanletterFanRequestRecord): FanRequestCategory {
  const body = request.body.toLowerCase();

  if (request.requestType === "message") {
    return "support";
  }

  if (
    /카페|공원|바다|해변|학교|회사|사무실|집|방|거리|춘천|서울|부산|제주|cafe|park|beach|school|office|home|room|street|seoul|busan|jeju/.test(
      body,
    )
  ) {
    return "place";
  }

  if (
    /옷|의상|룩|패션|스타일|코디|헤어|메이크업|outfit|look|fashion|style|hair|makeup/.test(
      body,
    )
  ) {
    return "look";
  }

  if (
    /질문|답장|대답|말해|알려|궁금|q&a|question|answer|reply|ask/.test(body)
  ) {
    return "question";
  }

  if (
    /루틴|아침|저녁|하루|운동|공부|출근|퇴근|routine|morning|night|daily|workout|study/.test(
      body,
    )
  ) {
    return "routine";
  }

  return "story";
}

function getFanRequestProductionScore(request: FanletterFanRequestRecord) {
  const normalizedBody = request.body.trim();
  const category = getFanRequestCategory(request);
  const statusScore =
    request.status === "new" ? 70 : request.status === "reviewed" ? 55 : 0;
  const typeScore = request.requestType === "vlog_request" ? 18 : 6;
  const lengthScore = Math.min(18, Math.floor(normalizedBody.length / 18));
  const sourceScore = request.sourceContentId ? 5 : 0;
  const categoryScore = category === "support" ? 3 : 8;

  return statusScore + typeScore + lengthScore + sourceScore + categoryScore;
}

function StatusPanel({
  body,
  cta,
  href,
  locale,
  loading,
  onRetry,
  secondaryCta,
  secondaryHref,
  title,
}: {
  body: string;
  cta?: string;
  href?: string;
  locale: Locale;
  loading?: boolean;
  onRetry?: () => void;
  secondaryCta?: string;
  secondaryHref?: string;
  title: string;
}) {
  return (
    <main className="min-h-[calc(100svh-5.1rem)] bg-[#030504] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-white sm:min-h-screen sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl items-center sm:min-h-[calc(100svh-3rem)]">
        <section className="w-full rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-8">
          <div className="mb-5 flex justify-end">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>
          <span className="flex size-12 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            {loading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <MessageCircleHeart className="size-6" />
            )}
          </span>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm font-medium leading-6 text-white/62 sm:text-base">
            {body}
          </p>
          {href && cta ? (
            <Link
              className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#67ff88] sm:w-fit"
              href={href}
            >
              {cta}
            </Link>
          ) : null}
          {onRetry && cta ? (
            <button
              className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-6 text-sm font-semibold text-black transition hover:bg-[#67ff88] sm:w-fit"
              onClick={onRetry}
              type="button"
            >
              <RefreshCw className="size-4" />
              {cta}
            </button>
          ) : null}
          {secondaryHref && secondaryCta ? (
            <Link
              className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full border border-white/16 px-6 text-sm font-semibold !text-white transition hover:bg-white/10 sm:w-fit"
              href={secondaryHref}
            >
              {secondaryCta}
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  Icon,
  label,
  value,
}: {
  Icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
          {label}
        </p>
        <Icon className="size-4 text-[#44f26e]" />
      </div>
      <p className="mt-5 text-3xl font-semibold leading-none text-white">
        {value}
      </p>
    </div>
  );
}

function ActionCard({
  body,
  href,
  Icon,
  title,
}: {
  body: string;
  href: string;
  Icon: typeof FileText;
  title: string;
}) {
  return (
    <Link
      className="group rounded-lg border border-black/10 bg-white p-4 text-black shadow-[0_18px_42px_rgba(8,18,12,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(8,18,12,0.08)]"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
          <Icon className="size-5" />
        </span>
        <ArrowRight className="size-5 text-black/30 transition group-hover:text-black" />
      </div>
      <h2 className="mt-5 text-xl font-semibold leading-tight">{title}</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-black/54">{body}</p>
    </Link>
  );
}

function FanRequestsSection({
  copy,
  createHref,
  error,
  locale,
  onUpdateStatus,
  referralCode,
  requests,
  updatingRequestId,
}: {
  copy: ReturnType<typeof getCopy>;
  createHref: string;
  error: string | null;
  locale: Locale;
  onUpdateStatus: (
    requestId: string,
    status: FanletterFanRequestRecord["status"],
  ) => void;
  referralCode: string | null;
  requests: FanletterFanRequestRecord[];
  updatingRequestId: string | null;
}) {
  const [activeFilter, setActiveFilter] =
    useState<FanRequestInboxFilter>("all");
  const readyRequestCount = requests.filter(
    (request) => request.status === "new" || request.status === "reviewed",
  ).length;
  const requestCounts: Record<FanRequestInboxFilter, number> = {
    all: requests.length,
    new: 0,
    reviewed: 0,
    used: 0,
  };

  requests.forEach((request) => {
    if (
      request.status === "new" ||
      request.status === "reviewed" ||
      request.status === "used"
    ) {
      requestCounts[request.status] += 1;
    }
  });

  const sortedRequests = useMemo(() => {
    const statusPriority: Record<FanletterFanRequestRecord["status"], number> = {
      hidden: 3,
      new: 0,
      reviewed: 1,
      used: 2,
    };

    return [...requests].sort((left, right) => {
      const priorityDelta =
        statusPriority[left.status] - statusPriority[right.status];

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return (
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
      );
    });
  }, [requests]);
  const recommendedRequests = useMemo(
    () =>
      [...requests]
        .filter(
          (request) =>
            request.status === "new" || request.status === "reviewed",
        )
        .sort(
          (left, right) =>
            getFanRequestProductionScore(right) -
              getFanRequestProductionScore(left) ||
            new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
        )
        .slice(0, 3),
    [requests],
  );
  const requestTabs: Array<{
    Icon: typeof MessageCircleHeart;
    label: string;
    value: FanRequestInboxFilter;
  }> = [
    {
      Icon: MessageCircleHeart,
      label: copy.fanRequests.tabs.all,
      value: "all",
    },
    { Icon: Sparkles, label: copy.fanRequests.tabs.new, value: "new" },
    {
      Icon: CheckCircle2,
      label: copy.fanRequests.tabs.reviewed,
      value: "reviewed",
    },
    { Icon: Clapperboard, label: copy.fanRequests.tabs.used, value: "used" },
  ];
  const visibleRequests =
    activeFilter === "all"
      ? sortedRequests
      : sortedRequests.filter((request) => request.status === activeFilter);
  const focusCopy =
    activeFilter === "new"
      ? {
          body: copy.fanRequests.focus.newBody,
          title: copy.fanRequests.focus.newTitle,
        }
      : activeFilter === "reviewed"
        ? {
            body: copy.fanRequests.focus.reviewedBody,
            title: copy.fanRequests.focus.reviewedTitle,
          }
        : activeFilter === "used"
          ? {
              body: copy.fanRequests.focus.usedBody,
              title: copy.fanRequests.focus.usedTitle,
            }
          : {
              body: copy.fanRequests.focus.allBody,
              title: copy.fanRequests.focus.allTitle,
            };
  const ActiveFilterIcon =
    requestTabs.find((tab) => tab.value === activeFilter)?.Icon ??
    MessageCircleHeart;
  return (
    <section
      className="scroll-mt-24 rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] sm:p-5"
      id="fan-requests"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#16702e]">
            Fan Request
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">
            {copy.fanRequests.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-black/54">
            {copy.fanRequests.body}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-full border border-black/10 bg-[#f6f8f4] p-1 text-xs font-semibold text-black/62">
          <span className="inline-flex h-9 items-center justify-center rounded-full bg-black px-3 !text-white">
            {copy.fanRequests.openCount}{" "}
            {formatNumber(readyRequestCount, locale)}
          </span>
          <span className="inline-flex h-9 items-center justify-center rounded-full px-3">
            {copy.fanRequests.totalCount} {formatNumber(requests.length, locale)}
          </span>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/12 p-3 text-sm font-medium leading-6 text-amber-900">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {copy.fanRequests.workflow.map((step, index) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-black/10 bg-[#f6f8f4] px-3 py-3"
            key={step}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-xs font-semibold text-black">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-semibold text-black/68">{step}</span>
          </div>
        ))}
      </div>

      {recommendedRequests.length > 0 ? (
        <div className="mt-4 rounded-lg border border-[#44f26e]/35 bg-[#07100b] p-4 text-white shadow-[0_18px_48px_rgba(8,18,12,0.18)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#8dffa5]">
                  {copy.fanRequests.candidateQueueEyebrow}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-normal">
                  {copy.fanRequests.candidateQueueTitle}
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/62">
                  {copy.fanRequests.candidateQueueBody}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-[#44f26e]/20 bg-[#44f26e]/10 px-4 py-3 text-sm font-semibold text-[#b9ffc8]">
              {formatNumber(recommendedRequests.length, locale)} / 3
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {recommendedRequests.map((request, index) => {
              const category = getFanRequestCategory(request);
              const createFromRequestHref = buildFanRequestCreateHref({
                createHref,
                locale,
                request,
              });
              const isUpdating = updatingRequestId === request.requestId;
              const isTopPick = index === 0;

              return (
                <article
                  className={`rounded-lg border p-4 ${
                    isTopPick
                      ? "border-[#44f26e]/42 bg-[#44f26e]/12"
                      : "border-white/10 bg-white/[0.045]"
                  }`}
                  key={request.requestId}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] ${
                        isTopPick
                          ? "bg-[#44f26e] text-black"
                          : "border border-[#44f26e]/24 bg-[#44f26e]/10 text-[#b9ffc8]"
                      }`}
                    >
                      {isTopPick
                        ? copy.fanRequests.candidateQueueTop
                        : `${copy.fanRequests.candidateQueueRank} ${index + 1}`}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.64rem] font-semibold text-white/56">
                      {copy.fanRequests.statuses[request.status]}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-3 break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                    {request.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
                      {copy.fanRequests.categories[category]}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/52">
                      {copy.fanRequests.types[request.requestType]}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <Link
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-3 text-xs font-semibold !text-black transition hover:bg-[#64ff84]"
                      href={createFromRequestHref}
                    >
                      {isTopPick
                        ? copy.fanRequests.recommendedCta
                        : copy.fanRequests.create}
                      <ArrowRight className="size-3.5" />
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      {request.status === "new" ? (
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-full border border-white/14 px-3 text-xs font-semibold text-white/62 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isUpdating}
                          onClick={() => {
                            onUpdateStatus(request.requestId, "reviewed");
                          }}
                          type="button"
                        >
                          {isUpdating ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            copy.fanRequests.markReviewed
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/44">
                          {copy.fanRequests.statuses[request.status]}
                        </span>
                      )}
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-full border border-white/14 px-3 text-xs font-semibold text-white/62 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isUpdating}
                        onClick={() => {
                          onUpdateStatus(request.requestId, "hidden");
                        }}
                        type="button"
                      >
                        {isUpdating ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          copy.fanRequests.hide
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {requests.length > 0 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {requestTabs.map((tab) => {
            const isActive = activeFilter === tab.value;
            const Icon = tab.Icon;

            return (
              <button
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold transition ${
                  isActive
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black/58 hover:text-black"
                }`}
                key={tab.value}
                onClick={() => {
                  setActiveFilter(tab.value);
                }}
                aria-pressed={isActive}
                type="button"
              >
                <Icon className="size-3.5" />
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.64rem] ${
                    isActive
                      ? "bg-white/16 text-white"
                      : "bg-[#f6f8f4] text-black/48"
                  }`}
                >
                  {formatNumber(requestCounts[tab.value], locale)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {requests.length > 0 ? (
        <div className="mt-4 rounded-lg border border-black/10 bg-[linear-gradient(135deg,#07100b_0%,#12361d_52%,#44f26e_160%)] p-4 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <ActiveFilterIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#8dffa5]">
                  {copy.fanRequests.tabs[activeFilter]}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-normal">
                  {focusCopy.title}
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                  {focusCopy.body}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-56">
              <div className="rounded-lg border border-white/10 bg-white/[0.07] p-3">
                <p className="text-2xl font-semibold leading-none">
                  {formatNumber(requestCounts[activeFilter], locale)}
                </p>
                <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/42">
                  {copy.fanRequests.tabs[activeFilter]}
                </p>
              </div>
              <div className="rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/12 p-3">
                <p className="text-2xl font-semibold leading-none text-[#b9ffc8]">
                  {formatNumber(readyRequestCount, locale)}
                </p>
                <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/42">
                  {copy.fanRequests.openCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {visibleRequests.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleRequests.map((request) => {
            const isUpdating = updatingRequestId === request.requestId;
            const createFromRequestHref = buildFanRequestCreateHref({
              createHref,
              locale,
              request,
            });
            const category = getFanRequestCategory(request);
            const createdLabel = formatDate(request.createdAt, locale);
            const sourceHref = request.sourcePath?.startsWith("/")
              ? request.sourcePath
              : null;
            const createdContentHref = request.usedContentId
              ? buildPathWithReferral(
                  `/${locale}/fanletter/content/${request.usedContentId}`,
                  referralCode ?? request.creatorReferralCode,
                )
              : null;
            const cardTone =
              request.status === "new"
                ? "border-[#44f26e]/55 bg-white shadow-[0_18px_42px_rgba(68,242,110,0.13)]"
                : request.status === "used"
                  ? "border-black/8 bg-white"
                  : "border-black/10 bg-[#f6f8f4]";

            return (
              <article
                className={`rounded-lg border p-4 transition ${cardTone}`}
                key={request.requestId}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-black px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-white">
                    {copy.fanRequests.types[request.requestType]}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] ${
                      request.status === "new"
                        ? "border-[#44f26e]/60 bg-[#44f26e] text-black"
                        : "border-[#44f26e]/30 bg-[#44f26e]/16 text-[#16702e]"
                    }`}
                  >
                    {copy.fanRequests.statuses[request.status]}
                  </span>
                </div>

                <p className="mt-4 line-clamp-4 break-words text-base font-semibold leading-7 text-black [overflow-wrap:anywhere]">
                  {request.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#44f26e]/24 bg-[#44f26e]/12 px-3 py-1 text-xs font-semibold text-[#16702e]">
                    {copy.fanRequests.categoryLabel} ·{" "}
                    {copy.fanRequests.categories[category]}
                  </span>
                  {request.sourceContentId ? (
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/44">
                      {copy.fanRequests.sourceVlog}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 text-xs font-semibold text-black/44 sm:grid-cols-2">
                  <span>
                    {copy.fanRequests.requester}:{" "}
                    <span className="text-black/64">
                      {request.requesterDisplayName ??
                        request.requesterEmail ??
                        "FanLetter"}
                    </span>
                  </span>
                  <span className="sm:text-right">{createdLabel ?? "-"}</span>
                </div>

                {request.status === "used" ? (
                  <p className="mt-4 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/12 px-3 py-2 text-xs font-semibold leading-5 text-[#16702e]">
                    {copy.fanRequests.usedNotice}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {createdContentHref ? (
                    <Link
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-3 text-xs font-semibold !text-black transition hover:bg-[#64ff84] sm:min-w-52"
                      href={createdContentHref}
                    >
                      {copy.fanRequests.createdContent}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : (
                    <Link
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-black px-3 text-xs font-semibold !text-white transition hover:bg-black/82 sm:min-w-52"
                      href={createFromRequestHref}
                    >
                      {copy.fanRequests.create}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                  {sourceHref ? (
                    <Link
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold !text-black/58 transition hover:!text-black sm:flex-none"
                      href={sourceHref}
                    >
                      {copy.fanRequests.source}
                    </Link>
                  ) : null}
                  {request.status === "new" ? (
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/58 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isUpdating}
                      onClick={() => {
                        onUpdateStatus(request.requestId, "reviewed");
                      }}
                      type="button"
                    >
                      {isUpdating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        copy.fanRequests.markReviewed
                      )}
                    </button>
                  ) : null}
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/58 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUpdating}
                    onClick={() => {
                      onUpdateStatus(request.requestId, "hidden");
                    }}
                    type="button"
                  >
                    {isUpdating ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      copy.fanRequests.hide
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-black/12 bg-[#f6f8f4] p-5">
          <MessageCircleHeart className="size-8 text-[#16702e]" />
          <p className="mt-4 text-sm font-medium leading-6 text-black/54">
            {requests.length > 0
              ? copy.fanRequests.filteredEmpty
              : copy.fanRequests.empty}
          </p>
        </div>
      )}
    </section>
  );
}

function PlannerSection({
  copy,
  createHref,
  error,
  locale,
  onGenerate,
  onUpdateStatus,
  plans,
  status,
  updatingPlanId,
}: {
  copy: ReturnType<typeof getCopy>;
  createHref: string;
  error: string | null;
  locale: Locale;
  onGenerate: () => void;
  onUpdateStatus: (planId: string, status: FanletterVlogPlanStatus) => void;
  plans: FanletterVlogPlanItem[];
  status: PlannerStatus;
  updatingPlanId: string | null;
}) {
  const isLoading = status === "loading";

  return (
    <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_42px_rgba(8,18,12,0.06)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="bg-[#07100b] p-5 text-white sm:p-6">
          <span className="flex size-12 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            <CalendarClock className="size-6" />
          </span>
          <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
            {copy.planner.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.02] tracking-normal [word-break:keep-all] sm:text-4xl">
            {copy.planner.title}
          </h2>
          <p className="mt-4 text-sm font-medium leading-6 text-white/62">
            {copy.planner.body}
          </p>
          <button
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
            disabled={isLoading}
            onClick={onGenerate}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isLoading ? copy.planner.generating : copy.planner.generate}
          </button>
          {error ? (
            <p className="mt-4 rounded-lg border border-red-300/20 bg-red-500/12 p-3 text-sm font-medium leading-6 text-red-100">
              {error}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          {plans.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {plans.map((plan) => {
                const planStatus = plan.status ?? "planned";
                const canMarkDistributed =
                  planStatus !== "distributed" &&
                  planStatus !== "skipped" &&
                  Boolean(plan.contentId);
                const canSkip =
                  planStatus !== "distributed" && planStatus !== "skipped";
                const scheduledLabel = formatDate(
                  plan.scheduledFor ?? null,
                  locale,
                );
                const href = setPathSearchParams(createHref, {
                  planId: plan.id,
                  planBody: plan.captionHook,
                  planMode: "video",
                  planPrompt: plan.scenePrompt,
                  planSummary: plan.summary,
                  planTitle: plan.title,
                });

                return (
                  <article
                    className="rounded-lg border border-black/10 bg-[#f6f8f4] p-4"
                    key={plan.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-black px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-white">
                        {plan.dayLabel}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-black/54">
                          {copy.planner.video}
                        </span>
                        <span className="rounded-full border border-[#44f26e]/30 bg-[#44f26e]/14 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-[#16702e]">
                          {copy.planner.statuses[planStatus]}
                        </span>
                      </div>
                    </div>
                    {scheduledLabel ? (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-black/38">
                        {scheduledLabel}
                      </p>
                    ) : null}
                    <h3 className="mt-4 text-xl font-semibold leading-tight tracking-normal [word-break:keep-all]">
                      {plan.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-black/58">
                      {plan.summary}
                    </p>
                    <div className="mt-4 rounded-lg border border-black/10 bg-white p-3">
                      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[#16702e]">
                        {copy.planner.platform}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                        {plan.platformAngle}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {plan.checklist.slice(0, 3).map((item) => (
                        <span
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black/56"
                          key={item}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <Link
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
                      href={href}
                    >
                      {copy.planner.usePlan}
                      <ArrowRight className="size-4" />
                    </Link>
                    {canSkip || canMarkDistributed ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {canSkip ? (
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/58 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={updatingPlanId === plan.id}
                            onClick={() => {
                              onUpdateStatus(plan.id, "skipped");
                            }}
                            type="button"
                          >
                            {updatingPlanId === plan.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              copy.planner.skip
                            )}
                          </button>
                        ) : null}
                        {canMarkDistributed ? (
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-black/58 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={updatingPlanId === plan.id}
                            onClick={() => {
                              onUpdateStatus(plan.id, "distributed");
                            }}
                            type="button"
                          >
                            {updatingPlanId === plan.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              copy.planner.markDistributed
                            )}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-lg border border-black/10 bg-[#f6f8f4] p-5 text-center">
              <Sparkles className="size-9 text-[#16702e]" />
              <p className="mt-4 max-w-md text-base font-medium leading-7 text-black/58">
                {copy.planner.empty}
              </p>
            </div>
          )}
          {plans.length > 0 ? (
            <p className="mt-3 text-xs font-medium leading-5 text-black/42">
              {locale === "ko"
                ? "플랜을 선택하면 생성 페이지에 제목, 요약, 프롬프트가 자동으로 채워집니다."
                : "Choosing a plan pre-fills title, summary, and prompt on the create page."}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PostPreviewCard({
  href,
  locale,
  post,
}: {
  href: string;
  locale: Locale;
  post: ContentPostRecord;
}) {
  const imageUrl = resolvePostImage(post);
  const videoUrl = resolvePostVideo(post);
  const dateLabel = formatDate(post.publishedAt ?? post.updatedAt, locale);

  return (
    <Link
      className="overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_18px_42px_rgba(8,18,12,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(8,18,12,0.08)]"
      href={href}
    >
      <div className="relative aspect-[4/5] bg-black">
        {videoUrl ? (
          <video
            autoPlay
            className="h-full w-full object-cover"
            loop
            muted
            playsInline
            poster={imageUrl ?? undefined}
            preload="metadata"
            src={videoUrl}
            title={post.title}
          />
        ) : imageUrl ? (
          <Image
            alt={post.title}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 100vw, 30vw"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/42">
            <ImageIcon className="size-8" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/76 to-transparent p-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-semibold uppercase text-black">
              {post.status}
            </span>
            <span className="rounded-full bg-black/64 px-2.5 py-1 text-[0.62rem] font-semibold uppercase text-white">
              video
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-black/54">
          {post.summary || post.previewText || post.title}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-black/42">
          <span>{dateLabel ?? "-"}</span>
          <span>{post.priceType}</span>
        </div>
      </div>
    </Link>
  );
}

export function FanletterStudioPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: FANLETTER_STUDIO_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_STUDIO_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: studioHref },
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
    { returnTo: studioHref },
  );
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: studioHref },
  );
  const channelsHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/channels`, referralCode),
    { returnTo: studioHref },
  );
  const postsHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/studio/vlogs`, referralCode),
    { returnTo: studioHref },
  );
  const salesHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/studio/sales`, referralCode),
    { returnTo: studioHref },
  );
  const paidUploadHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/new`, referralCode),
    { returnTo: studioHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: studioHref },
  );
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    referralCode,
  );
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [plannerState, setPlannerState] = useState<PlannerState>({
    error: null,
    generatedAt: null,
    plans: [],
    status: "idle",
  });
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [state, setState] = useState<StudioState>({
    error: null,
    fanRequests: [],
    fanRequestsError: null,
    member: memberSession.member,
    posts: [],
    postsSummary: EMPTY_POSTS_SUMMARY,
    profile: null,
    profileConfigured: false,
    salesError: null,
    salesSummary: null,
    status: "idle",
  });
  const loadInFlightRef = useRef(false);

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

  const loadStudio = useCallback(async () => {
    if (!accountAddress || loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setState((current) => ({
      ...current,
      error: null,
      fanRequestsError: null,
      salesError: null,
      status: "loading",
    }));
    setPlannerState((current) => ({
      ...current,
      error: null,
      status: current.plans.length > 0 ? current.status : "loading",
    }));

    try {
      const resolvedEmail = await resolveEmail();
      const encodedEmail = encodeURIComponent(resolvedEmail);
      const encodedWallet = encodeURIComponent(accountAddress);
      const profileUrl = `/api/content/profile?email=${encodedEmail}&walletAddress=${encodedWallet}`;
      let profileResponse = await fetch(profileUrl, { cache: "no-store" });

      if (!profileResponse.ok && profileResponse.status === 404) {
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
          updateMemberSession({
            email: syncData.member.email,
            member: syncData.member,
            walletAddress: accountAddress,
          });
        }

        if (syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        profileResponse = await fetch(profileUrl, { cache: "no-store" });
      }

      const profileData = await readApiJson<CreatorProfileResponse>(
        profileResponse,
        copy.connectRequired,
      );
      const postsUrl = `/api/content/posts?email=${encodedEmail}&walletAddress=${encodedWallet}&media=video&pageSize=${STUDIO_POSTS_PAGE_SIZE}&status=all`;
      const salesUrl = `/api/content/sales?email=${encodedEmail}&walletAddress=${encodedWallet}&pageSize=4`;
      const plannerUrl = `/api/content/planner?email=${encodedEmail}&walletAddress=${encodedWallet}`;
      const fanRequestsUrl = `/api/fanletter/requests?email=${encodedEmail}&walletAddress=${encodedWallet}&pageSize=${FAN_REQUESTS_PAGE_SIZE}`;
      const [postsData, salesResult, plannerResult, fanRequestsResult] =
        await Promise.all([
        fetch(postsUrl, { cache: "no-store" }).then((response) =>
          readApiJson<CreatorStudioPostsResponse>(response, copy.connectRequired),
        ),
        fetch(salesUrl, { cache: "no-store" })
          .then((response) =>
            readApiJson<ContentSalesDashboardResponse>(
              response,
              copy.salesFallback,
            ),
          )
          .then(
            (data) => ({ data, error: null }),
            (error: unknown) => ({
              data: null,
              error:
                error instanceof Error ? error.message : copy.salesFallback,
            }),
          ),
        fetch(plannerUrl, { cache: "no-store" })
          .then((response) =>
            readApiJson<FanletterVlogPlannerResponse>(
              response,
              copy.planner.errorFallback,
            ),
          )
          .then(
            (data) => ({ data, error: null }),
            (error: unknown) => ({
              data: null,
              error:
                error instanceof Error
                  ? error.message
                  : copy.planner.errorFallback,
            }),
          ),
        fetch(fanRequestsUrl, { cache: "no-store" })
          .then((response) =>
            readApiJson<FanletterFanRequestsResponse>(
              response,
              copy.fanRequests.errorFallback,
            ),
          )
          .then(
            (data) => ({ data, error: null }),
            (error: unknown) => ({
              data: null,
              error:
                error instanceof Error
                  ? error.message
                  : copy.fanRequests.errorFallback,
            }),
          ),
      ]);
      const nextMember =
        profileData.member ?? postsData.member ?? salesResult.data?.member ?? null;

      if (nextMember) {
        updateMemberSession({
          email: nextMember.email,
          member: nextMember,
          walletAddress: accountAddress,
        });
      }

      setState({
        error: null,
        fanRequests: fanRequestsResult.data?.requests ?? [],
        fanRequestsError: fanRequestsResult.error,
        member: nextMember,
        posts: postsData.posts,
        postsSummary: postsData.summary,
        profile: profileData.profile,
        profileConfigured: profileData.profileConfigured,
        salesError: salesResult.error,
        salesSummary: salesResult.data?.summary ?? null,
        status: "ready",
      });
      setPlannerState({
        error: plannerResult.error,
        generatedAt: plannerResult.data?.generatedAt ?? null,
        plans: plannerResult.data?.plans ?? [],
        status: plannerResult.error ? "error" : "ready",
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : copy.connectRequired,
        status: "error",
      }));
      setPlannerState((current) => ({
        ...current,
        status: current.plans.length > 0 ? "ready" : "idle",
      }));
    } finally {
      loadInFlightRef.current = false;
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    copy.connectRequired,
    copy.fanRequests.errorFallback,
    copy.planner.errorFallback,
    copy.salesFallback,
    locale,
    referralCode,
    resolveEmail,
    updateMemberSession,
  ]);

  useEffect(() => {
    if (!connection.isConnected) {
      return;
    }

    void loadStudio();
  }, [connection.isConnected, loadStudio]);

  const generatePlanner = useCallback(async () => {
    if (!accountAddress) {
      setPlannerState((current) => ({
        ...current,
        error: copy.connectRequired,
        status: "error",
      }));
      return;
    }

    setPlannerState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/planner", {
        body: JSON.stringify({
          email: resolvedEmail,
          locale,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<FanletterVlogPlannerResponse>(
        response,
        copy.planner.errorFallback,
      );

      if (!data.plans.length) {
        throw new Error(copy.planner.errorFallback);
      }

      setPlannerState({
        error: null,
        generatedAt: data.generatedAt,
        plans: data.plans,
        status: "ready",
      });
    } catch (error) {
      setPlannerState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : copy.planner.errorFallback,
        status: "error",
      }));
    }
  }, [
    accountAddress,
    copy.connectRequired,
    copy.planner.errorFallback,
    locale,
    resolveEmail,
  ]);

  const updatePlannerStatus = useCallback(
    async (planId: string, status: FanletterVlogPlanStatus) => {
      if (!accountAddress) {
        setPlannerState((current) => ({
          ...current,
          error: copy.connectRequired,
          status: "error",
        }));
        return;
      }

      setUpdatingPlanId(planId);
      setPlannerState((current) => ({
        ...current,
        error: null,
      }));

      try {
        const resolvedEmail = await resolveEmail();
        const response = await fetch("/api/content/planner", {
          body: JSON.stringify({
            email: resolvedEmail,
            planId,
            status,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const data = await readApiJson<PlannerPatchResponse>(
          response,
          copy.planner.errorFallback,
        );

        setPlannerState((current) => ({
          ...current,
          plans: current.plans.map((plan) =>
            plan.id === data.plan.id ? data.plan : plan,
          ),
          status: "ready",
        }));
      } catch (error) {
        setPlannerState((current) => ({
          ...current,
          error:
            error instanceof Error ? error.message : copy.planner.errorFallback,
          status: "error",
        }));
      } finally {
        setUpdatingPlanId(null);
      }
    },
    [
      accountAddress,
      copy.connectRequired,
      copy.planner.errorFallback,
      resolveEmail,
    ],
  );

  const updateFanRequestStatus = useCallback(
    async (
      requestId: string,
      status: FanletterFanRequestRecord["status"],
      contentId?: string | null,
    ) => {
      if (!accountAddress) {
        setState((current) => ({
          ...current,
          fanRequestsError: copy.connectRequired,
        }));
        return;
      }

      setUpdatingRequestId(requestId);
      setState((current) => ({
        ...current,
        fanRequestsError: null,
      }));

      try {
        const resolvedEmail = await resolveEmail();
        const response = await fetch("/api/fanletter/requests", {
          body: JSON.stringify({
            contentId,
            email: resolvedEmail,
            requestId,
            status,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const data = await readApiJson<FanletterFanRequestStatusUpdateResponse>(
          response,
          copy.fanRequests.errorFallback,
        );

        setState((current) => ({
          ...current,
          fanRequests:
            data.request.status === "hidden"
              ? current.fanRequests.filter(
                  (request) => request.requestId !== data.request.requestId,
                )
              : current.fanRequests.map((request) =>
                  request.requestId === data.request.requestId
                    ? data.request
                    : request,
                ),
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          fanRequestsError:
            error instanceof Error
              ? error.message
              : copy.fanRequests.errorFallback,
        }));
      } finally {
        setUpdatingRequestId(null);
      }
    },
    [
      accountAddress,
      copy.connectRequired,
      copy.fanRequests.errorFallback,
      resolveEmail,
    ],
  );

  const videoCount = useMemo(
    () =>
      state.posts.reduce(
        (count, post) => count + Math.max(0, post.contentVideoCount),
        0,
      ),
    [state.posts],
  );
  const profileProgress = [
    Boolean(state.profile?.displayName?.trim()),
    Boolean(state.profile?.characterPersona),
    Boolean(state.profile?.avatarImageUrl),
  ].filter(Boolean).length;
  const profileReady = state.profileConfigured && profileProgress >= 3;
  const profileActionLabel = profileReady
    ? copy.actions.profileManage
    : copy.actions.profileCreate;
  const memberIsPendingPayment = state.member?.status === "pending_payment";
  const showConnectGate =
    connection.isDisconnected ||
    (connection.isResolving &&
      connectionStatus === "disconnected" &&
      !accountAddress &&
      !memberSession.email &&
      !state.member);

  if (connection.isResolving && !showConnectGate) {
    return (
      <StatusPanel
        body={copy.loading}
        locale={locale}
        loading
        title={copy.loading}
      />
    );
  }

  if (showConnectGate) {
    return (
      <StatusPanel
        body={copy.connectRequired}
        cta={copy.actions.connect}
        href={connectHref}
        locale={locale}
        secondaryCta={copy.actions.feed}
        secondaryHref={feedHref}
        title={copy.connectTitle}
      />
    );
  }

  if (memberIsPendingPayment) {
    return (
      <StatusPanel
        body={copy.paymentRequired}
        cta={copy.actions.connect}
        href={activateHref}
        locale={locale}
        title={copy.paymentTitle}
      />
    );
  }

  if (state.status === "error") {
    return (
      <StatusPanel
        body={state.error ?? copy.connectRequired}
        cta={copy.actions.refresh}
        locale={locale}
        onRetry={() => {
          void loadStudio();
        }}
        title={copy.connectTitle}
      />
    );
  }

  const isLoading = state.status === "idle" || state.status === "loading";

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="border-b border-white/10 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+0.85rem)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition hover:bg-white/10"
              href={homeHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link className="flex min-w-0 items-center gap-2" href={homeHref}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden lg:inline-flex"
                locale={locale}
              />
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
              <Link
                className="hidden h-11 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 lg:inline-flex"
                href={feedHref}
              >
                {copy.actions.feed}
              </Link>
            </div>
          </header>

          <div className="mt-4 flex lg:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-end">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.35rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[3.9rem] lg:text-[4.25rem]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {copy.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
                  href={createHref}
                >
                  <Sparkles className="size-4" />
                  {copy.actions.create}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#44f26e]/34 bg-[#44f26e]/10 px-6 text-sm font-semibold !text-[#d8ffe0] transition hover:bg-[#44f26e]/16"
                  href={paidUploadHref}
                >
                  <Upload className="size-4" />
                  {copy.actions.paidUpload}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/8 px-6 text-sm font-semibold !text-white transition hover:bg-white/12"
                  href={profileHref}
                >
                  <PenLine className="size-4" />
                  {profileActionLabel}
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#44f26e] bg-cover bg-center text-xl font-semibold text-black ring-4 ring-white/10"
                  style={
                    state.profile?.avatarImageUrl
                      ? { backgroundImage: `url(${state.profile.avatarImageUrl})` }
                      : undefined
                  }
                >
                  {state.profile?.avatarImageUrl
                    ? null
                    : (state.profile?.displayName ?? "F").trim().charAt(0) || "F"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                    {copy.profileTitle}
                  </p>
                  <h2 className="mt-2 truncate text-2xl font-semibold tracking-normal">
                    {state.profile?.displayName || copy.labels.profile}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                    {profileReady ? copy.profileReady : copy.profileIncomplete}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((index) => (
                  <div
                    className={`h-2 rounded-full ${
                      index < profileProgress ? "bg-[#44f26e]" : "bg-white/12"
                    }`}
                    key={index}
                  />
                ))}
              </div>
              <div className="mt-5 grid gap-2 text-sm font-semibold text-white/70">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/28 p-3">
                  <span className="inline-flex items-center gap-2">
                    <UserRound className="size-4 text-[#44f26e]" />
                    {copy.labels.persona}
                  </span>
                  <span className="truncate text-white">
                    {state.profile?.characterPersona?.name ?? copy.noPersona}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/28 p-3">
                  <span className="inline-flex items-center gap-2">
                    <WalletCards className="size-4 text-[#44f26e]" />
                    {copy.labels.wallet}
                  </span>
                  <span className="truncate text-white">
                    {formatAddressLabel(accountAddress)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/28 p-3">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#44f26e]" />
                    {copy.labels.memberStatus}
                  </span>
                  <span className="text-white">
                    {getMemberStatusLabel(state.member, locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 pb-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              Icon={FileText}
              label={copy.labels.allPosts}
              value={isLoading ? "-" : formatNumber(state.postsSummary.all, locale)}
            />
            <MetricCard
              Icon={CheckCircle2}
              label={copy.labels.publishedPosts}
              value={
                isLoading ? "-" : formatNumber(state.postsSummary.published, locale)
              }
            />
            <MetricCard
              Icon={Clapperboard}
              label={copy.labels.videos}
              value={isLoading ? "-" : formatNumber(videoCount, locale)}
            />
            <MetricCard
              Icon={BadgeDollarSign}
              label={copy.labels.totalSales}
              value={
                isLoading
                  ? "-"
                  : formatUsdt(state.salesSummary?.totalSalesUsdt, locale)
              }
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-8 text-black sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start">
          <div className="min-w-0 space-y-6">
            <FanRequestsSection
              copy={copy}
              createHref={createHref}
              error={state.fanRequestsError}
              locale={locale}
              onUpdateStatus={(requestId, nextStatus) => {
                void updateFanRequestStatus(requestId, nextStatus);
              }}
              referralCode={referralCode}
              requests={state.fanRequests}
              updatingRequestId={updatingRequestId}
            />

            <PlannerSection
              copy={copy}
              createHref={createHref}
              error={plannerState.error}
              locale={locale}
              onGenerate={() => {
                void generatePlanner();
              }}
              onUpdateStatus={(planId, nextStatus) => {
                void updatePlannerStatus(planId, nextStatus);
              }}
              plans={plannerState.plans}
              status={plannerState.status}
              updatingPlanId={updatingPlanId}
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <ActionCard
                Icon={Sparkles}
                body={copy.steps[1].body}
                href={createHref}
                title={copy.actions.create}
              />
              <ActionCard
                Icon={PenLine}
                body={copy.steps[0].body}
                href={profileHref}
                title={profileActionLabel}
              />
              <ActionCard
                Icon={Share2}
                body={copy.channelDistribution}
                href={channelsHref}
                title={copy.actions.channels}
              />
              <ActionCard
                Icon={FileText}
                body={copy.steps[2].body}
                href={postsHref}
                title={copy.actions.managePosts}
              />
              <ActionCard
                Icon={Upload}
                body={copy.paidUploadBody}
                href={paidUploadHref}
                title={copy.actions.paidUpload}
              />
            </div>

            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#16702e]">
                    {locale === "ko" ? "브이로그" : "Vlogs"}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                    {copy.recentTitle}
                  </h2>
                </div>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
                  href={postsHref}
                >
                  {copy.actions.managePosts}
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              {isLoading ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <div
                      className="min-h-[22rem] animate-pulse rounded-lg bg-black/5"
                      key={item}
                    />
                  ))}
                </div>
              ) : state.posts.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {state.posts.map((post) => (
                    <PostPreviewCard
                      href={buildPathWithReferral(
                        `/${locale}/fanletter/content/${post.contentId}`,
                        referralCode ?? post.authorReferralCode,
                      )}
                      key={post.contentId}
                      locale={locale}
                      post={post}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-black/10 bg-[#f6f8f4] p-5">
                  <ImageIcon className="size-8 text-black/34" />
                  <h3 className="mt-4 text-2xl font-semibold">
                    {copy.emptyTitle}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-black/54">
                    {copy.emptyBody}
                  </p>
                  <Link
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
                    href={createHref}
                  >
                    {copy.actions.create}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <section className="rounded-lg border border-black/10 bg-[#07100b] p-5 text-white shadow-[0_22px_60px_rgba(8,18,12,0.16)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                    Sales
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {copy.labels.sales}
                  </h2>
                </div>
                <BadgeDollarSign className="size-6 text-[#44f26e]" />
              </div>
              <div className="mt-5 grid gap-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/44">
                    {copy.labels.totalSales}
                  </p>
                  <p className="mt-3 text-3xl font-semibold">
                    {formatUsdt(state.salesSummary?.totalSalesUsdt, locale)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-xl font-semibold">
                      {formatNumber(
                        state.salesSummary?.confirmedSalesCount ?? 0,
                        locale,
                      )}
                    </p>
                    <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/42">
                      {copy.labels.sales}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-xl font-semibold">
                      {formatUsdt(
                        state.salesSummary?.availableBalanceUsdt,
                        locale,
                      )}
                    </p>
                    <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/42">
                      {copy.labels.availableBalance}
                    </p>
                  </div>
                </div>
              </div>
              {state.salesError ? (
                <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/12 p-3 text-xs font-medium leading-5 text-amber-100">
                  {state.salesError}
                </div>
              ) : null}
              <Link
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
                href={salesHref}
              >
                {copy.actions.sales}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-4 text-sm font-semibold !text-white transition hover:bg-white/[0.1]"
                href={paidUploadHref}
              >
                <Upload className="size-4" />
                {copy.actions.paidUpload}
              </Link>
            </section>

            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_42px_rgba(8,18,12,0.06)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#16702e]">
                Launch path
              </p>
              <div className="mt-4 space-y-3">
                {copy.steps.map((step, index) => {
                  const Icon = [UserRound, Sparkles, Play][index] ?? Sparkles;

                  return (
                    <div
                      className="flex gap-3 rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
                      key={step.title}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                        <Icon className="size-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-black">
                          {step.title}
                        </span>
                        <span className="mt-1 block text-xs font-medium leading-5 text-black/54">
                          {step.body}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-2">
              <div className="rounded-lg border border-black/10 bg-white p-4">
                <Clapperboard className="size-5 text-[#16702e]" />
                <p className="mt-4 text-2xl font-semibold">
                  {formatNumber(videoCount, locale)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-black/42">
                  {copy.labels.videos}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
