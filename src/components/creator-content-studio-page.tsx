"use client";

import Link from "next/link";
import { upload as uploadBlob } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Copy,
  Film,
  Globe2,
  ImagePlus,
  LayoutGrid,
  LoaderCircle,
  MapPin,
  PenSquare,
  RefreshCcw,
  Rss,
  Save,
  Search,
  Share2,
  Sparkles,
  WandSparkles,
  UserRound,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { CreatorStudioMobileNav } from "@/components/creator-studio-mobile-nav";
import {
  CreatorStudioHeader,
  CreatorStudioTabs,
  type CreatorStudioHeaderStat,
  type CreatorStudioTabItem,
} from "@/components/creator-studio-shell";
import { useMemberSession } from "@/components/member-session-provider";
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
import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  CONTENT_PAID_USDT_AMOUNT,
  CONTENT_VIDEO_LIMIT,
  CONTENT_VIDEO_MAX_BYTES,
  contentCoverGenerationProgressSteps,
  getContentVideoAssetSource,
} from "@/lib/content";
import type {
  CreatorCharacterMemoryEntry,
  CreatorCharacterPersona,
  CreatorCharacterPersonaGenerateResponse,
  CreatorCharacterTimelineEvent,
  CreatorCharacterWorldLocation,
  CreatorProfileAvatarCandidate,
  CreatorProfileAvatarGenerateResponse,
  CreatorProfileRecord,
  ContentGenerationFailureDiagnostic,
  ContentCoverGenerationProgressStep,
  ContentPriceType,
  ContentPostGenerateCoverResponse,
  ContentPostGenerateCoverStreamEvent,
  ContentPostMutationResponse,
  ContentPostRecord,
  ContentPostUploadResponse,
  CreatorProfileResponse,
  CreatorStudioPostsLoadResponse,
  FanletterFanRequestStatusUpdateResponse,
} from "@/lib/content";
import type { CreatorStudioDictionary } from "@/lib/creator-studio-dictionary";
import type { FanletterCreateInitialPlan } from "@/lib/fanletter-create-plan";
import {
  createDefaultCreatorRealismProfile,
  normalizeCreatorCharacterWorldLocation,
} from "@/lib/fanletter-realism-policy";
import {
  DEFAULT_FANLETTER_WORLD_LOCATION as DEFAULT_STUDIO_WORLD_LOCATION,
  FANLETTER_WORLD_LOCATION_PRESETS as STUDIO_WORLD_LOCATION_PRESETS,
  getCreatorCurrentWorldLocation,
  resolveFanletterWorldLocationSelection,
  type FanletterWorldLocationSelection,
} from "@/lib/fanletter-world-location";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { createShareId, setShareIdOnHref } from "@/lib/share-tracking";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import { getThirdwebUserEmail, useThirdwebConnectionState } from "@/lib/thirdweb-client";
import { cn } from "@/lib/utils";
import {
  captureVideoCoverFrame,
  captureVideoCoverFrameFromUrl,
} from "@/lib/video-frame-cover-client";

type StudioState = {
  error: string | null;
  member: MemberRecord | null;
  notice: string | null;
  posts: ContentPostRecord[];
  profile: {
    avatarImageSet: CreatorProfileAvatarCandidate[];
    avatarImageUrl: string;
    characterMemory: CreatorCharacterMemoryEntry[];
    characterPersona: CreatorCharacterPersona | null;
    characterTimeline: CreatorCharacterTimelineEvent[];
    displayName: string;
    heroImageUrl: string;
    intro: string;
    payoutWalletAddress: string;
  };
  profileConfigured: boolean;
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

type CharacterVisualSilhouette =
  | "athletic"
  | "balanced"
  | "elegant"
  | "slender"
  | "soft";
type CharacterVisualSilhouetteSelection = "auto" | CharacterVisualSilhouette;

type PersonaGenerationState = {
  ageRange: "" | "20s" | "30s" | "40s" | "50s_plus";
  appearanceTone:
    | "auto"
    | "african_diaspora"
    | "east_asian"
    | "latin"
    | "middle_eastern_mediterranean"
    | "south_asian"
    | "western";
  candidates: CreatorCharacterPersona[];
  error: string | null;
  gender: "" | "female" | "male";
  status: "idle" | "loading" | "ready" | "error";
  visualSilhouette: CharacterVisualSilhouetteSelection;
};

type AvatarGenerationState = {
  candidates: CreatorProfileAvatarCandidate[];
  error: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

type CharacterQuickstartState = {
  advancedOpen: boolean;
  ageRange: "auto" | "20s" | "30s" | "40s" | "50s_plus";
  appearanceTone:
    | "auto"
    | "african_diaspora"
    | "east_asian"
    | "latin"
    | "middle_eastern_mediterranean"
    | "south_asian"
    | "western";
  error: string | null;
  gender: "auto" | "female" | "male";
  status: "idle" | "loading" | "ready" | "error";
  style: "chic" | "daily" | "fan_service" | "friendly";
  visualSilhouette: CharacterVisualSilhouetteSelection;
  worldLocationSelection: FanletterWorldLocationSelection;
};

type CharacterIdentityLockDraft = {
  avoidChangesText: string;
  lockedTraitsText: string;
  personaId: string | null;
};

type CharacterMemoryFormState = {
  body: string;
  title: string;
};

type CoverGenerationProgressStepState = "active" | "done" | "error" | "pending";

type CoverGenerationProgressState = {
  active: boolean;
  currentStep: ContentCoverGenerationProgressStep | null;
  diagnostic: ContentGenerationFailureDiagnostic | null;
  error: string | null;
  message: string | null;
  progress: number;
  response: ContentPostGenerateCoverResponse | null;
  steps: Record<
    ContentCoverGenerationProgressStep,
    CoverGenerationProgressStepState
  >;
};

type GeneratePostCoverImageOptions = {
  failureNotice?: string;
  softFail?: boolean;
  successNotice?: string;
  throwOnError?: boolean;
  visualBrief?: string;
};

type StudioView = "character" | "hub" | "new" | "profile";
type PostComposerMode = "paid-upload" | "standard";
type PaidTeaserCoverStyle = "character" | "curiosity" | "mood" | "safe";

const EMPTY_PROFILE = {
  avatarImageSet: [] as CreatorProfileAvatarCandidate[],
  avatarImageUrl: "",
  characterMemory: [] as CreatorCharacterMemoryEntry[],
  characterPersona: null as CreatorCharacterPersona | null,
  characterTimeline: [] as CreatorCharacterTimelineEvent[],
  displayName: "",
  heroImageUrl: "",
  intro: "",
  payoutWalletAddress: "",
};

const EMPTY_POST_FORM = {
  body: "",
  contentImageUrls: [] as string[],
  contentVideoUrls: [] as string[],
  coverImageUrl: "",
  generatedContentImageUrls: [] as string[],
  generatedContentVideoUrls: [] as string[],
  previewText: "",
  priceType: "free" as ContentPriceType,
  summary: "",
  title: "",
};

function createInitialPostForm(
  initialPostPlan: FanletterCreateInitialPlan | null | undefined,
  postComposerMode: PostComposerMode,
): typeof EMPTY_POST_FORM {
  return {
    ...EMPTY_POST_FORM,
    body: initialPostPlan?.body ?? "",
    previewText: initialPostPlan?.summary ?? "",
    priceType: postComposerMode === "paid-upload" ? "paid" : "free",
    summary: initialPostPlan?.summary ?? "",
    title: initialPostPlan?.title ?? "",
  };
}

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

function sanitizeUploadBaseName(name: string) {
  const baseName = name.replace(/\.[^.]+$/u, "");
  const normalized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 48);

  return normalized || "content-video";
}

function resolveVideoExtension(file: File) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".webm")) {
    return ".webm";
  }

  if (fileName.endsWith(".mov")) {
    return ".mov";
  }

  return ".mp4";
}

const AUTOMATION_RESTRICTED_MESSAGE =
  "Content automation is not enabled for this member.";
const HUB_FULL_POST_PAGE_SIZE = 6;
const HUB_COMPACT_POST_PAGE_SIZE = 4;
const CHARACTER_IDENTITY_NAME_LIMIT = 80;
const CHARACTER_IDENTITY_SUMMARY_LIMIT = 220;
const CHARACTER_IDENTITY_PROMPT_LIMIT = 1_200;
const CHARACTER_IDENTITY_TRAIT_LIMIT = 160;
const CHARACTER_IDENTITY_TRAIT_COUNT_LIMIT = 8;
const CHARACTER_MEMORY_LIMIT = 24;
const CHARACTER_MEMORY_TITLE_LIMIT = 80;
const CHARACTER_MEMORY_BODY_LIMIT = 420;
const CHARACTER_TIMELINE_LIMIT = 48;

function resolveStudioPostPreviewImage(
  post: Pick<ContentPostRecord, "coverImageUrl" | "contentImageUrls">,
) {
  return post.coverImageUrl ?? post.contentImageUrls[0] ?? null;
}

function resolveStudioPostPreviewVideo(
  post: Pick<ContentPostRecord, "contentVideoUrls">,
) {
  return post.contentVideoUrls[0] ?? null;
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

function createEditableCreatorProfile(
  profile: CreatorProfileRecord | null | undefined,
): StudioState["profile"] {
  if (!profile) {
    return EMPTY_PROFILE;
  }

  return {
    avatarImageSet: profile.avatarImageSet ?? [],
    avatarImageUrl: profile.avatarImageUrl ?? "",
    characterMemory: profile.characterMemory ?? [],
    characterPersona: profile.characterPersona ?? null,
    characterTimeline: profile.characterTimeline ?? [],
    displayName: profile.displayName,
    heroImageUrl: profile.heroImageUrl ?? "",
    intro: profile.intro,
    payoutWalletAddress: profile.payoutWalletAddress ?? "",
  };
}

function resolveCreatorWorldLocation(
  persona: CreatorCharacterPersona | null | undefined,
) {
  return (
    normalizeCreatorCharacterWorldLocation(persona?.realismProfile?.worldLocation) ??
    DEFAULT_STUDIO_WORLD_LOCATION
  );
}

function resolveCreatorWorldLocationDraft(
  persona: CreatorCharacterPersona | null | undefined,
) {
  return persona?.realismProfile?.worldLocation ?? resolveCreatorWorldLocation(persona);
}

function applyCreatorWorldLocationDraft(
  persona: CreatorCharacterPersona,
  location: CreatorCharacterWorldLocation,
) {
  const defaultRealismProfile = createDefaultCreatorRealismProfile();
  const currentRealismProfile = persona.realismProfile ?? defaultRealismProfile;

  return {
    ...persona,
    realismProfile: {
      ...defaultRealismProfile,
      ...currentRealismProfile,
      worldLocation: location,
    },
  };
}

function applyCreatorWorldLocation(
  persona: CreatorCharacterPersona,
  location: CreatorCharacterWorldLocation,
) {
  const normalizedLocation =
    normalizeCreatorCharacterWorldLocation(location) ??
    DEFAULT_STUDIO_WORLD_LOCATION;
  const defaultRealismProfile = createDefaultCreatorRealismProfile();
  const currentRealismProfile = persona.realismProfile ?? defaultRealismProfile;

  return {
    ...persona,
    realismProfile: {
      ...defaultRealismProfile,
      ...currentRealismProfile,
      worldLocation: normalizedLocation,
    },
  };
}

function preserveCreatorWorldLocation(
  nextPersona: CreatorCharacterPersona,
  currentPersona: CreatorCharacterPersona | null | undefined,
) {
  const currentLocation = normalizeCreatorCharacterWorldLocation(
    currentPersona?.realismProfile?.worldLocation,
  );

  return currentLocation
    ? applyCreatorWorldLocation(nextPersona, currentLocation)
    : nextPersona;
}

function parseBoundedCoordinate(
  value: string,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeCharacterStudioText(value: string, limit: number) {
  return value.trim().replace(/[ \t]{2,}/g, " ").slice(0, limit);
}

function parseCharacterTraitText(value: string) {
  return value
    .split(/\n|,/u)
    .map((item) =>
      normalizeCharacterStudioText(item, CHARACTER_IDENTITY_TRAIT_LIMIT),
    )
    .filter(Boolean)
    .slice(0, CHARACTER_IDENTITY_TRAIT_COUNT_LIMIT);
}

function formatCharacterTraitText(values: string[]) {
  return values.join("\n");
}

function createCharacterStudioRecordId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function summarizeNonJsonApiResponse(text: string) {
  const normalized = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized ? normalized.slice(0, 180) : null;
}

async function readApiJson<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T | { error: string }> {
  const text = await response.text();

  if (!text) {
    return { error: fallbackMessage };
  }

  try {
    return JSON.parse(text) as T | { error: string };
  } catch {
    const summary = summarizeNonJsonApiResponse(text);

    return {
      error: summary ? `${fallbackMessage} (${summary})` : fallbackMessage,
    };
  }
}

function createEmptyCoverGenerationProgress(): CoverGenerationProgressState {
  return {
    active: false,
    currentStep: null,
    diagnostic: null,
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
    const failedStep = current.currentStep ?? "generating_image";

    return {
      ...current,
      active: false,
      currentStep: failedStep,
      diagnostic: event.diagnostic ?? null,
      error: event.error,
      message: event.error,
      steps: {
        ...current.steps,
        [failedStep]: "error",
      },
    };
  }

  if (event.type === "result") {
    return {
      ...current,
      active: false,
      currentStep: "finalizing",
      diagnostic: null,
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
    diagnostic:
      event.progress.status === "failed" ? current.diagnostic : null,
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

function getGenerationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDiagnosticValue(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function createGenerationDiagnosticCopyText(
  diagnostic: ContentGenerationFailureDiagnostic,
) {
  return JSON.stringify(diagnostic, null, 2);
}

function createGenerationDiagnosticOptionText(
  diagnostic: ContentGenerationFailureDiagnostic,
) {
  return [
    ["aspect_ratio", diagnostic.modelInput.aspectRatio],
    ["duration", diagnostic.modelInput.duration],
    ["resolution", diagnostic.modelInput.resolution],
    ["prompt_expansion", diagnostic.modelInput.enablePromptExpansion],
    ["safety_checker", diagnostic.modelInput.enableSafetyChecker],
    ["generate_audio", diagnostic.modelInput.generateAudio],
    ["safety_tolerance", diagnostic.modelInput.safetyTolerance],
    ["reference_images", diagnostic.modelInput.referenceImageCount],
    ["prompt_length", diagnostic.modelInput.promptLength],
    ["negative_prompt_length", diagnostic.modelInput.negativePromptLength],
  ]
    .map(([label, value]) => {
      const formatted = formatDiagnosticValue(value);

      return formatted ? `${label}: ${formatted}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

function applyCoverGenerationFailure(
  current: CoverGenerationProgressState,
  message: string,
  fallbackStep: ContentCoverGenerationProgressStep = "generating_image",
  diagnostic: ContentGenerationFailureDiagnostic | null = current.diagnostic,
): CoverGenerationProgressState {
  const failedStep = current.currentStep ?? fallbackStep;

  return {
    ...current,
    active: false,
    currentStep: failedStep,
    diagnostic,
    error: message,
    message,
    steps: {
      ...current.steps,
      [failedStep]: "error",
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
  characterHrefOverride = null,
  dictionary,
  homeHrefOverride = null,
  initialPostPlan = null,
  locale,
  newPostHrefOverride = null,
  postComposerMode = "standard",
  postsManagerHrefOverride = null,
  profileHrefOverride = null,
  referralCode = null,
  returnToHref = null,
  salesManagerHrefOverride = null,
  shell = "studio",
  showMobileNav = true,
  surface = "creator",
  studioHomeHrefOverride = null,
  view = "hub",
}: {
  characterHrefOverride?: string | null;
  dictionary: CreatorStudioDictionary;
  homeHrefOverride?: string | null;
  initialPostPlan?: FanletterCreateInitialPlan | null;
  locale: Locale;
  newPostHrefOverride?: string | null;
  postComposerMode?: PostComposerMode;
  postsManagerHrefOverride?: string | null;
  profileHrefOverride?: string | null;
  referralCode?: string | null;
  returnToHref?: string | null;
  salesManagerHrefOverride?: string | null;
  shell?: "embedded" | "studio";
  showMobileNav?: boolean;
  surface?: "creator" | "fanletter";
  studioHomeHrefOverride?: string | null;
  view?: StudioView;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const memberSessionEmail =
    accountAddress &&
    memberSession.accountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSession.email
      : null;
  const defaultHomeHref = buildReferralLandingPath(locale, referralCode);
  const homeHref = homeHrefOverride ?? defaultHomeHref;
  const defaultStudioHomeHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio`, referralCode),
    { returnTo: returnToHref },
  );
  const studioHomeHref = studioHomeHrefOverride ?? defaultStudioHomeHref;
  const defaultProfileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/profile`, referralCode),
    { returnTo: returnToHref },
  );
  const profileHref = profileHrefOverride ?? defaultProfileHref;
  const defaultCharacterHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/creator/studio/profile/character`,
      referralCode,
    ),
    { returnTo: returnToHref },
  );
  const characterHref = characterHrefOverride ?? defaultCharacterHref;
  const defaultPostsManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/posts`, referralCode),
    { returnTo: returnToHref },
  );
  const postsManagerHref = postsManagerHrefOverride ?? defaultPostsManagerHref;
  const defaultSalesManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/sales`, referralCode),
    { returnTo: returnToHref },
  );
  const salesManagerHref = salesManagerHrefOverride ?? defaultSalesManagerHref;
  const defaultNewPostHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/new`, referralCode),
    { returnTo: returnToHref },
  );
  const newPostHref = newPostHrefOverride ?? defaultNewPostHref;
  const isFanletterSurface = surface === "fanletter";
  const fanRequestsHref = `${studioHomeHref}#fan-requests`;
  const initialFanRequestId = initialPostPlan?.fanRequestId?.trim() || null;
  const initialFanRequestBody =
    initialPostPlan?.fanRequestBody?.trim() || initialPostPlan?.body?.trim() || null;
  const initialFanRequestCharacterName =
    initialPostPlan?.fanRequestCharacterName?.trim() || null;
  const initialFanRequestType = initialPostPlan?.fanRequestType ?? null;
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const currentStudioHref =
    view === "character"
      ? characterHref
      : view === "profile"
      ? profileHref
      : view === "new"
        ? newPostHref
        : studioHomeHref;
  const connectHref = isFanletterSurface
    ? setPathSearchParams(
        buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
        { returnTo: currentStudioHref },
      )
    : activateHref;
  const [state, setState] = useState<StudioState>({
    error: null,
    member: null,
    notice: null,
    posts: [],
    profile: EMPTY_PROFILE,
    profileConfigured: false,
    summary: EMPTY_STUDIO_SUMMARY,
    status: "idle",
  });
  const [postForm, setPostForm] = useState(() =>
    createInitialPostForm(initialPostPlan, postComposerMode),
  );
  const [postBodyError, setPostBodyError] = useState<string | null>(null);
  const [isAdvancedComposerOpen, setIsAdvancedComposerOpen] = useState(false);
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
  const [personaGeneration, setPersonaGeneration] =
    useState<PersonaGenerationState>({
      ageRange: "",
      appearanceTone: "auto",
      candidates: [],
      error: null,
      gender: "",
      status: "idle",
      visualSilhouette: "auto",
    });
  const [avatarGeneration, setAvatarGeneration] =
    useState<AvatarGenerationState>({
      candidates: [],
      error: null,
      status: "idle",
    });
  const [quickCharacter, setQuickCharacter] = useState<CharacterQuickstartState>({
    advancedOpen: false,
    ageRange: "auto",
    appearanceTone: "auto",
    error: null,
    gender: "auto",
    status: "idle",
    style: "friendly",
    visualSilhouette: "auto",
    worldLocationSelection: "current",
  });
  const [identityLockDraft, setIdentityLockDraft] =
    useState<CharacterIdentityLockDraft>({
      avoidChangesText: "",
      lockedTraitsText: "",
      personaId: null,
    });
  const [characterMemoryForm, setCharacterMemoryForm] =
    useState<CharacterMemoryFormState>({
      body: "",
      title: "",
    });
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
  const [paidTeaserCoverStyle, setPaidTeaserCoverStyle] =
    useState<PaidTeaserCoverStyle>("curiosity");
  const [contentVideoGenerationProgress, setContentVideoGenerationProgress] =
    useState<CoverGenerationProgressState>(createEmptyCoverGenerationProgress());
  const [isContentVideoGenerationDialogOpen, setIsContentVideoGenerationDialogOpen] =
    useState(false);
  const [contentVideoPrompt, setContentVideoPrompt] = useState("");
  const [automationCelebration, setAutomationCelebration] =
    useState<AutomationCelebrationState | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCreatingSellerWallet, setIsCreatingSellerWallet] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [savingPostStatus, setSavingPostStatus] = useState<
    "draft" | "published" | null
  >(null);
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const [isUploadingPostVideo, setIsUploadingPostVideo] = useState(false);
  const [postVideoUploadProgress, setPostVideoUploadProgress] = useState(0);
  const [isGeneratingPaidVideoFrameCover, setIsGeneratingPaidVideoFrameCover] =
    useState(false);
  const [isGeneratingPostImage, setIsGeneratingPostImage] = useState(false);
  const [feedShareState, setFeedShareState] = useState<
    "copied" | "error" | "idle" | "sharing"
  >("idle");
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
          generating_content_images: {
            description: "상세 페이지에 사용할 AI 콘텐츠 이미지 3장을 생성합니다.",
            label: "AI 콘텐츠 이미지",
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
          generating_content_images: {
            description: "Generating three AI content images for the detail page.",
            label: "Content images",
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
    generating_content_images: {
      description: automationProgressLabels.generating_content_images.description,
      icon: ImagePlus,
      label: automationProgressLabels.generating_content_images.label,
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
            "입력한 설명을 바탕으로 AI 콘텐츠 이미지를 생성합니다.",
          confirmHint:
            `AI 콘텐츠 이미지는 최대 ${GENERATED_CONTENT_IMAGE_LIMIT}장까지만 만들 수 있고, 완료되면 콘텐츠 이미지 목록에 바로 추가됩니다.`,
          promptHint:
            "어떤 장면, 분위기, 배경, 의상으로 만들지 적어주세요. 선택한 인물 페르소나와 아바타가 있으면 같은 인물을 유지해 생성합니다.",
          promptLabel: "만들 이미지 설명",
          promptPlaceholder:
            "예: 해변의 황금빛 석양, 역동적인 모래 질감, 하이패션 에디토리얼 무드",
          confirmPrimary: "이미지 생성",
          confirmSecondary: "나중에",
          error: "오류",
          finalizing: {
            description: "생성된 이미지를 콘텐츠 이미지 목록에 추가합니다.",
            label: "콘텐츠 이미지 반영",
          },
          generating_image: {
            description: "상세 페이지에 사용할 AI 콘텐츠 이미지를 생성합니다.",
            label: "이미지 생성",
          },
          preparing_prompt: {
            description: "이미지 설명과 페르소나를 AI 생성 요청으로 정리합니다.",
            label: "생성 요청 준비",
          },
          progress: "진행률",
          running: "진행 중",
          successPrimary: "콘텐츠 이미지에 추가 완료",
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
            "The AI will generate a content image from your description.",
          confirmHint:
            `AI content images are limited to ${GENERATED_CONTENT_IMAGE_LIMIT} and will be added directly into your content image list.`,
          promptHint:
            "Describe the scene, mood, background, and styling. If a persona and avatar are selected, they will be used to keep the same person.",
          promptLabel: "Image description",
          promptPlaceholder:
            "Example: golden sunset on a beach, dynamic sand texture, high-fashion editorial mood",
          confirmPrimary: "Generate image",
          confirmSecondary: "Later",
          error: "Error",
          finalizing: {
            description: "Adding the generated result into the content image list.",
            label: "Content images",
          },
          generating_image: {
            description: "Creating an AI content image for the detail page.",
            label: "Image generation",
          },
          preparing_prompt: {
            description: "Preparing the image description and persona for the AI request.",
            label: "Generation setup",
          },
          progress: "Progress",
          running: "Running",
          successPrimary: "Added to content images",
          successSecondary: "Keep editing",
          successTitle: "Your AI content image is ready.",
          title: "AI content image generation",
          uploading_cover: {
            description: "Uploading the generated image to studio assets.",
            label: "Asset upload",
          },
        };
  const contentImageGenerationStepMeta: Record<
    ContentCoverGenerationProgressStep,
    {
      description: string;
      icon: typeof UserRound;
      label: string;
    }
  > = {
    authorizing: {
      description: contentImageGenerationLabels.authorizing.description,
      icon: UserRound,
      label: contentImageGenerationLabels.authorizing.label,
    },
    finalizing: {
      description: contentImageGenerationLabels.finalizing.description,
      icon: Check,
      label: contentImageGenerationLabels.finalizing.label,
    },
    generating_image: {
      description: contentImageGenerationLabels.generating_image.description,
      icon: WandSparkles,
      label: contentImageGenerationLabels.generating_image.label,
    },
    preparing_prompt: {
      description: contentImageGenerationLabels.preparing_prompt.description,
      icon: PenSquare,
      label: contentImageGenerationLabels.preparing_prompt.label,
    },
    uploading_cover: {
      description: contentImageGenerationLabels.uploading_cover.description,
      icon: ImagePlus,
      label: contentImageGenerationLabels.uploading_cover.label,
    },
  };
  const contentVideoGenerationLabels =
    locale === "ko"
      ? {
          authorizing: {
            description: "같은 회원 이메일과 지갑 권한을 먼저 확인합니다.",
            label: "회원 확인",
          },
          completed: "완료",
          confirmBody:
            "동영상 프롬프트 내용만 사용해 AI 콘텐츠 동영상을 생성합니다.",
          confirmHint:
            "AI 콘텐츠 동영상은 최대 1개까지 추가할 수 있고, 생성에는 몇 분이 걸릴 수 있습니다.",
          promptHint:
            "여기에 적은 내용이 동영상 생성 프롬프트로 그대로 적용됩니다.",
          promptLabel: "동영상 프롬프트",
          promptPlaceholder:
            "예: 세로형 숏폼, 해변 위를 천천히 걷는 모델, 자연스러운 카메라 무빙, 따뜻한 석양",
          confirmPrimary: "동영상 생성",
          confirmSecondary: "나중에",
          diagnostic: {
            copy: "진단 정보 복사",
            copied: "복사됨",
            fieldErrors: "필드 오류",
            kind: "원인",
            model: "모델",
            modelOptions: "모델 옵션",
            requestId: "fal requestId",
            response: "응답 요약",
            status: "상태 코드",
            title: "실패 원인 보기",
            unavailable: "없음",
          },
          error: "오류",
          finalizing: {
            description: "생성된 동영상을 콘텐츠 동영상 슬롯에 추가합니다.",
            label: "콘텐츠 동영상 반영",
          },
          generating_image: {
            description: "상세 페이지에 사용할 AI 콘텐츠 동영상을 생성합니다.",
            label: "동영상 생성",
          },
          preparing_prompt: {
            description: "입력한 동영상 프롬프트를 생성 요청으로 준비합니다.",
            label: "프롬프트 준비",
          },
          progress: "진행률",
          running: "진행 중",
          successPrimary: "콘텐츠 동영상에 추가 완료",
          successSecondary: "계속 편집하기",
          successTitle: "AI 콘텐츠 동영상이 준비되었습니다.",
          title: "AI 콘텐츠 동영상 생성",
          uploading_cover: {
            description: "생성한 동영상을 스튜디오 자산으로 업로드합니다.",
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
            "The AI will generate a content video using only the video prompt.",
          confirmHint:
            "AI content video is limited to one slot and can take a few minutes to generate.",
          promptHint:
            "This text is used directly as the video prompt.",
          promptLabel: "Video prompt",
          promptPlaceholder:
            "Example: vertical short-form shot, a model walking slowly on a beach, natural camera movement, warm sunset",
          confirmPrimary: "Generate video",
          confirmSecondary: "Later",
          diagnostic: {
            copy: "Copy diagnostics",
            copied: "Copied",
            fieldErrors: "Field errors",
            kind: "Cause",
            model: "Model",
            modelOptions: "Model options",
            requestId: "fal requestId",
            response: "Response summary",
            status: "Status code",
            title: "Failure details",
            unavailable: "None",
          },
          error: "Error",
          finalizing: {
            description: "Adding the generated result into the content video slot.",
            label: "Content video",
          },
          generating_image: {
            description: "Creating an AI content video for the detail page.",
            label: "Video generation",
          },
          preparing_prompt: {
            description: "Preparing your video prompt for the generation request.",
            label: "Prompt setup",
          },
          progress: "Progress",
          running: "Running",
          successPrimary: "Added to content video",
          successSecondary: "Keep editing",
          successTitle: "Your AI content video is ready.",
          title: "AI content video generation",
          uploading_cover: {
            description: "Uploading the generated video to studio assets.",
            label: "Asset upload",
          },
        };
  const contentVideoGenerationStepMeta: Record<
    ContentCoverGenerationProgressStep,
    {
      description: string;
      icon: typeof UserRound;
      label: string;
    }
  > = {
    authorizing: {
      description: contentVideoGenerationLabels.authorizing.description,
      icon: UserRound,
      label: contentVideoGenerationLabels.authorizing.label,
    },
    finalizing: {
      description: contentVideoGenerationLabels.finalizing.description,
      icon: Check,
      label: contentVideoGenerationLabels.finalizing.label,
    },
    generating_image: {
      description: contentVideoGenerationLabels.generating_image.description,
      icon: Film,
      label: contentVideoGenerationLabels.generating_image.label,
    },
    preparing_prompt: {
      description: contentVideoGenerationLabels.preparing_prompt.description,
      icon: PenSquare,
      label: contentVideoGenerationLabels.preparing_prompt.label,
    },
    uploading_cover: {
      description: contentVideoGenerationLabels.uploading_cover.description,
      icon: Film,
      label: contentVideoGenerationLabels.uploading_cover.label,
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
  const completedContentVideoGenerationStepCount =
    contentCoverGenerationProgressSteps.filter(
      (step) => contentVideoGenerationProgress.steps[step] === "done",
    ).length;
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const postGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const postVideoInputRef = useRef<HTMLInputElement | null>(null);
  const {
    isDisconnected,
    isResolving: isConnectionResolving,
  } = useThirdwebConnectionState({ accountAddress, status });
  const backHref =
    view === "hub"
      ? returnToHref ?? homeHref
      : view === "character"
        ? profileHref
        : studioHomeHref;
  const characterPageCopy =
    locale === "ko"
      ? {
          description:
            "활성 캐릭터를 바꾸면 이후 생성되는 이미지와 영상의 인물이 달라질 수 있습니다.",
          shortcut: "프로필로 돌아가기",
          title: "캐릭터 변경",
        }
      : {
          description:
            "Changing the active character can change the person used in future image and video generations.",
          shortcut: "Back to profile",
          title: "Change character",
        };
  const isPaidUploadComposer = postComposerMode === "paid-upload";
  const isFanletterPaidUpload = isFanletterSurface && isPaidUploadComposer;
  const paidUploadComposerCopy =
    locale === "ko"
      ? {
          description:
            "팬이 남긴 브이로그 요청에 직접 업로드 영상으로 답장합니다.",
          eyebrow: "FanLetter Paid Upload",
          helper:
            "유료 콘텐츠 등록에는 직접 업로드한 동영상 1개가 필요합니다.",
          composerTitle: "요청에 영상으로 답장",
          composerDescription:
            "요청 내용은 제목과 본문에 반영되어 있습니다. 직접 업로드한 영상과 공개 티저만 확인하면 게시할 수 있습니다.",
          autoCoverFailed:
            "동영상은 업로드되었습니다. 커버 자동 생성은 실패했으니 커버를 직접 업로드하거나 AI 티저를 다시 생성해 주세요.",
          autoCoverGenerating:
            "동영상 업로드가 완료되었습니다. AI 티저 커버를 생성하고 있습니다.",
          autoCoverReady:
            "AI 티저 커버가 적용되었습니다. 팬에게 공개되는 미리보기로 사용됩니다.",
          frameCoverFailed:
            "동영상 프레임 커버를 만들지 못해 AI 티저 커버를 생성하고 있습니다.",
          frameCoverGenerating:
            "동영상에서 공개 커버 프레임을 추출하고 있습니다.",
          frameCoverReady:
            "동영상 프레임 커버가 적용되었습니다. 필요하면 AI 티저로 바꿀 수 있습니다.",
          frameCoverRetryFailed:
            "영상 프레임 커버를 만들지 못했습니다. 커버를 직접 업로드하거나 AI 티저를 생성해 주세요.",
          generateFrameCover: "영상 프레임 커버 생성",
          generatingFrameCover: "프레임 생성 중...",
          generateTeaserCover: "AI 티저 커버 생성",
          generatingTeaserCover: "AI 티저 생성 중...",
          connectCta: "계정 연결하기",
          connectDescription:
            "같은 회원 이메일로 연결하면 이 요청에 영상을 업로드하고 공개 티저를 확인할 수 있습니다.",
          connectTitle: "계정 연결 후 업로드 가능",
          loadingStatus: "업로드 준비 상태를 확인하는 중입니다.",
          requestRequired:
            "유료 직접 업로드는 팬이 남긴 브이로그 요청에서만 시작할 수 있습니다. 팬 요청함에서 브이로그 요청을 선택하세요.",
          requestRequiredCta: "팬 요청함으로 이동",
          requestTypeRequired:
            "응원 메시지는 무료 답장 브이로그로 처리하고, 유료 직접 업로드는 브이로그 요청에서만 열립니다.",
          lockedPreviewFallbackText:
            "결제 후 비공개 영상과 전체 본문이 열립니다.",
          lockedPreviewFallbackTitle: "1 USDT 팬 전용 브이로그",
          lockedPreviewMediaMissing: "동영상 필요",
          lockedPreviewMediaReady: "동영상 준비됨",
          lockedPreviewTeaserMissing: "공개 티저 필요",
          lockedPreviewTeaserReady: "티저 준비됨",
          lockedPreviewTitle: "팬 공개 잠금 카드",
          publishBlockedPreview:
            "게시 전 공개 티저를 입력해야 합니다. 본문이 자동 노출되지 않도록 짧게 요약해 주세요.",
          publishCoverFailed:
            "유료 브이로그를 게시하려면 공개 티저 커버가 필요합니다. 다시 생성하거나 커버를 직접 업로드해 주세요.",
          publishCoverGenerating:
            "커버가 비어 있어 게시 전에 업로드한 동영상에서 커버 프레임을 추출합니다.",
          imageEmpty:
            "유료 상세 페이지에 함께 보일 이미지를 직접 추가할 수 있습니다.",
          previewHint:
            "잠금 화면과 팬 전용 카드에 공개되는 짧은 티저입니다. 전체 내용이나 민감한 장면은 노출하지 마세요.",
          previewLabel: "공개 티저",
          previewPlaceholder:
            "예: 결제 후 엘라 하트의 비공개 루틴 전체 영상과 상세 본문이 열립니다.",
          previewRequiredLabel: "공개 티저 (필수)",
          readinessAuto: "자동",
          readinessCoverDescription:
            "커버가 비어 있으면 업로드한 동영상 프레임으로 자동 생성합니다.",
          readinessCoverLabel: "공개 커버",
          readinessMissing: "필요",
          readinessPreviewDescription:
            "결제 전 팬에게 보이는 짧은 문구입니다.",
          readinessPreviewLabel: "공개 티저",
          readinessReady: "준비됨",
          readinessRequired: "필수",
          readinessTitle: "게시 준비도",
          readinessVideoDescription:
            "직접 업로드한 동영상 1개가 있어야 게시할 수 있습니다.",
          readinessVideoLabel: "유료 동영상",
          readinessWalletDescription:
            "수익 지갑은 유료 게시 전에 자동 생성됩니다.",
          readinessWalletLabel: "정산 지갑",
          fanRequestContext:
            "제목, 요약, 본문에 반영되었습니다.",
          fanRequestEyebrow: "팬 요청",
          fanRequestTitle: "팬이 요청한 브이로그",
          primaryVideoDescription:
            "팬 요청에 답하는 MP4, MOV, WEBM 원본 영상을 먼저 업로드하세요. 최대 1개, 200MB 이하입니다.",
          primaryVideoTitle: "유료 동영상",
          publishConditionsTitle: "게시 조건",
          manageVlogs: "브이로그 관리",
          priceBody:
            "직접 업로드한 동영상과 상세 본문은 결제 후 열람됩니다. 커버 이미지는 피드에 공개됩니다.",
          processTitle: "등록 흐름",
          publishCta: "유료 브이로그 게시",
          rules: [
            "팬 브이로그 요청에서만 유료 직접 업로드 시작",
            "직접 업로드한 동영상만 유료 등록",
            "AI 생성 동영상은 무료 생성 화면에서만 사용",
            "커버 이미지는 공개, 본문과 영상은 결제 후 열람",
          ],
          salesCta: "판매 내역 보기",
          studioCta: "스튜디오로 돌아가기",
          title: "팬 요청 답장 업로드",
          uploadVideo: "유료 동영상 업로드",
          videoHint:
            "팬 브이로그 요청에 답하는 직접 업로드 MP4, MOV, WEBM 동영상만 1 USDT 유료 콘텐츠로 저장됩니다. 최대 1개, 200MB 이하입니다.",
          workflow: [
            "커버와 제목으로 공개 미리보기 구성",
            "직접 업로드한 동영상 1개 추가",
            "1 USDT 유료 브이로그로 게시",
          ],
        }
      : {
          description:
            "Reply to a fan vlog request with a directly uploaded paid video.",
          eyebrow: "FanLetter Paid Upload",
          helper: "Paid content requires one directly uploaded video.",
          composerTitle: "Reply with a video",
          composerDescription:
            "The request is already applied to the title and body. Upload the video and confirm the public teaser to publish.",
          autoCoverFailed:
            "The video was uploaded. Automatic cover generation failed, so upload a cover or generate an AI teaser again.",
          autoCoverGenerating:
            "Video upload is complete. Generating an AI teaser cover.",
          autoCoverReady:
            "AI teaser cover applied. It will be used as the public preview for fans.",
          frameCoverFailed:
            "Could not create a video-frame cover. Generating an AI teaser cover instead.",
          frameCoverGenerating:
            "Extracting a public cover frame from the uploaded video.",
          frameCoverReady:
            "Video-frame cover applied. You can replace it with an AI teaser if needed.",
          frameCoverRetryFailed:
            "Could not create a video-frame cover. Upload a cover manually or generate an AI teaser.",
          generateFrameCover: "Use video frame",
          generatingFrameCover: "Capturing frame...",
          generateTeaserCover: "Generate AI teaser cover",
          generatingTeaserCover: "Generating teaser...",
          connectCta: "Connect account",
          connectDescription:
            "Connect with the same member email to upload the video for this request and review the public teaser.",
          connectTitle: "Connect account to upload",
          loadingStatus: "Checking upload readiness.",
          requestRequired:
            "Paid direct upload can only start from a fan vlog request. Choose a vlog request from the fan request inbox.",
          requestRequiredCta: "Go to fan requests",
          requestTypeRequired:
            "Support messages should use a free reply vlog. Paid direct upload only opens for vlog requests.",
          lockedPreviewFallbackText:
            "Unlock the private video and full note after payment.",
          lockedPreviewFallbackTitle: "1 USDT fan-only vlog",
          lockedPreviewMediaMissing: "Video required",
          lockedPreviewMediaReady: "Video ready",
          lockedPreviewTeaserMissing: "Public teaser required",
          lockedPreviewTeaserReady: "Teaser ready",
          lockedPreviewTitle: "Public locked card",
          publishBlockedPreview:
            "Enter a public teaser before publishing so the locked body is not exposed automatically.",
          publishCoverFailed:
            "A public teaser cover is required before publishing this paid vlog. Generate again or upload a cover manually.",
          publishCoverGenerating:
            "No cover is set, so FanLetter is extracting a cover frame from the uploaded video before publishing.",
          imageEmpty:
            "Add directly uploaded images that should appear on the paid detail page.",
          previewHint:
            "A short public teaser shown on locked cards and unlock screens. Do not expose the full story or sensitive scenes.",
          previewLabel: "Public teaser",
          previewPlaceholder:
            "Example: Unlock the private routine video and full note after payment.",
          previewRequiredLabel: "Public teaser (required)",
          readinessAuto: "Auto",
          readinessCoverDescription:
            "If no cover is set, FanLetter extracts one from the uploaded video.",
          readinessCoverLabel: "Public cover",
          readinessMissing: "Required",
          readinessPreviewDescription:
            "A short line fans see before payment.",
          readinessPreviewLabel: "Public teaser",
          readinessReady: "Ready",
          readinessRequired: "Required",
          readinessTitle: "Publish readiness",
          readinessVideoDescription:
            "One directly uploaded video is required before publishing.",
          readinessVideoLabel: "Paid video",
          readinessWalletDescription:
            "The payout wallet is created automatically before paid publishing.",
          readinessWalletLabel: "Payout wallet",
          fanRequestContext:
            "Applied to the title, summary, and body.",
          fanRequestEyebrow: "Fan Request",
          fanRequestTitle: "Fan requested vlog",
          primaryVideoDescription:
            "Upload the MP4, MOV, or WEBM source video that answers this fan request. One video, 200MB max.",
          primaryVideoTitle: "Paid video",
          publishConditionsTitle: "Publishing conditions",
          manageVlogs: "Manage vlogs",
          priceBody:
            "The uploaded video and detail body unlock after payment. Cover images stay visible in the feed.",
          processTitle: "Publishing flow",
          publishCta: "Publish paid vlog",
          rules: [
            "Start paid direct upload only from a fan vlog request",
            "Only directly uploaded video can be paid",
            "AI-generated video stays in the free creation flow",
            "Cover is public, body and video unlock after payment",
          ],
          salesCta: "View sales",
          studioCta: "Back to studio",
          title: "Fan request reply upload",
          uploadVideo: "Upload paid video",
          videoHint:
            "Only directly uploaded MP4, MOV, or WEBM videos responding to a fan vlog request are saved as 1 USDT paid content. One video, 200MB max.",
          workflow: [
            "Prepare the public cover, title, and summary",
            "Upload one direct video file",
            "Publish as a 1 USDT paid vlog",
          ],
        };
  const isPaidUploadRequestMissing =
    isFanletterPaidUpload && !initialFanRequestId;
  const isPaidUploadRequestWrongType =
    isFanletterPaidUpload && initialFanRequestType === "message";
  const isPaidUploadRequestBlocked =
    isPaidUploadRequestMissing || isPaidUploadRequestWrongType;
  const paidUploadRequestBlockMessage = isPaidUploadRequestWrongType
    ? paidUploadComposerCopy.requestTypeRequired
    : paidUploadComposerCopy.requestRequired;
  const paidTeaserCoverStyles: Array<{
    description: string;
    id: PaidTeaserCoverStyle;
    label: string;
    prompt: string;
  }> = [
    {
      description: locale === "ko" ? "부분만 암시" : "Hints only",
      id: "curiosity",
      label: locale === "ko" ? "호기심" : "Curiosity",
      prompt:
        "Style direction: curiosity-led locked teaser, partial silhouette, obscured frame, intriguing crop, premium suspense, no spoilers.",
    },
    {
      description: locale === "ko" ? "공개 안전" : "Public-safe",
      id: "safe",
      label: locale === "ko" ? "안전" : "Safe",
      prompt:
        "Style direction: public-safe editorial cover, calm composition, neutral details, brand-safe curiosity, no suggestive framing.",
    },
    {
      description: locale === "ko" ? "인물 무드" : "Character mood",
      id: "character",
      label: locale === "ko" ? "캐릭터" : "Character",
      prompt:
        "Style direction: character-led portrait mood without identity drift, expressive but tasteful, keep the persona recognizable without revealing the paid plot.",
    },
    {
      description: locale === "ko" ? "장소와 빛" : "Place and light",
      id: "mood",
      label: locale === "ko" ? "분위기" : "Mood",
      prompt:
        "Style direction: environment-led cinematic still, realistic location, props, lighting, and atmosphere create the question while the subject can stay indirect.",
    },
  ];
  const pageTitle =
    view === "character"
      ? characterPageCopy.title
      : view === "profile"
      ? contentCopy.labels.creatorSettings
      : view === "new"
        ? isPaidUploadComposer
          ? paidUploadComposerCopy.title
          : contentCopy.actions.createPost
        : contentCopy.page.studioTitle;
  const pageDescription =
    view === "character"
      ? characterPageCopy.description
      : view === "profile"
      ? contentCopy.page.profileDescription
      : view === "new"
        ? isPaidUploadComposer
          ? paidUploadComposerCopy.description
          : contentCopy.page.newDescription
        : contentCopy.page.studioDescription;
  const headerShortcutHref =
    view === "character"
      ? profileHref
      : view === "profile"
      ? newPostHref
      : view === "new"
        ? isFanletterPaidUpload
          ? null
          : profileHref
        : null;
  const headerShortcutLabel =
    view === "character"
      ? characterPageCopy.shortcut
      : view === "profile"
      ? contentCopy.actions.createPost
      : view === "new"
        ? isFanletterPaidUpload
          ? null
          : contentCopy.labels.creatorSettings
        : null;
  const salesManagerLabel = locale === "ko" ? "판매 관리" : "Sales";
  const feedShareCopy =
    locale === "ko"
      ? {
          action: "내 피드 공유",
          copied: "링크 복사됨",
          description:
            "내 레퍼럴이 포함된 공개 피드 미리보기 링크를 공유합니다.",
          disabled: "활성화 후 공유 가능",
          error: "복사 실패",
          recentDescription:
            "최근 콘텐츠를 공개 피드 링크로 묶어 신규 방문자가 바로 볼 수 있게 공유하세요.",
          recentTitle: "최근 콘텐츠를 공개 피드로 공유",
          sharing: "공유 중",
          title: "내 피드 공유",
        }
      : {
          action: "Share feed",
          copied: "Link copied",
          description:
            "Share the public feed preview with your referral attached.",
          disabled: "Available after activation",
          error: "Copy failed",
          recentDescription:
            "Share your recent content as a public feed link so new visitors can start browsing immediately.",
          recentTitle: "Share recent posts as a feed",
          sharing: "Sharing",
          title: "Share my feed",
        };
  const emptyStudioCopy =
    locale === "ko"
      ? {
          ctaCreate: "첫 콘텐츠 만들기",
          ctaProfile: "프로필 설정",
          description:
            "첫 콘텐츠를 만들면 네트워크 피드에 노출되고, 무료 또는 1 USDT 유료 콘텐츠로 공유할 수 있습니다.",
          eyebrow: "START GUIDE",
          paidHint:
            "유료 콘텐츠는 콘텐츠 이미지와 본문을 1 USDT 결제 후 열람하도록 설정할 수 있습니다.",
          shareHint:
            "게시 후 내 피드 링크를 공유하면 신규 방문자가 바로 콘텐츠를 확인할 수 있습니다.",
          steps: [
            "크리에이터 이름과 소개를 정리합니다.",
            "커버 이미지와 본문으로 첫 콘텐츠를 만듭니다.",
            "게시 후 내 피드 링크를 공유합니다.",
          ],
          title: "아직 등록한 콘텐츠가 없습니다.",
        }
      : {
          ctaCreate: "Create first post",
          ctaProfile: "Set up profile",
          description:
            "Your first post can appear in the network feed and be shared as free or fixed 1 USDT paid content.",
          eyebrow: "START GUIDE",
          paidHint:
            "Paid posts can lock content images and body until a 1 USDT unlock is completed.",
          shareHint:
            "After publishing, share your feed link so new visitors can start browsing immediately.",
          steps: [
            "Set your creator name and channel intro.",
            "Create your first post with a cover image and body.",
            "Publish it and share your feed link.",
          ],
          title: "No posts created yet.",
        };
  const profileSummaryCopy =
    locale === "ko"
      ? {
          configured: "프로필 등록됨",
          edit: "수정",
          fallbackIntro: "등록한 소개문이 아직 없습니다.",
          fallbackName: "크리에이터 프로필",
          notConfigured: "프로필을 먼저 설정하면 피드에서 크리에이터 정보가 더 신뢰감 있게 보입니다.",
          salesWalletMissing: "판매 지갑 미연결",
          salesWalletReady: "판매 지갑 연결됨",
        }
      : {
          configured: "Profile saved",
          edit: "Edit",
          fallbackIntro: "No channel intro saved yet.",
          fallbackName: "Creator profile",
          notConfigured:
            "Set up your profile so creator details look more trustworthy in the feed.",
          salesWalletMissing: "Seller wallet not connected",
          salesWalletReady: "Seller wallet connected",
        };
  const creatorFeedSharePath = state.member?.referralCode
    ? setPathSearchParams(
        buildPathWithReferral(`/${locale}/referral/bridge`, state.member.referralCode),
        { target: "feed" },
      )
    : null;
  const creatorFeedShareUrl =
    typeof window === "undefined" || !creatorFeedSharePath
      ? creatorFeedSharePath ?? ""
      : new URL(creatorFeedSharePath, window.location.origin).toString();

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
  const canShareCreatorFeed = canUseWorkspace && Boolean(creatorFeedShareUrl);
  const recoverableStudioError =
    state.error && state.member?.status === "completed" ? state.error : null;
  const hasPostMedia = Boolean(
    postForm.coverImageUrl ||
      postForm.contentImageUrls.length > 0 ||
      postForm.contentVideoUrls.length > 0,
  );
  const postVideoSource = getContentVideoAssetSource(
    postForm.contentVideoUrls[0] ?? null,
  );
  const hasUploadedPostVideo = postVideoSource === "uploaded";
  const hasGeneratedPostVideo = postVideoSource === "generated";
  const effectivePostPriceType: ContentPriceType = isPaidUploadComposer || hasUploadedPostVideo
    ? "paid"
    : "free";
  const hasRequiredPostMedia = isPaidUploadComposer
    ? hasUploadedPostVideo
    : hasPostMedia;
  const hasPaidUploadPreviewText = Boolean(postForm.previewText.trim());
  const postBodyRequiredMessage =
    locale === "ko"
      ? "본문을 입력한 뒤 저장하거나 게시해주세요."
      : "Enter the content body before saving or publishing.";
  const postImageRequiredMessage =
    locale === "ko"
      ? "이미지 또는 동영상을 1개 이상 추가해야 바로 게시할 수 있습니다."
      : "Add at least one image or video before publishing.";
  const paidUploadRequiredMessage =
    locale === "ko"
      ? "유료 콘텐츠는 직접 업로드한 동영상이 필요합니다."
      : "Paid content requires a directly uploaded video.";
  const paidUploadPreviewRequiredMessage =
    paidUploadComposerCopy.publishBlockedPreview;
  const requiredPostMediaMessage = isPaidUploadComposer
    ? paidUploadRequiredMessage
    : postImageRequiredMessage;
  const uploadedVideoPaidPolicyMessage =
    locale === "ko"
      ? "직접 업로드한 동영상은 유료 콘텐츠로만 저장됩니다."
      : "Directly uploaded videos are saved as paid content only.";
  const aiVideoFreePolicyMessage =
    locale === "ko"
      ? "AI 생성 동영상은 무료 공개 콘텐츠로만 저장됩니다."
      : "AI-generated videos are saved as free public content only.";
  const postSaveProgressCopy =
    locale === "ko"
      ? {
          draft: "임시 저장 중...",
          publish: "게시 중...",
        }
      : {
          draft: "Saving draft...",
          publish: "Publishing...",
        };
  const canGeneratePostCover = Boolean(
    postForm.title.trim() || postForm.summary.trim() || postForm.body.trim(),
  );

  const loadStudio = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    const shouldLoadProfileView = view === "profile" || view === "character";
    const shouldLoadAutomation = view === "profile";
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
      const email =
        memberSessionEmail ??
        (await getThirdwebUserEmail({ client: thirdwebClient }));

      if (!email) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      if (!shouldLoadProfileView) {
        const query = new URLSearchParams({
          email,
          page: "1",
          pageSize: String(compactPageSize),
          walletAddress: accountAddress,
        });
        let postsResponse = await fetch(
          `/api/content/posts/load?${query.toString()}`,
        );
        let postsData = (await postsResponse.json()) as
          | CreatorStudioPostsLoadResponse
          | { error?: string };

        if (!postsResponse.ok && postsResponse.status === 404) {
          postsResponse = await fetch("/api/content/posts/load", {
            body: JSON.stringify({
              chainId: chain.id,
              chainName: chain.name ?? "BSC",
              email,
              locale,
              page: 1,
              pageSize: compactPageSize,
              syncMode: "light",
              walletAddress: accountAddress,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          });
          postsData = (await postsResponse.json()) as
            | CreatorStudioPostsLoadResponse
            | { error?: string };
        }

        if (!postsResponse.ok || !("posts" in postsData)) {
          throw new Error(
            "error" in postsData && postsData.error
              ? postsData.error
              : contentCopy.messages.studioLoadFailed,
          );
        }

        const member = postsData.member;

        if (!member) {
          throw new Error(contentCopy.messages.memberMissing);
        }

        if (postsData.validationError) {
          setState({
            error: postsData.validationError,
            member,
            notice: null,
            posts: [],
            profile: EMPTY_PROFILE,
            profileConfigured: false,
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
            profileConfigured: false,
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

        setState({
          error: null,
          member,
          notice: null,
          posts: postsData.posts,
          profile: createEditableCreatorProfile(postsData.profile),
          profileConfigured: postsData.profileConfigured,
          summary: postsData.summary,
          status: "ready",
        });
        setAutomation((current) => ({
          ...current,
          error: null,
          status: "idle",
        }));
        return;
      }

      const profileUrl = `/api/content/profile?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`;
      let profileResponse = await fetch(profileUrl);
      let profileData = (await profileResponse.json()) as
        | CreatorProfileResponse
        | { error?: string };

      if (!profileResponse.ok && profileResponse.status === 404) {
        const memberData = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!memberData.ok) {
          throw new Error(
            memberData.error || contentCopy.messages.studioLoadFailed,
          );
        }

        const member = memberData.member;

        if (!member) {
          throw new Error(contentCopy.messages.memberMissing);
        }

        updateMemberSession({
          email,
          member,
          walletAddress: accountAddress,
        });

        if (memberData.validationError) {
          setState({
            error: memberData.validationError,
            member,
            notice: null,
            posts: [],
            profile: EMPTY_PROFILE,
            profileConfigured: false,
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
            profileConfigured: false,
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

        profileResponse = await fetch(profileUrl);
        profileData = (await profileResponse.json()) as
          | CreatorProfileResponse
          | { error?: string };
      } else if (!profileResponse.ok && profileResponse.status === 403) {
        const memberResponse = await fetch(
          `/api/members?email=${encodeURIComponent(email)}`,
        );
        const memberData = (await memberResponse.json()) as
          | MemberLoadResponse
          | { error?: string };
        const member = "member" in memberData ? memberData.member : null;

        if (memberResponse.ok && member && member.status !== "completed") {
          setState({
            error: contentCopy.messages.paymentRequired,
            member,
            notice: null,
            posts: [],
            profile: EMPTY_PROFILE,
            profileConfigured: false,
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
      }

      if (!profileResponse.ok || !("profile" in profileData)) {
        throw new Error(
          "error" in profileData && profileData.error
            ? profileData.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      const member = "member" in profileData ? profileData.member : null;

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      setState({
        error: null,
        member,
        notice: null,
        posts: [],
        profile: createEditableCreatorProfile(profileData.profile),
        profileConfigured: profileData.profileConfigured,
        summary: EMPTY_STUDIO_SUMMARY,
        status: "ready",
      });

      if (!shouldLoadAutomation) {
        setAutomation({
          available: false,
          error: null,
          form: EMPTY_AUTOMATION_FORM,
          jobs: [],
          status: "idle",
        });
        return;
      }

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
          fetch("/api/content/automation/profile"),
          fetch("/api/content/automation/jobs"),
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
        profileConfigured: false,
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
    memberSessionEmail,
    updateMemberSession,
    view,
  ]);

  useEffect(() => {
    if (feedShareState !== "copied" && feedShareState !== "error") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFeedShareState("idle");
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [feedShareState]);

  useEffect(() => {
    const persona = state.profile.characterPersona;

    setIdentityLockDraft((current) => {
      if (current.personaId === (persona?.id ?? null)) {
        return current;
      }

      return {
        avoidChangesText: persona
          ? formatCharacterTraitText(persona.avoidChanges)
          : "",
        lockedTraitsText: persona
          ? formatCharacterTraitText(persona.lockedTraits)
          : "",
        personaId: persona?.id ?? null,
      };
    });
  }, [state.profile.characterPersona]);

  const copyCreatorFeedLink = useCallback(
    async (nextShareUrl = creatorFeedShareUrl) => {
      if (!nextShareUrl) {
        setFeedShareState("error");
        return false;
      }

      try {
        await navigator.clipboard.writeText(nextShareUrl);
        setFeedShareState("copied");
        return true;
      } catch {
        setFeedShareState("error");
        return false;
      }
    },
    [creatorFeedShareUrl],
  );

  const handleShareCreatorFeed = useCallback(async () => {
    if (!creatorFeedShareUrl) {
      setFeedShareState("error");
      return;
    }

    const nextShareId = createShareId("feed");
    const nextShareUrl = setShareIdOnHref(creatorFeedShareUrl, nextShareId);

    trackFunnelEvent("share_click", {
      metadata: {
        placement: "creator-studio",
        source: "creator-feed-share",
      },
      referralCode: state.member?.referralCode ?? null,
      shareId: nextShareId,
      targetHref: nextShareUrl,
    });

    if (typeof navigator.share === "function") {
      setFeedShareState("sharing");

      try {
        await navigator.share({
          text: feedShareCopy.description,
          title: feedShareCopy.title,
          url: nextShareUrl,
        });
        setFeedShareState("idle");
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          setFeedShareState("idle");
          return;
        }
      }
    }

    await copyCreatorFeedLink(nextShareUrl);
  }, [
    copyCreatorFeedLink,
    creatorFeedShareUrl,
    feedShareCopy.description,
    feedShareCopy.title,
    state.member?.referralCode,
  ]);

  useEffect(() => {
    if (isConnectionResolving) {
      return;
    }

    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        error: null,
        member: null,
        notice: null,
        posts: [],
        profile: EMPTY_PROFILE,
        profileConfigured: false,
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
  }, [accountAddress, isConnectionResolving, loadStudio, status]);

  async function resolveMemberEmail() {
    const email =
      memberSessionEmail ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!email) {
      throw new Error(dictionary.member.errors.missingEmail);
    }

    return email;
  }

  async function saveProfile(profileOverride?: StudioState["profile"]) {
    const profileToSave = profileOverride ?? state.profile;

    try {
      setIsSavingProfile(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile", {
        body: JSON.stringify({
          displayName: profileToSave.displayName,
          email,
          heroImageUrl: profileToSave.heroImageUrl || null,
          intro: profileToSave.intro,
          payoutWalletAddress: profileToSave.payoutWalletAddress || null,
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
        profile: createEditableCreatorProfile(data.profile),
        profileConfigured: data.profileConfigured,
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

  async function saveCharacterProfile(profileOverride: StudioState["profile"]) {
    if (!profileOverride.characterPersona) {
      const message =
        locale === "ko"
          ? "저장할 캐릭터 페르소나를 먼저 선택하세요."
          : "Select a character persona before saving.";

      setState((current) => ({
        ...current,
        error: message,
        notice: null,
      }));
      return;
    }

    try {
      setIsSavingProfile(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile/character", {
        body: JSON.stringify({
          avatarImageSet: profileOverride.avatarImageSet,
          avatarImageUrl: profileOverride.avatarImageUrl || null,
          characterMemory: profileOverride.characterMemory,
          characterPersona: profileOverride.characterPersona,
          characterTimeline: profileOverride.characterTimeline,
          displayName: profileOverride.displayName,
          email,
          intro: profileOverride.intro,
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
        notice:
          locale === "ko"
            ? "캐릭터 설정을 저장했습니다."
            : "Character settings saved.",
        profile: createEditableCreatorProfile(data.profile),
        profileConfigured: data.profileConfigured,
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

  async function createQuickCharacter() {
    try {
      setQuickCharacter((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile/character/quickstart", {
        body: JSON.stringify({
          ageRange:
            quickCharacter.ageRange === "auto" ? null : quickCharacter.ageRange,
          appearanceTone:
            quickCharacter.appearanceTone === "auto"
              ? null
              : quickCharacter.appearanceTone,
          displayName: state.profile.displayName,
          email,
          gender:
            quickCharacter.gender === "auto" ? null : quickCharacter.gender,
          intro: state.profile.intro,
          locale,
          style: quickCharacter.style,
          visualSilhouette:
            quickCharacter.visualSilhouette === "auto"
              ? null
              : quickCharacter.visualSilhouette,
          walletAddress: accountAddress,
          worldLocation: resolveFanletterWorldLocationSelection({
            persona: state.profile.characterPersona,
            selection: quickCharacter.worldLocationSelection,
          }),
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
            : locale === "ko"
              ? "캐릭터를 만들지 못했습니다."
              : "Failed to create the character.",
        );
      }

      setAvatarGeneration({
        candidates: data.profile.avatarImageSet,
        error: null,
        status: data.profile.avatarImageSet.length > 0 ? "ready" : "idle",
      });
      setPersonaGeneration((current) => ({
        ...current,
        candidates: [],
        error: null,
        status: "idle",
      }));
      setQuickCharacter((current) => ({
        ...current,
        error: null,
        status: "ready",
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice:
          data.characterWarning ??
          (locale === "ko"
            ? "캐릭터를 만들고 프로필에 저장했습니다."
            : "Character created and saved to your profile."),
        profile: createEditableCreatorProfile(data.profile),
        profileConfigured: data.profileConfigured,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "ko"
            ? "캐릭터를 만들지 못했습니다."
            : "Failed to create the character.";

      setQuickCharacter((current) => ({
        ...current,
        error: message,
        status: "error",
      }));
      setState((current) => ({
        ...current,
        error: message,
        notice: null,
      }));
    }
  }

  async function createSellerWallet(email?: string) {
    try {
      setIsCreatingSellerWallet(true);
      const resolvedEmail = email ?? (await resolveMemberEmail());
      const response = await fetch("/api/content/profile/payout-wallet", {
        body: JSON.stringify({
          email: resolvedEmail,
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
        notice:
          locale === "ko"
            ? "유료 판매용 thirdweb 정산 지갑을 준비했습니다."
            : "Seller wallet is ready for paid unlocks.",
        profile: createEditableCreatorProfile(data.profile),
        profileConfigured: data.profileConfigured,
      }));

      return data.profile.payoutWalletAddress ?? "";
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
      throw error;
    } finally {
      setIsCreatingSellerWallet(false);
    }
  }

  async function generateCharacterPersonaCandidates() {
    if (!personaGeneration.gender || !personaGeneration.ageRange) {
      const message =
        locale === "ko"
          ? "성별과 연령대를 먼저 선택하세요."
          : "Select gender and age range first.";

      setPersonaGeneration((current) => ({
        ...current,
        candidates: [],
        error: message,
        status: "error",
      }));
      return;
    }

    try {
      setPersonaGeneration((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile/personas", {
        body: JSON.stringify({
          appearanceTone:
            personaGeneration.appearanceTone === "auto"
              ? null
              : personaGeneration.appearanceTone,
          avatarImageUrl: state.profile.avatarImageUrl || null,
          displayName: state.profile.displayName,
          email,
          ageRange: personaGeneration.ageRange,
          gender: personaGeneration.gender,
          intro: state.profile.intro,
          locale,
          visualSilhouette:
            personaGeneration.visualSilhouette === "auto"
              ? null
              : personaGeneration.visualSilhouette,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | CreatorCharacterPersonaGenerateResponse
        | { error?: string };

      if (!response.ok || !("candidates" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : locale === "ko"
              ? "인물 페르소나 후보를 만들지 못했습니다."
              : "Failed to generate character personas.",
        );
      }

      setPersonaGeneration({
        ageRange: personaGeneration.ageRange,
        appearanceTone: personaGeneration.appearanceTone,
        candidates: data.candidates,
        error: null,
        gender: personaGeneration.gender,
        status: "ready",
        visualSilhouette: personaGeneration.visualSilhouette,
      });
      setState((current) => ({
        ...current,
        error: null,
        notice:
          locale === "ko"
            ? "인물 페르소나 후보를 만들었습니다. 하나를 선택하면 바로 저장됩니다."
            : "Character persona candidates are ready. Select one to save it.",
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "ko"
            ? "인물 페르소나 후보를 만들지 못했습니다."
            : "Failed to generate character personas.";

      setPersonaGeneration({
        ageRange: personaGeneration.ageRange,
        appearanceTone: personaGeneration.appearanceTone,
        candidates: [],
        error: message,
        gender: personaGeneration.gender,
        status: "error",
        visualSilhouette: personaGeneration.visualSilhouette,
      });
      setState((current) => ({
        ...current,
        error: message,
        notice: null,
      }));
    }
  }

  async function saveCharacterPersona(persona: CreatorCharacterPersona) {
    const nextPersona = preserveCreatorWorldLocation(
      persona,
      state.profile.characterPersona,
    );
    const nextProfile = {
      ...state.profile,
      avatarImageSet: [],
      avatarImageUrl: "",
      characterPersona: nextPersona,
    };

    setAvatarGeneration({
      candidates: [],
      error: null,
      status: "idle",
    });
    setState((current) => ({
      ...current,
      profile: nextProfile,
    }));
    await saveCharacterProfile(nextProfile);
  }

  function updateCharacterWorldLocation(
    patch: Partial<CreatorCharacterWorldLocation>,
  ) {
    setState((current) => {
      const persona = current.profile.characterPersona;

      if (!persona) {
        return current;
      }

      const currentLocation = resolveCreatorWorldLocationDraft(persona);
      const nextLocation = {
        ...currentLocation,
        ...patch,
      };

      return {
        ...current,
        profile: {
          ...current.profile,
          characterPersona: applyCreatorWorldLocationDraft(
            persona,
            nextLocation,
          ),
        },
      };
    });
  }

  async function saveCharacterWorldLocation() {
    const persona = state.profile.characterPersona;

    if (!persona) {
      return;
    }

    const normalizedLocation = normalizeCreatorCharacterWorldLocation(
      persona.realismProfile?.worldLocation,
    );

    if (!normalizedLocation) {
      setState((current) => ({
        ...current,
        error:
          locale === "ko"
            ? "도시, 국가 코드, 시간대, 위도, 경도를 올바르게 입력하세요."
            : "Enter a valid city, country code, timezone, latitude, and longitude.",
        notice: null,
      }));
      return;
    }

    const nextProfile = {
      ...state.profile,
      characterPersona: applyCreatorWorldLocation(persona, normalizedLocation),
    };

    setState((current) => ({
      ...current,
      profile: nextProfile,
    }));
    await saveCharacterProfile(nextProfile);
  }

  function updateCharacterPersonaDraft(patch: Partial<CreatorCharacterPersona>) {
    setState((current) => {
      const persona = current.profile.characterPersona;

      if (!persona) {
        return current;
      }

      return {
        ...current,
        profile: {
          ...current.profile,
          characterPersona: {
            ...persona,
            ...patch,
          },
        },
      };
    });
  }

  async function saveCharacterIdentityLock() {
    const persona = state.profile.characterPersona;

    if (!persona) {
      return;
    }

    const nextPersona = {
      ...persona,
      avoidChanges: parseCharacterTraitText(
        identityLockDraft.personaId === persona.id
          ? identityLockDraft.avoidChangesText
          : formatCharacterTraitText(persona.avoidChanges),
      ),
      identityPrompt: normalizeCharacterStudioText(
        persona.identityPrompt,
        CHARACTER_IDENTITY_PROMPT_LIMIT,
      ),
      lockedTraits: parseCharacterTraitText(
        identityLockDraft.personaId === persona.id
          ? identityLockDraft.lockedTraitsText
          : formatCharacterTraitText(persona.lockedTraits),
      ),
      name: normalizeCharacterStudioText(
        persona.name,
        CHARACTER_IDENTITY_NAME_LIMIT,
      ),
      summary: normalizeCharacterStudioText(
        persona.summary,
        CHARACTER_IDENTITY_SUMMARY_LIMIT,
      ),
    };

    if (!nextPersona.name || !nextPersona.identityPrompt) {
      setState((current) => ({
        ...current,
        error:
          locale === "ko"
            ? "캐릭터 이름과 정체성 프롬프트를 입력하세요."
            : "Enter a character name and identity prompt.",
        notice: null,
      }));
      return;
    }

    const nextProfile = {
      ...state.profile,
      characterPersona: nextPersona,
    };

    setState((current) => ({
      ...current,
      profile: nextProfile,
    }));
    setIdentityLockDraft({
      avoidChangesText: formatCharacterTraitText(nextPersona.avoidChanges),
      lockedTraitsText: formatCharacterTraitText(nextPersona.lockedTraits),
      personaId: nextPersona.id,
    });
    await saveCharacterProfile(nextProfile);
  }

  async function saveCharacterMemoryEntry() {
    const persona = state.profile.characterPersona;

    if (!persona) {
      return;
    }

    const title = normalizeCharacterStudioText(
      characterMemoryForm.title,
      CHARACTER_MEMORY_TITLE_LIMIT,
    );
    const body = normalizeCharacterStudioText(
      characterMemoryForm.body,
      CHARACTER_MEMORY_BODY_LIMIT,
    );

    if (!title || !body) {
      setState((current) => ({
        ...current,
        error:
          locale === "ko"
            ? "기록 제목과 내용을 입력하세요."
            : "Enter a memory title and body.",
        notice: null,
      }));
      return;
    }

    const now = new Date().toISOString();
    const nextMemory: CreatorCharacterMemoryEntry = {
      body,
      createdAt: now,
      id: createCharacterStudioRecordId("memory"),
      source: "manual",
      status: "confirmed",
      title,
      updatedAt: now,
    };
    const nextProfile = {
      ...state.profile,
      characterMemory: [
        nextMemory,
        ...state.profile.characterMemory,
      ].slice(0, CHARACTER_MEMORY_LIMIT),
    };

    setCharacterMemoryForm({ body: "", title: "" });
    setState((current) => ({
      ...current,
      profile: nextProfile,
    }));
    await saveCharacterProfile(nextProfile);
  }

  async function removeCharacterMemoryEntry(memoryId: string) {
    const nextProfile = {
      ...state.profile,
      characterMemory: state.profile.characterMemory.filter(
        (entry) => entry.id !== memoryId,
      ),
    };

    setState((current) => ({
      ...current,
      profile: nextProfile,
    }));
    await saveCharacterProfile(nextProfile);
  }

  async function generateProfileAvatarCandidates() {
    if (!state.profile.characterPersona) {
      const message =
        locale === "ko"
          ? "먼저 인물 페르소나를 선택하세요."
          : "Select a character persona first.";

      setAvatarGeneration({
        candidates: [],
        error: message,
        status: "error",
      });
      return;
    }

    try {
      setAvatarGeneration((current) => ({
        ...current,
        candidates: [],
        error: null,
        status: "loading",
      }));
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile/avatar-candidates", {
        body: JSON.stringify({
          characterPersona: state.profile.characterPersona,
          displayName: state.profile.displayName,
          email,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const fallbackMessage =
        locale === "ko"
          ? "AI 아바타 후보를 만들지 못했습니다."
          : "Failed to generate avatar candidates.";
      const data = await readApiJson<CreatorProfileAvatarGenerateResponse>(
        response,
        fallbackMessage,
      );

      if (!response.ok || !("candidates" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : fallbackMessage,
        );
      }

      setAvatarGeneration({
        candidates: data.candidates,
        error: null,
        status: "ready",
      });
      setState((current) => ({
        ...current,
        error: null,
        notice:
          locale === "ko"
            ? "AI 아바타 표정 세트를 만들었습니다. 대표 이미지를 선택하면 프로필에 저장됩니다."
            : "AI avatar expression set is ready. Select a representative image to save it to your profile.",
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "ko"
            ? "AI 아바타 후보를 만들지 못했습니다."
            : "Failed to generate avatar candidates.";

      setAvatarGeneration({
        candidates: [],
        error: message,
        status: "error",
      });
      setState((current) => ({
        ...current,
        error: message,
        notice: null,
      }));
    }
  }

  async function saveGeneratedProfileAvatar(
    candidate: CreatorProfileAvatarCandidate,
  ) {
    const avatarImageSet =
      avatarGeneration.candidates.length > 0
        ? avatarGeneration.candidates
        : state.profile.avatarImageSet;
    const nextProfile = {
      ...state.profile,
      avatarImageSet,
      avatarImageUrl: candidate.url,
    };

    setState((current) => ({
      ...current,
      profile: nextProfile,
    }));
    await saveCharacterProfile(nextProfile);
  }

  function updatePaidUploadPreviewText(value: string) {
    setPostForm((current) => ({
      ...current,
      previewText: value,
    }));

    if (value.trim() && state.error === paidUploadPreviewRequiredMessage) {
      setState((current) => ({
        ...current,
        error: null,
      }));
    }
  }

  async function createPost(statusToSave: "draft" | "published") {
    const normalizedBody = postForm.body.trim();

    if (isPaidUploadRequestBlocked) {
      setState((current) => ({
        ...current,
        error: paidUploadRequestBlockMessage,
        notice: null,
      }));
      return;
    }

    if (!normalizedBody) {
      setPostBodyError(postBodyRequiredMessage);
      setState((current) => ({
        ...current,
        error: current.error === SERVER_BODY_REQUIRED_ERROR ? null : current.error,
        notice: null,
      }));
      return;
    }

    if (isPaidUploadComposer && !hasUploadedPostVideo) {
      setState((current) => ({
        ...current,
        error: paidUploadRequiredMessage,
        notice: null,
      }));
      return;
    }

    if (
      statusToSave === "published" &&
      isPaidUploadComposer &&
      !postForm.previewText.trim()
    ) {
      setState((current) => ({
        ...current,
        error: paidUploadPreviewRequiredMessage,
        notice: null,
      }));
      return;
    }

    if (statusToSave === "published" && !hasRequiredPostMedia) {
      setState((current) => ({
        ...current,
        error: requiredPostMediaMessage,
        notice: null,
      }));
      return;
    }

    try {
      setIsSavingPost(true);
      setSavingPostStatus(statusToSave);
      setPostBodyError(null);
      const fallbackTitle =
        normalizedBody
          .split("\n")
          .find((line) => line.trim())
          ?.trim()
          .slice(0, 72) || contentCopy.actions.createPost;
      const fallbackSummary = normalizedBody.replace(/\s+/g, " ").slice(0, 140);
      const email = await resolveMemberEmail();
      const priceTypeToSave: ContentPriceType = isPaidUploadComposer
        ? "paid"
        : effectivePostPriceType;
      let coverImageUrlToSave = postForm.coverImageUrl || null;

      if (priceTypeToSave === "paid" && !state.profile.payoutWalletAddress) {
        await createSellerWallet(email);
      }

      if (
        statusToSave === "published" &&
        priceTypeToSave === "paid" &&
        hasUploadedPostVideo &&
        !coverImageUrlToSave
      ) {
        setState((current) => ({
          ...current,
          error: null,
          notice: paidUploadComposerCopy.publishCoverGenerating,
        }));

        try {
          coverImageUrlToSave =
            await generatePaidVideoFrameCoverFromUploadedVideo({
              successNotice: paidUploadComposerCopy.frameCoverReady,
              throwOnError: true,
            });
        } catch {
          setIsCoverGenerationDialogOpen(true);
          setState((current) => ({
            ...current,
            error: null,
            notice: paidUploadComposerCopy.frameCoverFailed,
          }));
          const generatedCover = await generatePostCoverImage({
            failureNotice: paidUploadComposerCopy.publishCoverFailed,
            successNotice: paidUploadComposerCopy.autoCoverReady,
            throwOnError: true,
            visualBrief: buildPaidUploadTeaserVisualBrief(),
          });

          coverImageUrlToSave = generatedCover?.url ?? null;
        }

        if (!coverImageUrlToSave) {
          throw new Error(paidUploadComposerCopy.publishCoverFailed);
        }
      }

      if (
        statusToSave === "published" &&
        priceTypeToSave === "free" &&
        hasGeneratedPostVideo &&
        !coverImageUrlToSave
      ) {
        try {
          setState((current) => ({
            ...current,
            error: null,
            notice:
              locale === "ko"
                ? "AI 동영상에서 공개 티저 이미지를 준비하고 있습니다."
                : "Preparing a public teaser image from the AI video.",
          }));
          const generatedVideoUrlForCover =
            postForm.contentVideoUrls[0] ??
            postForm.generatedContentVideoUrls[0] ??
            "";
          const frameCoverFile = await captureVideoCoverFrameFromUrl(
            generatedVideoUrlForCover,
            postForm.title.trim() || fallbackTitle || "ai-content-video",
          );
          const uploadedCover = await uploadPostCoverImage(frameCoverFile, {
            successNotice:
              locale === "ko"
                ? "AI 동영상 티저 이미지가 자동 적용되었습니다."
                : "The AI video teaser image has been applied automatically.",
            throwOnError: true,
          });

          coverImageUrlToSave = uploadedCover?.url ?? null;
        } catch {
          coverImageUrlToSave = null;
        }
      }

      const response = await fetch("/api/content/posts", {
        body: JSON.stringify({
          body: normalizedBody,
          contentImageUrls: postForm.contentImageUrls,
          contentVideoUrls: postForm.contentVideoUrls,
          coverImageUrl: coverImageUrlToSave,
          email,
          fanRequestId: priceTypeToSave === "paid" ? initialFanRequestId : null,
          locale,
          previewText:
            priceTypeToSave === "paid"
              ? postForm.previewText.trim() ||
                postForm.summary.trim() ||
                fallbackSummary
              : null,
          priceType: priceTypeToSave,
          priceUsdt:
            priceTypeToSave === "paid" ? CONTENT_PAID_USDT_AMOUNT : null,
          status: statusToSave,
          summary: postForm.summary.trim() || fallbackSummary,
          title: postForm.title.trim() || fallbackTitle,
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

      if (initialFanRequestId) {
        const fanRequestResponse = await fetch("/api/fanletter/requests", {
          body: JSON.stringify({
            contentId:
              statusToSave === "published" ? data.content.contentId : null,
            email,
            requestId: initialFanRequestId,
            status: statusToSave === "published" ? "used" : "reviewed",
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const fanRequestData =
          (await fanRequestResponse.json()) as
            | FanletterFanRequestStatusUpdateResponse
            | { error?: string };

        if (!fanRequestResponse.ok || !("request" in fanRequestData)) {
          throw new Error(
            "error" in fanRequestData && fanRequestData.error
              ? fanRequestData.error
              : locale === "ko"
                ? "콘텐츠는 저장됐지만 팬 요청 상태를 갱신하지 못했습니다."
                : "The content was saved, but the fan request status could not be updated.",
          );
        }
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
      setSavingPostStatus(null);
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

  async function uploadPostCoverImage(
    file: File,
    options: {
      successNotice?: string;
      throwOnError?: boolean;
    } = {},
  ) {
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
        notice: options.successNotice ?? contentCopy.messages.uploadSuccess,
      }));
      return data;
    } catch (error) {
      if (options.throwOnError) {
        throw error;
      }

      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
      return null;
    } finally {
      setIsUploadingPostImage(false);
    }
  }

  async function generatePaidVideoFrameCoverFromUploadedVideo(
    options: {
      failureNotice?: string;
      successNotice?: string;
      throwOnError?: boolean;
    } = {},
  ) {
    try {
      const videoUrl = postForm.contentVideoUrls[0];

      if (!videoUrl) {
        throw new Error(
          locale === "ko"
            ? "커버를 만들 유료 동영상을 찾지 못했습니다."
            : "Could not find the paid video to create a cover from.",
        );
      }

      setIsGeneratingPaidVideoFrameCover(true);
      setState((current) => ({
        ...current,
        error: null,
        notice: paidUploadComposerCopy.frameCoverGenerating,
      }));

      const frameCoverFile = await captureVideoCoverFrameFromUrl(
        videoUrl,
        postForm.title.trim() || "paid-video",
      );
      const uploadedCover = await uploadPostCoverImage(frameCoverFile, {
        successNotice:
          options.successNotice ?? paidUploadComposerCopy.frameCoverReady,
        throwOnError: true,
      });

      if (!uploadedCover?.url) {
        throw new Error(
          options.failureNotice ?? paidUploadComposerCopy.frameCoverRetryFailed,
        );
      }

      return uploadedCover.url;
    } catch (error) {
      if (options.throwOnError) {
        throw error;
      }

      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : options.failureNotice ??
              paidUploadComposerCopy.frameCoverRetryFailed,
        notice: null,
      }));

      return null;
    } finally {
      setIsGeneratingPaidVideoFrameCover(false);
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

  async function uploadPostVideo(file: File) {
    try {
      if (postForm.contentVideoUrls.length >= CONTENT_VIDEO_LIMIT) {
        throw new Error(
          locale === "ko"
            ? "콘텐츠 동영상은 1개까지 업로드할 수 있습니다."
            : "You can upload one content video.",
        );
      }

      if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
        throw new Error(
          locale === "ko"
            ? "MP4, MOV, WEBM 동영상만 업로드할 수 있습니다."
            : "Only MP4, MOV, and WEBM videos are supported.",
        );
      }

      if (file.size > CONTENT_VIDEO_MAX_BYTES) {
        throw new Error(
          locale === "ko"
            ? "동영상은 200MB 이하로 업로드해주세요."
            : "Video must be 200MB or smaller.",
        );
      }

      const email = await resolveMemberEmail();
      const uploadReferralCode = state.member?.referralCode;
      const shouldCreatePaidVideoCover =
        isPaidUploadComposer && !postForm.coverImageUrl.trim();

      if (!uploadReferralCode) {
        throw new Error(
          locale === "ko"
            ? "회원 추천 코드를 확인하지 못했습니다."
            : "Could not find the member referral code.",
        );
      }

      setIsUploadingPostVideo(true);
      setPostVideoUploadProgress(0);

      const pathname = [
        "content-posts",
        uploadReferralCode,
        "videos",
        `${Date.now()}-${sanitizeUploadBaseName(file.name)}${resolveVideoExtension(file)}`,
      ].join("/");
      const uploaded = await uploadBlob(pathname, file, {
        access: "public",
        clientPayload: JSON.stringify({
          email,
          walletAddress: accountAddress ?? "",
        }),
        contentType: file.type,
        handleUploadUrl: "/api/content/posts/video-upload",
        multipart: true,
        onUploadProgress: (progress) => {
          setPostVideoUploadProgress(progress.percentage);
        },
      });

      setPostForm((current) => ({
        ...current,
        contentVideoUrls: [uploaded.url].slice(0, CONTENT_VIDEO_LIMIT),
        generatedContentVideoUrls: [],
        priceType: "paid",
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice:
          locale === "ko"
            ? "동영상을 업로드했습니다. 업로드 동영상은 유료 콘텐츠로 저장됩니다."
            : "Video uploaded. Uploaded videos are saved as paid content.",
      }));

      setIsUploadingPostVideo(false);

      if (shouldCreatePaidVideoCover) {
        setState((current) => ({
          ...current,
          error: null,
          notice: paidUploadComposerCopy.frameCoverGenerating,
        }));

        try {
          const frameCoverFile = await captureVideoCoverFrame(file);

          await uploadPostCoverImage(frameCoverFile, {
            successNotice: paidUploadComposerCopy.frameCoverReady,
            throwOnError: true,
          });
        } catch {
          setIsCoverGenerationDialogOpen(true);
          setState((current) => ({
            ...current,
            error: null,
            notice: paidUploadComposerCopy.frameCoverFailed,
          }));
          await generatePostCoverImage({
            failureNotice: paidUploadComposerCopy.autoCoverFailed,
            softFail: true,
            successNotice: paidUploadComposerCopy.autoCoverReady,
            visualBrief: buildPaidUploadTeaserVisualBrief({
              fileName: file.name,
            }),
          });
        }
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : locale === "ko"
              ? "동영상 업로드에 실패했습니다."
              : "Failed to upload video.",
        notice: null,
      }));
    } finally {
      setIsUploadingPostVideo(false);
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

  function buildPaidUploadTeaserVisualBrief({
    fileName,
    style = paidTeaserCoverStyle,
  }: {
    fileName?: string;
    style?: PaidTeaserCoverStyle;
  } = {}) {
    const characterName =
      state.profile.characterPersona?.name ||
      state.profile.displayName ||
      initialFanRequestCharacterName ||
      "";
    const fanRequestContext = initialFanRequestBody?.slice(0, 180) ?? "";
    const fileContext = fileName?.trim().slice(0, 80) ?? "";
    const stylePrompt =
      paidTeaserCoverStyles.find((coverStyle) => coverStyle.id === style)
        ?.prompt ?? paidTeaserCoverStyles[0]?.prompt;

    return [
      "FanLetter paid video public teaser cover for a locked 1 USDT fan-only vlog.",
      "Create curiosity before payment without revealing the full paid content.",
      stylePrompt,
      characterName
        ? `Keep the AI character mood consistent with: ${characterName}.`
        : null,
      fanRequestContext
        ? `Use this fan request only as subtle context: ${fanRequestContext}.`
        : null,
      fileContext ? `Uploaded video filename context: ${fileContext}.` : null,
      "Safe-for-work only: no nudity, sexual framing, private body focus, gore, weapons, minors, or explicit scenes.",
      "Do not include text, letters, numbers, logos, watermarks, UI, price labels, or payment icons.",
      "Use cinematic lighting, one clear focal subject, tasteful negative space, and a premium vertical-vlog teaser mood.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function startPaidTeaserCoverGeneration(style = paidTeaserCoverStyle) {
    setPaidTeaserCoverStyle(style);
    setIsCoverGenerationDialogOpen(true);
    setState((current) => ({
      ...current,
      error: null,
      notice: paidUploadComposerCopy.autoCoverGenerating,
    }));
    void generatePostCoverImage({
      failureNotice: paidUploadComposerCopy.autoCoverFailed,
      softFail: true,
      successNotice: paidUploadComposerCopy.autoCoverReady,
      visualBrief: buildPaidUploadTeaserVisualBrief({ style }),
    });
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

  function openContentVideoGenerationDialog() {
    setContentVideoGenerationProgress(createEmptyCoverGenerationProgress());
    setContentVideoPrompt("");
    setIsContentVideoGenerationDialogOpen(true);
  }

  function closeContentVideoGenerationDialog() {
    if (isGeneratingPostImage) {
      return;
    }

    setIsContentVideoGenerationDialogOpen(false);
    setContentVideoPrompt("");
    setContentVideoGenerationProgress(createEmptyCoverGenerationProgress());
  }

  async function generatePostCoverImage(
    options: GeneratePostCoverImageOptions = {},
  ) {
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
          visualBrief: options.visualBrief ?? contentImagePrompt,
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
        notice: options.successNotice ?? contentCopy.messages.imageGenerated,
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

      return generatedCover;
    } catch (error) {
      const errorMessage = getGenerationErrorMessage(
        error,
        contentCopy.messages.uploadFailed,
      );

      setState((current) => ({
        ...current,
        error: options.softFail ? null : errorMessage,
        notice: options.softFail
          ? options.failureNotice ?? errorMessage
          : null,
      }));
      setCoverGenerationProgress((current) =>
        applyCoverGenerationFailure(current, errorMessage),
      );

      if (options.throwOnError) {
        throw new Error(errorMessage);
      }

      return null;
    } finally {
      setIsGeneratingPostImage(false);
    }
  }

  async function generatePostContentImage() {
    try {
      if (!contentImagePrompt.trim()) {
        throw new Error(
          locale === "ko"
            ? "AI 콘텐츠 이미지를 생성하려면 만들 이미지 설명을 입력하세요."
            : "Enter an image description to generate an AI content image.",
        );
      }

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
            ? "AI 콘텐츠 이미지를 생성해 콘텐츠 이미지 목록에 추가했습니다."
            : "Generated an AI content image and added it to content images.",
      }));
      setContentImageGenerationProgress((current) => ({
        ...current,
        active: false,
        currentStep: "finalizing",
        error: null,
        message:
          locale === "ko"
            ? "콘텐츠 이미지 목록에 AI 이미지를 추가했습니다."
            : "The AI image has been added to content images.",
        progress: 100,
        response: generatedImage,
        steps: {
          ...current.steps,
          finalizing: "done",
        },
      }));
    } catch (error) {
      const errorMessage = getGenerationErrorMessage(
        error,
        contentCopy.messages.uploadFailed,
      );

      setState((current) => ({
        ...current,
        error: errorMessage,
        notice: null,
      }));
      setContentImageGenerationProgress((current) =>
        applyCoverGenerationFailure(current, errorMessage),
      );
    } finally {
      setIsGeneratingPostImage(false);
    }
  }

  async function generatePostContentVideo() {
    const videoGenerationFailedMessage =
      locale === "ko"
        ? "AI 콘텐츠 동영상 생성에 실패했습니다."
        : "Failed to generate the AI content video.";
    let failureDiagnostic: ContentGenerationFailureDiagnostic | null = null;

    try {
      if (!contentVideoPrompt.trim()) {
        throw new Error(
          locale === "ko"
            ? "AI 콘텐츠 동영상을 생성하려면 동영상 프롬프트를 입력하세요."
            : "Enter a video prompt to generate an AI content video.",
        );
      }

      if (postForm.contentVideoUrls.length >= CONTENT_VIDEO_LIMIT) {
        throw new Error(
          locale === "ko"
            ? "콘텐츠 동영상은 최대 1개까지 추가할 수 있습니다."
            : "You can add one content video.",
        );
      }

      setIsGeneratingPostImage(true);
      setContentVideoGenerationProgress({
        ...createEmptyCoverGenerationProgress(),
        active: true,
        currentStep: "authorizing",
        message: contentVideoGenerationLabels.authorizing.description,
        progress: 4,
        steps: {
          ...createEmptyCoverGenerationProgress().steps,
          authorizing: "active",
        },
      });
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/posts/generate-content-video", {
        body: JSON.stringify({
          email,
          locale,
          summary: postForm.summary,
          title: postForm.title,
          visualBrief: contentVideoPrompt,
          walletAddress: accountAddress,
        }),
        headers: {
          Accept: "application/x-ndjson",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      let data: ContentPostGenerateCoverResponse | null = null;
      let streamDiagnostic: ContentGenerationFailureDiagnostic | null = null;
      let streamError: string | null = null;

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | {
              diagnostic?: ContentGenerationFailureDiagnostic | null;
              error?: string;
            }
          | null;

        failureDiagnostic = payload?.diagnostic ?? null;
        throw new Error(payload?.error || videoGenerationFailedMessage);
      }

      if (
        response.headers
          .get("content-type")
          ?.includes("application/x-ndjson")
      ) {
        await readCoverGenerationStream(response, (event) => {
          setContentVideoGenerationProgress((current) =>
            applyCoverGenerationProgressEvent(current, event),
          );

          if (event.type === "result") {
            data = event.response;
            return;
          }

          if (event.type === "error") {
            streamDiagnostic = event.diagnostic ?? null;
            streamError = event.error;
          }
        });
      } else {
        const payload = (await response.json()) as
          | ContentPostGenerateCoverResponse
          | {
              diagnostic?: ContentGenerationFailureDiagnostic | null;
              error?: string;
            };

        if (!("url" in payload)) {
          failureDiagnostic = payload.diagnostic ?? null;
          throw new Error(payload.error || videoGenerationFailedMessage);
        }

        data = payload;
      }

      if (!data) {
        failureDiagnostic = streamDiagnostic;
        throw new Error(streamError || videoGenerationFailedMessage);
      }

      const generatedVideo = data;
      let generatedVideoCoverReady = false;

      setPostForm((current) => ({
        ...current,
        contentVideoUrls: [generatedVideo.url].slice(0, CONTENT_VIDEO_LIMIT),
        generatedContentVideoUrls: [generatedVideo.url],
        priceType: "free",
      }));

      if (!postForm.coverImageUrl.trim()) {
        try {
          setContentVideoGenerationProgress((current) => ({
            ...current,
            currentStep: "finalizing",
            message:
              locale === "ko"
                ? "AI 동영상에서 공개 티저 이미지를 준비하고 있습니다."
                : "Preparing a public teaser image from the AI video.",
            progress: Math.max(current.progress, 96),
          }));
          const frameCoverFile = await captureVideoCoverFrameFromUrl(
            generatedVideo.url,
            postForm.title.trim() || "ai-content-video",
          );

          await uploadPostCoverImage(frameCoverFile, {
            successNotice:
              locale === "ko"
                ? "AI 동영상 티저 이미지가 자동 적용되었습니다."
                : "The AI video teaser image has been applied automatically.",
            throwOnError: true,
          });
          generatedVideoCoverReady = true;
        } catch {
          generatedVideoCoverReady = false;
        }
      }

      setState((current) => ({
        ...current,
        error: null,
        notice:
          locale === "ko"
            ? generatedVideoCoverReady
              ? "AI 콘텐츠 동영상과 공개 티저 이미지를 자동 적용했습니다."
              : "AI 콘텐츠 동영상을 생성해 무료 공개 동영상으로 추가했습니다."
            : generatedVideoCoverReady
              ? "Generated the AI content video and applied a public teaser image."
              : "Generated an AI content video and added it as free public content.",
      }));
      setContentVideoGenerationProgress((current) => ({
        ...current,
        active: false,
        currentStep: "finalizing",
        diagnostic: null,
        error: null,
        message:
          locale === "ko"
            ? "콘텐츠 동영상 슬롯에 AI 동영상을 추가했습니다."
            : "The AI video has been added to the content video slot.",
        progress: 100,
        response: generatedVideo,
        steps: {
          ...current.steps,
          finalizing: "done",
        },
      }));
    } catch (error) {
      const errorMessage = getGenerationErrorMessage(
        error,
        videoGenerationFailedMessage,
      );

      setState((current) => ({
        ...current,
        error: errorMessage,
        notice: null,
      }));
      setContentVideoGenerationProgress((current) =>
        applyCoverGenerationFailure(
          current,
          errorMessage,
          "generating_image",
          failureDiagnostic,
        ),
      );
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
    if (isPaidUploadRequestBlocked) {
      return (
        <MessageCard tone="fanletter">
          <span>{paidUploadRequestBlockMessage}</span>
          <Link
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
            href={fanRequestsHref}
          >
            {paidUploadComposerCopy.requestRequiredCta}
          </Link>
        </MessageCard>
      );
    }

    if (isFanletterPaidUpload && isConnectionResolving) {
      return (
        <MessageCard tone="fanletter">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            {paidUploadComposerCopy.loadingStatus}
          </span>
        </MessageCard>
      );
    }

    if (isConnectionResolving) {
      return (
        <MessageCard tone={isFanletterPaidUpload ? "fanletter" : "neutral"}>
          {contentCopy.messages.postsLoading}
        </MessageCard>
      );
    }

    if (isDisconnected) {
      if (isFanletterPaidUpload) {
        return (
          <MessageCard tone="fanletter">
            <span className="block text-base font-semibold text-white">
              {paidUploadComposerCopy.connectTitle}
            </span>
            <span className="mt-1 block text-sm leading-6 text-[#d8ffe0]/72">
              {paidUploadComposerCopy.connectDescription}
            </span>
            <Link
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
              href={connectHref}
            >
              {paidUploadComposerCopy.connectCta}
            </Link>
          </MessageCard>
        );
      }

      return (
        <MessageCard tone={isFanletterPaidUpload ? "fanletter" : "neutral"}>
          <span>{contentCopy.messages.connectRequired}</span>
          <Link
            className={cn(
              "mt-3 inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
              isFanletterPaidUpload
                ? "bg-[#44f26e] !text-black hover:bg-[#64ff84]"
                : "bg-slate-950 !text-white hover:bg-slate-800",
            )}
            href={connectHref}
          >
            {isPaidUploadComposer
              ? paidUploadComposerCopy.connectCta
              : dictionary.common.connectWallet}
          </Link>
        </MessageCard>
      );
    }

    if (state.status === "loading" && !state.member) {
      if (isFanletterPaidUpload) {
        return (
          <MessageCard tone="fanletter">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" />
              {paidUploadComposerCopy.loadingStatus}
            </span>
          </MessageCard>
        );
      }

      return (
        <MessageCard tone={isFanletterPaidUpload ? "fanletter" : "neutral"}>
          {contentCopy.actions.refresh}...
        </MessageCard>
      );
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

  function renderCharacterPersonaPanel() {
    const selectedPersona = state.profile.characterPersona;
    const isGenerating = personaGeneration.status === "loading";
    const personaCopy =
      locale === "ko"
        ? {
            apply: "선택하고 저장",
            applied: "적용 중",
            age20s: "20대",
            age30s: "30대",
            age40s: "40대",
            age50sPlus: "50대+",
            ageLabel: "연령대",
            appearanceAfricanDiaspora: "아프리카계 인상",
            appearanceAuto: "자동 추천",
            appearanceEastAsian: "동아시아계 인상",
            appearanceHint:
              "선택 사항입니다. 선택하면 얼굴, 피부톤, 헤어 인상을 더 안정적으로 맞춥니다.",
            appearanceLabel: "외형 톤",
            appearanceLatin: "라틴계 인상",
            appearanceMiddleEastern: "중동/지중해계 인상",
            appearanceSouthAsian: "남아시아계 인상",
            appearanceWestern: "서구권 인상",
            avoid: "변경 금지",
            body:
              "인물만 고정하는 페르소나를 선택하면 AI 이미지와 동영상 생성에서 같은 인물을 더 강하게 유지합니다.",
            clear: "변경 페이지에서 재설정",
            female: "여성",
            generate: "AI가 페르소나 추천",
            generating: "추천 생성 중...",
            genderLabel: "성별",
            locked: "고정 특징",
            male: "남성",
            requiredHint: "성별과 연령대를 선택하면 추천을 시작할 수 있습니다.",
            selectedTitle: "현재 인물 페르소나",
            silhouetteAthletic: "활동적인",
            silhouetteAuto: "자동 추천",
            silhouetteBalanced: "균형형",
            silhouetteElegant: "우아한",
            silhouetteHint:
              "신체 부위 강조가 아니라 자세와 전체 프레임을 일정하게 유지하는 제작 기준입니다.",
            silhouetteLabel: "중립 실루엣",
            silhouetteSlender: "날렵한",
            silhouetteSoft: "부드러운",
            title: "인물 페르소나",
          }
        : {
            apply: "Select and save",
            applied: "Applied",
            age20s: "20s",
            age30s: "30s",
            age40s: "40s",
            age50sPlus: "50s+",
            ageLabel: "Age range",
            appearanceAfricanDiaspora: "African diaspora",
            appearanceAuto: "Auto",
            appearanceEastAsian: "East Asian",
            appearanceHint:
              "Optional. Use it to keep face, skin tone, and hair impression more stable.",
            appearanceLabel: "Appearance tone",
            appearanceLatin: "Latin",
            appearanceMiddleEastern: "Middle Eastern / Mediterranean",
            appearanceSouthAsian: "South Asian",
            appearanceWestern: "Western",
            avoid: "Do not change",
            body:
              "Choose a character-only persona to keep the same person stronger in AI image and video generation.",
            clear: "Change on this page",
            female: "Female",
            generate: "Suggest personas",
            generating: "Generating...",
            genderLabel: "Gender",
            locked: "Locked traits",
            male: "Male",
            requiredHint: "Select gender and age range to start suggestions.",
            selectedTitle: "Current character persona",
            silhouetteAthletic: "Athletic",
            silhouetteAuto: "Auto",
            silhouetteBalanced: "Balanced",
            silhouetteElegant: "Elegant",
            silhouetteHint:
              "A production cue for posture and overall frame consistency, not body-part emphasis.",
            silhouetteLabel: "Neutral silhouette",
            silhouetteSlender: "Slender",
            silhouetteSoft: "Soft",
            title: "Character persona",
          };
    const personaGenderOptions = [
      { label: personaCopy.female, value: "female" as const },
      { label: personaCopy.male, value: "male" as const },
    ];
    const personaAgeRangeOptions = [
      { label: personaCopy.age20s, value: "20s" as const },
      { label: personaCopy.age30s, value: "30s" as const },
      { label: personaCopy.age40s, value: "40s" as const },
      { label: personaCopy.age50sPlus, value: "50s_plus" as const },
    ];
    const personaAppearanceToneOptions = [
      { label: personaCopy.appearanceAuto, value: "auto" as const },
      { label: personaCopy.appearanceEastAsian, value: "east_asian" as const },
      { label: personaCopy.appearanceWestern, value: "western" as const },
      { label: personaCopy.appearanceLatin, value: "latin" as const },
      {
        label: personaCopy.appearanceSouthAsian,
        value: "south_asian" as const,
      },
      {
        label: personaCopy.appearanceMiddleEastern,
        value: "middle_eastern_mediterranean" as const,
      },
      {
        label: personaCopy.appearanceAfricanDiaspora,
        value: "african_diaspora" as const,
      },
    ];
    const personaVisualSilhouetteOptions = [
      { label: personaCopy.silhouetteAuto, value: "auto" as const },
      { label: personaCopy.silhouetteBalanced, value: "balanced" as const },
      { label: personaCopy.silhouetteElegant, value: "elegant" as const },
      { label: personaCopy.silhouetteAthletic, value: "athletic" as const },
      { label: personaCopy.silhouetteSlender, value: "slender" as const },
      { label: personaCopy.silhouetteSoft, value: "soft" as const },
    ] satisfies Array<{
      label: string;
      value: CharacterVisualSilhouetteSelection;
    }>;
    const canGeneratePersonaCandidates = Boolean(
      personaGeneration.gender && personaGeneration.ageRange,
    );

    return (
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {personaCopy.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {personaCopy.body}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {personaCopy.genderLabel}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {personaGenderOptions.map((option) => {
                  const selected = personaGeneration.gender === option.value;

                  return (
                    <button
                      aria-pressed={selected}
                      className={`inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                      disabled={isGenerating}
                      key={option.value}
                      onClick={() => {
                        setPersonaGeneration((current) => ({
                          ...current,
                          candidates: [],
                          error: null,
                          gender: option.value,
                          status: "idle",
                        }));
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {personaCopy.ageLabel}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {personaAgeRangeOptions.map((option) => {
                  const selected = personaGeneration.ageRange === option.value;

                  return (
                    <button
                      aria-pressed={selected}
                      className={`inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                      disabled={isGenerating}
                      key={option.value}
                      onClick={() => {
                        setPersonaGeneration((current) => ({
                          ...current,
                          ageRange: option.value,
                          candidates: [],
                          error: null,
                          status: "idle",
                        }));
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {personaCopy.appearanceLabel}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {personaAppearanceToneOptions.map((option) => {
                const selected =
                  personaGeneration.appearanceTone === option.value;

                return (
                  <button
                    aria-pressed={selected}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${
                      selected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    disabled={isGenerating}
                    key={option.value}
                    onClick={() => {
                      setPersonaGeneration((current) => ({
                        ...current,
                        appearanceTone: option.value,
                        candidates: [],
                        error: null,
                        status: "idle",
                      }));
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {personaCopy.appearanceHint}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {personaCopy.silhouetteLabel}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {personaVisualSilhouetteOptions.map((option) => {
                const selected =
                  personaGeneration.visualSilhouette === option.value;

                return (
                  <button
                    aria-pressed={selected}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${
                      selected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    disabled={isGenerating}
                    key={option.value}
                    onClick={() => {
                      setPersonaGeneration((current) => ({
                        ...current,
                        candidates: [],
                        error: null,
                        status: "idle",
                        visualSilhouette: option.value,
                      }));
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {personaCopy.silhouetteHint}
            </p>
          </div>
          {!canGeneratePersonaCandidates ? (
            <p className="text-xs leading-5 text-slate-500">
              {personaCopy.requiredHint}
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              disabled={
                isGenerating ||
                isSavingProfile ||
                isDisconnected ||
                !canGeneratePersonaCandidates
              }
              onClick={() => {
                void generateCharacterPersonaCandidates();
              }}
              type="button"
            >
              {isGenerating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isGenerating ? personaCopy.generating : personaCopy.generate}
            </button>
          </div>
        </div>

        {selectedPersona ? (
          <div className="mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {personaCopy.selectedTitle}
                  </p>
                  <span className="inline-flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700">
                    {personaCopy.applied}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {selectedPersona.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedPersona.summary}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {personaCopy.locked}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPersona.lockedTraits.slice(0, 6).map((trait) => (
                    <span
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold leading-4 text-slate-700"
                      key={trait}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {personaCopy.avoid}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPersona.avoidChanges.slice(0, 6).map((trait) => (
                    <span
                      className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold leading-4 text-amber-800"
                      key={trait}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {personaGeneration.error ? (
          <MessageCard tone="error">{personaGeneration.error}</MessageCard>
        ) : null}

        {personaGeneration.candidates.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {personaGeneration.candidates.map((persona) => {
              const selected = selectedPersona?.id === persona.id;

              return (
                <article
                  className={`min-w-0 rounded-[22px] border bg-white p-4 shadow-sm ${
                    selected
                      ? "border-slate-950 ring-2 ring-slate-950/10"
                      : "border-slate-200"
                  }`}
                  key={persona.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">
                        {persona.name}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {persona.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {persona.lockedTraits.slice(0, 4).map((trait) => (
                          <span
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold leading-4 text-slate-700"
                            key={trait}
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selected ? (
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                        <Check className="size-4" />
                      </span>
                    ) : null}
                  </div>
                  <button
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingProfile || selected}
                    onClick={() => {
                      void saveCharacterPersona(persona);
                    }}
                    type="button"
                  >
                    {selected ? personaCopy.applied : personaCopy.apply}
                  </button>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  function renderQuickCharacterPanel(options?: { showDisplayName?: boolean }) {
    const isCreatingCharacter = quickCharacter.status === "loading";
    const showDisplayName = options?.showDisplayName ?? false;
    const quickCopy =
      locale === "ko"
        ? {
            advanced: "고급 설정",
            ageAuto: "자동",
            age20s: "20대",
            age30s: "30대",
            age40s: "40대",
            age50sPlus: "50대+",
            ageLabel: "연령대",
            appearanceAfricanDiaspora: "아프리카계 인상",
            appearanceAuto: "자동",
            appearanceEastAsian: "동아시아계",
            appearanceLabel: "외형 톤",
            appearanceLatin: "라틴계",
            appearanceMiddleEastern: "중동/지중해계",
            appearanceSouthAsian: "남아시아계",
            appearanceWestern: "서구권",
            body:
              "이름과 분위기만 정하면 페르소나, 아바타, 대표 이미지를 자동으로 저장합니다.",
            button: "캐릭터 만들기",
            creating: "캐릭터 생성 중...",
            displayNameLabel: "표시 이름",
            genderAuto: "자동",
            genderFemale: "여성",
            genderLabel: "캐릭터 타입",
            genderMale: "남성",
            styleChic: "시크한",
            styleDaily: "일상 브이로그",
            styleFanService: "팬 소통형",
            styleFriendly: "친근한",
            styleLabel: "분위기",
            title: "빠른 캐릭터 만들기",
            visualAthletic: "활동적인",
            visualAuto: "자동",
            visualBalanced: "균형형",
            visualElegant: "우아한",
            visualLabel: "중립 실루엣",
            visualSlender: "날렵한",
            visualSoft: "부드러운",
            worldCurrent: "현재 설정",
            worldHint:
              "정확한 현재 위치가 아니라 날씨, 낮밤, 계절 기준으로 쓸 공개 도시만 저장합니다.",
            worldLabel: "현실 기준 도시",
          }
        : {
            advanced: "Advanced settings",
            ageAuto: "Auto",
            age20s: "20s",
            age30s: "30s",
            age40s: "40s",
            age50sPlus: "50s+",
            ageLabel: "Age range",
            appearanceAfricanDiaspora: "African diaspora",
            appearanceAuto: "Auto",
            appearanceEastAsian: "East Asian",
            appearanceLabel: "Appearance tone",
            appearanceLatin: "Latin",
            appearanceMiddleEastern: "Middle Eastern / Mediterranean",
            appearanceSouthAsian: "South Asian",
            appearanceWestern: "Western",
            body:
              "Choose a name and mood. Persona, avatar set, representative image, and profile save happen automatically.",
            button: "Create character",
            creating: "Creating character...",
            displayNameLabel: "Display name",
            genderAuto: "Auto",
            genderFemale: "Female",
            genderLabel: "Character type",
            genderMale: "Male",
            styleChic: "Chic",
            styleDaily: "Daily vlog",
            styleFanService: "Fan communication",
            styleFriendly: "Friendly",
            styleLabel: "Mood",
            title: "Quick Character Setup",
            visualAthletic: "Athletic",
            visualAuto: "Auto",
            visualBalanced: "Balanced",
            visualElegant: "Elegant",
            visualLabel: "Neutral silhouette",
            visualSlender: "Slender",
            visualSoft: "Soft",
            worldCurrent: "Current setting",
            worldHint:
              "Stores a public base city for weather, day/night, and season context, not an exact live location.",
            worldLabel: "Reality base city",
          };
    const genderOptions = [
      { label: quickCopy.genderAuto, value: "auto" as const },
      { label: quickCopy.genderFemale, value: "female" as const },
      { label: quickCopy.genderMale, value: "male" as const },
    ];
    const ageRangeOptions = [
      { label: quickCopy.ageAuto, value: "auto" as const },
      { label: quickCopy.age20s, value: "20s" as const },
      { label: quickCopy.age30s, value: "30s" as const },
      { label: quickCopy.age40s, value: "40s" as const },
      { label: quickCopy.age50sPlus, value: "50s_plus" as const },
    ];
    const appearanceToneOptions = [
      { label: quickCopy.appearanceAuto, value: "auto" as const },
      { label: quickCopy.appearanceEastAsian, value: "east_asian" as const },
      { label: quickCopy.appearanceWestern, value: "western" as const },
      { label: quickCopy.appearanceLatin, value: "latin" as const },
      {
        label: quickCopy.appearanceSouthAsian,
        value: "south_asian" as const,
      },
      {
        label: quickCopy.appearanceMiddleEastern,
        value: "middle_eastern_mediterranean" as const,
      },
      {
        label: quickCopy.appearanceAfricanDiaspora,
        value: "african_diaspora" as const,
      },
    ];
    const visualSilhouetteOptions = [
      { label: quickCopy.visualAuto, value: "auto" as const },
      { label: quickCopy.visualBalanced, value: "balanced" as const },
      { label: quickCopy.visualElegant, value: "elegant" as const },
      { label: quickCopy.visualAthletic, value: "athletic" as const },
      { label: quickCopy.visualSlender, value: "slender" as const },
      { label: quickCopy.visualSoft, value: "soft" as const },
    ] satisfies Array<{
      label: string;
      value: CharacterVisualSilhouetteSelection;
    }>;
    const styleOptions = [
      { label: quickCopy.styleFriendly, value: "friendly" as const },
      { label: quickCopy.styleChic, value: "chic" as const },
      { label: quickCopy.styleDaily, value: "daily" as const },
      { label: quickCopy.styleFanService, value: "fan_service" as const },
    ];
    const currentWorldLocation = getCreatorCurrentWorldLocation(
      state.profile.characterPersona,
    );
    const effectiveWorldLocationSelection =
      quickCharacter.worldLocationSelection === "current" &&
      !currentWorldLocation
        ? "seoul"
        : quickCharacter.worldLocationSelection;
    const worldLocationOptions = [
      ...(currentWorldLocation
        ? [
            {
              label: `${quickCopy.worldCurrent} · ${currentWorldLocation.label}`,
              value: "current" as const,
            },
          ]
        : []),
      ...STUDIO_WORLD_LOCATION_PRESETS.map((preset) => ({
        label: locale === "ko" ? preset.labelKo : preset.labelEn,
        value: preset.key,
      })),
    ] satisfies Array<{
      label: string;
      value: FanletterWorldLocationSelection;
    }>;

    return (
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <WandSparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {quickCopy.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {quickCopy.body}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {showDisplayName ? (
            <InputField
              hint={contentCopy.hints.displayName}
              label={quickCopy.displayNameLabel}
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
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {quickCopy.styleLabel}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {styleOptions.map((option) => {
                const selected = quickCharacter.style === option.value;

                return (
                  <button
                    aria-pressed={selected}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    disabled={isCreatingCharacter}
                    key={option.value}
                    onClick={() => {
                      setQuickCharacter((current) => ({
                        ...current,
                        error: null,
                        status: "idle",
                        style: option.value,
                      }));
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 px-3 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <MapPin className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900/70">
                  {quickCopy.worldLabel}
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-900/70">
                  {quickCopy.worldHint}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {worldLocationOptions.map((option) => {
                    const selected =
                      effectiveWorldLocationSelection === option.value;

                    return (
                      <button
                        aria-pressed={selected}
                        className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-300"
                        }`}
                        disabled={isCreatingCharacter}
                        key={option.value}
                        onClick={() => {
                          setQuickCharacter((current) => ({
                            ...current,
                            error: null,
                            status: "idle",
                            worldLocationSelection: option.value,
                          }));
                        }}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-white px-3 py-3">
            <button
              className="flex h-9 w-full items-center justify-between gap-3 rounded-full px-1 text-sm font-semibold text-slate-800"
              disabled={isCreatingCharacter}
              onClick={() => {
                setQuickCharacter((current) => ({
                  ...current,
                  advancedOpen: !current.advancedOpen,
                }));
              }}
              type="button"
            >
              <span>{quickCopy.advanced}</span>
              <ArrowRight
                className={cn(
                  "size-4 transition",
                  quickCharacter.advancedOpen && "rotate-90",
                )}
              />
            </button>
            {quickCharacter.advancedOpen ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {quickCopy.genderLabel}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {genderOptions.map((option) => {
                      const selected = quickCharacter.gender === option.value;

                      return (
                        <button
                          aria-pressed={selected}
                          className={`inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                          disabled={isCreatingCharacter}
                          key={option.value}
                          onClick={() => {
                            setQuickCharacter((current) => ({
                              ...current,
                              error: null,
                              gender: option.value,
                              status: "idle",
                            }));
                          }}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {quickCopy.ageLabel}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ageRangeOptions.map((option) => {
                      const selected = quickCharacter.ageRange === option.value;

                      return (
                        <button
                          aria-pressed={selected}
                          className={`inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                          disabled={isCreatingCharacter}
                          key={option.value}
                          onClick={() => {
                            setQuickCharacter((current) => ({
                              ...current,
                              ageRange: option.value,
                              error: null,
                              status: "idle",
                            }));
                          }}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {quickCopy.appearanceLabel}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {appearanceToneOptions.map((option) => {
                      const selected =
                        quickCharacter.appearanceTone === option.value;

                      return (
                        <button
                          aria-pressed={selected}
                          className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                          disabled={isCreatingCharacter}
                          key={option.value}
                          onClick={() => {
                            setQuickCharacter((current) => ({
                              ...current,
                              appearanceTone: option.value,
                              error: null,
                              status: "idle",
                            }));
                          }}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {quickCopy.visualLabel}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {visualSilhouetteOptions.map((option) => {
                      const selected =
                        quickCharacter.visualSilhouette === option.value;

                      return (
                        <button
                          aria-pressed={selected}
                          className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                          disabled={isCreatingCharacter}
                          key={option.value}
                          onClick={() => {
                            setQuickCharacter((current) => ({
                              ...current,
                              error: null,
                              status: "idle",
                              visualSilhouette: option.value,
                            }));
                          }}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {quickCharacter.error ? (
          <MessageCard tone="error">{quickCharacter.error}</MessageCard>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={isCreatingCharacter || isSavingProfile || isDisconnected}
            onClick={() => {
              void createQuickCharacter();
            }}
            type="button"
          >
            {isCreatingCharacter ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isCreatingCharacter ? quickCopy.creating : quickCopy.button}
          </button>
        </div>
      </div>
    );
  }

  function renderCharacterRealitySettingsPanel() {
    const persona = state.profile.characterPersona;

    if (!persona) {
      return null;
    }

    const worldLocation = resolveCreatorWorldLocationDraft(persona);
    const normalizedWorldLocation =
      normalizeCreatorCharacterWorldLocation(worldLocation);
    const displayLocation = normalizedWorldLocation ?? worldLocation;
    const realityCopy =
      locale === "ko"
        ? {
            body:
              "AI 캐릭터의 기준 도시와 시간대를 정합니다. 콘텐츠 생성은 날씨, 낮밤, 계절, 공휴일 맥락을 이 값 기준으로 맞춥니다.",
            countryCode: "국가 코드",
            current: "현재 기준",
            invalid:
              "저장하려면 도시, 2자리 국가 코드, IANA 시간대, 위도/경도를 모두 유효하게 입력하세요.",
            latitude: "위도",
            longitude: "경도",
            presets: "도시 프리셋",
            privacy:
              "정확한 실시간 위치나 사적 주소가 아니라 공개 가능한 기준 도시만 저장합니다.",
            save: "현실 설정 저장",
            saving: "저장 중...",
            timezone: "시간대",
            timezoneHint: "예: Asia/Seoul, America/New_York",
            title: "현실 세계 설정",
            worldLabel: "기준 도시",
          }
        : {
            body:
              "Set the character's base city and timezone. Content generation uses this for weather, day/night, season, and holiday context.",
            countryCode: "Country code",
            current: "Current basis",
            invalid:
              "Enter a valid city, 2-letter country code, IANA timezone, latitude, and longitude before saving.",
            latitude: "Latitude",
            longitude: "Longitude",
            presets: "City presets",
            privacy:
              "Only a public base city is stored, not an exact live location or private address.",
            save: "Save reality settings",
            saving: "Saving...",
            timezone: "Timezone",
            timezoneHint: "Example: Asia/Seoul, America/New_York",
            title: "Reality Settings",
            worldLabel: "Base city",
          };

    return (
      <section className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <Globe2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">
                  {realityCopy.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {realityCopy.body}
                </p>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                <MapPin className="size-3.5" />
                {realityCopy.current}: {displayLocation.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-900">
              {realityCopy.privacy}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900/70">
            {realityCopy.presets}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STUDIO_WORLD_LOCATION_PRESETS.map((preset) => {
              const selected =
                normalizedWorldLocation?.countryCode ===
                  preset.value.countryCode &&
                normalizedWorldLocation.timezone === preset.value.timezone;

              return (
                <button
                  aria-pressed={selected}
                  className={`inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-300"
                  }`}
                  disabled={isSavingProfile || isDisconnected}
                  key={preset.key}
                  onClick={() => {
                    updateCharacterWorldLocation(preset.value);
                  }}
                  type="button"
                >
                  {locale === "ko" ? preset.labelKo : preset.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InputField
            label={realityCopy.worldLabel}
            onChange={(value) => {
              updateCharacterWorldLocation({ label: value });
            }}
            value={worldLocation.label}
          />
          <InputField
            label={realityCopy.countryCode}
            onChange={(value) => {
              updateCharacterWorldLocation({
                countryCode: value.trim().toUpperCase().slice(0, 2),
              });
            }}
            value={worldLocation.countryCode}
          />
          <InputField
            hint={realityCopy.timezoneHint}
            label={realityCopy.timezone}
            onChange={(value) => {
              updateCharacterWorldLocation({ timezone: value.trim() });
            }}
            value={worldLocation.timezone}
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label={realityCopy.latitude}
              onChange={(value) => {
                updateCharacterWorldLocation({
                  latitude: parseBoundedCoordinate(
                    value,
                    worldLocation.latitude,
                    -90,
                    90,
                  ),
                });
              }}
              value={String(worldLocation.latitude)}
            />
            <InputField
              label={realityCopy.longitude}
              onChange={(value) => {
                updateCharacterWorldLocation({
                  longitude: parseBoundedCoordinate(
                    value,
                    worldLocation.longitude,
                    -180,
                    180,
                  ),
                });
              }}
              value={String(worldLocation.longitude)}
            />
          </div>
        </div>

        {!normalizedWorldLocation ? (
          <p className="mt-3 text-xs leading-5 text-amber-700">
            {realityCopy.invalid}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={
              isSavingProfile ||
              isDisconnected ||
              !normalizedWorldLocation
            }
            onClick={() => {
              void saveCharacterWorldLocation();
            }}
            type="button"
          >
            {isSavingProfile ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isSavingProfile ? realityCopy.saving : realityCopy.save}
          </button>
        </div>
      </section>
    );
  }

  function renderCharacterIdentityLockPanel() {
    const persona = state.profile.characterPersona;

    if (!persona) {
      return null;
    }

    const identityCopy =
      locale === "ko"
        ? {
            avoid: "변경 금지 목록",
            body:
              "AI 이미지와 동영상 생성에서 같은 인물로 유지해야 하는 핵심 기준을 직접 다듬습니다.",
            identityHint:
              "생성 모델에 들어가는 핵심 정체성 문장입니다. 얼굴, 헤어, 피부, 성인 연령대, 자세, 전체 프레임 기준을 유지하세요.",
            identityPrompt: "정체성 프롬프트",
            lineHint:
              "한 줄에 하나씩 입력하세요. 쉼표로 붙여 넣어도 저장 시 줄 단위 목록으로 정리됩니다.",
            locked: "고정 특징",
            name: "캐릭터 이름",
            save: "정체성 락 저장",
            saving: "저장 중...",
            summary: "요약",
            title: "정체성 락 편집",
          }
        : {
            avoid: "Do-not-change list",
            body:
              "Edit the core identity lock used to keep the same person across AI image and video generation.",
            identityHint:
              "This is the core identity paragraph sent to generation models. Keep face, hair, skin, adult age range, posture, and overall frame stable.",
            identityPrompt: "Identity prompt",
            lineHint:
              "Use one item per line. Comma-pasted text is normalized into a list on save.",
            locked: "Locked traits",
            name: "Character name",
            save: "Save identity lock",
            saving: "Saving...",
            summary: "Summary",
            title: "Identity Lock Editor",
          };

    return (
      <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <PenSquare className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {identityCopy.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {identityCopy.body}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InputField
            label={identityCopy.name}
            onChange={(value) => {
              updateCharacterPersonaDraft({
                name: value.slice(0, CHARACTER_IDENTITY_NAME_LIMIT),
              });
            }}
            value={persona.name}
          />
          <InputField
            label={identityCopy.summary}
            onChange={(value) => {
              updateCharacterPersonaDraft({
                summary: value.slice(0, CHARACTER_IDENTITY_SUMMARY_LIMIT),
              });
            }}
            value={persona.summary}
          />
        </div>

        <div className="mt-4">
          <TextAreaField
            hint={identityCopy.identityHint}
            label={identityCopy.identityPrompt}
            onChange={(value) => {
              updateCharacterPersonaDraft({
                identityPrompt: value.slice(0, CHARACTER_IDENTITY_PROMPT_LIMIT),
              });
            }}
            rows={5}
            value={persona.identityPrompt}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TextAreaField
            hint={identityCopy.lineHint}
            label={identityCopy.locked}
            onChange={(value) => {
              setIdentityLockDraft((current) => ({
                ...current,
                lockedTraitsText: value,
                personaId: persona.id,
              }));
            }}
            rows={5}
            value={
              identityLockDraft.personaId === persona.id
                ? identityLockDraft.lockedTraitsText
                : formatCharacterTraitText(persona.lockedTraits)
            }
          />
          <TextAreaField
            hint={identityCopy.lineHint}
            label={identityCopy.avoid}
            onChange={(value) => {
              setIdentityLockDraft((current) => ({
                ...current,
                avoidChangesText: value,
                personaId: persona.id,
              }));
            }}
            rows={5}
            value={
              identityLockDraft.personaId === persona.id
                ? identityLockDraft.avoidChangesText
                : formatCharacterTraitText(persona.avoidChanges)
            }
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={
              isSavingProfile ||
              isDisconnected ||
              !persona.name.trim() ||
              !persona.identityPrompt.trim()
            }
            onClick={() => {
              void saveCharacterIdentityLock();
            }}
            type="button"
          >
            {isSavingProfile ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isSavingProfile ? identityCopy.saving : identityCopy.save}
          </button>
        </div>
      </section>
    );
  }

  function renderCharacterMemoryTimelinePanel() {
    const persona = state.profile.characterPersona;

    if (!persona) {
      return null;
    }

    const memoryItems = state.profile.characterMemory;
    const timelineItems = state.profile.characterTimeline;
    const dateFormatter = new Intl.DateTimeFormat(
      locale === "ko" ? "ko-KR" : "en-US",
      {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
    const formatRecordDate = (value: string) => {
      const parsed = new Date(value);

      return Number.isNaN(parsed.getTime())
        ? value
        : dateFormatter.format(parsed);
    };
    const memoryCopy =
      locale === "ko"
        ? {
            add: "기록 저장",
            body:
              "캐릭터가 기억해야 할 확정 설정과 콘텐츠 사건을 쌓아 다음 제작 기준으로 사용합니다.",
            bodyHint:
              "캐릭터의 말투, 취향, 반복 루틴, 관계, 지난 콘텐츠 맥락처럼 이후에도 유지할 내용을 적습니다.",
            bodyLabel: "기억 내용",
            emptyMemory: "아직 저장된 캐릭터 기억이 없습니다.",
            emptyTimeline:
              "새 콘텐츠를 저장하거나 공개하면 이곳에 제작 타임라인이 자동 기록됩니다.",
            memoryTitle: "캐릭터 메모리",
            remove: "삭제",
            title: "캐릭터 기록",
            titleLabel: "기억 제목",
            timelineTitle: "콘텐츠 타임라인",
          }
        : {
            add: "Save memory",
            body:
              "Build confirmed character memories and content events that can guide future production.",
            bodyHint:
              "Save durable context such as voice, tastes, recurring routines, relationships, or past content continuity.",
            bodyLabel: "Memory body",
            emptyMemory: "No character memories are saved yet.",
            emptyTimeline:
              "New saved or published content will automatically appear in this production timeline.",
            memoryTitle: "Character Memory",
            remove: "Remove",
            title: "Character Records",
            titleLabel: "Memory title",
            timelineTitle: "Content Timeline",
          };
    const timelineKindLabel = (
      kind: CreatorCharacterTimelineEvent["kind"],
    ) => {
      if (locale === "ko") {
        if (kind === "content_published") {
          return "공개";
        }

        if (kind === "content_created") {
          return "초안";
        }

        if (kind === "fan_request_used") {
          return "팬 요청";
        }

        return "수동";
      }

      if (kind === "content_published") {
        return "Published";
      }

      if (kind === "content_created") {
        return "Draft";
      }

      if (kind === "fan_request_used") {
        return "Fan request";
      }

      return "Manual";
    };

    return (
      <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <LayoutGrid className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {memoryCopy.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {memoryCopy.body}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-sm font-semibold text-slate-950">
              {memoryCopy.memoryTitle}
            </p>
            <div className="mt-3 space-y-3">
              <InputField
                label={memoryCopy.titleLabel}
                onChange={(value) => {
                  setCharacterMemoryForm((current) => ({
                    ...current,
                    title: value.slice(0, CHARACTER_MEMORY_TITLE_LIMIT),
                  }));
                }}
                value={characterMemoryForm.title}
              />
              <TextAreaField
                hint={memoryCopy.bodyHint}
                label={memoryCopy.bodyLabel}
                onChange={(value) => {
                  setCharacterMemoryForm((current) => ({
                    ...current,
                    body: value.slice(0, CHARACTER_MEMORY_BODY_LIMIT),
                  }));
                }}
                rows={5}
                value={characterMemoryForm.body}
              />
              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  isSavingProfile ||
                  isDisconnected ||
                  !characterMemoryForm.title.trim() ||
                  !characterMemoryForm.body.trim()
                }
                onClick={() => {
                  void saveCharacterMemoryEntry();
                }}
                type="button"
              >
                {isSavingProfile ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {memoryCopy.add}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {memoryItems.length > 0 ? (
                memoryItems.map((entry) => (
                  <article
                    className="rounded-[18px] border border-slate-200 bg-white px-3 py-3"
                    key={entry.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950">
                          {entry.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {entry.body}
                        </p>
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {formatRecordDate(entry.updatedAt)}
                        </p>
                      </div>
                      <button
                        className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSavingProfile}
                        onClick={() => {
                          void removeCharacterMemoryEntry(entry.id);
                        }}
                        type="button"
                      >
                        {memoryCopy.remove}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-[18px] border border-dashed border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-500">
                  {memoryCopy.emptyMemory}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-sm font-semibold text-slate-950">
              {memoryCopy.timelineTitle}
            </p>
            <div className="mt-3 space-y-2">
              {timelineItems.length > 0 ? (
                timelineItems.slice(0, CHARACTER_TIMELINE_LIMIT).map((event) => (
                  <article
                    className="rounded-[18px] border border-slate-200 bg-white px-3 py-3"
                    key={event.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {timelineKindLabel(event.kind)}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {formatRecordDate(event.happenedAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {event.summary}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-[18px] border border-dashed border-slate-200 bg-white px-3 py-3 text-xs leading-5 text-slate-500">
                  {memoryCopy.emptyTimeline}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderActiveCharacterCard() {
    const persona = state.profile.characterPersona;
    const cardCopy =
      locale === "ko"
        ? {
            body:
              "이 캐릭터가 이후 AI 이미지와 동영상 생성의 기준 인물로 자동 적용됩니다.",
            change: "캐릭터 변경",
            create: "오늘의 콘텐츠 만들기",
            empty: "활성 캐릭터가 아직 없습니다.",
            strengths: "잘 맞는 콘텐츠",
            strengthItems: ["데일리 브이로그", "팬레터 답장", "AI 이미지·동영상"],
            title: "활성 캐릭터",
          }
        : {
            body:
              "This character is automatically used as the identity for future AI image and video generations.",
            change: "Change character",
            create: "Create today's post",
            empty: "No active character yet.",
            strengths: "Best for",
            strengthItems: ["Daily vlog", "Fan replies", "AI image/video"],
            title: "Active character",
          };

    return (
      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <CreatorProfileAvatar
              avatarImageUrl={state.profile.avatarImageUrl}
              displayName={state.profile.displayName}
              fallbackLabel={cardCopy.title}
              sizeClassName="size-16 rounded-full"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {cardCopy.title}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {persona?.name || state.profile.displayName || cardCopy.empty}
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                {persona?.summary || cardCopy.body}
              </p>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {cardCopy.strengths}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cardCopy.strengthItems.map((item) => (
                    <span
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <Link
              className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              href={newPostHref}
            >
              <PenSquare className="size-4" />
              {cardCopy.create}
            </Link>
            <Link
              className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              href={characterHref}
            >
              {cardCopy.change}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function renderCharacterAvatarPanel() {
    const isGeneratingProfileAvatar = avatarGeneration.status === "loading";
    const canGenerateProfileAvatar = Boolean(state.profile.characterPersona);
    const displayedAvatarSet =
      avatarGeneration.candidates.length > 0
        ? avatarGeneration.candidates
        : state.profile.avatarImageSet;
    const avatarGeneratorCopy =
      locale === "ko"
        ? {
            body:
              "선택한 인물 페르소나를 기준으로 같은 정체성을 유지한 대표, 미소, 차분, 리액션, 팬 반응 컷을 생성합니다.",
            disabledHint: "인물 페르소나를 먼저 선택하면 AI 아바타를 만들 수 있습니다.",
            generate: "AI 아바타 세트 생성",
            generating: "아바타 세트 생성 중...",
            labelDefault: "기본",
            labelSerious: "진지함",
            labelSmile: "미소",
            select: "선택하고 저장",
            selected: "저장됨",
            setTitle: "표정 세트",
            title: "AI 아바타",
          }
        : {
            body:
              "Generate a consistent avatar kit with hero, smile, calm, reaction, and fan-reaction cuts from the selected character persona.",
            disabledHint: "Select a character persona first to generate AI avatars.",
            generate: "Generate Avatar Set",
            generating: "Generating avatar set...",
            labelDefault: "Default",
            labelSerious: "Serious",
            labelSmile: "Smile",
            select: "Select and save",
            selected: "Saved",
            setTitle: "Expression set",
            title: "AI Avatar",
          };
    const getAvatarExpressionLabel = (
      candidate: CreatorProfileAvatarCandidate,
    ) => {
      if (candidate.expression === "fanservice") {
        return locale === "ko" ? "팬 리액션" : "Fan reaction";
      }

      if (candidate.label?.trim()) {
        return candidate.label;
      }

      if (candidate.expression === "smile") {
        return avatarGeneratorCopy.labelSmile;
      }

      if (candidate.expression === "serious") {
        return avatarGeneratorCopy.labelSerious;
      }

      if (candidate.expression === "default") {
        return avatarGeneratorCopy.labelDefault;
      }

      return candidate.label ?? avatarGeneratorCopy.setTitle;
    };

    return (
      <section className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {avatarGeneratorCopy.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {avatarGeneratorCopy.body}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
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
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={
                isGeneratingProfileAvatar ||
                isSavingProfile ||
                isDisconnected ||
                !canGenerateProfileAvatar
              }
              onClick={() => {
                void generateProfileAvatarCandidates();
              }}
              type="button"
            >
              {isGeneratingProfileAvatar ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isGeneratingProfileAvatar
                ? avatarGeneratorCopy.generating
                : avatarGeneratorCopy.generate}
            </button>
          </div>
        </div>
        {!canGenerateProfileAvatar ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {avatarGeneratorCopy.disabledHint}
          </p>
        ) : null}
        {avatarGeneration.error ? (
          <MessageCard tone="error">{avatarGeneration.error}</MessageCard>
        ) : null}
        {displayedAvatarSet.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {displayedAvatarSet.map((candidate) => {
              const selected = state.profile.avatarImageUrl === candidate.url;

              return (
                <div
                  className={`overflow-hidden rounded-[20px] border bg-white shadow-sm ${
                    selected
                      ? "border-slate-950 ring-2 ring-slate-950/10"
                      : "border-slate-200"
                  }`}
                  key={candidate.pathname}
                >
                  <div className="aspect-square overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={avatarGeneratorCopy.title}
                      className="h-full w-full object-cover"
                      src={candidate.url}
                    />
                  </div>
                  <div className="p-2">
                    <p className="mb-2 truncate text-center text-[11px] font-semibold text-slate-500">
                      {getAvatarExpressionLabel(candidate)}
                    </p>
                    <button
                      className="inline-flex h-9 w-full items-center justify-center rounded-full bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        isSavingProfile ||
                        isGeneratingProfileAvatar ||
                        selected
                      }
                      onClick={() => {
                        void saveGeneratedProfileAvatar(candidate);
                      }}
                      type="button"
                    >
                      {selected
                        ? avatarGeneratorCopy.selected
                        : avatarGeneratorCopy.select}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    );
  }

  function renderProfileCard() {
    const blockedState = renderBlockedState();
    const hasDisplayName = Boolean(state.profile.displayName.trim());
    const hasPersona = Boolean(state.profile.characterPersona);
    const hasReadyCharacter = hasPersona;
    const setupProgress = [hasDisplayName, hasReadyCharacter].filter(Boolean).length;
    const setupCopy =
      locale === "ko"
        ? {
            characterBody:
              "캐릭터는 콘텐츠 생성에 자동 적용됩니다. 변경은 별도 화면에서만 진행합니다.",
            characterTitle: "활성 캐릭터",
            displayBody: "피드와 콘텐츠 상세에 표시될 이름입니다.",
            displayTitle: "표시 이름 입력",
            progress: `필수 설정 ${setupProgress}/2`,
            saveButton: "변경사항 저장",
            saveButtonSaving: "저장 중...",
            saveBody:
              "이 화면에서는 표시 이름과 기본 소개만 저장합니다. 캐릭터 정체성은 별도 변경 화면에서 관리합니다.",
            saveTitle: "수동 변경 저장",
          }
        : {
            characterBody:
              "The character is applied automatically to content generation. Changes happen on a separate screen.",
            characterTitle: "Active Character",
            displayBody: "This name appears in the feed and content detail pages.",
            displayTitle: "Enter Display Name",
            progress: `Required setup ${setupProgress}/2`,
            saveButton: "Save changes",
            saveButtonSaving: "Saving...",
            saveBody:
              "This screen only saves display name and basic profile details. Character identity is managed on the separate change screen.",
            saveTitle: "Save Manual Changes",
          };

    return (
      <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-white/80 sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:backdrop-blur-[18px]">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.labels.creatorProfile}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-slate-950 px-3 text-xs font-semibold text-white">
                {setupCopy.progress}
              </span>
            </div>
          </div>
        </div>

        {blockedState ? (
          blockedState
        ) : (
          <div className="mt-5 space-y-4">
            {recoverableStudioError ? (
              <MessageCard tone="error">{recoverableStudioError}</MessageCard>
            ) : null}
            <section className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    hasDisplayName
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-950 text-white"
                  }`}
                >
                  {hasDisplayName ? <Check className="size-4" /> : "1"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">
                    {setupCopy.displayTitle}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {setupCopy.displayBody}
                  </p>
                </div>
              </div>
              <div className="mt-4">
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
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    hasReadyCharacter
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-950 text-white"
                  }`}
                >
                  {hasReadyCharacter ? <Check className="size-4" /> : "2"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">
                    {setupCopy.characterTitle}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {setupCopy.characterBody}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                {hasReadyCharacter
                  ? renderActiveCharacterCard()
                  : renderQuickCharacterPanel()}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  <Save className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">
                    {setupCopy.saveTitle}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {setupCopy.saveBody}
                  </p>
                  <button
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={isSavingProfile || isDisconnected}
                    onClick={() => {
                      void saveProfile();
                    }}
                    type="button"
                  >
                    {isSavingProfile ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {isSavingProfile
                      ? setupCopy.saveButtonSaving
                      : setupCopy.saveButton}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  function renderCharacterChangeCard() {
    const blockedState = renderBlockedState();
    const changeCopy =
      locale === "ko"
        ? {
            advancedBody:
              isFanletterSurface
                ? "필요할 때만 후보를 직접 고르고 아바타 세트를 다시 만듭니다. 저장 후 FanLetter 콘텐츠 생성에 자동 적용됩니다."
                : "원하는 경우 후보를 직접 고르고 아바타 세트를 다시 만들 수 있습니다.",
            advancedTitle: isFanletterSurface ? "직접 바꾸기" : "직접 변경",
            currentBody:
              isFanletterSurface
                ? "현재 FanLetter 캐릭터와 새 캐릭터를 비교한 뒤 저장하세요. 기존 브이로그는 그대로 유지됩니다."
                : "현재 캐릭터와 새 캐릭터를 비교한 뒤 저장하세요. 기존 콘텐츠는 그대로 유지됩니다.",
            currentTitle: isFanletterSurface
              ? "현재 FanLetter 캐릭터"
              : "현재 캐릭터",
            eyebrow: isFanletterSurface
              ? "FanLetter Character"
              : contentCopy.page.studioEyebrow,
            warning:
              "캐릭터를 바꾸면 이후 생성되는 이미지와 동영상의 인물 정체성이 달라질 수 있습니다.",
          }
        : {
            advancedBody:
              isFanletterSurface
                ? "Only when needed, choose a candidate manually and regenerate the avatar set. Saved changes apply to future FanLetter content."
                : "You can manually choose a candidate and regenerate the avatar set.",
            advancedTitle: isFanletterSurface ? "Change manually" : "Manual Change",
            currentBody:
              isFanletterSurface
                ? "Compare the current FanLetter character with the new one before saving. Existing vlogs stay unchanged."
                : "Compare your current character with the new one before saving. Existing posts stay unchanged.",
            currentTitle: isFanletterSurface
              ? "Current FanLetter character"
              : "Current Character",
            eyebrow: isFanletterSurface
              ? "FanLetter Character"
              : contentCopy.page.studioEyebrow,
            warning:
              "Changing the character can change the person used in future image and video generations.",
          };

    return (
      <div
        className={cn(
          "border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-white/80 sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:backdrop-blur-[18px]",
          isFanletterSurface &&
            "rounded-lg border-[#44f26e]/24 shadow-[0_28px_80px_rgba(0,0,0,0.26)] sm:rounded-lg sm:border-[#44f26e]/24",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white",
              isFanletterSurface && "bg-[#44f26e] text-black",
            )}
          >
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "eyebrow",
                isFanletterSurface && "text-[#16702e]",
              )}
            >
              {changeCopy.eyebrow}
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {changeCopy.currentTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {changeCopy.currentBody}
            </p>
          </div>
        </div>

        {blockedState ? (
          blockedState
        ) : (
          <div className="mt-5 space-y-4">
            {recoverableStudioError ? (
              <MessageCard tone="error">{recoverableStudioError}</MessageCard>
            ) : null}
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                <p>{changeCopy.warning}</p>
              </div>
            </div>
            {renderActiveCharacterCard()}
            {renderCharacterIdentityLockPanel()}
            {renderCharacterMemoryTimelinePanel()}
            {renderCharacterRealitySettingsPanel()}
            {renderQuickCharacterPanel()}
            <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-950">
                  {changeCopy.advancedTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {changeCopy.advancedBody}
                </p>
              </div>
              {renderCharacterPersonaPanel()}
            </section>
            {renderCharacterAvatarPanel()}
          </div>
        )}
      </div>
    );
  }

  function renderAutomationPanel() {
    const blockedState = renderBlockedState();

    return (
      <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-white/80 sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:backdrop-blur-[18px]">
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
            <div className="grid gap-4 sm:grid-cols-2">
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
      <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-white/80 sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:backdrop-blur-[18px]">
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

  function renderPaidUploadPublicPreview({
    compact = false,
  }: {
    compact?: boolean;
  } = {}) {
    if (!isPaidUploadComposer) {
      return null;
    }

    const previewTitle =
      postForm.title.trim() ||
      postForm.body
        .split("\n")
        .find((line) => line.trim())
        ?.trim()
        .slice(0, 72) ||
      paidUploadComposerCopy.lockedPreviewFallbackTitle;
    const previewText =
      postForm.previewText.trim() ||
      postForm.summary.trim() ||
      paidUploadComposerCopy.lockedPreviewFallbackText;
    const previewImage =
      postForm.coverImageUrl || postForm.contentImageUrls[0] || null;

    return (
      <section
        className={cn(
          "overflow-hidden rounded-lg border border-[#44f26e]/22 bg-[#07100b] text-white shadow-[0_18px_54px_rgba(0,0,0,0.18)]",
          compact ? "p-3" : "p-4",
        )}
      >
        <div
          className={cn(
            "grid gap-3",
            compact ? "grid-cols-1" : "sm:grid-cols-[11rem_minmax(0,1fr)]",
          )}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-black/30">
            {previewImage ? (
              <span
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg,rgba(3,5,4,0.02),rgba(3,5,4,0.5)),url(${previewImage})`,
                }}
              />
            ) : (
              <span className="flex h-full items-center justify-center text-white/34">
                <ImagePlus className="size-7" />
              </span>
            )}
            <span className="absolute left-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-[#44f26e] px-3 text-xs font-semibold text-black">
              <Coins className="size-3.5" />
              {CONTENT_PAID_USDT_AMOUNT} USDT
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {paidUploadComposerCopy.lockedPreviewTitle}
            </p>
            <h3
              className={cn(
                "mt-2 font-semibold leading-tight tracking-normal text-white [word-break:keep-all]",
                compact ? "text-lg" : "text-xl",
              )}
            >
              {previewTitle}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-white/62">
              {previewText}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-white/70">
                {hasUploadedPostVideo
                  ? paidUploadComposerCopy.lockedPreviewMediaReady
                  : paidUploadComposerCopy.lockedPreviewMediaMissing}
              </span>
              <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-white/70">
                {hasPaidUploadPreviewText
                  ? paidUploadComposerCopy.lockedPreviewTeaserReady
                  : paidUploadComposerCopy.lockedPreviewTeaserMissing}
              </span>
              <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-white/70">
                {locale === "ko"
                  ? "본문 결제 후 열람"
                  : "Body unlocks after payment"}
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderPaidUploadReadinessPanel() {
    if (!isPaidUploadComposer) {
      return null;
    }

    const hasPublicCover = Boolean(
      postForm.coverImageUrl || postForm.contentImageUrls[0],
    );
    const hasPayoutWallet = Boolean(state.profile.payoutWalletAddress);
    const readinessItems = [
      {
        description: paidUploadComposerCopy.readinessVideoDescription,
        isOptional: false,
        isReady: hasUploadedPostVideo,
        label: paidUploadComposerCopy.readinessVideoLabel,
      },
      {
        description: paidUploadComposerCopy.readinessPreviewDescription,
        isOptional: false,
        isReady: hasPaidUploadPreviewText,
        label: paidUploadComposerCopy.readinessPreviewLabel,
      },
      {
        description: paidUploadComposerCopy.readinessCoverDescription,
        isOptional: true,
        isReady: hasPublicCover,
        label: paidUploadComposerCopy.readinessCoverLabel,
      },
      {
        description: paidUploadComposerCopy.readinessWalletDescription,
        isOptional: true,
        isReady: hasPayoutWallet,
        label: paidUploadComposerCopy.readinessWalletLabel,
      },
    ];
    const requiredReadinessItems = readinessItems.filter(
      (item) => !item.isOptional,
    );

    return (
      <section className="rounded-lg border border-[#44f26e]/18 bg-black/14 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">
            {paidUploadComposerCopy.readinessTitle}
          </p>
          <span className="rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
            {paidUploadComposerCopy.readinessRequired}{" "}
            {requiredReadinessItems.filter((item) => item.isReady).length}/
            {requiredReadinessItems.length}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {readinessItems.map((item) => {
            const statusLabel = item.isReady
              ? paidUploadComposerCopy.readinessReady
              : item.isOptional
                ? paidUploadComposerCopy.readinessAuto
                : paidUploadComposerCopy.readinessMissing;

            return (
              <span
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold",
                  item.isReady
                    ? "border-[#44f26e]/24 bg-[#44f26e]/12 text-[#d8ffe0]"
                    : item.isOptional
                      ? "border-white/10 bg-white/[0.045] text-white/60"
                      : "border-amber-300/30 bg-amber-300/10 text-amber-100",
                )}
                key={item.label}
                title={item.description}
              >
                {item.isReady ? (
                  <Check className="size-3.5" />
                ) : (
                  <AlertTriangle className="size-3.5" />
                )}
                {item.label}
                <span className="text-white/44">{statusLabel}</span>
              </span>
            );
          })}
        </div>
      </section>
    );
  }

  function renderComposerCard() {
    const blockedState = renderBlockedState();
    const coverUploadLabel =
      locale === "ko" ? "커버 업로드" : "Upload cover";
    const contentImagesUploadLabel =
      locale === "ko" ? "콘텐츠 이미지 추가" : "Add content images";
    const contentVideoUploadLabel =
      isPaidUploadComposer
        ? paidUploadComposerCopy.uploadVideo
        : locale === "ko"
          ? "동영상 추가"
          : "Add video";
    const aiContentImageLabel =
      locale === "ko" ? "AI 콘텐츠 이미지 생성" : "Generate AI content image";
    const aiContentVideoLabel =
      locale === "ko" ? "AI 콘텐츠 동영상 생성" : "Generate AI content video";
    const mobilePreviewImage =
      postForm.coverImageUrl || postForm.contentImageUrls[0] || null;
    const hasActiveCharacter = Boolean(state.profile.characterPersona);
    const composerBusy =
      isSavingPost ||
      isCreatingSellerWallet ||
      isDisconnected ||
      isUploadingPostImage ||
      isUploadingPostVideo ||
      isGeneratingPaidVideoFrameCover ||
      isGeneratingPostImage;
    const draftDisabled =
      composerBusy ||
      isPaidUploadRequestBlocked ||
      (isPaidUploadComposer && !hasUploadedPostVideo);
    const publishRequirementMessage = isPaidUploadRequestBlocked
      ? paidUploadRequestBlockMessage
      : !hasRequiredPostMedia
      ? requiredPostMediaMessage
      : isPaidUploadComposer && !hasPaidUploadPreviewText
        ? paidUploadPreviewRequiredMessage
        : null;
    const publishDisabled = composerBusy || Boolean(publishRequirementMessage);
    const publishActionLabel = isPaidUploadComposer
      ? paidUploadComposerCopy.publishCta
      : contentCopy.actions.publish;
    const publishReadyClass = isPaidUploadComposer
      ? "bg-[#44f26e] text-black shadow-[0_18px_35px_rgba(68,242,110,0.18)] hover:bg-[#64ff84] disabled:bg-[#44f26e] disabled:text-black"
      : "bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] hover:bg-slate-800 disabled:bg-slate-800 disabled:text-white";
    const publishReadyClassCompact = isPaidUploadComposer
      ? "bg-[#44f26e] text-black shadow-[0_14px_28px_rgba(68,242,110,0.18)] hover:bg-[#64ff84] disabled:bg-[#44f26e] disabled:text-black"
      : "bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] hover:bg-slate-800 disabled:bg-slate-800 disabled:text-white";
    const renderPaidUploadVideoPanel = () => (
      <section className="rounded-[24px] border border-[#44f26e]/24 bg-[#08130d] p-4 text-white shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              01
            </p>
            <h3 className="mt-1 text-base font-semibold text-white">
              {paidUploadComposerCopy.primaryVideoTitle}
            </h3>
            <p className="mt-2 text-xs font-medium leading-5 text-white/58">
              {paidUploadComposerCopy.primaryVideoDescription}
            </p>
          </div>
          <span className="rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
            {postForm.contentVideoUrls.length}/{CONTENT_VIDEO_LIMIT}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={
              isUploadingPostImage ||
              isUploadingPostVideo ||
              isGeneratingPaidVideoFrameCover ||
              isGeneratingPostImage ||
              postForm.contentVideoUrls.length >= CONTENT_VIDEO_LIMIT
            }
            onClick={() => {
              postVideoInputRef.current?.click();
            }}
            type="button"
          >
            {isUploadingPostVideo ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Film className="size-4" />
            )}
            {isUploadingPostVideo
              ? `${Math.round(postVideoUploadProgress)}%`
              : contentVideoUploadLabel}
          </button>
          {postForm.contentVideoUrls.length > 0 ? (
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              onClick={() => {
                setPostForm((current) => ({
                  ...current,
                  contentVideoUrls: [],
                  generatedContentVideoUrls: [],
                  priceType: "paid",
                }));
              }}
              type="button"
            >
              {locale === "ko" ? "동영상 제거" : "Remove video"}
            </button>
          ) : null}
        </div>
        {postForm.contentVideoUrls.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-black">
            <video
              className="aspect-video w-full bg-black object-contain"
              controls
              playsInline
              preload="metadata"
              src={postForm.contentVideoUrls[0]}
            />
          </div>
        ) : null}
      </section>
    );

    return (
      <div
        className={cn(
          "border-y p-4 shadow-none sm:rounded-[30px] sm:border sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:backdrop-blur-[18px]",
          isFanletterPaidUpload
            ? "border-[#44f26e]/20 bg-[#07100b] text-white sm:border-[#44f26e]/20 sm:bg-[#07100b]"
            : "border-slate-200/80 bg-white sm:border-white/80 sm:bg-white/80",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className={cn(
                "eyebrow",
                isFanletterPaidUpload && "!text-[#44f26e]",
              )}
            >
              {isPaidUploadComposer
                ? paidUploadComposerCopy.fanRequestEyebrow
                : contentCopy.page.studioEyebrow}
            </p>
            <h2
              className={cn(
                "text-xl font-semibold tracking-tight",
                isFanletterPaidUpload ? "text-white" : "text-slate-950",
              )}
            >
              {isPaidUploadComposer
                ? paidUploadComposerCopy.composerTitle
                : contentCopy.actions.createPost}
            </h2>
          </div>
          <div
            className={cn(
              "rounded-full border px-3 py-2 text-sm font-medium",
              isFanletterPaidUpload
                ? "border-[#44f26e]/28 bg-[#44f26e]/10 text-[#b9ffc8]"
                : "border-slate-200 bg-white text-slate-900",
            )}
          >
            {isPaidUploadComposer
              ? `${CONTENT_PAID_USDT_AMOUNT} USDT`
              : `${publishedCount} ${contentCopy.labels.published}`}
          </div>
        </div>

        <p
          className={cn(
            "mt-3 text-sm leading-6",
            isFanletterPaidUpload ? "text-white/64" : "text-slate-600",
          )}
        >
          {isPaidUploadComposer
            ? paidUploadComposerCopy.composerDescription
            : contentCopy.labels.studioNotice}
        </p>

        {isFanletterPaidUpload &&
        initialFanRequestId &&
        !isPaidUploadRequestWrongType ? (
          <div className="mt-4 rounded-lg border border-[#44f26e]/18 bg-white/[0.045] p-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <PenSquare className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#9bffad]">
                    {paidUploadComposerCopy.fanRequestEyebrow}
                  </p>
                  <span className="text-xs font-medium text-white/44">
                    {paidUploadComposerCopy.fanRequestContext}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-white">
                  {initialFanRequestCharacterName
                    ? `${initialFanRequestCharacterName} · ${paidUploadComposerCopy.fanRequestTitle}`
                    : paidUploadComposerCopy.fanRequestTitle}
                </h3>
                {initialFanRequestBody ? (
                  <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-6 text-white/72 [overflow-wrap:anywhere]">
                    {initialFanRequestBody}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {initialFanRequestCharacterName ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.64rem] font-semibold text-white/54">
                      {initialFanRequestCharacterName}
                    </span>
                  ) : null}
                  {initialFanRequestType ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.64rem] font-semibold text-white/54">
                      {initialFanRequestType === "message"
                        ? locale === "ko"
                          ? "응원 메시지"
                          : "Support message"
                        : locale === "ko"
                          ? "브이로그 요청"
                          : "Vlog request"}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {blockedState ? (
          blockedState
        ) : (
          <div className="mt-5 space-y-4">
            {recoverableStudioError ? (
              <MessageCard tone="error">{recoverableStudioError}</MessageCard>
            ) : null}
            {!hasActiveCharacter ? (
              <section className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-3 shadow-[0_18px_42px_rgba(180,83,9,0.08)] sm:p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
                    <Sparkles className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-950">
                      {locale === "ko"
                        ? "캐릭터를 먼저 만들면 바로 콘텐츠에 적용됩니다."
                        : "Create a character first to apply it to this post."}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-900/80">
                      {locale === "ko"
                        ? "이름과 분위기만 정하면 작성 화면이 이어집니다."
                        : "Choose a name and mood, then continue writing here."}
                    </p>
                  </div>
                </div>
                {renderQuickCharacterPanel({ showDisplayName: true })}
              </section>
            ) : (
              <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CreatorProfileAvatar
                    avatarImageUrl={state.profile.avatarImageUrl}
                    displayName={state.profile.displayName}
                    fallbackLabel={profileSummaryCopy.fallbackName}
                    sizeClassName="size-11 rounded-full"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      {locale === "ko"
                        ? "캐릭터 자동 적용"
                        : "Character applied"}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {state.profile.characterPersona?.name ||
                        state.profile.displayName ||
                        profileSummaryCopy.fallbackName}
                    </p>
                  </div>
                </div>
              </section>
            )}
            {isPaidUploadComposer ? renderPaidUploadReadinessPanel() : null}
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
            <input
              accept="video/mp4,video/quicktime,video/webm"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void uploadPostVideo(file);
                }

                event.target.value = "";
              }}
              ref={postVideoInputRef}
              type="file"
            />
            {isPaidUploadComposer ? (
              <div className="hidden sm:block">
                {renderPaidUploadVideoPanel()}
              </div>
            ) : null}
            <section className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.07)] sm:hidden">
              {isPaidUploadComposer ? renderPaidUploadVideoPanel() : null}
              <button
                className="group relative block aspect-square w-full overflow-hidden rounded-[26px] border border-dashed border-slate-300 bg-slate-100 text-left"
                disabled={
                  isUploadingPostImage ||
                  isUploadingPostVideo ||
                  isGeneratingPaidVideoFrameCover ||
                  isGeneratingPostImage
                }
                onClick={() => {
                  postImageInputRef.current?.click();
                }}
                type="button"
              >
                {mobilePreviewImage ? (
                  <span
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.22)),url(${mobilePreviewImage})`,
                    }}
                  />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                    <span className="inline-flex size-14 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
                      <ImagePlus className="size-6" />
                    </span>
                    <span className="text-sm font-semibold">
                      {locale === "ko" ? "사진 선택" : "Choose photo"}
                    </span>
                  </span>
                )}
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.24)]">
                  <ImagePlus className="size-3.5" />
                  {mobilePreviewImage
                    ? locale === "ko"
                      ? "커버 변경"
                      : "Change cover"
                    : locale === "ko"
                      ? "커버 선택"
                      : "Select cover"}
                </span>
              </button>

              {isPaidUploadComposer ? (
                <div className="space-y-2 border-y border-slate-100 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    {paidTeaserCoverStyles.map((style) => {
                      const isSelected = paidTeaserCoverStyle === style.id;

                      return (
                        <button
                          className={cn(
                            "min-h-14 rounded-[18px] border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                            isSelected
                              ? "border-amber-300 bg-amber-50 text-amber-950"
                              : "border-slate-200 bg-white text-slate-700",
                          )}
                          disabled={
                            isGeneratingPostImage ||
                            isGeneratingPaidVideoFrameCover
                          }
                          key={style.id}
                          onClick={() => {
                            setPaidTeaserCoverStyle(style.id);
                          }}
                          type="button"
                        >
                          <span className="block text-xs font-semibold leading-4">
                            {style.label}
                          </span>
                          <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                            {style.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {hasUploadedPostVideo ? (
                    <button
                      className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-950 disabled:opacity-50"
                      disabled={
                        isUploadingPostImage ||
                        isUploadingPostVideo ||
                        isGeneratingPaidVideoFrameCover ||
                        isGeneratingPostImage
                      }
                      onClick={() => {
                        void generatePaidVideoFrameCoverFromUploadedVideo({
                          failureNotice:
                            paidUploadComposerCopy.frameCoverRetryFailed,
                          successNotice: paidUploadComposerCopy.frameCoverReady,
                        });
                      }}
                      type="button"
                    >
                      <Film className="size-4" />
                      {isGeneratingPaidVideoFrameCover
                        ? paidUploadComposerCopy.generatingFrameCover
                        : paidUploadComposerCopy.generateFrameCover}
                    </button>
                  ) : null}
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-950 disabled:opacity-50"
                    disabled={
                      isUploadingPostImage ||
                      isUploadingPostVideo ||
                      isGeneratingPaidVideoFrameCover ||
                      isGeneratingPostImage
                    }
                    onClick={() => {
                      startPaidTeaserCoverGeneration();
                    }}
                    type="button"
                  >
                    <Sparkles className="size-4" />
                    {isGeneratingPostImage &&
                    isCoverGenerationDialogOpen &&
                    coverGenerationProgress.active
                      ? paidUploadComposerCopy.generatingTeaserCover
                      : paidUploadComposerCopy.generateTeaserCover}
                  </button>
                </div>
              ) : null}

              <div
                className={cn(
                  "grid gap-2",
                  isPaidUploadComposer ? "grid-cols-1" : "grid-cols-2",
                )}
              >
                <button
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-950"
                  disabled={
                    isUploadingPostImage ||
                    isUploadingPostVideo ||
                    isGeneratingPaidVideoFrameCover ||
                    isGeneratingPostImage
                  }
                  onClick={() => {
                    postGalleryInputRef.current?.click();
                  }}
                  type="button"
                >
                  <LayoutGrid className="size-4" />
                  {locale === "ko" ? "이미지 추가" : "Add images"}
                </button>
                {isPaidUploadComposer ? null : (
                  <button
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 text-xs font-semibold text-amber-950 disabled:opacity-50"
                    disabled={
                      isUploadingPostImage ||
                      isUploadingPostVideo ||
                      isGeneratingPaidVideoFrameCover ||
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
                    {locale === "ko" ? "AI 이미지" : "AI image"}
                  </button>
                )}
              </div>

              {!isPaidUploadComposer ? (
                <div className="rounded-[22px] border border-sky-100 bg-sky-50/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {locale === "ko" ? "콘텐츠 동영상" : "Content video"}
                  </p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-800">
                    {postForm.contentVideoUrls.length}/{CONTENT_VIDEO_LIMIT}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-3 grid gap-2",
                    isPaidUploadComposer ? "grid-cols-1" : "grid-cols-2",
                  )}
                >
                  <button
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-white px-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
                    disabled={
                      isUploadingPostImage ||
                      isUploadingPostVideo ||
                      isGeneratingPaidVideoFrameCover ||
                      isGeneratingPostImage ||
                      postForm.contentVideoUrls.length >= CONTENT_VIDEO_LIMIT
                    }
                    onClick={() => {
                      postVideoInputRef.current?.click();
                    }}
                    type="button"
                  >
                    <Film className="size-4" />
                    {isUploadingPostVideo
                      ? `${Math.round(postVideoUploadProgress)}%`
                      : contentVideoUploadLabel}
                  </button>
                  {isPaidUploadComposer ? null : (
                    <button
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-sky-100 px-2 text-xs font-semibold text-sky-950 disabled:opacity-50"
                      disabled={
                        isUploadingPostImage ||
                        isUploadingPostVideo ||
                        isGeneratingPaidVideoFrameCover ||
                        isGeneratingPostImage ||
                        postForm.contentVideoUrls.length >= CONTENT_VIDEO_LIMIT
                      }
                      onClick={() => {
                        openContentVideoGenerationDialog();
                      }}
                      type="button"
                    >
                      <WandSparkles className="size-4" />
                      {locale === "ko" ? "AI 동영상 생성" : "Generate AI video"}
                    </button>
                  )}
                </div>
                </div>
              ) : null}

              {postForm.contentImageUrls.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {postForm.contentImageUrls.map((imageUrl, index) => (
                    <button
                      className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      key={`${imageUrl}-quick-${index}`}
                      onClick={() => {
                        setPostForm((current) => ({
                          ...current,
                          coverImageUrl: imageUrl,
                        }));
                      }}
                      style={{
                        backgroundImage: `url(${imageUrl})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                      }}
                      type="button"
                    >
                      <span className="sr-only">
                        {locale === "ko" ? "커버로 선택" : "Set as cover"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {postForm.contentVideoUrls.length > 0 ? (
                <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-950">
                  <video
                    className="aspect-video w-full bg-black object-contain"
                    controls
                    playsInline
                    preload="metadata"
                    src={postForm.contentVideoUrls[0]}
                  />
                  <button
                    className="flex h-10 w-full items-center justify-center bg-white text-sm font-semibold text-slate-950"
                    onClick={() => {
                      setPostForm((current) => ({
                        ...current,
                        contentVideoUrls: [],
                        generatedContentVideoUrls: [],
                        priceType: isPaidUploadComposer ? "paid" : "free",
                      }));
                    }}
                    type="button"
                  >
                    {locale === "ko" ? "동영상 제거" : "Remove video"}
                  </button>
                </div>
              ) : null}

              <textarea
                className={cn(
                  "min-h-32 w-full resize-none rounded-[22px] border bg-slate-50 px-4 py-3 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-400",
                  postBodyError
                    ? "border-rose-300 bg-rose-50/50 focus:border-rose-400"
                    : "border-slate-200 focus:border-slate-400",
                )}
                onChange={(event) => {
                  if (postBodyError) {
                    setPostBodyError(null);
                  }
                  setPostForm((current) => ({
                    ...current,
                    body: event.target.value,
                  }));
                }}
                placeholder={
                  locale === "ko" ? "문구 입력..." : "Write a caption..."
                }
                value={postForm.body}
              />
              {postBodyError ? (
                <p className="text-xs font-medium text-rose-600">{postBodyError}</p>
              ) : null}

              {isPaidUploadComposer ? (
                <label className="block text-left">
                  <span className="text-sm font-medium text-slate-900">
                    {paidUploadComposerCopy.previewRequiredLabel}
                  </span>
                  <textarea
                    className="mt-2 min-h-24 w-full resize-none rounded-[22px] border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400"
                    onChange={(event) => {
                      updatePaidUploadPreviewText(event.target.value);
                    }}
                    placeholder={paidUploadComposerCopy.previewPlaceholder}
                    rows={3}
                    value={postForm.previewText}
                  />
                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {paidUploadComposerCopy.previewHint}
                  </span>
                </label>
              ) : null}

              {isPaidUploadComposer ? (
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-950">
                    <Coins className="size-4 text-amber-600" />
                    {CONTENT_PAID_USDT_AMOUNT} USDT
                  </span>
                  <p className="mt-1 text-xs font-medium leading-5 text-amber-900/80">
                    {paidUploadComposerCopy.priceBody}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
                  {(["free", "paid"] as ContentPriceType[]).map((priceType) => {
                    const isSelected = effectivePostPriceType === priceType;
                    const isDisabled =
                      priceType === "paid" ? !hasUploadedPostVideo : hasUploadedPostVideo;

                    return (
                      <button
                        disabled={isDisabled}
                        className={cn(
                          "inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                          isSelected
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-500",
                        )}
                        key={`mobile-${priceType}`}
                        onClick={() => {
                          setPostForm((current) => ({
                            ...current,
                            priceType,
                          }));
                        }}
                        type="button"
                      >
                        {priceType === "paid" ? (
                          <Coins className="size-4 text-amber-600" />
                        ) : (
                          <Check className="size-4 text-emerald-600" />
                        )}
                        {priceType === "paid"
                          ? `${CONTENT_PAID_USDT_AMOUNT} USDT`
                          : contentCopy.labels.free}
                      </button>
                    );
                  })}
                </div>
              )}
              {isPaidUploadComposer && isAdvancedComposerOpen
                ? renderPaidUploadPublicPreview()
                : null}
              {hasUploadedPostVideo || hasGeneratedPostVideo ? (
                <p className="text-center text-xs font-medium leading-5 text-slate-500">
                  {hasUploadedPostVideo
                    ? uploadedVideoPaidPolicyMessage
                    : aiVideoFreePolicyMessage}
                </p>
              ) : (
                <p className="text-center text-xs font-medium leading-5 text-slate-500">
                  {paidUploadRequiredMessage}
                </p>
              )}

              <div className="grid grid-cols-[0.82fr_1.18fr] gap-2">
                <button
                  aria-busy={savingPostStatus === "draft"}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  disabled={draftDisabled}
                  onClick={() => {
                    void createPost("draft");
                  }}
                  type="button"
                >
                  {savingPostStatus === "draft" ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      {postSaveProgressCopy.draft}
                    </>
                  ) : (
                    contentCopy.actions.saveDraft
                  )}
                </button>
                <button
                  aria-busy={savingPostStatus === "published"}
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed",
                    publishRequirementMessage &&
                      savingPostStatus !== "published"
                      ? "bg-slate-200 text-slate-500 shadow-none"
                      : publishReadyClass,
                  )}
                  disabled={publishDisabled}
                  onClick={() => {
                    void createPost("published");
                  }}
                  type="button"
                >
                  {savingPostStatus === "published" ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      {postSaveProgressCopy.publish}
                    </>
                  ) : (
                    publishActionLabel
                  )}
                </button>
              </div>
              {publishRequirementMessage ? (
                <p className="text-center text-xs font-medium leading-5 text-slate-500">
                  {publishRequirementMessage}
                </p>
              ) : null}

              <button
                className="inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-semibold text-slate-500"
                onClick={() => {
                  setIsAdvancedComposerOpen((current) => !current);
                }}
                type="button"
              >
                {isAdvancedComposerOpen
                  ? locale === "ko"
                    ? "상세 옵션 닫기"
                    : "Hide details"
                  : locale === "ko"
                    ? "제목·요약·커버 상세 설정"
                    : "Title, summary, cover settings"}
              </button>
            </section>
            <div
              className={cn(
                "space-y-4",
                isAdvancedComposerOpen ? "block" : "hidden sm:block",
              )}
            >
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
              {isPaidUploadComposer ? (
                <TextAreaField
                  hint={paidUploadComposerCopy.previewHint}
                  label={paidUploadComposerCopy.previewRequiredLabel}
                  onChange={(value) => {
                    updatePaidUploadPreviewText(value);
                  }}
                  placeholder={paidUploadComposerCopy.previewPlaceholder}
                  rows={3}
                  value={postForm.previewText}
                />
              ) : null}
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {locale === "ko" ? "판매 방식" : "Access type"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {locale === "ko"
                        ? "커버 이미지는 항상 피드에 공개되고, 유료 콘텐츠 이미지와 본문은 결제 후 열람됩니다."
                        : "Cover images stay visible in the feed. Paid body and gallery images unlock after payment."}
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                    {CONTENT_PAID_USDT_AMOUNT} USDT
                  </span>
                </div>
                {isPaidUploadComposer ? (
                  <div className="mt-4 rounded-[18px] border border-slate-950 bg-white px-4 py-3 text-left shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Coins className="size-4 text-amber-600" />
                      {CONTENT_PAID_USDT_AMOUNT} USDT
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {paidUploadComposerCopy.priceBody}
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(["free", "paid"] as ContentPriceType[]).map((priceType) => {
                      const isSelected = effectivePostPriceType === priceType;
                      const isDisabled =
                        priceType === "paid" ? !hasUploadedPostVideo : hasUploadedPostVideo;
                      const title =
                        priceType === "paid"
                          ? locale === "ko"
                            ? "유료"
                            : "Paid"
                          : contentCopy.labels.free;
                      const description =
                        priceType === "paid"
                          ? hasUploadedPostVideo
                            ? locale === "ko"
                              ? "직접 업로드한 동영상과 상세 본문을 1 USDT로 잠급니다."
                              : "Lock the uploaded video and detail body for 1 USDT."
                            : paidUploadRequiredMessage
                          : locale === "ko"
                            ? "AI 생성 동영상과 일반 콘텐츠는 무료 공개로 저장됩니다."
                            : "AI-generated videos and regular content are saved as free public.";

                      return (
                        <button
                          disabled={isDisabled}
                          className={cn(
                            "rounded-[18px] border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
                            isSelected
                              ? "border-slate-950 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
                              : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white",
                          )}
                          key={priceType}
                          onClick={() => {
                            setPostForm((current) => ({
                              ...current,
                              priceType,
                            }));
                          }}
                          type="button"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                            {priceType === "paid" ? (
                              <Coins className="size-4 text-amber-600" />
                            ) : (
                              <Check className="size-4 text-emerald-600" />
                            )}
                            {title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
                  {hasUploadedPostVideo
                    ? uploadedVideoPaidPolicyMessage
                    : hasGeneratedPostVideo
                      ? aiVideoFreePolicyMessage
                      : paidUploadRequiredMessage}
                </p>
                {effectivePostPriceType === "paid" ? (
                  <div className="mt-4 rounded-[18px] border border-white bg-white px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          thirdweb server wallet
                        </p>
                        <p className="mt-1 break-all text-sm font-medium text-slate-900">
                          {state.profile.payoutWalletAddress ||
                            (locale === "ko"
                              ? "유료 게시 전에 자동 생성됩니다."
                            : "Created before publishing paid content.")}
                      </p>
                    </div>
                    {!state.profile.payoutWalletAddress ? (
                      <button
                        className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        disabled={isCreatingSellerWallet || isDisconnected}
                        onClick={() => {
                          void createSellerWallet();
                        }}
                        type="button"
                      >
                        {isCreatingSellerWallet ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Coins className="size-4" />
                        )}
                        {locale === "ko" ? "지갑 생성" : "Create wallet"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={
                    isUploadingPostImage ||
                    isUploadingPostVideo ||
                    isGeneratingPaidVideoFrameCover ||
                    isGeneratingPostImage
                  }
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
                {isPaidUploadComposer && hasUploadedPostVideo ? (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-950 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={
                      isUploadingPostImage ||
                      isUploadingPostVideo ||
                      isGeneratingPaidVideoFrameCover ||
                      isGeneratingPostImage
                    }
                    onClick={() => {
                      void generatePaidVideoFrameCoverFromUploadedVideo({
                        failureNotice:
                          paidUploadComposerCopy.frameCoverRetryFailed,
                        successNotice: paidUploadComposerCopy.frameCoverReady,
                      });
                    }}
                    type="button"
                  >
                    <Film className="size-4" />
                    {isGeneratingPaidVideoFrameCover
                      ? paidUploadComposerCopy.generatingFrameCover
                      : paidUploadComposerCopy.generateFrameCover}
                  </button>
                ) : null}
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={
                    isUploadingPostImage ||
                    isUploadingPostVideo ||
                    isGeneratingPaidVideoFrameCover ||
                    isGeneratingPostImage ||
                    (!isPaidUploadComposer && !canGeneratePostCover)
                  }
                  onClick={() => {
                    if (isPaidUploadComposer) {
                      startPaidTeaserCoverGeneration();
                      return;
                    }

                    openCoverGenerationDialog();
                  }}
                  type="button"
                >
                  <Sparkles className="size-4" />
                  {isPaidUploadComposer ? (
                    isGeneratingPostImage &&
                    isCoverGenerationDialogOpen &&
                    coverGenerationProgress.active ? (
                      paidUploadComposerCopy.generatingTeaserCover
                    ) : (
                      paidUploadComposerCopy.generateTeaserCover
                    )
                  ) : isGeneratingPostImage &&
                    isCoverGenerationDialogOpen &&
                    coverGenerationProgress.active ? (
                    contentCopy.actions.generatingAiCover
                  ) : (
                    contentCopy.actions.generateAiCover
                  )}
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
              {isPaidUploadComposer ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {paidTeaserCoverStyles.map((style) => {
                    const isSelected = paidTeaserCoverStyle === style.id;

                    return (
                      <button
                        className={cn(
                          "min-h-16 rounded-[18px] border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                          isSelected
                            ? "border-amber-300 bg-amber-50 text-amber-950 shadow-[0_10px_24px_rgba(245,158,11,0.14)]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                        )}
                        disabled={
                          isGeneratingPostImage ||
                          isGeneratingPaidVideoFrameCover
                        }
                        key={style.id}
                        onClick={() => {
                          setPaidTeaserCoverStyle(style.id);
                        }}
                        type="button"
                      >
                        <span className="block text-sm font-semibold leading-5">
                          {style.label}
                        </span>
                        <span className="mt-1 block text-xs leading-4 text-slate-500">
                          {style.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
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
                  {isPaidUploadComposer ? null : (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                      {locale === "ko" ? "AI" : "AI"}{" "}
                      {postForm.generatedContentImageUrls.length}/
                      {GENERATED_CONTENT_IMAGE_LIMIT}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={
                    isUploadingPostImage ||
                    isUploadingPostVideo ||
                    isGeneratingPaidVideoFrameCover ||
                    isGeneratingPostImage
                  }
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
                {isPaidUploadComposer ? null : (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={
                      isUploadingPostImage ||
                      isUploadingPostVideo ||
                      isGeneratingPaidVideoFrameCover ||
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
                )}
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
                    ? isPaidUploadComposer
                      ? paidUploadComposerCopy.imageEmpty
                      : `상세 페이지에서 좌우로 넘겨볼 콘텐츠 이미지를 추가해보세요. 직접 업로드하거나 AI로 최대 ${GENERATED_CONTENT_IMAGE_LIMIT}장까지 생성할 수 있습니다.`
                    : isPaidUploadComposer
                      ? paidUploadComposerCopy.imageEmpty
                      : `Add content images for the swipeable detail page. You can upload your own or generate up to ${GENERATED_CONTENT_IMAGE_LIMIT} with AI.`}
                </div>
              )}
            </div>
            {!isPaidUploadComposer ? (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {locale === "ko" ? "콘텐츠 동영상" : "Content video"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {isPaidUploadComposer
                      ? paidUploadComposerCopy.videoHint
                      : locale === "ko"
                        ? "직접 업로드한 MP4, MOV, WEBM 동영상은 유료 콘텐츠로 저장되고, AI 생성 동영상은 무료 공개로 저장됩니다. 최대 1개, 200MB 이하입니다."
                        : "Direct MP4, MOV, or WEBM uploads are saved as paid content, while AI-generated videos are saved as free public content. One video, 200MB max."}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {postForm.contentVideoUrls.length}/{CONTENT_VIDEO_LIMIT}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={
                    isUploadingPostImage ||
                    isUploadingPostVideo ||
                    isGeneratingPaidVideoFrameCover ||
                    isGeneratingPostImage ||
                    postForm.contentVideoUrls.length >= CONTENT_VIDEO_LIMIT
                  }
                  onClick={() => {
                    postVideoInputRef.current?.click();
                  }}
                  type="button"
                >
                  {isUploadingPostVideo ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Film className="size-4" />
                  )}
                  {isUploadingPostVideo
                    ? `${Math.round(postVideoUploadProgress)}%`
                    : contentVideoUploadLabel}
                </button>
                {isPaidUploadComposer ? null : (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-950 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={
                      isUploadingPostImage ||
                      isUploadingPostVideo ||
                      isGeneratingPaidVideoFrameCover ||
                      isGeneratingPostImage ||
                      postForm.contentVideoUrls.length >= CONTENT_VIDEO_LIMIT
                    }
                    onClick={() => {
                      openContentVideoGenerationDialog();
                    }}
                    type="button"
                  >
                    <WandSparkles className="size-4" />
                    {isGeneratingPostImage &&
                    isContentVideoGenerationDialogOpen &&
                    contentVideoGenerationProgress.active
                      ? locale === "ko"
                        ? "AI 동영상 생성 중..."
                        : "Generating AI video..."
                      : aiContentVideoLabel}
                  </button>
                )}
                {postForm.contentVideoUrls.length > 0 ? (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    onClick={() => {
                      setPostForm((current) => ({
                        ...current,
                        contentVideoUrls: [],
                        generatedContentVideoUrls: [],
                        priceType: isPaidUploadComposer ? "paid" : "free",
                      }));
                    }}
                    type="button"
                  >
                    {locale === "ko" ? "동영상 제거" : "Remove video"}
                  </button>
                ) : null}
              </div>
              {postForm.contentVideoUrls.length > 0 ? (
                <div className="relative mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  {postForm.generatedContentVideoUrls.includes(
                    postForm.contentVideoUrls[0] ?? "",
                  ) ? (
                    <span className="absolute left-2 top-2 z-10 inline-flex h-8 items-center justify-center rounded-full bg-sky-100/95 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900 shadow-sm">
                      AI
                    </span>
                  ) : null}
                  <video
                    className="aspect-video w-full bg-black object-contain"
                    controls
                    playsInline
                    preload="metadata"
                    src={postForm.contentVideoUrls[0]}
                  />
                </div>
              ) : null}
              </div>
            ) : null}
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
                aria-busy={savingPostStatus === "draft"}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:w-auto"
                disabled={draftDisabled}
                onClick={() => {
                  void createPost("draft");
                }}
                type="button"
              >
                {savingPostStatus === "draft" ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    {postSaveProgressCopy.draft}
                  </>
                ) : (
                  contentCopy.actions.saveDraft
                )}
              </button>
              <button
                aria-busy={savingPostStatus === "published"}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed sm:w-auto",
                  publishRequirementMessage &&
                    savingPostStatus !== "published"
                    ? "bg-slate-200 text-slate-500 shadow-none"
                    : publishReadyClassCompact,
                )}
                disabled={publishDisabled}
                onClick={() => {
                  void createPost("published");
                }}
                type="button"
              >
                {savingPostStatus === "published" ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    {postSaveProgressCopy.publish}
                  </>
                ) : (
                  publishActionLabel
                )}
              </button>
            </div>
            {publishRequirementMessage ? (
              <p className="text-sm font-medium leading-6 text-slate-500">
                {publishRequirementMessage}
              </p>
            ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStudioTabs() {
    const tabs: CreatorStudioTabItem[] = [
      {
        href: studioHomeHref,
        isActive: view === "hub",
        label: contentCopy.labels.studioHome,
      },
      {
        href: profileHref,
        isActive: view === "profile" || view === "character",
        label: contentCopy.labels.creatorSettings,
      },
      {
        href: newPostHref,
        isActive: view === "new",
        label: isPaidUploadComposer
          ? paidUploadComposerCopy.title
          : contentCopy.actions.createPost,
      },
      {
        href: postsManagerHref,
        isActive: false,
        label: contentCopy.actions.managePosts,
      },
      {
        href: salesManagerHref,
        isActive: false,
        label: salesManagerLabel,
      },
    ];

    return (
      <CreatorStudioTabs
        items={tabs}
        tone={isFanletterPaidUpload ? "fanletter" : "default"}
      />
    );
  }

  function renderWorkspaceOverviewCard() {
    const workspaceMessage = isConnectionResolving
      ? contentCopy.messages.postsLoading
      : isDisconnected
      ? contentCopy.messages.connectRequired
      : state.status === "loading"
        ? contentCopy.messages.detailLoadingDescription
        : state.error && state.member?.status !== "completed"
          ? state.error
          : contentCopy.page.studioDescription;

    return (
      <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] sm:p-5 sm:shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
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

  function renderProfileSummaryCard() {
    const displayName =
      state.profile.displayName.trim() || profileSummaryCopy.fallbackName;
    const intro = state.profile.intro.trim() || profileSummaryCopy.fallbackIntro;
    const walletLabel = state.profile.payoutWalletAddress
      ? `${profileSummaryCopy.salesWalletReady} · ${formatAddressLabel(
          state.profile.payoutWalletAddress,
        )}`
      : profileSummaryCopy.salesWalletMissing;

    return (
      <Link
        className="block h-full rounded-[22px] border border-cyan-100 bg-[linear-gradient(180deg,rgba(236,254,255,0.96),rgba(255,255,255,0.96))] p-4 text-left shadow-none transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(8,145,178,0.14)] sm:rounded-[30px] sm:p-5 sm:shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
        href={profileHref}
      >
        <div className="flex min-h-[124px] flex-col justify-between sm:min-h-[190px]">
          <div>
            <div className="flex items-start justify-between gap-4">
              <CreatorProfileAvatar
                avatarImageUrl={state.profile.avatarImageUrl}
                displayName={displayName}
                fallbackLabel={profileSummaryCopy.fallbackName}
                sizeClassName="size-12"
              />
              <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-white px-3 text-xs font-semibold text-slate-950">
                {profileSummaryCopy.edit}
              </span>
            </div>
            <div className="mt-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                {profileSummaryCopy.configured}
              </p>
              <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                {displayName}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                {intro}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-semibold text-slate-600">
              {walletLabel}
            </span>
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-white text-cyan-800">
              <UserRound className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  function renderHubActionCards() {
    return (
      <section className="space-y-3">
        <div>
          <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {contentCopy.labels.quickActions}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {state.profileConfigured ? (
            renderProfileSummaryCard()
          ) : (
            <WorkspaceLaunchCard
              description={profileSummaryCopy.notConfigured}
              disabled={!canUseWorkspace}
              href={profileHref}
              icon={<UserRound className="size-5" />}
              title={contentCopy.labels.creatorSettings}
            />
          )}
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
          <WorkspaceShareCard
            description={feedShareCopy.description}
            disabled={!canShareCreatorFeed}
            icon={<Rss className="size-5" />}
            onShare={() => {
              void handleShareCreatorFeed();
            }}
            state={feedShareState}
            stateLabels={{
              copied: feedShareCopy.copied,
              error: feedShareCopy.error,
              sharing: feedShareCopy.sharing,
            }}
            title={feedShareCopy.title}
          />
          <WorkspaceLaunchCard
            description={
              locale === "ko"
                ? "유료 콘텐츠 판매 내역과 판매용 지갑 잔고를 관리합니다."
                : "Manage paid content sales and seller wallet balance."
            }
            disabled={!canUseWorkspace}
            href={salesManagerHref}
            icon={<Coins className="size-5" />}
            title={salesManagerLabel}
          />
        </div>
      </section>
    );
  }

  function renderEmptyPostsGuide() {
    return (
      <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#155e75_100%)] px-4 py-5 text-white sm:px-5 sm:py-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-50/86 backdrop-blur-md">
              <Sparkles className="size-3.5" />
              {emptyStudioCopy.eyebrow}
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              {emptyStudioCopy.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {emptyStudioCopy.description}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white bg-white px-5 text-sm font-bold !text-slate-950 shadow-[0_18px_38px_rgba(2,6,23,0.28)] ring-1 ring-cyan-100/80 transition hover:-translate-y-0.5 hover:bg-cyan-50"
                href={newPostHref}
              >
                <PenSquare className="size-4" />
                {emptyStudioCopy.ctaCreate}
              </Link>
              {state.profileConfigured ? (
                <div className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/18 bg-white/12 py-1.5 pl-2 pr-4 text-left text-white backdrop-blur-md">
                  <CreatorProfileAvatar
                    avatarImageUrl={state.profile.avatarImageUrl}
                    displayName={state.profile.displayName}
                    fallbackLabel={profileSummaryCopy.fallbackName}
                    sizeClassName="size-9"
                  />
                  <span className="min-w-0">
                    <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                      {profileSummaryCopy.configured}
                    </span>
                    <span className="block max-w-[13rem] truncate text-sm font-semibold">
                      {state.profile.displayName || profileSummaryCopy.fallbackName}
                    </span>
                  </span>
                </div>
              ) : (
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-5 text-sm font-semibold !text-slate-950 shadow-[0_14px_30px_rgba(8,145,178,0.18)] transition hover:-translate-y-0.5 hover:border-white hover:bg-white"
                  href={profileHref}
                >
                  <UserRound className="size-4" />
                  {emptyStudioCopy.ctaProfile}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          {emptyStudioCopy.steps.map((step, index) => {
            const StepIcon = index === 0 ? UserRound : index === 1 ? PenSquare : Rss;

            return (
              <div
                className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                key={step}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <StepIcon className="size-4" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                  {step}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 border-t border-slate-200/80 bg-slate-50/80 p-4 sm:grid-cols-2 sm:p-5">
          <div className="flex gap-3 rounded-[20px] bg-white p-3 text-sm leading-6 text-slate-600">
            <Coins className="mt-1 size-4 shrink-0 text-amber-600" />
            <span>{emptyStudioCopy.paidHint}</span>
          </div>
          <div className="flex gap-3 rounded-[20px] bg-white p-3 text-sm leading-6 text-slate-600">
            <Share2 className="mt-1 size-4 shrink-0 text-cyan-700" />
            <span>{emptyStudioCopy.shareHint}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderRecentPostsPanel(options?: {
    compact?: boolean;
    hideManageLink?: boolean;
    tone?: "default" | "fanletter";
  }) {
    const compact = options?.compact ?? false;
    const hideManageLink = options?.hideManageLink ?? false;
    const isFanletterPanel = options?.tone === "fanletter";
    const posts = sortedPosts.slice(
      0,
      compact ? HUB_COMPACT_POST_PAGE_SIZE : HUB_FULL_POST_PAGE_SIZE,
    );
    const feedShareStateLabel =
      feedShareState === "copied"
        ? feedShareCopy.copied
        : feedShareState === "error"
          ? feedShareCopy.error
          : feedShareState === "sharing"
            ? feedShareCopy.sharing
            : null;

    return (
      <div
        className={cn(
          "border-y p-4 shadow-none sm:rounded-[30px] sm:border sm:p-5 sm:shadow-[0_22px_55px_rgba(15,23,42,0.08)]",
          isFanletterPanel
            ? "border-[#44f26e]/18 bg-[#07100b] text-white sm:border-[#44f26e]/18 sm:bg-[#07100b]"
            : "border-slate-200/80 bg-white sm:border-white/80 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={cn("eyebrow", isFanletterPanel && "!text-[#44f26e]")}>
              {contentCopy.page.feedEyebrow}
            </p>
            <h2
              className={cn(
                "text-xl font-semibold tracking-tight",
                isFanletterPanel ? "text-white" : "text-slate-950",
              )}
            >
              {contentCopy.labels.recentPosts}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canUseWorkspace && !hideManageLink ? (
              <Link
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                  isFanletterPanel
                    ? "border-[#44f26e]/34 bg-[#44f26e] !text-black hover:border-[#64ff84] hover:bg-[#64ff84]"
                    : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50",
                )}
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

        {isConnectionResolving ? (
          isFanletterPanel ? (
            <MessageCard tone="fanletter">
              {contentCopy.messages.postsLoading}
            </MessageCard>
          ) : (
            <StudioLoadingCard />
          )
        ) : isDisconnected ? (
          <MessageCard tone={isFanletterPanel ? "fanletter" : "neutral"}>
            {contentCopy.messages.connectRequired}
          </MessageCard>
        ) : state.status === "loading" ? (
          isFanletterPanel ? (
            <MessageCard tone="fanletter">
              {contentCopy.messages.postsLoading}
            </MessageCard>
          ) : (
            <StudioLoadingCard />
          )
        ) : state.error && state.posts.length === 0 ? (
          <MessageCard tone="error">{state.error}</MessageCard>
        ) : posts.length === 0 ? (
          isFanletterPanel ? (
            <MessageCard tone="fanletter">
              {contentCopy.messages.noMatchingPosts}
            </MessageCard>
          ) : (
            renderEmptyPostsGuide()
          )
        ) : (
          <div className="mt-4 space-y-3">
            <div
              className={cn(
                "rounded-[24px] border p-4 text-white shadow-[0_20px_48px_rgba(15,23,42,0.24)]",
                isFanletterPanel
                  ? "border-[#44f26e]/20 bg-[#44f26e]/10"
                  : "border-slate-900/10 bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#155e75_100%)]",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-cyan-100 ring-1 ring-white/14">
                    <Rss className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight">
                      {feedShareCopy.recentTitle}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                      {feedShareCopy.recentDescription}
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 shadow-[0_14px_30px_rgba(2,6,23,0.28)] transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:bg-white/92 disabled:text-slate-700 sm:w-auto"
                  disabled={!canShareCreatorFeed || feedShareState === "sharing"}
                  onClick={() => {
                    void handleShareCreatorFeed();
                  }}
                  type="button"
                >
                  {feedShareState === "sharing" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : feedShareState === "copied" ? (
                    <Check className="size-4" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                  <span>
                    {feedShareStateLabel ??
                      (canShareCreatorFeed
                        ? feedShareCopy.action
                        : feedShareCopy.disabled)}
                  </span>
                </button>
              </div>
            </div>
            {posts.map((post) => {
              const previewImageUrl = resolveStudioPostPreviewImage(post);
              const previewVideoUrl = previewImageUrl
                ? null
                : resolveStudioPostPreviewVideo(post);
              const hasVideo = post.contentVideoUrls.length > 0;

              return (
                <article
                  className={cn(
                    "rounded-[24px] border p-4",
                    isFanletterPanel
                      ? "border-white/10 bg-white/[0.055]"
                      : "border-white/80 bg-white/90",
                  )}
                  key={post.contentId}
                >
                {previewImageUrl || previewVideoUrl ? (
                  <div className="relative mb-4 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-900/90">
                    {previewImageUrl ? (
                      <div
                        className="h-36 w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${previewImageUrl})`,
                        }}
                      />
                    ) : (
                      <video
                        autoPlay
                        className="h-36 w-full bg-black object-cover"
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        src={previewVideoUrl ?? undefined}
                      />
                    )}
                    {hasVideo ? (
                      <span className="absolute left-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-950/78 px-3 text-xs font-semibold text-white shadow-sm backdrop-blur">
                        <Film className="size-3.5" />
                        {locale === "ko" ? "동영상" : "Video"}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={post.status} />
                  <StatusBadge status={post.priceType} />
                </div>
                <h3
                  className={cn(
                    "mt-3 text-lg font-semibold tracking-tight",
                    isFanletterPanel ? "text-white" : "text-slate-950",
                  )}
                >
                  {post.title}
                </h3>
                <p
                  className={cn(
                    "mt-2 text-sm leading-6",
                    isFanletterPanel ? "text-white/60" : "text-slate-600",
                  )}
                >
                  {post.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className={cn(
                      "inline-flex h-10 w-full items-center justify-center rounded-full border px-4 text-sm font-medium transition sm:w-auto",
                      isFanletterPanel
                        ? "border-[#44f26e]/28 bg-[#44f26e] !text-black hover:bg-[#64ff84]"
                        : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50",
                    )}
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
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition sm:w-auto",
                        isFanletterPanel
                          ? "bg-[#44f26e] text-black hover:bg-[#64ff84]"
                          : "bg-slate-950 text-white hover:bg-slate-800",
                      )}
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
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-center rounded-full border px-4 text-sm font-medium transition sm:w-auto",
                        isFanletterPanel
                          ? "border-white/14 bg-white/[0.04] text-white hover:bg-white/10"
                          : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50",
                      )}
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
              );
            })}

            {!compact && state.summary.all > HUB_FULL_POST_PAGE_SIZE ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                    isFanletterPanel
                      ? "border-[#44f26e]/28 bg-[#44f26e] !text-black hover:bg-[#64ff84]"
                      : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50",
                  )}
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
      <section className="grid gap-3 lg:hidden">
        {renderRecentPostsPanel({ compact: true, hideManageLink: true })}
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
      <div className="hidden space-y-4 xl:sticky xl:top-6 xl:block xl:self-start">
        <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[28px] sm:border sm:border-white/80 sm:bg-white/80 sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:backdrop-blur-[18px]">
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
            <WorkspaceSupportLink
              description={
                locale === "ko"
                  ? "유료 콘텐츠 판매 내역과 판매용 지갑 잔고를 관리합니다."
                  : "Manage paid content sales and seller wallet balance."
              }
              disabled={!canUseWorkspace}
              href={salesManagerHref}
              icon={<Coins className="size-5" />}
              title={salesManagerLabel}
            />
          </div>
        </div>
        {renderRecentPostsPanel({ compact: true })}
      </div>
    );
  }

  function renderFanletterPaidUploadRail() {
    if (
      !isFanletterPaidUpload ||
      isConnectionResolving ||
      isDisconnected ||
      isPaidUploadRequestBlocked
    ) {
      return null;
    }

    return (
      <div className="hidden space-y-4 xl:sticky xl:top-6 xl:block xl:self-start">
        {renderPaidUploadPublicPreview({ compact: true })}
        <div className="rounded-lg border border-[#44f26e]/22 bg-[#07100b] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-semibold text-white">
            {paidUploadComposerCopy.publishConditionsTitle}
          </p>
          <div className="mt-3 space-y-2">
            {paidUploadComposerCopy.rules.map((rule) => (
              <div
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-semibold leading-5 text-white/64"
                key={rule}
              >
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#44f26e]" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
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
  const headerDescription = isFanletterPaidUpload
    ? pageDescription
    : isConnectionResolving || state.status === "loading"
      ? contentCopy.messages.detailLoadingDescription
      : isDisconnected
        ? contentCopy.messages.connectRequired
        : pageDescription;
  const headerStats: CreatorStudioHeaderStat[] =
    view === "hub"
      ? [
          {
            label: contentCopy.labels.posts,
            value: String(state.summary.all),
          },
          {
            label: contentCopy.labels.published,
            value: String(publishedCount),
          },
          {
            label: contentCopy.labels.draft,
            value: String(draftCount),
          },
          {
            label: contentCopy.labels.author,
            value: state.profile.displayName || "-",
          },
        ]
      : [];
  const shouldRenderFanletterPaidUploadRail =
    isFanletterPaidUpload &&
    !isConnectionResolving &&
    !isDisconnected &&
    !isPaidUploadRequestBlocked;

  if (shell === "embedded" && view === "character") {
    return <>{renderCharacterChangeCard()}</>;
  }

  return (
    <>
      <main
        className={cn(
          "mx-auto flex min-h-screen w-full flex-col gap-3 px-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-0 sm:gap-5 sm:px-6 sm:py-6 lg:px-8",
          isFanletterPaidUpload
            ? "max-w-7xl bg-[#030504] sm:px-5 lg:px-8"
            : "max-w-6xl",
        )}
      >

      <CreatorStudioHeader
        backHref={backHref}
        description={headerDescription}
        eyebrow={
          isFanletterPaidUpload
            ? paidUploadComposerCopy.eyebrow
            : contentCopy.page.studioEyebrow
        }
        refreshDisabled={state.status === "loading"}
        refreshLabel={contentCopy.actions.refresh}
        refreshLoading={state.status === "loading"}
        shortcutHref={headerShortcutHref}
        shortcutLabel={headerShortcutLabel}
        stats={headerStats}
        tone={isFanletterPaidUpload ? "fanletter" : "default"}
        title={pageTitle}
        onRefresh={() => {
          void loadStudio();
        }}
      />

      {isFanletterPaidUpload ? null : renderStudioTabs()}

      {view === "hub" ? (
        <>
          {renderMobileHub()}
          <section className="hidden gap-5 lg:grid lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-3 sm:space-y-5">
              {renderWorkspaceOverviewCard()}
              {renderHubActionCards()}
            </div>
            {renderRecentPostsPanel({ compact: true })}
          </section>
        </>
      ) : view === "profile" ? (
        <section className="mx-auto w-full max-w-6xl">
          <div className="grid gap-3 sm:gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3 sm:space-y-5 xl:sticky xl:top-6 xl:self-start">
              {renderProfileCard()}
            </div>
            <div className="space-y-3 sm:space-y-5">
              {renderAutomationPanel()}
              {renderAutomationJobsPanel()}
            </div>
          </div>
        </section>
      ) : view === "character" ? (
        <section className="mx-auto w-full max-w-4xl">
          {renderCharacterChangeCard()}
        </section>
      ) : (
        <section
          className={cn(
            "grid gap-3 sm:gap-5",
            isFanletterPaidUpload
              ? shouldRenderFanletterPaidUploadRail
                ? "xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.38fr)]"
                : "mx-auto w-full max-w-4xl"
              : "xl:grid-cols-[1.02fr_0.98fr]",
          )}
        >
          {renderComposerCard()}
          {isFanletterPaidUpload
            ? shouldRenderFanletterPaidUploadRail
              ? renderFanletterPaidUploadRail()
              : null
            : renderSideRail("profile")}
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
          stepMeta={contentImageGenerationStepMeta}
          stepOrder={contentCoverGenerationProgressSteps}
          summary={postForm.summary}
          title={postForm.title}
          onPromptValueChange={setContentImagePrompt}
        />
      ) : null}
      {isContentVideoGenerationDialogOpen ? (
        <CoverGenerationDialog
          canClose={!isGeneratingPostImage}
          labels={contentVideoGenerationLabels}
          onClose={closeContentVideoGenerationDialog}
          onConfirm={() => {
            void generatePostContentVideo();
          }}
          promptHint={contentVideoGenerationLabels.promptHint}
          promptLabel={contentVideoGenerationLabels.promptLabel}
          promptPlaceholder={contentVideoGenerationLabels.promptPlaceholder}
          promptValue={contentVideoPrompt}
          progress={contentVideoGenerationProgress}
          stepCount={completedContentVideoGenerationStepCount}
          stepMeta={contentVideoGenerationStepMeta}
          stepOrder={contentCoverGenerationProgressSteps}
          summary={postForm.summary}
          title={postForm.title}
          onPromptValueChange={setContentVideoPrompt}
        />
      ) : null}
      {showMobileNav ? (
        <CreatorStudioMobileNav
          active={view === "character" ? "profile" : view}
          locale={locale}
          referralCode={referralCode}
          returnToHref={returnToHref}
        />
      ) : null}
    </>
  );
}

function CreatorProfileAvatar({
  avatarImageUrl,
  displayName,
  fallbackLabel,
  sizeClassName,
}: {
  avatarImageUrl: string | null | undefined;
  displayName: string;
  fallbackLabel: string;
  sizeClassName: string;
}) {
  const label = displayName.trim() || fallbackLabel;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white ring-1 ring-white/40",
        sizeClassName,
      )}
    >
      {avatarImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={label}
          className="size-full object-cover"
          src={avatarImageUrl}
        />
      ) : (
        <UserRound className="size-5" />
      )}
    </span>
  );
}

function formatAddressLabel(address?: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
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
  placeholder,
  rows,
  value,
}: {
  error?: string | null;
  hint: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
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
        "rounded-[22px] border border-slate-200 bg-white p-4 shadow-none transition sm:rounded-[30px] sm:p-5 sm:shadow-[0_18px_44px_rgba(15,23,42,0.08)] " +
        (disabled
          ? "cursor-not-allowed bg-slate-50/95 sm:border-slate-200"
          : "sm:border-white/80 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]")
      }
    >
      <div
        className={
          compact
            ? "flex items-start justify-between gap-4"
            : "flex min-h-[124px] flex-col justify-between sm:min-h-[190px]"
        }
      >
        <div className={compact ? "flex min-w-0 items-start gap-4" : undefined}>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white sm:size-12">
            {icon}
          </div>
          <div className={compact ? "min-w-0 pt-1" : "mt-5"}>
            <h3 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
              {title}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6 sm:text-slate-600">
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

function WorkspaceShareCard({
  description,
  disabled = false,
  icon,
  onShare,
  state,
  stateLabels,
  title,
}: {
  description: string;
  disabled?: boolean;
  icon: React.ReactNode;
  onShare: () => void;
  state: "copied" | "error" | "idle" | "sharing";
  stateLabels: {
    copied: string;
    error: string;
    sharing: string;
  };
  title: string;
}) {
  const stateLabel =
    state === "copied"
      ? stateLabels.copied
      : state === "error"
        ? stateLabels.error
        : state === "sharing"
          ? stateLabels.sharing
          : null;

  return (
    <button
      className={
        "block h-full rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-none transition sm:rounded-[30px] sm:p-5 sm:shadow-[0_18px_44px_rgba(15,23,42,0.08)] " +
        (disabled
          ? "cursor-not-allowed bg-slate-50/95 sm:border-slate-200"
          : "sm:border-white/80 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]")
      }
      disabled={disabled}
      onClick={onShare}
      type="button"
    >
      <div className="flex min-h-[124px] flex-col justify-between sm:min-h-[190px]">
        <div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white sm:size-12">
            {icon}
          </div>
          <div className="mt-5">
            <h3 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
              {title}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6 sm:text-slate-600">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          {stateLabel ? (
            <span
              className={cn(
                "truncate text-xs font-semibold",
                state === "error" ? "text-rose-600" : "text-slate-500",
              )}
            >
              {stateLabel}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950">
            {state === "copied" ? (
              <Check className="size-4" />
            ) : state === "error" ? (
              <Copy className="size-4" />
            ) : (
              <Share2 className="size-4" />
            )}
          </span>
        </div>
      </div>
    </button>
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
          ? "cursor-not-allowed border-slate-200 bg-slate-50/95"
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
    diagnostic?: {
      copy: string;
      copied: string;
      fieldErrors: string;
      kind: string;
      model: string;
      modelOptions: string;
      requestId: string;
      response: string;
      status: string;
      title: string;
      unavailable: string;
    };
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
  const hasPromptInput = typeof onPromptValueChange === "function";
  const responseUrl = progress.response?.url ?? "";
  const isVideoResponse =
    progress.response?.contentType.startsWith("video/") ||
    /\.(mp4|mov|webm)(?:$|\?)/i.test(responseUrl);
  const [diagnosticCopied, setDiagnosticCopied] = useState(false);
  const diagnosticLabels = labels.diagnostic;
  const failureDiagnostic =
    progress.error && diagnosticLabels ? progress.diagnostic : null;
  const diagnosticOptionText = failureDiagnostic
    ? createGenerationDiagnosticOptionText(failureDiagnostic)
    : "";
  const diagnosticRows =
    failureDiagnostic && diagnosticLabels
      ? [
          {
            label: diagnosticLabels.kind,
            value: failureDiagnostic.kind,
          },
          {
            label: diagnosticLabels.status,
            value: formatDiagnosticValue(failureDiagnostic.status),
          },
          {
            label: diagnosticLabels.requestId,
            value: failureDiagnostic.requestId,
          },
          {
            label: diagnosticLabels.model,
            value: failureDiagnostic.model,
          },
          {
            label: diagnosticLabels.modelOptions,
            value: diagnosticOptionText,
          },
        ]
      : [];

  function copyFailureDiagnostic() {
    if (!failureDiagnostic || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard
      .writeText(createGenerationDiagnosticCopyText(failureDiagnostic))
      .then(() => {
        setDiagnosticCopied(true);
        window.setTimeout(() => setDiagnosticCopied(false), 1600);
      })
      .catch(() => {
        setDiagnosticCopied(false);
      });
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/48 p-3 backdrop-blur-md sm:items-center sm:p-6">
      <div
        className={cn(
          "relative flex max-h-[calc(100svh-1.5rem)] w-full flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.97))] shadow-[0_34px_90px_rgba(15,23,42,0.26)] sm:max-h-[calc(100svh-3rem)]",
          hasPromptInput ? "max-w-4xl" : "max-w-2xl",
        )}
      >
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
              {!hasPromptInput ? (
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
              ) : null}
              {hasPromptInput ? (
                <div className="rounded-[24px] border border-slate-200/90 bg-white/92 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {promptLabel ?? labels.preparing_prompt.label}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {(promptValue ?? "").trim().length}/{CONTENT_IMAGE_VISUAL_BRIEF_LIMIT}
                    </p>
                  </div>
                  <textarea
                    className="mt-3 min-h-64 w-full rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white sm:min-h-72"
                    maxLength={CONTENT_IMAGE_VISUAL_BRIEF_LIMIT}
                    onChange={(event) => {
                      onPromptValueChange(event.target.value);
                    }}
                    placeholder={promptPlaceholder}
                    rows={12}
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
                  {isVideoResponse ? (
                    <video
                      className="block h-64 w-full object-contain sm:h-[min(68vh,560px)]"
                      controls
                      playsInline
                      preload="metadata"
                      src={progress.response.url}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={isSuccess ? labels.successTitle : labels.title}
                      className="block h-64 w-full object-contain sm:h-[min(68vh,560px)]"
                      src={progress.response.url}
                    />
                  )}
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

              {failureDiagnostic && diagnosticLabels ? (
                <details
                  className="mt-4 rounded-[22px] border border-rose-200/80 bg-white/92 p-4 shadow-sm"
                  open
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-950">
                    <span>{diagnosticLabels.title}</span>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                      onClick={(event) => {
                        event.preventDefault();
                        copyFailureDiagnostic();
                      }}
                      type="button"
                    >
                      <Copy className="mr-1.5 size-3.5" />
                      {diagnosticCopied
                        ? diagnosticLabels.copied
                        : diagnosticLabels.copy}
                    </button>
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {diagnosticRows.map((row) => (
                        <div
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/85 px-3 py-2"
                          key={row.label}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {row.label}
                          </p>
                          <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-800">
                            {row.value || diagnosticLabels.unavailable}
                          </p>
                        </div>
                      ))}
                    </div>
                    {failureDiagnostic.responseSummary ? (
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/85 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {diagnosticLabels.response}
                        </p>
                        <p className="mt-1 max-h-32 overflow-y-auto break-words text-xs leading-5 text-slate-700">
                          {failureDiagnostic.responseSummary}
                        </p>
                      </div>
                    ) : null}
                    {failureDiagnostic.fieldErrors.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/85 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {diagnosticLabels.fieldErrors}
                        </p>
                        <div className="mt-1 space-y-1">
                          {failureDiagnostic.fieldErrors.map((fieldError, index) => (
                            <p
                              className="break-words text-xs leading-5 text-slate-700"
                              key={`${fieldError.loc.join(".")}-${index}`}
                            >
                              {fieldError.loc.join(".")}: {fieldError.msg}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}

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
                : status === "paid"
                  ? "Paid"
                : status;
  const className =
    status === "failed"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "running"
        ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "queued"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "paid"
          ? "border-amber-200 bg-amber-50 text-amber-800"
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
  tone?: "error" | "fanletter" | "neutral";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "mt-4 rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,#fff1f2,#ffe4e6)] px-4 py-4 text-sm leading-6 text-rose-900 shadow-[0_18px_44px_rgba(244,63,94,0.08)]"
          : tone === "fanletter"
            ? "mt-4 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 px-4 py-4 text-sm font-medium leading-6 text-[#d8ffe0] shadow-[0_18px_44px_rgba(0,0,0,0.12)]"
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
