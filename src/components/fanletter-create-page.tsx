"use client";

import Image from "next/image";
import Link from "next/link";
import { upload as uploadBlob } from "@vercel/blob/client";
import {
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Loader2,
  Newspaper,
  Play,
  Plus,
  Timer,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterTabTopBar } from "@/components/fanletter-tab-top-bar";
import { useMemberSession } from "@/components/member-session-provider";
import {
  type ContentCoverImageCandidate,
  type ContentPostGenerateCoverResponse,
  type ContentPostMutationResponse,
  type ContentPostRecord,
  type ContentPostUploadResponse,
  type ContentVideoMetadata,
  type CreatorProfileRecord,
  type CreatorProfileResponse,
  type FanletterFanRequestStatusUpdateResponse,
  CONTENT_POSTS_BLOB_PATH_SEGMENT,
  CONTENT_UPLOADED_VIDEO_PATH_SEGMENT,
  CONTENT_VIDEO_MAX_BYTES,
  contentVideoMimeTypes,
} from "@/lib/content";
import {
  createContentVideoMetadata,
  readContentVideoFileMetadata,
  readContentVideoUrlMetadata,
} from "@/lib/content-video-metadata-client";
import { createContentVideoPreview } from "@/lib/content-video-preview-client";
import type { FanletterCreateInitialPlan } from "@/lib/fanletter-create-plan";
import {
  FANLETTER_NEWS_VLOGGER_PROFILE_CHANGE_EVENT,
  FANLETTER_NEWS_VLOGGER_PROFILE_STORAGE_KEY,
  getFanletterNewsNavProfileStorageValue,
} from "@/lib/fanletter-news-nav-profile";
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
import {
  captureVideoCoverFramesFromUrl,
  type CapturedVideoCoverFrame,
} from "@/lib/video-frame-cover-client";

type CreateMode = "video";
type CreateSourceMode = "ai" | "upload";
type CreateSurface = "default" | "news";
type FanRequestSyncStatus = "failed" | "idle" | "reviewed" | "syncing" | "used";
type GenerationStatus = "error" | "idle" | "loading" | "ready";
type RestorableGenerationStatus = Exclude<GenerationStatus, "loading">;
type LocalDraftStatus = "cleared" | "idle" | "restored" | "saved";

type GeneratedMedia = {
  contentType: string;
  coverImageCandidates: ContentCoverImageCandidate[];
  coverImageUrl: string | null;
  fileName: string | null;
  pathname: string | null;
  previewClipVideoUrl: string | null;
  revisedPrompt: string | null;
  source: CreateSourceMode;
  url: string;
  videoMetadata: ContentVideoMetadata | null;
};

type CreateForm = {
  body: string;
  mode: CreateMode;
  priceType: "free";
  prompt: string;
  summary: string;
  title: string;
};

const EMPTY_FORM: CreateForm = {
  body: "",
  mode: "video",
  priceType: "free",
  prompt: "",
  summary: "",
  title: "",
};
const CHARACTER_PLAYBOOK_PLAN_IDS = new Set([
  "avatar-set-direction",
  "character-daily-scene",
  "fan-request-episode",
]);
const FANLETTER_CREATE_DISCONNECTED_GRACE_MS = 4500;
const FANLETTER_CREATE_LOCAL_DRAFT_VERSION = 1;
const FANLETTER_CREATE_LOCAL_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COVER_IMAGE_CANDIDATE_LIMIT = 8;
const CONTENT_IMAGE_URL_LIMIT = 10;
const VIDEO_FRAME_COVER_CANDIDATE_COUNT = 6;
const EXCLUSIVE_NEWS_DURATION_OPTIONS = [6, 12, 24] as const;

type FanletterCreateLocalDraft = {
  form: CreateForm;
  generatedMedia: GeneratedMedia | null;
  generationMessage: string | null;
  generationStatus: RestorableGenerationStatus;
  savedAt: number;
  version: typeof FANLETTER_CREATE_LOCAL_DRAFT_VERSION;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountRequired: "계정 연결이 필요합니다.",
        accountRequiredBody:
          "AI 캐릭터 브이로그를 만들거나 업로드하려면 AIAVpark 계정 연결을 먼저 완료해야 합니다.",
        accountRequiredCta: "계정 연결하기",
        avatarExperience: {
          avatarReferenceSet:
            "대표 아바타와 표정 세트를 함께 reference로 사용해 인물 중심 동영상을 생성합니다.",
          avatarReferenceSingle:
            "선택한 표정 컷을 인물 reference로 고정해 동영상을 생성합니다.",
          eyebrow: "Avatar Reference Video",
          generate: "이 표정으로 브이로그 동영상 생성",
          planBody:
            "캐릭터 홈에서 선택한 표정 컷을 인물 reference로 적용했습니다. 제목과 장면 문장만 확인하고 바로 동영상으로 생성하세요.",
          planEyebrow: "Avatar Cut Video",
          planGenerateCta: "이 표정으로 동영상 생성",
          planNextStep:
            "버튼을 누르면 선택한 아바타 컷을 reference로 사용해 이미지가 아니라 세로형 동영상 생성을 시작합니다.",
          planTitle: "선택한 표정 컷으로 시작합니다.",
          prompt: "표정 컷 동영상 장면",
          promptPlaceholder:
            "선택한 표정을 기준으로 장소, 시선, 손짓, 짧은 대사, 카메라 움직임을 입력하세요.",
          referencePreviewBody:
            "이 컷을 기준으로 얼굴, 시선, 표정 정체성을 고정해 동영상을 만듭니다.",
          referencePreviewEmpty: "선택한 표정 컷을 불러오는 중입니다.",
          referencePreviewTitle: "선택한 표정 컷",
          referenceSetTitle: "아바타 세트 reference",
          qualityBody:
            "선택한 컷을 우선 reference로 고정하고 짧은 단일 컷, 안정적인 카메라, 1080p 인물 프롬프트로 얼굴 흔들림을 줄입니다.",
          qualityTitle: "고화질 인물 모드",
          result: "표정 컷 동영상 미리보기",
          titleText: "선택한 표정 컷으로 인물 중심 브이로그를 만드세요.",
          video: "생성 결과: 표정 reference 브이로그 동영상",
          videoBody:
            "프로필의 아바타 표정을 reference로 고정해 얼굴, 시선, 피부결, 미세 표정이 흔들리지 않는 세로형 동영상을 생성합니다.",
        },
        back: "프로필로 돌아가기",
        body: "공개 설명",
        bodyHint:
          "생성된 동영상과 함께 피드에 보일 설명입니다. 비워두면 장면 프롬프트를 설명으로 사용합니다.",
        bodyPlaceholder: "팬에게 보여줄 동영상 설명을 입력하세요.",
        contentReady: "오늘의 AI 캐릭터 브이로그 동영상이 준비되었습니다.",
        draft: "임시 저장",
        draftAutosaveCleared: "로컬 자동 저장본을 정리했습니다.",
        draftAutosaveHint:
          "입력값과 생성된 영상 링크를 이 기기에 자동 저장해 새로고침 후에도 이어갈 수 있습니다.",
        draftAutosaveRestored: "이전에 작성하던 브이로그를 복구했습니다.",
        draftAutosaveSaved: "자동 저장됨",
        draftSaved: "임시 저장했습니다.",
        emptyPrompt: "동영상으로 만들 브이로그 장면을 입력하세요.",
        errorFallback: "첫 AI 캐릭터 브이로그를 처리하지 못했습니다.",
        eyebrow: "AIAVpark AI 캐릭터 브이로그",
        fanRequestContext: {
          autoClose: "공개하면 팬 요청함에서 제작 반영으로 자동 정리됩니다.",
          autoFill: "제목, 요약, 장면 프롬프트에 요청 내용이 반영되었습니다.",
          body: "팬이 남긴 내용을 보면서 장면만 다듬으면 됩니다.",
          draftSynced: "임시 저장 상태로 팬 요청을 확인함 처리했습니다.",
          eyebrow: "Fan Request",
          failed:
            "브이로그는 저장됐지만 팬 요청 상태를 갱신하지 못했습니다. 스튜디오 요청함에서 다시 처리하세요.",
          fanOnlyDefault:
            "AI 생성 동영상은 무료 공개로 저장됩니다. 유료 팬 전용 콘텐츠는 스튜디오에서 직접 업로드 동영상으로 등록하세요.",
          fanOnlyHint:
            "이 AI 생성 브이로그는 무료 공개로 등록됩니다. NSFW 표시는 저장 후 전체 관리에서 별도로 조정할 수 있습니다.",
          publishStep: "공개하면 요청 카드가 완성된 브이로그와 연결됩니다.",
          requestTypes: {
            message: "응원 메시지",
            vlog_request: "브이로그 요청",
          },
          synced: "팬 요청함에서 제작 반영으로 정리되었습니다.",
          syncing: "팬 요청함을 정리하고 있습니다.",
          title: "팬 요청으로 브이로그를 만들고 있습니다.",
        },
        planContext: {
          applied: "제목, 요약, 장면 프롬프트에 추천 기획이 반영되었습니다.",
          avatarReference:
            "선택한 아바타 컷을 fal reference 영상 생성에 적용합니다.",
          body:
            "프로필의 캐릭터 정체성, 성장 신호, 팬 반응 흐름을 바탕으로 만든 브이로그 동영상 기획입니다. 필요하면 문장만 다듬고 바로 생성하세요.",
          bodyPlanner:
            "스튜디오에서 선택한 기획이 입력값에 반영되었습니다. 장면만 다듬고 바로 브이로그 동영상을 생성할 수 있습니다.",
          eyebrow: "Character Playbook",
          eyebrowPlanner: "Selected Plan",
          generateCta: "브이로그 동영상 생성",
          nextStep: "버튼을 누르면 이미지가 아니라 세로형 동영상 생성이 시작됩니다.",
          nextStepLabel: "다음 동작",
          outputLabel: "생성 결과",
          outputValue: "세로형 AI 브이로그 동영상",
          promptLabel: "추천 장면",
          summaryLabel: "기획 포인트",
          title: "프로필 추천 기획으로 시작합니다.",
          titleLabel: "추천 제목",
          titlePlanner: "선택한 기획으로 시작합니다.",
        },
        feed: "AIAVpark 브이로그 피드 보기",
        free: "무료 공개",
        freeOnlyPolicy:
          "AI 생성 영상과 직접 업로드 영상은 이 화면에서 무료 공개 브이로그로 등록됩니다. 유료 직접 업로드는 팬 요청함의 브이로그 요청에서 시작하세요.",
        exclusiveNews: {
          body:
            "공개 직후 지정한 팬 기자가 먼저 AI 뉴스 리포트를 발행할 수 있습니다. 기한이 지나면 모든 리포터에게 열립니다.",
          codeLabel: "팬 기자 리포터 ID",
          codePlaceholder: "예: FXBSQ976",
          durationLabel: "단독 시간",
          helper:
            "공개 브이로그를 특정 리포터에게 먼저 홍보하게 만들 때 사용하세요. 비워두면 전체 리포터에게 바로 열립니다.",
          title: "단독 보도 리포터 지정",
        },
        paidUpload: "팬 요청 유료 업로드",
        newsSurface: {
          actionLabel: "내 브이로그 관리",
          aiBody:
            "AIAVpark News에 노출할 무료 공개 브이로그를 AI로 생성합니다. 공개 후 뉴스 리포터가 바로 발견하고 리포트 후보로 사용할 수 있습니다.",
          eyebrow: "AIAVpark News Vlog Registration",
          feed: "뉴스 브이로그 보기",
          mobileAiCta: "AI로 새 원본 만들기",
          mobileBody:
            "컷 피드 반응을 보고 바로 다음 원본을 만듭니다. AI 생성 또는 휴대폰 영상 업로드 중 편한 방식을 고르세요.",
          mobileCta: "휴대폰 영상 선택",
          mobileUploadCta: "휴대폰 영상 업로드",
          mobileSteps: ["영상 선택", "제목 확인", "공개"],
          reports: "뉴스 리포트",
          titleText: "뉴스에 노출할 새 브이로그를 등록하세요.",
          uploadBody:
            "이미 만든 MP4, MOV, WEBM 영상을 무료 공개 브이로그로 등록합니다. 프리뷰 영상과 프레임 후보를 함께 준비해 뉴스 소비 흐름에 바로 연결합니다.",
        },
        generate: "AI 브이로그 동영상 생성",
        generated: "생성 완료",
        generatingVideo: "AI 동영상 생성 중...",
        loading: "브이로그 준비 상태를 확인하고 있습니다.",
        missingMedia: "공개하려면 먼저 브이로그 동영상을 생성하세요.",
        teaserFailed:
          "동영상은 준비됐지만 티저 이미지 후보는 자동 저장하지 못했습니다. 게시 전 다시 시도합니다.",
        teaserGenerating: "AI 동영상에서 공개 티저 이미지 후보를 준비하고 있습니다.",
        teaserReady: "AI 동영상 티저 이미지 후보가 자동 저장되었습니다.",
        paymentRequired:
          "AIAVpark 시작 준비 확인이 끝나면 첫 AI 캐릭터 브이로그를 만들 수 있습니다.",
        paymentRequiredCta: "시작 준비 확인하기",
        personaEmpty: "프로필에서 캐릭터를 한 번 만들면 같은 인물 유지가 강해집니다.",
        price: "등록 정책",
        profileRequired: "프로필 준비가 필요합니다.",
        profileRequiredBody:
          "표시 이름, 페르소나, 대표 아바타까지 준비하면 첫 브이로그에 자동 적용됩니다.",
        profileRequiredCta: "캐릭터 만들기",
        prompt: "브이로그 동영상 장면",
        promptPlaceholder:
          "장소, 움직임, 행동, 대사, 카메라 느낌, 숏폼 분위기를 자연스럽게 입력하세요.",
        publish: "브이로그 동영상 공개",
        publishCompleted: "공개 완료",
        published: "공개했습니다.",
        publishAlreadyCompleted:
          "이미 공개된 브이로그입니다. 같은 동영상을 다시 공개하지 않고, 상세 페이지에서 확인하세요.",
        result: "AI 동영상 미리보기",
        resultReview: {
          addFailed: "새 프레임을 추가하지 못했습니다.",
          addFrames: "새 프레임 추가",
          addedFrames: "새 프레임 후보를 추가했습니다.",
          addingFrames: "추가 중",
          body:
            "생성/업로드 결과를 확인하고 대표 프레임을 고른 뒤 공개하세요. 공개 후에는 스튜디오에서 프레임을 더 추가할 수 있습니다.",
          deleteFrame: "프레임 삭제",
          frameCandidates: "프레임 후보",
          frameEmpty:
            "프레임 후보를 자동 저장하지 못했습니다. 공개 전 저장 과정에서 다시 시도합니다.",
          limitReached: "프레임 후보는 최대 8장까지 저장됩니다.",
          manageFrames: "프레임 편집",
          original: "원본 동영상",
          pending: "대기",
          preview: "프리뷰 동영상",
          previewMissing:
            "짧은 프리뷰를 아직 만들지 못했습니다. 원본 동영상으로 공개는 계속할 수 있습니다.",
          publishConnection:
            "공개하면 선택한 대표 프레임, 프리뷰 동영상, 남겨둔 프레임 후보가 함께 저장됩니다.",
          ready: "준비됨",
          selectCover: "대표 프레임 선택",
          selectedCover: "대표 프레임",
          title: "결과 바로 확인",
        },
        setupChecks: {
          character: "캐릭터 적용",
          title: "제목 입력",
          video: "동영상 생성",
        },
        sharedVlog: {
          body:
            "TikTok 공유로 들어온 링크와 문구를 초안에 넣었습니다. 실제 동영상은 TikTok에서 기기에 저장한 뒤 아래에서 선택하세요.",
          sourceLabel: "공유 출처",
          title: "공유한 TikTok 영상으로 시작",
          unknownSource: "공유 링크",
          urlLabel: "공유 링크",
        },
        summary: "동영상 요약",
        summaryPlaceholder: "짧은 소개 문구",
        studio: "브이로그 스튜디오",
        title: "제목",
        titlePlaceholder: "오늘의 브이로그 제목",
        titleText: "오늘의 AI 캐릭터 브이로그를 바로 만드세요.",
        upload: {
          body:
            "이미 만든 MP4, MOV, WEBM 브이로그를 무료 공개 콘텐츠로 올립니다. 팬 전용 유료 업로드와 NSFW 설정은 팬 요청 기반 업로드에서만 사용합니다.",
          directHint:
            "휴대폰 영상 선택부터 시작하세요. 업로드 후 프리뷰 영상과 프레임 후보가 자동으로 준비됩니다.",
          fallbackTitle: "오늘의 브이로그",
          fileHelp: (size: string) => `MP4, MOV, WEBM · 최대 ${size}MB`,
          missingReferral: "회원 추천 코드를 확인하지 못했습니다.",
          progress: (percent: number) => `업로드 ${Math.round(percent)}%`,
          ready: "업로드한 브이로그 동영상이 준비되었습니다.",
          result: "업로드 동영상 미리보기",
          select: "동영상 선택",
          selected: "선택한 동영상",
          tabAi: "AI로 만들기",
          tabUpload: "동영상 업로드",
          teaserFailed:
            "동영상은 업로드됐지만 티저 이미지 후보는 자동 저장하지 못했습니다. 게시 전 다시 시도합니다.",
          teaserGenerating: "업로드 동영상에서 공개 티저 이미지 후보를 준비하고 있습니다.",
          teaserReady: "업로드 동영상 티저 이미지 후보가 자동 저장되었습니다.",
          title: "무료 공개 동영상 업로드",
          tiktokHelp:
            "TikTok 앱에서는 공유 링크만 넘어올 수 있습니다. 원본이 필요하면 TikTok에서 먼저 사진/파일에 저장한 뒤 이 버튼으로 선택하세요.",
          unsupported: "MP4, MOV, WEBM 동영상만 업로드할 수 있습니다.",
          uploadCta: "무료 동영상 업로드",
          uploading: "동영상을 업로드하고 있습니다.",
          videoTooLarge: (size: string) =>
            `동영상은 ${size}MB 이하로 업로드해주세요.`,
        },
        video: "생성 결과: 숏폼 브이로그 동영상",
        videoBody:
          "이미지가 아니라 세로형 AI 브이로그 동영상을 생성해 모바일 캐릭터 피드에 바로 연결합니다.",
        viewContent: "브이로그 보기",
      }
    : {
        accountRequired: "Account connection required.",
        accountRequiredBody:
          "Connect your AIAVpark account before creating or uploading an AI character vlog.",
        accountRequiredCta: "Connect account",
        avatarExperience: {
          avatarReferenceSet:
            "The representative avatar and expression set will be used together as references for a person-centered video.",
          avatarReferenceSingle:
            "The selected expression cut will be locked as the person reference for video generation.",
          eyebrow: "Avatar Reference Video",
          generate: "Generate vlog video with this expression",
          planBody:
            "The expression cut selected in the character home has been applied as the person reference. Review the title and scene, then generate the video.",
          planEyebrow: "Avatar Cut Video",
          planGenerateCta: "Generate video with this expression",
          planNextStep:
            "This starts vertical video generation with the selected avatar cut as the reference, not image generation.",
          planTitle: "Starting from the selected expression cut.",
          prompt: "Expression cut video scene",
          promptPlaceholder:
            "Describe the location, gaze, gestures, short line, and camera motion based on the selected expression.",
          referencePreviewBody:
            "This cut is used to lock the face, gaze, expression, and identity for the video.",
          referencePreviewEmpty: "Loading the selected expression cut.",
          referencePreviewTitle: "Selected expression cut",
          referenceSetTitle: "Avatar set reference",
          qualityBody:
            "The selected cut is prioritized as the reference, then rendered as a short single-shot 1080p portrait video with stable camera direction.",
          qualityTitle: "High-fidelity person mode",
          result: "Expression cut video preview",
          titleText:
            "Create a person-centered vlog from the selected expression cut.",
          video: "Output: expression reference vlog video",
          videoBody:
            "Use the profile avatar expression as a reference to generate a vertical video with stable face, gaze, skin texture, and subtle expressions.",
        },
        back: "Back to profile",
        body: "Public description",
        bodyHint:
          "This appears with the generated video in the feed. When empty, the scene prompt is used as the description.",
        bodyPlaceholder: "Write the video description for fans.",
        contentReady: "Today's AI character vlog video is ready.",
        draft: "Save draft",
        draftAutosaveCleared: "Local autosave was cleared.",
        draftAutosaveHint:
          "Inputs and the generated video link are saved on this device so you can continue after refreshing.",
        draftAutosaveRestored: "Restored the vlog you were editing.",
        draftAutosaveSaved: "Autosaved",
        draftSaved: "Draft saved.",
        emptyPrompt: "Enter the vlog scene to turn into a video.",
        errorFallback: "Failed to process first AI character vlog.",
        eyebrow: "AIAVpark AI Character Vlog",
        fanRequestContext: {
          autoClose:
            "Publishing will automatically mark the fan request as used.",
          autoFill:
            "The title, summary, and scene prompt already include the request.",
          body: "Keep the fan note visible while you refine the scene.",
          draftSynced: "The fan request was marked as reviewed for this draft.",
          eyebrow: "Fan Request",
          failed:
            "The vlog was saved, but the fan request status could not be updated. Retry from the studio inbox.",
          fanOnlyDefault:
            "AI-generated videos are saved as free public content. Register paid fan-only content from Studio with a directly uploaded video.",
          fanOnlyHint:
            "This AI-generated vlog is saved as free public content. Adjust NSFW marking later from full management when needed.",
          publishStep: "Publishing links the request card to the finished vlog.",
          requestTypes: {
            message: "Support message",
            vlog_request: "Vlog request",
          },
          synced: "The fan request was moved to produced.",
          syncing: "Updating the fan request inbox.",
          title: "Creating a vlog from a fan request.",
        },
        planContext: {
          applied:
            "The recommended title, summary, and scene prompt have been applied.",
          avatarReference:
            "The selected avatar cut will be used as the fal reference for video generation.",
          body:
            "This vlog video plan comes from the character identity, growth signals, and fan reaction loop in the profile. Refine the wording if needed, then generate.",
          bodyPlanner:
            "The selected studio plan has been applied to the inputs. Refine the scene and generate the vlog video.",
          eyebrow: "Character Playbook",
          eyebrowPlanner: "Selected Plan",
          generateCta: "Generate vlog video",
          nextStep: "This button starts vertical video generation, not image generation.",
          nextStepLabel: "Next action",
          outputLabel: "Output",
          outputValue: "Vertical AI vlog video",
          promptLabel: "Suggested scene",
          summaryLabel: "Plan angle",
          title: "Starting from a profile recommendation.",
          titleLabel: "Suggested title",
          titlePlanner: "Starting from the selected plan.",
        },
        feed: "View AIAVpark vlog feed",
        free: "Free public",
        freeOnlyPolicy:
          "AI-generated and directly uploaded videos are saved here as free public vlogs. Start paid direct upload from a fan vlog request in the request inbox.",
        exclusiveNews: {
          body:
            "After publishing, the selected fan reporter gets first access to publish the AI news report. When the window ends, every reporter can publish.",
          codeLabel: "Fan reporter ID",
          codePlaceholder: "e.g. FXBSQ976",
          durationLabel: "Exclusive window",
          helper:
            "Use this when one reporter should promote a public vlog first. Leave it empty to open it to every reporter immediately.",
          title: "Assign exclusive reporter",
        },
        paidUpload: "Paid upload from request",
        newsSurface: {
          actionLabel: "My vlog desk",
          aiBody:
            "Create a free public vlog for AIAVpark News. After publishing, reporters can discover it and use it as a report candidate.",
          eyebrow: "AIAVpark News Vlog Registration",
          feed: "News vlogs",
          mobileAiCta: "Create with AI",
          mobileBody:
            "Turn cut-feed reactions into the next source. Choose AI generation or upload a phone video.",
          mobileCta: "Choose phone video",
          mobileUploadCta: "Upload phone video",
          mobileSteps: ["Choose video", "Confirm title", "Publish"],
          reports: "News reports",
          titleText: "Register a new vlog for News exposure.",
          uploadBody:
            "Register an existing MP4, MOV, or WEBM video as a free public vlog. Preview video and frame candidates are prepared for the News consumption flow.",
        },
        generate: "Generate AI vlog video",
        generated: "Generated",
        generatingVideo: "Generating AI video...",
        loading: "Checking vlog setup.",
        missingMedia: "Generate a vlog video before publishing.",
        teaserFailed:
          "The video is ready, but teaser image candidates could not be saved automatically. AIAVpark will retry before publishing.",
        teaserGenerating: "Preparing public teaser image candidates from the AI video.",
        teaserReady: "AI video teaser image candidates were saved automatically.",
        paymentRequired:
          "Confirm AIAVpark readiness to create your first AI character vlog.",
        paymentRequiredCta: "Confirm readiness",
        personaEmpty:
          "Create a character once in your profile to keep the same person stronger.",
        price: "Publishing policy",
        profileRequired: "Profile setup required.",
        profileRequiredBody:
          "Prepare a display name, persona, and representative avatar so the character is applied to the first vlog automatically.",
        profileRequiredCta: "Create character",
        prompt: "Vlog video scene",
        promptPlaceholder:
          "Describe location, motion, action, dialogue, camera feel, and short-form mood.",
        publish: "Publish vlog video",
        publishCompleted: "Published",
        published: "Published.",
        publishAlreadyCompleted:
          "This vlog has already been published. Open the detail page instead of publishing the same video again.",
        result: "AI video preview",
        resultReview: {
          addFailed: "Could not add new frames.",
          addFrames: "Add frames",
          addedFrames: "Added new frame candidates.",
          addingFrames: "Adding",
          body:
            "Review the generated or uploaded result, choose a representative frame, then publish. You can add more frames later in Studio.",
          deleteFrame: "Delete frame",
          frameCandidates: "Frame candidates",
          frameEmpty:
            "Frame candidates could not be saved automatically. AIAVpark will retry before publishing.",
          limitReached: "Up to 8 frame candidates can be saved.",
          manageFrames: "Edit frames",
          original: "Original video",
          pending: "Pending",
          preview: "Preview video",
          previewMissing:
            "A short preview is not ready yet. You can still publish with the original video.",
          publishConnection:
            "Publishing saves the selected cover frame, preview video, and remaining frame candidates together.",
          ready: "Ready",
          selectCover: "Use as cover",
          selectedCover: "Cover frame",
          title: "Review result",
        },
        setupChecks: {
          character: "Character applied",
          title: "Title ready",
          video: "Video generated",
        },
        sharedVlog: {
          body:
            "The shared TikTok link and text were added to this draft. Save the actual video to your phone first, then choose it below.",
          sourceLabel: "Shared from",
          title: "Start from shared TikTok video",
          unknownSource: "Shared link",
          urlLabel: "Shared link",
        },
        summary: "Video summary",
        summaryPlaceholder: "Short intro",
        studio: "Vlog studio",
        title: "Title",
        titlePlaceholder: "Today's vlog title",
        titleText: "Create today's AI character vlog inside AIAVpark.",
        upload: {
          body:
            "Upload an existing MP4, MOV, or WEBM vlog as free public content. Fan-only paid upload and NSFW controls stay limited to fan-request uploads.",
          directHint:
            "Start by choosing a phone video. After upload, the preview video and frame candidates are prepared automatically.",
          fallbackTitle: "Today's vlog",
          fileHelp: (size: string) => `MP4, MOV, WEBM · up to ${size}MB`,
          missingReferral: "Could not find the member referral code.",
          progress: (percent: number) => `Uploading ${Math.round(percent)}%`,
          ready: "The uploaded vlog video is ready.",
          result: "Uploaded video preview",
          select: "Choose video",
          selected: "Selected video",
          tabAi: "Create with AI",
          tabUpload: "Upload video",
          teaserFailed:
            "The video was uploaded, but teaser image candidates could not be saved automatically. AIAVpark will retry before publishing.",
          teaserGenerating: "Preparing public teaser image candidates from the uploaded video.",
          teaserReady: "Uploaded video teaser image candidates were saved automatically.",
          title: "Upload a free public video",
          tiktokHelp:
            "TikTok may share only a link. If you need the original video, save it to Photos or Files first, then choose it here.",
          unsupported: "Only MP4, MOV, and WEBM videos are supported.",
          uploadCta: "Upload free video",
          uploading: "Uploading video.",
          videoTooLarge: (size: string) =>
            `Video must be ${size}MB or smaller.`,
        },
        video: "Output: short-form vlog video",
        videoBody:
          "Generate a vertical AI vlog video, not an image, and connect it directly to the mobile character feed.",
        viewContent: "View vlog",
      };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function readApiJson<T>(response: Response, fallbackMessage: string) {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T | { error?: string };
  }

  try {
    return JSON.parse(text) as T | { error?: string };
  } catch {
    return { error: fallbackMessage };
  }
}

function createCoverImageCandidateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cover-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeNullablePositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function normalizeCoverImageCandidateSource(
  value: unknown,
): ContentCoverImageCandidate["source"] {
  return value === "ai" || value === "manual" ? value : "frame";
}

function normalizeCoverImageCandidates(
  value: unknown,
): ContentCoverImageCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const candidates: ContentCoverImageCandidate[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<ContentCoverImageCandidate>;
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";

    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    candidates.push({
      candidateId:
        typeof candidate.candidateId === "string" &&
        candidate.candidateId.trim()
          ? candidate.candidateId
          : createCoverImageCandidateId(),
      contentType:
        typeof candidate.contentType === "string" && candidate.contentType.trim()
          ? candidate.contentType
          : null,
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      height: normalizeNullablePositiveNumber(candidate.height),
      pathname:
        typeof candidate.pathname === "string" && candidate.pathname.trim()
          ? candidate.pathname
          : null,
      placements: Array.isArray(candidate.placements)
        ? candidate.placements.filter(
            (placement): placement is NonNullable<
              ContentCoverImageCandidate["placements"]
            >[number] =>
              placement === "detail" ||
              placement === "feed" ||
              placement === "news" ||
              placement === "share",
          )
        : [],
      source: normalizeCoverImageCandidateSource(candidate.source),
      timestampSec: normalizeNullablePositiveNumber(candidate.timestampSec),
      url,
      width: normalizeNullablePositiveNumber(candidate.width),
    });
  }

  return candidates.slice(0, COVER_IMAGE_CANDIDATE_LIMIT);
}

function createFrameCoverImageCandidate({
  frame,
  upload,
}: {
  frame: Pick<CapturedVideoCoverFrame, "height" | "timestampSec" | "width">;
  upload: ContentPostUploadResponse;
}): ContentCoverImageCandidate {
  return {
    candidateId: createCoverImageCandidateId(),
    contentType: upload.contentType,
    createdAt: new Date().toISOString(),
    height: frame.height,
    pathname: upload.pathname,
    placements: [],
    source: "frame",
    timestampSec: frame.timestampSec,
    url: upload.url,
    width: frame.width,
  };
}

function mergeCoverImageCandidates(
  current: ContentCoverImageCandidate[],
  additions: ContentCoverImageCandidate[],
) {
  const seenUrls = new Set<string>();
  const merged: ContentCoverImageCandidate[] = [];

  for (const candidate of [...current, ...additions]) {
    if (!candidate.url || seenUrls.has(candidate.url)) {
      continue;
    }

    seenUrls.add(candidate.url);
    merged.push(candidate);
  }

  return merged.slice(0, COVER_IMAGE_CANDIDATE_LIMIT);
}

function mergeContentImageUrls(current: string[], additions: string[]) {
  const seenUrls = new Set<string>();
  const merged: string[] = [];

  for (const url of [...additions, ...current]) {
    const normalizedUrl = url.trim();

    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    merged.push(normalizedUrl);
  }

  return merged.slice(0, CONTENT_IMAGE_URL_LIMIT);
}

function getFrameCandidateImageUrls(candidates: ContentCoverImageCandidate[]) {
  return candidates
    .filter((candidate) => candidate.source === "frame")
    .map((candidate) => candidate.url);
}

function getInitialCreateForm(
  initialPlan?: FanletterCreateInitialPlan,
): CreateForm {
  return {
    ...EMPTY_FORM,
    body: initialPlan?.body?.trim() ?? EMPTY_FORM.body,
    mode: "video",
    priceType: "free",
    prompt: initialPlan?.prompt?.trim() ?? EMPTY_FORM.prompt,
    summary: initialPlan?.summary?.trim() ?? EMPTY_FORM.summary,
    title: initialPlan?.title?.trim() ?? EMPTY_FORM.title,
  };
}

function hasMeaningfulCreateDraft(form: CreateForm, media: GeneratedMedia | null) {
  return Boolean(
    media?.url ||
      form.title.trim() ||
      form.summary.trim() ||
      form.prompt.trim() ||
      form.body.trim(),
  );
}

function normalizeGeneratedMedia(value: unknown): GeneratedMedia | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const media = value as Partial<GeneratedMedia>;

  if (
    typeof media.url !== "string" ||
    !media.url.trim() ||
    typeof media.contentType !== "string"
  ) {
    return null;
  }

  return {
    contentType: media.contentType,
    coverImageCandidates: normalizeCoverImageCandidates(
      media.coverImageCandidates,
    ),
    coverImageUrl:
      typeof media.coverImageUrl === "string" && media.coverImageUrl.trim()
        ? media.coverImageUrl
        : null,
    fileName:
      typeof media.fileName === "string" && media.fileName.trim()
        ? media.fileName
        : null,
    pathname:
      typeof media.pathname === "string" && media.pathname.trim()
        ? media.pathname
        : null,
    previewClipVideoUrl:
      typeof media.previewClipVideoUrl === "string" &&
      media.previewClipVideoUrl.trim()
        ? media.previewClipVideoUrl
        : null,
    revisedPrompt:
      typeof media.revisedPrompt === "string" ? media.revisedPrompt : null,
    source: media.source === "upload" ? "upload" : "ai",
    url: media.url,
    videoMetadata:
      media.videoMetadata &&
      typeof media.videoMetadata === "object" &&
      media.videoMetadata.url === media.url
        ? media.videoMetadata
        : null,
  };
}

function normalizeCreateDraftForm(value: unknown): CreateForm | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const form = value as Partial<CreateForm>;

  return {
    body: typeof form.body === "string" ? form.body.slice(0, 2_400) : "",
    mode: "video",
    priceType: "free",
    prompt: typeof form.prompt === "string" ? form.prompt.slice(0, 4_000) : "",
    summary: typeof form.summary === "string" ? form.summary.slice(0, 600) : "",
    title: typeof form.title === "string" ? form.title.slice(0, 180) : "",
  };
}

function buildCreateDraftKey({
  fanRequestId,
  locale,
  planId,
  referralCode,
}: {
  fanRequestId: string | null;
  locale: Locale;
  planId: string | null;
  referralCode: string | null;
}) {
  return [
    "fanletter:create-draft:v1",
    locale,
    referralCode?.trim() || "direct",
    planId?.trim() || "manual",
    fanRequestId?.trim() || "no-request",
  ].join(":");
}

function readCreateLocalDraft(key: string): FanletterCreateLocalDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<FanletterCreateLocalDraft>;

    if (
      parsed.version !== FANLETTER_CREATE_LOCAL_DRAFT_VERSION ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > FANLETTER_CREATE_LOCAL_DRAFT_TTL_MS
    ) {
      window.localStorage.removeItem(key);
      return null;
    }

    const form = normalizeCreateDraftForm(parsed.form);

    if (!form) {
      return null;
    }

    const generatedMedia = normalizeGeneratedMedia(parsed.generatedMedia);
    const generationStatus: RestorableGenerationStatus = generatedMedia
      ? "ready"
      : parsed.generationStatus === "error"
        ? "error"
        : "idle";

    return {
      form,
      generatedMedia,
      generationMessage:
        typeof parsed.generationMessage === "string"
          ? parsed.generationMessage
          : null,
      generationStatus,
      savedAt: parsed.savedAt,
      version: FANLETTER_CREATE_LOCAL_DRAFT_VERSION,
    };
  } catch {
    return null;
  }
}

function writeCreateLocalDraft(
  key: string,
  draft: Omit<FanletterCreateLocalDraft, "savedAt" | "version">,
) {
  if (typeof window === "undefined") {
    return null;
  }

  const savedAt = Date.now();

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        ...draft,
        savedAt,
        version: FANLETTER_CREATE_LOCAL_DRAFT_VERSION,
      } satisfies FanletterCreateLocalDraft),
    );
    return savedAt;
  } catch {
    return null;
  }
}

function clearCreateLocalDraft(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Local draft recovery is a convenience layer; saving and publishing still work.
  }
}

function formatDraftSavedAt(value: number | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(bytes: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(bytes / (1024 * 1024));
}

function formatFrameTimestamp(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatFrameSize(candidate: ContentCoverImageCandidate) {
  if (
    !candidate.width ||
    !candidate.height ||
    !Number.isFinite(candidate.width) ||
    !Number.isFinite(candidate.height)
  ) {
    return null;
  }

  return `${Math.round(candidate.width)}x${Math.round(candidate.height)}`;
}

function getFrameCandidateTimestampSecs(
  candidates: ContentCoverImageCandidate[],
) {
  return candidates
    .map((candidate) => candidate.timestampSec)
    .filter(
      (timestamp): timestamp is number =>
        typeof timestamp === "number" && Number.isFinite(timestamp),
    );
}

function sanitizeUploadBaseName(name: string) {
  const baseName = name.replace(/\.[^.]+$/u, "");
  const normalized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 48);

  return normalized || "fanletter-vlog";
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

function inferTitle(form: CreateForm, fallback: string) {
  return (
    form.title.trim() ||
    form.prompt
      .split("\n")
      .find((line) => line.trim())
      ?.trim()
      .slice(0, 72) ||
    fallback
  );
}

function inferSummary(form: CreateForm) {
  return (
    form.summary.trim() ||
    form.prompt.trim().replace(/\s+/g, " ").slice(0, 140)
  );
}

function StatusPanel({
  accountActivateHref,
  accountConnectHref,
  accountFallbackHref,
  actionHref,
  actionLabel,
  backHref,
  body,
  cta,
  href,
  homeHref,
  locale,
  referralCode,
  reportsHref,
  reportsLabel,
  title,
}: {
  accountActivateHref?: string;
  accountConnectHref?: string;
  accountFallbackHref?: string;
  actionHref?: string;
  actionLabel?: string;
  backHref?: string;
  body: string;
  cta: string;
  href: string;
  homeHref?: string;
  locale: Locale;
  referralCode: string | null;
  reportsHref?: string;
  reportsLabel?: string;
  title: string;
}) {
  return (
    <main className="min-h-[calc(100svh-5.1rem)] bg-[#030504] px-2 pb-4 pt-[calc(env(safe-area-inset-top)+0.85rem)] text-white sm:min-h-screen sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FanletterTabTopBar
          accountActivateHref={accountActivateHref}
          accountConnectHref={accountConnectHref}
          accountFallbackHref={accountFallbackHref}
          actionHref={actionHref}
          actionLabel={actionLabel}
          backHref={backHref}
          homeHref={homeHref}
          locale={locale}
          referralCode={referralCode}
          reportsHref={reportsHref}
          reportsLabel={reportsLabel}
        />
      </div>
      <div className="mx-auto flex min-h-[calc(100svh-13rem)] max-w-xl items-center py-6 sm:min-h-[70vh]">
        <section className="w-full rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.32)] sm:p-6">
          <CircleAlert className="size-8 text-[#44f26e]" />
          <h1 className="mt-5 text-2xl font-semibold leading-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-white/58">
            {body}
          </p>
          <Link
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
            href={href}
          >
            {cta}
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}

export function FanletterCreatePage({
  experience = "default",
  initialPlan,
  locale,
  referralCode,
  returnToHref,
  surface = "default",
}: {
  experience?: "avatar" | "default";
  initialPlan?: FanletterCreateInitialPlan;
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
  surface?: CreateSurface;
}) {
  const copy = getCopy(locale);
  const isNewsSurface = surface === "news";
  const newsSurfaceCopy = isNewsSurface ? copy.newsSurface : null;
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: FANLETTER_CREATE_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_CREATE_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const onboardingHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const fanletterHomeHref = buildPathWithReferral(
    `/${locale}/fanletter`,
    referralCode,
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const newsReportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const newsVlogManageHref = buildPathWithReferral(
    `/${locale}/fanletter/news/vlogs/manage`,
    referralCode,
  );
  const newsVlogsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/vlogs`,
    referralCode,
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const connectBaseHref = buildPathWithReferral(
    isNewsSurface
      ? `/${locale}/fanletter/news/connect`
      : `/${locale}/fanletter/connect`,
    referralCode,
  );
  const connectHref = setPathSearchParams(connectBaseHref, {
    returnTo: returnToHref || onboardingHref,
  });
  const activateBaseHref = buildPathWithReferral(
    isNewsSurface ? `/${locale}/fanletter/news/activate` : `/${locale}/activate`,
    referralCode,
  );
  const activateHref = setPathSearchParams(
    activateBaseHref,
    { returnTo: returnToHref || onboardingHref },
  );
  const feedHref = isNewsSurface
    ? newsVlogsHref
    : buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const topBarActionHref = isNewsSurface
    ? returnToHref || newsVlogManageHref
    : studioHref;
  const topBarHomeHref = isNewsSurface ? newsHomeHref : fanletterHomeHref;
  const topBarBackHref = isNewsSurface
    ? returnToHref || newsVlogManageHref
    : profileHref;
  const surfaceFeedLabel = newsSurfaceCopy?.feed ?? copy.feed;
  const surfaceStudioLabel = newsSurfaceCopy?.actionLabel ?? copy.studio;
  const statusPanelNavigationProps = isNewsSurface
    ? {
        accountActivateHref: activateBaseHref,
        accountConnectHref: connectBaseHref,
        accountFallbackHref: newsHomeHref,
        actionHref: topBarActionHref,
        actionLabel: newsSurfaceCopy?.actionLabel,
        backHref: topBarBackHref,
        homeHref: topBarHomeHref,
        reportsHref: newsReportsHref,
        reportsLabel: newsSurfaceCopy?.reports,
      }
    : {};
  const fanRequestsHref = `${studioHref}#fan-requests`;
  const initialFanRequestId = initialPlan?.fanRequestId?.trim() || null;
  const initialFanRequestType = initialPlan?.fanRequestType ?? null;
  const paidUploadHref =
    initialFanRequestId && initialFanRequestType === "vlog_request"
      ? setPathSearchParams(
          buildPathWithReferral(
            `/${locale}/fanletter/studio/paid-upload`,
            referralCode,
          ),
          {
            fanRequestBody:
              initialPlan?.fanRequestBody ?? initialPlan?.body ?? null,
            fanRequestCharacterName:
              initialPlan?.fanRequestCharacterName ?? null,
            fanRequestId: initialFanRequestId,
            fanRequestType: initialFanRequestType,
            planAudience: "fan-only",
            planBody: initialPlan?.body ?? null,
            planMode: "video",
            planPriceType: "paid",
            planPrompt: initialPlan?.prompt ?? null,
            planSummary: initialPlan?.summary ?? null,
            planTitle: initialPlan?.title ?? null,
            returnTo: returnToHref || studioHref,
          },
        )
      : fanRequestsHref;
  const [createdContent, setCreatedContent] =
    useState<ContentPostRecord | null>(null);
  const [createSourceMode, setCreateSourceMode] = useState<CreateSourceMode>(
    initialPlan?.sourceMode === "upload" ? "upload" : "ai",
  );
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [error, setError] = useState<string | null>(null);
  const [fanRequestSyncError, setFanRequestSyncError] = useState<string | null>(
    null,
  );
  const [fanRequestSyncStatus, setFanRequestSyncStatus] =
    useState<FanRequestSyncStatus>("idle");
  const [form, setForm] = useState<CreateForm>(() =>
    getInitialCreateForm(initialPlan),
  );
  const [exclusiveNewsDurationHours, setExclusiveNewsDurationHours] =
    useState<(typeof EXCLUSIVE_NEWS_DURATION_OPTIONS)[number]>(12);
  const [exclusiveNewsReporterCode, setExclusiveNewsReporterCode] =
    useState("");
  const [isExclusiveNewsOpen, setIsExclusiveNewsOpen] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia | null>(
    null,
  );
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<number | null>(null);
  const [localDraftStatus, setLocalDraftStatus] =
    useState<LocalDraftStatus>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isAddingFrameCandidates, setIsAddingFrameCandidates] = useState(false);
  const [loadStatus, setLoadStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [member, setMember] = useState<MemberRecord | null>(
    memberSession.member,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<CreatorProfileRecord | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const loadInFlightRef = useRef(false);
  const localDraftRestoredRef = useRef(false);
  const composeSectionRef = useRef<HTMLElement | null>(null);
  const resultSectionRef = useRef<HTMLElement | null>(null);
  const saveInFlightRef = useRef(false);
  const scrolledResultMediaUrlRef = useRef<string | null>(null);
  const scrolledUploadComposeRef = useRef(false);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const hasProfileBasics = Boolean(profile?.displayName?.trim());
  const hasPersona = Boolean(profile?.characterPersona);
  const hasAvatar = Boolean(profile?.avatarImageUrl);
  const hasCharacterReady = hasProfileBasics && hasPersona && hasAvatar;
  const initialPlanId = initialPlan?.planId?.trim() || null;
  const sharedVlogSource = initialPlan?.sharedSource ?? null;
  const sharedVlogUrl = initialPlan?.sharedUrl?.trim() || null;
  const sharedVlogTitle = initialPlan?.sharedTitle?.trim() || null;
  const sharedVlogText = initialPlan?.sharedText?.trim() || null;
  const hasSharedVlogIntent = Boolean(
    sharedVlogSource || sharedVlogUrl || sharedVlogTitle || sharedVlogText,
  );
  const fanOnlyIntent = Boolean(initialPlan?.fanOnlyIntent);
  const hasAvatarReferencePlan = Boolean(
    initialPlan?.avatarReferenceExpression ||
      initialPlan?.avatarReferenceMode === "set",
  );
  const isAvatarVideoExperience =
    experience === "avatar" || hasAvatarReferencePlan;
  const avatarExperienceCopy = isAvatarVideoExperience
    ? copy.avatarExperience
    : null;
  const localDraftKey = useMemo(
    () =>
      buildCreateDraftKey({
        fanRequestId: initialFanRequestId,
        locale,
        planId: initialPlanId,
        referralCode,
      }),
    [initialFanRequestId, initialPlanId, locale, referralCode],
  );
  const initialFanRequestBody =
    initialPlan?.fanRequestBody?.trim() || initialPlan?.body?.trim() || null;
  const initialFanRequestCharacterName =
    initialPlan?.fanRequestCharacterName?.trim() ||
    profile?.characterPersona?.name?.trim() ||
    profile?.displayName?.trim() ||
    null;
  const profileCharacterName =
    profile?.characterPersona?.name?.trim() ||
    profile?.displayName?.trim() ||
    copy.profileRequired;
  const newsVloggerProfileStorageValue =
    isNewsSurface && profile
      ? getFanletterNewsNavProfileStorageValue({
          avatarImageUrl:
            profile.avatarImageUrl ?? profile.avatarImageSet[0]?.url ?? null,
          displayName: profile.characterPersona?.name ?? profile.displayName,
          referralCode: profile.referralCode,
        })
      : null;
  const fanRequestTypeLabel = initialFanRequestType
    ? copy.fanRequestContext.requestTypes[initialFanRequestType]
    : null;
  const fanRequestSyncLabel =
    fanRequestSyncStatus === "syncing"
      ? copy.fanRequestContext.syncing
      : fanRequestSyncStatus === "used"
        ? copy.fanRequestContext.synced
        : fanRequestSyncStatus === "reviewed"
          ? copy.fanRequestContext.draftSynced
          : fanRequestSyncStatus === "failed"
            ? (fanRequestSyncError ?? copy.fanRequestContext.failed)
            : null;
  const isCharacterPlaybookPlan = Boolean(
    initialPlanId &&
      (CHARACTER_PLAYBOOK_PLAN_IDS.has(initialPlanId) ||
        initialPlanId.startsWith("avatar-kit-") ||
        initialPlanId.startsWith("character-playbook-")),
  );
  const hasPlanContext = Boolean(
    initialPlan &&
      createSourceMode !== "upload" &&
      !initialFanRequestId &&
      (initialPlanId ||
        form.title.trim() ||
        form.summary.trim() ||
        form.prompt.trim()),
  );
  const hasPublishedContent = createdContent?.status === "published";
  const canPublish =
    Boolean(generatedMedia?.url) &&
    !hasPublishedContent &&
    !isAddingFrameCandidates &&
    !isUploadingVideo;
  const heroEyebrow =
    avatarExperienceCopy?.eyebrow ?? newsSurfaceCopy?.eyebrow ?? copy.eyebrow;
  const heroTitleText =
    avatarExperienceCopy?.titleText ??
    newsSurfaceCopy?.titleText ??
    copy.titleText;
  const isUploadMode =
    createSourceMode === "upload" || generatedMedia?.source === "upload";
  const uploadMaxSizeLabel = formatFileSize(CONTENT_VIDEO_MAX_BYTES, locale);
  const selectedModeCopy = isUploadMode
    ? newsSurfaceCopy?.uploadBody ?? copy.upload.body
    : avatarExperienceCopy?.videoBody ??
      newsSurfaceCopy?.aiBody ??
      copy.videoBody;
  const promptLabel = avatarExperienceCopy?.prompt ?? copy.prompt;
  const promptPlaceholder =
    avatarExperienceCopy?.promptPlaceholder ?? copy.promptPlaceholder;
  const generateCta = avatarExperienceCopy?.generate ?? copy.generate;
  const resultLabel = isUploadMode
    ? copy.upload.result
    : avatarExperienceCopy?.result ?? copy.result;
  const videoLabel = avatarExperienceCopy?.video ?? copy.video;
  const videoBody = avatarExperienceCopy?.videoBody ?? copy.videoBody;
  const planContextEyebrow = hasAvatarReferencePlan
    ? copy.avatarExperience.planEyebrow
    : isCharacterPlaybookPlan
      ? copy.planContext.eyebrow
      : copy.planContext.eyebrowPlanner;
  const planContextTitle = hasAvatarReferencePlan
    ? copy.avatarExperience.planTitle
    : isCharacterPlaybookPlan
      ? copy.planContext.title
      : copy.planContext.titlePlanner;
  const planContextBody = hasAvatarReferencePlan
    ? copy.avatarExperience.planBody
    : isCharacterPlaybookPlan
      ? copy.planContext.body
      : copy.planContext.bodyPlanner;
  const planContextNextStep = hasAvatarReferencePlan
    ? copy.avatarExperience.planNextStep
    : copy.planContext.nextStep;
  const planContextGenerateCta = hasAvatarReferencePlan
    ? copy.avatarExperience.planGenerateCta
    : copy.planContext.generateCta;
  const avatarReferenceCopy =
    initialPlan?.avatarReferenceMode === "set"
      ? copy.avatarExperience.avatarReferenceSet
      : copy.avatarExperience.avatarReferenceSingle;
  const avatarReferencePreviewItems = useMemo(() => {
    if (!profile || !isAvatarVideoExperience) {
      return [];
    }

    const candidates = [
      ...(profile.avatarImageUrl
        ? [
            {
              expression: "default" as const,
              label: copy.avatarExperience.referencePreviewTitle,
              url: profile.avatarImageUrl,
            },
          ]
        : []),
      ...(profile.avatarImageSet ?? []).map((candidate) => ({
        expression: candidate.expression,
        label: candidate.label ?? candidate.expression ?? null,
        url: candidate.url,
      })),
    ].filter((candidate) => Boolean(candidate.url?.trim()));
    const seenUrls = new Set<string>();
    const uniqueCandidates = candidates.filter((candidate) => {
      const url = candidate.url.trim();

      if (!url || seenUrls.has(url)) {
        return false;
      }

      seenUrls.add(url);
      return true;
    });
    const priority = [
      ...(initialPlan?.avatarReferenceExpression
        ? [initialPlan.avatarReferenceExpression]
        : []),
      "default",
      "smile",
      "focus",
      "serious",
      "thumbnail",
      "reaction",
      "fanservice",
      "shy",
    ];

    return uniqueCandidates
      .sort((left, right) => {
        const leftRank = priority.indexOf(left.expression ?? "");
        const rightRank = priority.indexOf(right.expression ?? "");

        return (
          (leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank) -
          (rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank)
        );
      })
      .slice(0, initialPlan?.avatarReferenceMode === "set" ? 4 : 2);
  }, [
    copy.avatarExperience.referencePreviewTitle,
    initialPlan?.avatarReferenceExpression,
    initialPlan?.avatarReferenceMode,
    isAvatarVideoExperience,
    profile,
  ]);
  const primaryAvatarReference = avatarReferencePreviewItems[0] ?? null;
  const avatarReferencePreviewTitle =
    initialPlan?.avatarReferenceMode === "set"
      ? copy.avatarExperience.referenceSetTitle
      : (primaryAvatarReference?.label ||
        form.title.trim() ||
        copy.avatarExperience.referencePreviewTitle);
  const generatedVideoUrl = generatedMedia?.url ?? null;
  const previewClipVideoUrl = generatedMedia?.previewClipVideoUrl ?? null;
  const frameCandidates = generatedMedia?.coverImageCandidates ?? [];
  const canEditFrameCandidates = Boolean(
    generatedVideoUrl && !hasPublishedContent && !isAddingFrameCandidates,
  );
  const publishTitleFallback =
    generatedMedia?.source === "upload" ? copy.upload.fallbackTitle : generateCta;
  const localDraftSavedTime = formatDraftSavedAt(localDraftSavedAt, locale);
  const localDraftLabel =
    localDraftStatus === "restored"
      ? copy.draftAutosaveRestored
      : localDraftStatus === "cleared"
        ? copy.draftAutosaveCleared
        : localDraftStatus === "saved" && localDraftSavedTime
          ? `${copy.draftAutosaveSaved} · ${localDraftSavedTime}`
          : localDraftStatus === "saved"
            ? copy.draftAutosaveSaved
            : null;
  const contentHref = createdContent
    ? setPathSearchParams(
        buildPathWithReferral(
          isNewsSurface
            ? `/${locale}/fanletter/news/vlogs/${createdContent.contentId}`
            : `/${locale}/fanletter/content/${createdContent.contentId}`,
          referralCode ?? createdContent.authorReferralCode,
        ),
        isNewsSurface ? { returnTo: returnToHref || newsVlogManageHref } : {},
      )
    : null;
  const frameManagerHref = createdContent
    ? setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/fanletter/studio/vlogs`,
          referralCode ?? createdContent.authorReferralCode,
        ),
        {
          contentId: createdContent.contentId,
          panel: "frames",
          q: createdContent.title,
          returnTo: contentHref ?? returnToHref,
        },
      )
    : null;

  const resolveEmail = useCallback(async () => {
    const resolved =
      email ??
      memberSession.email ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!resolved) {
      throw new Error(copy.accountRequiredBody);
    }

    setEmail(resolved);
    return resolved;
  }, [copy.accountRequiredBody, email, memberSession.email]);

  const createGeneratedVideoTeaserCovers = useCallback(
    async ({
      count,
      email: ownerEmail,
      existingTimestampSecs,
      selectionMode,
      title,
      videoUrl,
    }: {
      count?: number;
      email: string;
      existingTimestampSecs?: number[];
      selectionMode?: "balanced" | "fill_gaps";
      title: string;
      videoUrl: string;
    }) => {
      const frameCoverFiles = await captureVideoCoverFramesFromUrl(
        videoUrl,
        title || "ai-character-vlog",
        {
          count: count ?? VIDEO_FRAME_COVER_CANDIDATE_COUNT,
          existingTimestampSecs,
          selectionMode,
        },
      );
      const coverImageCandidates: ContentCoverImageCandidate[] = [];
      let coverImageUrl: string | null = null;
      let lastUploadError: unknown = null;

      for (const frame of frameCoverFiles) {
        try {
          const formData = new FormData();

          formData.set("email", ownerEmail);
          formData.set("file", frame.file);
          formData.set("walletAddress", accountAddress ?? "");

          const response = await fetch("/api/content/posts/upload", {
            body: formData,
            method: "POST",
          });
          const data = (await response.json()) as ContentPostUploadResponse | {
            error?: string;
          };

          if (!response.ok || !("url" in data)) {
            throw new Error(
              "error" in data && data.error ? data.error : copy.errorFallback,
            );
          }

          coverImageUrl ??= data.url;
          coverImageCandidates.push(
            createFrameCoverImageCandidate({
              frame,
              upload: data,
            }),
          );
        } catch (error) {
          lastUploadError = error;
        }
      }

      if (!coverImageUrl) {
        throw lastUploadError instanceof Error
          ? lastUploadError
          : new Error(copy.errorFallback);
      }

      return {
        coverImageCandidates: coverImageCandidates.slice(
          0,
          COVER_IMAGE_CANDIDATE_LIMIT,
        ),
        contentImageUrls: getFrameCandidateImageUrls(coverImageCandidates),
        coverImageUrl,
      };
    },
    [accountAddress, copy.errorFallback],
  );

  const loadSetup = useCallback(async () => {
    if (!accountAddress || loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setError(null);
    setNotice(null);
    setLoadStatus("loading");

    try {
      const resolvedEmail = await resolveEmail();
      const profileUrl = `/api/content/profile?email=${encodeURIComponent(
        resolvedEmail,
      )}&walletAddress=${encodeURIComponent(accountAddress)}`;
      let response = await fetch(profileUrl);
      let data = await readApiJson<CreatorProfileResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok && response.status === 404) {
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
          throw new Error(syncData.error || copy.errorFallback);
        }

        if (syncData.member) {
          setMember(syncData.member);
          updateMemberSession({
            email: syncData.member.email,
            member: syncData.member,
            walletAddress: accountAddress,
          });
        }

        if (syncData.validationError) {
          setError(syncData.validationError);
          setLoadStatus("ready");
          return;
        }

        if (syncData.member?.status !== "completed") {
          setError(copy.paymentRequired);
          setLoadStatus("ready");
          return;
        }

        response = await fetch(profileUrl);
        data = await readApiJson<CreatorProfileResponse>(
          response,
          copy.errorFallback,
        );
      }

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      if (data.member) {
        setMember(data.member);
        updateMemberSession({
          email: resolvedEmail,
          member: data.member,
          walletAddress: accountAddress,
        });
      }

      setProfile(data.profile);
      setLoadStatus("ready");
    } catch (loadError) {
      setError(getErrorMessage(loadError, copy.errorFallback));
      setLoadStatus("error");
    } finally {
      loadInFlightRef.current = false;
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    copy.errorFallback,
    copy.paymentRequired,
    locale,
    referralCode,
    resolveEmail,
    updateMemberSession,
  ]);

  useEffect(() => {
    if (!connection.isConnected) {
      return;
    }

    void loadSetup();
  }, [connection.isConnected, loadSetup]);

  useEffect(() => {
    if (!newsVloggerProfileStorageValue) {
      return;
    }

    try {
      window.localStorage.setItem(
        FANLETTER_NEWS_VLOGGER_PROFILE_STORAGE_KEY,
        newsVloggerProfileStorageValue,
      );
      window.dispatchEvent(
        new Event(FANLETTER_NEWS_VLOGGER_PROFILE_CHANGE_EVENT),
      );
    } catch {
      return;
    }
  }, [newsVloggerProfileStorageValue]);

  useEffect(() => {
    localDraftRestoredRef.current = false;
    const timeout = window.setTimeout(() => {
      const draft = readCreateLocalDraft(localDraftKey);

      if (draft) {
        setForm(draft.form);
        setGeneratedMedia(draft.generatedMedia);
        setGenerationMessage(draft.generationMessage);
        setGenerationStatus(draft.generationStatus);
        setLocalDraftSavedAt(draft.savedAt);
        setLocalDraftStatus("restored");
      }

      localDraftRestoredRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [localDraftKey]);

  useEffect(() => {
    if (!localDraftRestoredRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!hasMeaningfulCreateDraft(form, generatedMedia)) {
        clearCreateLocalDraft(localDraftKey);
        return;
      }

      const savedAt = writeCreateLocalDraft(localDraftKey, {
        form,
        generatedMedia,
        generationMessage,
        generationStatus:
          generationStatus === "loading"
            ? generatedMedia
              ? "ready"
              : "idle"
            : generationStatus,
      });

      if (savedAt) {
        setLocalDraftSavedAt(savedAt);
        setLocalDraftStatus("saved");
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    form,
    generatedMedia,
    generationMessage,
    generationStatus,
    localDraftKey,
  ]);

  useEffect(() => {
    if (
      !generatedVideoUrl ||
      generationStatus !== "ready" ||
      localDraftStatus === "restored" ||
      scrolledResultMediaUrlRef.current === generatedVideoUrl
    ) {
      return;
    }

    scrolledResultMediaUrlRef.current = generatedVideoUrl;
    const timeout = window.setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [generatedVideoUrl, generationStatus, localDraftStatus]);

  useEffect(() => {
    if (
      initialPlan?.sourceMode !== "upload" ||
      scrolledUploadComposeRef.current
    ) {
      return;
    }

    scrolledUploadComposeRef.current = true;
    const timeout = window.setTimeout(() => {
      composeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [initialPlan?.sourceMode]);

  function updateForm(patch: Partial<CreateForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function selectCoverFrame(candidate: ContentCoverImageCandidate) {
    setGeneratedMedia((current) =>
      current
        ? {
            ...current,
            coverImageUrl: candidate.url,
          }
        : current,
    );
  }

  function deleteCoverFrame(candidate: ContentCoverImageCandidate) {
    if (!canEditFrameCandidates) {
      return;
    }

    setGeneratedMedia((current) => {
      if (!current) {
        return current;
      }

      const nextCandidates = current.coverImageCandidates.filter(
        (currentCandidate) =>
          currentCandidate.candidateId !== candidate.candidateId,
      );
      const currentCoverStillExists = nextCandidates.some(
        (currentCandidate) => currentCandidate.url === current.coverImageUrl,
      );
      const nextCoverImageUrl =
        current.coverImageUrl === candidate.url || !currentCoverStillExists
          ? (nextCandidates[0]?.url ?? null)
          : current.coverImageUrl;

      return {
        ...current,
        coverImageCandidates: nextCandidates,
        coverImageUrl: nextCoverImageUrl,
      };
    });
  }

  async function addCoverFrameCandidates() {
    if (!accountAddress) {
      setError(copy.accountRequiredBody);
      return;
    }

    if (!generatedMedia?.url) {
      setError(copy.missingMedia);
      return;
    }

    if (hasPublishedContent) {
      setNotice(copy.publishAlreadyCompleted);
      return;
    }

    const remainingSlots =
      COVER_IMAGE_CANDIDATE_LIMIT - generatedMedia.coverImageCandidates.length;

    if (remainingSlots <= 0) {
      setNotice(copy.resultReview.limitReached);
      return;
    }

    try {
      setError(null);
      setIsAddingFrameCandidates(true);
      setNotice(null);

      const resolvedEmail = await resolveEmail();
      const teaserCovers = await createGeneratedVideoTeaserCovers({
        count: Math.min(3, remainingSlots),
        email: resolvedEmail,
        existingTimestampSecs: getFrameCandidateTimestampSecs(
          generatedMedia.coverImageCandidates,
        ),
        selectionMode: "fill_gaps",
        title: inferTitle(form, publishTitleFallback),
        videoUrl: generatedMedia.url,
      });

      setGeneratedMedia((current) => {
        if (!current || current.url !== generatedMedia.url) {
          return current;
        }

        const coverImageCandidates = mergeCoverImageCandidates(
          current.coverImageCandidates,
          teaserCovers.coverImageCandidates,
        );

        return {
          ...current,
          coverImageCandidates,
          coverImageUrl:
            current.coverImageUrl ??
            teaserCovers.coverImageUrl ??
            coverImageCandidates[0]?.url ??
            null,
        };
      });
      setNotice(copy.resultReview.addedFrames);
    } catch {
      setError(copy.resultReview.addFailed);
    } finally {
      setIsAddingFrameCandidates(false);
    }
  }

  async function generateMedia() {
    if (!form.prompt.trim()) {
      setError(copy.emptyPrompt);
      return;
    }

    if (!accountAddress) {
      setError(copy.accountRequiredBody);
      return;
    }

    const endpoint = "/api/content/posts/generate-content-video";

    try {
      setCreatedContent(null);
      setError(null);
      setGeneratedMedia(null);
      setGenerationMessage(copy.generatingVideo);
      setGenerationStatus("loading");
      setNotice(null);

      const resolvedEmail = await resolveEmail();
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          email: resolvedEmail,
          locale,
          summary: inferSummary(form),
          title: inferTitle(form, generateCta),
          avatarReferenceExpression:
            initialPlan?.avatarReferenceExpression ?? null,
          avatarReferenceMode: initialPlan?.avatarReferenceMode ?? null,
          planId: initialPlanId,
          visualBrief: form.prompt,
          videoQualityMode: isAvatarVideoExperience ? "person_high" : "standard",
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<ContentPostGenerateCoverResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      const generatedVideoRuntimeMetadata =
        data.durationSec && data.durationSec > 0
          ? null
          : await readContentVideoUrlMetadata(data.url).catch(() => null);
      const generatedVideoMetadata = createContentVideoMetadata({
        contentType: data.contentType,
        durationSec:
          data.durationSec ?? generatedVideoRuntimeMetadata?.durationSec ?? null,
        height: data.height ?? generatedVideoRuntimeMetadata?.height ?? null,
        pathname: data.pathname,
        source: "generated",
        url: data.url,
        width: data.width ?? generatedVideoRuntimeMetadata?.width ?? null,
      });
      const generatedVideo = {
        contentType: data.contentType,
        coverImageCandidates: [],
        coverImageUrl: null,
        fileName: null,
        pathname: data.pathname,
        previewClipVideoUrl: data.previewClipVideoUrl ?? null,
        revisedPrompt: data.revisedPrompt,
        source: "ai" as const,
        url: data.url,
        videoMetadata: generatedVideoMetadata,
      };
      let coverImageCandidates: ContentCoverImageCandidate[] = [];
      let coverImageUrl: string | null = null;

      setGeneratedMedia(generatedVideo);
      setGenerationMessage(copy.teaserGenerating);

      try {
        const teaserCovers = await createGeneratedVideoTeaserCovers({
          email: resolvedEmail,
          title: inferTitle(form, generateCta),
          videoUrl: data.url,
        });
        coverImageCandidates = teaserCovers.coverImageCandidates;
        coverImageUrl = teaserCovers.coverImageUrl;
      } catch {
        coverImageCandidates = [];
        coverImageUrl = null;
      }

      setGeneratedMedia({
        ...generatedVideo,
        coverImageCandidates,
        coverImageUrl,
      });
      setGenerationMessage(copy.contentReady);
      setGenerationStatus("ready");
      setNotice(coverImageUrl ? copy.teaserReady : copy.teaserFailed);
    } catch (generationError) {
      const message = getErrorMessage(generationError, copy.errorFallback);

      setError(message);
      setGenerationMessage(message);
      setGenerationStatus("error");
    }
  }

  async function uploadFreeVideo(file: File) {
    if (!accountAddress) {
      setError(copy.accountRequiredBody);
      return;
    }

    if (!contentVideoMimeTypes.includes(file.type as (typeof contentVideoMimeTypes)[number])) {
      setError(copy.upload.unsupported);
      return;
    }

    if (file.size > CONTENT_VIDEO_MAX_BYTES) {
      setError(copy.upload.videoTooLarge(uploadMaxSizeLabel));
      return;
    }

    const uploadReferralCode = member?.referralCode;

    if (!uploadReferralCode) {
      setError(copy.upload.missingReferral);
      return;
    }

    try {
      setCreatedContent(null);
      setError(null);
      setGeneratedMedia(null);
      setGenerationMessage(copy.upload.uploading);
      setGenerationStatus("loading");
      setIsUploadingVideo(true);
      setNotice(null);
      setVideoUploadProgress(0);

      const resolvedEmail = await resolveEmail();
      const pathname = [
        CONTENT_POSTS_BLOB_PATH_SEGMENT,
        uploadReferralCode,
        CONTENT_UPLOADED_VIDEO_PATH_SEGMENT,
        `${Date.now()}-${sanitizeUploadBaseName(file.name)}${resolveVideoExtension(file)}`,
      ].join("/");
      const uploaded = await uploadBlob(pathname, file, {
        access: "public",
        clientPayload: JSON.stringify({
          email: resolvedEmail,
          walletAddress: accountAddress,
        }),
        contentType: file.type,
        handleUploadUrl: "/api/content/posts/video-upload",
        multipart: true,
        onUploadProgress: (progress) => {
          setVideoUploadProgress(progress.percentage);
          setGenerationMessage(copy.upload.progress(progress.percentage));
        },
      });
      const uploadedFileMetadata = await readContentVideoFileMetadata(file).catch(
        () => null,
      );
      const uploadedVideoMetadata = createContentVideoMetadata({
        contentType: file.type,
        durationSec: uploadedFileMetadata?.durationSec ?? null,
        height: uploadedFileMetadata?.height ?? null,
        pathname: uploaded.pathname,
        source: "uploaded",
        url: uploaded.url,
        width: uploadedFileMetadata?.width ?? null,
      });
      let previewClipVideoUrl: string | null = null;

      try {
        setGenerationMessage(
          locale === "ko"
            ? "업로드 동영상의 짧은 프리뷰를 준비하고 있습니다."
            : "Preparing a short preview from the uploaded video.",
        );
        const previewVideo = await createContentVideoPreview({
          email: resolvedEmail,
          sourceVideoUrl: uploaded.url,
          title: inferTitle(form, copy.upload.fallbackTitle),
          walletAddress: accountAddress,
        });

        previewClipVideoUrl = previewVideo.url;
      } catch {
        previewClipVideoUrl = null;
      }
      const uploadedVideo: GeneratedMedia = {
        contentType: file.type,
        coverImageCandidates: [],
        coverImageUrl: null,
        fileName: file.name,
        pathname: uploaded.pathname,
        previewClipVideoUrl,
        revisedPrompt: null,
        source: "upload",
        url: uploaded.url,
        videoMetadata: uploadedVideoMetadata,
      };
      let coverImageCandidates: ContentCoverImageCandidate[] = [];
      let coverImageUrl: string | null = null;

      setGeneratedMedia(uploadedVideo);
      setGenerationMessage(copy.upload.teaserGenerating);

      try {
        const teaserCovers = await createGeneratedVideoTeaserCovers({
          email: resolvedEmail,
          title: inferTitle(form, copy.upload.fallbackTitle),
          videoUrl: uploaded.url,
        });
        coverImageCandidates = teaserCovers.coverImageCandidates;
        coverImageUrl = teaserCovers.coverImageUrl;
      } catch {
        coverImageCandidates = [];
        coverImageUrl = null;
      }

      setGeneratedMedia({
        ...uploadedVideo,
        coverImageCandidates,
        coverImageUrl,
      });
      setGenerationMessage(copy.upload.ready);
      setGenerationStatus("ready");
      setNotice(coverImageUrl ? copy.upload.teaserReady : copy.upload.teaserFailed);
    } catch (uploadError) {
      const message = getErrorMessage(uploadError, copy.errorFallback);

      setError(message);
      setGenerationMessage(message);
      setGenerationStatus("error");
    } finally {
      setIsUploadingVideo(false);
    }
  }

  async function savePost(status: "draft" | "published") {
    if (saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;

    if (!accountAddress) {
      setError(copy.accountRequiredBody);
      saveInFlightRef.current = false;
      return;
    }

    if (status === "published" && hasPublishedContent) {
      setNotice(copy.publishAlreadyCompleted);
      saveInFlightRef.current = false;
      return;
    }

    if (status === "published" && !generatedMedia?.url) {
      setError(copy.missingMedia);
      saveInFlightRef.current = false;
      return;
    }

    const title = inferTitle(form, publishTitleFallback);
    const body = form.body.trim() || form.prompt.trim() || title;
    const summary = inferSummary(form) || body.replace(/\s+/g, " ").slice(0, 140);
    let savedContent: ContentPostRecord | null = null;

    try {
      setError(null);
      setFanRequestSyncError(null);
      if (initialFanRequestId) {
        setFanRequestSyncStatus("idle");
      }
      setIsSaving(true);
      setNotice(null);
      const resolvedEmail = await resolveEmail();
      let coverImageUrlToSave = generatedMedia?.coverImageUrl ?? null;
      let coverImageCandidatesToSave =
        generatedMedia?.coverImageCandidates ?? [];
      let contentImageUrlsToSave = getFrameCandidateImageUrls(
        coverImageCandidatesToSave,
      );

      if (
        generatedVideoUrl &&
        (!coverImageUrlToSave || coverImageCandidatesToSave.length === 0)
      ) {
        try {
          setGenerationMessage(
            generatedMedia?.source === "upload"
              ? copy.upload.teaserGenerating
              : copy.teaserGenerating,
          );
          const teaserCovers = await createGeneratedVideoTeaserCovers({
            email: resolvedEmail,
            title,
            videoUrl: generatedVideoUrl,
          });
          coverImageUrlToSave ??= teaserCovers.coverImageUrl;
          coverImageCandidatesToSave = mergeCoverImageCandidates(
            coverImageCandidatesToSave,
            teaserCovers.coverImageCandidates,
          );
          contentImageUrlsToSave = mergeContentImageUrls(
            contentImageUrlsToSave,
            teaserCovers.contentImageUrls,
          );
          setGeneratedMedia((current) =>
            current?.url === generatedVideoUrl
              ? {
                  ...current,
                  coverImageCandidates: coverImageCandidatesToSave,
                  coverImageUrl: coverImageUrlToSave,
                }
              : current,
          );
        } catch {
          coverImageUrlToSave = generatedMedia?.coverImageUrl ?? null;
          coverImageCandidatesToSave =
            generatedMedia?.coverImageCandidates ?? [];
          contentImageUrlsToSave = getFrameCandidateImageUrls(
            coverImageCandidatesToSave,
          );
        }
      }

      const exclusiveNewsReporterReferralCode =
        exclusiveNewsReporterCode.trim().toUpperCase() || null;
      const response = await fetch("/api/content/posts", {
        body: JSON.stringify({
          body,
          contentImageUrls: contentImageUrlsToSave,
          contentVideoMetadata:
            generatedVideoUrl && generatedMedia?.videoMetadata
              ? [generatedMedia.videoMetadata]
              : [],
          contentVideoUrls: generatedVideoUrl ? [generatedVideoUrl] : [],
          coverImageCandidates: coverImageCandidatesToSave,
          coverImageUrl: coverImageUrlToSave,
          email: resolvedEmail,
          exclusiveNewsDurationHours: exclusiveNewsReporterReferralCode
            ? exclusiveNewsDurationHours
            : null,
          exclusiveNewsReporterReferralCode,
          locale,
          previewClipVideoUrl: generatedMedia?.previewClipVideoUrl ?? null,
          priceType: "free",
          priceUsdt: null,
          status,
          summary,
          title,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<ContentPostMutationResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("content" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      savedContent = data.content;
      setCreatedContent(data.content);
      if (initialPlanId && !isCharacterPlaybookPlan) {
        await fetch("/api/content/planner", {
          body: JSON.stringify({
            contentId: data.content.contentId,
            email: resolvedEmail,
            planId: initialPlanId,
            status: status === "published" ? "published" : "created",
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        }).catch(() => null);
      }
      if (initialFanRequestId) {
        setFanRequestSyncStatus("syncing");
        const fanRequestResponse = await fetch("/api/fanletter/requests", {
          body: JSON.stringify({
            contentId: status === "published" ? data.content.contentId : null,
            email: resolvedEmail,
            requestId: initialFanRequestId,
            status: status === "published" ? "used" : "reviewed",
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const fanRequestData =
          await readApiJson<FanletterFanRequestStatusUpdateResponse>(
            fanRequestResponse,
            copy.fanRequestContext.failed,
          );

        if (!fanRequestResponse.ok || !("request" in fanRequestData)) {
          throw new Error(
            "error" in fanRequestData && fanRequestData.error
              ? fanRequestData.error
              : copy.fanRequestContext.failed,
          );
        }

        setFanRequestSyncStatus(
          status === "published" ? "used" : "reviewed",
        );
      }
      setNotice(status === "published" ? copy.published : copy.draftSaved);
      clearCreateLocalDraft(localDraftKey);
      setLocalDraftSavedAt(null);
      setLocalDraftStatus("cleared");
    } catch (saveError) {
      const message = getErrorMessage(saveError, copy.errorFallback);

      if (savedContent && initialFanRequestId) {
        setFanRequestSyncError(message);
        setFanRequestSyncStatus("failed");
      } else {
        setError(message);
      }
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }

  if (connection.isResolving) {
    return (
      <StatusPanel
        {...statusPanelNavigationProps}
        body={copy.loading}
        cta={copy.accountRequiredCta}
        href={connectHref}
        locale={locale}
        referralCode={referralCode}
        title={copy.loading}
      />
    );
  }

  if (connection.isDisconnected) {
    return (
      <StatusPanel
        {...statusPanelNavigationProps}
        body={copy.accountRequiredBody}
        cta={copy.accountRequiredCta}
        href={connectHref}
        locale={locale}
        referralCode={referralCode}
        title={copy.accountRequired}
      />
    );
  }

  if (member?.status === "pending_payment") {
    return (
      <StatusPanel
        {...statusPanelNavigationProps}
        body={copy.paymentRequired}
        cta={copy.paymentRequiredCta}
        href={activateHref}
        locale={locale}
        referralCode={referralCode}
        title={copy.paymentRequired}
      />
    );
  }

  if (loadStatus === "ready" && !hasCharacterReady) {
    return (
      <StatusPanel
        {...statusPanelNavigationProps}
        body={copy.profileRequiredBody}
        cta={copy.profileRequiredCta}
        href={profileHref}
        locale={locale}
        referralCode={referralCode}
        title={copy.profileRequired}
      />
    );
  }

  const uploadPickerPanel = (
    <div className="rounded-lg border border-white/12 bg-white/[0.06] p-3 sm:p-4">
      <input
        accept={contentVideoMimeTypes.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;

          if (file) {
            void uploadFreeVideo(file);
          }

          event.currentTarget.value = "";
        }}
        ref={videoUploadInputRef}
        type="file"
      />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {copy.upload.select}
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-white/46">
            {copy.upload.fileHelp(uploadMaxSizeLabel)}
          </p>
          {isNewsSurface ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-[#c9ffd5]">
              {copy.upload.tiktokHelp}
            </p>
          ) : null}
        </div>
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isUploadingVideo}
          onClick={() => {
            videoUploadInputRef.current?.click();
          }}
          type="button"
        >
          {isUploadingVideo ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {isUploadingVideo ? copy.upload.uploading : copy.upload.uploadCta}
        </button>
      </div>
      {isUploadingVideo ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#44f26e] transition-[width]"
              style={{ width: `${Math.max(4, videoUploadProgress)}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-[#c9ffd5]">
            {copy.upload.progress(videoUploadProgress)}
          </p>
        </div>
      ) : null}
      {generatedMedia?.source === "upload" ? (
        <p className="mt-4 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-2 text-xs font-semibold leading-5 text-[#d8ffe0]">
          {copy.upload.selected}:{" "}
          {generatedMedia.fileName ?? copy.upload.fallbackTitle}
        </p>
      ) : null}
    </div>
  );

  return (
    <main
      className={`min-h-screen bg-[#030504] text-white ${
        isNewsSurface
          ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-0"
          : ""
      }`}
    >
      <section
        className={
          isNewsSurface
            ? "px-2 pb-6 pt-[calc(env(safe-area-inset-top)+8px)] sm:px-4 sm:pb-10 sm:pt-[calc(env(safe-area-inset-top)+16px)] lg:px-8"
            : "px-4 pb-10 pt-[calc(env(safe-area-inset-top)+16px)] sm:px-6 lg:px-8"
        }
      >
        <div className="mx-auto max-w-6xl">
          <FanletterTabTopBar
            accountActivateHref={isNewsSurface ? activateBaseHref : undefined}
            accountConnectHref={isNewsSurface ? connectBaseHref : undefined}
            accountFallbackHref={isNewsSurface ? newsHomeHref : undefined}
            actionHref={topBarActionHref}
            actionLabel={surfaceStudioLabel}
            backHref={topBarBackHref}
            homeHref={topBarHomeHref}
            locale={locale}
            referralCode={referralCode}
            reportsHref={isNewsSurface ? newsReportsHref : undefined}
            reportsLabel={newsSurfaceCopy?.reports}
          />

          {isNewsSurface ? (
            <section className="mt-3 border border-[#44f26e]/24 bg-[#07100b] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.24)] lg:hidden">
              <div className="flex items-center gap-3">
                <span className="relative flex size-12 shrink-0 overflow-hidden rounded-full border border-white/12 bg-white/[0.06]">
                  {profile?.avatarImageUrl ? (
                    <Image
                      alt={profileCharacterName}
                      className="object-cover"
                      fill
                      sizes="48px"
                      src={profile.avatarImageUrl}
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      <UserRound className="size-6 text-[#44f26e]" />
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                    {heroEyebrow}
                  </p>
                  <h1 className="mt-1 line-clamp-2 text-[1.45rem] font-semibold leading-tight tracking-normal [word-break:keep-all]">
                    {heroTitleText}
                  </h1>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-white/64 [word-break:keep-all]">
                {createSourceMode === "upload"
                  ? selectedModeCopy
                  : newsSurfaceCopy?.mobileBody ?? selectedModeCopy}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {(newsSurfaceCopy?.mobileSteps ?? []).map((step, index) => (
                  <div
                    className="border border-white/10 bg-white/[0.055] px-2 py-2 text-center"
                    key={step}
                  >
                    <p className="text-[0.58rem] font-semibold text-[#44f26e]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-1 truncate text-[0.66rem] font-semibold text-white/72">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                    createSourceMode === "ai"
                      ? "bg-[#44f26e] !text-black"
                      : "border border-white/14 bg-white/[0.055] !text-white/72 hover:bg-white/10"
                  }`}
                  href="#fanletter-vlog-compose"
                  onClick={() => {
                    setCreateSourceMode("ai");
                  }}
                >
                  <Clapperboard className="size-4" />
                  {newsSurfaceCopy?.mobileAiCta ?? copy.generate}
                </a>
                <button
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    createSourceMode === "upload"
                      ? "bg-[#44f26e] text-black hover:bg-[#67ff88]"
                      : "border border-white/14 bg-white/[0.055] text-white/72 hover:bg-white/10"
                  }`}
                  disabled={isUploadingVideo}
                  onClick={() => {
                    setCreateSourceMode("upload");
                    window.setTimeout(() => {
                      videoUploadInputRef.current?.click();
                    }, 0);
                  }}
                  type="button"
                >
                  {isUploadingVideo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {isUploadingVideo
                    ? copy.upload.uploading
                    : newsSurfaceCopy?.mobileUploadCta ??
                      newsSurfaceCopy?.mobileCta ??
                      copy.upload.select}
                </button>
              </div>
              <div className="mt-2 grid gap-2">
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.055] px-4 text-xs font-semibold !text-white/72 transition hover:bg-white/10"
                  href={topBarActionHref}
                >
                  {surfaceStudioLabel}
                </Link>
                <p className="text-xs font-semibold leading-5 text-white/48">
                  {copy.upload.tiktokHelp}
                </p>
              </div>
            </section>
          ) : null}

          <div
            className={
              isNewsSurface
                ? "hidden gap-8 pb-10 pt-10 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.78fr)] lg:items-end lg:pb-14 lg:pt-20"
                : "grid gap-8 pb-10 pt-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.78fr)] lg:items-end lg:pb-14 lg:pt-20"
            }
          >
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {heroEyebrow}
              </p>
              <h1
                className={`mt-4 font-semibold tracking-normal [word-break:keep-all] ${
                  isAvatarVideoExperience
                    ? "text-[1.9rem] leading-[1.1] sm:text-[2.7rem] lg:text-[3rem]"
                    : "text-[2rem] leading-[1.08] sm:text-[3rem] lg:text-[3.25rem]"
                }`}
              >
                {heroTitleText}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {selectedModeCopy}
              </p>
            </div>

            <aside className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
              {isAvatarVideoExperience ? (
                <div className="mb-5 overflow-hidden rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10">
                  <div className="grid gap-3 p-3 sm:grid-cols-[8rem_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[8rem_minmax(0,1fr)]">
                    <div className="relative aspect-[4/5] min-h-36 overflow-hidden rounded-lg border border-white/12 bg-black/34">
                      {primaryAvatarReference?.url ? (
                        <Image
                          alt={avatarReferencePreviewTitle}
                          className="object-cover"
                          fill
                          sizes="(max-width: 640px) 128px, 144px"
                          src={primaryAvatarReference.url}
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <UserRound className="size-8 text-[#44f26e]" />
                        </span>
                      )}
                      <span className="absolute left-2 top-2 rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.64rem] font-semibold text-black">
                        Reference
                      </span>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8dffa5]">
                        {copy.avatarExperience.referencePreviewTitle}
                      </p>
                      <h2 className="mt-2 line-clamp-2 text-xl font-semibold leading-tight text-white">
                        {avatarReferencePreviewTitle}
                      </h2>
                      <p className="mt-2 text-xs font-semibold leading-5 text-white/62">
                        {primaryAvatarReference
                          ? copy.avatarExperience.referencePreviewBody
                          : copy.avatarExperience.referencePreviewEmpty}
                      </p>
                    </div>
                  </div>
                  {avatarReferencePreviewItems.length > 1 ? (
                    <div className="border-t border-white/10 px-3 py-3">
                      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                        {avatarReferencePreviewItems.map((item) => (
                          <span
                            className="relative block aspect-square w-12 shrink-0 overflow-hidden rounded-lg border border-white/12 bg-black/28"
                            key={item.url}
                          >
                            <Image
                              alt={item.label ?? avatarReferencePreviewTitle}
                              className="object-cover"
                              fill
                              sizes="48px"
                              src={item.url}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-start gap-3 border-t border-white/10 px-3 py-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {copy.avatarExperience.qualityTitle}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-white/56">
                        {copy.avatarExperience.qualityBody}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex items-start gap-4">
                <span className="relative flex size-20 shrink-0 overflow-hidden rounded-full border border-white/12 bg-white/[0.06]">
                  {profile?.avatarImageUrl ? (
                    <Image
                      alt={profileCharacterName}
                      className="object-cover"
                      fill
                      sizes="80px"
                      src={profile.avatarImageUrl}
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      <UserRound className="size-8 text-[#44f26e]" />
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                    Creator Persona
                  </p>
                  <h2 className="mt-2 truncate text-2xl font-semibold">
                    {profileCharacterName}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/56">
                    {profile?.characterPersona?.summary ?? copy.personaEmpty}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  [Boolean(profile?.displayName), copy.setupChecks.title],
                  [hasPersona, copy.setupChecks.character],
                  [Boolean(generatedVideoUrl), copy.setupChecks.video],
                ].map(([done, label]) => (
                  <div
                    className={`rounded-lg border p-3 ${
                      done
                        ? "border-[#44f26e] bg-[#44f26e] text-black"
                        : "border-white/12 bg-white/[0.055] text-white"
                    }`}
                    key={String(label)}
                  >
                    <CheckCircle2 className="size-4" />
                    <p className="mt-2 truncate text-[0.62rem] font-semibold">
                      {String(label)}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-300/20 bg-red-500/12 p-4 text-sm font-medium leading-6 text-red-100">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="mb-4 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 p-4 text-sm font-medium leading-6 text-[#c9ffd5]">
              {notice}
            </div>
          ) : null}
          {localDraftLabel ? (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-white/12 bg-white/[0.055] p-4 text-sm font-medium leading-6 text-white/62 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                <div>
                  <p className="font-semibold text-[#c9ffd5]">
                    {localDraftLabel}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/44">
                    {copy.draftAutosaveHint}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {hasSharedVlogIntent ? (
            <section className="mb-4 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 text-[#d8ffe0] sm:p-5">
              <div className="flex items-start gap-3">
                <Upload className="mt-0.5 size-5 shrink-0 text-[#44f26e]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                    {copy.sharedVlog.sourceLabel} ·{" "}
                    {sharedVlogSource === "tiktok"
                      ? "TikTok"
                      : copy.sharedVlog.unknownSource}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-normal">
                    {copy.sharedVlog.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/64">
                    {copy.sharedVlog.body}
                  </p>
                  {sharedVlogUrl ? (
                    <a
                      className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/14 bg-black/24 px-3 py-2 text-xs font-semibold !text-[#d8ffe0] transition hover:bg-black/34"
                      href={sharedVlogUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="shrink-0">{copy.sharedVlog.urlLabel}</span>
                      <span className="truncate text-white/56">
                        {sharedVlogUrl}
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {hasPlanContext ? (
            <section className="mb-4 rounded-lg border border-[#44f26e]/24 bg-[linear-gradient(135deg,rgba(68,242,110,0.14),rgba(255,255,255,0.045)_46%,rgba(3,5,4,0.8))] p-4 text-[#d8ffe0] sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#44f26e]">
                    {planContextEyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal [word-break:keep-all]">
                    {planContextTitle}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/62 [word-break:keep-all]">
                    {planContextBody}
                  </p>
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-white/10 bg-black/24 p-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                    <p className="text-xs font-semibold leading-5 text-white/64">
                      {copy.planContext.applied}
                    </p>
                  </div>
                  {hasAvatarReferencePlan ? (
                    <div className="mt-2 flex items-start gap-3 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-3">
                      <UserRound className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                      <p className="text-xs font-semibold leading-5 text-[#d8ffe0]">
                        {avatarReferenceCopy}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 p-3">
                      <Clapperboard className="size-4 text-[#44f26e]" />
                      <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#8dffa5]">
                        {copy.planContext.outputLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {copy.planContext.outputValue}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                      <Play className="size-4 text-[#44f26e]" />
                      <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/40">
                        {copy.planContext.nextStepLabel}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                        {planContextNextStep}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                      {copy.planContext.titleLabel}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white">
                      {form.title || copy.titlePlaceholder}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                      {copy.planContext.summaryLabel}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/62">
                      {form.summary || copy.summaryPlaceholder}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                      {copy.planContext.promptLabel}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-white/62 [overflow-wrap:anywhere]">
                      {form.prompt || promptPlaceholder}
                    </p>
                  </div>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={generationStatus === "loading"}
                    onClick={() => {
                      void generateMedia();
                    }}
                    type="button"
                  >
                    {generationStatus === "loading" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clapperboard className="size-4" />
                    )}
                    {generationStatus === "loading"
                      ? copy.generatingVideo
                      : planContextGenerateCta}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {initialFanRequestId ? (
            <section className="mb-4 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 text-[#d8ffe0] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#44f26e]">
                    {copy.fanRequestContext.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                    {copy.fanRequestContext.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                    {copy.fanRequestContext.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fanRequestTypeLabel ? (
                      <span className="rounded-full border border-[#44f26e]/26 bg-black/24 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
                        {fanRequestTypeLabel}
                      </span>
                    ) : null}
                    {initialFanRequestCharacterName ? (
                      <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/62">
                        {initialFanRequestCharacterName}
                      </span>
                    ) : null}
                  </div>
                  {initialFanRequestBody ? (
                    <p className="mt-4 line-clamp-3 rounded-lg border border-white/10 bg-black/24 p-3 text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                      {initialFanRequestBody}
                    </p>
                  ) : null}
                  {fanRequestSyncLabel ? (
                    <div
                      className={`mt-3 flex items-start gap-3 rounded-lg border p-3 ${
                        fanRequestSyncStatus === "failed"
                          ? "border-red-300/20 bg-red-500/12 text-red-100"
                          : "border-[#44f26e]/24 bg-[#44f26e]/10 text-[#d8ffe0]"
                      }`}
                    >
                      {fanRequestSyncStatus === "syncing" ? (
                        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-[#44f26e]" />
                      ) : fanRequestSyncStatus === "failed" ? (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-200" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                      )}
                      <p className="text-xs font-semibold leading-5">
                        {fanRequestSyncLabel}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-[24rem] lg:grid-cols-1">
                  {[
                    copy.fanRequestContext.autoFill,
                    ...(fanOnlyIntent
                      ? [copy.fanRequestContext.fanOnlyDefault]
                      : []),
                    copy.fanRequestContext.publishStep,
                    copy.fanRequestContext.autoClose,
                  ].map((item) => (
                    <div
                      className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3"
                      key={item}
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                      <p className="text-xs font-semibold leading-5 text-white/64">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div
            className={
              isNewsSurface
                ? "grid gap-3 lg:grid-cols-[0.82fr_1.18fr]"
                : "grid gap-4 lg:grid-cols-[0.82fr_1.18fr]"
            }
          >
            <section
              className="rounded-lg border border-white/12 bg-white/[0.055] p-3 sm:p-5"
              id="fanletter-vlog-compose"
              ref={composeSectionRef}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                01
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                {createSourceMode === "upload" ? copy.upload.title : promptLabel}
              </h2>
              <div className="mt-4 grid rounded-full border border-white/12 bg-black/24 p-1 text-sm font-semibold grid-cols-2">
                {([
                  ["ai", copy.upload.tabAi, Clapperboard],
                  ["upload", copy.upload.tabUpload, Upload],
                ] as const).map(([mode, label, Icon]) => {
                  const isSelected = createSourceMode === mode;

                  return (
                    <button
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 transition ${
                        isSelected
                          ? "bg-[#44f26e] text-black"
                          : "text-white/62 hover:bg-white/8 hover:text-white"
                      }`}
                      key={mode}
                      onClick={() => {
                        setCreateSourceMode(mode);
                      }}
                      type="button"
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/12 p-3 text-[#d7ffdf] sm:mt-5 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  {createSourceMode === "upload" ? (
                    <Upload className="size-5 shrink-0 text-[#44f26e]" />
                  ) : (
                    <Clapperboard className="size-5 shrink-0 text-[#44f26e]" />
                  )}
                  {isAvatarVideoExperience ? (
                    <span className="rounded-full border border-[#44f26e]/28 bg-black/24 px-2.5 py-1 text-[0.65rem] font-semibold text-[#9dffb0]">
                      {copy.avatarExperience.qualityTitle}
                    </span>
                  ) : null}
                </div>
                <span className="mt-3 block text-sm font-semibold">
                  {createSourceMode === "upload" ? copy.upload.title : videoLabel}
                </span>
                <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                  {createSourceMode === "upload" ? copy.upload.body : videoBody}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:mt-5">
                {createSourceMode === "upload" ? (
                  <>
                    <div className="rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-3 text-sm font-semibold leading-6 text-[#d8ffe0]">
                      {copy.upload.directHint}
                    </div>
                    {uploadPickerPanel}
                  </>
                ) : null}
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    {copy.title}
                  </span>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                    onChange={(event) => {
                      updateForm({ title: event.target.value });
                    }}
                    placeholder={copy.titlePlaceholder}
                    value={form.title}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    {copy.summary}
                  </span>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                    onChange={(event) => {
                      updateForm({ summary: event.target.value });
                    }}
                    placeholder={copy.summaryPlaceholder}
                    value={form.summary}
                  />
                </label>
                {createSourceMode === "ai" ? (
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                      {promptLabel}
                    </span>
                    <textarea
                      className="mt-2 min-h-44 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                      onChange={(event) => {
                        updateForm({ prompt: event.target.value });
                      }}
                      placeholder={promptPlaceholder}
                      value={form.prompt}
                    />
                  </label>
                ) : null}
              </div>
              {createSourceMode === "ai" ? (
                <button
                  className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={generationStatus === "loading"}
                  onClick={() => {
                    void generateMedia();
                  }}
                  type="button"
                >
                  {generationStatus === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Clapperboard className="size-4" />
                  )}
                  {generationStatus === "loading"
                    ? copy.generatingVideo
                    : generateCta}
                </button>
              ) : null}
            </section>

            <section
              className="rounded-lg border border-white/12 bg-white/[0.055] p-3 sm:p-5"
              ref={resultSectionRef}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                02
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{resultLabel}</h2>
              <div className="mt-5 overflow-hidden rounded-lg border border-white/12 bg-black/32">
                <div className="relative aspect-[4/5]">
                  {generatedVideoUrl ? (
                    <video
                      autoPlay
                      className="h-full w-full object-contain"
                      controls
                      loop
                      muted
                      playsInline
                      poster={generatedMedia?.coverImageUrl ?? undefined}
                      src={generatedVideoUrl}
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center px-6 text-center text-white/44">
                      {generationStatus === "loading" ? (
                        <Loader2 className="size-8 animate-spin text-[#44f26e]" />
                      ) : (
                        <Play className="size-8 text-[#44f26e]" />
                      )}
                      <p className="mt-3 text-sm font-medium leading-6">
                        {generationMessage ?? selectedModeCopy}
                      </p>
                    </div>
                  )}
                </div>
                {generatedMedia?.revisedPrompt ? (
                  <p className="border-t border-white/10 p-3 text-xs font-medium leading-5 text-white/46">
                    {generatedMedia.revisedPrompt}
                  </p>
                ) : null}
              </div>
              {generatedVideoUrl ? (
                <div className="mt-4 rounded-lg border border-[#44f26e]/20 bg-[#44f26e]/10 p-4 text-[#d8ffe0]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                        {copy.resultReview.title}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                        {copy.resultReview.body}
                      </p>
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-1.5 text-center text-[0.62rem] font-semibold">
                      {[
                        {
                          label: copy.resultReview.original,
                          ready: Boolean(generatedVideoUrl),
                        },
                        {
                          label: copy.resultReview.preview,
                          ready: Boolean(previewClipVideoUrl),
                        },
                        {
                          label: copy.resultReview.frameCandidates,
                          ready: frameCandidates.length > 0,
                        },
                      ].map(({ label, ready }) => (
                        <span
                          className={`rounded-lg border px-2 py-2 ${
                            ready
                              ? "border-[#44f26e]/26 bg-black/24 text-[#b9ffc8]"
                              : "border-white/10 bg-white/[0.055] text-white/44"
                          }`}
                          key={label}
                        >
                          <CheckCircle2 className="mx-auto mb-1 size-3.5" />
                          <span className="block truncate">{label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/38">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                        <p className="text-xs font-semibold text-white">
                          {copy.resultReview.preview}
                        </p>
                        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#9dffb0]">
                          {previewClipVideoUrl
                            ? copy.resultReview.ready
                            : copy.resultReview.pending}
                        </span>
                      </div>
                      {previewClipVideoUrl ? (
                        <video
                          className="aspect-[9/16] max-h-[28rem] w-full bg-black object-contain"
                          controls
                          muted
                          playsInline
                          preload="metadata"
                          src={previewClipVideoUrl}
                        />
                      ) : (
                        <div className="flex min-h-44 flex-col items-center justify-center px-4 text-center text-sm font-medium leading-6 text-white/48">
                          <Play className="mb-3 size-7 text-[#44f26e]" />
                          {copy.resultReview.previewMissing}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-white">
                            {copy.resultReview.frameCandidates}
                          </p>
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.62rem] font-semibold text-white/58">
                            {frameCandidates.length}/{COVER_IMAGE_CANDIDATE_LIMIT}
                          </span>
                        </div>
                        <button
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#44f26e]/32 bg-[#44f26e]/12 px-3 py-1.5 text-xs font-semibold text-[#b9ffc8] transition hover:bg-[#44f26e] hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.05] disabled:text-white/34"
                          disabled={
                            !canEditFrameCandidates ||
                            frameCandidates.length >= COVER_IMAGE_CANDIDATE_LIMIT
                          }
                          onClick={() => {
                            void addCoverFrameCandidates();
                          }}
                          type="button"
                        >
                          {isAddingFrameCandidates ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Plus className="size-3.5" />
                          )}
                          {isAddingFrameCandidates
                            ? copy.resultReview.addingFrames
                            : copy.resultReview.addFrames}
                        </button>
                      </div>
                      {frameCandidates.length > 0 ? (
                        <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {frameCandidates.map((candidate) => {
                            const selected =
                              generatedMedia?.coverImageUrl === candidate.url;
                            const timestamp = formatFrameTimestamp(
                              candidate.timestampSec,
                            );
                            const frameSize = formatFrameSize(candidate);

                            return (
                              <div
                                className={`relative block h-32 w-24 shrink-0 snap-start overflow-hidden rounded-lg border bg-black text-left transition ${
                                  selected
                                    ? "border-[#44f26e] shadow-[0_0_0_2px_rgba(68,242,110,0.24)]"
                                    : "border-white/12 hover:border-[#44f26e]/60"
                                }`}
                                key={candidate.candidateId}
                              >
                                <button
                                  aria-label={
                                    selected
                                      ? copy.resultReview.selectedCover
                                      : copy.resultReview.selectCover
                                  }
                                  className="absolute inset-0 text-left disabled:cursor-default"
                                  disabled={!canEditFrameCandidates}
                                  onClick={() => {
                                    selectCoverFrame(candidate);
                                  }}
                                  type="button"
                                >
                                  <span
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{
                                      backgroundImage: `url(${candidate.url})`,
                                    }}
                                  />
                                  <span className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-1">
                                    {timestamp ? (
                                      <span className="rounded-full bg-black/72 px-1.5 py-0.5 text-[0.58rem] font-semibold text-white">
                                        {timestamp}
                                      </span>
                                    ) : null}
                                    {frameSize ? (
                                      <span className="rounded-full bg-white/88 px-1.5 py-0.5 text-[0.58rem] font-semibold text-black/72">
                                        {frameSize}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="absolute left-1.5 top-1.5 max-w-[4rem] truncate rounded-full bg-white/90 px-1.5 py-0.5 text-[0.58rem] font-semibold text-black">
                                    {selected
                                      ? copy.resultReview.selectedCover
                                      : copy.resultReview.selectCover}
                                  </span>
                                </button>
                                <button
                                  aria-label={copy.resultReview.deleteFrame}
                                  className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/72 text-white transition hover:bg-[#ff5c5c] disabled:cursor-not-allowed disabled:opacity-40"
                                  disabled={!canEditFrameCandidates}
                                  onClick={() => {
                                    deleteCoverFrame(candidate);
                                  }}
                                  type="button"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg border border-dashed border-white/12 bg-white/[0.04] px-3 py-4 text-sm font-medium leading-6 text-white/48">
                          {copy.resultReview.frameEmpty}
                        </p>
                      )}
                      {frameCandidates.length >= COVER_IMAGE_CANDIDATE_LIMIT ? (
                        <p className="mt-2 text-xs font-semibold leading-5 text-white/42">
                          {copy.resultReview.limitReached}
                        </p>
                      ) : null}
                      {frameManagerHref ? (
                        <Link
                          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#44f26e]/32 bg-[#44f26e]/12 px-4 py-2 text-sm font-semibold !text-[#d8ffe0] transition hover:bg-[#44f26e] hover:!text-black"
                          href={frameManagerHref}
                        >
                          {copy.resultReview.manageFrames}
                          <ArrowRight className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <section className="mt-3 rounded-lg border border-white/12 bg-white/[0.055] p-3 sm:mt-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  03
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{copy.publish}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                  {copy.bodyHint}
                </p>
              </div>
              <div>
                <textarea
                  className="min-h-32 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                  onChange={(event) => {
                    updateForm({ body: event.target.value });
                  }}
                  placeholder={copy.bodyPlaceholder}
                  value={form.body}
                />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copy.price}
                </p>
                <div className="mt-2 rounded-2xl border border-[#44f26e]/24 bg-[#44f26e]/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#d8ffe0]">
                    <CheckCircle2 className="size-4 text-[#44f26e]" />
                    {copy.free}
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-white/58">
                    {copy.freeOnlyPolicy}
                  </p>
                  <Link
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-white/14 sm:w-auto"
                    href={paidUploadHref}
                  >
                    {copy.paidUpload}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="mt-4 rounded-2xl border border-white/12 bg-black/20 p-4">
                  <button
                    aria-expanded={isExclusiveNewsOpen}
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => {
                      setIsExclusiveNewsOpen((current) => !current);
                    }}
                    type="button"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#44f26e]/14 text-[#44f26e]">
                      <Newspaper className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {copy.exclusiveNews.title}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-white/52">
                        {copy.exclusiveNews.body}
                      </p>
                    </span>
                    <ChevronDown
                      className={`mt-1 size-5 shrink-0 text-white/42 transition ${
                        isExclusiveNewsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isExclusiveNewsOpen ? (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                            {copy.exclusiveNews.codeLabel}
                          </span>
                          <input
                            className="mt-2 h-11 w-full rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-semibold uppercase tracking-[0.08em] text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                            maxLength={12}
                            onChange={(event) => {
                              setExclusiveNewsReporterCode(
                                event.target.value
                                  .replace(/[^a-zA-Z0-9]/g, "")
                                  .slice(0, 12)
                                  .toUpperCase(),
                              );
                            }}
                            placeholder={copy.exclusiveNews.codePlaceholder}
                            value={exclusiveNewsReporterCode}
                          />
                        </label>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                            {copy.exclusiveNews.durationLabel}
                          </span>
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            {EXCLUSIVE_NEWS_DURATION_OPTIONS.map((durationHours) => {
                              const isSelected =
                                exclusiveNewsDurationHours === durationHours;

                              return (
                                <button
                                  className={`inline-flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition ${
                                    isSelected
                                      ? "border-[#44f26e] bg-[#44f26e] text-black"
                                      : "border-white/12 bg-white/[0.055] text-white/68 hover:border-[#44f26e]/42 hover:text-white"
                                  }`}
                                  key={durationHours}
                                  onClick={() => {
                                    setExclusiveNewsDurationHours(durationHours);
                                  }}
                                  type="button"
                                >
                                  <Timer className="size-3.5" />
                                  {durationHours}h
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-medium leading-5 text-white/42">
                        {copy.exclusiveNews.helper}
                      </p>
                    </>
                  ) : null}
                </div>
                {fanOnlyIntent ? (
                  <p className="mt-3 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-2 text-xs font-semibold leading-5 text-[#d8ffe0]">
                    {copy.fanRequestContext.fanOnlyHint}
                  </p>
                ) : null}
                {generatedVideoUrl ? (
                  <p className="mt-3 rounded-lg border border-white/12 bg-white/[0.055] px-3 py-2 text-xs font-semibold leading-5 text-white/58">
                    {copy.resultReview.publishConnection}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      isSaving || hasPublishedContent || isAddingFrameCandidates
                    }
                    onClick={() => {
                      void savePost("draft");
                    }}
                    type="button"
                  >
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : copy.draft}
                  </button>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSaving || !canPublish}
                    onClick={() => {
                      void savePost("published");
                    }}
                    type="button"
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clapperboard className="size-4" />
                    )}
                    {hasPublishedContent ? copy.publishCompleted : copy.publish}
                  </button>
                </div>

                {contentHref ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-black transition hover:bg-white/90"
                      href={contentHref}
                    >
                      {copy.viewContent}
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10"
                      href={feedHref}
                    >
                      {surfaceFeedLabel}
                    </Link>
                    <Link
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10"
                      href={topBarActionHref}
                    >
                      {surfaceStudioLabel}
                    </Link>
                    {frameManagerHref ? (
                      <Link
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#44f26e]/32 bg-[#44f26e]/12 px-5 text-sm font-semibold !text-[#d8ffe0] transition hover:bg-[#44f26e] hover:!text-black"
                        href={frameManagerHref}
                      >
                        {copy.resultReview.manageFrames}
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
