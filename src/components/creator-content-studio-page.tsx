"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LayoutGrid,
  LoaderCircle,
  PenSquare,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  WandSparkles,
  UserRound,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { getContentCopy } from "@/lib/content-copy";
import { contentAutomationRunProgressSteps } from "@/lib/content-automation";
import type {
  ContentAutomationJobRecord,
  ContentAutomationJobsResponse,
  ContentAutomationRunProgressStep,
  ContentAutomationRunResponse,
  ContentAutomationRunStreamEvent,
  CreatorAutomationProfileResponse,
} from "@/lib/content-automation";
import { contentCoverGenerationProgressSteps } from "@/lib/content";
import type {
  ContentCoverGenerationProgressStep,
  ContentPostGenerateCoverResponse,
  ContentPostGenerateCoverStreamEvent,
  ContentPostMutationResponse,
  ContentPostRecord,
  ContentPostUploadResponse,
  CreatorProfileResponse,
  CreatorProfileUploadResponse,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type StudioState = {
  error: string | null;
  member: MemberRecord | null;
  notice: string | null;
  posts: ContentPostRecord[];
  profile: {
    avatarImageUrl: string;
    displayName: string;
    heroImageUrl: string;
    intro: string;
    payoutWalletAddress: string;
  };
  summary: {
    all: number;
    archived: number;
    draft: number;
    published: number;
  };
  status: "idle" | "loading" | "ready" | "error";
};

type MemberLoadResponse = {
  member?: MemberRecord | null;
};

type AutomationState = {
  available: boolean;
  error: string | null;
  form: {
    allowedDomains: string;
    autoPublish: boolean;
    enabled: boolean;
    maxPostsPerDay: string;
    minIntervalMinutes: string;
    personaName: string;
    personaPrompt: string;
    publishScoreThreshold: string;
    topics: string;
  };
  jobs: ContentAutomationJobRecord[];
  status: "idle" | "loading" | "ready";
};

type AutomationProgressStepState = "active" | "done" | "error" | "pending";

type AutomationProgressState = {
  active: boolean;
  currentStep: ContentAutomationRunProgressStep | null;
  error: string | null;
  message: string | null;
  progress: number;
  steps: Record<ContentAutomationRunProgressStep, AutomationProgressStepState>;
};

type AutomationCelebrationState = {
  contentId: string | null;
  title: string | null;
  tone: "draft" | "published";
};

type CoverGenerationProgressStepState = "active" | "done" | "error" | "pending";

type CoverGenerationProgressState = {
  active: boolean;
  currentStep: ContentCoverGenerationProgressStep | null;
  error: string | null;
  message: string | null;
  progress: number;
  response: ContentPostGenerateCoverResponse | null;
  steps: Record<
    ContentCoverGenerationProgressStep,
    CoverGenerationProgressStepState
  >;
};

type StudioView = "hub" | "new" | "profile";

const EMPTY_PROFILE = {
  avatarImageUrl: "",
  displayName: "",
  heroImageUrl: "",
  intro: "",
  payoutWalletAddress: "",
};

const EMPTY_POST_FORM = {
  body: "",
  contentImageUrls: [] as string[],
  coverImageUrl: "",
  generatedContentImageUrls: [] as string[],
  summary: "",
  title: "",
};

const EMPTY_AUTOMATION_FORM = {
  allowedDomains: "",
  autoPublish: false,
  enabled: false,
  maxPostsPerDay: "1",
  minIntervalMinutes: "360",
  personaName: "",
  personaPrompt: "",
  publishScoreThreshold: "86",
  topics: "",
};
const EMPTY_STUDIO_SUMMARY = {
  all: 0,
  archived: 0,
  draft: 0,
  published: 0,
};
const GENERATED_CONTENT_IMAGE_LIMIT = 5;
const SERVER_BODY_REQUIRED_ERROR = "body is required.";

const AUTOMATION_RESTRICTED_MESSAGE =
  "Content automation is not enabled for this member.";
const HUB_FULL_POST_PAGE_SIZE = 6;
const HUB_COMPACT_POST_PAGE_SIZE = 4;

function resolveStudioPostPreviewImage(
  post: Pick<ContentPostRecord, "coverImageUrl" | "contentImageUrls">,
) {
  return post.coverImageUrl ?? post.contentImageUrls[0] ?? null;
}

function createEmptyAutomationProgress(): AutomationProgressState {
  return {
    active: false,
    currentStep: null,
    error: null,
    message: null,
    progress: 0,
    steps: Object.fromEntries(
      contentAutomationRunProgressSteps.map((step) => [step, "pending"]),
    ) as Record<ContentAutomationRunProgressStep, AutomationProgressStepState>,
  };
}

function createEmptyCoverGenerationProgress(): CoverGenerationProgressState {
  return {
    active: false,
    currentStep: null,
    error: null,
    message: null,
    progress: 0,
    response: null,
    steps: Object.fromEntries(
      contentCoverGenerationProgressSteps.map((step) => [step, "pending"]),
    ) as Record<
      ContentCoverGenerationProgressStep,
      CoverGenerationProgressStepState
    >,
  };
}

function upsertAutomationJob(
  jobs: ContentAutomationJobRecord[],
  nextJob: ContentAutomationJobRecord,
) {
  return [nextJob, ...jobs.filter((job) => job.jobId !== nextJob.jobId)].slice(0, 20);
}

function upsertContentPost(
  posts: ContentPostRecord[],
  nextPost: ContentPostRecord,
) {
  return [nextPost, ...posts.filter((post) => post.contentId !== nextPost.contentId)];
}

function parseDelimitedValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function stringifyDelimitedValues(values: string[]) {
  return values.join(", ");
}

function applyAutomationProgressEvent(
  current: AutomationProgressState,
  event: ContentAutomationRunStreamEvent,
): AutomationProgressState {
  if (event.type === "error") {
    return {
      ...current,
      active: false,
      error: event.error,
      message: event.error,
    };
  }

  if (event.type === "result") {
    return {
      ...current,
      active: false,
      currentStep:
        event.response.job.status === "failed" ? current.currentStep : "finalizing",
      error: event.response.job.status === "failed" ? event.response.job.error : null,
      message:
        event.response.job.warning ??
        event.response.job.error ??
        event.response.job.summary ??
        current.message,
      progress: event.response.job.status === "failed" ? current.progress : 100,
      steps:
        event.response.job.status === "failed"
          ? current.steps
          : {
              ...current.steps,
              finalizing: "done",
            },
    };
  }

  const nextSteps = {
    ...current.steps,
    [event.progress.step]:
      event.progress.status === "running"
        ? "active"
        : event.progress.status === "completed"
          ? "done"
          : "error",
  };

  return {
    ...current,
    active: event.progress.status === "running",
    currentStep: event.progress.step,
    error: event.progress.status === "failed" ? event.progress.message : null,
    message: event.progress.message,
    progress: Math.max(current.progress, event.progress.progress),
    steps: nextSteps,
  };
}

function applyCoverGenerationProgressEvent(
  current: CoverGenerationProgressState,
  event: ContentPostGenerateCoverStreamEvent,
): CoverGenerationProgressState {
  if (event.type === "error") {
    return {
      ...current,
      active: false,
      error: event.error,
      message: event.error,
    };
  }

  if (event.type === "result") {
    return {
      ...current,
      active: false,
      currentStep: "finalizing",
      error: null,
      message: event.response.revisedPrompt ?? current.message,
      progress: 100,
      response: event.response,
      steps: {
        ...current.steps,
        finalizing: "done",
      },
    };
  }

  return {
    ...current,
    active: event.progress.status === "running",
    currentStep: event.progress.step,
    error: event.progress.status === "failed" ? event.progress.message : null,
    message: event.progress.message,
    progress: Math.max(current.progress, event.progress.progress),
    steps: {
      ...current.steps,
      [event.progress.step]:
        event.progress.status === "running"
          ? "active"
          : event.progress.status === "completed"
            ? "done"
            : "error",
    },
  };
}

async function readAutomationRunStream(
  response: Response,
  onEvent: (event: ContentAutomationRunStreamEvent) => void,
) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Streaming response body is missing.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let receivedTerminalEvent = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      const event = JSON.parse(trimmed) as ContentAutomationRunStreamEvent;
      if (event.type === "error" || event.type === "result") {
        receivedTerminalEvent = true;
      }
      onEvent(event);
    }
  }

  const trailing = buffer.trim();

  if (trailing) {
    const event = JSON.parse(trailing) as ContentAutomationRunStreamEvent;
    if (event.type === "error" || event.type === "result") {
      receivedTerminalEvent = true;
    }
    onEvent(event);
  }

  if (!receivedTerminalEvent) {
    throw new Error("Automation stream ended before a final result was returned.");
  }
}

async function readCoverGenerationStream(
  response: Response,
  onEvent: (event: ContentPostGenerateCoverStreamEvent) => void,
) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Streaming response body is missing.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      onEvent(JSON.parse(trimmed) as ContentPostGenerateCoverStreamEvent);
    }
  }

  const trailing = buffer.trim();

  if (trailing) {
    onEvent(JSON.parse(trailing) as ContentPostGenerateCoverStreamEvent);
  }
}

export function CreatorContentStudioPage({
  dictionary,
  locale,
  referralCode = null,
  returnToHref = null,
  view = "hub",
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
  view?: StudioView;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const studioHomeHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio`, referralCode),
    { returnTo: returnToHref },
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/profile`, referralCode),
    { returnTo: returnToHref },
  );
  const postsManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/posts`, referralCode),
    { returnTo: returnToHref },
  );
  const newPostHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/new`, referralCode),
    { returnTo: returnToHref },
  );
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const currentStudioHref =
    view === "profile"
      ? profileHref
      : view === "new"
        ? newPostHref
        : studioHomeHref;
  const [state, setState] = useState<StudioState>({
    error: null,
    member: null,
    notice: null,
    posts: [],
    profile: EMPTY_PROFILE,
    summary: EMPTY_STUDIO_SUMMARY,
    status: "idle",
  });
  const [postForm, setPostForm] = useState(EMPTY_POST_FORM);
  const [postBodyError, setPostBodyError] = useState<string | null>(null);
  const [automation, setAutomation] = useState<AutomationState>({
    available: false,
    error: null,
    form: EMPTY_AUTOMATION_FORM,
    jobs: [],
    status: "idle",
  });
  const [automationProgress, setAutomationProgress] = useState<AutomationProgressState>(
    createEmptyAutomationProgress(),
  );
  const [isAutomationRunDialogOpen, setIsAutomationRunDialogOpen] = useState(false);
  const [coverGenerationProgress, setCoverGenerationProgress] =
    useState<CoverGenerationProgressState>(createEmptyCoverGenerationProgress());
  const [isCoverGenerationDialogOpen, setIsCoverGenerationDialogOpen] =
    useState(false);
  const [contentImageGenerationProgress, setContentImageGenerationProgress] =
    useState<CoverGenerationProgressState>(createEmptyCoverGenerationProgress());
  const [isContentImageGenerationDialogOpen, setIsContentImageGenerationDialogOpen] =
    useState(false);
  const [contentImagePrompt, setContentImagePrompt] = useState("");
  const [automationCelebration, setAutomationCelebration] =
    useState<AutomationCelebrationState | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [isUploadingProfileAvatar, setIsUploadingProfileAvatar] = useState(false);
  const [isUploadingProfileHeroImage, setIsUploadingProfileHeroImage] = useState(false);
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const [isGeneratingPostImage, setIsGeneratingPostImage] = useState(false);
  const automationProgressLabels =
    locale === "ko"
      ? {
          authorizing: {
            description: "지갑 연결과 회원 권한을 먼저 확인합니다.",
            label: "회원 확인",
          },
          collecting_sources: {
            description: "가져온 출처를 정리하고 중복을 걸러냅니다.",
            label: "출처 정리",
          },
          completed: "완료",
          currentStage: "현재 단계",
          discovering: {
            description: "공개 웹에서 사용할 수 있는 최신 출처를 찾습니다.",
            label: "공개 출처 탐색",
          },
          drafting: {
            description: "선별한 출처를 바탕으로 초안과 태그를 작성합니다.",
            label: "초안 작성",
          },
          error: "오류",
          finalizing: {
            description: "작업 기록과 상태를 마무리로 저장합니다.",
            label: "마무리 저장",
          },
          generating_cover: {
            description: "초안 분위기에 맞는 AI 커버 이미지를 준비합니다.",
            label: "AI 커버 생성",
          },
          pending: "대기",
          progress: "진행률",
          queueing: {
            description: "이번 실행의 작업 컨텍스트를 준비합니다.",
            label: "작업 준비",
          },
          running: "진행 중",
          saving_content: {
            description: "생성한 초안을 콘텐츠로 저장합니다.",
            label: "콘텐츠 저장",
          },
          stepCount: "완료 단계",
          title: "실행 중인 자동화",
        }
      : {
          authorizing: {
            description: "Checking wallet ownership and member authorization.",
            label: "Member check",
          },
          collecting_sources: {
            description: "Cleaning up discovered sources and removing duplicates.",
            label: "Source preparation",
          },
          completed: "Completed",
          currentStage: "Current stage",
          discovering: {
            description: "Searching public web sources that fit this run.",
            label: "Source discovery",
          },
          drafting: {
            description: "Writing the draft body, summary, and tags.",
            label: "Draft writing",
          },
          error: "Error",
          finalizing: {
            description: "Saving the final run status and audit trail.",
            label: "Finalizing",
          },
          generating_cover: {
            description: "Preparing an AI cover image for the draft.",
            label: "Cover generation",
          },
          pending: "Pending",
          progress: "Progress",
          queueing: {
            description: "Preparing the automation job and runtime context.",
            label: "Queue setup",
          },
          running: "Running",
          saving_content: {
            description: "Persisting the generated draft as content.",
            label: "Content save",
          },
          stepCount: "Completed steps",
          title: "Automation in progress",
        };
  const automationProgressStepMeta: Record<
    ContentAutomationRunProgressStep,
    {
      icon: typeof UserRound;
      label: string;
      description: string;
    }
  > = {
    authorizing: {
      description: automationProgressLabels.authorizing.description,
      icon: UserRound,
      label: automationProgressLabels.authorizing.label,
    },
    collecting_sources: {
      description: automationProgressLabels.collecting_sources.description,
      icon: LayoutGrid,
      label: automationProgressLabels.collecting_sources.label,
    },
    discovering: {
      description: automationProgressLabels.discovering.description,
      icon: Search,
      label: automationProgressLabels.discovering.label,
    },
    drafting: {
      description: automationProgressLabels.drafting.description,
      icon: PenSquare,
      label: automationProgressLabels.drafting.label,
    },
    finalizing: {
      description: automationProgressLabels.finalizing.description,
      icon: Check,
      label: automationProgressLabels.finalizing.label,
    },
    generating_cover: {
      description: automationProgressLabels.generating_cover.description,
      icon: WandSparkles,
      label: automationProgressLabels.generating_cover.label,
    },
    queueing: {
      description: automationProgressLabels.queueing.description,
      icon: RefreshCcw,
      label: automationProgressLabels.queueing.label,
    },
    saving_content: {
      description: automationProgressLabels.saving_content.description,
      icon: Save,
      label: automationProgressLabels.saving_content.label,
    },
  };
  const automationRunDialogLabels =
    locale === "ko"
      ? {
          close: "닫기",
          completed: "완료",
          confirmBody:
            "현재 자동화 설정을 기준으로 공개 출처 탐색부터 초안 저장까지 한 번 실행합니다.",
          confirmHint:
            "설정한 페르소나, 주제, 허용 도메인을 기준으로 새 초안을 생성합니다.",
          confirmPrimary: "실행 시작",
          confirmSecondary: "취소",
          error: "오류",
          persona: "페르소나",
          progress: "진행률",
          publishMode: "저장 방식",
          publishModeAuto: "조건 충족 시 게시",
          publishModeDraft: "초안 저장",
          running: "실행 중",
          stepCount: "완료 단계",
          successSecondary: "닫기",
          successTitle: "초안 생성 완료",
          title: "초안 생성 실행",
          topics: "주제",
        }
      : {
          close: "Close",
          completed: "Completed",
          confirmBody:
            "Run the current automation once to discover sources and save a fresh draft.",
          confirmHint:
            "This uses the current persona, topics, and allowed domains to generate a new draft.",
          confirmPrimary: "Start run",
          confirmSecondary: "Cancel",
          error: "Error",
          persona: "Persona",
          progress: "Progress",
          publishMode: "Save mode",
          publishModeAuto: "Publish when score threshold passes",
          publishModeDraft: "Save as draft",
          running: "Running",
          stepCount: "Completed steps",
          successSecondary: "Close",
          successTitle: "Draft generated",
          title: "Run automation",
          topics: "Topics",
        };
  const coverGenerationLabels =
    locale === "ko"
      ? {
          authorizing: {
            description: "같은 회원 이메일과 지갑 권한을 먼저 확인합니다.",
            label: "회원 확인",
          },
          completed: "완료",
          confirmBody:
            "현재 입력한 제목, 요약, 본문을 바탕으로 AI가 커버 이미지를 생성합니다.",
          confirmHint:
            "텍스트가 없는 이미지로 생성되며, 완료되면 커버 영역에 바로 반영됩니다.",
          confirmPrimary: "생성 시작",
          confirmSecondary: "나중에",
          error: "오류",
          finalizing: {
            description: "생성 결과를 스튜디오 폼에 연결합니다.",
            label: "적용 마무리",
          },
          generating_image: {
            description: "시네마틱한 화보형 커버 이미지를 생성합니다.",
            label: "이미지 생성",
          },
          preparing_prompt: {
            description: "제목과 요약을 바탕으로 비주얼 브리프를 정리합니다.",
            label: "비주얼 브리프",
          },
          progress: "진행률",
          running: "진행 중",
          successPrimary: "커버 적용 완료",
          successSecondary: "계속 편집하기",
          successTitle: "AI 커버가 준비되었습니다.",
          title: "AI 커버 생성",
          uploading_cover: {
            description: "생성한 이미지를 스튜디오 자산으로 업로드합니다.",
            label: "자산 업로드",
          },
        }
      : {
          authorizing: {
            description: "Verifying wallet ownership and member access.",
            label: "Authorization",
          },
          completed: "Completed",
          confirmBody:
            "The AI will generate a cover image from your current title, summary, and body.",
          confirmHint:
            "The result is text-free and will be applied to the cover field as soon as it is ready.",
          confirmPrimary: "Start generation",
          confirmSecondary: "Later",
          error: "Error",
          finalizing: {
            description: "Applying the generated result back into the studio form.",
            label: "Finalizing",
          },
          generating_image: {
            description: "Creating a cinematic editorial cover image.",
            label: "Image generation",
          },
          preparing_prompt: {
            description: "Preparing the visual brief from your draft.",
            label: "Visual brief",
          },
          progress: "Progress",
          running: "Running",
          successPrimary: "Use this cover",
          successSecondary: "Keep editing",
          successTitle: "Your AI cover is ready.",
          title: "AI cover generation",
          uploading_cover: {
            description: "Uploading the generated image to studio assets.",
            label: "Asset upload",
          },
        };
  const coverGenerationStepMeta: Record<
    ContentCoverGenerationProgressStep,
    {
      description: string;
      icon: typeof UserRound;
      label: string;
    }
  > = {
    authorizing: {
      description: coverGenerationLabels.authorizing.description,
      icon: UserRound,
      label: coverGenerationLabels.authorizing.label,
    },
    finalizing: {
      description: coverGenerationLabels.finalizing.description,
      icon: Check,
      label: coverGenerationLabels.finalizing.label,
    },
    generating_image: {
      description: coverGenerationLabels.generating_image.description,
      icon: WandSparkles,
      label: coverGenerationLabels.generating_image.label,
    },
    preparing_prompt: {
      description: coverGenerationLabels.preparing_prompt.description,
      icon: PenSquare,
      label: coverGenerationLabels.preparing_prompt.label,
    },
    uploading_cover: {
      description: coverGenerationLabels.uploading_cover.description,
      icon: ImagePlus,
      label: coverGenerationLabels.uploading_cover.label,
    },
  };
  const contentImageGenerationLabels =
    locale === "ko"
      ? {
          authorizing: {
            description: "같은 회원 이메일과 지갑 권한을 먼저 확인합니다.",
            label: "회원 확인",
          },
          completed: "완료",
          confirmBody:
            "현재 입력한 제목, 요약, 본문을 바탕으로 상세 갤러리용 AI 이미지를 생성합니다.",
          confirmHint:
            `갤러리용 AI 이미지는 최대 ${GENERATED_CONTENT_IMAGE_LIMIT}장까지만 만들 수 있고, 완료되면 콘텐츠 이미지 목록에 바로 추가됩니다.`,
          promptHint:
            "원하는 분위기, 구도, 색감, 소품, 배경을 추가로 적으면 생성 프롬프트에 함께 반영됩니다.",
          promptLabel: "추가 프롬프트",
          promptPlaceholder:
            "예: 해변의 황금빛 석양, 역동적인 모래 질감, 하이패션 에디토리얼 무드",
          confirmPrimary: "이미지 생성",
          confirmSecondary: "나중에",
          error: "오류",
          finalizing: {
            description: "생성된 이미지를 콘텐츠 갤러리에 추가합니다.",
            label: "갤러리 반영",
          },
          generating_image: {
            description: "상세 페이지에서 크게 보일 화보형 이미지를 생성합니다.",
            label: "이미지 생성",
          },
          preparing_prompt: {
            description: "콘텐츠 분위기에 맞는 갤러리 이미지 브리프를 정리합니다.",
            label: "비주얼 브리프",
          },
          progress: "진행률",
          running: "진행 중",
          successPrimary: "갤러리에 추가 완료",
          successSecondary: "계속 편집하기",
          successTitle: "AI 콘텐츠 이미지가 준비되었습니다.",
          title: "AI 콘텐츠 이미지 생성",
          uploading_cover: {
            description: "생성한 이미지를 스튜디오 자산으로 업로드합니다.",
            label: "자산 업로드",
          },
        }
      : {
          authorizing: {
            description: "Verifying wallet ownership and member access.",
            label: "Authorization",
          },
          completed: "Completed",
          confirmBody:
            "The AI will generate a gallery image from your current title, summary, and body.",
          confirmHint:
            `AI gallery images are limited to ${GENERATED_CONTENT_IMAGE_LIMIT} and will be added directly into your content image list.`,
          promptHint:
            "Add any extra direction for mood, composition, color, props, or background to blend into the final prompt.",
          promptLabel: "Extra prompt",
          promptPlaceholder:
            "Example: golden sunset on a beach, dynamic sand texture, high-fashion editorial mood",
          confirmPrimary: "Generate image",
          confirmSecondary: "Later",
          error: "Error",
          finalizing: {
            description: "Adding the generated result into the content gallery.",
            label: "Gallery update",
          },
          generating_image: {
            description: "Creating an editorial gallery visual for the detail page.",
            label: "Image generation",
          },
          preparing_prompt: {
            description: "Preparing the visual brief for the gallery image.",
            label: "Visual brief",
          },
          progress: "Progress",
          running: "Running",
          successPrimary: "Added to gallery",
          successSecondary: "Keep editing",
          successTitle: "Your AI content image is ready.",
          title: "AI gallery image",
          uploading_cover: {
            description: "Uploading the generated image to studio assets.",
            label: "Asset upload",
          },
        };
  const completedAutomationStepCount = contentAutomationRunProgressSteps.filter(
    (step) => automationProgress.steps[step] === "done",
  ).length;
  const currentAutomationStepMeta = automationProgress.currentStep
    ? automationProgressStepMeta[automationProgress.currentStep]
    : null;
  const completedCoverGenerationStepCount = contentCoverGenerationProgressSteps.filter(
    (step) => coverGenerationProgress.steps[step] === "done",
  ).length;
  const completedContentImageGenerationStepCount =
    contentCoverGenerationProgressSteps.filter(
      (step) => contentImageGenerationProgress.steps[step] === "done",
    ).length;
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const profileHeroImageInputRef = useRef<HTMLInputElement | null>(null);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const postGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const isDisconnected = status !== "connected" || !accountAddress;
  const backHref = view === "hub" ? returnToHref ?? homeHref : studioHomeHref;
  const pageTitle =
    view === "profile"
      ? contentCopy.labels.creatorSettings
      : view === "new"
        ? contentCopy.actions.createPost
        : contentCopy.page.studioTitle;
  const pageDescription =
    view === "profile"
      ? contentCopy.page.profileDescription
      : view === "new"
        ? contentCopy.page.newDescription
        : contentCopy.page.studioDescription;
  const headerShortcutHref =
    view === "profile"
      ? newPostHref
      : view === "new"
        ? profileHref
        : null;
  const headerShortcutLabel =
    view === "profile"
      ? contentCopy.actions.createPost
      : view === "new"
        ? contentCopy.labels.creatorSettings
        : null;

  const publishedCount = state.summary.published;
  const draftCount = state.summary.draft;

  const sortedPosts = useMemo(() => {
    return [...state.posts].sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
      return rightTime - leftTime;
    });
  }, [state.posts]);

  const canUseWorkspace = !isDisconnected && state.member?.status === "completed";
  const recoverableStudioError =
    state.error && state.member?.status === "completed" ? state.error : null;
  const postBodyRequiredMessage =
    locale === "ko"
      ? "본문을 입력한 뒤 저장하거나 게시해주세요."
      : "Enter the content body before saving or publishing.";
  const canGeneratePostCover = Boolean(
    postForm.title.trim() || postForm.summary.trim() || postForm.body.trim(),
  );

  const loadStudio = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    const shouldLoadProfileView = view === "profile";
    const shouldLoadAutomation = view === "profile";
    const shouldUseCompactPostsBootstrap = view !== "profile";
    const compactPageSize =
      view === "new" ? HUB_COMPACT_POST_PAGE_SIZE : HUB_FULL_POST_PAGE_SIZE;

    setState((current) => ({
      ...current,
      error: null,
      notice: null,
      status: "loading",
    }));
    setAutomation((current) => ({
      ...current,
      error: null,
      jobs: shouldLoadAutomation ? [] : current.jobs,
      status: shouldLoadAutomation ? "loading" : current.status,
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      let validationError: string | null = null;
      let memberResponse = await fetch(
        `/api/members?email=${encodeURIComponent(email)}`,
      );
      let memberData = (await memberResponse.json()) as
        | MemberLoadResponse
        | { error?: string };

      if (!memberResponse.ok && memberResponse.status === 404) {
        memberResponse = await fetch("/api/members", {
          body: JSON.stringify({
            chainId: chain.id,
            chainName: chain.name ?? "BSC",
            email,
            locale,
            syncMode: "light",
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        memberData = (await memberResponse.json()) as
          | SyncMemberResponse
          | { error?: string };
        validationError =
          "validationError" in memberData &&
          typeof memberData.validationError === "string"
            ? memberData.validationError
            : null;
      }

      if (!memberResponse.ok) {
        throw new Error(
          "error" in memberData && memberData.error
            ? memberData.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      const member = "member" in memberData ? memberData.member : null;

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      if (validationError) {
        setState({
          error: validationError,
          member,
          notice: null,
          posts: [],
          profile: EMPTY_PROFILE,
          summary: EMPTY_STUDIO_SUMMARY,
          status: "ready",
        });
        setAutomation({
          available: false,
          error: null,
          form: EMPTY_AUTOMATION_FORM,
          jobs: [],
          status: "ready",
        });
        return;
      }

      if (member.status !== "completed") {
        setState({
          error: contentCopy.messages.paymentRequired,
          member,
          notice: null,
          posts: [],
          profile: EMPTY_PROFILE,
          summary: EMPTY_STUDIO_SUMMARY,
          status: "ready",
        });
        setAutomation({
          available: false,
          error: null,
          form: EMPTY_AUTOMATION_FORM,
          jobs: [],
          status: "ready",
        });
        return;
      }

      if (shouldLoadProfileView) {
        const profileResponse = await fetch(
          `/api/content/profile?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`,
        );

        const profileData = (await profileResponse.json()) as
          | CreatorProfileResponse
          | { error?: string };

        if (!profileResponse.ok || !("profile" in profileData)) {
          throw new Error(
            "error" in profileData && profileData.error
              ? profileData.error
              : contentCopy.messages.studioLoadFailed,
          );
        }

        setState({
          error: null,
          member,
          notice: null,
          posts: [],
          profile: {
            avatarImageUrl: profileData.profile.avatarImageUrl ?? "",
            displayName: profileData.profile.displayName,
            heroImageUrl: profileData.profile.heroImageUrl ?? "",
            intro: profileData.profile.intro,
            payoutWalletAddress: profileData.profile.payoutWalletAddress ?? "",
          },
          summary: EMPTY_STUDIO_SUMMARY,
          status: "ready",
        });

        if (profileData.automationAvailable === false) {
          setAutomation({
            available: false,
            error: null,
            form: EMPTY_AUTOMATION_FORM,
            jobs: [],
            status: "ready",
          });
          return;
        }

        const [automationProfileResponse, automationJobsResponse] =
          await Promise.all([
            fetch(
              `/api/content/automation/profile?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`,
            ),
            fetch(
              `/api/content/automation/jobs?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`,
            ),
          ]);

        const automationProfileData = (await automationProfileResponse.json()) as
          | CreatorAutomationProfileResponse
          | { error?: string };
        const automationJobsData = (await automationJobsResponse.json()) as
          | ContentAutomationJobsResponse
          | { error?: string };

        if (
          automationProfileResponse.ok &&
          "profile" in automationProfileData &&
          automationJobsResponse.ok &&
          "items" in automationJobsData
        ) {
          setAutomation({
            available: true,
            error: null,
            form: {
              allowedDomains: stringifyDelimitedValues(
                automationProfileData.profile.allowedDomains,
              ),
              autoPublish: automationProfileData.profile.autoPublish,
              enabled: automationProfileData.profile.enabled,
              maxPostsPerDay: String(automationProfileData.profile.maxPostsPerDay),
              minIntervalMinutes: String(
                automationProfileData.profile.minIntervalMinutes,
              ),
              personaName: automationProfileData.profile.personaName,
              personaPrompt: automationProfileData.profile.personaPrompt,
              publishScoreThreshold: String(
                automationProfileData.profile.publishScoreThreshold,
              ),
              topics: stringifyDelimitedValues(automationProfileData.profile.topics),
            },
            jobs: automationJobsData.items,
            status: "ready",
          });
        } else if (
          automationProfileResponse.status === 403 &&
          "error" in automationProfileData &&
          automationProfileData.error === AUTOMATION_RESTRICTED_MESSAGE
        ) {
          setAutomation({
            available: false,
            error: null,
            form: EMPTY_AUTOMATION_FORM,
            jobs: [],
            status: "ready",
          });
        } else {
          setAutomation({
            available: false,
            error:
              "error" in automationJobsData && automationJobsData.error
                ? automationJobsData.error
                : "error" in automationProfileData && automationProfileData.error
                  ? automationProfileData.error
                  : contentCopy.messages.automationLoadFailed,
            form: EMPTY_AUTOMATION_FORM,
            jobs: [],
            status: "ready",
          });
        }

        return;
      }

      const postsRequestUrl = shouldUseCompactPostsBootstrap
        ? `/api/content/posts?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}&page=1&pageSize=${compactPageSize}`
        : `/api/content/posts?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`;

      const requests = [
        fetch(postsRequestUrl),
      ] as const;

      const automationRequests = shouldLoadAutomation
        ? ([
            fetch(
              `/api/content/automation/profile?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`,
            ),
            fetch(
              `/api/content/automation/jobs?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`,
            ),
          ] as const)
        : null;

      const [postsResponse, ...automationResponses] = await Promise.all([
        ...requests,
        ...(automationRequests ?? []),
      ]);

      const postsData = (await postsResponse.json()) as
        | CreatorStudioPostsResponse
        | { error?: string };

      let automationProfileResponse: Response | null = null;
      let automationJobsResponse: Response | null = null;
      let automationProfileData:
        | CreatorAutomationProfileResponse
        | { error?: string }
        | null = null;
      let automationJobsData:
        | ContentAutomationJobsResponse
        | { error?: string }
        | null = null;

      if (shouldLoadAutomation) {
        [automationProfileResponse, automationJobsResponse] = automationResponses as [
          Response,
          Response,
        ];
        automationProfileData = (await automationProfileResponse.json()) as
          | CreatorAutomationProfileResponse
          | { error?: string };
        automationJobsData = (await automationJobsResponse.json()) as
          | ContentAutomationJobsResponse
          | { error?: string };
      }

      if (
        !postsResponse.ok ||
        !("posts" in postsData)
      ) {
        throw new Error(
          "error" in postsData && postsData.error
            ? postsData.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setState({
        error: null,
        member: postsData.member,
        notice: null,
        posts: postsData.posts,
        profile: {
          avatarImageUrl: postsData.profile.avatarImageUrl ?? "",
          displayName: postsData.profile.displayName,
          heroImageUrl: postsData.profile.heroImageUrl ?? "",
          intro: postsData.profile.intro,
          payoutWalletAddress: postsData.profile.payoutWalletAddress ?? "",
        },
        summary: postsData.summary,
        status: "ready",
      });

      if (
        shouldLoadAutomation &&
        automationProfileResponse &&
        automationJobsResponse &&
        automationProfileData &&
        automationJobsData &&
        automationProfileResponse.ok &&
        "profile" in automationProfileData &&
        automationJobsResponse.ok &&
        "items" in automationJobsData
      ) {
        setAutomation({
          available: true,
          error: null,
          form: {
            allowedDomains: stringifyDelimitedValues(
              automationProfileData.profile.allowedDomains,
            ),
            autoPublish: automationProfileData.profile.autoPublish,
            enabled: automationProfileData.profile.enabled,
            maxPostsPerDay: String(automationProfileData.profile.maxPostsPerDay),
            minIntervalMinutes: String(
              automationProfileData.profile.minIntervalMinutes,
            ),
            personaName: automationProfileData.profile.personaName,
            personaPrompt: automationProfileData.profile.personaPrompt,
            publishScoreThreshold: String(
              automationProfileData.profile.publishScoreThreshold,
            ),
            topics: stringifyDelimitedValues(automationProfileData.profile.topics),
          },
          jobs: automationJobsData.items,
          status: "ready",
        });
      } else if (
        shouldLoadAutomation &&
        automationProfileResponse &&
        automationProfileData &&
        automationProfileResponse.status === 403 &&
        "error" in automationProfileData &&
        automationProfileData.error === AUTOMATION_RESTRICTED_MESSAGE
      ) {
        setAutomation({
          available: false,
          error: null,
          form: EMPTY_AUTOMATION_FORM,
          jobs: [],
          status: "ready",
        });
      } else if (!shouldLoadAutomation) {
        setAutomation((current) => ({
          ...current,
          error: null,
          status: "idle",
        }));
      } else {
        setAutomation({
          available: false,
          error:
            automationJobsData &&
            "error" in automationJobsData &&
            automationJobsData.error
              ? automationJobsData.error
              : automationProfileData &&
                  "error" in automationProfileData &&
                  automationProfileData.error
                ? automationProfileData.error
                : contentCopy.messages.automationLoadFailed,
          form: EMPTY_AUTOMATION_FORM,
          jobs: [],
          status: "ready",
        });
      }
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        member: null,
        notice: null,
        posts: [],
        profile: EMPTY_PROFILE,
        summary: EMPTY_STUDIO_SUMMARY,
        status: "error",
      });
      setAutomation({
        available: false,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.automationLoadFailed,
        form: EMPTY_AUTOMATION_FORM,
        jobs: [],
        status: "ready",
      });
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    contentCopy.messages.memberMissing,
    contentCopy.messages.automationLoadFailed,
    contentCopy.messages.paymentRequired,
    contentCopy.messages.studioLoadFailed,
    dictionary.member.errors.missingEmail,
    locale,
    view,
  ]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        error: null,
        member: null,
        notice: null,
        posts: [],
        profile: EMPTY_PROFILE,
        summary: EMPTY_STUDIO_SUMMARY,
        status: "idle",
      });
      setAutomation({
        available: false,
        error: null,
        form: EMPTY_AUTOMATION_FORM,
        jobs: [],
        status: "idle",
      });
      return;
    }

    void loadStudio();
  }, [accountAddress, loadStudio, status]);

  async function resolveMemberEmail() {
    const email = await getUserEmail({ client: thirdwebClient });

    if (!email) {
      throw new Error(dictionary.member.errors.missingEmail);
    }

    return email;
  }

  async function saveProfile() {
    try {
      setIsSavingProfile(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile", {
        body: JSON.stringify({
          avatarImageUrl: state.profile.avatarImageUrl || null,
          displayName: state.profile.displayName,
          email,
          heroImageUrl: state.profile.heroImageUrl || null,
          intro: state.profile.intro,
          payoutWalletAddress: state.profile.payoutWalletAddress || null,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as CreatorProfileResponse | {
        error?: string;
      };

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.profileSaved,
        profile: {
          avatarImageUrl: data.profile.avatarImageUrl ?? "",
          displayName: data.profile.displayName,
          heroImageUrl: data.profile.heroImageUrl ?? "",
          intro: data.profile.intro,
          payoutWalletAddress: data.profile.payoutWalletAddress ?? "",
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function createPost(statusToSave: "draft" | "published") {
    if (!postForm.body.trim()) {
      setPostBodyError(postBodyRequiredMessage);
      setState((current) => ({
        ...current,
        error: current.error === SERVER_BODY_REQUIRED_ERROR ? null : current.error,
        notice: null,
      }));
      return;
    }

    try {
      setIsSavingPost(true);
      setPostBodyError(null);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/posts", {
        body: JSON.stringify({
          body: postForm.body,
          contentImageUrls: postForm.contentImageUrls,
          coverImageUrl: postForm.coverImageUrl || null,
          email,
          locale,
          priceType: "free",
          status: statusToSave,
          summary: postForm.summary,
          title: postForm.title,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as ContentPostMutationResponse | {
        error?: string;
      };

      if (!response.ok || !("content" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setPostForm(EMPTY_POST_FORM);
      setState((current) => ({
        ...current,
        error: null,
        notice:
          statusToSave === "published"
            ? contentCopy.messages.publishSuccess
            : contentCopy.messages.saveDraftSuccess,
        posts: [data.content, ...current.posts],
      }));
      setPostBodyError(null);
    } catch (error) {
      if (error instanceof Error && error.message === SERVER_BODY_REQUIRED_ERROR) {
        setPostBodyError(postBodyRequiredMessage);
        setState((current) => ({
          ...current,
          error: null,
          notice: null,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    } finally {
      setIsSavingPost(false);
    }
  }

  async function updatePostStatus(
    post: ContentPostRecord,
    nextStatus: "archived" | "published",
  ) {
    try {
      const email = await resolveMemberEmail();
      const response = await fetch(`/api/content/posts/${post.contentId}`, {
        body: JSON.stringify({
          email,
          status: nextStatus,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = (await response.json()) as ContentPostMutationResponse | {
        error?: string;
      };

      if (!response.ok || !("content" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice:
          nextStatus === "published"
            ? contentCopy.messages.publishSuccess
            : contentCopy.messages.saveDraftSuccess,
        posts: current.posts.map((currentPost) =>
          currentPost.contentId === data.content.contentId
            ? data.content
            : currentPost,
        ),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    }
  }

  async function uploadProfileAvatarImage(file: File) {
    try {
      setIsUploadingProfileAvatar(true);
      const email = await resolveMemberEmail();
      const body = new FormData();
      body.set("email", email);
      body.set("file", file);
      body.set("walletAddress", accountAddress ?? "");

      const response = await fetch("/api/content/profile/upload", {
        body,
        method: "POST",
      });
      const data = (await response.json()) as CreatorProfileUploadResponse | {
        error?: string;
      };

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.uploadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.uploadSuccess,
        profile: {
          ...current.profile,
          avatarImageUrl: data.url,
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
    } finally {
      setIsUploadingProfileAvatar(false);
    }
  }

  async function uploadProfileHeroImage(file: File) {
    try {
      setIsUploadingProfileHeroImage(true);
      const email = await resolveMemberEmail();
      const body = new FormData();
      body.set("email", email);
      body.set("file", file);
      body.set("walletAddress", accountAddress ?? "");

      const response = await fetch("/api/content/profile/upload", {
        body,
        method: "POST",
      });
      const data = (await response.json()) as CreatorProfileUploadResponse | {
        error?: string;
      };

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.uploadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.uploadSuccess,
        profile: {
          ...current.profile,
          heroImageUrl: data.url,
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
    } finally {
      setIsUploadingProfileHeroImage(false);
    }
  }

  async function uploadPostCoverImage(file: File) {
    try {
      setIsUploadingPostImage(true);
      const email = await resolveMemberEmail();
      const body = new FormData();
      body.set("email", email);
      body.set("file", file);
      body.set("walletAddress", accountAddress ?? "");

      const response = await fetch("/api/content/posts/upload", {
        body,
        method: "POST",
      });
      const data = (await response.json()) as ContentPostUploadResponse | {
        error?: string;
      };

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.uploadFailed,
        );
      }

      setPostForm((current) => ({
        ...current,
        coverImageUrl: data.url,
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.uploadSuccess,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
    } finally {
      setIsUploadingPostImage(false);
    }
  }

  async function uploadPostContentImages(files: File[]) {
    try {
      const remainingSlots = Math.max(0, 10 - postForm.contentImageUrls.length);

      if (remainingSlots <= 0) {
        throw new Error(
          locale === "ko"
            ? "콘텐츠 이미지는 최대 10장까지 업로드할 수 있습니다."
            : "You can upload up to 10 content images.",
        );
      }

      const uploadQueue = files.slice(0, remainingSlots);

      if (uploadQueue.length === 0) {
        return;
      }

      setIsUploadingPostImage(true);
      const email = await resolveMemberEmail();
      const uploadedUrls: string[] = [];

      for (const file of uploadQueue) {
        const body = new FormData();
        body.set("email", email);
        body.set("file", file);
        body.set("walletAddress", accountAddress ?? "");

        const response = await fetch("/api/content/posts/upload", {
          body,
          method: "POST",
        });
        const data = (await response.json()) as ContentPostUploadResponse | {
          error?: string;
        };

        if (!response.ok || !("url" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : contentCopy.messages.uploadFailed,
          );
        }

        uploadedUrls.push(data.url);
      }

      setPostForm((current) => ({
        ...current,
        contentImageUrls: [...current.contentImageUrls, ...uploadedUrls].slice(0, 10),
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.uploadSuccess,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
    } finally {
      setIsUploadingPostImage(false);
    }
  }

  function openCoverGenerationDialog() {
    setCoverGenerationProgress(createEmptyCoverGenerationProgress());
    setIsCoverGenerationDialogOpen(true);
  }

  function openAutomationRunDialog() {
    setAutomationProgress(createEmptyAutomationProgress());
    setIsAutomationRunDialogOpen(true);
  }

  function closeAutomationRunDialog() {
    if (isRunningAutomation) {
      return;
    }

    setIsAutomationRunDialogOpen(false);
    setAutomationProgress(createEmptyAutomationProgress());
  }

  function closeCoverGenerationDialog() {
    if (isGeneratingPostImage) {
      return;
    }

    setIsCoverGenerationDialogOpen(false);
    setCoverGenerationProgress(createEmptyCoverGenerationProgress());
  }

  function openContentImageGenerationDialog() {
    setContentImageGenerationProgress(createEmptyCoverGenerationProgress());
    setContentImagePrompt("");
    setIsContentImageGenerationDialogOpen(true);
  }

  function closeContentImageGenerationDialog() {
    if (isGeneratingPostImage) {
      return;
    }

    setIsContentImageGenerationDialogOpen(false);
    setContentImagePrompt("");
    setContentImageGenerationProgress(createEmptyCoverGenerationProgress());
  }

  async function generatePostCoverImage() {
    try {
      setIsGeneratingPostImage(true);
      setCoverGenerationProgress({
        ...createEmptyCoverGenerationProgress(),
        active: true,
        currentStep: "authorizing",
        message: coverGenerationLabels.authorizing.description,
        progress: 4,
        steps: {
          ...createEmptyCoverGenerationProgress().steps,
          authorizing: "active",
        },
      });
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/posts/generate-cover", {
        body: JSON.stringify({
          body: postForm.body,
          email,
          locale,
          summary: postForm.summary,
          title: postForm.title,
          visualBrief: contentImagePrompt,
          walletAddress: accountAddress,
        }),
        headers: {
          Accept: "application/x-ndjson",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      let data: ContentPostGenerateCoverResponse | null = null;
      let streamError: string | null = null;

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error || contentCopy.messages.uploadFailed);
      }

      if (
        response.headers
          .get("content-type")
          ?.includes("application/x-ndjson")
      ) {
        await readCoverGenerationStream(response, (event) => {
          setCoverGenerationProgress((current) =>
            applyCoverGenerationProgressEvent(current, event),
          );

          if (event.type === "result") {
            data = event.response;
            return;
          }

          if (event.type === "error") {
            streamError = event.error;
          }
        });
      } else {
        const payload = (await response.json()) as
          | ContentPostGenerateCoverResponse
          | { error?: string };

        if (!("url" in payload)) {
          throw new Error(payload.error || contentCopy.messages.uploadFailed);
        }

        data = payload;
      }

      if (!data) {
        throw new Error(streamError || contentCopy.messages.uploadFailed);
      }

      const generatedCover = data;

      setPostForm((current) => ({
        ...current,
        coverImageUrl: generatedCover.url,
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.imageGenerated,
      }));
      setCoverGenerationProgress((current) => ({
        ...current,
        active: false,
        currentStep: "finalizing",
        error: null,
        message:
          locale === "ko"
            ? "커버 이미지가 초안에 적용되었습니다."
            : "The cover has been applied to your draft.",
        progress: 100,
        response: generatedCover,
        steps: {
          ...current.steps,
          finalizing: "done",
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
      setCoverGenerationProgress((current) => ({
        ...current,
        active: false,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        message:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
      }));
    } finally {
      setIsGeneratingPostImage(false);
    }
  }

  async function generatePostContentImage() {
    try {
      if (
        postForm.generatedContentImageUrls.length >=
        GENERATED_CONTENT_IMAGE_LIMIT
      ) {
        throw new Error(
          locale === "ko"
            ? `AI로 생성한 콘텐츠 이미지는 최대 ${GENERATED_CONTENT_IMAGE_LIMIT}장까지 추가할 수 있습니다.`
            : `You can generate up to ${GENERATED_CONTENT_IMAGE_LIMIT} AI content images.`,
        );
      }

      if (postForm.contentImageUrls.length >= 10) {
        throw new Error(
          locale === "ko"
            ? "콘텐츠 이미지는 최대 10장까지 업로드할 수 있습니다."
            : "You can upload up to 10 content images.",
        );
      }

      setIsGeneratingPostImage(true);
      setContentImageGenerationProgress({
        ...createEmptyCoverGenerationProgress(),
        active: true,
        currentStep: "authorizing",
        message: contentImageGenerationLabels.authorizing.description,
        progress: 4,
        steps: {
          ...createEmptyCoverGenerationProgress().steps,
          authorizing: "active",
        },
      });
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/posts/generate-content-image", {
        body: JSON.stringify({
          body: postForm.body,
          email,
          locale,
          summary: postForm.summary,
          title: postForm.title,
          visualBrief: contentImagePrompt,
          walletAddress: accountAddress,
        }),
        headers: {
          Accept: "application/x-ndjson",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      let data: ContentPostGenerateCoverResponse | null = null;
      let streamError: string | null = null;

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(payload?.error || contentCopy.messages.uploadFailed);
      }

      if (
        response.headers
          .get("content-type")
          ?.includes("application/x-ndjson")
      ) {
        await readCoverGenerationStream(response, (event) => {
          setContentImageGenerationProgress((current) =>
            applyCoverGenerationProgressEvent(current, event),
          );

          if (event.type === "result") {
            data = event.response;
            return;
          }

          if (event.type === "error") {
            streamError = event.error;
          }
        });
      } else {
        const payload = (await response.json()) as
          | ContentPostGenerateCoverResponse
          | { error?: string };

        if (!("url" in payload)) {
          throw new Error(payload.error || contentCopy.messages.uploadFailed);
        }

        data = payload;
      }

      if (!data) {
        throw new Error(streamError || contentCopy.messages.uploadFailed);
      }

      const generatedImage = data;

      setPostForm((current) => ({
        ...current,
        contentImageUrls: [...current.contentImageUrls, generatedImage.url].slice(0, 10),
        generatedContentImageUrls: [
          ...current.generatedContentImageUrls,
          generatedImage.url,
        ].slice(0, GENERATED_CONTENT_IMAGE_LIMIT),
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice:
          locale === "ko"
            ? "AI 콘텐츠 이미지를 생성해 갤러리에 추가했습니다."
            : "Generated an AI content image and added it to the gallery.",
      }));
      setContentImageGenerationProgress((current) => ({
        ...current,
        active: false,
        currentStep: "finalizing",
        error: null,
        message:
          locale === "ko"
            ? "콘텐츠 이미지 갤러리에 AI 이미지를 추가했습니다."
            : "The AI image has been added to the content gallery.",
        progress: 100,
        response: generatedImage,
        steps: {
          ...current.steps,
          finalizing: "done",
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
      setContentImageGenerationProgress((current) => ({
        ...current,
        active: false,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        message:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
      }));
    } finally {
      setIsGeneratingPostImage(false);
    }
  }

  async function saveAutomation() {
    try {
      setIsSavingAutomation(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/automation/profile", {
        body: JSON.stringify({
          allowedDomains: parseDelimitedValues(automation.form.allowedDomains),
          autoPublish: automation.form.autoPublish,
          enabled: automation.form.enabled,
          maxPostsPerDay: Number(automation.form.maxPostsPerDay),
          memberEmail: email,
          minIntervalMinutes: Number(automation.form.minIntervalMinutes),
          personaName: automation.form.personaName,
          personaPrompt: automation.form.personaPrompt,
          publishScoreThreshold: Number(automation.form.publishScoreThreshold),
          topics: parseDelimitedValues(automation.form.topics),
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as CreatorAutomationProfileResponse | {
        error?: string;
      };

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.automationLoadFailed,
        );
      }

      setAutomation((current) => ({
        ...current,
        available: true,
        error: null,
        form: {
          allowedDomains: stringifyDelimitedValues(data.profile.allowedDomains),
          autoPublish: data.profile.autoPublish,
          enabled: data.profile.enabled,
          maxPostsPerDay: String(data.profile.maxPostsPerDay),
          minIntervalMinutes: String(data.profile.minIntervalMinutes),
          personaName: data.profile.personaName,
          personaPrompt: data.profile.personaPrompt,
          publishScoreThreshold: String(data.profile.publishScoreThreshold),
          topics: stringifyDelimitedValues(data.profile.topics),
        },
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.automationSaved,
      }));
    } catch (error) {
      setAutomation((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.automationLoadFailed,
      }));
      setState((current) => ({
        ...current,
        notice: null,
      }));
    } finally {
      setIsSavingAutomation(false);
    }
  }

  async function runAutomation() {
    try {
      setIsRunningAutomation(true);
      setAutomationCelebration(null);
      setAutomationProgress({
        ...createEmptyAutomationProgress(),
        active: true,
        currentStep: "authorizing",
        progress: 2,
        steps: {
          ...createEmptyAutomationProgress().steps,
          authorizing: "active",
        },
      });
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/automation/run", {
        body: JSON.stringify({
          memberEmail: email,
          mode: "discover_and_draft",
          walletAddress: accountAddress,
        }),
        headers: {
          Accept: "application/x-ndjson",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (response.body && contentType.includes("application/x-ndjson")) {
        await readAutomationRunStream(response, (event) => {
          setAutomationProgress((current) =>
            applyAutomationProgressEvent(current, event),
          );

          if (event.type === "error") {
            setAutomation((current) => ({
              ...current,
              error: event.error,
            }));
            setState((current) => ({
              ...current,
              notice: null,
            }));
            return;
          }

          if (event.type !== "result") {
            return;
          }

          if (event.response.job.status === "failed") {
            setAutomation((current) => ({
              ...current,
              error:
                event.response.job.error ?? contentCopy.messages.automationLoadFailed,
              jobs: upsertAutomationJob(current.jobs, event.response.job),
            }));
            setState((current) => ({
              ...current,
              notice: null,
            }));
            return;
          }

          setAutomation((current) => ({
            ...current,
            error: null,
            jobs: upsertAutomationJob(current.jobs, event.response.job),
          }));
          if (!isAutomationRunDialogOpen) {
            setAutomationCelebration({
              contentId:
                event.response.content?.contentId ??
                event.response.job.outputContentId ??
                null,
              title:
                event.response.content?.title ??
                event.response.job.title ??
                event.response.job.topic ??
                null,
              tone:
                event.response.job.outputStatus === "published"
                  ? "published"
                  : "draft",
            });
          }

          const streamedContent = event.response.content;

          if (streamedContent) {
            setState((current) => ({
              ...current,
              error: null,
              notice: contentCopy.messages.automationRunSuccess,
              posts: upsertContentPost(current.posts, streamedContent),
            }));
            return;
          }

          setState((current) => ({
            ...current,
            error: null,
            notice: contentCopy.messages.automationRunSuccess,
          }));
        });

        return;
      }

      const data = (await response.json()) as ContentAutomationRunResponse | {
        error?: string;
      };

      if (!("job" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.automationLoadFailed,
        );
      }

      setAutomationProgress((current) => ({
        ...current,
        active: false,
        currentStep:
          data.job.status === "failed" ? current.currentStep : "finalizing",
        error: data.job.status === "failed" ? data.job.error : null,
        message: data.job.warning ?? data.job.error ?? current.message,
        progress: data.job.status === "failed" ? current.progress : 100,
        steps:
          data.job.status === "failed"
            ? current.steps
            : {
                ...current.steps,
                finalizing: "done",
              },
      }));

      if (data.job.status === "failed") {
        setAutomation((current) => ({
          ...current,
          error: data.job.error ?? contentCopy.messages.automationLoadFailed,
          jobs: upsertAutomationJob(current.jobs, data.job),
        }));
        setState((current) => ({
          ...current,
          notice: null,
        }));
        return;
      }

      setAutomation((current) => ({
        ...current,
        error: null,
        jobs: upsertAutomationJob(current.jobs, data.job),
      }));
      setAutomationCelebration({
        contentId: data.content?.contentId ?? data.job.outputContentId ?? null,
        title: data.content?.title ?? data.job.title ?? data.job.topic ?? null,
        tone: data.job.outputStatus === "published" ? "published" : "draft",
      });
      const createdContent = data.content;

      if (createdContent) {
        setState((current) => ({
          ...current,
          error: null,
          notice: contentCopy.messages.automationRunSuccess,
          posts: upsertContentPost(current.posts, createdContent),
        }));
      } else {
        setState((current) => ({
          ...current,
          error: null,
          notice: contentCopy.messages.automationRunSuccess,
        }));
      }
    } catch (error) {
      setAutomationProgress((current) => ({
        ...current,
        active: false,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.automationLoadFailed,
        message:
          error instanceof Error
            ? error.message
            : contentCopy.messages.automationLoadFailed,
      }));
      setAutomation((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.automationLoadFailed,
      }));
      setState((current) => ({
        ...current,
        notice: null,
      }));
    } finally {
      setIsRunningAutomation(false);
    }
  }

  function renderBlockedState() {
    if (isDisconnected) {
      return <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>;
    }

    if (state.status === "loading" && !state.member) {
      return <MessageCard>{contentCopy.actions.refresh}...</MessageCard>;
    }

    if (state.error && state.member?.status !== "completed") {
      return (
        <MessageCard tone="error">
          {state.error}
          <span className="mt-3 block">
            <Link
              className="font-semibold text-slate-950 underline"
              href={activateHref}
            >
              {dictionary.referralsPage.actions.completeSignup}
            </Link>
          </span>
        </MessageCard>
      );
    }

    if (state.error && !state.member) {
      return <MessageCard tone="error">{state.error}</MessageCard>;
    }

    return null;
  }

  function renderProfileCard() {
    const blockedState = renderBlockedState();

    return (
      <div className="glass-card rounded-[30px] p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.labels.creatorProfile}
            </h2>
          </div>
        </div>

        {blockedState ? (
          blockedState
        ) : (
          <div className="mt-5 space-y-4">
            {recoverableStudioError ? (
              <MessageCard tone="error">{recoverableStudioError}</MessageCard>
            ) : null}
            <InputField
              hint={contentCopy.hints.displayName}
              label={contentCopy.fields.displayName}
              onChange={(value) => {
                setState((current) => ({
                  ...current,
                  profile: {
                    ...current.profile,
                    displayName: value,
                  },
                }));
              }}
              value={state.profile.displayName}
            />
            <TextAreaField
              hint={contentCopy.hints.intro}
              label={contentCopy.fields.intro}
              onChange={(value) => {
                setState((current) => ({
                  ...current,
                  profile: {
                    ...current.profile,
                    intro: value,
                  },
                }));
              }}
              rows={4}
              value={state.profile.intro}
            />
            <InputField
              hint={contentCopy.hints.payoutWalletAddress}
              label={contentCopy.fields.payoutWalletAddress}
              onChange={(value) => {
                setState((current) => ({
                  ...current,
                  profile: {
                    ...current.profile,
                    payoutWalletAddress: value,
                  },
                }));
              }}
              value={state.profile.payoutWalletAddress}
            />
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-900">
                {contentCopy.fields.avatarImage}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {contentCopy.hints.avatarImage}
              </p>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void uploadProfileAvatarImage(file);
                  }

                  event.target.value = "";
                }}
                ref={profileAvatarInputRef}
                type="file"
              />
              <div className="mt-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                    {state.profile.avatarImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={state.profile.displayName || contentCopy.fields.displayName}
                        className="h-full w-full object-cover"
                        src={state.profile.avatarImageUrl}
                      />
                    ) : (
                      <UserRound className="size-8 text-slate-300" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white bg-slate-950 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]">
                    avatar
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={isUploadingProfileAvatar}
                    onClick={() => {
                      profileAvatarInputRef.current?.click();
                    }}
                    type="button"
                  >
                    <ImagePlus className="size-4" />
                    {isUploadingProfileAvatar
                      ? contentCopy.actions.uploadingImage
                      : contentCopy.actions.uploadImage}
                  </button>
                  {state.profile.avatarImageUrl ? (
                    <button
                      className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                      onClick={() => {
                        setState((current) => ({
                          ...current,
                          notice: null,
                          profile: {
                            ...current.profile,
                            avatarImageUrl: "",
                          },
                        }));
                      }}
                      type="button"
                    >
                      {contentCopy.actions.removeImage}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-900">
                {contentCopy.fields.heroImage}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {contentCopy.hints.heroImage}
              </p>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void uploadProfileHeroImage(file);
                  }

                  event.target.value = "";
                }}
                ref={profileHeroImageInputRef}
                type="file"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isUploadingProfileHeroImage}
                  onClick={() => {
                    profileHeroImageInputRef.current?.click();
                  }}
                  type="button"
                >
                  <ImagePlus className="size-4" />
                  {isUploadingProfileHeroImage
                    ? contentCopy.actions.uploadingImage
                    : contentCopy.actions.uploadImage}
                </button>
                {state.profile.heroImageUrl ? (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    onClick={() => {
                      setState((current) => ({
                        ...current,
                        notice: null,
                        profile: {
                          ...current.profile,
                          heroImageUrl: "",
                        },
                      }));
                    }}
                    type="button"
                  >
                    {contentCopy.actions.removeImage}
                  </button>
                ) : null}
              </div>
              {state.profile.heroImageUrl ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900/90 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  <div
                    className="h-44 w-full bg-cover bg-center sm:h-56"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${state.profile.heroImageUrl})`,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={
                isSavingProfile ||
                isDisconnected ||
                isUploadingProfileAvatar ||
                isUploadingProfileHeroImage
              }
              onClick={() => {
                void saveProfile();
              }}
              type="button"
            >
              {isSavingProfile
                ? `${contentCopy.actions.saveProfile}...`
                : contentCopy.actions.saveProfile}
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderAutomationPanel() {
    const blockedState = renderBlockedState();

    return (
      <div className="glass-card rounded-[30px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{contentCopy.labels.automationBetaOnly}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.labels.automation}
            </h2>
          </div>
          <StatusBadge
            status={automation.form.enabled ? "published" : "draft"}
          />
        </div>

        {blockedState ? (
          blockedState
        ) : !automation.available ? (
          <MessageCard>
            {automation.error || contentCopy.labels.automationRestricted}
          </MessageCard>
        ) : (
          <div className="mt-5 space-y-4">
            {automation.error ? (
              <MessageCard tone="error">{automation.error}</MessageCard>
            ) : null}
            <ToggleField
              checked={automation.form.enabled}
              description={contentCopy.labels.automationEnabled}
              label={contentCopy.labels.automation}
              onChange={(checked) => {
                setAutomation((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    enabled: checked,
                  },
                }));
              }}
            />
            <ToggleField
              checked={automation.form.autoPublish}
              description={contentCopy.labels.automationAutoPublish}
              label={contentCopy.actions.publish}
              onChange={(checked) => {
                setAutomation((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    autoPublish: checked,
                  },
                }));
              }}
            />
            <InputField
              hint={contentCopy.hints.automationPersonaName}
              label={contentCopy.fields.automationPersonaName}
              onChange={(value) => {
                setAutomation((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    personaName: value,
                  },
                }));
              }}
              value={automation.form.personaName}
            />
            <TextAreaField
              hint={contentCopy.hints.automationPersonaPrompt}
              label={contentCopy.fields.automationPersonaPrompt}
              onChange={(value) => {
                setAutomation((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    personaPrompt: value,
                  },
                }));
              }}
              rows={5}
              value={automation.form.personaPrompt}
            />
            <TextAreaField
              hint={contentCopy.hints.automationTopics}
              label={contentCopy.fields.automationTopics}
              onChange={(value) => {
                setAutomation((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    topics: value,
                  },
                }));
              }}
              rows={3}
              value={automation.form.topics}
            />
            <TextAreaField
              hint={contentCopy.hints.automationAllowedDomains}
              label={contentCopy.fields.automationAllowedDomains}
              onChange={(value) => {
                setAutomation((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    allowedDomains: value,
                  },
                }));
              }}
              rows={3}
              value={automation.form.allowedDomains}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                hint={contentCopy.hints.automationMaxPostsPerDay}
                label={contentCopy.fields.automationMaxPostsPerDay}
                onChange={(value) => {
                  setAutomation((current) => ({
                    ...current,
                    form: {
                      ...current.form,
                      maxPostsPerDay: value,
                    },
                  }));
                }}
                value={automation.form.maxPostsPerDay}
              />
              <InputField
                hint={contentCopy.hints.automationMinIntervalMinutes}
                label={contentCopy.fields.automationMinIntervalMinutes}
                onChange={(value) => {
                  setAutomation((current) => ({
                    ...current,
                    form: {
                      ...current.form,
                      minIntervalMinutes: value,
                    },
                  }));
                }}
                value={automation.form.minIntervalMinutes}
              />
              <InputField
                hint={contentCopy.hints.automationPublishScoreThreshold}
                label={contentCopy.fields.automationPublishScoreThreshold}
                onChange={(value) => {
                  setAutomation((current) => ({
                    ...current,
                    form: {
                      ...current.form,
                      publishScoreThreshold: value,
                    },
                  }));
                }}
                value={automation.form.publishScoreThreshold}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={isSavingAutomation || isRunningAutomation}
                onClick={() => {
                  void saveAutomation();
                }}
                type="button"
              >
                {isSavingAutomation
                  ? `${contentCopy.actions.saveAutomation}...`
                  : contentCopy.actions.saveAutomation}
              </button>
              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={isSavingAutomation || isRunningAutomation || !automation.form.enabled}
                onClick={() => {
                  openAutomationRunDialog();
                }}
                type="button"
              >
                <Sparkles className="size-4" />
                {isRunningAutomation
                  ? contentCopy.actions.runningAutomation
                  : contentCopy.actions.runAutomation}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAutomationJobsPanel() {
    if (!automation.available) {
      return null;
    }

    const showAutomationProgress =
      isRunningAutomation ||
      automationProgress.currentStep !== null ||
      automationProgress.error !== null;

    return (
      <div className="glass-card rounded-[30px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{contentCopy.labels.automationBetaOnly}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.labels.automationJobs}
            </h2>
          </div>
        </div>

        {showAutomationProgress ? (
          <div className="relative mt-4 overflow-hidden rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.96))] p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_62%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.12),transparent_65%)]" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm">
                    <Sparkles className="size-3.5" />
                    {automationProgressLabels.title}
                  </div>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {automationProgressLabels.currentStage}
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                    {automationProgress.currentStep
                      ? automationProgressStepMeta[automationProgress.currentStep].label
                      : automationProgress.error
                        ? automationProgressLabels.error
                        : automationProgressLabels.completed}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                    {automationProgress.message ??
                      (currentAutomationStepMeta
                        ? currentAutomationStepMeta.description
                        : contentCopy.actions.runningAutomation)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <StatusBadge
                    status={
                      automationProgress.error
                        ? "failed"
                        : isRunningAutomation
                          ? "running"
                          : "completed"
                    }
                  />
                  <div className="grid grid-cols-2 gap-2 sm:w-[220px]">
                    <div className="rounded-[18px] border border-slate-200/80 bg-white/85 px-3 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {automationProgressLabels.stepCount}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {completedAutomationStepCount}/
                        {contentAutomationRunProgressSteps.length}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200/80 bg-white/85 px-3 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {automationProgressLabels.progress}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {Math.round(automationProgress.progress)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)]">
                <div
                  className={`relative h-3 overflow-hidden rounded-full transition-[width] duration-500 ${
                    automationProgress.error
                      ? "bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300"
                      : "bg-gradient-to-r from-slate-950 via-sky-600 to-cyan-400"
                  }`}
                  style={{ width: `${Math.max(8, automationProgress.progress)}%` }}
                >
                  {!automationProgress.error && isRunningAutomation ? (
                    <div className="absolute inset-y-0 right-0 w-16 animate-pulse rounded-full bg-white/40 blur-md" />
                  ) : null}
                </div>
              </div>

              <div className="relative mt-5 space-y-3 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-slate-200/90 sm:before:left-6">
                {contentAutomationRunProgressSteps.map((step, index) => {
                  const status = automationProgress.steps[step];
                  const meta = automationProgressStepMeta[step];
                  const Icon = meta.icon;
                  const statusLabel =
                    status === "done"
                      ? automationProgressLabels.completed
                      : status === "active"
                        ? automationProgressLabels.running
                        : status === "error"
                          ? automationProgressLabels.error
                          : automationProgressLabels.pending;

                  return (
                    <div className="relative pl-14 sm:pl-16" key={step}>
                      <div
                        className={`absolute left-0 top-2 flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition sm:size-11 ${
                          status === "done"
                            ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                            : status === "active"
                              ? "border-sky-200 bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]"
                              : status === "error"
                                ? "border-rose-200 bg-rose-100 text-rose-700"
                                : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {status === "done" ? (
                          <Check className="size-5" />
                        ) : status === "active" ? (
                          <LoaderCircle className="size-5 animate-spin" />
                        ) : status === "error" ? (
                          <AlertTriangle className="size-5" />
                        ) : (
                          <Icon className="size-5" />
                        )}
                      </div>

                      <div
                        className={`rounded-[22px] border px-4 py-4 shadow-sm transition sm:px-5 ${
                          status === "done"
                            ? "border-emerald-200/80 bg-emerald-50/90"
                            : status === "active"
                              ? "border-slate-950 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                              : status === "error"
                                ? "border-rose-200/80 bg-rose-50/90"
                                : "border-slate-200/80 bg-white/85"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold tracking-tight text-slate-950">
                                {meta.label}
                              </p>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>
                            <p
                              className={`mt-2 text-sm leading-6 ${
                                status === "done"
                                  ? "text-emerald-900/80"
                                  : status === "active"
                                    ? "text-slate-600"
                                    : status === "error"
                                      ? "text-rose-700"
                                      : "text-slate-500"
                              }`}
                            >
                              {meta.description}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              status === "done"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "active"
                                  ? "bg-slate-950 text-white"
                                  : status === "error"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        {status === "active" &&
                        automationProgress.currentStep === step &&
                        automationProgress.message ? (
                          <div className="mt-3 rounded-[16px] border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-xs font-medium leading-5 text-sky-800">
                            {automationProgress.message}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {automation.jobs.length === 0 ? (
          <MessageCard>
            {showAutomationProgress
              ? contentCopy.actions.runningAutomation
              : contentCopy.labels.automationDisabled}
          </MessageCard>
        ) : (
          <div className="mt-4 space-y-3">
            {automation.jobs.slice(0, 6).map((job) => (
              <article
                className="rounded-[22px] border border-white/80 bg-white/90 p-4"
                key={job.jobId}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={job.status} />
                  {job.score !== null ? (
                    <StatusBadge status={`score ${job.score}`} />
                  ) : null}
                </div>
                <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-950">
                  {job.title ?? job.topic ?? job.mode}
                </h3>
                {job.summary ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {job.summary}
                  </p>
                ) : null}
                {job.error ? (
                  <p className="mt-2 text-sm leading-6 text-rose-700">{job.error}</p>
                ) : null}
                {job.warning ? (
                  <p className="mt-2 text-sm leading-6 text-amber-700">
                    {job.warning}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderComposerCard() {
    const blockedState = renderBlockedState();
    const coverUploadLabel =
      locale === "ko" ? "커버 업로드" : "Upload cover";
    const contentImagesUploadLabel =
      locale === "ko" ? "콘텐츠 이미지 추가" : "Add gallery images";
    const aiContentImageLabel =
      locale === "ko" ? "AI 콘텐츠 이미지 생성" : "Generate AI gallery image";

    return (
      <div className="glass-card rounded-[30px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.actions.createPost}
            </h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900">
            {publishedCount} {contentCopy.labels.published}
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {contentCopy.labels.studioNotice}
        </p>

        {blockedState ? (
          blockedState
        ) : (
          <div className="mt-5 space-y-4">
            {recoverableStudioError ? (
              <MessageCard tone="error">{recoverableStudioError}</MessageCard>
            ) : null}
            <InputField
              hint={contentCopy.hints.title}
              label={contentCopy.fields.title}
              onChange={(value) => {
                setPostForm((current) => ({
                  ...current,
                  title: value,
                }));
              }}
              value={postForm.title}
            />
            <TextAreaField
              hint={contentCopy.hints.summary}
              label={contentCopy.fields.summary}
              onChange={(value) => {
                setPostForm((current) => ({
                  ...current,
                  summary: value,
                }));
              }}
              rows={3}
              value={postForm.summary}
            />
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {contentCopy.fields.coverImage}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {contentCopy.hints.coverImage}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {locale === "ko" ? "대표 1장" : "One hero image"}
                </span>
              </div>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void uploadPostCoverImage(file);
                  }

                  event.target.value = "";
                }}
                ref={postImageInputRef}
                type="file"
              />
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);

                  if (files.length > 0) {
                    void uploadPostContentImages(files);
                  }

                  event.target.value = "";
                }}
                ref={postGalleryInputRef}
                type="file"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isUploadingPostImage || isGeneratingPostImage}
                  onClick={() => {
                    postImageInputRef.current?.click();
                  }}
                  type="button"
                >
                  <ImagePlus className="size-4" />
                  {isUploadingPostImage
                    ? contentCopy.actions.uploadingImage
                    : coverUploadLabel}
                </button>
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={
                    isUploadingPostImage ||
                    isGeneratingPostImage ||
                    !canGeneratePostCover
                  }
                  onClick={() => {
                    openCoverGenerationDialog();
                  }}
                  type="button"
                >
                  <Sparkles className="size-4" />
                  {isGeneratingPostImage
                    ? contentCopy.actions.generatingAiCover
                    : contentCopy.actions.generateAiCover}
                </button>
                {postForm.coverImageUrl ? (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    onClick={() => {
                      setPostForm((current) => ({
                        ...current,
                        coverImageUrl: "",
                      }));
                    }}
                    type="button"
                  >
                    {contentCopy.actions.removeImage}
                  </button>
                ) : null}
              </div>
              {postForm.coverImageUrl ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900/90 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  <div
                    className="h-40 w-full bg-cover bg-center sm:h-52"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${postForm.coverImageUrl})`,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {contentCopy.fields.contentImages}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {contentCopy.hints.contentImages}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {postForm.contentImageUrls.length}/10
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    {locale === "ko" ? "AI" : "AI"} {postForm.generatedContentImageUrls.length}/{GENERATED_CONTENT_IMAGE_LIMIT}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isUploadingPostImage || isGeneratingPostImage}
                  onClick={() => {
                    postGalleryInputRef.current?.click();
                  }}
                  type="button"
                >
                  <LayoutGrid className="size-4" />
                  {isUploadingPostImage
                    ? contentCopy.actions.uploadingImage
                    : contentImagesUploadLabel}
                </button>
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={
                    isUploadingPostImage ||
                    isGeneratingPostImage ||
                    !canGeneratePostCover ||
                    postForm.generatedContentImageUrls.length >=
                      GENERATED_CONTENT_IMAGE_LIMIT ||
                    postForm.contentImageUrls.length >= 10
                  }
                  onClick={() => {
                    openContentImageGenerationDialog();
                  }}
                  type="button"
                >
                  <Sparkles className="size-4" />
                  {isGeneratingPostImage &&
                  isContentImageGenerationDialogOpen &&
                  contentImageGenerationProgress.active
                    ? locale === "ko"
                      ? "AI 이미지 생성 중..."
                      : "Generating AI image..."
                    : aiContentImageLabel}
                </button>
              </div>
              {postForm.contentImageUrls.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {postForm.contentImageUrls.map((imageUrl, index) => (
                    <div
                      className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-slate-900/90"
                      key={`${imageUrl}-${index}`}
                    >
                      <div
                        className="aspect-[4/5] w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${imageUrl})`,
                        }}
                      />
                      {postForm.generatedContentImageUrls.includes(imageUrl) ? (
                        <span className="absolute left-2 top-2 inline-flex h-8 items-center justify-center rounded-full bg-amber-100/95 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900 shadow-sm">
                          AI
                        </span>
                      ) : null}
                      <button
                        className="absolute right-2 top-2 inline-flex h-8 items-center justify-center rounded-full bg-white/92 px-3 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                        onClick={() => {
                          setPostForm((current) => ({
                            ...current,
                            contentImageUrls: current.contentImageUrls.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                            generatedContentImageUrls:
                              current.generatedContentImageUrls.filter(
                                (currentUrl) => currentUrl !== imageUrl,
                              ),
                          }));
                        }}
                        type="button"
                      >
                        {contentCopy.actions.removeImage}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm leading-6 text-slate-500">
                  {locale === "ko"
                    ? `상세 페이지에서 좌우로 넘겨볼 콘텐츠 이미지를 추가해보세요. 직접 업로드하거나 AI로 최대 ${GENERATED_CONTENT_IMAGE_LIMIT}장까지 생성할 수 있습니다.`
                    : `Add gallery images for the swipeable detail page. You can upload your own or generate up to ${GENERATED_CONTENT_IMAGE_LIMIT} with AI.`}
                </div>
              )}
            </div>
            <TextAreaField
              error={postBodyError}
              hint={contentCopy.hints.body}
              label={contentCopy.fields.body}
              onChange={(value) => {
                if (postBodyError) {
                  setPostBodyError(null);
                }
                setPostForm((current) => ({
                  ...current,
                  body: value,
                }));
              }}
              rows={7}
              value={postForm.body}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={
                  isSavingPost ||
                  isDisconnected ||
                  isUploadingPostImage ||
                  isGeneratingPostImage
                }
                onClick={() => {
                  void createPost("draft");
                }}
                type="button"
              >
                {contentCopy.actions.saveDraft}
              </button>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={
                  isSavingPost ||
                  isDisconnected ||
                  isUploadingPostImage ||
                  isGeneratingPostImage
                }
                onClick={() => {
                  void createPost("published");
                }}
                type="button"
              >
                {contentCopy.actions.publish}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStudioTabs() {
    const tabs = [
      {
        href: studioHomeHref,
        isActive: view === "hub",
        label: contentCopy.labels.studioHome,
      },
      {
        href: profileHref,
        isActive: view === "profile",
        label: contentCopy.labels.creatorSettings,
      },
      {
        href: newPostHref,
        isActive: view === "new",
        label: contentCopy.actions.createPost,
      },
      {
        href: postsManagerHref,
        isActive: false,
        label: contentCopy.actions.managePosts,
      },
    ];

    return (
      <nav className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1">
        {tabs.map((tab) => (
          <Link
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
              tab.isActive
                ? "border border-slate-950 bg-slate-950 !text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)] [text-shadow:0_1px_12px_rgba(255,255,255,0.12)]"
                : "border border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
            }`}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    );
  }

  function renderWorkspaceOverviewCard() {
    const workspaceMessage = isDisconnected
      ? contentCopy.messages.connectRequired
      : state.status === "loading"
        ? contentCopy.messages.detailLoadingDescription
        : state.error && state.member?.status !== "completed"
          ? state.error
          : contentCopy.page.studioDescription;

    return (
      <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.page.studioTitle}
            </h2>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <LayoutGrid className="size-5" />
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">{workspaceMessage}</p>

        {state.error && state.member?.status !== "completed" ? (
          <div className="mt-3">
            <Link
              className="inline-flex text-sm font-semibold text-slate-950 underline"
              href={activateHref}
            >
              {dictionary.referralsPage.actions.completeSignup}
            </Link>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <WorkspaceMetric
            label={contentCopy.labels.posts}
            value={String(state.summary.all)}
          />
          <WorkspaceMetric
            label={contentCopy.labels.published}
            value={String(publishedCount)}
          />
          <WorkspaceMetric
            label={contentCopy.labels.draft}
            value={String(draftCount)}
          />
          <WorkspaceMetric
            label={contentCopy.labels.author}
            value={state.profile.displayName || "-"}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={contentCopy.labels.studioHome} />
          <StatusBadge status={`${state.summary.all} ${contentCopy.labels.posts}`} />
        </div>
      </div>
    );
  }

  function renderHubActionCards(options?: {
    mobile?: boolean;
  }) {
    const mobile = options?.mobile ?? false;

    return (
      <section className="space-y-3">
        <div>
          <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {contentCopy.labels.quickActions}
          </h2>
        </div>
        <div className={mobile ? "grid gap-3" : "grid gap-4 md:grid-cols-2"}>
          <WorkspaceLaunchCard
            description={contentCopy.page.profileDescription}
            disabled={!canUseWorkspace}
            href={profileHref}
            icon={<UserRound className="size-5" />}
            title={contentCopy.labels.creatorSettings}
          />
          <WorkspaceLaunchCard
            description={contentCopy.page.newDescription}
            disabled={!canUseWorkspace}
            href={newPostHref}
            icon={<PenSquare className="size-5" />}
            title={contentCopy.actions.createPost}
          />
          <WorkspaceLaunchCard
            description={contentCopy.page.postsDescription}
            disabled={!canUseWorkspace}
            href={postsManagerHref}
            icon={<LayoutGrid className="size-5" />}
            title={contentCopy.actions.managePosts}
          />
        </div>
      </section>
    );
  }

  function renderRecentPostsPanel(options?: {
    compact?: boolean;
  }) {
    const compact = options?.compact ?? false;
    const posts = sortedPosts.slice(
      0,
      compact ? HUB_COMPACT_POST_PAGE_SIZE : HUB_FULL_POST_PAGE_SIZE,
    );

    return (
      <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.labels.recentPosts}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canUseWorkspace ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                href={postsManagerHref}
              >
                {contentCopy.actions.managePosts}
              </Link>
            ) : null}
            {state.notice ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                <Check className="size-4" />
                <span className="max-w-[11rem] truncate sm:max-w-none">
                  {state.notice}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {isDisconnected ? (
          <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
        ) : state.status === "loading" ? (
          <StudioLoadingCard />
        ) : state.error && state.posts.length === 0 ? (
          <MessageCard tone="error">{state.error}</MessageCard>
        ) : posts.length === 0 ? (
          <MessageCard>{contentCopy.labels.feedEmpty}</MessageCard>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => (
              <article
                className="rounded-[24px] border border-white/80 bg-white/90 p-4"
                key={post.contentId}
              >
                {resolveStudioPostPreviewImage(post) ? (
                  <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-900/90">
                    <div
                      className="h-36 w-full bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${resolveStudioPostPreviewImage(post)})`,
                      }}
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={post.status} />
                  <StatusBadge status={post.priceType} />
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {post.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    href={setPathSearchParams(
                      buildPathWithReferral(
                        `/${locale}/content/${post.contentId}`,
                        referralCode,
                      ),
                      {
                        returnTo: currentStudioHref,
                      },
                    )}
                  >
                    {contentCopy.actions.viewDetail}
                  </Link>
                  {!compact && post.status !== "published" ? (
                    <button
                      className="inline-flex h-10 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
                      onClick={() => {
                        void updatePostStatus(post, "published");
                      }}
                      type="button"
                    >
                      {contentCopy.actions.publish}
                    </button>
                  ) : null}
                  {!compact && post.status !== "archived" ? (
                  <button
                    className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    onClick={() => {
                      void updatePostStatus(post, "archived");
                    }}
                    type="button"
                  >
                    {contentCopy.labels.archived}
                  </button>
                ) : null}
                </div>
              </article>
            ))}

            {!compact && state.summary.all > HUB_FULL_POST_PAGE_SIZE ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                  href={postsManagerHref}
                >
                  {contentCopy.actions.managePosts}
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  function renderMobileHub() {
    return (
      <section className="grid gap-5 lg:hidden">
        {renderRecentPostsPanel({ compact: true })}
        {renderHubActionCards({ mobile: true })}
      </section>
    );
  }

  function renderSideRail(targetView: "new" | "profile") {
    const href = targetView === "profile" ? profileHref : newPostHref;
    const title =
      targetView === "profile"
        ? contentCopy.labels.creatorSettings
        : contentCopy.actions.createPost;
    const description =
      targetView === "profile"
        ? contentCopy.page.profileDescription
        : contentCopy.page.newDescription;
    const icon =
      targetView === "profile" ? (
        <UserRound className="size-5" />
      ) : (
        <PenSquare className="size-5" />
      );

    return (
      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="glass-card rounded-[28px] p-5">
          <div>
            <p className="eyebrow">{contentCopy.labels.quickActions}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.labels.quickActions}
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            <WorkspaceSupportLink
              description={description}
              disabled={!canUseWorkspace}
              href={href}
              icon={icon}
              title={title}
            />
            <WorkspaceSupportLink
              description={contentCopy.page.postsDescription}
              disabled={!canUseWorkspace}
              href={postsManagerHref}
              icon={<LayoutGrid className="size-5" />}
              title={contentCopy.actions.managePosts}
            />
          </div>
        </div>
        {renderRecentPostsPanel({ compact: true })}
      </div>
    );
  }

  const celebrationDetailHref = automationCelebration?.contentId
    ? setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/content/${automationCelebration.contentId}`,
          referralCode,
        ),
        { returnTo: profileHref },
      )
    : null;

  return (
    <>
      <main
        className={`mx-auto flex min-h-screen w-full flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 ${
          view === "hub" ? "max-w-6xl" : "max-w-5xl"
        }`}
      >
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <header className="sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 relative overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.58),transparent_34%),radial-gradient(circle_at_right,rgba(254,240,138,0.26),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.91))] px-4 py-4 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:px-6 sm:py-5 lg:static lg:bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.72),transparent_34%),radial-gradient(circle_at_right,rgba(254,240,138,0.34),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] lg:shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.6),transparent)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/92 text-slate-800 shadow-[0_14px_28px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white sm:size-12"
                href={backHref}
              >
                <ArrowLeft className="size-4 sm:size-5" />
              </Link>
              <div className="min-w-0">
                <p className="eyebrow hidden sm:block">{contentCopy.page.studioEyebrow}</p>
                <h1 className="text-[1.12rem] font-semibold tracking-tight text-slate-950 sm:text-[1.45rem]">
                  {pageTitle}
                </h1>
                <p className="mt-1 max-w-2xl text-[0.92rem] leading-6 text-slate-600 sm:text-sm">
                  {isDisconnected
                    ? contentCopy.messages.connectRequired
                    : state.status === "loading"
                      ? contentCopy.messages.detailLoadingDescription
                      : pageDescription}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {headerShortcutHref && headerShortcutLabel ? (
                <Link
                  className="hidden h-11 items-center justify-center rounded-full border border-white/80 bg-white/92 px-4 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white sm:inline-flex"
                  href={headerShortcutHref}
                >
                  {headerShortcutLabel}
                </Link>
              ) : null}
              <button
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/92 px-4 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
                onClick={() => {
                  void loadStudio();
                }}
                type="button"
              >
                <RefreshCcw className="size-4" />
                <span className="hidden sm:inline">{contentCopy.actions.refresh}</span>
              </button>
            </div>
          </div>

          {view === "hub" ? (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <HeaderStatChip
                label={contentCopy.labels.posts}
                value={String(state.summary.all)}
              />
              <HeaderStatChip
                label={contentCopy.labels.published}
                value={String(publishedCount)}
              />
              <HeaderStatChip
                label={contentCopy.labels.draft}
                value={String(draftCount)}
              />
              <HeaderStatChip
                label={contentCopy.labels.author}
                value={state.profile.displayName || "-"}
              />
            </div>
          ) : null}
        </div>
      </header>

      {renderStudioTabs()}

      {view === "hub" ? (
        <>
          {renderMobileHub()}
          <section className="hidden gap-5 lg:grid lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-5">
              {renderWorkspaceOverviewCard()}
              {renderHubActionCards()}
            </div>
            {renderRecentPostsPanel({ compact: true })}
          </section>
        </>
      ) : view === "profile" ? (
        <section className="mx-auto w-full max-w-6xl">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
              {renderProfileCard()}
            </div>
            <div className="space-y-5">
              {renderAutomationPanel()}
              {renderAutomationJobsPanel()}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          {renderComposerCard()}
          {renderSideRail("profile")}
        </section>
      )}
      </main>

      {automationCelebration ? (
        <AutomationCelebrationOverlay
          contentHref={celebrationDetailHref}
          locale={locale}
          onClose={() => {
            setAutomationCelebration(null);
          }}
          title={automationCelebration.title}
          tone={automationCelebration.tone}
        />
      ) : null}
      {isAutomationRunDialogOpen ? (
        <AutomationRunDialog
          canClose={!isRunningAutomation}
          labels={automationRunDialogLabels}
          onClose={closeAutomationRunDialog}
          onConfirm={() => {
            void runAutomation();
          }}
          personaName={automation.form.personaName}
          progress={automationProgress}
          publishModeLabel={
            automation.form.autoPublish
              ? automationRunDialogLabels.publishModeAuto
              : automationRunDialogLabels.publishModeDraft
          }
          stepCount={completedAutomationStepCount}
          stepMeta={automationProgressStepMeta}
          stepOrder={contentAutomationRunProgressSteps}
          topics={automation.form.topics}
        />
      ) : null}
      {isCoverGenerationDialogOpen ? (
        <CoverGenerationDialog
          canClose={!isGeneratingPostImage}
          labels={coverGenerationLabels}
          onClose={closeCoverGenerationDialog}
          onConfirm={() => {
            void generatePostCoverImage();
          }}
          progress={coverGenerationProgress}
          stepMeta={coverGenerationStepMeta}
          stepOrder={contentCoverGenerationProgressSteps}
          stepCount={completedCoverGenerationStepCount}
          summary={postForm.summary}
          title={postForm.title}
        />
      ) : null}
      {isContentImageGenerationDialogOpen ? (
        <CoverGenerationDialog
          canClose={!isGeneratingPostImage}
          labels={contentImageGenerationLabels}
          onClose={closeContentImageGenerationDialog}
          onConfirm={() => {
            void generatePostContentImage();
          }}
          promptHint={contentImageGenerationLabels.promptHint}
          promptLabel={contentImageGenerationLabels.promptLabel}
          promptPlaceholder={contentImageGenerationLabels.promptPlaceholder}
          promptValue={contentImagePrompt}
          progress={contentImageGenerationProgress}
          stepCount={completedContentImageGenerationStepCount}
          stepMeta={coverGenerationStepMeta}
          stepOrder={contentCoverGenerationProgressSteps}
          summary={postForm.summary}
          title={postForm.title}
          onPromptValueChange={setContentImagePrompt}
        />
      ) : null}
    </>
  );
}

function InputField({
  hint,
  label,
  onChange,
  value,
}: {
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <input
        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        value={value}
      />
      {hint ? (
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({
  error,
  hint,
  label,
  onChange,
  rows,
  value,
}: {
  error?: string | null;
  hint: string;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <textarea
        className={cn(
          "mt-2 w-full rounded-[18px] border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition",
          error
            ? "border-rose-300 bg-rose-50/40 focus:border-rose-400"
            : "border-slate-200 focus:border-slate-400",
        )}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        rows={rows}
        value={value}
      />
      {error ? (
        <span className="mt-2 block text-xs font-medium leading-5 text-rose-600">
          {error}
        </span>
      ) : null}
      <span className="mt-2 block text-xs leading-5 text-slate-500">{hint}</span>
    </label>
  );
}

function WorkspaceMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function HeaderStatChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/80 bg-white/88 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:min-w-[128px] sm:px-4">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[18px] border border-slate-200 bg-white px-4 py-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <input
        checked={checked}
        className="mt-1 size-4 rounded border-slate-300 text-slate-950"
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        type="checkbox"
      />
    </label>
  );
}

function WorkspaceLaunchCard({
  compact = false,
  description,
  disabled = false,
  href,
  icon,
  title,
}: {
  compact?: boolean;
  description: string;
  disabled?: boolean;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  const body = (
    <div
      className={
        "rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition " +
        (disabled
          ? "cursor-not-allowed opacity-70"
          : "hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]")
      }
    >
      <div
        className={
          compact
            ? "flex items-start justify-between gap-4"
            : "flex min-h-[190px] flex-col justify-between"
        }
      >
        <div className={compact ? "flex min-w-0 items-start gap-4" : undefined}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            {icon}
          </div>
          <div className={compact ? "min-w-0 pt-1" : "mt-5"}>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        </div>
        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950">
          <ArrowRight className="size-4" />
        </div>
      </div>
    </div>
  );

  if (disabled) {
    return <div>{body}</div>;
  }

  return (
    <Link className="block h-full" href={href}>
      {body}
    </Link>
  );
}

function WorkspaceSupportLink({
  description,
  disabled = false,
  href,
  icon,
  title,
}: {
  description: string;
  disabled?: boolean;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  const body = (
    <div
      className={
        "rounded-[24px] border border-white/80 bg-white/90 p-4 transition " +
        (disabled
          ? "cursor-not-allowed opacity-70"
          : "hover:border-slate-200 hover:bg-white")
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            {icon}
          </div>
          <div className="min-w-0 pt-1">
            <h3 className="text-base font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950">
          <ArrowRight className="size-4" />
        </div>
      </div>
    </div>
  );

  if (disabled) {
    return <div>{body}</div>;
  }

  return (
    <Link className="block" href={href}>
      {body}
    </Link>
  );
}

function CoverGenerationDialog({
  canClose,
  labels,
  onClose,
  onConfirm,
  onPromptValueChange,
  progress,
  promptHint,
  promptLabel,
  promptPlaceholder,
  promptValue,
  stepCount,
  stepMeta,
  stepOrder,
  summary,
  title,
}: {
  canClose: boolean;
  labels: {
    authorizing: { description: string; label: string };
    completed: string;
    confirmBody: string;
    confirmHint: string;
    confirmPrimary: string;
    confirmSecondary: string;
    error: string;
    finalizing: { description: string; label: string };
    generating_image: { description: string; label: string };
    preparing_prompt: { description: string; label: string };
    progress: string;
    running: string;
    successPrimary: string;
    successSecondary: string;
    successTitle: string;
    title: string;
    uploading_cover: { description: string; label: string };
  };
  onClose: () => void;
  onConfirm: () => void;
  onPromptValueChange?: ((value: string) => void) | undefined;
  progress: CoverGenerationProgressState;
  promptHint?: string | undefined;
  promptLabel?: string | undefined;
  promptPlaceholder?: string | undefined;
  promptValue?: string | undefined;
  stepCount: number;
  stepMeta: Record<
    ContentCoverGenerationProgressStep,
    {
      description: string;
      icon: typeof UserRound;
      label: string;
    }
  >;
  stepOrder: readonly ContentCoverGenerationProgressStep[];
  summary: string;
  title: string;
}) {
  const isSuccess = Boolean(progress.response) && !progress.error;
  const isRunning = progress.active;
  const showProgress =
    isRunning || progress.currentStep !== null || progress.error !== null;
  const currentStepMeta = progress.currentStep ? stepMeta[progress.currentStep] : null;
  const shouldShowConfirm = !showProgress && !isSuccess;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/48 p-3 backdrop-blur-md sm:items-center sm:p-6">
      <div className="relative flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.97))] shadow-[0_34px_90px_rgba(15,23,42,0.26)] sm:max-h-[calc(100svh-3rem)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_54%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_46%)]" />
        <div className="relative overflow-y-auto overscroll-y-contain p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 shadow-sm">
                <Sparkles className="size-3.5" />
                {labels.title}
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                {isSuccess ? labels.successTitle : labels.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isSuccess
                  ? progress.message ?? labels.confirmHint
                  : shouldShowConfirm
                    ? labels.confirmBody
                    : progress.error
                      ? progress.message ?? labels.error
                      : currentStepMeta?.description ?? labels.confirmHint}
              </p>
            </div>
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/92 text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canClose}
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="size-4" />
            </button>
          </div>

          {shouldShowConfirm ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-slate-200/90 bg-white/92 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {labels.preparing_prompt.label}
                </p>
                <p className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight text-slate-950">
                  {title.trim() || summary.trim() || labels.title}
                </p>
                {summary.trim() ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {summary.trim()}
                  </p>
                ) : null}
              </div>
              {onPromptValueChange ? (
                <div className="rounded-[24px] border border-slate-200/90 bg-white/92 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {promptLabel ?? labels.preparing_prompt.label}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {(promptValue ?? "").trim().length}/320
                    </p>
                  </div>
                  <textarea
                    className="mt-3 min-h-28 w-full rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                    maxLength={320}
                    onChange={(event) => {
                      onPromptValueChange(event.target.value);
                    }}
                    placeholder={promptPlaceholder}
                    rows={4}
                    value={promptValue ?? ""}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {promptHint ?? labels.confirmHint}
                  </p>
                </div>
              ) : null}
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/90 p-4 text-sm leading-6 text-slate-600">
                {labels.confirmHint}
              </div>
              <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                <button
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={onClose}
                  type="button"
                >
                  {labels.confirmSecondary}
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#06b6d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:translate-y-[-1px]"
                  onClick={onConfirm}
                  type="button"
                >
                  <WandSparkles className="mr-2 size-4" />
                  {labels.confirmPrimary}
                </button>
              </div>
            </div>
          ) : null}

          {!shouldShowConfirm ? (
            <div className="mt-5">
              {isSuccess && progress.response?.url ? (
                <div className="overflow-hidden rounded-[26px] border border-slate-200/90 bg-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={isSuccess ? labels.successTitle : labels.title}
                    className="block h-64 w-full object-contain sm:h-[min(68vh,560px)]"
                    src={progress.response.url}
                  />
                </div>
              ) : (
                <div className="rounded-[26px] border border-slate-200/90 bg-white/92 p-4 shadow-sm">
                  <div className="grid grid-cols-[auto_auto] justify-between gap-3">
                    <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {labels.progress}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {Math.round(progress.progress)}%
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {labels.completed}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {stepCount}/{stepOrder.length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-full border border-slate-200/90 bg-slate-100/90 p-1">
                    <div
                      className={`relative h-3 overflow-hidden rounded-full transition-[width] duration-500 ${
                        progress.error
                          ? "bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300"
                          : "bg-gradient-to-r from-slate-950 via-sky-600 to-cyan-400"
                      }`}
                      style={{ width: `${Math.max(8, progress.progress)}%` }}
                    >
                      {isRunning ? (
                        <div className="absolute inset-y-0 right-0 w-16 animate-pulse rounded-full bg-white/40 blur-md" />
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {stepOrder.map((step) => {
                  const status = progress.steps[step];
                  const meta = stepMeta[step];
                  const Icon = meta.icon;
                  const badgeStatus =
                    status === "done"
                      ? "completed"
                      : status === "active"
                        ? "running"
                        : status === "error"
                          ? "failed"
                          : null;

                  return (
                    <div
                      className={`rounded-[22px] border px-4 py-4 shadow-sm transition ${
                        status === "done"
                          ? "border-emerald-200/80 bg-emerald-50/90"
                          : status === "active"
                            ? "border-slate-950 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                            : status === "error"
                              ? "border-rose-200/80 bg-rose-50/90"
                              : "border-slate-200/80 bg-white/85"
                      }`}
                      key={step}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border ${
                            status === "done"
                              ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                              : status === "active"
                                ? "border-sky-200 bg-slate-950 text-white"
                                : status === "error"
                                  ? "border-rose-200 bg-rose-100 text-rose-700"
                                  : "border-slate-200 bg-white text-slate-400"
                          }`}
                        >
                          {status === "done" ? (
                            <Check className="size-5" />
                          ) : status === "active" ? (
                            <LoaderCircle className="size-5 animate-spin" />
                          ) : status === "error" ? (
                            <AlertTriangle className="size-5" />
                          ) : (
                            <Icon className="size-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-950">
                              {meta.label}
                            </p>
                            {badgeStatus ? <StatusBadge status={badgeStatus} /> : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {progress.currentStep === step && progress.error
                              ? progress.message
                              : meta.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {isSuccess ? (
                  <>
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#06b6d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:translate-y-[-1px]"
                      onClick={onClose}
                      type="button"
                    >
                      {labels.successPrimary}
                    </button>
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={onClose}
                      type="button"
                    >
                      {labels.successSecondary}
                    </button>
                  </>
                ) : progress.error ? (
                  <>
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#06b6d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:translate-y-[-1px]"
                      onClick={onConfirm}
                      type="button"
                    >
                      {labels.confirmPrimary}
                    </button>
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={onClose}
                      type="button"
                    >
                      {labels.confirmSecondary}
                    </button>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <button
                      className="inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-400"
                      disabled
                      type="button"
                    >
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      {labels.running}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AutomationRunDialog({
  canClose,
  labels,
  onClose,
  onConfirm,
  personaName,
  progress,
  publishModeLabel,
  stepCount,
  stepMeta,
  stepOrder,
  topics,
}: {
  canClose: boolean;
  labels: {
    close: string;
    completed: string;
    confirmBody: string;
    confirmHint: string;
    confirmPrimary: string;
    confirmSecondary: string;
    error: string;
    persona: string;
    progress: string;
    publishMode: string;
    running: string;
    stepCount: string;
    successSecondary: string;
    successTitle: string;
    title: string;
    topics: string;
  };
  onClose: () => void;
  onConfirm: () => void;
  personaName: string;
  progress: AutomationProgressState;
  publishModeLabel: string;
  stepCount: number;
  stepMeta: Record<
    ContentAutomationRunProgressStep,
    {
      description: string;
      icon: typeof UserRound;
      label: string;
    }
  >;
  stepOrder: readonly ContentAutomationRunProgressStep[];
  topics: string;
}) {
  const isRunning = progress.active;
  const isSuccess =
    !progress.active &&
    !progress.error &&
    progress.progress >= 100 &&
    progress.steps.finalizing === "done";
  const showProgress =
    isRunning || progress.currentStep !== null || progress.error !== null;
  const shouldShowConfirm = !showProgress && !isSuccess;
  const currentStepMeta = progress.currentStep ? stepMeta[progress.currentStep] : null;
  const topicSummary =
    topics.trim() ||
    (labels.topics === "주제"
      ? "AI, 생산성, 네트워크 콘텐츠"
      : "AI, productivity, network content");

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/48 p-3 backdrop-blur-md sm:items-center sm:p-6">
      <div className="relative flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.97))] shadow-[0_34px_90px_rgba(15,23,42,0.26)] sm:max-h-[calc(100svh-3rem)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_54%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_46%)]" />
        <div className="relative overflow-y-auto overscroll-y-contain p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 shadow-sm">
                <Sparkles className="size-3.5" />
                {labels.title}
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                {isSuccess ? labels.successTitle : labels.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isSuccess
                  ? progress.message ?? labels.confirmHint
                  : shouldShowConfirm
                    ? labels.confirmBody
                    : progress.error
                      ? progress.message ?? labels.error
                      : progress.message ??
                        currentStepMeta?.description ??
                        labels.confirmHint}
              </p>
            </div>
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/92 text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canClose}
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="size-4" />
            </button>
          </div>

          {shouldShowConfirm ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200/90 bg-white/92 p-4 shadow-sm sm:col-span-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {labels.persona}
                  </p>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                    {personaName.trim() || labels.title}
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200/90 bg-white/92 p-4 shadow-sm sm:col-span-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {labels.publishMode}
                  </p>
                  <p className="mt-3 text-base font-semibold tracking-tight text-slate-950">
                    {publishModeLabel}
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200/90 bg-white/92 p-4 shadow-sm sm:col-span-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {labels.topics}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-[15px]">
                    {topicSummary}
                  </p>
                </div>
              </div>
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/90 p-4 text-sm leading-6 text-slate-600">
                {labels.confirmHint}
              </div>
              <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                <button
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={onClose}
                  type="button"
                >
                  {labels.confirmSecondary}
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#06b6d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:translate-y-[-1px]"
                  onClick={onConfirm}
                  type="button"
                >
                  <WandSparkles className="mr-2 size-4" />
                  {labels.confirmPrimary}
                </button>
              </div>
            </div>
          ) : null}

          {!shouldShowConfirm ? (
            <div className="mt-5">
              <div className="rounded-[26px] border border-slate-200/90 bg-white/92 p-4 shadow-sm">
                <div className="grid grid-cols-[auto_auto] justify-between gap-3">
                  <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {labels.progress}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {Math.round(progress.progress)}%
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {labels.stepCount}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {stepCount}/{stepOrder.length}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-full border border-slate-200/90 bg-slate-100/90 p-1">
                  <div
                    className={`relative h-3 overflow-hidden rounded-full transition-[width] duration-500 ${
                      progress.error
                        ? "bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300"
                        : "bg-gradient-to-r from-slate-950 via-sky-600 to-cyan-400"
                    }`}
                    style={{ width: `${Math.max(8, progress.progress)}%` }}
                  >
                    {isRunning ? (
                      <div className="absolute inset-y-0 right-0 w-16 animate-pulse rounded-full bg-white/40 blur-md" />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {stepOrder.map((step) => {
                  const status = progress.steps[step];
                  const meta = stepMeta[step];
                  const Icon = meta.icon;
                  const badgeStatus =
                    status === "done"
                      ? "completed"
                      : status === "active"
                        ? "running"
                        : status === "error"
                          ? "failed"
                          : null;

                  return (
                    <div
                      className={`rounded-[22px] border px-4 py-4 shadow-sm transition ${
                        status === "done"
                          ? "border-emerald-200/80 bg-emerald-50/90"
                          : status === "active"
                            ? "border-slate-950 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                            : status === "error"
                              ? "border-rose-200/80 bg-rose-50/90"
                              : "border-slate-200/80 bg-white/85"
                      }`}
                      key={step}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border ${
                            status === "done"
                              ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                              : status === "active"
                                ? "border-sky-200 bg-slate-950 text-white"
                                : status === "error"
                                  ? "border-rose-200 bg-rose-100 text-rose-700"
                                  : "border-slate-200 bg-white text-slate-400"
                          }`}
                        >
                          {status === "done" ? (
                            <Check className="size-5" />
                          ) : status === "active" ? (
                            <LoaderCircle className="size-5 animate-spin" />
                          ) : status === "error" ? (
                            <AlertTriangle className="size-5" />
                          ) : (
                            <Icon className="size-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-950">
                              {meta.label}
                            </p>
                            {badgeStatus ? <StatusBadge status={badgeStatus} /> : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {progress.currentStep === step && progress.message
                              ? progress.message
                              : meta.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {isSuccess ? (
                  <div className="sm:col-span-2">
                    <button
                      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#06b6d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:translate-y-[-1px]"
                      onClick={onClose}
                      type="button"
                    >
                      {labels.successSecondary}
                    </button>
                  </div>
                ) : progress.error ? (
                  <>
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_50%,#06b6d4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:translate-y-[-1px]"
                      onClick={onConfirm}
                      type="button"
                    >
                      {labels.confirmPrimary}
                    </button>
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={onClose}
                      type="button"
                    >
                      {labels.close}
                    </button>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <button
                      className="inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-400"
                      disabled
                      type="button"
                    >
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      {labels.running}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AutomationCelebrationOverlay({
  contentHref,
  locale,
  onClose,
  title,
  tone,
}: {
  contentHref: string | null;
  locale: Locale;
  onClose: () => void;
  title: string | null;
  tone: "draft" | "published";
}) {
  const copy =
    locale === "ko"
      ? {
          body:
            tone === "published"
              ? "자동화가 새 콘텐츠를 게시했고, 지금 바로 상세 화면에서 확인할 수 있습니다."
              : "자동화가 새 초안을 저장했습니다. 바로 열어 보고 다듬을 수 있습니다.",
          close: "닫기",
          eyebrow: tone === "published" ? "게시 완료" : "초안 생성 완료",
          primary: tone === "published" ? "게시된 콘텐츠 보기" : "초안 보기",
          secondary: "계속 설정하기",
          title:
            tone === "published"
              ? "콘텐츠 게시가 완료됐습니다"
              : "새 초안이 생성됐습니다",
        }
      : {
          body:
            tone === "published"
              ? "Automation published a new piece of content. You can open it right away."
              : "Automation saved a fresh draft. Open it now and refine it further.",
          close: "Close",
          eyebrow: tone === "published" ? "Published" : "Draft ready",
          primary: tone === "published" ? "Open published content" : "Open draft",
          secondary: "Keep editing",
          title:
            tone === "published"
              ? "Your content is now live"
              : "Your new draft is ready",
        };

  const confetti = [
    { color: "bg-sky-300", delay: "0ms", left: "8%", top: "16%", rotate: "-12deg" },
    { color: "bg-emerald-300", delay: "120ms", left: "18%", top: "10%", rotate: "18deg" },
    { color: "bg-amber-300", delay: "240ms", left: "80%", top: "14%", rotate: "-20deg" },
    { color: "bg-rose-300", delay: "180ms", left: "88%", top: "26%", rotate: "12deg" },
    { color: "bg-cyan-300", delay: "320ms", left: "12%", top: "78%", rotate: "10deg" },
    { color: "bg-violet-300", delay: "90ms", left: "84%", top: "76%", rotate: "-18deg" },
    { color: "bg-lime-300", delay: "210ms", left: "74%", top: "86%", rotate: "14deg" },
    { color: "bg-orange-300", delay: "260ms", left: "24%", top: "84%", rotate: "-14deg" },
  ];

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/38 backdrop-blur-[6px] motion-safe:animate-in motion-safe:fade-in-0"
        onClick={onClose}
      />
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
            tone === "published"
              ? "bg-[radial-gradient(circle,rgba(250,204,21,0.30),transparent_62%)]"
              : "bg-[radial-gradient(circle,rgba(34,211,238,0.24),transparent_62%)]"
          } motion-safe:animate-pulse`}
        />
        {confetti.map((piece, index) => (
          <span
            className={`absolute block h-8 w-2 rounded-full ${piece.color} opacity-80 shadow-[0_10px_30px_rgba(15,23,42,0.14)] motion-safe:animate-bounce motion-reduce:animate-none`}
            key={`${piece.left}-${piece.top}-${index}`}
            style={{
              animationDelay: piece.delay,
              animationDuration: "1.4s",
              left: piece.left,
              rotate: piece.rotate,
              top: piece.top,
            }}
          />
        ))}
      </div>

      <div className="relative z-[1] flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="relative w-full max-w-xl overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-6 shadow-[0_38px_120px_rgba(15,23,42,0.24)] sm:p-8">
          <div
            className={`pointer-events-none absolute inset-x-10 top-0 h-40 blur-3xl ${
              tone === "published"
                ? "bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.26),transparent_70%)]"
                : "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_70%)]"
            }`}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div
                className={`flex size-16 shrink-0 items-center justify-center rounded-[24px] text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] ${
                  tone === "published"
                    ? "bg-[linear-gradient(135deg,#f59e0b,#facc15)]"
                    : "bg-[linear-gradient(135deg,#0f172a,#06b6d4)]"
                }`}
              >
                <Sparkles className="size-7 motion-safe:animate-pulse" />
              </div>
              <button
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                onClick={onClose}
                type="button"
              >
                <ArrowRight className="size-4 rotate-45" />
              </button>
            </div>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
              {copy.body}
            </p>

            {title ? (
              <div className="mt-5 rounded-[24px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {locale === "ko" ? "생성된 콘텐츠" : "Generated content"}
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                  {title}
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {contentHref ? (
                <Link
                  className={`inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px] ${
                    tone === "published"
                      ? "bg-[linear-gradient(135deg,#f59e0b,#facc15)]"
                      : "bg-[linear-gradient(135deg,#0f172a,#06b6d4)]"
                  }`}
                  href={contentHref}
                >
                  {copy.primary}
                </Link>
              ) : (
                <button
                  className={`inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] ${
                    tone === "published"
                      ? "bg-[linear-gradient(135deg,#f59e0b,#facc15)]"
                      : "bg-[linear-gradient(135deg,#0f172a,#06b6d4)]"
                  }`}
                  onClick={onClose}
                  type="button"
                >
                  {copy.close}
                </button>
              )}
              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white/92 px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={onClose}
                type="button"
              >
                {copy.secondary}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "published"
      ? "Published"
      : status === "completed"
        ? "Completed"
      : status === "draft"
        ? "Draft"
        : status === "failed"
          ? "Failed"
          : status === "running"
            ? "Running"
            : status === "queued"
              ? "Queued"
              : status === "free"
                ? "Free"
                : status;
  const className =
    status === "failed"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "running"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "queued"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] ${className}`}
    >
      {label}
    </span>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "mt-4 rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,#fff1f2,#ffe4e6)] px-4 py-4 text-sm leading-6 text-rose-900 shadow-[0_18px_44px_rgba(244,63,94,0.08)]"
          : "mt-4 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      }
    >
      {children}
    </div>
  );
}

function StudioLoadingCard() {
  return (
    <div className="mt-4 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-4 w-full rounded-full bg-slate-200" />
        <div className="h-4 w-5/6 rounded-full bg-slate-200" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-10 rounded-full bg-slate-200" />
          <div className="h-10 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
