"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  FileText,
  Loader2,
  MessageCircleHeart,
  Newspaper,
  Radio,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";

import type {
  FanletterFanRequestCreateResponse,
  FanletterFanRequestType,
} from "@/lib/content";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_FAN_REQUEST_SUBMITTED_EVENT,
  type FanletterFanRequestSubmittedDetail,
} from "@/lib/fanletter-request-events";
import { rememberFanletterRequestReceiptId } from "@/lib/fanletter-request-receipts";
import type { Locale } from "@/lib/i18n";

type SubmitStatus = "error" | "idle" | "loading" | "success";

type FanletterNewsRequestPreview = {
  body: string;
  createdAt: string;
  requestType: FanletterFanRequestType;
  requesterDisplayName: string | null;
};

type FanletterNewsLatestReport = {
  coverImageUrl: string | null;
  dek: string;
  href: string;
  publishedAt: string | null;
  title: string;
};

type FanletterNewsCharacterRequestPageProps = {
  avatarImageUrl: string | null;
  channelHref: string;
  characterName: string;
  characterSummary: string;
  charactersHref: string;
  creatorReferralCode: string;
  fanOnlyContentCount: number;
  latestReport: FanletterNewsLatestReport | null;
  locale: Locale;
  newsHomeHref: string;
  newsReportCount: number;
  publicContentCount: number;
  publicVlogsHref: string;
  recentRequests: FanletterNewsRequestPreview[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        backToChannel: "캐릭터 채널",
        backToCharacters: "AI 캐릭터 목록",
        bodyLabel: "뉴스에서 보고 싶은 장면",
        bodyPlaceholder:
          "예: 다음 뉴스 리포트에서는 팬 질문에 답하면서 새 의상을 소개하는 브이로그를 보고 싶어요.",
        editorialLoop: {
          body:
            "팬 요청은 크리에이터 스튜디오 요청함에 저장되고, 강한 요청은 브이로그 제작과 뉴스 리포트 소재로 이어집니다.",
          steps: [
            {
              body: "팬이 보고 싶은 장면이나 응원 메시지를 남깁니다.",
              title: "요청 접수",
            },
            {
              body: "크리에이터가 스튜디오에서 요청을 확인하고 제작 후보로 분류합니다.",
              title: "소재 검토",
            },
            {
              body: "브이로그가 공개되면 FanLetter News 리포트와 캐릭터 채널 성장 신호로 쌓입니다.",
              title: "뉴스 확장",
            },
          ],
          title: "뉴스 IP 성장 루프",
        },
        emptyBody: "요청 내용을 입력해 주세요.",
        errorFallback: "팬 요청을 저장하지 못했습니다.",
        hero: {
          eyebrow: "FanLetter News Request Desk",
          kicker: "뉴스 전용 팬 요청",
          title: (name: string) => `${name}에게 팬 요청 남기기`,
        },
        latest: {
          empty: "아직 연결된 최신 뉴스가 없습니다.",
          title: "최근 뉴스 흐름",
        },
        nameLabel: "팬 이름",
        namePlaceholder: "선택 입력",
        newRequest: "새 요청 작성",
        prompts: [
          {
            body: "다음 브이로그에서 팬 질문에 답하면서 오늘의 기분을 말해줘.",
            title: "팬 질문 답변",
            type: "vlog_request" as const,
          },
          {
            body: "새 의상이나 헤어스타일을 뉴스 리포트처럼 소개해줘.",
            title: "스타일 업데이트",
            type: "vlog_request" as const,
          },
          {
            body: "오늘 뉴스 보고 응원하게 됐어요. 다음 활동도 기대할게요.",
            title: "응원 메시지",
            type: "message" as const,
          },
        ],
        promptTitle: "뉴스룸 추천 요청",
        recent: {
          empty: "최근 팬 요청이 아직 없습니다.",
          message: "응원",
          requestedBy: "팬",
          title: "최근 팬 요청",
          vlog: "장면 요청",
        },
        requestReady: "요청을 저장할 준비가 됐습니다.",
        requestTypes: {
          message: {
            body: "짧은 응원이나 팬 메시지를 남깁니다.",
            label: "응원 메시지",
          },
          vlog_request: {
            body: "다음 브이로그에서 보고 싶은 장면을 제안합니다.",
            label: "장면 요청",
          },
        },
        siteName: "FanLetter News",
        stats: {
          fanOnly: "팬 전용",
          news: "뉴스",
          publicVlogs: "공개 브이로그",
          requests: "최근 요청",
        },
        submit: "팬 요청 보내기",
        submitting: "저장 중",
        success: {
          body:
            "요청은 스튜디오 요청함에 저장되었습니다. 좋은 요청은 다음 브이로그와 뉴스 리포트 소재로 검토됩니다.",
          title: "팬 요청이 접수되었습니다.",
        },
        viewNews: "뉴스 홈",
        viewPublicVlogs: "공개 브이로그",
      }
    : {
        backToChannel: "Character channel",
        backToCharacters: "AI characters",
        bodyLabel: "Scene to see in the news",
        bodyPlaceholder:
          "Example: For the next news report, answer fan questions while showing a new outfit.",
        editorialLoop: {
          body:
            "Fan requests are saved to the creator studio inbox. Strong requests can become vlogs and future FanLetter News report angles.",
          steps: [
            {
              body: "A fan leaves a scene request or support message.",
              title: "Request intake",
            },
            {
              body: "The creator reviews it in Studio and moves strong ideas into production candidates.",
              title: "Editorial review",
            },
            {
              body: "Published vlogs can become FanLetter News reports and character growth signals.",
              title: "News expansion",
            },
          ],
          title: "News IP growth loop",
        },
        emptyBody: "Write a fan request first.",
        errorFallback: "Could not save the fan request.",
        hero: {
          eyebrow: "FanLetter News Request Desk",
          kicker: "News-only fan request",
          title: (name: string) => `Leave a fan request for ${name}`,
        },
        latest: {
          empty: "No connected latest news yet.",
          title: "Latest news flow",
        },
        nameLabel: "Fan name",
        namePlaceholder: "Optional",
        newRequest: "Write another",
        prompts: [
          {
            body: "In the next vlog, answer fan questions and talk about today's mood.",
            title: "Fan Q&A",
            type: "vlog_request" as const,
          },
          {
            body: "Introduce a new outfit or hairstyle like a news report.",
            title: "Style update",
            type: "vlog_request" as const,
          },
          {
            body: "This news made me cheer for you. I am looking forward to the next update.",
            title: "Support note",
            type: "message" as const,
          },
        ],
        promptTitle: "Newsroom request prompts",
        recent: {
          empty: "No recent fan requests yet.",
          message: "Support",
          requestedBy: "Fan",
          title: "Recent fan requests",
          vlog: "Scene request",
        },
        requestReady: "The request is ready to save.",
        requestTypes: {
          message: {
            body: "Leave a short support note or fan message.",
            label: "Support message",
          },
          vlog_request: {
            body: "Suggest a scene for the next vlog.",
            label: "Scene request",
          },
        },
        siteName: "FanLetter News",
        stats: {
          fanOnly: "Fan-only",
          news: "News",
          publicVlogs: "Public vlogs",
          requests: "Recent requests",
        },
        submit: "Send fan request",
        submitting: "Saving",
        success: {
          body:
            "The request was saved to the Studio inbox. Strong ideas can be reviewed for future vlogs and FanLetter News reports.",
          title: "Fan request delivered.",
        },
        viewNews: "News home",
        viewPublicVlogs: "Public vlogs",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getErrorMessage(value: unknown, fallback: string, locale: Locale) {
  const message = value instanceof Error ? value.message : null;

  if (!message) {
    return fallback;
  }

  if (locale !== "ko") {
    return message;
  }

  const koreanMessages: Record<string, string> = {
    "Duplicate fan request.": "이미 같은 요청을 남겼습니다.",
    "Fan request contains blocked content.":
      "요청에 링크나 광고성 문구가 포함되어 저장하지 못했습니다.",
    "Too many fan requests. Please try again later.":
      "짧은 시간에 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  };

  return koreanMessages[message] ?? message;
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

export function FanletterNewsCharacterRequestPage({
  avatarImageUrl,
  channelHref,
  characterName,
  characterSummary,
  charactersHref,
  creatorReferralCode,
  fanOnlyContentCount,
  latestReport,
  locale,
  newsHomeHref,
  newsReportCount,
  publicContentCount,
  publicVlogsHref,
  recentRequests,
}: FanletterNewsCharacterRequestPageProps) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requesterDisplayName, setRequesterDisplayName] = useState("");
  const [requestType, setRequestType] =
    useState<FanletterFanRequestType>("vlog_request");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const hasDraft = body.trim().length > 0;
  const isSubmitDisabled = status === "loading" || !hasDraft;

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
            sourceContentId: null,
            sourcePath,
            templateId: null,
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
              sourceContentId: null,
            },
          },
        ),
      );
      setBody("");
      setRequesterDisplayName("");
      setStatus("success");
    } catch (submitError) {
      setError(getErrorMessage(submitError, copy.errorFallback, locale));
      setStatus("error");
    }
  }

  const requestTypeOptions = [
    {
      Icon: Clapperboard,
      body: copy.requestTypes.vlog_request.body,
      label: copy.requestTypes.vlog_request.label,
      value: "vlog_request" as const,
    },
    {
      Icon: MessageCircleHeart,
      body: copy.requestTypes.message.body,
      label: copy.requestTypes.message.label,
      value: "message" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#eef1ec] pb-24 text-[#111510] sm:pb-12">
      <header className="border-b border-black/14 bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
            <Link
              className="inline-flex items-center text-[2.05rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.25rem]"
              href={newsHomeHref}
            >
              {copy.siteName}
            </Link>
            <Link
              className="hidden min-h-10 items-center gap-2 border border-black/14 px-3 text-xs font-black uppercase tracking-[0.12em] !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex"
              href={charactersHref}
            >
              <ArrowLeft className="size-4 text-[#16702e]" />
              {copy.backToCharacters}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <section className="grid gap-5 border-y-2 border-[#111510] bg-white lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="relative min-h-[21rem] overflow-hidden bg-[#111510] text-white sm:min-h-[25rem]">
            {avatarImageUrl ? (
              <Image
                alt={characterName}
                className="object-cover"
                fill
                loading="eager"
                sizes="(max-width: 1024px) 100vw, 36rem"
                src={avatarImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(avatarImageUrl)}
              />
            ) : (
              <div className="flex h-full min-h-[21rem] items-center justify-center text-white/72 sm:min-h-[25rem]">
                <UserRound className="size-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/22 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <p className="inline-flex bg-[#44f26e] px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-black">
                {copy.hero.kicker}
              </p>
              <h1 className="mt-3 break-words text-[2.35rem] font-black leading-[1.05] [word-break:keep-all] sm:text-[3.35rem]">
                {copy.hero.title(characterName)}
              </h1>
            </div>
          </div>

          <div className="flex flex-col justify-between p-4 sm:p-6">
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
                {copy.hero.eyebrow}
              </p>
              <p className="mt-4 max-w-2xl break-words text-base font-semibold leading-7 text-black/64 [word-break:keep-all]">
                {characterSummary}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: copy.stats.news, value: newsReportCount },
                { label: copy.stats.publicVlogs, value: publicContentCount },
                { label: copy.stats.fanOnly, value: fanOnlyContentCount },
                { label: copy.stats.requests, value: recentRequests.length },
              ].map((stat) => (
                <div className="border border-black/12 bg-[#f7f8f5] p-3" key={stat.label}>
                  <p className="text-2xl font-black leading-none">
                    {formatNumber(stat.value, locale)}
                  </p>
                  <p className="mt-2 text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/42">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-black"
                href={channelHref}
              >
                <ArrowLeft className="size-4 text-[#44f26e]" />
                {copy.backToChannel}
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-black/16 px-4 text-sm font-black !text-[#111510] transition hover:border-[#16702e] hover:bg-[#ecfff0]"
                href={publicVlogsHref}
              >
                <Clapperboard className="size-4 text-[#16702e]" />
                {copy.viewPublicVlogs}
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-black/16 px-4 text-sm font-black !text-[#111510] transition hover:border-[#16702e] hover:bg-[#ecfff0]"
                href={newsHomeHref}
              >
                <Newspaper className="size-4 text-[#16702e]" />
                {copy.viewNews}
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.72fr)]">
          <form
            className="border border-black/14 bg-white p-4 shadow-[0_18px_44px_rgba(17,21,16,0.06)] sm:p-5"
            onSubmit={(event) => {
              void submitRequest(event);
            }}
          >
            <div className="flex flex-col gap-3 border-b-2 border-[#111510] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  Request Form
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-normal">
                  {copy.bodyLabel}
                </h2>
              </div>
              <Radio className="size-5 text-[#16702e]" />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {requestTypeOptions.map(({ Icon, body: optionBody, label, value }) => {
                const active = requestType === value;

                return (
                  <button
                    aria-pressed={active}
                    className={`min-h-[5.25rem] border px-3 py-3 text-left transition ${
                      active
                        ? "border-[#111510] bg-[#44f26e] text-black"
                        : "border-black/12 bg-[#f7f8f5] text-black/64 hover:border-[#16702e] hover:bg-[#ecfff0]"
                    }`}
                    key={value}
                    onClick={() => {
                      setRequestType(value);
                      setError(null);
                      if (status !== "loading") {
                        setStatus("idle");
                      }
                    }}
                    type="button"
                  >
                    <span className="flex items-center gap-2 text-sm font-black text-[#111510]">
                      <Icon className="size-4" />
                      {label}
                    </span>
                    <span className="mt-1.5 block text-xs font-semibold leading-5 text-black/58">
                      {optionBody}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block">
              <span className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-black/46">
                  {copy.bodyLabel}
                </span>
                <span className="text-xs font-bold text-black/38">
                  {body.length}/600
                </span>
              </span>
              <textarea
                className="mt-2 min-h-36 w-full resize-y border border-black/14 bg-[#fbfcf9] px-3 py-3 text-sm font-semibold leading-6 text-[#111510] outline-none transition placeholder:text-black/32 focus:border-[#16702e] focus:bg-white"
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

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,0.28fr)]">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-black/46">
                  {copy.nameLabel}
                </span>
                <input
                  className="mt-2 h-11 w-full border border-black/14 bg-[#fbfcf9] px-3 text-sm font-semibold text-[#111510] outline-none transition placeholder:text-black/32 focus:border-[#16702e] focus:bg-white"
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
                className={`mt-0 inline-flex min-h-11 items-center justify-center gap-2 self-end px-4 text-sm font-black transition disabled:cursor-not-allowed sm:mt-7 ${
                  isSubmitDisabled
                    ? "bg-black/8 text-black/34"
                    : "bg-[#111510] text-white hover:bg-black"
                }`}
                disabled={isSubmitDisabled}
                type="submit"
              >
                {status === "loading" ? (
                  <Loader2 className="size-4 animate-spin text-[#44f26e]" />
                ) : status === "success" ? (
                  <CheckCircle2 className="size-4 text-[#44f26e]" />
                ) : (
                  <Send className="size-4 text-[#44f26e]" />
                )}
                {status === "loading" ? copy.submitting : copy.submit}
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold leading-5 text-black/48">
              {hasDraft ? copy.requestReady : copy.editorialLoop.body}
            </p>

            <div className="mt-4 border border-[#16702e]/18 bg-[#ecfff0] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#16702e]">
                {copy.promptTitle}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {copy.prompts.map((prompt) => (
                  <button
                    className="min-h-24 border border-[#16702e]/20 bg-white p-3 text-left transition hover:border-[#16702e] hover:bg-[#f7fff7]"
                    key={prompt.title}
                    onClick={() => {
                      setBody(prompt.body);
                      setRequestType(prompt.type);
                      setError(null);
                      if (status !== "loading") {
                        setStatus("idle");
                      }
                    }}
                    type="button"
                  >
                    <span className="block text-sm font-black text-[#111510]">
                      {prompt.title}
                    </span>
                    <span className="mt-2 line-clamp-3 block text-xs font-semibold leading-5 text-black/58">
                      {prompt.body}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {status === "success" ? (
              <div
                aria-live="polite"
                className="mt-4 border border-[#16702e]/24 bg-[#ecfff0] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center bg-[#44f26e] text-black">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <div>
                    <p className="text-base font-black">{copy.success.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-black/62">
                      {copy.success.body}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    className="inline-flex min-h-10 items-center justify-center border border-[#16702e]/22 px-3 text-sm font-black text-[#16702e] transition hover:bg-white"
                    onClick={() => {
                      setStatus("idle");
                      setError(null);
                    }}
                    type="button"
                  >
                    {copy.newRequest}
                  </button>
                  <Link
                    className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#111510] px-3 text-sm font-black !text-white transition hover:bg-black"
                    href={channelHref}
                  >
                    {copy.backToChannel}
                    <ArrowRight className="size-4 text-[#44f26e]" />
                  </Link>
                </div>
              </div>
            ) : null}

            {status === "error" && error ? (
              <p className="mt-3 border border-red-300/30 bg-red-50 px-3 py-2 text-sm font-semibold leading-6 text-red-700">
                {error}
              </p>
            ) : null}
          </form>

          <aside className="grid gap-4">
            <section className="border border-black/14 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b-2 border-[#111510] pb-3">
                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                    Latest
                  </p>
                  <h2 className="mt-1 text-xl font-black">{copy.latest.title}</h2>
                </div>
                <FileText className="size-5 text-[#16702e]" />
              </div>
              {latestReport ? (
                <Link className="mt-4 block group" href={latestReport.href}>
                  <div className="relative min-h-[12rem] overflow-hidden bg-[#111510]">
                    {latestReport.coverImageUrl ? (
                      <Image
                        alt=""
                        className="object-cover transition group-hover:scale-[1.02]"
                        fill
                        sizes="(max-width: 1024px) 100vw, 24rem"
                        src={latestReport.coverImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          latestReport.coverImageUrl,
                        )}
                      />
                    ) : (
                      <div className="flex min-h-[12rem] items-center justify-center text-white/72">
                        <Newspaper className="size-10" />
                      </div>
                    )}
                  </div>
                  <p className="mt-3 break-words text-lg font-black leading-6 [word-break:keep-all] group-hover:text-[#16702e]">
                    {latestReport.title}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-black/58">
                    {latestReport.dek}
                  </p>
                  {latestReport.publishedAt ? (
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-black/38">
                      {latestReport.publishedAt}
                    </p>
                  ) : null}
                </Link>
              ) : (
                <p className="mt-4 border border-black/10 bg-[#f7f8f5] p-4 text-sm font-semibold text-black/54">
                  {copy.latest.empty}
                </p>
              )}
            </section>

            <section className="border border-black/14 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b-2 border-[#111510] pb-3">
                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                    Community
                  </p>
                  <h2 className="mt-1 text-xl font-black">{copy.recent.title}</h2>
                </div>
                <MessageCircleHeart className="size-5 text-[#16702e]" />
              </div>
              <div className="mt-4 space-y-2">
                {recentRequests.length > 0 ? (
                  recentRequests.slice(0, 4).map((request) => (
                    <div
                      className="border border-black/10 bg-[#f7f8f5] p-3"
                      key={`${request.createdAt}-${request.body}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.1em] text-black/42">
                        <span className="bg-[#44f26e] px-2 py-1 text-black">
                          {request.requestType === "message"
                            ? copy.recent.message
                            : copy.recent.vlog}
                        </span>
                        <span>{formatDate(request.createdAt, locale)}</span>
                      </div>
                      <p className="mt-2 line-clamp-3 break-words text-sm font-semibold leading-6 text-[#111510]">
                        {request.body}
                      </p>
                      <p className="mt-2 text-xs font-bold text-black/42">
                        {request.requesterDisplayName || copy.recent.requestedBy}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="border border-black/10 bg-[#f7f8f5] p-4 text-sm font-semibold text-black/54">
                    {copy.recent.empty}
                  </p>
                )}
              </div>
            </section>

            <section className="border border-black/14 bg-[#111510] p-4 text-white sm:p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#44f26e]" />
                <h2 className="text-xl font-black">{copy.editorialLoop.title}</h2>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
                {copy.editorialLoop.body}
              </p>
              <div className="mt-4 grid gap-2">
                {copy.editorialLoop.steps.map((step, index) => (
                  <div
                    className="flex gap-3 border border-white/12 bg-white/[0.055] p-3"
                    key={step.title}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center bg-[#44f26e] text-sm font-black text-black">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{step.title}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-white/54">
                        {step.body}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
