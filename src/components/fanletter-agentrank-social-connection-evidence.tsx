import {
  AtSign,
  BadgeCheck,
  Database,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

function readContextString(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function readContextBoolean(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  return typeof value === "boolean" ? value : null;
}

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      actor: "연결한 Creator",
      channel: "TikTok 채널",
      condition: "Creator Journey 조건",
      conditionComplete: "조건 완료",
      event: "평판 기록",
      handle: "TikTok handle",
      mockOnly: "Mock 연결",
      permission: "권한 검증",
      platform: "플랫폼",
      profile: "프로필 URL",
      profileOpen: "TikTok 열기",
      source: "검증 출처",
      status: "연결 상태",
      target: "대상 AI 스타",
      title: "TikTok 연결 증거",
    };
  }

  return {
    actor: "Connected Creator",
    channel: "TikTok Channel",
    condition: "Creator Journey Condition",
    conditionComplete: "Condition complete",
    event: "Reputation Event",
    handle: "TikTok handle",
    mockOnly: "Mock connection",
    permission: "Permission Check",
    platform: "Platform",
    profile: "Profile URL",
    profileOpen: "Open TikTok",
    source: "Verification Source",
    status: "Connection Status",
    target: "Target AI Star",
    title: "TikTok Connection Evidence",
  };
}

function isSafeExternalUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" && url.hostname.endsWith("tiktok.com");
  } catch {
    return false;
  }
}

export function FanletterAgentRankSocialConnectionEvidence({
  event,
  locale,
}: {
  event: AgentRankReputationEvent;
  locale: Locale;
}) {
  if (event.type !== "creator_social_connected") {
    return null;
  }

  const copy = getCopy(locale);
  const handle = readContextString(event, "handle") ?? "TikTok";
  const profileUrl = readContextString(event, "profileUrl");
  const platform = readContextString(event, "platform") ?? "tiktok";
  const connectedCreator =
    readContextString(event, "actorMemberName") ??
    event.actor.label ??
    event.actor.id;
  const targetAiStar =
    readContextString(event, "starName") ??
    event.object?.label ??
    event.starId ??
    "-";
  const conditionId =
    readContextString(event, "creatorJourneyConditionId") ??
    "creatorSocialConnected";
  const conditionMet =
    readContextBoolean(event, "creatorJourneyConditionMet") ?? false;
  const permissionSource =
    readContextString(event, "permissionSource") ??
    readContextString(event, "storageSource") ??
    "server";
  const permissionReason =
    readContextString(event, "permissionReason") ??
    readContextString(event, "socialConnectionStatus") ??
    "ok";
  const status =
    readContextString(event, "socialConnectionStatus") ??
    readContextString(event, "status") ??
    "mock_connected";
  const isMockOnly = readContextBoolean(event, "mockOnly") ?? true;
  const tiles = [
    [copy.handle, handle],
    [copy.platform, platform],
    [copy.actor, connectedCreator],
    [copy.target, targetAiStar],
    [copy.condition, conditionId],
    [copy.status, status],
    [copy.source, permissionSource],
    [copy.permission, permissionReason],
  ];

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-white shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-white/62">
            <AtSign className="size-4" />
            {copy.title}
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold leading-tight [word-break:keep-all]">
            {handle}
          </h2>
        </div>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-100">
          <BadgeCheck className="size-3.5" />
          {conditionMet ? copy.conditionComplete : copy.event}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div
            className="min-w-0 rounded-lg border border-white/10 bg-white/8 p-3"
            key={label}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white/42">
              {label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-5 text-white">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap gap-2">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/75 ring-1 ring-white/10">
            <Database className="size-3.5" />
            creator_social_connected
          </span>
          {isMockOnly ? (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/75 ring-1 ring-white/10">
              <ShieldCheck className="size-3.5" />
              {copy.mockOnly}
            </span>
          ) : null}
        </div>
        {isSafeExternalUrl(profileUrl) ? (
          <a
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            href={profileUrl ?? "#"}
            rel="noreferrer"
            target="_blank"
          >
            {copy.profileOpen}
            <ExternalLink className="size-4" />
          </a>
        ) : (
          <span className="min-w-0 break-all rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white/56">
            {copy.profile}: {profileUrl ?? "-"}
          </span>
        )}
      </div>
    </section>
  );
}
