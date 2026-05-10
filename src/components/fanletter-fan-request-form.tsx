"use client";

import {
  CheckCircle2,
  Clapperboard,
  Loader2,
  MessageCircleHeart,
} from "lucide-react";
import { useState } from "react";

import type {
  FanletterFanRequestCreateResponse,
  FanletterFanRequestType,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";

type SubmitStatus = "error" | "idle" | "loading" | "success";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        bodyLabel: "메시지 또는 요청",
        bodyPlaceholder:
          "예: 다음에는 카페에서 영어 공부하는 브이로그를 보고 싶어요.",
        errorFallback: "요청을 저장하지 못했습니다.",
        message: "응원 메시지",
        nameLabel: "이름",
        namePlaceholder: "선택 사항",
        saved:
          "요청이 저장되었습니다. 크리에이터가 스튜디오 요청함에서 바로 브이로그로 만들 수 있습니다.",
        submit: "요청 남기기",
        submitting: "저장 중...",
        title: "바로 요청 남기기",
        vlogRequest: "다음 브이로그 요청",
      }
    : {
        bodyLabel: "Message or request",
        bodyPlaceholder:
          "Example: I want to see a vlog where you study English at a cafe.",
        errorFallback: "Could not save the request.",
        message: "Support message",
        nameLabel: "Name",
        namePlaceholder: "Optional",
        saved:
          "Request saved. The creator can turn it into a vlog from the studio inbox.",
        submit: "Leave request",
        submitting: "Saving...",
        title: "Leave a request",
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
  locale,
  sourceContentId,
}: {
  characterName: string;
  creatorReferralCode: string;
  locale: Locale;
  sourceContentId?: string | null;
}) {
  const copy = getCopy(locale);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      setError(copy.bodyLabel);
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
      await readApiJson<FanletterFanRequestCreateResponse>(
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

      setBody("");
      setRequesterDisplayName("");
      setStatus("success");
    } catch (submitError) {
      setError(getErrorMessage(submitError, copy.errorFallback, locale));
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-black/22 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold tracking-normal text-white">
          {copy.title}
        </h3>
        <div className="grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-white/[0.045] p-1">
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

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
            {copy.bodyLabel}
          </span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-lg border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-medium leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-[#44f26e]/70"
            maxLength={600}
            onChange={(event) => {
              setBody(event.target.value);
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
        </div>
      </div>

      {status === "success" ? (
        <p className="mt-3 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-2 text-sm font-medium leading-6 text-[#b9ffc8]">
          {copy.saved}
        </p>
      ) : null}
      {status === "error" && error ? (
        <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm font-medium leading-6 text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
