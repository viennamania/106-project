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
  FanletterFanRequestTemplateCategory,
  FanletterFanRequestTemplateRecord,
  FanletterFanRequestTemplatesResponse,
  FanletterFanRequestType,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { rememberFanletterRequestReceiptId } from "@/lib/fanletter-request-receipts";

type SubmitStatus = "error" | "idle" | "loading" | "success";

type LastSubmittedRequest = {
  body: string;
  requestType: FanletterFanRequestType;
};

type TemplateLoadStatus = "error" | "idle" | "loading" | "ready";
type TemplateCategoryFilter = FanletterFanRequestTemplateCategory | "all";

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
        examplesLabel: "장면 선택",
        examplesStatusFallback: "기본 장면을 표시 중입니다.",
        examplesStatusLoading: "장면을 불러오는 중입니다.",
        followChannel: "채널 팔로우",
        helper:
          "팬이 남긴 요청은 크리에이터 스튜디오 요청함에 저장되고, 좋은 요청은 다음 브이로그 소재가 됩니다.",
        message: "응원 메시지",
        nameLabel: "이름",
        namePlaceholder: "선택 사항",
        newRequest: "다른 요청 남기기",
        note: "로그인 없이도 요청할 수 있고, 같은 요청은 중복 저장되지 않습니다.",
        requestKind: "요청 종류",
        requestPreview: "방금 보낸 요청",
        requestReceipt:
          "이 요청은 이 기기에 저장되어 계정 연결 전에도 상태를 다시 확인할 수 있습니다.",
        requestStatus: "내 요청 상태 보기",
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
        title: "다음 브이로그 요청 남기기",
        templateCategories: {
          all: "전체",
          daily: "일상",
          fanservice: "팬서비스",
          message: "응원",
          outfit: "룩/의상",
          qna: "Q&A",
          routine: "루틴",
          seasonal: "계절",
        },
        templatesHelper:
          "많이 요청되는 장면을 골라 문구를 다듬거나, 아래 입력칸에 직접 적을 수 있습니다.",
        viewVlogs: "공개 브이로그 보기",
        vlogRequest: "다음 브이로그 요청",
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
        examplesLabel: "Scene picker",
        examplesStatusFallback: "Showing default scenes.",
        examplesStatusLoading: "Loading scenes.",
        followChannel: "Follow channel",
        helper:
          "Fan requests are saved to the creator's studio inbox, where strong ideas can become future vlogs.",
        message: "Support message",
        nameLabel: "Name",
        namePlaceholder: "Optional",
        newRequest: "Leave another",
        note: "You can leave a request without signing in. Duplicate requests are not saved.",
        requestKind: "Request type",
        requestPreview: "Request just sent",
        requestReceipt:
          "This request is saved on this device, so you can track it before connecting an account.",
        requestStatus: "Track my request",
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
        title: "Leave a request",
        templateCategories: {
          all: "All",
          daily: "Daily",
          fanservice: "Fan service",
          message: "Support",
          outfit: "Outfit",
          qna: "Q&A",
          routine: "Routine",
          seasonal: "Seasonal",
        },
        templatesHelper:
          "Pick a popular scene and refine it, or write your own request below.",
        viewVlogs: "View public vlogs",
        vlogRequest: "Next vlog request",
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
  locale,
  publicVlogsHref,
  referralCode,
  sourceContentId,
}: {
  characterName: string;
  creatorReferralCode: string;
  followHref?: string;
  formId?: string;
  locale: Locale;
  publicVlogsHref?: string;
  referralCode?: string | null;
  sourceContentId?: string | null;
}) {
  const copy = useMemo(() => getCopy(locale), [locale]);
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const requestTypes = [
    {
      icon: Clapperboard,
      label: copy.vlogRequest,
      value: "vlog_request" as const,
    },
    {
      icon: MessageCircleHeart,
      label: copy.message,
      value: "message" as const,
    },
  ];
  const fallbackTemplates = useMemo<FanletterFanRequestTemplateRecord[]>(
    () =>
      copy.examples.map((example, index) => ({
        body: example.body,
        category:
          requestType === "message"
            ? "message"
            : example.category,
        creatorReferralCode: null,
        locale,
        requestType,
        templateId: `fallback-${locale}-${requestType}-${index}`,
        title: example.title,
        usageCount: 0,
      })),
    [copy.examples, locale, requestType],
  );
  const displayTemplates =
    requestTemplates.length > 0 ? requestTemplates : fallbackTemplates;
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
      setError(copy.emptyBody);
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
      setLastSubmittedRequest({
        body: body.trim(),
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
  const requestStatusHref = `${buildPathWithReferral(
    `/${locale}/fanletter/requests`,
    referralCode ?? creatorReferralCode,
  )}#fanletter-request-inbox`;

  return (
    <div
      className="mt-6 scroll-mt-28 rounded-lg border border-white/12 bg-black/28 p-4 sm:p-5"
      id={resolvedFormId}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
            {copy.requestKind}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-normal text-white [word-break:keep-all]">
            {copy.title}
          </h3>
          <p className="mt-2 text-sm font-medium leading-6 text-white/58">
            {copy.helper}
          </p>
        </div>
        <div
          aria-label={copy.requestKind}
          className="grid shrink-0 grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-1 sm:grid-cols-2 lg:w-[24rem]"
          role="group"
        >
          {requestTypes.map((type) => {
            const Icon = type.icon;
            const active = requestType === type.value;

            return (
              <button
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition ${
                  active
                    ? "bg-[#44f26e] text-black"
                    : "text-white/62 hover:bg-white/8 hover:text-white"
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
                <Icon className="size-3.5" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/8 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ffc8]">
              {copy.examplesLabel}
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-white/48">
              {copy.templatesHelper}
            </p>
          </div>
          {templateLoadStatus === "loading" ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#b9ffc8]">
              <Loader2 className="size-3.5 animate-spin" />
              {copy.examplesStatusLoading}
            </span>
          ) : templateLoadStatus === "error" ? (
            <span className="text-xs font-semibold text-white/42">
              {copy.examplesStatusFallback}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {templateCategories.map((category) => {
            const active = effectiveTemplateCategory === category.value;

            return (
              <button
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
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
            const selected = selectedTemplateId === template.templateId;

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

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="block">
          <span className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
              {copy.bodyLabel}
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
            placeholder={copy.bodyPlaceholder}
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
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-64"
            disabled={status === "loading"}
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
            {status === "loading" ? copy.submitting : copy.submit}
          </button>
          <p className="mt-3 text-xs font-medium leading-5 text-white/42">
            {copy.note}
          </p>
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
                    {copy.successTitle}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#b9ffc8]">
                    {copy.saved}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-white/56">
                    {copy.successBody}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[#b9ffc8]">
                    {copy.requestReceipt}
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
                  </div>
                  <p className="mt-3 line-clamp-3 break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                    {lastSubmittedRequest.body}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              {copy.successSteps.map((step, index) => {
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
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#44f26e]/28 px-3 text-sm font-semibold text-[#b9ffc8] transition hover:bg-[#44f26e]/12"
              onClick={resetForAnotherRequest}
              type="button"
            >
              {copy.newRequest}
            </button>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-semibold !text-black transition hover:bg-white/90"
              href={requestStatusHref}
            >
              {copy.requestStatus}
              <ArrowRight className="size-4" />
            </Link>
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
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-3 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
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
