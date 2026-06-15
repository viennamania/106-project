import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Coins,
  Database,
  Download,
  Eye,
  FileJson,
  GitBranch,
  Heart,
  Network,
  Orbit,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import type {
  AgentRankCoverageSnapshot,
  AgentRankCoverageEventItem,
  AgentRankCoverageSourceItem,
} from "@/lib/agentrank/coverage";
import type { AgentRankBackfillReadinessSnapshot } from "@/lib/agentrank/backfill-readiness";
import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import type {
  AgentRankReputationEvent,
  FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import type { AgentRankEventMockScope } from "@/lib/agentrank/mock-events";
import type { Locale } from "@/lib/i18n";

type CoverageAuditScope = {
  eventScope: AgentRankEventMockScope;
  limit: number;
  memberEmail?: string | null;
  starId?: string | null;
};

type CoverageCopy = ReturnType<typeof getCoverageAuditCopy>;
type CoverageActionStatus = "confirmed" | "deferred" | "pending";
type CoverageActionProjection = {
  after: string;
  before: string;
  confidence: string;
  delta: string;
  kind: string;
  metricLabel: string;
  status: CoverageActionStatus;
};

const eventIconMap = {
  ai_star_discovered: Eye,
  ai_star_spawned: Rocket,
  content_engaged: Heart,
  cp_earned: Coins,
  cp_pool_generated: Database,
  creator_unlock_evaluated: BadgeCheck,
  creator_unlocked: Sparkles,
  founder_joined: Users,
  referral_code_created: Network,
  referral_converted: GitBranch,
  source_universe_selected: ShieldCheck,
  universe_growth: Orbit,
  x402_mock_payment_intent: WalletCards,
} satisfies Record<AgentRankCoverageEventItem["type"], typeof Eye>;

const layerClass = {
  creator: "border-pink-100 bg-pink-50/80 text-pink-700",
  discovery: "border-blue-100 bg-blue-50/80 text-blue-700",
  economy: "border-emerald-100 bg-emerald-50/80 text-emerald-700",
  network: "border-violet-100 bg-violet-50/80 text-[#6d28d9]",
} satisfies Record<AgentRankCoverageEventItem["layer"], string>;

const factoryLayerIconMap = {
  creator: Rocket,
  discovery: Eye,
  economy: WalletCards,
  network: Network,
} satisfies Record<AgentRankCoverageEventItem["layer"], typeof Eye>;

function getCoverageAuditCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      agentRank: "AgentRank",
      api: "JSON API",
      backToAgentRank: "AgentRank 보기",
      backfillActionPlan: "Backfill 실행 계획",
      backfillActionPlanBody:
        "현재 gap을 AgentRank Reputation Event로 전환하기 위한 dry-run 실행 순서입니다.",
      backfillConvertibleEvents: "전환 가능 이벤트",
      backfillDryRun: "Dry-run",
      backfillGaps: "Backfill 보강 항목",
      backfillReadiness: "Backfill 준비도",
      backfillReadinessBody:
        "기존 회원 추천 구조, AI 스타, 파운더 멤버십, 추천 엣지, CP 원장을 AgentRank 이벤트로 전환할 수 있는지 점검합니다.",
      backfillSamples: "샘플 이슈",
      aiStars: "AI 스타",
      actionAfter: "완료 후",
      actionBefore: "현재",
      actionConfidence: "감사 기준",
      actionImpact: "액션 실행 전후",
      actionImpactBody:
        "Coverage Audit에서 선택한 액션이 현재 원장 기준으로 어떤 커버리지와 Reputation Event를 채워야 하는지 계산합니다.",
      actionImpactEvent: "이벤트 타입",
      actionImpactReadiness: "준비 신호",
      actionImpactSource: "CTA 소스",
      actionExpectedDelta: "예상 개선",
      actionStatus: "검증 상태",
      actionStatusConfirmed: "확인됨",
      actionStatusDeferred: "보류",
      actionStatusPending: "대기",
      actionEstimatedRecords: "예상 대상",
      actionEventTypes: "생성 이벤트",
      actionPriority: "우선순위",
      actionRunMode: "실행 모드",
      actionSafetyLevel: "안전 단계",
      actionScript: "Dry-run 명령",
      actionWriteCommand: "Write 명령",
      contractCoverage: "Contract 유효성",
      contractInvalidEvents: "보강 필요 이벤트",
      contractReadyEvents: "계약 유효 이벤트",
      contractRecord: "Contract Record",
      contractRequiredFields: "필수 필드",
      contractRiskEvents: "위험 이벤트",
      contractValidation: "Reputation Event Contract",
      contractValidationBody:
        "AgentRank Oracle로 넘기기 전에 각 이벤트가 actor, object, starId, universeId, source, schemaVersion, evidenceHash를 갖추었는지 검증합니다.",
      covered: "수집됨",
      coverageCompleteBody:
        "이 범위에서는 필수 Reputation Event 타입, CTA 출처, x402 mock 의도, A2A 준비 신호가 모두 원장에 기록되었습니다.",
      coverageCompleteTitle: "Phase 1 이벤트 팩토리 커버리지 완료",
      csv: "CSV 내보내기",
      economicTrustInputs: "경제 신뢰 입력",
      eventCoverage: "이벤트 타입 커버리지",
      eventFactory: "Reputation Event Factory",
      eventFactoryBody:
        "FanLetter Phase 1의 제품 행동이 AgentRank가 읽을 수 있는 경제 신뢰 이벤트로 변환되는 생산 라인입니다.",
      eventLedger: "이벤트 원장",
      eventScope: "이벤트 범위",
      events: "이벤트",
      factoryCompatible: "AgentRank 호환",
      factoryNeedsMoreData: "추가 데이터 필요",
      gaps: "우선 보강 신호",
      generated: "생성 시간",
      interactionCoverage: "CTA 소스 커버리지",
      latestEvents: "최근 감사 이벤트",
      missing: "대기",
      members: "회원",
      noCriticalGaps: "현재 핵심 갭이 없습니다.",
      noContractIssues: "현재 필수 필드 누락이 없습니다.",
      oracleCoverage: "오라클 준비율",
      oraclePacket: "Oracle Packet",
      oracleReady: "오라클",
      phase1Quality: "Phase 1 데이터 품질",
      priorityActionPlan: "우선 수집 액션",
      schemaCoverage: "스키마 준비율",
      scopeAll: "전체 이벤트",
      scopeMock: "Mock 커버리지",
      scopeProduct: "운영 이벤트",
      scope: "감사 범위",
      scoreApi: "Score API",
      subtitle:
        "FanLetter에서 발생한 발견, 파운더 참여, 초대, CP, 창업 이벤트가 AgentRank 평판 데이터로 충분히 쌓이고 있는지 점검합니다.",
      targetLayer: "대상 레이어",
      title: "Coverage Audit",
      totalEvents: "전체 이벤트",
      triggerEvent: "생성 이벤트",
      viewAction: "진행",
    };
  }

  return {
    agentRank: "AgentRank",
    api: "JSON API",
    backToAgentRank: "View AgentRank",
    backfillActionPlan: "Backfill Action Plan",
    backfillActionPlanBody:
      "Dry-run execution order for turning current gaps into AgentRank Reputation Events.",
    backfillConvertibleEvents: "Convertible Events",
    backfillDryRun: "Dry-run",
    backfillGaps: "Backfill Gaps",
    backfillReadiness: "Backfill Readiness",
    backfillReadinessBody:
      "Audits whether existing member referrals, AI Stars, founder memberships, referral edges, and CP ledgers can be converted into AgentRank events.",
    backfillSamples: "Sample Issues",
    aiStars: "AI Stars",
    actionAfter: "After",
    actionBefore: "Current",
    actionConfidence: "Audit basis",
    actionImpact: "Action Impact",
    actionImpactBody:
      "Calculates which coverage and Reputation Event signal the selected Coverage Audit action should fill from the current ledger.",
    actionImpactEvent: "Event Type",
    actionImpactReadiness: "Readiness Signal",
    actionImpactSource: "CTA Source",
    actionExpectedDelta: "Expected Delta",
    actionStatus: "Verification Status",
    actionStatusConfirmed: "Confirmed",
    actionStatusDeferred: "Deferred",
    actionStatusPending: "Pending",
    actionEstimatedRecords: "Estimated Records",
    actionEventTypes: "Event Types",
    actionPriority: "Priority",
    actionRunMode: "Run Mode",
    actionSafetyLevel: "Safety Level",
    actionScript: "Dry-run Command",
    actionWriteCommand: "Write Command",
    contractCoverage: "Contract Validity",
    contractInvalidEvents: "Events Needing Enrichment",
    contractReadyEvents: "Contract-valid Events",
    contractRecord: "Contract Record",
    contractRequiredFields: "Required Fields",
    contractRiskEvents: "Risk Events",
    contractValidation: "Reputation Event Contract",
    contractValidationBody:
      "Validates that each event has actor, object, starId, universeId, source, schemaVersion, and evidenceHash before it can be passed to the AgentRank Oracle.",
    covered: "Covered",
    coverageCompleteBody:
      "For this scope, required Reputation Event types, CTA sources, x402 mock intent, and A2A readiness signals are all present in the ledger.",
    coverageCompleteTitle: "Phase 1 Event Factory Coverage Complete",
    csv: "Export CSV",
    economicTrustInputs: "Economic Trust Inputs",
    eventCoverage: "Event Type Coverage",
      eventFactory: "Reputation Event Factory",
      eventFactoryBody:
        "The production line that turns FanLetter Phase 1 product behavior into AgentRank-readable economic trust events.",
      eventLedger: "Event Ledger",
      eventScope: "Event Scope",
      events: "Events",
      factoryCompatible: "AgentRank Compatible",
      factoryNeedsMoreData: "Needs More Data",
      gaps: "Priority Gaps",
      generated: "Generated",
      interactionCoverage: "CTA Source Coverage",
    latestEvents: "Latest Audit Events",
    members: "Members",
    missing: "Pending",
    noCriticalGaps: "No critical gaps at the moment.",
    noContractIssues: "No required-field gaps at the moment.",
    oracleCoverage: "Oracle-ready Coverage",
    oraclePacket: "Oracle Packet",
    oracleReady: "Oracle",
    phase1Quality: "Phase 1 Data Quality",
    priorityActionPlan: "Priority Collection Actions",
    schemaCoverage: "Schema Coverage",
    scopeAll: "All events",
    scopeMock: "Mock coverage",
    scopeProduct: "Product events",
    scope: "Audit Scope",
    scoreApi: "Score API",
    subtitle:
      "Audits whether FanLetter discovery, founder, invite, CP, and creator events are becoming sufficient AgentRank reputation data.",
    targetLayer: "Target Layer",
    title: "Coverage Audit",
    totalEvents: "Total Events",
    triggerEvent: "Trigger Event",
    viewAction: "Open",
  };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEventTypeLabel(type: AgentRankReputationEvent["type"], locale: Locale) {
  if (locale !== "ko") {
    return type.replaceAll("_", " ");
  }

  const labels: Record<AgentRankReputationEvent["type"], string> = {
    ai_star_discovered: "AI 스타 발견",
    ai_star_spawned: "AI 스타 창업",
    content_engaged: "콘텐츠 반응",
    cp_earned: "CP 보상",
    cp_pool_generated: "CP Pool 생성",
    creator_unlock_evaluated: "권한 평가",
    creator_unlocked: "크리에이터 권한",
    founder_joined: "파운더 참여",
    referral_code_created: "추천 코드 생성",
    referral_converted: "추천 전환",
    source_universe_selected: "출처 유니버스 선택",
    universe_growth: "유니버스 성장",
    x402_mock_payment_intent: "x402 결제 의도",
  };

  return labels[type];
}

function getInteractionSourceLabel(
  source: AgentRankInteractionSource,
  locale: Locale,
) {
  const labels: Record<AgentRankInteractionSource, string> =
    locale === "ko"
      ? {
          fanletter_agentrank: "AgentRank 페이지",
          fanletter_bridge: "연결/온보딩",
          fanletter_content: "콘텐츠/브이로그",
          fanletter_creator_unlock: "크리에이터 권한",
          fanletter_founder_universe: "파운더 네트워크",
          fanletter_home: "FanLetter 홈",
          fanletter_news: "뉴스/리포트",
          fanletter_star_detail: "AI 스타 상세",
        }
      : {
          fanletter_agentrank: "AgentRank Page",
          fanletter_bridge: "Connect / Onboarding",
          fanletter_content: "Content / Vlog",
          fanletter_creator_unlock: "Creator Unlock",
          fanletter_founder_universe: "Founder Network",
          fanletter_home: "FanLetter Home",
          fanletter_news: "News / Reports",
          fanletter_star_detail: "AI Star Detail",
        };

  return labels[source];
}

function getCoverageGapLabel(gap: string, locale: Locale) {
  const [kind, value] = gap.split(":");

  if (kind === "missing_event") {
    return locale === "ko"
      ? `이벤트 미수집: ${getEventTypeLabel(
          value as AgentRankReputationEvent["type"],
          locale,
        )}`
      : `Missing event: ${value.replaceAll("_", " ")}`;
  }

  if (kind === "missing_source") {
    return locale === "ko"
      ? `CTA 소스 미수집: ${getInteractionSourceLabel(
          value as AgentRankInteractionSource,
          locale,
        )}`
      : `Missing CTA source: ${getInteractionSourceLabel(
          value as AgentRankInteractionSource,
          locale,
        )}`;
  }

  if (gap === "pending:x402_economy") {
    return locale === "ko"
      ? "x402 결제 이벤트 연결 예정"
      : "x402 payment events pending";
  }

  if (gap === "pending:a2a_usage") {
    return locale === "ko"
      ? "A2A 호출 이벤트 연결 예정"
      : "A2A call events pending";
  }

  return gap;
}

function getLayerLabel(layer: AgentRankCoverageEventItem["layer"], locale: Locale) {
  if (locale !== "ko") {
    return layer;
  }

  const labels: Record<AgentRankCoverageEventItem["layer"], string> = {
    creator: "크리에이터",
    discovery: "발견",
    economy: "경제",
    network: "네트워크",
  };

  return labels[layer];
}

function getContractFieldLabel(
  field: AgentRankCoverageSnapshot["contract"]["requiredFields"][number],
  locale: Locale,
) {
  if (locale !== "ko") {
    return field;
  }

  const labels: Record<
    AgentRankCoverageSnapshot["contract"]["requiredFields"][number],
    string
  > = {
    actor: "행위자",
    evidenceHash: "증거 해시",
    object: "대상",
    schemaVersion: "스키마",
    source: "출처",
    starId: "AI 스타",
    universeId: "유니버스",
  };

  return labels[field];
}

function getBackfillCoverageLabel(
  key: keyof AgentRankBackfillReadinessSnapshot["coverage"],
  locale: Locale,
) {
  const labels: Record<
    keyof AgentRankBackfillReadinessSnapshot["coverage"],
    string
  > =
    locale === "ko"
      ? {
          creatorRoleCoveragePercent: "AI 스타 Creator 연결",
          legacyReferralEdgeCoveragePercent: "기존 추천 엣지 전환",
          memberFounderUniverseCoveragePercent: "회원 Founder Universe",
          memberStarterStarCoveragePercent: "회원 시작 AI 스타",
          starOwnerCoveragePercent: "AI 스타 소유자",
          starPortraitCoveragePercent: "AI 스타 프로필",
        }
      : {
          creatorRoleCoveragePercent: "AI Star Creator Link",
          legacyReferralEdgeCoveragePercent: "Legacy Referral Edge",
          memberFounderUniverseCoveragePercent: "Member Founder Universe",
          memberStarterStarCoveragePercent: "Member Starter AI Star",
          starOwnerCoveragePercent: "AI Star Owner",
          starPortraitCoveragePercent: "AI Star Profile",
        };

  return labels[key];
}

function getBackfillConvertibleEventLabel(
  key: keyof AgentRankBackfillReadinessSnapshot["convertibleEvents"],
  locale: Locale,
) {
  const labels: Record<
    keyof AgentRankBackfillReadinessSnapshot["convertibleEvents"],
    string
  > =
    locale === "ko"
      ? {
          aiStarDiscovered: "AI 스타 발견",
          cpEarned: "CP 보상",
          cpPoolGenerated: "CP Pool 생성",
          founderJoined: "파운더 참여",
          referralCodeCreated: "추천 코드 생성",
          referralConverted: "추천 전환",
        }
      : {
          aiStarDiscovered: "AI Star Discovered",
          cpEarned: "CP Earned",
          cpPoolGenerated: "CP Pool Generated",
          founderJoined: "Founder Joined",
          referralCodeCreated: "Referral Code Created",
          referralConverted: "Referral Converted",
        };

  return labels[key];
}

function getBackfillGapLabel(gap: string, locale: Locale) {
  if (locale !== "ko") {
    return gap.replaceAll("_", " ").replace("missing:", "Missing ");
  }

  const labels: Record<string, string> = {
    "missing:cp_influence_ledger": "CP/Influence 원장 보강 필요",
    "missing:legacy_referral_edges": "기존 추천 엣지 보강 필요",
    "missing:member_founder_universe": "회원 Founder Universe 연결 필요",
    "missing:member_starter_star": "회원 시작 AI 스타 연결 필요",
    "missing:star_creator_membership": "AI 스타 Creator 멤버십 필요",
    "missing:star_owner": "AI 스타 소유자 정보 필요",
    "missing:star_portrait": "AI 스타 프로필 이미지 필요",
  };

  return labels[gap] ?? gap;
}

function getBackfillRunModeLabel(
  runMode: AgentRankBackfillReadinessSnapshot["actionPlan"][number]["runMode"],
  locale: Locale,
) {
  const labels: Record<
    AgentRankBackfillReadinessSnapshot["actionPlan"][number]["runMode"],
    string
  > =
    locale === "ko"
      ? {
          dry_run: "Dry-run",
          manual_review: "수동 검토",
          script_ready: "스크립트 준비",
        }
      : {
          dry_run: "Dry-run",
          manual_review: "Manual Review",
          script_ready: "Script Ready",
        };

  return labels[runMode];
}

function getBackfillSafetyLevelLabel(
  safetyLevel: AgentRankBackfillReadinessSnapshot["actionPlan"][number]["safetyLevel"],
  locale: Locale,
) {
  const labels: Record<
    AgentRankBackfillReadinessSnapshot["actionPlan"][number]["safetyLevel"],
    string
  > =
    locale === "ko"
      ? {
          manual_review: "수동 검토",
          read_only: "읽기 전용",
          write_gated: "Write 잠금",
        }
      : {
          manual_review: "Manual Review",
          read_only: "Read-only",
          write_gated: "Write-gated",
        };

  return labels[safetyLevel];
}

function getBackfillActionPlanText(
  item: AgentRankBackfillReadinessSnapshot["actionPlan"][number],
  locale: Locale,
) {
  if (locale !== "ko") {
    return {
      description: item.description,
      title: item.title,
    };
  }

  const labels: Record<string, { description: string; title: string }> = {
    "backfill-cp-influence-ledger": {
      description:
        "Founder Universe 행동에 대한 CP/Influence 원장을 생성해 AgentRank가 경제 기여 신호를 읽을 수 있게 합니다.",
      title: "CP/Influence 원장 정합성",
    },
    "backfill-legacy-referral-edges": {
      description:
        "기존 회원 기준 추천 필드를 AI 스타 기준 추천 엣지로 전환하고 원본 sponsor 증거를 보존합니다.",
      title: "기존 추천 엣지 전환",
    },
    "backfill-member-founder-universe": {
      description:
        "가입 완료 회원을 추천 맥락, 기존 멤버십, 플랫폼 시작 유니버스 기준으로 Founder Universe에 연결합니다.",
      title: "회원 Founder Universe 배치",
    },
    "backfill-member-starter-star": {
      description:
        "추천 가입, 첫 파운더 멤버십, 소유 AI 스타, 기본 시작 스타 순서로 회원의 시작 AI 스타를 결정합니다.",
      title: "회원 시작 AI 스타 지정",
    },
    "backfill-star-creator-membership": {
      description:
        "모든 활성 AI 스타가 Creator 멤버십을 갖도록 정합성을 맞춰 Creator Journey와 CP Pool 이벤트를 만들 수 있게 합니다.",
      title: "AI 스타 Creator 멤버십 정합성",
    },
    "backfill-star-owner": {
      description:
        "Creator lineage와 spawned-star 이벤트에 사용될 AI 스타 소유자 정보를 보강합니다.",
      title: "AI 스타 소유자 정보 보강",
    },
    "backfill-star-portrait": {
      description:
        "AI 스타와 사람 멤버가 명확히 구분되도록 안전한 AI 스타 프로필 이미지를 연결합니다.",
      title: "AI 스타 프로필 이미지 보강",
    },
  };

  return labels[item.id] ?? { description: item.description, title: item.title };
}

function buildQuery(scope: CoverageAuditScope, extra?: Record<string, string>) {
  const params = new URLSearchParams({
    limit: String(scope.limit),
    ...extra,
  });

  if (scope.eventScope !== "all") {
    params.set("scope", scope.eventScope);
  }

  if (scope.starId) {
    params.set("starId", scope.starId);
  }

  if (scope.memberEmail) {
    params.set("memberEmail", scope.memberEmail);
  }

  return params.toString();
}

function getScopedStarId(scope: CoverageAuditScope) {
  return scope.starId || "minseo";
}

function getGapAction(gap: string, locale: Locale, scope: CoverageAuditScope) {
  const [kind, value] = gap.split(":");
  const scopedStarId = encodeURIComponent(getScopedStarId(scope));
  const scopedQuery = buildQuery(scope, { coverageAction: value || kind });

  if (kind === "missing_event") {
    const eventType = value as AgentRankReputationEvent["type"];

    const eventActions: Partial<
      Record<
        AgentRankReputationEvent["type"],
        {
          description: string;
          href: string;
          layer: string;
          trigger: string;
        }
      >
    > =
      locale === "ko"
        ? {
            ai_star_spawned: {
              description:
                "크리에이터가 출처 스타 유니버스를 선택하고 새 AI 스타를 생성하는 흐름을 실행합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "AI 스타 창업",
            },
            creator_unlock_evaluated: {
              description:
                "크리에이터 권한 조건 평가를 기록해 창업 가능성 신호를 만듭니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "권한 평가",
            },
            creator_unlocked: {
              description:
                "조건을 충족한 멤버의 크리에이터 권한 전환 이벤트를 수집합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "크리에이터 권한",
            },
            source_universe_selected: {
              description:
                "새 AI 스타가 어느 스타 유니버스 성과에서 탄생했는지 출처를 고정합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Founder Network",
              trigger: "출처 유니버스 선택",
            },
            x402_mock_payment_intent: {
              description:
                "실결제 전 단계의 10 USDT 창업 의도 이벤트를 mock으로 수집합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "x402 Economy",
              trigger: "x402 결제 의도",
            },
          }
        : {
            ai_star_spawned: {
              description:
                "Run the flow where a creator selects a source Star Universe and launches a new AI Star.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "AI Star Spawned",
            },
            creator_unlock_evaluated: {
              description:
                "Record creator eligibility checks as early creator journey signals.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "Creator Unlock Evaluated",
            },
            creator_unlocked: {
              description:
                "Collect the conversion event when an eligible member unlocks creator status.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "Creator Unlocked",
            },
            source_universe_selected: {
              description:
                "Lock which Star Universe produced the new AI Star launch outcome.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Founder Network",
              trigger: "Source Universe Selected",
            },
            x402_mock_payment_intent: {
              description:
                "Collect a mock 10 USDT launch intent before real payment integration.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "x402 Economy",
              trigger: "x402 Payment Intent",
            },
          };
    const action = eventActions[eventType] ?? {
      description:
        locale === "ko"
          ? "해당 이벤트가 발생하는 제품 흐름을 열고 사용자 행동 신호를 수집합니다."
          : "Open the product flow that can generate this missing event signal.",
      href: `/${locale}/fanletter/${scopedStarId}?${scopedQuery}`,
      layer: locale === "ko" ? "평판 이벤트" : "Reputation Event",
      trigger: getEventTypeLabel(eventType, locale),
    };

    return {
      coverageAction: value || kind,
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      ...action,
    };
  }

  if (kind === "missing_source") {
    const source = value as AgentRankInteractionSource;
    const sourceRoutes: Partial<Record<AgentRankInteractionSource, string>> = {
      fanletter_agentrank: `/${locale}/fanletter/agentrank?${scopedQuery}`,
      fanletter_bridge: `/${locale}/fanletter/connect?${scopedQuery}`,
      fanletter_content: `/${locale}/fanletter/news/vlogs?${scopedQuery}`,
      fanletter_creator_unlock: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
      fanletter_founder_universe: `/${locale}/fanletter/${scopedStarId}/universe?${scopedQuery}`,
      fanletter_home: `/${locale}/fanletter?${scopedQuery}`,
      fanletter_news: `/${locale}/fanletter/news?${scopedQuery}`,
      fanletter_star_detail: `/${locale}/fanletter/${scopedStarId}?${scopedQuery}`,
    };

    return {
      coverageAction: value || kind,
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      description:
        locale === "ko"
          ? "해당 CTA 출처에서 AgentRank 추적 이벤트가 실제로 쌓이는지 확인합니다."
          : "Verify that this CTA source is producing AgentRank tracking events.",
      href: sourceRoutes[source] ?? `/${locale}/fanletter/agentrank?${scopedQuery}`,
      layer: locale === "ko" ? "CTA 소스" : "CTA Source",
      trigger: getInteractionSourceLabel(source, locale),
    };
  }

  if (gap === "pending:x402_economy") {
    return {
      coverageAction: "x402_economy",
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      description:
        locale === "ko"
          ? "실결제 전까지 창업 결제 의도와 CP Pool 생성을 mock 이벤트로 연결합니다."
          : "Connect mock launch payment intent and CP Pool generation before real payments.",
      href: `/${locale}/fanletter/creator-unlock?${buildQuery(scope, {
        coverageAction: "x402_economy",
      })}`,
      layer: "x402 Economy",
      trigger: locale === "ko" ? "mock 결제 의도" : "Mock Payment Intent",
    };
  }

  if (gap === "pending:a2a_usage") {
    return {
      coverageAction: "a2a_usage",
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      description:
        locale === "ko"
          ? "현재는 Phase 1 데이터로 보류하고, 추후 Agent 호출 이벤트 스키마와 연결합니다."
          : "Keep this as a Phase 1 placeholder until agent-call event schema is connected.",
      href: `/${locale}/fanletter/agentrank/events?${buildQuery(scope, {
        coverageAction: "a2a_usage",
      })}`,
      layer: "A2A Usage",
      trigger: locale === "ko" ? "Agent 호출 이벤트" : "Agent Call Event",
    };
  }

  return {
    coverageAction: value || kind || gap,
    key: gap,
    label: getCoverageGapLabel(gap, locale),
    description:
      locale === "ko"
        ? "이 갭을 채울 수 있는 제품 흐름과 이벤트 스키마를 확인합니다."
        : "Review the product flow and event schema needed to fill this gap.",
    href: `/${locale}/fanletter/agentrank?${scopedQuery}`,
    layer: "AgentRank",
    trigger: gap,
  };
}

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function getCoverageActionProjection({
  action,
  coverage,
  locale,
}: {
  action: string | null | undefined;
  coverage: AgentRankCoverageSnapshot;
  locale: Locale;
}): CoverageActionProjection | null {
  if (!action) {
    return null;
  }

  const eventItem = coverage.eventTypes.find((item) => item.type === action);

  if (eventItem) {
    const addedCoverage = eventItem.covered ? 0 : 1;
    const projectedCoveredEventTypes = Math.min(
      coverage.totals.eventTypes,
      coverage.totals.coveredEventTypes + addedCoverage,
    );
    const projectedCoveragePercent = percent(
      projectedCoveredEventTypes,
      coverage.totals.eventTypes,
    );
    const deltaPercent = Math.max(
      0,
      projectedCoveragePercent - coverage.eventTypeCoveragePercent,
    );

    return {
      after: `${formatNumber(eventItem.count + 1, locale)} events · ${projectedCoveragePercent}%`,
      before: `${formatNumber(eventItem.count, locale)} events · ${coverage.eventTypeCoveragePercent}%`,
      confidence:
        locale === "ko"
          ? eventItem.covered
            ? "이미 수집된 이벤트 타입입니다. 추가 실행은 발생 수를 늘립니다."
            : "미수집 이벤트 타입입니다. 1회 수집 시 이벤트 타입 커버리지가 올라갑니다."
          : eventItem.covered
            ? "This event type is already covered. Another run increases the event count."
            : "This event type is missing. One successful run improves event-type coverage.",
      delta:
        deltaPercent > 0
          ? `+${deltaPercent}%p`
          : locale === "ko"
            ? "+1 이벤트"
            : "+1 event",
      kind: locale === "ko" ? "이벤트 타입" : "Event Type",
      metricLabel: getEventTypeLabel(eventItem.type, locale),
      status: eventItem.covered ? "confirmed" : "pending",
    };
  }

  const sourceItem = coverage.sources.find((item) => item.source === action);

  if (sourceItem) {
    const addedCoverage = sourceItem.covered ? 0 : 1;
    const projectedCoveredSources = Math.min(
      coverage.totals.interactionSources,
      coverage.totals.coveredInteractionSources + addedCoverage,
    );
    const projectedCoveragePercent = percent(
      projectedCoveredSources,
      coverage.totals.interactionSources,
    );
    const deltaPercent = Math.max(
      0,
      projectedCoveragePercent - coverage.interactionSourceCoveragePercent,
    );

    return {
      after: `${formatNumber(sourceItem.count + 1, locale)} events · ${projectedCoveragePercent}%`,
      before: `${formatNumber(sourceItem.count, locale)} events · ${coverage.interactionSourceCoveragePercent}%`,
      confidence:
        locale === "ko"
          ? sourceItem.covered
            ? "이미 추적되는 CTA 소스입니다. 추가 실행은 소스 이벤트 수를 늘립니다."
            : "미수집 CTA 소스입니다. 1회 추적 시 CTA 소스 커버리지가 올라갑니다."
          : sourceItem.covered
            ? "This CTA source is already covered. Another run increases the source event count."
            : "This CTA source is missing. One tracked run improves source coverage.",
      delta:
        deltaPercent > 0
          ? `+${deltaPercent}%p`
          : locale === "ko"
            ? "+1 소스 이벤트"
            : "+1 source event",
      kind: locale === "ko" ? "CTA 소스" : "CTA Source",
      metricLabel: getInteractionSourceLabel(sourceItem.source, locale),
      status: sourceItem.covered ? "confirmed" : "pending",
    };
  }

  if (action === "x402_economy" || action === "a2a_usage") {
    const isX402 = action === "x402_economy";
    const isReady = isX402 ? coverage.readiness.x402Ready : coverage.readiness.a2aReady;
    const projectedScore = isReady
      ? coverage.phase1QualityScore
      : Math.min(100, coverage.phase1QualityScore + 5);

    return {
      after: `${projectedScore}/100`,
      before: `${coverage.phase1QualityScore}/100`,
      confidence:
        locale === "ko"
          ? isX402
            ? "실결제 전 mock 결제 의도와 CP Pool 생성 흐름을 연결하면 x402 준비 신호가 채워집니다."
            : "Phase 1에서는 보류 상태이며, 추후 Agent 호출 이벤트 스키마 연결 시 준비 신호가 채워집니다."
          : isX402
            ? "Connecting mock payment intent and CP Pool generation fills the x402 readiness signal before real payment."
            : "This stays pending in Phase 1 until the agent-call event schema is connected.",
      delta: "+5",
      kind: locale === "ko" ? "준비 신호" : "Readiness Signal",
      metricLabel: isX402 ? "x402 Economy" : "A2A Usage",
      status: isReady ? "confirmed" : isX402 ? "pending" : "deferred",
    };
  }

  return {
    after:
      locale === "ko"
        ? `${coverage.phase1QualityScore}/100 + 추적 이벤트`
        : `${coverage.phase1QualityScore}/100 + tracked event`,
    before: `${coverage.phase1QualityScore}/100`,
    confidence:
      locale === "ko"
        ? "이 액션은 현재 제품 흐름의 추적 이벤트 발생 여부를 확인하는 감사 기준입니다."
        : "This action audits whether the current product flow produces a tracked event.",
    delta: locale === "ko" ? "+1 추적 신호" : "+1 tracked signal",
    kind: "AgentRank",
    metricLabel: action,
    status: "pending",
  };
}

function getCoverageActionStatusMeta(
  copy: CoverageCopy,
  status: CoverageActionStatus,
) {
  if (status === "confirmed") {
    return {
      Icon: BadgeCheck,
      className: "border-emerald-100 bg-emerald-50 text-emerald-700",
      label: copy.actionStatusConfirmed,
    };
  }

  if (status === "deferred") {
    return {
      Icon: ShieldAlert,
      className: "border-amber-100 bg-amber-50 text-amber-700",
      label: copy.actionStatusDeferred,
    };
  }

  return {
    Icon: ShieldAlert,
    className: "border-slate-100 bg-slate-50 text-slate-600",
    label: copy.actionStatusPending,
  };
}

function CoverageActionImpactPanel({
  coverage,
  coverageAction,
  locale,
}: {
  coverage: AgentRankCoverageSnapshot;
  coverageAction: string | null | undefined;
  locale: Locale;
}) {
  const copy = getCoverageAuditCopy(locale);
  const projection = getCoverageActionProjection({
    action: coverageAction,
    coverage,
    locale,
  });

  if (!projection) {
    return null;
  }

  const status = getCoverageActionStatusMeta(copy, projection.status);
  const StatusIcon = status.Icon;

  return (
    <section className="mt-5 rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <Rocket className="size-4" />
            {copy.actionImpact}
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#11132d]">
            {projection.metricLabel}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
            {copy.actionImpactBody}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${status.className}`}
          >
            <StatusIcon className="size-3.5" />
            {copy.actionStatus}: {status.label}
          </span>
          <span className="inline-flex min-h-9 items-center rounded-full bg-violet-50 px-3 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100">
            coverageAction: {coverageAction}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_0.7fr] md:items-stretch">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.actionBefore}
          </p>
          <p className="mt-2 text-xl font-semibold text-[#11132d]">
            {projection.before}
          </p>
        </div>
        <div className="flex items-center justify-center text-[#7c3aed]">
          <ArrowRight className="size-5" />
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-700/70">
            {copy.actionAfter}
          </p>
          <p className="mt-2 text-xl font-semibold text-emerald-800">
            {projection.after}
          </p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase text-[#6d28d9]/70">
            {copy.actionExpectedDelta}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#6d28d9]">
            {projection.delta}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {projection.kind}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
        <span className="text-[#6d28d9]">{copy.actionConfidence}</span>
        <span className="mx-2 text-slate-300">/</span>
        {projection.confidence}
      </div>
    </section>
  );
}

function CoverageMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.1rem] border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="text-2xl font-semibold text-[#6d28d9]">{value}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#16a34a]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function EventFactoryManifestPanel({
  coverage,
  locale,
}: {
  coverage: AgentRankCoverageSnapshot;
  locale: Locale;
}) {
  const copy = getCoverageAuditCopy(locale);
  const manifest = coverage.factoryManifest;

  return (
    <section className="mt-5 rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <Sparkles className="size-4" />
            {copy.eventFactory}
          </p>
          <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
            {copy.eventFactoryBody}
          </p>
        </div>
        <span
          className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
            manifest.agentRankCompatible
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-amber-100 bg-amber-50 text-amber-700"
          }`}
        >
          {manifest.agentRankCompatible ? (
            <BadgeCheck className="size-4" />
          ) : (
            <ShieldAlert className="size-4" />
          )}
          {manifest.agentRankCompatible
            ? copy.factoryCompatible
            : copy.factoryNeedsMoreData}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {manifest.layers.map((layer) => {
          const Icon = factoryLayerIconMap[layer.layer];

          return (
            <div
              className="overflow-hidden rounded-[1rem] border border-slate-100 bg-slate-50"
              key={layer.layer}
            >
              <div className={`h-1.5 ${layerClass[layer.layer]}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#11132d]">
                      {getLayerLabel(layer.layer, locale)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {layer.coveredEventTypes}/{layer.eventTypes} ·{" "}
                      {layer.coveragePercent}%
                    </p>
                  </div>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#6d28d9] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <Icon className="size-5" />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">
                      {copy.events}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#11132d]">
                      {formatNumber(layer.totalEvents, locale)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase text-slate-400">
                      {copy.oracleReady}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#11132d]">
                      {formatNumber(layer.oracleReadyEvents, locale)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#16a34a]"
                    style={{ width: `${layer.coveragePercent}%` }}
                  />
                </div>
                <p className="mt-3 min-h-10 text-xs font-medium leading-5 text-slate-500">
                  {layer.missingEventTypes.length > 0
                    ? `${copy.gaps}: ${layer.missingEventTypes
                        .map((type) => getEventTypeLabel(type, locale))
                        .join(", ")}`
                    : copy.coverageCompleteTitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex min-h-9 items-center rounded-full bg-violet-50 px-3 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100">
          {manifest.recordType}
        </span>
        <span className="inline-flex min-h-9 items-center rounded-full bg-slate-50 px-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
          {copy.economicTrustInputs}:{" "}
          {manifest.economicTrustInputs
            .map((layer) => getLayerLabel(layer, locale))
            .join(" · ")}
        </span>
      </div>
    </section>
  );
}

function ContractValidationPanel({
  coverage,
  locale,
}: {
  coverage: AgentRankCoverageSnapshot;
  locale: Locale;
}) {
  const copy = getCoverageAuditCopy(locale);
  const contract = coverage.contract;
  const issuePreview = contract.issues.slice(0, 6);

  return (
    <section className="mt-5 rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <ShieldCheck className="size-4" />
            {copy.contractValidation}
          </p>
          <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-500">
            {copy.contractValidationBody}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p className="text-[0.68rem] font-semibold uppercase text-emerald-700/70">
              {copy.contractReadyEvents}
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-800">
              {formatNumber(contract.contractReadyEvents, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-[0.68rem] font-semibold uppercase text-amber-700/70">
              {copy.contractInvalidEvents}
            </p>
            <p className="mt-1 text-lg font-semibold text-amber-800">
              {formatNumber(contract.invalidEvents, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
            <p className="text-[0.68rem] font-semibold uppercase text-rose-700/70">
              {copy.contractRiskEvents}
            </p>
            <p className="mt-1 text-lg font-semibold text-rose-800">
              {formatNumber(contract.riskEvents, locale)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#11132d]">
              {copy.contractRequiredFields}
            </p>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100">
              {coverage.contractValidationPercent}%
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {contract.requiredFields.map((field) => {
              const missingCount = contract.missingFieldCounts[field];

              return (
                <div
                  className={`rounded-lg border px-3 py-2 ${
                    missingCount === 0
                      ? "border-emerald-100 bg-white text-emerald-700"
                      : "border-amber-100 bg-amber-50 text-amber-800"
                  }`}
                  key={field}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">
                      {getContractFieldLabel(field, locale)}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-semibold ring-1 ring-black/5">
                      {formatNumber(missingCount, locale)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
            {copy.contractRecord}: {contract.recordType}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-[#11132d]">
            {copy.contractRiskEvents}
          </p>
          {issuePreview.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {issuePreview.map((issue) => (
                <div
                  className="rounded-lg border border-white bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                  key={issue.eventId}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#11132d]">
                      {getEventTypeLabel(issue.type, locale)}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-[0.68rem] font-semibold ${
                        issue.risk === "critical"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {issue.risk}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-400">
                    {issue.eventId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {issue.missingFields.map((field) => (
                      <span
                        className="rounded-full bg-slate-50 px-2 py-1 text-[0.68rem] font-semibold text-slate-500"
                        key={field}
                      >
                        {getContractFieldLabel(field, locale)}
                      </span>
                    ))}
                    <span className="rounded-full bg-violet-50 px-2 py-1 text-[0.68rem] font-semibold text-[#6d28d9]">
                      {formatDateTime(issue.occurredAt, locale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              {copy.noContractIssues}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BackfillReadinessPanel({
  backfill,
  locale,
}: {
  backfill: AgentRankBackfillReadinessSnapshot;
  locale: Locale;
}) {
  const copy = getCoverageAuditCopy(locale);
  const coverageEntries = Object.entries(backfill.coverage) as Array<
    [keyof AgentRankBackfillReadinessSnapshot["coverage"], number]
  >;
  const convertibleEntries = Object.entries(backfill.convertibleEvents) as Array<
    [keyof AgentRankBackfillReadinessSnapshot["convertibleEvents"], number]
  >;

  return (
    <section className="mt-5 rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-[1.15rem] bg-gradient-to-br from-[#11132d] via-[#312e81] to-[#7c3aed] p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-white/75">
              <Database className="size-4" />
              {copy.backfillReadiness}
            </p>
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">
              {copy.backfillDryRun}
            </span>
          </div>
          <div className="mt-5 flex items-end gap-3">
            <p className="text-6xl font-semibold">
              {backfill.readinessScore}
            </p>
            <p className="pb-2 text-lg font-semibold text-white/60">/ 100</p>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
              style={{ width: `${backfill.readinessScore}%` }}
            />
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-white/72">
            {copy.backfillReadinessBody}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs font-semibold uppercase text-white/55">
                {copy.members}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {formatNumber(backfill.totals.completedMembers, locale)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs font-semibold uppercase text-white/55">
                {copy.aiStars}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {formatNumber(backfill.totals.activeStars, locale)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.backfillReadiness}
              </p>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100">
                {backfill.recordType}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {coverageEntries.map(([key, value]) => (
                <div
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  key={key}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#11132d]">
                      {getBackfillCoverageLabel(key, locale)}
                    </p>
                    <p className="text-sm font-semibold text-[#6d28d9]">
                      {value}%
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#16a34a]"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-sm font-semibold text-[#4c1d95]">
                {copy.backfillConvertibleEvents}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {convertibleEntries.map(([key, value]) => (
                  <div className="rounded-lg bg-white px-3 py-2" key={key}>
                    <p className="text-[0.68rem] font-semibold uppercase text-slate-400">
                      {getBackfillConvertibleEventLabel(key, locale)}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#11132d]">
                      {formatNumber(value, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-[#11132d]">
                {copy.backfillGaps}
              </p>
              {backfill.gaps.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {backfill.gaps.map((gap) => (
                    <span
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100"
                      key={gap}
                    >
                      {getBackfillGapLabel(gap, locale)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  {copy.coverageCompleteTitle}
                </p>
              )}
            </div>
          </div>

          {backfill.actionPlan.length > 0 ? (
            <div className="rounded-xl border border-violet-100 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#11132d]">
                    {copy.backfillActionPlan}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {copy.backfillActionPlanBody}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100">
                  {locale === "ko"
                    ? `${backfill.actionPlan.length}단계`
                    : `${backfill.actionPlan.length} steps`}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {backfill.actionPlan.map((item) => {
                  const actionText = getBackfillActionPlanText(item, locale);

                  return (
                    <div
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      key={item.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.68rem] font-semibold uppercase text-[#6d28d9]">
                            {copy.actionPriority} {item.priority}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#11132d]">
                            {actionText.title}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          {getBackfillRunModeLabel(item.runMode, locale)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        {actionText.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600 ring-1 ring-slate-100">
                          {copy.actionEstimatedRecords}:{" "}
                          {formatNumber(item.estimatedRecords, locale)}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-[#6d28d9] ring-1 ring-violet-100">
                          {getBackfillCoverageLabel(item.targetCoverage, locale)}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.68rem] font-semibold text-amber-700 ring-1 ring-amber-100">
                          {copy.actionSafetyLevel}:{" "}
                          {getBackfillSafetyLevelLabel(item.safetyLevel, locale)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.eventTypes.map((eventType) => (
                          <span
                            className="rounded-full bg-violet-50 px-2 py-1 text-[0.65rem] font-semibold text-[#6d28d9]"
                            key={`${item.id}-${eventType}`}
                          >
                            {eventType}
                          </span>
                        ))}
                      </div>
                      {item.script ? (
                        <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-slate-100">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            {copy.actionScript}
                          </p>
                          <p className="mt-1 break-all font-mono text-[0.68rem] font-semibold text-slate-600">
                            {item.script}
                          </p>
                        </div>
                      ) : null}
                      {item.writeCommand ? (
                        <div className="mt-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-amber-600">
                            {copy.actionWriteCommand}
                          </p>
                          <p className="mt-1 break-all font-mono text-[0.68rem] font-semibold text-amber-800">
                            {item.writeCommand}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {backfill.samples.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-semibold text-[#11132d]">
                {copy.backfillSamples}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {backfill.samples.map((sample, index) => (
                  <div
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    key={`${sample.issue}-${sample.email ?? sample.starId}-${index}`}
                  >
                    <p className="truncate text-xs font-semibold text-amber-700">
                      {getBackfillGapLabel(sample.issue, locale)}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#11132d]">
                      {sample.email ?? sample.starId ?? "-"}
                    </p>
                    {sample.referralCode || sample.starId ? (
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                        {sample.referralCode ?? sample.starId}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EventTypeCoverageCard({
  item,
  locale,
}: {
  item: AgentRankCoverageEventItem;
  locale: Locale;
}) {
  const Icon = eventIconMap[item.type];

  return (
    <div
      className={`min-w-0 rounded-[1rem] border p-4 ${
        item.covered ? layerClass[item.layer] : "border-slate-100 bg-slate-50 text-slate-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#11132d]">
              {getEventTypeLabel(item.type, locale)}
            </p>
            <p className="mt-1 text-xs font-semibold opacity-75">
              {getLayerLabel(item.layer, locale)}
            </p>
          </div>
        </div>
        {item.covered ? (
          <BadgeCheck className="size-5 shrink-0 text-emerald-600" />
        ) : (
          <ShieldAlert className="size-5 shrink-0 text-slate-300" />
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold text-[#11132d]">
        {formatNumber(item.count, locale)}
      </p>
    </div>
  );
}

function SourceCoverageCard({
  copy,
  locale,
  source,
}: {
  copy: CoverageCopy;
  locale: Locale;
  source: AgentRankCoverageSourceItem;
}) {
  return (
    <div
      className={`rounded-[1rem] border p-4 ${
        source.covered
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold text-[#11132d]">
          {getInteractionSourceLabel(source.source, locale)}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
            source.covered ? "bg-white text-emerald-700" : "bg-white text-slate-400"
          }`}
        >
          {formatNumber(source.count, locale)}
        </span>
      </div>
      <p
        className={`mt-3 text-xs font-semibold ${
          source.covered ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        {source.covered ? copy.covered : copy.missing}
      </p>
    </div>
  );
}

export function FanletterAgentRankCoverageAuditPage({
  backfill,
  coverage,
  coverageAction,
  eventFeed,
  eventScope,
  generatedAt,
  locale,
  scope,
}: {
  backfill: AgentRankBackfillReadinessSnapshot;
  coverage: AgentRankCoverageSnapshot;
  coverageAction?: string | null;
  eventFeed: FanletterAgentRankReputationEventFeed;
  eventScope: {
    raw: {
      mockEvents: number;
      productEvents: number;
      totalEvents: number;
    };
    scope: AgentRankEventMockScope;
    scoped: {
      mockEvents: number;
      productEvents: number;
      totalEvents: number;
    };
  };
  generatedAt: string;
  locale: Locale;
  scope: CoverageAuditScope;
}) {
  const copy = getCoverageAuditCopy(locale);
  const apiQuery = buildQuery(scope);
  const csvQuery = buildQuery(scope, { format: "csv" });
  const scoreQuery = buildQuery(scope, {
    coverageProbe: "true",
    includeMock: "true",
  });
  const oracleQuery = buildQuery(scope, {
    coverageProbe: "true",
    format: "oracle",
    includeMock: "true",
  });
  const pageQuery = buildQuery(scope);
  const coverageActionQuery = coverageAction
    ? `&coverageAction=${encodeURIComponent(coverageAction)}`
    : "";
  const actionPageQuery = coverageAction
    ? `${pageQuery}${coverageActionQuery}`
    : pageQuery;
  const latestEvents = eventFeed.events.slice(0, 6);
  const gapActions = coverage.gaps.map((gap) =>
    getGapAction(gap, locale, scope),
  );
  const primaryGapAction = gapActions[0] ?? null;
  const primaryGapProjection = primaryGapAction
    ? getCoverageActionProjection({
        action: primaryGapAction.coverageAction,
        coverage,
        locale,
      })
    : null;
  const scopeOptions: Array<{
    count: number;
    label: string;
    scope: AgentRankEventMockScope;
  }> = [
    {
      count: eventScope.raw.totalEvents,
      label: copy.scopeAll,
      scope: "all",
    },
    {
      count: eventScope.raw.productEvents,
      label: copy.scopeProduct,
      scope: "product",
    },
    {
      count: eventScope.raw.mockEvents,
      label: copy.scopeMock,
      scope: "mock",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <FanletterActionGuide
          className="mb-5"
          currentLabel={
            locale === "ko" ? "운영자 커버리지 감사" : "Ops coverage audit"
          }
          metrics={[
            {
              label: copy.phase1Quality,
              value: `${coverage.phase1QualityScore}/100`,
            },
            {
              label: copy.gaps,
              value: formatNumber(coverage.gaps.length, locale),
            },
          ]}
          primaryAction={{
            agentRank: {
              eventType: "creator_unlock_evaluated",
              intent: "agentrank_coverage_action_guide_plan",
              source: "fanletter_agentrank",
              starId: scope.starId ?? null,
            },
            eventName: "content_open",
            href: "#coverage-action-plan",
            label:
              locale === "ko"
                ? "우선 보강 액션 보기"
                : "View priority actions",
            metadata: {
              placement: "agentrank_coverage_action_guide_primary",
              coverageAction: coverageAction ?? null,
              eventScope: scope.eventScope,
            },
          }}
          reputationEventLabel={
            locale === "ko" ? "Coverage Event Factory" : "Coverage Event Factory"
          }
          secondaryActions={[
            {
              agentRank: {
                eventType: "universe_growth",
                intent: "agentrank_coverage_action_guide_ledger",
                source: "fanletter_agentrank",
                starId: scope.starId ?? null,
              },
              eventName: "content_open",
              href: `/${locale}/fanletter/agentrank/events?${actionPageQuery}`,
              label: copy.eventLedger,
              metadata: {
                placement: "agentrank_coverage_action_guide_ledger",
                eventScope: scope.eventScope,
              },
            },
          ]}
          steps={[
            {
              label: locale === "ko" ? "행동 수집" : "Collect actions",
              status: "done",
            },
            {
              label: locale === "ko" ? "커버리지 점검" : "Audit coverage",
              status: "active",
            },
            {
              label: locale === "ko" ? "갭 보강" : "Fill gaps",
              status: coverage.gaps.length > 0 ? "active" : "done",
            },
            {
              label: "Oracle Packet",
              status: coverage.gaps.length > 0 ? "next" : "active",
            },
          ]}
          subtitle={
            locale === "ko"
              ? "누락된 이벤트 타입과 CTA 소스를 먼저 보강해 AgentRank로 보낼 수 있는 데이터 품질을 맞춥니다."
              : "Fill missing event types and CTA sources first so AgentRank can consume the data."
          }
          title={
            locale === "ko"
              ? "다음 행동: 커버리지 갭 보강"
              : "Next action: fill coverage gaps"
          }
        />
        <section className="mb-5 rounded-[1.25rem] border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)] sm:hidden">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
            <ShieldAlert className="size-3.5 shrink-0" />
            <span className="truncate">
              {locale === "ko" ? "현재 위치: 커버리지 감사" : "Now: Coverage audit"}
            </span>
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-[#11132d] [word-break:keep-all]">
            {primaryGapAction
              ? locale === "ko"
                ? `다음 보강: ${primaryGapAction.label}`
                : `Next gap: ${primaryGapAction.label}`
              : locale === "ko"
                ? "커버리지 보강 완료"
                : "Coverage gaps complete"}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-violet-50 px-3 py-2">
              <p className="truncate text-[0.62rem] font-semibold uppercase text-[#6d28d9]/70">
                {copy.phase1Quality}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-[#5b21b6]">
                {coverage.phase1QualityScore}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="truncate text-[0.62rem] font-semibold uppercase text-amber-700/70">
                {copy.gaps}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-amber-800">
                {formatNumber(coverage.gaps.length, locale)}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <p className="truncate text-[0.62rem] font-semibold uppercase text-emerald-700/70">
                {copy.actionExpectedDelta}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-emerald-800">
                {primaryGapProjection?.delta ?? "+0"}
              </p>
            </div>
          </div>
          <Link
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#6d28d9] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(109,40,217,0.2)]"
            href={primaryGapAction?.href ?? `/${locale}/fanletter/agentrank/events?${actionPageQuery}`}
          >
            {primaryGapAction
              ? locale === "ko"
                ? "이 보강 액션 실행"
                : "Run this coverage action"
              : copy.eventLedger}
            <ArrowRight className="size-4 shrink-0" />
          </Link>
        </section>
        <header className="rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)] lg:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-[#6d28d9]">
                <ShieldCheck className="size-4" />
                {copy.agentRank} · {copy.phase1Quality}
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-[#11132d] md:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-3 hidden max-w-4xl text-base font-medium leading-7 text-slate-600 sm:block md:text-lg">
                {copy.subtitle}
              </p>
            </div>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-white px-4 text-sm font-semibold text-[#6d28d9]"
                href={`/${locale}/fanletter/agentrank?${pageQuery}`}
              >
                <Bot className="size-4" />
                {copy.backToAgentRank}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#5b21b6]"
                href={`/${locale}/fanletter/agentrank/events?${actionPageQuery}`}
              >
                <Database className="size-4" />
                {copy.eventLedger}
              </Link>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                href={`/api/fanletter/agentrank/coverage?${apiQuery}`}
              >
                <FileJson className="size-4" />
                {copy.api}
              </a>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                href={`/api/fanletter/agentrank/coverage?${csvQuery}`}
              >
                <Download className="size-4" />
                {copy.csv}
              </a>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700"
                href={`/api/fanletter/agentrank/score?${scoreQuery}`}
              >
                <Database className="size-4" />
                {copy.scoreApi}
              </a>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-200 bg-[#11132d] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(88,28,135,0.18)]"
                href={`/api/fanletter/agentrank/score?${oracleQuery}`}
              >
                <ShieldCheck className="size-4" />
                {copy.oraclePacket}
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.25rem] bg-gradient-to-br from-[#11132d] via-[#312e81] to-[#7c3aed] p-5 text-white">
              <p className="text-sm font-semibold uppercase text-white/65">
                {copy.phase1Quality}
              </p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-6xl font-semibold">
                  {coverage.phase1QualityScore}
                </p>
                <p className="pb-2 text-lg font-semibold text-white/60">/ 100</p>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
                  style={{ width: `${coverage.phase1QualityScore}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 rounded-[1.25rem] border border-violet-100 bg-violet-50/60 p-5">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {copy.scope}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#11132d]">
                  starId: {scope.starId || "all"} · member:{" "}
                  {scope.memberEmail || "all"} · {copy.eventScope}:{" "}
                  {scope.eventScope} · limit {scope.limit}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {copy.generated}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#11132d]">
                  {formatDateTime(generatedAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {copy.totalEvents}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#6d28d9]">
                  {formatNumber(coverage.totals.totalEvents, locale)}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {scopeOptions.map((option) => {
              const isActive = eventScope.scope === option.scope;
              const nextQuery = buildQuery(
                {
                  ...scope,
                  eventScope: option.scope,
                },
                coverageAction
                  ? { coverageAction: coverageAction }
                  : undefined,
              );

              return (
                <Link
                  className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-center text-sm font-semibold ${
                    isActive
                      ? "bg-[#11132d] text-white"
                      : "border border-violet-100 bg-white text-slate-600"
                  }`}
                  href={`/${locale}/fanletter/agentrank/coverage?${nextQuery}`}
                  key={option.scope}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/18 text-white"
                        : "bg-violet-50 text-[#6d28d9]"
                    }`}
                  >
                    {formatNumber(option.count, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CoverageMetric
            label={copy.eventCoverage}
            value={coverage.eventTypeCoveragePercent}
          />
          <CoverageMetric
            label={copy.interactionCoverage}
            value={coverage.interactionSourceCoveragePercent}
          />
          <CoverageMetric
            label={copy.oracleCoverage}
            value={coverage.oracleCoveragePercent}
          />
          <CoverageMetric
            label={copy.schemaCoverage}
            value={coverage.schemaCoveragePercent}
          />
          <CoverageMetric
            label={copy.contractCoverage}
            value={coverage.contractValidationPercent}
          />
        </section>

        <EventFactoryManifestPanel coverage={coverage} locale={locale} />

        <ContractValidationPanel coverage={coverage} locale={locale} />

        <BackfillReadinessPanel backfill={backfill} locale={locale} />

        <CoverageActionImpactPanel
          coverage={coverage}
          coverageAction={coverageAction}
          locale={locale}
        />

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_24rem]">
          <div className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                  {copy.eventCoverage}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {coverage.totals.coveredEventTypes}/
                  {coverage.totals.eventTypes}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coverage.eventTypes.map((item) => (
                <EventTypeCoverageCard
                  item={item}
                  key={item.type}
                  locale={locale}
                />
              ))}
            </div>
          </div>

          <aside className="grid content-start gap-5" id="coverage-action-plan">
            <div className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.priorityActionPlan}
              </p>
              {gapActions.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {gapActions.map((action) => {
                    const projection = getCoverageActionProjection({
                      action: action.coverageAction,
                      coverage,
                      locale,
                    });

                    return (
                      <Link
                        className="group block rounded-xl border border-violet-100 bg-violet-50/70 p-3 transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-[0_14px_34px_rgba(88,28,135,0.08)]"
                        href={action.href}
                        key={action.key}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#4c1d95]">
                              {action.label}
                            </p>
                            <p className="mt-2 text-xs font-medium leading-5 text-slate-600">
                              {action.description}
                            </p>
                          </div>
                          <ArrowRight className="mt-1 size-4 shrink-0 text-[#7c3aed] transition group-hover:translate-x-0.5" />
                        </div>
                        <div className="mt-3 grid gap-2 text-xs font-semibold sm:grid-cols-2 xl:grid-cols-1">
                          <div className="rounded-lg bg-white px-3 py-2 text-slate-500">
                            <span className="text-slate-400">
                              {copy.targetLayer}
                            </span>
                            <span className="mt-1 block truncate text-[#11132d]">
                              {action.layer}
                            </span>
                          </div>
                          <div className="rounded-lg bg-white px-3 py-2 text-slate-500">
                            <span className="text-slate-400">
                              {copy.triggerEvent}
                            </span>
                            <span className="mt-1 block truncate text-[#11132d]">
                              {action.trigger}
                            </span>
                          </div>
                        </div>
                        {projection ? (
                          <div className="mt-3 grid gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                            <span className="flex items-center justify-between gap-2 text-emerald-700/70">
                              <span>{copy.actionExpectedDelta}</span>
                              <span>
                                {
                                  getCoverageActionStatusMeta(
                                    copy,
                                    projection.status,
                                  ).label
                                }
                              </span>
                            </span>
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate">
                                {projection.before}
                              </span>
                              <ArrowRight className="size-3.5 shrink-0" />
                              <span className="truncate">
                                {projection.after}
                              </span>
                            </span>
                          </div>
                        ) : null}
                        <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100">
                          {copy.viewAction}
                          <ArrowRight className="size-3.5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-violet-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-800">
                        {copy.coverageCompleteTitle}
                      </p>
                      <p className="mt-2 text-xs font-medium leading-5 text-slate-600">
                        {copy.coverageCompleteBody}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <Link
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#11132d] px-3 text-xs font-semibold text-white transition hover:bg-[#2f2458]"
                      href={`/${locale}/fanletter/agentrank?${pageQuery}`}
                    >
                      <Bot className="size-3.5" />
                      {copy.backToAgentRank}
                    </Link>
                    <Link
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-violet-100 bg-white px-3 text-xs font-semibold text-[#6d28d9] transition hover:bg-violet-50"
                      href={`/${locale}/fanletter/agentrank/events?${actionPageQuery}`}
                    >
                      <Database className="size-3.5" />
                      {copy.eventLedger}
                    </Link>
                    <a
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-emerald-100 bg-white px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      href={`/api/fanletter/agentrank/coverage?${apiQuery}`}
                    >
                      <FileJson className="size-3.5" />
                      {copy.api}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.latestEvents}
              </p>
              <div className="mt-4 grid gap-3">
                {latestEvents.map((event) => (
                  <Link
                    className="block rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-violet-100 hover:bg-violet-50"
                    href={`/${locale}/fanletter/agentrank/events/${event.eventId}/evidence?${actionPageQuery}`}
                    key={event.eventId}
                  >
                    <p className="truncate text-sm font-semibold text-[#11132d]">
                      {getEventTypeLabel(event.type, locale)}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                      {event.eventId}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.interactionCoverage}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {coverage.totals.coveredInteractionSources}/
                {coverage.totals.interactionSources}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {coverage.sources.map((source) => (
              <SourceCoverageCard
                copy={copy}
                key={source.source}
                locale={locale}
                source={source}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
