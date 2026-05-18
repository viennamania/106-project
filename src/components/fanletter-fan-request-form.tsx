"use client";

import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clapperboard,
  Inbox,
  Loader2,
  MessageCircleHeart,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  FANLETTER_FAN_REQUEST_PRESET_EVENT,
  type FanletterFanRequestPresetDetail,
} from "@/components/fanletter-fan-request-preset-link";
import type {
  FanletterFanRequestCreateResponse,
  FanletterRealismRevisionReason,
  FanletterFanRequestTemplateCategory,
  FanletterFanRequestTemplateRecord,
  FanletterFanRequestTemplatesResponse,
  FanletterFanRequestType,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { rememberFanletterRequestReceiptId } from "@/lib/fanletter-request-receipts";
import {
  FANLETTER_FAN_REQUEST_SUBMITTED_EVENT,
  type FanletterFanRequestSubmittedDetail,
} from "@/lib/fanletter-request-events";
import {
  getFanletterRealismDisclosureCopy,
  getFanletterRealismRevisionReasonLabel,
} from "@/lib/fanletter-realism-policy";

type SubmitStatus = "error" | "idle" | "loading" | "success";

type LastSubmittedRequest = {
  body: string;
  realismRevised: boolean;
  realismRevisionReasons: FanletterRealismRevisionReason[];
  requestType: FanletterFanRequestType;
};

type TemplateLoadStatus = "error" | "idle" | "loading" | "ready";
type TemplateCategoryFilter = FanletterFanRequestTemplateCategory | "all";
type FanletterFanRequestRecommendationMode = "nsfw" | "paid" | "public";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        bodyLabel: "보고 싶은 장면",
        bodyPlaceholder:
          "예: 다음에는 카페에서 영어 공부하는 브이로그를 보고 싶어요.",
        emptyBody: "보고 싶은 장면이나 응원 메시지를 입력해 주세요.",
        errorFallback: "요청을 저장하지 못했습니다.",
        examples: [
          {
            body: "카페에서 영어 공부하는 하루",
            category: "daily" as const,
            title: "카페 공부",
          },
          {
            body: "새 의상으로 팬 질문 답하기",
            category: "outfit" as const,
            title: "새 의상 Q&A",
          },
          {
            body: "비 오는 날 산책 브이로그",
            category: "seasonal" as const,
            title: "비 오는 날 산책",
          },
          {
            body: "아침 루틴과 플레이리스트",
            category: "routine" as const,
            title: "아침 루틴",
          },
        ],
        examplesLabel: "추천 장면",
        examplesStatusFallback: "기본 장면을 표시 중입니다.",
        examplesStatusLoading: "장면을 불러오는 중입니다.",
        followChannel: "채널 팔로우",
        helper:
          "팬이 남긴 요청은 크리에이터 스튜디오 요청함에 저장되고, 좋은 요청은 다음 브이로그 소재가 됩니다.",
        message: "응원 메시지",
        messageBodyLabel: "응원 메시지",
        messageBodyPlaceholder:
          "예: 항상 응원하고 있어요. 다음 브이로그도 기대할게요.",
        messageDescription: "응원/짧은 메시지",
        messageEmptyBody: "응원 메시지를 입력해 주세요.",
        messageExamples: [
          {
            body: "항상 응원하고 있어요. 다음 브이로그도 기대할게요.",
            category: "message" as const,
            title: "응원 한마디",
          },
          {
            body: "오늘 브이로그 분위기가 좋아요. 편안한 모습이 더 보고 싶어요.",
            category: "message" as const,
            title: "좋았던 점",
          },
          {
            body: "힘내요. 팬으로 오래 응원할게요.",
            category: "message" as const,
            title: "팬 응원",
          },
          {
            body: "다음 영상에서도 밝게 인사해주면 좋겠어요.",
            category: "message" as const,
            title: "짧은 바람",
          },
        ],
        messageExamplesLabel: "추천 응원",
        messageExamplesStatusFallback: "기본 응원 예시를 표시 중입니다.",
        messageExamplesStatusLoading: "응원 예시를 불러오는 중입니다.",
        messageHelper:
          "응원이나 짧은 팬 메시지는 크리에이터가 다음 브이로그의 답장, Q&A, 감사 멘트 소재로 확인할 수 있습니다.",
        messageNote:
          "로그인 없이도 응원 메시지를 남길 수 있고, 같은 메시지는 중복 저장되지 않습니다.",
        messageReady: "응원 문구를 수정하거나 바로 남길 수 있습니다.",
        messageReceipt:
          "이 메시지는 이 기기에 저장되어 계정 연결 전에도 상태를 다시 확인할 수 있습니다.",
        messageSaved:
          "응원 메시지가 크리에이터 스튜디오에 들어갔습니다.",
        messageSubmit: "응원 남기기",
        messageSuccessBody:
          "다음 브이로그의 답장, Q&A, 감사 멘트 소재로 활용될 수 있습니다.",
        messageSuccessSteps: [
          {
            body: "스튜디오 요청함에 응원 메시지로 저장됨",
            title: "메시지 접수",
          },
          {
            body: "좋은 메시지는 답장이나 Q&A 후보로 분류",
            title: "소재 확인",
          },
          {
            body: "브이로그에서 감사 멘트나 리액션으로 반영 가능",
            title: "브이로그 반영",
          },
        ],
        messageSuccessTitle: "응원 메시지가 전달되었습니다",
        messageTemplatesHelper:
          "짧은 응원 예시를 골라 문구를 다듬거나, 직접 메시지를 입력할 수 있습니다.",
        messageTitle: "응원 메시지 남기기",
        nameLabel: "이름",
        namePlaceholder: "선택 사항",
        newRequest: "다른 요청 남기기",
        note: "로그인 없이도 요청할 수 있고, 같은 요청은 중복 저장되지 않습니다.",
        paidBodyPlaceholder:
          "예: 팬 전용으로만 볼 수 있는 비공개 Q&A와 긴 루틴 브이로그를 보고 싶어요.",
        paidExamples: [
          {
            body: "팬 질문에 더 길게 답하는 비공개 Q&A 브이로그",
            category: "qna" as const,
            title: "팬 전용 답장",
          },
          {
            body: "공개 피드에는 짧게만 보여준 루틴의 긴 버전",
            category: "routine" as const,
            title: "비공개 루틴",
          },
          {
            body: "다음 공개 브이로그 전에 먼저 보는 선공개 장면과 제작 노트",
            category: "fanservice" as const,
            title: "선공개 장면",
          },
          {
            body: "팬 이름을 부르며 고마운 마음을 전하는 답장 장면",
            category: "fanservice" as const,
            title: "팬 감사 메시지",
          },
        ],
        nsfwBodyPlaceholder:
          "예: NSFW 팬 전용으로 더 과감한 룩북과 프라이빗 Q&A를 보고 싶어요.",
        nsfwExamples: [
          {
            body: "성인 팬 전용 톤으로 더 솔직하게 답하는 프라이빗 Q&A 브이로그",
            category: "qna" as const,
            title: "NSFW 프라이빗 Q&A",
          },
          {
            body: "공개 피드보다 과감한 스타일링과 분위기를 담은 팬 전용 룩북",
            category: "outfit" as const,
            title: "과감한 룩북",
          },
          {
            body: "늦은 밤 방 안에서 차분하게 이어지는 성인 팬 전용 루틴",
            category: "routine" as const,
            title: "늦은 밤 루틴",
          },
          {
            body: "다음 NSFW 팬 전용 브이로그의 분위기를 먼저 보여주는 비공개 티저",
            category: "fanservice" as const,
            title: "NSFW 비공개 티저",
          },
        ],
        nsfwExamplesLabel: "NSFW 팬 전용 추천 장면",
        nsfwHelper:
          "NSFW 콘텐츠와 연결된 요청은 성인 팬 전용 후속 장면으로 저장됩니다. 공개 피드용 장면보다 과감한 룩, 프라이빗 Q&A, 성인 팬 전용 루틴처럼 NSFW 맥락을 분명히 남겨주세요.",
        nsfwNote:
          "NSFW 보기와 잠금 해제 후 남기는 요청입니다. 같은 요청은 중복 저장되지 않습니다.",
        nsfwRequestReady: "NSFW 팬 전용 요청 문구를 수정하거나 바로 남길 수 있습니다.",
        nsfwSuccessBody:
          "제작되면 NSFW 팬 전용 콘텐츠나 성인 팬 업데이트 후보로 이어질 수 있습니다.",
        nsfwTemplatesHelper:
          "NSFW 팬 전용 후속 장면은 프라이빗 Q&A, 과감한 룩북, 늦은 밤 루틴처럼 성인 팬 전용 맥락으로 추천됩니다.",
        paidExamplesLabel: "팬 전용 추천 장면",
        paidHelper:
          "유료 콘텐츠와 연결된 요청은 스튜디오 요청함에 팬 전용 후속 장면으로 저장됩니다. 비공개 Q&A, 긴 루틴, 선공개처럼 결제 팬이 기대하는 맥락으로 남겨주세요.",
        paidNote:
          "잠금 해제 전에도 요청은 남길 수 있고, 같은 요청은 중복 저장되지 않습니다.",
        paidRequestReady: "팬 전용 요청 문구를 수정하거나 바로 남길 수 있습니다.",
        paidSuccessBody:
          "제작되면 팬 전용 콘텐츠나 결제 팬 업데이트 후보로 이어질 수 있습니다.",
        paidTemplatesHelper:
          "팬 전용 후속 장면은 공개용보다 깊은 답장, 긴 루틴, 선공개처럼 프리미엄 맥락으로 추천됩니다.",
        requestKind: "요청 종류",
        requestPreview: "방금 보낸 요청",
        requestReceipt:
          "이 요청은 이 기기에 저장되어 계정 연결 전에도 상태를 다시 확인할 수 있습니다.",
        requestRevisionReason: "보정 사유",
        requestStatus: "내 요청 상태 보기",
        requestReady: "문구를 수정하거나 바로 요청을 남길 수 있습니다.",
        revised: "현실 기반 보정",
        saved:
          "요청이 크리에이터 스튜디오에 들어갔습니다.",
        selected: "선택됨",
        submit: "요청 남기기",
        successBody:
          "제작되면 이 캐릭터 채널의 공개 브이로그 영역에서 확인할 수 있습니다.",
        successSteps: [
          {
            body: "스튜디오 요청함에 저장됨",
            title: "요청 접수",
          },
          {
            body: "좋은 요청은 제작 후보 큐로 이동",
            title: "제작 검토",
          },
          {
            body: "브이로그로 공개되면 채널에서 확인",
            title: "공개 확인",
          },
        ],
        successTitle: "팬 요청이 전달되었습니다",
        submitting: "저장 중...",
        title: "다음 장면 요청",
        templateCategories: {
          all: "전체",
          daily: "일상",
          fanservice: "팬 반응",
          message: "응원",
          outfit: "룩/의상",
          qna: "Q&A",
          routine: "루틴",
          seasonal: "계절",
        },
        templatesHelper:
          "입력칸에 직접 적거나, 많이 요청되는 장면을 골라 문구를 다듬을 수 있습니다.",
        viewVlogs: "공개 브이로그 보기",
        vlogRequest: "다음 장면 요청",
        vlogRequestDescription: "장면/룩/장소 요청",
      }
    : {
        bodyLabel: "Scene to request",
        bodyPlaceholder:
          "Example: I want to see a vlog where you study English at a cafe.",
        emptyBody: "Write a scene request or support message.",
        errorFallback: "Could not save the request.",
        examples: [
          {
            body: "A day studying English at a cafe",
            category: "daily" as const,
            title: "Cafe study",
          },
          {
            body: "Answer fan questions in a new outfit",
            category: "outfit" as const,
            title: "New outfit Q&A",
          },
          {
            body: "A rainy-day walk vlog",
            category: "seasonal" as const,
            title: "Rainy-day walk",
          },
          {
            body: "Morning routine and playlist",
            category: "routine" as const,
            title: "Morning routine",
          },
        ],
        examplesLabel: "Suggested scenes",
        examplesStatusFallback: "Showing default scenes.",
        examplesStatusLoading: "Loading scenes.",
        followChannel: "Follow channel",
        helper:
          "Fan requests are saved to the creator's studio inbox, where strong ideas can become future vlogs.",
        message: "Support message",
        messageBodyLabel: "Support message",
        messageBodyPlaceholder:
          "Example: I'm always cheering for you. I can't wait for the next vlog.",
        messageDescription: "Short support note",
        messageEmptyBody: "Write a support message.",
        messageExamples: [
          {
            body: "I'm always cheering for you. I can't wait for the next vlog.",
            category: "message" as const,
            title: "Cheer note",
          },
          {
            body: "I liked the mood of today's vlog. I'd love to see more relaxed moments.",
            category: "message" as const,
            title: "What I liked",
          },
          {
            body: "Keep going. I'll keep supporting you as a fan.",
            category: "message" as const,
            title: "Fan support",
          },
          {
            body: "It would be nice to get a bright hello in the next video too.",
            category: "message" as const,
            title: "Short wish",
          },
        ],
        messageExamplesLabel: "Suggested support",
        messageExamplesStatusFallback: "Showing default support notes.",
        messageExamplesStatusLoading: "Loading support notes.",
        messageHelper:
          "Support notes can become reply moments, Q&A prompts, or thank-you lines in future vlogs.",
        messageNote:
          "You can leave a support message without signing in. Duplicate messages are not saved.",
        messageReady: "Edit the message, or leave it now.",
        messageReceipt:
          "This message is saved on this device, so you can track it before connecting an account.",
        messageSaved:
          "Your support message entered the creator's studio inbox.",
        messageSubmit: "Leave support",
        messageSuccessBody:
          "It can become a reply moment, Q&A prompt, or thank-you line in a future vlog.",
        messageSuccessSteps: [
          {
            body: "Saved to the studio inbox as a support message",
            title: "Message received",
          },
          {
            body: "Strong notes can become reply or Q&A candidates",
            title: "Checked as material",
          },
          {
            body: "Future vlogs can reflect it as thanks or reaction",
            title: "Vlog response",
          },
        ],
        messageSuccessTitle: "Support message delivered",
        messageTemplatesHelper:
          "Pick a short support example and refine it, or write your own message.",
        messageTitle: "Leave a support message",
        nameLabel: "Name",
        namePlaceholder: "Optional",
        newRequest: "Leave another",
        note: "You can leave a request without signing in. Duplicate requests are not saved.",
        paidBodyPlaceholder:
          "Example: I want a fan-only private Q&A and a longer routine vlog.",
        paidExamples: [
          {
            body: "A private Q&A vlog with longer answers to fan questions",
            category: "qna" as const,
            title: "Fan-only reply",
          },
          {
            body: "The longer version of a routine that was only teased on the public feed",
            category: "routine" as const,
            title: "Private routine",
          },
          {
            body: "An early fan-only scene and production note before the next public vlog",
            category: "fanservice" as const,
            title: "Early-access scene",
          },
          {
            body: "A thank-you reply moment that calls out fans by name",
            category: "fanservice" as const,
            title: "Fan thank-you",
          },
        ],
        nsfwBodyPlaceholder:
          "Example: I want an NSFW fan-only lookbook and a more private Q&A.",
        nsfwExamples: [
          {
            body: "A private Q&A vlog with a more adult fan-only tone",
            category: "qna" as const,
            title: "NSFW private Q&A",
          },
          {
            body: "A fan-only lookbook with bolder styling than the public feed",
            category: "outfit" as const,
            title: "Bolder lookbook",
          },
          {
            body: "A calm late-night routine made for adult fan-only viewers",
            category: "routine" as const,
            title: "Late-night routine",
          },
          {
            body: "A private teaser that previews the mood of the next NSFW fan-only vlog",
            category: "fanservice" as const,
            title: "NSFW private teaser",
          },
        ],
        nsfwExamplesLabel: "NSFW fan-only suggested scenes",
        nsfwHelper:
          "Requests connected to NSFW content are saved as adult fan-only follow-up ideas. Use clear NSFW context such as bolder styling, private Q&A, or adult fan-only routines instead of public-feed scenes.",
        nsfwNote:
          "This request is available after NSFW visibility and unlock. Duplicate requests are not saved.",
        nsfwRequestReady: "Edit the NSFW fan-only request, or leave it now.",
        nsfwSuccessBody:
          "If produced, it can become an NSFW fan-only content candidate or an adult fan update.",
        nsfwTemplatesHelper:
          "NSFW fan-only follow-up ideas are suggested around private Q&A, bolder lookbooks, and late-night routines for adult fan-only viewers.",
        paidExamplesLabel: "Fan-only suggested scenes",
        paidHelper:
          "Requests connected to paid content are saved as fan-only follow-up ideas. Use premium contexts such as private Q&A, longer routines, or early-access scenes.",
        paidNote:
          "You can leave a request before unlocking. Duplicate requests are not saved.",
        paidRequestReady: "Edit the fan-only request, or leave it now.",
        paidSuccessBody:
          "If produced, it can become a fan-only content candidate or an update for paying fans.",
        paidTemplatesHelper:
          "Fan-only follow-up ideas are suggested around deeper replies, longer routines, and early-access moments instead of public-feed scenes.",
        requestKind: "Request type",
        requestPreview: "Request just sent",
        requestReceipt:
          "This request is saved on this device, so you can track it before connecting an account.",
        requestRevisionReason: "Adjustment reason",
        requestStatus: "Track my request",
        requestReady: "Edit the wording, or leave this request now.",
        revised: "Reality adjusted",
        saved:
          "Your request entered the creator's studio inbox.",
        selected: "Selected",
        submit: "Leave request",
        successBody:
          "If it gets produced, you can find it in this character channel's public vlogs.",
        successSteps: [
          {
            body: "Saved to the studio inbox",
            title: "Received",
          },
          {
            body: "Strong ideas enter the production queue",
            title: "Reviewed",
          },
          {
            body: "Produced vlogs appear on the channel",
            title: "Published",
          },
        ],
        successTitle: "Fan request delivered",
        submitting: "Saving...",
        title: "Request next scene",
        templateCategories: {
          all: "All",
          daily: "Daily",
          fanservice: "Fan reaction",
          message: "Support",
          outfit: "Outfit",
          qna: "Q&A",
          routine: "Routine",
          seasonal: "Seasonal",
        },
        templatesHelper:
          "Write your own request in the input, or pick a popular scene and refine it.",
        viewVlogs: "View public vlogs",
        vlogRequest: "Next scene request",
        vlogRequestDescription: "Scene, look, place",
      };
}

function getErrorMessage(value: unknown, fallback: string, locale: Locale) {
  const message = value instanceof Error ? value.message : null;

  if (message && locale === "ko") {
    const koreanMessages: Record<string, string> = {
      "Duplicate fan request.": "이미 같은 요청을 남겼습니다.",
      "Fan request contains blocked content.":
        "요청에 링크나 광고성 문구가 포함되어 저장하지 못했습니다.",
      "Too many fan requests. Please try again later.":
        "짧은 시간에 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    };

    return koreanMessages[message] ?? message;
  }

  if (message) {
    return message;
  }

  return fallback;
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(data?.error || fallback);
  }

  if (!data) {
    throw new Error(fallback);
  }

  return data;
}

export function FanletterFanRequestForm({
  characterName,
  creatorReferralCode,
  followHref,
  formId,
  helperOverride,
  locale,
  publicVlogsHref,
  recommendationMode = "public",
  referralCode,
  sourceContentId,
  titleOverride,
}: {
  characterName: string;
  creatorReferralCode: string;
  followHref?: string;
  formId?: string;
  helperOverride?: string;
  locale: Locale;
  publicVlogsHref?: string;
  recommendationMode?: FanletterFanRequestRecommendationMode;
  referralCode?: string | null;
  sourceContentId?: string | null;
  titleOverride?: string;
}) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const realismCopy = useMemo(
    () => getFanletterRealismDisclosureCopy(locale),
    [locale],
  );
  const resolvedFormId = formId ?? "fanletter-fan-request-form";
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedRequest, setLastSubmittedRequest] =
    useState<LastSubmittedRequest | null>(null);
  const [requesterDisplayName, setRequesterDisplayName] = useState("");
  const [requestType, setRequestType] =
    useState<FanletterFanRequestType>("vlog_request");
  const [activeTemplateCategory, setActiveTemplateCategory] =
    useState<TemplateCategoryFilter>("all");
  const [requestTemplates, setRequestTemplates] = useState<
    FanletterFanRequestTemplateRecord[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [templateLoadStatus, setTemplateLoadStatus] =
    useState<TemplateLoadStatus>("loading");
  const [isHashHighlighted, setIsHashHighlighted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hashHighlightTimeoutRef = useRef<number | null>(null);
  const requestTypes = [
    {
      description: copy.vlogRequestDescription,
      icon: Clapperboard,
      label: copy.vlogRequest,
      value: "vlog_request" as const,
    },
    {
      description: copy.messageDescription,
      icon: MessageCircleHeart,
      label: copy.message,
      value: "message" as const,
    },
  ];
  const activeRequestCopy = useMemo(() => {
    if (requestType === "message") {
      return {
        bodyLabel: copy.messageBodyLabel,
        bodyPlaceholder: copy.messageBodyPlaceholder,
        emptyBody: copy.messageEmptyBody,
        examples: copy.messageExamples,
        examplesLabel: copy.messageExamplesLabel,
        examplesStatusFallback: copy.messageExamplesStatusFallback,
        examplesStatusLoading: copy.messageExamplesStatusLoading,
        helper: copy.messageHelper,
        note: copy.messageNote,
        receipt: copy.messageReceipt,
        requestReady: copy.messageReady,
        saved: copy.messageSaved,
        submit: copy.messageSubmit,
        successBody: copy.messageSuccessBody,
        successSteps: copy.messageSuccessSteps,
        successTitle: copy.messageSuccessTitle,
        templatesHelper: copy.messageTemplatesHelper,
        title: copy.messageTitle,
      };
    }

    const isNsfwRecommendation = recommendationMode === "nsfw";
    const isPaidRecommendation =
      recommendationMode === "paid" || isNsfwRecommendation;

    return {
      bodyLabel: copy.bodyLabel,
      bodyPlaceholder: isNsfwRecommendation
        ? copy.nsfwBodyPlaceholder
        : isPaidRecommendation
        ? copy.paidBodyPlaceholder
        : copy.bodyPlaceholder,
      emptyBody: copy.emptyBody,
      examples: isNsfwRecommendation
        ? copy.nsfwExamples
        : isPaidRecommendation
          ? copy.paidExamples
          : copy.examples,
      examplesLabel: isNsfwRecommendation
        ? copy.nsfwExamplesLabel
        : isPaidRecommendation
        ? copy.paidExamplesLabel
        : copy.examplesLabel,
      examplesStatusFallback: copy.examplesStatusFallback,
      examplesStatusLoading: copy.examplesStatusLoading,
      helper:
        helperOverride ??
        (isNsfwRecommendation
          ? copy.nsfwHelper
          : isPaidRecommendation
            ? copy.paidHelper
            : copy.helper),
      note: isNsfwRecommendation
        ? copy.nsfwNote
        : isPaidRecommendation
          ? copy.paidNote
          : copy.note,
      receipt: copy.requestReceipt,
      requestReady: isNsfwRecommendation
        ? copy.nsfwRequestReady
        : isPaidRecommendation
        ? copy.paidRequestReady
        : copy.requestReady,
      saved: copy.saved,
      submit: copy.submit,
      successBody: isNsfwRecommendation
        ? copy.nsfwSuccessBody
        : isPaidRecommendation
        ? copy.paidSuccessBody
        : copy.successBody,
      successSteps: copy.successSteps,
      successTitle: copy.successTitle,
      templatesHelper: isNsfwRecommendation
        ? copy.nsfwTemplatesHelper
        : isPaidRecommendation
        ? copy.paidTemplatesHelper
        : copy.templatesHelper,
      title: titleOverride ?? copy.title,
    };
  }, [copy, helperOverride, recommendationMode, requestType, titleOverride]);
  const fallbackTemplates = useMemo<FanletterFanRequestTemplateRecord[]>(
    () =>
      activeRequestCopy.examples.map((example, index) => ({
        body: example.body,
        category: example.category,
        creatorReferralCode: null,
        locale,
        requestType,
        templateId: `fallback-${locale}-${requestType}-${index}`,
        title: example.title,
        usageCount: 0,
      })),
    [activeRequestCopy.examples, locale, requestType],
  );
  const displayTemplates = useMemo(() => {
    if (requestType !== "vlog_request" || recommendationMode === "public") {
      return requestTemplates.length > 0 ? requestTemplates : fallbackTemplates;
    }

    if (recommendationMode === "nsfw") {
      return fallbackTemplates;
    }

    const fallbackBodies = new Set(
      fallbackTemplates.map((template) => template.body),
    );

    return [
      ...fallbackTemplates,
      ...requestTemplates.filter(
        (template) => !fallbackBodies.has(template.body),
      ),
    ];
  }, [fallbackTemplates, recommendationMode, requestTemplates, requestType]);
  const templateCategoryValues = useMemo(
    () => Array.from(new Set(displayTemplates.map((template) => template.category))),
    [displayTemplates],
  );
  const effectiveTemplateCategory =
    activeTemplateCategory !== "all" &&
    !templateCategoryValues.includes(activeTemplateCategory)
      ? "all"
      : activeTemplateCategory;
  const templateCategories = useMemo(() => {
    return [
      {
        label: copy.templateCategories.all,
        value: "all" as const,
      },
      ...templateCategoryValues.map((value) => ({
        label: copy.templateCategories[value],
        value,
      })),
    ];
  }, [copy.templateCategories, templateCategoryValues]);
  const visibleTemplates = displayTemplates.filter(
    (template) =>
      effectiveTemplateCategory === "all" ||
      template.category === effectiveTemplateCategory,
  );

  useEffect(() => {
    function applyPreset(event: Event) {
      const detail = (event as CustomEvent<FanletterFanRequestPresetDetail>).detail;

      if (!detail?.body) {
        return;
      }

      if (detail.formId && detail.formId !== resolvedFormId) {
        return;
      }

      setBody(detail.body.slice(0, 600));
      setActiveTemplateCategory("all");
      setError(null);
      setLastSubmittedRequest(null);
      setRequestType(detail.requestType);
      setSelectedTemplateId(null);
      setStatus("idle");
      setTemplateLoadStatus("loading");

      window.requestAnimationFrame(() => {
        document
          .getElementById(resolvedFormId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        textareaRef.current?.focus({ preventScroll: true });
      });
    }

    window.addEventListener(FANLETTER_FAN_REQUEST_PRESET_EVENT, applyPreset);

    return () => {
      window.removeEventListener(FANLETTER_FAN_REQUEST_PRESET_EVENT, applyPreset);
    };
  }, [resolvedFormId]);

  useEffect(() => {
    function focusRequestTextareaFromHash() {
      if (window.location.hash !== `#${resolvedFormId}`) {
        return;
      }

      window.requestAnimationFrame(() => {
        textareaRef.current?.focus({ preventScroll: true });

        if (hashHighlightTimeoutRef.current !== null) {
          window.clearTimeout(hashHighlightTimeoutRef.current);
        }

        setIsHashHighlighted(true);
        hashHighlightTimeoutRef.current = window.setTimeout(() => {
          setIsHashHighlighted(false);
          hashHighlightTimeoutRef.current = null;
        }, 1400);
      });
    }

    focusRequestTextareaFromHash();
    window.addEventListener("hashchange", focusRequestTextareaFromHash);

    return () => {
      window.removeEventListener("hashchange", focusRequestTextareaFromHash);

      if (hashHighlightTimeoutRef.current !== null) {
        window.clearTimeout(hashHighlightTimeoutRef.current);
      }
    };
  }, [resolvedFormId]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      creatorReferralCode,
      locale,
      requestType,
    });

    fetch(`/api/fanletter/request-templates?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) =>
        readApiJson<FanletterFanRequestTemplatesResponse>(
          response,
          copy.errorFallback,
        ),
      )
      .then((data) => {
        setRequestTemplates(data.templates);
        setTemplateLoadStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.warn("[fanletter-request] template load failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        setRequestTemplates([]);
        setTemplateLoadStatus("error");
      });

    return () => {
      controller.abort();
    };
  }, [copy.errorFallback, creatorReferralCode, locale, requestType]);

  async function submitRequest() {
    if (!body.trim()) {
      setError(activeRequestCopy.emptyBody);
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("loading");

    try {
      const sourcePath =
        typeof window === "undefined"
          ? null
          : `${window.location.pathname}${window.location.search}`;
      const data = await readApiJson<FanletterFanRequestCreateResponse>(
        await fetch("/api/fanletter/requests", {
          body: JSON.stringify({
            body,
            characterName,
            creatorReferralCode,
            requestType,
            requesterDisplayName,
            sourceContentId,
            sourcePath,
            templateId: selectedTemplateId,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }),
        copy.errorFallback,
      );

      rememberFanletterRequestReceiptId(data.request.requestId);
      window.dispatchEvent(
        new CustomEvent<FanletterFanRequestSubmittedDetail>(
          FANLETTER_FAN_REQUEST_SUBMITTED_EVENT,
          {
            detail: {
              creatorReferralCode,
              requestId: data.request.requestId,
              sourceContentId: sourceContentId ?? null,
            },
          },
        ),
      );
      setLastSubmittedRequest({
        body: data.request.body,
        realismRevised: data.request.realismRevised,
        realismRevisionReasons: data.request.realismRevisionReasons,
        requestType,
      });
      setBody("");
      setRequesterDisplayName("");
      setSelectedTemplateId(null);
      setStatus("success");
    } catch (submitError) {
      setError(getErrorMessage(submitError, copy.errorFallback, locale));
      setStatus("error");
    }
  }

  function applyTemplate(template: FanletterFanRequestTemplateRecord) {
    setBody(template.body.slice(0, 600));
    setError(null);
    setLastSubmittedRequest(null);
    setSelectedTemplateId(
      template.templateId.startsWith("fallback-") ? null : template.templateId,
    );
    setStatus("idle");
    setRequestType(template.requestType);
    window.requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      textareaRef.current?.focus({ preventScroll: true });
    });
  }

  function resetForAnotherRequest() {
    setError(null);
    setStatus("idle");
    setRequestType("vlog_request");
    setSelectedTemplateId(null);
  }

  const successStepIcons = [Inbox, Clapperboard, Radio] as const;
  const lastSubmittedRequestTypeLabel = lastSubmittedRequest
    ? lastSubmittedRequest.requestType === "message"
      ? copy.message
      : copy.vlogRequest
    : null;
  const lastSubmittedRevisionReasonLabels = lastSubmittedRequest
    ? lastSubmittedRequest.realismRevisionReasons.map((reason) =>
        getFanletterRealismRevisionReasonLabel(reason, locale),
      )
    : [];
  const requestStatusHref = `${buildPathWithReferral(
    `/${locale}/fanletter/requests`,
    referralCode ?? creatorReferralCode,
  )}#fanletter-request-inbox`;
  const isSubmitDisabled = status === "loading" || !body.trim();
  const hasRequestDraft = Boolean(body.trim());

  return (
    <div
      className={`mt-6 scroll-mt-28 rounded-lg border p-4 transition duration-500 sm:p-5 ${
        isHashHighlighted
          ? "border-[#44f26e]/70 bg-[#44f26e]/10 shadow-[0_18px_54px_rgba(68,242,110,0.16)] ring-1 ring-[#44f26e]/50"
          : "border-white/12 bg-black/28"
      }`}
      id={resolvedFormId}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
            {copy.requestKind}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-normal text-white [word-break:keep-all]">
            {activeRequestCopy.title}
          </h3>
          <p className="mt-2 text-sm font-medium leading-6 text-white/58">
            {activeRequestCopy.helper}
          </p>
          <p
            className="mt-2 flex max-w-xl items-start gap-2 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/8 px-3 py-1.5 text-xs font-semibold leading-5 text-[#b9ffc8]"
            title={realismCopy.description}
          >
            <Radio className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 break-words">{realismCopy.requestNote}</span>
          </p>
        </div>
        <div
          aria-label={copy.requestKind}
          className="grid shrink-0 grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-1 lg:w-[26rem]"
          role="group"
        >
          {requestTypes.map((type) => {
            const Icon = type.icon;
            const active = requestType === type.value;

            return (
              <button
                aria-pressed={active}
                className={`flex min-h-[4.9rem] flex-col items-start justify-center rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition ${
                  active
                    ? "border-[#44f26e] bg-[#44f26e] text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                    : "border-white/12 bg-black/42 text-white/56 hover:border-[#44f26e]/38 hover:bg-white/8 hover:text-white"
                }`}
                key={type.value}
                onClick={() => {
                  if (selectedTemplateId) {
                    setBody("");
                  }
                  setRequestType(type.value);
                  setActiveTemplateCategory("all");
                  setError(null);
                  setLastSubmittedRequest(null);
                  setSelectedTemplateId(null);
                  setTemplateLoadStatus("loading");
                  if (status !== "loading") {
                    setStatus("idle");
                  }
                }}
                type="button"
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="leading-4 [word-break:keep-all]">
                    {type.label}
                  </span>
                </span>
                <span
                  className={`mt-1.5 text-[0.68rem] font-semibold leading-4 ${
                    active ? "text-black/62" : "text-white/38"
                  }`}
                >
                  {type.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="block">
          <span className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
              {activeRequestCopy.bodyLabel}
            </span>
            <span className="text-xs font-semibold text-white/32">
              {body.length}/600
            </span>
          </span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-lg border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-medium leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-[#44f26e]/70"
            maxLength={600}
            onChange={(event) => {
              setBody(event.target.value);
              setError(null);
              if (status !== "loading") {
                setStatus("idle");
              }
            }}
            placeholder={activeRequestCopy.bodyPlaceholder}
            ref={textareaRef}
            value={body}
          />
        </label>
        <div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
              {copy.nameLabel}
            </span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[0.055] px-3 text-sm font-medium text-white outline-none transition placeholder:text-white/32 focus:border-[#44f26e]/70"
              maxLength={40}
              onChange={(event) => {
                setRequesterDisplayName(event.target.value);
                if (status !== "loading") {
                  setStatus("idle");
                }
              }}
              placeholder={copy.namePlaceholder}
              value={requesterDisplayName}
            />
          </label>
          <button
            className={`mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
              isSubmitDisabled
                ? "border-white/10 bg-white/[0.06] text-white/38"
                : "border-transparent bg-[#44f26e] text-black hover:bg-[#64ff84]"
            }`}
            disabled={isSubmitDisabled}
            onClick={() => {
              void submitRequest();
            }}
            type="button"
          >
            {status === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : status === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : null}
            {status === "loading" ? copy.submitting : activeRequestCopy.submit}
          </button>
          <p
            className={`mt-3 text-xs font-medium leading-5 ${
              hasRequestDraft ? "text-[#b9ffc8]" : "text-white/42"
            }`}
          >
            {hasRequestDraft ? activeRequestCopy.requestReady : activeRequestCopy.note}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/8 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ffc8]">
              {activeRequestCopy.examplesLabel}
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-white/48">
              {activeRequestCopy.templatesHelper}
            </p>
          </div>
          {templateLoadStatus === "loading" ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#b9ffc8]">
              <Loader2 className="size-3.5 animate-spin" />
              {activeRequestCopy.examplesStatusLoading}
            </span>
          ) : templateLoadStatus === "error" ? (
            <span className="text-xs font-semibold text-white/42">
              {activeRequestCopy.examplesStatusFallback}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {templateCategories.map((category) => {
            const active = effectiveTemplateCategory === category.value;

            return (
              <button
                aria-pressed={active}
                className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition sm:min-h-0 sm:px-3 sm:py-1.5 ${
                  active
                    ? "border-[#44f26e] bg-[#44f26e] text-black"
                    : "border-[#44f26e]/22 bg-black/18 text-[#b9ffc8] hover:border-[#44f26e]/56 hover:bg-[#44f26e]/12"
                }`}
                key={category.value}
                onClick={() => {
                  setActiveTemplateCategory(category.value);
                }}
                type="button"
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {visibleTemplates.map((template) => {
            const selected =
              selectedTemplateId === template.templateId ||
              (!selectedTemplateId &&
                body === template.body &&
                requestType === template.requestType);

            return (
              <button
                aria-pressed={selected}
                className={`min-h-24 rounded-lg border p-3 text-left transition ${
                  selected
                    ? "border-[#44f26e] bg-[#44f26e]/18"
                    : "border-white/10 bg-black/18 hover:border-[#44f26e]/42 hover:bg-black/26"
                }`}
                key={template.templateId}
                onClick={() => {
                  applyTemplate(template);
                }}
                type="button"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {template.title}
                    </span>
                    <span className="mt-1 inline-flex rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-2 py-0.5 text-[0.66rem] font-semibold text-[#b9ffc8]">
                      {copy.templateCategories[template.category]}
                    </span>
                  </span>
                  {selected ? (
                    <span className="shrink-0 rounded-full bg-[#44f26e] px-2 py-0.5 text-[0.66rem] font-semibold text-black">
                      {copy.selected}
                    </span>
                  ) : null}
                </span>
                <span className="mt-3 line-clamp-2 block break-words text-xs font-medium leading-5 text-white/58 [overflow-wrap:anywhere]">
                  {template.body}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {status === "success" ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 text-[#b9ffc8]"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.62fr)]">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                  <CheckCircle2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">
                    {activeRequestCopy.successTitle}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#b9ffc8]">
                    {activeRequestCopy.saved}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-white/56">
                    {activeRequestCopy.successBody}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#b9ffc8]">
                    {activeRequestCopy.receipt}
                  </p>
                </div>
              </div>

              {lastSubmittedRequest ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/22 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                      {copy.requestPreview}
                    </span>
                    {lastSubmittedRequestTypeLabel ? (
                      <span className="rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1 text-[0.64rem] font-semibold text-[#b9ffc8]">
                        {lastSubmittedRequestTypeLabel}
                      </span>
                    ) : null}
                    {lastSubmittedRequest.realismRevised ? (
                      <span className="rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1 text-[0.64rem] font-semibold text-[#b9ffc8]">
                        {copy.revised}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-3 break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                    {lastSubmittedRequest.body}
                  </p>
                  {lastSubmittedRevisionReasonLabels.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                        {copy.requestRevisionReason}
                      </span>
                      {lastSubmittedRevisionReasonLabels.map((label) => (
                        <span
                          className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[0.64rem] font-semibold text-white/62"
                          key={label}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              {activeRequestCopy.successSteps.map((step, index) => {
                const Icon = successStepIcons[index] ?? Bell;

                return (
                  <div
                    className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3"
                    key={step.title}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-xs font-medium leading-5 text-white/52">
                        {step.body}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-3 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
              href={requestStatusHref}
            >
              {copy.requestStatus}
              <ArrowRight className="size-4" />
            </Link>
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#44f26e]/28 px-3 text-sm font-semibold text-[#b9ffc8] transition hover:bg-[#44f26e]/12"
              onClick={resetForAnotherRequest}
              type="button"
            >
              {copy.newRequest}
            </button>
            {publicVlogsHref ? (
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/12 px-3 text-sm font-semibold !text-white transition hover:bg-white/8"
                href={publicVlogsHref}
              >
                {copy.viewVlogs}
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
            {followHref ? (
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/12 px-3 text-sm font-semibold !text-white transition hover:bg-white/8"
                href={followHref}
              >
                {copy.followChannel}
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
      {status === "error" && error ? (
        <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm font-medium leading-6 text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
