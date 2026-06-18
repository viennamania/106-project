"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Database,
  GitBranch,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import type { Locale } from "@/lib/i18n";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCoverageActionLabels(locale: Locale) {
  if (locale === "ko") {
    return {
      back: "Coverage Audit으로 돌아가기",
      eyebrow: "AgentRank 수집 액션",
      ledger: "원장 보기",
      refresh: "상태 새로고침",
      status: "실행 상태",
      statusConfirmed: "확인됨",
      statusDeferred: "보류",
      statusError: "상태 확인 실패",
      statusLoading: "원장 확인 중",
      statusPending: "대기",
      statusSubtitle: "AgentRank 원장 기준",
      memberScope: "감사 대상 멤버",
      starScope: "감사 대상 스타",
      totalEvents: "이벤트",
    };
  }

  return {
    back: "Back to Coverage Audit",
    eyebrow: "AgentRank Collection Action",
    ledger: "Open Ledger",
    refresh: "Refresh Status",
    status: "Execution Status",
    statusConfirmed: "Confirmed",
    statusDeferred: "Deferred",
    statusError: "Status check failed",
    statusLoading: "Checking ledger",
    statusPending: "Pending",
    statusSubtitle: "Based on AgentRank ledger",
    memberScope: "Audit target member",
    starScope: "Audit target star",
    totalEvents: "events",
  };
}

function getCoverageActionMessage(action: string, locale: Locale) {
  const koMessages: Record<string, { body: string; title: string }> = {
    a2a_usage: {
      body:
        "Phase 1에서는 보류 상태로 두고, 추후 Agent 호출 이벤트 스키마와 연결할 준비 신호를 확인합니다.",
      title: "A2A 사용 신호 준비",
    },
    ai_star_discovered: {
      body:
        "AI 스타 상세 탐색, CTA 클릭, 콘텐츠 프리뷰 반응이 AgentRank Discovery 신호로 쌓이는지 확인합니다.",
      title: "AI 스타 발견 신호 수집",
    },
    ai_star_spawned: {
      body:
        "새 AI 스타 생성 mock을 완료하면 Creator Journey와 AI 스타 유니버스 확장 신호가 채워집니다.",
      title: "AI 스타 창업 이벤트 수집",
    },
    content_engaged: {
      body:
        "AI 스타 콘텐츠 열람과 반응이 경제 평판의 원천 이벤트로 기록되는지 확인합니다.",
      title: "콘텐츠 참여 신호 수집",
    },
    cp_earned: {
      body:
        "초대, 참여, 성장 기여로 발생한 CP 보상이 AgentRank 경제 기여 신호로 연결되는지 확인합니다.",
      title: "CP 보상 신호 수집",
    },
    cp_pool_generated: {
      body:
        "새 AI 스타 창업 시 생성되는 CP Pool이 상위 AI 스타 유니버스 보상 분배 신호로 남는지 확인합니다.",
      title: "CP Pool 생성 신호 수집",
    },
    creator_unlock_evaluated: {
      body:
        "크리에이터 권한 조건 평가가 조건/품질/감사 준비율과 함께 AgentRank 이벤트로 남는지 확인합니다.",
      title: "크리에이터 권한 평가 수집",
    },
    creator_unlocked: {
      body:
        "조건을 충족한 멤버가 크리에이터 권한으로 전환되는 순간을 평판 이벤트로 수집합니다.",
      title: "크리에이터 권한 전환 수집",
    },
    creator_social_connected: {
      body:
        "AI 스타별 TikTok 채널을 mock으로 연결해 Creator Journey 조건을 채우고, 연결한 Creator와 대상 AI 스타를 평판 기록으로 남깁니다.",
      title: "TikTok 채널 연결 수집",
    },
    fanletter_agentrank: {
      body:
        "AgentRank 대시보드 진입과 분석 CTA가 평판 감사 흐름의 출처로 기록되는지 확인합니다.",
      title: "AgentRank 화면 출처 확인",
    },
    fanletter_bridge: {
      body:
        "계정 연결, 추천 코드 유지, 온보딩 이동이 Founder Network 전환 신호로 이어지는지 확인합니다.",
      title: "계정 연결 브릿지 신호 확인",
    },
    fanletter_content: {
      body:
        "AI 스타 콘텐츠와 공유 링크에서 발생하는 참여가 AgentRank 원장에 누락 없이 기록되는지 확인합니다.",
      title: "콘텐츠 출처 신호 확인",
    },
    fanletter_creator_unlock: {
      body:
        "크리에이터 여정 화면에서 권한 평가, 출처 선택, 창업 mock 이벤트가 생성되는지 확인합니다.",
      title: "크리에이터 여정 출처 확인",
    },
    fanletter_founder_universe: {
      body:
        "파운더 네트워크 탐색, 계층 선택, 유니버스 확장이 AgentRank 네트워크 신호로 쌓이는지 확인합니다.",
      title: "파운더 네트워크 출처 확인",
    },
    fanletter_home: {
      body:
        "홈의 발견, 초대, 창업 CTA가 AgentRank 이벤트 팩토리의 첫 유입 신호로 기록되는지 확인합니다.",
      title: "홈 출처 신호 확인",
    },
    fanletter_news: {
      body:
        "AI 스타 뉴스/브이로그 반응이 콘텐츠 참여 및 Discovery 신호로 이어지는지 확인합니다.",
      title: "뉴스 출처 신호 확인",
    },
    fanletter_star_detail: {
      body:
        "스타 상세에서 발견, Founder 참여, 추천 코드 생성이 같은 스타 기준 이벤트로 기록되는지 확인합니다.",
      title: "스타 상세 출처 신호 확인",
    },
    founder_joined: {
      body:
        "멤버가 특정 AI 스타의 파운더 네트워크에 편입되는 신호를 수집합니다.",
      title: "Founder 참여 신호 수집",
    },
    referral_code_created: {
      body:
        "추천 코드 생성과 SNS 공유 링크가 Founder Network 리니지의 시작점으로 기록되는지 확인합니다.",
      title: "추천 코드 생성 신호 수집",
    },
    referral_converted: {
      body:
        "초대받은 신규 멤버가 같은 AI 스타 유니버스에 합류하는 전환 신호를 확인합니다.",
      title: "추천 전환 신호 수집",
    },
    source_universe_selected: {
      body:
        "새 AI 스타가 어느 AI 스타 유니버스 성과에서 탄생하는지 출처를 고정해 리니지 신뢰를 강화합니다.",
      title: "출처 AI 스타 유니버스 선택 수집",
    },
    universe_growth: {
      body:
        "6단계 파운더 네트워크, 신규 멤버, 파생 스타 확장이 AgentRank 네트워크 성장 신호로 남는지 확인합니다.",
      title: "AI 스타 유니버스 성장 신호 수집",
    },
    x402_economy: {
      body:
        "실결제 전까지 10 USDT 창업 의도와 CP Pool 생성을 mock 경제 이벤트로 연결합니다.",
      title: "x402 경제 이벤트 준비",
    },
    x402_mock_payment_intent: {
      body:
        "실결제 전까지 10 USDT 창업 의도를 mock 결제 이벤트로 수집합니다.",
      title: "x402 결제 의도 수집",
    },
  };
  const enMessages: Record<string, { body: string; title: string }> = {
    a2a_usage: {
      body:
        "Keep this as a Phase 1 placeholder and verify the future agent-call event schema connection.",
      title: "Prepare A2A Usage Signal",
    },
    ai_star_discovered: {
      body:
        "Verify that AI Star detail views, CTA clicks, and content previews become AgentRank Discovery signals.",
      title: "Collect AI Star Discovery Signal",
    },
    ai_star_spawned: {
      body:
        "Completing a mock AI Star launch fills Creator Journey and AI Star Universe expansion signals.",
      title: "Collect AI Star Spawn Event",
    },
    content_engaged: {
      body:
        "Verify that AI Star content views and reactions are recorded as source economic reputation events.",
      title: "Collect Content Engagement Signal",
    },
    cp_earned: {
      body:
        "Verify that invite, participation, and growth rewards become AgentRank economic contribution signals.",
      title: "Collect CP Reward Signal",
    },
    cp_pool_generated: {
      body:
        "Verify that CP Pool creation becomes an upstream AI Star Universe reward distribution signal.",
      title: "Collect CP Pool Generation Signal",
    },
    creator_unlock_evaluated: {
      body:
        "Verify that creator eligibility checks become AgentRank events with condition, quality, and audit-readiness data.",
      title: "Collect Creator Unlock Evaluation",
    },
    creator_unlocked: {
      body:
        "Collect the conversion signal when an eligible member becomes a Creator.",
      title: "Collect Creator Unlock Conversion",
    },
    creator_social_connected: {
      body:
        "Mock-connect the AI Star TikTok channel to complete the Creator Journey condition and record the connected Creator and target AI Star as a Reputation Event.",
      title: "Collect TikTok Channel Connection",
    },
    fanletter_agentrank: {
      body:
        "Verify that AgentRank dashboard entry and analysis CTAs are recorded as audit flow sources.",
      title: "Verify AgentRank Source",
    },
    fanletter_bridge: {
      body:
        "Verify that account connection, referral persistence, and onboarding handoff produce Founder Network conversion signals.",
      title: "Verify Account Bridge Signal",
    },
    fanletter_content: {
      body:
        "Verify that AI Star content and share-link engagement are recorded in the AgentRank ledger.",
      title: "Verify Content Source Signal",
    },
    fanletter_creator_unlock: {
      body:
        "Verify that unlock evaluation, source selection, and launch mock events are generated from the Creator Journey.",
      title: "Verify Creator Journey Source",
    },
    fanletter_founder_universe: {
      body:
        "Verify that Founder Network exploration, tier selection, and Universe expansion become network signals.",
      title: "Verify Founder Network Source",
    },
    fanletter_home: {
      body:
        "Verify that discovery, invite, and creator CTAs on Home are recorded as first-touch Reputation Event Factory signals.",
      title: "Verify Home Source Signal",
    },
    fanletter_news: {
      body:
        "Verify that AI Star news and vlog reactions become content engagement and Discovery signals.",
      title: "Verify News Source Signal",
    },
    fanletter_star_detail: {
      body:
        "Verify that discovery, Founder join, and referral code creation are recorded against the same AI Star.",
      title: "Verify Star Detail Source Signal",
    },
    founder_joined: {
      body:
        "Collect the signal when a member enters a specific AI Star Founder Network.",
      title: "Collect Founder Join Signal",
    },
    referral_code_created: {
      body:
        "Verify that referral code creation and SNS share links are recorded as Founder Network lineage starts.",
      title: "Collect Referral Code Signal",
    },
    referral_converted: {
      body:
        "Verify the conversion when an invited member joins the same AI Star Universe.",
      title: "Collect Referral Conversion Signal",
    },
    source_universe_selected: {
      body:
        "Lock which AI Star Universe produced the new AI Star to strengthen lineage trust.",
      title: "Collect Source AI Star Universe Selection",
    },
    universe_growth: {
      body:
        "Verify that six-tier Founder Network growth, new members, and spawned stars become AgentRank network growth signals.",
      title: "Collect AI Star Universe Growth Signal",
    },
    x402_economy: {
      body:
        "Connect mock 10 USDT launch intent and CP Pool creation before real payments.",
      title: "Prepare x402 Economy Event",
    },
    x402_mock_payment_intent: {
      body:
        "Collect mock 10 USDT launch intent before real payment integration.",
      title: "Collect x402 Payment Intent",
    },
  };
  const messages = locale === "ko" ? koMessages : enMessages;

  return (
    messages[action] ?? {
      body:
        locale === "ko"
          ? "Coverage Audit에서 선택한 누락 신호를 채우기 위해 이 제품 흐름을 확인합니다."
          : "Review this product flow to fill the missing signal selected from Coverage Audit.",
      title:
        locale === "ko"
          ? "AgentRank 누락 신호 수집"
          : "Collect Missing AgentRank Signal",
    }
  );
}

type CoverageApiPayload = {
  coverage?: {
    eventTypes?: Array<{
      count?: number;
      covered?: boolean;
      type?: string;
    }>;
    readiness?: {
      a2aReady?: boolean;
      x402Ready?: boolean;
    };
    sources?: Array<{
      count?: number;
      covered?: boolean;
      source?: string;
    }>;
    totals?: {
      totalEvents?: number;
    };
  };
};

type CoverageActionStatus = "confirmed" | "deferred" | "pending";

type CoverageActionLiveStatus = {
  count: number | null;
  status: CoverageActionStatus;
};

function buildCoverageParams(action: AgentRankCoverageActionContext) {
  const params = new URLSearchParams({
    coverageAction: action.action,
    limit: "120",
  });

  if (action.starId) {
    params.set("starId", action.starId);
  }

  if (action.memberEmail) {
    params.set("memberEmail", action.memberEmail);
  }

  return params;
}

function getCoverageActionExecutionTarget({
  action,
  locale,
}: {
  action: AgentRankCoverageActionContext;
  locale: Locale;
}) {
  const params = buildCoverageParams(action);

  if (action.action === "creator_social_connected" && action.starId) {
    return {
      href: `/${locale}/fanletter/creator-unlock?${params.toString()}#tiktok-channel`,
      label: locale === "ko" ? "TikTok 연결하기" : "Connect TikTok",
    };
  }

  return null;
}

function getCoverageActionLiveStatus(
  action: string,
  coverage?: CoverageApiPayload["coverage"],
): CoverageActionLiveStatus {
  const eventItem = coverage?.eventTypes?.find((item) => item.type === action);

  if (eventItem) {
    return {
      count: eventItem.count ?? 0,
      status: eventItem.covered ? "confirmed" : "pending",
    };
  }

  const sourceItem = coverage?.sources?.find((item) => item.source === action);

  if (sourceItem) {
    return {
      count: sourceItem.count ?? 0,
      status: sourceItem.covered ? "confirmed" : "pending",
    };
  }

  if (action === "x402_economy") {
    return {
      count: null,
      status: coverage?.readiness?.x402Ready ? "confirmed" : "pending",
    };
  }

  if (action === "a2a_usage") {
    return {
      count: null,
      status: coverage?.readiness?.a2aReady ? "confirmed" : "deferred",
    };
  }

  return {
    count: null,
    status: "pending",
  };
}

function getStatusMeta(
  labels: ReturnType<typeof getCoverageActionLabels>,
  status: CoverageActionStatus,
) {
  if (status === "confirmed") {
    return {
      Icon: BadgeCheck,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      label: labels.statusConfirmed,
    };
  }

  if (status === "deferred") {
    return {
      Icon: ShieldAlert,
      className: "border-amber-200 bg-amber-50 text-amber-800",
      label: labels.statusDeferred,
    };
  }

  return {
    Icon: ShieldAlert,
    className: "border-slate-200 bg-slate-50 text-slate-700",
    label: labels.statusPending,
  };
}

function FanletterAgentRankCoverageActionLiveStatus({
  action,
  locale,
}: {
  action: AgentRankCoverageActionContext;
  locale: Locale;
}) {
  const labels = getCoverageActionLabels(locale);
  const params = useMemo(() => buildCoverageParams(action), [action]);
  const coverageHref = `/${locale}/fanletter/agentrank/coverage?${params.toString()}`;
  const ledgerHref = `/${locale}/fanletter/agentrank/events?${params.toString()}`;
  const [payload, setPayload] = useState<CoverageApiPayload | null>(null);
  const [status, setStatus] = useState<"error" | "idle" | "loading">("idle");

  const loadStatus = useCallback(async () => {
    setStatus("loading");

    try {
      const response = await fetch(
        `/api/fanletter/agentrank/coverage?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Coverage status failed");
      }

      setPayload((await response.json()) as CoverageApiPayload);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [params]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const liveStatus = getCoverageActionLiveStatus(
    action.action,
    payload?.coverage,
  );
  const statusMeta = getStatusMeta(labels, liveStatus.status);
  const StatusIcon =
    status === "loading" ? LoaderCircle : statusMeta.Icon;
  const statusLabel =
    status === "loading"
      ? labels.statusLoading
      : status === "error"
        ? labels.statusError
        : statusMeta.label;

  return (
    <div className="grid min-w-0 gap-3 rounded-[1rem] border border-violet-100 bg-white/72 p-3 shadow-[0_14px_34px_rgba(88,28,135,0.06)] sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          {labels.statusSubtitle}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={joinClasses(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
              status === "loading"
                ? "border-violet-100 bg-violet-50 text-[#6d28d9]"
                : status === "error"
                  ? "border-rose-100 bg-rose-50 text-rose-700"
                  : statusMeta.className,
            )}
          >
            <StatusIcon
              className={joinClasses(
                "size-3.5",
                status === "loading" && "animate-spin",
              )}
            />
            {labels.status}: {statusLabel}
          </span>
          {liveStatus.count != null ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-slate-100 bg-white px-3 text-xs font-semibold text-slate-600">
              {liveStatus.count.toLocaleString(locale)} {labels.totalEvents}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap gap-2">
        <button
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-violet-100 bg-white px-3 text-xs font-semibold text-[#6d28d9] transition hover:bg-violet-50"
          onClick={() => {
            void loadStatus();
          }}
          type="button"
        >
          <RefreshCw className="size-3.5" />
          {labels.refresh}
        </button>
        <Link
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#11132d] px-3 text-xs font-semibold !text-white transition hover:bg-[#2f2458]"
          href={ledgerHref}
        >
          <Database className="size-3.5" />
          {labels.ledger}
        </Link>
        <Link
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-3 text-xs font-semibold !text-white transition hover:bg-[#6d28d9]"
          href={coverageHref}
        >
          {labels.back}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function FanletterAgentRankCoverageActionNotice({
  action,
  className,
  locale,
}: {
  action: AgentRankCoverageActionContext;
  className?: string;
  locale: Locale;
}) {
  const labels = getCoverageActionLabels(locale);
  const message = getCoverageActionMessage(action.action, locale);
  const executionTarget = getCoverageActionExecutionTarget({ action, locale });

  return (
    <section
      className={joinClasses(
        "rounded-[1.1rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
            <GitBranch className="size-4" />
            {labels.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {message.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-black/62">
            {message.body}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white px-3 py-1.5 text-[#6d28d9] ring-1 ring-violet-100">
              coverageAction: {action.action}
            </span>
            {action.starId ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-100">
                {labels.starScope}: {action.starId}
              </span>
            ) : null}
            {action.memberEmail ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-sky-700 ring-1 ring-sky-100">
                {labels.memberScope}: {action.memberEmail}
              </span>
            ) : null}
          </div>
        </div>
        {executionTarget ? (
          <Link
            className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800 lg:w-auto"
            href={executionTarget.href}
          >
            <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
              {executionTarget.label}
            </span>
            <ArrowRight className="size-4 shrink-0" />
          </Link>
        ) : null}
      </div>
      <div className="mt-4">
        <FanletterAgentRankCoverageActionLiveStatus
          action={action}
          locale={locale}
        />
      </div>
    </section>
  );
}
