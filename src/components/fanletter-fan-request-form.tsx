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
import { useState } from "react";

import type {
  FanletterFanRequestCreateResponse,
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

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        bodyLabel: "보고 싶은 장면",
        bodyPlaceholder:
          "예: 다음에는 카페에서 영어 공부하는 브이로그를 보고 싶어요.",
        emptyBody: "보고 싶은 장면이나 응원 메시지를 입력해 주세요.",
        errorFallback: "요청을 저장하지 못했습니다.",
        examples: [
          "카페에서 영어 공부하는 하루",
          "새 의상으로 팬 질문 답하기",
          "비 오는 날 산책 브이로그",
          "아침 루틴과 플레이리스트",
        ],
        examplesLabel: "빠른 예시",
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
          "A day studying English at a cafe",
          "Answer fan questions in a new outfit",
          "A rainy-day walk vlog",
          "Morning routine and playlist",
        ],
        examplesLabel: "Quick examples",
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
  const copy = getCopy(locale);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedRequest, setLastSubmittedRequest] =
    useState<LastSubmittedRequest | null>(null);
  const [requesterDisplayName, setRequesterDisplayName] = useState("");
  const [requestType, setRequestType] =
    useState<FanletterFanRequestType>("vlog_request");
  const [status, setStatus] = useState<SubmitStatus>("idle");
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
      setStatus("success");
    } catch (submitError) {
      setError(getErrorMessage(submitError, copy.errorFallback, locale));
      setStatus("error");
    }
  }

  function applyExample(example: string) {
    setBody((current) => {
      const trimmed = current.trim();

      return trimmed ? `${trimmed}\n${example}` : example;
    });
    setError(null);
    setStatus("idle");
    setRequestType("vlog_request");
  }

  function resetForAnotherRequest() {
    setError(null);
    setStatus("idle");
    setRequestType("vlog_request");
  }

  const successStepIcons = [Inbox, Clapperboard, Radio] as const;
  const lastSubmittedRequestTypeLabel = lastSubmittedRequest
    ? lastSubmittedRequest.requestType === "message"
      ? copy.message
      : copy.vlogRequest
    : null;
  const requestStatusHref = `${buildPathWithReferral(
    `/${locale}/fanletter/following`,
    referralCode ?? creatorReferralCode,
  )}#fanletter-my-requests`;

  return (
    <div
      className="mt-6 scroll-mt-28 rounded-lg border border-white/12 bg-black/28 p-4 sm:p-5"
      id={formId}
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
                  setRequestType(type.value);
                  setError(null);
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
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ffc8]">
          {copy.examplesLabel}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {copy.examples.map((example) => (
            <button
              className="rounded-full border border-[#44f26e]/22 bg-black/18 px-3 py-1.5 text-xs font-semibold text-[#b9ffc8] transition hover:border-[#44f26e]/56 hover:bg-[#44f26e]/12"
              key={example}
              onClick={() => {
                applyExample(example);
              }}
              type="button"
            >
              {example}
            </button>
          ))}
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
